import { NextResponse, type NextRequest } from 'next/server'

export type SugestaoMidia = {
  titulo: string
  ano: number | null
  autorDiretor: string | null
  capaUrl: string | null
  tmdbId?: number
  tmdbMediaType?: 'movie' | 'tv'
}

type GoogleBooksItem = {
  volumeInfo?: {
    title?: string
    authors?: string[]
    publishedDate?: string
    imageLinks?: { thumbnail?: string }
  }
}

type TmdbResultado = {
  media_type?: string
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  id?: number
}

/**
 * Busca sugestões de autocomplete pra mídias: Google Books pra livros (sem
 * chave necessária), TMDB pra filme/série (precisa de TMDB_API_KEY — se não
 * configurada, retorna lista vazia silenciosamente em vez de dar erro).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const q = (searchParams.get('q') ?? '').trim()

  if (q.length < 3) {
    return NextResponse.json({ sugestoes: [] })
  }

  try {
    if (tipo === 'livro') {
      return NextResponse.json({ sugestoes: await buscarGoogleBooks(q) })
    }
    if (tipo === 'filme' || tipo === 'serie') {
      const apiKey = process.env.TMDB_API_KEY
      if (!apiKey) {
        return NextResponse.json({ sugestoes: [] })
      }
      return NextResponse.json({ sugestoes: await buscarTmdb(q, apiKey) })
    }
    return NextResponse.json({ sugestoes: [] })
  } catch (erro) {
    // Qualquer falha de rede/parsing não deve quebrar o formulário —
    // só não mostra sugestões dessa vez. Loga pra investigação (logs da
    // Vercel), mas nunca propaga o erro pro cliente.
    console.error('[midias/buscar] Erro inesperado:', erro)
    return NextResponse.json({ sugestoes: [] })
  }
}

async function buscarGoogleBooks(q: string): Promise<SugestaoMidia[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  const params = new URLSearchParams({ q, maxResults: '6' })
  if (apiKey) params.set('key', apiKey)
  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`

  const res = await fetch(url)
  if (!res.ok) {
    // Sem uma GOOGLE_BOOKS_API_KEY, o Google aplica cota zero pra tráfego
    // anônimo (429 "Queries per day" com quota_limit_value "0") — loga o
    // status/corpo aqui pra isso ficar visível nos logs da Vercel em vez de
    // virar silenciosamente "nenhuma sugestão" sem explicação nenhuma.
    const corpo = await res.text().catch(() => '')
    console.error(`[midias/buscar] Google Books API retornou ${res.status}:`, corpo.slice(0, 500))
    return []
  }
  const data = (await res.json()) as { items?: GoogleBooksItem[] }
  const items = data.items ?? []

  return items.map((item) => {
    const info = item.volumeInfo ?? {}
    const anoTexto = info.publishedDate?.slice(0, 4)
    const ano = anoTexto ? Number.parseInt(anoTexto, 10) : NaN
    return {
      titulo: info.title ?? 'Sem título',
      ano: Number.isFinite(ano) ? ano : null,
      autorDiretor: info.authors && info.authors.length > 0 ? info.authors.join(', ') : null,
      // Google Books às vezes serve a imagem por http — troca por https pra
      // não dar mixed-content na página servida em https. Livros sem capa
      // disponível continuam na lista, só com capaUrl null (não são
      // descartados do resultado).
      capaUrl: info.imageLinks?.thumbnail ? info.imageLinks.thumbnail.replace(/^http:/, 'https:') : null,
    }
  })
}

async function buscarTmdb(q: string, apiKey: string): Promise<SugestaoMidia[]> {
  const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(q)}&api_key=${apiKey}&language=pt-BR`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = (await res.json()) as { results?: TmdbResultado[] }
  const resultados = data.results ?? []

  return resultados
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 6)
    .map((r) => {
      const dataLancamento = r.release_date || r.first_air_date || ''
      const ano = dataLancamento ? Number.parseInt(dataLancamento.slice(0, 4), 10) : NaN
      return {
        titulo: r.title || r.name || 'Sem título',
        ano: Number.isFinite(ano) ? ano : null,
        // /search/multi não traz diretor/criador — isso é buscado à parte
        // (via /api/midias/detalhe) só quando a sugestão é escolhida.
        autorDiretor: null,
        capaUrl: r.poster_path ? `https://image.tmdb.org/t/p/w200${r.poster_path}` : null,
        tmdbId: r.id,
        tmdbMediaType: r.media_type as 'movie' | 'tv',
      }
    })
}
