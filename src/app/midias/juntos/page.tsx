import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BackNav } from '@/components/BackNav'
import { CriarListaForm } from './CriarListaForm'
import type { ListaWatch } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Assistir juntos',
}

export default async function ListasWatchPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // A RLS de listas_watch já filtra pra só as listas de que o usuário é
  // membro (join implícito via lista_membros) — não precisa de .eq aqui.
  const { data } = await supabase
    .from('listas_watch')
    .select('*')
    .order('created_at', { ascending: true })

  const listas = (data ?? []) as ListaWatch[]

  if (listas.length === 1) {
    redirect(`/midias/juntos/${listas[0].id}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <BackNav />
        <h1 className={styles.title}>🎬 Assistir juntos</h1>
      </div>

      {listas.length > 0 && (
        <section className={styles.section}>
          <p className={styles.empty}>Você faz parte de mais de uma lista compartilhada:</p>
          {listas.map((l) => (
            <Link key={l.id} href={`/midias/juntos/${l.id}`} className={styles.listaCard}>
              <span className={styles.listaCardNome}>{l.nome}</span>
            </Link>
          ))}
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Criar uma lista compartilhada</h2>
        <p className={styles.introText}>
          Convide outra pessoa pra sugerir, marcar e avaliar filmes e séries junto com você.
        </p>
        <CriarListaForm />
      </section>
    </div>
  )
}
