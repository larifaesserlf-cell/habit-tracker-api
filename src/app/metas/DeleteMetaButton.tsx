'use client'

import { useTransition } from 'react'
import { deleteMeta } from '@/actions/metas'
import styles from './page.module.css'

export function DeleteMetaButton({ id, titulo }: { id: string; titulo: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir a meta "${titulo}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteMeta(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
