import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { setMetaStatus } from '@/actions/metas'
import { MetaForm } from './MetaForm'
import { DeleteMetaButton } from './DeleteMetaButton'
import type { Area, Meta, MetaStatus } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Metas',
}

const TIPO_LABEL: Record<Meta['tipo'], string> = {
  curto: 'Curto prazo',
  medio: 'Médio prazo',
  longo: 'Longo prazo',
}

const STATUS_LABEL: Record<MetaStatus, string> = {
  ativa: 'Ativa',
  concluida: 'Concluída',
  abandonada: 'Abandonada',
}

const STATUS_BADGE_CLASS: Record<MetaStatus, string> = {
  ativa: styles.badgeAtiva,
  concluida: styles.badgeConcluida,
  abandonada: styles.badgeAbandonada,
}

export default async function MetasPage({
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

  const [{ data: areasData }, { data: metasData }] = await Promise.all([
    supabase.from('areas').select('*').eq('user_id', user.id).order('ordem', { ascending: true }),
    // RLS já restringe a metas cujas áreas pertencem ao usuário.
    supabase.from('metas').select('*').order('created_at', { ascending: false }),
  ])

  const areas = (areasData ?? []) as Area[]
  const areasAtivas = areas.filter((a) => !a.arquivada)
  const metas = (metasData ?? []) as Meta[]

  const metasByArea = new Map<string, Meta[]>()
  for (const meta of metas) {
    const lista = metasByArea.get(meta.area_id) ?? []
    lista.push(meta)
    metasByArea.set(meta.area_id, lista)
  }

  const editingMeta = edit ? metas.find((m) => m.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Painel
        </Link>
        <h1 className={styles.title}>Metas</h1>
      </div>

      {areasAtivas.length === 0 ? (
        <section className={styles.card}>
          <p className={styles.empty}>
            Você ainda não tem nenhuma área ativa.{' '}
            <Link href="/areas" className={styles.editLink}>
              Crie uma área
            </Link>{' '}
            antes de cadastrar metas.
          </p>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{editingMeta ? 'Editar meta' : 'Nova meta'}</h2>
          <MetaForm key={editingMeta?.id ?? 'new'} meta={editingMeta} areas={areasAtivas} />
        </section>
      )}

      {areas.map((area) => {
        const metasDaArea = metasByArea.get(area.id) ?? []
        return (
          <section key={area.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {area.icone} {area.nome}
              {area.arquivada ? ' (arquivada)' : ''}
            </h2>
            {metasDaArea.length === 0 ? (
              <p className={styles.empty}>Nenhuma meta nesta área ainda.</p>
            ) : (
              <ul className={styles.list}>
                {metasDaArea.map((meta) => (
                  <li key={meta.id} className={styles.item}>
                    <div className={styles.itemInfo}>
                      <div>
                        <div className={styles.itemNome}>{meta.titulo}</div>
                        <div className={styles.itemMeta}>
                          {TIPO_LABEL[meta.tipo]}
                          {meta.data_alvo ? ` · até ${meta.data_alvo.split('-').reverse().join('/')}` : ''}
                        </div>
                      </div>
                      <span className={STATUS_BADGE_CLASS[meta.status]}>
                        {STATUS_LABEL[meta.status]}
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      {meta.status === 'ativa' && (
                        <>
                          <form action={setMetaStatus.bind(null, meta.id, 'concluida')}>
                            <button type="submit" className={styles.quickBtn}>
                              Concluir
                            </button>
                          </form>
                          <form action={setMetaStatus.bind(null, meta.id, 'abandonada')}>
                            <button type="submit" className={styles.quickBtn}>
                              Abandonar
                            </button>
                          </form>
                        </>
                      )}
                      {meta.status !== 'ativa' && (
                        <form action={setMetaStatus.bind(null, meta.id, 'ativa')}>
                          <button type="submit" className={styles.quickBtn}>
                            Reativar
                          </button>
                        </form>
                      )}
                      <Link href={`/metas?edit=${meta.id}`} className={styles.editLink}>
                        Editar
                      </Link>
                      <DeleteMetaButton id={meta.id} titulo={meta.titulo} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
