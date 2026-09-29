/* Cache UI shell only; radar/forecast/warning data must use the network. */
const CACHE='rain-radar-shell-v16';
const SHELL=['./','./index.html','./assets/styles.css','./assets/near-me.css','./assets/favicon.svg','./assets/radar-utils.js','./assets/app.js','./assets/near-me.js','./assets/forecast-core.js','./assets/forecast.js','./assets/places-core.js','./assets/places.js','./assets/animation.js','./assets/pwa.js','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(/\/data\//.test(u.pathname))return; // Never cache stale radar images or radar.json.
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));return;}
 if(SHELL.some(p=>new URL(p,self.registration.scope).pathname===u.pathname))e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});