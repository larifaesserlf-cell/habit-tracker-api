'use client'

import { useTransition } from 'react'
import { deleteMidia } from '@/actions/midias'
import styles from './page.module.css'

export function DeleteMidiaButton({ id, titulo }: { id: string; titulo: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir "${titulo}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteMidia(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
