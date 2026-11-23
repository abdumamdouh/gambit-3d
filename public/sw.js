// Gambit 3D service worker: offline play. Bump VERSION to drop old caches.
const VERSION = 'g3d-v2'
const ENGINE = ['/engine/stockfish-17.1-lite-single-03e3232.js', '/engine/stockfish-17.1-lite-single-03e3232.wasm']

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION)
    // Cache the page, every hashed asset it references, and the engine — so the next visit works offline.
    const html = await (await fetch('/', { cache: 'no-store' })).text()
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1])
    await cache.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png', ...assets, ...ENGINE])
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return // Lichess, PeerJS, LM Studio: always live
  if (e.request.mode === 'navigate') {
    // Pages: network first (fresh deploys), cache when offline. Keeps ?join= and OAuth ?code= working.
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put('/', c)); return r }).catch(() => caches.match('/', { ignoreVary: true })))
    return
  }
  // Hashed assets, engine, icons: cache first.
  e.respondWith(caches.match(e.request, { ignoreVary: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)) }
    return r
  })))
})
