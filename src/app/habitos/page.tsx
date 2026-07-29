import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { HabitForm } from './HabitForm'
import { DeleteHabitButton } from './DeleteHabitButton'
import { HabitosConclusaoChart } from './HabitosConclusaoChart'
import { HabitCheckInButton } from '@/components/HabitCheckInButton'
import { habitoApareceEm, labelFrequencia } from '@/lib/habitFrequencia'
import { CompromissoForm } from '../compromissos/CompromissoForm'
import { DeleteCompromissoButton } from '../compromissos/DeleteCompromissoButton'
import { CompromissoFeitoToggle } from '../compromissos/CompromissoFeitoToggle'
import type { Area, Habit, Compromisso } from '@/lib/supabase/types'
import { labelArea } from '@/lib/areaLabel'
import styles from './page.module.css'
import compromissosStyles from '../compromissos/page.module.css'

export const metadata: Metadata = {
  title: 'Rotina e Hábitos',
}

type Secao = 'habitos' | 'compromissos'

/**
 * Janela de 3 dias (pelo relógio do servidor) só pra garantir que o dia
 * "de hoje" do navegador do usuário — calculado no HabitCheckInButton,
 * client-side — esteja incluído mesmo perto da virada da meia-noite.
 */
function janelaRecente() {
  return new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
}

/** "Hoje" pelo relógio do servidor — mesma simplificação já usada em
 *  outras telas (ex: /hoje, mês do Financeiro). */
function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatHora(hora: string): string {
  return hora.slice(0, 5)
}

function formatDataBR(data: string): string {
  return data.split('-').reverse().join('/')
}

/** Mês atual (relógio do servidor) em "YYYY-MM". */
function mesAtualISO(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

/** Valida o parâmetro `?mes=`; se ausente/inválido, cai no mês atual. */
function mesValido(mes: string | undefined): string {
  return mes && /^\d{4}-\d{2}$/.test(mes) ? mes : mesAtualISO()
}

/** Primeiro e último dia do mês informado ("YYYY-MM"), em ISO (YYYY-MM-DD). */
function faixaDoMes(mesISO: string) {
  const [ano, mes] = mesISO.split('-').map(Number)
  const inicio = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 0))
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) }
}

/** Desloca um mês ("YYYY-MM") por `delta` meses (pode ser negativo). */
function deslocarMes(mesISO: string, delta: number): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const totalMeses = mes - 1 + delta
  const novoAno = ano + Math.floor(totalMeses / 12)
  const novoMes = (((totalMeses % 12) + 12) % 12) + 1
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}

/** Nome do mês por extenso em pt-BR, ex: "Agosto de 2026". */
function nomeMes(mesISO: string): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const nome = new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function hrefComMes(mes: string): string {
  return `/habitos?mes=${mes}`
}

/** Um dia depois da data ISO informada. */
function somarUmDia(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia + 1)).toISOString().slice(0, 10)
}

/**
 * % de conclusão de cada hábito no mês: dias em que foi marcado "feito"
 * dividido pelos dias em que ele deveria ter sido feito (considerando a
 * frequência e a data de criação do hábito), limitado a hoje quando o mês
 * selecionado é o atual — dias futuros não contam contra o hábito.
 */
function calcularConclusaoDoMes(
  habits: Habit[],
  diasFeitosPorHabito: Map<string, Set<string>>,
  inicioMes: string,
  fimEfetivo: string
): { nome: string; percentual: number }[] {
  const resultado: { nome: string; percentual: number }[] = []

  for (const habit of habits) {
    const criadoEm = habit.created_at.slice(0, 10)
    let devidos = 0
    let feitos = 0
    const diasFeitos = diasFeitosPorHabito.get(habit.id)

    for (let dia = inicioMes; dia <= fimEfetivo; dia = somarUmDia(dia)) {
      if (dia < criadoEm) continue
      if (!habitoApareceEm(habit, dia)) continue
      devidos++
      if (diasFeitos?.has(dia)) feitos++
    }

    if (devidos > 0) {
      resultado.push({ nome: habit.nome, percentual: Math.round((feitos / devidos) * 100) })
    }
  }

  return resultado
}

