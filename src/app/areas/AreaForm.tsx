'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveArea, type AreaFormState } from '@/actions/areas'
import type { Area } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: AreaFormState = { status: 'idle' }

// Paleta fixa em vez do seletor nativo do navegador (mais previsível e
// combina com o resto do app). "Roxo" é o mesmo tom usado nos botões e
// destaques da UI, então é o padrão pra área nova.
const CORES = [
  { valor: '#7c6af7', nome: 'Roxo' },
  { valor: '#f87171', nome: 'Vermelho' },
  { valor: '#fb923c', nome: 'Laranja' },
  { valor: '#fbbf24', nome: 'Âmbar' },
  { valor: '#4ade80', nome: 'Verde' },
  { valor: '#2dd4bf', nome: 'Turquesa' },
  { valor: '#38bdf8', nome: 'Azul' },
  { valor: '#f472b6', nome: 'Rosa' },
  { valor: '#a78bfa', nome: 'Lilás' },
  { valor: '#94a3b8', nome: 'Cinza' },
]

export function AreaForm({ area }: { area: Area | null }) {
  const [state, formAction, pending] = useActionState(saveArea, initialState)
  // Controlados (em vez de defaultValue) porque o React reseta os campos
  // não-controlados de um <form action={...}> depois de QUALQUER submissão,
  // inclusive quando a action retorna erro — sem isso, o texto digitado
  // some junto com a mensagem de validação.
  const [icone, setIcone] = useState(area?.icone ?? '')
  const [cor, setCor] = useState(area?.cor ?? CORES[0].valor)
  const [nome, setNome] = useState(area?.nome ?? '')
  const [ordem, setOrdem] = useState(String(area?.ordem ?? 0))
  const router = useRouter()

  // Reseta os campos controlados assim que uma criação (não edição) é
  // bem-sucedida — o componente sobrevive à navegação de volta pra /areas
  // (mesma tela), então sem isso a próxima área herdaria os valores da
  // anterior. Ajustado durante o render (comparando com o status anterior),
  // não num efeito, seguindo o padrão recomendado pelo React.
  const [statusAnterior, setStatusAnterior] = useState(state.status)
  if (state.status !== statusAnterior) {
    setStatusAnterior(state.status)
    if (state.status === 'success' && !area) {
      setIcone('')
      setCor(CORES[0].valor)
      setNome('')
      setOrdem('0')
    }
  }

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/areas')
      router.refresh()
    }
  }, [state.status, router])

  return (
    <form action={formAction} className={styles.form}>
      {area && <input type="hidden" name="id" value={area.id} />}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="icone">Ícone (opcional)</label>
          <input
            id="icone"
            name="icone"
            value={icone}
            onChange={(e) => setIcone(e.target.value)}
            placeholder="Ex: 📚"
            maxLength={4}
          />
        </div>
        <div className={styles.field}>
          <label>Cor</label>
          <input type="hidden" name="cor" value={cor} />
          <div className={styles.corRow}>
            {CORES.map((c) => (
              <button
                key={c.valor}
                type="button"
                title={c.nome}
                aria-pressed={cor === c.valor}
                className={cor === c.valor ? styles.corSwatchSelected : styles.corSwatch}
                style={{ background: c.valor }}
                onClick={() => setCor(c.valor)}
              />
            ))}
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className={styles.corManual}
              title="Escolher outra cor manualmente"
              aria-label="Escolher outra cor manualmente"
            />
          </div>
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Saúde"
            required
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="ordem">Ordem</label>
          <input
            id="ordem"
            name="ordem"
            type="number"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : area ? 'Salvar alterações' : 'Criar área'}
        </button>
        {area && (
          <Link href="/areas" className={styles.cancelLink}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  )
}
