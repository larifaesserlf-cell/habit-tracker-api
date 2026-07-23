import type { ContaTipo, TransacaoTipo, TipoAtivo } from '@/lib/supabase/types'

export const CONTA_TIPOS: ContaTipo[] = ['corrente', 'poupanca', 'carteira', 'corretora']

export const CONTA_TIPO_LABEL: Record<ContaTipo, string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  carteira: 'Carteira',
  corretora: 'Corretora',
}

export const TRANSACAO_TIPOS: TransacaoTipo[] = ['receita', 'despesa']

export const TRANSACAO_TIPO_LABEL: Record<TransacaoTipo, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
}

export const TIPOS_ATIVO: TipoAtivo[] = [
  'tesouro_ipca',
  'tesouro_selic',
  'etf',
  'acao',
  'renda_fixa_banco',
  'reserva_emergencia',
  'outro',
]

export const TIPO_ATIVO_LABEL: Record<TipoAtivo, string> = {
  tesouro_ipca: 'Tesouro IPCA+',
  tesouro_selic: 'Tesouro Selic',
  etf: 'ETF',
  acao: 'Ação',
  renda_fixa_banco: 'Renda fixa (banco)',
  reserva_emergencia: 'Reserva de emergência',
  outro: 'Outro',
}

export function formatMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDataBR(data: string): string {
  return data.split('-').reverse().join('/')
}
