'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { textoOuNull, numeroOuNull } from '@/lib/formHelpers'
import type { ViagemStatus } from '@/lib/supabase/types'

export type ViagemFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

const STATUSES: ViagemStatus[] = ['quero_fazer', 'planejando', 'confirmada', 'concluida']

/**
 * Server Action de criação/edição de viagem.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 * Único campo obrigatório de verdade é o nome.
 */
export async function saveViagem(
  _prevState: ViagemFormState,
  formData: FormData
): Promise<ViagemFormState> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim() ?? ''
  const viagemStatus = (formData.get('viagem_status') as string | null) || 'quero_fazer'

  if (nome.length === 0) {
    return { status: 'error', message: 'Informe o nome da viagem.' }
  }
  if (!STATUSES.includes(viagemStatus as ViagemStatus)) {
    return { status: 'error', message: 'Status inválido.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const payload = {
    nome,
    status: viagemStatus,
    data_prevista_inicio: textoOuNull(formData, 'data_prevista_inicio'),
    data_prevista_fim: textoOuNull(formData, 'data_prevista_fim'),
    orcamento_estimado: numeroOuNull(formData, 'orcamento_estimado'),
    orcamento_real: numeroOuNull(formData, 'orcamento_real'),
    notas: textoOuNull(formData, 'notas'),
  }

  const { error } = id
    ? await supabase.from('viagens').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('viagens').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar viagem: ${error.message}` }
  }

  revalidatePath('/viagens')
  if (id) revalidatePath(`/viagens/${id}`)
  return { status: 'success' }
}

/**
 * Muda apenas o status da viagem (usado pelo botão rápido "Avançar").
 */
export async function setViagemStatus(id: string, novoStatus: ViagemStatus) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('viagens').update({ status: novoStatus }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/viagens')
  revalidatePath(`/viagens/${id}`)
}

/**
 * Exclui a viagem definitivamente (cascade apaga destinos, pontos de
 * interesse, hospedagens e transportes vinculados).
 */
export async function deleteViagem(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('viagens').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/viagens')
}
