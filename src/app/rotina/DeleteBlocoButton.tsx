'use client'

import { useTransition } from 'react'
import { deleteBloco } from '@/actions/rotina'
import styles from './page.module.css'

export function DeleteBlocoButton({ id, atividade }: { id: string; atividade: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir o bloco "${atividade}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteBloco(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
