'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './page.module.css'

/**
 * Modal genérico pra edição rápida sem sair da listagem — fecha clicando
 * fora, no × ou com Esc.
 *
 * Renderizado via portal direto no <body>: o botão "Editar" que abre este
 * modal vive dentro de um <li> de transação pendente, que tem opacity < 1
 * (pra ficar visualmente mais discreta) — opacity < 1 cria um novo
 * "stacking context" em CSS, o que prende um `position: fixed` descendente
 * dentro dele, fazendo outros itens da lista (fora desse stacking context)
 * pintarem por cima do modal mesmo com z-index alto. Só um portal escapa
 * desse problema de verdade.
 */
export function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string
  onClose: () => void
  children: React.ReactNode
}) {
  // Sem gate de "montado": este componente só existe atrás de
  // `{aberto && <Modal>}`, ou seja, só é criado depois de um clique — nunca
  // durante o render inicial no servidor — então `document` já está sempre
  // disponível na primeira renderização dele.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', aoTeclar)

    // Trava o scroll da página por trás enquanto o modal está aberto —
    // sem isso, com a lista de transações comprida, o navegador tenta
    // rolar a página de fundo pra "trazer o botão pra vista" (o elemento
    // já está sempre visível, por ser position:fixed, mas o algoritmo de
    // scroll nativo não sabe disso), o que pode deixar conteúdo de trás
    // temporariamente sobreposto ao clique.
    const overflowOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowOriginal
    }
  }, [onClose])

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.cardTitle}>{titulo}</h2>
          <button type="button" onClick={onClose} className={styles.modalCloseBtn} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
