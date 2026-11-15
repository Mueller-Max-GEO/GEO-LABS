"""Offline-Fassung (Web-App) für GitHub Pages: index.html + Service Worker + Manifest + Symbole."""
import sys, shutil, hashlib, json, pathlib
from PIL import Image, ImageDraw
SRC=pathlib.Path('/home/claude/sa2/build/san-andreas-labor-v2.html')
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/home/claude/geo-labs/sanandreaslabor'); OUT.mkdir(parents=True,exist_ok=True)
html=SRC.read_text(encoding='utf8')
ver=hashlib.sha1(html.encode()).hexdigest()[:10]
head_add='<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<link rel="icon" type="image/png" href="icon-192.png">\n'
assert '</head>' in html
html=html.replace('</head>',head_add+'</head>',1)
reg="""<script>
/* Offline: Service Worker speichert das Labor auf dem Gerät (nach dem ersten Öffnen läuft es ohne Internet). */
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){ addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }
</script>
"""
html=html.replace('</body>',reg+'</body>',1) if '</body>' in html else html+reg
(OUT/'index.html').write_text(html,encoding='utf8')
FONT='https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;500&family=Atkinson+Hyperlegible+Next:wght@400;500;700&display=swap'
sw="""/* San-Andreas-Labor – Offline-Speicher. Version: %s */
const CACHE='sal-%s';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>caches.open(CACHE)).then(c=>fetch(%s,{mode:'no-cors'}).then(r=>c.put(%s,r)).catch(()=>{})).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('sal-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
/* Zuerst aus dem Speicher (schnell, offline), im Hintergrund aktualisieren */
self.addEventListener('fetch',e=>{ const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url), own=u.origin===location.origin, font=/fonts\\.(googleapis|gstatic)\\.com$/.test(u.hostname); if(!own&&!font) return;
  const key=(own&&r.mode==='navigate')?'./index.html':r;
  e.respondWith(caches.open(CACHE).then(async c=>{ const hit=await c.match(key,{ignoreSearch:own});
    const net=fetch(r).then(res=>{ if(res&&(res.ok||res.type==='opaque')) c.put(key,res.clone()); return res; }).catch(()=>null);
    if(hit){ e.waitUntil(net); return hit; } const res=await net; return res||new Response('Offline – bitte einmal mit Internet öffnen.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}); })); });
"""%(ver,ver,json.dumps(FONT),json.dumps(FONT))
(OUT/'sw.js').write_text(sw,encoding='utf8')
man={"name":"San-Andreas-Labor","short_name":"San Andreas","description":"Transformstörung, Spannung und Erdbeben an der San-Andreas-Verwerfung – 3D-Modell mit echtem Gelände.","lang":"de","start_url":"./","scope":"./","display":"fullscreen","orientation":"any","background_color":"#04060A","theme_color":"#04060A",
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}
(OUT/'manifest.webmanifest').write_text(json.dumps(man,ensure_ascii=False,indent=1),encoding='utf8')
# Symbol: zwei gegeneinander versetzte Blöcke mit gelber Verwerfung und rotem Pfeilpaar
S=1024; im=Image.new('RGB',(S,S),'#0B1420'); d=ImageDraw.Draw(im)
d.rounded_rectangle([0,0,S,S],0,fill='#0B1420')
d.polygon([(150,330),(500,330),(500,820),(150,820)],fill='#6E8A4E'); d.polygon([(524,230),(874,230),(874,720),(524,720)],fill='#A07A4A')
d.rectangle([500,200,524,850],fill='#FFD23F')
d.polygon([(330,700),(330,470),(270,470),(370,380),(470,470),(410,470),(410,700)],fill='#E9442A')
d.polygon([(654,330),(654,560),(594,560),(694,650),(794,560),(734,560),(734,330)],fill='#E9442A')
for n,sz in [('icon-512.png',512),('icon-192.png',192),('apple-touch-icon.png',180)]: im.resize((sz,sz),Image.LANCZOS).save(OUT/n)
print('OK',OUT,ver,round((OUT/'index.html').stat().st_size/1e6,2),'MB')
