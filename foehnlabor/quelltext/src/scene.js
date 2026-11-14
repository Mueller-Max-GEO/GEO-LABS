
// ================= Konstanten der Szene =================
const X0 = -16, X1 = 16, Z0 = -8, Z1 = 8;      // Ausdehnung in Szeneneinheiten (1 Einheit = 2 km)
const VS = 0.002;                               // 1 m → Einheiten (1 Einheit = 500 m → 4-fach überhöht)
const L_LUV = 11, L_LEE = 9;                    // halbe Breite des Gebirges auf beiden Seiten
const X_LUVORT = -13.4, X_LEEORT = 11.8, X_START = -15.6, X_END = 14.4, FOOT = -10.8;
const ORT_Z = -1.6, PATH_Z = 0;                 // Dörfer hinter dem Weg
const OFFY = 0.28;                              // Weg und Luftpaket knapp über dem Boden gezeichnet
const DEF = { t0: 15, rh: 70, hc: 2500 };
const P = { ...DEF };
let M = computeModel(P);
let xLcl = 0, xMid = 0;                         // Haltepunkte auf dem Luv-Hang

// Zustand der Oberfläche (alles Sichtbare wird aus M und S abgeleitet)
const S = { mode: 'learn', chapter: 1, phase: 'run', px: X_START, reveal: X_START, playing: true, speed: 1, hold: 0,
  pred: null, calc: false, solved: false, showNum: true, showFlow: true, showScale: true, showLabels: true, view: '3d',
  present: false, panel: true, profile: false };
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
if (mqReduce.matches) S.speed = 0.5;
const sstep = THREE.MathUtils.smoothstep, clamp = THREE.MathUtils.clamp;

