'use client'

import { useEffect } from 'react'

/**
 * Registra o service worker mínimo (public/sw.js) — só o necessário pra
 * passar no critério de instalabilidade do PWA (Chrome exige um SW
 * registrado com handler de fetch), sem suporte offline completo.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((erro) => {
        console.error('[pwa] Falha ao registrar service worker:', erro)
      })
    }
  }, [])

  return null
}
