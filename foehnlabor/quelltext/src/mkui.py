"""Erzeugt s3/ui.js aus der bisherigen Logik (src/c.js) durch gezielte, geprüfte Ersetzungen."""
import sys
S = sys.argv[1]
c = open(f'{S}/src/c.js', encoding='utf-8').read()
c = c[:c.index('</script>')]

def rep(old, new, n=1):
    global c
    assert c.count(old) == n, (c.count(old), old[:90])
    c = c.replace(old, new)

rep("let camAnim = null, compact = false;", "let camAnim = null, compact = false, narrow = false;")
rep("  setClip(pose.clip); placeFaceLabels(); placeLabels(); updateLabels();\n}", "  setClip(pose.clip); placeFaceLabels(); placeLabels(); updateLabels(); needsRender = true;\n}")
rep("  L.rain.position.set(xLcl - 4.4, (M.lcl - 420) * VS, -5.4);",
    "  { const xr = Math.max(xLcl, -10) * 0.5; L.rain.position.set(xr, ground(xr, 6.6) * VS + 0.8, 6.6); }")
rep("for (const el of vp.querySelectorAll('.meter, .rule, .hud-bl, .hud-br'))", "for (const el of document.querySelectorAll('#ui > .hud, #meter, #rule, #cap, #panel, #dock, #askOv'))")
rep("setStyle('mWn', 'visibility', f < 0.995 ? 'visible' : 'hidden');", "setStyle('mWn', 'visibility', f < 0.97 ? 'visible' : 'hidden');")

# Karte: Zusammenfassung des Experimentierens auch für den Untertitel merken
rep("  return `<div class=\"kicker\">Experimentieren</div><h2 class=\"q\">Was geschieht bei diesen Werten?</h2>",
    "  lastExpTxt = txt;\n  return `<div class=\"kicker\">Experimentieren</div><h2 class=\"q\">Was geschieht bei diesen Werten?</h2>")
rep("function renderCard() {", """let lastExpTxt = '';
// Untertitel unter dem Modell: ersetzt die Erklärkarte, wenn sie ausgeblendet ist (Vorführmodus)
function renderXbar(el) {
  if (el.dataset.kind !== 'exp') {
    el.dataset.kind = 'exp';
    const sl = (id, lab, min, max, step) => `<label class="xs"><span class="xl">${lab}</span><output id="x_${id}O"></output><input type="range" id="x_${id}" min="${min}" max="${max}" step="${step}" aria-label="${lab}"></label>`;
    el.innerHTML = `<div class="xrow">${sl('t0', 'Temperatur Luv-Tal', 5, 25, 1)}${sl('rh', 'relative Feuchte', 0, 100, 5)}${sl('hc', 'Passhöhe', 1500, 3500, 100)}</div><div class="xres num" id="x_res"></div>`;
    for (const id of ['t0', 'rh', 'hc']) el.querySelector('#x_' + id).addEventListener('input', e => setParams({ [id]: +e.target.value }));
  }
  for (const id of ['t0', 'rh', 'hc']) { const r = el.querySelector('#x_' + id); if (document.activeElement !== r) r.value = P[id]; }
  el.querySelector('#x_t0O').textContent = P.t0 + NNBSP + '°C'; el.querySelector('#x_rhO').textContent = P.rh + NNBSP + '%'; el.querySelector('#x_hcO').textContent = fmtM(P.hc);
  const hide = S.calc && !S.solved, q = '?';
  const chip = (k, v, cls = '') => `<span class="xc ${cls}"><span>${k}</span><b>${v}</b></span>`;
  let r = chip('Kondensationsniveau', M.noVapor ? 'keines' : fmtM(M.lcl) + (M.cond ? '' : ' (über dem Pass)'));
  r += chip('am Pass', fmtT(M.tc));
  r += chip('Lee-Tal', hide ? q : fmtT(M.t1) + ' · ' + rhTxt(M.rh1), !hide && M.dT > 0.05 ? 'hot' : '');
  r += chip(M.cond ? 'wärmer als im Luv-Tal' : 'Unterschied zum Luv-Tal', hide ? q : (M.cond ? fmtTs(M.dT) : 'keiner'), !hide && M.dT > 0.05 ? 'hot' : '');
  el.querySelector('#x_res').innerHTML = r;
}
function renderCap() {
  const el = $('cap'); el.hidden = S.panel; if (S.panel) return;
  const V = vis(); let h;
  el.classList.toggle('xmode', S.mode === 'exp');
  // Experimentieren ohne Erklärkarte: statt Fließtext drei Regler und die Ergebnisse als knappe Werte
  if (S.mode === 'exp') { renderXbar(el); return; }
  el.dataset.kind = 'learn';
  {
    const k = S.chapter, ch = CH[k], arrived = S.phase === 'hold';
    h = `<div class="step">Abschnitt ${k} von 5 · ${ch.name}</div><div class="capq">${ch.q}</div>`;
    if (!(k === 5 && S.phase === 'ask')) {
      h += `<p>${ch.text()}</p>`;
      if (k === 5 && arrived) h += `<div class="capres num">` + (V.hideLee ? 'Lee-Tal: ? °C – berechnet die Temperatur selbst.'
        : `Luv-Tal ${fmtT(M.t0)} · ${rhTxt(M.rh0)} → Lee-Tal <span class="${M.dT > 0.05 ? 'hot' : ''}">${fmtT(M.t1)} · ${rhTxt(M.rh1)}</span>` + (M.cond ? '' : ' · Hier entsteht im Modell kein Temperaturüberschuss zwischen den beiden Tälern.')) + `</div>`;
      else { const vals = ch.vals(arrived); if (vals.length) h += `<div class="capres num">` + vals.map(v => `${v[1]}: <b>${v[2]}</b>`).join(' · ') + `</div>`; }
    }
  }
  el.innerHTML = h;
}
function renderCard() {""")
# Die Vorhersagefrage steht im Bild nur, wenn die Erklärkarte ausgeblendet ist (sonst steht sie in der Karte)
rep("  $('askOv').hidden = !atAsk;", "  $('askOv').hidden = !atAsk || S.panel;")
rep("function refresh() { renderCard(); updateLabels(); updateStats(); updateChrome(); updateParcel(0, vis()); drawProfile(); }",
    "function refresh() { renderCard(); renderCap(); updateLabels(); updateStats(); updateChrome(); updateParcel(0, vis()); drawProfile(); needsRender = true; }")
