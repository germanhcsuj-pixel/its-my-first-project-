// Solifon AI Service Worker v2.0
const CACHE_NAME = 'solifon-ai-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/offline-download.html',
  '/manifest.json'
];

// Установка: кэшируем базовые файлы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Solifon SW: Некоторые файлы не закэшированы', err);
      });
    })
  );
  self.skipWaiting();
});

// Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first (онлайн приоритет, потом кэш)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API запросы не кэшируем
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/v1/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Нет сети — берём из кэша
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback — показываем главную страницу
          return caches.match('/index.html');
        });
      })
  );
});
