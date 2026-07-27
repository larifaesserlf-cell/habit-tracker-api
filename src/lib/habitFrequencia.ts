import type { Habit } from '@/lib/supabase/types'

/** Rótulos e valores dos dias da semana. 0 = domingo, ..., 6 = sábado
 *  (convenção de Date.getUTCDay()), exibidos em ordem começando na segunda. */
export const DIAS_SEMANA: { valor: number; label: string; abrev: string }[] = [
  { valor: 1, label: 'Segunda', abrev: 'Seg' },
  { valor: 2, label: 'Terça', abrev: 'Ter' },
  { valor: 3, label: 'Quarta', abrev: 'Qua' },
  { valor: 4, label: 'Quinta', abrev: 'Qui' },
  { valor: 5, label: 'Sexta', abrev: 'Sex' },
  { valor: 6, label: 'Sábado', abrev: 'Sáb' },
  { valor: 0, label: 'Domingo', abrev: 'Dom' },
]

const LABEL_POR_DIA = new Map(DIAS_SEMANA.map((d) => [d.valor, d.abrev]))

export function labelFrequencia(habit: Pick<Habit, 'frequencia' | 'dias_semana' | 'dia_mes'>): string {
  if (habit.frequencia === 'diario') return 'Diário'
  if (habit.frequencia === 'dias_especificos') {
    const dias = [...(habit.dias_semana ?? [])].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    if (dias.length === 0) return 'Dias específicos'
    return dias.map((d) => LABEL_POR_DIA.get(d) ?? '?').join(', ')
  }
  return `Dia ${habit.dia_mes ?? '?'} do mês`
}

/** Último dia válido do mês (1-indexado, ano/mês em UTC). */
function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/** Dia da semana (0 = domingo) de uma data ISO (YYYY-MM-DD), calculado em UTC
 *  pra não depender do fuso de onde o código roda. */
function diaDaSemanaISO(dataISO: string): number {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
}

/** Decide se um hábito deve aparecer no check-in de hoje, dado o dia
 *  (formato YYYY-MM-DD). Hábitos mensais com dia_mes maior que o último dia
 *  do mês (ex: 31 em fevereiro) caem no último dia disponível daquele mês. */
export function habitoApareceEm(
  habit: Pick<Habit, 'frequencia' | 'dias_semana' | 'dia_mes'>,
  dataISO: string
): boolean {
  if (habit.frequencia === 'diario') return true

  if (habit.frequencia === 'dias_especificos') {
    return (habit.dias_semana ?? []).includes(diaDaSemanaISO(dataISO))
  }

  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const diaAlvo = Math.min(habit.dia_mes ?? 1, ultimoDiaDoMes(ano, mes))
  return dia === diaAlvo
}