rep("  pb.textContent = atAsk ? '▶ Abstieg starten' : atHold ? '▶ Weiter' : S.playing ? '❚❚ Pause' : '▶ Start';\n  $('nextBtn').classList.toggle('cue', atHold);",
    "  pb.textContent = atAsk ? '▶ Abstieg starten' : atHold ? '▶ Weiter' : S.playing ? '❚❚ Pause' : '▶ Start';\n  pb.classList.toggle('cue', atHold || atAsk);")
# Presenter-Tasten, Vollbild und Vorführmodus wirken auch, wenn gerade ein Knopf den Fokus hat (nur nicht in Eingabefeldern)
rep("  if (e.target.closest && e.target.closest('input, button, summary, select, textarea, a')) return;",
    """  const typing = e.target.closest && e.target.closest('input[type="text"], textarea, select');
  if (!typing) {
    if (e.key === 'PageDown') { e.preventDefault(); nextAction(); return; }
    if (e.key === 'PageUp') { e.preventDefault(); if (S.mode === 'learn') enterChapter(Math.max(1, S.chapter - 1)); return; }
    if (e.key === 'f' || e.key === 'F') { toggleFull(); return; }
    if (e.key === 'p' || e.key === 'P') { setPresent(!S.present); return; }
  }
  if (e.target.closest && e.target.closest('input, button, summary, select, textarea, a')) return;""")

# „Weiter“ für Presenter (Bild ab): läuft der Abschnitt noch, springt das Luftpaket an dessen Ende; sonst wie der Startknopf
rep("$('playBtn').onclick = playAction;", """function nextAction() {
  if (S.mode !== 'learn') { playAction(); return; }
  if (!S.playing) { setPlaying(true); return; }
  if (S.phase === 'run') { const b = seg(S.chapter)[1]; S.px = b; S.reveal = Math.max(S.reveal, b); S.phase = 'hold'; refresh(); return; }
  playAction();
}
$('playBtn').onclick = playAction;""")
# Gelände: beim Ziehen des Reglers erst nur die Form, kurz danach Schatten und Bodenbedeckung
rep("let geoPending = false, lastHc = null;", "let geoPending = false, lastHc = null, bakeT = 0;")
rep("  if (lastHc !== P.hc) { buildTerrain(); buildVillages(); lastHc = P.hc; }",
    """  if (lastHc !== P.hc) {
    const first = lastHc === null;
    buildTerrain(first); buildVillages(); lastHc = P.hc;
    if (!first) { clearTimeout(bakeT); bakeT = setTimeout(() => { updateLightData(); bakeTerrain(); needsRender = true; frSkip = 1.5; }, 170); }
  }""")
