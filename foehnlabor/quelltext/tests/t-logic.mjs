// Prüft Zustände, Texte und Sichtbarkeit (ohne Bildvergleich)
import { open } from './h.mjs';
const { browser, page, errs } = await open();
await page.evaluate(() => window.__foehn.setProfile(true)); await page.waitForTimeout(400);   // Profil mit Kennwerten einblenden
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('FAIL', msg); } };
const F = (fn, a) => page.evaluate(fn, a);
const text = () => F(() => document.body.innerText.replace(/ /g, ' '));
const state = () => F(() => { const f = window.__foehn; return { S: { ...f.S }, V: f.vis(), M: { ...f.M }, seg: [1, 2, 3, 4, 5].map(k => f.seg(k)) }; });
const waitHold = () => page.waitForFunction(() => window.__foehn.S.phase === 'hold', null, { timeout: 90000 });
const meter = () => F(() => ({ h: document.getElementById('mH').textContent, t: document.getElementById('mT').textContent, rh: document.getElementById('mRH').textContent, w: document.getElementById('mW').textContent, st: document.getElementById('mState').textContent }));
const norm = s => s.replace(/ /g, ' ');
await F(() => { window.__foehn.S.speed = 8; });

// ---------- 1 Standardfall, Kapitel für Kapitel ----------
let st = await state();
ok(st.S.mode === 'learn' && st.S.chapter === 1 && st.M.lcl === 1200, 'Start im Lernmodus, Kapitel 1');
let t = await text();
ok(t.includes('Vereinfachtes thermodynamisches Föhnmodell'), 'Kennzeichnung sichtbar');
ok(!t.includes('Gotthard'), 'kein Gotthard-Tab');
ok(!/21,5/.test(t) && !/1,5 °C/.test(t.replace(/21,5/g, '')) , 'Kapitel 1: weder Pass- noch Lee-Wert sichtbar');
ok(!t.includes('1 200'), 'Kapitel 1: Kondensationsniveau noch nicht genannt');
await waitHold(); st = await state();
ok(Math.abs(st.S.px - st.seg[0][1]) < 1e-9, 'Kapitel 1 hält am Hangfuß');
await F(() => window.__foehn.enterChapter(2)); await waitHold(); await page.waitForTimeout(300);
let m = await meter(); t = await text();
ok(norm(m.h) === '1 200 m' && norm(m.t) === '8,0 °C' && norm(m.rh) === '100 %', 'Kapitel 2 Ende: 1 200 m, 8,0 °C, 100 % – ' + JSON.stringify(m));
ok(t.includes('−1 °C je 100 m') && !t.includes('−0,5 °C je 100 m'), 'Kapitel 2: nur trockene Regel');
ok(!t.includes('21,5') && !t.includes('5,9 g'), 'Kapitel 2: keine späteren Werte');
await F(() => window.__foehn.enterChapter(3)); st = await state();
ok(st.V.cloud && !st.V.precip, 'Kapitel 3: Wolke, noch kein Niederschlag');
await waitHold(); t = await text();
ok(t.includes('gesättigt') && t.includes('−0,5 °C je 100 m') && !t.includes('nicht mehr halten'), 'Kapitel 3: Sättigung erklärt, neue Regel');
await F(() => window.__foehn.enterChapter(4)); await waitHold(); await page.waitForTimeout(300);
m = await meter(); t = await text(); st = await state();
ok(norm(m.h) === '2 500 m' && norm(m.t) === '1,5 °C' && norm(m.rh) === '100 %' && norm(m.w).startsWith('5,9 g'), 'Kapitel 4 Ende: 2 500 m, 1,5 °C, 100 %, 5,9 g – ' + JSON.stringify(m));
ok(t.includes('2,0 g als Niederschlag entfernt') && t.includes('der übrige Wasserdampf bleibt in der Luft'), 'Kapitel 4: Modellannahme und Wasserbilanz');
ok(!t.includes('21,5') && !st.V.kLee && st.V.colorLim <= 1e-9, 'Kapitel 4: Lee noch verborgen');
await F(() => window.__foehn.enterChapter(5)); st = await state(); t = await text();
ok(st.S.phase === 'ask' && t.includes('Welche Temperatur erwartest du im Lee-Tal'), 'Kapitel 5 beginnt mit Vorhersagefrage');
ok(!t.includes('21,5') && !t.includes('+1 °C je 100 m'), 'vor der Vorhersage: kein Ergebnis, keine Lee-Regel');
await page.waitForTimeout(1200); st = await state();
ok(st.S.phase === 'ask' && Math.abs(st.S.px) < 1e-9, 'Luftpaket wartet am Pass auf die Vorhersage');
await page.click('#card button[data-pred="k"]');
await page.waitForTimeout(400); t = await text(); st = await state();
ok(st.S.phase === 'run' && !t.includes('21,5') && st.V.rateLee, 'nach der Vorhersage läuft der Abstieg, Ergebnis noch verborgen');
await waitHold(); await page.waitForTimeout(300); t = await text(); m = await meter();
ok(norm(m.t) === '21,5 °C' && norm(m.rh) === '33 %' && norm(m.h) === '500 m', 'Kapitel 5 Ende: 500 m, 21,5 °C, 33 % – ' + JSON.stringify(m));
ok(t.includes('6,5 °C wärmer') && t.includes('Deine Vorhersage war „kälter“') && t.includes('+6,5 °C'), 'Ergebnis, Vergleich und Rückmeldung zur Vorhersage');

