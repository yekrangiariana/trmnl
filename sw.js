/**
 * TRMNL Dashboard PWA Service Worker
 * Implements offline caching using Stale-While-Revalidate for local assets,
 * and Network-First for dynamic weather and history API responses.
 *
 * iOS 12 Safari Compatible.
 */

var CACHE_NAME = "trmnl-dashboard-cache-v27";
var STATIC_ASSETS = [
  "/",
  "./",
  "index.html",
  "index.css",
  "config.js",
  "app.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "plugins/time.js",
  "plugins/history.js",
  "plugins/life.js",
  "plugins/weather.js",
  "plugins/sun.js",
  "plugins/word.js",
  "plugins/wifi.js",
  "plugins/guardian.js",
  "plugins/wikirandom.js",
  "plugins/wikiphoto.js",
  "plugins/laundry.js",
  "plugins/hsl.js",
  "plugins/settings.js",
];

// 1. Install Event: Cache all core assets
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        console.log("Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(function () {
        return self.skipWaiting();
      }),
  );
});

// 2. Activate Event: Clean up old caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log("Service Worker: Clearing old cache", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

// 3. Fetch Event: Serve with appropriate caching strategy
self.addEventListener("fetch", function (event) {
  var requestUrl = new URL(event.request.url);

  // Bypass service worker interception for Sähkötin API due to WebKit redirect caching bugs in Safari
  if (requestUrl.hostname.indexOf("sahkotin.fi") !== -1) {
    return;
  }

  // Check if it's an API request (external resource)
  var isApiRequest = requestUrl.origin !== self.location.origin;

  if (isApiRequest) {
    // Network-First strategy: try the network, fall back to cache if offline
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          // If response is valid, clone it and cache it for offline fallback
          if (response && response.status === 200) {
            var responseClone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(function () {
          // Offline fallback: load from cache
          return caches.match(event.request);
        }),
    );
  } else {
    // Stale-While-Revalidate strategy: serve from cache immediately,
    // and fetch updated version in the background
    event.respondWith(
      caches.match(event.request).then(function (cachedResponse) {
        var fetchPromise = fetch(event.request)
          .then(function (networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              var responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(function (cache) {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(function () {
            // Ignore fetch errors when offline, cachedResponse will cover it
          });

        return cachedResponse || fetchPromise;
      }),
    );
  }
});
