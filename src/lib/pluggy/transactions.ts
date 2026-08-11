import { pluggyFetch } from './client'

export type PluggyTransaction = {
  id: string
  accountId: string
  date: string
  description: string
  amount: number
  currencyCode: string
  category: string | null
  status: string // 'POSTED' | 'PENDING'
  type: string // 'DEBIT' | 'CREDIT' — fonte confiável de receita/despesa (o sinal de `amount` varia por tipo de conta)
}

type TransacoesResponse = {
  results: PluggyTransaction[]
  next: string | null
}

/**
 * Busca as transações de uma conta via /v2/transactions, paginando por
 * cursor até `next` vir null — o endpoint antigo por page/pageSize foi
 * descontinuado pela Pluggy (410 ENDPOINT_DEPRECATED).
 *
 * `next` já vem como a query string inteira da próxima página (ex:
 * "?accountId=...&after=..."), não um token isolado pra embutir num novo
 * `after=` — por isso só concatena direto na próxima chamada.
 *
 * `dateFrom` (YYYY-MM-DD) limita a busca a partir dessa data — essencial
 * pra sync de rotina não re-paginar o histórico inteiro toda vez (isso
 * ficou lento o bastante com uso real pra estourar timeout da função
 * serverless). Omitir só faz sentido na primeira sincronização de uma
 * conta, quando ainda não existe nada salvo pra comparar.
 */
export async function fetchTransactions(accountId: string, dateFrom?: string): Promise<PluggyTransaction[]> {
  const todas: PluggyTransaction[] = []
  const params = new URLSearchParams({ accountId })
  if (dateFrom) params.set('dateFrom', dateFrom)
  let path: string | null = `/v2/transactions?${params.toString()}`

  while (path) {
    const data: TransacoesResponse = await pluggyFetch<TransacoesResponse>(path)
    todas.push(...data.results)
    path = data.next ? `/v2/transactions${data.next}` : null
  }

  return todas
}
