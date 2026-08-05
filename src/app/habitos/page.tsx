import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { HabitForm } from './HabitForm'
import { DeleteHabitButton } from './DeleteHabitButton'
import { HabitosConclusaoChart } from './HabitosConclusaoChart'
import { CheckInCell } from './CheckInCell'
import { habitoApareceEm, labelFrequencia } from '@/lib/habitFrequencia'
import { CompromissoForm } from '../compromissos/CompromissoForm'
import { DeleteCompromissoButton } from '../compromissos/DeleteCompromissoButton'
import { CompromissoFeitoToggle } from '../compromissos/CompromissoFeitoToggle'
import { BackNav } from '@/components/BackNav'
import type { Area, Habit, Compromisso } from '@/lib/supabase/types'
import { labelArea } from '@/lib/areaLabel'
import styles from './page.module.css'
import compromissosStyles from '../compromissos/page.module.css'

export const metadata: Metadata = {
  title: 'Rotina e Hábitos',
}

type Secao = 'habitos' | 'compromissos'

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

/** Um dia depois da data ISO informada. */
function somarUmDia(dataISO: string): string {
  return deslocarDias(dataISO, 1)
}

/** Desloca uma data ISO por `n` dias (pode ser negativo). */
function deslocarDias(dataISO: string, n: number): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia + n)).toISOString().slice(0, 10)
}

/** Domingo (início) da semana que contém a data informada. */
function domingoDaSemana(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
  return deslocarDias(dataISO, -diaSemana)
}

/** Valida o parâmetro `?semana=`; se ausente/inválido, cai na semana atual.
 *  Sempre normalizado pro domingo daquela semana. */
function semanaValida(semana: string | undefined): string {
  const base = semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : hojeISO()
  return domingoDaSemana(base)
}

/** Os 7 dias (domingo a sábado) da semana que começa em `domingoISO`. */
function diasDaSemana(domingoISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => deslocarDias(domingoISO, i))
}

const DIA_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function abrevDiaSemana(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return DIA_SEMANA_ABREV[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()]
}

