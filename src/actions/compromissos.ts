'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CompromissoFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

/**
 * Server Action de criação/edição de compromisso.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 */
export async function saveCompromisso(
  _prevState: CompromissoFormState,
  formData: FormData
): Promise<CompromissoFormState> {
  const id = (formData.get('id') as string | null) || null
  const data = (formData.get('data') as string | null) ?? ''
  const horaInicio = (formData.get('hora_inicio') as string | null) ?? ''
  const horaFim = (formData.get('hora_fim') as string | null) ?? ''
  const atividade = (formData.get('atividade') as string | null)?.trim() ?? ''
  const areaId = (formData.get('area_id') as string | null) || null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return { status: 'error', message: 'Selecione uma data válida.' }
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
    data,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    atividade,
    area_id: areaId,
  }

  const { error } = id
    ? await supabase.from('compromissos').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('compromissos').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar compromisso: ${error.message}` }
  }

  revalidatePath('/habitos')
  revalidatePath('/hoje')
  return { status: 'success' }
}

/**
 * Exclui o compromisso definitivamente.
 */
export async function deleteCompromisso(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('compromissos').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/habitos')
  revalidatePath('/hoje')
}

/** Marca/desmarca um compromisso já passado como feito. */
export async function toggleCompromissoFeito(id: string, feito: boolean) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('compromissos').update({ feito }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/habitos')
}
