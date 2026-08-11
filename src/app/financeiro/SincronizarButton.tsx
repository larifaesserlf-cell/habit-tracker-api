'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncConnection } from '@/actions/pluggy'
import styles from './page.module.css'

export function SincronizarButton({ connectionId }: { connectionId: string }) {
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  function handleClick() {
    setErro(null)
    startTransition(async () => {
      const resultado = await syncConnection(connectionId)
      if (resultado.erro) {
        setErro(resultado.erro)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={isPending} className={styles.editLink}>
        {isPending ? 'Sincronizando…' : 'Sincronizar agora'}
      </button>
      {erro && <p className={styles.empty}>{erro}</p>}
    </div>
  )
}
