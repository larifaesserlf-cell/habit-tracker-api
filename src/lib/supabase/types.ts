export type Frequencia = 'diario' | 'semanal'

export type Area = {
  id: string
  user_id: string
  nome: string
  cor: string
  icone: string
  ordem: number
  arquivada: boolean
}

export type Habit = {
  id: string
  user_id: string
  nome: string
  frequencia: Frequencia
  created_at: string
  area_id: string | null
}

export type HabitLog = {
  id: string
  habit_id: string
  data: string
  status: boolean
}