rep("    : `Kondensationsniveau: berechnet <b>${fmtM(M.lclExact)}</b>, für die Schulrechnung auf 100 m gerundet: <b>${fmtM(M.lcl)}</b>` + (M.cond ? '.' : M.atPass ? ' – genau am Pass.' : ' – über dem Pass.');",
    """    : `Taupunkt der Luft im Luv-Tal: <b>${fmtT(M.td0)}</b>. Abstand zur Temperatur: ${(M.t0 - M.td0).toFixed(1).replace('.', ',')} °C × 125 m = ${fmtM(M.lclExact - H0)} über dem Tal. Kondensationsniveau: berechnet <b>${fmtM(M.lclExact)}</b>, für die Schulrechnung auf 100 m gerundet <b>${fmtM(M.lcl)}</b>` + (M.cond ? '.' : M.atPass ? ' – genau am Pass.' : ' – über dem Pass.');""")
rep("terrU.uSnowLuv.value = terrU.uSnowLee.value = snowLine();", "terrU.uSnowLuv.value = zeroLuv(); terrU.uSnowLee.value = zeroLee();", 2)
rep("$('flowOn').onchange = e => { S.showFlow = e.target.checked; };", "$('flowOn').onchange = e => { S.showFlow = e.target.checked; needsRender = true; };")
rep("$('labelsOn').onchange = e => { S.showLabels = e.target.checked; updateLabels(); };", "$('labelsOn').onchange = e => { S.showLabels = e.target.checked; updateLabels(); needsRender = true; };")
rep("$('scaleOn').onchange = e => { S.showScale = e.target.checked; $('hypLegend').hidden = !S.showScale; updateLabels(); drawProfile(); };",
    "$('scaleOn').onchange = e => { S.showScale = e.target.checked; $('hypLegend').hidden = !S.showScale; updateLabels(); drawProfile(); needsRender = true; };")

# Profil: feste Farben der dunklen Oberfläche, niedrigere Zeichenfläche, Wolke und Niederschlag wie im 3D-Bild
rep("function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }",
    """const TH = { ink: '#EAF0F7', muted: '#9AA8BA', line: 'rgba(234,240,247,.3)', grid: 'rgba(234,240,247,.11)', lcl: '#7FB2F0', earth: '#8E7C60', earthD: '#5F5241',
  surface: '#0E141D', cold: '#7FB2F0', wet: '#4FD1C5', warm: '#FF9272',
  fUI: '"Atkinson Hyperlegible Next","Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif', fMono: '"Atkinson Hyperlegible Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace' };""")
rep("  const W = prof.clientWidth, H = Math.round(W < 640 ? Math.max(320, W * 1.0) : Math.max(250, Math.min(340, W * 0.27)));\n  if (!W) return;",
    "  if (!S.profile) return;\n  const W = prof.clientWidth, H = Math.round(W < 640 ? Math.max(230, Math.min(300, W * 0.62)) : Math.max(190, Math.min(250, W * 0.21)));\n  if (!W) return;")
rep("  const ink = cssVar('--ink'), muted = cssVar('--muted'), line = cssVar('--line'), grid = cssVar('--grid'), lclC = cssVar('--lcl'), earth = cssVar('--earth'), earthD = cssVar('--earth-deep'), surface = cssVar('--surface');\n  const fUI = cssVar('--font'), fMono = cssVar('--mono');",
    "  const { ink, muted, line, grid, lcl: lclC, earth, earthD, surface, fUI, fMono } = TH;")
