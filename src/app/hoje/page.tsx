import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'
import { setMetaStatus } from '@/actions/metas'
import { RotinaHojeCard } from './RotinaHojeCard'
import { ReflexaoHojeCard } from './ReflexaoHojeCard'
import { HabitCheckInButton } from '@/components/HabitCheckInButton'
import type { Area, Habit, Meta, Reflexao, RotinaBloco } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Hoje',
}

/**
 * Janela de 3 dias (pelo relógio do servidor) só pra garantir que o dia
 * "de hoje" do navegador do usuário — calculado no HabitCheckInButton,
 * client-side, igual à rotina e à reflexão desta página — esteja incluído
 * mesmo perto da virada da meia-noite.
 */
function janelaRecente() {
  return new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
}

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
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
    { data: reflexoesData },
  ] = await Promise.all([
    supabase.from('areas').select('*').eq('user_id', user.id).eq('arquivada', false),
    supabase.from('rotina_diaria').select('*').eq('user_id', user.id),
    supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('metas').select('*').eq('status', 'ativa'),
    supabase
      .from('reflexoes')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const areas = (areasData ?? []) as Area[]
  const areaPorId = new Map(areas.map((a) => [a.id, a]))
  const rotina = (rotinaData ?? []) as RotinaBloco[]
  const habits = (habitsData ?? []) as Habit[]
  const metas = (metasData ?? []) as Meta[]
  const reflexoesRecentes = (reflexoesData ?? []) as Reflexao[]

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

  const metasFoco = ordenarMetasFoco(metas)

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>🔥 Hoje</h1>
          <p className={styles.subtitle}>Logado como {user.email}</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/areas" className={styles.navLink}>
            Áreas
          </Link>
          <Link href="/habitos" className={styles.navLink}>
            Hábitos
          </Link>
          <Link href="/metas" className={styles.navLink}>
            Metas
          </Link>
          <Link href="/rotina" className={styles.navLink}>
            Rotina
          </Link>
          <Link href="/reflexoes" className={styles.navLink}>
            Reflexões
          </Link>
          <Link href="/midias" className={styles.navLink}>
            Mídias
          </Link>
          <Link href="/viagens" className={styles.navLink}>
            Viagens
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
        ) : (
          <ul className={styles.list}>
            {habits.map((h) => {
              const area = h.area_id ? areaPorId.get(h.area_id) : null
              return (
                <li key={h.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <div>
                      <div className={styles.itemNome}>{h.nome}</div>
                      <div className={styles.itemMeta}>
                        {h.frequencia === 'diario' ? 'Diário' : 'Semanal'}
                        {area ? ` · ${area.icone} ${area.nome}` : ''}
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
              return (
                <li key={m.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <div>
                      <div className={styles.itemNome}>{m.titulo}</div>
                      <div className={styles.itemMeta}>
                        {area ? `${area.icone} ${area.nome}` : ''}
                        {m.data_alvo ? ` · até ${formatDataBR(m.data_alvo)}` : ''}
                      </div>
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

      <ReflexaoHojeCard recentes={reflexoesRecentes} />
    </div>
  )
}
