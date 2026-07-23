'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveDestino, type DestinoFormState } from '@/actions/destinos'
import type { Destino } from '@/lib/supabase/types'
import styles from '../page.module.css'

const initialState: DestinoFormState = { status: 'idle' }

export function DestinoForm({
  viagemId,
  destino,
  redirectTo,
  cancelHref,
}: {
  viagemId: string
  destino: Destino | null
  redirectTo?: string
  cancelHref?: string
}) {
  const [state, formAction, pending] = useActionState(saveDestino, initialState)
  const router = useRouter()
  const redirectHref = redirectTo ?? `/viagens/${viagemId}`
  const cancelHrefResolved = cancelHref ?? `/viagens/${viagemId}`

  useEffect(() => {
    if (state.status === 'success') {
      router.push(redirectHref)
      router.refresh()
    }
  }, [state.status, redirectHref, router])

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="viagem_id" value={viagemId} />
      {destino && <input type="hidden" name="id" value={destino.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="nome_cidade">Cidade</label>
          <input
            id="nome_cidade"
            name="nome_cidade"
            defaultValue={destino?.nome_cidade ?? ''}
            placeholder="Ex: Lisboa"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="pais">País</label>
          <input id="pais" name="pais" defaultValue={destino?.pais ?? ''} placeholder="Opcional" />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="dias_estimados">Dias</label>
          <input
            id="dias_estimados"
            name="dias_estimados"
            type="number"
            min="0"
            defaultValue={destino?.dias_estimados ?? ''}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="notas">Notas</label>
        <textarea
          id="notas"
          name="notas"
          defaultValue={destino?.notas ?? ''}
          rows={2}
          placeholder="Opcional"
          className={styles.textarea}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : destino ? 'Salvar alterações' : 'Adicionar destino'}
        </button>
        {destino && (
          <Link href={cancelHrefResolved} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
