import { pluggyFetch } from './client'

export type PluggyItem = {
  id: string
  status: string
  connector: {
    id: number
    name: string
  }
  consentExpiresAt: string | null
}

export async function fetchItem(itemId: string): Promise<PluggyItem> {
  return pluggyFetch<PluggyItem>(`/items/${encodeURIComponent(itemId)}`)
}
