'use server'

import { supabase } from '@/lib/supabase/client'

export type SignUpState =
  | {
      status: 'idle'
    }
  | {
      status: 'error'
      errors?: {
        name?: string
        email?: string
        password?: string
        general?: string
      }
    }
  | {
      status: 'success'
      email: string
    }

/**
 * Server Action de registro de usuário via Supabase Auth.
 * Chamada pelo formulário em /registro usando useActionState.
 */
export async function signUp(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  // ── Validação de campos ──────────────────────────────────────────
  const errors: NonNullable<Extract<SignUpState, { status: 'error' }>['errors']> = {}

  if (name.length < 2) {
    errors.name = 'O nome deve ter pelo menos 2 caracteres.'
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    errors.email = 'Informe um e-mail válido.'
  }

  if (password.length < 8) {
    errors.password = 'A senha deve ter no mínimo 8 caracteres.'
  } else if (!/[a-zA-Z]/.test(password)) {
    errors.password = 'A senha deve conter pelo menos uma letra.'
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'A senha deve conter pelo menos um número.'
  }

  if (Object.keys(errors).length > 0) {
    return { status: 'error', errors }
  }

  // ── Chamada ao Supabase Auth ─────────────────────────────────────
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    // Mapeia os códigos de erro conhecidos do Supabase Auth
    const msg = error.message.toLowerCase()

    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return {
        status: 'error',
        errors: { email: 'Este e-mail já está cadastrado.' },
      }
    }

    if (msg.includes('password') && msg.includes('weak')) {
      return {
        status: 'error',
        errors: { password: 'Senha muito fraca. Tente uma combinação mais segura.' },
      }
    }

    if (msg.includes('network') || msg.includes('fetch')) {
      return {
        status: 'error',
        errors: { general: 'Falha de conexão. Verifique sua internet e tente novamente.' },
      }
    }

    return {
      status: 'error',
      errors: { general: `Erro ao criar conta: ${error.message}` },
    }
  }

  return { status: 'success', email }
}
