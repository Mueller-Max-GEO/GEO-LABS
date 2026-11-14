/*MODEL-BEGIN*/
// ================= Rechenmodell (eine Quelle für Szene, Messwerte, Texte und Querschnitt) =================
// Schulnäherungen: ungesättigt 1 °C je 100 m, gesättigt 0,5 °C je 100 m.
const H0 = 500, H1 = 500;                 // Talhöhen Luv / Lee (m)
const DRY = 1.0, WET = 0.5;               // °C je 100 m
const es = T => 6.112 * Math.exp(17.62 * T / (243.12 + T));            // Sättigungsdampfdruck (hPa), Magnus-Formel
const pAt = h => 1013.25 * Math.pow(1 - 2.25577e-5 * h, 5.25588);      // Luftdruck (hPa), Standardatmosphäre
const wSat = (T, h) => 622 * es(T) / (pAt(h) - es(T));                // Wasserdampfgehalt bei Sättigung (g je kg Luft)
function dewpoint(T, rh) { const g = Math.log(rh / 100) + 17.62 * T / (243.12 + T); return 243.12 * g / (17.62 - g); }
function computeModel(P) {
  const m = { t0: P.t0, rh0: P.rh, hc: P.hc };
  m.noVapor = P.rh <= 0;                             // 0 %: kein Wasserdampf, also nie Kondensation
  m.td0 = m.noVapor ? -273.15 : dewpoint(P.t0, P.rh);
  m.lclExact = m.noVapor ? Infinity : H0 + 125 * (P.t0 - m.td0);   // Faustregel: 125 m je °C Abstand zum Taupunkt
  m.lcl = m.noVapor ? 99900 : Math.round(m.lclExact / 100) * 100;  // Schulrechnung: auf 100 m gerundet (0 %: Platzhalter weit oben)
  m.cond = m.lcl < P.hc;                             // Sättigung unterhalb des Passes?
  m.atPass = m.lcl === P.hc;                         // Sättigung genau am Pass
  m.tl = P.t0 - DRY * (m.lcl - H0) / 100;            // Temperatur in Höhe des Kondensationsniveaus
  m.tc = m.cond ? m.tl - WET * (P.hc - m.lcl) / 100 : P.t0 - DRY * (P.hc - H0) / 100;   // am Pass
  m.t1 = m.tc + DRY * (P.hc - H1) / 100;             // im Lee-Tal
  m.dT = m.t1 - P.t0;
  // Wasserdampf: Startwert aus der relativen Feuchte; c gleicht die Rundung des Kondensationsniveaus aus
  m.w0 = P.rh / 100 * wSat(P.t0, H0);
  m.c = m.cond ? m.w0 / wSat(m.tl, m.lcl) : 1;
  m.wc = m.cond ? m.w0 * wSat(m.tc, P.hc) / wSat(m.tl, m.lcl) : m.w0;   // am Pass und im Lee
  m.dw = m.w0 - m.wc;                                // im Modell als Niederschlag entfernt
  m.rhc = rhLuv(m, P.hc);
  m.rh1 = rhLee(m, H1);
  return m;
}
function Tluv(m, h) {
  if (!m.cond || h <= m.lcl) return m.t0 - DRY * (h - H0) / 100;
  return m.tl - WET * (h - m.lcl) / 100;
}
function Tlee(m, h) { return m.tc + DRY * (m.hc - h) / 100; }
function rhLuv(m, h) {                               // relative Feuchte (%) beim Aufstieg
  if (m.w0 <= 0) return 0;
  if (m.cond && h >= m.lcl) return 100;
  if (!m.cond) return Math.min(100, 100 * m.w0 / wSat(Tluv(m, h), h));
  const s = (h - H0) / (m.lcl - H0);
  return Math.min(100, 100 * m.w0 / (wSat(Tluv(m, h), h) * (1 + (m.c - 1) * s)));
}
function rhLee(m, h) {                               // relative Feuchte (%) beim Abstieg
  if (!m.cond) return rhLuv(m, h);                   // ohne Kondensation: Spiegelbild des Aufstiegs
  return Math.min(100, 100 * wSat(m.tc, m.hc) / wSat(Tlee(m, h), h));
}
function wLuv(m, h) {                                // Wasserdampfgehalt (g/kg) beim Aufstieg
  if (!m.cond || h <= m.lcl) return m.w0;
  return m.w0 * wSat(Tluv(m, h), h) / wSat(m.tl, m.lcl);
}
/*MODEL-END*/
