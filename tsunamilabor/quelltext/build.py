#!/usr/bin/env python3
"""Baut aus quelltext/src eine einzige, offline lauffähige HTML-Datei (../index.html).

Voraussetzung (einmalig):  npm install        (lädt three.js r170 und esbuild)
Bauen:                     python3 build.py

Die Skripte in src/ werden in alphabetischer Reihenfolge (a_ … h_) aneinandergehängt und zusammen
mit three.js von esbuild zu einem einzigen Skript gebündelt. Schriften und Bilder werden nicht nachgeladen.
"""
import subprocess, pathlib, sys, re
ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
parts = sorted(SRC.glob('[a-z]_*.js'))
entry = ROOT / '.entry.js'
entry.write_text(
    "import * as THREE from 'three';\n"
    "import {OrbitControls} from 'three/addons/controls/OrbitControls.js';\n"
    "import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';\n"
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
out = ROOT.parent / 'index.html'
out.write_text(html, encoding='utf8')
print(f'{out}  {len(html)/1024:.0f} KB  ({len(parts)} Skripte)')
