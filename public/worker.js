CACHE_VERSION = "0.7.6";
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
    }).then(() => {
      // Check for updates
      if (self.registration.waiting) {
        // New version is available
        self.registration.waiting.postMessage({ type: 'updateAvailable' });
      }
    })
  );
});

// Listen for messages from the new service worker
self.addEventListener('message', function(event) {
  if (event.data.type === 'updateAvailable') {
    // Notify the user that a new version is available
    console.log('New version available.  Please refresh the page.');
    // You can replace the console log with a more user-friendly notification
    // using the Notification API or a custom alert.
    alert('A new version of Ditto is available. Please refresh the page.');
  }
});