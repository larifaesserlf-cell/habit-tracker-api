'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveConta, type ContaFormState } from '@/actions/financeiro'
import type { ContaFinanceira } from '@/lib/supabase/types'
import { CONTA_TIPOS, CONTA_TIPO_LABEL } from './constants'
import styles from './page.module.css'

const initialState: ContaFormState = { status: 'idle' }

export function ContaForm({ conta }: { conta: ContaFinanceira | null }) {
  const [state, formAction, pending] = useActionState(saveConta, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/financeiro')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {conta && <input type="hidden" name="id" value={conta.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="conta_nome">Nome</label>
          <input
            id="conta_nome"
            name="nome"
            defaultValue={conta?.nome ?? ''}
            placeholder="Ex: Nubank"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="conta_tipo">Tipo</label>
          <select id="conta_tipo" name="tipo" defaultValue={conta?.tipo ?? 'corrente'}>
            {CONTA_TIPOS.map((t) => (
              <option key={t} value={t}>
                {CONTA_TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="conta_saldo">Saldo atual</label>
          <input
            id="conta_saldo"
            name="saldo_atual"
            type="number"
            step="0.01"
            defaultValue={conta?.saldo_atual ?? ''}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : conta ? 'Salvar alterações' : 'Adicionar conta'}
        </button>
        {conta && (
          <Link href="/financeiro" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
