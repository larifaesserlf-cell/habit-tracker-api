import { DeleteTreinoButton } from './DeleteTreinoButton'
import type { ExercicioTreino, Treino } from '@/lib/supabase/types'
import styles from './page.module.css'

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

export function TreinosList({
  treinos,
  exerciciosPorTreino,
}: {
  treinos: Treino[]
  exerciciosPorTreino: Map<string, ExercicioTreino[]>
}) {
  if (treinos.length === 0) {
    return <p className={styles.empty}>Nenhum treino registrado ainda.</p>
  }

  return (
    <ul className={styles.list}>
      {treinos.map((treino) => {
        const exercicios = exerciciosPorTreino.get(treino.id) ?? []

        return (
          <li key={treino.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <div>
                <div className={styles.itemNome}>{treino.nome}</div>
                <div className={styles.itemMeta}>{formatDataBR(treino.data)}</div>
              </div>
              <div className={styles.itemAcoes}>
                <DeleteTreinoButton id={treino.id} descricao={`${treino.nome} — ${formatDataBR(treino.data)}`} />
              </div>
            </div>

            {exercicios.length > 0 && (
              <ul className={styles.exerciciosList}>
                {exercicios.map((e) => (
                  <li key={e.id} className={styles.exercicioItem}>
                    <span className={styles.exercicioNome}>{e.nome}</span>
                    <span className={styles.exercicioDetalhe}>
                      {e.series_reps}
                      {e.series_reps && e.carga && ' · '}
                      {e.carga}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
