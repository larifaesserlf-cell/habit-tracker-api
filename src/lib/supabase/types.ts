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

export type ViagemStatus = 'quero_fazer' | 'planejando' | 'confirmada' | 'concluida'

export type Viagem = {
  id: string
  user_id: string
  nome: string
  status: ViagemStatus
  data_prevista_inicio: string | null
  data_prevista_fim: string | null
  orcamento_estimado: number | null
  orcamento_real: number | null
  notas: string | null
  created_at: string
}

export type Destino = {
  id: string
  viagem_id: string
  nome_cidade: string
  pais: string | null
  dias_estimados: number | null
  ordem: number
  notas: string | null
}

export type PontoInteressePrioridade = 'imperdivel' | 'se_der_tempo' | 'opcional'
export type PontoInteresseStatus = 'quero_ir' | 'visitado'

export type PontoInteresse = {
  id: string
  destino_id: string
  nome: string
  tipo: string | null
  prioridade: PontoInteressePrioridade
  status: PontoInteresseStatus
  data_visita: string | null
  nota: number | null
  custo_estimado: number | null
  duracao_estimada_horas: number | null
  link: string | null
  comentario: string | null
}

export type Hospedagem = {
  id: string
  destino_id: string
  nome: string | null
  tipo: string | null
  regiao_bairro: string | null
  faixa_preco: string | null
  link: string | null
  reservado: boolean
  notas: string | null
}

export type Transporte = {
  id: string
  viagem_id: string
  destino_origem_id: string | null
  destino_destino_id: string | null
  tipo: string | null
  custo_estimado: number | null
  duracao_estimada_horas: number | null
  notas: string | null
}

export type ContaTipo = 'corrente' | 'poupanca' | 'carteira' | 'corretora'

export type ContaFinanceira = {
  id: string
  user_id: string
  nome: string
  tipo: ContaTipo
  saldo_atual: number
  created_at: string
}

export type TransacaoTipo = 'receita' | 'despesa'

export type Transacao = {
  id: string
  user_id: string
  conta_id: string
  tipo: TransacaoTipo
  categoria: string
  subcategoria: string | null
  valor: number
  data: string
  descricao: string | null
  fixo: boolean
  created_at: string
}

export type TipoAtivo =
  | 'tesouro_ipca'
  | 'tesouro_selic'
  | 'etf'
  | 'acao'
  | 'renda_fixa_banco'
  | 'reserva_emergencia'
  | 'outro'

export type Investimento = {
  id: string
  user_id: string
  tipo_ativo: TipoAtivo
  nome_ativo: string
  valor_aportado: number
  data_aporte: string
  instituicao: string | null
  notas: string | null
  created_at: string
}

export type OrcamentoMensal = {
  id: string
  user_id: string
  categoria: string
  mes_referencia: string
  valor_limite: number
}
