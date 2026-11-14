# Föhn-Labor – vereinfachtes thermodynamisches Föhnmodell

3D-Lernanimation für den Geographieunterricht (Sek I, Kapitel „Luv, Lee, Föhn“): Ein Luftpaket strömt gegen ein
Modellgebirge, kühlt beim Aufstieg ab, wird am Kondensationsniveau gesättigt, verliert Wasserdampf als
Niederschlag und kommt im Lee wärmer und relativ trockener im Tal an.

- **Schritt für Schritt:** fünf Abschnitte (Anströmung, Aufstieg, Kondensation, weiterer Aufstieg, Abstieg) mit
  Leitfrage, Halt an den Lernpunkten und Vorhersagefrage vor dem Abstieg.
- **Experimentieren:** Temperatur 5–25 °C, relative Feuchte 0–100 %, Passhöhe 1 500–3 500 m; Rechenweg zum
  Kondensationsniveau (Taupunkt, Abstand × 125 m, gerundet auf 100 m).
- **Rechenmodus:** Lee-Werte selbst berechnen.
- **Vorführmodus** (Taste P) und **Vollbild** (Taste F) fürs iPad am Beamer; Presenter-Tasten Bild ab / Bild auf.
- Schulnäherungen: −1 °C je 100 m (ungesättigt), −0,5 °C je 100 m (gesättigt), +1 °C je 100 m (Abstieg).
  Modellannahme: Kondensat fällt sofort als Niederschlag aus. Schnee dort, wo die Modellluft unter 0 °C hat.

Dateien:
- `index.html` – die fertige Seite, eine Datei (three.js 0.160 eingebettet; nur die Schrift Atkinson Hyperlegible
  kommt von Google Fonts, ohne Netz erscheint die Systemschrift).
- `quelltext/src/` – Quelltext: `model.js` (Rechenmodell), `scene.js` (Gelände, Wolke, Niederschlag, Luftpaket),
  `head.html` + `extra.css` (Oberfläche), `c.js` + `mkui.py` (Bedienung), `build.py`.
- `quelltext/tests/` – automatische Prüfungen mit Playwright.

Bauen (im Ordner mit `node_modules` von three@0.160.0, esbuild und playwright): Pfade in `build.py` und `mkui.py`
erwarten die Arbeitsordnerstruktur `src/` (model.js, c.js) und `s3/` (übrige Dateien).
