'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createConnection } from '@/actions/pluggy'
import styles from './page.module.css'

// O widget da Pluggy acessa `window` assim que o módulo carrega — precisa
// ficar fora do SSR (o Next.js renderiza a primeira passada de qualquer
// componente no servidor, mesmo sendo 'use client').
const PluggyConnect = dynamic(() => import('react-pluggy-connect').then((m) => m.PluggyConnect), { ssr: false })

/**
 * Botão "Conectar Nubank": busca um connectToken de curta duração na nossa
 * própria API (client nunca vê clientId/clientSecret), abre o widget oficial
 * da Pluggy e, no sucesso, grava a conexão + dispara a primeira sincronização
 * via server action.
 */
export function ConnectNubankButton() {
  const [connectToken, setConnectToken] = useState<string | null>(null)
  const [carregandoToken, setCarregandoToken] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function abrirWidget() {
    setErro(null)
    setCarregandoToken(true)
    try {
      const res = await fetch('/api/pluggy/connect-token', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro ?? 'Falha ao gerar token de conexão.')
      setConnectToken(data.accessToken)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao iniciar conexão.')
    } finally {
      setCarregandoToken(false)
    }
  }

  function aoConectar(data: { item: { id: string } }) {
    setConnectToken(null)
    startTransition(async () => {
      const resultado = await createConnection(data.item.id)
      if (resultado.erro) {
        setErro(resultado.erro)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        className={styles.editLink}
        onClick={abrirWidget}
        disabled={carregandoToken || isPending}
      >
        {isPending ? 'Sincronizando…' : carregandoToken ? 'Abrindo…' : '+ Conectar Nubank'}
      </button>
      {erro && <p className={styles.empty}>{erro}</p>}
      {/* Portal pro <body>: o widget usa position:fixed pra cobrir a tela
          inteira, mas os .card da página têm backdrop-filter, que cria um
          novo containing block pra elementos fixed — sem o portal, o widget
          fica preso dentro do card em vez de abrir por cima de tudo. */}
      {connectToken &&
        createPortal(
          <PluggyConnect
            connectToken={connectToken}
            theme="dark"
            onClose={() => setConnectToken(null)}
            onSuccess={aoConectar}
          />,
          document.body
        )}
    </div>
  )
}
