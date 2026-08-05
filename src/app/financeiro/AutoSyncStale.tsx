'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncConnection } from '@/actions/pluggy'

const SEIS_HORAS_MS = 6 * 60 * 60 * 1000

/**
 * Não renderiza nada — só dispara sync automático pras conexões bancárias
 * com `last_sync` nulo ou mais velho que 6h, uma vez por carregamento da
 * página (o `ref` evita disparo duplo no double-invoke do StrictMode em
 * dev; `router.refresh()` não desmonta o componente, então o efeito não
 * roda de novo sozinho depois de sincronizar).
 */
export function AutoSyncStale({ conexoes }: { conexoes: { id: string; last_sync: string | null }[] }) {
  const [, startTransition] = useTransition()
  const router = useRouter()
  const jaExecutou = useRef(false)

  useEffect(() => {
    if (jaExecutou.current) return
    jaExecutou.current = true

    const agora = Date.now()
    const desatualizadas = conexoes.filter(
      (c) => !c.last_sync || agora - new Date(c.last_sync).getTime() > SEIS_HORAS_MS
    )
    if (desatualizadas.length === 0) return

    startTransition(async () => {
      await Promise.all(desatualizadas.map((c) => syncConnection(c.id)))
      router.refresh()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
