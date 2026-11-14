// ================= Kamera =================
let camAnim = null, compact = false;
// Nachlaufen der Kamera (Trägheit nach dem Ziehen) beenden, bevor eine feste Ansicht eingestellt wird
function stopInertia() { controls.enableDamping = false; controls.update(); controls.enableDamping = true; }
function applyPose(pose) {
  stopInertia();
  camera.position.copy(pose.pos); controls.target.copy(pose.tgt);
  camera.fov = pose.fov; camera.updateProjectionMatrix();
  setClip(pose.clip); placeFaceLabels(); placeLabels(); updateLabels();
}
function flyTo(pose, dur = 1.2) {
  stopInertia();
  const d0 = camera.position.distanceTo(controls.target), d1 = pose.pos.distanceTo(pose.tgt);
  camAnim = { p0: camera.position.clone(), t0: controls.target.clone(), c0: clipC, p1: pose.pos, t1: pose.tgt, c1: pose.clip, f1: pose.fov,
    h0: d0 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), h1: d1 * Math.tan(THREE.MathUtils.degToRad(pose.fov / 2)), k: 0, dur };
  faceLabels.forEach(l => setVis(l, false));
}
function setView(v, animate = true) {
  S.view = v; userMoved = false;
  $('view3d').setAttribute('aria-pressed', v === '3d'); $('viewSide').setAttribute('aria-pressed', v === 'side');
  const pose = viewPose(v);
  if (animate && !mqReduce.matches) flyTo(pose); else { camAnim = null; applyPose(pose); }
}
$('view3d').onclick = () => setView('3d');
$('viewSide').onclick = () => setView('side');
$('viewReset').onclick = () => setView(S.view);

// ================= Beschriftungen im 3D-Bild =================
function setVis(o, v) { o.visible = v; o.userData.want = v; if (!v) o.element.style.opacity = 0; }
const rhTxt = r => (r >= 99.95 ? 100 : Math.min(99, Math.round(r))) + NNBSP + '%';
function placeLabels() {
  L.luv.position.set(-8.5, -0.1, Z1 + 0.3); L.lee.position.set(7.5, -0.1, Z1 + 0.3);
  L.wind.position.set(X0 - 0.2, 1.62, clipC > 3.6 ? 3.5 : -3.5);
  L.lcl.position.set(Math.min(X0 + 5.6, (M.cond ? xLcl : 0) - 3.2), Math.min(M.lcl, 20000) * VS, PATH_Z);
  L.pass.position.set(0, P.hc * VS + OFFY + 1.0, PATH_Z);
  L.stLuv.position.set(X_LUVORT, ground(X_LUVORT, ORT_Z) * VS + 1.15, ORT_Z);
  L.stLee.position.set(X_LEEORT, ground(X_LEEORT, ORT_Z) * VS + 1.15, ORT_Z);
  L.cloud.position.set(xLcl * 0.45, cloudTop(xLcl * 0.45, -5) * VS + 0.3, -5);
  L.rain.position.set(xLcl - 4.4, (M.lcl - 420) * VS, -5.4);
}
function updateLabels() {
  const V = vis(), lab = S.showLabels;
  setVis(L.luv, lab); setVis(L.lee, lab); setVis(L.wind, lab && !compact);
  const lclInView = M.lcl <= wallTop();                 // sehr trockene Luft: Kondensationsniveau weit über dem Bild
  lclGroup.visible = V.lcl && lclInView;
  setVis(L.lcl, V.lcl && lab && lclInView);
  L.lcl.element.textContent = 'Kondensationsniveau' + (S.showNum ? ' · ' + fmtM(M.lcl) : '') + (M.cond ? '' : M.atPass ? ' (am Pass)' : ' (nicht erreicht)');
  setVis(L.pass, lab);
  L.pass.element.textContent = 'Pass' + (S.showNum ? ' · ' + fmtM(P.hc) : '');
  setVis(L.cloud, lab && V.cloud && !compact);
  setVis(L.rain, lab && V.precip && !compact);
  setVis(L.stLuv, lab && !compact); setVis(L.stLee, lab && !compact);   // auf dem Handy stehen die Werte in der Messleiste
  L.stLuv.element.innerHTML = `<b>Luv-Tal<span class="num"> · ${fmtM(H0)}</span></b><span class="num">${fmtT(M.t0)}</span><span class="num">rel. Feuchte ${rhTxt(M.rh0)}</span>`;
  L.stLee.element.className = 'lbl lbl-st' + (V.kLee && M.dT > 0.05 ? ' hot' : '');
  L.stLee.element.innerHTML = `<b>Lee-Tal<span class="num"> · ${fmtM(H1)}</span></b>` + (V.leeReached ? `<span class="num">${V.hideLee ? '? °C' : fmtT(M.t1)}</span><span class="num">rel. Feuchte ${V.hideLee ? '? %' : rhTxt(M.rh1)}</span>` : '');
  wallGroup.visible = S.showScale;
  wallLabels.forEach(l => setVis(l, S.showScale && !compact));
  faceLabels.forEach(l => setVis(l, S.showScale && !compact && !camAnim));
  skirtU.uLines.value = S.showScale ? 1 : 0;
}
// Überdeckte Etiketten ausblenden. Vorrang haben feste Anzeigen und das Luftpaket.
const pv = new THREE.Vector3();
function parcelScreen() {
  pv.copy(parcel.position).project(camera);
  const w = vp.clientWidth, h = vp.clientHeight;
  const dist = camera.position.distanceTo(parcel.position);
  const r = 0.46 * parcel.scale.x * (h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) / dist;
  return { x: (pv.x * 0.5 + 0.5) * w, y: (-pv.y * 0.5 + 0.5) * h, r };
}
function declutter() {
  const vr = vp.getBoundingClientRect(), taken = [];
  for (const el of vp.querySelectorAll('.meter, .rule, .hud-bl, .hud-br')) { const r = el.getBoundingClientRect(); if (r.width) taken.push(r); }
  const ps = parcelScreen();
  taken.push({ left: vr.left + ps.x - ps.r, right: vr.left + ps.x + ps.r, top: vr.top + ps.y - ps.r, bottom: vr.top + ps.y + ps.r });
  const order = [L.stLuv, L.stLee, L.pass, L.lcl, L.luv, L.lee, L.cloud, L.rain, L.wind, ...faceLabels, ...wallLabels];
  for (const o of order) {
    if (!o.userData.want) continue;
    const el = o.element, r = el.getBoundingClientRect();
    if (!r.width) continue;
    const pad = 4;
    const inside = r.right > vr.left && r.left < vr.right && r.bottom > vr.top && r.top < vr.bottom;
    const hit = taken.some(t => r.left < t.right + pad && r.right > t.left - pad && r.top < t.bottom + pad && r.bottom > t.top - pad);
    el.style.opacity = hit || !inside ? 0 : 1;
    if (!hit && inside) taken.push(r);
  }
}

