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

  if (frequencia !== 'diario' && frequencia !== 'semanal') {
    return { status: 'error', message: 'Selecione uma frequência válida.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const { error } = id
    ? await supabase
        .from('habits')
        .update({ nome, frequencia, area_id: areaId })
        .eq('id', id)
        .eq('user_id', user.id)
    : await supabase
        .from('habits')
        .insert({ nome, frequencia, area_id: areaId, user_id: user.id })

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
