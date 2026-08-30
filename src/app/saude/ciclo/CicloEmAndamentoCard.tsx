'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveCiclo, type CicloFormState } from '@/actions/ciclo'
import type { CicloMenstrual } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: CicloFormState = { status: 'idle' }

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

/** Dias corridos desde `dataInicio` (inclusive) até hoje. 0 = começou hoje. */
function diasDesde(dataInicio: string): number {
  const hoje = hojeISO()
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(hoje) - Date.parse(dataInicio)) / msPorDia)
}

function formatDuracao(dias: number): string {
  if (dias <= 0) return 'começou hoje'
  if (dias === 1) return 'há 1 dia'
  return `há ${dias} dias`
}

/** "27 de agosto", pra previsão simples sem soar alarmista com uma data cheia. */
function formatDataBRExtenso(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia)).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  })
}

/**
 * Ação rápida do módulo — "Desceu hoje" / "Parou hoje" em 1 clique só, sem
 * formulário/data-picker no meio (pensado como o bloco de notas que a
 * usuária pediu). Corrigir uma data errada continua possível pelo
 * "Editar" no histórico logo abaixo, que já existia — não precisa duplicar
 * esse caminho aqui.
 */
export function CicloEmAndamentoCard({
  cicloAberto,
  previsaoProximoCiclo,
}: {
  cicloAberto: CicloMenstrual | null
  previsaoProximoCiclo: string | null
}) {
  const [state, formAction, pending] = useActionState(saveCiclo, initialState)
  const router = useRouter()
  const hoje = hojeISO()

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh()
    }
  }, [state.status, router])

  return (
    <section className={styles.card}>
      <div className={styles.bannerParada}>
        <div>
          <span className={cicloAberto ? `${styles.bannerTexto} ${styles.bannerTextoAtivo}` : styles.bannerTexto}>
            {cicloAberto
              ? `Menstruação em andamento — ${formatDuracao(diasDesde(cicloAberto.data_inicio))}`
              : 'Nenhuma menstruação em andamento no momento.'}
          </span>
          {!cicloAberto && previsaoProximoCiclo && (
            <div className={styles.previsaoTexto}>Previsão: por volta de {formatDataBRExtenso(previsaoProximoCiclo)}</div>
          )}
        </div>

        <form action={formAction}>
          {cicloAberto ? (
            <>
              <input type="hidden" name="id" value={cicloAberto.id} />
              <input type="hidden" name="data_inicio" value={cicloAberto.data_inicio} />
              <input type="hidden" name="data_fim" value={hoje} />
            </>
          ) : (
            <input type="hidden" name="data_inicio" value={hoje} />
          )}
          <button type="submit" disabled={pending} className={styles.actionBtn}>
            {pending ? 'Salvando…' : cicloAberto ? 'Parou hoje' : 'Desceu hoje'}
          </button>
        </form>
      </div>

      {state.status === 'error' && (
        <p className={styles.error} role="alert" style={{ marginTop: '0.85rem' }}>
          {state.message}
        </p>
      )}
    </section>
  )
}
