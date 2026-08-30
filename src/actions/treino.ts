'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type TreinoFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

type ExercicioInput = { nome: string; seriesReps: string; carga: string }

/**
 * Server Action pra registrar uma sessão de treino inteira (a sessão +
 * a lista de exercícios digitada no registro rápido, serializada como JSON
 * num input hidden — mais simples que indexar N campos de formulário pra
 * uma lista de tamanho variável).
 */
export async function saveTreino(_prevState: TreinoFormState, formData: FormData): Promise<TreinoFormState> {
  const data = (formData.get('data') as string | null)?.trim() ?? ''
  const nome = (formData.get('nome') as string | null)?.trim() ?? ''
  const exerciciosRaw = (formData.get('exercicios') as string | null) ?? '[]'

  if (!data) {
    return { status: 'error', message: 'Informe a data do treino.' }
  }
  if (!nome) {
    return { status: 'error', message: 'Informe o nome ou número do treino.' }
  }

  let exerciciosParsed: ExercicioInput[]
  try {
    exerciciosParsed = JSON.parse(exerciciosRaw)
  } catch {
    return { status: 'error', message: 'Erro ao processar a lista de exercícios.' }
  }

  const exercicios = exerciciosParsed
    .map((e) => ({
      nome: (e.nome ?? '').trim(),
      seriesReps: (e.seriesReps ?? '').trim(),
      carga: (e.carga ?? '').trim(),
    }))
    .filter((e) => e.nome.length > 0)

  if (exercicios.length === 0) {
    return { status: 'error', message: 'Adicione pelo menos um exercício.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const { data: treino, error: erroTreino } = await supabase
    .from('treinos')
    .insert({ user_id: user.id, data, nome })
    .select('id')
    .single()

  if (erroTreino || !treino) {
    if (erroTreino?.code === '23505') {
      return { status: 'error', message: 'Já existe um treino com essa data e nome.' }
    }
    return { status: 'error', message: `Erro ao salvar treino: ${erroTreino?.message}` }
  }

  const payload = exercicios.map((e, i) => ({
    treino_id: treino.id,
    nome: e.nome,
    series_reps: e.seriesReps || null,
    carga: e.carga || null,
    ordem: i + 1,
  }))

  const { error: erroExercicios } = await supabase.from('exercicios_treino').insert(payload)
  if (erroExercicios) {
    // Sem transação client-side no supabase-js — ao menos não deixa uma
    // sessão órfã sem nenhum exercício se a segunda inserção falhar.
    await supabase.from('treinos').delete().eq('id', treino.id)
    return { status: 'error', message: `Erro ao salvar exercícios: ${erroExercicios.message}` }
  }

  revalidatePath('/treino')
  return { status: 'success' }
}

/**
 * Exclui um treino e, em cascata (FK on delete cascade), seus exercícios.
 */
export async function deleteTreino(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('treinos').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/treino')
}
