'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCheckIn } from '@/actions/habits'
import styles from './page.module.css'

/**
 * Duas caixinhas de marcação por dia: ✓ (feito) e ✕ (não feito). Clicar na
 * opção já selecionada desmarca (volta ao neutro). O ✕ só aparece em dias
 * programados pra esse hábito — em dias fora da frequência configurada só
 * o ✓ fica disponível, como uma exceção pontual (ver `calcularConclusaoDoMes`
 * em page.tsx pra como isso entra no % do mês).
 */
export function CheckInCell({
  habitId,
  date,
  status,
  scheduled,
}: {
  habitId: string
  date: string
  status: boolean | null
  scheduled: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function marcar(novoStatus: boolean) {
    const proximo = status === novoStatus ? null : novoStatus
    startTransition(async () => {
      await setCheckIn(habitId, date, proximo)
      router.refresh()
    })
  }

  return (
    <div className={styles.checkInCell}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => marcar(true)}
        className={status === true ? styles.checkBtnFeitoAtivo : styles.checkBtnFeito}
        title="Marcar feito"
        aria-label="Marcar feito"
      >
        ✓
      </button>
      {scheduled && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => marcar(false)}
          className={status === false ? styles.checkBtnNaoFeitoAtivo : styles.checkBtnNaoFeito}
          title="Marcar não feito"
          aria-label="Marcar não feito"
        >
          ✕
        </button>
      )}
    </div>
  )
}
