'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

/** Data de hoje no fuso do navegador, formato YYYY-MM-DD. */
function hojeISO() {
  const agora = new Date()
  const semFuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
  return semFuso.toISOString().slice(0, 10)
}

/**
 * Encontra a reflexão de hoje (se houver) dentro das mais recentes já
 * carregadas, e usa o id dela (ou 'new') como key do formulário — isso
 * força o formulário a remontar com os valores corretos quando uma
 * reflexão nova é criada, sem precisar de reset manual de campo por campo.
 */
export function ReflexaoHojeCard({ recentes }: { recentes: Reflexao[] }) {
  const hoje = hojeISO()
  const reflexaoDeHoje = recentes.find((r) => r.data === hoje) ?? null

  return <ReflexaoHojeForm key={reflexaoDeHoje?.id ?? 'new'} reflexao={reflexaoDeHoje} hoje={hoje} />
}

function ReflexaoHojeForm({ reflexao, hoje }: { reflexao: Reflexao | null; hoje: string }) {
  const [state, formAction, pending] = useActionState(saveReflexao, initialState)
  const [humor, setHumor] = useState<number | null>(reflexao?.humor_opcional ?? null)
  const router = useRouter()

  useEffect(() => {
    // Fica na própria tela e só atualiza os dados — sem navegar pra longe,
    // seguindo a mesma lógica de fricção mínima da Fase 4.
    if (state.status === 'success') {
      router.refresh()
    }
  }, [state.status, router])

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{reflexao ? 'Sua reflexão de hoje' : 'Reflexão rápida'}</h2>
      </div>

      <form action={formAction} className={styles.form}>
        {reflexao && <input type="hidden" name="id" value={reflexao.id} />}
        <input type="hidden" name="data" value={hoje} />
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
          rows={4}
          autoFocus
          required
        />

        <div className={styles.formRow}>
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

          <button type="submit" disabled={pending} className={styles.submitBtn}>
            {pending ? 'Salvando…' : reflexao ? 'Atualizar' : 'Salvar'}
          </button>
        </div>
      </form>
    </section>
  )
}
