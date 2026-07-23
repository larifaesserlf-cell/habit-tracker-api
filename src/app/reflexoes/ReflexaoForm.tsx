'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
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
  const [humor, setHumor] = useState<number | null>(reflexao?.humor_opcional ?? null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state.status !== 'success') return

    if (reflexao) {
      // Edição: volta pra listagem.
      router.push('/reflexoes')
    } else {
      // Criação: o formulário continua na tela (mesma key 'new', não
      // remonta sozinho) — limpa os campos manualmente pra próxima
      // reflexão começar em branco, sem herdar o humor da anterior.
      formRef.current?.reset()
      // Reage ao resultado assíncrono da Server Action; resetar via remount
      // (key) também limparia o formulário em caso de erro, apagando o texto
      // digitado.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHumor(null)
    }
    router.refresh()
  }, [state.status, reflexao, router])

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
      {reflexao && <input type="hidden" name="id" value={reflexao.id} />}
      <input type="hidden" name="humor_opcional" value={humor ?? ''} />

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <textarea
        name="texto"
        defaultValue={reflexao?.texto ?? ''}
        placeholder="Como foi o seu dia?"
        className={styles.textarea}
        rows={6}
        autoFocus
        required
      />

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="data">Data</label>
          <input id="data" name="data" type="date" defaultValue={reflexao?.data ?? hojeISO()} />
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
