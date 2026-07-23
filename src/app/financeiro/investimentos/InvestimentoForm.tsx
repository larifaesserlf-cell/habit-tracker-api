'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveInvestimento, type InvestimentoFormState } from '@/actions/financeiro'
import type { Investimento } from '@/lib/supabase/types'
import { TIPOS_ATIVO, TIPO_ATIVO_LABEL } from '../constants'
import styles from '../page.module.css'

const initialState: InvestimentoFormState = { status: 'idle' }

function hojeISO() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function InvestimentoForm({ investimento }: { investimento: Investimento | null }) {
  const [state, formAction, pending] = useActionState(saveInvestimento, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/financeiro/investimentos')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {investimento && <input type="hidden" name="id" value={investimento.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="inv_nome_ativo">Nome do ativo</label>
          <input
            id="inv_nome_ativo"
            name="nome_ativo"
            defaultValue={investimento?.nome_ativo ?? ''}
            placeholder="Ex: Tesouro IPCA+ 2035"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="inv_tipo_ativo">Tipo</label>
          <select id="inv_tipo_ativo" name="tipo_ativo" defaultValue={investimento?.tipo_ativo ?? 'outro'}>
            {TIPOS_ATIVO.map((t) => (
              <option key={t} value={t}>
                {TIPO_ATIVO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="inv_valor_aportado">Valor aportado</label>
          <input
            id="inv_valor_aportado"
            name="valor_aportado"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={investimento?.valor_aportado ?? ''}
            placeholder="0,00"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="inv_data_aporte">Data do aporte</label>
          <input
            id="inv_data_aporte"
            name="data_aporte"
            type="date"
            defaultValue={investimento?.data_aporte ?? hojeISO()}
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="inv_instituicao">Instituição</label>
          <input
            id="inv_instituicao"
            name="instituicao"
            defaultValue={investimento?.instituicao ?? ''}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="inv_notas">Notas</label>
        <input id="inv_notas" name="notas" defaultValue={investimento?.notas ?? ''} placeholder="Opcional" />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : investimento ? 'Salvar alterações' : 'Adicionar aporte'}
        </button>
        {investimento && (
          <Link href="/financeiro/investimentos" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
