const CACHE_NAME = 'iqumnov-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './img/pfp.webp',
  './js/lenis.min.js',
  './fonts/fonts.css',
  './fonts/ibm-plex-mono-200-latin.woff2',
  './fonts/ibm-plex-mono-200-cyrillic.woff2',
  './fonts/ibm-plex-mono-500-latin.woff2',
  './fonts/ibm-plex-mono-500-cyrillic.woff2',
  './fonts/inter-600-latin.woff2',
  './fonts/inter-600-cyrillic.woff2',
  './manifest.webmanifest',
  './terminal.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHtml = event.request.mode === 'navigate' ||
                 event.request.headers.get('accept')?.includes('text/html');
  const isMutable = isHtml || /\.(txt|css|md|json|webmanifest|xml)$/i.test(url.pathname);

  if (isMutable) {
    // Network-first with no-cache for HTML and dynamic text/styles/content
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((res) => res || (isHtml ? caches.match('./index.html') : Response.error())))
    );
    return;
  }

  // Cache-first for immutable static assets (fonts, images, lenis)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    })
  );
});
