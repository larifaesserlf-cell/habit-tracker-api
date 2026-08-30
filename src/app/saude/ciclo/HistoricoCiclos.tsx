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

/** Duração do ciclo (não da menstruação): início de um ciclo até o início do seguinte. */
function duracaoEntreInicios(dataInicioMaisRecente: string, dataInicioAnterior: string): number {
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(dataInicioMaisRecente) - Date.parse(dataInicioAnterior)) / msPorDia)
}

export function HistoricoCiclos({ ciclos }: { ciclos: CicloMenstrual[] }) {
  if (ciclos.length === 0) {
    return <p className={styles.empty}>Nenhum ciclo registrado ainda.</p>
  }

  return (
    <ul className={`${styles.list} ${styles.listCiclos}`}>
      {ciclos.map((ciclo, i) => {
        const emAndamento = !ciclo.data_fim
        // `ciclos` vem ordenado do mais recente pro mais antigo — o próximo
        // cronologicamente é o de índice anterior (i - 1). O mais recente
        // (i === 0) ainda não tem "ciclo seguinte" pra calcular a duração.
        const proximoCronologico = i > 0 ? ciclos[i - 1] : null
        const duracaoCiclo = proximoCronologico
          ? duracaoEntreInicios(proximoCronologico.data_inicio, ciclo.data_inicio)
          : null

        return (
          <li
            key={ciclo.id}
            className={emAndamento ? `${styles.item} ${styles.itemCiclo} ${styles.itemAtivo}` : `${styles.item} ${styles.itemCiclo}`}
          >
            <div className={styles.itemInfo}>
              <div>
                <div className={styles.itemNome}>
                  {formatDataBR(ciclo.data_inicio)} – {emAndamento ? 'em andamento' : formatDataBR(ciclo.data_fim!)}
                </div>
                <div className={styles.itemMeta}>
                  {emAndamento ? 'Duração ainda não definida' : `${duracaoDias(ciclo.data_inicio, ciclo.data_fim!)} dias de menstruação`}
                  {duracaoCiclo !== null && ` · ciclo de ${duracaoCiclo} dias`}
                </div>
              </div>
              <div className={styles.itemCicloDireita}>
                {emAndamento && <span className={styles.badgeAtivo}>Em andamento</span>}
                <Link href={`/saude/ciclo?editCiclo=${ciclo.id}`} className={styles.editLink}>
                  Editar
                </Link>
                <DeleteCicloButton
                  id={ciclo.id}
                  descricao={`${formatDataBR(ciclo.data_inicio)} – ${emAndamento ? 'em andamento' : formatDataBR(ciclo.data_fim!)}`}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
