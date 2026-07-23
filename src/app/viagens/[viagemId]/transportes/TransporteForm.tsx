'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveTransporte, type TransporteFormState } from '@/actions/transportes'
import type { Destino, Transporte } from '@/lib/supabase/types'
import styles from '../../page.module.css'

const initialState: TransporteFormState = { status: 'idle' }

export function TransporteForm({
  viagemId,
  destinos,
  transporte,
}: {
  viagemId: string
  destinos: Destino[]
  transporte: Transporte | null
}) {
  const [state, formAction, pending] = useActionState(saveTransporte, initialState)
  const router = useRouter()
  const baseHref = `/viagens/${viagemId}/transportes`

  useEffect(() => {
    if (state.status === 'success') {
      router.push(baseHref)
      router.refresh()
    }
  }, [state.status, baseHref, router])

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="viagem_id" value={viagemId} />
      {transporte && <input type="hidden" name="id" value={transporte.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="tipo">Tipo</label>
          <input
            id="tipo"
            name="tipo"
            defaultValue={transporte?.tipo ?? ''}
            placeholder="Voo, trem, ônibus, carro alugado…"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="destino_origem_id">De</label>
          <select
            id="destino_origem_id"
            name="destino_origem_id"
            defaultValue={transporte?.destino_origem_id ?? ''}
          >
            <option value="">Sem destino cadastrado</option>
            {destinos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome_cidade}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="destino_destino_id">Para</label>
          <select
            id="destino_destino_id"
            name="destino_destino_id"
            defaultValue={transporte?.destino_destino_id ?? ''}
          >
            <option value="">Sem destino cadastrado</option>
            {destinos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome_cidade}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="custo_estimado">Custo estimado</label>
          <input
            id="custo_estimado"
            name="custo_estimado"
            type="number"
            step="0.01"
            defaultValue={transporte?.custo_estimado ?? ''}
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
            defaultValue={transporte?.duracao_estimada_horas ?? ''}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="notas">Notas</label>
        <textarea
          id="notas"
          name="notas"
          defaultValue={transporte?.notas ?? ''}
          rows={2}
          placeholder="Opcional"
          className={styles.textarea}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : transporte ? 'Salvar alterações' : 'Adicionar transporte'}
        </button>
        {transporte && (
          <Link href={baseHref} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
