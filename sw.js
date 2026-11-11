importScripts('./cloud-worker.js');
const prefix = 'pixel-research-lab:' + self.registration.scope + ':';
const cacheName = prefix + '39ba18dd7d9ec159';
const assetNames = ["index.html", "style.css", "data.js", "art.js", "attendance.js", "reviews.js", "app.js", "transfer.js", "offline.js", "app.webmanifest", "type.woff2", "icon-192.png", "icon-512.png", "OFL.txt", "cloud-account.js", "cloud-worker.js", "visits.js"];
const urls = assetNames.map(file => new URL(file, self.registration.scope).href);
const entry = new URL('index.html', self.registration.scope).href;
const directory = new URL(self.registration.scope);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(urls.map(url => new Request(url, {cache:'reload'})));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(prefix) && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== directory.origin) return;
  const path = url.origin + url.pathname;
  const isEntry = event.request.mode === 'navigate' && (path === directory.href || path === entry);
  if (!isEntry && !urls.includes(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const saved = await cache.match(isEntry ? entry : path);
    return saved || fetch(event.request);
  })());
});

self.addEventListener('sync', event => {
  if(event.tag !== 'pixel-lab-upload') return;
  event.waitUntil((async()=>{
    await self.flushPixelResearchLab();
    for(const client of await self.clients.matchAll({type:'window'})) client.postMessage('pixel-lab-sent');
  })());
});
