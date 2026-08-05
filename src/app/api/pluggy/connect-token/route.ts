import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createConnectToken } from '@/lib/pluggy/connect'

/**
 * Gera o connectToken pro widget Pluggy Connect no client — o único valor
 * relacionado à Pluggy que o navegador chega a ver. `clientId`/`clientSecret`
 * nunca saem do servidor.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  try {
    const accessToken = await createConnectToken()
    return NextResponse.json({ accessToken })
  } catch (erro) {
    console.error('[pluggy/connect-token] Erro ao gerar connect token:', erro)
    return NextResponse.json({ erro: 'Falha ao gerar o token de conexão.' }, { status: 502 })
  }
}
