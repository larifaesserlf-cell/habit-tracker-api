import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>🔥</div>
          <h1 className={styles.title}>Seus hábitos</h1>
          <p className={styles.subtitle}>Logado como {user.email}</p>
        </div>

        <div className={styles.navLinks}>
          <Link href="/areas" className={styles.navLink}>
            Áreas
          </Link>
          <Link href="/habitos" className={styles.navLink}>
            Hábitos
          </Link>
          <Link href="/metas" className={styles.navLink}>
            Metas
          </Link>
        </div>

        <form action={signOut}>
          <button type="submit" className={styles.logoutBtn}>
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}
