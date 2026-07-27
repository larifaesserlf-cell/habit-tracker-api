'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveMeta, type MetaFormState } from '@/actions/metas'
import type { Area, Meta, MetaStatus, MetaTipo } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: MetaFormState = { status: 'idle' }

export function MetaForm({ meta, areas }: { meta: Meta | null; areas: Area[] }) {
  const [state, formAction, pending] = useActionState(saveMeta, initialState)
  const router = useRouter()

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [titulo, setTitulo] = useState(meta?.titulo ?? '')
  const [areaId, setAreaId] = useState(meta?.area_id ?? '')
  const [tipo, setTipo] = useState<MetaTipo>(meta?.tipo ?? 'curto')
  const [dataAlvo, setDataAlvo] = useState(meta?.data_alvo ?? '')
  const [metaStatus, setMetaStatus] = useState<MetaStatus>(meta?.status ?? 'ativa')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra /metas
  // (mesma tela), então sem isso a próxima meta herdaria os valores da
  // anterior. Ajustado durante o render, não num efeito.
  const [stateAnterior, setStateAnterior] = useState(state)
  if (state !== stateAnterior) {
    setStateAnterior(state)
    if (state.status === 'success' && !meta) {
      setTitulo('')
      setAreaId('')
      setTipo('curto')
      setDataAlvo('')
      setMetaStatus('ativa')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/metas')
      router.refresh()
    }
  }, [state.status, router])

  // O <select> de área tem uma option value="" (o placeholder "Selecione…").
  // Depois de QUALQUER submissão, o browser reseta nativamente os controles
  // do form — para <input>/<textarea> o React corrige sozinho (tem um
  // "value tracker" interno pra perceber mutação externa), mas pra <select>
  // não há essa correção automática, e o reset acontece de forma assíncrona
  // (depois do commit do React), então nem um re-render nem uma remontagem
  // por key bastam. O fix é reaplicar o valor certo via ref num timeout 0,
  // depois que o reset nativo já rodou.
  const areaSelectRef = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    const id = setTimeout(() => {
      if (areaSelectRef.current) areaSelectRef.current.value = areaId
    }, 0)
    return () => clearTimeout(id)
  })

  return (
    <form action={formAction} className={styles.form}>
      {meta && <input type="hidden" name="id" value={meta.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="titulo">Título</label>
          <input
            id="titulo"
            name="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Correr uma meia maratona"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="area_id">Área</label>
          <select
            ref={areaSelectRef}
            id="area_id"
            name="area_id"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione…
            </option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.icone} {area.nome}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="tipo">Prazo</label>
          <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as MetaTipo)}>
            <option value="curto">Curto</option>
            <option value="medio">Médio</option>
            <option value="longo">Longo</option>
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_alvo">Data alvo</label>
          <input
            id="data_alvo"
            name="data_alvo"
            type="date"
            value={dataAlvo}
            onChange={(e) => setDataAlvo(e.target.value)}
          />
        </div>
        {meta && (
          <div className={styles.fieldSmall}>
            <label htmlFor="meta_status">Status</label>
            <select id="meta_status" name="meta_status" value={metaStatus} onChange={(e) => setMetaStatus(e.target.value as MetaStatus)}>
              <option value="ativa">Ativa</option>
              <option value="concluida">Concluída</option>
              <option value="abandonada">Abandonada</option>
            </select>
          </div>
        )}
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : meta ? 'Salvar alterações' : 'Criar meta'}
        </button>
        {meta && (
          <Link href="/metas" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
