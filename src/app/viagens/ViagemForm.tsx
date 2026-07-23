'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveViagem, type ViagemFormState } from '@/actions/viagens'
import type { Viagem } from '@/lib/supabase/types'
import { VIAGEM_STATUSES, VIAGEM_STATUS_LABEL } from './constants'
import styles from './page.module.css'

const initialState: ViagemFormState = { status: 'idle' }

export function ViagemForm({
  viagem,
  redirectTo = '/viagens',
  cancelHref = '/viagens',
}: {
  viagem: Viagem | null
  redirectTo?: string
  cancelHref?: string
}) {
  const [state, formAction, pending] = useActionState(saveViagem, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'success') {
      router.push(redirectTo)
      router.refresh()
    }
  }, [state.status, redirectTo, router])

  return (
    <form action={formAction} className={styles.form}>
      {viagem && <input type="hidden" name="id" value={viagem.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="nome">Nome da viagem</label>
          <input
            id="nome"
            name="nome"
            defaultValue={viagem?.nome ?? ''}
            placeholder="Ex: Europa 2027"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="viagem_status">Status</label>
          <select id="viagem_status" name="viagem_status" defaultValue={viagem?.status ?? 'quero_fazer'}>
            {VIAGEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VIAGEM_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_prevista_inicio">Início previsto</label>
          <input
            id="data_prevista_inicio"
            name="data_prevista_inicio"
            type="date"
            defaultValue={viagem?.data_prevista_inicio ?? ''}
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_prevista_fim">Fim previsto</label>
          <input
            id="data_prevista_fim"
            name="data_prevista_fim"
            type="date"
            defaultValue={viagem?.data_prevista_fim ?? ''}
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="orcamento_estimado">Orçamento estimado</label>
          <input
            id="orcamento_estimado"
            name="orcamento_estimado"
            type="number"
            step="0.01"
            defaultValue={viagem?.orcamento_estimado ?? ''}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="orcamento_real">Orçamento real</label>
          <input
            id="orcamento_real"
            name="orcamento_real"
            type="number"
            step="0.01"
            defaultValue={viagem?.orcamento_real ?? ''}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="viagem_notas">Notas</label>
        <textarea
          id="viagem_notas"
          name="notas"
          defaultValue={viagem?.notas ?? ''}
          rows={3}
          placeholder="Opcional"
          className={styles.textarea}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : viagem ? 'Salvar alterações' : 'Criar viagem'}
        </button>
        {viagem && (
          <Link href={cancelHref} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
