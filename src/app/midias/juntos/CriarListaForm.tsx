'use client'

import { useActionState, useState } from 'react'
import { saveListaWatch, type ListaWatchFormState } from '@/actions/listasWatch'
import styles from './page.module.css'

const initialState: ListaWatchFormState = { status: 'idle' }

export function CriarListaForm() {
  const [state, formAction, pending] = useActionState(saveListaWatch, initialState)
  // Controlado pra sobreviver a um erro de validação sem perder o que já
  // foi digitado (o redirect só acontece em caso de sucesso, então não
  // precisa de lógica de reset aqui).
  const [nome, setNome] = useState('')

  return (
    <form action={formAction} className={styles.form}>
      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.fieldGrow}>
        <label htmlFor="nome">Nome da lista</label>
        <input
          id="nome"
          name="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Assistir com o Christian"
          required
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Criando…' : 'Criar lista'}
        </button>
      </div>
    </form>
  )
}
