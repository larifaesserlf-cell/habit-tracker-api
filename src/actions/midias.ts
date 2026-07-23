'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { MidiaStatus } from '@/lib/supabase/types'

export type MidiaFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

const TIPOS = ['livro', 'filme', 'serie', 'documentario']
const STATUSES: MidiaStatus[] = ['quero_ver_ler', 'em_andamento', 'concluido', 'abandonado']

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = (formData.get(campo) as string | null)?.trim() ?? ''
  return valor.length > 0 ? valor : null
}

function intOuNull(formData: FormData, campo: string): number | null {
  const valor = (formData.get(campo) as string | null)?.trim() ?? ''
  if (!valor) return null
  const n = Number.parseInt(valor, 10)
  return Number.isInteger(n) ? n : null
}

/**
 * Normaliza o gênero pra evitar duplicidade por diferença de maiúsculas/
 * minúsculas (ex: "ficção científica" e "Ficção Científica" ambos viram
 * "Ficção científica"). Não migra registros já salvos com o valor antigo.
 */
function normalizarGenero(genero: string): string {
  const limpo = genero.trim().toLowerCase()
  return limpo.charAt(0).toUpperCase() + limpo.slice(1)
}

/**
 * Server Action de criação/edição de item de mídia.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 * Únicos campos obrigatórios de verdade: título e tipo — dá pra só
 * anotar "quero ver X" sem preencher mais nada.
 */
export async function saveMidia(
  _prevState: MidiaFormState,
  formData: FormData
): Promise<MidiaFormState> {
  const id = (formData.get('id') as string | null) || null
  const titulo = (formData.get('titulo') as string | null)?.trim() ?? ''
  const tipo = formData.get('tipo') as string | null
  const midiaStatus = (formData.get('midia_status') as string | null) || 'quero_ver_ler'

  if (titulo.length === 0) {
    return { status: 'error', message: 'Informe ao menos o título.' }
  }
  if (!tipo || !TIPOS.includes(tipo)) {
    return { status: 'error', message: 'Selecione um tipo válido.' }
  }
  if (!STATUSES.includes(midiaStatus as MidiaStatus)) {
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

  const recomendariaRaw = (formData.get('recomendaria') as string | null) || ''
  const recomendaria = recomendariaRaw === '' ? null : recomendariaRaw === 'sim'

  const tagsRaw = (formData.get('tags') as string | null) ?? ''
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const generoBruto = textoOuNull(formData, 'genero')

  const payload = {
    titulo,
    tipo,
    status: midiaStatus,
    autor_diretor: textoOuNull(formData, 'autor_diretor'),
    genero: generoBruto ? normalizarGenero(generoBruto) : null,
    ano_lancamento: intOuNull(formData, 'ano_lancamento'),
    data_inicio: textoOuNull(formData, 'data_inicio'),
    data_conclusao: textoOuNull(formData, 'data_conclusao'),
    nota,
    temporada_atual: intOuNull(formData, 'temporada_atual'),
    progresso: textoOuNull(formData, 'progresso'),
    plataforma: textoOuNull(formData, 'plataforma'),
    recomendaria,
    releitura_rewatch: formData.get('releitura_rewatch') === 'on',
    comentario: textoOuNull(formData, 'comentario'),
    tags: tags.length > 0 ? tags : null,
  }

  const { error } = id
    ? await supabase.from('midias').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('midias').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar item: ${error.message}` }
  }

  revalidatePath('/midias')
  revalidatePath('/midias/estatisticas')
  return { status: 'success' }
}

/**
 * Muda apenas o status do item (usado pelos botões rápidos da listagem).
 */
export async function setMidiaStatus(id: string, novoStatus: MidiaStatus) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('midias').update({ status: novoStatus }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/midias')
  revalidatePath('/midias/estatisticas')
}

/**
 * Exclui o item definitivamente.
 */
export async function deleteMidia(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('midias').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/midias')
  revalidatePath('/midias/estatisticas')
}
