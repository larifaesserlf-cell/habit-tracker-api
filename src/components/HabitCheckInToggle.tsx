'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCheckIn } from '@/actions/habits'
import styles from './HabitCheckInToggle.module.css'

/** Data de hoje no fuso do navegador (não do servidor), formato YYYY-MM-DD. */
function hojeISO() {
  const agora = new Date()
  const semFuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
  return semFuso.toISOString().slice(0, 10)
}

/**
 * Duas caixinhas de marcação do hábito de hoje — ✓ (feito) e ✕ (não
 * feito) — mesmo padrão tri-state da grade semanal de /habitos. Clicar na
 * opção já ativa desmarca (volta ao neutro).
 *
 * A data "de hoje" é calculada no navegador, não no servidor, pra bater
 * com o resto da tela (mesma lógica já usada antes no HabitCheckInButton).
 * Por isso recebe uma janela de logs recentes (não só o log de "hoje" do
 * servidor) e encontra o certo aqui dentro.
 */
export function HabitCheckInToggle({
  habitId,
  logsRecentes,
}: {
  habitId: string
  logsRecentes: { data: string; status: boolean }[]
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const hoje = hojeISO()
  const logHoje = logsRecentes.find((l) => l.data === hoje)
  const status = logHoje ? logHoje.status : null

  function marcar(novoStatus: boolean) {
    const proximo = status === novoStatus ? null : novoStatus
    startTransition(async () => {
      await setCheckIn(habitId, hoje, proximo)
      router.refresh()
    })
  }

  return (
    <div className={styles.group}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => marcar(true)}
        className={status === true ? styles.btnFeitoAtivo : styles.btnFeito}
        title="Marcar feito"
        aria-label="Marcar feito"
      >
        ✓
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => marcar(false)}
        className={status === false ? styles.btnNaoFeitoAtivo : styles.btnNaoFeito}
        title="Marcar não feito"
        aria-label="Marcar não feito"
      >
        ✕
      </button>
    </div>
  )
}
