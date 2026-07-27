'use client'

import { useActionState, useEffect, useState } from 'react'
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

export function CicloEmAndamentoCard({ cicloAberto }: { cicloAberto: CicloMenstrual | null }) {
  const [state, formAction, pending] = useActionState(saveCiclo, initialState)
  const [mostrarForm, setMostrarForm] = useState(false)
  const router = useRouter()
  const hoje = hojeISO()

  // Fecha o formulário inline assim que salvar com sucesso — comparado
  // durante o render (não num efeito) pra não disparar um setState síncrono
  // dentro do efeito, seguindo o mesmo padrão usado nos outros formulários.
  const [stateAnterior, setStateAnterior] = useState(state)
  if (state !== stateAnterior) {
    setStateAnterior(state)
    if (state.status === 'success') {
      setMostrarForm(false)
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh()
    }
  }, [state.status, router])

  return (
    <section className={styles.card}>
      <div className={styles.bannerParada}>
        <span className={cicloAberto ? `${styles.bannerTexto} ${styles.bannerTextoAtivo}` : styles.bannerTexto}>
          {cicloAberto
            ? `Menstruação em andamento — ${formatDuracao(diasDesde(cicloAberto.data_inicio))}`
            : 'Nenhuma menstruação em andamento no momento.'}
        </span>
        {!mostrarForm && (
          <button type="button" className={styles.actionBtn} onClick={() => setMostrarForm(true)}>
            {cicloAberto ? 'Registrar fim da menstruação' : 'Registrar início da menstruação'}
          </button>
        )}
      </div>

      {mostrarForm && (
        <form action={formAction} className={styles.bannerInline}>
          {cicloAberto && <input type="hidden" name="id" value={cicloAberto.id} />}
          {cicloAberto && <input type="hidden" name="data_inicio" value={cicloAberto.data_inicio} />}

          <div className={styles.fieldSmall}>
            <label htmlFor="data_evento">{cicloAberto ? 'Data de fim' : 'Data de início'}</label>
            <input
              id="data_evento"
              name={cicloAberto ? 'data_fim' : 'data_inicio'}
              type="date"
              defaultValue={hoje}
              required
            />
          </div>
          <button type="submit" disabled={pending} className={styles.actionBtn}>
            {pending ? 'Salvando…' : 'Confirmar'}
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={() => setMostrarForm(false)}>
            Cancelar
          </button>
        </form>
      )}

      {state.status === 'error' && (
        <p className={styles.error} role="alert" style={{ marginTop: '0.85rem' }}>
          {state.message}
        </p>
      )}
    </section>
  )
}
