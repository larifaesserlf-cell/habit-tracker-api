'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveObservacao, type CicloFormState } from '@/actions/ciclo'
import type { ObservacaoCiclo } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: CicloFormState = { status: 'idle' }

export function ObservacaoForm({
  observacao,
  onSuccess,
}: {
  observacao: ObservacaoCiclo | null
  onSuccess: () => void
}) {
  const [state, formAction, pending] = useActionState(saveObservacao, initialState)
  const router = useRouter()

  const [humor, setHumor] = useState(observacao?.humor ?? '')
  const [sintomas, setSintomas] = useState((observacao?.sintomas ?? []).join(', '))
  const [notas, setNotas] = useState(observacao?.notas ?? '')

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh()
      onSuccess()
    }
  }, [state.status, router, onSuccess])

  return (
    <form action={formAction} className={styles.form}>
      {observacao && <input type="hidden" name="id" value={observacao.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="obs_humor">Humor</label>
          <input
            id="obs_humor"
            name="humor"
            value={humor}
            onChange={(e) => setHumor(e.target.value)}
            placeholder="Ex: irritada, cansada, bem"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="obs_sintomas">Sintomas (separados por vírgula)</label>
          <input
            id="obs_sintomas"
            name="sintomas"
            value={sintomas}
            onChange={(e) => setSintomas(e.target.value)}
            placeholder="Ex: cólica, dor de cabeça, inchaço"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="obs_notas">O que você sentiu</label>
          <textarea
            id="obs_notas"
            name="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className={styles.textareaDestaque}
            placeholder="Escreva livremente…"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : observacao ? 'Salvar alterações' : 'Salvar observação'}
        </button>
      </div>
    </form>
  )
}
