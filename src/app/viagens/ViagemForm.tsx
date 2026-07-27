'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveViagem, type ViagemFormState } from '@/actions/viagens'
import type { Viagem, ViagemStatus } from '@/lib/supabase/types'
import { VIAGEM_STATUSES, VIAGEM_STATUS_LABEL } from './constants'
import styles from './page.module.css'

const initialState: ViagemFormState = { status: 'idle' }

export function ViagemForm({
  viagem,
  redirectTo = '/viagens',
  cancelHref = '/viagens',
}: {
  viagem: Viagem | null
  redirectTo?: string
  cancelHref?: string
}) {
  const [state, formAction, pending] = useActionState(saveViagem, initialState)
  const router = useRouter()

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [nome, setNome] = useState(viagem?.nome ?? '')
  const [viagemStatus, setViagemStatus] = useState<ViagemStatus>(viagem?.status ?? 'quero_fazer')
  const [dataPrevistaInicio, setDataPrevistaInicio] = useState(viagem?.data_prevista_inicio ?? '')
  const [dataPrevistaFim, setDataPrevistaFim] = useState(viagem?.data_prevista_fim ?? '')
  const [orcamentoEstimado, setOrcamentoEstimado] = useState(
    viagem?.orcamento_estimado != null ? String(viagem.orcamento_estimado) : ''
  )
  const [orcamentoReal, setOrcamentoReal] = useState(
    viagem?.orcamento_real != null ? String(viagem.orcamento_real) : ''
  )
  const [notas, setNotas] = useState(viagem?.notas ?? '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra /viagens
  // (mesma tela), então sem isso a próxima viagem herdaria os valores da
  // anterior. Ajustado durante o render, não num efeito.
  const [statusAnterior, setStatusAnterior] = useState(state.status)
  if (state.status !== statusAnterior) {
    setStatusAnterior(state.status)
    if (state.status === 'success' && !viagem) {
      setNome('')
      setViagemStatus('quero_fazer')
      setDataPrevistaInicio('')
      setDataPrevistaFim('')
      setOrcamentoEstimado('')
      setOrcamentoReal('')
      setNotas('')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push(redirectTo)
      router.refresh()
    }
  }, [state.status, redirectTo, router])

  return (
    <form action={formAction} className={styles.form}>
      {viagem && <input type="hidden" name="id" value={viagem.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="nome">Nome da viagem</label>
          <input
            id="nome"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Europa 2027"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="viagem_status">Status</label>
          <select
            id="viagem_status"
            name="viagem_status"
            value={viagemStatus}
            onChange={(e) => setViagemStatus(e.target.value as ViagemStatus)}
          >
            {VIAGEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VIAGEM_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_prevista_inicio">Início previsto</label>
          <input
            id="data_prevista_inicio"
            name="data_prevista_inicio"
            type="date"
            value={dataPrevistaInicio}
            onChange={(e) => setDataPrevistaInicio(e.target.value)}
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_prevista_fim">Fim previsto</label>
          <input
            id="data_prevista_fim"
            name="data_prevista_fim"
            type="date"
            value={dataPrevistaFim}
            onChange={(e) => setDataPrevistaFim(e.target.value)}
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="orcamento_estimado">Orçamento estimado</label>
          <input
            id="orcamento_estimado"
            name="orcamento_estimado"
            type="number"
            step="0.01"
            value={orcamentoEstimado}
            onChange={(e) => setOrcamentoEstimado(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="orcamento_real">Orçamento real</label>
          <input
            id="orcamento_real"
            name="orcamento_real"
            type="number"
            step="0.01"
            value={orcamentoReal}
            onChange={(e) => setOrcamentoReal(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="viagem_notas">Notas</label>
        <textarea
          id="viagem_notas"
          name="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          placeholder="Opcional"
          className={styles.textarea}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : viagem ? 'Salvar alterações' : 'Criar viagem'}
        </button>
        {viagem && (
          <Link href={cancelHref} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
