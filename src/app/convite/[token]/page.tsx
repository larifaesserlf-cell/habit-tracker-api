import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { redeemConvite } from '@/actions/convites'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Convite',
}

/**
 * Rota pública de resgate de convite. "Pública" aqui só no sentido de que
 * qualquer pessoa com o link pode chegar até ela — o proxy.ts já protege
 * qualquer rota fora de PUBLIC_ROUTES, então quem não estiver logado é
 * redirecionado pra /login?redirectTo=/convite/[token] automaticamente e
 * volta pra cá depois de entrar ou criar conta. Por isso, quando este
 * Server Component roda, o usuário já está autenticado.
 */
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const resultado = await redeemConvite(token)

  if (resultado.status === 'success') {
    redirect('/midias/juntos')
  }

  const MENSAGENS: Record<typeof resultado.reason, string> = {
    invalido: 'Esse link de convite não existe ou é inválido.',
    usado: 'Esse convite já foi usado. Peça pra quem te convidou gerar um novo link.',
    nao_autenticado: 'Sessão expirada. Faça login novamente e tente abrir o link de novo.',
    desconhecido: 'Não foi possível processar o convite agora. Tente novamente em instantes.',
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>🎬</div>
          <h1 className={styles.title}>Convite inválido</h1>
        </div>
        <p className={styles.message}>{MENSAGENS[resultado.reason]}</p>
        <Link href="/hoje" className={styles.backLink}>
          ← Voltar pro painel
        </Link>
      </div>
    </div>
  )
}
