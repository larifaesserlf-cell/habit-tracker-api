import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'
import { toggleCheckIn } from '@/actions/habits'
import { setMetaStatus } from '@/actions/metas'
import { RotinaHojeCard } from './RotinaHojeCard'
import { ReflexaoHojeCard } from './ReflexaoHojeCard'
import type { Area, Habit, Meta, Reflexao, RotinaBloco } from '@/lib/supabase/types'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Hoje',
}

// Mesma convenção já usada em /habitos: a data do check-in usa o relógio do
// servidor. O dia da semana e a reflexão do dia (abaixo) usam o do
// navegador via Client Components, por serem mais sensíveis a fuso — mas
// manter o check-in consistente com /habitos evita comportamento
// divergente entre as duas telas pro mesmo botão "Marcar feito".
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

/** Metas com data_alvo mais próxima primeiro; sem data_alvo, mais recentes por último. */
function ordenarMetasFoco(metas: Meta[]): Meta[] {
  const comData = [...metas]
    .filter((m) => m.data_alvo)
    .sort((a, b) => (a.data_alvo! < b.data_alvo! ? -1 : a.data_alvo! > b.data_alvo! ? 1 : 0))
  const semData = [...metas]
    .filter((m) => !m.data_alvo)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return [...comData, ...semData].slice(0, 5)
}

export default async function HojePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [
    { data: areasData },
    { data: rotinaData },
    { data: habitsData },
    { data: metasData },
    { data: reflexoesData },
  ] = await Promise.all([
    supabase.from('areas').select('*').eq('user_id', user.id).eq('arquivada', false),
    supabase.from('rotina_diaria').select('*').eq('user_id', user.id),
    supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('metas').select('*').eq('status', 'ativa'),
    supabase
      .from('reflexoes')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const areas = (areasData ?? []) as Area[]
  const areaPorId = new Map(areas.map((a) => [a.id, a]))
  const rotina = (rotinaData ?? []) as RotinaBloco[]
  const habits = (habitsData ?? []) as Habit[]
  const metas = (metasData ?? []) as Meta[]
  const reflexoesRecentes = (reflexoesData ?? []) as Reflexao[]

  const hoje = todayISO()
  const habitIds = habits.map((h) => h.id)
  const { data: logsData } =
    habitIds.length > 0
      ? await supabase
          .from('habit_logs')
          .select('habit_id, status')
          .eq('data', hoje)
          .in('habit_id', habitIds)
      : { data: [] as { habit_id: string; status: boolean }[] }
  const statusPorHabito = new Map((logsData ?? []).map((l) => [l.habit_id, l.status]))

  const metasFoco = ordenarMetasFoco(metas)

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>🔥 Hoje</h1>
          <p className={styles.subtitle}>Logado como {user.email}</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/areas" className={styles.navLink}>
            Áreas
          </Link>
          <Link href="/habitos" className={styles.navLink}>
            Hábitos
          </Link>
          <Link href="/metas" className={styles.navLink}>
            Metas
          </Link>
          <Link href="/rotina" className={styles.navLink}>
            Rotina
          </Link>
          <Link href="/reflexoes" className={styles.navLink}>
            Reflexões
          </Link>
          <Link href="/midias" className={styles.navLink}>
            Mídias
          </Link>
        </nav>
        <form action={signOut}>
          <button type="submit" className={styles.logoutBtn}>
            Sair
          </button>
        </form>
      </div>

      <RotinaHojeCard blocos={rotina} areaPorId={areaPorId} />

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Hábitos de hoje</h2>
          <Link href="/habitos" className={styles.verTudoLink}>
            Gerenciar hábitos →
          </Link>
        </div>
        {habits.length === 0 ? (
          <p className={styles.empty}>Nenhum hábito cadastrado ainda.</p>
        ) : (
          <ul className={styles.list}>
            {habits.map((h) => {
              const done = statusPorHabito.get(h.id) ?? false
              const area = h.area_id ? areaPorId.get(h.area_id) : null
              return (
                <li key={h.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <div>
                      <div className={styles.itemNome}>{h.nome}</div>
                      <div className={styles.itemMeta}>
                        {h.frequencia === 'diario' ? 'Diário' : 'Semanal'}
                        {area ? ` · ${area.icone} ${area.nome}` : ''}
                      </div>
                    </div>
                  </div>
                  <form action={toggleCheckIn.bind(null, h.id, hoje, !done)}>
                    <button type="submit" className={done ? styles.checkDone : styles.checkPending}>
                      {done ? '✓ Feito' : 'Marcar feito'}
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Metas em foco</h2>
          <Link href="/metas" className={styles.verTudoLink}>
            Ver todas →
          </Link>
        </div>
        {metasFoco.length === 0 ? (
          <p className={styles.empty}>Nenhuma meta ativa no momento.</p>
        ) : (
          <ul className={styles.list}>
            {metasFoco.map((m) => {
              const area = areaPorId.get(m.area_id)
              return (
                <li key={m.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <div>
                      <div className={styles.itemNome}>{m.titulo}</div>
                      <div className={styles.itemMeta}>
                        {area ? `${area.icone} ${area.nome}` : ''}
                        {m.data_alvo ? ` · até ${formatDataBR(m.data_alvo)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className={styles.itemActions}>
                    <form action={setMetaStatus.bind(null, m.id, 'concluida')}>
                      <button type="submit" className={styles.quickBtn}>
                        Concluir
                      </button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ReflexaoHojeCard recentes={reflexoesRecentes} />
    </div>
  )
}