// ================= Feste Messanzeige =================
const cache = {};
function setTxt(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } }
function setStyle(id, prop, v) { const k = id + prop; if (cache[k] !== v) { cache[k] = v; $(id).style[prop] = v; } }
function stateText(x, st) {
  if (x < FOOT - 0.05) return 'strömt an';
  if (x < -0.12) return st.sat ? 'steigt auf · gesättigt' : 'steigt auf · ungesättigt';
  if (x <= 0.12) return 'am Pass';
  if (x < X_LEEORT - 0.05) return 'sinkt ab · ungesättigt';
  return 'im Lee-Tal';
}
// Welche Regel gilt gerade? Hängt nur an der relativen Feuchte (unter 100 % oder 100 %) und an der Richtung
function ruleOf(x, st) {
  if (x > 0.02) return { k: 'lee', v: '+1 °C je 100 m', s: 'Abstieg · relative Feuchte unter 100 % (ungesättigt)' };
  if (st.sat && !(S.mode === 'learn' && S.chapter < 3)) return { k: 'wet',   // die neue Regel erst ab Abschnitt 3 nennen
    v: '−0,5 °C je 100 m', s: 'Aufstieg · relative Feuchte 100 % (gesättigt): Kondensation setzt Wärme frei' };
  return { k: 'dry', v: '−1 °C je 100 m', s: 'Aufstieg · relative Feuchte unter 100 % (ungesättigt)' };
}
let lastRule = '';
function updateMeter(st, V) {
  const hidden = V.hideLee && S.px > 0.02;
  const ru = ruleOf(S.px, st), rel = $('rule');
  if (ru.k !== lastRule) {
    rel.className = 'rule num r-' + ru.k + (lastRule ? ' flash' : ''); lastRule = ru.k;
    $('ruleV').textContent = ru.v; $('ruleS').textContent = ru.s;
  }
  setTxt('mState', stateText(S.px, st));
  setTxt('mH', fmtM(st.h));
  setTxt('mT', hidden ? '?' + NNBSP + '°C' : fmtT(st.T));
  setTxt('mRH', hidden ? '?' + NNBSP + '%' : rhTxt(st.rh));
  setTxt('mW', fmtW(st.w) + (compact ? '/kg' : ' je kg'));
  setStyle('mRHb', 'width', (hidden ? 0 : st.rh).toFixed(1) + '%');
  const f = Math.max(0, Math.min(1, st.w / M.w0));
  setStyle('mWb', 'width', (f * 100).toFixed(1) + '%');
  setStyle('mWr', 'width', ((1 - f) * 100).toFixed(1) + '%');
  setStyle('mWn', 'visibility', f < 0.995 ? 'visible' : 'hidden');
  setStyle('mDot', 'background', hidden ? HIDDEN_CSS : tempCss(st.T));
  setStyle('lgMark', 'display', hidden || !S.showNum ? 'none' : 'block');
  setStyle('lgMark', 'left', (Math.max(0, Math.min(1, (st.T - TMIN) / (TMAX - TMIN))) * 100).toFixed(1) + '%');
  // außerhalb der Skala: eigene Farbe (violett) und Hinweis statt Markierung am Rand
  const outS = !hidden && (st.T < TMIN || st.T > TMAX);
  setStyle('lgOut', 'display', outS ? 'inline' : 'none');
  if (outS) setTxt('lgOut', st.T < TMIN ? ' · unter −20 °C (violett)' : ' · über 40 °C');
}
function updateLead() {
  const lead = $('lead'), meter = $('meter');
  if (compact) { lead.style.display = 'none'; return; }
  const vr = vp.getBoundingClientRect(), mr = meter.getBoundingClientRect(), ps = parcelScreen();
  const m = { l: mr.left - vr.left, r: mr.right - vr.left, t: mr.top - vr.top, b: mr.bottom - vr.top };
  const ax = Math.min(Math.max(ps.x, m.l), m.r), ay = Math.min(Math.max(ps.y, m.t), m.b);
  const d = Math.hypot(ps.x - ax, ps.y - ay);
  if (d < ps.r + 6) { lead.style.display = 'none'; return; }
  lead.style.display = 'block';
  const ex = ps.x + (ax - ps.x) / d * (ps.r + 2), ey = ps.y + (ay - ps.y) / d * (ps.r + 2);
  const ln = $('leadLine'), dot = $('leadDot');
  ln.setAttribute('x1', ax.toFixed(1)); ln.setAttribute('y1', ay.toFixed(1)); ln.setAttribute('x2', ex.toFixed(1)); ln.setAttribute('y2', ey.toFixed(1));
  dot.setAttribute('cx', ex.toFixed(1)); dot.setAttribute('cy', ey.toFixed(1));
}

