import styles from './page.module.css'

/** Mesma paleta usada nos outros gráficos do app (ex: "Por categoria" do
 *  Financeiro), ciclando pelas 10 cores conforme o número de hábitos. */
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

type ConclusaoHabito = { nome: string; percentual: number }

export function HabitosConclusaoChart({ dados }: { dados: ConclusaoHabito[] }) {
  if (dados.length === 0) {
    return <p className={styles.empty}>Nenhum hábito com dias previstos neste mês.</p>
  }

  return (
    <ul className={styles.conclusaoList}>
      {dados.map((d, i) => (
        <li key={d.nome} className={styles.conclusaoItem}>
          <div className={styles.conclusaoHeader}>
            <span className={styles.conclusaoNome}>{d.nome}</span>
            <span className={styles.conclusaoPct}>{d.percentual}%</span>
          </div>
          <div className={styles.conclusaoBarTrack}>
            <div
              className={styles.conclusaoBarFill}
              style={{ width: `${d.percentual}%`, background: CORES[i % CORES.length] }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
