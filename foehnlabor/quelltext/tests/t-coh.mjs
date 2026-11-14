// Stimmigkeit: Wolke, Regen und Schnee über das ganze Modell; Niederschlag genau ab dem Kondensationsniveau;
// Schneegrenze = 0-°C-Höhe der Modellluft; Vorführmodus und Bedienfeld
import { open, shot } from './h.mjs';
const o = await open({ vp: { width: 1180, height: 820 } }); const p = o.page;
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL', m); } };
const F = (fn, a) => p.evaluate(fn, a);
await F(() => { window.__foehn.S.speed = 8; });
// Abschnitt 3: Wolke ja, Niederschlag noch nicht; Halt unmittelbar am Kondensationsniveau
await F(() => window.__foehn.enterChapter(3));
await p.waitForFunction(() => window.__foehn.S.phase === 'hold', null, { timeout: 120000 });
let r = await F(() => { const f = window.__foehn, V = f.vis(), st = f.pathState(f.S.px); return { cloud: V.cloud, precip: V.precip, h: st.h, lcl: f.M.lcl, cap: getComputedStyle(document.getElementById('mWn')).visibility, rule: document.getElementById('ruleV').textContent }; });
ok(r.cloud && !r.precip && r.h >= r.lcl && r.h - r.lcl < 60 && r.cap === 'hidden' && r.rule.includes('0,5'), 'Abschnitt 3: Halt am Kondensationsniveau, Wolke ohne Niederschlag, Regel 0,5 – ' + JSON.stringify(r));
// Abschnitt 4: Niederschlag überall unter der Wolke
await F(() => window.__foehn.enterChapter(4)); await p.waitForTimeout(6000);
const stat = () => F(() => { const f = window.__foehn; let cf = 0, cb = 0, cxmin = 9; for (let i = 0; i < f.NC; i++) { const c = f.cloud(i); if (c[2] > 0.05) { if (c[1] > 0.5) cf++; else if (c[1] < -0.5) cb++; cxmin = Math.min(cxmin, c[0]); } }
  let rf = 0, rb = 0, xmin = 9, xmax = -9, zmin = 9, zmax = -9;
  for (let i = 0; i < f.NR; i++) { const q = f.rainAt(i); if (q[1] > 0.5) rf++; else if (q[1] < -0.5) rb++; xmin = Math.min(xmin, q[0]); xmax = Math.max(xmax, q[0]); zmin = Math.min(zmin, q[1]); zmax = Math.max(zmax, q[1]); }
  return { cf, cb, cxmin: +cxmin.toFixed(2), rf, rb, xmin: +xmin.toFixed(2), xmax: +xmax.toFixed(2), zmin: +zmin.toFixed(1), zmax: +zmax.toFixed(1), xLcl: +f.xLcl.toFixed(2), V: f.vis(), zl: f.zeroLuv(), ze: f.zeroLee() }; });
