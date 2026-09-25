/* Healthy caches only public app assets. Account pages and Supabase data remain network-only. */
const CACHE_NAME = 'healthy-pwa-static-v1';
const CACHE_PREFIX = 'healthy-pwa-';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([OFFLINE_URL, '/icons/mark.svg']);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && !url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        return await caches.match(OFFLINE_URL) || Response.error();
      }
    })());
    return;
  }

  const isPublicAsset = url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/persian-fonts/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/apple-touch-icon.png';

  if (!isPublicAsset) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      } catch {
        // Storage pressure should not prevent the online asset from loading.
      }
    }
    return response;
  })());
});
