import type { Area } from './supabase/types'

/** Nome da área com o ícone na frente, só se ela tiver um definido — o
 *  ícone é opcional (sem valor padrão forçado), então não faz sentido
 *  mostrar um espaço em branco quando ele não existe. */
export function labelArea(area: Pick<Area, 'icone' | 'nome'>): string {
  return area.icone ? `${area.icone} ${area.nome}` : area.nome
}