// ================= Abschnitte (Lernmodus) =================
const CH = [null,
  { name: 'Anströmung', q: 'Welche Luft kommt am Gebirge an?',
    text: () => 'Der Wind treibt feuchte Luft gegen das Gebirge. Die Seite, die dem Wind zugewandt ist, heißt <b>Luv</b>.',
    vals: () => [['', `Luv-Tal · ${fmtM(H0)}`, `${fmtT(M.t0)} · relative Feuchte ${rhTxt(M.rh0)}`], ['', 'Wasserdampf', `${fmtW(M.w0)} je kg Luft`]] },
  { name: 'Aufstieg', q: 'Warum wird die Luft beim Aufsteigen kälter?',
    text: () => 'Mit der Höhe sinkt der Luftdruck: Das Luftpaket dehnt sich aus und kühlt dabei ab. Der Wasserdampfgehalt bleibt gleich, die relative Feuchte steigt.',
    vals: arrived => {
      const v = [['rule', 'Regel für ungesättigte Luft (Schulnäherung)', '−1 °C je 100 m']];
      if (arrived) { const st = pathState(seg(2)[1]); v.push(['', `In ${fmtM(st.h)} Höhe`, `${fmtT(st.T)} · relative Feuchte ${rhTxt(st.rh)}`]); }
      return v;
    } },
  { name: 'Kondensation', q: 'Wann entstehen Wolken?',
    text: () => M.cond
      ? 'Bei 100 % relativer Feuchte ist die Luft <b>gesättigt</b>: Wasserdampf kondensiert zu Wolkentröpfchen. Dabei wird Wärme frei, deshalb kühlt die Luft ab hier langsamer ab.'
      : M.noVapor
        ? 'Bei 0 % relativer Feuchte enthält die Luft keinen Wasserdampf. Sie kann nie gesättigt werden: Es entstehen keine Stauwolke und kein Steigungsniederschlag.'
      : M.atPass
        ? 'Bei diesen Werten wird die Luft erst genau am Pass gesättigt. Unterhalb des Passes kondensiert kein Wasserdampf: Es entstehen keine Stauwolke und kein Steigungsniederschlag.'
        : 'Bei diesen Werten wird die Luft bis zum Pass nicht gesättigt. Es kondensiert kein Wasserdampf: Es entstehen keine Stauwolke und kein Steigungsniederschlag.',
    vals: () => M.cond
      ? [['', 'Kondensationsniveau (auf 100 m gerundet)', `${fmtM(M.lcl)} · ${fmtT(M.tl)}`], ['rule', 'Regel für gesättigte Luft (Schulnäherung)', '−0,5 °C je 100 m']]
      : [['', 'Kondensationsniveau (auf 100 m gerundet)', M.noVapor ? 'keines (kein Wasserdampf)' : `${fmtM(M.lcl)} – ${M.atPass ? 'genau am Pass' : 'über dem Pass (' + fmtM(P.hc) + ')'}`]] },
  { name: 'Weiterer Aufstieg', q: 'Was geschieht auf dem Weg zum Pass?',
    text: () => M.cond
      ? 'Die Luft steigt weiter, und immer mehr Wasserdampf kondensiert. Im Modell fällt dieses Kondensat sofort als Niederschlag aus; der übrige Wasserdampf bleibt in der Luft.'
      : 'Die Luft steigt ungesättigt weiter und kühlt um 1 °C je 100 m ab. Ihr Wasserdampfgehalt bleibt unverändert.',
    vals: arrived => !arrived ? [] : [
      ['', `Pass · ${fmtM(P.hc)}`, `${fmtT(M.tc)} · relative Feuchte ${rhTxt(M.rhc)}`],
      ['', 'Wasserdampf', M.cond ? `${fmtW(M.wc)} je kg Luft · ${fmtW(M.dw)} als Niederschlag entfernt` : `${fmtW(M.wc)} je kg Luft (unverändert)`]] },
  { name: 'Abstieg', q: 'Wie kommt die Luft im Lee-Tal an?',
    text: () => 'Im <b>Lee</b> sinkt die Luft ab: Der Luftdruck steigt, das Luftpaket wird zusammengedrückt und erwärmt sich. Der Wasserdampfgehalt bleibt gleich, deshalb sinkt die relative Feuchte.',
    vals: () => [['rule', 'Regel für ungesättigte Luft (Schulnäherung)', '+1 °C je 100 m']] },
];
const PRED = { k: 'kälter', g: 'gleich warm', w: 'wärmer' };
const MODEL_NOTE = '<p class="quote">Dieses Modell zeigt einen Mechanismus der Föhnerwärmung. In der Atmosphäre kann Föhn auch ohne Niederschlag im Luv auftreten.</p>';
function askBox() {
  return `<div class="ask"><p>Welche Temperatur erwartest du im Lee-Tal (${fmtM(H1)})?</p><div class="opts">
    <button data-pred="k">kälter als im Luv-Tal<span class="num"> (unter ${fmtT(M.t0)})</span></button>
    <button data-pred="g">gleich warm wie im Luv-Tal<span class="num"> (${fmtT(M.t0)})</span></button>
    <button data-pred="w">wärmer als im Luv-Tal<span class="num"> (über ${fmtT(M.t0)})</span></button></div></div>
    <p class="expl">Wähle deine Vorhersage. Danach sinkt das Luftpaket ins Lee-Tal. Ohne Vorhersage geht es mit „Abstieg starten“ weiter.</p>`;
}
function calcBox() {
  return `<div class="calc"><label for="calcIn">Berechne die Temperatur im Lee-Tal (${fmtM(H1)}).</label>
    <div class="row"><input id="calcIn" type="text" inputmode="decimal" autocomplete="off" aria-describedby="calcMsg"><span>°C</span>
    <button class="btn" data-act="check">Prüfen</button><button class="btn quiet" data-act="solve">Lösung zeigen</button></div>
    <p id="calcMsg" role="status"></p></div>`;
}
function cmpTable() {
  return `<table class="cmp num"><tr><th></th><th>Luv-Tal</th><th>Lee-Tal</th></tr>
    <tr><td>Höhe</td><td>${fmtM(H0)}</td><td>${fmtM(H1)}</td></tr>
    <tr><td>Temperatur</td><td>${fmtT(M.t0)}</td><td class="${M.dT > 0.05 ? 'hot' : ''}">${fmtT(M.t1)}</td></tr>
    <tr><td>relative Feuchte</td><td>${rhTxt(M.rh0)}</td><td>${rhTxt(M.rh1)}</td></tr>
    <tr><td>Wasserdampf je kg Luft</td><td>${fmtW(M.w0)}</td><td>${fmtW(M.wc)}</td></tr></table>`;
}
function resultText() {
  return M.cond
    ? `<p class="res">Auf gleicher Höhe kommt die Luft <b class="hot"><span class="num">${fmtT(M.dT)} </span>wärmer</b> und mit geringerer relativer Feuchte an. Im Luv kühlte sie oberhalb des Kondensationsniveaus nur um 0,5 °C je 100 m ab, im Lee erwärmt sie sich auf dem ganzen Weg um 1 °C je 100 m.</p>`
    : `<p class="res">Hier entsteht im Modell kein Temperaturüberschuss zwischen den beiden Tälern. Ohne Kondensation kühlt die Luft beim Aufstieg genauso stark ab, wie sie sich beim Abstieg erwärmt.</p>`;
}
function predText() {
  if (!S.pred) return '';
  const right = M.dT > 0.05 ? 'w' : 'g';
  return S.pred === right
    ? `<p class="pred ok">Deine Vorhersage „${PRED[S.pred]}“ stimmt.</p>`
    : `<p class="pred">Deine Vorhersage war „${PRED[S.pred]}“. In diesem Modell kommt die Luft ${right === 'w' ? 'wärmer' : 'gleich warm'} an.</p>`;
}
function expCard(V) {
  const hide = V.hideLee;
  const n1 = v => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1).replace('.', ',').replace('-', '−'), nM = h => fmtM(h).replace(/\u202fm$/, ''), nR = r => rhTxt(r).replace(/\u202f%$/, '');
  let rows = `<tr><td>Luv-Tal</td><td>${nM(H0)}</td><td>${n1(M.t0)}</td><td>${nR(M.rh0)}</td><td>${n1(M.w0)}</td></tr>`;
  rows += M.cond
    ? `<tr><td>Kondensations-<br>niveau</td><td>${nM(M.lcl)}</td><td>${n1(M.tl)}</td><td>100</td><td>${n1(M.w0)}</td></tr>`
    : `<tr><td>Kondensations-<br>niveau</td><td>${M.noVapor ? '–' : nM(M.lcl)}</td><td colspan="3" class="span">${M.noVapor ? 'keines: kein Wasserdampf' : M.atPass ? 'genau am Pass' : 'über dem Pass, nicht erreicht'}</td></tr>`;
  rows += `<tr><td>Pass</td><td>${nM(P.hc)}</td><td>${n1(M.tc)}</td><td>${nR(M.rhc)}</td><td>${n1(M.wc)}</td></tr>`;
  rows += `<tr><td>Lee-Tal</td><td>${nM(H1)}</td><td class="${!hide && M.dT > 0.05 ? 'hot' : ''}">${hide ? '?' : n1(M.t1)}</td><td>${hide ? '?' : nR(M.rh1)}</td><td>${n1(M.wc)}</td></tr>`;
  let txt;
  if (M.cond) txt = (M.lcl <= H0 ? `Die Luft ist schon im Luv-Tal gesättigt (100 % relative Feuchte).` : `Die Luft wird in ${fmtM(M.lcl)} Höhe gesättigt.`) + ` Bis zum Pass kondensieren ${fmtW(M.dw)} Wasserdampf je kg Luft; im Modell fallen sie sofort als Niederschlag aus.`
    + (hide ? '' : ` Im Lee-Tal kommt die Luft ${fmtT(M.dT)} wärmer und mit geringerer relativer Feuchte an.`);
  else txt = (M.noVapor ? `Bei 0 % relativer Feuchte enthält die Luft keinen Wasserdampf und wird nie gesättigt.` : M.atPass ? `Die Luft wird erst genau am Pass gesättigt.` : `Das Kondensationsniveau (${fmtM(M.lcl)}) liegt über dem Pass (${fmtM(P.hc)}): Die Luft bleibt ungesättigt.`)
    + ` Es entstehen keine Stauwolke und kein Steigungsniederschlag.` + (hide ? '' : ` Hier entsteht im Modell kein Temperaturüberschuss zwischen den beiden Tälern.`);
  return `<div class="kicker">Experimentieren</div><h2 class="q">Was geschieht bei diesen Werten?</h2>
    <table class="cmp exp num"><tr><th></th><th>Höhe<br>m</th><th>Tempe-<br>ratur °C</th><th>relative<br>Feuchte %</th><th>Wasser-<br>dampf g/kg</th></tr>${rows}</table>
    <p class="res">${txt}</p>${hide ? calcBox() : (M.cond ? '' : MODEL_NOTE)}`;
}
function renderCard() {
  const V = vis(), el = $('card');
  if (S.mode === 'exp') { el.innerHTML = expCard(V); return; }
  const k = S.chapter, ch = CH[k], arrived = S.phase === 'hold';
  let h = `<div class="kicker">Abschnitt <b>${k}</b> von 5 · ${ch.name}</div><h2 class="q">${ch.q}</h2>`;
  if (k === 5 && S.phase === 'ask') h += askBox();
  else {
    h += `<p class="expl">${ch.text()}</p>`;
    const vals = ch.vals(arrived);
    if (vals.length) h += `<ul class="vals num">` + vals.map(([cls, lab, val]) => `<li class="${cls}"><span>${lab}</span><b>${val}</b></li>`).join('') + `</ul>`;
    if (k === 5 && arrived) h += V.hideLee ? calcBox() : cmpTable() + resultText() + predText() + MODEL_NOTE + `<button class="linkbtn" data-act="limits">Welche Grenzen hat dieses Modell?</button>`;
  }
  el.innerHTML = h;
}
$('card').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.pred) { S.pred = b.dataset.pred; S.phase = 'run'; setPlaying(true); refresh(); }
  else if (b.dataset.act === 'check') checkCalc();
  else if (b.dataset.act === 'solve') { S.solved = true; refresh(); }
  else if (b.dataset.act === 'limits') { const d = $('limits'); d.open = true; d.scrollIntoView({ behavior: mqReduce.matches ? 'auto' : 'smooth', block: 'nearest' }); d.querySelector('summary').focus(); }
});
$('card').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'calcIn') checkCalc(); });
function checkCalc() {
  const inp = $('calcIn'), msg = $('calcMsg'); if (!inp) return;
  const v = parseFloat(inp.value.replace(',', '.').replace('−', '-'));
  if (!isFinite(v)) { msg.className = ''; msg.textContent = 'Gib eine Zahl ein, zum Beispiel 12,5.'; return; }
  if (Math.abs(v - M.t1) <= 0.25) { S.solved = true; refresh(); }
  else { msg.className = ''; msg.textContent = 'Noch nicht richtig. Rechne vom Pass aus: Höhenunterschied bis ins Tal, dann +1 °C je 100 m.'; }
}

