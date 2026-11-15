importScripts('./dist/cloud-worker.js');
const prefix = 'pixel-research-lab:' + self.registration.scope + ':';
const cacheName = prefix + '4444f62c4b68e472';
const assetNames = ["index.html", "app.webmanifest", "src/app.js", "src/art.js", "src/attendance-ui.js", "src/attendance.js", "src/bookshelf.js", "src/calendar.js", "src/comms.js", "src/data.js", "src/furniture-art.js", "src/furniture-ui.js", "src/furniture.js", "src/image-resize.js", "src/library-data.js", "src/material-store.js", "src/material-ui.js", "src/offline.js", "src/pet-art.js", "src/pet-ui.js", "src/pets.js", "src/planner.js", "src/reviews.js", "src/rich-body.js", "src/rich-editor.js", "src/server-slack.js", "src/slack-receiver.js", "src/studio-art.js", "src/studio-ui.js", "src/studio.js", "src/transfer.js", "src/visits.js", "assets/fonts/OFL.txt", "assets/fonts/type.woff2", "assets/images/icon-192.png", "assets/images/icon-512.png", "assets/images/items/abacus.png", "assets/images/items/aquarium.png", "assets/images/items/battery.png", "assets/images/items/beaker.png", "assets/images/items/bonsai.png", "assets/images/items/books.png", "assets/images/items/butterfly.png", "assets/images/items/cactus.png", "assets/images/items/camera.png", "assets/images/items/candle.png", "assets/images/items/cassette.png", "assets/images/items/catlamp.png", "assets/images/items/circuit.png", "assets/images/items/coffee.png", "assets/images/items/compass.png", "assets/images/items/cookie.png", "assets/images/items/crab.png", "assets/images/items/croissant.png", "assets/images/items/crystal.png", "assets/images/items/donut.png", "assets/images/items/floppy.png", "assets/images/items/gamepad.png", "assets/images/items/globe.png", "assets/images/items/headphones.png", "assets/images/items/hourglass.png", "assets/images/items/keyboard.png", "assets/images/items/lens.png", "assets/images/items/meteor.png", "assets/images/items/molecule.png", "assets/images/items/moon.png", "assets/images/items/mouse.png", "assets/images/items/mug.png", "assets/images/items/mushroom.png", "assets/images/items/notebook.png", "assets/images/items/pencil.png", "assets/images/items/planet.png", "assets/images/items/plant.png", "assets/images/items/radio.png", "assets/images/items/robot.png", "assets/images/items/rocket.png", "assets/images/items/ruler.png", "assets/images/items/satellite.png", "assets/images/items/scope.png", "assets/images/items/seashell.png", "assets/images/items/server.png", "assets/images/items/sunflower.png", "assets/images/items/teapot.png", "assets/images/items/telescope.png", "assets/images/items/terrarium.png", "assets/images/items/trophy.png", "assets/images/mascot.png", "assets/images/skills/code.png", "assets/images/skills/design.png", "assets/images/skills/infer.png", "assets/images/skills/read.png", "assets/images/skills/write.png", "assets/styles/calendar.css", "assets/styles/companions.css", "assets/styles/editor.css", "assets/styles/library.css", "assets/styles/studio.css", "assets/styles/style.css", "dist/cloud-account.js", "dist/cloud-worker.js"];
const urls = assetNames.map(file => new URL(file, self.registration.scope).href);
const entry = new URL('index.html', self.registration.scope).href;
const directory = new URL(self.registration.scope);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(urls.map(url => new Request(url, {cache:'reload'})));
    // The next navigation can use the complete update even while another lab tab is open.
    await self.skipWaiting();
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
    // A cached entry can follow a host redirect from /index.html to /.
    // Navigation requests reject a redirected Response when redirect mode is manual.
    if (isEntry && saved?.redirected) {
      return new Response(saved.body, {headers:saved.headers, status:saved.status, statusText:saved.statusText});
    }
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
