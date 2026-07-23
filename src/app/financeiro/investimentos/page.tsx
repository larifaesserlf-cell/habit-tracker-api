import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { InvestimentoForm } from './InvestimentoForm'
import { DeleteInvestimentoButton } from './DeleteInvestimentoButton'
import { TIPOS_ATIVO, TIPO_ATIVO_LABEL, formatMoeda, formatDataBR } from '../constants'
import type { Investimento } from '@/lib/supabase/types'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Investimentos',
}

export default async function InvestimentosPage({
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

  const { data: investimentosData } = await supabase
    .from('investimentos')
    .select('*')
    .eq('user_id', user.id)
    .order('data_aporte', { ascending: false })
    .order('created_at', { ascending: false })

  const investimentos = (investimentosData ?? []) as Investimento[]
  const totalAportado = investimentos.reduce((soma, i) => soma + i.valor_aportado, 0)

  const totalPorTipo = new Map<string, number>()
  for (const i of investimentos) {
    totalPorTipo.set(i.tipo_ativo, (totalPorTipo.get(i.tipo_ativo) ?? 0) + i.valor_aportado)
  }
  const tiposComAporte = TIPOS_ATIVO.filter((t) => (totalPorTipo.get(t) ?? 0) > 0)

  const editingInvestimento = edit ? investimentos.find((i) => i.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/financeiro" className={styles.backLink}>
          ← Financeiro
        </Link>
        <h1 className={styles.title}>Investimentos</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Alocação por tipo de ativo</h2>
        {investimentos.length === 0 ? (
          <p className={styles.empty}>Nenhum aporte registrado ainda.</p>
        ) : (
          <>
            <div className={styles.statsGrid}>
              {tiposComAporte.map((t) => {
                const total = totalPorTipo.get(t) ?? 0
                const pct = totalAportado > 0 ? (total / totalAportado) * 100 : 0
                return (
                  <div key={t} className={styles.statTile}>
                    <div className={styles.statTileValue}>{pct.toFixed(1)}%</div>
                    <div className={styles.statTileLabel}>
                      {TIPO_ATIVO_LABEL[t]} · {formatMoeda(total)}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className={styles.totalAportado}>Total aportado: {formatMoeda(totalAportado)}</p>
          </>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingInvestimento ? 'Editar aporte' : 'Novo aporte'}</h2>
        <InvestimentoForm key={editingInvestimento?.id ?? 'new'} investimento={editingInvestimento} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Aportes</h2>
        {investimentos.length === 0 ? (
          <p className={styles.empty}>Nenhum aporte ainda. Adicione o primeiro acima.</p>
        ) : (
          <ul className={styles.list}>
            {investimentos.map((i) => (
              <li key={i.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <span className={styles.fixoBadge}>{TIPO_ATIVO_LABEL[i.tipo_ativo]}</span>
                </div>
                <div className={styles.itemTitulo}>{i.nome_ativo}</div>
                <div className={styles.itemMeta}>
                  {formatMoeda(i.valor_aportado)} · {formatDataBR(i.data_aporte)}
                  {i.instituicao ? ` · ${i.instituicao}` : ''}
                </div>
                {i.notas && <p className={styles.itemComentario}>{i.notas}</p>}
                <div className={styles.itemActions}>
                  <Link href={`/financeiro/investimentos?edit=${i.id}`} className={styles.editLink}>
                    Editar
                  </Link>
                  <DeleteInvestimentoButton id={i.id} nomeAtivo={i.nome_ativo} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
