'use client'

import { useTransition } from 'react'
import { deleteHabit } from '@/actions/habits'
import styles from './page.module.css'

export function DeleteHabitButton({ id, nome }: { id: string; nome: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Tem certeza que deseja excluir o hábito "${nome}"? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteHabit(id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
