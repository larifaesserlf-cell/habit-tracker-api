import type { ItemWatchTipo, ItemWatchStatus } from '@/lib/supabase/types'

export const TIPOS: ItemWatchTipo[] = ['filme', 'serie']
export const STATUSES: ItemWatchStatus[] = ['quero_assistir', 'em_andamento', 'concluido']

export const TIPO_LABEL: Record<ItemWatchTipo, string> = {
  filme: 'Filme',
  serie: 'Série',
}

export const TIPO_EMOJI: Record<ItemWatchTipo, string> = {
  filme: '🎬',
  serie: '📺',
}

export const STATUS_LABEL: Record<ItemWatchStatus, string> = {
  quero_assistir: 'Quero assistir',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
}
