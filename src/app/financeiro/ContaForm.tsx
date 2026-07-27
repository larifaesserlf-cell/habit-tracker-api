'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveConta, type ContaFormState } from '@/actions/financeiro'
import type { ContaFinanceira, ContaTipo } from '@/lib/supabase/types'
import { CONTA_TIPOS, CONTA_TIPO_LABEL } from './constants'
import styles from './page.module.css'

const initialState: ContaFormState = { status: 'idle' }

export function ContaForm({ conta }: { conta: ContaFinanceira | null }) {
  const [state, formAction, pending] = useActionState(saveConta, initialState)
  const router = useRouter()

  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [nome, setNome] = useState(conta?.nome ?? '')
  const [tipo, setTipo] = useState<ContaTipo>(conta?.tipo ?? 'corrente')
  const [saldoAtual, setSaldoAtual] = useState(conta?.saldo_atual != null ? String(conta.saldo_atual) : '')

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra
  // /financeiro (mesma tela), então sem isso a próxima conta herdaria os
  // valores da anterior. Ajustado durante o render, não num efeito.
  const [statusAnterior, setStatusAnterior] = useState(state.status)
  if (state.status !== statusAnterior) {
    setStatusAnterior(state.status)
    if (state.status === 'success' && !conta) {
      setNome('')
      setTipo('corrente')
      setSaldoAtual('')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/financeiro')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {conta && <input type="hidden" name="id" value={conta.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="conta_nome">Nome</label>
          <input
            id="conta_nome"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Nubank"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="conta_tipo">Tipo</label>
          <select
            id="conta_tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as ContaTipo)}
          >
            {CONTA_TIPOS.map((t) => (
              <option key={t} value={t}>
                {CONTA_TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="conta_saldo">Saldo atual</label>
          <input
            id="conta_saldo"
            name="saldo_atual"
            type="number"
            step="0.01"
            value={saldoAtual}
            onChange={(e) => setSaldoAtual(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : conta ? 'Salvar alterações' : 'Adicionar conta'}
        </button>
        {conta && (
          <Link href="/financeiro" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