// ================= Gelände: Form =================
function hash(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function ridged(x, y) {
  let s = 0, amp = 0.55, f = 1;
  for (let o = 0; o < 5; o++) { s += (1 - Math.abs(vnoise(x * f + o * 7.1, y * f - o * 3.3))) * amp; amp *= 0.5; f *= 2.03; }
  return s - 0.62;
}
function ridgeF(x) {                     // Gebirgsform quer zum Wind (0 … 1)
  const L = x < 0 ? L_LUV : L_LEE;
  if (Math.abs(x) >= L) return 0;
  const c = 0.5 * (1 + Math.cos(Math.PI * x / L));
  return Math.pow(c, 1.15);
}
function crestOff(z) {                   // Gipfel links und rechts vom Pass (m), 0 auf der Passlinie
  const w = 0.5 * (1 - Math.cos(z * 0.78));
  return 520 * w * (0.72 + 0.28 * Math.sin(z * 1.9 + 0.6));
}
function corridor(z) { return sstep(Math.abs(z), 0.35, 1.8); }
function groundC(x) { return H0 + (P.hc - H0) * ridgeF(x); }   // Passlinie (glatt): der Weg des Luftpakets
function xAtLuv(h) {                     // x auf der Luvseite, wo die Passlinie die Höhe h erreicht
  let lo = -L_LUV, hi = 0;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (groundC(m) < h) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// Höhenraster: Die Höhe ist  A(x) · (Passhöhe − Talhöhe) + B(x, z).  B (Gipfel, Grate, Rinnen) hängt nicht von der
// Passhöhe ab und wird nur einmal berechnet. Alle Abfragen (Bild, Strömung, Wolke, Niederschlag) lesen dasselbe Raster.
const GNX = 512, GNZ = 256, GW = GNX + 1, GH = GNZ + 1, GDX = (X1 - X0) / GNX, GDZ = (Z1 - Z0) / GNZ;
const gA = new Float32Array(GW), gB = new Float32Array(GW * GH), gHt = new Float32Array(GW * GH);
{
  for (let i = 0; i < GW; i++) gA[i] = ridgeF(X0 + GDX * i);
  for (let j = 0; j < GH; j++) {
    const z = Z0 + GDZ * j;
    const cor = corridor(z), ff = 1 - 0.7 * sstep(z, -0.2, 1.2);          // vorne (z > 0) flacher: der Weg bleibt einsehbar
    const crest = crestOff(z) * cor * ff;
    for (let i = 0; i < GW; i++) {
      const x = X0 + GDX * i, f = gA[i];
      const n = ridged(x * 0.42 + 3, z * 0.42 + 11) * 520 * (0.12 + f) * cor * (0.35 + 0.65 * f) * (0.45 + 0.55 * ff);
      // Rinnen und Rippen in Falllinie (quer zum Kamm), wie sie fließendes Wasser in einen Hang schneidet
      const m = Math.pow(f, 0.6) * (1 - 0.3 * f) * cor * (0.5 + 0.5 * ff);
      const phi = z * 2.3 + 1.7 * vnoise(x * 0.28 + 5.1, z * 0.4 + 2.7) + 0.55 * Math.sin(x * 0.63 + z * 0.21);
      const spur = Math.pow(Math.abs(Math.sin(phi)), 0.8);
      const rib = Math.abs(Math.sin(z * 6.4 + 2.4 * vnoise(x * 0.55 + 9.3, z * 0.8 + 1.1) + 1.3 * spur));
      const ero = (spur - 0.62) * 250 * m + (rib - 0.6) * 70 * m * (0.4 + 0.6 * spur);
      const fine = (vnoise(x * 4.3 + 1.7, z * 4.3 - 3.1) * 16 + vnoise(x * 10.5, z * 10.5 + 8) * 6) * (0.2 + f) * (0.3 + 0.7 * cor);
      gB[j * GW + i] = H0 + crest * f + n * f * 1.2 + n * 0.08 + vnoise(x * 1.3, z * 1.3) * 25 + ero + fine;
    }
  }
}
function fillHeights() {
  const dh = P.hc - H0;
  for (let j = 0, k = 0; j < GH; j++) for (let i = 0; i < GW; i++, k++) gHt[k] = Math.max(H0 - 40, gA[i] * dh + gB[k]);
}
function ground(x, z) {                  // Höhe in m (bilinear aus dem Raster)
  const fx = clamp((x - X0) / GDX, 0, GNX), fz = clamp((z - Z0) / GDZ, 0, GNZ);
  const i = Math.min(GNX - 1, fx | 0), j = Math.min(GNZ - 1, fz | 0), u = fx - i, v = fz - j, k = j * GW + i;
  return (gHt[k] * (1 - u) + gHt[k + 1] * u) * (1 - v) + (gHt[k + GW] * (1 - u) + gHt[k + GW + 1] * u) * v;
}

function Tfield(x, h) { const a = sstep(x, -1.2, 1.6); return Tluv(M, h) * (1 - a) + Tlee(M, h) * a; }
// Zustand des Luftpakets an der Stelle x des Weges
function pathState(x) {
  const h = groundC(x), luv = x <= 0;
  return { h, T: luv ? Tluv(M, h) : Tlee(M, h), rh: luv ? rhLuv(M, h) : rhLee(M, h), w: luv ? wLuv(M, h) : M.wc,
    sat: M.cond && luv && h >= M.lcl - 1e-6 };
}
// Wegstück des Luftpakets je Abschnitt [von, bis]. Abschnitt 3 endet unmittelbar am Kondensationsniveau:
// Dort beginnt die Kondensation; der Niederschlag (ab Abschnitt 4) setzt genau an dieser Stelle ein.
function seg(k) {
  const a = M.cond ? xLcl : xMid, b = M.cond ? Math.min(xLcl + 0.12, xLcl * 0.5) : a;
  switch (k) {
    case 1: return [X_START, FOOT];
    case 2: return [FOOT, a];
    case 3: return [a, b];
    case 4: return [b, 0];
    default: return [0, X_LEEORT];
  }
}
// Was ist gerade sichtbar? Im Lernmodus erscheint nichts, bevor das Luftpaket dort war.
function vis() {
  const exp = S.mode === 'exp', hideLee = S.calc && !S.solved;
  const lim = exp ? X_END + 2 : S.reveal;
  const leeReached = exp || S.reveal >= X_LEEORT - 1e-3;
  return {
    exp, hideLee, leeReached,
    colorLim: hideLee ? Math.min(lim, 0) : lim,
    lcl: exp || S.chapter >= 3 || (S.chapter === 2 && S.phase === 'hold' && M.cond),
    cloud: M.cond && (exp || S.chapter >= 3),
    precip: M.cond && (exp || S.chapter >= 4),
    kLcl: M.cond && (exp || S.reveal >= xLcl - 1e-3),
    kPass: exp || S.reveal >= -1e-3,
    kLee: leeReached && !hideLee,
    rateDry: exp || S.chapter >= 2,
    rateWet: M.cond && (exp || S.chapter >= 3),
    rateLee: exp || (S.chapter >= 5 && S.phase !== 'ask'),
  };
}
// Wo fällt im Modell Niederschlag? Vom Kondensationsniveau bis zum Pass – über die ganze Tiefe des Modells.
const RAIN_X0 = () => xLcl, RAIN_X1 = 0.35, CLOUD_PRE = 1.0;   // die Wolke ragt nur wenig über das Kondensationsniveau hinaus

// ================= Farben: feste Temperaturskala −20 … 40 °C =================
const TMIN = -20, TMAX = 40;
const hex3 = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const TSTOPS = [[-20, '#2A4B9B'], [-10, '#3F78C4'], [0, '#7FB2E5'], [10, '#E9E5D8'], [20, '#F2A65A'], [30, '#D4572F'], [40, '#9E1F2A']].map(([t, c]) => [t, hex3(c)]);
const T_UNDER = hex3('#6B3FA0'), T_OVER = hex3('#4A0D2E');      // eindeutig andere Farben außerhalb der Skala
function tempRGB(T) {
  if (T < TMIN - 1e-6) return T_UNDER;
  if (T > TMAX + 1e-6) return T_OVER;
  for (let i = 1; i < TSTOPS.length; i++) {
    if (T <= TSTOPS[i][0]) {
      const a = Math.max(0, (T - TSTOPS[i - 1][0]) / (TSTOPS[i][0] - TSTOPS[i - 1][0])), p = TSTOPS[i - 1][1], q = TSTOPS[i][1];
      return [p[0] + (q[0] - p[0]) * a, p[1] + (q[1] - p[1]) * a, p[2] + (q[2] - p[2]) * a];
    }
  }
  return TSTOPS[TSTOPS.length - 1][1];
}
function tempColor(T, out) { const c = tempRGB(T); return out.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); }
function tempCss(T) { const c = tempRGB(T); return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`; }
const GREY = new THREE.Color('#9AA39C'), GREY_CSS = '#9AA39C';
const HIDDEN = new THREE.Color('#F1F3F1'), HIDDEN_CSS = '#F1F3F1';   // Luftpaket, wenn seine Temperatur verborgen ist
const C = { earth: new THREE.Color('#8E7C60'), earthDeep: new THREE.Color('#5F5241') };
const tmpC = new THREE.Color();

// ================= Zahlenformat =================
const NNBSP = '\u202f';
const fmtM = h => Math.round(h).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP) + NNBSP + 'm';
const fmtT = (t, d = 1) => { const v = Math.abs(t) < 0.05 ? 0 : t; return (v < 0 ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ',') + NNBSP + '°C'; };
const fmtTs = t => (t >= 0 ? '+' : '−') + Math.abs(t).toFixed(1).replace('.', ',') + NNBSP + '°C';
const fmtP = r => Math.round(r) + NNBSP + '%';
const fmtW = w => w.toFixed(1).replace('.', ',') + NNBSP + 'g';

// ================= Renderer, Szene, Kamera =================
const $ = id => document.getElementById(id);
const vp = $('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
const PR_MAX = Math.min(devicePixelRatio || 1, 2);
let pixelRatio = PR_MAX;
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
vp.prepend(renderer.domElement);
// Software-Darstellung (Prüfumgebung) oder schwaches Gerät: kleinere Geländetextur
const glInfo = (() => { try { const g = renderer.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); return e ? String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; } catch (err) { return ''; } })();
const SOFT_GL = /swiftshader|llvmpipe|software/i.test(glInfo);
const labelR = new CSS2DRenderer();
Object.assign(labelR.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: 2 });
vp.appendChild(labelR.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 900);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 10; controls.maxDistance = 700; controls.maxPolarAngle = Math.PI * 0.53;
controls.minAzimuthAngle = -1.3; controls.maxAzimuthAngle = 1.3;
let userMoved = false, needsRender = true;
controls.addEventListener('start', () => { userMoved = true; });
controls.addEventListener('change', () => { needsRender = true; });
const wallTop = () => Math.max(4000, Math.ceil((P.hc + 1500) / 500) * 500);
// Kamerastellungen: Schrägansicht (leicht von links, damit Luv- und Lee-Hang beide einsehbar sind) und Querschnitt
// (sehr kleiner Öffnungswinkel aus großer Entfernung = fast unverzerrt). Der Bildausschnitt wird so berechnet,
// dass alles Wichtige im freien Feld zwischen Messleiste, Erklärkarte und Abspielleiste liegt.
const fitCam = new THREE.PerspectiveCamera(), fitV = new THREE.Vector3(), fitR = new THREE.Vector3(), fitU = new THREE.Vector3();
function safeRect() {
  const w = vp.clientWidth, h = Math.max(1, vp.clientHeight), vr = vp.getBoundingClientRect(), fr = $('free').getBoundingClientRect();
  const s = { l: fr.left - vr.left + 6, r: fr.right - vr.left - 6, t: fr.top - vr.top + 4, b: fr.bottom - vr.top - 4 };
  if (s.r - s.l < 120 || s.b - s.t < 70) return { l: 12, r: w - 12, t: 12, b: h - 12 };
  return s;
}
function fitView(dir, tgt0, fov, pts) {
  const w = vp.clientWidth, h = Math.max(1, vp.clientHeight), safe = safeRect();
  fitCam.fov = fov; fitCam.aspect = w / h; fitCam.near = 0.5; fitCam.far = 2000; fitCam.updateProjectionMatrix();
  const tgt = tgt0.clone();
  const measure = d => {
    fitCam.position.copy(tgt).addScaledVector(dir, d); fitCam.lookAt(tgt); fitCam.updateMatrixWorld(true);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of pts) { fitV.copy(p).project(fitCam); const X = (fitV.x * 0.5 + 0.5) * w, Y = (-fitV.y * 0.5 + 0.5) * h; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
    return { x0, x1, y0, y1 };
  };
  let dist = 40;
  for (let it = 0; it < 4; it++) {
    let lo = 8, hi = 900;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2, m = measure(mid); if (m.x1 - m.x0 <= safe.r - safe.l && m.y1 - m.y0 <= safe.b - safe.t) hi = mid; else lo = mid; }
    dist = hi;
    const m = measure(dist), upp = 2 * dist * Math.tan(THREE.MathUtils.degToRad(fov / 2)) / h;
    fitR.setFromMatrixColumn(fitCam.matrixWorld, 0); fitU.setFromMatrixColumn(fitCam.matrixWorld, 1);
    tgt.addScaledVector(fitR, -(((safe.l + safe.r) / 2) - (m.x0 + m.x1) / 2) * upp).addScaledVector(fitU, (((safe.t + safe.b) / 2) - (m.y0 + m.y1) / 2) * upp);
  }
  return { pos: tgt.clone().addScaledVector(dir, dist), tgt };
}
const DIR3D = new THREE.Vector3(-7.2, 16.9, 33.9).normalize();
const DIRSIDE = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(4)), Math.cos(THREE.MathUtils.degToRad(4)));
function viewPose(name) {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const topY = (P.hc + 1500) * VS;                                        // Wolkenobergrenze über dem Pass
  if (name === 'side') {
    const pts = [V3(-16.6, -1.5, 0), V3(16.6, -1.5, 0), V3(18.4, 0.4, Z0), V3(-16.6, 0.4, 0), V3(0, topY, 0)];
    return { ...fitView(DIRSIDE, V3(0, topY / 2, 0), 10, pts), fov: 10, clip: 0 };
  }
  const pts = [V3(X0, 0, Z1), V3(X1, 0, Z1), V3(X0, 0.3, Z0), V3(X1, 0.3, Z0), V3(-8.5, -2.4, Z1 + 0.3), V3(7.5, -2.4, Z1 + 0.3),
    V3(X0 - 1.2, 2.3, 3.5), V3(X_LEEORT + 2.2, 2.8, ORT_Z), V3(X_LUVORT - 2.2, 2.8, ORT_Z), V3(0, P.hc * VS + OFFY + 1.9, 0), V3(-2.5, topY, -4)];
  return { ...fitView(DIR3D, V3(0, 2, 0), 34, pts), fov: 34, clip: Z1 };
}

// Licht: Sonne von vorn links, eher tief – so zeichnen sich Rinnen, Grate und Wände ab
const SUN = new THREE.Vector3(-0.50, 0.62, 0.60).normalize();
scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x6f6452, 1.05));
const sun = new THREE.DirectionalLight(0xfff1dc, 3.3);
sun.position.copy(SUN).multiplyScalar(40);
scene.add(sun);

// Schnittebene: alles mit z > clipC wird weggeschnitten (Querschnitt durch den Pass bei clipC = 0)
let clipC = Z1;
const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), Z1 + 0.002);
const clipU = { value: Z1 };

// ---------- Gelände: Netz ----------
const terrGeo = new THREE.BufferGeometry();
const tPos = new Float32Array(GW * GH * 3), tNrm = new Float32Array(GW * GH * 3);
{
  const uv = new Float32Array(GW * GH * 2), idx = new Uint32Array(GNX * GNZ * 6);
  for (let j = 0, k = 0; j < GH; j++) for (let i = 0; i < GW; i++, k++) {
    tPos[k * 3] = X0 + GDX * i; tPos[k * 3 + 2] = Z0 + GDZ * j; uv[k * 2] = i / GNX; uv[k * 2 + 1] = j / GNZ;
  }
  for (let j = 0, n = 0; j < GNZ; j++) for (let i = 0; i < GNX; i++) {
    const a = j * GW + i, b = a + 1, c = a + GW, d = c + 1;
    idx[n++] = a; idx[n++] = c; idx[n++] = b; idx[n++] = b; idx[n++] = c; idx[n++] = d;
  }
  terrGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  terrGeo.setAttribute('normal', new THREE.BufferAttribute(tNrm, 3));
  terrGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  terrGeo.setIndex(new THREE.BufferAttribute(idx, 1));
}
// Schatten der Sonne, Abschattung in Mulden und Wölbung – je Rasterpunkt berechnet, als Textur an die Grafikkarte
const lightData = new Uint8Array(GW * GH * 4);
const lightTex = new THREE.DataTexture(lightData, GW, GH, THREE.RGBAFormat);
lightTex.minFilter = lightTex.magFilter = THREE.LinearFilter; lightTex.wrapS = lightTex.wrapT = THREE.ClampToEdgeWrapping;
function gh(i, j) { return gHt[Math.min(GNZ, Math.max(0, j)) * GW + Math.min(GNX, Math.max(0, i))]; }
function updateTerrainMesh() {
  for (let j = 0, k = 0; j < GH; j++) for (let i = 0; i < GW; i++, k++) {
    tPos[k * 3 + 1] = gHt[k] * VS;
    const sx = (gh(i + 1, j) - gh(i - 1, j)) * VS / (2 * GDX), sz = (gh(i, j + 1) - gh(i, j - 1)) * VS / (2 * GDZ);
    const l = 1 / Math.sqrt(sx * sx + 1 + sz * sz);
    tNrm[k * 3] = -sx * l; tNrm[k * 3 + 1] = l; tNrm[k * 3 + 2] = -sz * l;
  }
  terrGeo.attributes.position.needsUpdate = true; terrGeo.attributes.normal.needsUpdate = true;
  terrGeo.computeBoundingSphere();
}
const AO_DIR = Array.from({ length: 8 }, (_, a) => [Math.cos(a * Math.PI / 4 + 0.2), Math.sin(a * Math.PI / 4 + 0.2)]);
function updateLightData() {
  let hmax = 0; for (let k = 0; k < gHt.length; k++) if (gHt[k] > hmax) hmax = gHt[k];
  const ymax = hmax * VS;
  for (let j = 0, k = 0; j < GH; j++) for (let i = 0; i < GW; i++, k++) {
    const x = X0 + GDX * i, z = Z0 + GDZ * j, h = gHt[k], y0 = h * VS;
    // Schlagschatten: Strahl zur Sonne, weicher Rand
    let sh = 1;
    for (let t = 0.07; ; t += 0.05 + t * 0.14) {
      const px = x + SUN.x * t, pz = z + SUN.z * t, py = y0 + SUN.y * t;
      if (py > ymax || px < X0 || px > X1 || pz < Z0 || pz > Z1) break;
      const d = py - ground(px, pz) * VS;
      if (d < sh * t / 9) { sh = Math.max(0, 9 * d / t); if (sh <= 0) break; }
    }
    // Abschattung des Himmelslichts: wie hoch steht der Horizont ringsum?
    let occ = 0, mean = 0;
    for (const [dx, dz] of AO_DIR) {
      let mt = 0;
      for (const r of [0.13, 0.32, 0.65, 1.15]) { const tn = (ground(x + dx * r, z + dz * r) - h) * VS / r; if (tn > mt) mt = tn; }
      occ += mt / Math.sqrt(1 + mt * mt);
      mean += ground(x + dx * 0.26, z + dz * 0.26);
    }
    const ao = clamp(1 - 1.25 * occ / 8, 0.22, 1), conc = clamp((mean / 8 - h) / 85, -1, 1);
    lightData[k * 4] = Math.round(sh * 255); lightData[k * 4 + 1] = Math.round(ao * 255);
    lightData[k * 4 + 2] = Math.round((conc * 0.5 + 0.5) * 255); lightData[k * 4 + 3] = 255;
  }
  lightTex.needsUpdate = true;
}

// ---------- Gelände: Oberfläche ----------
// Die Bodenbedeckung (Wiesen, Äcker, Wald, Alpweiden, Schutt, Fels, Flüsse) wird einmal je Passhöhe auf der Grafikkarte
// in zwei Texturen gezeichnet (Farbe + Rauheit, Feinrelief + Schneeneigung). Das laufende Bild liest nur noch diese
// Texturen: scharf, ruhig (Mipmaps) und sparsam – wichtig für das iPad. Schnee, Nässe und Wolkenschatten kommen
// beim Zeichnen dazu, weil sie vom Modellzustand abhängen.
const lin = hex => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)})`; };
const maxTex = renderer.capabilities.maxTextureSize;
const BAKE_W = SOFT_GL && !/hq/.test(location.hash) ? 1024 : Math.min(4096, maxTex), BAKE_H = BAKE_W / 2;
const NRM_W = Math.min(BAKE_W, 2048), NRM_H = NRM_W / 2;
const rtOpts = { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, depthBuffer: false, stencilBuffer: false };
const rtAlb = new THREE.WebGLRenderTarget(BAKE_W, BAKE_H, rtOpts), rtNrm = new THREE.WebGLRenderTarget(NRM_W, NRM_H, rtOpts);
rtAlb.texture.anisotropy = rtNrm.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const BAKE_COMMON = `
precision highp float;
uniform sampler2D uData; uniform float uVS; uniform float uE;
varying vec3 vP; varying vec3 vN; varying vec2 vUv;
float th(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float tn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(th(i), th(i + vec2(1.0, 0.0)), u.x), mix(th(i + vec2(0.0, 1.0)), th(i + vec2(1.0, 1.0)), u.x), u.y); }
float tf(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * tn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s / 0.97; }
vec3 cell(vec2 p){                                   // Abstand zum nächsten und übernächsten Zellkern, Zufallswert der Zelle
  vec2 gi = floor(p), gf = fract(p); float d1 = 8.0, d2 = 8.0; vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j)); vec2 c = o + vec2(th(gi + o), th(gi + o + 31.7)) * 0.85; float d = length(c - gf);
    if (d < d1) { d2 = d1; d1 = d; id = gi + o; } else if (d < d2) { d2 = d; }
  }
  return vec3(d1, d2, th(id + 17.0));
}
// Vegetations- und Gesteinszonen: abhängig von Höhe, Neigung und Wölbung (Rinne oder Rippe)
void zones(vec2 q, float h, float ny, float conc, out float n1, out float forest, out float alp, out float rock, out float scree){
  n1 = tf(q * 0.9) - 0.5;
  float fLow = 820.0 + n1 * 320.0, fTop = 1820.0 + n1 * 340.0;
  float band = smoothstep(fLow, fLow + 90.0, h) * (1.0 - smoothstep(fTop - 90.0, fTop + 70.0, h));
  float patches = smoothstep(0.38, 0.47, tf(q * 1.5 + 3.1) + 0.1 * (1.0 - ny));
  float track = smoothstep(0.28, 0.55, conc) * smoothstep(1250.0, 1500.0, h);       // Runsen und Lawinenzüge bleiben waldfrei
  forest = band * patches * smoothstep(0.55, 0.72, ny) * (1.0 - 0.85 * track);
  alp = smoothstep(fTop - 40.0, fTop + 140.0, h);
  float rockH = smoothstep(2250.0 + n1 * 260.0, 2480.0 + n1 * 260.0, h - 150.0 * conc);
  float steep = smoothstep(0.80, 0.64, ny) * smoothstep(900.0, 1300.0, h);
  rock = max(rockH, steep);
  scree = smoothstep(0.58, 0.76, ny) * smoothstep(1700.0, 2100.0, h) * (1.0 - rockH) * max(smoothstep(0.52, 0.62, tf(q * 2.2 + 7.0)), smoothstep(0.22, 0.5, conc));
}
float bump(vec2 q, float forest, float rock, float scree){      // Feinrelief (Szeneneinheiten): Baumkronen, Felsstufen, Schutt
  vec3 c = cell(q * 22.0);
  float crown = (1.0 - smoothstep(0.0, 0.75, c.x)) * (0.6 + 0.8 * c.z);
  float r = tf(q * 6.0 + 3.0) + 0.45 * tn(q * 24.0);
  return forest * crown * 0.05 + rock * r * 0.11 + scree * tn(q * 34.0) * 0.012 + (1.0 - forest) * (1.0 - rock) * tn(q * 18.0) * 0.006;
}`;
const BAKE_VERT = `varying vec3 vP; varying vec3 vN; varying vec2 vUv;
void main(){ vP = position; vN = normal; vUv = uv; gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0); }`;
const BAKE_ALB = BAKE_COMMON + `
void main(){
  vec2 q = vP.xz; float h = vP.y / uVS, x = vP.x, z = vP.z; vec3 N = normalize(vN); float ny = N.y;
  float conc = texture2D(uData, vUv).b * 2.0 - 1.0;
  float n1, forest, alp, rock, scree; zones(q, h, ny, conc, n1, forest, alp, rock, scree);
  float lee = smoothstep(-0.5, 1.5, x);
  float n2 = tf(q * 3.5), n3 = tn(q * 40.0), n4 = tn(q * 95.0);
  // Wiesen: im Lee trockener, dazu gelbliche Magerwiesen
  vec3 col = mix(${lin('#6B8C45')}, ${lin('#8B9652')}, lee) * (0.84 + 0.30 * n2);
  col = mix(col, ${lin('#A39C5C')}, 0.5 * smoothstep(0.52, 0.76, tf(q * 2.1 + 9.0)));
  float rough = 0.93;
  // Talboden: unregelmäßige Parzellen (verzerrte Voronoi-Zellen), weiche Übergänge, vereinzelte Hecken
  float valley = (1.0 - smoothstep(600.0, 780.0, h)) * smoothstep(0.97, 0.99, ny);
  vec2 wq = q * 1.9 + vec2(tf(q * 0.8 + 11.0), tf(q * 0.8 + 23.0)) * 1.6;
  vec2 gi = floor(wq), gf = fract(wq); float d1 = 8.0, d2 = 8.0; vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j)); vec2 c = o + vec2(th(gi + o), th(gi + o + 31.7)) * 0.85; float d = length(c - gf);
    if (d < d1) { d2 = d1; d1 = d; id = gi + o; } else if (d < d2) { d2 = d; }
  }
  float hc = th(id + 17.0);
  vec3 fc = hc < 0.35 ? ${lin('#7FA255')} : hc < 0.55 ? ${lin('#98AB5E')} : hc < 0.68 ? ${lin('#B5AC6C')} : hc < 0.78 ? ${lin('#C4B27E')} : ${lin('#6C944C')};
  fc = mix(fc, col, 0.42);
  fc = mix(fc, fc * vec3(1.05, 1.0, 0.86), lee);
  float furrow = sin(dot(q, vec2(cos(hc * 6.283), sin(hc * 6.283))) * 150.0);        // Bearbeitungsrichtung je Parzelle
  fc *= 0.93 + 0.10 * tf(q * 9.0 + id) + 0.035 * furrow * step(0.5, hc);
  float border = 1.0 - smoothstep(0.010, 0.034, d2 - d1);
  float gaps = smoothstep(0.45, 0.6, tn(q * 22.0 + id * 3.0));
  float hedge = border * gaps * step(0.55, th(id * 1.3 + 4.0));
  fc = mix(fc, ${lin('#3F5E36')}, hedge * 0.6);
  float farm = smoothstep(0.35, 0.55, tf(q * 0.6 + 40.0));
  col = mix(col, fc, valley * farm);
  // Wald: unten Laubmischwald, oben Nadelwald; einzelne Kronen, Lichtungen
  vec3 cr = cell(q * 22.0);
  float crown = 1.0 - smoothstep(0.0, 0.75, cr.x);
  vec3 fo = mix(${lin('#47693A')}, ${lin('#263F2B')}, smoothstep(950.0, 1500.0, h + 300.0 * n1));
  fo = mix(fo, fo * vec3(1.14, 1.05, 0.78), lee * 0.5);
  fo *= (0.52 + 0.75 * crown) * (0.78 + 0.44 * cr.z);
  col = mix(col, fo, forest); rough = mix(rough, 0.97, forest);
  // Alpweiden über der Waldgrenze, mit Steinen durchsetzt
  vec3 ac = mix(${lin('#7C8850')}, ${lin('#9B9566')}, n2);
  ac = mix(ac, ${lin('#8C877A')}, 0.45 * smoothstep(0.55, 0.8, n3));
  col = mix(col, ac, alp);
  // Schutthalden unter den Wänden und in den Rinnen
  col = mix(col, ${lin('#A8A195')} * (0.86 + 0.26 * n3), scree * 0.9);
  // Fels: gebankt (Schichtung), mit Rinnen in Falllinie und rostiger Verwitterung
  vec2 sq = vec2(q.y * 15.0 + 2.5 * n1 + 0.6 * sin(q.x * 3.0), q.x * 1.6);
  float streak = 0.65 * tn(sq) + 0.35 * tn(sq * vec2(2.3, 1.7) + 5.0);
  float strata = sin(h / 31.0 + 5.0 * tf(q * 1.1 + 2.0) + q.y * 0.8);
  vec3 rc = mix(${lin('#5C5852')}, ${lin('#A29A8E')}, tf(q * 7.0));
  rc *= (0.78 + 0.44 * streak) * (1.0 + 0.11 * strata);
  rc = mix(rc, rc * vec3(1.10, 0.97, 0.84), 0.6 * smoothstep(0.55, 0.8, tf(q * 2.6 + 15.0)));
  col = mix(col, rc, rock); rough = mix(rough, 0.84, rock);
  // Mulden dunkler, Rippen heller: betont das Relief wie auf einem Luftbild
  col *= 1.0 - 0.17 * conc;
  // Dorfplätze
  float dv = min(length(q - vec2(-13.4, -1.6)), length(q - vec2(11.8, -1.6)));
  col = mix(col, ${lin('#ADAB98')}, (1.0 - smoothstep(0.3, 0.75, dv)) * (0.35 + 0.25 * step(0.55, tn(q * 30.0))));
  // Flüsse im Talboden (parallel zum Gebirge) mit Kiesbänken und Ufergehölz
  float xr1 = -14.7 + 0.45 * sin(z * 0.8 + 0.3) + 0.15 * sin(z * 2.3);
  float xr2 = 13.8 + 0.45 * sin(z * 0.7 + 1.2) + 0.15 * sin(z * 2.1);
  float dr = min(abs(x - xr1), abs(x - xr2));
  float rw = 0.05 + 0.02 * tn(vec2(z * 1.7, 3.0));
  col = mix(col, ${lin('#35562F')} * (0.7 + 0.6 * crown), (1.0 - smoothstep(rw + 0.05, rw + 0.16, dr)) * smoothstep(0.35, 0.6, tn(q * 9.0)) * 0.8);
  col = mix(col, ${lin('#B7AE9B')}, (1.0 - smoothstep(rw + 0.01, rw + 0.05, dr)) * 0.9);
  float water = 1.0 - smoothstep(rw - uE, rw + uE, dr);
  col = mix(col, ${lin('#3D6E94')} * (0.9 + 0.2 * n3), water); rough = mix(rough, 0.16, water);
  // feines Korn
  col *= 0.93 + 0.14 * n4;
  gl_FragColor = vec4(sqrt(clamp(col, 0.0, 1.0)), rough);
}`;
const BAKE_NRM = BAKE_COMMON + `
void main(){
  vec2 q = vP.xz; float h = vP.y / uVS; vec3 N = normalize(vN); float ny = N.y;
  float conc = texture2D(uData, vUv).b * 2.0 - 1.0;
  float n1, forest, alp, rock, scree; zones(q, h, ny, conc, n1, forest, alp, rock, scree);
  float e = uE * 1.5;
  float b0 = bump(q, forest, rock, scree), bx = bump(q + vec2(e, 0.0), forest, rock, scree), bz = bump(q + vec2(0.0, e), forest, rock, scree);
  vec3 n = normalize(N - vec3(bx - b0, 0.0, bz - b0) / e * 0.55);
  // Schneeneigung: auf Schattenhängen, in Rinnen und Mulden liegt Schnee tiefer; ausgefranster Rand
  vec2 sunDir = normalize(vec2(${SUN.x.toFixed(3)}, ${SUN.z.toFixed(3)}));
  float sunny = dot(N.xz, sunDir) / max(0.25, length(N.xz) + 0.25);
  float off = 340.0 * (tf(q * 4.5 + 31.0) - 0.5) + 90.0 * (tn(q * 26.0 + 7.0) - 0.5) - 260.0 * sunny - 220.0 * n1 + 300.0 * conc;
  gl_FragColor = vec4(n * 0.5 + 0.5, clamp(0.5 + off / 1800.0, 0.0, 1.0));
}`;
const bakeU = { uData: { value: lightTex }, uVS: { value: VS }, uE: { value: (X1 - X0) / BAKE_W } };
const bakeOpts = { uniforms: bakeU, vertexShader: BAKE_VERT, side: THREE.DoubleSide, depthTest: false, depthWrite: false, blending: THREE.NoBlending };
const bakeAlbMat = new THREE.ShaderMaterial({ ...bakeOpts, fragmentShader: BAKE_ALB });
const bakeNrmMat = new THREE.ShaderMaterial({ ...bakeOpts, fragmentShader: BAKE_NRM });
const bakeScene = new THREE.Scene(), bakeCam = new THREE.Camera();
const bakeMesh = new THREE.Mesh(terrGeo, bakeAlbMat); bakeMesh.frustumCulled = false; bakeScene.add(bakeMesh);
function bakeTerrain() {
  const prev = renderer.getRenderTarget();
  for (const [mat, rt] of [[bakeAlbMat, rtAlb], [bakeNrmMat, rtNrm]]) {
    bakeMesh.material = mat; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(bakeScene, bakeCam);
  }
  renderer.setRenderTarget(prev);
}
// Schnee liegt dort, wo die Luft im Modell unter 0 °C hat – im Luv und im Lee nach derselben Regel.
// Dieselbe Grenze trennt beim Niederschlag Flocken von Tropfen.
function zeroLuv() {
  const dry = H0 + M.t0 / DRY * 100;                                   // 0-°C-Höhe, solange die Luft ungesättigt ist
  return M.cond && dry > M.lcl ? M.lcl + M.tl / WET * 100 : dry;
}
function zeroLee() { return M.tc < 0 ? P.hc + M.tc / DRY * 100 : zeroLuv(); }   // liegt die 0-°C-Höhe über dem Pass, gilt sie für beide Seiten
const terrU = { uAlb: { value: rtAlb.texture }, uLight: { value: lightTex }, uVS: { value: VS }, uSnowLuv: { value: 9999 }, uSnowLee: { value: 9999 },
  uSky: { value: new THREE.Vector4(0, 0, 0, 0) }, uBlob: { value: new THREE.Vector3(0, 0, 0.5) } };
const terrMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, normalMap: rtNrm.texture, normalMapType: THREE.ObjectSpaceNormalMap, clippingPlanes: [clipPlane] });
terrMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, terrU);
  const lights = THREE.ShaderChunk.lights_fragment_begin, key = 'getDirectionalLightInfo( directionalLight, directLight );';
  if (!lights.includes(key)) console.error('Geländeschatten: Stelle im Shader nicht gefunden');
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
    .replace('#include <project_vertex>', '#include <project_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec3 vWPos;
uniform sampler2D uAlb; uniform sampler2D uLight; uniform float uVS; uniform float uSnowLuv; uniform float uSnowLee;
uniform vec4 uSky;      // x: Wolke (0…1), y: Niederschlag (0…1), z: x-Lage des Kondensationsniveaus am Hang
uniform vec3 uBlob;     // Schatten des Luftpakets: x, z, Radius
float gRough; float gShade; float gAO;`)
    .replace('#include <map_fragment>', `{
    vec2 tuv = vNormalMapUv;
    vec4 tA = texture2D(uAlb, tuv), tN = texture2D(normalMap, tuv), tL = texture2D(uLight, tuv);
    vec3 alb = tA.rgb * tA.rgb; gRough = tA.a;
    float hM = vWPos.y / uVS, wx = vWPos.x, ny = tN.y * 2.0 - 1.0;
    // nasser Boden, wo es im Modell regnet
    float wet = uSky.y * smoothstep(uSky.z - 0.05, uSky.z + 0.5, wx) * (1.0 - smoothstep(0.1, 1.0, wx));
    alb *= 1.0 - 0.24 * wet; gRough = mix(gRough, 0.5, 0.5 * wet);
    // Schnee oberhalb der 0-°C-Höhe der Modellluft; steile Wände bleiben frei
    float sl = mix(uSnowLuv, uSnowLee, smoothstep(-0.6, 0.9, wx));
    float snow = smoothstep(sl - 70.0, sl + 70.0, hM + (tN.a - 0.5) * 1800.0) * smoothstep(0.46, 0.66, ny);
    alb = mix(alb, vec3(0.80, 0.85, 0.91), snow); gRough = mix(gRough, 0.6, snow);
    // Schatten der Stauwolke und des Luftpakets
    float cs = uSky.x * smoothstep(uSky.z - 1.2, uSky.z + 0.4, wx) * (1.0 - smoothstep(0.1, 0.9, wx));
    float blob = 1.0 - smoothstep(uBlob.z * 0.3, uBlob.z * 1.3, length(vWPos.xz - uBlob.xy));
    gShade = tL.r * (1.0 - 0.62 * cs) * (1.0 - 0.6 * blob);
    gAO = tL.g * (1.0 - 0.12 * cs) * (1.0 - 0.3 * blob);
    diffuseColor.rgb = alb;
  }`)
    .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
    .replace('#include <lights_fragment_begin>', lights.replace(key, key + '\n\t\tdirectLight.color *= gShade;'))
    .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= gAO;');
};
const terrain = new THREE.Mesh(terrGeo, terrMat);
scene.add(terrain);
// weicher Lichtfleck unter dem Blockbild: Das Modell steht auf einer Fläche, nicht im Leeren
{
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  gr.addColorStop(0, 'rgba(140,165,200,.20)'); gr.addColorStop(0.55, 'rgba(120,145,180,.08)'); gr.addColorStop(1, 'rgba(120,145,180,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(74, 46), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.03; floor.renderOrder = -2;
  scene.add(floor);
}

// Schnittflächen des Blockbilds mit Höhenschichten und Höhenlinien (alle 100 m fein, alle 500 m kräftig)
const skirtU = { uVS: { value: VS }, uLines: { value: 1 } };
// Höhenschichten (Farben wie im Atlas), je 500 m eine Stufe; dieselben Farben im Profil
const HYP = [[0, '#6A9B58'], [500, '#93BC6E'], [1000, '#C6D68E'], [1500, '#EBDD9C'], [2000, '#E2BC7C'], [2500, '#C99460'], [3000, '#A8744C'], [3500, '#BDB2A8'], [4000, '#EDEDEA']];
const HYP_GLSL = 'vec3 hypC(float h){' + HYP.slice(1).map(([h], i) => `if (h < ${h.toFixed(1)}) return ${lin(HYP[i][1])};`).join(' ') + ` return ${lin(HYP[HYP.length - 1][1])}; }`;
function earthMaterial(clipped, k) {
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, clippingPlanes: clipped ? [clipPlane] : null, toneMapped: false });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uVS = skirtU.uVS; sh.uniforms.uLines = skirtU.uLines; sh.uniforms.uK = { value: k };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vH;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vH = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH; uniform float uVS; uniform float uLines; uniform float uK;\n' + HYP_GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
  {
    float hm = vH / uVS;
    if (uLines > 0.5) diffuseColor.rgb = hypC(hm) * mix(0.9, 1.0, smoothstep(0.0, 300.0, hm));   // Höhenschichten
    diffuseColor.rgb *= uK;
    float fw = max(fwidth(hm), 1e-3);
    float d500 = abs(mod(hm + 250.0, 500.0) - 250.0);
    float d100 = abs(mod(hm + 50.0, 100.0) - 50.0);
    float l500 = 1.0 - smoothstep(fw * 0.6, fw * 1.8, d500);
    float l100 = (1.0 - smoothstep(fw * 0.3, fw * 1.1, d100)) * smoothstep(1.5, 4.0, 100.0 / fw);
    float k = uLines * max(l500 * 0.6, l100 * 0.16) * step(1.0, hm);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.025, 0.015), k);
  }`);
  };
  return mat;
}
const skirtGeo = new THREE.BufferGeometry();
const skirt = new THREE.Mesh(skirtGeo, earthMaterial(true, 0.8));
scene.add(skirt);
const edgeMat = new THREE.LineBasicMaterial({ color: 0x40382c, clippingPlanes: [clipPlane], toneMapped: false });
const baseLine = new THREE.LineSegments(new THREE.BufferGeometry(), edgeMat);
scene.add(baseLine);
// Vordere Schnittfläche: wandert mit der Schnittebene (z = clipC) und zeigt dort das Profil
const NF = 384;
const faceGeo = new THREE.BufferGeometry();
const fPos = new Float32Array((NF + 1) * 6), fCol = new Float32Array((NF + 1) * 6), fLine = new Float32Array((NF + 1) * 3);
faceGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
faceGeo.setAttribute('color', new THREE.BufferAttribute(fCol, 3));
{ const idx = []; for (let i = 0; i < NF; i++) { const a = i * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); } faceGeo.setIndex(idx); }
const face = new THREE.Mesh(faceGeo, earthMaterial(false, 1)); face.frustumCulled = false;
scene.add(face);
const faceLineGeo = new THREE.BufferGeometry();
faceLineGeo.setAttribute('position', new THREE.BufferAttribute(fLine, 3));
const faceLine = new THREE.Line(faceLineGeo, new THREE.LineBasicMaterial({ color: 0x2a241b, toneMapped: false })); faceLine.frustumCulled = false;
scene.add(faceLine);
function updateFace(c) {
  for (let i = 0; i <= NF; i++) {
    const x = X0 + (X1 - X0) * i / NF, y = ground(x, c) * VS;
    fPos[i * 6] = x; fPos[i * 6 + 1] = 0; fPos[i * 6 + 2] = c;
    fPos[i * 6 + 3] = x; fPos[i * 6 + 4] = y; fPos[i * 6 + 5] = c;
    fCol[i * 6] = C.earthDeep.r; fCol[i * 6 + 1] = C.earthDeep.g; fCol[i * 6 + 2] = C.earthDeep.b;
    tmpC.copy(C.earthDeep).lerp(C.earth, Math.min(1, y / 1.4));
    fCol[i * 6 + 3] = tmpC.r; fCol[i * 6 + 4] = tmpC.g; fCol[i * 6 + 5] = tmpC.b;
    fLine[i * 3] = x; fLine[i * 3 + 1] = y + 0.004; fLine[i * 3 + 2] = c + 0.004;
  }
  faceGeo.attributes.position.needsUpdate = true; faceGeo.attributes.color.needsUpdate = true;
  faceLineGeo.attributes.position.needsUpdate = true;
}
function setClip(c) {
  clipC = c; clipPlane.constant = c + 0.002; clipU.value = c;
  updateFace(c); needsRender = true;
}

