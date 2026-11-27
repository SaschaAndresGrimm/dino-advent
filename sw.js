// Offline support. The app is served from ONE cache snapshot (cache first), so a launch never mixes old and new
// files: all of js/*.js, index.html and the icons come from the same release. A new release has a new cache name
// (stamped by the deploy workflow); its service worker precaches everything (all or nothing), then takes over, and
// the page reloads itself at a quiet moment (splash, title or map).
const CACHE = 'dino-advent-dev'; // the deploy workflow replaces this with 'dino-advent-<commit>'
const FILES = ['./', 'index.html', 'js/core.js', 'js/audio.js', 'js/helpers.js', 'js/data.js', 'js/characters.js', 'js/scenery.js', 'js/levelgen.js', 'js/play.js', 'js/bossart.js', 'js/playdraw.js', 'js/screens.js', 'js/menus.js', 'js/mapshop.js', 'js/book.js', 'js/ending.js', 'js/candles.js', 'js/quiz.js', 'js/main.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', e => {
  // 'reload' skips the browser's HTTP cache, so the snapshot is really this release; addAll fails as a whole if any file fails,
  // which keeps the previous (complete) release in charge.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true }))
      .then(hit => hit || fetch(e.request))
      .catch(() => e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())
  );
});