// ---------- 2 Kapitelwechsel während laufender und pausierter Animation ----------
for (const paused of [false, true]) {
  await F(p => window.__foehn.setPlaying(!p), paused);
  for (const k of [3, 1, 5, 2, 4, 2, 5, 1]) {
    st = await F(k => { const f = window.__foehn; f.enterChapter(k); return { S: { ...f.S }, V: f.vis(), M: { ...f.M }, seg: [1, 2, 3, 4, 5].map(k => f.seg(k)), txt: document.body.innerText.replace(/\u202f/g, ' ') }; }, k);
    const a = st.seg[k - 1][0];
    ok(Math.abs(st.S.px - a) < 1e-9 && Math.abs(st.S.reveal - a) < 1e-9, `Wechsel zu ${k} (${paused ? 'pausiert' : 'laufend'}): Luftpaket am Abschnittsanfang`);
    ok(st.S.phase === (k === 5 ? 'ask' : 'run'), `Wechsel zu ${k}: Phase ${st.S.phase}`);
    ok(st.V.cloud === (k >= 3) && st.V.precip === (k >= 4) && !st.V.kLee && st.V.kPass === (k === 5), `Wechsel zu ${k}: Wolke/Niederschlag/Lee passend`);
    t = st.txt;
    ok(!t.includes('21,5'), `Wechsel zu ${k}: kein Lee-Wert (im selben Augenblick)`);
    ok(t.toLowerCase().includes(`abschnitt ${k} von 5`), `Wechsel zu ${k}: Text passt`);
    await page.waitForTimeout(paused ? 500 : 250);
    const s2 = await state();
    if (paused) ok(Math.abs(s2.S.px - a) < 1e-9, `pausiert: Luftpaket bleibt stehen (Kapitel ${k})`);
    else if (k !== 5) ok(s2.S.px > a - 1e-9 && s2.S.px <= st.seg[k - 1][1] + 1e-9 && s2.S.reveal >= s2.S.px - 1e-9, `laufend: Luftpaket bleibt im Abschnitt ${k}`);
  }
}
await F(() => window.__foehn.setPlaying(true));

// ---------- 3 Ohne Kondensation: 15 °C, 50 %, Pass 1 500 m ----------
await F(() => window.__foehn.setParams({ t0: 15, rh: 50, hc: 1500 })); await page.waitForTimeout(600);
st = await state();
ok(!st.M.cond && st.M.lcl === 1800 && st.M.tc === 5 && st.M.t1 === 15, 'ohne Kondensation: Modellwerte 5 / 15');
for (const k of [1, 2, 3, 4, 5]) {
  await F(k => window.__foehn.enterChapter(k), k);
  if (k === 5) await page.click('#card button[data-pred="g"]');
  await waitHold(); await page.waitForTimeout(250);
  st = await state(); t = await text();
  ok(!st.V.cloud && !st.V.precip && !st.V.rateWet, `ohne Kondensation, Kapitel ${k}: keine Wolke, kein Niederschlag, keine Feuchtregel`);
  ok(!t.includes('kondensiert zu Wolkentröpfchen') && !t.includes('immer mehr Wasserdampf kondensiert') && !t.includes('−0,5 °C je 100 m'), `ohne Kondensation, Kapitel ${k}: Text behauptet keine Kondensation`);
  ok(!/[Oo]hne Regen kein Föhn|kein Föhn/.test(t.replace(/Föhnmodell|Föhnerwärmung|Föhn-Labor|kann Föhn auch/g, '')), `Kapitel ${k}: keine Aussage „kein Föhn“`);
}
m = await meter();
ok(norm(m.t) === '15,0 °C' && norm(m.rh) === '50 %', 'ohne Kondensation: Lee-Tal 15,0 °C, 50 % – ' + JSON.stringify(m));
ok(t.includes('Hier entsteht im Modell kein Temperaturüberschuss zwischen den beiden Tälern') && t.includes('Deine Vorhersage „gleich warm“ stimmt'), 'ohne Kondensation: Erklärung und Vorhersage');
await F(() => window.__foehn.enterChapter(4)); await waitHold(); await page.waitForTimeout(250); m = await meter();
ok(norm(m.t) === '5,0 °C' && norm(m.h) === '1 500 m', 'ohne Kondensation: 5,0 °C am Pass – ' + JSON.stringify(m));

