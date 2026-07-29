'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

/**
 * Modal genérico pra edição/criação rápida sem sair da listagem — fecha
 * clicando fora, no × ou com Esc.
 *
 * Renderizado via portal direto no <body>: um botão que abre este modal
 * pode viver dentro de um elemento com opacity < 1 (ex: um item "pendente"
 * mais discreto) — opacity < 1 cria um novo "stacking context" em CSS, o
 * que prende um `position: fixed` descendente dentro dele, fazendo outros
 * itens da lista (fora desse stacking context) pintarem por cima do modal
 * mesmo com z-index alto. Só um portal escapa desse problema de verdade.
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

    // Trava o scroll da página por trás enquanto o modal está aberto.
    const overflowOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowOriginal
    }
  }, [onClose])

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{titulo}</h2>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
