'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveInvestimento, type InvestimentoFormState } from '@/actions/financeiro'
import type { Investimento, TipoAtivo } from '@/lib/supabase/types'
import { TIPOS_ATIVO, TIPO_ATIVO_LABEL } from '../constants'
import styles from '../page.module.css'

const initialState: InvestimentoFormState = { status: 'idle' }

function hojeISO() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function InvestimentoForm({ investimento }: { investimento: Investimento | null }) {
  const [state, formAction, pending] = useActionState(saveInvestimento, initialState)
  const router = useRouter()

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [nomeAtivo, setNomeAtivo] = useState(investimento?.nome_ativo ?? '')
  const [tipoAtivo, setTipoAtivo] = useState<TipoAtivo>(investimento?.tipo_ativo ?? 'outro')
  const [valorAportado, setValorAportado] = useState(
    investimento?.valor_aportado != null ? String(investimento.valor_aportado) : ''
  )
  const [dataAporte, setDataAporte] = useState(investimento?.data_aporte ?? hojeISO())
  const [instituicao, setInstituicao] = useState(investimento?.instituicao ?? '')
  const [notas, setNotas] = useState(investimento?.notas ?? '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra
  // /financeiro/investimentos (mesma tela), então sem isso o próximo aporte
  // herdaria os valores do anterior. Ajustado durante o render, não num
  // efeito.
  const [statusAnterior, setStatusAnterior] = useState(state.status)
  if (state.status !== statusAnterior) {
    setStatusAnterior(state.status)
    if (state.status === 'success' && !investimento) {
      setNomeAtivo('')
      setTipoAtivo('outro')
      setValorAportado('')
      setDataAporte(hojeISO())
      setInstituicao('')
      setNotas('')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/financeiro/investimentos')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {investimento && <input type="hidden" name="id" value={investimento.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="inv_nome_ativo">Nome do ativo</label>
          <input
            id="inv_nome_ativo"
            name="nome_ativo"
            value={nomeAtivo}
            onChange={(e) => setNomeAtivo(e.target.value)}
            placeholder="Ex: Tesouro IPCA+ 2035"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="inv_tipo_ativo">Tipo</label>
          <select
            id="inv_tipo_ativo"
            name="tipo_ativo"
            value={tipoAtivo}
            onChange={(e) => setTipoAtivo(e.target.value as TipoAtivo)}
          >
            {TIPOS_ATIVO.map((t) => (
              <option key={t} value={t}>
                {TIPO_ATIVO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="inv_valor_aportado">Valor aportado</label>
          <input
            id="inv_valor_aportado"
            name="valor_aportado"
            type="number"
            step="0.01"
            min="0.01"
            value={valorAportado}
            onChange={(e) => setValorAportado(e.target.value)}
            placeholder="0,00"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="inv_data_aporte">Data do aporte</label>
          <input
            id="inv_data_aporte"
            name="data_aporte"
            type="date"
            value={dataAporte}
            onChange={(e) => setDataAporte(e.target.value)}
            required
          />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="inv_instituicao">Instituição</label>
          <input
            id="inv_instituicao"
            name="instituicao"
            value={instituicao}
            onChange={(e) => setInstituicao(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className={styles.fieldGrow}>
        <label htmlFor="inv_notas">Notas</label>
        <input
          id="inv_notas"
          name="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : investimento ? 'Salvar alterações' : 'Adicionar aporte'}
        </button>
        {investimento && (
          <Link href="/financeiro/investimentos" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
