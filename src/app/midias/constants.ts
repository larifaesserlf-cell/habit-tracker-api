import type { MidiaTipo, MidiaStatus } from '@/lib/supabase/types'

export const TIPOS: MidiaTipo[] = ['livro', 'filme', 'serie', 'documentario']
export const STATUSES: MidiaStatus[] = ['quero_ver_ler', 'em_andamento', 'concluido', 'abandonado']

export const TIPO_LABEL: Record<MidiaTipo, string> = {
  livro: 'Livro',
  filme: 'Filme',
  serie: 'Série',
  documentario: 'Documentário',
}

export const TIPO_EMOJI: Record<MidiaTipo, string> = {
  livro: '📖',
  filme: '🎬',
  serie: '📺',
  documentario: '🎥',
}

export const STATUS_LABEL: Record<MidiaStatus, string> = {
  quero_ver_ler: 'Quero ver/ler',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  abandonado: 'Abandonado',
}
