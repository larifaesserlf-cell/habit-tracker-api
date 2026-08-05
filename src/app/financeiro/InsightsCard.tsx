import type { Insight } from './insights'
import styles from './page.module.css'

export function InsightsCard({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return <p className={styles.empty}>Ainda não há dados suficientes pra gerar insights este mês.</p>
  }

  return (
    <ul className={styles.insightsList}>
      {insights.map((insight) => (
        <li key={insight.texto} className={styles.insightItem}>
          <span className={styles.insightIcone}>{insight.icone}</span>
          <span>{insight.texto}</span>
        </li>
      ))}
    </ul>
  )
}
