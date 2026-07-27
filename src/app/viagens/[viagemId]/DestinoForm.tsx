'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveDestino, type DestinoFormState } from '@/actions/destinos'
import type { Destino } from '@/lib/supabase/types'
import styles from '../page.module.css'

const initialState: DestinoFormState = { status: 'idle' }

export function DestinoForm({
  viagemId,
  destino,
  redirectTo,
  cancelHref,
}: {
  viagemId: string
  destino: Destino | null
  redirectTo?: string
  cancelHref?: string
}) {
  const [state, formAction, pending] = useActionState(saveDestino, initialState)
  const router = useRouter()
  const redirectHref = redirectTo ?? `/viagens/${viagemId}`
  const cancelHrefResolved = cancelHref ?? `/viagens/${viagemId}`

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [nomeCidade, setNomeCidade] = useState(destino?.nome_cidade ?? '')
  const [pais, setPais] = useState(destino?.pais ?? '')
  const [diasEstimados, setDiasEstimados] = useState(
    destino?.dias_estimados != null ? String(destino.dias_estimados) : ''
  )
  const [notas, setNotas] = useState(destino?.notas ?? '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra tela da
  // viagem (mesma tela), então sem isso o próximo destino herdaria os
  // valores do anterior. Ajustado durante o render, não num efeito.
  const [statusAnterior, setStatusAnterior] = useState(state.status)
  if (state.status !== statusAnterior) {
    setStatusAnterior(state.status)
    if (state.status === 'success' && !destino) {
      setNomeCidade('')
      setPais('')
      setDiasEstimados('')
      setNotas('')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push(redirectHref)
      router.refresh()
    }
  }, [state.status, redirectHref, router])

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="viagem_id" value={viagemId} />
      {destino && <input type="hidden" name="id" value={destino.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="nome_cidade">Cidade</label>
          <input
            id="nome_cidade"
            name="nome_cidade"
            value={nomeCidade}
            onChange={(e) => setNomeCidade(e.target.value)}
            placeholder="Ex: Lisboa"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="pais">País</label>
          <input id="pais" name="pais" value={pais} onChange={(e) => setPais(e.target.value)} placeholder="Opcional" />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="dias_estimados">Dias</label>
          <input
            id="dias_estimados"
            name="dias_estimados"
            type="number"
            min="0"
            value={diasEstimados}
            onChange={(e) => setDiasEstimados(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="notas">Notas</label>
        <textarea
          id="notas"
          name="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          placeholder="Opcional"
          className={styles.textarea}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : destino ? 'Salvar alterações' : 'Adicionar destino'}
        </button>
        {destino && (
          <Link href={cancelHrefResolved} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
