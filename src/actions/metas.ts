'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { MetaStatus } from '@/lib/supabase/types'

export type MetaFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

const TIPOS = ['curto', 'medio', 'longo']
const STATUSES: MetaStatus[] = ['ativa', 'concluida', 'abandonada']

/**
 * Server Action de criação/edição de meta.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 */
export async function saveMeta(
  _prevState: MetaFormState,
  formData: FormData
): Promise<MetaFormState> {
  const id = (formData.get('id') as string | null) || null
  const areaId = (formData.get('area_id') as string | null) || ''
  const titulo = (formData.get('titulo') as string | null)?.trim() ?? ''
  const tipo = formData.get('tipo') as string | null
  const metaStatus = (formData.get('meta_status') as string | null) || 'ativa'
  const dataAlvo = (formData.get('data_alvo') as string | null)?.trim() || null

  if (!areaId) {
    return { status: 'error', message: 'Selecione uma área.' }
  }
  if (titulo.length < 2) {
    return { status: 'error', message: 'O título da meta deve ter pelo menos 2 caracteres.' }
  }
  if (!tipo || !TIPOS.includes(tipo)) {
    return { status: 'error', message: 'Selecione um prazo válido.' }
  }
  if (!STATUSES.includes(metaStatus as MetaStatus)) {
    return { status: 'error', message: 'Status inválido.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  // Confere que a área pertence ao usuário. Defesa em profundidade: a RLS de
  // metas já bloqueia isso, mas dá um erro mais claro que um 403 genérico.
  const { data: area } = await supabase
    .from('areas')
    .select('id')
    .eq('id', areaId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!area) {
    return { status: 'error', message: 'Área inválida.' }
  }

  const payload = { area_id: areaId, titulo, tipo, status: metaStatus, data_alvo: dataAlvo }
  const { error } = id
    ? await supabase.from('metas').update(payload).eq('id', id)
    : await supabase.from('metas').insert(payload)

  if (error) {
    return { status: 'error', message: `Erro ao salvar meta: ${error.message}` }
  }

  revalidatePath('/metas')
  return { status: 'success' }
}

async function metaPertenceAoUsuario(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  metaId: string,
  userId: string
) {
  const { data } = await supabase
    .from('metas')
    .select('id, areas!inner(user_id)')
    .eq('id', metaId)
    .eq('areas.user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

/**
 * Muda apenas o status da meta (usado pelos botões rápidos da listagem).
 */
export async function setMetaStatus(id: string, novoStatus: MetaStatus) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  if (!(await metaPertenceAoUsuario(supabase, id, user.id))) return

  await supabase.from('metas').update({ status: novoStatus }).eq('id', id)
  revalidatePath('/metas')
}

/**
 * Exclui a meta definitivamente.
 */
export async function deleteMeta(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  if (!(await metaPertenceAoUsuario(supabase, id, user.id))) return

  await supabase.from('metas').delete().eq('id', id)
  revalidatePath('/metas')
}
