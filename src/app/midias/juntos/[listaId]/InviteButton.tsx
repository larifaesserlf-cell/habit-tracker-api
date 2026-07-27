'use client'

import { useState, useTransition } from 'react'
import { criarConvite } from '@/actions/convites'
import styles from '../page.module.css'

export function InviteButton({ listaId }: { listaId: string }) {
  const [isPending, startTransition] = useTransition()
  const [url, setUrl] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  function handleClick() {
    setErro(null)
    startTransition(async () => {
      const resultado = await criarConvite(listaId)
      if (resultado.status === 'error') {
        setErro(resultado.message)
        return
      }
      setUrl(`${window.location.origin}/convite/${resultado.token}`)
      setCopiado(false)
    })
  }

  async function handleCopiar() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiado(true)
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={isPending} className={styles.inviteBtn}>
        {isPending ? 'Gerando…' : 'Convidar alguém'}
      </button>
      {erro && (
        <p className={styles.error} role="alert">
          {erro}
        </p>
      )}
      {url && (
        <div className={styles.inviteBox}>
          <input className={styles.inviteUrl} value={url} readOnly onFocus={(e) => e.target.select()} />
          <button type="button" onClick={handleCopiar} className={styles.copyBtn}>
            {copiado ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
      )}
    </div>
  )
}
