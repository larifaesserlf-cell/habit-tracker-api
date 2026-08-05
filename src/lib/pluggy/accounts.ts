import { pluggyFetch } from './client'

export type PluggyAccount = {
  id: string
  itemId: string
  type: string // 'BANK' | 'CREDIT'
  subtype: string
  name: string
  balance: number
  currencyCode: string
}

type ContasResponse = { results: PluggyAccount[] }

export async function fetchAccounts(itemId: string): Promise<PluggyAccount[]> {
  const data = await pluggyFetch<ContasResponse>(`/accounts?itemId=${encodeURIComponent(itemId)}`)
  return data.results
}
