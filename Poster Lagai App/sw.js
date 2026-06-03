const CACHE_NAME = 'posterlagai-v1';

// App shell files to cache (your own files only)
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Firebase / CDN requests → always network (live data)
// - Everything else → cache first, fallback to network
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Always go network for Firebase, CDN scripts, and external APIs
  const alwaysNetwork = [
    'firestore.googleapis.com',
    'firebase',
    'gstatic.com',
    'cdnjs.cloudflare.com',
    'googleapis.com'
  ];

  if (alwaysNetwork.some(domain => url.includes(domain))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else (app shell, icons, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache valid responses for future use
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback: return cached index.html for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
