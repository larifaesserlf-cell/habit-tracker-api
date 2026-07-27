import { habitoApareceEm } from '@/lib/habitFrequencia'
import type { Habit, Meta } from '@/lib/supabase/types'

/** Dia seguinte (formato YYYY-MM-DD), calculado em UTC — mesma convenção de habitFrequencia. */
function diaSeguinte(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia + 1))
  return data.toISOString().slice(0, 10)
}

/**
 * Progresso (0-100) de uma meta vinculada a um hábito: conta quantas
 * ocorrências esperadas do hábito (de acordo com a frequência dele) caem
 * entre a criação da meta e a data-alvo, e quantas dessas datas já foram
 * concluídas em habit_logs. Sem data_alvo não há como definir o período
 * esperado, então retorna null (a meta some a mostrar barra, só status).
 */
export function calcularProgressoMeta(
  meta: Pick<Meta, 'created_at' | 'data_alvo'>,
  habit: Pick<Habit, 'frequencia' | 'dias_semana' | 'dia_mes'>,
  datasConcluidas: Set<string>
): number | null {
  if (!meta.data_alvo) return null

  const inicio = meta.created_at.slice(0, 10)
  const hoje = new Date().toISOString().slice(0, 10)
  const fim = meta.data_alvo < hoje ? meta.data_alvo : hoje
  if (fim < inicio) return 0

  let esperadas = 0
  let concluidas = 0
  for (let cursor = inicio; cursor <= fim; cursor = diaSeguinte(cursor)) {
    if (habitoApareceEm(habit, cursor)) {
      esperadas++
      if (datasConcluidas.has(cursor)) concluidas++
    }
  }

  if (esperadas === 0) return 0
  return Math.round((concluidas / esperadas) * 100)
}
