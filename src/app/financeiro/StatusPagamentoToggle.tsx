'use client'

import { useTransition } from 'react'
import { toggleStatusPagamento } from '@/actions/financeiro'
import type { StatusPagamento } from '@/lib/supabase/types'
import styles from './page.module.css'

export function StatusPagamentoToggle({ id, status }: { id: string; status: StatusPagamento }) {
  const [isPending, startTransition] = useTransition()
  const proximoStatus: StatusPagamento = status === 'pago' ? 'pendente' : 'pago'

  function handleClick() {
    startTransition(() => {
      toggleStatusPagamento(id, proximoStatus)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={status === 'pago' ? styles.statusBadgePago : styles.statusBadgePendente}
      title={proximoStatus === 'pago' ? 'Marcar como pago' : 'Marcar como pendente'}
    >
      {status === 'pago' ? 'Pago' : 'Pendente'}
    </button>
  )
}
