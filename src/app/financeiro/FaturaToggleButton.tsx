'use client'

import { useTransition } from 'react'
import { marcarFaturaPaga } from '@/actions/financeiro'
import type { StatusPagamento } from '@/lib/supabase/types'
import styles from './page.module.css'

export function FaturaToggleButton({
  contaId,
  dataFatura,
  todasPagas,
}: {
  contaId: string
  dataFatura: string
  todasPagas: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const proximoStatus: StatusPagamento = todasPagas ? 'pendente' : 'pago'

  function handleClick() {
    startTransition(() => {
      marcarFaturaPaga(contaId, dataFatura, proximoStatus)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.faturaToggleBtn}>
      {todasPagas ? 'Marcar fatura como pendente' : 'Marcar fatura como paga'}
    </button>
  )
}
