'use client'

import { useTransition } from 'react'
import { deleteReflexao } from '@/actions/reflexoes'
import styles from './page.module.css'

export function DeleteReflexaoButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm('Excluir esta reflexão? Essa ação não pode ser desfeita.')) return
    startTransition(() => {
      deleteReflexao(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
