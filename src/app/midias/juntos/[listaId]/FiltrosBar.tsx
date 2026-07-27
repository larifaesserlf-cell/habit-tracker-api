'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { TIPOS, TIPO_LABEL, STATUSES, STATUS_LABEL } from '../constants'
import styles from '../page.module.css'

export function FiltrosBar({
  listaId,
  valores,
}: {
  listaId: string
  valores: { tipo: string; status: string }
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const temFiltroAtivo = Boolean(valores.tipo || valores.status)

  return (
    <form ref={formRef} method="get" className={styles.filtros}>
      <select
        name="tipo"
        defaultValue={valores.tipo}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Filtrar por tipo"
      >
        <option value="">Todos os tipos</option>
        {TIPOS.map((t) => (
          <option key={t} value={t}>
            {TIPO_LABEL[t]}
          </option>
        ))}
      </select>

      <select
        name="status"
        defaultValue={valores.status}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Filtrar por status"
      >
        <option value="">Todos os status</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      {temFiltroAtivo && (
        <Link href={`/midias/juntos/${listaId}`} className={styles.limparFiltros}>
          Limpar filtros
        </Link>
      )}
    </form>
  )
}
