// const CACHE_VERSION = process.env.VERSION || "0.0.1"; // fallback version in case of an issue
CACHE_VERSION = '0.6.38';
const CACHE_NAME = `ditto-pwa-${CACHE_VERSION}`;

const urlsToCache = ['/'];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache: ', CACHE_NAME);
      return cache.addAll(urlsToCache).then(() => {
        console.log('All resources have been fetched and cached.');
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});