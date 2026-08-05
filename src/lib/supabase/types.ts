export type Frequencia = 'diario' | 'dias_especificos' | 'mensal'

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
  dias_semana: number[] | null
  dia_mes: number | null
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
  habito_id: string | null
  created_at: string
}

export type Compromisso = {
  id: string
  user_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  atividade: string
  area_id: string | null
  feito: boolean
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
  capa_url: string | null
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

export type ContaTipo = 'corrente' | 'poupanca' | 'carteira' | 'corretora' | 'cartao_credito'
export type OrigemFinanceira = 'manual' | 'pluggy'

export type ContaFinanceira = {
  id: string
  user_id: string
  nome: string
  tipo: ContaTipo
  saldo_atual: number
  dia_vencimento_fatura: number | null
  connection_id: string | null
  pluggy_account_id: string | null
  origem: OrigemFinanceira
  subtype_pluggy: string | null
  created_at: string
}

export type TransacaoTipo = 'receita' | 'despesa'
export type StatusPagamento = 'pago' | 'pendente'

export type Transacao = {
  id: string
  user_id: string
  conta_id: string
  tipo: TransacaoTipo
  categoria: string
  subcategoria: string | null
  valor: number
  data: string
  data_fatura: string | null
  descricao: string | null
  fixo: boolean
  total_parcelas: number
  parcela_atual: number
  compra_id: string
  status_pagamento: StatusPagamento | null
  connection_id: string | null
  pluggy_transaction_id: string | null
  origem: OrigemFinanceira
  categoria_pluggy: string | null
  created_at: string
}

export type BankConnection = {
  id: string
  user_id: string
  pluggy_item_id: string
  institution_name: string
  connector_id: number | null
  status: string
  consent_expires_at: string | null
  last_sync: string | null
  created_at: string
  updated_at: string
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

// ── Ciclo menstrual (área Saúde) ───────────────────────────────────────────

export type CicloMenstrual = {
  id: string
  user_id: string
  data_inicio: string
  data_fim: string | null
  created_at: string
}

export type ObservacaoCiclo = {
  id: string
  user_id: string
  humor: string | null
  sintomas: string[] | null
  notas: string | null
  created_at: string
}

// ── Lista compartilhada de filmes/séries (múltiplos membros) ──────────────

export type ListaWatch = {
  id: string
  nome: string
  criado_por: string
  created_at: string
}

export type ItemWatchTipo = 'filme' | 'serie'
export type ItemWatchStatus = 'quero_assistir' | 'em_andamento' | 'concluido'

export type ItemWatch = {
  id: string
  lista_id: string
  tipo: ItemWatchTipo
  titulo: string
  ano_lancamento: number | null
  capa_url: string | null
  status: ItemWatchStatus
  adicionado_por: string
  nota: number | null
  comentario: string | null
  created_at: string
}

export type ConviteLista = {
  id: string
  lista_id: string
  token: string
  criado_por: string
  usado: boolean
  created_at: string
}

export type MembroLista = {
  user_id: string
  email: string | null
  nome: string | null
}