export default async function RotinaHabitosPage({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string; edit?: string; mes?: string }>
}) {
  const { secao: secaoParam, edit, mes } = await searchParams
  const secao: Secao = secaoParam === 'compromissos' ? 'compromissos' : 'habitos'
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: habitsData }, { data: areasData }, { data: compromissosData }] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // Busca todas as áreas (não só as ativas): um hábito/compromisso pode
    // estar vinculado a uma área já arquivada, e precisamos do nome dela
    // pra exibir o rótulo "(arquivada)" em vez de simplesmente não mostrar
    // nada.
    supabase.from('areas').select('*').eq('user_id', user.id).order('ordem', { ascending: true }),
    supabase
      .from('compromissos')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: true })
      .order('hora_inicio', { ascending: true }),
  ])

  const habits = (habitsData ?? []) as Habit[]
  const todasAreas = (areasData ?? []) as Area[]
  const areasAtivas = todasAreas.filter((a) => !a.arquivada)
  const areaById = new Map(todasAreas.map((a) => [a.id, a]))
  const compromissos = (compromissosData ?? []) as Compromisso[]

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

  const mesSelecionado = mesValido(mes)
  const { inicio: inicioMes, fim: fimMes } = faixaDoMes(mesSelecionado)
  const estaNoMesAtual = mesSelecionado === mesAtualISO()
  const fimEfetivo = estaNoMesAtual ? [fimMes, hojeISO()].sort()[0] : fimMes

  const { data: logsMesData } =
    habitIds.length > 0
      ? await supabase
          .from('habit_logs')
          .select('habit_id, data')
          .eq('status', true)
          .gte('data', inicioMes)
          .lte('data', fimMes)
          .in('habit_id', habitIds)
      : { data: [] as { habit_id: string; data: string }[] }

  const diasFeitosPorHabito = new Map<string, Set<string>>()
  for (const log of logsMesData ?? []) {
    const set = diasFeitosPorHabito.get(log.habit_id) ?? new Set<string>()
    set.add(log.data)
    diasFeitosPorHabito.set(log.habit_id, set)
  }

  const conclusaoDoMes = calcularConclusaoDoMes(habits, diasFeitosPorHabito, inicioMes, fimEfetivo)

  const editingHabit = secao === 'habitos' && edit ? habits.find((h) => h.id === edit) ?? null : null

  // Se o hábito em edição está vinculado a uma área arquivada, inclui essa
  // área nas opções do formulário (só ela, não as outras arquivadas) —
  // senão o <select> cairia em "Sem área" e salvar sem querer desvincularia.
  const areaAtualArquivada =
    editingHabit?.area_id && !areasAtivas.some((a) => a.id === editingHabit.area_id)
      ? todasAreas.find((a) => a.id === editingHabit.area_id) ?? null
      : null
  const areasParaForm = areaAtualArquivada ? [...areasAtivas, areaAtualArquivada] : areasAtivas

  const editingCompromisso =
    secao === 'compromissos' && edit ? compromissos.find((c) => c.id === edit) ?? null : null

  const hoje = hojeISO()

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
        <Link href="/habitos?secao=compromissos" className={secao === 'compromissos' ? styles.tabActive : styles.tab}>
          Compromissos
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
                              {labelArea(area)}
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
                      <DeleteHabitButton id={habit.id} nome={habit.nome} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.mesNav}>
              <Link href={hrefComMes(deslocarMes(mesSelecionado, -1))} className={styles.mesNavArrow} aria-label="Mês anterior">
                ←
              </Link>
              <h2 className={styles.cardTitle}>Conclusão de {nomeMes(mesSelecionado)}</h2>
              <Link href={hrefComMes(deslocarMes(mesSelecionado, 1))} className={styles.mesNavArrow} aria-label="Próximo mês">
                →
              </Link>
            </div>
            <HabitosConclusaoChart dados={conclusaoDoMes} />
            {!estaNoMesAtual && (
              <Link href="/habitos" className={styles.voltarMesAtual}>
                ← Voltar pro mês atual
              </Link>
            )}
          </section>
        </>
      ) : (
        <>
          <section className={compromissosStyles.card}>
            <h2 className={compromissosStyles.cardTitle}>
              {editingCompromisso ? 'Editar compromisso' : 'Novo compromisso'}
            </h2>
            <CompromissoForm key={editingCompromisso?.id ?? 'new'} compromisso={editingCompromisso} areas={areasAtivas} />
          </section>

          <section className={compromissosStyles.section}>
            <h2 className={compromissosStyles.sectionTitle}>Todos os compromissos</h2>
            {compromissos.length === 0 ? (
              <p className={compromissosStyles.empty}>Nenhum compromisso cadastrado ainda. Crie o primeiro acima.</p>
            ) : (
              <ul className={compromissosStyles.list}>
                {compromissos.map((c) => {
                  const area = c.area_id ? areaById.get(c.area_id) : null
                  const isHoje = c.data === hoje
                  const jaPassou = c.data < hoje
                  return (
                    <li key={c.id} className={compromissosStyles.item}>
                      <div className={compromissosStyles.itemInfo}>
                        <span
                          className={compromissosStyles.swatch}
                          style={{ background: area ? area.cor : 'rgba(255,255,255,0.25)' }}
                        />
                        <div>
                          <div className={isHoje ? compromissosStyles.itemNomeNegrito : compromissosStyles.itemNome}>
                            {c.atividade}
                          </div>
                          <div className={compromissosStyles.itemMeta}>
                            {formatDataBR(c.data)} · {formatHora(c.hora_inicio)}–{formatHora(c.hora_fim)}
                            {area ? ` · ${labelArea(area)}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className={compromissosStyles.itemActions}>
                        {jaPassou && <CompromissoFeitoToggle id={c.id} feito={c.feito} />}
                        <Link
                          href={`/habitos?secao=compromissos&edit=${c.id}`}
                          className={compromissosStyles.editLink}
                        >
                          Editar
                        </Link>
                        <DeleteCompromissoButton id={c.id} atividade={c.atividade} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
