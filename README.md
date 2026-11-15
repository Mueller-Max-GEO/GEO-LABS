# GEO-LABS

Interaktive Übungen und Modelle für den Geographieunterricht. Jede Übung liegt in einem eigenen Ordner
und läuft direkt im Browser.

| Übung | Thema | Ordner |
|---|---|---|
| Gletscherlabor Hintereisferner | 3D-Gletschermodell: Massenbilanz, Gleichgewichtslinie, Eisfluss, Gletscherspalten, Moränen, Klimaregler | [`gletscherlabor/`](gletscherlabor/) |
| Tsunami-Labor | 3D-Modell einer Subduktionszone: Spannungsaufbau, Seebeben, Wasserverdrängung, Ausbreitung, Überflutung und Rückstrom. Das Wasser wird mit den Flachwassergleichungen berechnet; mit Erklärfilm und Vorhersage-Modus | [`tsunamilabor/`](tsunamilabor/) |
| Erdumlauf-Labor | 3D-Modell Erde und Sonne: Umlauf, schiefe Achse, Tageslänge, Einfallswinkel, Wendekreise, Beleuchtungszonen, mit Kinoflug und Erklärfilm (Sprecherstimme) | [`erdumlauf/`](erdumlauf/) |
| Pyramiden-Labor | Bevölkerungsdiagramme in 3D: Luxemburg ab 1880 und 15 weitere Länder bis 2100, Grundformen, Jahrgänge, demografischer Übergang, Erklärfilm, Quiz, Vorführmodus fürs iPad (DE/FR) | [`pyramidenlabor/`](pyramidenlabor/) |
| Föhn-Labor | Vereinfachtes thermodynamisches Föhnmodell in 3D: Aufstieg im Luv, Kondensationsniveau, Stauwolke (Föhnmauer), Regen und Schnee, Abstieg im Lee. Schritt für Schritt, Experimentieren, Rechenmodus, Vorführmodus und Vollbild fürs iPad | [`foehnlabor/`](foehnlabor/) |
| Schalenbau-Labor | Reise zum Erdmittelpunkt in 3D: Erdkruste nach Messdaten (Schnitt durch Luxemburg), live gerechnete Mantelkonvektion, Tiefensonde (PREM), Erdbebenwellen mit Schattenzonen, Magnetfeld, Sonnenwind und Polarlicht | [`schalenbaulabor/`](schalenbaulabor/) |
| San-Andreas-Labor | Transformstörung in 3D mit echtem Gelände und Luftbildern: Einordnung auf der Erdkugel, Plattengrenzen, Gleiten oder Verhaken, Spannungsaufbau und zwei Erdbeben, Wallace Creek mit 130 m Versatz. Für das iPad optimiert, auch offline (Web-App) | [`sanandreaslabor/`](sanandreaslabor/) |
| Isolinien-Labor | Matterhorn in 3D mit echten Höhendaten (SRTM) und Luftbild (swisstopo): Isolinien, Höhenschichten, Hangneigung, drehbare Schnittachse mit Profil, vom Relief zur Karte | [`isolinienlabor/`](isolinienlabor/) |

## Online ansehen (GitHub Pages)

Unter *Settings → Pages* als Quelle *Deploy from a branch*, Branch `main`, Ordner `/ (root)` wählen.
Danach ist die Übersicht unter `https://mueller-max-geo.github.io/GEO-LABS/` erreichbar,
das Gletschermodell unter `https://mueller-max-geo.github.io/GEO-LABS/gletscherlabor/`,
das Tsunami-Modell unter `https://mueller-max-geo.github.io/GEO-LABS/tsunamilabor/`,
das Erdumlauf-Labor unter `https://mueller-max-geo.github.io/GEO-LABS/erdumlauf/`,
das Pyramiden-Labor unter `https://mueller-max-geo.github.io/GEO-LABS/pyramidenlabor/`,
das Föhn-Labor unter `https://mueller-max-geo.github.io/GEO-LABS/foehnlabor/`,
das Schalenbau-Labor unter `https://mueller-max-geo.github.io/GEO-LABS/schalenbaulabor/`,
das San-Andreas-Labor unter `https://mueller-max-geo.github.io/GEO-LABS/sanandreaslabor/`,
das Isolinien-Labor unter `https://mueller-max-geo.github.io/GEO-LABS/isolinienlabor/`.

## Neue Übung hinzufügen

1. Neuen Ordner anlegen, z. B. `vulkanlabor/`, mit einer `index.html` und einer `README.md`.
2. Eine Zeile in der Tabelle oben und eine Karte in `index.html` ergänzen.
