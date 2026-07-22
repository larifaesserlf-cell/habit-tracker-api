'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp, type SignUpState } from '@/actions/auth'
import styles from './page.module.css'

const initialState: SignUpState = { status: 'idle' }

export default function RegistroPage() {
  const [state, action, pending] = useActionState(signUp, initialState)

  if (state.status === 'success') {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Conta criada!</h1>
          {state.autoLoggedIn ? (
            <>
              <p className={styles.successMsg}>
                Sua conta <strong>{state.email}</strong> foi criada e você já
                está conectado.
              </p>
              <a href="/dashboard" className={styles.backLink}>
                Ir para o painel →
              </a>
            </>
          ) : (
            <>
              <p className={styles.successMsg}>
                Enviamos um link de confirmação para{' '}
                <strong>{state.email}</strong>.<br />
                Verifique sua caixa de entrada (e o spam) para ativar sua conta.
              </p>
              <Link href="/" className={styles.backLink}>
                ← Voltar ao início
              </Link>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.logo}>🔥</div>
          <h1 className={styles.title}>Criar conta</h1>
          <p className={styles.subtitle}>
            Comece a rastrear seus hábitos hoje
          </p>
        </div>

        {/* Erro geral */}
        {state.status === 'error' && state.errors?.general && (
          <div className={styles.alertError} role="alert">
            {state.errors.general}
          </div>
        )}

        <form action={action} className={styles.form} noValidate>
          {/* Nome */}
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Seu nome"
              className={`${styles.input} ${
                state.status === 'error' && state.errors?.name
                  ? styles.inputError
                  : ''
              }`}
              aria-describedby={
                state.status === 'error' && state.errors?.name
                  ? 'name-error'
                  : undefined
              }
            />
            {state.status === 'error' && state.errors?.name && (
              <span id="name-error" className={styles.fieldError} role="alert">
                {state.errors.name}
              </span>
            )}
          </div>

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
                state.status === 'error' && state.errors?.email
                  ? styles.inputError
                  : ''
              }`}
              aria-describedby={
                state.status === 'error' && state.errors?.email
                  ? 'email-error'
                  : undefined
              }
            />
            {state.status === 'error' && state.errors?.email && (
              <span id="email-error" className={styles.fieldError} role="alert">
                {state.errors.email}
              </span>
            )}
          </div>

          {/* Senha */}
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres, com letra e número"
              className={`${styles.input} ${
                state.status === 'error' && state.errors?.password
                  ? styles.inputError
                  : ''
              }`}
              aria-describedby={
                state.status === 'error' && state.errors?.password
                  ? 'password-error'
                  : undefined
              }
            />
            {state.status === 'error' && state.errors?.password && (
              <span
                id="password-error"
                className={styles.fieldError}
                role="alert"
              >
                {state.errors.password}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            className={styles.submitBtn}
            aria-busy={pending}
          >
            {pending ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : null}
            {pending ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className={styles.loginHint}>
          Já tem conta?{' '}
          <a href="/login" className={styles.loginLink}>
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
