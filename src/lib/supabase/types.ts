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

export type Reflexao = {
  id: string
  user_id: string
  data: string
  texto: string
  humor_opcional: number | null
  created_at: string
}

export type MidiaTipo = 'livro' | 'filme' | 'serie' | 'documentario'
export type MidiaStatus = 'quero_ver_ler' | 'em_andamento' | 'concluido' | 'abandonado'

export type Midia = {
  id: string
  user_id: string
  tipo: MidiaTipo
  titulo: string
  autor_diretor: string | null
  genero: string | null
  ano_lancamento: number | null
  status: MidiaStatus
  data_inicio: string | null
  data_conclusao: string | null
  nota: number | null
  temporada_atual: number | null
  progresso: string | null
  plataforma: string | null
  recomendaria: boolean | null
  releitura_rewatch: boolean
  comentario: string | null
  tags: string[] | null
  created_at: string
}
