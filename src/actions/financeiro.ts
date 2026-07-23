'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { textoOuNull, numeroOuNull } from '@/lib/formHelpers'
import type { ContaTipo, TransacaoTipo, TipoAtivo } from '@/lib/supabase/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type ContaFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

export type TransacaoFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

export type InvestimentoFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

const CONTA_TIPOS: ContaTipo[] = ['corrente', 'poupanca', 'carteira', 'corretora']
const TRANSACAO_TIPOS: TransacaoTipo[] = ['receita', 'despesa']
const TIPOS_ATIVO: TipoAtivo[] = [
  'tesouro_ipca',
  'tesouro_selic',
  'etf',
  'acao',
  'renda_fixa_banco',
  'reserva_emergencia',
  'outro',
]

async function contaPertenceAoUsuario(supabase: SupabaseServerClient, contaId: string, userId: string) {
  const { data } = await supabase
    .from('contas_financeiras')
    .select('id')
    .eq('id', contaId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

// ── Contas ──────────────────────────────────────────────────────────────

/**
 * Server Action de criação/edição de conta financeira.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 */
export async function saveConta(
  _prevState: ContaFormState,
  formData: FormData
): Promise<ContaFormState> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim() ?? ''
  const tipo = formData.get('tipo') as string | null
  const saldoAtual = numeroOuNull(formData, 'saldo_atual') ?? 0

  if (nome.length === 0) {
    return { status: 'error', message: 'Informe o nome da conta.' }
  }
  if (!tipo || !CONTA_TIPOS.includes(tipo as ContaTipo)) {
    return { status: 'error', message: 'Selecione um tipo de conta válido.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const payload = { nome, tipo, saldo_atual: saldoAtual }

  const { error } = id
    ? await supabase.from('contas_financeiras').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('contas_financeiras').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar conta: ${error.message}` }
  }

  revalidatePath('/financeiro')
  return { status: 'success' }
}

/**
 * Exclui a conta definitivamente (cascade apaga as transações vinculadas).
 */
export async function deleteConta(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('contas_financeiras').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/financeiro')
}

// ── Transações ──────────────────────────────────────────────────────────

/**
 * Server Action de criação/edição de transação.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 */
export async function saveTransacao(
  _prevState: TransacaoFormState,
  formData: FormData
): Promise<TransacaoFormState> {
  const id = (formData.get('id') as string | null) || null
  const contaId = (formData.get('conta_id') as string | null) || ''
  const tipo = formData.get('tipo') as string | null
  const categoria = (formData.get('categoria') as string | null)?.trim() ?? ''
  const valor = numeroOuNull(formData, 'valor')
  const data = (formData.get('data') as string | null) || ''

  if (!contaId) {
    return { status: 'error', message: 'Selecione uma conta.' }
  }
  if (!tipo || !TRANSACAO_TIPOS.includes(tipo as TransacaoTipo)) {
    return { status: 'error', message: 'Selecione um tipo válido (receita ou despesa).' }
  }
  if (categoria.length === 0) {
    return { status: 'error', message: 'Informe a categoria.' }
  }
  if (valor === null || valor <= 0) {
    return { status: 'error', message: 'Informe um valor maior que zero.' }
  }
  if (!data) {
    return { status: 'error', message: 'Informe a data.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }
  if (!(await contaPertenceAoUsuario(supabase, contaId, user.id))) {
    return { status: 'error', message: 'Conta inválida.' }
  }

  const payload = {
    conta_id: contaId,
    tipo,
    categoria,
    subcategoria: textoOuNull(formData, 'subcategoria'),
    valor,
    data,
    descricao: textoOuNull(formData, 'descricao'),
    fixo: formData.get('fixo') === 'on',
  }

  const { error } = id
    ? await supabase.from('transacoes').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('transacoes').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar transação: ${error.message}` }
  }

  revalidatePath('/financeiro')
  return { status: 'success' }
}

/**
 * Exclui a transação definitivamente.
 */
export async function deleteTransacao(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('transacoes').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/financeiro')
}

// ── Investimentos ───────────────────────────────────────────────────────

/**
 * Server Action de criação/edição de aporte.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 */
export async function saveInvestimento(
  _prevState: InvestimentoFormState,
  formData: FormData
): Promise<InvestimentoFormState> {
  const id = (formData.get('id') as string | null) || null
  const tipoAtivo = formData.get('tipo_ativo') as string | null
  const nomeAtivo = (formData.get('nome_ativo') as string | null)?.trim() ?? ''
  const valorAportado = numeroOuNull(formData, 'valor_aportado')
  const dataAporte = (formData.get('data_aporte') as string | null) || ''

  if (!tipoAtivo || !TIPOS_ATIVO.includes(tipoAtivo as TipoAtivo)) {
    return { status: 'error', message: 'Selecione um tipo de ativo válido.' }
  }
  if (nomeAtivo.length === 0) {
    return { status: 'error', message: 'Informe o nome do ativo.' }
  }
  if (valorAportado === null || valorAportado <= 0) {
    return { status: 'error', message: 'Informe um valor aportado maior que zero.' }
  }
  if (!dataAporte) {
    return { status: 'error', message: 'Informe a data do aporte.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const payload = {
    tipo_ativo: tipoAtivo,
    nome_ativo: nomeAtivo,
    valor_aportado: valorAportado,
    data_aporte: dataAporte,
    instituicao: textoOuNull(formData, 'instituicao'),
    notas: textoOuNull(formData, 'notas'),
  }

  const { error } = id
    ? await supabase.from('investimentos').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('investimentos').insert({ ...payload, user_id: user.id })

  if (error) {
    return { status: 'error', message: `Erro ao salvar aporte: ${error.message}` }
  }

  revalidatePath('/financeiro/investimentos')
  return { status: 'success' }
}

/**
 * Exclui o aporte definitivamente.
 */
export async function deleteInvestimento(id: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('investimentos').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/financeiro/investimentos')
}
