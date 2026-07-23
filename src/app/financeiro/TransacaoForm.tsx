'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveTransacao, type TransacaoFormState } from '@/actions/financeiro'
import type { ContaFinanceira, Transacao, TransacaoTipo } from '@/lib/supabase/types'
import { TRANSACAO_TIPOS, TRANSACAO_TIPO_LABEL } from './constants'
import styles from './page.module.css'

const initialState: TransacaoFormState = { status: 'idle' }

function hojeISO() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function TransacaoForm({
  transacao,
  contas,
  categoriasExistentes,
}: {
  transacao: Transacao | null
  contas: ContaFinanceira[]
  categoriasExistentes: string[]
}) {
  const [state, formAction, pending] = useActionState(saveTransacao, initialState)
  const [tipoSelecionado, setTipoSelecionado] = useState<TransacaoTipo>(transacao?.tipo ?? 'despesa')
  const router = useRouter()
  const ehParcelaExistente = Boolean(transacao && transacao.total_parcelas > 1)

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/financeiro')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {transacao && <input type="hidden" name="id" value={transacao.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="transacao_conta">Conta</label>
          <select
            id="transacao_conta"
            name="conta_id"
            defaultValue={transacao?.conta_id ?? contas[0]?.id ?? ''}
            required
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="transacao_tipo">Tipo</label>
          <select
            id="transacao_tipo"
            name="tipo"
            value={tipoSelecionado}
            onChange={(e) => setTipoSelecionado(e.target.value as TransacaoTipo)}
          >
            {TRANSACAO_TIPOS.map((t) => (
              <option key={t} value={t}>
                {TRANSACAO_TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="transacao_valor">
            {!transacao && tipoSelecionado === 'despesa' ? 'Valor (total da compra)' : 'Valor'}
          </label>
          <input
            id="transacao_valor"
            name="valor"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={transacao?.valor ?? ''}
            placeholder="0,00"
            required
          />
        </div>
      </div>

      {!transacao && tipoSelecionado === 'despesa' && (
        <div className={styles.formRow}>
          <div className={styles.fieldSmall}>
            <label htmlFor="transacao_parcelas">Parcelado em quantas vezes?</label>
            <input
              id="transacao_parcelas"
              name="total_parcelas"
              type="number"
              min="1"
              max="60"
              defaultValue={1}
              placeholder="1 (à vista)"
            />
          </div>
          <p className={styles.parcelasAjuda}>
            Se maior que 1, o valor acima é dividido entre as parcelas e uma transação é criada
            automaticamente pra cada mês, a partir da data informada.
          </p>
        </div>
      )}

      {ehParcelaExistente && transacao && (
        <p className={styles.parcelasAjuda}>
          Parcela {transacao.parcela_atual} de {transacao.total_parcelas} desta compra. Editar aqui altera
          só esta parcela.
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="transacao_categoria">Categoria</label>
          <input
            id="transacao_categoria"
            name="categoria"
            list="categorias-existentes"
            defaultValue={transacao?.categoria ?? ''}
            placeholder="Ex: Moradia, Mercado, Salário…"
            required
          />
          <datalist id="categorias-existentes">
            {categoriasExistentes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="transacao_subcategoria">Subcategoria</label>
          <input
            id="transacao_subcategoria"
            name="subcategoria"
            defaultValue={transacao?.subcategoria ?? ''}
            placeholder="Opcional"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="transacao_data">Data</label>
          <input
            id="transacao_data"
            name="data"
            type="date"
            defaultValue={transacao?.data ?? hojeISO()}
            required
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="transacao_descricao">Descrição</label>
          <input
            id="transacao_descricao"
            name="descricao"
            defaultValue={transacao?.descricao ?? ''}
            placeholder="Opcional"
          />
        </div>
        <label className={styles.checkboxField}>
          <input type="checkbox" name="fixo" defaultChecked={transacao?.fixo ?? false} />
          Gasto/receita fixo
        </label>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending || contas.length === 0} className={styles.submitBtn}>
          {pending ? 'Salvando…' : transacao ? 'Salvar alterações' : 'Adicionar transação'}
        </button>
        {transacao && (
          <Link href="/financeiro" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
