import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { RegistroDiarioForm } from './RegistroDiarioForm'
import { CicloEmAndamentoCard } from './CicloEmAndamentoCard'
import { CicloForm } from './CicloForm'
import { HistoricoCiclos } from './HistoricoCiclos'
import { CalendarioMensal } from './CalendarioMensal'
import { RelatorioPdfButton } from './RelatorioPdfButton'
import type { CicloMenstrual, RegistroCiclo } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Ciclo Menstrual',
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function mesAtualISO(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

function dataValida(data: string | undefined): string {
  return data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : hojeISO()
}

function mesValido(mes: string | undefined): string {
  return mes && /^\d{4}-\d{2}$/.test(mes) ? mes : mesAtualISO()
}

/** Primeiro e último dia do mês ("YYYY-MM"), em ISO — cálculo em UTC. */
function faixaDoMes(mesISO: string) {
  const [ano, mes] = mesISO.split('-').map(Number)
  const inicio = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 0))
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) }
}

export default async function CicloPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; mes?: string; editCiclo?: string }>
}) {
  const { data: dataParam, mes: mesParam, editCiclo } = await searchParams
  const dataSelecionada = dataValida(dataParam)
  const mesISO = mesValido(mesParam)
  const { inicio: inicioMes, fim: fimMes } = faixaDoMes(mesISO)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: ciclosData }, { data: registroDiaData }, { data: registrosMesData }] = await Promise.all([
    supabase
      .from('ciclos_menstruais')
      .select('*')
      .eq('user_id', user.id)
      .order('data_inicio', { ascending: false }),
    supabase.from('registros_ciclo').select('*').eq('user_id', user.id).eq('data', dataSelecionada).maybeSingle(),
    supabase
      .from('registros_ciclo')
      .select('data, tpm')
      .eq('user_id', user.id)
      .eq('tpm', true)
      .gte('data', inicioMes)
      .lte('data', fimMes),
  ])

  const ciclos = (ciclosData ?? []) as CicloMenstrual[]
  const registroDoDia = (registroDiaData ?? null) as RegistroCiclo | null
  const diasComTpm = new Set((registrosMesData ?? []).map((r) => r.data as string))

  const cicloAberto = ciclos.find((c) => !c.data_fim) ?? null
  const editingCiclo = editCiclo ? ciclos.find((c) => c.id === editCiclo) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/hoje" className={styles.backLink}>
          ← Painel
        </Link>
        <h1 className={styles.title}>Ciclo Menstrual</h1>
      </div>

      <CicloEmAndamentoCard cicloAberto={cicloAberto} />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Registro diário</h2>
        <RegistroDiarioForm key={dataSelecionada} dataSelecionada={dataSelecionada} registro={registroDoDia} />
      </section>

      <CalendarioMensal mesISO={mesISO} ciclos={ciclos} diasComTpm={diasComTpm} />

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
