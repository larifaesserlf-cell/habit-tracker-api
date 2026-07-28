'use client'

import { useState } from 'react'
import { GastosPorCategoriaChart } from './GastosPorCategoriaChart'
import styles from './page.module.css'

type Fatia = { categoria: string; valor: number }

/**
 * Alterna entre os gráficos de despesas e receitas por categoria num só
 * card, em vez de mostrar os dois pizza sempre visíveis um embaixo do
 * outro — menos informação disputando atenção na tela ao mesmo tempo.
 */
export function CategoriaChartTabs({ gastos, receitas }: { gastos: Fatia[]; receitas: Fatia[] }) {
  const [aba, setAba] = useState<'despesa' | 'receita'>('despesa')

  return (
    <div>
      <div className={styles.chartTabsWrap}>
        <button
          type="button"
          className={aba === 'despesa' ? styles.chartTabAtiva : styles.chartTab}
          onClick={() => setAba('despesa')}
        >
          Despesas
        </button>
        <button
          type="button"
          className={aba === 'receita' ? styles.chartTabAtiva : styles.chartTab}
          onClick={() => setAba('receita')}
        >
          Receitas
        </button>
      </div>

      {aba === 'despesa' ? (
        <GastosPorCategoriaChart dados={gastos} mensagemVazia="Nenhum gasto registrado este mês." />
      ) : (
        <GastosPorCategoriaChart dados={receitas} mensagemVazia="Nenhuma receita registrada este mês." />
      )}
    </div>
  )
}
