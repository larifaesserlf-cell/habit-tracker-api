import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { setPontoStatus } from '@/actions/pontosInteresse'
import { toggleReservado } from '@/actions/hospedagens'
import { DestinoForm } from '../../DestinoForm'
import { PontoInteresseForm } from './PontoInteresseForm'
import { DeletePontoInteresseButton } from './DeletePontoInteresseButton'
import { HospedagemForm } from './HospedagemForm'
import { DeleteHospedagemButton } from './DeleteHospedagemButton'
import {
  PRIORIDADE_LABEL,
  PONTO_STATUS_LABEL,
} from '../../../constants'
import type {
  Destino,
  Hospedagem,
  PontoInteresse,
  PontoInteressePrioridade,
  Transporte,
  Viagem,
} from '@/lib/supabase/types'
import styles from '../../../page.module.css'

export const metadata: Metadata = {
  title: 'Detalhes do destino',
}

const PRIORIDADE_BADGE_CLASS: Record<PontoInteressePrioridade, string> = {
  imperdivel: styles.prioridadeImperdivel,
  se_der_tempo: styles.prioridadeSeDerTempo,
  opcional: styles.prioridadeOpcional,
}

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

export default async function DestinoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ viagemId: string; destinoId: string }>
  searchParams: Promise<{ editDestino?: string; editPonto?: string; editHospedagem?: string }>
}) {
  const { viagemId, destinoId } = await params
  const { editDestino, editPonto, editHospedagem } = await searchParams
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
  if (!viagemData) notFound()
  const viagem = viagemData as Viagem

  const { data: destinoData } = await supabase
    .from('destinos')
    .select('*')
    .eq('id', destinoId)
    .eq('viagem_id', viagemId)
    .maybeSingle()
  if (!destinoData) notFound()
  const destino = destinoData as Destino

  const [{ data: pontosData }, { data: hospedagensData }, { data: transportesData }] = await Promise.all([
    supabase
      .from('pontos_interesse')
      .select('*')
      .eq('destino_id', destinoId)
      .order('prioridade', { ascending: true }),
    supabase.from('hospedagens').select('*').eq('destino_id', destinoId),
    supabase
      .from('transportes')
      .select('*')
      .eq('viagem_id', viagemId)
      .or(`destino_origem_id.eq.${destinoId},destino_destino_id.eq.${destinoId}`),
  ])

  const pontos = (pontosData ?? []) as PontoInteresse[]
  const hospedagens = (hospedagensData ?? []) as Hospedagem[]
  const transportesDoDestino = (transportesData ?? []) as Transporte[]

  const editingPonto = editPonto ? pontos.find((p) => p.id === editPonto) ?? null : null
  const editingHospedagem = editHospedagem
    ? hospedagens.find((h) => h.id === editHospedagem) ?? null
    : null

  const baseHref = `/viagens/${viagemId}/destinos/${destinoId}`

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href={`/viagens/${viagemId}`} className={styles.backLink}>
          ← {viagem.nome}
        </Link>
        <h1 className={styles.title}>
          {destino.nome_cidade}
          {destino.pais ? `, ${destino.pais}` : ''}
        </h1>
      </div>

      <section className={styles.card}>
        {editDestino ? (
          <>
            <h2 className={styles.cardTitle}>Editar destino</h2>
            <DestinoForm
              viagemId={viagemId}
              destino={destino}
              redirectTo={baseHref}
              cancelHref={baseHref}
            />
          </>
        ) : (
          <>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Sobre o destino</h2>
              <Link href={`${baseHref}?editDestino=1`} className={styles.editLink}>
                Editar destino
              </Link>
            </div>
            {destino.dias_estimados !== null && (
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Dias estimados</span>
                  <span className={styles.summaryValue}>{destino.dias_estimados}</span>
                </div>
              </div>
            )}
            {destino.notas && <p className={styles.notas}>{destino.notas}</p>}
          </>
        )}
      </section>

      {/* ── Pontos de interesse ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {editingPonto ? 'Editar ponto de interesse' : 'Novo ponto de interesse'}
        </h2>
        <PontoInteresseForm
          key={editingPonto?.id ?? 'new'}
          viagemId={viagemId}
          destinoId={destinoId}
          ponto={editingPonto}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pontos de interesse</h2>
        {pontos.length === 0 ? (
          <p className={styles.empty}>Nenhum ponto de interesse ainda.</p>
        ) : (
          <ul className={styles.list}>
            {pontos.map((p) => (
              <li key={p.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <span className={PRIORIDADE_BADGE_CLASS[p.prioridade]}>
                    {PRIORIDADE_LABEL[p.prioridade]}
                  </span>
                  <span className={p.status === 'visitado' ? styles.pontoVisitado : styles.pontoQueroIr}>
                    {PONTO_STATUS_LABEL[p.status]}
                  </span>
                  {p.nota !== null && <span className={styles.notaBadge}>★ {p.nota}</span>}
                </div>
                <div className={styles.itemNome}>{p.nome}</div>
                {(p.tipo || p.data_visita || p.custo_estimado !== null) && (
                  <div className={styles.itemMeta}>
                    {[
                      p.tipo,
                      p.data_visita ? `visitado em ${formatDataBR(p.data_visita)}` : null,
                      p.custo_estimado !== null ? `≈ R$ ${p.custo_estimado}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
                {p.comentario && <p className={styles.itemComentario}>{p.comentario}</p>}
                {p.link && (
                  <p className={styles.itemComentario}>
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                      {p.link}
                    </a>
                  </p>
                )}
                <div className={styles.itemActions}>
                  {p.status === 'quero_ir' ? (
                    <form action={setPontoStatus.bind(null, p.id, 'visitado')}>
                      <button type="submit" className={styles.quickBtn}>
                        Marcar visitado
                      </button>
                    </form>
                  ) : (
                    <form action={setPontoStatus.bind(null, p.id, 'quero_ir')}>
                      <button type="submit" className={styles.quickBtn}>
                        Desmarcar
                      </button>
                    </form>
                  )}
                  <Link href={`${baseHref}?editPonto=${p.id}`} className={styles.editLink}>
                    Editar
                  </Link>
                  <DeletePontoInteresseButton id={p.id} nome={p.nome} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Hospedagens ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {editingHospedagem ? 'Editar hospedagem' : 'Nova hospedagem cotada'}
        </h2>
        <HospedagemForm
          key={editingHospedagem?.id ?? 'new'}
          viagemId={viagemId}
          destinoId={destinoId}
          hospedagem={editingHospedagem}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Hospedagens</h2>
        {hospedagens.length === 0 ? (
          <p className={styles.empty}>Nenhuma hospedagem cotada ainda.</p>
        ) : (
          <ul className={styles.list}>
            {hospedagens.map((h) => (
              <li key={h.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <span className={h.reservado ? styles.reservadoBadge : styles.naoReservadoBadge}>
                    {h.reservado ? 'Reservado' : 'Não reservado'}
                  </span>
                </div>
                <div className={styles.itemNome}>{h.nome}</div>
                {(h.tipo || h.regiao_bairro || h.faixa_preco) && (
                  <div className={styles.itemMeta}>
                    {[h.tipo, h.regiao_bairro, h.faixa_preco].filter(Boolean).join(' · ')}
                  </div>
                )}
                {h.link && (
                  <p className={styles.itemComentario}>
                    <a href={h.link} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                      {h.link}
                    </a>
                  </p>
                )}
                <div className={styles.itemActions}>
                  <form action={toggleReservado.bind(null, h.id, !h.reservado)}>
                    <button type="submit" className={styles.quickBtn}>
                      {h.reservado ? 'Desmarcar reserva' : 'Marcar como reservado'}
                    </button>
                  </form>
                  <Link href={`${baseHref}?editHospedagem=${h.id}`} className={styles.editLink}>
                    Editar
                  </Link>
                  <DeleteHospedagemButton id={h.id} nome={h.nome ?? 'hospedagem'} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Transportes envolvendo este destino (gerenciados na viagem) ── */}
      <section className={styles.section}>
        <div className={styles.cardHeader}>
          <h2 className={styles.sectionTitle}>Transportes</h2>
          <Link href={`/viagens/${viagemId}/transportes`} className={styles.subLink}>
            Gerenciar transportes →
          </Link>
        </div>
        {transportesDoDestino.length === 0 ? (
          <p className={styles.empty}>Nenhum transporte envolvendo este destino ainda.</p>
        ) : (
          <ul className={styles.list}>
            {transportesDoDestino.map((t) => (
              <li key={t.id} className={styles.item}>
                <div className={styles.itemNome}>{t.tipo}</div>
                <div className={styles.itemMeta}>
                  {t.destino_destino_id === destinoId ? 'Chegada neste destino' : 'Saída deste destino'}
                  {t.duracao_estimada_horas !== null ? ` · ${t.duracao_estimada_horas}h` : ''}
                  {t.custo_estimado !== null ? ` · ≈ R$ ${t.custo_estimado}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
