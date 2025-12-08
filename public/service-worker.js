
// Oakline Bank Service Worker
const CACHE_NAME = 'oakline-bank-v2';
const urlsToCache = [
  '/',
  '/dashboard',
  '/main-menu',
  '/sign-in',
  '/manifest.json',
  '/images/pages/Oakline_Bank_logo_design_c1b04ae0.png',
  '/favicon.ico'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(() => {
        // Ignore cache errors during install
      })
  );
});

// Fetch from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .catch(() => {
            // Return a generic offline response if fetch fails
            return new Response('Offline - Service unavailable', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
      .catch(() => {
        // Fallback error handler
        return new Response('Error', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
