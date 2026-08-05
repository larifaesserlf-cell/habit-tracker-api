import { pluggyFetch } from './client'

type ConnectTokenResponse = { accessToken: string }

/**
 * Gera um connectToken de curta duração (~30 min) pro widget Pluggy Connect
 * no client. Passar `itemId` gera um token com permissão pra atualizar/
 * reconectar esse item específico em vez de criar uma conexão nova.
 */
export async function createConnectToken(itemId?: string): Promise<string> {
  const data = await pluggyFetch<ConnectTokenResponse>('/connect_token', {
    method: 'POST',
    body: JSON.stringify(itemId ? { itemId } : {}),
  })
  return data.accessToken
}
