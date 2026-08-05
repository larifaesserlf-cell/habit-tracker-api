/**
 * Gera os ícones PROVISÓRIOS do PWA (fundo escuro + iniciais "LO") em
 * public/. Rodar de novo (`node scripts/gerar-icones-pwa.mjs`) sempre que
 * a cor em src/lib/pwa/theme.ts mudar ou o ícone final for definido —
 * nesse caso, é só apagar este script e substituir os PNGs manualmente.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Mantém igual à cor em src/lib/pwa/theme.ts (PWA_BACKGROUND_COLOR) — não dá
// pra importar o .ts direto de um script solto, então repete aqui.
const COR_FUNDO_PROVISORIA = '#1A1A1A'
const COR_TEXTO_PROVISORIA = '#FFFFFF'

function svgIcone(size) {
  const fontSize = Math.round(size * 0.4)
  const raioCanto = Math.round(size * 0.18)
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${raioCanto}" fill="${COR_FUNDO_PROVISORIA}" />
      <text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif"
            font-weight="700" font-size="${fontSize}" fill="${COR_TEXTO_PROVISORIA}">LO</text>
    </svg>
  `)
}

async function gerar(nomeArquivo, size) {
  const destino = path.join(__dirname, '..', 'public', nomeArquivo)
  await sharp(svgIcone(size)).png().toFile(destino)
  console.log('Gerado:', destino, `(${size}x${size})`)
}

async function main() {
  await gerar('icon-192.png', 192)
  await gerar('icon-512.png', 512)
  await gerar('apple-touch-icon.png', 180)
}

main().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
