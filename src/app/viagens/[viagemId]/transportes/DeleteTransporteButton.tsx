'use client'

import { useTransition } from 'react'
import { deleteTransporte } from '@/actions/transportes'
import styles from '../../page.module.css'

export function DeleteTransporteButton({
  id,
  viagemId,
  tipo,
}: {
  id: string
  viagemId: string
  tipo: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir o transporte "${tipo}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteTransporte(id, viagemId)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
