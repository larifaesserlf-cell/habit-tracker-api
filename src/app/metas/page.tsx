import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { setMetaStatus } from '@/actions/metas'
import { MetaForm } from './MetaForm'
import { DeleteMetaButton } from './DeleteMetaButton'
import { calcularProgressoMeta } from '@/lib/metaProgresso'
import type { Area, Habit, Meta, MetaStatus } from '@/lib/supabase/types'
import { labelArea } from '@/lib/areaLabel'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Metas',
}

const TIPO_LABEL: Record<Meta['tipo'], string> = {
  curto: 'Curto prazo',
  medio: 'Médio prazo',
  longo: 'Longo prazo',
}

const STATUS_LABEL: Record<MetaStatus, string> = {
  ativa: 'Ativa',
  concluida: 'Concluída',
  abandonada: 'Abandonada',
}

const STATUS_BADGE_CLASS: Record<MetaStatus, string> = {
  ativa: styles.badgeAtiva,
  concluida: styles.badgeConcluida,
  abandonada: styles.badgeAbandonada,
}

/** Dias entre hoje e a data-alvo (negativo = já passou). */
function diasAteAlvo(dataAlvo: string): number {
  const hoje = new Date().toISOString().slice(0, 10)
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(dataAlvo) - Date.parse(hoje)) / msPorDia)
}

function formatPrazo(dias: number): string {
  if (dias > 1) return `faltam ${dias} dias`
  if (dias === 1) return 'falta 1 dia'
  if (dias === 0) return 'é hoje'
  if (dias === -1) return 'atrasada há 1 dia'
  return `atrasada há ${-dias} dias`
}

export default async function MetasPage({
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

  const [{ data: areasData }, { data: metasData }, { data: habitsData }] = await Promise.all([
    supabase.from('areas').select('*').eq('user_id', user.id).order('ordem', { ascending: true }),
    // RLS já restringe a metas cujas áreas pertencem ao usuário.
    supabase.from('metas').select('*').order('created_at', { ascending: false }),
    supabase.from('habits').select('*').eq('user_id', user.id).order('nome', { ascending: true }),
  ])

  const areas = (areasData ?? []) as Area[]
  const areasAtivas = areas.filter((a) => !a.arquivada)
  const metas = (metasData ?? []) as Meta[]
  const habitos = (habitsData ?? []) as Habit[]
  const habitoPorId = new Map(habitos.map((h) => [h.id, h]))

  const habitoIdsComMeta = [...new Set(metas.map((m) => m.habito_id).filter((id): id is string => Boolean(id)))]
  const { data: logsData } =
    habitoIdsComMeta.length > 0
      ? await supabase
          .from('habit_logs')
          .select('habit_id, data')
          .eq('status', true)
          .in('habit_id', habitoIdsComMeta)
      : { data: [] as { habit_id: string; data: string }[] }

  const datasConcluidasPorHabito = new Map<string, Set<string>>()
  for (const log of logsData ?? []) {
    const set = datasConcluidasPorHabito.get(log.habit_id) ?? new Set<string>()
    set.add(log.data)
    datasConcluidasPorHabito.set(log.habit_id, set)
  }

  function progressoDe(meta: Meta): number | null {
    if (!meta.habito_id) return null
    const habito = habitoPorId.get(meta.habito_id)
    if (!habito) return null
    return calcularProgressoMeta(meta, habito, datasConcluidasPorHabito.get(meta.habito_id) ?? new Set())
  }

  const metasByArea = new Map<string, Meta[]>()
  for (const meta of metas) {
    const lista = metasByArea.get(meta.area_id) ?? []
    lista.push(meta)
    metasByArea.set(meta.area_id, lista)
  }

  const editingMeta = edit ? metas.find((m) => m.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/hoje" className={styles.backLink}>
          ← Painel
        </Link>
        <h1 className={styles.title}>Metas</h1>
      </div>

      {areasAtivas.length === 0 ? (
        <section className={styles.card}>
          <p className={styles.empty}>
            Você ainda não tem nenhuma área ativa.{' '}
            <Link href="/areas" className={styles.editLink}>
              Crie uma área
            </Link>{' '}
            antes de cadastrar metas.
          </p>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{editingMeta ? 'Editar meta' : 'Nova meta'}</h2>
          <MetaForm key={editingMeta?.id ?? 'new'} meta={editingMeta} areas={areasAtivas} habitos={habitos} />
        </section>
      )}

      {areas.map((area) => {
        const metasDaArea = metasByArea.get(area.id) ?? []
        return (
          <section key={area.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {labelArea(area)}
              {area.arquivada ? ' (arquivada)' : ''}
            </h2>
            {metasDaArea.length === 0 ? (
              <p className={styles.empty}>Nenhuma meta nesta área ainda.</p>
            ) : (
              <ul className={styles.list}>
                {metasDaArea.map((meta) => {
                  const dias = meta.data_alvo ? diasAteAlvo(meta.data_alvo) : null
                  const atrasada = meta.status === 'ativa' && dias !== null && dias < 0
                  return (
                  <li key={meta.id} className={atrasada ? `${styles.item} ${styles.itemAtrasada}` : styles.item}>
                    <div className={styles.itemInfo}>
                      <div>
                        <div className={styles.itemNome}>{meta.titulo}</div>
                        <div className={styles.itemMeta}>
                          {TIPO_LABEL[meta.tipo]}
                          {meta.data_alvo && (
                            <>
                              {' · até '}
                              {meta.data_alvo.split('-').reverse().join('/')}
                              {' ('}
                              <span className={atrasada ? styles.prazoAtrasado : undefined}>
                                {formatPrazo(dias!)}
                              </span>
                              {')'}
                            </>
                          )}
                        </div>
                      </div>
                      <span className={STATUS_BADGE_CLASS[meta.status]}>
                        {STATUS_LABEL[meta.status]}
                      </span>
                    </div>
                    {(() => {
                      const progresso = progressoDe(meta)
                      if (progresso === null) return null
                      return (
                        <div className={styles.progressWrap}>
                          <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${progresso}%` }} />
                          </div>
                          <span className={styles.progressLabel}>{progresso}%</span>
                        </div>
                      )
                    })()}
                    <div className={styles.itemActions}>
                      {meta.status === 'ativa' && (
                        <>
                          <form action={setMetaStatus.bind(null, meta.id, 'concluida')}>
                            <button type="submit" className={styles.quickBtn}>
                              Concluir
                            </button>
                          </form>
                          <form action={setMetaStatus.bind(null, meta.id, 'abandonada')}>
                            <button type="submit" className={styles.quickBtn}>
                              Abandonar
                            </button>
                          </form>
                        </>
                      )}
                      {meta.status !== 'ativa' && (
                        <form action={setMetaStatus.bind(null, meta.id, 'ativa')}>
                          <button type="submit" className={styles.quickBtn}>
                            Reativar
                          </button>
                        </form>
                      )}
                      <Link href={`/metas?edit=${meta.id}`} className={styles.editLink}>
                        Editar
                      </Link>
                      <DeleteMetaButton id={meta.id} titulo={meta.titulo} />
                    </div>
                  </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
