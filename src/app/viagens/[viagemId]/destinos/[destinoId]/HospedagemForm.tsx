'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveHospedagem, type HospedagemFormState } from '@/actions/hospedagens'
import type { Hospedagem } from '@/lib/supabase/types'
import styles from '../../../page.module.css'

const initialState: HospedagemFormState = { status: 'idle' }

export function HospedagemForm({
  viagemId,
  destinoId,
  hospedagem,
}: {
  viagemId: string
  destinoId: string
  hospedagem: Hospedagem | null
}) {
  const [state, formAction, pending] = useActionState(saveHospedagem, initialState)
  const router = useRouter()
  const baseHref = `/viagens/${viagemId}/destinos/${destinoId}`

  useEffect(() => {
    if (state.status === 'success') {
      router.push(baseHref)
      router.refresh()
    }
  }, [state.status, baseHref, router])

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="destino_id" value={destinoId} />
      {hospedagem && <input type="hidden" name="id" value={hospedagem.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="hosp_nome">Nome</label>
          <input
            id="hosp_nome"
            name="nome"
            defaultValue={hospedagem?.nome ?? ''}
            placeholder="Ex: Hotel Central"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="hosp_tipo">Tipo</label>
          <input
            id="hosp_tipo"
            name="tipo"
            defaultValue={hospedagem?.tipo ?? ''}
            placeholder="Hotel, Airbnb…"
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="regiao_bairro">Região/Bairro</label>
          <input
            id="regiao_bairro"
            name="regiao_bairro"
            defaultValue={hospedagem?.regiao_bairro ?? ''}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="faixa_preco">Faixa de preço</label>
          <input
            id="faixa_preco"
            name="faixa_preco"
            defaultValue={hospedagem?.faixa_preco ?? ''}
            placeholder="$$"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="hosp_link">Link</label>
          <input id="hosp_link" name="link" defaultValue={hospedagem?.link ?? ''} placeholder="Opcional" />
        </div>
        <label className={styles.checkboxField}>
          <input type="checkbox" name="reservado" defaultChecked={hospedagem?.reservado ?? false} />
          Já reservado
        </label>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="hosp_notas">Notas</label>
        <textarea
          id="hosp_notas"
          name="notas"
          defaultValue={hospedagem?.notas ?? ''}
          rows={2}
          placeholder="Opcional"
          className={styles.textarea}
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : hospedagem ? 'Salvar alterações' : 'Adicionar hospedagem'}
        </button>
        {hospedagem && (
          <Link href={baseHref} className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
