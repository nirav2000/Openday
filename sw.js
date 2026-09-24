const CACHE='open-days-v2.4.1';
const ASSETS=[
  './','./index.html','./styles.css','./app.js','./integrations.js','./version.json',
  './plugins/app-platform.js','./plugins/autosave.js','./plugins/firebase-token-sync.js','./plugins/developer-notes.js','./plugins/version-lab.js','./plugins/public-overrides.js','./plugins/personal-updates.js',
  './data/schools.json','./data/primary-schools.json','./data/enhancements.json','./calendar.ics','./manifest.webmanifest','./icon.svg'
];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(CACHE).then(c=>c.put(e.request,x));return r}).catch(()=>caches.match(e.request))));
