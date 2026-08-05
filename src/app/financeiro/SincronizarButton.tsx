'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncConnection } from '@/actions/pluggy'
import styles from './page.module.css'

export function SincronizarButton({ connectionId }: { connectionId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      await syncConnection(connectionId)
      router.refresh()
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.editLink}>
      {isPending ? 'Sincronizando…' : 'Sincronizar agora'}
    </button>
  )
}
