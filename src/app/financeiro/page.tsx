import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ContaForm } from './ContaForm'
import { DeleteContaButton } from './DeleteContaButton'
import { TransacaoForm } from './TransacaoForm'
import { DeleteTransacaoButton } from './DeleteTransacaoButton'
import { FiltrosBar } from './FiltrosBar'
import { GastosPorCategoriaChart } from './GastosPorCategoriaChart'
import { StatusPagamentoToggle } from './StatusPagamentoToggle'
import { FaturaToggleButton } from './FaturaToggleButton'
import { CONTA_TIPO_LABEL, formatMoeda, formatDataBR, iconeCategoria, calcularSaldoConta } from './constants'
import type { ContaFinanceira, StatusPagamento, Transacao } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Financeiro',
}

/** Mês atual (relógio do servidor) em "YYYY-MM". */
function mesAtualISO(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

/** Valida o parâmetro `?mes=`; se ausente/inválido, cai no mês atual. */
function mesValido(mes: string | undefined): string {
  return mes && /^\d{4}-\d{2}$/.test(mes) ? mes : mesAtualISO()
}

/** Primeiro e último dia do mês informado ("YYYY-MM"), em ISO (YYYY-MM-DD). */
function faixaDoMes(mesISO: string) {
  const [ano, mes] = mesISO.split('-').map(Number)
  const inicio = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 0))
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) }
}

/** Desloca um mês ("YYYY-MM") por `delta` meses (pode ser negativo). */
function deslocarMes(mesISO: string, delta: number): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const totalMeses = mes - 1 + delta
  const novoAno = ano + Math.floor(totalMeses / 12)
  const novoMes = (((totalMeses % 12) + 12) % 12) + 1
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}

/** Nome do mês por extenso em pt-BR, ex: "Agosto de 2026". */
function nomeMes(mesISO: string): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const nome = new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

