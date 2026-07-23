import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ContaForm } from './ContaForm'
import { DeleteContaButton } from './DeleteContaButton'
import { TransacaoForm } from './TransacaoForm'
import { DeleteTransacaoButton } from './DeleteTransacaoButton'
import { FiltrosBar } from './FiltrosBar'
import { CONTA_TIPO_LABEL, formatMoeda, formatDataBR } from './constants'
import type { ContaFinanceira, Transacao } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Financeiro',
}

/** Primeiro e último dia do mês atual (relógio do servidor), em ISO (YYYY-MM-DD). */
function faixaMesAtual() {
  const agora = new Date()
  const inicio = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), 1))
  const fim = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() + 1, 0))
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) }
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ editConta?: string; editTransacao?: string; tipo?: string; categoria?: string }>
}) {
  const { editConta, editTransacao, tipo, categoria } = await searchParams
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: contasData }, { data: transacoesData }] = await Promise.all([
    supabase
      .from('contas_financeiras')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const contas = (contasData ?? []) as ContaFinanceira[]
  const contaPorId = new Map(contas.map((c) => [c.id, c]))
  const transacoes = (transacoesData ?? []) as Transacao[]

  const { inicio, fim } = faixaMesAtual()
  const transacoesDoMes = transacoes.filter((t) => t.data >= inicio && t.data <= fim)
  const receitaDoMes = transacoesDoMes
    .filter((t) => t.tipo === 'receita')
    .reduce((soma, t) => soma + t.valor, 0)
  const despesaDoMes = transacoesDoMes
    .filter((t) => t.tipo === 'despesa')
    .reduce((soma, t) => soma + t.valor, 0)
  const saldoTotalContas = contas.reduce((soma, c) => soma + c.saldo_atual, 0)

  const categoriasExistentes = Array.from(new Set(transacoes.map((t) => t.categoria))).sort()

  const transacoesFiltradas = transacoes.filter((t) => {
    if (tipo && t.tipo !== tipo) return false
    if (categoria && t.categoria !== categoria) return false
    return true
  })

  const editingConta = editConta ? contas.find((c) => c.id === editConta) ?? null : null
  const editingTransacao = editTransacao ? transacoes.find((t) => t.id === editTransacao) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/hoje" className={styles.backLink}>
          ← Painel
        </Link>
        <h1 className={styles.title}>Financeiro</h1>
        <Link href="/financeiro/investimentos" className={styles.statsLink}>
          Ver investimentos →
        </Link>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Resumo do mês</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statTile}>
            <div className={styles.statTileValue}>{formatMoeda(saldoTotalContas)}</div>
            <div className={styles.statTileLabel}>Saldo total das contas</div>
          </div>
          <div className={`${styles.statTile} ${styles.statTilePositivo}`}>
            <div className={styles.statTileValue}>{formatMoeda(receitaDoMes)}</div>
            <div className={styles.statTileLabel}>Receita do mês</div>
          </div>
          <div className={`${styles.statTile} ${styles.statTileNegativo}`}>
            <div className={styles.statTileValue}>{formatMoeda(despesaDoMes)}</div>
            <div className={styles.statTileLabel}>Despesa do mês</div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingConta ? 'Editar conta' : 'Nova conta'}</h2>
        <ContaForm key={editingConta?.id ?? 'new'} conta={editingConta} />

        {contas.length > 0 && (
          <ul className={styles.contaList}>
            {contas.map((c) => (
              <li key={c.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <div>
                    <div className={styles.itemNome}>{c.nome}</div>
                    <div className={styles.itemMeta}>
                      {CONTA_TIPO_LABEL[c.tipo]} · {formatMoeda(c.saldo_atual)}
                    </div>
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <Link href={`/financeiro?editConta=${c.id}`} className={styles.editLink}>
                    Editar
                  </Link>
                  <DeleteContaButton id={c.id} nome={c.nome} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingTransacao ? 'Editar transação' : 'Nova transação'}</h2>
        {contas.length === 0 ? (
          <p className={styles.empty}>Crie uma conta acima antes de registrar uma transação.</p>
        ) : (
          <TransacaoForm
            key={editingTransacao?.id ?? 'new'}
            transacao={editingTransacao}
            contas={contas}
            categoriasExistentes={categoriasExistentes}
          />
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Transações</h2>
        {transacoes.length > 0 && (
          <FiltrosBar
            categorias={categoriasExistentes}
            valores={{ tipo: tipo ?? '', categoria: categoria ?? '' }}
          />
        )}

        {transacoesFiltradas.length === 0 ? (
          <p className={styles.empty}>
            {transacoes.length === 0
              ? 'Nenhuma transação ainda. Adicione a primeira acima.'
              : 'Nenhuma transação bate com esses filtros.'}
          </p>
        ) : (
          <ul className={styles.list}>
            {transacoesFiltradas.map((t) => {
              const conta = contaPorId.get(t.conta_id)
              return (
                <li key={t.id} className={styles.item}>
                  <div className={styles.itemTop}>
                    <span
                      className={t.tipo === 'receita' ? styles.tipoReceita : styles.tipoDespesa}
                    >
                      {t.tipo === 'receita' ? '+ ' : '− '}
                      {formatMoeda(t.valor)}
                    </span>
                    {t.fixo && <span className={styles.fixoBadge}>Fixo</span>}
                  </div>
                  <div className={styles.itemTitulo}>
                    {t.categoria}
                    {t.subcategoria ? ` · ${t.subcategoria}` : ''}
                  </div>
                  <div className={styles.itemMeta}>
                    {formatDataBR(t.data)}
                    {conta ? ` · ${conta.nome}` : ''}
                  </div>
                  {t.descricao && <p className={styles.itemComentario}>{t.descricao}</p>}
                  <div className={styles.itemActions}>
                    <Link href={`/financeiro?editTransacao=${t.id}`} className={styles.editLink}>
                      Editar
                    </Link>
                    <DeleteTransacaoButton id={t.id} categoria={t.categoria} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
