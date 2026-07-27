'use client'

import { useTransition } from 'react'
import { deleteCiclo } from '@/actions/ciclo'
import styles from './page.module.css'

export function DeleteCicloButton({ id, descricao }: { id: string; descricao: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir o ciclo "${descricao}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteCiclo(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
