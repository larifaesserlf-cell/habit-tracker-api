/**
 * Autenticação server-only com a Pluggy. `clientId`/`clientSecret` nunca saem
 * daqui — o resultado (`apiKey`) é o único valor que o resto do client usa.
 */

const PLUGGY_API_KEY_TTL_MS = 2 * 60 * 60 * 1000 // Pluggy expira o apiKey em ~2h

let apiKeyCache: { apiKey: string; expiraEm: number } | null = null

export async function getApiKey(): Promise<string> {
  if (apiKeyCache && apiKeyCache.expiraEm > Date.now()) {
    return apiKeyCache.apiKey
  }

  const baseUrl = process.env.PLUGGY_BASE_URL
  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET
  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error('Variáveis PLUGGY_BASE_URL/PLUGGY_CLIENT_ID/PLUGGY_CLIENT_SECRET não configuradas.')
  }

  const res = await fetch(`${baseUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  })

  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    console.error('[pluggy/auth] Corpo da resposta de erro da Pluggy:', corpo)
    throw new Error(`Falha ao autenticar na Pluggy (status ${res.status}): ${corpo}`)
  }

  const data = (await res.json()) as { apiKey: string }
  apiKeyCache = { apiKey: data.apiKey, expiraEm: Date.now() + PLUGGY_API_KEY_TTL_MS }
  return data.apiKey
}
