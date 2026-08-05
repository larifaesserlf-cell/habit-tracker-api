'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type HabitFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

/**
 * Server Action de criação/edição de hábito.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 */
export async function saveHabit(
  _prevState: HabitFormState,
  formData: FormData
): Promise<HabitFormState> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim() ?? ''
  const frequencia = formData.get('frequencia') as string | null
  const areaId = (formData.get('area_id') as string | null) || null

  if (nome.length < 2) {
    return { status: 'error', message: 'O nome do hábito deve ter pelo menos 2 caracteres.' }
  }

  if (frequencia !== 'diario' && frequencia !== 'dias_especificos' && frequencia !== 'mensal') {
    return { status: 'error', message: 'Selecione uma frequência válida.' }
  }

  // dias_semana/dia_mes só fazem sentido pra sua própria frequência — os
  // dois ficam null quando não se aplicam, pra não sobrar lixo de uma
  // frequência anterior se o hábito for editado e trocar de tipo.
  let diasSemana: number[] | null = null
  let diaMes: number | null = null

  if (frequencia === 'dias_especificos') {
    diasSemana = formData
      .getAll('dias_semana')
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    if (diasSemana.length === 0) {
      return { status: 'error', message: 'Selecione pelo menos um dia da semana.' }
    }
  }

  if (frequencia === 'mensal') {
    diaMes = Number(formData.get('dia_mes'))
    if (!Number.isInteger(diaMes) || diaMes < 1 || diaMes > 31) {
      return { status: 'error', message: 'Selecione um dia do mês entre 1 e 31.' }
    }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const payload = { nome, frequencia, dias_semana: diasSemana, dia_mes: diaMes, area_id: areaId }

  const { error } = id
    ? await supabase.from('habits').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('habits').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar hábito: ${error.message}` }
  }

  revalidatePath('/habitos')
  return { status: 'success' }
}

/**
 * Cria ou atualiza o check-in de um hábito numa data específica (upsert).
 */
export async function toggleCheckIn(habitId: string, date: string, nextStatus: boolean) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Confere posse do hábito antes de gravar o log. Defesa em profundidade:
  // a RLS de habit_logs já bloqueia isso, mas evita uma volta ao banco
  // desnecessária caso o habit_id não pertença ao usuário.
  const { data: habit } = await supabase
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!habit) return

  await supabase
    .from('habit_logs')
    .upsert({ habit_id: habitId, data: date, status: nextStatus }, { onConflict: 'habit_id,data' })

  revalidatePath('/habitos')
}

/**
 * Marca/desmarca o check-in de um hábito numa data qualquer (retroativo
 * incluso) — tri-state: `true` (feito), `false` (não feito) ou `null`
 * (volta ao neutro, sem log nenhum pra aquele dia). Diferente de
 * `toggleCheckIn` (usado em /hoje, sempre grava true/false), esta ação
 * também apaga a linha quando o novo estado é `null`.
 */
export async function setCheckIn(habitId: string, date: string, status: boolean | null) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: habit } = await supabase
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!habit) return

  if (status === null) {
    await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('data', date)
  } else {
    await supabase
      .from('habit_logs')
      .upsert({ habit_id: habitId, data: date, status }, { onConflict: 'habit_id,data' })
  }

  revalidatePath('/habitos')
  revalidatePath('/hoje')
}

/**
 * Exclui o hábito definitivamente. O histórico de check-ins (habit_logs)
 * some junto por causa do "on delete cascade" na foreign key.
 */
export async function deleteHabit(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('habits').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/habitos')
  revalidatePath('/hoje')
}
