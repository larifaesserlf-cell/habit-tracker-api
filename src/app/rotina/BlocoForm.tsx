'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveBloco, type RotinaFormState } from '@/actions/rotina'
import type { Area, RotinaBloco } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: RotinaFormState = { status: 'idle' }

const DIAS = [
  { valor: 0, label: 'Domingo' },
  { valor: 1, label: 'Segunda' },
  { valor: 2, label: 'Terça' },
  { valor: 3, label: 'Quarta' },
  { valor: 4, label: 'Quinta' },
  { valor: 5, label: 'Sexta' },
  { valor: 6, label: 'Sábado' },
]

export function BlocoForm({ bloco, areas }: { bloco: RotinaBloco | null; areas: Area[] }) {
  const [state, formAction, pending] = useActionState(saveBloco, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/rotina')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {bloco && <input type="hidden" name="id" value={bloco.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="atividade">Atividade</label>
          <input
            id="atividade"
            name="atividade"
            defaultValue={bloco?.atividade ?? ''}
            placeholder="Ex: Academia"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="dia_semana">Dia</label>
          <select id="dia_semana" name="dia_semana" defaultValue={bloco?.dia_semana ?? 1}>
            {DIAS.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="hora_inicio">Início</label>
          <input
            id="hora_inicio"
            name="hora_inicio"
            type="time"
            defaultValue={bloco?.hora_inicio?.slice(0, 5) ?? ''}
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="hora_fim">Fim</label>
          <input
            id="hora_fim"
            name="hora_fim"
            type="time"
            defaultValue={bloco?.hora_fim?.slice(0, 5) ?? ''}
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="area_id">Área (opcional)</label>
          <select id="area_id" name="area_id" defaultValue={bloco?.area_id ?? ''}>
            <option value="">Sem área</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.icone} {area.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : bloco ? 'Salvar alterações' : 'Criar bloco'}
        </button>
        {bloco && (
          <Link href="/rotina" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
