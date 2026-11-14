# Schalenbau-Labor V2 – Quelltext

Stand: 2026-11-12 · fertige Datei: `../schalenbau-v2.html` (eine Datei, alles eingebettet, läuft ohne Internet; nur die Schrift kommt von Google Fonts und fällt sonst auf die Systemschrift zurück).

## Bauen
    python3 build.py          # dist/schalenbau-v2.html (Datei, three.js eingebettet), dist/schalenbau-v2-artifact.html (für Claude-Artifact, three.js vom CDN)
    python3 build.py --fast   # dist/test*.html mit kleiner Erdkarte (4k) für schnelle Tests

## Ordner
- `src/` – Seite in Teilen: `head.html`, `style.css`, `body.html`, `sim.js` (Mantelkonvektion), `a_core.js` (Tiefen-Abbildung, PREM, Daten lesen), `b_scene.js` (3D-Szene, Shader, Simulation, Teilchen, Sonde, Platten, Magnetfeld), `c_seis.js` (Erdbebenwellen durch PREM), `d_text.js` (alle Texte: Stationen, Info-Karten, Beschriften, Quiz), `e_ui.js` (Bedienung, Kamera, Beschriftung, Reise).
- `assets/` – eingebettete Bilder und Daten: Erdkarte 8k/4k, Wolken+Wasser, Relief, Milchstraße (wie Erdumlauf V2); `struct1.png` (R Höhe 0–6,5 km, G Wassertiefe 0–8 km, B Eis 0–4,5 km), `struct2.png` (R √(Sediment/20 km), G Moho 0–80 km, B Lithosphärenbasis 0–320 km), je 1440×720; `plates.json` (Plattengrenzen PB2002); `sim0.bin` (Startzustand der Konvektion, 512×96).
- `lib/` – three.js 0.147 (MIT-Lizenz).
- `data/` – Python-Skripte, mit denen `struct*.png` aus LITHO1.0 erzeugt wurden (Pfade darin zeigen auf die Arbeitsumgebung; LITHO1.0-Daten aus dem PyPI-Paket `litho1pt0`).
- `tests/` – Playwright-Skripte für Bildschirmfotos und Rechenkontrollen (PREM, Laufzeiten).

## Texte ändern
Alle Texte stehen in `src/d_text.js` (sinngemäß nach dem Buch formuliert, nicht wörtlich). Danach `python3 build.py`.
