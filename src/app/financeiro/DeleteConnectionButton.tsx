'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteConnection } from '@/actions/pluggy'
import styles from './page.module.css'

export function DeleteConnectionButton({ id, institutionName }: { id: string; institutionName: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (
      !window.confirm(
        `Desconectar "${institutionName}"? As contas e transações importadas dessa conexão também serão excluídas. Essa ação não pode ser desfeita.`
      )
    )
      return
    startTransition(async () => {
      await deleteConnection(id)
      router.refresh()
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Desconectar
    </button>
  )
}
