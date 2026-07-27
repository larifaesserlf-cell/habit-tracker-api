'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { savePontoInteresse, type PontoInteresseFormState } from '@/actions/pontosInteresse'
import type { PontoInteresse, PontoInteressePrioridade, PontoInteresseStatus } from '@/lib/supabase/types'
import { PRIORIDADES, PRIORIDADE_LABEL, PONTO_STATUSES, PONTO_STATUS_LABEL } from '../../../constants'
import styles from '../../../page.module.css'

const initialState: PontoInteresseFormState = { status: 'idle' }

export function PontoInteresseForm({
  viagemId,
  destinoId,
  ponto,
}: {
  viagemId: string
  destinoId: string
  ponto: PontoInteresse | null
}) {
  const [state, formAction, pending] = useActionState(savePontoInteresse, initialState)
  const router = useRouter()
  const baseHref = `/viagens/${viagemId}/destinos/${destinoId}`

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [nome, setNome] = useState(ponto?.nome ?? '')
  const [tipo, setTipo] = useState(ponto?.tipo ?? '')
  const [prioridade, setPrioridade] = useState<PontoInteressePrioridade>(ponto?.prioridade ?? 'se_der_tempo')
  const [pontoStatus, setPontoStatus] = useState<PontoInteresseStatus>(ponto?.status ?? 'quero_ir')
  const [dataVisita, setDataVisita] = useState(ponto?.data_visita ?? '')
  const [nota, setNota] = useState(ponto?.nota != null ? String(ponto.nota) : '')
  const [custoEstimado, setCustoEstimado] = useState(
    ponto?.custo_estimado != null ? String(ponto.custo_estimado) : ''
  )
  const [duracaoEstimadaHoras, setDuracaoEstimadaHoras] = useState(
    ponto?.duracao_estimada_horas != null ? String(ponto.duracao_estimada_horas) : ''
  )
  const [link, setLink] = useState(ponto?.link ?? '')
  const [comentario, setComentario] = useState(ponto?.comentario ?? '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra tela do
  // destino (mesma tela), então sem isso o próximo ponto herdaria os
  // valores do anterior. Ajustado durante o render, não num efeito.
  const [statusAnterior, setStatusAnterior] = useState(state.status)
  if (state.status !== statusAnterior) {
    setStatusAnterior(state.status)
    if (state.status === 'success' && !ponto) {
      setNome('')
      setTipo('')
      setPrioridade('se_der_tempo')
      setPontoStatus('quero_ir')
      setDataVisita('')
      setNota('')
      setCustoEstimado('')
      setDuracaoEstimadaHoras('')
      setLink('')
      setComentario('')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push(baseHref)
      router.refresh()
    }
  }, [state.status, baseHref, router])

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="destino_id" value={destinoId} />
      {ponto && <input type="hidden" name="id" value={ponto.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Torre de Belém"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="tipo">Tipo</label>
          <input id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Museu, parque…" />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="prioridade">Prioridade</label>
          <select
            id="prioridade"
            name="prioridade"
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value as PontoInteressePrioridade)}
          >
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {PRIORIDADE_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        {ponto && (
          <div className={styles.fieldSmall}>
            <label htmlFor="ponto_status">Status</label>
            <select
              id="ponto_status"
              name="ponto_status"
              value={pontoStatus}
              onChange={(e) => setPontoStatus(e.target.value as PontoInteresseStatus)}
            >
              {PONTO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PONTO_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_visita">Data da visita</label>
          <input
            id="data_visita"
            name="data_visita"
            type="date"
            value={dataVisita}
            onChange={(e) => setDataVisita(e.target.value)}
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="nota">Nota (0-10)</label>
          <input
            id="nota"
            name="nota"
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="custo_estimado">Custo estimado</label>
          <input
            id="custo_estimado"
            name="custo_estimado"
            type="number"
            step="0.01"
            value={custoEstimado}
            onChange={(e) => setCustoEstimado(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="duracao_estimada_horas">Duração (h)</label>
          <input
            id="duracao_estimada_horas"
            name="duracao_estimada_horas"
            type="number"
            step="0.5"
            min="0"
            value={duracaoEstimadaHoras}
            onChange={(e) => setDuracaoEstimadaHoras(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="link">Link</label>
        <input id="link" name="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Opcional" />
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="comentario">Comentário</label>
        <textarea
          id="comentario"
          name="comentario"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
          placeholder="Opcional"
          className={styles.textarea}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : ponto ? 'Salvar alterações' : 'Adicionar ponto de interesse'}
        </button>
        {ponto && (
          <Link href={baseHref} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
