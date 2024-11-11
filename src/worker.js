self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            return caches.delete(cacheName);
          }),
        );
      })
      .then(function () {
        return self.clients.matchAll();
      })
      .then(function (clients) {
        return Promise.all(
          clients.map(function (client) {
            return client.navigate(client.url);
          }),
        );
      })
      .then(function () {
        return self.registration.unregister();
      }),
  );
});
