/* Change this version whenever the application files change. */
const CACHE_PREFIX = 'yuki-winter-';
const CACHE_NAME = CACHE_PREFIX + 'v27';
const INDEX_URL = new URL('./index.html', self.location.href).href;
const SCOPE_URL = new URL('./', self.location.href).href;
const ASSETS = ['index.html', 'manifest.webmanifest', 'icon.svg'].map(path => new URL('./' + path, self.location.href).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // All required files must succeed before this worker becomes usable offline.
    await cache.addAll(ASSETS.map(url => new Request(url, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
    for (const client of await self.clients.matchAll({type: 'window'})) client.postMessage({type: 'APP_UPDATED', version: CACHE_NAME.slice(CACHE_PREFIX.length)});
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isAppPage = request.mode === 'navigate' &&
    (url.pathname === new URL(SCOPE_URL).pathname || url.pathname === new URL(INDEX_URL).pathname);
  const assetURL = url.origin + url.pathname;
  if (!isAppPage && !ASSETS.includes(assetURL)) return;
  // Read saved content immediately. No network timeout blocks the trip UI.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const saved = await cache.match(isAppPage ? INDEX_URL : assetURL);
    if (saved) return saved;
    return fetch(request);
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_OFFLINE' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const saved = await Promise.all(ASSETS.map(url => cache.match(url)));
    event.ports[0].postMessage({ready: saved.every(Boolean), version: CACHE_NAME.slice(CACHE_PREFIX.length)});
  })());
});
