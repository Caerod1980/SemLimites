// sw.js - Service Worker para PWA SemLimites
const CACHE_NAME = 'semlimites-v1';
const urlsToCache = [
  '/SemLimites/',
  '/SemLimites/index.html',
  '/manifest.json'
];

// Instalação
self.addEventListener('install', event => {
  console.log('📦 Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📁 Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('❌ Erro ao cachear:', err))
  );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Atualizar cache
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker ativado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
