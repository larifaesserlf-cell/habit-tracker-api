import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ReflexaoForm } from './ReflexaoForm'
import { DeleteReflexaoButton } from './DeleteReflexaoButton'
import type { Reflexao } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Reflexões',
}

const HUMOR_EMOJI: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
}

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

function preview(texto: string, max = 220) {
  const limpo = texto.trim()
  if (limpo.length <= max) return limpo
  return limpo.slice(0, max).trimEnd() + '…'
}

export default async function ReflexoesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: reflexoesData } = await supabase
    .from('reflexoes')
    .select('*')
    .eq('user_id', user.id)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  const reflexoes = (reflexoesData ?? []) as Reflexao[]
  const editingReflexao = edit ? reflexoes.find((r) => r.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Painel
        </Link>
        <h1 className={styles.title}>Reflexões</h1>
      </div>

      <section className={styles.card}>
        <ReflexaoForm key={editingReflexao?.id ?? 'new'} reflexao={editingReflexao} />
      </section>

      <section className={styles.section}>
        {reflexoes.length === 0 ? (
          <p className={styles.empty}>Nenhuma reflexão ainda. Escreva a primeira acima.</p>
        ) : (
          <ul className={styles.list}>
            {reflexoes.map((r) => (
              <li key={r.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemData}>{formatDataBR(r.data)}</span>
                  {r.humor_opcional && (
                    <span className={styles.itemHumor}>{HUMOR_EMOJI[r.humor_opcional]}</span>
                  )}
                </div>
                <p className={styles.itemTexto}>{preview(r.texto)}</p>
                <div className={styles.itemActions}>
                  <Link href={`/reflexoes?edit=${r.id}`} className={styles.editLink}>
                    Editar
                  </Link>
                  <DeleteReflexaoButton id={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
