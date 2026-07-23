import type {
  ViagemStatus,
  PontoInteressePrioridade,
  PontoInteresseStatus,
} from '@/lib/supabase/types'

export const VIAGEM_STATUSES: ViagemStatus[] = [
  'quero_fazer',
  'planejando',
  'confirmada',
  'concluida',
]

export const VIAGEM_STATUS_LABEL: Record<ViagemStatus, string> = {
  quero_fazer: 'Quero fazer',
  planejando: 'Planejando',
  confirmada: 'Confirmada',
  concluida: 'Concluída',
}

/** Próximo status na progressão natural quero_fazer → planejando → confirmada → concluida. */
export function proximoStatusViagem(atual: ViagemStatus): ViagemStatus | null {
  const idx = VIAGEM_STATUSES.indexOf(atual)
  return idx >= 0 && idx < VIAGEM_STATUSES.length - 1 ? VIAGEM_STATUSES[idx + 1] : null
}

export const PRIORIDADES: PontoInteressePrioridade[] = ['imperdivel', 'se_der_tempo', 'opcional']

export const PRIORIDADE_LABEL: Record<PontoInteressePrioridade, string> = {
  imperdivel: 'Imperdível',
  se_der_tempo: 'Se der tempo',
  opcional: 'Opcional',
}

export const PONTO_STATUSES: PontoInteresseStatus[] = ['quero_ir', 'visitado']

export const PONTO_STATUS_LABEL: Record<PontoInteresseStatus, string> = {
  quero_ir: 'Quero ir',
  visitado: 'Visitado',
}
