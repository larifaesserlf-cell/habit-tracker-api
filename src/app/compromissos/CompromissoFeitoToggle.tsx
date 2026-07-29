'use client'

import { useTransition } from 'react'
import { toggleCompromissoFeito } from '@/actions/compromissos'
import styles from './page.module.css'

export function CompromissoFeitoToggle({ id, feito }: { id: string; feito: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(() => {
      toggleCompromissoFeito(id, !feito)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={feito ? styles.feitoBadgeSim : styles.feitoBadgeNao}
      title={feito ? 'Marcar como não feito' : 'Marcar como feito'}
    >
      {feito ? 'Feito' : 'Não feito'}
    </button>
  )
}
