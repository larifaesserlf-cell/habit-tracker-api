'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { FluxoMenstrual } from '@/lib/supabase/types'

export type CicloFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

const FLUXOS: FluxoMenstrual[] = ['nenhum', 'leve', 'moderado', 'intenso']

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
 * Server Action de criação/edição do registro diário. Como só pode haver um
 * registro por (usuária, data), faz upsert em vez de decidir entre
 * insert/update — salvar de novo pro mesmo dia atualiza o registro existente.
 */
export async function saveRegistroDiario(
  _prevState: CicloFormState,
  formData: FormData
): Promise<CicloFormState> {
  const data = (formData.get('data') as string | null)?.trim() ?? ''
  const fluxo = (formData.get('fluxo') as string | null) ?? 'nenhum'
  const tpm = formData.get('tpm') === 'on'
  const humor = (formData.get('humor') as string | null)?.trim() || null
  const sintomasRaw = (formData.get('sintomas') as string | null) ?? ''
  const notas = (formData.get('notas') as string | null)?.trim() || null

  if (!data) {
    return { status: 'error', message: 'Informe a data do registro.' }
  }
  if (!FLUXOS.includes(fluxo as FluxoMenstrual)) {
    return { status: 'error', message: 'Fluxo inválido.' }
  }

  const sintomas = sintomasRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const { error } = await supabase.from('registros_ciclo').upsert(
    {
      user_id: user.id,
      data,
      fluxo,
      tpm,
      humor,
      sintomas: sintomas.length > 0 ? sintomas : null,
      notas,
    },
    { onConflict: 'user_id,data' }
  )

  if (error) {
    return { status: 'error', message: `Erro ao salvar registro: ${error.message}` }
  }

  revalidatePath('/saude/ciclo')
  return { status: 'success' }
}