// full = false: nur die Form (schnell, während der Regler gezogen wird); full = true: auch Schatten und Bodenbedeckung
function buildTerrain(full = true) {
  fillHeights();
  buildEnvelope();
  updateTerrainMesh();
  if (full) { updateLightData(); bakeTerrain(); }
  // Seitenwände rechts, hinten, links (die vordere Fläche ist die wandernde Schnittfläche)
  const P2 = [], CC = [], L = [];
  const edge = (pts) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
      const ha = ground(ax, az) * VS, hb = ground(bx, bz) * VS;
      P2.push(ax, 0, az, bx, 0, bz, bx, hb, bz, ax, 0, az, bx, hb, bz, ax, ha, az);
      for (const y of [0, 0, hb, 0, hb, ha]) { tmpC.copy(C.earthDeep).lerp(C.earth, Math.min(1, y / 1.4)); CC.push(tmpC.r, tmpC.g, tmpC.b); }
      L.push(ax, ha + 0.003, az, bx, hb + 0.003, bz);
    }
  };
  const back = [], left = [], right = [];
  for (let i = 0; i <= GNX; i++) back.push([X1 - i * GDX, Z0]);
  for (let j = 0; j <= GNZ; j++) { right.push([X1, Z1 - j * GDZ]); left.push([X0, Z0 + j * GDZ]); }
  edge(right); edge(back); edge(left);
  skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3));
  skirtGeo.setAttribute('color', new THREE.Float32BufferAttribute(CC, 3));
  skirtGeo.computeBoundingSphere();
  baseLine.geometry.dispose();
  baseLine.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
  updateFace(clipC);
  needsRender = true;
}

