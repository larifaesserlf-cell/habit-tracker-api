import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BackNav } from '@/components/BackNav'
import { CicloEmAndamentoCard } from './CicloEmAndamentoCard'
import { CicloForm } from './CicloForm'
import { HistoricoCiclos } from './HistoricoCiclos'
import { CalendarioMensal } from './CalendarioMensal'
import { RelatorioPdfButton } from './RelatorioPdfButton'
import { ObservacaoModalButton } from './ObservacaoModalButton'
import { DeleteObservacaoButton } from './DeleteObservacaoButton'
import type { CicloMenstrual, ObservacaoCiclo } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Ciclo Menstrual',
}

/**
 * Previsão simples do próximo ciclo: média histórica dos intervalos entre
 * início de um ciclo e início do seguinte, aplicada sobre o início do
 * ciclo mais recente. Exige pelo menos 3 ciclos (2 intervalos) pra não
 * projetar em cima de uma amostra única — com menos que isso, retorna null
 * e a tela simplesmente não mostra previsão nenhuma.
 */
function calcularPrevisaoProximoCiclo(ciclos: CicloMenstrual[]): string | null {
  if (ciclos.length < 3) return null

  const iniciosAsc = [...ciclos].map((c) => c.data_inicio).sort()
  const msPorDia = 24 * 60 * 60 * 1000
  const intervalos: number[] = []
  for (let i = 1; i < iniciosAsc.length; i++) {
    intervalos.push(Math.round((Date.parse(iniciosAsc[i]) - Date.parse(iniciosAsc[i - 1])) / msPorDia))
  }

  const mediaDias = Math.round(intervalos.reduce((soma, v) => soma + v, 0) / intervalos.length)
  const ultimoInicio = iniciosAsc[iniciosAsc.length - 1]
  const previsao = new Date(Date.parse(ultimoInicio) + mediaDias * msPorDia)
  return previsao.toISOString().slice(0, 10)
}

function mesAtualISO(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

function mesValido(mes: string | undefined): string {
  return mes && /^\d{4}-\d{2}$/.test(mes) ? mes : mesAtualISO()
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

/** Início do mês e do mês seguinte como timestamps, pra filtrar
 *  `created_at` (timestamptz) por um intervalo [início, fim). */
function faixaMesTimestamp(mesISO: string) {
  const [ano, mes] = mesISO.split('-').map(Number)
  const inicio = new Date(Date.UTC(ano, mes - 1, 1)).toISOString()
  const fimExclusivo = new Date(Date.UTC(ano, mes, 1)).toISOString()
  return { inicio, fimExclusivo }
}

function formatDataHoraBR(iso: string): string {
  const data = iso.slice(0, 10).split('-').reverse().join('/')
  const hora = iso.slice(11, 16)
  return `${data} ${hora}`
}

export default async function CicloPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; editCiclo?: string }>
}) {
  const { mes: mesParam, editCiclo } = await searchParams
  const mesISO = mesValido(mesParam)
  const { inicio: inicioMesTs, fimExclusivo: fimMesTs } = faixaMesTimestamp(mesISO)
  const estaNoMesAtual = mesISO === mesAtualISO()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: ciclosData }, { data: observacoesData }] = await Promise.all([
    supabase
      .from('ciclos_menstruais')
      .select('*')
      .eq('user_id', user.id)
      .order('data_inicio', { ascending: false }),
    supabase
      .from('observacoes_ciclo')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', inicioMesTs)
      .lt('created_at', fimMesTs)
      .order('created_at', { ascending: false }),
  ])

  const ciclos = (ciclosData ?? []) as CicloMenstrual[]
  const observacoes = (observacoesData ?? []) as ObservacaoCiclo[]

  const cicloAberto = ciclos.find((c) => !c.data_fim) ?? null
  const editingCiclo = editCiclo ? ciclos.find((c) => c.id === editCiclo) ?? null : null
  // Não faz sentido prever o próximo ciclo enquanto um já está em
  // andamento — a informação relevante nesse caso já é outra (há quanto
  // tempo começou), mostrada pelo próprio card.
  const previsaoProximoCiclo = cicloAberto ? null : calcularPrevisaoProximoCiclo(ciclos)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <BackNav />
        <h1 className={styles.title}>Ciclo Menstrual</h1>
      </div>

      <CicloEmAndamentoCard cicloAberto={cicloAberto} previsaoProximoCiclo={previsaoProximoCiclo} />

      <section className={styles.card}>
        <div className={styles.mesNav}>
          <Link href={`/saude/ciclo?mes=${deslocarMes(mesISO, -1)}`} className={styles.mesNavArrow} aria-label="Mês anterior">
            ←
          </Link>
          <h2 className={styles.cardTitle}>Observações de {nomeMes(mesISO)}</h2>
          <Link href={`/saude/ciclo?mes=${deslocarMes(mesISO, 1)}`} className={styles.mesNavArrow} aria-label="Próximo mês">
            →
          </Link>
        </div>

        <ObservacaoModalButton />

        {observacoes.length === 0 ? (
          <p className={styles.empty} style={{ marginTop: '1rem' }}>
            Nenhuma observação registrada neste mês.
          </p>
        ) : (
          <ul className={styles.list} style={{ marginTop: '1rem' }}>
            {observacoes.map((o) => (
              <li key={o.id} className={styles.item}>
                <div className={styles.obsDataHora}>{formatDataHoraBR(o.created_at)}</div>
                {o.humor && <div className={styles.itemNome}>Humor: {o.humor}</div>}
                {o.sintomas && o.sintomas.length > 0 && (
                  <div className={styles.tags}>
                    {o.sintomas.map((s) => (
                      <span key={s} className={styles.tag}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {o.notas && <p className={styles.obsNotas}>{o.notas}</p>}
                <div className={styles.itemActions}>
                  <ObservacaoModalButton observacao={o} />
                  <DeleteObservacaoButton id={o.id} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!estaNoMesAtual && (
          <Link href="/saude/ciclo" className={styles.voltarMesAtual}>
            ← Voltar pro mês atual
          </Link>
        )}
      </section>

      <CalendarioMensal mesISO={mesISO} ciclos={ciclos} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Histórico de ciclos</h2>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{editingCiclo ? 'Editar ciclo' : 'Adicionar ciclo retroativo'}</h2>
          <CicloForm key={editingCiclo?.id ?? 'new'} ciclo={editingCiclo} />
        </section>
        <HistoricoCiclos ciclos={ciclos} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Relatório</h2>
        <RelatorioPdfButton />
      </section>
    </div>
  )
}
