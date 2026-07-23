import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { setMidiaStatus } from '@/actions/midias'
import { MidiaForm } from './MidiaForm'
import { DeleteMidiaButton } from './DeleteMidiaButton'
import { FiltrosBar } from './FiltrosBar'
import { TIPO_LABEL, TIPO_EMOJI, STATUS_LABEL } from './constants'
import type { Midia, MidiaStatus } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Mídias',
}

const STATUS_BADGE_CLASS: Record<MidiaStatus, string> = {
  quero_ver_ler: styles.statusQueroVerLer,
  em_andamento: styles.statusEmAndamento,
  concluido: styles.statusConcluido,
  abandonado: styles.statusAbandonado,
}

export default async function MidiasPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string
    tipo?: string
    status?: string
    genero?: string
    notaMin?: string
  }>
}) {
  const { edit, tipo, status, genero, notaMin } = await searchParams
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Busca tudo (o filtro de gênero depende de saber quais existem, e o
  // volume esperado é pequeno pra um diário pessoal) e filtra em memória.
  const { data: todasData } = await supabase
    .from('midias')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const todas = (todasData ?? []) as Midia[]
  const generosDisponiveis = Array.from(
    new Set(todas.map((m) => m.genero).filter((g): g is string => Boolean(g)))
  ).sort()

  const midias = todas.filter((m) => {
    if (tipo && m.tipo !== tipo) return false
    if (status && m.status !== status) return false
    if (genero && m.genero !== genero) return false
    if (notaMin && !(m.nota !== null && m.nota >= Number(notaMin))) return false
    return true
  })

  const editingMidia = edit ? todas.find((m) => m.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Painel
        </Link>
        <h1 className={styles.title}>Mídias</h1>
        <Link href="/midias/estatisticas" className={styles.statsLink}>
          Ver estatísticas →
        </Link>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingMidia ? 'Editar item' : 'Adicionar item'}</h2>
        <MidiaForm key={editingMidia?.id ?? 'new'} midia={editingMidia} />
      </section>

      <section className={styles.section}>
        {todas.length > 0 && (
          <FiltrosBar
            generos={generosDisponiveis}
            valores={{
              tipo: tipo ?? '',
              status: status ?? '',
              genero: genero ?? '',
              notaMin: notaMin ?? '',
            }}
          />
        )}

        {midias.length === 0 ? (
          <p className={styles.empty}>
            {todas.length === 0
              ? 'Nenhum item ainda. Adicione o primeiro acima.'
              : 'Nenhum item bate com esses filtros.'}
          </p>
        ) : (
          <ul className={styles.list}>
            {midias.map((m) => (
              <li key={m.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <span className={styles.tipoBadge}>
                    {TIPO_EMOJI[m.tipo]} {TIPO_LABEL[m.tipo]}
                  </span>
                  <span className={STATUS_BADGE_CLASS[m.status]}>{STATUS_LABEL[m.status]}</span>
                  {m.nota !== null && <span className={styles.notaBadge}>★ {m.nota}</span>}
                </div>
                <div className={styles.itemTitulo}>{m.titulo}</div>
                {(m.autor_diretor || m.genero || m.ano_lancamento) && (
                  <div className={styles.itemMeta}>
                    {[m.autor_diretor, m.genero, m.ano_lancamento].filter(Boolean).join(' · ')}
                  </div>
                )}
                {(m.temporada_atual || m.progresso || m.plataforma) && (
                  <div className={styles.itemMeta}>
                    {[
                      m.temporada_atual ? `Temporada ${m.temporada_atual}` : null,
                      m.progresso,
                      m.plataforma,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
                {m.comentario && <p className={styles.itemComentario}>{m.comentario}</p>}
                <div className={styles.itemActions}>
                  {m.status === 'quero_ver_ler' && (
                    <>
                      <form action={setMidiaStatus.bind(null, m.id, 'em_andamento')}>
                        <button type="submit" className={styles.quickBtn}>
                          Começar
                        </button>
                      </form>
                      <form action={setMidiaStatus.bind(null, m.id, 'abandonado')}>
                        <button type="submit" className={styles.quickBtn}>
                          Abandonar
                        </button>
                      </form>
                    </>
                  )}
                  {m.status === 'em_andamento' && (
                    <>
                      <form action={setMidiaStatus.bind(null, m.id, 'concluido')}>
                        <button type="submit" className={styles.quickBtn}>
                          Concluir
                        </button>
                      </form>
                      <form action={setMidiaStatus.bind(null, m.id, 'abandonado')}>
                        <button type="submit" className={styles.quickBtn}>
                          Abandonar
                        </button>
                      </form>
                    </>
                  )}
                  {(m.status === 'concluido' || m.status === 'abandonado') && (
                    <form action={setMidiaStatus.bind(null, m.id, 'em_andamento')}>
                      <button type="submit" className={styles.quickBtn}>
                        Reabrir
                      </button>
                    </form>
                  )}
                  <Link href={`/midias?edit=${m.id}`} className={styles.editLink}>
                    Editar
                  </Link>
                  <DeleteMidiaButton id={m.id} titulo={m.titulo} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
