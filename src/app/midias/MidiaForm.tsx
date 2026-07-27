'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveMidia, type MidiaFormState } from '@/actions/midias'
import type { Midia, MidiaTipo } from '@/lib/supabase/types'
import { TIPOS, TIPO_LABEL, TIPO_EMOJI, STATUSES, STATUS_LABEL } from './constants'
import styles from './page.module.css'

const initialState: MidiaFormState = { status: 'idle' }

const DEBOUNCE_MS = 400
const MIN_CARACTERES_BUSCA = 3

type Sugestao = {
  titulo: string
  ano: number | null
  autorDiretor: string | null
  capaUrl: string | null
  tmdbId?: number
  tmdbMediaType?: 'movie' | 'tv'
}

/** Se algum campo "avançado" já tem valor, começa expandido — senão editar
 *  esconderia dado já preenchido atrás do "Mostrar mais campos". */
function temCampoAvancadoPreenchido(midia: Midia | null): boolean {
  if (!midia) return false
  return Boolean(
    midia.autor_diretor ||
      midia.genero ||
      midia.ano_lancamento !== null ||
      midia.data_inicio ||
      midia.data_conclusao ||
      midia.temporada_atual !== null ||
      midia.progresso ||
      midia.plataforma ||
      midia.recomendaria !== null ||
      midia.releitura_rewatch ||
      (midia.tags && midia.tags.length > 0) ||
      midia.comentario
  )
}

/** Só filme/série (TMDB) e livro (Google Books) têm busca implementada. */
function tipoTemBusca(tipo: MidiaTipo): boolean {
  return tipo === 'livro' || tipo === 'filme' || tipo === 'serie'
}