// ---------- Orte (Messpunkte in beiden Tälern, hinter dem Weg) ----------
function village(x, z, seed) {
  const g = new THREE.Group();
  const wall = new THREE.MeshLambertMaterial({ color: 0xe9e2d4 }), roof = new THREE.MeshLambertMaterial({ color: 0x8f3b2b });
  for (let i = 0; i < 12; i++) {
    const a = hash(seed, i) * Math.PI * 2, r = 0.12 + hash(i, seed) * 0.6;
    const hx = x + Math.cos(a) * r, hz = z + Math.sin(a) * r * 0.8, s = 0.7 + 0.5 * hash(i + 3, seed);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.13 * s, 0.08 * s, 0.1 * s), wall);
    const gy = ground(hx, hz) * VS;
    b.position.set(hx, gy + 0.04 * s, hz); b.rotation.y = hash(seed + 5, i) * 3;
    const rf = new THREE.Mesh(new THREE.ConeGeometry(0.105 * s, 0.07 * s, 4), roof);
    rf.position.set(hx, gy + 0.115 * s, hz); rf.rotation.y = b.rotation.y + Math.PI / 4;
    g.add(b, rf);
  }
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.06), wall);
  ch.position.set(x + 0.05, ground(x, z) * VS + 0.13, z - 0.05); g.add(ch);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.12, 4), roof);
  sp.position.set(x + 0.05, ground(x, z) * VS + 0.32, z - 0.05); sp.rotation.y = Math.PI / 4; g.add(sp);
  return g;
}
const villages = new THREE.Group(); scene.add(villages);
function buildVillages() { villages.clear(); villages.add(village(X_LUVORT, ORT_Z, 3), village(X_LEEORT, ORT_Z, 7)); }

