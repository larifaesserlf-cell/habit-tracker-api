'use client'

import { useActionState, useState } from 'react'
import { saveObservacoesTreino, type TreinoFormState } from '@/actions/treino'
import styles from './page.module.css'

const initialState: TreinoFormState = { status: 'idle' }

export function ObservacoesTreino({ conteudoInicial }: { conteudoInicial: string }) {
  const [state, formAction, pending] = useActionState(saveObservacoesTreino, initialState)
  const [conteudo, setConteudo] = useState(conteudoInicial)

  return (
    <form action={formAction} className={styles.form}>
      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <textarea
        name="conteudo"
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        className={styles.observacoesTextarea}
        placeholder="Regras de progressão, deload, rotação de exercícios, pontos de atenção…"
      />

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : 'Salvar observações'}
        </button>
        {state.status === 'success' && <span className={styles.itemMeta}>Salvo.</span>}
      </div>
    </form>
  )
}
