'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveHabit, type HabitFormState } from '@/actions/habits'
import { DIAS_SEMANA } from '@/lib/habitFrequencia'
import type { Area, Frequencia, Habit } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: HabitFormState = { status: 'idle' }

export function HabitForm({ habit, areas }: { habit: Habit | null; areas: Area[] }) {
  const [state, formAction, pending] = useActionState(saveHabit, initialState)
  const router = useRouter()
  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [nome, setNome] = useState(habit?.nome ?? '')
  const [areaId, setAreaId] = useState(habit?.area_id ?? '')
  const [frequencia, setFrequencia] = useState<Frequencia>(habit?.frequencia ?? 'diario')
  const [diasSemana, setDiasSemana] = useState<number[]>(habit?.dias_semana ?? [])
  const [diaMes, setDiaMes] = useState(habit?.dia_mes ?? 1)

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — sem isso, o formulário "Novo hábito" continuaria com os
  // valores da última criação (o componente sobrevive à navegação de volta
  // pra /habitos, já que é a mesma tela), e o próximo hábito herdaria
  // dias/área/frequência de um totalmente diferente. Ajustado durante o
  // render (comparando com o status anterior), não num efeito, seguindo o
  // padrão recomendado pelo React para "resetar estado quando algo muda".
  const [stateAnterior, setStateAnterior] = useState(state)
  if (state !== stateAnterior) {
    setStateAnterior(state)
    if (state.status === 'success' && !habit) {
      setNome('')
      setAreaId('')
      setFrequencia('diario')
      setDiasSemana([])
      setDiaMes(1)
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/habitos')
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

  function alternarDiaSemana(dia: number) {
    setDiasSemana((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia]))
  }

  return (
    <form action={formAction} className={styles.form}>
      {habit && <input type="hidden" name="id" value={habit.id} />}

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
            placeholder="Ex: Beber 2L de água"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="frequencia">Frequência</label>
          <select
            id="frequencia"
            name="frequencia"
            value={frequencia}
            onChange={(e) => setFrequencia(e.target.value as Frequencia)}
          >
            <option value="diario">Diário</option>
            <option value="dias_especificos">Dias específicos da semana</option>
            <option value="mensal">Mensal</option>
          </select>
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="area_id">Área</label>
          <select
            ref={areaSelectRef}
            id="area_id"
            name="area_id"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
          >
            <option value="">Sem área</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.icone} {area.nome}
                {area.arquivada ? ' (arquivada)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {frequencia === 'dias_especificos' && (
        <div className={styles.formRow}>
          <div className={styles.fieldGrow}>
            <label>Quais dias?</label>
            <div className={styles.diasSemanaRow}>
              {DIAS_SEMANA.map((d) => (
                <label key={d.valor} className={styles.diaSemanaToggle}>
                  <input
                    type="checkbox"
                    name="dias_semana"
                    value={d.valor}
                    checked={diasSemana.includes(d.valor)}
                    onChange={() => alternarDiaSemana(d.valor)}
                  />
                  {d.abrev}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {frequencia === 'mensal' && (
        <div className={styles.formRow}>
          <div className={styles.fieldSmall}>
            <label htmlFor="dia_mes">Dia do mês</label>
            <select id="dia_mes" name="dia_mes" value={diaMes} onChange={(e) => setDiaMes(Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : habit ? 'Salvar alterações' : 'Criar hábito'}
        </button>
        {habit && (
          <Link href="/habitos" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
