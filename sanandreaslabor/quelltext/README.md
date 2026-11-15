# San-Andreas-Labor V2 – Quelltext

Interaktives 3D-Modell für den Geographieunterricht: Wie entstehen Erdbeben an einer Transformstörung?
Drei Maßstäbe derselben Plattengrenze mit echtem Gelände und Luftbildern (Kalifornien · Carrizo-Ebene · Wallace Creek).

## Bauen

    npm install            # einmalig: three.js r170, esbuild
    python3 build.py       # erzeugt build/san-andreas-labor-v2.html (eine Datei, rund 6 MB)
    node tests/model_test.js

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/a_data.js` | Gelände und Luftbilder als eingebettete Bilder (erzeugt von `tools/bake.py`) |
| `src/b_model.js` | Rechenmodell: Zeitachse, Verhaken, Erdbeben, Verformung (`dispU`), Erdbebenfolge am Wallace Creek |
| `src/c_text.js` | alle Texte: Phasen, Kennzahlen, Aufgaben, Vergleich „gleichmäßiges Gleiten“, Erklärfilm |
| `src/d_scene.js` | three.js-Szene: drei Blockbilder, Shader für Verformung, Gesteinsschnitte, Pfeile, Verwerfungsverlauf |
| `src/e_labels.js` | Beschriftungen ohne Überlappung (aus dem Tsunami-Labor) |
| `src/f_app.js` | Ablauf, Anzeige, Diagramm, Kamera, Steuerung, Erklärfilm |
| `src/style.css`, `body.html`, `head.html` | Oberfläche im Stil der GEO-LABS (Erdumlauf V2, Tsunami V2) |

## Koordinaten

`s` = Meter entlang der Verwerfung nach Nordwesten (Richtung 318°), `w` = Meter quer dazu nach Nordosten.
Nullpunkt: Wallace Creek (UTM 11N: 242 822 E, 3 906 787 N; 35,271° N, 119,827° W), 100 m nordwestlich davon.
Pazifische Platte: `w < 0`. Szene: x = s, z = w, y = Höhe.

## Daten (tools/)

- Höhen: USGS 3D Elevation Program (3DEP), Dienst `elevation.nationalmap.gov/…/3DEPElevation/ImageServer`.
  Wallace Creek 1 m (Lidar), Carrizo-Ebene 290 m, Kalifornien 2,5 km.
- Bilder: USGS The National Map, „USGS Imagery Only“ (`basemap.nationalmap.gov`). Gemeinfrei (US-Bundesbehörde).
- `frame.py` Koordinatensystem · `plan.py` Kachelplan · `mosaic.py` Kacheln zusammensetzen ·
  `warp.py` ins Verwerfungs-Koordinatensystem drehen · `creek.py` Bachlauf aus dem Gelände ableiten (Abflussberechnung) ·
  `bake.py` Texturen und `a_data.js` schreiben.
- Die Höhen wurden als 8-Bit-Bilder in mehreren Höhenbändern (je 32 m) abgerufen und wieder zusammengesetzt
  (Genauigkeit rund 0,13 m). `harvest.py` gehört zu diesem Abruf und wird zum Bauen nicht gebraucht.

## Modell

- Zwischen den Erdbeben (Savage & Burford 1973): Verschiebung parallel zur Verwerfung
  `u(d) = ±(F/π)·arctan(d/D)` mit Plattenweg `F`, Abstand `d`, Verhakungstiefe `D` = 15 km.
- Beim Erdbeben (elastischer Rückprall, Reid 1910): Die Umgebung holt den Rückstand nach; danach `u = ±S/2`.
- Versatzrate 3,5 cm/Jahr; Zyklus 150 Jahre → 5,25 m. Phase 2/3: Verformung 3000-fach überhöht.
- Wallace Creek: 130 m in 3 700 Jahren, 24 Erdbeben (nur 1857 ist datiert; die übrigen sind unregelmäßig verteilt).
