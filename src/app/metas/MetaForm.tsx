'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveMeta, type MetaFormState } from '@/actions/metas'
import type { Area, Meta } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: MetaFormState = { status: 'idle' }

export function MetaForm({ meta, areas }: { meta: Meta | null; areas: Area[] }) {
  const [state, formAction, pending] = useActionState(saveMeta, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/metas')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {meta && <input type="hidden" name="id" value={meta.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="titulo">Título</label>
          <input
            id="titulo"
            name="titulo"
            defaultValue={meta?.titulo ?? ''}
            placeholder="Ex: Correr uma meia maratona"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="area_id">Área</label>
          <select id="area_id" name="area_id" defaultValue={meta?.area_id ?? ''} required>
            <option value="" disabled>
              Selecione…
            </option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.icone} {area.nome}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="tipo">Prazo</label>
          <select id="tipo" name="tipo" defaultValue={meta?.tipo ?? 'curto'}>
            <option value="curto">Curto</option>
            <option value="medio">Médio</option>
            <option value="longo">Longo</option>
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_alvo">Data alvo</label>
          <input id="data_alvo" name="data_alvo" type="date" defaultValue={meta?.data_alvo ?? ''} />
        </div>
        {meta && (
          <div className={styles.fieldSmall}>
            <label htmlFor="meta_status">Status</label>
            <select id="meta_status" name="meta_status" defaultValue={meta.status}>
              <option value="ativa">Ativa</option>
              <option value="concluida">Concluída</option>
              <option value="abandonada">Abandonada</option>
            </select>
          </div>
        )}
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : meta ? 'Salvar alterações' : 'Criar meta'}
        </button>
        {meta && (
          <Link href="/metas" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