rep("    g.save(); g.fillStyle = 'rgba(150,162,178,.38)';", "    g.save(); g.fillStyle = 'rgba(214,224,238,.30)';")
rep("    const xa = xLcl - 3.8, ppm = (H - mt - mb) / top;", "    const xa = xLcl - CLOUD_PRE + 0.5, ppm = (H - mt - mb) / top;")
rep("""    g.save(); g.strokeStyle = '#4E7DB8'; g.fillStyle = surface; g.lineWidth = 1;
    for (let x = xLcl - 3.4; x < -0.6; x += 0.4) {
      const h0 = Math.max(M.lcl, groundC(x)), x2 = x - 0.12;
      if (Tluv(M, h0) < 0) { g.beginPath(); g.arc(xs(x), ys(h0) + 8, 2, 0, Math.PI * 2); g.fill(); g.stroke(); continue; }
      g.beginPath(); g.moveTo(xs(x), ys(h0) + 4); g.lineTo(xs(x2), Math.min(ys(groundC(x2)) - 3, ys(h0) + 30)); g.stroke();
    }
    g.restore();""",
"""    // vom Kondensationsniveau bis zum Pass, wie im 3D-Bild
    g.save(); g.strokeStyle = '#9CC6F7'; g.fillStyle = '#FFFFFF'; g.lineWidth = 1.3;
    for (let x = RAIN_X0() + 0.2; x < RAIN_X1 - 0.2; x += 0.42) {
      const g0 = groundC(x);
      if (Tluv(M, g0 + 150) < 0) { for (const dh of [130, 290]) { g.beginPath(); g.arc(xs(x) + dh * 0.012, ys(g0 + dh) - 9, 1.7, 0, Math.PI * 2); g.fill(); } continue; }
      g.beginPath(); g.moveTo(xs(x), ys(g0 + 360) - 9); g.lineTo(xs(x) + 3, ys(g0 + 110) - 9); g.stroke();
    }
    g.restore();""")
rep("    g.save(); g.strokeStyle = '#0E7C7B'; g.lineWidth = 2; g.setLineDash([5, 3]); g.beginPath();", "    g.save(); g.strokeStyle = TH.wet; g.lineWidth = 2; g.setLineDash([5, 3]); g.beginPath();")
rep("'rel. Feuchte unter 100 %', '#2F6DB5');", "'rel. Feuchte unter 100 %', TH.cold);", 2)
rep("'rel. Feuchte 100 %', '#0E7C7B');", "'rel. Feuchte 100 %', TH.wet);")
rep("'rel. Feuchte unter 100 %', '#B23A24');", "'rel. Feuchte unter 100 %', TH.warm);")
rep("ink : cssVar('--warm') });", "ink : TH.warm });")
assert 'cssVar' not in c

# Luftpaket: weicher Schatten auf dem Boden (in Sonnenrichtung versetzt)
rep("  parcel.position.set(S.px, parcelY(S.px, sc), PATH_Z);                     // liegt auf dem Weg, nie im Gelände",
    """  parcel.position.set(S.px, parcelY(S.px, sc), PATH_Z);                     // liegt auf dem Weg, nie im Gelände
  { const up = parcel.position.y - groundC(S.px) * VS; terrU.uBlob.value.set(S.px - SUN.x / SUN.y * up, PATH_Z - SUN.z / SUN.y * up, 0.6 * sc); }""")
rep("  parcelMat.emissive.copy(parcelMat.color).multiplyScalar(0.28);", "  parcelMat.emissive.copy(parcelMat.color).multiplyScalar(0.22);")