function labelDiaCurto(dataISO: string): string {
  const [, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}`
}

/** Monta a URL de /habitos preservando mês e semana selecionados. */
function hrefHabitos(params: { mes?: string; semana?: string; edit?: string }): string {
  const sp = new URLSearchParams()
  if (params.mes) sp.set('mes', params.mes)
  if (params.semana) sp.set('semana', params.semana)
  if (params.edit) sp.set('edit', params.edit)
  const query = sp.toString()
  return query ? `/habitos?${query}` : '/habitos'
}

type ConclusaoHabito = { nome: string; percentualFeito: number; percentualNaoFeito: number }

/**
 * % de conclusão de cada hábito no mês, considerando exceções pontuais
 * (item 4 do pedido): um hábito marcado como feito num dia fora da sua
 * frequência configurada, na mesma semana (domingo–sábado) de um dia
 * programado ainda "não feito", compensa esse dia em falta — não soma dia
 * extra ao total. Se não houver dia em falta pra compensar naquela semana,
 * a marcação extra soma como dia adicional (no numerador e no denominador).
 *
 * Dias programados sem resposta (pendentes) não entram nem no "feito" nem
 * no "não feito" — só contam pro denominador comum das duas porcentagens.
 */
function calcularConclusaoDoMes(
  habits: Habit[],
  logsMesPorHabito: Map<string, Map<string, boolean>>,
  inicioMes: string,
  fimEfetivo: string
): ConclusaoHabito[] {
  const resultado: ConclusaoHabito[] = []

  for (const habit of habits) {
    const criadoEm = habit.created_at.slice(0, 10)
    const logs = logsMesPorHabito.get(habit.id) ?? new Map<string, boolean>()

    type DiaInfo = { scheduled: boolean; log: boolean | undefined }
    const porSemana = new Map<string, DiaInfo[]>()

    for (let dia = inicioMes; dia <= fimEfetivo; dia = somarUmDia(dia)) {
      if (dia < criadoEm) continue
      const scheduled = habitoApareceEm(habit, dia)
      const log = logs.get(dia)
      // Dias não programados só interessam ao cálculo quando marcados como
      // feito (exceção pontual) — sem marcação, não entram em lugar nenhum.
      if (!scheduled && log !== true) continue
      const semana = domingoDaSemana(dia)
      const lista = porSemana.get(semana) ?? []
      lista.push({ scheduled, log })
      porSemana.set(semana, lista)
    }

    let devidos = 0
    let feitos = 0
    let naoFeitos = 0

    for (const dias of porSemana.values()) {
      const programados = dias.filter((d) => d.scheduled)
      const extras = dias.filter((d) => !d.scheduled && d.log === true)
      const vagasNaoFeito = programados.filter((d) => d.log === false).length
      let compensados = 0

      for (let i = 0; i < extras.length; i++) {
        if (compensados < vagasNaoFeito) {
          compensados++
        } else {
          // Exceção sem dia em falta pra compensar: vira slot adicional.
          devidos++
          feitos++
        }
      }

      devidos += programados.length
      feitos += programados.filter((d) => d.log === true).length + compensados
      naoFeitos += vagasNaoFeito - compensados
    }

    if (devidos > 0) {
      resultado.push({
        nome: habit.nome,
        percentualFeito: Math.round((feitos / devidos) * 100),
        percentualNaoFeito: Math.round((naoFeitos / devidos) * 100),
      })
    }
  }

  return resultado
}

export default async function RotinaHabitosPage({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string; edit?: string; mes?: string; semana?: string }>
}) {
  const { secao: secaoParam, edit, mes, semana } = await searchParams
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

  // ── Semana exibida na grade de check-in ──────────────────────────────
  const semanaSelecionada = semanaValida(semana)
  const diasSemanaArr = diasDaSemana(semanaSelecionada)
  const estaNaSemanaAtual = semanaSelecionada === domingoDaSemana(hojeISO())

  const { data: logsSemanaData } =
    habitIds.length > 0
      ? await supabase
          .from('habit_logs')
          .select('habit_id, data, status')
          .gte('data', diasSemanaArr[0])
          .lte('data', diasSemanaArr[6])
          .in('habit_id', habitIds)
      : { data: [] as { habit_id: string; data: string; status: boolean }[] }

  const logsSemanaPorHabito = new Map<string, Map<string, boolean>>()
  for (const log of logsSemanaData ?? []) {
    const m = logsSemanaPorHabito.get(log.habit_id) ?? new Map<string, boolean>()
    m.set(log.data, log.status)
    logsSemanaPorHabito.set(log.habit_id, m)
  }

  // ── Mês exibido no gráfico de conclusão ──────────────────────────────
  const mesSelecionado = mesValido(mes)
  const { inicio: inicioMes, fim: fimMes } = faixaDoMes(mesSelecionado)
  const estaNoMesAtual = mesSelecionado === mesAtualISO()
  const fimEfetivo = estaNoMesAtual ? [fimMes, hojeISO()].sort()[0] : fimMes

  const { data: logsMesData } =
    habitIds.length > 0
      ? await supabase
          .from('habit_logs')
          .select('habit_id, data, status')
          .gte('data', inicioMes)
          .lte('data', fimMes)
          .in('habit_id', habitIds)
      : { data: [] as { habit_id: string; data: string; status: boolean }[] }

  const logsMesPorHabito = new Map<string, Map<string, boolean>>()
  for (const log of logsMesData ?? []) {
    const m = logsMesPorHabito.get(log.habit_id) ?? new Map<string, boolean>()
    m.set(log.data, log.status)
    logsMesPorHabito.set(log.habit_id, m)
  }

  const conclusaoDoMes = calcularConclusaoDoMes(habits, logsMesPorHabito, inicioMes, fimEfetivo)

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
        <BackNav />
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

          <section className={`${styles.card} ${styles.checkInCard}`}>
            <div className={styles.mesNav}>
              <Link
                href={hrefHabitos({ mes: mesSelecionado, semana: deslocarDias(semanaSelecionada, -7) })}
                className={styles.mesNavArrow}
                aria-label="Semana anterior"
              >
                ←
              </Link>
              <h2 className={styles.cardTitle}>
                Check-in de {labelDiaCurto(diasSemanaArr[0])} a {labelDiaCurto(diasSemanaArr[6])}
              </h2>
              <Link
                href={hrefHabitos({ mes: mesSelecionado, semana: deslocarDias(semanaSelecionada, 7) })}
                className={styles.mesNavArrow}
                aria-label="Próxima semana"
              >
                →
              </Link>
            </div>

            {habits.length === 0 ? (
              <p className={styles.empty}>Nenhum hábito cadastrado ainda. Crie o primeiro acima.</p>
            ) : (
              <div className={styles.checkInScroll}>
                <table className={styles.checkInTable}>
                  <thead>
                    <tr>
                      <th className={styles.checkInHabitoCol}>Hábito</th>
                      {diasSemanaArr.map((dia) => (
                        <th key={dia} className={styles.checkInDiaCol}>
                          <div className={styles.checkInDiaData}>{labelDiaCurto(dia)}</div>
                          <div className={styles.checkInDiaSemana}>{abrevDiaSemana(dia)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map((habit) => {
                      const area = habit.area_id ? areaById.get(habit.area_id) : null
                      const logsHabito = logsSemanaPorHabito.get(habit.id) ?? new Map<string, boolean>()
                      const criadoEm = habit.created_at.slice(0, 10)
                      return (
                        <tr key={habit.id}>
                          <td className={styles.checkInHabitoCol}>
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
                            <div className={styles.itemActions}>
                              <Link href={hrefHabitos({ mes: mesSelecionado, semana: semanaSelecionada, edit: habit.id })} className={styles.editLink}>
                                Editar
                              </Link>
                              <DeleteHabitButton id={habit.id} nome={habit.nome} />
                            </div>
                          </td>
                          {diasSemanaArr.map((dia) => {
                            if (dia < criadoEm) {
                              return (
                                <td key={dia} className={styles.checkInDiaCol}>
                                  <span className={styles.checkInIndisponivel}>—</span>
                                </td>
                              )
                            }
                            return (
                              <td key={dia} className={styles.checkInDiaCol}>
                                <CheckInCell
                                  habitId={habit.id}
                                  date={dia}
                                  status={logsHabito.get(dia) ?? null}
                                  scheduled={habitoApareceEm(habit, dia)}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!estaNaSemanaAtual && (
              <Link href={hrefHabitos({ mes: mesSelecionado })} className={styles.voltarMesAtual}>
                ← Voltar pra semana atual
              </Link>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.mesNav}>
              <Link
                href={hrefHabitos({ mes: deslocarMes(mesSelecionado, -1), semana: semanaSelecionada })}
                className={styles.mesNavArrow}
                aria-label="Mês anterior"
              >
                ←
              </Link>
              <h2 className={styles.cardTitle}>Conclusão de {nomeMes(mesSelecionado)}</h2>
              <Link
                href={hrefHabitos({ mes: deslocarMes(mesSelecionado, 1), semana: semanaSelecionada })}
                className={styles.mesNavArrow}
                aria-label="Próximo mês"
              >
                →
              </Link>
            </div>
            <HabitosConclusaoChart dados={conclusaoDoMes} />
            {!estaNoMesAtual && (
              <Link href={hrefHabitos({ semana: semanaSelecionada })} className={styles.voltarMesAtual}>
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
