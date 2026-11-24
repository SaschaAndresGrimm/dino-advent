// Offline support: network first (so updates arrive), cache as fallback.
const CACHE = 'dino-advent-dev'; // the deploy workflow replaces this with 'dino-advent-<commit>'
const FILES = ['./', 'index.html', 'js/core.js', 'js/audio.js', 'js/helpers.js', 'js/data.js', 'js/characters.js', 'js/scenery.js', 'js/levelgen.js', 'js/play.js', 'js/bossart.js', 'js/playdraw.js', 'js/screens.js', 'js/menus.js', 'js/mapshop.js', 'js/book.js', 'js/ending.js', 'js/main.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(FILES.map(f => c.add(f)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // network first, but fall back to the cache after 2.5 s so launches on slow Wi-Fi are not held up
  const cached = () => caches.match(e.request, { ignoreSearch: true });
  const net = fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  });
  const timeout = new Promise(res => setTimeout(() => res(cached()), 2500));
  e.respondWith(Promise.race([net.catch(() => cached()), timeout]).then(r => r || net.catch(() => cached())));
});
