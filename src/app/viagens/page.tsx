import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { setViagemStatus } from '@/actions/viagens'
import { ViagemForm } from './ViagemForm'
import { DeleteViagemButton } from './DeleteViagemButton'
import { VIAGEM_STATUS_LABEL, proximoStatusViagem } from './constants'
import type { Viagem, ViagemStatus } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Viagens',
}

const STATUS_BADGE_CLASS: Record<ViagemStatus, string> = {
  quero_fazer: styles.statusQueroFazer,
  planejando: styles.statusPlanejando,
  confirmada: styles.statusConfirmada,
  concluida: styles.statusConcluida,
}

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

export default async function ViagensPage({
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

  const { data: viagensData } = await supabase
    .from('viagens')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const viagens = (viagensData ?? []) as Viagem[]
  const editingViagem = edit ? viagens.find((v) => v.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/hoje" className={styles.backLink}>
          ← Hoje
        </Link>
        <h1 className={styles.title}>Viagens</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingViagem ? 'Editar viagem' : 'Nova viagem'}</h2>
        <ViagemForm key={editingViagem?.id ?? 'new'} viagem={editingViagem} />
      </section>

      <section className={styles.section}>
        {viagens.length === 0 ? (
          <p className={styles.empty}>Nenhuma viagem ainda. Crie a primeira acima.</p>
        ) : (
          <ul className={styles.list}>
            {viagens.map((v) => {
              const proximo = proximoStatusViagem(v.status)
              return (
                <li key={v.id} className={styles.item}>
                  <div className={styles.itemTop}>
                    <span className={STATUS_BADGE_CLASS[v.status]}>{VIAGEM_STATUS_LABEL[v.status]}</span>
                  </div>
                  <div className={styles.itemNome}>{v.nome}</div>
                  {(v.data_prevista_inicio || v.data_prevista_fim) && (
                    <div className={styles.itemMeta}>
                      {v.data_prevista_inicio ? formatDataBR(v.data_prevista_inicio) : '?'}
                      {' – '}
                      {v.data_prevista_fim ? formatDataBR(v.data_prevista_fim) : '?'}
                    </div>
                  )}
                  <div className={styles.itemActions}>
                    <Link href={`/viagens/${v.id}`} className={styles.editLink}>
                      Ver destinos →
                    </Link>
                    {proximo && (
                      <form action={setViagemStatus.bind(null, v.id, proximo)}>
                        <button type="submit" className={styles.quickBtn}>
                          Avançar pra &quot;{VIAGEM_STATUS_LABEL[proximo]}&quot;
                        </button>
                      </form>
                    )}
                    <Link href={`/viagens?edit=${v.id}`} className={styles.editLink}>
                      Editar
                    </Link>
                    <DeleteViagemButton id={v.id} nome={v.nome} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
