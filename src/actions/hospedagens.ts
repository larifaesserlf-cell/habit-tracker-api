'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { textoOuNull } from '@/lib/formHelpers'

export type HospedagemFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

async function buscarDestinoDoUsuario(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  destinoId: string,
  userId: string
) {
  const { data } = await supabase
    .from('destinos')
    .select('id, viagem_id, viagens!inner(user_id)')
    .eq('id', destinoId)
    .eq('viagens.user_id', userId)
    .maybeSingle()
  return data as { id: string; viagem_id: string } | null
}

/**
 * Server Action de criação/edição de hospedagem cotada.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 * O banco permite `nome` em branco (pode ser só uma cotação de tipo/faixa
 * de preço), mas exigimos aqui pra evitar entradas totalmente vazias.
 */
export async function saveHospedagem(
  _prevState: HospedagemFormState,
  formData: FormData
): Promise<HospedagemFormState> {
  const id = (formData.get('id') as string | null) || null
  const destinoId = (formData.get('destino_id') as string | null) || ''
  const nome = (formData.get('nome') as string | null)?.trim() ?? ''

  if (!destinoId) {
    return { status: 'error', message: 'Destino inválido.' }
  }
  if (nome.length === 0) {
    return { status: 'error', message: 'Informe um nome ou referência pra hospedagem.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const destino = await buscarDestinoDoUsuario(supabase, destinoId, user.id)
  if (!destino) {
    return { status: 'error', message: 'Destino inválido.' }
  }

  const payload = {
    destino_id: destinoId,
    nome,
    tipo: textoOuNull(formData, 'tipo'),
    regiao_bairro: textoOuNull(formData, 'regiao_bairro'),
    faixa_preco: textoOuNull(formData, 'faixa_preco'),
    link: textoOuNull(formData, 'link'),
    reservado: formData.get('reservado') === 'on',
    notas: textoOuNull(formData, 'notas'),
  }

  const { error } = id
    ? await supabase.from('hospedagens').update(payload).eq('id', id)
    : await supabase.from('hospedagens').insert(payload)

  if (error) {
    return { status: 'error', message: `Erro ao salvar hospedagem: ${error.message}` }
  }

  revalidatePath(`/viagens/${destino.viagem_id}/destinos/${destinoId}`)
  return { status: 'success' }
}

/**
 * Alterna o campo "reservado" (botão rápido na listagem).
 */
export async function toggleReservado(id: string, reservado: boolean) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: hosp } = await supabase.from('hospedagens').select('destino_id').eq('id', id).maybeSingle()
  if (!hosp) return

  const destino = await buscarDestinoDoUsuario(supabase, hosp.destino_id, user.id)
  if (!destino) return

  await supabase.from('hospedagens').update({ reservado }).eq('id', id)
  revalidatePath(`/viagens/${destino.viagem_id}/destinos/${hosp.destino_id}`)
}

/**
 * Exclui a hospedagem definitivamente.
 */
export async function deleteHospedagem(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: hosp } = await supabase.from('hospedagens').select('destino_id').eq('id', id).maybeSingle()
  if (!hosp) return

  const destino = await buscarDestinoDoUsuario(supabase, hosp.destino_id, user.id)
  if (!destino) return

  await supabase.from('hospedagens').delete().eq('id', id)
  revalidatePath(`/viagens/${destino.viagem_id}/destinos/${hosp.destino_id}`)
}
