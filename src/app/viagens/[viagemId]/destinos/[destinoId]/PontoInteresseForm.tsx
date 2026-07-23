'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { savePontoInteresse, type PontoInteresseFormState } from '@/actions/pontosInteresse'
import type { PontoInteresse } from '@/lib/supabase/types'
import { PRIORIDADES, PRIORIDADE_LABEL, PONTO_STATUSES, PONTO_STATUS_LABEL } from '../../../constants'
import styles from '../../../page.module.css'

const initialState: PontoInteresseFormState = { status: 'idle' }

export function PontoInteresseForm({
  viagemId,
  destinoId,
  ponto,
}: {
  viagemId: string
  destinoId: string
  ponto: PontoInteresse | null
}) {
  const [state, formAction, pending] = useActionState(savePontoInteresse, initialState)
  const router = useRouter()
  const baseHref = `/viagens/${viagemId}/destinos/${destinoId}`

  useEffect(() => {
    if (state.status === 'success') {
      router.push(baseHref)
      router.refresh()
    }
  }, [state.status, baseHref, router])

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="destino_id" value={destinoId} />
      {ponto && <input type="hidden" name="id" value={ponto.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            name="nome"
            defaultValue={ponto?.nome ?? ''}
            placeholder="Ex: Torre de Belém"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="tipo">Tipo</label>
          <input id="tipo" name="tipo" defaultValue={ponto?.tipo ?? ''} placeholder="Museu, parque…" />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="prioridade">Prioridade</label>
          <select id="prioridade" name="prioridade" defaultValue={ponto?.prioridade ?? 'se_der_tempo'}>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {PRIORIDADE_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        {ponto && (
          <div className={styles.fieldSmall}>
            <label htmlFor="ponto_status">Status</label>
            <select id="ponto_status" name="ponto_status" defaultValue={ponto.status}>
              {PONTO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PONTO_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_visita">Data da visita</label>
          <input id="data_visita" name="data_visita" type="date" defaultValue={ponto?.data_visita ?? ''} />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="nota">Nota (0-10)</label>
          <input
            id="nota"
            name="nota"
            type="number"
            min="0"
            max="10"
            step="0.1"
            defaultValue={ponto?.nota ?? ''}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="custo_estimado">Custo estimado</label>
          <input
            id="custo_estimado"
            name="custo_estimado"
            type="number"
            step="0.01"
            defaultValue={ponto?.custo_estimado ?? ''}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="duracao_estimada_horas">Duração (h)</label>
          <input
            id="duracao_estimada_horas"
            name="duracao_estimada_horas"
            type="number"
            step="0.5"
            min="0"
            defaultValue={ponto?.duracao_estimada_horas ?? ''}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="link">Link</label>
        <input id="link" name="link" defaultValue={ponto?.link ?? ''} placeholder="Opcional" />
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="comentario">Comentário</label>
        <textarea
          id="comentario"
          name="comentario"
          defaultValue={ponto?.comentario ?? ''}
          rows={2}
          placeholder="Opcional"
          className={styles.textarea}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : ponto ? 'Salvar alterações' : 'Adicionar ponto de interesse'}
        </button>
        {ponto && (
          <Link href={baseHref} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