// ---------- Beschriftungen ----------
function makeLabel(html, cls) {
  const d = document.createElement('div'); d.className = cls; d.innerHTML = html;
  return new CSS2DObject(d);
}
const L = {};
L.luv = makeLabel('LUV<small>dem Wind zugewandt</small>', 'lbl lbl-side'); L.luv.center.set(0.5, 0); scene.add(L.luv);
L.lee = makeLabel('LEE<small>dem Wind abgewandt</small>', 'lbl lbl-side'); L.lee.center.set(0.5, 0); scene.add(L.lee);
L.wind = makeLabel('Wind', 'lbl lbl-tag'); L.wind.center.set(0, 1.4); scene.add(L.wind);
L.lcl = makeLabel('', 'lbl lbl-lcl'); L.lcl.center.set(0, 1.3); scene.add(L.lcl);
L.pass = makeLabel('', 'lbl'); L.pass.center.set(0.5, 1); scene.add(L.pass);
L.cloud = makeLabel('Stauwolke · Föhnmauer', 'lbl'); scene.add(L.cloud);
L.rain = makeLabel('Niederschlag', 'lbl'); scene.add(L.rain);
L.stLuv = makeLabel('', 'lbl lbl-st'); L.stLuv.center.set(0.5, 1); scene.add(L.stLuv);
L.stLee = makeLabel('', 'lbl lbl-st'); L.stLee.center.set(0.5, 1); scene.add(L.stLee);

