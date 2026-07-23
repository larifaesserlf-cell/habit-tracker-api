'use client'

import { useTransition } from 'react'
import { setAreaArquivada } from '@/actions/areas'
import styles from './page.module.css'

export function ArchiveAreaButton({ id, nome }: { id: string; nome: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Arquivar a área "${nome}"? Você pode reativar depois.`)) return
    startTransition(() => {
      setAreaArquivada(id, true)
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={styles.archiveBtn}>
      Arquivar
    </button>
  )
}
