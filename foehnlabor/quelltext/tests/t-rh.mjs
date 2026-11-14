import { open, shot } from './h.mjs';
const o = await open({ vp: { width: 1366, height: 900 } }); const p = o.page;
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
await p.evaluate(() => { window.__foehn.setMode('exp'); window.__foehn.S.speed = 8; });
for (const c of [{ t0: 15, rh: 0, hc: 2500 }, { t0: 15, rh: 30, hc: 2500 }, { t0: 15, rh: 100, hc: 2500 }, { t0: 5, rh: 0, hc: 3500 }, { t0: 25, rh: 100, hc: 1500 }, { t0: 15, rh: 5, hc: 1500 }]) {
  await p.evaluate(c => window.__foehn.setParams(c), c); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ txt: document.body.innerText.replace(/ /g, ' '), M: window.__foehn.M, V: window.__foehn.vis() }));
  const tag = JSON.stringify(c);
  ok(!/NaN|undefined|Infinity|99 900/.test(r.txt), tag + ' keine kaputten Zahlen');
  ok(r.V.cloud === r.M.cond, tag + ' Wolke nur bei Kondensation');
  if (c.rh === 0) ok(r.txt.includes('keinen Wasserdampf') && r.txt.includes('kein Temperaturüberschuss'), tag + ' Text 0 %');
  if (c.rh === 100) ok(r.txt.includes('schon im Luv-Tal gesättigt'), tag + ' Text 100 %');
  if (c.rh === 30) await shot(p, 'RH-30', '#viewport');
}
await p.evaluate(() => { const f = window.__foehn; f.setParams({ t0: 15, rh: 0, hc: 2500 }); f.setMode('learn'); f.enterChapter(3); });
await p.waitForTimeout(600);
const t3 = await p.evaluate(() => document.getElementById('card').innerText);
ok(t3.includes('keinen Wasserdampf') && t3.includes('keines'), 'Lernmodus Abschnitt 3 bei 0 %: ' + t3.slice(0, 120));
console.log(fail ? fail + ' Fehler' : 'alles bestanden', o.errs.join(' | ') || 'keine Konsolenfehler');
await o.browser.close();
