import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'
import { setMetaStatus } from '@/actions/metas'
import { RotinaHojeCard } from './RotinaHojeCard'
import { HabitCheckInButton } from '@/components/HabitCheckInButton'
import { habitoApareceEm, labelFrequencia } from '@/lib/habitFrequencia'
import { calcularProgressoMeta } from '@/lib/metaProgresso'
import { VIAGEM_STATUS_LABEL } from '../viagens/constants'
import type { Area, Habit, Meta, RotinaBloco, Viagem } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Hoje',
}

/**
 * Janela de 3 dias (pelo relógio do servidor) só pra garantir que o dia
 * "de hoje" do navegador do usuário — calculado no HabitCheckInButton,
 * client-side, igual à rotina desta página — esteja incluído
 * mesmo perto da virada da meia-noite.
 */
function janelaRecente() {
  return new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
}

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

/** "Hoje" pelo relógio do servidor — mesma simplificação já usada em outras
 *  telas (ex: mês do Financeiro): suficiente pra um app pessoal de um único
 *  fuso, sem a complexidade de refazer o cálculo no navegador aqui. */
function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

/** Metas com data_alvo mais próxima primeiro; sem data_alvo, mais recentes por último. */
function ordenarMetasFoco(metas: Meta[]): Meta[] {
  const comData = [...metas]
    .filter((m) => m.data_alvo)
    .sort((a, b) => (a.data_alvo! < b.data_alvo! ? -1 : a.data_alvo! > b.data_alvo! ? 1 : 0))
  const semData = [...metas]
    .filter((m) => !m.data_alvo)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return [...comData, ...semData].slice(0, 5)
}

/**
 * Viagem em foco: entre as não concluídas, prioriza a com
 * data_prevista_inicio mais próxima; se nenhuma tiver data, a mais
 * recente criada.
 */
function escolherProximaViagem(viagens: Viagem[]): Viagem | null {
  const naoConcluidas = viagens.filter((v) => v.status !== 'concluida')
  const comData = naoConcluidas
    .filter((v) => v.data_prevista_inicio)
    .sort((a, b) => (a.data_prevista_inicio! < b.data_prevista_inicio! ? -1 : 1))
  if (comData.length > 0) return comData[0]

  const semData = [...naoConcluidas].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return semData[0] ?? null
}

/** Dias entre hoje e a data prevista (negativo = já começou/passou). */
function diasAte(data: string): number {
  const hoje = new Date().toISOString().slice(0, 10)
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(data) - Date.parse(hoje)) / msPorDia)
}

function formatContagem(dias: number): string {
  if (dias > 1) return `faltam ${dias} dias`
  if (dias === 1) return 'começa amanhã'
  if (dias === 0) return 'começa hoje!'
  return `em andamento (começou há ${-dias} dia${dias === -1 ? '' : 's'})`
}

