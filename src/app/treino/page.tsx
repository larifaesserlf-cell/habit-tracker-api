import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BackNav } from '@/components/BackNav'
import { NovoTreinoForm } from './NovoTreinoForm'
import { TreinosList } from './TreinosList'
import type { ExercicioTreino, Treino } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Treino',
}

export default async function TreinoPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: treinosData } = await supabase
    .from('treinos')
    .select('*')
    .eq('user_id', user.id)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  const treinos = (treinosData ?? []) as Treino[]
  const treinoIds = treinos.map((t) => t.id)

  const { data: exerciciosData } =
    treinoIds.length > 0
      ? await supabase.from('exercicios_treino').select('*').in('treino_id', treinoIds).order('ordem', { ascending: true })
      : { data: [] as ExercicioTreino[] }

  const exerciciosPorTreino = new Map<string, ExercicioTreino[]>()
  for (const exercicio of (exerciciosData ?? []) as ExercicioTreino[]) {
    const lista = exerciciosPorTreino.get(exercicio.treino_id) ?? []
    lista.push(exercicio)
    exerciciosPorTreino.set(exercicio.treino_id, lista)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <BackNav />
        <h1 className={styles.title}>Treino</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Registrar treino</h2>
        <NovoTreinoForm />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Histórico de treinos</h2>
        <TreinosList treinos={treinos} exerciciosPorTreino={exerciciosPorTreino} />
      </section>
    </div>
  )
}
