# Isolinien-Labor – Matterhorn

3D-Modell für den Topographie-Unterricht: das Matterhorn (Ausschnitt 9 × 9 km, Gipfel in der Mitte) mit echten Höhendaten und Luftbild.

- **Isolinien** ein/aus, Äquidistanz 50/100/200 m, Zählkurven; generalisiert wie auf gedruckten Karten (geglättet, Mini-Inseln entfernt).
- **Farben:** Luftbild, Natur (aus dem Luftbild abgeleitet), Höhenschichten (auch gestuft), Hangneigung, ohne Farbe.
- **Schnittachse** durch den Gipfel, 0–359° drehbar (Regler, Animation oder Ziehen an A/B), Modell aufschneidbar; **Profil** darunter (1-fach, 2-fach, ganze Breite) mit Hilfslinien.
- **Vom Relief zur Karte:** Isolinien werden auf eine Karte abgesenkt; Kartenblatt mit Legende am Rand, Farbstufen, Relief ausblendbar.

Dateien:
- `index.html` – die fertige Seite (eine Datei, ≈ 2,3 MB; Höhendaten und Luftbild eingebettet; three.js 0.160 und die Schrift kommen aus dem Netz).
- `quelltext/seite.src.html` – Quelltext mit Platzhaltern; `quelltext/build.py` setzt daraus `index.html` zusammen.
- `quelltext/daten/` – Höhenmodell (mh.b64), Isolinienfeld (hf.b64), Luftbild (photo.b64), Bodenbedeckung (land.b64); `isolinien_feld.py` erzeugt das Isolinienfeld.

Quellen: SRTM 1″ (NASA/USGS); Luftbild swisstopo SWISSIMAGE (freie Geodaten der Schweiz). Beschriftete Höhen amtlich (swisstopo).
