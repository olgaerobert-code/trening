/* Cache-first: po pierwszym wejściu aplikacja działa bez zasięgu.
   Zmiana CACHE unieważnia stary komplet plików. */
const CACHE = 'plan12-v18';
const ASSETS = [
  './', './index.html', './app.js?v=17', './progresja.js?v=17', './plan.json?v=17',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Wejście z linkiem ?t=9 ma inny adres niż to, co jest w cache — bez tego
  // aplikacja otwarta z zakładki nie wstałaby bez zasięgu.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => {
      // Świeża wersja w tle, ale odpowiadamy natychmiast z cache.
      const net = fetch(e.request)
        .then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
