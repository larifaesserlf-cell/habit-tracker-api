'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ReflexaoFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

/**
 * Server Action de criação/edição de reflexão.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 * Único campo obrigatório de verdade é o texto — data e humor têm defaults
 * de baixa fricção (data de hoje, humor em branco).
 */
export async function saveReflexao(
  _prevState: ReflexaoFormState,
  formData: FormData
): Promise<ReflexaoFormState> {
  const id = (formData.get('id') as string | null) || null
  const texto = (formData.get('texto') as string | null)?.trim() ?? ''
  const dataRaw = (formData.get('data') as string | null)?.trim() || ''
  const humorRaw = (formData.get('humor_opcional') as string | null) || ''

  if (texto.length === 0) {
    return { status: 'error', message: 'Escreva alguma coisa antes de salvar.' }
  }

  let humor: number | null = null
  if (humorRaw) {
    humor = Number(humorRaw)
    if (!Number.isInteger(humor) || humor < 1 || humor > 5) {
      return { status: 'error', message: 'Humor inválido.' }
    }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const payload = {
    texto,
    humor_opcional: humor,
    ...(dataRaw ? { data: dataRaw } : {}),
  }

  const { error } = id
    ? await supabase.from('reflexoes').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('reflexoes').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar reflexão: ${error.message}` }
  }

  revalidatePath('/reflexoes')
  return { status: 'success' }
}

/**
 * Exclui a reflexão definitivamente.
 */
export async function deleteReflexao(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('reflexoes').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/reflexoes')
}
