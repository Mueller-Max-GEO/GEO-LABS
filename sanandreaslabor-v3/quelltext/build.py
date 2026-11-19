#!/usr/bin/env python3
"""Baut aus src/ eine einzige HTML-Datei (build/san-andreas-labor-v3.html).

Voraussetzung (einmalig):  npm install        (lädt three.js r170 und esbuild)
Bauen:                     python3 build.py   (mit --dev ohne Verkleinerung)

Die Skripte in src/ werden in alphabetischer Reihenfolge (a_ … f_) aneinandergehängt und zusammen mit three.js
von esbuild zu einem einzigen Skript gebündelt. Gelände und Luftbilder stecken als Text in a_data.js
(erzeugt von tools/bake.py). Nur die Schrift wird aus dem Netz geladen; ohne Netz erscheint die Systemschrift.
"""
import subprocess, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
parts = sorted(SRC.glob('[a-z]_*.js'))
entry = ROOT / '.entry.js'
entry.write_text(
    "import * as THREE from 'three';\n"
    "import {OrbitControls} from 'three/addons/controls/OrbitControls.js';\n"
    "import {LineSegments2} from 'three/addons/lines/LineSegments2.js';\n"
    "import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';\n"
    "import {LineMaterial} from 'three/addons/lines/LineMaterial.js';\n"
    + '\n'.join(p.read_text(encoding='utf8') for p in parts), encoding='utf8')
minify = '--dev' not in sys.argv
cmd = ['npx', '--no-install', 'esbuild', str(entry), '--bundle', '--format=iife', '--target=es2020', '--legal-comments=none', '--log-level=warning']
if minify: cmd.append('--minify')
js = subprocess.run(cmd, cwd=ROOT, check=True, capture_output=True, text=True).stdout
entry.unlink()
js = js.replace('</script', '<\\/script')
html = ('<!doctype html>\n<html lang="de">\n<head>\n' + (SRC / 'head.html').read_text(encoding='utf8')
        + '<style>\n' + (SRC / 'style.css').read_text(encoding='utf8') + '</style>\n</head>\n<body>\n'
        + (SRC / 'body.html').read_text(encoding='utf8')
        + '<script>\n' + js + '</script>\n</body>\n</html>\n')
out = ROOT / 'build' / 'san-andreas-labor-v3.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf8')
# Fassung für claude.ai-Artifacts: ohne äußere Dokument-Tags (die setzt die Plattform selbst)
head=(SRC / 'head.html').read_text(encoding='utf8')
art=('\n'.join(l for l in head.splitlines() if 'charset' not in l and 'name="viewport"' not in l)+'\n<style>\n'+(SRC / 'style.css').read_text(encoding='utf8')+'</style>\n'
     +(SRC / 'body.html').read_text(encoding='utf8')+'<script>\n'+js+'</script>\n')
(ROOT / 'build' / 'artifact.html').write_text(art, encoding='utf8')
print(f'{out}  {len(html)/1e6:.2f} MB  ({len(parts)} Skripte)')
