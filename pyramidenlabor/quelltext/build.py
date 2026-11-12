#!/usr/bin/env python3
# Baut das Pyramiden-Labor: eine einzige HTML-Datei mit allen Daten (wie Erdumlauf V2 und Schalenbau V2)
import json, sys, os
R=os.path.dirname(os.path.abspath(__file__))+'/'
src=lambda n: open(R+'src/'+n,encoding='utf-8').read()
parts=['a_data.js','b_scene.js','c_text.js','d_ui.js','e_film.js']
js='\n'.join(src(p) for p in parts)
head=src('head.html'); css=src('style.css'); body=src('body.html')
data=open(R+'assets/popdata.json',encoding='utf-8').read()
outl=open(R+'assets/outlines.json',encoding='utf-8').read()
import base64
# Schrift Inter (SIL Open Font License 1.1) wird eingebettet: gleiches Schriftbild auf jedem Gerät, auch ohne Internet
font=base64.b64encode(open(R+'assets/font/inter-latin-wght-normal.woff2','rb').read()).decode()
css='@font-face{font-family:"Inter Var";font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,'+font+') format("woff2")}\n'+css
T3='https://cdn.jsdelivr.net/npm/three@0.147.0/'
LIBS=['build/three.min.js','examples/js/controls/OrbitControls.js','examples/js/lines/LineSegmentsGeometry.js','examples/js/lines/LineGeometry.js','examples/js/lines/LineMaterial.js','examples/js/lines/LineSegments2.js','examples/js/lines/Line2.js',
      'examples/js/shaders/CopyShader.js','examples/js/shaders/LuminosityHighPassShader.js','examples/js/postprocessing/EffectComposer.js','examples/js/postprocessing/RenderPass.js','examples/js/postprocessing/ShaderPass.js','examples/js/postprocessing/MaskPass.js','examples/js/postprocessing/UnrealBloomPass.js']
libs=''.join('<script src="%s%s"></script>\n'%(T3,p) for p in LIBS)                      # Artifact: three.js vom CDN
libs_inline=''.join('<script>\n%s\n</script>\n'%open(R+'lib/'+os.path.basename(p),encoding='utf-8').read() for p in LIBS)   # Datei: three.js eingebettet (läuft ohne Internet)
def mk(L): return head+'<style>\n'+css+'\n</style>\n'+body+'\n'+L+'<script>window.__POPDATA='+data+';window.__OUTLINES='+outl+';</script>\n<script>\n'+js+'\n</script>\n'
os.makedirs(R+'dist',exist_ok=True)
page=mk(libs)
open(R+'dist/pyramiden-labor-artifact.html','w',encoding='utf-8').write(page)
wrap=lambda pg:'<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n'+pg+'</body>\n</html>\n'
full=wrap(mk(libs_inline))
open(R+'dist/pyramiden-labor.html','w',encoding='utf-8').write(full)
print('Artifact: %.2f MB · Datei: %.2f MB'%(len(page.encode())/1e6,len(full.encode())/1e6))
