'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveArea, type AreaFormState } from '@/actions/areas'
import type { Area } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: AreaFormState = { status: 'idle' }

export function AreaForm({ area }: { area: Area | null }) {
  const [state, formAction, pending] = useActionState(saveArea, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/areas')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {area && <input type="hidden" name="id" value={area.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="icone">Ícone</label>
          <input id="icone" name="icone" defaultValue={area?.icone ?? '🔥'} maxLength={4} />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="cor">Cor</label>
          <input id="cor" name="cor" type="color" defaultValue={area?.cor ?? '#7c6af7'} />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            name="nome"
            defaultValue={area?.nome ?? ''}
            placeholder="Ex: Saúde"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="ordem">Ordem</label>
          <input id="ordem" name="ordem" type="number" defaultValue={area?.ordem ?? 0} />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : area ? 'Salvar alterações' : 'Criar área'}
        </button>
        {area && (
          <Link href="/areas" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
