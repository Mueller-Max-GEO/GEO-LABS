#!/usr/bin/env python3
# Baut das Schalenbau-Labor V2: eine einzige HTML-Datei mit allen Bildern und Daten (wie Erdumlauf V2)
import base64, json, sys, os, re
R=os.path.dirname(os.path.abspath(__file__))+'/'
fast = '--fast' in sys.argv           # kleine Erdkarte für schnelle Tests
main = 'main_test.js' if '--test' in sys.argv else None
def b64(path, mime): return 'data:%s;base64,%s' % (mime, base64.b64encode(open(path,'rb').read()).decode())
assets = {
  'earth_day.jpg': b64(R+('assets/earth_day.jpg' if fast else 'assets/earth_day_8k.jpg'),'image/jpeg'),
  'earth_cw.jpg': b64(R+'assets/earth_cw.jpg','image/jpeg'),
  'earth_height.jpg': b64(R+'assets/earth_height.jpg','image/jpeg'),
  'milkyway.jpg': b64(R+'assets/milkyway.jpg','image/jpeg'),
  'struct1.png': b64(R+'assets/struct1.png','image/png'),
  'struct2.png': b64(R+'assets/struct2.png','image/png'),
  'sim0': b64(R+'assets/sim0.bin','application/octet-stream'),
}
src = lambda n: open(R+'src/'+n, encoding='utf-8').read()
sim = src('sim.js')
parts = ['a_core.js','b_scene.js','c_seis.js','d_text.js','e_ui.js']
if main: parts = ['a_core.js','b_scene.js', main]
js = '\n'.join(src(p) for p in parts if os.path.exists(R+'src/'+p))
head = src('head.html'); css = src('style.css'); body = src('body.html')
T3 = 'https://cdn.jsdelivr.net/npm/three@0.147.0/'
LIBS = ['build/three.min.js','examples/js/controls/OrbitControls.js','examples/js/lines/LineSegmentsGeometry.js','examples/js/lines/LineGeometry.js','examples/js/lines/LineMaterial.js','examples/js/lines/LineSegments2.js','examples/js/lines/Line2.js']
libs = ''.join('<script src="%s%s"></script>\n' % (T3,p) for p in LIBS)   # Artifact: three.js vom CDN
libs_inline = ''.join('<script>\n%s\n</script>\n' % open(R+'lib/'+os.path.basename(p),encoding='utf-8').read() for p in LIBS)   # Datei: three.js eingebettet (läuft ohne Internet)
libs_local = ''.join('<script src="/three/%s"></script>\n' % p for p in LIBS)
def mk(L): return (head + '<style>\n' + css + '\n</style>\n' + body + '\n' + L
  + '<script>window.__ASSETS=' + json.dumps(assets) + ';</script>\n'
  + '<script>const SIM_SRC=' + json.dumps(sim) + ';\nconst PLATES=' + open(R+'assets/plates.json').read() + ';</script>\n'
  + '<script>\n' + js + '\n</script>\n')
page = mk(libs)
os.makedirs(R+'dist', exist_ok=True)
name = 'test' if (fast or main) else 'schalenbau-v2'
open(R+'dist/%s-artifact.html' % name,'w',encoding='utf-8').write(page)
wrap = lambda pg: '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>Schalenbau V2 – GEO GYM</title>\n<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n' + pg + '</body>\n</html>\n'
open(R+'dist/%s.html' % name,'w',encoding='utf-8').write(wrap(mk(libs_inline)))       # eigenständige Datei
open(R+'dist/%s-local.html' % name,'w',encoding='utf-8').write(wrap(mk(libs_local)))  # Testfassung (Server mit /three/)
print(name, 'Artifact: %.2f MB · Datei: %.2f MB' % (len(page.encode())/1e6, len(wrap(mk(libs_inline)).encode())/1e6))
