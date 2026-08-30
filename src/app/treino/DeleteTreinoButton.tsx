'use client'

import { useTransition } from 'react'
import { deleteTreino } from '@/actions/treino'
import styles from './page.module.css'

export function DeleteTreinoButton({ id, descricao }: { id: string; descricao: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir o treino "${descricao}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteTreino(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
