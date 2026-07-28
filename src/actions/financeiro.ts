'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { textoOuNull, numeroOuNull, intOuNull } from '@/lib/formHelpers'
import { calcularDataFatura } from '@/app/financeiro/constants'
import type { ContaTipo, StatusPagamento, TransacaoTipo, TipoAtivo } from '@/lib/supabase/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type ContaFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

export type TransacaoFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

export type EditarCompraFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

export type InvestimentoFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

const CONTA_TIPOS: ContaTipo[] = ['corrente', 'poupanca', 'carteira', 'corretora', 'cartao_credito']
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

type ContaResumo = { id: string; tipo: ContaTipo; dia_vencimento_fatura: number | null }

async function buscarContaDoUsuario(
  supabase: SupabaseServerClient,
  contaId: string,
  userId: string
): Promise<ContaResumo | null> {
  const { data } = await supabase
    .from('contas_financeiras')
    .select('id, tipo, dia_vencimento_fatura')
    .eq('id', contaId)
    .eq('user_id', userId)
    .maybeSingle()
  return data as ContaResumo | null
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

  if (nome.length === 0) {
    return { status: 'error', message: 'Informe o nome da conta.' }
  }
  if (!tipo || !CONTA_TIPOS.includes(tipo as ContaTipo)) {
    return { status: 'error', message: 'Selecione um tipo de conta válido.' }
  }

  // Dia de vencimento da fatura só existe pra contas cartao_credito — em
  // qualquer outro tipo o valor é descartado (ainda que venha no formData),
  // pra nunca ficar um dia "órfão" configurado numa conta que não é cartão.
  let diaVencimentoFatura: number | null = null
  if (tipo === 'cartao_credito') {
    diaVencimentoFatura = intOuNull(formData, 'dia_vencimento_fatura')
    if (diaVencimentoFatura === null || diaVencimentoFatura < 1 || diaVencimentoFatura > 31) {
      return { status: 'error', message: 'Informe o dia de vencimento da fatura (entre 1 e 31).' }
    }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  // O saldo inicial só é gravável na criação — depois disso o saldo exibido
  // em todo o app é sempre calculado (inicial + transações pagas), então
  // permitir editar `saldo_atual` livremente deixaria a pessoa "consertar"
  // o número na mão e mascarar uma transação que faltou lançar. Se o campo
  // vier no formData de uma edição (não deveria, o form nem renderiza mais
  // esse input em modo editar), é ignorado aqui também, em profundidade.
  const { error } = id
    ? await supabase
        .from('contas_financeiras')
        .update({ nome, tipo, dia_vencimento_fatura: diaVencimentoFatura })
        .eq('id', id)
        .eq('user_id', user.id)
    : await supabase.from('contas_financeiras').insert({
        nome,
        tipo,
        dia_vencimento_fatura: diaVencimentoFatura,
        saldo_atual: numeroOuNull(formData, 'saldo_atual') ?? 0,
        user_id: user.id,
      })

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

/** "Hoje" em ISO (YYYY-MM-DD), pelo relógio do servidor — mesma
 *  simplificação já usada em outras telas do app (ex: mês do Financeiro). */
function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Regra automática de status ao criar uma transação: datas até hoje
 *  nascem "pago", datas futuras nascem "pendente". Só vale na criação —
 *  depois disso o status só muda por ação explícita da usuária. */
function statusPagamentoAutomatico(data: string): StatusPagamento {
  return data <= hojeISO() ? 'pago' : 'pendente'
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
 * Cartão de crédito: a compra fica registrada na data real (competência),
 * mas o status pago/pendente segue o vencimento da FATURA, não a data da
 * compra em si — a compra já aconteceu, o que falta é pagar a fatura.
 * Reaproveitado tanto na criação/edição avulsa quanto na edição de compra
 * parcelada inteira.
 */
function criarCalculadoraFatura(conta: ContaResumo) {
  const usaFatura = conta.tipo === 'cartao_credito' && conta.dia_vencimento_fatura != null
  function dataFaturaPara(dataTransacao: string): string | null {
    return usaFatura ? calcularDataFatura(dataTransacao, conta.dia_vencimento_fatura!) : null
  }
  function statusPara(dataTransacao: string): StatusPagamento {
    return statusPagamentoAutomatico(usaFatura ? dataFaturaPara(dataTransacao)! : dataTransacao)
  }
  return { dataFaturaPara, statusPara }
}

/** Junta a descrição-base (livre) com o sufixo "(i/N)" de cada parcela —
 *  mesmo padrão usado desde a criação, pra manter a listagem consistente
 *  entre parcelas criadas de uma vez e parcelas recalculadas numa edição. */
function descricaoComParcela(base: string | null, parcelaAtual: number, totalParcelas: number): string {
  return base ? `${base} (${parcelaAtual}/${totalParcelas})` : `(${parcelaAtual}/${totalParcelas})`
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

  // Parcela inicial: permite registrar uma compra que já estava "no meio"
  // do parcelamento quando a pessoa começou a usar o app (ex: parcela 3 de
  // 6) — só cria as parcelas de `parcelaInicial` em diante, sem recriar as
  // que já teriam passado antes disso.
  const parcelaInicialRaw = totalParcelas <= 1 ? 1 : intOuNull(formData, 'parcela_inicial') ?? 1
  const parcelaInicial = Math.max(1, parcelaInicialRaw)
  if (parcelaInicial > totalParcelas) {
    return { status: 'error', message: 'A parcela inicial não pode ser maior que o total de parcelas.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }
  const conta = await buscarContaDoUsuario(supabase, contaId, user.id)
  if (!conta) {
    return { status: 'error', message: 'Conta inválida.' }
  }

  const { dataFaturaPara, statusPara } = criarCalculadoraFatura(conta)

  const subcategoria = textoOuNull(formData, 'subcategoria')
  const descricaoBase = textoOuNull(formData, 'descricao')
  const fixo = formData.get('fixo') === 'on'

  if (id) {
    // Edição: só atualiza a própria linha, sem tocar em parcelamento nem
    // em status_pagamento — status é ajustado manualmente na listagem
    // (marcar como pago/pendente), e editar outro campo não deve resetá-lo.
    // data_fatura é recalculada porque é só um derivado de data + conta.
    const payload = {
      conta_id: contaId,
      tipo,
      categoria,
      subcategoria,
      valor,
      data,
      data_fatura: dataFaturaPara(data),
      descricao: descricaoBase,
      fixo,
    }
    const { error } = await supabase.from('transacoes').update(payload).eq('id', id).eq('user_id', user.id)
    if (error) {
      return { status: 'error', message: `Erro ao salvar transação: ${error.message}` }
    }
    revalidatePath('/financeiro')
    return { status: 'success' }
  }

  if (totalParcelas <= 1) {
    const payload = {
      conta_id: contaId,
      tipo,
      categoria,
      subcategoria,
      valor,
      data,
      data_fatura: dataFaturaPara(data),
      descricao: descricaoBase,
      fixo,
      status_pagamento: statusPara(data),
    }
    const { error } = await supabase.from('transacoes').insert({ ...payload, user_id: user.id })
    if (error) {
      return { status: 'error', message: `Erro ao salvar transação: ${error.message}` }
    }
    revalidatePath('/financeiro')
    return { status: 'success' }
  }

  // Parcelado: gera uma linha por parcela (só a partir de `parcelaInicial`),
  // todas com o mesmo compra_id. O valor de cada parcela é calculado
  // dividindo o total entre TODAS as `totalParcelas` (não só as criadas
  // agora), pra bater com o que as parcelas anteriores (não recriadas)
  // já teriam valido.
  const compraId = randomUUID()
  const valoresPorParcela = dividirValorEmParcelas(valor, totalParcelas)
  const linhas = valoresPorParcela.slice(parcelaInicial - 1).map((valorParcela, i) => {
    const dataParcela = somarMeses(data, i)
    return {
      conta_id: contaId,
      tipo,
      categoria,
      subcategoria,
      valor: valorParcela,
      data: dataParcela,
      data_fatura: dataFaturaPara(dataParcela),
      descricao: descricaoComParcela(descricaoBase, parcelaInicial + i, totalParcelas),
      fixo,
      total_parcelas: totalParcelas,
      parcela_atual: parcelaInicial + i,
      compra_id: compraId,
      status_pagamento: statusPara(dataParcela),
      user_id: user.id,
    }
  })

  const { error } = await supabase.from('transacoes').insert(linhas)
  if (error) {
    return { status: 'error', message: `Erro ao salvar transação parcelada: ${error.message}` }
  }

  revalidatePath('/financeiro')
  return { status: 'success' }
}

/**
 * Server Action de edição de uma compra parcelada INTEIRA (todas as linhas
 * que compartilham o mesmo compra_id) — usada na edição rápida a partir da
 * listagem. Diferente de `saveTransacao`, que edita só uma linha isolada.
 *
 * Parcelas já pagas nunca têm valor/data alterados (só recebem os novos
 * conta/categoria/descrição/total_parcelas, que são atributos da compra
 * como um todo). Parcelas pendentes são recalculadas: o valor restante
 * (novo total menos o que já foi pago) é redividido entre as parcelas
 * pendentes que sobrarem depois da edição. Se o novo número de parcelas for
 * menor que a posição da última parcela já paga, a edição é bloqueada —
 * senão a numeração "X/N" ficaria inconsistente com parcelas já quitadas.
 */
export async function editarCompraParcelada(
  _prevState: EditarCompraFormState,
  formData: FormData
): Promise<EditarCompraFormState> {
  const compraId = (formData.get('compra_id') as string | null) || ''
  const contaId = (formData.get('conta_id') as string | null) || ''
  const categoria = (formData.get('categoria') as string | null)?.trim() ?? ''
  const descricaoBase = textoOuNull(formData, 'descricao')
  const valorTotal = numeroOuNull(formData, 'valor_total')
  const novoTotalParcelas = intOuNull(formData, 'total_parcelas')

  if (!compraId) {
    return { status: 'error', message: 'Compra inválida.' }
  }
  if (!contaId) {
    return { status: 'error', message: 'Selecione uma conta.' }
  }
  if (categoria.length === 0) {
    return { status: 'error', message: 'Informe a categoria.' }
  }
  if (valorTotal === null || valorTotal <= 0) {
    return { status: 'error', message: 'Informe um valor total maior que zero.' }
  }
  if (novoTotalParcelas === null || novoTotalParcelas < 1) {
    return { status: 'error', message: 'Informe um número de parcelas válido.' }
  }
  if (novoTotalParcelas > MAX_PARCELAS) {
    return { status: 'error', message: `Número de parcelas muito alto (máximo ${MAX_PARCELAS}).` }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Sessão expirada. Faça login novamente.' }
  }

  const conta = await buscarContaDoUsuario(supabase, contaId, user.id)
  if (!conta) {
    return { status: 'error', message: 'Conta inválida.' }
  }

  const { data: linhasData, error: erroBusca } = await supabase
    .from('transacoes')
    .select('*')
    .eq('compra_id', compraId)
    .eq('user_id', user.id)
    .order('parcela_atual', { ascending: true })
  if (erroBusca || !linhasData || linhasData.length === 0) {
    return { status: 'error', message: 'Compra não encontrada.' }
  }

  type LinhaCompra = {
    id: string
    parcela_atual: number
    status_pagamento: StatusPagamento | null
    valor: number
    data: string
    tipo: TransacaoTipo
    subcategoria: string | null
    fixo: boolean
  }
  const linhas = linhasData as LinhaCompra[]

  const pagas = linhas.filter((l) => l.status_pagamento === 'pago')
  const pendentes = linhas.filter((l) => l.status_pagamento !== 'pago')
  const maiorParcelaPaga = pagas.length > 0 ? Math.max(...pagas.map((l) => l.parcela_atual)) : 0

  if (novoTotalParcelas < maiorParcelaPaga) {
    return {
      status: 'error',
      message: `Não é possível reduzir pra menos de ${maiorParcelaPaga} parcelas: a parcela ${maiorParcelaPaga} já está paga.`,
    }
  }

  const sumPago = pagas.reduce((soma, l) => soma + l.valor, 0)
  const countPendentesNovo = novoTotalParcelas - maiorParcelaPaga
  const valorRestante = valorTotal - sumPago

  if (countPendentesNovo > 0 && valorRestante < 0) {
    return {
      status: 'error',
      message: `O valor total informado é menor do que o já pago (${sumPago.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })}). Informe um valor maior.`,
    }
  }

  const valoresPendentes =
    countPendentesNovo > 0 ? dividirValorEmParcelas(Math.max(valorRestante, 0), countPendentesNovo) : []

  const { dataFaturaPara, statusPara } = criarCalculadoraFatura(conta)

  const pendentesOrdenadas = [...pendentes].sort((a, b) => a.parcela_atual - b.parcela_atual)
  const pendentesManter = pendentesOrdenadas.filter((l) => l.parcela_atual <= novoTotalParcelas)
  const pendentesExcluir = pendentesOrdenadas.filter((l) => l.parcela_atual > novoTotalParcelas)

  // Atributos da compra (conta/categoria/descrição/total_parcelas) valem
  // pra toda linha, inclusive as já pagas — só valor e data delas ficam
  // intocados. data_fatura é recalculada porque é só um derivado de
  // data + conta, não uma decisão manual da usuária.
  for (const l of pagas) {
    const { error } = await supabase
      .from('transacoes')
      .update({
        conta_id: contaId,
        categoria,
        descricao: descricaoComParcela(descricaoBase, l.parcela_atual, novoTotalParcelas),
        total_parcelas: novoTotalParcelas,
        data_fatura: dataFaturaPara(l.data),
      })
      .eq('id', l.id)
      .eq('user_id', user.id)
    if (error) {
      return { status: 'error', message: `Erro ao salvar compra: ${error.message}` }
    }
  }

  for (let i = 0; i < pendentesManter.length; i++) {
    const l = pendentesManter[i]
    const { error } = await supabase
      .from('transacoes')
      .update({
        conta_id: contaId,
        categoria,
        descricao: descricaoComParcela(descricaoBase, l.parcela_atual, novoTotalParcelas),
        total_parcelas: novoTotalParcelas,
        valor: valoresPendentes[i],
        data_fatura: dataFaturaPara(l.data),
      })
      .eq('id', l.id)
      .eq('user_id', user.id)
    if (error) {
      return { status: 'error', message: `Erro ao salvar compra: ${error.message}` }
    }
  }

  if (pendentesExcluir.length > 0) {
    const { error } = await supabase
      .from('transacoes')
      .delete()
      .eq('user_id', user.id)
      .in(
        'id',
        pendentesExcluir.map((l) => l.id)
      )
    if (error) {
      return { status: 'error', message: `Erro ao salvar compra: ${error.message}` }
    }
  }

  const faltamCriar = countPendentesNovo - pendentesManter.length
  if (faltamCriar > 0) {
    const ultimaLinha = linhas[linhas.length - 1]
    const linhasNovas = Array.from({ length: faltamCriar }, (_, i) => {
      const dataParcela = somarMeses(ultimaLinha.data, i + 1)
      const parcelaAtual = ultimaLinha.parcela_atual + i + 1
      return {
        conta_id: contaId,
        tipo: ultimaLinha.tipo,
        categoria,
        subcategoria: ultimaLinha.subcategoria,
        valor: valoresPendentes[pendentesManter.length + i],
        data: dataParcela,
        data_fatura: dataFaturaPara(dataParcela),
        descricao: descricaoComParcela(descricaoBase, parcelaAtual, novoTotalParcelas),
        fixo: ultimaLinha.fixo,
        total_parcelas: novoTotalParcelas,
        parcela_atual: parcelaAtual,
        compra_id: compraId,
        status_pagamento: statusPara(dataParcela),
        user_id: user.id,
      }
    })
    const { error } = await supabase.from('transacoes').insert(linhasNovas)
    if (error) {
      return { status: 'error', message: `Erro ao salvar compra: ${error.message}` }
    }
  }

  revalidatePath('/financeiro')
  return { status: 'success' }
}

/**
 * Marca manualmente uma transação como paga ou pendente (botão de toggle na
 * listagem) — sobrescreve o valor calculado automaticamente na criação.
 */
export async function toggleStatusPagamento(id: string, novoStatus: StatusPagamento) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('transacoes')
    .update({ status_pagamento: novoStatus })
    .eq('id', id)
    .eq('user_id', user.id)
  revalidatePath('/financeiro')
}

/**
 * Marca de uma vez todas as transações de uma fatura (mesma conta + mesma
 * data_fatura) como pagas ou pendentes — evita ter que marcar item por item
 * na visão de Faturas.
 */
export async function marcarFaturaPaga(contaId: string, dataFatura: string, novoStatus: StatusPagamento) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('transacoes')
    .update({ status_pagamento: novoStatus })
    .eq('user_id', user.id)
    .eq('conta_id', contaId)
    .eq('data_fatura', dataFatura)
  revalidatePath('/financeiro')
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
