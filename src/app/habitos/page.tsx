import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toggleCheckIn } from '@/actions/habits'
import { HabitForm } from './HabitForm'
import type { Area, Habit } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Hábitos',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
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

  const today = todayISO()
  const habitIds = habits.map((h) => h.id)
  const { data: logsData } =
    habitIds.length > 0
      ? await supabase
          .from('habit_logs')
          .select('habit_id, status')
          .eq('data', today)
          .in('habit_id', habitIds)
      : { data: [] as { habit_id: string; status: boolean }[] }

  const statusByHabit = new Map((logsData ?? []).map((l) => [l.habit_id, l.status]))
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
            const done = statusByHabit.get(habit.id) ?? false
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
                  <form action={toggleCheckIn.bind(null, habit.id, today, !done)}>
                    <button
                      type="submit"
                      className={done ? styles.checkDone : styles.checkPending}
                    >
                      {done ? '✓ Feito hoje' : 'Marcar feito'}
                    </button>
                  </form>
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
