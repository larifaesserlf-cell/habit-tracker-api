'use client'

import { useTransition } from 'react'
import { deleteConta } from '@/actions/financeiro'
import styles from './page.module.css'

export function DeleteContaButton({ id, nome }: { id: string; nome: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (
      !window.confirm(
        `Excluir a conta "${nome}"? As transações vinculadas a ela também serão excluídas. Essa ação não pode ser desfeita.`
      )
    )
      return
    startTransition(() => {
      deleteConta(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
