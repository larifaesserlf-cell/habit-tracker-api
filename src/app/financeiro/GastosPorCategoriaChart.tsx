'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoeda } from './constants'
import styles from './page.module.css'

/**
 * Mesma paleta usada nos swatches de cor de Áreas — reaproveitada aqui pra
 * manter consistência visual, ciclando pelas 10 cores conforme o número de
 * categorias (que não é fixo, vem dinamicamente dos dados).
 */
const CORES = [
  '#7c6af7',
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#4ade80',
  '#2dd4bf',
  '#38bdf8',
  '#f472b6',
  '#a78bfa',
  '#94a3b8',
]

type Fatia = { categoria: string; valor: number }

export function GastosPorCategoriaChart({ dados }: { dados: Fatia[] }) {
  if (dados.length === 0) {
    return <p className={styles.empty}>Nenhum gasto registrado este mês.</p>
  }

  const total = dados.reduce((soma, d) => soma + d.valor, 0)

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartPie}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="categoria"
              outerRadius={95}
              paddingAngle={dados.length > 1 ? 2 : 0}
            >
              {dados.map((d, i) => (
                <Cell key={d.categoria} fill={CORES[i % CORES.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatMoeda(Number(value))}
              contentStyle={{
                background: '#24243e',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#ffffff' }}
              itemStyle={{ color: '#ffffff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className={styles.chartLegend}>
        {dados.map((d, i) => (
          <li key={d.categoria} className={styles.chartLegendItem}>
            <span className={styles.chartLegendSwatch} style={{ background: CORES[i % CORES.length] }} />
            <span className={styles.chartLegendNome}>{d.categoria}</span>
            <span className={styles.chartLegendValor}>
              {formatMoeda(d.valor)}
              <span className={styles.chartLegendPct}> ({((d.valor / total) * 100).toFixed(1)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
