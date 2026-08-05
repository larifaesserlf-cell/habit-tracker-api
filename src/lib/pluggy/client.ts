import { getApiKey } from './auth'

export class PluggyError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly corpo?: string
  ) {
    super(message)
    this.name = 'PluggyError'
  }
}

/**
 * Wrapper de fetch pra API da Pluggy — injeta o `X-API-KEY` e nunca loga
 * corpo de request/response (pode conter dado bancário sensível).
 */
export async function pluggyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.PLUGGY_BASE_URL
  if (!baseUrl) {
    throw new Error('PLUGGY_BASE_URL não configurada.')
  }
  const apiKey = await getApiKey()

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      ...init?.headers,
    },
  })

  if (!res.ok) {
    // Corpo de resposta de erro só traz metadados do próprio erro (mensagem/
    // código), nunca dado bancário — a requisição falhou antes de retornar
    // conta/transação nenhuma. Seguro incluir no log e na mensagem.
    const corpo = await res.text().catch(() => '')
    console.error(`[pluggy/client] Erro ${res.status} em ${path}:`, corpo)
    throw new PluggyError(`Pluggy respondeu ${res.status} em ${path}: ${corpo}`, res.status, corpo)
  }

  return res.json() as Promise<T>
}
