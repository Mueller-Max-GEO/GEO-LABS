/* San-Andreas-Labor – Offline-Speicher. Version: fe8aca4578 */
const CACHE='sal-fe8aca4578';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>caches.open(CACHE)).then(c=>fetch("https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;500&family=Atkinson+Hyperlegible+Next:wght@400;500;700&display=swap",{mode:'no-cors'}).then(r=>c.put("https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;500&family=Atkinson+Hyperlegible+Next:wght@400;500;700&display=swap",r)).catch(()=>{})).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('sal-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
/* Zuerst aus dem Speicher (schnell, offline), im Hintergrund aktualisieren */
self.addEventListener('fetch',e=>{ const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url), own=u.origin===location.origin, font=/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname); if(!own&&!font) return;
  const key=(own&&r.mode==='navigate')?'./index.html':r;
  e.respondWith(caches.open(CACHE).then(async c=>{ const hit=await c.match(key,{ignoreSearch:own});
    const net=fetch(r).then(res=>{ if(res&&(res.ok||res.type==='opaque')) c.put(key,res.clone()); return res; }).catch(()=>null);
    if(hit){ e.waitUntil(net); return hit; } const res=await net; return res||new Response('Offline – bitte einmal mit Internet öffnen.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}); })); });
