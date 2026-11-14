// Prüft die Faustregel (125 m je °C Abstand zum Taupunkt) gegen eine genaue Rechnung.
// Genau: Luftpaket steigt trockenadiabatisch (Poisson-Gleichung), Mischungsverhältnis bleibt gleich;
// Sättigung, wenn Mischungsverhältnis = Sättigungswert bei (T, p). Höhe aus cp/g * (T0 - T_KN).
const es = T => 6.112 * Math.exp(17.62 * T / (243.12 + T));
const pAt = h => 1013.25 * Math.pow(1 - 2.25577e-5 * h, 5.25588);
const dew = (T, rh) => { const g = Math.log(rh / 100) + 17.62 * T / (243.12 + T); return 243.12 * g / (17.62 - g); };
const p0 = pAt(500), kappa = 0.2857, GAM = 0.00976;       // K je m (genauer trockenadiabatischer Wert)
function exact(T0, rh) {
  const w0 = 0.622 * (rh / 100 * es(T0)) / (p0 - rh / 100 * es(T0));
  let lo = 150, hi = T0 + 273.15;                           // T_KN in K
  for (let i = 0; i < 80; i++) {
    const T = (lo + hi) / 2, p = p0 * Math.pow(T / (T0 + 273.15), 1 / kappa), e = es(T - 273.15);
    const ws = 0.622 * e / (p - e);
    if (ws > w0) hi = T; else lo = T;
  }
  const Tl = (lo + hi) / 2 - 273.15;
  return { Tl, real: 500 + (T0 - Tl) / GAM, school: 500 + (T0 - Tl) * 100 };   // echte Höhe / Höhe mit Schulwert 1 °C je 100 m
}
let worst = { d: 0 }, worstS = { d: 0 }, rows = [];
for (let T0 = 5; T0 <= 25; T0++) for (let rh = 5; rh <= 100; rh += 5) {
  const rule = 500 + 125 * (T0 - dew(T0, rh)), ex = exact(T0, rh), rounded = Math.round(rule / 100) * 100;
  const d = rule - ex.real, dS = rule - ex.school;
  if (Math.abs(d) > Math.abs(worst.d)) worst = { T0, rh, rule: Math.round(rule), real: Math.round(ex.real), d: Math.round(d), pct: (100 * d / (ex.real - 500)).toFixed(1) };
  if (Math.abs(dS) > Math.abs(worstS.d)) worstS = { T0, rh, rule: Math.round(rule), school: Math.round(ex.school), d: Math.round(dS), pct: (100 * dS / (ex.school - 500 || 1)).toFixed(1) };
  if ([5, 15, 25].includes(T0) && [30, 50, 70, 90].includes(rh)) rows.push({ T0, rh, Taupunkt: +dew(T0, rh).toFixed(1), Faustregel: Math.round(rule), gerundet: rounded, genau: Math.round(ex.real), mitSchulwert: Math.round(ex.school), T_KN_genau: +ex.Tl.toFixed(1), T_KN_Modell: +(T0 - (rounded - 500) / 100).toFixed(1) });
}
console.table(rows);
console.log('größte Abweichung Faustregel – genaue Höhe:', worst);
console.log('größte Abweichung Faustregel – Höhe mit 1 °C/100 m:', worstS);
// relative Abweichung nur für rF ≥ 30 %
let w2 = 0, w3 = 0; for (let T0 = 5; T0 <= 25; T0++) for (let rh = 30; rh <= 95; rh += 5) { const rule = 500 + 125 * (T0 - dew(T0, rh)), ex = exact(T0, rh); w2 = Math.max(w2, Math.abs(rule - ex.real)); w3 = Math.max(w3, Math.abs(rule - ex.school)); }
console.log('rF 30–95 %: max. Abweichung zur genauen Höhe', Math.round(w2), 'm; zur Höhe mit Schulwert', Math.round(w3), 'm');