# Größe, Raster-Klassen, Einpassen in das freie Feld
i = c.index("let lastW = 0, lastH = 0;\nfunction resize() {"); j = c.index("function tick() {")
c = c[:i] + r"""let lastW = 0, lastH = 0, lastSafe = '';
function resize() {
  const w = vp.clientWidth, h = vp.clientHeight;
  if (!w || !h) return;
  const app = $('app'), was = compact;
  compact = w < 620; narrow = w < 900;
  app.classList.toggle('compact', compact); app.classList.toggle('narrow', narrow);
  app.classList.toggle('midw', !narrow && w - (S.panel ? 23 * parseFloat(getComputedStyle(document.documentElement).fontSize) : 0) < 900);
  const sized = w !== lastW || h !== lastH;
  if (sized) {
    lastW = w; lastH = h;
    renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    labelR.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  // Das freie Feld (zwischen Messleiste, Erklärkarte und Abspielleiste) bestimmt den Bildausschnitt
  const sr = safeRect(), key = [sr.l, sr.r, sr.t, sr.b].map(Math.round).join(',');
  if (sized || key !== lastSafe) {
    const first = !lastSafe; lastSafe = key;
    if (!userMoved) { if (sized || first || mqReduce.matches || SOFT_GL) { camAnim = null; applyPose(viewPose(S.view)); } else flyTo(viewPose(S.view), 0.45); }
  }
  if (was !== compact) updateLabels();
  drawProfile(); needsRender = true;
}
// Größenänderungen erst im nächsten Bild verarbeiten. So lösen die Anpassungen (Profilhöhe, Klassen)
// keine neue Meldung im selben Durchgang aus („ResizeObserver loop …“, z. B. im Seitenfenster der Claude-App).
let rzPending = false, profW = 0;
function scheduleResize() { if (rzPending) return; rzPending = true; requestAnimationFrame(() => { rzPending = false; resize(); }); }
new ResizeObserver(scheduleResize).observe(vp);
new ResizeObserver(scheduleResize).observe($('free'));
new ResizeObserver(entries => {
  const w = Math.round(entries[0].contentRect.width);
  if (w !== profW) { profW = w; requestAnimationFrame(drawProfile); }
}).observe(prof.parentElement);                                    // die Breite des Rahmens beobachten, nicht die Zeichenfläche selbst
// Diese Browsermeldung ist harmlos; sie soll die Seite nicht als fehlerhaft melden
window.addEventListener('error', e => { if (/ResizeObserver loop/.test(e.message || '')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawProfile(); scheduleResize(); });

// ================= Vorführmodus, Vollbild, Erklärkarte, Profil =================
function toast(msg) { const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 8000); }
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function fsReq(el) {
  const f = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen;
  if (!f) return Promise.reject(new Error('nicht verfügbar'));
  try { const r = f.call(el, { navigationUI: 'hide' }); return r && r.then ? r : new Promise((res, rej) => setTimeout(() => (fsEl() ? res() : rej(new Error('gesperrt'))), 400)); } catch (e) { return Promise.reject(e); }
}
function fsExit() { const f = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen; if (f) try { const r = f.call(document); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
const FS_HINT = 'Echtes Vollbild ist in dieser eingebetteten Ansicht gesperrt. Der Vorführmodus nutzt trotzdem die ganze Seite. Für Vollbild ohne Ränder die Seite in einem eigenen Browser-Tab öffnen oder die Datei foehn-labor.html direkt im Browser öffnen.';
function syncFs() { const on = !!fsEl(); $('fsBtn').setAttribute('aria-pressed', on); $('fsBtn').textContent = on ? 'Vollbild beenden' : 'Vollbild'; scheduleResize(); }
function toggleFull() { if (fsEl()) { fsExit(); return; } fsReq(document.documentElement).then(syncFs).catch(() => toast(FS_HINT)); }
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, syncFs));
$('fsBtn').onclick = toggleFull;
let wakeLock = null;
function keepAwake(v) {
  try {
    if (v && navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { wakeLock = l; }).catch(() => {});
    else if (!v && wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.present) keepAwake(true); needsRender = true; });
function setPanel(v) { S.panel = v; $('app').classList.toggle('nopanel', !v); $('panelBtn').setAttribute('aria-pressed', v); renderCap(); updateChrome(); scheduleResize(); }
function setProfile(v) { S.profile = v; $('drawer').hidden = !v; $('profBtn').setAttribute('aria-pressed', v); if (v) requestAnimationFrame(drawProfile); scheduleResize(); }
// Vorführmodus: große Schrift, Erklärkarte aus, Untertitel unter dem Modell, Bildschirm bleibt an; Vollbild, wenn erlaubt
function setPresent(v, tryFs = true) {
  S.present = v; document.documentElement.classList.toggle('present', v); $('presentBtn').setAttribute('aria-pressed', v);
  if (v) { setPanel(false); setProfile(false); if (tryFs && !fsEl()) fsReq(document.documentElement).then(syncFs).catch(() => {}); }
  else setPanel(true);
  keepAwake(v); scheduleResize();
}
$('panelBtn').onclick = () => setPanel(!S.panel);
$('profBtn').onclick = () => setProfile(!S.profile);
$('presentBtn').onclick = () => setPresent(!S.present);

// Bildschärfe an die Leistung des Geräts anpassen: Ruckelt es, wird etwas gröber gerechnet
let frAcc = 0, frN = 0, frSkip = 2.5, prCool = 0, activeUntil = 0, tNow = 0;
function setPixelRatio(pr) { pixelRatio = pr; renderer.setPixelRatio(pr); renderer.setSize(lastW, lastH, false); renderer.domElement.style.width = lastW + 'px'; renderer.domElement.style.height = lastH + 'px'; needsRender = true; }
function adaptQuality(raw) {
  if (SOFT_GL) return;
  if (frSkip > 0) { frSkip -= raw; frAcc = 0; frN = 0; return; }
  frAcc += Math.min(raw, 0.2); frN++;
  if (frN < 45) return;
  const avg = frAcc / frN; frAcc = 0; frN = 0;
  if (avg > 0.024 && pixelRatio > 1) { setPixelRatio(Math.max(1, pixelRatio - 0.25)); prCool = 0; }
  else if (avg < 0.0125 && pixelRatio < PR_MAX && ++prCool >= 8) { prCool = 0; setPixelRatio(Math.min(PR_MAX, pixelRatio + 0.25)); }
}

""" + c[j:]

