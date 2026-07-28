'use client'

import { useState } from 'react'
import styles from './page.module.css'

/**
 * Esconde um formulário atrás de um botão "+ Adicionar…" pra desafogar a
 * tela — só abre por padrão quando `forceOpen` é true (ex: veio de um link
 * "Editar", que precisa mostrar o formulário já preenchido). Uma vez aberto
 * manualmente, um "Cancelar" fecha de novo; em modo edição (forceOpen), quem
 * fecha é o próprio link "Cancelar" do formulário (que navega pra fora do
 * modo de edição), não este botão.
 */
export function CollapsibleSection({
  forceOpen,
  openLabel,
  children,
}: {
  forceOpen: boolean
  openLabel: string
  children: React.ReactNode
}) {
  const [manualAberto, setManualAberto] = useState(false)
  const aberto = forceOpen || manualAberto

  if (!aberto) {
    return (
      <button type="button" onClick={() => setManualAberto(true)} className={styles.addBtn}>
        {openLabel}
      </button>
    )
  }

  return (
    <div>
      {children}
      {!forceOpen && (
        <button type="button" onClick={() => setManualAberto(false)} className={styles.cancelLink}>
          Cancelar
        </button>
      )}
    </div>
  )
}
