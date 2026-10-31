# Tsunami-Labor

Interaktives 3D-Modell für den Geographieunterricht: Wie entsteht an einer **Subduktionszone** ein Tsunami?
Das Modell zeigt den Weg von der Plattenbewegung über das Seebeben und die Verdrängung der Wassersäule
bis zur Überflutung der Küste. Grundlage sind das Schulbuch (S. 138–139, M2, M3, M5, M6) und das Beispiel Japan 2011.

**Starten:** `index.html` im Browser öffnen oder über GitHub Pages (siehe unten).
Die Seite ist eine einzige Datei. Nur three.js und die Schriften werden aus dem Internet geladen.

## Funktionen

- **Fünf Phasen** mit kurzer Erklärung: 1 Verhaken und Spannungsaufbau, 2 plötzliches Gleiten (Seebeben),
  3 Verdrängung der Wassersäule, 4 Ausbreitung und Annäherung an die Küste, 5 Überflutung.
- **Steuerung:** Start, Pause, Weiter, Zurück, Zurücksetzen, Regler über den ganzen Ablauf, Tempo, Halt nach jeder Phase.
- **Ansichten:** Schrägansicht (Kamera folgt der Phase), feste Querschnittsansicht, Ansicht von oben.
- **Beschriftungen** in drei Stufen (Aus / Wichtige / Alle), ohne Überlappung, mit Führungslinien.
- **Vorhersage-Modus:** vor jeder Phase vorhersagen, dann mit der Animation prüfen; Transferfrage am Ende.
- **Was wäre, wenn …?** Starkes flaches Beben (M 9), schwächeres Beben (M 6), tiefes Beben (≈ 300 km): nicht jedes Seebeben löst einen Tsunami aus.
- **Messkarte** in Phase 4: Meerestiefe, Geschwindigkeit, Wellenlänge und Wellenhöhe in echten Größen (Werte wie im Buch, M2),
  dazu die gelbe „Spur des Wellenbergs“.
- **Überflutung und Rückstrom:** Häuser, Straße, Bahnlinie und Bäume werden beschädigt; Autos, Boote und Trümmer
  werden ins Land und zum Teil wieder zurück ins Meer getragen. Schiffe auf dem offenen Meer bleiben unbeschädigt.

## Wie das Modell rechnet

| Teil | Umsetzung |
|---|---|
| Platten | Querschnitt mit ozeanischer Platte, kontinentaler Platte und Erdmantel; blockierter Abschnitt haftet an der kontinentalen Platte, die sich elastisch verformt und beim Beben zurückfedert. |
| Meeresboden | Hebung nahe dem Tiefseegraben, Senkung weiter landwärts (USGS Circular 1187). |
| Welle | Lineare Flachwasserwelle: Geschwindigkeit ~ √(Meerestiefe). Der Anfangsbuckel entspricht der Hebung des Meeresbodens und teilt sich in Wellen zum offenen Meer und zur Küste. Im flachen Wasser wird die Welle kürzer, höher und vorne steiler (keine einrollende Surfwelle, NOAA). |
| Überflutung | Wasserstand an der Küste wird vorab berechnet und läuft mit Gefälle ins Land; Schäden und treibende Gegenstände werden vorab simuliert, damit man frei vor- und zurückspulen kann. |

**Didaktische Vereinfachungen:** Höhen und Wellen sind stark überhöht, Entfernungen verkürzt, die Zeit ist gerafft.
Folgewellen entstehen im Modell vereinfacht im Entstehungsgebiet.

## Leistung

Damit das Modell auch auf Schul-iPads flüssig läuft:

- Der Wasserstand wird auf der Grafikkarte in eine Höhenkarte gerechnet – einmal pro Gitterpunkt und nur, wenn sich die Zeit ändert.
- Steht die Animation still und bewegt niemand die Kamera, zeichnet die Seite nichts neu.
- Schatten werden nur neu berechnet, wenn sich an Land etwas bewegt.
- Die Bildauflösung passt sich automatisch an, wenn ein Gerät nicht mitkommt.
- `index.html?low` erzwingt eine einfache Darstellung für sehr schwache Geräte.

## GitHub Pages

Im Repository GEO-LABS unter *Settings → Pages* als Quelle *Deploy from a branch*, Branch `main`, Ordner `/ (root)` wählen.
Das Modell ist dann unter `https://mueller-max-geo.github.io/GEO-LABS/tsunamilabor/` erreichbar.

## Quellen

- USGS: [Earthquake starts tsunami](https://www.usgs.gov/media/images/earthquake-starts-tsunami) (aus USGS Circular 1187).
- NOAA: [Tsunami Generation – Earthquakes](https://www.noaa.gov/jetstream/tsunamis/tsunami-generation-earthquakes).
- NOAA / National Weather Service: [About Tsunamis](https://www.weather.gov/safety/tsunami-about).
- 15th World Conference on Earthquake Engineering (2012): [Ankunft der Flut in Natori, 2011](https://www.iitk.ac.in/nicee/wcee/article/WCEE2012_1587.pdf).
- Beschriftungs-Layout nach Čmolík et al. (2022), [Mixed Labeling](https://dcgi.fel.cvut.cz/wp-content/wpallimport-dist/publications/pdf/publications-2022-cmolik-tvcg-mixed-paper.pdf).
- 3D-Darstellung mit [three.js](https://threejs.org) r170.
