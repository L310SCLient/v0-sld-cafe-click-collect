const CACHE_NAME = 'sld-cafe-v2'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
]

// Authenticated areas: never stored on the device, never served from cache.
const PRIVATE_PREFIXES = ['/interface', '/admin']

const OFFLINE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pas de connexion — SLD Café</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F7F2E9;color:#241E1A;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div>
<h1 style="font-size:24px;margin:0 0 12px">Pas de connexion</h1>
<p style="margin:0 0 24px;opacity:.7">Le serveur ne répond pas. Vérifiez la connexion, puis réessayez.</p>
<a href="" style="color:#241E1A">Réessayer</a>
</div>
</body>
</html>`

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function isPrivate(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches (including v1, which held authenticated pages)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: cache-first for static assets, network-only for private areas,
// network-first for public pages. Offline without a copy: an explicit page.
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and external requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // En développement, les noms de fichiers de `/_next/static/` ne changent pas
  // à chaque recompilation : le cache-first servait alors un JavaScript périmé
  // sur un HTML neuf, et React échouait à s'attacher (erreur d'hydratation,
  // écran à moitié ancien). Sur localhost, on ne met donc rien en cache.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return

  // Static assets (fonts, images, CSS, JS): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Private areas: network only
  if (isPrivate(url.pathname)) {
    event.respondWith(fetch(request).catch(() => offlineResponse()))
    return
  }

  // Public pages and API: network-first with offline fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.mode === 'navigate') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || offlineResponse()))
  )
})
