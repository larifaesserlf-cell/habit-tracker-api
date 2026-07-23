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

export type MetaTipo = 'curto' | 'medio' | 'longo'
export type MetaStatus = 'ativa' | 'concluida' | 'abandonada'

export type Meta = {
  id: string
  area_id: string
  titulo: string
  tipo: MetaTipo
  status: MetaStatus
  data_alvo: string | null
  created_at: string
}

/** 0 = domingo, 6 = sábado (segue o padrão do JS Date#getDay()). */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type RotinaBloco = {
  id: string
  user_id: string
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fim: string
  atividade: string
  area_id: string | null
}
