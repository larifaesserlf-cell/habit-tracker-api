'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveCiclo, type CicloFormState } from '@/actions/ciclo'
import type { CicloMenstrual } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: CicloFormState = { status: 'idle' }

export function CicloForm({ ciclo }: { ciclo: CicloMenstrual | null }) {
  const [state, formAction, pending] = useActionState(saveCiclo, initialState)
  const router = useRouter()

  const [dataInicio, setDataInicio] = useState(ciclo?.data_inicio ?? '')
  const [dataFim, setDataFim] = useState(ciclo?.data_fim ?? '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra
  // /saude/ciclo (mesma tela), então sem isso o próximo ciclo retroativo
  // herdaria as datas do anterior. Ajustado durante o render, não num efeito.
  const [stateAnterior, setStateAnterior] = useState(state)
  if (state !== stateAnterior) {
    setStateAnterior(state)
    if (state.status === 'success' && !ciclo) {
      setDataInicio('')
      setDataFim('')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/saude/ciclo')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {ciclo && <input type="hidden" name="id" value={ciclo.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="ciclo_data_inicio">Início</label>
          <input
            id="ciclo_data_inicio"
            name="data_inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="ciclo_data_fim">Fim (opcional)</label>
          <input
            id="ciclo_data_fim"
            name="data_fim"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : ciclo ? 'Salvar alterações' : 'Adicionar ciclo'}
        </button>
        {ciclo && (
          <Link href="/saude/ciclo" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
