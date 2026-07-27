import { NextResponse, type NextRequest } from 'next/server'

type TmdbCrewMembro = { job?: string; name?: string }
type TmdbDetalhe = {
  credits?: { crew?: TmdbCrewMembro[] }
  created_by?: { name?: string }[]
}

/**
 * Busca o diretor (filme) ou criador (série) no TMDB — só chamada quando a
 * pessoa clica numa sugestão do autocomplete, já que /search/multi não traz
 * essa informação. Falha silenciosamente (autorDiretor: null) sem chave ou
 * em qualquer erro de rede.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const mediaType = searchParams.get('mediaType')
  const apiKey = process.env.TMDB_API_KEY

  if (!apiKey || !id || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return NextResponse.json({ autorDiretor: null })
  }

  try {
    const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits`
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ autorDiretor: null })
    }
    const data = (await res.json()) as TmdbDetalhe

    const diretorDoCrew = data.credits?.crew?.find((c) => c.job === 'Director')?.name ?? null
    const autorDiretor =
      mediaType === 'movie' ? diretorDoCrew : (data.created_by?.[0]?.name ?? diretorDoCrew)

    return NextResponse.json({ autorDiretor })
  } catch {
    return NextResponse.json({ autorDiretor: null })
  }
}
