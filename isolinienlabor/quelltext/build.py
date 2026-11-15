# Setzt index.html aus seite.src.html und den Daten in daten/ zusammen: python3 build.py
import os
d=os.path.dirname(os.path.abspath(__file__)); r=lambda f: open(os.path.join(d,'daten',f)).read().strip()
s=open(os.path.join(d,'seite.src.html')).read()
s=(s.replace("/*TERRAIN*/","const DEM_B64 = '"+r('mh.b64')+"';").replace("/*HF*/","const DEM_HF_B64 = '"+r('hf.b64')+"';")
    .replace("/*PHOTO*/","const PHOTO_B64 = '"+r('photo.b64')+"';\nconst LAND_B64 = '"+r('land.b64')+"';"))
open(os.path.join(d,'..','index.html'),'w').write('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n'+s+'\n</body>\n</html>\n')
