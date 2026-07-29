'use client'

import Link from 'next/link'
import type { Area, RotinaBloco } from '@/lib/supabase/types'
import styles from './page.module.css'

const DIAS_LABEL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function formatHora(hora: string) {
  return hora.slice(0, 5)
}

function minutosDe(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Client Component: dia da semana e horário "agora" precisam vir do fuso do
 * navegador, não do servidor. Sem compromisso hoje, o bloco inteiro some da
 * página (sem mensagem de "vazio").
 */
export function CompromissosHojeCard({
  blocos,
  areaPorId,
}: {
  blocos: RotinaBloco[]
  areaPorId: Map<string, Area>
}) {
  const agora = new Date()
  const diaSemana = agora.getDay()
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes()

  const blocosHoje = blocos
    .filter((b) => b.dia_semana === diaSemana)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  if (blocosHoje.length === 0) return null

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Compromissos do dia ({DIAS_LABEL[diaSemana]})</h2>
        <Link href="/habitos?secao=rotina" className={styles.verTudoLink}>
          Ver semana completa →
        </Link>
      </div>

      <ul className={styles.list}>
        {blocosHoje.map((b) => {
          const area = b.area_id ? areaPorId.get(b.area_id) : null
          const agoraAtivo =
            minutosAgora >= minutosDe(b.hora_inicio) && minutosAgora < minutosDe(b.hora_fim)
          return (
            <li
              key={b.id}
              className={agoraAtivo ? styles.itemAgora : styles.item}
              style={area ? { borderLeftColor: area.cor } : undefined}
            >
              <div className={styles.itemInfo}>
                <div>
                  <div className={styles.itemNome}>
                    {agoraAtivo && <span className={styles.agoraBadge}>AGORA</span>}
                    {b.atividade}
                  </div>
                  <div className={styles.itemMeta}>
                    {formatHora(b.hora_inicio)}–{formatHora(b.hora_fim)}
                    {area ? ` · ${area.icone} ${area.nome}` : ''}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