/** Monta a URL de /financeiro preservando os filtros de tipo/categoria e trocando o mês. */
function hrefComMes(filtros: { tipo?: string; categoria?: string }, mes: string): string {
  const params = new URLSearchParams()
  if (filtros.tipo) params.set('tipo', filtros.tipo)
  if (filtros.categoria) params.set('categoria', filtros.categoria)
  params.set('mes', mes)
  return `/financeiro?${params.toString()}`
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{
    editConta?: string
    editTransacao?: string
    tipo?: string
    categoria?: string
    mes?: string
  }>
}) {
  const { editConta, editTransacao, tipo, categoria, mes } = await searchParams
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

  const mesSelecionado = mesValido(mes)
  const { inicio, fim } = faixaDoMes(mesSelecionado)
  const transacoesDoMes = transacoes.filter((t) => t.data >= inicio && t.data <= fim)

  // Realizado (já pago) e previsto (ainda pendente) somados separadamente —
  // misturar os dois faria o saldo do mês parecer maior/menor do que já
  // aconteceu de fato.
  function somaPor(tipoAlvo: Transacao['tipo'], statusAlvo: StatusPagamento) {
    return transacoesDoMes
      .filter((t) => t.tipo === tipoAlvo && t.status_pagamento === statusAlvo)
      .reduce((soma, t) => soma + t.valor, 0)
  }
  const receitaRealizadaDoMes = somaPor('receita', 'pago')
  const receitaPrevistaDoMes = somaPor('receita', 'pendente')
  const despesaRealizadaDoMes = somaPor('despesa', 'pago')
  const despesaPrevistaDoMes = somaPor('despesa', 'pendente')

  // Saldo de cada conta = saldo inicial + receitas pagas - despesas pagas
  // (transações pendentes não contam até o status virar "pago").
  const transacoesPorConta = new Map<string, Transacao[]>()
  for (const t of transacoes) {
    const lista = transacoesPorConta.get(t.conta_id) ?? []
    lista.push(t)
    transacoesPorConta.set(t.conta_id, lista)
  }
  const saldoTotalContas = contas.reduce(
    (soma, c) => soma + calcularSaldoConta(c, transacoesPorConta.get(c.id) ?? []),
    0
  )

  // Agrupa as despesas do mês por categoria — não há lista fixa de
  // categorias no código, o gráfico reflete o que existir nos dados.
  const valorPorCategoria = new Map<string, number>()
  for (const t of transacoesDoMes) {
    if (t.tipo !== 'despesa') continue
    valorPorCategoria.set(t.categoria, (valorPorCategoria.get(t.categoria) ?? 0) + t.valor)
  }
  const gastosPorCategoria = Array.from(valorPorCategoria, ([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)

  const categoriasExistentes = Array.from(new Set(transacoes.map((t) => t.categoria))).sort()

  // ── Cartão de crédito: duas visões separadas ──────────────────────────
  // "Gastos do mês" = por competência (data real da compra); "Faturas" =
  // por vencimento (data_fatura), agrupadas por conta + fatura.
  const temCartaoCredito = contas.some((c) => c.tipo === 'cartao_credito')

  const gastosCartaoDoMes = transacoesDoMes.filter((t) => contaPorId.get(t.conta_id)?.tipo === 'cartao_credito')
  const totalGastosCartaoDoMes = gastosCartaoDoMes.reduce(
    (soma, t) => soma + (t.tipo === 'despesa' ? t.valor : -t.valor),
    0
  )

  type FaturaGrupo = {
    contaId: string
    contaNome: string
    dataFatura: string
    transacoes: Transacao[]
    total: number
    todasPagas: boolean
  }
  const faturasMap = new Map<string, FaturaGrupo>()
  for (const t of transacoes) {
    const conta = contaPorId.get(t.conta_id)
    if (conta?.tipo !== 'cartao_credito' || !t.data_fatura) continue
    const chave = `${t.conta_id}|${t.data_fatura}`
    const grupo = faturasMap.get(chave) ?? {
      contaId: t.conta_id,
      contaNome: conta.nome,
      dataFatura: t.data_fatura,
      transacoes: [],
      total: 0,
      todasPagas: true,
    }
    grupo.transacoes.push(t)
    grupo.total += t.tipo === 'despesa' ? t.valor : -t.valor
    if (t.status_pagamento !== 'pago') grupo.todasPagas = false
    faturasMap.set(chave, grupo)
  }
  const faturas = Array.from(faturasMap.values()).sort((a, b) => b.dataFatura.localeCompare(a.dataFatura))

  const transacoesFiltradas = transacoes.filter((t) => {
    if (tipo && t.tipo !== tipo) return false
    if (categoria && t.categoria !== categoria) return false
    return true
  })

  // Agrupa por mês (mais recente primeiro, já que `transacoesFiltradas` vem
  // ordenada por data desc) pra listagem estilo Nubank, com um cabeçalho
  // "Julho de 2026" antes de cada grupo.
  const transacoesPorMes = new Map<string, Transacao[]>()
  for (const t of transacoesFiltradas) {
    const mesDaTransacao = t.data.slice(0, 7)
    const lista = transacoesPorMes.get(mesDaTransacao) ?? []
    lista.push(t)
    transacoesPorMes.set(mesDaTransacao, lista)
  }

  const editingConta = editConta ? contas.find((c) => c.id === editConta) ?? null : null
  const editingTransacao = editTransacao ? transacoes.find((t) => t.id === editTransacao) ?? null : null

  const filtrosAtuais = { tipo, categoria }
  const hrefMesAnterior = hrefComMes(filtrosAtuais, deslocarMes(mesSelecionado, -1))
  const hrefMesSeguinte = hrefComMes(filtrosAtuais, deslocarMes(mesSelecionado, 1))
  const estaNoMesAtual = mesSelecionado === mesAtualISO()

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
        <div className={styles.mesNav}>
          <Link href={hrefMesAnterior} className={styles.mesNavArrow} aria-label="Mês anterior">
            ←
          </Link>
          <h2 className={styles.cardTitle}>Resumo de {nomeMes(mesSelecionado)}</h2>
          <Link href={hrefMesSeguinte} className={styles.mesNavArrow} aria-label="Próximo mês">
            →
          </Link>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statTile}>
            <div className={styles.statTileValue}>{formatMoeda(saldoTotalContas)}</div>
            <div className={styles.statTileLabel}>Saldo total das contas</div>
          </div>
          <div className={`${styles.statTile} ${styles.statTilePositivo}`}>
            <div className={styles.statTileValue}>{formatMoeda(receitaRealizadaDoMes)}</div>
            <div className={styles.statTileLabel}>Receita realizada</div>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statTileValue}>{formatMoeda(receitaPrevistaDoMes)}</div>
            <div className={styles.statTileLabel}>Receita prevista</div>
          </div>
          <div className={`${styles.statTile} ${styles.statTileNegativo}`}>
            <div className={styles.statTileValue}>{formatMoeda(despesaRealizadaDoMes)}</div>
            <div className={styles.statTileLabel}>Despesa realizada</div>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statTileValue}>{formatMoeda(despesaPrevistaDoMes)}</div>
            <div className={styles.statTileLabel}>Despesa prevista</div>
          </div>
        </div>
        {!estaNoMesAtual && (
          <Link href="/financeiro" className={styles.voltarMesAtual}>
            ← Voltar pro mês atual
          </Link>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Gastos por categoria ({nomeMes(mesSelecionado)})</h2>
        <GastosPorCategoriaChart dados={gastosPorCategoria} />
      </section>

      {temCartaoCredito && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Gastos do mês no cartão ({nomeMes(mesSelecionado)})</h2>
          <p className={styles.faturaAjuda}>
            Por competência — quanto você gastou no cartão neste mês, independente de quando a fatura vence.
          </p>
          <div className={styles.statsGrid}>
            <div className={`${styles.statTile} ${styles.statTileNegativo}`}>
              <div className={styles.statTileValue}>{formatMoeda(totalGastosCartaoDoMes)}</div>
              <div className={styles.statTileLabel}>Total gasto no cartão</div>
            </div>
          </div>
          {gastosCartaoDoMes.length > 0 && (
            <ul className={styles.list} style={{ marginTop: '1rem' }}>
              {gastosCartaoDoMes.map((t) => (
                <li key={t.id} className={styles.item}>
                  <div className={styles.itemTop}>
                    <span className={styles.itemIcone}>{iconeCategoria(t.categoria)}</span>
                    <span className={t.tipo === 'receita' ? styles.tipoReceita : styles.tipoDespesa}>
                      {t.tipo === 'receita' ? '+ ' : '− '}
                      {formatMoeda(t.valor)}
                    </span>
                  </div>
                  <div className={styles.itemTitulo}>{t.categoria}</div>
                  <div className={styles.itemMeta}>
                    {formatDataBR(t.data)} · {contaPorId.get(t.conta_id)?.nome}
                    {t.data_fatura ? ` · fatura ${formatDataBR(t.data_fatura)}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {temCartaoCredito && faturas.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Faturas</h2>
          <p className={styles.faturaAjuda}>
            Por vencimento — cada fatura agrupa as compras que vencem juntas, pra marcar como paga de uma vez.
          </p>
          <ul className={styles.list}>
            {faturas.map((f) => (
              <li key={`${f.contaId}|${f.dataFatura}`} className={styles.item}>
                <div className={styles.itemInfo}>
                  <div>
                    <div className={styles.itemNome}>
                      {f.contaNome} · fatura de {nomeMes(f.dataFatura.slice(0, 7))}
                    </div>
                    <div className={styles.itemMeta}>Vence em {formatDataBR(f.dataFatura)}</div>
                  </div>
                  <span className={f.todasPagas ? styles.statusBadgePago : styles.statusBadgePendente}>
                    {f.todasPagas ? 'Paga' : 'Pendente'}
                  </span>
                </div>
                <div className={styles.itemTitulo}>{formatMoeda(f.total)}</div>
                <ul className={styles.faturaItens}>
                  {f.transacoes.map((t) => (
                    <li key={t.id} className={styles.faturaItem}>
                      <span>
                        {iconeCategoria(t.categoria)} {t.categoria}
                        {t.total_parcelas > 1 ? ` (${t.parcela_atual}/${t.total_parcelas})` : ''}
                      </span>
                      <span>{formatMoeda(t.valor)}</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.itemActions}>
                  <FaturaToggleButton contaId={f.contaId} dataFatura={f.dataFatura} todasPagas={f.todasPagas} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                      {CONTA_TIPO_LABEL[c.tipo]} ·{' '}
                      {formatMoeda(calcularSaldoConta(c, transacoesPorConta.get(c.id) ?? []))}
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
          Array.from(transacoesPorMes, ([mesDoGrupo, transacoesDoGrupo]) => (
            <div key={mesDoGrupo} className={styles.mesGrupo}>
              <h3 className={styles.mesGrupoTitle}>{nomeMes(mesDoGrupo)}</h3>
              <ul className={styles.list}>
                {transacoesDoGrupo.map((t) => {
                  const conta = contaPorId.get(t.conta_id)
                  const pendente = t.status_pagamento === 'pendente'
                  return (
                    <li key={t.id} className={pendente ? `${styles.item} ${styles.itemPendente}` : styles.item}>
                      <div className={styles.itemTop}>
                        <span className={styles.itemIcone}>{iconeCategoria(t.categoria)}</span>
                        <span className={t.tipo === 'receita' ? styles.tipoReceita : styles.tipoDespesa}>
                          {t.tipo === 'receita' ? '+ ' : '− '}
                          {formatMoeda(t.valor)}
                        </span>
                        {t.fixo && <span className={styles.fixoBadge}>Fixo</span>}
                        {t.total_parcelas > 1 && (
                          <span className={styles.parcelaBadge}>
                            {t.parcela_atual}/{t.total_parcelas}
                          </span>
                        )}
                        {t.status_pagamento && (
                          <StatusPagamentoToggle id={t.id} status={t.status_pagamento} />
                        )}
                      </div>
                      <div className={styles.itemTitulo}>
                        {t.categoria}
                        {t.subcategoria ? ` · ${t.subcategoria}` : ''}
                      </div>
                      <div className={styles.itemMeta}>
                        {formatDataBR(t.data)}
                        {conta ? ` · ${conta.nome}` : ''}
                        {t.data_fatura ? ` · fatura ${formatDataBR(t.data_fatura)}` : ''}
                      </div>
                      {t.descricao && <p className={styles.itemComentario}>{t.descricao}</p>}
                      <div className={styles.itemActions}>
                        <Link href={`/financeiro?editTransacao=${t.id}`} className={styles.editLink}>
                          Editar
                        </Link>
                        <DeleteTransacaoButton transacao={t} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