// ---------- Höhenwand hinten und Kondensationsniveau ----------
const wallGroup = new THREE.Group(); scene.add(wallGroup);
const wallLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xeaf0f7, transparent: true, opacity: 0.3, toneMapped: false }));
wallGroup.add(wallLines);
const wallPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xbfd2ea, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
wallGroup.add(wallPlane);
const wallLabels = [], faceLabels = [];
const WALL_Z = Z0 - 0.02;
const lclGroup = new THREE.Group(); scene.add(lclGroup);
const lclPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x6aa9f2, transparent: true, opacity: 0.27, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
lclPlane.rotation.x = -Math.PI / 2; lclPlane.renderOrder = 2; lclGroup.add(lclPlane);
const lclBar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.045, 0.045), new THREE.MeshBasicMaterial({ color: 0x4f93e6, transparent: true, toneMapped: false }));
lclBar.renderOrder = 6; lclGroup.add(lclBar);
const lclBack = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x8cc0ff, transparent: true, opacity: 0.9, toneMapped: false }));
lclGroup.add(lclBack);
function buildWall() {
  const top = wallTop();
  const pts = [];
  for (let h = 0; h <= top; h += 500) pts.push(X0, h * VS, WALL_Z, X1, h * VS, WALL_Z);
  pts.push(X0, 0, WALL_Z, X0, top * VS, WALL_Z);
  wallLines.geometry.dispose();
  wallLines.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  wallPlane.scale.set(X1 - X0, top * VS, 1);
  wallPlane.position.set(0, top * VS / 2, WALL_Z - 0.01);
  wallLabels.forEach(l => wallGroup.remove(l)); wallLabels.length = 0;
  for (let h = 0; h <= top; h += 1000) {
    const o = makeLabel(h === 0 ? '0 m' : fmtM(h), 'lbl lbl-wall');
    o.position.set(X1 + 0.15, h * VS, WALL_Z); o.center.set(0, 0.5);
    wallGroup.add(o); wallLabels.push(o);
  }
  // Kondensationsniveau: Balken in der Ebene des Luftpakets, blasse Fläche über die ganze Tiefe des Modells
  const y = Math.min(M.lcl, 20000) * VS, xe = M.cond ? xLcl : 0.6;
  lclPlane.scale.set(xe - X0, Z1 - Z0, 1);
  lclPlane.position.set((X0 + xe) / 2, y, 0);
  lclBar.scale.set(xe - X0, 1, 1);
  lclBar.position.set((X0 + xe) / 2, y, PATH_Z);
  lclBack.geometry.dispose();
  lclBack.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([X0, y, WALL_Z, xe, y, WALL_Z, X0, y, WALL_Z, X0, y, Z1, X0, y, Z1, xe, y, Z1, xe, y, WALL_Z, xe, y, Z1], 3));
  needsRender = true;
}
// Höhenangaben auf der vorderen Schnittfläche (dort, wo der Schnitt am höchsten ist)
function placeFaceLabels() {
  faceLabels.forEach(l => scene.remove(l)); faceLabels.length = 0;
  let xm = 0, gm = 0;
  for (let x = -10; x <= 8; x += 0.05) { const gz = ground(x, clipC); if (gz > gm) { gm = gz; xm = x; } }
  const xf = xm - 1.6, gl = ground(xf, clipC);
  for (let hh = 500; hh <= gl - 120; hh += 500) {
    const o = makeLabel(fmtM(hh), 'lbl lbl-face');
    o.position.set(xf, hh * VS, clipC + 0.03);
    scene.add(o); faceLabels.push(o);
  }
}

// ---------- Windpfeile ----------
function arrowMesh(len, color) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 12), m); sh.rotation.z = -Math.PI / 2; sh.position.x = len / 2;
  const hd = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 16), m); hd.rotation.z = -Math.PI / 2; hd.position.x = len + 0.2;
  g.add(sh, hd); return g;
}
const arrowBack = arrowMesh(1.8, 0xeaf0f7); arrowBack.position.set(X0 - 0.2, 1.5, -3.5); scene.add(arrowBack);
const arrowFront = arrowMesh(1.8, 0xeaf0f7); arrowFront.position.set(X0 - 0.2, 1.5, 3.5); scene.add(arrowFront);

