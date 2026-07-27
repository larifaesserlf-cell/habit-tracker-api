import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { HabitForm } from './HabitForm'
import { HabitCheckInButton } from '@/components/HabitCheckInButton'
import { labelFrequencia } from '@/lib/habitFrequencia'
import { BlocoForm } from '../rotina/BlocoForm'
import { DeleteBlocoButton } from '../rotina/DeleteBlocoButton'
import { GradeScrollHint } from '../rotina/GradeScrollHint'
import type { Area, Habit, RotinaBloco } from '@/lib/supabase/types'
import styles from './page.module.css'
import rotinaStyles from '../rotina/page.module.css'

export const metadata: Metadata = {
  title: 'Rotina e Hábitos',
}

type Secao = 'habitos' | 'rotina'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Grade em blocos de 30 minutos. Se não houver dados, mostra 06:00–22:00;
// se algum bloco cair fora dessa faixa, a grade se estende para caber nele.
const DEFAULT_START_HOUR = 6
const DEFAULT_END_HOUR = 22
const SLOT_MINUTES = 30

/**
 * Janela de 3 dias (pelo relógio do servidor) só pra garantir que o dia
 * "de hoje" do navegador do usuário — calculado no HabitCheckInButton,
 * client-side — esteja incluído mesmo perto da virada da meia-noite.
 */
function janelaRecente() {
  return new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
}

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

