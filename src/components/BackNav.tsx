'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './BackNav.module.css'

/**
 * Navegação padrão no topo de toda sub-página: "Início" pula direto pro
 * painel; "Voltar" usa o histórico do navegador (pode ser a listagem
 * anterior, uma busca, etc.) em vez de sempre assumir qual é o "pai" da
 * rota atual.
 */
export function BackNav() {
  const router = useRouter()

  return (
    <div className={styles.backNav}>
      <Link href="/hoje" className={styles.link}>
        Início
      </Link>
      <span className={styles.separator}>·</span>
      <button type="button" onClick={() => router.back()} className={styles.link}>
        ← Voltar
      </button>
    </div>
  )
}