// ================= Zustandswechsel =================
let cloudVis = 0, rainVis = 0;
// Alles Sichtbare sofort aus dem Zustand neu ableiten (auch Luftpaket und Messanzeige, nicht erst im nächsten Bild)
function refresh() { renderCard(); updateLabels(); updateStats(); updateChrome(); updateParcel(0, vis()); drawProfile(); }
function updateChrome() {
  const exp = S.mode === 'exp';
  $('chapters').hidden = exp; $('prevBtn').hidden = exp; $('nextBtn').hidden = exp;
  $('replayBtn').textContent = exp ? '↺ Von vorn' : '↺ Wiederholen';
  $('prevBtn').disabled = S.chapter === 1; $('nextBtn').disabled = S.chapter === 5;
  document.querySelectorAll('#chapters button').forEach((b, i) => {
    const k = i + 1;
    if (k === S.chapter) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    b.classList.toggle('done', k < S.chapter);
  });
  const pb = $('playBtn'), learn = !exp;
  const atHold = learn && S.phase === 'hold' && S.chapter < 5, atAsk = learn && S.phase === 'ask';
  pb.setAttribute('aria-pressed', S.playing && !atHold && !atAsk);
  pb.textContent = atAsk ? '▶ Abstieg starten' : atHold ? '▶ Weiter' : S.playing ? '❚❚ Pause' : '▶ Start';
  $('nextBtn').classList.toggle('cue', atHold);
  $('askOv').hidden = !atAsk;
  $('setupSum').textContent = exp ? 'Luftmasse und Gebirge' : 'Ausgangswerte ändern';
  $('derived').hidden = !exp;                       // im Lernmodus würde die Zeile das Kondensationsniveau vorwegnehmen
}
function setPlaying(v) { S.playing = v; updateChrome(); }
function enterChapter(k) {
  S.chapter = k;
  const [a, b] = seg(k);
  S.px = a; S.reveal = a; S.pred = null; S.hold = 0;
  S.phase = k === 5 ? 'ask' : (b - a < 1e-6 ? 'hold' : 'run');
  cloudVis = M.cond && k > 3 ? 1 : 0; rainVis = M.cond && k > 4 ? 1 : 0;     // definierter Ausgangszustand je Abschnitt
  for (let i = 0; i < ND; i++) dLife[i] = 0;
  refresh();
}
function setMode(m) {
  S.mode = m;
  document.querySelector(`input[name="mode"][value="${m}"]`).checked = true;
  $('setup').open = m === 'exp';
  if (m === 'learn') enterChapter(1);
  else { S.px = X_START; S.hold = 0; S.phase = 'run'; S.reveal = X_END; cloudVis = M.cond ? 1 : 0; rainVis = M.cond ? 1 : 0; refresh(); }
}
function replay() {
  if (S.mode === 'learn') enterChapter(S.chapter); else { S.px = X_START; S.hold = 0; }
  setPlaying(true);
}
{
  const ol = $('chapters');
  for (let k = 1; k <= 5; k++) {
    const li = document.createElement('li'), b = document.createElement('button');
    b.innerHTML = `<b>${k}</b><span>${CH[k].name}</span>`; b.setAttribute('aria-label', `Abschnitt ${k}: ${CH[k].name}`);
    b.onclick = () => enterChapter(k);
    li.appendChild(b); ol.appendChild(li);
  }
}
$('prevBtn').onclick = () => enterChapter(Math.max(1, S.chapter - 1));
$('nextBtn').onclick = () => enterChapter(Math.min(5, S.chapter + 1));
function playAction() {
  if (S.mode === 'learn' && S.phase === 'ask') { S.phase = 'run'; setPlaying(true); refresh(); return; }       // ohne Vorhersage weiter
  if (S.mode === 'learn' && S.phase === 'hold' && S.chapter < 5) { enterChapter(S.chapter + 1); setPlaying(true); return; }
  setPlaying(!S.playing);
}
$('playBtn').onclick = playAction;
$('askOv').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.pred) { S.pred = b.dataset.pred; S.phase = 'run'; setPlaying(true); refresh(); } });
$('replayBtn').onclick = replay;
document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', () => setMode(r.value)));
document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest && e.target.closest('input, button, summary, select, textarea, a')) return;
  if (e.key === ' ' || e.key === 'k') { e.preventDefault(); playAction(); }
  else if (e.key === 'r' || e.key === 'R') replay();
  else if (S.mode === 'learn') {
    if (e.key === 'ArrowRight') enterChapter(Math.min(5, S.chapter + 1));
    else if (e.key === 'ArrowLeft') enterChapter(Math.max(1, S.chapter - 1));
    else if (/^[1-5]$/.test(e.key)) enterChapter(+e.key);
  }
});

