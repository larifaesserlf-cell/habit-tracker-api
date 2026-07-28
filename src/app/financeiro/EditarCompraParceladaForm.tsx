'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { editarCompraParcelada, type EditarCompraFormState } from '@/actions/financeiro'
import { CATEGORIAS_SUGERIDAS, formatMoeda } from './constants'
import type { ContaFinanceira, Transacao } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: EditarCompraFormState = { status: 'idle' }

/** Tira o sufixo "(i/N)" que cada parcela guarda na própria descrição, pra
 *  mostrar só o texto livre no campo de edição (sem duplicar o sufixo ao
 *  salvar — a action recoloca ele em cada parcela). */
function descricaoSemParcela(descricao: string | null): string {
  if (!descricao) return ''
  return descricao.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
}

export function EditarCompraParceladaForm({
  linhas,
  contas,
  categoriasExistentes,
  onSuccess,
}: {
  /** Todas as parcelas da mesma compra (mesmo compra_id), já ordenadas. */
  linhas: Transacao[]
  contas: ContaFinanceira[]
  categoriasExistentes: string[]
  onSuccess: () => void
}) {
  const [state, formAction, pending] = useActionState(editarCompraParcelada, initialState)
  const router = useRouter()

  const primeira = linhas[0]
  const totalParcelasAtual = primeira.total_parcelas
  const valorTotalAtual = linhas.reduce((soma, l) => soma + l.valor, 0)
  const parcelasPagas = linhas.filter((l) => l.status_pagamento === 'pago')

  const [contaId, setContaId] = useState(primeira.conta_id)
  const [categoria, setCategoria] = useState(primeira.categoria)
  const [descricao, setDescricao] = useState(descricaoSemParcela(primeira.descricao))
  const [valorTotal, setValorTotal] = useState(String(valorTotalAtual))
  const [totalParcelas, setTotalParcelas] = useState(String(totalParcelasAtual))

  const sugestoesCategoria = Array.from(new Set([...CATEGORIAS_SUGERIDAS, ...categoriasExistentes])).sort()

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh()
      onSuccess()
    }
  }, [state.status, router, onSuccess])

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="compra_id" value={primeira.compra_id} />

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      {parcelasPagas.length > 0 && (
        <p className={styles.parcelasAjuda}>
          {parcelasPagas.length} de {totalParcelasAtual} parcela(s) já paga(s) — o valor e a data delas não
          mudam. Só as parcelas pendentes são recalculadas com os novos valores.
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="compra_conta">Conta</label>
          <select id="compra_conta" name="conta_id" value={contaId} onChange={(e) => setContaId(e.target.value)}>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="compra_total_parcelas">Nº de parcelas</label>
          <input
            id="compra_total_parcelas"
            name="total_parcelas"
            type="number"
            min="1"
            max="60"
            value={totalParcelas}
            onChange={(e) => setTotalParcelas(e.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="compra_categoria">Categoria</label>
          <input
            id="compra_categoria"
            name="categoria"
            list="compra-categorias-sugeridas"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            required
          />
          <datalist id="compra-categorias-sugeridas">
            {sugestoesCategoria.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="compra_valor_total">Valor total</label>
          <input
            id="compra_valor_total"
            name="valor_total"
            type="number"
            step="0.01"
            min="0.01"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="compra_descricao">Descrição</label>
          <input
            id="compra_descricao"
            name="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      {parcelasPagas.length > 0 && (
        <p className={styles.parcelasAjuda}>
          Já pago até agora: {formatMoeda(parcelasPagas.reduce((soma, l) => soma + l.valor, 0))}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
