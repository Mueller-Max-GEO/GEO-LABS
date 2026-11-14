// Seitenfenster-Größe: nur mit dem Startknopf durch alle Abschnitte; Vorhersage im Bild sichtbar; Luftpaket nie im Gelände
import { open, shot } from './h.mjs';
const o = await open({ vp: { width: 720, height: 900 } }); const p = o.page;
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const F = (fn, a) => p.evaluate(fn, a);
await F(() => { window.__foehn.S.speed = 6; });
const trace = [];
for (let step = 0; step < 12; step++) {
  await p.waitForFunction(() => ['hold', 'ask'].includes(window.__foehn.S.phase), null, { timeout: 120000 });
  const s = await F(() => ({ ch: window.__foehn.S.chapter, phase: window.__foehn.S.phase, px: +window.__foehn.S.px.toFixed(2), h: Math.round(window.__foehn.pathState(window.__foehn.S.px).h), btn: document.getElementById('playBtn').textContent }));
  trace.push(`${s.ch}:${s.phase}@${s.h}m[${s.btn}]`);
  if (s.ch === 5 && s.phase === 'ask') {
    const ov = await F(() => { const r = document.querySelector('#card .ask').getBoundingClientRect(); const b = [...document.querySelectorAll('#card .ask button')].map(e => e.getBoundingClientRect()); const pr = document.getElementById('panel').getBoundingClientRect();
      return { ovHidden: document.getElementById('askOv').hidden, inWin: r.top >= 0 && b.every(x => x.bottom <= pr.bottom + 1 && x.bottom <= innerHeight) }; });
    ok(ov.ovHidden && ov.inWin, 'Vorhersagefrage in der Karte sichtbar, ohne zu scrollen ' + JSON.stringify(ov));
    await shot(p, 'Flow-ask');
    await p.click('#card button[data-pred="w"]');
    continue;
  }
  if (s.ch === 5 && s.phase === 'hold') break;
  await p.click('#playBtn');
}
console.log(trace.join(' → '));
const end = await F(() => ({ ch: window.__foehn.S.chapter, phase: window.__foehn.S.phase, t: document.getElementById('mT').textContent, txt: document.getElementById('card').innerText }));
ok(end.ch === 5 && end.phase === 'hold' && end.t.includes('21,5') && end.txt.includes('„wärmer“ stimmt'), 'Ende erreicht: ' + JSON.stringify(end).slice(0, 160));
// „Abstieg starten“ ohne Vorhersage
await F(() => window.__foehn.enterChapter(5)); await p.click('#playBtn');
ok(await p.waitForFunction(() => window.__foehn.S.phase === 'run' && window.__foehn.S.px > 0.5, null, { timeout: 20000 }).then(() => true, () => false), 'Abstieg startet auch ohne Vorhersage');
// Vorführmodus: Erklärkarte aus → die Vorhersagefrage steht im Bild, der Untertitel unter dem Modell
await F(() => { window.__foehn.setPresent(true, false); window.__foehn.enterChapter(5); }); await p.waitForTimeout(700);
const pm = await F(() => { const r = document.getElementById('askOv').getBoundingClientRect(), c = document.getElementById('cap').getBoundingClientRect(), d = document.getElementById('dock').getBoundingClientRect();
  return { ask: !document.getElementById('askOv').hidden && r.width > 0 && r.top >= 0 && r.bottom <= c.top + 1, cap: !document.getElementById('cap').hidden && c.bottom <= d.top + 1, panel: getComputedStyle(document.getElementById('panel')).display, fs: getComputedStyle(document.documentElement).fontSize }; });
ok(pm.ask && pm.cap && pm.panel === 'none', 'Vorführmodus: Frage im Bild, Untertitel sichtbar, Erklärkarte aus ' + JSON.stringify(pm));
await shot(p, 'Flow-present-ask');
await p.click('#askOv button[data-pred="w"]');
ok(await p.waitForFunction(() => window.__foehn.S.phase === 'run' && window.__foehn.S.px > 0.3, null, { timeout: 20000 }).then(() => true, () => false), 'Vorführmodus: Antwort im Bild startet den Abstieg');
await F(() => window.__foehn.setPresent(false));
// Luftpaket nie im Gelände: Abstand Mittelpunkt–Gelände in der Ebene z = 0 und daneben
const pen = await F(() => { const f = window.__foehn; let worst = 9, at = 0;
  for (let x = f.X_START; x <= f.X_LEEORT; x += 0.05) { f.probe(x); const P = f.S; }
  const res = []; for (let x = f.X_START; x <= f.X_LEEORT; x += 0.05) {
    f.probe(x); const c = window.__foehn_parcel ?? null; }
  return null; });
const clr = await F(() => { const f = window.__foehn; let worst = 9, wx = 0;
  for (let x = f.X_START; x <= f.X_LEEORT + 1.5; x += 0.04) { const o = f.parcelInfo(x);
    for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2, dx = Math.cos(ang) * o.r, dz = Math.sin(ang) * o.r;
      for (const fy of [-1, -0.7, -0.4]) { const px = o.x + dx * Math.sqrt(1 - fy * fy), pz = dz * Math.sqrt(1 - fy * fy), py = o.y + fy * o.r;
        const d = py - f.ground(px, pz) * f.VS; if (d < worst) { worst = d; wx = x; } } } }
  return { worst: +worst.toFixed(3), wx: +wx.toFixed(2) }; });
ok(clr.worst >= 0, 'Luftpaket ragt nirgends ins Gelände (kleinster Abstand ' + JSON.stringify(clr) + ')');
console.log(fail ? fail + ' Fehler' : 'alles bestanden', o.errs.join(' | ') || 'keine Konsolenfehler');
await o.browser.close(); process.exit(fail ? 1 : 0);
