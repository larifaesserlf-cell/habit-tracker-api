import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { TIPOS, TIPO_LABEL, TIPO_EMOJI } from '../constants'
import type { Midia } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Estatísticas de mídias',
}

export default async function EstatisticasPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase.from('midias').select('*').eq('user_id', user.id)
  const midias = (data ?? []) as Midia[]

  const concluidosPorTipo = Object.fromEntries(
    TIPOS.map((t) => [t, midias.filter((m) => m.tipo === t && m.status === 'concluido').length])
  ) as Record<string, number>
  const totalConcluidos = Object.values(concluidosPorTipo).reduce((a, b) => a + b, 0)

  const notas = midias.map((m) => m.nota).filter((n): n is number => n !== null)
  const notaMedia = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null

  const generoCount = new Map<string, number>()
  for (const m of midias) {
    if (!m.genero) continue
    generoCount.set(m.genero, (generoCount.get(m.genero) ?? 0) + 1)
  }
  const generosMaisFrequentes = [...generoCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/midias" className={styles.backLink}>
          ← Mídias
        </Link>
        <h1 className={styles.title}>Estatísticas</h1>
      </div>

      {midias.length === 0 ? (
        <section className={styles.card}>
          <p className={styles.empty}>
            Ainda não há dados suficientes.{' '}
            <Link href="/midias" className={styles.link}>
              Adicione itens em Mídias
            </Link>{' '}
            pra ver as estatísticas.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Concluídos por tipo</h2>
            <div className={styles.statsGrid}>
              {TIPOS.map((t) => (
                <div key={t} className={styles.statTile}>
                  <div className={styles.statTileValue}>{concluidosPorTipo[t]}</div>
                  <div className={styles.statTileLabel}>
                    {TIPO_EMOJI[t]} {TIPO_LABEL[t]}
                  </div>
                </div>
              ))}
            </div>
            <p className={styles.statTotal}>
              {totalConcluidos} concluído{totalConcluidos === 1 ? '' : 's'} de {midias.length} item
              {midias.length === 1 ? '' : 's'} cadastrado{midias.length === 1 ? '' : 's'}
            </p>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Nota média</h2>
            {notaMedia !== null ? (
              <p className={styles.notaMediaValor}>
                ★ {notaMedia.toFixed(1)}{' '}
                <span className={styles.notaMediaBase}>
                  ({notas.length} avaliaç{notas.length === 1 ? 'ão' : 'ões'})
                </span>
              </p>
            ) : (
              <p className={styles.empty}>Nenhum item avaliado ainda.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Gêneros mais frequentes</h2>
            {generosMaisFrequentes.length === 0 ? (
              <p className={styles.empty}>Nenhum gênero preenchido ainda.</p>
            ) : (
              <ol className={styles.rankList}>
                {generosMaisFrequentes.map(([genero, count], i) => (
                  <li key={genero} className={styles.rankItem}>
                    <span>
                      {i + 1}. {genero}
                    </span>
                    <span className={styles.rankCount}>{count}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  )
}
