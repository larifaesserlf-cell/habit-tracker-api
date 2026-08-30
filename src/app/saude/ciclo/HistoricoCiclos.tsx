'use client'

import { useState } from 'react'
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

function ItemCiclo({ ciclo, duracaoCiclo }: { ciclo: CicloMenstrual; duracaoCiclo: number | null }) {
  const emAndamento = !ciclo.data_fim

  return (
    <li className={emAndamento ? `${styles.item} ${styles.itemCiclo} ${styles.itemAtivo}` : `${styles.item} ${styles.itemCiclo}`}>
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
}

export function HistoricoCiclos({ ciclos }: { ciclos: CicloMenstrual[] }) {
  // Fechado por padrão: a tela mostra só o ciclo mais recente pra não
  // empilhar dezenas de linhas de uma vez (histórico importado tem 30+
  // ciclos); "Ver histórico completo" revela o resto sob demanda.
  const [expandido, setExpandido] = useState(false)

  if (ciclos.length === 0) {
    return <p className={styles.empty}>Nenhum ciclo registrado ainda.</p>
  }

  // `ciclos` vem ordenado do mais recente pro mais antigo — o próximo
  // cronologicamente é o de índice anterior (i - 1). O mais recente
  // (i === 0) ainda não tem "ciclo seguinte" pra calcular a duração.
  function duracaoDoItem(i: number): number | null {
    return i > 0 ? duracaoEntreInicios(ciclos[i - 1].data_inicio, ciclos[i].data_inicio) : null
  }

  const restantes = ciclos.length - 1

  return (
    <>
      <ul className={`${styles.list} ${styles.listCiclos}`}>
        <ItemCiclo ciclo={ciclos[0]} duracaoCiclo={duracaoDoItem(0)} />
        {expandido &&
          ciclos.slice(1).map((ciclo, idx) => <ItemCiclo key={ciclo.id} ciclo={ciclo} duracaoCiclo={duracaoDoItem(idx + 1)} />)}
      </ul>

      {restantes > 0 && (
        <button type="button" className={styles.verHistoricoBtn} onClick={() => setExpandido((v) => !v)}>
          {expandido ? 'Mostrar só o mais recente' : `Ver histórico completo (${restantes} ${restantes === 1 ? 'ciclo anterior' : 'ciclos anteriores'})`}
        </button>
      )}
    </>
  )
}
