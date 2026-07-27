import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { setItemWatchStatus } from '@/actions/listasWatch'
import { ItemWatchForm } from './ItemWatchForm'
import { DeleteItemWatchButton } from './DeleteItemWatchButton'
import { InviteButton } from './InviteButton'
import { FiltrosBar } from './FiltrosBar'
import { TIPO_LABEL, TIPO_EMOJI, STATUS_LABEL } from '../constants'
import type { ItemWatch, ItemWatchStatus, ListaWatch, MembroLista } from '@/lib/supabase/types'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Assistir juntos',
}

const STATUS_BADGE_CLASS: Record<ItemWatchStatus, string> = {
  quero_assistir: styles.statusQueroAssistir,
  em_andamento: styles.statusEmAndamento,
  concluido: styles.statusConcluido,
}

export default async function ListaWatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ listaId: string }>
  searchParams: Promise<{ edit?: string; tipo?: string; status?: string }>
}) {
  const { listaId } = await params
  const { edit, tipo, status } = await searchParams
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // RLS já garante que só retorna a lista se o usuário for membro dela.
  const { data: lista } = await supabase
    .from('listas_watch')
    .select('*')
    .eq('id', listaId)
    .maybeSingle()

  if (!lista) {
    notFound()
  }
  const listaTyped = lista as ListaWatch

  const [{ data: itensData }, { data: membrosData }] = await Promise.all([
    supabase.from('itens_watch').select('*').eq('lista_id', listaId).order('created_at', { ascending: false }),
    supabase.rpc('membros_da_lista', { p_lista_id: listaId }),
  ])

  const todosItens = (itensData ?? []) as ItemWatch[]
  const membros = (membrosData ?? []) as MembroLista[]
  const nomePorUserId = new Map(membros.map((m) => [m.user_id, m.nome || m.email || 'Alguém']))

  const itens = todosItens.filter((i) => {
    if (tipo && i.tipo !== tipo) return false
    if (status && i.status !== status) return false
    return true
  })

  const editingItem = edit ? todosItens.find((i) => i.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/midias/juntos" className={styles.backLink}>
          ← Listas
        </Link>
        <h1 className={styles.title}>🎬 {listaTyped.nome}</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Membros</h2>
        <div className={styles.membrosRow}>
          {membros.map((m) => (
            <span key={m.user_id} className={styles.membroBadge}>
              {m.nome || m.email}
              {m.user_id === user.id ? ' (você)' : ''}
            </span>
          ))}
        </div>
        <InviteButton listaId={listaId} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingItem ? 'Editar item' : 'Adicionar item'}</h2>
        <ItemWatchForm key={editingItem?.id ?? 'new'} listaId={listaId} item={editingItem} />
      </section>

      <section className={styles.section}>
        {todosItens.length > 0 && (
          <FiltrosBar listaId={listaId} valores={{ tipo: tipo ?? '', status: status ?? '' }} />
        )}

        {itens.length === 0 ? (
          <p className={styles.empty}>
            {todosItens.length === 0
              ? 'Nenhum item ainda. Adicione o primeiro acima.'
              : 'Nenhum item bate com esses filtros.'}
          </p>
        ) : (
          <ul className={styles.list}>
            {itens.map((i) => (
              <li key={i.id} className={styles.item}>
                <div className={styles.itemRow}>
                  {i.capa_url ? (
                    <img src={i.capa_url} alt="" className={styles.itemCapa} />
                  ) : (
                    <div className={styles.itemCapaFallback}>{TIPO_EMOJI[i.tipo]}</div>
                  )}
                  <div className={styles.itemConteudo}>
                    <div className={styles.itemTop}>
                      <span className={styles.tipoBadge}>
                        {TIPO_EMOJI[i.tipo]} {TIPO_LABEL[i.tipo]}
                      </span>
                      <span className={STATUS_BADGE_CLASS[i.status]}>{STATUS_LABEL[i.status]}</span>
                      {i.nota !== null && <span className={styles.notaBadge}>★ {i.nota}</span>}
                    </div>
                    <div className={styles.itemTitulo}>
                      {i.titulo}
                      {i.ano_lancamento ? ` (${i.ano_lancamento})` : ''}
                    </div>
                    {i.comentario && <p className={styles.itemComentario}>{i.comentario}</p>}
                    <p className={styles.adicionadoPor}>
                      Adicionado por {nomePorUserId.get(i.adicionado_por) ?? 'alguém'}
                    </p>
                    <div className={styles.itemActions}>
                      {i.status === 'quero_assistir' && (
                        <form action={setItemWatchStatus.bind(null, i.id, listaId, 'em_andamento')}>
                          <button type="submit" className={styles.quickBtn}>
                            Começar
                          </button>
                        </form>
                      )}
                      {i.status === 'em_andamento' && (
                        <form action={setItemWatchStatus.bind(null, i.id, listaId, 'concluido')}>
                          <button type="submit" className={styles.quickBtn}>
                            Concluir
                          </button>
                        </form>
                      )}
                      {i.status === 'concluido' && (
                        <form action={setItemWatchStatus.bind(null, i.id, listaId, 'em_andamento')}>
                          <button type="submit" className={styles.quickBtn}>
                            Reabrir
                          </button>
                        </form>
                      )}
                      <Link href={`/midias/juntos/${listaId}?edit=${i.id}`} className={styles.editLink}>
                        Editar
                      </Link>
                      <DeleteItemWatchButton id={i.id} listaId={listaId} titulo={i.titulo} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
