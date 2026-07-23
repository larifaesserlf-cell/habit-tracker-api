'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { TRANSACAO_TIPOS, TRANSACAO_TIPO_LABEL } from './constants'
import styles from './page.module.css'

export function FiltrosBar({
  categorias,
  valores,
}: {
  categorias: string[]
  valores: { tipo: string; categoria: string }
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const temFiltroAtivo = Boolean(valores.tipo || valores.categoria)

  return (
    <form ref={formRef} method="get" className={styles.filtros}>
      <select
        name="tipo"
        defaultValue={valores.tipo}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Filtrar por tipo"
      >
        <option value="">Todos os tipos</option>
        {TRANSACAO_TIPOS.map((t) => (
          <option key={t} value={t}>
            {TRANSACAO_TIPO_LABEL[t]}
          </option>
        ))}
      </select>

      <select
        name="categoria"
        defaultValue={valores.categoria}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Filtrar por categoria"
      >
        <option value="">Todas as categorias</option>
        {categorias.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {temFiltroAtivo && (
        <Link href="/financeiro" className={styles.limparFiltros}>
          Limpar filtros
        </Link>
      )}
    </form>
  )
}
