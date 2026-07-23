'use client'

import { useTransition } from 'react'
import { deleteTransacao } from '@/actions/financeiro'
import styles from './page.module.css'

export function DeleteTransacaoButton({ id, categoria }: { id: string; categoria: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir a transação "${categoria}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteTransacao(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
