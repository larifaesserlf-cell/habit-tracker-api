import Link from 'next/link'
import { DeleteCicloButton } from './DeleteCicloButton'
import type { CicloMenstrual } from '@/lib/supabase/types'
import styles from './page.module.css'

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

/** Duração inclusiva em dias (início e fim contam como dias do ciclo). */
function duracaoDias(dataInicio: string, dataFim: string): number {
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(dataFim) - Date.parse(dataInicio)) / msPorDia) + 1
}

export function HistoricoCiclos({ ciclos }: { ciclos: CicloMenstrual[] }) {
  if (ciclos.length === 0) {
    return <p className={styles.empty}>Nenhum ciclo registrado ainda.</p>
  }

  return (
    <ul className={styles.list}>
      {ciclos.map((ciclo) => {
        const emAndamento = !ciclo.data_fim
        return (
          <li key={ciclo.id} className={emAndamento ? `${styles.item} ${styles.itemAtivo}` : styles.item}>
            <div className={styles.itemInfo}>
              <div>
                <div className={styles.itemNome}>
                  {formatDataBR(ciclo.data_inicio)} – {emAndamento ? 'em andamento' : formatDataBR(ciclo.data_fim!)}
                </div>
                <div className={styles.itemMeta}>
                  {emAndamento ? 'Duração ainda não definida' : `${duracaoDias(ciclo.data_inicio, ciclo.data_fim!)} dias`}
                </div>
              </div>
              {emAndamento && <span className={styles.badgeAtivo}>Em andamento</span>}
            </div>
            <div className={styles.itemActions}>
              <Link href={`/saude/ciclo?editCiclo=${ciclo.id}`} className={styles.editLink}>
                Editar
              </Link>
              <DeleteCicloButton
                id={ciclo.id}
                descricao={`${formatDataBR(ciclo.data_inicio)} – ${emAndamento ? 'em andamento' : formatDataBR(ciclo.data_fim!)}`}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
