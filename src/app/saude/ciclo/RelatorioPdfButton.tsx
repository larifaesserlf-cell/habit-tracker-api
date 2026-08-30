'use client'

import { useState } from 'react'
import styles from './page.module.css'

type Periodo = 'ultimo_mes' | '3_meses' | '6_meses' | 'historico' | 'customizado'

const OPCOES: { valor: Periodo; label: string }[] = [
  { valor: 'ultimo_mes', label: 'Último mês' },
  { valor: '3_meses', label: 'Últimos 3 meses' },
  { valor: '6_meses', label: 'Últimos 6 meses' },
  { valor: 'historico', label: 'Todo o histórico' },
  { valor: 'customizado', label: 'Datas customizadas' },
]

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function RelatorioPdfButton() {
  const [aberto, setAberto] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>('ultimo_mes')
  const [inicio, setInicio] = useState(hojeISO())
  const [fim, setFim] = useState(hojeISO())

  function montarParams() {
    const params = new URLSearchParams({ periodo })
    if (periodo === 'customizado') {
      params.set('inicio', inicio)
      params.set('fim', fim)
    }
    return params
  }

  function baixar() {
    window.location.href = `/api/saude/ciclo/relatorio?${montarParams().toString()}`
  }

  function visualizar() {
    const params = montarParams()
    params.set('modo', 'visualizar')
    window.open(`/api/saude/ciclo/relatorio?${params.toString()}`, '_blank')
  }

  if (!aberto) {
    return (
      <button type="button" className={styles.secondaryBtn} onClick={() => setAberto(true)}>
        Gerar relatório PDF
      </button>
    )
  }

  return (
    <div>
      <div className={styles.periodoOptions}>
        {OPCOES.map((o) => (
          <button
            key={o.valor}
            type="button"
            className={periodo === o.valor ? styles.periodoOptionAtiva : styles.periodoOption}
            onClick={() => setPeriodo(o.valor)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {periodo === 'customizado' && (
        <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
          <div className={styles.fieldSmall}>
            <label htmlFor="relatorio_inicio">Data início</label>
            <input id="relatorio_inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className={styles.fieldSmall}>
            <label htmlFor="relatorio_fim">Data fim</label>
            <input id="relatorio_fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.submitBtn} onClick={visualizar}>
          Visualizar PDF
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={baixar}>
          Baixar PDF
        </button>
        <button type="button" className={styles.cancelLink} onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
