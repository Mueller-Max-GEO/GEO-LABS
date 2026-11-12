# Pyramiden-Labor – Bevölkerungsdiagramme und demografischer Übergang

3D-Labor für den Geographieunterricht (4C, auch 7e/6e): Wie liest man ein Bevölkerungsdiagramm, welche
Grundformen gibt es (Pyramide, Glocke, Urne) und was bedeuten sie? Echte Daten für Luxemburg ab 1880 und
15 weitere Länder bis 2100, Jahre stufenlos verstellbar, Anzahl oder Prozent, 5-Jahres-Gruppen oder einzelne
Jahrgänge. Mit Lernweg (10 Stationen + freier Modus), Erklärfilm in 8 Kapiteln (Untertitel, Sprecherstimme
des Browsers), Quiz, Figuren-Modus, Zeitgebirge, Diagramm der Geburten- und Sterberate mit Modell des
demografischen Übergangs. Deutsch und Französisch.

- `index.html` – die fertige Seite, eine Datei (Daten, three.js 0.147 und Schrift eingebettet, läuft auch ohne Internet)
- `quelltext/` – Quelltext; `python3 quelltext/build.py` baut die Seite neu nach `quelltext/dist/`
  - `src/` – Szene, Texte (`c_text.js`, DE/FR), Bedienung, Erklärfilm
  - `assets/` – aufbereitete Bevölkerungsdaten, Landesumrisse, Schrift Inter (OFL)
  - `data/` – Skripte zum Aufbereiten der Daten
  - `tests/` – automatische Prüfungen mit Playwright
  - `Sprecherskript.md` – Text des Erklärfilms

**Vorführmodus** für iPad am Beamer oder Fernseher: Knopf „Vorführen“ oben rechts oder `index.html?vorfuehren`.

**Eigene Sprachaufnahmen:** MP3-Dateien `audio/de_k01.mp3 … de_k08.mp3` (bzw. `fr_…`) in einen Ordner `audio/`
neben `index.html` legen; der Film nimmt sie dann statt der Browserstimme.

Quellen: UN World Population Prospects 2024 (alle Länder 1950–2100), STATEC/LUSTAT (Luxemburg: Volkszählungen
1880–1947, Geburten und Sterbefälle 1891–2025), Human Mortality Database (Frankreich 1817–1949),
Natural Earth (Landesumrisse), Schrift Inter (SIL Open Font License 1.1), three.js (MIT).
