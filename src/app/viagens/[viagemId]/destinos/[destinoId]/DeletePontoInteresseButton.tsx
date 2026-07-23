'use client'

import { useTransition } from 'react'
import { deletePontoInteresse } from '@/actions/pontosInteresse'
import styles from '../../../page.module.css'

export function DeletePontoInteresseButton({ id, nome }: { id: string; nome: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deletePontoInteresse(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
