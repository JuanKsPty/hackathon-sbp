// Service worker de Rankings de Crédito (#8). Hecho a mano, sin librerías.
// Guarda la "cáscara" de la app para que abra rápido y se pueda instalar en el celular.
// Al cambiar lo que se guarda, sube la versión: el nombre nuevo borra la caché vieja.
const CACHE = 'rankings-publico-v2'

// Archivos mínimos para abrir la app.
const CASCARA = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/marca/logo.svg',
  '/marca/icon-192.png',
  '/marca/icon-512.png',
]

// Instalación: guarda la cáscara y entra en funciones sin esperar a que se cierren las pestañas.
self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CASCARA)))
  self.skipWaiting()
})

// Activación: borra las cachés de versiones anteriores y toma el control de las pestañas abiertas.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  // Solo GET del mismo origen; lo demás pasa directo a la red.
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // El API nunca se guarda: las respuestas cambian según la sesión y deben estar al día.
  // Esto cubre también /api/docs y las descargas CSV.
  if (url.pathname.startsWith('/api/')) return

  // Navegación (abrir una ruta de la SPA): primero la red; sin conexión, el index.html guardado.
  if (request.mode === 'navigate') {
    evento.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  // Archivos con hash en el nombre: nunca cambian, así que primero la caché.
  if (url.pathname.startsWith('/assets/')) {
    evento.respondWith(primeroCache(request))
    return
  }

  // Resto de archivos estáticos: responde con la caché y actualiza en segundo plano.
  evento.respondWith(cacheYActualiza(request, evento))
})

async function primeroCache(request) {
  const guardada = await caches.match(request)
  if (guardada) return guardada
  const respuesta = await fetch(request)
  if (respuesta.ok) {
    const cache = await caches.open(CACHE)
    cache.put(request, respuesta.clone())
  }
  return respuesta
}

async function cacheYActualiza(request, evento) {
  const cache = await caches.open(CACHE)
  const guardada = await cache.match(request)
  const deRed = fetch(request)
    .then((respuesta) => {
      if (respuesta.ok) cache.put(request, respuesta.clone())
      return respuesta
    })
    .catch(() => guardada)
  if (guardada) {
    // Que la actualización termine aunque ya hayamos respondido con la copia guardada.
    evento.waitUntil(deRed)
    return guardada
  }
  return deRed
}
