// Seitenfenster nachbauen: Seite im iframe, Breite und Höhe ändern sich mehrfach. Gezählt wird jede Fehlermeldung,
// die ein früh registrierter Fehler-Listener (wie der der Claude-App) zu sehen bekommt.
import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path';
const S = '/tmp/claude-0/-home-claude/4c9bd4db-f3f3-5c57-9c86-e1efd10303c7/scratchpad/foehn';
const file = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.addInitScript(() => { window.__errs = []; window.addEventListener('error', e => window.__errs.push(String(e.message)), true); });
await page.route('**/*', r => {
  const u = r.request().url();
  if (u.includes('cdn.jsdelivr.net/npm/three@0.160.0/')) return r.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/three', u.split('three@0.160.0/')[1])), contentType: 'application/javascript' });
  if (u.startsWith('file:')) return r.continue();
  return r.abort();
});
fs.writeFileSync(path.join(S, 'out/frame.html'), `<!doctype html><body style="margin:0"><iframe id="f" src="${path.join(S, file)}" style="border:0;width:420px;height:700px"></iframe></body>`);
await page.goto('file://' + path.join(S, 'out/frame.html'));
const fr = () => page.frames().find(f => f.url().includes(path.basename(file)));
for (let i = 0; i < 100 && !(fr() && await fr().evaluate(() => !!window.__foehn).catch(() => false)); i++) await page.waitForTimeout(200);
// Größe des Rahmens wie beim Aufziehen des Seitenfensters ändern, auch über die Umbruchgrenzen hinweg
for (const [w, h] of [[480, 700], [560, 720], [620, 760], [640, 780], [700, 820], [760, 840], [800, 860], [820, 880], [900, 900], [980, 900], [700, 820], [520, 700], [639, 760], [641, 760], [799, 820], [801, 820]]) {
  await page.evaluate(([w, h]) => { const f = document.getElementById('f'); f.style.width = w + 'px'; f.style.height = h + 'px'; }, [w, h]);
  await page.waitForTimeout(120);
}
// zusätzlich stufenlos über mehrere Bilder ziehen
await page.evaluate(() => new Promise(res => { const f = document.getElementById('f'); let w = 400, t0 = performance.now();
  const step = () => { w += 7; f.style.width = w + 'px'; if (performance.now() - t0 < 2500 && w < 1300) requestAnimationFrame(step); else res(); }; step(); }));
await page.waitForTimeout(1500);
const errs = await fr().evaluate(() => window.__errs);
const ro = errs.filter(e => /ResizeObserver/.test(e));
const other = errs.filter(e => !/ResizeObserver/.test(e));
const st = await fr().evaluate(() => ({ w: document.getElementById('viewport').clientWidth, canvas: document.querySelector('#viewport canvas').clientWidth, prof: document.getElementById('prof').clientHeight }));
console.log(path.basename(file), '→ ResizeObserver-Fehler:', ro.length, '· andere Fehler:', other.length, other.slice(0, 3).join(' | '), '· Größen nach dem Ziehen:', JSON.stringify(st));
await browser.close();
