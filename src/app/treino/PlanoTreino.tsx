import type { ModeloTreino, ModeloTreinoExercicio } from '@/lib/supabase/types'
import styles from './page.module.css'

const NOME_DIA: Record<string, string> = {
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sábado',
  domingo: 'Domingo',
}

export function PlanoTreino({
  modelos,
  exerciciosPorModelo,
}: {
  modelos: ModeloTreino[]
  exerciciosPorModelo: Map<string, ModeloTreinoExercicio[]>
}) {
  if (modelos.length === 0) {
    return null
  }

  return (
    <ul className={styles.list}>
      {modelos.map((modelo) => {
        const exercicios = exerciciosPorModelo.get(modelo.id) ?? []
        const diaLabel = NOME_DIA[modelo.dia_semana] ?? modelo.dia_semana

        return (
          <li key={modelo.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <div>
                <div className={styles.itemNome}>{modelo.nome}</div>
                <div className={styles.itemMeta}>{diaLabel}</div>
              </div>
            </div>

            {exercicios.length > 0 && (
              <ul className={styles.exerciciosList}>
                {exercicios.map((e) => (
                  <li key={e.id} className={styles.exercicioItem}>
                    <span className={styles.exercicioNome}>
                      {e.grupo && <span className={styles.exercicioGrupo}>{e.grupo} · </span>}
                      {e.nome}
                    </span>
                    <span className={styles.exercicioDetalhe}>{e.faixa_reps}</span>
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