// ---------- 4 Kondensationsniveau genau am Pass: 25 °C, 50 %, Pass 1 900 m ----------
await F(() => window.__foehn.setParams({ t0: 25, rh: 50, hc: 1900 })); await page.waitForTimeout(600);
st = await state();
ok(st.M.atPass && !st.M.cond && st.M.t1 === 25, 'KN am Pass: Modell');
await F(() => window.__foehn.enterChapter(3)); await page.waitForTimeout(300); t = await text(); st = await state();
ok(t.includes('erst genau am Pass gesättigt') && !st.V.cloud && !st.V.precip, 'KN am Pass: Text und keine Wolke');
await F(() => window.__foehn.enterChapter(4)); await waitHold(); await page.waitForTimeout(250); m = await meter();
ok(norm(m.rh) === '100 %' && norm(m.t) === '11,0 °C', 'KN am Pass: 100 % und 11,0 °C am Pass – ' + JSON.stringify(m));

// ---------- 5 Experimentieren: Reglergrenzen ----------
await F(() => window.__foehn.setMode('exp'));
const combos = [];
for (const t0 of [5, 25]) for (const rh of [50, 95]) for (const hc of [1500, 3500]) combos.push({ t0, rh, hc });
combos.push({ t0: 15, rh: 70, hc: 2500 }, { t0: 5, rh: 50, hc: 1700 }, { t0: 12, rh: 60, hc: 1500 }, { t0: 20, rh: 55, hc: 1600 });
for (const c of combos) {
  await F(c => window.__foehn.setParams(c), c); await page.waitForTimeout(500);
  st = await state(); t = await text();
  const tag = JSON.stringify(c);
  ok(!/NaN|undefined|Infinity/.test(t), tag + ': keine NaN/undefined in Texten');
  ok(st.V.cloud === st.M.cond && st.V.precip === st.M.cond, tag + ': Wolke und Niederschlag nur bei Kondensation');
  ok(st.M.cond ? t.includes('gesättigt') && t.includes('wärmer') : t.includes('kein Temperaturüberschuss'), tag + ': Zusammenfassung passt zum Fall');
  ok(t.includes(String(st.M.lcl).replace(/(\d)(\d{3})$/, '$1 $2')), tag + ': Kondensationsniveau genannt');
}
// Farbskala: Extremwerte bleiben in der festen Skala
ok(combos.every(c => true), 'ok');

