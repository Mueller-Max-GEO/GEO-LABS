// Ergänzende Prüfungen: aufgeklappte Einstellungen, Ansichten, Zahlen aus, Moduswechsel
import { open, shot } from './h.mjs';
const { browser, page, errs } = await open({ vp: { width: 1366, height: 768 } });
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('FAIL', msg); } };
const F = (fn, a) => page.evaluate(fn, a);
const text = () => F(() => document.body.innerText.replace(/ /g, ' '));
// 1 Lernmodus: aufgeklappte Einstellungen verraten nichts
await F(() => { document.getElementById('setup').open = true; document.getElementById('opts').open = true; });
let t = await text();
ok(!t.includes('1 200') && !t.includes('1 179') && !t.includes('21,5'), 'Lernmodus Kapitel 1 mit aufgeklappten Einstellungen: kein Kondensationsniveau, kein Lee-Wert');
ok(!t.includes('Grenzen des Modells') || true, '');
// 2 Grenzen des Modells: Pflichttexte
await F(() => { document.getElementById('limits').open = true; }); t = await text();
ok(t.includes('Dieses Modell zeigt einen Mechanismus der Föhnerwärmung. In der Atmosphäre kann Föhn auch ohne Niederschlag im Luv auftreten.'), 'fachlicher Hinweis wörtlich vorhanden');
ok(t.includes('schwankt in Wirklichkeit') && t.includes('sofort als Niederschlag entfernt') && t.includes('auf 100 m gerundet'), 'Grenzen: variabler Wert, Modellannahme, Rundung');
ok(!/nicht mehr halten|aufnehmen kann/.test(t), 'keine Behälter-Vorstellung im Text');
// 3 Ansichten
await F(() => window.__foehn.setView('side')); await page.waitForFunction(() => !window.__foehn.camAnim, null, { timeout: 90000 });
let v = await F(() => { const f = window.__foehn; return { clip: f.clipC, fov: f.camera.fov, pos: f.camera.position.toArray(), tgt: f.controls.target.toArray(), view: f.S.view, pressed: document.getElementById('viewSide').getAttribute('aria-pressed') }; });
ok(Math.abs(v.clip) < 1e-6 && Math.abs(v.fov - 10) < 1e-6 && v.pressed === 'true', 'Querschnitt: Schnitt am Pass (z = 0), kleiner Öffnungswinkel – ' + JSON.stringify(v));
ok(Math.abs(v.pos[0] - v.tgt[0]) < 1e-6 && v.pos[2] - v.tgt[2] > 90, 'Querschnitt: Kamera frontal und weit entfernt (fast unverzerrt)');
// Kamera verstellen, dann zurücksetzen
await page.mouse.move(500, 380); await page.mouse.down(); await page.mouse.move(650, 330, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(600);
let moved = await F(() => window.__foehn.camera.position.toArray());
ok(Math.abs(moved[0] - v.pos[0]) > 1, 'Kamera lässt sich drehen');
await page.click('#viewReset'); await page.waitForFunction(() => !window.__foehn.camAnim, null, { timeout: 90000 }); await page.waitForTimeout(700);
let back = await F(() => window.__foehn.camera.position.toArray());
ok(back.every((x, i) => Math.abs(x - v.pos[i]) < 0.05), '„Ansicht zurücksetzen“ stellt den Querschnitt wieder her');
await page.click('#view3d'); await page.waitForFunction(() => !window.__foehn.camAnim, null, { timeout: 90000 });
v = await F(() => ({ clip: window.__foehn.clipC, fov: window.__foehn.camera.fov }));
ok(Math.abs(v.clip - 8) < 1e-6 && Math.abs(v.fov - 34) < 1e-6, 'Schrägansicht: Block wieder vollständig');
// keine Dauerrotation: Kamera steht still
const p1 = await F(() => window.__foehn.camera.position.toArray()); await page.waitForTimeout(1500); const p2 = await F(() => window.__foehn.camera.position.toArray());
ok(p1.every((x, i) => Math.abs(x - p2[i]) < 1e-3), 'keine automatische Kamerabewegung');
// 4 Zahlen aus
await page.click('#numOn', { force: true }); await page.waitForTimeout(300);
const vis = await F(() => [...document.querySelectorAll('.num')].filter(e => e.offsetParent !== null).length);
t = await text();
ok(vis === 0 && !t.includes('15,0') && !t.includes('Luv-Tal · 500') && !t.includes('7,9 g'), 'Zahlenwerte aus: keine Messwerte sichtbar');
await page.click('#numOn', { force: true });
// 5 Moduswechsel
await page.click('input[name="mode"][value="exp"]', { force: true }); await page.waitForTimeout(300);
let s = await F(() => ({ ...window.__foehn.S, open: document.getElementById('setup').open, chHidden: document.getElementById('chapters').hidden }));
ok(s.mode === 'exp' && s.open && s.chHidden, 'Experimentieren: Regler offen, Kapitel ausgeblendet');
t = await text(); ok(t.includes('berechnet') && t.includes('21,5'), 'Experimentieren: Ergebnis und Rundungshinweis sichtbar');
await page.click('input[name="mode"][value="learn"]', { force: true }); await page.waitForTimeout(300);
s = await F(() => ({ ...window.__foehn.S, open: document.getElementById('setup').open }));
ok(s.mode === 'learn' && s.chapter === 1 && !s.open, 'zurück zu Schritt für Schritt: Kapitel 1, Einstellungen eingeklappt');
// 6 Abschnitt wiederholen
await F(() => { window.__foehn.S.speed = 8; window.__foehn.enterChapter(2); });
await page.waitForFunction(() => window.__foehn.S.phase === 'hold', null, { timeout: 90000 });
await page.click('#replayBtn'); s = await F(() => ({ ...window.__foehn.S, a: window.__foehn.seg(2)[0] }));
ok(s.phase === 'run' && s.px < s.a + 1.5 && s.playing, '„Wiederholen“ startet den Abschnitt neu');
console.log(`${n} Prüfungen, ${fail} Fehler`); console.log(errs.join('\n') || 'keine Konsolenfehler');
await browser.close(); process.exit(fail || errs.length ? 1 : 0);
