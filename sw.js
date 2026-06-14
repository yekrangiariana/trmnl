/**
 * BRIEF Dashboard PWA Service Worker
 * Implements offline caching using Stale-While-Revalidate for local assets,
 * and Network-First for dynamic weather and history API responses.
 *
 * iOS 12 Safari Compatible.
 */

var CACHE_NAME = "brief-dashboard-cache-v60";
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
  "wallpapers/scene-1.jpg",
  "wallpapers/scene-2.jpg",
  "wallpapers/scene-3.jpg",
  "wallpapers/scene-4.jpg",
  "wallpapers/scene-5.jpg",
  "wallpapers/scene-6.jpg",
  "wallpapers/scene-7.jpg",
  "wallpapers/scene-8.jpg",
  "plugins/icons.js",
  "plugins/time.js",
  "plugins/today_in_history.js",
  "plugins/life_in_weeks.js",
  "plugins/personal_stats.js",
  "plugins/weather.js",
  "plugins/sunrise_sunset.js",
  "plugins/word_of_the_day.js",
  "plugins/finnish_idioms.js",
  "idioms.json",
  "plugins/guest_wifi.js",
  "plugins/news_headlines.js",
  "plugins/todoist.js",
  "plugins/random_wikipedia.js",
  "plugins/nasa_space_photo.js",
  "plugins/laundry_cost.js",
  "plugins/hsl_departures.js",
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

  // Bypass Service Worker for directory listings to avoid iOS 12 WebKit response.clone() bugs.
  // The client code will handle caching/offline fallback using localStorage.
  var isDirectoryListing =
    requestUrl.pathname.endsWith("/wallpapers/") ||
    requestUrl.pathname.endsWith("/wallpapers");
  if (isDirectoryListing) {
    return;
  }

  // Check if it's an API request (external resource)
  var isApiRequest = requestUrl.origin !== self.location.origin;

  if (isApiRequest) {
    // Check if it's a static CDN asset (like Google Fonts)
    var isStaticCDN =
      requestUrl.hostname.indexOf("fonts.googleapis.com") !== -1 ||
      requestUrl.hostname.indexOf("fonts.gstatic.com") !== -1;

    if (isStaticCDN) {
      // Stale-While-Revalidate strategy for CDN static assets (Fonts)
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
              // Ignore fetch failures when offline
            });
          return cachedResponse || fetchPromise;
        }),
      );
    } else {
      // Network-First strategy for dynamic API responses (Open-Meteo, Wikipedia, Todoist, etc.)
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
    }
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
