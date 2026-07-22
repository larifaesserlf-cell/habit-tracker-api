'use client'

import { useState, useTransition } from 'react'
import { supabase } from '@/lib/supabase/client'
import styles from './page.module.css'

type LoginState =
  | { status: 'idle' }
  | { status: 'error'; errors: { email?: string; password?: string; general?: string } }
  | { status: 'success' }

export default function LoginPage() {
  const [state, setState] = useState<LoginState>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()

  function validate(email: string, password: string) {
    const errors: NonNullable<Extract<LoginState, { status: 'error' }>['errors']> = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) errors.email = 'Informe um e-mail válido.'
    if (password.length < 8) errors.password = 'A senha deve ter no mínimo 8 caracteres.'
    return errors
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string).trim()
    const password = formData.get('password') as string

    // Validação client-side
    const errors = validate(email, password)
    if (Object.keys(errors).length > 0) {
      setState({ status: 'error', errors })
      return
    }

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        const msg = error.message.toLowerCase()

        if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('email not confirmed')) {
          setState({
            status: 'error',
            errors: { general: 'E-mail ou senha incorretos. Verifique também se confirmou seu e-mail.' },
          })
          return
        }

        if (msg.includes('network') || msg.includes('fetch')) {
          setState({
            status: 'error',
            errors: { general: 'Falha de conexão. Verifique sua internet e tente novamente.' },
          })
          return
        }

        setState({
          status: 'error',
          errors: { general: `Erro ao entrar: ${error.message}` },
        })
        return
      }

      setState({ status: 'success' })
      // Redireciona após login bem-sucedido (respeita ?redirectTo= definido pelo proxy)
      const redirectTo = new URLSearchParams(window.location.search).get('redirectTo')
      window.location.href = redirectTo || '/dashboard'
    })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.logo}>🔥</div>
          <h1 className={styles.title}>Entrar</h1>
          <p className={styles.subtitle}>Bem-vindo de volta</p>
        </div>

        {/* Erro geral */}
        {state.status === 'error' && state.errors.general && (
          <div className={styles.alertError} role="alert">
            {state.errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* E-mail */}
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              className={`${styles.input} ${
                state.status === 'error' && state.errors.email ? styles.inputError : ''
              }`}
              aria-describedby={
                state.status === 'error' && state.errors.email ? 'email-error' : undefined
              }
            />
            {state.status === 'error' && state.errors.email && (
              <span id="email-error" className={styles.fieldError} role="alert">
                {state.errors.email}
              </span>
            )}
          </div>

          {/* Senha */}
          <div className={styles.field}>
            <div className={styles.passwordRow}>
              <label htmlFor="password" className={styles.label}>
                Senha
              </label>
              <a href="#" className={styles.forgotLink}>
                Esqueceu a senha?
              </a>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              className={`${styles.input} ${
                state.status === 'error' && state.errors.password ? styles.inputError : ''
              }`}
              aria-describedby={
                state.status === 'error' && state.errors.password ? 'password-error' : undefined
              }
            />
            {state.status === 'error' && state.errors.password && (
              <span id="password-error" className={styles.fieldError} role="alert">
                {state.errors.password}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className={styles.submitBtn}
            aria-busy={isPending}
          >
            {isPending ? <span className={styles.spinner} aria-hidden="true" /> : null}
            {isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className={styles.registerHint}>
          Não tem conta?{' '}
          <a href="/registro" className={styles.registerLink}>
            Criar conta
          </a>
        </p>
      </div>
    </div>
  )
}
