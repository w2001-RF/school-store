// Service worker minimal (sans dépendance externe) : cache-first pour les assets buildés
// (noms hashés = immuables), network-first pour la navigation (avec repli hors-ligne),
// stale-while-revalidate pour le reste. Portée = dossier où ce fichier est servi (respecte
// VITE_BASE_PATH pour les déploiements en sous-répertoire, ex. GitHub Pages).
const CACHE_NAME = 'school-store-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    )
    return
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        return response
      }))
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => cached)
      return cached || fetchPromise
    })
  )
})
