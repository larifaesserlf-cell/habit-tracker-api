import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { TransporteForm } from './TransporteForm'
import { DeleteTransporteButton } from './DeleteTransporteButton'
import type { Destino, Transporte, Viagem } from '@/lib/supabase/types'
import styles from '../../page.module.css'

export const metadata: Metadata = {
  title: 'Transportes da viagem',
}

export default async function TransportesPage({
  params,
  searchParams,
}: {
  params: Promise<{ viagemId: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { viagemId } = await params
  const { edit } = await searchParams
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

  const [{ data: destinosData }, { data: transportesData }] = await Promise.all([
    supabase.from('destinos').select('*').eq('viagem_id', viagemId).order('ordem', { ascending: true }),
    supabase.from('transportes').select('*').eq('viagem_id', viagemId),
  ])

  const destinos = (destinosData ?? []) as Destino[]
  const destinoPorId = new Map(destinos.map((d) => [d.id, d]))
  const transportes = (transportesData ?? []) as Transporte[]

  // "Em sequência": ordena pela posição do destino de origem na viagem (e,
  // na falta dele, pela do destino de chegada). Não há campo de sequência
  // próprio na tabela — isso deriva da ordem dos destinos, que já existe.
  const ordemDe = (t: Transporte) => {
    const origem = t.destino_origem_id ? destinoPorId.get(t.destino_origem_id) : null
    const destinoFinal = t.destino_destino_id ? destinoPorId.get(t.destino_destino_id) : null
    return origem?.ordem ?? destinoFinal?.ordem ?? Number.POSITIVE_INFINITY
  }
  const transportesOrdenados = [...transportes].sort((a, b) => ordemDe(a) - ordemDe(b))

  const editingTransporte = edit ? transportes.find((t) => t.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href={`/viagens/${viagemId}`} className={styles.backLink}>
          ← {viagem.nome}
        </Link>
        <h1 className={styles.title}>Transportes</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {editingTransporte ? 'Editar transporte' : 'Novo transporte'}
        </h2>
        {destinos.length === 0 ? (
          <p className={styles.empty}>
            Adicione destinos à viagem antes de cadastrar transportes entre eles (ainda dá pra
            cadastrar um transporte sem destino vinculado, se preferir).
          </p>
        ) : null}
        <TransporteForm
          key={editingTransporte?.id ?? 'new'}
          viagemId={viagemId}
          destinos={destinos}
          transporte={editingTransporte}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Como se locomover nesta viagem</h2>
        {transportesOrdenados.length === 0 ? (
          <p className={styles.empty}>Nenhum transporte cadastrado ainda.</p>
        ) : (
          <ul className={styles.list}>
            {transportesOrdenados.map((t) => {
              const origem = t.destino_origem_id ? destinoPorId.get(t.destino_origem_id) : null
              const destinoFinal = t.destino_destino_id ? destinoPorId.get(t.destino_destino_id) : null
              return (
                <li key={t.id} className={styles.item}>
                  <div className={styles.itemNome}>{t.tipo}</div>
                  <div className={styles.itemMeta}>
                    {origem?.nome_cidade ?? '?'} → {destinoFinal?.nome_cidade ?? '?'}
                    {t.duracao_estimada_horas !== null ? ` · ${t.duracao_estimada_horas}h` : ''}
                    {t.custo_estimado !== null ? ` · ≈ R$ ${t.custo_estimado}` : ''}
                  </div>
                  {t.notas && <p className={styles.itemComentario}>{t.notas}</p>}
                  <div className={styles.itemActions}>
                    <Link href={`/viagens/${viagemId}/transportes?edit=${t.id}`} className={styles.editLink}>
                      Editar
                    </Link>
                    <DeleteTransporteButton id={t.id} viagemId={viagemId} tipo={t.tipo ?? 'transporte'} />
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
