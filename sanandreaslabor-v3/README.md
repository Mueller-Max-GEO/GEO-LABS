# San-Andreas-Labor V3 – Tafelfassung

Eigene Fassung des San-Andreas-Labors für den Unterricht an der Tafel oder am Beamer (Illustration für die Lehrperson).
Die Schülerfassung (V2) liegt unverändert in [`../sanandreaslabor/`](../sanandreaslabor/).

Adresse: `https://mueller-max-geo.github.io/GEO-LABS/sanandreaslabor-v3/`

## Unterschiede zur V2
- **Aufbau:** Die Bühne füllt die ganze Fläche. Unten nur Start-Knopf, sechs große Phasen-Knöpfe (mit Fortschrittsbalken)
  und der Schalter Gleiten / Verhaken. Oben rechts: Beschriftung umschalten (wichtige – alle – aus), Einstellungen, Vollbild.
  Der Erklärtext und die Quellen stehen unter „Einstellungen“.
- **Schrift:** alle Beschriftungen deutlich größer; die Plattennamen sehr groß, mit blauem (Pazifische Platte) bzw. rotem
  (Nordamerikanische Platte) Balken. Alle Größen wachsen mit der Bildschirmbreite.
- **Pfeile:** größer, mit weißem Rand – blau für die Pazifische Platte, rot für die Nordamerikanische Platte.
- **Grenzen:** Plattengrenzen in Phase 1 und 2 breiter. In den Phasen 3 bis 5 ist die Verwerfung eine breite gelbe Linie mit
  dunklem Rand (wie die Plattengrenze in Phase 1 und 2); unter Spannung färbt sie sich rot-orange. Messlinien und Fluss kräftiger.
- **Plattennamen** stehen als Schilder direkt auf den Platten (blauer bzw. roter Strich darunter); im Querschnitt auf der Schnittfläche.
- **Anzeiger** oben links (Phasen 3–5): Spannung, „Platten bewegt“ und „Versatz an der Verwerfung“ (bzw. des Flusses) als große Balken.
- **Phase 4:** drei Erdbeben hintereinander (Versatz 5 → 10 → 16 m); beim Gleiten bewegen sich die Platten in Phase 3 und 4 entsprechend weiter.
  Die Messlinien haben drei Farben, damit man sie über die Verwerfung hinweg zuordnen kann.
- **Eigene Perspektive** bleibt beim Wechsel von Phase 3 zu Phase 4 erhalten (gleicher Ausschnitt).
- **Beschriftung:** wichtige – alle – nur Platten – ohne Text (auch ohne Überschrift).
- Der Erklärfilm ist in dieser Fassung ausgeblendet.

## Offline auf dem iPad
In Safari öffnen, laden lassen, dann Teilen → „Zum Home-Bildschirm“. Die App heißt „San Andreas V3“.

## Quelltext
`quelltext/` enthält alles außer `src/a_data.js` (Gelände und Luftbilder, 15 MB): Diese Datei ist dieselbe wie in
`../sanandreaslabor/quelltext/src/a_data.js` und muss zum Bauen dorthin kopiert werden (`npm install`, `python3 build.py`,
Offline-Fassung: `python3 tools/pwa.py`). Die Anpassungen der V3 stehen am Ende von `src/style.css` (Block „V3 · Tafelfassung“)
sowie in `src/d_scene.js` (Pfeile, Linienbreiten) und `src/f_app.js` (Pfeilgrößen, Phasen-Knöpfe).

Bildnachweise und Datenquellen wie in der V2 (siehe `../sanandreaslabor/README.md` und im Labor unter Einstellungen → Hintergrund).