// ---------- Strömung: wenige Bahnen über einer geglätteten Hüllfläche ----------
const GX = 161, GZ = 81;
const gEnv = new Float32Array(GX * GZ);
function buildEnvelope() {
  const raw = new Float32Array(GX * GZ), tmp = new Float32Array(GX * GZ);
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) raw[j * GX + i] = ground(X0 + (X1 - X0) * i / (GX - 1), Z0 + (Z1 - Z0) * j / (GZ - 1));
  // Maximum in der Umgebung (Luft bleibt über den Graten)
  const R = 2;
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) { let m = -1e9; for (let d = -R; d <= R; d++) { const ii = Math.min(GX - 1, Math.max(0, i + d)); m = Math.max(m, raw[j * GX + ii]); } tmp[j * GX + i] = m; }
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) { let m = -1e9; for (let d = -R; d <= R; d++) { const jj = Math.min(GZ - 1, Math.max(0, j + d)); m = Math.max(m, tmp[jj * GX + i]); } raw[j * GX + i] = m; }
  // Gauß-Glättung (getrennt, zwei Durchgänge)
  const K = [], sig = 3.2, KR = 8; let ks = 0;
  for (let d = -KR; d <= KR; d++) { const w = Math.exp(-d * d / (2 * sig * sig)); K.push(w); ks += w; }
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) { let v = 0; for (let d = -KR; d <= KR; d++) { const ii = Math.min(GX - 1, Math.max(0, i + d)); v += raw[j * GX + ii] * K[d + KR]; } tmp[j * GX + i] = v / ks; }
    for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) { let v = 0; for (let d = -KR; d <= KR; d++) { const jj = Math.min(GZ - 1, Math.max(0, j + d)); v += tmp[jj * GX + i] * K[d + KR]; } raw[j * GX + i] = v / ks; }
  }
  gEnv.set(raw);
}
function groundS(x, z) {
  const fx = clamp((x - X0) / (X1 - X0), 0, 1) * (GX - 1), fz = clamp((z - Z0) / (Z1 - Z0), 0, 1) * (GZ - 1);
  const i = Math.min(GX - 2, Math.floor(fx)), j = Math.min(GZ - 2, Math.floor(fz)), u = fx - i, v = fz - j;
  const a = gEnv[j * GX + i], b = gEnv[j * GX + i + 1], c = gEnv[(j + 1) * GX + i], d = gEnv[(j + 1) * GX + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function streamH(x, z, s) {                         // Höhe (m) einer Strömungsbahn
  const f = ridgeF(x);
  const a = 150 + s * 1400 * (1 - 0.6 * f);
  return groundS(x, z) * (1 - 0.12 * s * f) + a + 0.12 * s * f * (P.hc + 300);
}
function speedAt(x, s) {
  const f = ridgeF(x), lee = sstep(x, -0.5, 2.5) * (1 - sstep(x, 9, 15));
  return 1 + 0.55 * f + lee * (1.5 - 0.9 * s);
}
// Bahnen: [z, Höhenlage]; die Farbe zeigt die Temperatur, aber nur bis zur Grenze uLimit (dahinter grau)
const LANES = [[-6, 0.1], [-3.2, 0.1], [3.2, 0.1], [6, 0.1], [-4.6, 0.75], [4.6, 0.75]];
const limitU = { value: X_START };
function lineMaterial(opacity, fadeA = 0.6, grey = GREY) {
  return new THREE.ShaderMaterial({
    uniforms: { uLimit: limitU, uOpacity: { value: opacity }, uGrey: { value: grey }, uFadeA: { value: fadeA } },
    vertexShader: `attribute vec3 color; varying vec3 vC; varying float vX;
      void main(){ vC = color; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uLimit; uniform float uOpacity; uniform float uFadeA; uniform vec3 uGrey; varying vec3 vC; varying float vX;
      void main(){ float k = smoothstep(uLimit - 0.1, uLimit + 0.1, vX); gl_FragColor = vec4(mix(vC, uGrey, k), uOpacity * mix(1.0, uFadeA, k));
      #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
}
// Der Weg ist deckend und wird nach Wolke und Niederschlag gezeichnet: Er bleibt überall lesbar
const laneMatBack = lineMaterial(0.6), laneMatFront = lineMaterial(0.6), pathMat = lineMaterial(1, 1, new THREE.Color('#8E9993'));
pathMat.depthWrite = true;
const lanes = new THREE.Group(); scene.add(lanes);
let pathTube = null;
function tubeAlong(fn, radius, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(fn(i / n));
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, radius, 6, false);
  const p = geo.attributes.position, cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { tempColor(Tfield(p.getX(i), p.getY(i) / VS), tmpC); cols[i * 3] = tmpC.r; cols[i * 3 + 1] = tmpC.g; cols[i * 3 + 2] = tmpC.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
const pathY = x => groundC(x) * VS + OFFY;
const PR = 0.42;                                     // Radius des Luftpakets (mit Ring)
function parcelY(x, scale) {
  const s = (groundC(x + 0.05) - groundC(x - 0.05)) * VS / 0.1;    // Hangneigung im Bild
  return groundC(x) * VS + PR * scale * Math.sqrt(1 + s * s) + 0.12;
}
function buildFlow() {
  for (const m of [...lanes.children]) { lanes.remove(m); m.geometry.dispose(); }
  for (const [z, s] of LANES) {
    const geo = tubeAlong(t => { const x = X0 + (X1 - X0) * t; return new THREE.Vector3(x, streamH(x, z, s) * VS, z); }, 0.035, 120);
    const mesh = new THREE.Mesh(geo, z > 0 ? laneMatFront : laneMatBack); mesh.renderOrder = 1; mesh.userData.front = z > 0;
    lanes.add(mesh);
  }
  // Hauptweg des Luftpakets über den Pass: Farbe = Temperatur des Luftpakets an dieser Stelle
  if (pathTube) { scene.remove(pathTube); pathTube.geometry.dispose(); }
  const pts = [];
  for (let i = 0; i <= 240; i++) { const x = X_START + (X_END - X_START) * i / 240; pts.push(new THREE.Vector3(x, pathY(x), PATH_Z)); }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 480, 0.065, 8, false);
  const p = geo.attributes.position, cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { tempColor(pathState(p.getX(i)).T, tmpC); cols[i * 3] = tmpC.r; cols[i * 3 + 1] = tmpC.g; cols[i * 3 + 2] = tmpC.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  pathTube = new THREE.Mesh(geo, pathMat); pathTube.renderOrder = 6; scene.add(pathTube);
  needsRender = true;
}
// Bewegte Marken auf den Bahnen zeigen Richtung und Tempo der Strömung
const PER = 4, NP = LANES.length * PER, TRAIL = 14, NV = NP * TRAIL * 2;
const rbGeo = new THREE.BufferGeometry();
const rbPos = new Float32Array(NV * 3), rbCol = new Float32Array(NV * 3), rbAlpha = new Float32Array(NV);
rbGeo.setAttribute('position', new THREE.BufferAttribute(rbPos, 3));
rbGeo.setAttribute('color', new THREE.BufferAttribute(rbCol, 3));
rbGeo.setAttribute('alpha', new THREE.BufferAttribute(rbAlpha, 1));
{
  const idx = [];
  for (let i = 0; i < NP; i++) for (let k = 0; k < TRAIL - 1; k++) { const a = (i * TRAIL + k) * 2, b = a + 2; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  rbGeo.setIndex(idx);
}
const partMat = new THREE.ShaderMaterial({
  vertexShader: `attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC;
    void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vA = alpha; vC = color; }`,
  fragmentShader: `varying float vA; varying vec3 vC;
    void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(vC, vA);
    #include <colorspace_fragment>
    }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
});
const parts = new THREE.Mesh(rbGeo, partMat); parts.frustumCulled = false; parts.renderOrder = 2;
scene.add(parts);
const pX = new Float32Array(NP);
for (let i = 0; i < NP; i++) pX[i] = X0 + (X1 - X0 + 3) * (((i / LANES.length | 0) + ((i % LANES.length) * 0.37) % 1) / PER);
const mtx = new THREE.Matrix4(), vS = new THREE.Vector3(), vP = new THREE.Vector3(), zAx = new THREE.Vector3(0, 0, 1);
const tP = Array.from({ length: TRAIL }, () => new THREE.Vector3());
const tg = new THREE.Vector3(), vw = new THREE.Vector3(), sd = new THREE.Vector3();
let frontFade = 1;
function updateParts(dt, colorLim) {
  const cam = camera.position;
  for (let i = 0; i < NP; i++) {
    const [z0, s] = LANES[i % LANES.length];
    const v = speedAt(pX[i], s);
    pX[i] += v * 1.1 * dt;
    if (pX[i] > X1 + 1.5) pX[i] -= (X1 - X0 + 3);
    const gap = 0.05 + 0.05 * v;                   // schnellere Luft = längere Marke
    for (let k = 0; k < TRAIL; k++) { const x = pX[i] - k * gap; tP[k].set(x, streamH(x, z0, s) * VS, z0); }
    for (let k = 0; k < TRAIL; k++) {
      const p = tP[k], n = (i * TRAIL + k) * 2;
      tg.subVectors(tP[Math.max(0, k - 1)], tP[Math.min(TRAIL - 1, k + 1)]).normalize();
      vw.subVectors(cam, p).normalize();
      const t = k / (TRAIL - 1), w = 0.075 * Math.pow(1 - t, 0.9);
      sd.crossVectors(tg, vw).normalize().multiplyScalar(w);
      rbPos[n * 3] = p.x + sd.x; rbPos[n * 3 + 1] = p.y + sd.y; rbPos[n * 3 + 2] = p.z + sd.z;
      rbPos[n * 3 + 3] = p.x - sd.x; rbPos[n * 3 + 4] = p.y - sd.y; rbPos[n * 3 + 5] = p.z - sd.z;
      const fade = sstep(p.x, X0, X0 + 0.8) * (1 - sstep(p.x, X1 - 0.8, X1));
      rbAlpha[n] = rbAlpha[n + 1] = Math.pow(1 - t, 1.2) * fade * 0.9 * (z0 > 0 ? frontFade : 1);
      if (p.x <= colorLim) tempColor(Tfield(p.x, p.y / VS), tmpC); else tmpC.copy(GREY);
      rbCol[n * 3] = rbCol[n * 3 + 3] = tmpC.r; rbCol[n * 3 + 1] = rbCol[n * 3 + 4] = tmpC.g; rbCol[n * 3 + 2] = rbCol[n * 3 + 5] = tmpC.b;
    }
  }
  rbGeo.attributes.position.needsUpdate = true; rbGeo.attributes.color.needsUpdate = true; rbGeo.attributes.alpha.needsUpdate = true;
}

// ---------- Stauwolke: über die ganze Tiefe des Modells. Im Querschnitt endet sie an der Schnittebene. ----------
function puffTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 18; i++) {
    const a = hash(i, 5) * 6.283, r = 25 * Math.sqrt(hash(i, 9)), x = 64 + Math.cos(a) * r, y = 66 + Math.sin(a) * r * 0.75, R = 20 + 18 * hash(i, 3);
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, 'rgba(255,255,255,.42)'); gr.addColorStop(0.55, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}
const NC = 1100;
const cloudGeo = new THREE.BufferGeometry();
const cPos = new Float32Array(NC * 3), cSize = new Float32Array(NC), cAlpha = new Float32Array(NC), cShade = new Float32Array(NC);
cloudGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
cloudGeo.setAttribute('size', new THREE.BufferAttribute(cSize, 1));
cloudGeo.setAttribute('alpha', new THREE.BufferAttribute(cAlpha, 1));
cloudGeo.setAttribute('shade', new THREE.BufferAttribute(cShade, 1));
const cloudMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: puffTex() }, scale: { value: 400 }, vis: { value: 0 }, uClipZ: clipU },
  vertexShader: `attribute float size; attribute float alpha; attribute float shade; varying float vA; varying float vS; uniform float scale; uniform float uClipZ;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv;
      vA = alpha * (1.0 - smoothstep(uClipZ - 1.3, uClipZ - 0.35, position.z)); vS = shade; }`,
  fragmentShader: `uniform sampler2D map; uniform float vis; varying float vA; varying float vS;
    void main(){ float a = texture2D(map, gl_PointCoord).a * vA * vis * 0.3; if (a < 0.003) discard;
      vec3 col = mix(vec3(0.44, 0.49, 0.57), vec3(0.97, 0.98, 1.0), vS) * (0.9 + 0.16 * (1.0 - gl_PointCoord.y));
      gl_FragColor = vec4(col, a); }`,
  transparent: true, depthWrite: false,
});
const clouds = new THREE.Points(cloudGeo, cloudMat); clouds.frustumCulled = false; clouds.renderOrder = 3;
scene.add(clouds);
const cX = new Float32Array(NC), cZ = new Float32Array(NC), cU = new Float32Array(NC), cR = new Float32Array(NC);
// Obergrenze (m): Über dem Kamm türmt sich die Stauwolke auf. Von der Leeseite sieht man sie als Wand: die Föhnmauer.
function cloudTop(x, z) { const xc = Math.min(x, 0); return Math.max(M.lcl + 350, ground(xc, z) + 650 + 650 * ridgeF(xc)); }
function seedCloud(i, anywhere) {
  const xa = xLcl - CLOUD_PRE;
  cX[i] = anywhere ? xa + Math.random() * (0.9 - xa) : xa - Math.random() * 0.5;
  cZ[i] = Z0 + 0.35 + Math.random() * (Z1 - Z0 - 0.7);
  cU[i] = Math.random(); cR[i] = Math.random();
}
function updateClouds(dt) {
  const xa = xLcl - CLOUD_PRE;
  for (let i = 0; i < NC; i++) {
    // Die Luft zieht durch die Wolke; am Kamm langsamer, damit die Wolkenwand dort dicht bleibt und stehen bleibt
    cX[i] += dt * 0.3 * (1 - 0.55 * ridgeF(Math.min(cX[i], 0)));
    if (cX[i] > 0.95) seedCloud(i, false);
    const x = cX[i], z = cZ[i], xc = Math.min(x, 0), g = ground(x, z), gc = ground(xc, z);
    const base = Math.max(M.lcl, gc + 40), top = cloudTop(x, z);
    const thin = 0.25 + 0.75 * sstep(xc, xa, xa + 2.6);              // zur Luvseite hin läuft die Wolke flach aus
    let h = base + cU[i] * (top - base) * thin, a = 1;
    if (x > 0) {
      // Lee: Die Luft sinkt ab und erwärmt sich sofort – die Wolke endet als scharfe Wand am Kamm.
      // Nur ein Saum quillt über den Kamm, sinkt am Hang ab und verdunstet wenige hundert Meter tiefer.
      const end = 0.18 + 0.7 * (1 - cU[i]);                           // untere Teile reichen weiter ins Lee
      h = Math.max(g + 50, h - (x / 0.9) * (300 + 900 * (1 - cU[i])));
      a = 1 - sstep(x, end * 0.35, end);
    }
    a *= sstep(x, xa, xa + 0.9) * (0.62 + 0.38 * sstep(x, -3.2, -0.5));   // am Kamm am dichtesten
    if (!M.cond || top <= base + 50) a = 0;
    if (gc > top - 50) a *= 0.2;
    cPos[i * 3] = x; cPos[i * 3 + 1] = h * VS; cPos[i * 3 + 2] = z;
    cSize[i] = 1.8 + cR[i] * 2.3;
    cAlpha[i] = a;
    cShade[i] = clamp(0.35 + cU[i] * 0.75, 0, 1);
  }
  cloudGeo.attributes.position.needsUpdate = true; cloudGeo.attributes.alpha.needsUpdate = true;
  cloudGeo.attributes.size.needsUpdate = true; cloudGeo.attributes.shade.needsUpdate = true;
}

