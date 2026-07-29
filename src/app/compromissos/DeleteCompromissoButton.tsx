'use client'

import { useTransition } from 'react'
import { deleteCompromisso } from '@/actions/compromissos'
import styles from './page.module.css'

export function DeleteCompromissoButton({ id, atividade }: { id: string; atividade: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir o compromisso "${atividade}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteCompromisso(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
