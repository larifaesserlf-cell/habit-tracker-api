'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type AreaFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

/**
 * Server Action de criação/edição de área.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 */
export async function saveArea(
  _prevState: AreaFormState,
  formData: FormData
): Promise<AreaFormState> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim() ?? ''
  const cor = (formData.get('cor') as string | null)?.trim() || '#7c6af7'
  const icone = (formData.get('icone') as string | null)?.trim() || '🔥'
  const ordem = Number(formData.get('ordem') ?? 0) || 0

  if (nome.length < 2) {
    return { status: 'error', message: 'O nome da área deve ter pelo menos 2 caracteres.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const { error } = id
    ? await supabase
        .from('areas')
        .update({ nome, cor, icone, ordem })
        .eq('id', id)
        .eq('user_id', user.id)
    : await supabase.from('areas').insert({ nome, cor, icone, ordem, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar área: ${error.message}` }
  }

  revalidatePath('/areas')
  revalidatePath('/habitos')
  return { status: 'success' }
}

/**
 * Arquiva ou reativa uma área (soft delete, preserva hábitos vinculados).
 */
export async function setAreaArquivada(id: string, arquivada: boolean) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('areas').update({ arquivada }).eq('id', id).eq('user_id', user.id)

  revalidatePath('/areas')
  revalidatePath('/habitos')
}
