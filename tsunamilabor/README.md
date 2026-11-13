# Tsunami-Labor (Version 2)

Interaktives 3D-Modell für den Geographieunterricht: Wie entsteht an einer **Subduktionszone** ein Tsunami?
Das Modell zeigt den Weg von der Plattenbewegung über das Seebeben und die Verdrängung der Wassersäule
bis zur Überflutung der Küste und zum Rückstrom. Vorbild ist das Tōhoku-Beben vom 11. März 2011 (Japan);
die fünf Phasen folgen dem Schulbuch (S. 138–139, M2, M3, M5, M6).

**Starten:** `index.html` im Browser öffnen oder über GitHub Pages:
<https://mueller-max-geo.github.io/GEO-LABS/tsunamilabor/>

Die Seite ist **eine einzige Datei** und läuft auch ohne Internet (three.js ist eingebettet).
Für den Unterricht frei nutzbar.

## Für den Unterricht

| Wozu | Wie |
|---|---|
| **Vorführen** (Beamer) | „Erklärfilm“ oben rechts: Die Animation läuft kapitelweise mit Untertiteln, hält nach jedem Kapitel an und kann auf Wunsch vorgelesen werden. `F` = Vollbild. |
| **Erarbeiten** | Fünf Phasen einzeln abspielen, Regler frei verschieben, Ansicht wählen (Schräg, fester Querschnitt, von oben, Küste). Zu jeder Phase: kurzer Text und „Achte auf …“. |
| **Vorhersagen** | Tab „Vorhersage“: Vor jeder Phase vorhersagen, dann prüfen; am Ende eine Transferfrage. |
| **Vergleichen** | „Was wäre, wenn …?“: starkes flaches Beben (M 9), schwächeres Beben (M 6), tiefes Beben (≈ 300 km). Nicht jedes Seebeben löst einen Tsunami aus. |
| **Messen** | Messkarte in Phase 3/4: Meerestiefe, Geschwindigkeit, Wellenlänge, Wellenhöhe in echten Größen (wie Buch M2); gelbe „Spur des Wellenbergs“. |

Tasten: Leertaste Start/Pause · ← → Phase zurück/weiter · 1–5 Phase wählen · F Vollbild · B Bedienfeld.
Adresszusätze: `?film` startet direkt den Erklärfilm, `?low` erzwingt die einfache Darstellung für schwache Geräte.

## Was neu ist (gegenüber Version 1)

- **Das Wasser wird berechnet, nicht gezeichnet.** Das Modell löst die nichtlinearen Flachwassergleichungen
  (dieselbe Physik wie in Tsunami-Vorhersagemodellen). Der Tsunami entsteht wie in der Natur: Der Meeresboden hebt
  sich und hebt die Wassersäule mit. Tempo (~ √Tiefe), Aufsteilen im flachen Wasser, Rückzug des Meeres,
  Überflutung und Rückstrom ergeben sich daraus von selbst.
- **Überflutung und Rückstrom:** Autos, Boote und Trümmer treiben mit der berechneten Strömung ins Land und werden
  vom Rückstrom wieder Richtung Meer gezogen. Holzhäuser werden je nach Belastung (Wassertiefe + Strömung)
  beschädigt oder zerstört; Stahlbetonbauten bleiben stehen. Schlamm, Trübung und Schaum folgen der Strömung.
- **Neue Oberfläche** im Stil der anderen GEO-LABS: dunkle Bühne, Zeitleiste mit Phasen, Bedienfeld mit Tabs,
  Erklärfilm, Vollbild.
- **Küste** mit Flussmündung und Hafen; höhere Auflösung von Gelände und Wasser.

## Wie das Modell rechnet

