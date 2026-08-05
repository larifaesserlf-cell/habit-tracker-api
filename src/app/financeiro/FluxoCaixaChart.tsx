'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatMoeda } from './constants'
import styles from './page.module.css'

export type FluxoMes = { mesLabel: string; receita: number; despesa: number }
export type SaldoMes = { mesLabel: string; saldo: number }

/**
 * Receita x despesa em barras CSS (não recharts — recharts não desenha
 * barra pra valor 0, comum quando um mês não tem receita ou despesa) e
 * evolução do saldo em linha (recharts lida bem com 0 numa linha).
 */
export function FluxoCaixaChart({ fluxo, saldo }: { fluxo: FluxoMes[]; saldo: SaldoMes[] }) {
  const maiorValor = Math.max(1, ...fluxo.flatMap((f) => [f.receita, f.despesa]))
  const semMovimento = fluxo.every((f) => f.receita === 0 && f.despesa === 0)

  return (
    <div>
      <h3 className={styles.mesGrupoTitle}>Receitas x despesas por mês</h3>
      {semMovimento ? (
        <p className={styles.empty}>Sem transações nos últimos meses.</p>
      ) : (
        <>
          <div className={styles.fluxoBarsRow}>
            {fluxo.map((f) => (
              <div key={f.mesLabel} className={styles.fluxoCluster}>
                <div className={styles.fluxoBars}>
                  <div className={styles.fluxoBarTrack}>
                    <div className={styles.fluxoBarReceita} style={{ height: `${(f.receita / maiorValor) * 100}%` }} />
                  </div>
                  <div className={styles.fluxoBarTrack}>
                    <div className={styles.fluxoBarDespesa} style={{ height: `${(f.despesa / maiorValor) * 100}%` }} />
                  </div>
                </div>
                <div className={styles.fluxoMesLabel}>{f.mesLabel}</div>
              </div>
            ))}
          </div>
          <div className={styles.chartLegenda}>
            <span className={styles.legendaItem}>
              <span className={`${styles.legendaSwatch} ${styles.legendaSwatchVerde}`} /> Receita
            </span>
            <span className={styles.legendaItem}>
              <span className={`${styles.legendaSwatch} ${styles.legendaSwatchVermelho}`} /> Despesa
            </span>
          </div>
        </>
      )}

      <h3 className={styles.mesGrupoTitle} style={{ marginTop: '1.5rem' }}>
        Evolução do saldo
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={saldo}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
          <XAxis dataKey="mesLabel" stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
          <YAxis stroke="rgba(255, 255, 255, 0.5)" fontSize={12} tickFormatter={(v) => formatMoeda(Number(v))} width={90} />
          <Tooltip
            formatter={(value) => formatMoeda(Number(value))}
            contentStyle={{ background: '#24243e', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#ffffff' }}
            itemStyle={{ color: '#ffffff' }}
          />
          <Line type="monotone" dataKey="saldo" stroke="#7c6af7" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
