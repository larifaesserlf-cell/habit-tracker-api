'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { TIPOS, TIPO_LABEL, STATUSES, STATUS_LABEL } from './constants'
import styles from './page.module.css'

export function FiltrosBar({
  generos,
  valores,
}: {
  generos: string[]
  valores: { tipo: string; status: string; genero: string; notaMin: string }
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const temFiltroAtivo = Boolean(valores.tipo || valores.status || valores.genero || valores.notaMin)

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

      <select
        name="genero"
        defaultValue={valores.genero}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Filtrar por gênero"
      >
        <option value="">Todos os gêneros</option>
        {generos.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <select
        name="notaMin"
        defaultValue={valores.notaMin}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Filtrar por nota mínima"
      >
        <option value="">Qualquer nota</option>
        <option value="9">9+</option>
        <option value="8">8+</option>
        <option value="7">7+</option>
        <option value="6">6+</option>
        <option value="5">5+</option>
      </select>

      {temFiltroAtivo && (
        <Link href="/midias" className={styles.limparFiltros}>
          Limpar filtros
        </Link>
      )}
    </form>
  )
}
