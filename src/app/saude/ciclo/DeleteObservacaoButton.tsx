'use client'

import { useTransition } from 'react'
import { deleteObservacao } from '@/actions/ciclo'
import styles from './page.module.css'

export function DeleteObservacaoButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm('Excluir esta observação? Essa ação não pode ser desfeita.')) return
    startTransition(() => {
      deleteObservacao(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
