'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveMidia, type MidiaFormState } from '@/actions/midias'
import type { Midia } from '@/lib/supabase/types'
import { TIPOS, TIPO_LABEL, STATUSES, STATUS_LABEL } from './constants'
import styles from './page.module.css'

const initialState: MidiaFormState = { status: 'idle' }

export function MidiaForm({ midia }: { midia: Midia | null }) {
  const [state, formAction, pending] = useActionState(saveMidia, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/midias')
      router.refresh()
    }
  }, [state.status, router])

  const recomendariaDefault =
    midia?.recomendaria === true ? 'sim' : midia?.recomendaria === false ? 'nao' : ''

  return (
    <form action={formAction} className={styles.form}>
      {midia && <input type="hidden" name="id" value={midia.id} />}

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
            defaultValue={midia?.titulo ?? ''}
            placeholder="Ex: Duna"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" defaultValue={midia?.tipo ?? 'livro'}>
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
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="autor_diretor">Autor/Diretor</label>
          <input
            id="autor_diretor"
            name="autor_diretor"
            defaultValue={midia?.autor_diretor ?? ''}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="genero">Gênero</label>
          <input id="genero" name="genero" defaultValue={midia?.genero ?? ''} placeholder="Opcional" />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="ano_lancamento">Ano</label>
          <input
            id="ano_lancamento"
            name="ano_lancamento"
            type="number"
            defaultValue={midia?.ano_lancamento ?? ''}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_inicio">Início</label>
          <input id="data_inicio" name="data_inicio" type="date" defaultValue={midia?.data_inicio ?? ''} />
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

      <div className={styles.formRow}>
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
