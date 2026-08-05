import styles from './page.module.css'

type ConclusaoHabito = { nome: string; percentualFeito: number; percentualNaoFeito: number }

export function HabitosConclusaoChart({ dados }: { dados: ConclusaoHabito[] }) {
  if (dados.length === 0) {
    return <p className={styles.empty}>Nenhum hábito com dias previstos neste mês.</p>
  }

  return (
    <div>
      <div className={styles.grupoChartRow}>
        {dados.map((d) => (
          <div key={d.nome} className={styles.grupoCluster}>
            <div className={styles.grupoBars}>
              <div className={styles.grupoBarTrack}>
                <div className={styles.grupoBarFeito} style={{ height: `${d.percentualFeito}%` }} />
              </div>
              <div className={styles.grupoBarTrack}>
                <div className={styles.grupoBarNaoFeito} style={{ height: `${d.percentualNaoFeito}%` }} />
              </div>
            </div>
            <div className={styles.grupoPercentuais}>
              <span className={styles.grupoPctFeito}>{d.percentualFeito}%</span>
              <span className={styles.grupoPctNaoFeito}>{d.percentualNaoFeito}%</span>
            </div>
            <div className={styles.grupoNome}>{d.nome}</div>
          </div>
        ))}
      </div>

      <div className={styles.chartLegenda}>
        <span className={styles.legendaItem}>
          <span className={`${styles.legendaSwatch} ${styles.legendaSwatchVerde}`} /> Feito
        </span>
        <span className={styles.legendaItem}>
          <span className={`${styles.legendaSwatch} ${styles.legendaSwatchVermelho}`} /> Não feito
        </span>
      </div>
    </div>
  )
}
