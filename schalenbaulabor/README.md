# Schalenbau-Labor – Reise zum Erdmittelpunkt

Interaktives 3D-Modell vom Schalenbau der Erde für den Geographieunterricht (Luxemburg).

- **Erdkruste nach Messdaten:** Schnitt durch Luxemburg (6° O); Kruste, Sedimente, Wasser, Eis und Lithosphäre aus LITHO1.0, Gebirgswurzeln (Alpen).
- **Mantelkonvektion live gerechnet** (2D, vereinfacht, stark gerafft): heiße Aufströme, kalte Abströme.
- **Tiefensonde:** Temperatur, Druck, Dichte und Wellengeschwindigkeit nach PREM, dazu die Werte aus dem Schulbuch.
- **Erdbebenwellen:** P- und S-Wellen durch die Erde gerechnet, Schattenzonen, Seismogramm.
- **Magnetfeld, Sonnenwind und Polarlicht.**
- 8 Stationen, „Reise zum Erdmittelpunkt“, Beschriften, Quiz, Frei entdecken.

`index.html` ist eine einzige Datei (alles eingebettet, läuft ohne Internet). Der Quelltext liegt in `quelltext/` (`python3 build.py`, alle Texte in `src/d_text.js`).

Datenquellen: PREM (Dziewonski & Anderson 1981), LITHO1.0 (Pasyanos u. a. 2014), PB2002 (Bird 2003), IGRF, NASA Blue Marble. three.js (MIT).
