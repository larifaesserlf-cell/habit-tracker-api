import { formatMoeda } from './constants'
import type { OrcamentoMensal, Transacao } from '@/lib/supabase/types'

export type Insight = { icone: string; texto: string }

/** Categorias Pluggy que indicam serviço de assinatura recorrente. */
const CATEGORIAS_ASSINATURA_PLUGGY = new Set(['Video streaming', 'Music streaming', 'Gaming'])

function deslocarMes(mesISO: string, delta: number): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const totalMeses = mes - 1 + delta
  const novoAno = ano + Math.floor(totalMeses / 12)
  const novoMes = (((totalMeses % 12) + 12) % 12) + 1
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}

function diasNoMes(mesISO: string): number {
  const [ano, mes] = mesISO.split('-').map(Number)
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

function somaDespesas(transacoes: Transacao[], mesISO: string): number {
  return transacoes
    .filter((t) => t.tipo === 'despesa' && t.data.slice(0, 7) === mesISO)
    .reduce((soma, t) => soma + t.valor, 0)
}

/**
 * Insights calculados localmente a partir dos dados já carregados (sem
 * chamar a Pluggy de novo) — cada função abaixo só entra na lista se tiver
 * dado suficiente pra fazer sentido (ex: sem mês anterior, não compara).
 */
export function calcularInsights(
  transacoes: Transacao[],
  orcamentos: OrcamentoMensal[],
  mesAtualISO: string
): Insight[] {
  const insights: Insight[] = []
  const hojeISO = new Date().toISOString().slice(0, 10)
  const estaNoMesAtual = hojeISO.slice(0, 7) === mesAtualISO

  const despesasDoMes = transacoes.filter((t) => t.tipo === 'despesa' && t.data.slice(0, 7) === mesAtualISO)
  const totalMesAtual = somaDespesas(transacoes, mesAtualISO)
  const mesAnteriorISO = deslocarMes(mesAtualISO, -1)
  const totalMesAnterior = somaDespesas(transacoes, mesAnteriorISO)

  // Maior categoria de despesa do mês
  if (despesasDoMes.length > 0) {
    const porCategoria = new Map<string, number>()
    for (const t of despesasDoMes) {
      porCategoria.set(t.categoria, (porCategoria.get(t.categoria) ?? 0) + t.valor)
    }
    const [categoria, valor] = [...porCategoria.entries()].sort((a, b) => b[1] - a[1])[0]
    insights.push({
      icone: '🏆',
      texto: `Sua maior categoria de despesas este mês foi ${categoria} (${formatMoeda(valor)}).`,
    })
  }

  // Variação da despesa total vs mês anterior
  if (totalMesAnterior > 0) {
    const variacao = ((totalMesAtual - totalMesAnterior) / totalMesAnterior) * 100
    const direcao = variacao >= 0 ? 'a mais' : 'a menos'
    insights.push({
      icone: variacao >= 0 ? '📈' : '📉',
      texto: `Você gastou ${Math.abs(variacao).toFixed(0)}% ${direcao} que no mês passado.`,
    })
  }

  // Delivery
  const gastoDelivery = despesasDoMes
    .filter((t) => t.categoria.toLowerCase().includes('delivery'))
    .reduce((soma, t) => soma + t.valor, 0)
  if (gastoDelivery > 0) {
    insights.push({ icone: '🍔', texto: `Você gastou ${formatMoeda(gastoDelivery)} com delivery este mês.` })
  }

  // Assinaturas recorrentes — mesma descrição aparecendo em 2+ meses distintos
  const porAssinatura = new Map<string, Set<string>>()
  for (const t of transacoes) {
    if (t.tipo !== 'despesa' || !t.categoria_pluggy || !CATEGORIAS_ASSINATURA_PLUGGY.has(t.categoria_pluggy)) continue
    const chave = t.descricao ?? t.categoria
    const meses = porAssinatura.get(chave) ?? new Set<string>()
    meses.add(t.data.slice(0, 7))
    porAssinatura.set(chave, meses)
  }
  const nomesAssinaturas = [...porAssinatura.entries()].filter(([, meses]) => meses.size >= 2).map(([nome]) => nome)
  if (nomesAssinaturas.length > 0) {
    insights.push({ icone: '🔁', texto: `Você possui assinaturas recorrentes: ${nomesAssinaturas.join(', ')}.` })
  }

  // Gasto médio semanal aumentou
  const diasPassados = estaNoMesAtual ? Number(hojeISO.slice(8, 10)) : diasNoMes(mesAtualISO)
  if (estaNoMesAtual && diasPassados >= 7 && totalMesAnterior > 0) {
    const mediaSemanalAtual = totalMesAtual / (diasPassados / 7)
    const mediaSemanalAnterior = totalMesAnterior / (diasNoMes(mesAnteriorISO) / 7)
    if (mediaSemanalAnterior > 0 && mediaSemanalAtual > mediaSemanalAnterior * 1.1) {
      insights.push({
        icone: '📊',
        texto: `Seu gasto médio semanal aumentou pra ${formatMoeda(mediaSemanalAtual)} (era ${formatMoeda(mediaSemanalAnterior)} no mês passado).`,
      })
    }
  }

  // Projeção de fim de mês (só faz sentido pro mês corrente, em andamento)
  if (estaNoMesAtual && diasPassados > 0 && totalMesAtual > 0) {
    const projecao = (totalMesAtual / diasPassados) * diasNoMes(mesAtualISO)
    const orcamentoGeral = orcamentos.find(
      (o) => o.categoria === 'geral' && o.mes_referencia.slice(0, 7) === mesAtualISO
    )
    if (orcamentoGeral) {
      const acimaDoOrcamento = projecao > orcamentoGeral.valor_limite
      insights.push({
        icone: acimaDoOrcamento ? '⚠️' : '✅',
        texto: `No ritmo atual, você deve encerrar o mês com ${formatMoeda(projecao)} em despesas — ${
          acimaDoOrcamento ? 'acima' : 'dentro'
        } do orçamento de ${formatMoeda(orcamentoGeral.valor_limite)}.`,
      })
    } else {
      insights.push({
        icone: '🔮',
        texto: `No ritmo atual, você deve encerrar o mês com aproximadamente ${formatMoeda(projecao)} em despesas.`,
      })
    }
  }

  return insights
}
