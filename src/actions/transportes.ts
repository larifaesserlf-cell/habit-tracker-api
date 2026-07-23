'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { textoOuNull, numeroOuNull } from '@/lib/formHelpers'

export type TransporteFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

async function viagemPertenceAoUsuario(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  viagemId: string,
  userId: string
) {
  const { data } = await supabase
    .from('viagens')
    .select('id')
    .eq('id', viagemId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

/**
 * Server Action de criação/edição de transporte.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 * destino_origem_id e destino_destino_id são opcionais (ex: voo
 * internacional de chegada pode não ter uma "origem" cadastrada como destino).
 */
export async function saveTransporte(
  _prevState: TransporteFormState,
  formData: FormData
): Promise<TransporteFormState> {
  const id = (formData.get('id') as string | null) || null
  const viagemId = (formData.get('viagem_id') as string | null) || ''
  const tipo = (formData.get('tipo') as string | null)?.trim() ?? ''
  const destinoOrigemId = (formData.get('destino_origem_id') as string | null) || null
  const destinoDestinoId = (formData.get('destino_destino_id') as string | null) || null

  if (!viagemId) {
    return { status: 'error', message: 'Viagem inválida.' }
  }
  if (tipo.length === 0) {
    return { status: 'error', message: 'Informe o tipo de transporte (ex: voo, trem, ônibus).' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }
  if (!(await viagemPertenceAoUsuario(supabase, viagemId, user.id))) {
    return { status: 'error', message: 'Viagem inválida.' }
  }

  const payload = {
    viagem_id: viagemId,
    destino_origem_id: destinoOrigemId || null,
    destino_destino_id: destinoDestinoId || null,
    tipo,
    custo_estimado: numeroOuNull(formData, 'custo_estimado'),
    duracao_estimada_horas: numeroOuNull(formData, 'duracao_estimada_horas'),
    notas: textoOuNull(formData, 'notas'),
  }

  const { error } = id
    ? await supabase.from('transportes').update(payload).eq('id', id)
    : await supabase.from('transportes').insert(payload)

  if (error) {
    return { status: 'error', message: `Erro ao salvar transporte: ${error.message}` }
  }

  revalidatePath(`/viagens/${viagemId}`)
  revalidatePath(`/viagens/${viagemId}/transportes`)
  return { status: 'success' }
}

/**
 * Exclui o transporte definitivamente.
 */
export async function deleteTransporte(id: string, viagemId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  if (!(await viagemPertenceAoUsuario(supabase, viagemId, user.id))) return

  await supabase.from('transportes').delete().eq('id', id)
  revalidatePath(`/viagens/${viagemId}`)
  revalidatePath(`/viagens/${viagemId}/transportes`)
}
