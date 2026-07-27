'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CriarConviteResult = { status: 'success'; token: string } | { status: 'error'; message: string }

/**
 * Cria um convite pra lista compartilhada. Confere posse (ser membro) antes
 * de inserir — a RLS de convites_lista só exige criado_por = auth.uid(),
 * mas sem essa checagem extra qualquer usuário autenticado poderia gerar
 * convites pra listas de que não faz parte.
 */
export async function criarConvite(listaId: string): Promise<CriarConviteResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const { data: membro } = await supabase
    .from('lista_membros')
    .select('id')
    .eq('lista_id', listaId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membro) {
    return { status: 'error', message: 'Você não faz parte dessa lista.' }
  }

  const { data, error } = await supabase
    .from('convites_lista')
    .insert({ lista_id: listaId, criado_por: user.id })
    .select('token')
    .single()

  if (error || !data) {
    return { status: 'error', message: `Erro ao criar convite: ${error?.message ?? 'desconhecido'}` }
  }

  return { status: 'success', token: data.token }
}

export type RedeemConviteResult =
  | { status: 'success'; listaId: string }
  | { status: 'error'; reason: 'invalido' | 'usado' | 'nao_autenticado' | 'desconhecido' }

/**
 * Resgata um convite chamando a função redeem_convite() do banco (security
 * definer — precisa rodar com privilégio elevado pra ler um convite que
 * ainda não pertence ao usuário e pra inseri-lo em lista_membros, algo que
 * a RLS normal não permite pro cliente).
 */
export async function redeemConvite(token: string): Promise<RedeemConviteResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', reason: 'nao_autenticado' }
  }

  const { data, error } = await supabase.rpc('redeem_convite', { p_token: token })

  if (error) {
    const msg = error.message.toUpperCase()
    if (msg.includes('CONVITE_INVALIDO')) return { status: 'error', reason: 'invalido' }
    if (msg.includes('CONVITE_JA_USADO')) return { status: 'error', reason: 'usado' }
    if (msg.includes('NAO_AUTENTICADO')) return { status: 'error', reason: 'nao_autenticado' }
    return { status: 'error', reason: 'desconhecido' }
  }

  // Sem revalidatePath aqui de propósito: essa função é chamada durante o
  // render de /convite/[token] (Server Component), não a partir de uma
  // submissão de formulário/clique — Next.js proíbe revalidatePath nesse
  // contexto ("used during render"). Não faz falta de qualquer forma: o
  // redirect() logo em seguida já busca dados frescos na navegação.
  return { status: 'success', listaId: data as string }
}
