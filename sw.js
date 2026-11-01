// Версия кэша приложения Кэшбэк-навигатор v2.0
const CACHE_NAME = 'cashback-navigator-v2.0';

// Ресурсы для офлайн-работы
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data.json',
  './cards_config.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isDataFile =
    url.pathname.endsWith('/data.json') ||
    url.pathname.endsWith('/cards_config.json') ||
    url.pathname.endsWith('data.json') ||
    url.pathname.endsWith('cards_config.json');

  // Для data.json и cards_config.json: сначала свежая версия из сети (GitHub Pages), при офлайне — кэш
  if (isDataFile) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // Для интерфейса приложения: сначала кэш (мгновенный старт), параллельно обновление из сети
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => cachedRes);
      return cachedRes || fetchPromise;
    })
  );
});
