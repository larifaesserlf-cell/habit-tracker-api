'use client'

import { useActionState, useEffect, useState } from 'react'
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

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [nome, setNome] = useState(hospedagem?.nome ?? '')
  const [tipo, setTipo] = useState(hospedagem?.tipo ?? '')
  const [regiaoBairro, setRegiaoBairro] = useState(hospedagem?.regiao_bairro ?? '')
  const [faixaPreco, setFaixaPreco] = useState(hospedagem?.faixa_preco ?? '')
  const [link, setLink] = useState(hospedagem?.link ?? '')
  const [reservado, setReservado] = useState(hospedagem?.reservado ?? false)
  const [notas, setNotas] = useState(hospedagem?.notas ?? '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra tela do
  // destino (mesma tela), então sem isso a próxima hospedagem herdaria os
  // valores da anterior. Ajustado durante o render, não num efeito.
  const [statusAnterior, setStatusAnterior] = useState(state.status)
  if (state.status !== statusAnterior) {
    setStatusAnterior(state.status)
    if (state.status === 'success' && !hospedagem) {
      setNome('')
      setTipo('')
      setRegiaoBairro('')
      setFaixaPreco('')
      setLink('')
      setReservado(false)
      setNotas('')
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
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Hotel Central"
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="hosp_tipo">Tipo</label>
          <input
            id="hosp_tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Hotel, Airbnb…"
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="regiao_bairro">Região/Bairro</label>
          <input
            id="regiao_bairro"
            name="regiao_bairro"
            value={regiaoBairro}
            onChange={(e) => setRegiaoBairro(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="faixa_preco">Faixa de preço</label>
          <input
            id="faixa_preco"
            name="faixa_preco"
            value={faixaPreco}
            onChange={(e) => setFaixaPreco(e.target.value)}
            placeholder="$$"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="hosp_link">Link</label>
          <input id="hosp_link" name="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Opcional" />
        </div>
        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            name="reservado"
            checked={reservado}
            onChange={(e) => setReservado(e.target.checked)}
          />
          Já reservado
        </label>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="hosp_notas">Notas</label>
        <textarea
          id="hosp_notas"
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
