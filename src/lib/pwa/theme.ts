/**
 * Valores PROVISÓRIOS de PWA — paleta e ícone finais ainda não foram
 * definidos. Centralizados aqui de propósito: é o único lugar que precisa
 * mudar quando a cor final for escolhida.
 *
 * Usado em `src/app/layout.tsx` (viewport.themeColor) — mas como
 * `public/manifest.json` é JSON puro (sem suporte a import/comentário),
 * `background_color`/`theme_color` de lá precisam ser atualizados à mão
 * pra bater com essa constante. O ícone provisório (iniciais "LO") é
 * gerado por `scripts/gerar-icones-pwa.mjs`, que também tem a cor
 * hardcoded pelo mesmo motivo — rode o script de novo depois de trocar a
 * cor aqui e em manifest.json.
 */
export const PWA_THEME_COLOR = '#1A1A1A'
export const PWA_BACKGROUND_COLOR = '#1A1A1A'