r = await stat();
ok(r.V.cloud && r.V.precip, 'Abschnitt 4: Wolke und Niederschlag sichtbar');
ok(r.cf > 150 && r.cb > 150, 'Wolke vor und hinter dem Weg des Luftpakets – ' + r.cf + ' / ' + r.cb);
ok(r.rf > 250 && r.rb > 250 && r.zmin < -7 && r.zmax > 7, 'Niederschlag über die ganze Tiefe des Modells – ' + JSON.stringify([r.rf, r.rb, r.zmin, r.zmax]));
ok(r.xmin >= r.xLcl - 1e-6 && r.xmax <= 0.75, 'Niederschlag nur zwischen Kondensationsniveau und Pass – x von ' + r.xmin + ' bis ' + r.xmax + ', Kondensationsniveau bei x = ' + r.xLcl);
ok(r.cxmin >= r.xLcl - 1.01 && r.cxmin < r.xLcl, 'Wolke beginnt kurz vor dem Kondensationsniveau – ' + r.cxmin);
ok(Math.abs(r.zl - 2800) < 1e-6 && Math.abs(r.ze - 2800) < 1e-6, 'Standardfall: 0-°C-Höhe 2 800 m (1 200 m + 8 °C / 0,5 °C je 100 m), beidseitig – ' + r.zl + ' / ' + r.ze);
await shot(p, 'Coh-ch4');
// Querschnitt: Wolke und Niederschlag enden an der Schnittebene (z = 0)
await F(() => window.__foehn.setView('side', false)); await p.waitForTimeout(2500); await shot(p, 'Coh-side');
await F(() => window.__foehn.setView('3d', false));
// Schneegrenze = 0-°C-Höhe der Modellluft, für mehrere Fälle gegen das Rechenmodell geprüft
for (const c of [{ t0: 5, rh: 80, hc: 3000 }, { t0: 10, rh: 50, hc: 3500 }, { t0: 25, rh: 90, hc: 3500 }, { t0: 5, rh: 0, hc: 2500 }, { t0: 15, rh: 50, hc: 1500 }]) {
  await F(c => { window.__foehn.setMode('exp'); window.__foehn.setParams(c); }, c);
  r = await F(() => { const f = window.__foehn, M = f.M, zl = f.zeroLuv(), ze = f.zeroLee();
    const Tl = h => (!M.cond || h <= M.lcl) ? M.t0 - (h - 500) / 100 : M.tl - 0.5 * (h - M.lcl) / 100, Te = h => M.tc + (M.hc - h) / 100;
    return { zl, ze, tAtZl: Tl(zl), tAtZe: M.tc < 0 ? Te(ze) : Tl(ze), tc: M.tc, cond: M.cond, hc: M.hc }; });
  ok(Math.abs(r.tAtZl) < 1e-6 && Math.abs(r.tAtZe) < 1e-6 && r.ze >= r.zl - 1e-6, JSON.stringify(c) + ': 0 °C genau an der Schneegrenze, im Lee nie tiefer als im Luv – ' + JSON.stringify(r));
}
// ohne Kondensation: weder Wolke noch Niederschlag
await p.waitForTimeout(4000); r = await stat(); ok(!r.V.cloud && !r.V.precip && r.cf + r.cb === 0, 'ohne Kondensation: keine Wolke, kein Niederschlag – ' + JSON.stringify([r.cf, r.cb]));
// Bedienfeld und Vorführmodus
await F(() => { window.__foehn.setParams({ t0: 15, rh: 70, hc: 2500 }); window.__foehn.setMode('learn'); });
const fit = () => F(() => { const f = window.__foehn, s = f.safeRect(), vr = document.getElementById('viewport').getBoundingClientRect(); const pts = [[-16, 0, 8], [16, 0, 8], [-16, 0, -8], [16, 0, -8], [-2.5, (f.P.hc + 1500) * f.VS, -4]];
  const out = pts.map(q => { const v = f.camera.position.clone().set(q[0], q[1], q[2]).project(f.camera); return [(v.x * 0.5 + 0.5) * vr.width, (-v.y * 0.5 + 0.5) * vr.height]; }).filter(q => q[0] < s.l - 2 || q[0] > s.r + 2 || q[1] < s.t - 2 || q[1] > s.b + 2).length;
  return { out, w: Math.round(s.r - s.l), h: Math.round(s.b - s.t) }; });
await p.waitForTimeout(3000); let a = await fit(); ok(a.out === 0, 'Modell liegt im freien Feld (mit Erklärkarte) – ' + JSON.stringify(a));
await p.click('#presentBtn'); await p.waitForTimeout(4500);
let b = await fit(); const pm = await F(() => ({ fs: parseFloat(getComputedStyle(document.documentElement).fontSize), panel: getComputedStyle(document.getElementById('panel')).display, cap: document.getElementById('cap').innerText, pressed: document.getElementById('presentBtn').getAttribute('aria-pressed'), over: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight }));
ok(b.out === 0 && b.w > a.w + 200 && b.h > 380, 'Vorführmodus: Modell vollständig im (breiteren) freien Feld – ' + JSON.stringify([a, b]));
ok(pm.fs >= 17 && pm.panel === 'none' && pm.cap.includes('Welche Luft kommt am Gebirge an?') && pm.pressed === 'true' && !pm.over, 'Vorführmodus: große Schrift, Karte aus, Untertitel – ' + JSON.stringify(pm).slice(0, 200));
await shot(p, 'Coh-present');
await p.keyboard.press('PageDown'); await p.keyboard.press('PageDown'); await p.waitForTimeout(300);
r = await F(() => window.__foehn.S.chapter); ok(r >= 2, 'Presenter-Taste (Bild ab) schaltet weiter – Abschnitt ' + r);
await p.keyboard.press('p'); await p.waitForTimeout(600);
r = await F(() => ({ present: window.__foehn.S.present, panel: getComputedStyle(document.getElementById('panel')).display })); ok(!r.present && r.panel !== 'none', 'Taste P beendet den Vorführmodus');
// Vollbild-Knopf: Vollbild an und wieder aus, oder (wenn gesperrt) Hinweis
await F(() => { if (document.fullscreenElement) return document.exitFullscreen(); }); await p.waitForTimeout(400);
await p.click('#fsBtn'); await p.waitForTimeout(900);
r = await F(() => ({ fs: !!document.fullscreenElement, txt: document.getElementById('fsBtn').textContent, toast: !document.getElementById('toast').hidden }));
ok(r.fs ? r.txt === 'Vollbild beenden' : r.toast, 'Vollbild: eingeschaltet oder Hinweis angezeigt – ' + JSON.stringify(r));
if (r.fs) { await p.click('#fsBtn'); await p.waitForTimeout(700); ok(!(await F(() => !!document.fullscreenElement)), 'Vollbild lässt sich beenden'); }
console.log(`${n} Prüfungen, ${fail} Fehler`, o.errs.join(' | ') || 'keine Konsolenfehler');
await o.browser.close(); process.exit(fail ? 1 : 0);
