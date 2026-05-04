const CACHE_NAME = 'ritmxoid-v3.5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/icons/critical.svg',
  '/icons/high.svg',
  '/icons/low.svg',
  '/icons/optimal.svg',
  '/icons/super.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use no-cache to ensure we get fresh files
      const requests = ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'no-cache' }));
      return cache.addAll(requests);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
