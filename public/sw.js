/**
 * Service worker mínimo — só o necessário pra passar no critério de
 * instalabilidade do PWA (não implementa suporte offline completo).
 * Cache-first simples: serve do cache se existir, senão busca na rede.
 */
const CACHE_NAME = 'life-os-v1'
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
  event.respondWith(caches.match(event.request).then((respostaCache) => respostaCache || fetch(event.request)))
})
