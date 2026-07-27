'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { textoOuNull, intOuNull } from '@/lib/formHelpers'
import type { ItemWatchStatus, ItemWatchTipo } from '@/lib/supabase/types'

const TIPOS: ItemWatchTipo[] = ['filme', 'serie']
const STATUSES: ItemWatchStatus[] = ['quero_assistir', 'em_andamento', 'concluido']

export type ListaWatchFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

/**
 * Cria uma lista compartilhada. A criadora vira membro automaticamente via
 * trigger no banco (adicionar_criador_como_membro) — sem isso ela nem
 * conseguiria ver a lista que acabou de criar (RLS exige ser membro).
 */
export async function saveListaWatch(
  _prevState: ListaWatchFormState,
  formData: FormData
): Promise<ListaWatchFormState> {
  const nome = (formData.get('nome') as string | null)?.trim() ?? ''
  if (nome.length < 2) {
    return { status: 'error', message: 'O nome da lista deve ter pelo menos 2 caracteres.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  // Gera o id no app em vez de usar .select().single() encadeado no
  // insert (INSERT...RETURNING): a checagem de visibilidade do RETURNING
  // roda antes do trigger adicionar_criador_como_membro terminar de
  // inserir em lista_membros, então a policy de select (que depende dessa
  // membership) rejeita a própria linha recém-criada. Um insert simples,
  // sem RETURNING, não tem esse problema.
  const novoId = randomUUID()
  const { error } = await supabase.from('listas_watch').insert({ id: novoId, nome, criado_por: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao criar lista: ${error.message}` }
  }

  revalidatePath('/midias/juntos')
  redirect(`/midias/juntos/${novoId}`)
}

export type ItemWatchFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

/** Confere se o usuário é membro da lista antes de qualquer operação. */
async function pertenceALista(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  listaId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('lista_membros')
    .select('id')
    .eq('lista_id', listaId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

/**
 * Server Action de criação/edição de item da lista compartilhada.
 * Qualquer membro pode editar qualquer item (não só quem adicionou) — é
 * uma lista compartilhada de verdade. `adicionado_por` só é definido na
 * criação e nunca é alterado numa edição.
 */
export async function saveItemWatch(
  _prevState: ItemWatchFormState,
  formData: FormData
): Promise<ItemWatchFormState> {
  const id = (formData.get('id') as string | null) || null
  const listaId = (formData.get('lista_id') as string | null) || ''
  const titulo = (formData.get('titulo') as string | null)?.trim() ?? ''
  const tipo = formData.get('tipo') as string | null
  const itemStatus = (formData.get('item_status') as string | null) || 'quero_assistir'

  if (!listaId) {
    return { status: 'error', message: 'Lista inválida.' }
  }
  if (titulo.length === 0) {
    return { status: 'error', message: 'Informe ao menos o título.' }
  }
  if (!tipo || !TIPOS.includes(tipo as ItemWatchTipo)) {
    return { status: 'error', message: 'Selecione filme ou série.' }
  }
  if (!STATUSES.includes(itemStatus as ItemWatchStatus)) {
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

  if (!(await pertenceALista(supabase, listaId, user.id))) {
    return { status: 'error', message: 'Você não faz parte dessa lista.' }
  }

  const payload = {
    lista_id: listaId,
    titulo,
    tipo,
    status: itemStatus,
    ano_lancamento: intOuNull(formData, 'ano_lancamento'),
    capa_url: textoOuNull(formData, 'capa_url'),
    nota,
    comentario: textoOuNull(formData, 'comentario'),
  }

  const { error } = id
    ? await supabase.from('itens_watch').update(payload).eq('id', id)
    : await supabase.from('itens_watch').insert({ ...payload, adicionado_por: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar item: ${error.message}` }
  }

  revalidatePath(`/midias/juntos/${listaId}`)
  return { status: 'success' }
}

/** Muda apenas o status do item (usado pelos botões rápidos da listagem). */
export async function setItemWatchStatus(id: string, listaId: string, novoStatus: ItemWatchStatus) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  if (!(await pertenceALista(supabase, listaId, user.id))) return

  await supabase.from('itens_watch').update({ status: novoStatus }).eq('id', id)
  revalidatePath(`/midias/juntos/${listaId}`)
}

/** Exclui o item definitivamente. Qualquer membro pode remover. */
export async function deleteItemWatch(id: string, listaId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  if (!(await pertenceALista(supabase, listaId, user.id))) return

  await supabase.from('itens_watch').delete().eq('id', id)
  revalidatePath(`/midias/juntos/${listaId}`)
}