// ---------- Niederschlag: überall unter der Stauwolke, vom Kondensationsniveau bis zum Pass.
//            Tropfen, wo die Luft über 0 °C hat; Flocken darunter. ----------
const NR = 900;
const rainMat = new THREE.MeshBasicMaterial({ color: 0x6ea3e6, transparent: true, opacity: 0, clippingPlanes: [clipPlane], toneMapped: false, depthWrite: false });
const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.032, 1, 0.032), rainMat, NR); rain.frustumCulled = false; rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
// Schneeflocken: sechsstrahlige, verästelte Kristalle mit weichem Rand. Sie fallen etwa sechsmal langsamer als Regentropfen,
// pendeln seitlich und drehen sich beim Fallen.
function flakeTex() {
  const c = document.createElement('canvas'), N = 128; c.width = c.height = N;
  const g = c.getContext('2d'), m = N / 2;
  const halo = g.createRadialGradient(m, m, 0, m, m, m * 0.62);
  halo.addColorStop(0, 'rgba(255,255,255,.55)'); halo.addColorStop(0.5, 'rgba(255,255,255,.18)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = halo; g.fillRect(0, 0, N, N);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 5;
  g.translate(m, m);
  for (let k = 0; k < 6; k++) {
    g.save(); g.rotate(k * Math.PI / 3);
    g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -m * 0.78); g.stroke();
    g.lineWidth = 4.5;
    for (const [t, l] of [[0.32, 0.26], [0.55, 0.2], [0.74, 0.12]]) {
      g.beginPath(); g.moveTo(0, -m * t); g.lineTo(m * l, -m * (t + l * 0.9)); g.moveTo(0, -m * t); g.lineTo(-m * l, -m * (t + l * 0.9)); g.stroke();
    }
    g.restore();
  }
  g.beginPath(); g.arc(0, 0, m * 0.12, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const snowGeo = new THREE.BufferGeometry();
const sPos = new Float32Array(NR * 3), sSize = new Float32Array(NR), sRot = new Float32Array(NR), sAlpha = new Float32Array(NR);
snowGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
snowGeo.setAttribute('size', new THREE.BufferAttribute(sSize, 1));
snowGeo.setAttribute('rot', new THREE.BufferAttribute(sRot, 1));
snowGeo.setAttribute('alpha', new THREE.BufferAttribute(sAlpha, 1));
const snowMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: flakeTex() }, scale: cloudMat.uniforms.scale, uOp: { value: 0 }, uClipZ: clipU },
  vertexShader: `attribute float size; attribute float rot; attribute float alpha; varying float vA; varying vec2 vR; uniform float scale; uniform float uClipZ;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(2.0, size * scale / -mv.z); gl_Position = projectionMatrix * mv;
      vA = alpha * step(position.z, uClipZ + 0.002); vR = vec2(cos(rot), sin(rot)); }`,
  fragmentShader: `uniform sampler2D map; uniform float uOp; varying float vA; varying vec2 vR;
    void main(){ vec2 p = gl_PointCoord - 0.5; p = vec2(vR.x * p.x - vR.y * p.y, vR.y * p.x + vR.x * p.y) + 0.5;
      float a = texture2D(map, p).a * vA * uOp; if (a < 0.02) discard;
      gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a); }`,
  transparent: true, depthWrite: false,
});
const snowM = new THREE.Points(snowGeo, snowMat); snowM.frustumCulled = false;
rain.renderOrder = snowM.renderOrder = 5;
scene.add(rain, snowM);
const rX = new Float32Array(NR), rZ = new Float32Array(NR), rH = new Float32Array(NR), rV = new Float32Array(NR), rPh = new Float32Array(NR), rSp = new Float32Array(NR);
let snowT = 0;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0), qR = new THREE.Quaternion().setFromAxisAngle(zAx, -0.18), qI = new THREE.Quaternion();
function seedRain(i) {
  const xa = RAIN_X0();
  rX[i] = xa + Math.random() * (RAIN_X1 - xa);
  rZ[i] = Z0 + 0.3 + Math.random() * (Z1 - Z0 - 0.6);
  rH[i] = Math.max(M.lcl, ground(rX[i], rZ[i])) + Math.random() * 600;
  rV[i] = 0.8 + Math.random() * 0.4;
  rPh[i] = Math.random() * 6.283; rSp[i] = (Math.random() - 0.5) * 3; sRot[i] = Math.random() * 6.283; sSize[i] = 0.13 + Math.random() * 0.13;
}
function updateRain(dt) {
  snowT += dt;
  for (let i = 0; i < NR; i++) {
    const z = rZ[i], snow = Tluv(M, rH[i]) < 0;       // Schnee nur dort, wo die Luft im Modell unter 0 °C hat
    rH[i] -= dt * (snow ? 380 : 2300) * rV[i];
    rX[i] += dt * (snow ? 0.3 : 0.15);
    const x = rX[i];
    if (!(rH[i] > ground(x, z)) || x > RAIN_X1 + 0.3 || !M.cond) { seedRain(i); rain.setMatrixAt(i, ZERO); sAlpha[i] = 0; continue; }
    if (snow) {
      rain.setMatrixAt(i, ZERO);
      const ph = rPh[i] + snowT * (1.4 + 0.5 * rV[i]);
      sPos[i * 3] = x + 0.07 * Math.sin(ph); sPos[i * 3 + 1] = rH[i] * VS; sPos[i * 3 + 2] = z + 0.05 * Math.cos(ph * 0.8);
      sRot[i] += dt * rSp[i]; sAlpha[i] = 0.95;
    } else { sAlpha[i] = 0; vP.set(x, rH[i] * VS, z); vS.set(1, 0.26, 1); mtx.compose(vP, qR, vS); rain.setMatrixAt(i, mtx); }
  }
  rain.instanceMatrix.needsUpdate = true;
  snowGeo.attributes.position.needsUpdate = true; snowGeo.attributes.rot.needsUpdate = true;
  snowGeo.attributes.alpha.needsUpdate = true; snowGeo.attributes.size.needsUpdate = true;
}

// ---------- Luftpaket (wird nach der Wolke gezeichnet und bleibt deshalb immer sichtbar) ----------
const parcel = new THREE.Group(); scene.add(parcel);
const parcelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.0, toneMapped: false, transparent: true });   // beleuchtet: wirkt räumlich
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 40, 20), parcelMat); ball.renderOrder = 8;
// dunkle Kontur: etwas größere Kugel, nur die Rückseite sichtbar
const ring = new THREE.Mesh(new THREE.SphereGeometry(0.43, 40, 20), new THREE.MeshBasicMaterial({ color: 0x0b1017, side: THREE.BackSide, toneMapped: false, transparent: true }));
ring.renderOrder = 7;
const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
const halo = new THREE.Mesh(new THREE.SphereGeometry(0.64, 24, 12), haloMat); halo.renderOrder = 9;
parcel.add(ball, halo, ring);
// Modellannahme sichtbar gemacht: Kondensat verlässt das Luftpaket als Tropfen
const ND = 10;
const dropMat = new THREE.MeshBasicMaterial({ color: 0x8fc0f5, toneMapped: false, transparent: true });
const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), dropMat, ND); drops.frustumCulled = false; drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
drops.renderOrder = 8;
scene.add(drops);
const dPos = Array.from({ length: ND }, () => new THREE.Vector3()), dLife = new Float32Array(ND);
let dNext = 0, dTimer = 0;
function updateDrops(dt, active) {
  dTimer -= dt;
  if (active && dTimer <= 0) {
    dTimer = 0.2;
    dPos[dNext].copy(parcel.position).add(vP.set((Math.random() - 0.5) * 0.4, -0.35, 0.05)); dLife[dNext] = 1; dNext = (dNext + 1) % ND;
  }
  for (let i = 0; i < ND; i++) {
    if (dLife[i] <= 0) { drops.setMatrixAt(i, ZERO); continue; }
    dLife[i] -= dt / 0.9; dPos[i].y -= dt * 1.5;
    const k = Math.max(0, dLife[i]);
    vS.set(k, k * 1.5, k); mtx.compose(dPos[i], qI, vS); drops.setMatrixAt(i, mtx);
  }
  drops.instanceMatrix.needsUpdate = true;
}
