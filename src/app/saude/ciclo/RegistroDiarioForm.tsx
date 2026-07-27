'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveRegistroDiario, type CicloFormState } from '@/actions/ciclo'
import type { FluxoMenstrual, RegistroCiclo } from '@/lib/supabase/types'
import styles from './page.module.css'

const initialState: CicloFormState = { status: 'idle' }

const FLUXO_LABEL: Record<FluxoMenstrual, string> = {
  nenhum: 'Nenhum',
  leve: 'Leve',
  moderado: 'Moderado',
  intenso: 'Intenso',
}

/**
 * Componente remontado (via `key`) toda vez que `dataSelecionada` muda —
 * assim os campos sempre partem do registro certo pra aquela data, sem
 * precisar de lógica de reset manual comparando props anteriores.
 */
export function RegistroDiarioForm({
  dataSelecionada,
  registro,
}: {
  dataSelecionada: string
  registro: RegistroCiclo | null
}) {
  const [state, formAction, pending] = useActionState(saveRegistroDiario, initialState)
  const router = useRouter()

  const [fluxo, setFluxo] = useState<FluxoMenstrual>(registro?.fluxo ?? 'nenhum')
  const [tpm, setTpm] = useState(registro?.tpm ?? false)
  const [humor, setHumor] = useState(registro?.humor ?? '')
  const [sintomas, setSintomas] = useState((registro?.sintomas ?? []).join(', '))
  const [notas, setNotas] = useState(registro?.notas ?? '')

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh()
    }
  }, [state.status, router])

  function mudarData(novaData: string) {
    router.push(`/saude/ciclo?data=${novaData}`)
  }

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="data" value={dataSelecionada} />

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="data_registro">Data</label>
          <input
            id="data_registro"
            type="date"
            value={dataSelecionada}
            onChange={(e) => e.target.value && mudarData(e.target.value)}
          />
        </div>
        <div className={styles.fieldSmall}>
          <label htmlFor="fluxo">Fluxo</label>
          <select id="fluxo" name="fluxo" value={fluxo} onChange={(e) => setFluxo(e.target.value as FluxoMenstrual)}>
            {(Object.keys(FLUXO_LABEL) as FluxoMenstrual[]).map((f) => (
              <option key={f} value={f}>
                {FLUXO_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.toggleField}>
          <label htmlFor="tpm">TPM hoje</label>
          <input id="tpm" name="tpm" type="checkbox" checked={tpm} onChange={(e) => setTpm(e.target.checked)} />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="humor">Humor</label>
          <input
            id="humor"
            name="humor"
            value={humor}
            onChange={(e) => setHumor(e.target.value)}
            placeholder="Ex: irritada, cansada, bem"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="sintomas">Sintomas (separados por vírgula)</label>
          <input
            id="sintomas"
            name="sintomas"
            value={sintomas}
            onChange={(e) => setSintomas(e.target.value)}
            placeholder="Ex: cólica, dor de cabeça, inchaço"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.fieldGrow}>
          <label htmlFor="notas">Como me senti hoje</label>
          <textarea
            id="notas"
            name="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className={styles.textareaDestaque}
            placeholder="Escreva livremente sobre o seu dia…"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : 'Salvar registro do dia'}
        </button>
      </div>
    </form>
  )
}
