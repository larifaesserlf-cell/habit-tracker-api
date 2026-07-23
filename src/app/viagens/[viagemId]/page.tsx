import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { moveDestino } from '@/actions/destinos'
import { ViagemForm } from '../ViagemForm'
import { DestinoForm } from './DestinoForm'
import { DeleteDestinoButton } from './DeleteDestinoButton'
import { VIAGEM_STATUS_LABEL } from '../constants'
import type { Destino, Viagem } from '@/lib/supabase/types'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Detalhes da viagem',
}

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

function formatMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function ViagemDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ viagemId: string }>
  searchParams: Promise<{ editViagem?: string; editDestino?: string }>
}) {
  const { viagemId } = await params
  const { editViagem, editDestino } = await searchParams
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: viagemData } = await supabase
    .from('viagens')
    .select('*')
    .eq('id', viagemId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!viagemData) {
    notFound()
  }
  const viagem = viagemData as Viagem

  const { data: destinosData } = await supabase
    .from('destinos')
    .select('*')
    .eq('viagem_id', viagemId)
    .order('ordem', { ascending: true })

  const destinos = (destinosData ?? []) as Destino[]
  const editingDestino = editDestino ? destinos.find((d) => d.id === editDestino) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/viagens" className={styles.backLink}>
          ← Viagens
        </Link>
        <h1 className={styles.title}>{viagem.nome}</h1>
        <Link href={`/viagens/${viagemId}/transportes`} className={styles.subLink}>
          Transportes →
        </Link>
      </div>

      <section className={styles.card}>
        {editViagem ? (
          <>
            <h2 className={styles.cardTitle}>Editar viagem</h2>
            <ViagemForm
              viagem={viagem}
              redirectTo={`/viagens/${viagemId}`}
              cancelHref={`/viagens/${viagemId}`}
            />
          </>
        ) : (
          <>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{VIAGEM_STATUS_LABEL[viagem.status]}</h2>
              <Link href={`/viagens/${viagemId}?editViagem=1`} className={styles.editLink}>
                Editar viagem
              </Link>
            </div>
            <div className={styles.summary}>
              {(viagem.data_prevista_inicio || viagem.data_prevista_fim) && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Período previsto</span>
                  <span className={styles.summaryValue}>
                    {viagem.data_prevista_inicio ? formatDataBR(viagem.data_prevista_inicio) : '?'}
                    {' – '}
                    {viagem.data_prevista_fim ? formatDataBR(viagem.data_prevista_fim) : '?'}
                  </span>
                </div>
              )}
              {viagem.orcamento_estimado !== null && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Orçamento estimado</span>
                  <span className={styles.summaryValue}>{formatMoeda(viagem.orcamento_estimado)}</span>
                </div>
              )}
              {viagem.orcamento_real !== null && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Orçamento real</span>
                  <span className={styles.summaryValue}>{formatMoeda(viagem.orcamento_real)}</span>
                </div>
              )}
            </div>
            {viagem.notas && <p className={styles.notas}>{viagem.notas}</p>}
          </>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingDestino ? 'Editar destino' : 'Adicionar destino'}</h2>
        <DestinoForm key={editingDestino?.id ?? 'new'} viagemId={viagemId} destino={editingDestino} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Destinos</h2>
        {destinos.length === 0 ? (
          <p className={styles.empty}>Nenhum destino ainda. Adicione o primeiro acima.</p>
        ) : (
          <ul className={styles.list}>
            {destinos.map((d, i) => (
              <li key={d.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <div>
                    <div className={styles.itemNome}>
                      {d.nome_cidade}
                      {d.pais ? `, ${d.pais}` : ''}
                    </div>
                    {d.dias_estimados !== null && (
                      <div className={styles.itemMeta}>
                        {d.dias_estimados} dia{d.dias_estimados === 1 ? '' : 's'} estimado
                        {d.dias_estimados === 1 ? '' : 's'}
                      </div>
                    )}
                  </div>
                  <div className={styles.reorderGroup}>
                    <form action={moveDestino.bind(null, d.id, viagemId, 'up')}>
                      <button type="submit" className={styles.reorderBtn} disabled={i === 0}>
                        ▲
                      </button>
                    </form>
                    <form action={moveDestino.bind(null, d.id, viagemId, 'down')}>
                      <button
                        type="submit"
                        className={styles.reorderBtn}
                        disabled={i === destinos.length - 1}
                      >
                        ▼
                      </button>
                    </form>
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <Link href={`/viagens/${viagemId}/destinos/${d.id}`} className={styles.editLink}>
                    Ver detalhes →
                  </Link>
                  <Link href={`/viagens/${viagemId}?editDestino=${d.id}`} className={styles.editLink}>
                    Editar
                  </Link>
                  <DeleteDestinoButton id={d.id} viagemId={viagemId} nomeCidade={d.nome_cidade} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
