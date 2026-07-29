'use client'

import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { TransacaoForm } from './TransacaoForm'
import { EditarCompraParceladaForm } from './EditarCompraParceladaForm'
import type { ContaFinanceira, Transacao } from '@/lib/supabase/types'
import styles from './page.module.css'

/**
 * Edição rápida de uma transação direto na listagem, num modal — sem
 * navegar pra outra tela. Detecta se a transação faz parte de uma compra
 * parcelada (total_parcelas > 1) e, se for o caso, abre a edição da compra
 * inteira (todas as parcelas) em vez de só esta linha isolada.
 */
export function EditarTransacaoButton({
  transacao,
  linhasCompra,
  contas,
  categoriasExistentes,
}: {
  transacao: Transacao
  linhasCompra: Transacao[]
  contas: ContaFinanceira[]
  categoriasExistentes: string[]
}) {
  const [aberto, setAberto] = useState(false)
  const parcelada = transacao.total_parcelas > 1

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={styles.editLink}>
        Editar
      </button>

      {aberto && (
        <Modal
          titulo={parcelada ? 'Editar compra parcelada' : 'Editar transação'}
          onClose={() => setAberto(false)}
        >
          {parcelada ? (
            <EditarCompraParceladaForm
              linhas={linhasCompra}
              contas={contas}
              categoriasExistentes={categoriasExistentes}
              onSuccess={() => setAberto(false)}
            />
          ) : (
            <TransacaoForm
              transacao={transacao}
              contas={contas}
              categoriasExistentes={categoriasExistentes}
              onSuccess={() => setAberto(false)}
            />
          )}
        </Modal>
      )}
    </>
  )
}