| Teil | Umsetzung |
|---|---|
| Platten | Querschnitt mit ozeanischer Platte, kontinentaler Platte und Erdmantel. Der blockierte Abschnitt haftet an der kontinentalen Platte; sie verformt sich elastisch und federt beim Beben zurück. |
| Meeresboden | Hebung nahe dem Tiefseegraben, Senkung weiter landwärts (USGS Circular 1187). |
| Wasser | Flachwassergleichungen (Masse und Impuls), Finite-Volumen-Verfahren mit HLL-Fluss und hydrostatischer Rekonstruktion (Audusse u. a. 2004), in Laufrichtung 2. Ordnung (MUSCL-Hancock); Gitter 368 × 64, auf dem Schelf und an Land verfeinert. Reibung je nach Untergrund (Meer, Felder, Ort, Wald). |
| Schäden | Für jedes Objekt wird die größte Belastung E = Wassertiefe + Staudruck der Strömung gespeichert. |
| Treibgut | Bewegt sich mit der Strömung, solange das Wasser tief genug ist; bleibt sonst liegen. |
| Ablauf | Der ganze Lauf wird beim Laden einmal vorausberechnet (einige Sekunden). Stützstellen erlauben freies Vor- und Zurückspulen. |

## Didaktische Vereinfachungen (auch im Modell unter „Hintergrund“)

- Hebung und Welle sind **stark überhöht**, Entfernungen verkürzt, die Zeit ist gerafft.
- Weil die Welle überhöht ist, steilt sie sich früher auf als ein echter Tsunami.
- Es ist nur die **erste Welle** gut zu sehen; in Wirklichkeit folgen oft weitere über Stunden.
- Die Bruchfläche war 2011 rund 400 km lang – viel länger als der Block.
- Treibgut stößt nicht mit Gebäuden zusammen; Schäden sind vereinfacht.

## Quelltext und Bauen

```
quelltext/
  src/a_sim.js      Geometrie und Flachwasser-Simulation (ohne three.js, in node testbar)
  src/b_rec.js      Zeitachse, Szenarien, Aufzeichnung (Stützstellen, Schäden, Treibgut)
  src/c_text.js     Phasentexte, Vorhersage-Fragen, Erklärfilm
  src/d_scene.js    Licht, Gesteinskörper, Plattengrenze, Pfeile
  src/e_water.js    Wasseroberfläche (liest direkt aus der Simulation)
  src/f_land.js     Ort, Verkehr, Hafen, Bäume, Treibgut, Schäden
  src/g_labels.js   Beschriftungen ohne Überlappung
  src/h_app.js      Ablauf, Anzeige, Kamera, Steuerung, Vorhersage-Modus, Erklärfilm
  src/head.html, style.css, body.html
  tests/sim_lab.js, tests/rec_lab.js
  build.py          baut ../index.html
  v1-index.html     letzte Fassung der Version 1
```

```
cd quelltext
npm install          # einmalig: three.js r170 und esbuild
python3 build.py     # schreibt ../index.html
npm test             # Simulation prüfen (ruhendes Wasser bleibt in Ruhe, Massenerhaltung, Überflutung, Spulen)
```

Texte ändern: `src/c_text.js` (Phasen, Fragen, Film) und `src/body.html` (Hintergrund, Quellen), dann neu bauen.

## Quellen

- USGS: [Earthquake starts tsunami](https://www.usgs.gov/media/images/earthquake-starts-tsunami) (aus USGS Circular 1187).
- USGS: [What is it about an earthquake that causes a tsunami?](https://www.usgs.gov/faqs/what-it-about-earthquake-causes-tsunami)
- NOAA JetStream: [Tsunami Generation – Earthquakes](https://www.noaa.gov/jetstream/tsunamis/tsunami-generation-earthquakes).
- NOAA / National Weather Service: [About Tsunamis](https://www.weather.gov/safety/tsunami-about) („do not curl and break like wind waves“, „fast-rising flood or a wall of water“, erste Welle nicht unbedingt die größte).
- 15th World Conference on Earthquake Engineering (2012): [Ankunft der Flut in Natori, 2011](https://www.iitk.ac.in/nicee/wcee/article/WCEE2012_1587.pdf).
- Audusse, Bouchut, Bristeau, Klein, Perthame (2004): A fast and stable well-balanced scheme with hydrostatic reconstruction for shallow water flows. SIAM J. Sci. Comput. 25.
- Beschriftungs-Layout nach Čmolík et al. (2022), [Mixed Labeling](https://dcgi.fel.cvut.cz/wp-content/wpallimport-dist/publications/pdf/publications-2022-cmolik-tvcg-mixed-paper.pdf).
- 3D-Darstellung mit [three.js](https://threejs.org) r170 (MIT-Lizenz).
