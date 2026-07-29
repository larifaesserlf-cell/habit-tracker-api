'use client'

import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ObservacaoForm } from './ObservacaoForm'
import type { ObservacaoCiclo } from '@/lib/supabase/types'
import styles from './page.module.css'

/**
 * Abre o formulário de observação num modal — tanto pra criar uma nova
 * ("+ Nova observação") quanto pra editar uma existente ("Editar"), sem
 * navegar pra outra tela.
 */
export function ObservacaoModalButton({ observacao }: { observacao?: ObservacaoCiclo | null }) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={observacao ? styles.editLink : styles.actionBtn}
      >
        {observacao ? 'Editar' : '+ Nova observação'}
      </button>

      {aberto && (
        <Modal titulo={observacao ? 'Editar observação' : 'Nova observação'} onClose={() => setAberto(false)}>
          <ObservacaoForm observacao={observacao ?? null} onSuccess={() => setAberto(false)} />
        </Modal>
      )}
    </>
  )
}
