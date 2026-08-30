import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BackNav } from '@/components/BackNav'
import { NovoTreinoForm, type ModeloParaCopia, type TreinoParaCopia } from './NovoTreinoForm'
import { TreinosList } from './TreinosList'
import { PlanoTreino } from './PlanoTreino'
import { ObservacoesTreino } from './ObservacoesTreino'
import type { ExercicioTreino, ModeloTreino, ModeloTreinoExercicio, Treino, TreinoNotas } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Treino',
}

const NOME_DIA: Record<string, string> = {
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sábado',
  domingo: 'Domingo',
}

export default async function TreinoPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: treinosData }, { data: modelosData }, { data: notasData }] = await Promise.all([
    supabase.from('treinos').select('*').eq('user_id', user.id).order('data', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('modelos_treino').select('*').eq('user_id', user.id).order('ordem', { ascending: true }),
    supabase.from('treino_notas').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const treinos = (treinosData ?? []) as Treino[]
  const treinoIds = treinos.map((t) => t.id)

  const modelos = (modelosData ?? []) as ModeloTreino[]
  const modeloIds = modelos.map((m) => m.id)

  const [{ data: exerciciosData }, { data: modelosExerciciosData }] = await Promise.all([
    treinoIds.length > 0
      ? supabase.from('exercicios_treino').select('*').in('treino_id', treinoIds).order('ordem', { ascending: true })
      : Promise.resolve({ data: [] as ExercicioTreino[] }),
    modeloIds.length > 0
      ? supabase.from('modelos_treino_exercicios').select('*').in('modelo_id', modeloIds).order('ordem', { ascending: true })
      : Promise.resolve({ data: [] as ModeloTreinoExercicio[] }),
  ])

  const exerciciosPorTreino = new Map<string, ExercicioTreino[]>()
  for (const exercicio of (exerciciosData ?? []) as ExercicioTreino[]) {
    const lista = exerciciosPorTreino.get(exercicio.treino_id) ?? []
    lista.push(exercicio)
    exerciciosPorTreino.set(exercicio.treino_id, lista)
  }

  const exerciciosPorModelo = new Map<string, ModeloTreinoExercicio[]>()
  for (const exercicio of (modelosExerciciosData ?? []) as ModeloTreinoExercicio[]) {
    const lista = exerciciosPorModelo.get(exercicio.modelo_id) ?? []
    lista.push(exercicio)
    exerciciosPorModelo.set(exercicio.modelo_id, lista)
  }

  const notas = notasData as TreinoNotas | null

  // `treinos` já vem ordenado do mais recente pro mais antigo — mantém essa
  // ordem no seletor de cópia, já que é o treino mais recente (mesmo nome
  // ou não) que ela normalmente quer repetir.
  const treinosParaCopia: TreinoParaCopia[] = treinos.map((t) => ({
    id: t.id,
    nome: t.nome,
    data: t.data,
    exercicios: (exerciciosPorTreino.get(t.id) ?? []).map((e) => ({
      nome: e.nome,
      seriesReps: e.series_reps ?? '',
      carga: e.carga ?? '',
    })),
  }))

  const modelosParaCopia: ModeloParaCopia[] = modelos.map((m) => ({
    id: m.id,
    nome: m.nome,
    diaLabel: NOME_DIA[m.dia_semana] ?? m.dia_semana,
    exercicios: (exerciciosPorModelo.get(m.id) ?? []).map((e) => ({
      nome: e.nome,
      seriesReps: e.faixa_reps ?? '',
    })),
  }))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <BackNav />
        <h1 className={styles.title}>Treino</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Registrar treino</h2>
        <NovoTreinoForm treinosParaCopia={treinosParaCopia} modelosParaCopia={modelosParaCopia} />
      </section>

      {modelos.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Plano fixo</h2>
          <PlanoTreino modelos={modelos} exerciciosPorModelo={exerciciosPorModelo} />
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Histórico de treinos</h2>
        <TreinosList treinos={treinos} exerciciosPorTreino={exerciciosPorTreino} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Observações</h2>
        <ObservacoesTreino conteudoInicial={notas?.conteudo ?? ''} />
      </section>
    </div>
  )
}