// ================= Regler und Schalter =================
let geoPending = false, lastHc = null;
function rebuildGeometry() {
  if (lastHc !== P.hc) { buildTerrain(); buildVillages(); lastHc = P.hc; }
  buildWall(); buildFlow(); placeFaceLabels(); placeLabels();
  for (let i = 0; i < NC; i++) seedCloud(i, true);
  for (let i = 0; i < NR; i++) seedRain(i);
  updateLabels();
}
function derivedText() {
  $('derived').innerHTML = M.noVapor ? 'Kondensationsniveau: <b>keines</b> – bei 0 % relativer Feuchte enthält die Luft keinen Wasserdampf.'
    : M.lcl <= H0 ? 'Kondensationsniveau: <b>im Luv-Tal</b> – die Luft ist schon bei 500 m gesättigt.'
    : `Kondensationsniveau: berechnet <b>${fmtM(M.lclExact)}</b>, für die Schulrechnung auf 100 m gerundet: <b>${fmtM(M.lcl)}</b>` + (M.cond ? '.' : M.atPass ? ' – genau am Pass.' : ' – über dem Pass.');
}
function onParams() {
  P.t0 = +$('t0').value; P.rh = +$('rh').value; P.hc = +$('hc').value;
  $('t0Out').textContent = P.t0 + NNBSP + '°C'; $('rhOut').textContent = P.rh + NNBSP + '%'; $('hcOut').textContent = fmtM(P.hc);
  M = computeModel(P);
  xLcl = M.cond ? xAtLuv(M.lcl) : 0; xMid = xAtLuv(H0 + 0.6 * (P.hc - H0));
  terrU.uSnowLuv.value = terrU.uSnowLee.value = snowLine();
  derivedText();
  S.solved = false;
  if (!geoPending) { geoPending = true; requestAnimationFrame(() => { geoPending = false; rebuildGeometry(); if (!userMoved && !camAnim) applyPose(viewPose(S.view)); }); }
  if (S.mode === 'learn') enterChapter(S.chapter);
  else { cloudVis = M.cond ? 1 : 0; rainVis = M.cond ? 1 : 0; refresh(); }
}
['t0', 'rh', 'hc'].forEach(id => $(id).addEventListener('input', onParams));
function setParams(o) { for (const k of ['t0', 'rh', 'hc']) if (k in o) $(k).value = o[k]; onParams(); }
$('resetBtn').onclick = () => setParams(DEF);
$('calcOn').onchange = e => { S.calc = e.target.checked; S.solved = false; refresh(); };
$('numOn').onchange = e => { S.showNum = e.target.checked; $('app').classList.toggle('nonum', !S.showNum); refresh(); };
$('flowOn').onchange = e => { S.showFlow = e.target.checked; };
$('scaleOn').onchange = e => { S.showScale = e.target.checked; $('hypLegend').hidden = !S.showScale; updateLabels(); drawProfile(); };
$('labelsOn').onchange = e => { S.showLabels = e.target.checked; updateLabels(); };
document.querySelectorAll('input[name="spd"]').forEach(r => r.addEventListener('change', () => { S.speed = +r.value; }));
if (mqReduce.matches) document.querySelector('input[name="spd"][value="0.5"]').checked = true;

// Zeile über dem Querschnitt
function updateStats() {
  const V = vis();
  let h = `<span>Luv-Tal <b>${fmtT(M.t0)}</b> · relative Feuchte <b>${rhTxt(M.rh0)}</b></span>`;
  if (V.kLcl) h += `<span>Kondensationsniveau <b>${fmtM(M.lcl)}</b></span>`;
  if (V.kPass) h += `<span>Pass <b>${fmtT(M.tc)}</b></span>`;
  if (V.leeReached) h += V.hideLee ? `<span>Lee-Tal <b>? °C</b> · relative Feuchte <b>? %</b></span>`
    : `<span>Lee-Tal <b class="${M.dT > 0.05 ? 'hot' : ''}">${fmtT(M.t1)}</b> · relative Feuchte <b>${rhTxt(M.rh1)}</b></span><span>Unterschied <b class="${M.dT > 0.05 ? 'hot' : ''}">${fmtTs(M.dT)}</b></span>`;
  $('stats').innerHTML = h;
}

