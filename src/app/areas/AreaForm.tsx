'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveArea, type AreaFormState } from '@/actions/areas'
import type { Area } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: AreaFormState = { status: 'idle' }

// Paleta fixa em vez do seletor nativo do navegador (mais previsível e
// combina com o resto do app). "Roxo" é o mesmo tom usado nos botões e
// destaques da UI, então é o padrão pra área nova.
const CORES = [
  { valor: '#7c6af7', nome: 'Roxo' },
  { valor: '#f87171', nome: 'Vermelho' },
  { valor: '#fb923c', nome: 'Laranja' },
  { valor: '#fbbf24', nome: 'Âmbar' },
  { valor: '#4ade80', nome: 'Verde' },
  { valor: '#2dd4bf', nome: 'Turquesa' },
  { valor: '#38bdf8', nome: 'Azul' },
  { valor: '#f472b6', nome: 'Rosa' },
  { valor: '#a78bfa', nome: 'Lilás' },
  { valor: '#94a3b8', nome: 'Cinza' },
]

export function AreaForm({ area }: { area: Area | null }) {
  const [state, formAction, pending] = useActionState(saveArea, initialState)
  const [cor, setCor] = useState(area?.cor ?? CORES[0].valor)
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
        <div className={styles.field}>
          <label>Cor</label>
          <input type="hidden" name="cor" value={cor} />
          <div className={styles.corRow}>
            {CORES.map((c) => (
              <button
                key={c.valor}
                type="button"
                title={c.nome}
                aria-pressed={cor === c.valor}
                className={cor === c.valor ? styles.corSwatchSelected : styles.corSwatch}
                style={{ background: c.valor }}
                onClick={() => setCor(c.valor)}
              />
            ))}
          </div>
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
