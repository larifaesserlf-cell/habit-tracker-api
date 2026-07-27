'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveBloco, type RotinaFormState } from '@/actions/rotina'
import type { Area, RotinaBloco } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: RotinaFormState = { status: 'idle' }

const DIAS = [
  { valor: 0, label: 'Domingo' },
  { valor: 1, label: 'Segunda' },
  { valor: 2, label: 'Terça' },
  { valor: 3, label: 'Quarta' },
  { valor: 4, label: 'Quinta' },
  { valor: 5, label: 'Sexta' },
  { valor: 6, label: 'Sábado' },
]

export function BlocoForm({ bloco, areas }: { bloco: RotinaBloco | null; areas: Area[] }) {
  const [state, formAction, pending] = useActionState(saveBloco, initialState)
  const router = useRouter()

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [atividade, setAtividade] = useState(bloco?.atividade ?? '')
  const [diaSemana, setDiaSemana] = useState(String(bloco?.dia_semana ?? 1))
  const [horaInicio, setHoraInicio] = useState(bloco?.hora_inicio?.slice(0, 5) ?? '')
  const [horaFim, setHoraFim] = useState(bloco?.hora_fim?.slice(0, 5) ?? '')
  const [areaId, setAreaId] = useState(bloco?.area_id ?? '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra /rotina
  // (mesma tela), então sem isso o próximo bloco herdaria os valores do
  // anterior. Ajustado durante o render, não num efeito.
  const [stateAnterior, setStateAnterior] = useState(state)
  if (state !== stateAnterior) {
    setStateAnterior(state)
    if (state.status === 'success' && !bloco) {
      setAtividade('')
      setDiaSemana('1')
      setHoraInicio('')
      setHoraFim('')
      setAreaId('')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/rotina')
      router.refresh()
    }
  }, [state.status, router])

  // O <select> de área tem uma option value="" ("Sem área"). Depois de
  // QUALQUER submissão, o browser reseta nativamente os controles do form
  // — para <input>/<textarea> o React corrige sozinho (tem um "value
  // tracker" interno pra perceber mutação externa), mas pra <select> não
  // há essa correção automática, e o reset acontece de forma assíncrona
  // (depois do commit do React), então nem um re-render nem uma
  // remontagem por key bastam. O fix é reaplicar o valor certo via ref
  // num timeout 0, depois que o reset nativo já rodou.
  const areaSelectRef = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    const id = setTimeout(() => {
      if (areaSelectRef.current) areaSelectRef.current.value = areaId
    }, 0)
    return () => clearTimeout(id)
  })

  return (
    <form action={formAction} className={styles.form}>
      {bloco && <input type="hidden" name="id" value={bloco.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="atividade">Atividade</label>
          <input
            id="atividade"
            name="atividade"
            value={atividade}
            onChange={(e) => setAtividade(e.target.value)}
            placeholder="Ex: Academia"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="dia_semana">Dia</label>
          <select id="dia_semana" name="dia_semana" value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
            {DIAS.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="hora_inicio">Início</label>
          <input
            id="hora_inicio"
            name="hora_inicio"
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="hora_fim">Fim</label>
          <input
            id="hora_fim"
            name="hora_fim"
            type="time"
            value={horaFim}
            onChange={(e) => setHoraFim(e.target.value)}
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="area_id">Área (opcional)</label>
          <select ref={areaSelectRef} id="area_id" name="area_id" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Sem área</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.icone} {area.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : bloco ? 'Salvar alterações' : 'Criar bloco'}
        </button>
        {bloco && (
          <Link href="/rotina" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
