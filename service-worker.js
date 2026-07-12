const CACHE_NAME = "levelup-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/store.js",
  "./js/schedule.js",
  "./js/data/golfDrills.js",
  "./js/utils/dates.js",
  "./js/utils/esc.js",
  "./js/utils/icons.js",
  "./js/utils/ids.js",
  "./js/utils/charts.js",
  "./js/views/today.js",
  "./js/views/schedule.js",
  "./js/views/gym.js",
  "./js/views/golf.js",
  "./js/views/settings.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first, cache as fallback. This is a solo-user app that gets
// pushed updates directly (no version picker, no "new version available"
// prompt) — so whenever there's a connection, always serve the latest
// code rather than whatever happened to get cached last. The cache exists
// purely for offline use, not for speed, and stays fresh as a side effect
// of every successful online fetch.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
