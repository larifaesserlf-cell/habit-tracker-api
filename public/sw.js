/**
 * Service worker mínimo — só o necessário pra passar no critério de
 * instalabilidade do PWA (não implementa suporte offline completo).
 *
 * v2: a versão anterior era cache-first pra tudo, inclusive a própria
 * página HTML. Isso quebrava o app depois de qualquer deploy novo — o
 * Next.js muda o hash dos arquivos JS/CSS a cada build, e a página HTML
 * cacheada continuava referenciando os arquivos antigos (que já não
 * existiam mais no servidor), então o app abria sem nenhum estilo.
 * Agora: navegação (a própria página) é network-first, com o cache só
 * como fallback pra quando estiver offline. Recursos estáticos do
 * _next/static (esses sim têm hash no nome e Cache-Control imutável)
 * continuam cache-first, que é seguro porque o nome do arquivo muda a
 * cada build — nunca fica desatualizado.
 */
const CACHE_NAME = 'life-os-v2'
const URLS_PARA_CACHE = ['/']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_PARA_CACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE_NAME).map((nome) => caches.delete(nome))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia))
          return resposta
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  event.respondWith(caches.match(event.request).then((respostaCache) => respostaCache || fetch(event.request)))
})
