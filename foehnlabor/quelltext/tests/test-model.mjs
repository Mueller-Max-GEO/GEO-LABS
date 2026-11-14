import fs from 'fs';
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('/*MODEL-BEGIN*/'), b = src.indexOf('/*MODEL-END*/');
if (a < 0 || b < 0) throw new Error('MODEL block not found');
const api = new Function(src.slice(a, b) + '\nreturn { computeModel, Tluv, Tlee, rhLuv, rhLee, wLuv, H0, H1 };')();
const { computeModel, Tluv, Tlee, rhLuv, rhLee, wLuv } = api;
let fail = 0; const ok = (c, msg) => { if (!c) { fail++; console.log('FAIL', msg); } };
const near = (x, y, e = 1e-9) => Math.abs(x - y) <= e;
// 1 Standardfall
let m = computeModel({ t0: 15, rh: 70, hc: 2500 });
console.log('Standard:', { lclExact: +m.lclExact.toFixed(0), lcl: m.lcl, tl: m.tl, tc: m.tc, t1: m.t1, rhc: +m.rhc.toFixed(1), rh1: +m.rh1.toFixed(1), w0: +m.w0.toFixed(2), wc: +m.wc.toFixed(2), dw: +m.dw.toFixed(2), c: +m.c.toFixed(3) });
ok(m.lcl === 1200 && near(m.tl, 8) && near(m.tc, 1.5) && near(m.t1, 21.5), 'Standardfall 8 / 1,5 / 21,5');
ok(near(rhLuv(m, 500), 70, 1e-9) && near(rhLuv(m, 1200), 100, 1e-9), 'rF Start 70, am KN 100');
// 2 ohne Kondensation
m = computeModel({ t0: 15, rh: 50, hc: 1500 });
console.log('Ohne Kond.:', { lcl: m.lcl, cond: m.cond, tc: m.tc, t1: m.t1, rhc: +m.rhc.toFixed(1), rh1: +m.rh1.toFixed(1), dw: m.dw });
ok(!m.cond && near(m.tc, 5) && near(m.t1, 15) && near(m.rh1, 50, 1e-9) && m.dw === 0, 'ohne Kondensation 5 / 15, rF wieder 50, kein Wasserverlust');
// 3 KN am Pass
m = computeModel({ t0: 25, rh: 50, hc: 1900 });
console.log('KN am Pass:', { lcl: m.lcl, cond: m.cond, atPass: m.atPass, tc: m.tc, t1: m.t1, rhc: +m.rhc.toFixed(1), rh1: +m.rh1.toFixed(1) });
ok(m.atPass && !m.cond && near(m.t1, 25) && near(m.rhc, 100, 1e-9), 'KN am Pass: kein Überschuss, rF am Pass 100');
// 4 alle Reglerstellungen
let n = 0, tmin = 1e9, tmax = -1e9, lmin = 1e9, lmax = 0, nc = 0, ap = 0, cmin = 9, cmax = 0;
for (let t0 = 5; t0 <= 25; t0++) for (let rh = 0; rh <= 100; rh += 5) for (let hc = 1500; hc <= 3500; hc += 100) {
  n++; m = computeModel({ t0, rh, hc });
  const tag = `T${t0} rF${rh} P${hc}`;
  lmin = Math.min(lmin, m.lcl); lmax = Math.max(lmax, m.lcl); cmin = Math.min(cmin, m.c); cmax = Math.max(cmax, m.c);
  if (!m.cond) nc++; if (m.atPass) ap++;
  ok(m.lcl >= 500, tag + ' KN nicht unter dem Tal');
  ok(m.cond ? m.t1 > t0 + 1e-9 : near(m.t1, t0), tag + ' Lee wärmer nur mit Kondensation');
  ok(m.cond ? m.rh1 < rh : near(m.rh1, rh, 1e-9), tag + ' rF Lee');
  ok(m.wc <= m.w0 + 1e-12 && (m.wc > 0 || rh === 0), tag + ' Wasserdampf');
  ok(near(Tluv(m, hc), m.tc) && near(Tlee(m, hc), m.tc), tag + ' Temperatur am Pass stetig');
  let prevRh = -1, prevW = 1e9, prevT = 1e9;
  for (let h = 500; h <= hc; h += 25) {
    const T = Tluv(m, h), r = rhLuv(m, h), w = wLuv(m, h);
    tmin = Math.min(tmin, T); tmax = Math.max(tmax, T);
    ok(r >= prevRh - 1e-9 && r <= 100 + 1e-9 && isFinite(r), tag + ` rF steigt monoton (h=${h}, ${r})`);
    ok(w <= prevW + 1e-12, tag + ' Wasserdampf nimmt nie zu');
    ok(T <= prevT + 1e-12, tag + ' T fällt beim Aufstieg');
    if (m.cond && h < m.lcl) ok(r < 100, tag + ` unter dem KN ungesättigt (h=${h})`);
    prevRh = r; prevW = w; prevT = T;
  }
  let pr = 101;
  for (let h = hc; h >= 500; h -= 25) { const T = Tlee(m, h), r = rhLee(m, h); tmax = Math.max(tmax, T); tmin = Math.min(tmin, T); ok(r <= pr + 1e-9, tag + ' rF sinkt beim Abstieg'); pr = r; }
  ok(near(rhLuv(m, 500), rh, 1e-9), tag + ' rF Start = Regler');
  if (m.cond) ok(near(wLuv(m, m.lcl), m.w0, 1e-12) && near(wLuv(m, hc), m.wc, 1e-12), tag + ' Wasserdampf stetig');
}
ok(computeModel({t0:15,rh:0,hc:2500}).noVapor && !computeModel({t0:15,rh:0,hc:2500}).cond, 'rF 0: keine Kondensation');
ok(computeModel({t0:15,rh:100,hc:2500}).lcl === 500, 'rF 100: gesättigt im Tal');
console.log({ kombinationen: n, ohneKondensation: nc, knAmPass: ap, tmin, tmax, lmin, lmax, cmin: +cmin.toFixed(3), cmax: +cmax.toFixed(3) });
ok(tmin >= -30 && tmax <= 40, 'Temperaturen höchstens 10 °C unter der Farbskala (dort violett markiert)');
console.log(fail ? `${fail} FEHLER` : 'alle Modellprüfungen bestanden');
process.exit(fail ? 1 : 0);
