# San-Andreas-Labor – Transformstörung und Erdbeben

Interaktives 3D-Modell für den Geographieunterricht (Luxemburg), mit echtem Gelände und Luftbildern.

- **Einordnung:** Flug auf der Erdkugel von Luxemburg nach Kalifornien, Plattengrenzen der Erde (PB2002).
- **Phase 1 Plattengrenzen:** Westen Nordamerikas – Transformstörung, Spreizung, Subduktion.
- **Phase 2 Zwei Platten:** Kalifornien, San-Andreas-Verwerfung (vereinfacht; Abschnitte unter „Alle“).
- **Phase 3 Gleiten / Verhakt:** Carrizo-Ebene, Spannungsaufbau in 150 Jahren (Messlinien biegen sich).
- **Phase 4 Erdbeben:** zwei Erdbebenzyklen mit Bruchfront, Rückprall und Spannungsanzeige.
- **Phase 5 Spuren:** Wallace Creek, 130 m Versatz in 3.700 Jahren (echte Größe).
- Erklärfilm, Gleiten/Verhaken-Schalter, Beschriftung „Wichtige“ oder „Alle“, Vollbild.

## Auf dem iPad offline nutzen

1. Auf dem iPad in **Safari** öffnen: `https://mueller-max-geo.github.io/GEO-LABS/sanandreaslabor/`
2. Warten, bis das Labor geladen ist (etwa 15 MB).
3. Teilen-Knopf → **Zum Home-Bildschirm**.
4. Das Labor startet dann vom Home-Bildschirm als eigene App im Vollbild – auch ohne Internet.
   Neue Versionen lädt es automatisch, sobald das iPad wieder online ist (beim übernächsten Öffnen sichtbar).

`index.html` ist eine einzige Datei (alles eingebettet). `sw.js` speichert sie für den Offline-Betrieb.
Der Quelltext liegt in `quelltext/` (`npm install`, dann `python3 build.py`; Offline-Fassung: `python3 tools/pwa.py`).
Die Rohdaten (Kachelaufnahmen, Höhenmodelle) liegen nicht im Repository; `src/a_data.js` enthält die fertig
aufbereiteten Gelände- und Bilddaten.

Fotos (Wikimedia Commons): Peter Kaminski (CC BY 2.0), Rich Niewiroski Jr. (CC BY 2.5), Nserrano (CC BY-SA 3.0), Thomas Wolf www.foto-tw.de (CC BY-SA 3.0), Carol M. Highsmith (gemeinfrei), David Iliff (CC BY-SA 3.0), Ian Kluft (CC BY-SA 4.0); verkleinert und zugeschnitten.
Europa auf der Erdkugel: Sentinel-2 cloudless – s2maps.eu, EOX IT Services GmbH (enthält veränderte Copernicus-Sentinel-Daten 2016), CC BY 4.0.
Datenquellen: USGS 3DEP und Luftbilder (USGSImageryOnly, NAIP Plus), NOAA DEM Global Mosaic, NASA Blue Marble,
PB2002 (Bird 2003), us-atlas (Natural Earth), Wikimedia Commons (Stadtfotos). three.js (MIT).
