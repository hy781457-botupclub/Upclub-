const CACHE_NAME = 'wingo-shell-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // For API requests, try network first then fallback to cache
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).then(resp => {
        return resp;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests, try cache first
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
