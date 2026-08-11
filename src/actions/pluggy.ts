'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { fetchItem } from '@/lib/pluggy/items'
import { fetchAccounts, type PluggyAccount } from '@/lib/pluggy/accounts'
import { fetchTransactions } from '@/lib/pluggy/transactions'
import { traduzirCategoriaPluggy } from '@/lib/pluggy/categorias'
import type { ContaTipo } from '@/lib/supabase/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

/** Mapeia tipo/subtipo da Pluggy pro enum de conta já usado no Financeiro. */
function mapearTipoConta(tipoPluggy: string, subtipoPluggy: string): ContaTipo {
  if (tipoPluggy === 'CREDIT') return 'cartao_credito'
  if (subtipoPluggy === 'SAVINGS_ACCOUNT') return 'poupanca'
  return 'corrente'
}

/**
 * Saldo da Pluggy pra conta de cartão de crédito vem como valor positivo
 * (quanto se deve). O resto do app já representa dívida de cartão como saldo
 * negativo (é como contas_financeiras/manual sempre tratou cartão) — inverte
 * aqui, no único lugar que grava esse valor, pra manter a convenção igual
 * não importa a origem da conta.
 */
function normalizarSaldo(tipoConta: ContaTipo, saldoPluggy: number): number {
  return tipoConta === 'cartao_credito' ? -saldoPluggy : saldoPluggy
}

async function sincronizarConexao(supabase: SupabaseServerClient, connectionId: string, userId: string) {
  const { data: conexao } = await supabase
    .from('bank_connections')
    .select('id, pluggy_item_id, last_sync')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!conexao) return { erro: 'Conexão não encontrada.' }

  // Primeira sincronização busca o histórico inteiro; a partir daí, só
  // pede da última sincronização pra trás (com uma folga de alguns dias
  // pra pegar transação pendente que virou paga nesse meio-tempo). Sem
  // isso, toda sincronização re-paginava o histórico completo de novo —
  // ficou lento o bastante com uso real pra estourar timeout da função.
  const DIAS_DE_FOLGA = 10
  const dateFrom = conexao.last_sync
    ? new Date(new Date(conexao.last_sync).getTime() - DIAS_DE_FOLGA * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    : undefined

  let contasPluggy: PluggyAccount[]
  try {
    contasPluggy = await fetchAccounts(conexao.pluggy_item_id)
  } catch (erro) {
    // Erro de rede/API da Pluggy nunca pode propagar pra quem chamou —
    // isso já quebrou a página inteira uma vez (o sync automático do
    // AutoSyncStale roda toda visita a /financeiro).
    console.error('[pluggy] Erro ao buscar contas na Pluggy:', erro)
    return { erro: 'Falha ao buscar contas na Pluggy.' }
  }

  for (const contaPluggy of contasPluggy) {
    const tipoConta = mapearTipoConta(contaPluggy.type, contaPluggy.subtype)

    const { data: contaSalva, error: erroConta } = await supabase
      .from('contas_financeiras')
      .upsert(
        {
          user_id: userId,
          connection_id: connectionId,
          pluggy_account_id: contaPluggy.id,
          nome: contaPluggy.name,
          tipo: tipoConta,
          saldo_atual: normalizarSaldo(tipoConta, contaPluggy.balance),
          origem: 'pluggy',
          subtype_pluggy: contaPluggy.subtype,
        },
        { onConflict: 'connection_id,pluggy_account_id' }
      )
      .select('id')
      .single()

    if (erroConta || !contaSalva) {
      console.error('[pluggy] Erro ao sincronizar conta:', erroConta)
      continue
    }

    let transacoesPluggy: Awaited<ReturnType<typeof fetchTransactions>>
    try {
      transacoesPluggy = await fetchTransactions(contaPluggy.id, dateFrom)
    } catch (erro) {
      console.error('[pluggy] Erro ao buscar transações na Pluggy:', erro)
      continue
    }
    if (transacoesPluggy.length === 0) continue

    const idsPluggy = transacoesPluggy.map((t) => t.id)
    const { data: existentes } = await supabase
      .from('transacoes')
      .select('id, pluggy_transaction_id')
      .in('pluggy_transaction_id', idsPluggy)

    const idPorPluggyId = new Map((existentes ?? []).map((e) => [e.pluggy_transaction_id as string, e.id as string]))
    const novas = transacoesPluggy.filter((t) => !idPorPluggyId.has(t.id))
    const paraAtualizar = transacoesPluggy.filter((t) => idPorPluggyId.has(t.id))

    if (novas.length > 0) {
      const { error: erroInsert } = await supabase.from('transacoes').insert(
        novas.map((t) => ({
          user_id: userId,
          conta_id: contaSalva.id,
          connection_id: connectionId,
          pluggy_transaction_id: t.id,
          tipo: t.type === 'CREDIT' ? 'receita' : 'despesa',
          categoria: traduzirCategoriaPluggy(t.category),
          categoria_pluggy: t.category,
          valor: Math.abs(t.amount),
          data: t.date.slice(0, 10),
          descricao: t.description,
          status_pagamento: t.status === 'PENDING' ? 'pendente' : 'pago',
          origem: 'pluggy',
        }))
      )
      if (erroInsert) console.error('[pluggy] Erro ao inserir transações novas:', erroInsert)
    }

    // Nunca inclui categoria/descricao aqui — só campos que a Pluggy pode
    // corrigir depois (ex: uma pendente que vira posted). Isso é o que
    // garante que "categoria personalizada sempre prevalece" sem precisar
    // de uma flag de "editado manualmente" à parte.
    for (const t of paraAtualizar) {
      const id = idPorPluggyId.get(t.id)
      if (!id) continue
      await supabase
        .from('transacoes')
        .update({
          valor: Math.abs(t.amount),
          data: t.date.slice(0, 10),
          status_pagamento: t.status === 'PENDING' ? 'pendente' : 'pago',
        })
        .eq('id', id)
    }
  }

  await supabase.from('bank_connections').update({ last_sync: new Date().toISOString() }).eq('id', connectionId)
  return { ok: true as const }
}

