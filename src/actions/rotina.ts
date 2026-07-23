'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type RotinaFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

/**
 * Server Action de criação/edição de bloco de rotina.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 */
export async function saveBloco(
  _prevState: RotinaFormState,
  formData: FormData
): Promise<RotinaFormState> {
  const id = (formData.get('id') as string | null) || null
  const diaSemana = Number(formData.get('dia_semana'))
  const horaInicio = (formData.get('hora_inicio') as string | null) ?? ''
  const horaFim = (formData.get('hora_fim') as string | null) ?? ''
  const atividade = (formData.get('atividade') as string | null)?.trim() ?? ''
  const areaId = (formData.get('area_id') as string | null) || null

  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
    return { status: 'error', message: 'Selecione um dia da semana válido.' }
  }
  if (atividade.length < 2) {
    return { status: 'error', message: 'A atividade deve ter pelo menos 2 caracteres.' }
  }
  if (!horaInicio || !horaFim) {
    return { status: 'error', message: 'Informe o horário de início e fim.' }
  }
  if (horaFim <= horaInicio) {
    return { status: 'error', message: 'O horário de fim deve ser depois do horário de início.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  if (areaId) {
    const { data: area } = await supabase
      .from('areas')
      .select('id')
      .eq('id', areaId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!area) {
      return { status: 'error', message: 'Área inválida.' }
    }
  }

  const payload = {
    dia_semana: diaSemana,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    atividade,
    area_id: areaId,
  }

  const { error } = id
    ? await supabase.from('rotina_diaria').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('rotina_diaria').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar bloco: ${error.message}` }
  }

  revalidatePath('/rotina')
  return { status: 'success' }
}

/**
 * Exclui o bloco de rotina definitivamente.
 */
export async function deleteBloco(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('rotina_diaria').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/rotina')
}
