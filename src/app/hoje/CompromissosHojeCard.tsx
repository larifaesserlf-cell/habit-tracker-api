'use client'

import Link from 'next/link'
import type { Area, Compromisso } from '@/lib/supabase/types'
import { labelArea } from '@/lib/areaLabel'
import styles from './page.module.css'

const DIAS_LABEL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function formatHora(hora: string) {
  return hora.slice(0, 5)
}

function minutosDe(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Data de hoje no fuso do navegador, em "YYYY-MM-DD" (não usa
 *  toISOString(), que é UTC e pode cair no dia errado perto da meia-noite). */
function hojeLocalISO(agora: Date): string {
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/**
 * Client Component: dia da semana e horário "agora" precisam vir do fuso do
 * navegador, não do servidor. Sem compromisso hoje, o bloco inteiro some da
 * página (sem mensagem de "vazio").
 */
export function CompromissosHojeCard({
  compromissos,
  areaPorId,
}: {
  compromissos: Compromisso[]
  areaPorId: Map<string, Area>
}) {
  const agora = new Date()
  const hoje = hojeLocalISO(agora)
  const diaSemana = agora.getDay()
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes()

  const compromissosHoje = compromissos
    .filter((c) => c.data === hoje)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  if (compromissosHoje.length === 0) return null

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Compromissos do dia ({DIAS_LABEL[diaSemana]})</h2>
        <Link href="/habitos?secao=compromissos" className={styles.verTudoLink}>
          Ver todos →
        </Link>
      </div>

      <ul className={styles.list}>
        {compromissosHoje.map((c) => {
          const area = c.area_id ? areaPorId.get(c.area_id) : null
          const agoraAtivo =
            minutosAgora >= minutosDe(c.hora_inicio) && minutosAgora < minutosDe(c.hora_fim)
          return (
            <li
              key={c.id}
              className={agoraAtivo ? styles.itemAgora : styles.item}
              style={area ? { borderLeftColor: area.cor } : undefined}
            >
              <div className={styles.itemInfo}>
                <div>
                  <div className={styles.itemNome}>
                    {agoraAtivo && <span className={styles.agoraBadge}>AGORA</span>}
                    {c.atividade}
                  </div>
                  <div className={styles.itemMeta}>
                    {formatHora(c.hora_inicio)}–{formatHora(c.hora_fim)}
                    {area ? ` · ${labelArea(area)}` : ''}
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
