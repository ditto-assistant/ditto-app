self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    self.registration.unregister()
      .then(function () {
        return navigator.serviceWorker.getRegistrations();
      })
      .then(function (registrations) {
        return Promise.all(registrations.map(function (registration) {
          if (registration.active && registration.active.scriptURL.endsWith('service-worker.js')) {
            return registration.unregister();
          }
        }));
      })
      .then(function () {
        return self.clients.matchAll();
      })
      .then(function (clients) {
        clients.forEach(client => {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});
