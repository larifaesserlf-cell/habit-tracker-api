'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoeda } from './constants'
import styles from './page.module.css'

/**
 * Paleta categórica só deste gráfico (não é mais a mesma de Áreas — aquela
 * continua vívida de propósito, é escolha livre da usuária pras próprias
 * áreas; aqui, com a paleta grafite monocromática, tons desaturados
 * ancorados no accent verde-acinzentado, só o suficiente pra distinguir
 * categoria por categoria). Cicla pelas 10 cores conforme o número de
 * categorias, que não é fixo — vem dinamicamente dos dados.
 */
const CORES = [
  '#7c9885', // accent
  '#a8a29e',
  '#8f9779',
  '#9a8c98',
  '#7d8f9c',
  '#b0a693',
  '#8a9a8f',
  '#a3908a',
  '#94a3b8',
  '#6b7d76',
]

type Fatia = { categoria: string; valor: number }

export function GastosPorCategoriaChart({
  dados,
  mensagemVazia = 'Nenhum gasto registrado este mês.',
}: {
  dados: Fatia[]
  mensagemVazia?: string
}) {
  if (dados.length === 0) {
    return <p className={styles.empty}>{mensagemVazia}</p>
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
                background: 'var(--color-surface)',
                border: '1px solid rgba(237, 237, 237, 0.15)',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: 'var(--color-text-primary)' }}
              itemStyle={{ color: 'var(--color-text-primary)' }}
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
