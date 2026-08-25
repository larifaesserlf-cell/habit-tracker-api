import type { ContaFinanceira, ContaTipo, StatusPagamento, Transacao, TransacaoTipo, TipoAtivo } from '@/lib/supabase/types'

export const CONTA_TIPOS: ContaTipo[] = ['corrente', 'poupanca', 'carteira', 'corretora', 'cartao_credito']

export const CONTA_TIPO_LABEL: Record<ContaTipo, string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  carteira: 'Carteira',
  corretora: 'Corretora',
  cartao_credito: 'Cartão de crédito',
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

// ── Categorias sugeridas (autocomplete livre — a pessoa pode digitar
// qualquer outra coisa) e um ícone simples por categoria, no estilo Nubank. ──

export const CATEGORIAS_SUGERIDAS = [
  'Alimentação',
  'Mercado',
  'Transporte',
  'Moradia',
  'Contas Fixas',
  'Saúde',
  'Lazer',
  'Educação',
  'Compras',
  'Assinaturas',
  'Serviços',
  'Salário',
  'Investimentos',
  'Outros',
]

const CATEGORIA_ICONE: Record<string, string> = {
  'alimentação': '🍔',
  'mercado': '🛒',
  'transporte': '🚗',
  'moradia': '🏠',
  'contas fixas': '🧾',
  'saúde': '🩺',
  'lazer': '🎉',
  'educação': '📚',
  'compras': '🛍️',
  'assinaturas': '📱',
  'serviços': '🛠️',
  'salário': '💼',
  'investimentos': '📈',
  'ajuste de saldo': '⚖️',
  'outros': '🏷️',
}

const ICONE_PADRAO = '💳'

/** Ícone por categoria — combina com qualquer capitalização; categorias
 *  fora da lista sugerida (texto livre) caem no ícone padrão. */
export function iconeCategoria(categoria: string): string {
  return CATEGORIA_ICONE[categoria.trim().toLowerCase()] ?? ICONE_PADRAO
}

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
}

/**
 * Saldo de uma conta = saldo inicial (campo `saldo_atual`, só preenchido na
 * criação) + receitas já pagas - despesas já pagas daquela conta.
 * Transações pendentes não entram até o status virar "pago".
 */
export function calcularSaldoConta(conta: ContaFinanceira, transacoesDaConta: Transacao[]): number {
  return transacoesDaConta.reduce((saldo, t) => {
    if (t.status_pagamento !== 'pago') return saldo
    return t.tipo === 'receita' ? saldo + t.valor : saldo - t.valor
  }, conta.saldo_atual)
}

/**
 * Data de vencimento da fatura de cartão de crédito a que uma compra
 * pertence: sempre no mês seguinte ao da compra, no `diaVencimento`
 * configurado na conta — clampado pro último dia do mês seguinte quando
 * esse dia não existir nele (ex: dia 31 numa fatura que vence em fevereiro).
 */
export function calcularDataFatura(dataCompra: string, diaVencimento: number): string {
  const [ano, mes] = dataCompra.split('-').map(Number)
  const totalMeses = mes // mes (1-indexado) já aponta pro mês seguinte em base 0
  const novoAno = ano + Math.floor(totalMeses / 12)
  const novoMes = (totalMeses % 12) + 1
  const ultimoDiaDoMesSeguinte = new Date(Date.UTC(novoAno, novoMes, 0)).getUTCDate()
  const dia = Math.min(diaVencimento, ultimoDiaDoMesSeguinte)
  return `${novoAno}-${String(novoMes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}