export default async function RotinaHabitosPage({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string; edit?: string }>
}) {
  const { secao: secaoParam, edit } = await searchParams
  const secao: Secao = secaoParam === 'rotina' ? 'rotina' : 'habitos'
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: habitsData }, { data: areasData }, { data: blocosData }] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // Busca todas as áreas (não só as ativas): um hábito/bloco pode estar
    // vinculado a uma área já arquivada, e precisamos do nome dela pra
    // exibir o rótulo "(arquivada)" em vez de simplesmente não mostrar nada.
    supabase.from('areas').select('*').eq('user_id', user.id).order('ordem', { ascending: true }),
    supabase
      .from('rotina_diaria')
      .select('*')
      .eq('user_id', user.id)
      .order('hora_inicio', { ascending: true }),
  ])

  const habits = (habitsData ?? []) as Habit[]
  const todasAreas = (areasData ?? []) as Area[]
  const areasAtivas = todasAreas.filter((a) => !a.arquivada)
  const areaById = new Map(todasAreas.map((a) => [a.id, a]))
  const blocos = (blocosData ?? []) as RotinaBloco[]

  const habitIds = habits.map((h) => h.id)
  const { data: logsData } =
    habitIds.length > 0
      ? await supabase
          .from('habit_logs')
          .select('habit_id, data, status')
          .gte('data', janelaRecente())
          .in('habit_id', habitIds)
      : { data: [] as { habit_id: string; data: string; status: boolean }[] }

  const logsByHabit = new Map<string, { data: string; status: boolean }[]>()
  for (const log of logsData ?? []) {
    const lista = logsByHabit.get(log.habit_id) ?? []
    lista.push({ data: log.data, status: log.status })
    logsByHabit.set(log.habit_id, lista)
  }

  const editingHabit = secao === 'habitos' && edit ? habits.find((h) => h.id === edit) ?? null : null

  // Se o hábito em edição está vinculado a uma área arquivada, inclui essa
  // área nas opções do formulário (só ela, não as outras arquivadas) —
  // senão o <select> cairia em "Sem área" e salvar sem querer desvincularia.
  const areaAtualArquivada =
    editingHabit?.area_id && !areasAtivas.some((a) => a.id === editingHabit.area_id)
      ? todasAreas.find((a) => a.id === editingHabit.area_id) ?? null
      : null
  const areasParaForm = areaAtualArquivada ? [...areasAtivas, areaAtualArquivada] : areasAtivas

  const editingBloco = secao === 'rotina' && edit ? blocos.find((b) => b.id === edit) ?? null : null

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
        <h1 className={styles.title}>Rotina e Hábitos</h1>
      </div>

      <div className={styles.tabsWrap}>
        <Link href="/habitos" className={secao === 'habitos' ? styles.tabActive : styles.tab}>
          Hábitos
        </Link>
        <Link href="/habitos?secao=rotina" className={secao === 'rotina' ? styles.tabActive : styles.tab}>
          Rotina semanal
        </Link>
      </div>

      {secao === 'habitos' ? (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{editingHabit ? 'Editar hábito' : 'Novo hábito'}</h2>
            <HabitForm key={editingHabit?.id ?? 'new'} habit={editingHabit} areas={areasParaForm} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Check-in de hoje</h2>
            {habits.length === 0 && (
              <p className={styles.empty}>Nenhum hábito cadastrado ainda. Crie o primeiro acima.</p>
            )}
            <ul className={styles.list}>
              {habits.map((habit) => {
                const area = habit.area_id ? areaById.get(habit.area_id) : null
                return (
                  <li key={habit.id} className={styles.item}>
                    <div className={styles.itemInfo}>
                      <div>
                        <div className={styles.itemNome}>{habit.nome}</div>
                        <div className={styles.itemMeta}>
                          {labelFrequencia(habit)}
                          {area && (
                            <>
                              {' · '}
                              {area.icone} {area.nome}
                              {area.arquivada && (
                                <span className={styles.areaArquivadaLabel}> (arquivada)</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={styles.itemActions}>
                      <HabitCheckInButton
                        habitId={habit.id}
                        logsRecentes={logsByHabit.get(habit.id) ?? []}
                        doneClassName={styles.checkDone}
                        pendingClassName={styles.checkPending}
                      />
                      <Link href={`/habitos?edit=${habit.id}`} className={styles.editLink}>
                        Editar
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      ) : (
        <>
          <section className={rotinaStyles.card}>
            <h2 className={rotinaStyles.cardTitle}>{editingBloco ? 'Editar bloco' : 'Novo bloco'}</h2>
            <BlocoForm key={editingBloco?.id ?? 'new'} bloco={editingBloco} areas={areasAtivas} />
          </section>

          <section className={rotinaStyles.gridSection}>
            {blocos.length === 0 ? (
              <p className={rotinaStyles.empty}>Nenhum bloco cadastrado ainda. Crie o primeiro acima.</p>
            ) : (
              <GradeScrollHint>
                <div
                  className={rotinaStyles.grid}
                  style={{
                    gridTemplateColumns: `3.25rem repeat(7, minmax(6.5rem, 1fr))`,
                    gridTemplateRows: `2rem repeat(${totalSlots}, 1.4rem)`,
                  }}
                >
                  {/* Cabeçalho dos dias */}
                  {DIAS.map((dia, i) => (
                    <div
                      key={dia}
                      className={rotinaStyles.dayHeader}
                      style={{ gridColumn: i + 2, gridRow: 1 }}
                    >
                      {dia}
                    </div>
                  ))}

                  {/* Rótulos de hora */}
                  {horasLabel.map((hora, i) => (
                    <div
                      key={hora}
                      className={rotinaStyles.hourLabel}
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
                      className={rotinaStyles.hourLine}
                      style={{ gridColumn: '2 / -1', gridRow: i * 2 + 2 }}
                    />
                  ))}

                  {/* Blocos */}
                  {blocos.map((bloco) => {
                    const area = bloco.area_id ? areaById.get(bloco.area_id) : null
                    const rowStart = Math.floor(slotDe(bloco.hora_inicio)) + 2
                    const rowEnd = Math.ceil(slotDe(bloco.hora_fim)) + 2
                    const { lane, lanes } = layoutSobreposicao.get(bloco.id) ?? { lane: 0, lanes: 1 }
                    const larguraPct = 100 / lanes
                    return (
                      <div
                        key={bloco.id}
                        data-dia-semana={bloco.dia_semana}
                        data-testid="bloco-rotina"
                        className={rotinaStyles.bloco}
                        style={{
                          gridColumn: bloco.dia_semana + 2,
                          gridRow: `${rowStart} / ${rowEnd}`,
                          width: `calc(${larguraPct}% - 4px)`,
                          marginLeft: `calc(${larguraPct * lane}% + 2px)`,
                          background: area ? `${area.cor}26` : 'rgba(124, 106, 247, 0.15)',
                          borderColor: area ? area.cor : 'rgba(124, 106, 247, 0.5)',
                        }}
                      >
                        <div className={rotinaStyles.blocoAtividade}>{bloco.atividade}</div>
                        <div className={rotinaStyles.blocoHora}>
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
            <section className={rotinaStyles.section}>
              <h2 className={rotinaStyles.sectionTitle}>Todos os blocos</h2>
              {DIAS.map((dia, diaIdx) => {
                const blocosDoDia = blocos.filter((b) => b.dia_semana === diaIdx)
                if (blocosDoDia.length === 0) return null
                return (
                  <div key={dia} className={rotinaStyles.diaGrupo}>
                    <h3 className={rotinaStyles.diaGrupoTitle}>{dia}</h3>
                    <ul className={rotinaStyles.list}>
                      {blocosDoDia.map((bloco) => {
                        const area = bloco.area_id ? areaById.get(bloco.area_id) : null
                        return (
                          <li key={bloco.id} className={rotinaStyles.item}>
                            <div className={rotinaStyles.itemInfo}>
                              <span
                                className={rotinaStyles.swatch}
                                style={{ background: area ? area.cor : 'rgba(255,255,255,0.25)' }}
                              />
                              <div>
                                <div className={rotinaStyles.itemNome}>{bloco.atividade}</div>
                                <div className={rotinaStyles.itemMeta}>
                                  {formatHora(bloco.hora_inicio)}–{formatHora(bloco.hora_fim)}
                                  {area ? ` · ${area.icone} ${area.nome}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className={rotinaStyles.itemActions}>
                              <Link href={`/habitos?secao=rotina&edit=${bloco.id}`} className={rotinaStyles.editLink}>
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
        </>
      )}
    </div>
  )
}
