'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveHabit, type HabitFormState } from '@/actions/habits'
import type { Area, Habit } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: HabitFormState = { status: 'idle' }

export function HabitForm({ habit, areas }: { habit: Habit | null; areas: Area[] }) {
  const [state, formAction, pending] = useActionState(saveHabit, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/habitos')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {habit && <input type="hidden" name="id" value={habit.id} />}

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
            defaultValue={habit?.nome ?? ''}
            placeholder="Ex: Beber 2L de água"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="frequencia">Frequência</label>
          <select id="frequencia" name="frequencia" defaultValue={habit?.frequencia ?? 'diario'}>
            <option value="diario">Diário</option>
            <option value="semanal">Semanal</option>
          </select>
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="area_id">Área</label>
          <select id="area_id" name="area_id" defaultValue={habit?.area_id ?? ''}>
            <option value="">Sem área</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.icone} {area.nome}
                {area.arquivada ? ' (arquivada)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : habit ? 'Salvar alterações' : 'Criar hábito'}
        </button>
        {habit && (
          <Link href="/habitos" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
