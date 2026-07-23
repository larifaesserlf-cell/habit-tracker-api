'use client'

import { useTransition } from 'react'
import { deleteViagem } from '@/actions/viagens'
import styles from './page.module.css'

export function DeleteViagemButton({ id, nome }: { id: string; nome: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (
      !window.confirm(
        `Excluir a viagem "${nome}"? Isso também apaga todos os destinos, pontos de interesse, hospedagens e transportes vinculados. Essa ação não pode ser desfeita.`
      )
    )
      return
    startTransition(() => {
      deleteViagem(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
