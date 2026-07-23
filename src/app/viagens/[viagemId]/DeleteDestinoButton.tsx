'use client'

import { useTransition } from 'react'
import { deleteDestino } from '@/actions/destinos'
import styles from '../page.module.css'

export function DeleteDestinoButton({
  id,
  viagemId,
  nomeCidade,
}: {
  id: string
  viagemId: string
  nomeCidade: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (
      !window.confirm(
        `Excluir "${nomeCidade}"? Isso também apaga os pontos de interesse e hospedagens desse destino. Essa ação não pode ser desfeita.`
      )
    )
      return
    startTransition(() => {
      deleteDestino(id, viagemId)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
