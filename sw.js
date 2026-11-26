/* Cache-first: po pierwszym wejściu aplikacja działa bez zasięgu.
   Zmiana CACHE unieważnia stary komplet plików. */
const CACHE = 'trening-v92';
const ASSETS = [
  './', './index.html', './app.css?v=91', './app.js?v=91', './progresja.js?v=91', './figury.js?v=91', './plan.json?v=91',
  './plan-cykl1.json?v=91', './plan-cykl2.json?v=91', './plan-cykl3.json?v=91', './plan-cykl4.json?v=91',
  './fonts/Grotesk.woff2?v=91', './fonts/Grotesk-pl.woff2?v=91', './fonts/Mono.woff2?v=91', './fonts/Mono-pl.woff2?v=91',
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
      // no-store: bez tego iPhone brał stronę z pamięci przeglądarki (do 10 min)
      // i ładował starą wersję aplikacji mimo nowej na serwerze.
      fetch(e.request.url, { cache: 'no-store', credentials: 'same-origin' })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
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

// Tapnięcie w powiadomienie (np. „Koniec przerwy") wraca do otwartej aplikacji.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const okno = list.find(c => 'focus' in c);
      return okno ? okno.focus() : self.clients.openWindow('./');
    })
  );
});
