'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveReflexao, type ReflexaoFormState } from '@/actions/reflexoes'
import type { Reflexao } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: ReflexaoFormState = { status: 'idle' }

const HUMORES = [
  { valor: 1, emoji: '😞', label: 'Muito mal' },
  { valor: 2, emoji: '😕', label: 'Mal' },
  { valor: 3, emoji: '😐', label: 'Neutro' },
  { valor: 4, emoji: '🙂', label: 'Bem' },
  { valor: 5, emoji: '😄', label: 'Muito bem' },
]

/** Data de hoje no fuso do navegador (não do servidor), formato YYYY-MM-DD. */
function hojeISO() {
  const agora = new Date()
  const semFuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
  return semFuso.toISOString().slice(0, 10)
}

export function ReflexaoForm({ reflexao }: { reflexao: Reflexao | null }) {
  const [state, formAction, pending] = useActionState(saveReflexao, initialState)
  const router = useRouter()

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [texto, setTexto] = useState(reflexao?.texto ?? '')
  const [data, setData] = useState(reflexao?.data ?? hojeISO())
  const [humor, setHumor] = useState<number | null>(reflexao?.humor_opcional ?? null)

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra
  // /reflexoes (mesma tela), então sem isso a próxima reflexão herdaria o
  // texto/humor da anterior. Ajustado durante o render, não num efeito.
  const [statusAnterior, setStatusAnterior] = useState(state.status)
  if (state.status !== statusAnterior) {
    setStatusAnterior(state.status)
    if (state.status === 'success' && !reflexao) {
      setTexto('')
      setData(hojeISO())
      setHumor(null)
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/reflexoes')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {reflexao && <input type="hidden" name="id" value={reflexao.id} />}
      <input type="hidden" name="humor_opcional" value={humor ?? ''} />

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <textarea
        name="texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Como foi o seu dia?"
        className={styles.textarea}
        rows={6}
        autoFocus
        required
      />

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="data">Data</label>
          <input id="data" name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>

        <div className={styles.humorField}>
          <span className={styles.humorLabel}>Humor (opcional)</span>
          <div className={styles.humorRow}>
            {HUMORES.map((h) => (
              <button
                key={h.valor}
                type="button"
                title={h.label}
                aria-pressed={humor === h.valor}
                className={humor === h.valor ? styles.humorBtnSelected : styles.humorBtn}
                onClick={() => setHumor(humor === h.valor ? null : h.valor)}
              >
                {h.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : reflexao ? 'Salvar alterações' : 'Salvar reflexão'}
        </button>
        {reflexao && (
          <Link href="/reflexoes" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
