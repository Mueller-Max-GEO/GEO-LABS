// ---- Gelände-Generator (deterministisch) ----
function hash(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct) {
  let f = 0, amp = 0.5, fr = 1, n = 0;
  for (let i = 0; i < oct; i++) { f += amp * (vnoise(x * fr, y * fr, s + i * 17) * 2 - 1); n += amp; amp *= 0.5; fr *= 2.03; }
  return f / n;
}
function ridged(x, y, s, oct) {
  let f = 0, amp = 0.5, fr = 1, n = 0;
  for (let i = 0; i < oct; i++) { const r = 1 - Math.abs(vnoise(x * fr, y * fr, s + i * 31) * 2 - 1); f += amp * r * r; n += amp; amp *= 0.5; fr *= 2.1; }
  return f / n;
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az; let t = ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz);
  t = Math.max(0, Math.min(1, t));
  return [Math.hypot(px - ax - t * vx, pz - az - t * vz), t];
}
function polyDist(px, pz, pts) {
  // Abstand zu Polylinie + Fortschritt 0..1 entlang der Linie
  let best = 1e9, prog = 0, total = 0; const lens = [];
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); lens.push(l); total += l; }
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [d, t] = segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < best) { best = d; prog = (acc + t * lens[i]) / total; }
    acc += lens[i];
  }
  return [best, prog];
}
function peak(x, z, cx, cz, amp, rx, rzN, rzS, p) {
  const w = sstep(-260, 260, cz - z);
  const dx = (x - cx) / rx, dz = (z - cz) / (rzS + (rzN - rzS) * w);
  return amp * Math.exp(-Math.pow(Math.hypot(dx, dz), p));
}

// Hochgebirge: 4 × 4 km. X nach Osten, Z nach Süden (Meter)
const VALLEY_S = [[2120, 2330], [2180, 2950], [2520, 3550], [2950, 4150]];
const VALLEY_N = [[2040, 1680], [1900, 1100], [1450, 450], [1250, -150]];
function alpineHeight(X, Z) {
  const wx = X + 160 * fbm(X / 950, Z / 950, 11, 3);
  const wz = Z + 160 * fbm(X / 950 + 7.3, Z / 950 + 3.1, 12, 3);
  let h = 1500 + 140 * fbm(wx / 1700, wz / 1700, 3, 3);
  // Grat zwischen den Gipfeln
  const [rd] = segDist(wx, wz, 1250, 1820, 2950, 2230);
  h += 560 * Math.exp(-Math.pow(rd / 450, 2));
  // Seitengrat nach Nordwesten
  const [rd2] = segDist(wx, wz, 1250, 1820, 380, 700);
  h += 420 * Math.exp(-Math.pow(rd2 / 360, 2));
  // Hauptgipfel mit steiler Nordwand
  h += peak(wx, wz, 1250, 1820, 700, 760, 500, 900, 1.45);
  // Zweiter Gipfel
  h += peak(wx, wz, 2950, 2230, 470, 680, 640, 720, 1.55);
  // Vorberge
  h += peak(wx, wz, 650, 3350, 700, 760, 700, 800, 1.8);
  h += peak(wx, wz, 3500, 3450, 560, 640, 640, 700, 1.8);
  h += peak(wx, wz, 2900, 550, 640, 700, 600, 650, 1.7);
  // Felsige Struktur in der Höhe
  h += 35 * fbm(X / 260, Z / 260, 5, 3);
  h += 230 * (ridged(X / 480, Z / 480, 9, 5) - 0.45) * sstep(1950, 2850, h);
  // Trogtäler (U-Form) nach Süden und Norden, Pass dazwischen
  const [ds, ps] = polyDist(wx, wz, VALLEY_S);
  const floorS = 1650 - 480 * ps;
  h = smin(h, floorS + 0.0024 * ds * ds + 0.22 * ds, 110);
  const [dn, pn] = polyDist(wx, wz, VALLEY_N);
  const floorN = 1700 - 450 * pn;
  h = smin(h, floorN + 0.0024 * dn * dn + 0.22 * dn, 110);
  return h;
}
if (typeof module !== 'undefined') module.exports = { alpineHeight };
