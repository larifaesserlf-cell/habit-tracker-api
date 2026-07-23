'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { textoOuNull, intOuNull } from '@/lib/formHelpers'

export type DestinoFormState =
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
 * Server Action de criação/edição de destino.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria — e
 * nesse caso a ordem é atribuída automaticamente (vai pro fim da lista).
 * Reordenar depois é feito só pelos botões ↑/↓ (ver moveDestino).
 */
export async function saveDestino(
  _prevState: DestinoFormState,
  formData: FormData
): Promise<DestinoFormState> {
  const id = (formData.get('id') as string | null) || null
  const viagemId = (formData.get('viagem_id') as string | null) || ''
  const nomeCidade = (formData.get('nome_cidade') as string | null)?.trim() ?? ''

  if (!viagemId) {
    return { status: 'error', message: 'Viagem inválida.' }
  }
  if (nomeCidade.length === 0) {
    return { status: 'error', message: 'Informe o nome da cidade.' }
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

  const camposComuns = {
    nome_cidade: nomeCidade,
    pais: textoOuNull(formData, 'pais'),
    dias_estimados: intOuNull(formData, 'dias_estimados'),
    notas: textoOuNull(formData, 'notas'),
  }

  if (id) {
    const { error } = await supabase.from('destinos').update(camposComuns).eq('id', id)
    if (error) return { status: 'error', message: `Erro ao salvar destino: ${error.message}` }
  } else {
    const { count } = await supabase
      .from('destinos')
      .select('id', { count: 'exact', head: true })
      .eq('viagem_id', viagemId)
    const { error } = await supabase
      .from('destinos')
      .insert({ ...camposComuns, viagem_id: viagemId, ordem: count ?? 0 })
    if (error) return { status: 'error', message: `Erro ao salvar destino: ${error.message}` }
  }

  revalidatePath(`/viagens/${viagemId}`)
  return { status: 'success' }
}

/**
 * Exclui o destino definitivamente (cascade apaga pontos de interesse e
 * hospedagens vinculados; transportes que o referenciam ficam com essa
 * ponta em branco).
 */
export async function deleteDestino(id: string, viagemId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  if (!(await viagemPertenceAoUsuario(supabase, viagemId, user.id))) return

  await supabase.from('destinos').delete().eq('id', id)
  revalidatePath(`/viagens/${viagemId}`)
}

/**
 * Troca a ordem do destino com a do vizinho (acima ou abaixo).
 */
export async function moveDestino(destinoId: string, viagemId: string, direcao: 'up' | 'down') {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  if (!(await viagemPertenceAoUsuario(supabase, viagemId, user.id))) return

  const { data: destinos } = await supabase
    .from('destinos')
    .select('id, ordem')
    .eq('viagem_id', viagemId)
    .order('ordem', { ascending: true })

  if (!destinos) return
  const idx = destinos.findIndex((d) => d.id === destinoId)
  const alvoIdx = direcao === 'up' ? idx - 1 : idx + 1
  if (idx === -1 || alvoIdx < 0 || alvoIdx >= destinos.length) return

  const atual = destinos[idx]
  const alvo = destinos[alvoIdx]

  await supabase.from('destinos').update({ ordem: alvo.ordem }).eq('id', atual.id)
  await supabase.from('destinos').update({ ordem: atual.ordem }).eq('id', alvo.id)

  revalidatePath(`/viagens/${viagemId}`)
}
