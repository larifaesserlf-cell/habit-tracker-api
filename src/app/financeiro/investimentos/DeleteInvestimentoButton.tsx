'use client'

import { useTransition } from 'react'
import { deleteInvestimento } from '@/actions/financeiro'
import styles from '../page.module.css'

export function DeleteInvestimentoButton({ id, nomeAtivo }: { id: string; nomeAtivo: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Excluir o aporte "${nomeAtivo}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteInvestimento(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
