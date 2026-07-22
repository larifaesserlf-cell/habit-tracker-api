import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Habit Tracker — Rastreie seus hábitos diários',
  description:
    'Acompanhe seus hábitos, construa streaks e mantenha sua consistência com o Habit Tracker.',
}

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <span className={styles.emoji}>🔥</span>
          <h1 className={styles.heading}>Habit Tracker</h1>
          <p className={styles.tagline}>
            Rastreie hábitos, construa streaks e transforme sua rotina.
          </p>
          <div className={styles.actions}>
            <a href="/registro" className={styles.cta}>
              Criar conta grátis →
            </a>
            <a href="/login" className={styles.ctaSecondary}>
              Já tenho conta
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
