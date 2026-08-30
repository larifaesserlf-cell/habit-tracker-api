'use client'

import { useActionState, useState } from 'react'
import { saveTreino, type TreinoFormState } from '@/actions/treino'
import styles from './page.module.css'

type LinhaExercicio = { id: string; nome: string; seriesReps: string; carga: string }

let contador = 0
function novaLinha(): LinhaExercicio {
  contador += 1
  return { id: `linha-${contador}`, nome: '', seriesReps: '', carga: '' }
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export type TreinoParaCopia = {
  id: string
  nome: string
  data: string
  exercicios: { nome: string; seriesReps: string; carga: string }[]
}

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

const initialState: TreinoFormState = { status: 'idle' }

export function NovoTreinoForm({ treinosParaCopia }: { treinosParaCopia: TreinoParaCopia[] }) {
  const [state, formAction, pending] = useActionState(saveTreino, initialState)

  const [data, setData] = useState(hojeISO())
  const [nome, setNome] = useState('')
  const [linhas, setLinhas] = useState<LinhaExercicio[]>([novaLinha()])
  // Só controla a seleção do <select> de cópia — não é o "nome do treino
  // vigente", por isso fica sempre resetado pro placeholder depois de
  // aplicar a cópia (senão pareceria que reescolher o mesmo item de novo
  // não faz nada, já que o valor não teria mudado).
  const [copiaSelecionada, setCopiaSelecionada] = useState('')

  // Após salvar com sucesso, limpa o formulário pro próximo registro — o
  // componente permanece montado (sem navegação), então sem isso os campos
  // ficariam com os dados do treino anterior. Ajustado durante o render
  // (mesmo padrão de CicloForm), não num efeito.
  const [stateAnterior, setStateAnterior] = useState(state)
  if (state !== stateAnterior) {
    setStateAnterior(state)
    if (state.status === 'success') {
      setData(hojeISO())
      setNome('')
      setLinhas([novaLinha()])
    }
  }

  function atualizarLinha(id: string, campo: 'nome' | 'seriesReps' | 'carga', valor: string) {
    setLinhas((atual) => atual.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)))
  }

  function adicionarLinha() {
    setLinhas((atual) => [...atual, novaLinha()])
  }

  function removerLinha(id: string) {
    setLinhas((atual) => (atual.length > 1 ? atual.filter((l) => l.id !== id) : atual))
  }

  /**
   * Copia o nome e a lista de exercícios de um treino já feito — a rotina
   * dela repete os mesmos exercícios por semanas a fio, só variando
   * série/carga aos poucos, então copiar e ajustar é bem mais rápido que
   * digitar tudo de novo. Não mexe na data (continua sendo hoje por
   * padrão) nem impede editar qualquer campo depois de copiar.
   */
  function copiarTreino(id: string) {
    setCopiaSelecionada(id) // feedback visual momentâneo do que foi escolhido
    const treino = treinosParaCopia.find((t) => t.id === id)
    if (!treino) return

    setNome(treino.nome)
    setLinhas(
      treino.exercicios.length > 0
        ? treino.exercicios.map((e) => ({ ...novaLinha(), nome: e.nome, seriesReps: e.seriesReps, carga: e.carga }))
        : [novaLinha()]
    )
    setCopiaSelecionada('') // volta pro placeholder, já aplicou
  }

  const exerciciosJson = JSON.stringify(linhas.map(({ nome, seriesReps, carga }) => ({ nome, seriesReps, carga })))

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="exercicios" value={exerciciosJson} />

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      {treinosParaCopia.length > 0 && (
        <div className={styles.fieldGrow}>
          <label htmlFor="treino_copiar">Copiar de um treino já feito</label>
          <select id="treino_copiar" value={copiaSelecionada} onChange={(e) => copiarTreino(e.target.value)}>
            <option value="">Selecionar treino…</option>
            {treinosParaCopia.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} — {formatDataBR(t.data)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.formRow}>
        <div className={styles.fieldSmall}>
          <label htmlFor="treino_data">Data</label>
          <input id="treino_data" name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div className={styles.fieldGrow}>
          <label htmlFor="treino_nome">Nome do treino</label>
          <input
            id="treino_nome"
            name="nome"
            type="text"
            placeholder="Ex: Treino 18"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.exerciciosForm}>
        {linhas.map((linha, i) => (
          <div key={linha.id} className={styles.exercicioLinha}>
            <input
              type="text"
              placeholder="Exercício"
              value={linha.nome}
              onChange={(e) => atualizarLinha(linha.id, 'nome', e.target.value)}
              className={styles.exercicioInputNome}
              aria-label={`Nome do exercício ${i + 1}`}
            />
            <input
              type="text"
              placeholder="Ex: 4x12"
              value={linha.seriesReps}
              onChange={(e) => atualizarLinha(linha.id, 'seriesReps', e.target.value)}
              className={styles.exercicioInputSerie}
              aria-label={`Séries e repetições do exercício ${i + 1}`}
            />
            <input
              type="text"
              placeholder="Carga"
              value={linha.carga}
              onChange={(e) => atualizarLinha(linha.id, 'carga', e.target.value)}
              className={styles.exercicioInputCarga}
              aria-label={`Carga do exercício ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => removerLinha(linha.id)}
              className={styles.deleteBtn}
              disabled={linhas.length === 1}
              aria-label={`Remover exercício ${i + 1}`}
            >
              ✕
            </button>
          </div>
        ))}

        <button type="button" onClick={adicionarLinha} className={styles.secondaryBtn}>
          + Adicionar exercício
        </button>
      </div>

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Salvando…' : 'Registrar treino'}
        </button>
      </div>
    </form>
  )
}
