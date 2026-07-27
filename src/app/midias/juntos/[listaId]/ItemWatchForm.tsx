'use client'

import { useEffect, useRef, useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveItemWatch, type ItemWatchFormState } from '@/actions/listasWatch'
import type { ItemWatch, ItemWatchStatus, ItemWatchTipo } from '@/lib/supabase/types'
import { TIPOS, TIPO_LABEL, TIPO_EMOJI, STATUSES, STATUS_LABEL } from '../constants'
import styles from '../page.module.css'

const initialState: ItemWatchFormState = { status: 'idle' }

const DEBOUNCE_MS = 400
const MIN_CARACTERES_BUSCA = 3

type Sugestao = {
  titulo: string
  ano: number | null
  capaUrl: string | null
}

export function ItemWatchForm({ listaId, item }: { listaId: string; item: ItemWatch | null }) {
  const [state, formAction, pending] = useActionState(saveItemWatch, initialState)
  const router = useRouter()

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER
  // submissão, inclusive quando a action retorna erro, e porque o
  // autocomplete precisa preenchê-los programaticamente.
  const [tituloValue, setTituloValue] = useState(item?.titulo ?? '')
  const [tipo, setTipo] = useState<ItemWatchTipo>(item?.tipo ?? 'filme')
  const [anoValue, setAnoValue] = useState(item?.ano_lancamento != null ? String(item.ano_lancamento) : '')
  const [capaUrlValue, setCapaUrlValue] = useState(item?.capa_url ?? '')
  const [capaPreview, setCapaPreview] = useState<string | null>(item?.capa_url ?? null)
  const [itemStatus, setItemStatus] = useState<ItemWatchStatus>(item?.status ?? 'quero_assistir')
  const [nota, setNota] = useState(item?.nota != null ? String(item.nota) : '')
  const [comentario, setComentario] = useState(item?.comentario ?? '')

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação (mesma tela), então
  // sem isso o próximo item herdaria os valores do anterior. Ajustado
  // durante o render, não num efeito.
  const [stateAnterior, setStateAnterior] = useState(state)
  if (state !== stateAnterior) {
    setStateAnterior(state)
    if (state.status === 'success' && !item) {
      setTituloValue('')
      setTipo('filme')
      setAnoValue('')
      setCapaUrlValue('')
      setCapaPreview(null)
      setItemStatus('quero_assistir')
      setNota('')
      setComentario('')
    }
  }

  // Em edição, sai do modo "?edit=" e volta pra listagem depois de salvar;
  // na criação já estamos na URL certa, só precisa atualizar os dados.
  useEffect(() => {
    if (state.status !== 'success') return
    if (item) {
      router.push(`/midias/juntos/${listaId}`)
    }
    router.refresh()
  }, [state.status, item, listaId, router])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // O <select> de tipo não tem option value="", então não sofre do bug de
  // reset assíncrono do browser — mas se algum dia ganhar uma opção vazia,
  // ver a nota em HabitForm/MetaForm sobre isso.

  async function buscarSugestoes(q: string, tipoAtual: ItemWatchTipo) {
    const meuId = ++requestIdRef.current
    try {
      const res = await fetch(`/api/midias/buscar?tipo=${tipoAtual}&q=${encodeURIComponent(q)}`)
      const data = (await res.json()) as { sugestoes?: Sugestao[] }
      if (requestIdRef.current !== meuId) return // resposta obsoleta, ignora
      const lista = data.sugestoes ?? []
      setSugestoes(lista)
      setMostrarSugestoes(lista.length > 0)
    } catch {
      if (requestIdRef.current === meuId) {
        setSugestoes([])
        setMostrarSugestoes(false)
      }
    }
  }

  function handleTituloChange(valor: string) {
    setTituloValue(valor)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = valor.trim()
    if (q.length < MIN_CARACTERES_BUSCA) {
      setSugestoes([])
      setMostrarSugestoes(false)
      return
    }
    debounceRef.current = setTimeout(() => buscarSugestoes(q, tipo), DEBOUNCE_MS)
  }

  function handleTipoChange(novoTipo: ItemWatchTipo) {
    setTipo(novoTipo)
    setSugestoes([])
    setMostrarSugestoes(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const tituloAtual = tituloValue.trim()
    if (tituloAtual.length >= MIN_CARACTERES_BUSCA) {
      debounceRef.current = setTimeout(() => buscarSugestoes(tituloAtual, novoTipo), DEBOUNCE_MS)
    }
  }

  function selecionarSugestao(s: Sugestao) {
    setTituloValue(s.titulo)
    setAnoValue(s.ano ? String(s.ano) : '')
    setCapaUrlValue(s.capaUrl ?? '')
    setCapaPreview(s.capaUrl)
    setSugestoes([])
    setMostrarSugestoes(false)
  }

  function removerCapa() {
    setCapaUrlValue('')
    setCapaPreview(null)
  }

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="lista_id" value={listaId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="capa_url" value={capaUrlValue} readOnly />

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={`${styles.fieldGrow} ${styles.autocompleteField}`}>
          <label htmlFor="titulo">Título</label>
          <div className={styles.autocompleteWrap}>
            {capaPreview && (
              <div className={styles.capaMiniaturaWrap}>
                <img src={capaPreview} alt="" className={styles.capaMiniatura} />
                <button
                  type="button"
                  onClick={removerCapa}
                  className={styles.removerCapaBtn}
                  aria-label="Remover capa selecionada"
                  title="Remover capa"
                >
                  ×
                </button>
              </div>
            )}
            <input
              id="titulo"
              name="titulo"
              value={tituloValue}
              onChange={(e) => handleTituloChange(e.target.value)}
              onFocus={() => sugestoes.length > 0 && setMostrarSugestoes(true)}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
              placeholder="Ex: Duna"
              autoComplete="off"
              required
            />
            {mostrarSugestoes && sugestoes.length > 0 && (
              <ul className={styles.sugestoesList}>
                {sugestoes.map((s, i) => (
                  <li key={`${s.titulo}-${i}`}>
                    <button
                      type="button"
                      className={styles.sugestaoItem}
                      onMouseDown={() => selecionarSugestao(s)}
                    >
                      {s.capaUrl ? (
                        <img src={s.capaUrl} alt="" className={styles.sugestaoCapa} />
                      ) : (
                        <span className={styles.sugestaoCapaFallback}>{TIPO_EMOJI[tipo]}</span>
                      )}
                      <span className={styles.sugestaoTexto}>
                        <span className={styles.sugestaoTitulo}>{s.titulo}</span>
                        {s.ano && <span className={styles.sugestaoAno}>{s.ano}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" value={tipo} onChange={(e) => handleTipoChange(e.target.value as ItemWatchTipo)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="ano_lancamento">Ano</label>
          <input
            id="ano_lancamento"
            name="ano_lancamento"
            type="number"
            value={anoValue}
            onChange={(e) => setAnoValue(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="item_status">Status</label>
          <select
            id="item_status"
            name="item_status"
            value={itemStatus}
            onChange={(e) => setItemStatus(e.target.value as ItemWatchStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
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
        <div className={styles.fieldGrow}>
          <label htmlFor="comentario">Comentário</label>
          <input
            id="comentario"
            name="comentario"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : item ? 'Salvar alterações' : 'Adicionar'}
        </button>
        {item && (
          <Link href={`/midias/juntos/${listaId}`} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
