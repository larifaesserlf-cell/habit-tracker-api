'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { textoOuNull, numeroOuNull } from '@/lib/formHelpers'
import type { PontoInteressePrioridade, PontoInteresseStatus } from '@/lib/supabase/types'

export type PontoInteresseFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

const PRIORIDADES: PontoInteressePrioridade[] = ['imperdivel', 'se_der_tempo', 'opcional']
const STATUSES: PontoInteresseStatus[] = ['quero_ir', 'visitado']

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
 * Server Action de criação/edição de ponto de interesse.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 */
export async function savePontoInteresse(
  _prevState: PontoInteresseFormState,
  formData: FormData
): Promise<PontoInteresseFormState> {
  const id = (formData.get('id') as string | null) || null
  const destinoId = (formData.get('destino_id') as string | null) || ''
  const nome = (formData.get('nome') as string | null)?.trim() ?? ''
  const prioridade = (formData.get('prioridade') as string | null) || 'se_der_tempo'
  const pontoStatus = (formData.get('ponto_status') as string | null) || 'quero_ir'

  if (!destinoId) {
    return { status: 'error', message: 'Destino inválido.' }
  }
  if (nome.length === 0) {
    return { status: 'error', message: 'Informe o nome do ponto de interesse.' }
  }
  if (!PRIORIDADES.includes(prioridade as PontoInteressePrioridade)) {
    return { status: 'error', message: 'Prioridade inválida.' }
  }
  if (!STATUSES.includes(pontoStatus as PontoInteresseStatus)) {
    return { status: 'error', message: 'Status inválido.' }
  }

  const notaRaw = (formData.get('nota') as string | null)?.trim() ?? ''
  let nota: number | null = null
  if (notaRaw) {
    nota = Number.parseFloat(notaRaw.replace(',', '.'))
    if (Number.isNaN(nota) || nota < 0 || nota > 10) {
      return { status: 'error', message: 'A nota deve estar entre 0 e 10.' }
    }
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
    prioridade,
    status: pontoStatus,
    data_visita: textoOuNull(formData, 'data_visita'),
    nota,
    custo_estimado: numeroOuNull(formData, 'custo_estimado'),
    duracao_estimada_horas: numeroOuNull(formData, 'duracao_estimada_horas'),
    link: textoOuNull(formData, 'link'),
    comentario: textoOuNull(formData, 'comentario'),
  }

  const { error } = id
    ? await supabase.from('pontos_interesse').update(payload).eq('id', id)
    : await supabase.from('pontos_interesse').insert(payload)

  if (error) {
    return { status: 'error', message: `Erro ao salvar ponto de interesse: ${error.message}` }
  }

  revalidatePath(`/viagens/${destino.viagem_id}/destinos/${destinoId}`)
  return { status: 'success' }
}

/**
 * Muda o status do ponto de interesse (botão rápido "Marcar visitado" /
 * "Desmarcar"). Ao marcar como visitado pela primeira vez, preenche
 * data_visita com hoje se ainda estiver em branco.
 */
export async function setPontoStatus(id: string, novoStatus: PontoInteresseStatus) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: ponto } = await supabase
    .from('pontos_interesse')
    .select('destino_id, data_visita')
    .eq('id', id)
    .maybeSingle()
  if (!ponto) return

  const destino = await buscarDestinoDoUsuario(supabase, ponto.destino_id, user.id)
  if (!destino) return

  const payload: { status: PontoInteresseStatus; data_visita?: string } = { status: novoStatus }
  if (novoStatus === 'visitado' && !ponto.data_visita) {
    payload.data_visita = new Date().toISOString().slice(0, 10)
  }

  await supabase.from('pontos_interesse').update(payload).eq('id', id)
  revalidatePath(`/viagens/${destino.viagem_id}/destinos/${ponto.destino_id}`)
}

/**
 * Exclui o ponto de interesse definitivamente.
 */
export async function deletePontoInteresse(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: ponto } = await supabase
    .from('pontos_interesse')
    .select('destino_id')
    .eq('id', id)
    .maybeSingle()
  if (!ponto) return

  const destino = await buscarDestinoDoUsuario(supabase, ponto.destino_id, user.id)
  if (!destino) return

  await supabase.from('pontos_interesse').delete().eq('id', id)
  revalidatePath(`/viagens/${destino.viagem_id}/destinos/${ponto.destino_id}`)
}
