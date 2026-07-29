'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CicloFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

/**
 * Server Action única pra criar/editar um ciclo — serve os quatro fluxos da
 * tela (registrar início, registrar fim, adicionar retroativo e editar um já
 * existente): todos são só variações de quais campos vêm preenchidos no
 * formulário. Se `formData` tiver `id`, atualiza; senão, cria.
 */
export async function saveCiclo(_prevState: CicloFormState, formData: FormData): Promise<CicloFormState> {
  const id = (formData.get('id') as string | null) || null
  const dataInicio = (formData.get('data_inicio') as string | null)?.trim() ?? ''
  const dataFim = (formData.get('data_fim') as string | null)?.trim() || null

  if (!dataInicio) {
    return { status: 'error', message: 'Informe a data de início.' }
  }
  if (dataFim && dataFim < dataInicio) {
    return { status: 'error', message: 'A data de fim não pode ser antes da data de início.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const payload = { data_inicio: dataInicio, data_fim: dataFim }
  const { error } = id
    ? await supabase.from('ciclos_menstruais').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('ciclos_menstruais').insert({ ...payload, user_id: user.id })

  if (error) {
    // 23505 = violação de unique constraint — aqui só pode ser o índice que
    // garante um único ciclo em andamento (data_fim null) por usuária.
    if (error.code === '23505') {
      return {
        status: 'error',
        message: 'Já existe um ciclo em andamento sem data de fim. Finalize-o antes de deixar este sem data de fim.',
      }
    }
    return { status: 'error', message: `Erro ao salvar ciclo: ${error.message}` }
  }

  revalidatePath('/saude/ciclo')
  return { status: 'success' }
}

/**
 * Exclui um ciclo definitivamente.
 */
export async function deleteCiclo(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('ciclos_menstruais').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/saude/ciclo')
}

/**
 * Server Action de criação/edição de uma observação livre do mês. Sem campo
 * de data — na criação, `created_at` é o horário do banco (now()); na
 * edição, não é alterado, pra observação não "pular" de posição na lista
 * cronológica só por ter sido corrigida depois.
 */
export async function saveObservacao(
  _prevState: CicloFormState,
  formData: FormData
): Promise<CicloFormState> {
  const id = (formData.get('id') as string | null) || null
  const humor = (formData.get('humor') as string | null)?.trim() || null
  const sintomasRaw = (formData.get('sintomas') as string | null) ?? ''
  const notas = (formData.get('notas') as string | null)?.trim() || null

  const sintomas = sintomasRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (!humor && sintomas.length === 0 && !notas) {
    return { status: 'error', message: 'Preencha pelo menos um campo.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const payload = {
    humor,
    sintomas: sintomas.length > 0 ? sintomas : null,
    notas,
  }

  const { error } = id
    ? await supabase.from('observacoes_ciclo').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('observacoes_ciclo').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar observação: ${error.message}` }
  }

  revalidatePath('/saude/ciclo')
  return { status: 'success' }
}

/**
 * Exclui a observação definitivamente.
 */
export async function deleteObservacao(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('observacoes_ciclo').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/saude/ciclo')
}