export function MidiaForm({ midia }: { midia: Midia | null }) {
  const [state, formAction, pending] = useActionState(saveMidia, initialState)
  const [showMore, setShowMore] = useState(() => temCampoAvancadoPreenchido(midia))
  const [tipo, setTipo] = useState<MidiaTipo>(midia?.tipo ?? 'livro')
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)

  // Controlados (em vez de defaultValue) porque o autocomplete precisa
  // conseguir preenchê-los programaticamente ao escolher uma sugestão —
  // mutar o DOM via ref não é confiável aqui, o próximo re-render (disparado
  // pelos outros setStates da mesma seleção) desfaz a mudança.
  const [tituloValue, setTituloValue] = useState(midia?.titulo ?? '')
  const [anoValue, setAnoValue] = useState(midia?.ano_lancamento != null ? String(midia.ano_lancamento) : '')
  const [autorDiretorValue, setAutorDiretorValue] = useState(midia?.autor_diretor ?? '')
  const [capaUrlValue, setCapaUrlValue] = useState(midia?.capa_url ?? '')
  const [capaPreview, setCapaPreview] = useState<string | null>(midia?.capa_url ?? null)

  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/midias')
      router.refresh()
    }
  }, [state.status, router])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function buscarSugestoes(q: string, tipoAtual: MidiaTipo) {
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
    if (q.length < MIN_CARACTERES_BUSCA || !tipoTemBusca(tipo)) {
      setSugestoes([])
      setMostrarSugestoes(false)
      return
    }
    debounceRef.current = setTimeout(() => buscarSugestoes(q, tipo), DEBOUNCE_MS)
  }

  function handleTipoChange(novoTipo: MidiaTipo) {
    setTipo(novoTipo)
    setSugestoes([])
    setMostrarSugestoes(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const tituloAtual = tituloValue.trim()
    if (tipoTemBusca(novoTipo) && tituloAtual.length >= MIN_CARACTERES_BUSCA) {
      debounceRef.current = setTimeout(() => buscarSugestoes(tituloAtual, novoTipo), DEBOUNCE_MS)
    }
  }

  async function buscarAutorDiretor(tmdbId: number, mediaType: 'movie' | 'tv') {
    try {
      const res = await fetch(`/api/midias/detalhe?id=${tmdbId}&mediaType=${mediaType}`)
      const data = (await res.json()) as { autorDiretor?: string | null }
      if (data.autorDiretor) {
        setAutorDiretorValue(data.autorDiretor)
      }
    } catch {
      // silêncio — o campo fica em branco, dá pra preencher à mão
    }
  }

  function selecionarSugestao(s: Sugestao) {
    setTituloValue(s.titulo)
    setAnoValue(s.ano ? String(s.ano) : '')
    setAutorDiretorValue(s.autorDiretor ?? '')
    setCapaUrlValue(s.capaUrl ?? '')
    setCapaPreview(s.capaUrl)
    setSugestoes([])
    setMostrarSugestoes(false)
    setShowMore(true) // os campos preenchidos (ano/autor) ficam escondidos senão

    if (!s.autorDiretor && s.tmdbId && s.tmdbMediaType) {
      buscarAutorDiretor(s.tmdbId, s.tmdbMediaType)
    }
  }

  function removerCapa() {
    setCapaUrlValue('')
    setCapaPreview(null)
  }

  const recomendariaDefault =
    midia?.recomendaria === true ? 'sim' : midia?.recomendaria === false ? 'nao' : ''

  return (
    <form action={formAction} className={styles.form}>
      {midia && <input type="hidden" name="id" value={midia.id} />}
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
          <select
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => handleTipoChange(e.target.value as MidiaTipo)}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="midia_status">Status</label>
          <select id="midia_status" name="midia_status" defaultValue={midia?.status ?? 'quero_ver_ler'}>
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
            defaultValue={midia?.nota ?? ''}
            placeholder="Opcional"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className={styles.toggleMoreBtn}
      >
        {showMore ? '▴ Ocultar mais campos' : '▾ Mostrar mais campos'}
      </button>

      {showMore && (
        <>
          <div className={styles.formRow}>
            <div className={styles.fieldGrow}>
              <label htmlFor="autor_diretor">Autor/Diretor</label>
              <input
                id="autor_diretor"
                name="autor_diretor"
                value={autorDiretorValue}
                onChange={(e) => setAutorDiretorValue(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className={styles.fieldGrow}>
              <label htmlFor="genero">Gênero</label>
              <input
                id="genero"
                name="genero"
                defaultValue={midia?.genero ?? ''}
                placeholder="Opcional"
              />
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
              <label htmlFor="data_inicio">Início</label>
              <input
                id="data_inicio"
                name="data_inicio"
                type="date"
                defaultValue={midia?.data_inicio ?? ''}
              />
            </div>
            <div className={styles.fieldSmall}>
              <label htmlFor="data_conclusao">Conclusão</label>
              <input
                id="data_conclusao"
                name="data_conclusao"
                type="date"
                defaultValue={midia?.data_conclusao ?? ''}
              />
            </div>
            <div className={styles.fieldSmall}>
              <label htmlFor="temporada_atual">Temporada</label>
              <input
                id="temporada_atual"
                name="temporada_atual"
                type="number"
                min="1"
                defaultValue={midia?.temporada_atual ?? ''}
                placeholder="Se série"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.fieldGrow}>
              <label htmlFor="progresso">Progresso</label>
              <input
                id="progresso"
                name="progresso"
                defaultValue={midia?.progresso ?? ''}
                placeholder='Ex: "cap. 12" ou "S02E05"'
              />
            </div>
            <div className={styles.fieldGrow}>
              <label htmlFor="plataforma">Plataforma</label>
              <input
                id="plataforma"
                name="plataforma"
                defaultValue={midia?.plataforma ?? ''}
                placeholder="Netflix, papel, Kindle…"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.fieldSmall}>
              <label htmlFor="recomendaria">Recomendaria?</label>
              <select id="recomendaria" name="recomendaria" defaultValue={recomendariaDefault}>
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                name="releitura_rewatch"
                defaultChecked={midia?.releitura_rewatch ?? false}
              />
              Releitura / rewatch
            </label>
            <div className={styles.fieldGrow}>
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                name="tags"
                defaultValue={midia?.tags?.join(', ') ?? ''}
                placeholder="separadas por vírgula"
              />
            </div>
          </div>

          <div className={styles.fieldGrow}>
            <label htmlFor="comentario">Comentário</label>
            <textarea
              id="comentario"
              name="comentario"
              defaultValue={midia?.comentario ?? ''}
              rows={3}
              placeholder="Opcional"
              className={styles.textarea}
            />
          </div>
        </>
      )}

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : midia ? 'Salvar alterações' : 'Adicionar'}
        </button>
        {midia && (
          <Link href="/midias" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
