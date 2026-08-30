'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CicloMenstrual } from '@/lib/supabase/types'
import styles from './page.module.css'

/** "out/23" a partir de uma data ISO (YYYY-MM-DD). */
function formatMesAnoCurto(dataISO: string): string {
  const [ano, mes] = dataISO.split('-').map(Number)
  const nome = new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
  return nome.replace('.', '')
}

type PontoDuracao = { data: string; label: string; duracao: number }

/**
 * Duração do ciclo (início a início do seguinte) plotada ao longo do tempo —
 * um ponto por ciclo fechado, a partir do segundo (o primeiro ainda não tem
 * "ciclo anterior" pra medir contra). Mesma conta de `duracaoEntreInicios`
 * usada em HistoricoCiclos, só que aqui em série temporal em vez de lista.
 */
export function CicloDuracaoChart({ ciclos }: { ciclos: CicloMenstrual[] }) {
  const iniciosAsc = [...ciclos].map((c) => c.data_inicio).sort()
  const msPorDia = 24 * 60 * 60 * 1000

  const dados: PontoDuracao[] = []
  for (let i = 1; i < iniciosAsc.length; i++) {
    const duracao = Math.round((Date.parse(iniciosAsc[i]) - Date.parse(iniciosAsc[i - 1])) / msPorDia)
    dados.push({ data: iniciosAsc[i], label: formatMesAnoCurto(iniciosAsc[i]), duracao })
  }

  if (dados.length === 0) {
    return (
      <p className={styles.empty}>
        Ainda não há ciclos suficientes pra mostrar esse gráfico (precisa de pelo menos 2 ciclos registrados).
      </p>
    )
  }

  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dados} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgba(237, 237, 237, 0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--color-text-secondary)"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            stroke="var(--color-text-secondary)"
            tick={{ fontSize: 11 }}
            width={32}
            domain={['dataMin - 3', 'dataMax + 3']}
          />
          <Tooltip
            formatter={(value) => `${Number(value)} dias`}
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid rgba(237, 237, 237, 0.15)',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: 'var(--color-text-primary)' }}
            itemStyle={{ color: 'var(--color-text-primary)' }}
          />
          <Line
            type="monotone"
            dataKey="duracao"
            name="Duração do ciclo"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
