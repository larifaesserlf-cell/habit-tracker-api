import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'
import { setMetaStatus } from '@/actions/metas'
import { CompromissosHojeCard } from './CompromissosHojeCard'
import { HabitCheckInToggle } from '@/components/HabitCheckInToggle'
import { habitoApareceEm, labelFrequencia } from '@/lib/habitFrequencia'
import { calcularProgressoMeta } from '@/lib/metaProgresso'
import { GastosPorCategoriaChart } from '../financeiro/GastosPorCategoriaChart'
import { labelArea } from '@/lib/areaLabel'
import type { Area, Compromisso, Destino, Habit, Meta, Transacao, Viagem } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Hoje',
}

/**
 * Janela de 3 dias (pelo relógio do servidor) só pra garantir que o dia
 * "de hoje" do navegador do usuário — calculado no HabitCheckInToggle,
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

/** Janela de ontem até amanhã (relógio do servidor): a comparação exata com
 *  "hoje" é feita no client (fuso do navegador), então a busca no servidor
 *  só precisa de uma margem de segurança em volta da virada do dia. */
function janelaCompromissosHoje() {
  const agora = new Date()
  const inicio = new Date(agora.getTime() - 86400000).toISOString().slice(0, 10)
  const fim = new Date(agora.getTime() + 86400000).toISOString().slice(0, 10)
  return { inicio, fim }
}

/** Primeiro e último dia do mês atual (relógio do servidor), em ISO. */
function faixaMesAtual() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth() + 1
  const inicio = new Date(Date.UTC(ano, mes - 1, 1)).toISOString().slice(0, 10)
  const fim = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10)
  return { inicio, fim }
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

/** Soma o valor das despesas do mês por categoria, maior primeiro. */
function agruparDespesasPorCategoria(transacoes: Transacao[]): { categoria: string; valor: number }[] {
  const valorPorCategoria = new Map<string, number>()
  for (const t of transacoes) {
    if (t.tipo !== 'despesa') continue
    valorPorCategoria.set(t.categoria, (valorPorCategoria.get(t.categoria) ?? 0) + t.valor)
  }
  return Array.from(valorPorCategoria, ([categoria, valor]) => ({ categoria, valor })).sort(
    (a, b) => b.valor - a.valor
  )
}

/** Viagem cujo período previsto cruza com o mês atual (início/fim do mês em
 *  ISO); entre várias, a que começa mais cedo. */
function escolherViagemDoMes(viagens: Viagem[], inicioMes: string, fimMes: string): Viagem | null {
  const candidatas = viagens
    .filter((v) => v.data_prevista_inicio)
    .filter((v) => {
      const inicio = v.data_prevista_inicio!
      const fim = v.data_prevista_fim ?? inicio
      return inicio <= fimMes && fim >= inicioMes
    })
    .sort((a, b) => (a.data_prevista_inicio! < b.data_prevista_inicio! ? -1 : 1))
  return candidatas[0] ?? null
}

export default async function HojePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { inicio: inicioMes, fim: fimMes } = faixaMesAtual()
  const { inicio: inicioCompromissos, fim: fimCompromissos } = janelaCompromissosHoje()

  const [
    { data: areasData },
    { data: compromissosData },
    { data: habitsData },
    { data: metasData },
    { data: viagensData },
    { data: transacoesData },
  ] = await Promise.all([
    // Todas as áreas (não só ativas): hábitos/metas/compromissos podem
    // estar vinculados a uma área já arquivada, e ainda queremos mostrar o
    // nome dela (com indicação de que está arquivada) em vez de nada.
    supabase.from('areas').select('*').eq('user_id', user.id),
    supabase
      .from('compromissos')
      .select('*')
      .eq('user_id', user.id)
      .gte('data', inicioCompromissos)
      .lte('data', fimCompromissos),
    supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('metas').select('*').eq('status', 'ativa'),
    supabase.from('viagens').select('*').eq('user_id', user.id),
    supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', user.id)
      .gte('data', inicioMes)
      .lte('data', fimMes),
  ])

  const areas = (areasData ?? []) as Area[]
  const areaPorId = new Map(areas.map((a) => [a.id, a]))
  const compromissos = (compromissosData ?? []) as Compromisso[]
  const habits = (habitsData ?? []) as Habit[]
  const habitoPorId = new Map(habits.map((h) => [h.id, h]))
  const metas = (metasData ?? []) as Meta[]
  const viagens = (viagensData ?? []) as Viagem[]
  const transacoesDoMes = (transacoesData ?? []) as Transacao[]
  const gastosPorCategoria = agruparDespesasPorCategoria(transacoesDoMes)
  const viagemDoMes = escolherViagemDoMes(viagens, inicioMes, fimMes)

  const { data: destinosData } = viagemDoMes
    ? await supabase
        .from('destinos')
        .select('*')
        .eq('viagem_id', viagemDoMes.id)
        .order('ordem', { ascending: true })
    : { data: [] as Destino[] }
  const cidadesViagemDoMes = ((destinosData ?? []) as Destino[]).map((d) => d.nome_cidade).join(', ')

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

      <CompromissosHojeCard compromissos={compromissos} areaPorId={areaPorId} />

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
                            {labelArea(area)}
                            {area.arquivada && (
                              <span className={styles.areaArquivadaLabel}> (arquivada)</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <HabitCheckInToggle habitId={h.id} logsRecentes={logsByHabit.get(h.id) ?? []} />
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
                        {area ? labelArea(area) : ''}
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

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Gastos do mês</h2>
          <Link href="/financeiro" className={styles.verTudoLink}>
            Ver financeiro →
          </Link>
        </div>
        <GastosPorCategoriaChart dados={gastosPorCategoria} />
      </section>

      {viagemDoMes && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Viagem do mês</h2>
            <Link href="/viagens" className={styles.verTudoLink}>
              Ver todas →
            </Link>
          </div>
          <div className={styles.itemInfo}>
            <div>
              <div className={styles.itemNome}>{viagemDoMes.nome}</div>
              <div className={styles.itemMeta}>
                {viagemDoMes.data_prevista_inicio && formatDataBR(viagemDoMes.data_prevista_inicio)}
                {viagemDoMes.data_prevista_fim && ` – ${formatDataBR(viagemDoMes.data_prevista_fim)}`}
                {cidadesViagemDoMes && ` · ${cidadesViagemDoMes}`}
              </div>
            </div>
            <Link href={`/viagens/${viagemDoMes.id}`} className={styles.verTudoLink}>
              Abrir viagem →
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
