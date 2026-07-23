import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BlocoForm } from './BlocoForm'
import { DeleteBlocoButton } from './DeleteBlocoButton'
import { GradeScrollHint } from './GradeScrollHint'
import type { Area, RotinaBloco } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Rotina semanal',
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Grade em blocos de 30 minutos. Se não houver dados, mostra 06:00–22:00;
// se algum bloco cair fora dessa faixa, a grade se estende para caber nele.
const DEFAULT_START_HOUR = 6
const DEFAULT_END_HOUR = 22
const SLOT_MINUTES = 30

function toMinutes(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

function formatHora(hora: string): string {
  return hora.slice(0, 5)
}

type LayoutInfo = { lane: number; lanes: number }

/**
 * Blocos que se sobrepõem no mesmo dia ganham "lanes" (colunas) lado a lado,
 * como num calendário: agrupa em clusters de sobreposição transitiva
 * (varrendo por hora_inicio, fechando o cluster quando um bloco começa
 * depois do fim máximo já visto) e, dentro de cada cluster, atribui a cada
 * bloco a primeira lane livre (cujo último fim já é <= o início do bloco).
 */
function calcularLayoutSobreposicao(blocos: RotinaBloco[]): Map<string, LayoutInfo> {
  const layout = new Map<string, LayoutInfo>()

  for (let dia = 0; dia < 7; dia++) {
    const doDia = blocos
      .filter((b) => b.dia_semana === dia)
      .sort((a, b) => toMinutes(a.hora_inicio) - toMinutes(b.hora_inicio))

    let clusterAtual: RotinaBloco[] = []
    let clusterFimMax = -Infinity
    const clusters: RotinaBloco[][] = []
    for (const b of doDia) {
      const inicio = toMinutes(b.hora_inicio)
      if (clusterAtual.length > 0 && inicio >= clusterFimMax) {
        clusters.push(clusterAtual)
        clusterAtual = []
        clusterFimMax = -Infinity
      }
      clusterAtual.push(b)
      clusterFimMax = Math.max(clusterFimMax, toMinutes(b.hora_fim))
    }
    if (clusterAtual.length > 0) clusters.push(clusterAtual)

    for (const cluster of clusters) {
      const fimPorLane: number[] = []
      const lanePorBloco = new Map<string, number>()
      for (const b of cluster) {
        const inicio = toMinutes(b.hora_inicio)
        const fim = toMinutes(b.hora_fim)
        let lane = fimPorLane.findIndex((fimLane) => fimLane <= inicio)
        if (lane === -1) {
          lane = fimPorLane.length
          fimPorLane.push(fim)
        } else {
          fimPorLane[lane] = fim
        }
        lanePorBloco.set(b.id, lane)
      }
      const lanes = fimPorLane.length
      for (const b of cluster) {
        layout.set(b.id, { lane: lanePorBloco.get(b.id)!, lanes })
      }
    }
  }

  return layout
}

export default async function RotinaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: blocosData }, { data: areasData }] = await Promise.all([
    supabase
      .from('rotina_diaria')
      .select('*')
      .eq('user_id', user.id)
      .order('hora_inicio', { ascending: true }),
    supabase
      .from('areas')
      .select('*')
      .eq('user_id', user.id)
      .eq('arquivada', false)
      .order('ordem', { ascending: true }),
  ])

  const blocos = (blocosData ?? []) as RotinaBloco[]
  const areas = (areasData ?? []) as Area[]
  const areaPorId = new Map(areas.map((a) => [a.id, a]))
  const editingBloco = edit ? blocos.find((b) => b.id === edit) ?? null : null

  const minutosExtremos = blocos.flatMap((b) => [toMinutes(b.hora_inicio), toMinutes(b.hora_fim)])
  const startHour = Math.min(DEFAULT_START_HOUR, ...minutosExtremos.map((m) => Math.floor(m / 60)))
  const endHour = Math.max(DEFAULT_END_HOUR, ...minutosExtremos.map((m) => Math.ceil(m / 60)))
  const totalSlots = (endHour - startHour) * (60 / SLOT_MINUTES)

  function slotDe(hora: string): number {
    return (toMinutes(hora) - startHour * 60) / SLOT_MINUTES
  }

  const horasLabel = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const layoutSobreposicao = calcularLayoutSobreposicao(blocos)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/hoje" className={styles.backLink}>
          ← Painel
        </Link>
        <h1 className={styles.title}>Rotina semanal</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingBloco ? 'Editar bloco' : 'Novo bloco'}</h2>
        <BlocoForm key={editingBloco?.id ?? 'new'} bloco={editingBloco} areas={areas} />
      </section>

      <section className={styles.gridSection}>
        {blocos.length === 0 ? (
          <p className={styles.empty}>Nenhum bloco cadastrado ainda. Crie o primeiro acima.</p>
        ) : (
          <GradeScrollHint>
            <div
              className={styles.grid}
              style={{
                gridTemplateColumns: `3.25rem repeat(7, minmax(6.5rem, 1fr))`,
                gridTemplateRows: `2rem repeat(${totalSlots}, 1.4rem)`,
              }}
            >
              {/* Cabeçalho dos dias */}
              {DIAS.map((dia, i) => (
                <div
                  key={dia}
                  className={styles.dayHeader}
                  style={{ gridColumn: i + 2, gridRow: 1 }}
                >
                  {dia}
                </div>
              ))}

              {/* Rótulos de hora */}
              {horasLabel.map((hora, i) => (
                <div
                  key={hora}
                  className={styles.hourLabel}
                  style={{
                    gridColumn: 1,
                    gridRow: `${i * 2 + 2} / span 2`,
                  }}
                >
                  {String(hora).padStart(2, '0')}h
                </div>
              ))}

              {/* Linhas de grade horizontais (uma por hora cheia) */}
              {horasLabel.map((hora, i) => (
                <div
                  key={`linha-${hora}`}
                  className={styles.hourLine}
                  style={{ gridColumn: '2 / -1', gridRow: i * 2 + 2 }}
                />
              ))}

              {/* Blocos */}
              {blocos.map((bloco) => {
                const area = bloco.area_id ? areaPorId.get(bloco.area_id) : null
                const rowStart = Math.floor(slotDe(bloco.hora_inicio)) + 2
                const rowEnd = Math.ceil(slotDe(bloco.hora_fim)) + 2
                const { lane, lanes } = layoutSobreposicao.get(bloco.id) ?? { lane: 0, lanes: 1 }
                const larguraPct = 100 / lanes
                return (
                  <div
                    key={bloco.id}
                    data-dia-semana={bloco.dia_semana}
                    data-testid="bloco-rotina"
                    className={styles.bloco}
                    style={{
                      gridColumn: bloco.dia_semana + 2,
                      gridRow: `${rowStart} / ${rowEnd}`,
                      width: `calc(${larguraPct}% - 4px)`,
                      marginLeft: `calc(${larguraPct * lane}% + 2px)`,
                      background: area ? `${area.cor}26` : 'rgba(124, 106, 247, 0.15)',
                      borderColor: area ? area.cor : 'rgba(124, 106, 247, 0.5)',
                    }}
                  >
                    <div className={styles.blocoAtividade}>{bloco.atividade}</div>
                    <div className={styles.blocoHora}>
                      {formatHora(bloco.hora_inicio)}–{formatHora(bloco.hora_fim)}
                    </div>
                  </div>
                )
              })}
            </div>
          </GradeScrollHint>
        )}
      </section>

      {/* A grade é só visual — como blocos curtos não têm espaço pra ações,
          a edição/exclusão fica nesta lista abaixo, agrupada por dia. */}
      {blocos.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Todos os blocos</h2>
          {DIAS.map((dia, diaIdx) => {
            const blocosDoDia = blocos.filter((b) => b.dia_semana === diaIdx)
            if (blocosDoDia.length === 0) return null
            return (
              <div key={dia} className={styles.diaGrupo}>
                <h3 className={styles.diaGrupoTitle}>{dia}</h3>
                <ul className={styles.list}>
                  {blocosDoDia.map((bloco) => {
                    const area = bloco.area_id ? areaPorId.get(bloco.area_id) : null
                    return (
                      <li key={bloco.id} className={styles.item}>
                        <div className={styles.itemInfo}>
                          <span
                            className={styles.swatch}
                            style={{ background: area ? area.cor : 'rgba(255,255,255,0.25)' }}
                          />
                          <div>
                            <div className={styles.itemNome}>{bloco.atividade}</div>
                            <div className={styles.itemMeta}>
                              {formatHora(bloco.hora_inicio)}–{formatHora(bloco.hora_fim)}
                              {area ? ` · ${area.icone} ${area.nome}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className={styles.itemActions}>
                          <Link href={`/rotina?edit=${bloco.id}`} className={styles.editLink}>
                            Editar
                          </Link>
                          <DeleteBlocoButton id={bloco.id} atividade={bloco.atividade} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
