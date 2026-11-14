// Vorführmodus und Normalansicht in mehreren Formaten: kein Text ragt aus seinem Kasten, keine Überlappungen
import { open, shot } from './h.mjs';
const sizes = JSON.parse(process.argv[2] || '[["ipad-quer",1180,820],["ipad-hoch",820,1180],["ipad-pro-quer",1366,1024],["ipad-mini-hoch",744,1133],["beamer",1920,1080],["beamer-klein",1280,720],["seite",720,900],["handy",390,844]]');
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL', m); } };
for (const [name, w, h] of sizes) {
  const o = await open({ vp: { width: w, height: h }, settle: 800 }); const p = o.page;
  for (const [mode, present, ch] of [['learn', true, 3], ['learn', true, 5], ['exp', true, 0], ['learn', false, 4], ['exp', false, 0]]) {
    await p.evaluate(([mode, present, ch]) => { const f = window.__foehn; f.setPresent(present, false); f.setMode(mode); if (mode === 'learn') { f.S.speed = 8; f.enterChapter(ch); } }, [mode, present, ch]);
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const bad = [], R = e => e.getBoundingClientRect();
      const vis = e => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && R(e).width > 0;
      // 1. Text, der aus seinem Element hinausläuft
      for (const e of document.querySelectorAll('#ui .hud *, #meter *, #rule, #rule *, #cap *, #transport *, .xc, .xs'))
        if (vis(e) && !e.closest('.chapters') && e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline') bad.push('überläuft: ' + (e.id || e.className || e.tagName) + ' „' + e.textContent.slice(0, 30) + '“');
      // 2. Inhalt einer Messzelle bleibt in der Zelle
      for (const c of document.querySelectorAll('#meter .m-cell')) { if (!vis(c)) continue; const cr = R(c);
        for (const e of c.querySelectorAll('*')) { if (!vis(e) || e.classList.contains('mark')) continue; const er = R(e);
          if (er.right > cr.right + 1 || er.left < cr.left - 1 || er.bottom > cr.bottom + 1) bad.push('ragt aus Messzelle: ' + (e.id || e.className || e.tagName) + ' „' + e.textContent.slice(0, 25) + '“'); } }
      // 3. Bedienflächen überlappen sich nicht und liegen im Fenster
      const boxes = [...document.querySelectorAll('#ui > .hud, #meter, #rule, #cap, #panel, #dock')].filter(vis).map(e => [e.id || e.className.split(' ')[0], R(e)]);
      for (let i = 0; i < boxes.length; i++) { const [a, A] = boxes[i];
        if (document.getElementById(a) && document.getElementById(a).getAnimations().length) continue;
        if (A.left < -1 || A.top < -1 || A.right > innerWidth + 1 || A.bottom > innerHeight + 1) bad.push('außerhalb des Fensters: ' + a);
        for (let j = i + 1; j < boxes.length; j++) { const [b, B] = boxes[j];
          if (a === 'meterwrap' || b === 'meterwrap') continue;
          if (Math.min(A.right, B.right) - Math.max(A.left, B.left) > 2 && Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 2) bad.push('Überlappung: ' + a + ' / ' + b); } }
      // 4. Experimentieren im Vorführmodus: kein Fließtext, sondern Regler
      const cap = document.getElementById('cap');
      const xm = window.__foehn.S.mode === 'exp' && window.__foehn.S.present;
      if (xm && (!cap.querySelector('#x_t0') || cap.querySelector('p'))) bad.push('Vorführmodus Experimentieren: Regler fehlen oder Text vorhanden');
      const free = R(document.getElementById('free'));
      return { bad: [...new Set(bad)], free: [Math.round(free.width), Math.round(free.height)] };
    });
    const tag = `${name} ${w}×${h} ${present ? 'Vorführmodus' : 'normal'} ${mode}${ch ? ' Abschnitt ' + ch : ''}`;
    ok(r.bad.length === 0, tag + ': ' + r.bad.join(' | '));
    ok(r.free[1] >= (w < 500 ? 100 : 200), tag + ': freies Feld fürs Modell ' + r.free.join('×'));
    if (present) await shot(p, `PR-${name}-${mode}${ch || ''}`);
  }
  if (o.errs.length) ok(false, name + ' Konsolenfehler: ' + o.errs.join(' | '));
  await o.browser.close();
}
console.log(`${n} Prüfungen, ${fail} Fehler`);
process.exit(fail ? 1 : 0);
