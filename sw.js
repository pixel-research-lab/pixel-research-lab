importScripts('./dist/cloud-worker.js');
const prefix = 'pixel-research-lab:' + self.registration.scope + ':';
const cacheName = prefix + 'a7b37963f61d1518';
const assetNames = ["index.html", "app.webmanifest", "src/app.js", "src/art.js", "src/attendance-ui.js", "src/attendance.js", "src/bookshelf.js", "src/calendar.js", "src/comms.js", "src/data.js", "src/furniture-art.js", "src/furniture-ui.js", "src/furniture.js", "src/image-resize.js", "src/library-data.js", "src/material-store.js", "src/material-ui.js", "src/offline.js", "src/pet-art.js", "src/pet-ui.js", "src/pets.js", "src/planner.js", "src/reviews.js", "src/rich-body.js", "src/rich-editor.js", "src/studio-art.js", "src/studio-ui.js", "src/studio.js", "src/transfer.js", "src/visits.js", "assets/fonts/OFL.txt", "assets/fonts/type.woff2", "assets/images/icon-192.png", "assets/images/icon-512.png", "assets/images/items/crab.png", "assets/images/items/floppy.png", "assets/images/items/lens.png", "assets/images/items/mug.png", "assets/images/items/plant.png", "assets/images/items/robot.png", "assets/images/items/scope.png", "assets/images/mascot.png", "assets/images/skills/code.png", "assets/images/skills/design.png", "assets/images/skills/infer.png", "assets/images/skills/read.png", "assets/images/skills/write.png", "assets/styles/calendar.css", "assets/styles/companions.css", "assets/styles/editor.css", "assets/styles/library.css", "assets/styles/studio.css", "assets/styles/style.css", "dist/cloud-account.js", "dist/cloud-worker.js"];
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
