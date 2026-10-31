# Gletscherlabor Hintereisferner

Interaktives 3D-Modell des **Hintereisferners** (Ötztaler Alpen, Tirol) für den Geographieunterricht.
Das Modell rechnet Schneefall, Schmelze, Firn, Eisfluss, Gletscherspalten und Moränen im Browser
und zeigt, wie sich Temperatur und Niederschlag auf die Gleichgewichtslinie (ELA) und den Gletscher auswirken.

**Starten:** `index.html` im Browser öffnen, oder über GitHub Pages (siehe unten).
Die Seite ist eine einzige Datei. Höhenmodell, Oberfläche, Klima und vorgerechnete Gletscherstände sind eingebettet.
Nur three.js und die Schriften werden aus dem Internet geladen.

## Funktionen

- **Zeitraffer** von ¼ bis zu mehreren hundert Modelljahren pro Sekunde, mit Jahreszeiten.
- **Jahreslauf:** ein Haushaltsjahr (1. Oktober – 30. September) langsam und stufenlos durchgehen,
  mit Schneedecke in drei Höhenstufen, Schneegrenze und Erklärung jeder Phase.
- **Klimaregler:** mittlere Jahrestemperatur (±5 °C) und Niederschlag (±50 %).
  Die ELA verschiebt sich um rund 133 m pro °C.
- **Gemessenes Klima** (HISTALP 1850–2003) abspielen.
- **Gletscher als Körper:** Eisdicken-Färbung, Eiskörper anheben, darunter das ausgeschliffene Felsbett.
- **Gletscherspalten** aus dem berechneten Fliessfeld: Querspalten in Eisbrüchen, schräge Randspalten,
  Längsspalten an der Zunge.
- **Moränen** und Gletschervorfeld nach dem Rückzug, Längs- und Querschnitt, Fliesslinien, Massenbilanz.
- Ausgangszustände **1850** (Hochstand der Kleinen Eiszeit) und **2003**.

## Wie das Modell rechnet

| Teil | Umsetzung |
|---|---|
| Gelände | SRTM-Höhenmodell (3″), auf 25 m verfeinert. Oberfläche aus Höhe, Neigung, Exposition und Abfluss berechnet (kein Satellitenbild). |
| Felsbett | Eisdicke nach GlabTop (Neigung + Schubspannung, Linsbauer et al. 2012) mit dünnerem Eis an Eisscheiden. |
| Massenbilanz | Halbmonatliches Grad-Tag-Modell: −0,65 °C/100 m, +4 % Niederschlag/100 m, Schnee unter ca. +1 °C. Grad-Tag-Faktoren 3,0 / 4,5 / 6,1 mm w.e. °C⁻¹ d⁻¹ (Schnee/Firn/Eis), Besonnung mit Schlagschatten, Lawinenschnee am Wandfuss. Firn wird in einigen Jahren zu Eis. |
| Eisfluss | 2D-Flachschicht-Näherung (Glen, n = 3) mit Gleiten auf 125-m-Gitter, massenerhaltend. |
| Schutt & Moränen | Erosion am Bett und Steinschlag von Felswänden, mit dem Eis transportiert und am Eisrand abgelagert. |
| Spalten | Hauptdehnungsrate des Oberflächen-Geschwindigkeitsfelds. Spalten ab ca. 0,01–0,06 pro Jahr, quer zur stärksten Dehnung. |

**Kalibrierung:** Mit dem gemessenen Klima 1850–2003 trifft das Modell den Hintereisferner 2003 recht gut
(Modell 7,4 km², Zunge 2452 m; Inventar 8,0 km², 2470 m). Der Rückzug seit dem Hochstand beträgt rund 2,9 km
(gemessen 2950 m von 1855 bis 1987). ELA 1961–1990 im Modell: 3030 m (gemessen 2933 m).

**Grenzen:** Die Oberfläche ist berechnet, kein Foto. Das Felsbett ist geschätzt. Die Nachbargletscher haben eine eigene
Temperaturkorrektur. Kleinräumige Eisbrüche sind wegen des 125-m-Gitters vereinfacht.

## Ordner

```
index.html          fertige Seite (alles eingebettet)
src/
  sim.js            Gletschermodell (läuft im Browser in einem Web Worker)
  glac.py           dasselbe Modell in Python (Referenz und Vorrechnung)
  app.js            3D-Darstellung (three.js, eigene Shader), Bedienung, Diagramme
  page_template.html  Seitenlayout und Texte
  fetch_data.sh     lädt die Eingangsdaten
  prep.py … build.py  Aufbereitung, Kalibrierung, Zusammenbau
tests/              Vergleich Python ↔ JavaScript, Test des Jahreslaufs
```

## Neu bauen

Benötigt Python 3 mit `numpy scipy pillow tifffile pyshp netCDF4 matplotlib` und Node.js (nur für die Tests).
Alle Schritte im Ordner `src/` ausführen:

```bash
./fetch_data.sh                 # SRTM, RGI-Umriss, HISTALP -> data/
python3 prep.py data            # 125-m-Gitter, Klima         -> base.npz
python3 prep2.py                # Neigung, Besonnung          -> terr100.npz
python3 aval.py                 # Lawinen-Routen              -> aval.npy
python3 invert.py               # Gletschermaske (Inversion)  -> inv.npz   (~10 min)
python3 glabtop.py              # Eisdicke / Felsbett         -> bed.npz
python3 terrain_hr.py data .    # 25-m-Gelände, Oberfläche    -> basehr.npy, ortho.jpg
python3 run_hist.py -0.9 -0.5 -0.8 0.0 0.3 st_x7.npz 0.6   # Kleine Eiszeit ab 1600, Klima 1851–2003
python3 build.py st_x7.npz 0.79 data ../index.html
```

Tests (nach den Schritten oben, ebenfalls in `src/`): `python3 ../tests/eqtest.py && node ../tests/eqtest.js`
vergleicht die Python- und die JavaScript-Version des Modells.

## GitHub Pages

Im Repository GEO-LABS unter *Settings → Pages* als Quelle *Deploy from a branch*, Branch `main`, Ordner `/ (root)` wählen.
Das Modell ist dann unter `https://mueller-max-geo.github.io/GEO-LABS/gletscherlabor/` erreichbar.

## Daten und Quellen

- Höhenmodell: SRTM (NASA/USGS); Gletscherumriss: Randolph Glacier Inventory 5.0;
  Klima: HISTALP (ZAMG / GeoSphere Austria). Alle über die [OGGM-Beispieldaten](https://github.com/OGGM/oggm-sample-data).
- Zemp, M. et al. (2007): Glacier fluctuations in the European Alps, 1850–2000. *Global and Planetary Change*.
- Six, D. & Vincent, C. (2014): Sensitivity of mass balance and equilibrium-line altitude to climate change in the French Alps. *Journal of Glaciology*.
- Greuell, W. (1992): Hintereisferner, Austria: mass-balance reconstruction and numerical modelling of the historical length variations. *Journal of Glaciology*.
- Linsbauer, A. et al. (2012): Quantifying glacier-bed overdeepenings (GlabTop2). *Journal of Geophysical Research*.
- Cuffey, K. & Paterson, W. (2010): *The Physics of Glaciers*, 4. Auflage.
- 3D-Darstellung mit [three.js](https://threejs.org) r128.
