'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './page.module.css'

/**
 * A grade semanal é mais larga que o viewport em telas estreitas e rola
 * horizontalmente dentro desta caixa. Como isso não é óbvio sem alguma
 * pista visual, mostramos uma sombra gradiente nas bordas — só do lado
 * em que ainda há conteúdo pra rolar.
 */
export function GradeScrollHint({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function atualizar() {
      if (!el) return
      setCanScrollLeft(el.scrollLeft > 4)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }

    atualizar()
    el.addEventListener('scroll', atualizar, { passive: true })
    window.addEventListener('resize', atualizar)
    return () => {
      el.removeEventListener('scroll', atualizar)
      window.removeEventListener('resize', atualizar)
    }
  }, [])

  return (
    <>
      <div ref={ref} className={styles.gridScroll}>
        {children}
      </div>
      {canScrollLeft && (
        <div className={`${styles.scrollHint} ${styles.scrollHintLeft}`} aria-hidden="true">
          ‹
        </div>
      )}
      {canScrollRight && (
        <div className={`${styles.scrollHint} ${styles.scrollHintRight}`} aria-hidden="true">
          ›
        </div>
      )}
    </>
  )
}