# Bildschleife
rep("  const dt = Math.min(0.05, clock.getDelta());", "  const raw = clock.getDelta(), dt = Math.min(0.05, raw); tNow += dt;")
rep("    if (k >= 1) { camAnim = null; placeFaceLabels(); placeLabels(); updateLabels(); }\n  }\n  controls.update();",
    """    if (k >= 1) { camAnim = null; placeFaceLabels(); placeLabels(); updateLabels(); }
    needsRender = true;
  }
  controls.update();
  // Steht alles still (Pause, keine Kamerabewegung), wird nicht neu gezeichnet: schont den Akku
  if (needsRender) { needsRender = false; activeUntil = tNow + 1.6; }
  if (!S.playing && !camAnim && tNow > activeUntil) { requestAnimationFrame(tick); return; }
  adaptQuality(raw);""")
rep("  cloudMat.uniforms.scale.value = vp.clientHeight * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));",
    "  cloudMat.uniforms.scale.value = vp.clientHeight * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));\n  terrU.uSky.value.set(cloudVis, rainVis, M.cond ? xLcl : 0, 0);")
rep("  frontFade = THREE.MathUtils.smoothstep(clipC, 2, 7);", "  frontFade = sstep(clipC, 2, 7);")
rep("  profAcc += dt; if (profAcc > 0.06) { profAcc = 0; drawProfile(); }", "  profAcc += dt; if (S.profile && profAcc > 0.08) { profAcc = 0; drawProfile(); }")
rep("  declAcc += dt; if (declAcc > 0.1) { declAcc = 0; declutter(); }", "  declAcc += dt; if (declAcc > 0.12) { declAcc = 0; declutter(); }")

# Start
rep("rebuildGeometry();\nthemeWall();\nsetMode('learn');\nresize();\napplyPose(viewPose('3d'));\ntick();",
    """rebuildGeometry();
setMode('learn');
resize();
applyPose(viewPose('3d'));
// Profil von Anfang an nur, wenn der Bildschirm groß genug ist
if (innerWidth >= 1500 && innerHeight >= 1080) setProfile(true);
if (/present/.test(location.hash)) setPresent(true, false);
tick();""")
rep("window.__foehn = { S, P, get M() { return M; }, vis, seg, pathState, enterChapter, setMode, setParams, setPlaying, setView, replay,",
    "window.__foehn = { S, P, get M() { return M; }, vis, seg, pathState, enterChapter, setMode, setParams, setPlaying, setView, replay, setPresent, setPanel, setProfile, safeRect, playAction,\n  zeroLuv, zeroLee, RAIN_X0, RAIN_X1, CLOUD_PRE, SOFT_GL, glInfo, get pixelRatio() { return pixelRatio; }, cloud: i => [cX[i], cZ[i], cAlpha[i]], rainAt: i => [rX[i], rZ[i], rH[i]], NC, NR, Z0, Z1,")
# Schnee als Punkte mit eigener Deckkraft; Föhnmauer im Profil wie im 3D-Bild
rep("snowMat.opacity = rainVis;", "snowMat.uniforms.uOp.value = rainVis;")
rep("    for (let x = xa; x <= 1.4; x += 0.45) {", "    for (let x = xa; x <= 0.5; x += 0.4) {")
rep("      let topH = Math.max(M.lcl + 350, groundC(x) + 700 + 500 * ridgeF(x));\n      if (x > 0) topH -= x / 2.3 * 1100;",
    "      let topH = Math.max(M.lcl + 350, groundC(Math.min(x, 0)) + 650 + 650 * ridgeF(Math.min(x, 0)));\n      if (x > 0) topH -= x / 0.9 * 900;")
open(f'{S}/s3/ui.js', 'w', encoding='utf-8').write(c)
print('ui.js', len(c))
