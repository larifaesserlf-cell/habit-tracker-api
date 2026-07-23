'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { textoOuNull, numeroOuNull, intOuNull } from '@/lib/formHelpers'
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

const MAX_PARCELAS = 60 // 5 anos — teto defensivo contra erro de digitação

/** Soma `meses` a uma data ISO (YYYY-MM-DD), ajustando pro último dia do mês
 *  de destino quando o dia original não existe nele (ex: 31/jan + 1 mês
 *  vira 28 ou 29/fev, não "3/mar" como o overflow padrão de Date faria). */
function somarMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const totalMeses = mes - 1 + meses
  const novoAno = ano + Math.floor(totalMeses / 12)
  const novoMes = (((totalMeses % 12) + 12) % 12) + 1
  const ultimoDiaDoMes = new Date(Date.UTC(novoAno, novoMes, 0)).getUTCDate()
  const novoDia = Math.min(dia, ultimoDiaDoMes)
  return `${novoAno}-${String(novoMes).padStart(2, '0')}-${String(novoDia).padStart(2, '0')}`
}

/** Divide um valor total em N parcelas de 2 casas decimais cuja soma bate
 *  exatamente com o total (a diferença de arredondamento, se houver, fica
 *  concentrada na última parcela). */
function dividirValorEmParcelas(valorTotal: number, totalParcelas: number): number[] {
  const centavosTotal = Math.round(valorTotal * 100)
  const centavosBase = Math.floor(centavosTotal / totalParcelas)
  const valores = Array(totalParcelas).fill(centavosBase)
  const resto = centavosTotal - centavosBase * totalParcelas
  valores[totalParcelas - 1] += resto
  return valores.map((centavos) => centavos / 100)
}

/**
 * Server Action de criação/edição de transação.
 * Se `formData` tiver um campo `id` preenchido, atualiza; senão, cria.
 * Em criação, se `tipo` for despesa e `total_parcelas` > 1, o valor
 * informado é tratado como o valor TOTAL da compra: gera uma linha por
 * parcela (mesma categoria/conta/compra_id, uma por mês a partir da data
 * informada), cada uma com sua fração do valor.
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

  // Parcelamento só se aplica a despesas novas (não em edição — editar
  // mexe só na própria linha, sem reabrir as demais parcelas da compra).
  const totalParcelasRaw = id || tipo !== 'despesa' ? 1 : intOuNull(formData, 'total_parcelas') ?? 1
  const totalParcelas = Math.max(1, totalParcelasRaw)
  if (totalParcelas > MAX_PARCELAS) {
    return { status: 'error', message: `Número de parcelas muito alto (máximo ${MAX_PARCELAS}).` }
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

  const subcategoria = textoOuNull(formData, 'subcategoria')
  const descricaoBase = textoOuNull(formData, 'descricao')
  const fixo = formData.get('fixo') === 'on'

  if (id) {
    // Edição: só atualiza a própria linha, sem tocar em parcelamento.
    const payload = { conta_id: contaId, tipo, categoria, subcategoria, valor, data, descricao: descricaoBase, fixo }
    const { error } = await supabase.from('transacoes').update(payload).eq('id', id).eq('user_id', user.id)
    if (error) {
      return { status: 'error', message: `Erro ao salvar transação: ${error.message}` }
    }
    revalidatePath('/financeiro')
    return { status: 'success' }
  }

  if (totalParcelas <= 1) {
    const payload = { conta_id: contaId, tipo, categoria, subcategoria, valor, data, descricao: descricaoBase, fixo }
    const { error } = await supabase.from('transacoes').insert({ ...payload, user_id: user.id })
    if (error) {
      return { status: 'error', message: `Erro ao salvar transação: ${error.message}` }
    }
    revalidatePath('/financeiro')
    return { status: 'success' }
  }

  // Parcelado: gera uma linha por parcela, todas com o mesmo compra_id.
  const compraId = randomUUID()
  const valoresPorParcela = dividirValorEmParcelas(valor, totalParcelas)
  const linhas = valoresPorParcela.map((valorParcela, i) => ({
    conta_id: contaId,
    tipo,
    categoria,
    subcategoria,
    valor: valorParcela,
    data: somarMeses(data, i),
    descricao: descricaoBase
      ? `${descricaoBase} (${i + 1}/${totalParcelas})`
      : `(${i + 1}/${totalParcelas})`,
    fixo,
    total_parcelas: totalParcelas,
    parcela_atual: i + 1,
    compra_id: compraId,
    user_id: user.id,
  }))

  const { error } = await supabase.from('transacoes').insert(linhas)
  if (error) {
    return { status: 'error', message: `Erro ao salvar transação parcelada: ${error.message}` }
  }

  revalidatePath('/financeiro')
  return { status: 'success' }
}

/**
 * Exclui apenas esta transação.
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

/**
 * Exclui esta parcela e as futuras da mesma compra (parcela_atual maior ou
 * igual à informada) — as parcelas já passadas não são afetadas.
 */
export async function deleteTransacoesFuturas(compraId: string, apartirDeParcela: number) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('transacoes')
    .delete()
    .eq('user_id', user.id)
    .eq('compra_id', compraId)
    .gte('parcela_atual', apartirDeParcela)
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
