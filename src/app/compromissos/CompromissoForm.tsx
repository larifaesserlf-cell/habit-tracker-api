'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveCompromisso, type CompromissoFormState } from '@/actions/compromissos'
import type { Area, Compromisso } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: CompromissoFormState = { status: 'idle' }

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function CompromissoForm({ compromisso, areas }: { compromisso: Compromisso | null; areas: Area[] }) {
  const [state, formAction, pending] = useActionState(saveCompromisso, initialState)
  const router = useRouter()

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [atividade, setAtividade] = useState(compromisso?.atividade ?? '')
  const [data, setData] = useState(compromisso?.data ?? hojeISO())
  const [horaInicio, setHoraInicio] = useState(compromisso?.hora_inicio?.slice(0, 5) ?? '')
  const [horaFim, setHoraFim] = useState(compromisso?.hora_fim?.slice(0, 5) ?? '')
  const [areaId, setAreaId] = useState(compromisso?.area_id ?? '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra
  // /habitos?secao=compromissos (mesma tela), então sem isso o próximo
  // compromisso herdaria os valores do anterior. Ajustado durante o
  // render, não num efeito.
  const [stateAnterior, setStateAnterior] = useState(state)
  if (state !== stateAnterior) {
    setStateAnterior(state)
    if (state.status === 'success' && !compromisso) {
      setAtividade('')
      setData(hojeISO())
      setHoraInicio('')
      setHoraFim('')
      setAreaId('')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/habitos?secao=compromissos')
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
      {compromisso && <input type="hidden" name="id" value={compromisso.id} />}

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
            placeholder="Ex: Consulta médica"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="data">Data</label>
          <input id="data" name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
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
                {area.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : compromisso ? 'Salvar alterações' : 'Criar compromisso'}
        </button>
        {compromisso && (
          <Link href="/habitos?secao=compromissos" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
