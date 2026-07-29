import Link from 'next/link'
import type { CicloMenstrual } from '@/lib/supabase/types'
import styles from './page.module.css'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

/** Primeiro e último dia do mês ("YYYY-MM"), em ISO — cálculo em UTC. */
function faixaDoMes(mesISO: string) {
  const [ano, mes] = mesISO.split('-').map(Number)
  const inicio = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 0))
  return { inicio, fim, totalDias: fim.getUTCDate(), diaSemanaInicio: inicio.getUTCDay() }
}

/** Desloca um mês ("YYYY-MM") por `delta` meses (pode ser negativo). */
function deslocarMes(mesISO: string, delta: number): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const totalMeses = mes - 1 + delta
  const novoAno = ano + Math.floor(totalMeses / 12)
  const novoMes = (((totalMeses % 12) + 12) % 12) + 1
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}

function nomeMes(mesISO: string): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const nome = new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function dataISOde(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function CalendarioMensal({
  mesISO,
  ciclos,
}: {
  mesISO: string
  ciclos: CicloMenstrual[]
}) {
  const [ano, mes] = mesISO.split('-').map(Number)
  const { totalDias, diaSemanaInicio } = faixaDoMes(mesISO)
  const hoje = hojeISO()

  function ehDiaDeMenstruacao(dataISO: string): boolean {
    return ciclos.some((c) => dataISO >= c.data_inicio && dataISO <= (c.data_fim ?? hoje))
  }

  const celulasVazias = Array.from({ length: diaSemanaInicio }, (_, i) => i)
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1)

  return (
    <section className={styles.card}>
      <div className={styles.calendarHeader}>
        <Link href={`/saude/ciclo?mes=${deslocarMes(mesISO, -1)}`} className={styles.calendarNavBtn}>
          ← Mês anterior
        </Link>
        <span className={styles.calendarMesLabel}>{nomeMes(mesISO)}</span>
        <Link href={`/saude/ciclo?mes=${deslocarMes(mesISO, 1)}`} className={styles.calendarNavBtn}>
          Mês seguinte →
        </Link>
      </div>

      <div className={styles.calendarGrid}>
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className={styles.calendarDiaSemana}>
            {d}
          </div>
        ))}
        {celulasVazias.map((i) => (
          <div key={`vazio-${i}`} className={styles.calendarDiaVazio} />
        ))}
        {dias.map((dia) => {
          const dataISO = dataISOde(ano, mes, dia)
          const menstruacao = ehDiaDeMenstruacao(dataISO)
          return (
            <div
              key={dia}
              className={menstruacao ? `${styles.calendarDia} ${styles.calendarDiaMenstruacao}` : styles.calendarDia}
            >
              {dia}
            </div>
          )
        })}
      </div>

      <div className={styles.calendarLegenda}>
        <span className={styles.legendaItem}>
          <span className={`${styles.legendaSwatch} ${styles.legendaSwatchMenstruacao}`} /> Menstruação
        </span>
      </div>
    </section>
  )
}