// ================= Querschnitt (2D), aus demselben Zustand wie das 3D-Bild =================
const prof = $('prof'), pctx = prof.getContext('2d');
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function drawProfile() {
  const V = vis();
  const dpr = Math.min(devicePixelRatio, 2);
  const W = prof.clientWidth, H = Math.round(W < 640 ? Math.max(320, W * 1.0) : Math.max(250, Math.min(340, W * 0.27)));
  if (!W) return;
  const hpx = H + 'px'; if (prof.style.height !== hpx) prof.style.height = hpx;   // nur bei Änderung setzen
  if (prof.width !== Math.round(W * dpr) || prof.height !== Math.round(H * dpr)) { prof.width = Math.round(W * dpr); prof.height = Math.round(H * dpr); }
  const g = pctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const ink = cssVar('--ink'), muted = cssVar('--muted'), line = cssVar('--line'), grid = cssVar('--grid'), lclC = cssVar('--lcl'), earth = cssVar('--earth'), earthD = cssVar('--earth-deep'), surface = cssVar('--surface');
  const fUI = cssVar('--font'), fMono = cssVar('--mono');
  const ml = W < 520 ? 52 : 58, mr = 12, mt = 16, mb = 22;
  const top = Math.max(4000, Math.ceil((P.hc + 1300) / 500) * 500);
  const xs = x => ml + (x - X0) / (X1 - X0) * (W - ml - mr);
  const ys = h => mt + (1 - h / top) * (H - mt - mb);
  const small = W < 640, num = S.showNum;
  g.font = `${W < 520 ? 10 : 11}px ${fMono}`;
  // Raster
  g.strokeStyle = grid; g.lineWidth = 1; g.fillStyle = muted; g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let h = 0; h <= top; h += 500) { g.beginPath(); g.moveTo(ml, ys(h) + .5); g.lineTo(W - mr, ys(h) + .5); g.stroke(); if (h % 1000 === 0) g.fillText(h === 0 ? '0 m' : fmtM(h), ml - 6, ys(h)); }
  // Stauwolke
  if (V.cloud) {
    g.save(); g.fillStyle = 'rgba(150,162,178,.38)';
    g.beginPath();
    const xa = xLcl - 3.8, ppm = (H - mt - mb) / top;
    for (let x = xa; x <= 1.4; x += 0.45) {
      const base = Math.max(M.lcl, groundC(x));
      let topH = Math.max(M.lcl + 350, groundC(x) + 700 + 500 * ridgeF(x));
      if (x > 0) topH -= x / 2.3 * 1100;
      if (topH <= base + 80) continue;
      const r = Math.max(6, (topH - base) * ppm * 0.5), cx = xs(x), cy = ys((base + topH) / 2);
      g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, Math.PI * 2);
      const r2 = r * 0.7; g.moveTo(cx + 0.2 * r + r2, cy - 0.5 * r); g.arc(cx + 0.2 * r, cy - 0.5 * r, r2, 0, Math.PI * 2);
    }
    g.fill(); g.restore();
  }
  // Gelände
  g.beginPath(); g.moveTo(xs(X0), ys(0));
  for (let i = 0; i <= 300; i++) { const x = X0 + (X1 - X0) * i / 300; g.lineTo(xs(x), ys(groundC(x))); }
  g.lineTo(xs(X1), ys(0)); g.closePath();
  if (S.showScale) {                                 // Höhenschichten wie am Schnitt im 3D-Bild
    g.save(); g.clip();
    for (let i = 0; i < HYP.length; i++) { const h0 = HYP[i][0], h1 = i + 1 < HYP.length ? HYP[i + 1][0] : top + 500; g.fillStyle = HYP[i][1]; g.fillRect(ml, ys(h1), W - ml - mr, ys(h0) - ys(h1) + 0.5); }
    g.restore();
  } else { const eg = g.createLinearGradient(0, ys(P.hc), 0, ys(0)); eg.addColorStop(0, earth); eg.addColorStop(1, earthD); g.fillStyle = eg; g.fill(); }
  g.strokeStyle = ink; g.lineWidth = 1.2; g.beginPath();
  for (let i = 0; i <= 300; i++) { const x = X0 + (X1 - X0) * i / 300; i ? g.lineTo(xs(x), ys(groundC(x))) : g.moveTo(xs(x), ys(groundC(x))); }
  g.stroke();
  // Niederschlag im Modell: Tropfen über 0 °C, Flocken darunter
  if (V.precip) {
    g.save(); g.strokeStyle = '#4E7DB8'; g.fillStyle = surface; g.lineWidth = 1;
    for (let x = xLcl - 3.4; x < -0.6; x += 0.4) {
      const h0 = Math.max(M.lcl, groundC(x)), x2 = x - 0.12;
      if (Tluv(M, h0) < 0) { g.beginPath(); g.arc(xs(x), ys(h0) + 8, 2, 0, Math.PI * 2); g.fill(); g.stroke(); continue; }
      g.beginPath(); g.moveTo(xs(x), ys(h0) + 4); g.lineTo(xs(x2), Math.min(ys(groundC(x2)) - 3, ys(h0) + 30)); g.stroke();
    }
    g.restore();
  }
  // Kondensationsniveau
  if (V.lcl && M.lcl < top) {
    g.save(); g.strokeStyle = lclC; g.setLineDash([6, 4]); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(xs(X0), ys(M.lcl)); g.lineTo(xs(M.cond ? xLcl : 0.6), ys(M.lcl)); g.stroke(); g.restore();
  }
  // Weg des Luftpakets: zurückgelegter Teil kräftig, Farbe = Temperatur (nur soweit schon bekannt)
  const reach = V.exp ? X_END : S.reveal;
  for (let i = 0; i < 300; i++) {
    const xa = X_START + (X_END - X_START) * i / 300, xb = X_START + (X_END - X_START) * (i + 1) / 300;
    const on = xa < reach, colored = xa < V.colorLim;
    g.strokeStyle = colored ? tempCss(pathState(xa).T) : (on ? GREY_CSS : line); g.lineWidth = on ? 4 : 2;
    g.beginPath(); g.moveTo(xs(xa), ys(groundC(xa)) - 9); g.lineTo(xs(xb), ys(groundC(xb)) - 9); g.stroke();
  }
  // gesättigter Abschnitt (100 % rel. Feuchte) als zweite Linie unter dem Weg
  if (M.cond && Math.min(reach, 0) > xLcl) {
    g.save(); g.strokeStyle = '#0E7C7B'; g.lineWidth = 2; g.setLineDash([5, 3]); g.beginPath();
    for (let x = xLcl; x <= Math.min(reach, 0); x += 0.05) { const y = ys(groundC(x)) - 3; x === xLcl ? g.moveTo(xs(x), y) : g.lineTo(xs(x), y); }
    g.stroke(); g.restore();
  }
  // Luftpaket
  const PX = xs(S.px), PY = ys(groundC(S.px)) - 9;
  g.fillStyle = V.hideLee && S.px > 0.02 ? HIDDEN_CSS : tempCss(pathState(S.px).T); g.strokeStyle = ink; g.lineWidth = 2;
  g.beginPath(); g.arc(PX, PY, 7, 0, Math.PI * 2); g.fill(); g.stroke();

  // ---------- Beschriftungen mit einfacher Kollisionsprüfung ----------
  const boxes = []; drawProfile.boxes = boxes;
  const hits = r => boxes.some(o => r.x < o.x + o.w + 3 && r.x + r.w > o.x - 3 && r.y < o.y + o.h + 3 && r.y + r.h > o.y - 3);
  const inside = r => r.x >= ml + 2 && r.x + r.w <= W - mr - 2 && r.y >= mt - 6 && r.y + r.h <= H - 2;
  g.fillStyle = muted; g.font = `700 ${small ? 11 : 13}px ${fUI}`; g.textBaseline = 'top'; g.textAlign = 'center';
  const head = (txt, x) => { const w = g.measureText(txt).width; g.fillText(txt, xs(x), ys(top) + 2); boxes.push({ t: 'head', x: xs(x) - w / 2, y: ys(top) + 2, w, h: 16 }); };
  head('LUV', -7.5); head('LEE', 7);
  // Regeln: im Inneren des Berges, unter dem jeweiligen Hangstück
  const rates = $('rates');
  rates.hidden = !(small && num && V.rateDry);
  if (!rates.hidden) rates.innerHTML = `<b>Unter 100 % rel. Feuchte:</b> −1 °C je 100 m` + (V.rateWet ? ` (bis ${fmtM(M.lcl)}) · <b>bei 100 %:</b> −0,5 °C je 100 m` : '') + (V.rateLee ? ` · <b>Abstieg:</b> +1 °C je 100 m` : '');
  const tag = (x, txt, sub, col) => {
    g.font = `700 12px ${fUI}`; const w1 = g.measureText(txt).width; g.font = `11px ${fUI}`; const w2 = g.measureText(sub).width;
    const w = Math.max(w1, w2) + 14, h = 34;
    const yTop = ys(groundC(x)), yBot = ys(0);
    let cy0 = Math.max(yTop + 16 + h / 2, (yTop + yBot) / 2 - 6);
    cy0 = Math.min(cy0, yBot - h / 2 - 3);
    // freien Platz suchen: erst an der Stelle, dann seitlich, dann tiefer
    let r = null, cy = cy0, cxs = xs(x);
    for (const [dx, dy] of [[0, 0], [-w * 0.6, 0], [w * 0.6, 0], [0, h + 4], [-w * 0.6, h + 4], [w * 0.6, h + 4], [-w * 1.1, 0], [w * 1.1, 0]]) {
      const c2 = Math.min(cy0 + dy, yBot - h / 2 - 3), x2 = Math.min(W - mr - w / 2 - 2, Math.max(ml + w / 2 + 2, xs(x) + dx));
      const cand = { t: 'tag', x: x2 - w / 2, y: c2 - h / 2, w, h };
      if (!hits(cand)) { r = cand; cy = c2; cxs = x2; break; }
    }
    if (!r) return;                                   // kein Platz: die Regel steht auch in der Karte und in der Leiste oben
    g.fillStyle = surface; g.strokeStyle = col; g.lineWidth = 1.2;
    g.beginPath(); g.roundRect(r.x, r.y, w, h, 4); g.fill(); g.stroke();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 12px ${fUI}`; g.fillText(txt, cxs, cy - 7);
    g.font = `11px ${fUI}`; g.fillStyle = muted; g.fillText(sub, cxs, cy + 8);
    boxes.push(r);
  };
  if (num && !small) {
    if (M.cond) {
      if (V.rateDry) tag(Math.max(-L_LUV + 2.6, (-L_LUV + xLcl) / 2 + 1.2), '−1 °C / 100 m', 'rel. Feuchte unter 100 %', '#2F6DB5');
      if (V.rateWet) tag(xLcl / 2 + 0.2, '−0,5 °C / 100 m', 'rel. Feuchte 100 %', '#0E7C7B');
    } else if (V.rateDry) tag(-L_LUV / 2, '−1 °C / 100 m', 'rel. Feuchte unter 100 %', '#2F6DB5');
    if (V.rateLee) tag(L_LEE / 2, '+1 °C / 100 m', 'rel. Feuchte unter 100 %', '#B23A24');
  }
  // Text am Kondensationsniveau (entfällt, sobald dort ein Wertekasten steht)
  if (V.lcl && M.lcl < top && !(V.kLcl && num)) {
    g.font = `12px ${fUI}`;
    const nm = small ? 'Kond.-niveau' : 'Kondensationsniveau';
    const txt = nm + (num ? ' ' + fmtM(M.lcl) : '') + (M.cond ? '' : M.atPass ? ' (am Pass)' : ' (nicht erreicht)');
    const w = g.measureText(txt).width;
    const r = { t: 'lcl', x: xs(X0) + 4, y: ys(M.lcl) - 18, w, h: 15 };
    g.fillStyle = lclC; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(txt, r.x, ys(M.lcl) - 3);
    boxes.push(r);
  }
  // Punkte am Weg; die Wertekästen suchen sich einen freien Platz
  const keys = [];
  if (V.kPass) keys.push({ x: 0, h: P.hc, t: M.tc, name: 'Pass', show: true, col: lclC });
  if (V.kLcl) keys.push({ x: xLcl, h: M.lcl, t: M.tl, name: small ? 'Kond.-niveau' : 'Kondensationsniveau', show: true, col: lclC });
  keys.push({ x: X_LUVORT, h: H0, t: M.t0, name: 'Luv-Tal', show: true, col: ink });
  if (V.leeReached) keys.push({ x: X_LEEORT, h: H1, t: M.t1, name: 'Lee-Tal', show: !V.hideLee, col: V.hideLee || M.dT <= 0.05 ? ink : cssVar('--warm') });
  for (const k of keys) {
    const X = xs(k.x), Y = ys(k.h) - 9;
    g.fillStyle = surface; g.strokeStyle = ink; g.lineWidth = 2;
    g.beginPath(); g.arc(X, Y, 4.5, 0, Math.PI * 2); g.fill(); g.stroke();
    boxes.push({ t: 'dot', x: X - 6, y: Y - 6, w: 12, h: 12 });
  }
  boxes.push({ t: 'parcel', x: PX - 8, y: PY - 8, w: 16, h: 16 });
  if (num) for (const k of keys) {
    const X = xs(k.x), Y = ys(k.h) - 9;
    const tt = k.show ? fmtT(k.t) : '? °C', nn = `${k.name} · ${fmtM(k.h)}`;
    const tf = `700 ${small ? 12 : 14}px ${fMono}`, nf = `${small ? 10 : 11}px ${fUI}`;
    g.font = tf; const w1 = g.measureText(tt).width; g.font = nf; const w2 = g.measureText(nn).width;
    const w = Math.max(w1, w2) + 12, h = small ? 30 : 34;
    const valley = Math.abs(k.h - H0) < 1, side = k.x < 0 ? 1 : -1;
    const CAND = valley
      ? [[side * (w / 2 + 8), -h / 2 - 6], [side * (w / 2 + 8), -h / 2 - 30], [0, -h / 2 - 14], [-side * (w / 2 + 8), -h / 2 - 6], [side * (w / 2 + 8), -h / 2 - 56]]
      : [[0, -h / 2 - 12], [-(w / 2 + 10), -h / 2 - 8], [w / 2 + 10, -h / 2 - 8], [0, -h / 2 - 40], [-(w / 2 + 14), -h / 2 - 36], [w / 2 + 14, -h / 2 - 36], [0, -h / 2 - 68]];
    let best = null;
    for (const [dx, dy] of CAND) {
      const r = { x: X + dx - w / 2, y: Y + dy - h / 2, w, h };
      if (inside(r) && !hits(r)) { best = r; break; }
    }
    // Kein Kandidat frei: systematisch nach oben und zur Seite weitersuchen
    for (let up = 24; up <= 190 && !best; up += 12) for (const dx of [0, -(w / 2 + 12), w / 2 + 12, -(w + 24), w + 24]) {
      const r = { x: X + dx - w / 2, y: Y - up - h, w, h };
      if (inside(r) && !hits(r)) { best = r; break; }
    }
    if (!best) { const [dx, dy] = CAND[0]; best = { x: Math.min(W - mr - w, Math.max(ml, X + dx - w / 2)), y: Math.max(mt - 6, Y + dy - h / 2), w, h }; }
    best.t = 'key'; boxes.push(best);
    const bx = Math.min(Math.max(X, best.x), best.x + w), by = Math.min(Math.max(Y, best.y), best.y + h);
    if (Math.hypot(bx - X, by - Y) > 10) { g.strokeStyle = muted; g.lineWidth = 1; g.beginPath(); g.moveTo(X, Y); g.lineTo(bx, by); g.stroke(); }
    g.fillStyle = surface; g.globalAlpha = 0.94; g.strokeStyle = line; g.lineWidth = 1;
    g.beginPath(); g.roundRect(best.x, best.y, w, h, 4); g.fill(); g.globalAlpha = 1; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const cx = best.x + w / 2;
    g.font = tf; g.fillStyle = k.col; g.fillText(tt, cx, best.y + (small ? 14 : 16));
    g.font = nf; g.fillStyle = muted; g.fillText(nn, cx, best.y + h - 5);
  }
}

// ================= Animation =================
const clock = new THREE.Clock();
let profAcc = 0, declAcc = 0;
function updateParcel(dt, V) {
  if (S.playing) {
    if (S.mode === 'exp') {
      if (S.hold > 0) { S.hold -= dt; if (S.hold <= 0) S.px = X_START; }
      else { S.px += dt * 1.15 * speedAt(S.px, 0.05); if (S.px >= X_LEEORT + 1.6) { S.px = X_LEEORT + 1.6; S.hold = 1.6; } }
    } else if (S.phase === 'run') {
      const b = seg(S.chapter)[1];
      S.px += dt * 0.8 * speedAt(S.px, 0.05) * (S.chapter === 3 ? 0.3 : 1);
      if (S.px >= b) { S.px = b; S.reveal = Math.max(S.reveal, b); S.phase = 'hold'; refresh(); }   // Halt am Lernpunkt
      else S.reveal = Math.max(S.reveal, S.px);
    }
  }
  const st = pathState(S.px), hidden = V.hideLee && S.px > 0.02;
  const sc = 1 + 0.4 * Math.min(1.5, (st.h - H0) / 2500);                  // Ausdehnung nur schematisch
  parcel.scale.setScalar(sc);
  parcel.position.set(S.px, parcelY(S.px, sc), PATH_Z);                     // liegt auf dem Weg, nie im Gelände
  if (hidden) parcelMat.color.copy(HIDDEN); else tempColor(st.T, parcelMat.color);       // im Rechenmodus neutral hell, gut sichtbar
  parcelMat.emissive.copy(parcelMat.color).multiplyScalar(0.28);                          // Farbe bleibt mit der Skala vergleichbar
  haloMat.opacity += ((st.sat ? 0.42 : 0) - haloMat.opacity) * Math.min(1, dt * 5 + 0.05);
  updateMeter(st, V);
  return st;
}
let lastW = 0, lastH = 0;
function resize() {
  const w = vp.clientWidth, h = vp.clientHeight;
  if (!w || !h || (w === lastW && h === lastH)) return;            // nur bei echter Größenänderung
  lastW = w; lastH = h;
  renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
  labelR.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const was = compact; compact = w < 620;
  vp.classList.toggle('narrow', w < 800);
  if (!userMoved && !camAnim) applyPose(viewPose(S.view)); else if (was !== compact) updateLabels();
  drawProfile();
}
// Größenänderungen erst im nächsten Bild verarbeiten. So lösen die Anpassungen (Profilhöhe, Klassen)
// keine neue Meldung im selben Durchgang aus („ResizeObserver loop …“, z. B. im Seitenfenster der Claude-App).
let rzPending = false, profW = 0;
function scheduleResize() { if (rzPending) return; rzPending = true; requestAnimationFrame(() => { rzPending = false; resize(); }); }
new ResizeObserver(scheduleResize).observe(vp);
new ResizeObserver(entries => {
  const w = Math.round(entries[0].contentRect.width);
  if (w !== profW) { profW = w; requestAnimationFrame(drawProfile); }
}).observe(prof.parentElement);                                    // die Breite des Rahmens beobachten, nicht die Zeichenfläche selbst
// Diese Browsermeldung ist harmlos; sie soll die Seite nicht als fehlerhaft melden
window.addEventListener('error', e => { if (/ResizeObserver loop/.test(e.message || '')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
const mqDark = matchMedia('(prefers-color-scheme: dark)');
function themeWall() { wallPlane.material.opacity = mqDark.matches ? 0.06 : 0.28; wallLines.material.opacity = mqDark.matches ? 0.35 : 0.55; drawProfile(); }
mqDark.addEventListener('change', themeWall);

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  const adt = S.playing ? dt * S.speed : 0;
  if (camAnim) {
    camAnim.k += dt / camAnim.dur;
    const k = Math.min(1, camAnim.k), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(camAnim.p0, camAnim.p1, e); controls.target.lerpVectors(camAnim.t0, camAnim.t1, e);
    // Bildausschnitt gleichmäßig überblenden: der Öffnungswinkel folgt aus Entfernung und Bildhöhe
    const hh = camAnim.h0 + (camAnim.h1 - camAnim.h0) * e, d = camera.position.distanceTo(controls.target);
    camera.fov = k >= 1 ? camAnim.f1 : THREE.MathUtils.radToDeg(2 * Math.atan(hh / d)); camera.updateProjectionMatrix();
    setClip(camAnim.c0 + (camAnim.c1 - camAnim.c0) * e);
    if (k >= 1) { camAnim = null; placeFaceLabels(); placeLabels(); updateLabels(); }
  }
  controls.update();
  const V = vis();
  limitU.value = V.colorLim;
  cloudVis += ((V.cloud ? 1 : 0) - cloudVis) * Math.min(1, dt * 1.4);
  rainVis += ((V.precip ? 1 : 0) - rainVis) * Math.min(1, dt * 1.6);
  cloudMat.uniforms.vis.value = cloudVis;
  cloudMat.uniforms.scale.value = vp.clientHeight * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  rainMat.opacity = rainVis * 0.85; snowMat.opacity = rainVis; rain.visible = snowM.visible = rainVis > 0.01;
  // Vordere Bahnen und Pfeil verschwinden, wenn der Block aufgeschnitten wird
  frontFade = THREE.MathUtils.smoothstep(clipC, 2, 7);
  laneMatFront.uniforms.uOpacity.value = 0.55 * frontFade;
  lanes.visible = parts.visible = S.showFlow;
  for (const m of lanes.children) if (m.userData.front) m.visible = frontFade > 0.01;
  arrowFront.visible = clipC > 3.6;
  if (S.showFlow) updateParts(adt, V.colorLim);
  updateClouds(adt);
  if (rain.visible) updateRain(adt);
  const st = updateParcel(adt, V);
  const moving = S.playing && (S.mode === 'exp' ? S.hold <= 0 && S.px < 0 : S.phase === 'run');
  updateDrops(adt, moving && st.sat && V.precip);
  profAcc += dt; if (profAcc > 0.06) { profAcc = 0; drawProfile(); }
  renderer.render(scene, camera);
  labelR.render(scene, camera);
  updateLead();
  declAcc += dt; if (declAcc > 0.1) { declAcc = 0; declutter(); }
  requestAnimationFrame(tick);
}

// ================= Start =================
$('t0Out').textContent = P.t0 + NNBSP + '°C'; $('rhOut').textContent = P.rh + NNBSP + '%'; $('hcOut').textContent = fmtM(P.hc);
xLcl = M.cond ? xAtLuv(M.lcl) : 0; xMid = xAtLuv(H0 + 0.6 * (P.hc - H0));
terrU.uSnowLuv.value = terrU.uSnowLee.value = snowLine();
derivedText();
rebuildGeometry();
themeWall();
setMode('learn');
resize();
applyPose(viewPose('3d'));
tick();
// Für Prüfungen von außen
window.__foehn = { S, P, get M() { return M; }, vis, seg, pathState, enterChapter, setMode, setParams, setPlaying, setView, replay,
  get clipC() { return clipC; }, get camAnim() { return camAnim; }, get xLcl() { return xLcl; }, get profBoxes() { return drawProfile.boxes; },
  parcelInfo: x => { const sc = 1 + 0.4 * Math.min(1.5, (groundC(x) - H0) / 2500); return { x, y: parcelY(x, sc), r: 0.4 * sc }; },
  ground, VS, pathY, declutter, parcelScreen, probe: x => { S.px = x; updateParcel(0, vis()); camera.updateMatrixWorld(); return parcelScreen(); }, camera, controls, X_LEEORT, X_START, FOOT };
</script>
</body>
</html>
