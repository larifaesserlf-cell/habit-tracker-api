'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveTransporte, type TransporteFormState } from '@/actions/transportes'
import type { Destino, Transporte } from '@/lib/supabase/types'
import styles from '../../page.module.css'

const initialState: TransporteFormState = { status: 'idle' }

export function TransporteForm({
  viagemId,
  destinos,
  transporte,
}: {
  viagemId: string
  destinos: Destino[]
  transporte: Transporte | null
}) {
  const [state, formAction, pending] = useActionState(saveTransporte, initialState)
  const router = useRouter()
  const baseHref = `/viagens/${viagemId}/transportes`

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [tipo, setTipo] = useState(transporte?.tipo ?? '')
  const [destinoOrigemId, setDestinoOrigemId] = useState(transporte?.destino_origem_id ?? '')
  const [destinoDestinoId, setDestinoDestinoId] = useState(transporte?.destino_destino_id ?? '')
  const [custoEstimado, setCustoEstimado] = useState(
    transporte?.custo_estimado != null ? String(transporte.custo_estimado) : ''
  )
  const [duracaoEstimadaHoras, setDuracaoEstimadaHoras] = useState(
    transporte?.duracao_estimada_horas != null ? String(transporte.duracao_estimada_horas) : ''
  )
  const [notas, setNotas] = useState(transporte?.notas ?? '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra tela de
  // transportes (mesma tela), então sem isso o próximo transporte herdaria
  // os valores do anterior. Ajustado durante o render, não num efeito.
  const [stateAnterior, setStateAnterior] = useState(state)
  if (state !== stateAnterior) {
    setStateAnterior(state)
    if (state.status === 'success' && !transporte) {
      setTipo('')
      setDestinoOrigemId('')
      setDestinoDestinoId('')
      setCustoEstimado('')
      setDuracaoEstimadaHoras('')
      setNotas('')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push(baseHref)
      router.refresh()
    }
  }, [state.status, baseHref, router])

  // Os <select> de destino têm uma option value="" ("Sem destino
  // cadastrado"). Depois de QUALQUER submissão, o browser reseta
  // nativamente os controles do form — para <input>/<textarea> o React
  // corrige sozinho (tem um "value tracker" interno pra perceber mutação
  // externa), mas pra <select> não há essa correção automática, e o reset
  // acontece de forma assíncrona (depois do commit do React), então nem um
  // re-render nem uma remontagem por key bastam. O fix é reaplicar o valor
  // certo via ref num timeout 0, depois que o reset nativo já rodou.
  const destinoOrigemRef = useRef<HTMLSelectElement>(null)
  const destinoDestinoRef = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    const id = setTimeout(() => {
      if (destinoOrigemRef.current) destinoOrigemRef.current.value = destinoOrigemId
      if (destinoDestinoRef.current) destinoDestinoRef.current.value = destinoDestinoId
    }, 0)
    return () => clearTimeout(id)
  })

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="viagem_id" value={viagemId} />
      {transporte && <input type="hidden" name="id" value={transporte.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="tipo">Tipo</label>
          <input
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Voo, trem, ônibus, carro alugado…"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="destino_origem_id">De</label>
          <select
            ref={destinoOrigemRef}
            id="destino_origem_id"
            name="destino_origem_id"
            value={destinoOrigemId}
            onChange={(e) => setDestinoOrigemId(e.target.value)}
          >
            <option value="">Sem destino cadastrado</option>
            {destinos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome_cidade}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="destino_destino_id">Para</label>
          <select
            ref={destinoDestinoRef}
            id="destino_destino_id"
            name="destino_destino_id"
            value={destinoDestinoId}
            onChange={(e) => setDestinoDestinoId(e.target.value)}
          >
            <option value="">Sem destino cadastrado</option>
            {destinos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome_cidade}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
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
          {pending ? 'Salvando…' : transporte ? 'Salvar alterações' : 'Adicionar transporte'}
        </button>
        {transporte && (
          <Link href={baseHref} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
