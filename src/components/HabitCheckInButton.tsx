'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleCheckIn } from '@/actions/habits'

/** Data de hoje no fuso do navegador (não do servidor), formato YYYY-MM-DD. */
function hojeISO() {
  const agora = new Date()
  const semFuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
  return semFuso.toISOString().slice(0, 10)
}

/**
 * Botão de check-in de hábito usado tanto em /habitos quanto em /hoje.
 * A data "de hoje" é calculada no navegador (não no servidor) pra bater
 * com o resto da tela de hoje (rotina, reflexão) e não depender do fuso
 * de onde o servidor roda. Por isso recebe uma janela de logs recentes
 * (não só o log de "hoje" do servidor) e encontra o certo aqui dentro.
 */
export function HabitCheckInButton({
  habitId,
  logsRecentes,
  doneClassName,
  pendingClassName,
}: {
  habitId: string
  logsRecentes: { data: string; status: boolean }[]
  doneClassName: string
  pendingClassName: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const hoje = hojeISO()
  const done = logsRecentes.find((l) => l.data === hoje)?.status ?? false

  function handleClick() {
    startTransition(async () => {
      await toggleCheckIn(habitId, hoje, !done)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={done ? doneClassName : pendingClassName}
    >
      {done ? '✓ Feito' : 'Marcar feito'}
    </button>
  )
}
