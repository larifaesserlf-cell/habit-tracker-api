'use client'

import { useTransition } from 'react'
import { deleteItemWatch } from '@/actions/listasWatch'
import styles from '../page.module.css'

export function DeleteItemWatchButton({
  id,
  listaId,
  titulo,
}: {
  id: string
  listaId: string
  titulo: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir "${titulo}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteItemWatch(id, listaId)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
