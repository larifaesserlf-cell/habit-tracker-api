import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { HabitForm } from './HabitForm'
import { HabitCheckInButton } from '@/components/HabitCheckInButton'
import type { Area, Habit } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Hábitos',
}

/**
 * Janela de 3 dias (pelo relógio do servidor) só pra garantir que o dia
 * "de hoje" do navegador do usuário — calculado no HabitCheckInButton,
 * client-side — esteja incluído mesmo perto da virada da meia-noite.
 */
function janelaRecente() {
  return new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
}

export default async function HabitosPage({
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

  const [{ data: habitsData }, { data: areasData }] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('areas')
      .select('*')
      .eq('user_id', user.id)
      .eq('arquivada', false)
      .order('ordem', { ascending: true }),
  ])

  const habits = (habitsData ?? []) as Habit[]
  const areas = (areasData ?? []) as Area[]

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
  const areaById = new Map(areas.map((a) => [a.id, a]))

  const editingHabit = edit ? habits.find((h) => h.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/hoje" className={styles.backLink}>
          ← Painel
        </Link>
        <h1 className={styles.title}>Hábitos</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingHabit ? 'Editar hábito' : 'Novo hábito'}</h2>
        <HabitForm key={editingHabit?.id ?? 'new'} habit={editingHabit} areas={areas} />
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
                      {habit.frequencia === 'diario' ? 'Diário' : 'Semanal'}
                      {area ? ` · ${area.icone} ${area.nome}` : ''}
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
    </div>
  )
}
