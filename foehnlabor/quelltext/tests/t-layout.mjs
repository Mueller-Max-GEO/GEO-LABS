// Prüft Überlappungen und Lesbarkeit in beiden Ansichten und mehreren Bildschirmgrößen
import { open, shot } from './h.mjs';
const sizes = JSON.parse(process.argv[2] || '[["ipad-quer",1180,820],["ipad-hoch",820,1180],["laptop",1366,768],["beamer",1920,1080],["handy",390,844]]');
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('FAIL', msg); } };
const allErrs = [];
for (const [name, w, h] of sizes) {
  const { browser, page, errs } = await open({ vp: { width: w, height: h }, });
  const F = (fn, a) => page.evaluate(fn, a);
  await F(prof => { window.__foehn.S.speed = 8; if (prof) window.__foehn.setProfile(true); }, w >= 1000 || h >= 1000); await page.waitForTimeout(500);
  const waitHold = () => page.waitForFunction(() => window.__foehn.S.phase === 'hold', null, { timeout: 120000 });
  const check = async (tag) => {
    // zwei Bilder abwarten (Etiketten werden beim Zeichnen platziert), dann die Entflechtung sofort ausführen
    await F(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { window.__foehn.declutter(); r(); }))));
    const r = await F(() => {
      const f = window.__foehn, vp = document.getElementById('viewport'), vr = vp.getBoundingClientRect();
      const rect = e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, name: (e.className + ' ' + e.textContent.trim().slice(0, 24)) }; };
      const labels = [...vp.querySelectorAll('.lbl')].filter(e => getComputedStyle(e).display !== 'none' && e.style.opacity === '1' && e.offsetParent !== null).map(rect);
      const hud = [...document.querySelectorAll('#ui > .hud, #meter, #rule, #cap, #panel, #dock, #askOv')].map(rect).filter(b => b.w > 0);
      const ps = f.parcelScreen();
      const pr = { l: vr.left + ps.x - ps.r, r: vr.left + ps.x + ps.r, t: vr.top + ps.y - ps.r, b: vr.top + ps.y + ps.r, name: 'Luftpaket' };
      const card = document.getElementById('card');
      return { labels, hud, pr, vr: { l: vr.left, r: vr.right, t: vr.top, b: vr.bottom }, sw: document.documentElement.scrollWidth, iw: innerWidth, cardOver: card.scrollWidth - card.clientWidth,
        boxes: f.S.profile ? f.profBoxes.filter(b => b.t !== 'dot' && b.t !== 'parcel') : [], prof: { w: document.getElementById('prof').clientWidth, h: document.getElementById('prof').clientHeight },
        fonts: [...document.querySelectorAll('.expl, .q, .m-row dd, .lbl, .chapters button, .btn')].map(e => parseFloat(getComputedStyle(e).fontSize)).reduce((a, b) => Math.min(a, b), 99) };
    });
    const hit = (a, b, pad = 0) => a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad;
    ok(r.sw <= r.iw, `${name} ${tag}: Seite läuft nicht seitlich über (${r.sw} > ${r.iw})`);
    ok(r.cardOver <= 0, `${name} ${tag}: Karte läuft nicht über (${r.cardOver})`);
    for (let i = 0; i < r.labels.length; i++) {
      for (let j = i + 1; j < r.labels.length; j++) ok(!hit(r.labels[i], r.labels[j]), `${name} ${tag}: Etiketten überlappen: „${r.labels[i].name}“ / „${r.labels[j].name}“`);
      for (const hd of r.hud) ok(!hit(r.labels[i], hd), `${name} ${tag}: Etikett „${r.labels[i].name}“ unter fester Anzeige „${hd.name.slice(0, 20)}“`);
      ok(!hit(r.labels[i], r.pr), `${name} ${tag}: Etikett „${r.labels[i].name}“ verdeckt das Luftpaket`);
    }
    for (let i = 0; i < r.hud.length; i++) for (let j = i + 1; j < r.hud.length; j++) ok(!hit(r.hud[i], r.hud[j]), `${name} ${tag}: feste Anzeigen überlappen: ${r.hud[i].name.slice(0, 18)} / ${r.hud[j].name.slice(0, 18)}`);
    for (const hd of r.hud) ok(!hit(r.pr, hd), `${name} ${tag}: Luftpaket unter fester Anzeige „${hd.name.slice(0, 20)}“`);
    for (let i = 0; i < r.boxes.length; i++) {
      const a = r.boxes[i], A = { l: a.x, r: a.x + a.w, t: a.y, b: a.y + a.h };
      ok(A.l >= -1 && A.r <= r.prof.w + 1 && A.t >= -8 && A.b <= r.prof.h + 1, `${name} ${tag}: Querschnitt-Text „${a.t}“ außerhalb der Zeichenfläche`);
      for (let j = i + 1; j < r.boxes.length; j++) { const b = r.boxes[j]; ok(!hit(A, { l: b.x, r: b.x + b.w, t: b.y, b: b.y + b.h }), `${name} ${tag}: Querschnitt-Texte überlappen (${a.t}/${b.t})`); }
    }
    return r;
  };
  // Luftpaket darf auf dem ganzen Weg nicht unter eine feste Anzeige geraten
  const sweep = async (tag) => {
    const res = await F(() => {
      const f = window.__foehn, vp = document.getElementById('viewport'), vr = vp.getBoundingClientRect();
      const hud = [...document.querySelectorAll('#ui > .hud, #meter, #rule, #cap, #panel, #dock, #askOv')].map(e => e.getBoundingClientRect()).filter(b => b.width > 0);
      const keep = f.S.px, bad = [], occ = []; let out = 0; const C = f.camera.position;
      for (let x = f.X_START; x <= f.X_LEEORT + 1.6; x += 0.2) {
        const p = f.probe(x), X = vr.left + p.x, Y = vr.top + p.y;
        if (hud.some(b => X + p.r > b.left && X - p.r < b.right && Y + p.r > b.top && Y - p.r < b.bottom)) bad.push(+x.toFixed(1));
        if (p.x - p.r < 0 || p.x + p.r > vr.width || p.y - p.r < 0 || p.y + p.r > vr.height) out++;
        // Sichtlinie vom Mittelpunkt des Luftpakets zur Kamera: liegt irgendwo Gelände darüber?
        const py = f.pathY(x); let hidden = false;
        for (let s = 0.004; s < 0.45 && !hidden; s += 0.002) { const X2 = x + (C.x - x) * s, Y2 = py + (C.y - py) * s, Z2 = (C.z) * s; if (Z2 > 8 || X2 < -16 || X2 > 16) break; if (f.ground(X2, Z2) * f.VS > Y2 + 0.02) hidden = true; }
        if (hidden) occ.push(+x.toFixed(1));
      }
      f.probe(keep);
      return { bad, out, occ: f.clipC > 7 ? occ : [] };
    });
    ok(res.bad.length === 0, `${name} ${tag}: Luftpaket gerät unter eine feste Anzeige bei x = ${res.bad.join(', ')}`);
    ok(res.occ.length === 0, `${name} ${tag}: Gelände verdeckt das Luftpaket bei x = ${res.occ.join(', ')}`);
    ok(res.out === 0, `${name} ${tag}: Luftpaket verlässt das Bild (${res.out} Stellen)`);
  };
  for (const view of ['3d', 'side']) {
    await F(v => { const f = window.__foehn; f.setMode('learn'); f.setParams({ t0: 15, rh: 70, hc: 2500 }); f.setView(v, false); }, view);
    await page.waitForTimeout(400);
    await F(() => window.__foehn.enterChapter(2)); await waitHold(); await check(`${view} Kap.2`);
    await F(() => window.__foehn.enterChapter(4)); await waitHold(); const r4 = await check(`${view} Kap.4`);
    if (view === '3d') ok(r4.fonts >= 11, `${name}: kleinste Schrift ${r4.fonts}px`);
    await shot(page, `L-${name}-${view}-k4`);
    await F(() => window.__foehn.enterChapter(5)); await page.click('#card button[data-pred="w"]'); await waitHold(); await check(`${view} Kap.5`);
    if (view === '3d') { await page.screenshot({ path: `out/L-${name}-full.png`, fullPage: true }); }
    // ohne Kondensation und Extremwerte im Experimentiermodus
    await F(() => { const f = window.__foehn; f.setMode('exp'); f.setPlaying(false); });
    for (const c of [{ t0: 15, rh: 70, hc: 2500 }, { t0: 15, rh: 50, hc: 1500 }, { t0: 25, rh: 95, hc: 3500 }, { t0: 5, rh: 50, hc: 3500 }, { t0: 25, rh: 50, hc: 1900 }, { t0: 10, rh: 80, hc: 1500 }]) {
      await F(c => window.__foehn.setParams(c), c); await page.waitForTimeout(700);
      for (const x of [-9, -3, 0, 6]) { await F(x => window.__foehn.probe(x), x); await check(`${view} exp ${c.t0}/${c.rh}/${c.hc} x=${x}`); }
      await sweep(`${view} exp ${c.t0}/${c.rh}/${c.hc}`);
    }
    await F(() => window.__foehn.setPlaying(true));
  }
  if (errs.length) allErrs.push(name + ': ' + errs.join(' | '));
  await browser.close();
}
console.log(`${n} Prüfungen, ${fail} Fehler`);
console.log(allErrs.join('\n') || 'keine Konsolenfehler');
process.exit(fail || allErrs.length ? 1 : 0);