/**
 * Chamada pelo onSuccess do widget Pluggy Connect com o itemId da conexão
 * recém-criada (ou recém-atualizada) — valida o item na Pluggy, grava/
 * atualiza a linha em bank_connections e já dispara a primeira sincronização.
 */
export async function createConnection(itemId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const item = await fetchItem(itemId)

  const { data: conexao, error } = await supabase
    .from('bank_connections')
    .upsert(
      {
        user_id: user.id,
        pluggy_item_id: item.id,
        institution_name: item.connector.name,
        connector_id: item.connector.id,
        status: item.status,
        consent_expires_at: item.consentExpiresAt,
      },
      { onConflict: 'pluggy_item_id' }
    )
    .select('id')
    .single()

  if (error || !conexao) {
    console.error('[pluggy] Erro ao salvar bank_connections:', error)
    return { erro: 'Falha ao salvar a conexão.' }
  }

  const resultado = await sincronizarConexao(supabase, conexao.id, user.id)
  revalidatePath('/financeiro')
  return resultado
}

/** Botão "Sincronizar agora" — busca contas e transações de novo pra uma conexão já existente. */
export async function syncConnection(connectionId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const resultado = await sincronizarConexao(supabase, connectionId, user.id)
  revalidatePath('/financeiro')
  return resultado
}

/**
 * Desconecta um banco: apaga a linha em bank_connections, que já cascateia
 * (via FK) pra apagar as contas e transações sincronizadas daquela conexão —
 * não afeta nenhum lançamento manual.
 */
export async function deleteConnection(connectionId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase
    .from('bank_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[pluggy] Erro ao desconectar banco:', error)
    return { erro: 'Falha ao desconectar o banco.' }
  }

  revalidatePath('/financeiro')
  return { ok: true as const }
}
