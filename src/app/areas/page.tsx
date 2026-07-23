import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { setAreaArquivada } from '@/actions/areas'
import { AreaForm } from './AreaForm'
import type { Area } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Áreas',
}

export default async function AreasPage({
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

  const { data: areas } = await supabase
    .from('areas')
    .select('*')
    .eq('user_id', user.id)
    .order('ordem', { ascending: true })

  const todasAreas = (areas ?? []) as Area[]
  const ativas = todasAreas.filter((a) => !a.arquivada)
  const arquivadas = todasAreas.filter((a) => a.arquivada)
  const editingArea = edit ? todasAreas.find((a) => a.id === edit) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/hoje" className={styles.backLink}>
          ← Painel
        </Link>
        <h1 className={styles.title}>Áreas</h1>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{editingArea ? 'Editar área' : 'Nova área'}</h2>
        <AreaForm key={editingArea?.id ?? 'new'} area={editingArea} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Suas áreas</h2>
        {ativas.length === 0 && (
          <p className={styles.empty}>Nenhuma área ainda. Crie a primeira acima.</p>
        )}
        <ul className={styles.list}>
          {ativas.map((area) => (
            <li key={area.id} className={styles.item}>
              <div className={styles.itemInfo}>
                <span className={styles.swatch} style={{ background: area.cor }} />
                <span className={styles.itemNome}>
                  {area.icone} {area.nome}
                </span>
              </div>
              <div className={styles.itemActions}>
                <Link href={`/areas?edit=${area.id}`} className={styles.editLink}>
                  Editar
                </Link>
                <form action={setAreaArquivada.bind(null, area.id, true)}>
                  <button type="submit" className={styles.archiveBtn}>
                    Arquivar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {arquivadas.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Arquivadas</h2>
          <ul className={styles.list}>
            {arquivadas.map((area) => (
              <li key={area.id} className={`${styles.item} ${styles.itemArchived}`}>
                <div className={styles.itemInfo}>
                  <span className={styles.swatch} style={{ background: area.cor }} />
                  <span className={styles.itemNome}>
                    {area.icone} {area.nome}
                  </span>
                </div>
                <form action={setAreaArquivada.bind(null, area.id, false)}>
                  <button type="submit" className={styles.editLink}>
                    Reativar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