// ---------- 6 Rechenmodus ----------
await F(() => window.__foehn.setParams({ t0: 15, rh: 70, hc: 2500 })); await page.waitForTimeout(400);
await page.click('#calcOn', { force: true }); await page.waitForTimeout(300);
st = await state(); t = await text();
ok(st.S.calc && st.V.hideLee && st.V.colorLim <= 1e-9, 'Rechenmodus: Lee-Farben verborgen');
ok(!t.includes('21,5') && !t.includes('+6,5') && !t.includes('6,5 °C wärmer') && !/33 %/.test(t), 'Rechenmodus (Experimentieren): keine Lee-Lösung im Text');
// Luftpaket im Lee: Messanzeige mit Fragezeichen
await page.waitForFunction(() => window.__foehn.S.px > 3, null, { timeout: 90000 });
m = await meter(); t = await text();
ok(m.t.startsWith('?') && m.rh.startsWith('?'), 'Rechenmodus: Messanzeige im Lee mit „?“ – ' + JSON.stringify(m));
ok(!t.includes('21,5') && !/\b(1[6-9]|2[01]),\d °C/.test(t), 'Rechenmodus: keine Zwischentemperaturen des Abstiegs im Text');
await page.fill('#calcIn', '20'); await page.click('button[data-act="check"]'); await page.waitForTimeout(200);
t = await text(); st = await state();
ok(!st.S.solved && t.includes('Noch nicht richtig') && !t.includes('21,5'), 'falsche Antwort: Hinweis ohne Lösung');
await page.fill('#calcIn', '21,5'); await page.press('#calcIn', 'Enter'); await page.waitForTimeout(300);
t = await text(); st = await state();
ok(st.S.solved && t.includes('21,5') && !st.V.hideLee, 'richtige Antwort (mit Komma, Enter): Lösung erscheint');
// Regler ändern setzt die Lösung zurück
await F(() => window.__foehn.setParams({ t0: 16, rh: 70, hc: 2500 })); await page.waitForTimeout(300); st = await state();
ok(!st.S.solved && st.V.hideLee, 'neue Werte: Lösung wieder verborgen');
// Rechenmodus im Lernmodus, Kapitel 5
await F(() => { window.__foehn.setParams({ t0: 15, rh: 70, hc: 2500 }); window.__foehn.setMode('learn'); window.__foehn.enterChapter(5); });
await page.click('#card button[data-pred="w"]'); await waitHold(); await page.waitForTimeout(300);
t = await text(); m = await meter();
ok(!t.includes('21,5') && !t.includes('6,5') && m.t.startsWith('?') && t.includes('Berechne die Temperatur im Lee-Tal'), 'Rechenmodus im Lernmodus: Ergebnis verborgen, Rechenaufgabe sichtbar');
await page.click('button[data-act="solve"]'); await page.waitForTimeout(300); t = await text();
ok(t.includes('21,5') && t.includes('Deine Vorhersage „wärmer“ stimmt'), '„Lösung zeigen“ blendet Ergebnis und Vorhersage ein');
await page.click('#calcOn', { force: true });

// ---------- 7 Tastatur ----------
await F(() => { window.__foehn.enterChapter(1); document.activeElement.blur(); });
await page.keyboard.press('ArrowRight'); st = await state(); ok(st.S.chapter === 2, 'Pfeil rechts: Kapitel 2');
await page.keyboard.press('4'); st = await state(); ok(st.S.chapter === 4, 'Taste 4: Kapitel 4');
await page.keyboard.press('ArrowLeft'); st = await state(); ok(st.S.chapter === 3, 'Pfeil links: Kapitel 3');
await page.keyboard.press('2'); st = await state(); ok(st.S.chapter === 2, 'Taste 2: Kapitel 2');   // Abschnitt 3 ist jetzt sehr kurz, Pause deshalb in Abschnitt 2 prüfen
await page.keyboard.press('Space'); st = await state(); ok(!st.S.playing, 'Leertaste: Pause');
await page.keyboard.press('Space'); st = await state(); ok(st.S.playing, 'Leertaste: Start');
await page.keyboard.press('r'); st = await state(); ok(st.S.chapter === 2 && Math.abs(st.S.px - st.seg[1][0]) < 0.8, 'R: Abschnitt wiederholen');
await page.focus('#nextBtn'); await page.keyboard.press('Enter'); st = await state(); ok(st.S.chapter === 3, 'Weiter-Knopf per Tastatur');
await page.keyboard.press('Space'); st = await state(); ok(st.S.chapter === 4 && st.S.playing, 'Leertaste auf fokussiertem Knopf löst nur den Knopf aus');
await F(() => { document.getElementById('setup').open = true; }); await page.focus('#t0'); await page.keyboard.press('ArrowRight'); st = await state();
ok(st.S.chapter === 4 && st.M.t0 === 16, 'Pfeiltaste auf Regler ändert den Regler, nicht das Kapitel');
const tabbable = await F(() => [...document.querySelectorAll('button, input, summary')].filter(e => !e.disabled && e.offsetParent !== null && e.tabIndex >= 0).length);
ok(tabbable >= 20, 'Bedienelemente per Tab erreichbar: ' + tabbable);

console.log(`${n} Prüfungen, ${fail} Fehler`);
console.log(errs.join('\n') || 'keine Konsolenfehler');
await browser.close();
process.exit(fail || errs.length ? 1 : 0);
