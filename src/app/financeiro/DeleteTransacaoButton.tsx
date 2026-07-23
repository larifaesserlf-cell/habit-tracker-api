'use client'

import { useTransition } from 'react'
import { deleteTransacao, deleteTransacoesFuturas } from '@/actions/financeiro'
import type { Transacao } from '@/lib/supabase/types'
import styles from './page.module.css'

export function DeleteTransacaoButton({ transacao }: { transacao: Transacao }) {
  const [isPending, startTransition] = useTransition()
  const parcelada = transacao.total_parcelas > 1

  function handleClick() {
    if (!parcelada) {
      if (!window.confirm(`Excluir a transação "${transacao.categoria}"? Essa ação não pode ser desfeita.`))
        return
      startTransition(() => {
        deleteTransacao(transacao.id)
      })
      return
    }

    const rotulo = `${transacao.parcela_atual}/${transacao.total_parcelas}`
    const excluirFuturas = window.confirm(
      `Esta transação faz parte de uma compra parcelada (${rotulo}).\n\n` +
        'Clique OK para excluir esta parcela e as futuras da mesma compra (as já passadas não serão afetadas).\n' +
        'Clique Cancelar pra escolher excluir só esta parcela.'
    )
    if (excluirFuturas) {
      startTransition(() => {
        deleteTransacoesFuturas(transacao.compra_id, transacao.parcela_atual)
      })
      return
    }

    if (!window.confirm(`Excluir apenas a parcela ${rotulo}? Essa ação não pode ser desfeita.`)) return
    startTransition(() => {
      deleteTransacao(transacao.id)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.deleteBtn}>
      Excluir
    </button>
  )
}