export default async function HojePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [
    { data: areasData },
    { data: rotinaData },
    { data: habitsData },
    { data: metasData },
    { data: viagensData },
  ] = await Promise.all([
    // Todas as áreas (não só ativas): hábitos/metas/rotina podem estar
    // vinculados a uma área já arquivada, e ainda queremos mostrar o nome
    // dela (com indicação de que está arquivada) em vez de nada.
    supabase.from('areas').select('*').eq('user_id', user.id),
    supabase.from('rotina_diaria').select('*').eq('user_id', user.id),
    supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('metas').select('*').eq('status', 'ativa'),
    supabase.from('viagens').select('*').eq('user_id', user.id),
  ])

  const areas = (areasData ?? []) as Area[]
  const areaPorId = new Map(areas.map((a) => [a.id, a]))
  const rotina = (rotinaData ?? []) as RotinaBloco[]
  const habits = (habitsData ?? []) as Habit[]
  const habitoPorId = new Map(habits.map((h) => [h.id, h]))
  const metas = (metasData ?? []) as Meta[]
  const viagens = (viagensData ?? []) as Viagem[]
  const proximaViagem = escolherProximaViagem(viagens)

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

  // Progresso das metas em foco vinculadas a hábito: precisa do histórico
  // completo de conclusões (não só a janela recente usada no check-in de
  // hoje), então busca à parte, restrito aos hábitos realmente vinculados.
  const habitoIdsComMeta = [...new Set(metas.map((m) => m.habito_id).filter((id): id is string => Boolean(id)))]
  const { data: logsConcluidosData } =
    habitoIdsComMeta.length > 0
      ? await supabase
          .from('habit_logs')
          .select('habit_id, data')
          .eq('status', true)
          .in('habit_id', habitoIdsComMeta)
      : { data: [] as { habit_id: string; data: string }[] }

  const datasConcluidasPorHabito = new Map<string, Set<string>>()
  for (const log of logsConcluidosData ?? []) {
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

  const metasFoco = ordenarMetasFoco(metas)
  const habitsHoje = habits.filter((h) => habitoApareceEm(h, hojeISO()))

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Hoje</h1>
          <p className={styles.subtitle}>Logado como {user.email}</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/hoje" className={styles.navLink}>
            Início
          </Link>
          <Link href="/habitos" className={styles.navLink}>
            Rotina e Hábitos
          </Link>
          <Link href="/metas" className={styles.navLink}>
            Metas
          </Link>
          <Link href="/saude/ciclo" className={styles.navLink}>
            Ciclo
          </Link>
          <Link href="/midias" className={styles.navLink}>
            Mídias
          </Link>
          <Link href="/viagens" className={styles.navLink}>
            Viagens
          </Link>
          <Link href="/financeiro" className={styles.navLink}>
            Financeiro
          </Link>
        </nav>
        <form action={signOut}>
          <button type="submit" className={styles.logoutBtn}>
            Sair
          </button>
        </form>
      </div>

      <RotinaHojeCard blocos={rotina} areaPorId={areaPorId} />

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Hábitos de hoje</h2>
          <Link href="/habitos" className={styles.verTudoLink}>
            Gerenciar hábitos →
          </Link>
        </div>
        {habits.length === 0 ? (
          <p className={styles.empty}>Nenhum hábito cadastrado ainda.</p>
        ) : habitsHoje.length === 0 ? (
          <p className={styles.empty}>Nenhum hábito previsto pra hoje.</p>
        ) : (
          <ul className={styles.list}>
            {habitsHoje.map((h) => {
              const area = h.area_id ? areaPorId.get(h.area_id) : null
              return (
                <li key={h.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <div>
                      <div className={styles.itemNome}>{h.nome}</div>
                      <div className={styles.itemMeta}>
                        {labelFrequencia(h)}
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
                  <HabitCheckInButton
                    habitId={h.id}
                    logsRecentes={logsByHabit.get(h.id) ?? []}
                    doneClassName={styles.checkDone}
                    pendingClassName={styles.checkPending}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Metas em foco</h2>
          <Link href="/metas" className={styles.verTudoLink}>
            Ver todas →
          </Link>
        </div>
        {metasFoco.length === 0 ? (
          <p className={styles.empty}>Nenhuma meta ativa no momento.</p>
        ) : (
          <ul className={styles.list}>
            {metasFoco.map((m) => {
              const area = areaPorId.get(m.area_id)
              const progresso = progressoDe(m)
              return (
                <li key={m.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <div>
                      <div className={styles.itemNome}>{m.titulo}</div>
                      <div className={styles.itemMeta}>
                        {area ? `${area.icone} ${area.nome}` : ''}
                        {m.data_alvo ? ` · até ${formatDataBR(m.data_alvo)}` : ''}
                      </div>
                      {progresso !== null && (
                        <div className={styles.progressWrap}>
                          <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${progresso}%` }} />
                          </div>
                          <span className={styles.progressLabel}>{progresso}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.itemActions}>
                    <form action={setMetaStatus.bind(null, m.id, 'concluida')}>
                      <button type="submit" className={styles.quickBtn}>
                        Concluir
                      </button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {proximaViagem && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Próxima viagem</h2>
            <Link href="/viagens" className={styles.verTudoLink}>
              Ver todas →
            </Link>
          </div>
          <div className={styles.itemInfo}>
            <div>
              <div className={styles.itemNome}>{proximaViagem.nome}</div>
              <div className={styles.itemMeta}>
                {VIAGEM_STATUS_LABEL[proximaViagem.status]}
                {proximaViagem.data_prevista_inicio &&
                  ` · ${formatContagem(diasAte(proximaViagem.data_prevista_inicio))}`}
              </div>
            </div>
            <Link href={`/viagens/${proximaViagem.id}`} className={styles.verTudoLink}>
              Abrir viagem →
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
