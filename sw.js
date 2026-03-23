// sw.js - Service Worker para PWA
const CACHE_NAME = 'semlimites-v1';
const urlsToCache = [
  '/SemLimites/',
  '/SemLimites/index.html',
  '/manifest.json'
];

// Instalação
self.addEventListener('install', event => {
  console.log('📦 Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch - serve do cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Ativação
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker ativado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
