(async function () {
'use strict';
const $ = s => document.querySelector(s);
const fmt = (v, d = 0) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const sgn = (v, d = 0) => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v), d);
const setLoad = (p, msg) => { $('#loadbar i').style.width = (p * 100).toFixed(0) + '%'; if (msg) $('#loadmsg').textContent = msg; };
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function b64bytes(b64) { const s = atob(b64), n = s.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = s.charCodeAt(i); return u; }
async function unz(b64) {
  const u = b64bytes(b64);
  if (typeof DecompressionStream === 'undefined') throw new Error('Dieser Browser kann die eingebetteten Daten nicht entpacken (DecompressionStream fehlt). Bitte einen aktuellen Browser verwenden.');
  return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
const f32 = async b => new Float32Array(await unz(b));

const D = DATA;
const nx = D.nx, ny = D.ny, NC = nx * ny, dxc = D.dx, nxh = D.nxh, nyh = D.nyh, dxh = D.dxh;
const W = nx * dxc, Hm = ny * dxc;
const ZOFF = 1500;

// ---------------- decode data ----------------
let B, rad, slopeDeg, base, hefMask, aval, tbx, ST = {};
try {
  setLoad(0.05);
  B = await f32(D.B); rad = await f32(D.rad); slopeDeg = await f32(D.slope);
  setLoad(0.2, 'Höhenmodell (25 m) wird aufgebaut …');
  const bu = new Uint16Array(await unz(D.base)); base = new Float32Array(bu.length);
  for (let i = 0; i < bu.length; i++) base[i] = bu[i] / 8 + 1000;
  hefMask = new Uint8Array(await unz(D.hef));
  aval = new Int32Array(await unz(D.aval)); tbx = await f32(D.tbx);
  setLoad(0.35, 'Vorgerechnete Gletscherstände 1850 und 2003 …');
  for (const k of ['s1850', 's2003']) {
    ST[k] = { year: D[k].year };
    for (const f of ['H', 'M', 'D', 'firn', 'tfree']) ST[k][f] = await f32(D[k][f]);
  }
} catch (e) { $('#loadmsg').textContent = e.message; return; }

const Tall = new Float32Array(D.T), Pall = new Float32Array(D.Pr), HY0 = D.hy0, NY = Tall.length / 12;
function climMean(y0, y1) {
  const T = new Float64Array(12), P = new Float64Array(12); let n = 0;
  for (let y = y0; y <= y1; y++) { const o = (y - HY0) * 12; for (let m = 0; m < 12; m++) { T[m] += Tall[o + m]; P[m] += Pall[o + m]; } n++; }
  for (let m = 0; m < 12; m++) { T[m] /= n; P[m] /= n; }
  return { T, P };
}
const CLIM_REF = climMean(1961, 1990), CLIM_LATE = climMean(1974, 2003);
const Pref = CLIM_REF.P.reduce((a, b) => a + b, 0);
$('#pBase').textContent = 'Basis ' + fmt(Math.round(Pref * D.par.pf / 10) * 10) + ' mm in 3160 m';

// ---------------- renderer ----------------
setLoad(0.45, 'Grafik wird vorbereitet …');
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
if (!renderer.capabilities.isWebGL2) { $('#loadmsg').textContent = 'Für dieses Modell wird WebGL 2 benötigt. Bitte einen aktuellen Browser verwenden.'; return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 30, 120000);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 600; controls.maxDistance = 60000; controls.screenSpacePanning = false;

function dataTex(arr, w, h, fmtT) {
  const t = new THREE.DataTexture(arr, w, h, fmtT, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
}
const texBase = dataTex(base, nxh, nyh, THREE.RedFormat);
const aA = new Float32Array(NC * 4), aB = new Float32Array(NC * 4), aC = new Float32Array(NC * 4);
const texA = dataTex(aA, nx, ny, THREE.RGBAFormat), texB = dataTex(aB, nx, ny, THREE.RGBAFormat), texC = dataTex(aC, nx, ny, THREE.RGBAFormat);
const aE = new Float32Array(NC * 4), texE = dataTex(aE, nx, ny, THREE.RGBAFormat);
const ortho = await new Promise((res, rej) => new THREE.TextureLoader().load(D.ortho, res, undefined, rej));
ortho.anisotropy = renderer.capabilities.getMaxAnisotropy(); ortho.minFilter = THREE.LinearMipmapLinearFilter; ortho.generateMipmaps = true;
setLoad(0.6);

// ---------------- shaders ----------------
const COMMON = `
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D tBase; uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tC;
uniform vec2 cN; uniform vec2 hN; uniform float dxc; uniform float dxh; uniform float exag; uniform float zoff;
vec4 fA(ivec2 p){ return texelFetch(tA, clamp(p, ivec2(0), ivec2(cN)-1), 0); }
void sampleA(vec2 w, out float Bc, out float Mc, out float Hc, out float Dc){
  vec2 g = w/dxc - 0.5; vec2 fl = floor(g); ivec2 i = ivec2(fl); vec2 f = g - fl;
  vec4 a=fA(i), b=fA(i+ivec2(1,0)), c=fA(i+ivec2(0,1)), d=fA(i+ivec2(1,1));
  vec4 m = mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  Bc=m.x; Mc=m.y; Dc=m.w;
  float sh = mix(mix(sqrt(max(a.z,0.0)),sqrt(max(b.z,0.0)),f.x), mix(sqrt(max(c.z,0.0)),sqrt(max(d.z,0.0)),f.x), f.y);
  Hc = sh*sh;
}
vec4 bilin(sampler2D t, vec2 w){
  vec2 g = w/dxc - 0.5; vec2 fl = floor(g); ivec2 i = ivec2(fl); vec2 f = g - fl; ivec2 mx = ivec2(cN)-1;
  vec4 a=texelFetch(t,clamp(i,ivec2(0),mx),0), b=texelFetch(t,clamp(i+ivec2(1,0),ivec2(0),mx),0);
  vec4 c=texelFetch(t,clamp(i+ivec2(0,1),ivec2(0),mx),0), d=texelFetch(t,clamp(i+ivec2(1,1),ivec2(0),mx),0);
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float baseAt(ivec2 p){ return texelFetch(tBase, clamp(p, ivec2(0), ivec2(hN)-1), 0).r; }
// Ice surface: smooth (quadratic B-spline) surface built only from ice-covered model cells,
// intersected with the fine 25 m bed. Margins therefore follow the real valley walls and the
// cross-profile stays smooth instead of riding up the slopes. Hc returns the local ice thickness.
float surfAt(ivec2 p, out float bse, out float Mc, out float Hc, out float Dc){
  p = clamp(p, ivec2(0), ivec2(hN)-1);
  vec2 w = (vec2(p)+0.5)*dxh; float Bc;
  sampleA(w, Bc, Mc, Hc, Dc);
  bse = baseAt(p);
  float bed = bse + Mc;
  vec2 g = w/dxc - 0.5; vec2 cc = floor(g+0.5); vec2 t = g - cc; ivec2 ic = ivec2(cc);
  vec3 wx = vec3(0.5*(0.5-t.x)*(0.5-t.x), 0.75-t.x*t.x, 0.5*(0.5+t.x)*(0.5+t.x));
  vec3 wy = vec3(0.5*(0.5-t.y)*(0.5-t.y), 0.75-t.y*t.y, 0.5*(0.5+t.y)*(0.5+t.y));
  float ws = 0.0, ss = 0.0;
  for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec4 a = fA(ic+ivec2(i-1,j-1));
    float wgt = wx[i]*wy[j]*step(1.0, a.z);
    ws += wgt; ss += wgt*(a.x+a.y+a.z);
  }
  float th = 0.0;
  if(ws > 1e-4) th = clamp(ss/ws - bed, 0.0, Hc*1.25 + 3.0) * smoothstep(0.3, 2.5, Hc);
  Hc = th;
  return bed + th;
}
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(11.7,3.1); a*=0.5; } return s; }
vec3 lin(vec3 c){ return c*c*(c*0.305+0.683)+c*0.0125; }
`;

const TERRAIN_VS = COMMON + `
attribute vec2 cell; uniform float stride; uniform float layer; uniform float lift;
varying vec3 vW; varying vec3 vN; varying float vAlt; varying vec2 vUv; varying float vTh;
// layer 0: rock bed + moraines, 1: ice surface, 2: ice base (underside of the glacier)
float zLayer(ivec2 p){
  float b,m,h,d; float z = surfAt(p,b,m,h,d);
  if(layer < 0.5) return b + m;
  if(layer < 1.5) return z;
  return b + m;
}
void main(){
  ivec2 p = ivec2(cell); int s = int(stride);
  float b0,m0,h0,d0; surfAt(p,b0,m0,h0,d0); vTh = h0;
  float z = zLayer(p);
  float zx1 = zLayer(p+ivec2(s,0)), zx0 = zLayer(p-ivec2(s,0));
  float zy1 = zLayer(p+ivec2(0,s)), zy0 = zLayer(p-ivec2(0,s));
  float k = exag/(2.0*float(s)*dxh);
  vN = normalize(vec3(-(zx1-zx0)*k, 1.0, -(zy1-zy0)*k));
  if(layer > 1.5) vN = -vN;
  float lf = layer > 0.5 ? lift : 0.0;
  vec3 wp = vec3((cell.x+0.5)*dxh, (z-zoff)*exag + lf, (cell.y+0.5)*dxh);
  vW = wp; vAlt = z; vUv = (cell+0.5)/hN;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp,1.0);
}`;

const TERRAIN_FS = COMMON + `
uniform sampler2D tOrtho; uniform sampler2D shadowTex; uniform mat4 lightVP; uniform float shadowOn; uniform vec2 shadowTexel;
uniform vec3 sunDir; uniform vec3 sunCol; uniform vec3 skyCol; uniform vec3 gndCol; uniform vec3 hazeCol; uniform float fogD;
uniform float ela; uniform float showEla; uniform float showMB; uniform vec4 clip; uniform float debK;
varying vec3 vW; varying vec3 vN; varying float vAlt; varying vec2 vUv; varying float vTh;
float shadowAt(vec3 w){
  vec4 p = lightVP*vec4(w,1.0); vec3 q = p.xyz/p.w*0.5+0.5;
  if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0) return 1.0;
  float s=0.0;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){
    float d = texture2D(shadowTex, q.xy+vec2(float(x),float(y))*shadowTexel).r;
    s += (q.z-0.0012 > d) ? 0.0 : 1.0;
  }
  return s/9.0;
}
void main(){
  if(clip.w>0.5 && dot(vW.xz, clip.xy)+clip.z > 0.0) discard;
  vec3 N = normalize(vN);
  float Bc,M,H,Dc; sampleA(vW.xz, Bc,M,H,Dc);
  vec4 sb = bilin(tB, vW.xz); float snow=max(sb.x,0.0), firn=max(sb.y,0.0), freshV=sb.z, bann=sb.w;
  vec4 scv = bilin(tC, vW.xz); vec2 us = scv.xy; float morAge = scv.z;
  float tanS = length(N.xz)/max(N.y,1e-3)/exag;
  vec3 col = lin(texture2D(tOrtho, vUv).rgb);
  float n1 = fbm(vW.xz/38.0), n2 = fbm(vW.xz/11.0+17.0), n3 = vnoise(vW.xz/6.0), n4 = fbm(vW.xz/140.0+3.0);
  // glacier forefield: freshly exposed till, vegetation returns over centuries
  vec3 till = mix(lin(vec3(0.47,0.46,0.44)), lin(vec3(0.60,0.58,0.54)), n2)*(0.85+0.25*n3);
  float chan = smoothstep(0.62,0.7,fbm(vec2(dot(vW.xz,vec2(0.92,-0.38))/90.0, dot(vW.xz,vec2(0.38,0.92))/14.0)));
  till = mix(till, lin(vec3(0.66,0.70,0.70)), chan*0.5);
  col = mix(col, till, clamp(freshV,0.0,1.0)*0.85);
  float mor = smoothstep(0.5, 4.0, M + (n2-0.5)*1.5);
  vec3 morC = lin(vec3(0.68,0.64,0.58))*(0.82+0.3*n3) * (1.0 - 0.25*smoothstep(0.72,0.8,vnoise(vW.xz/3.5)));
  col = mix(col, morC, mor*mix(0.35, 0.8, clamp(morAge,0.0,1.0)));
  // bed under the ice: glacially polished rock and till (visible when the ice body is lifted)
  float underIce = smoothstep(0.3, 1.2, vTh);
  vec3 bedC = mix(lin(vec3(0.44,0.43,0.42)), lin(vec3(0.58,0.57,0.55)), n2)*(0.85+0.2*n3);
  bedC *= 0.9 + 0.1*sin(dot(vW.xz, vec2(0.6,0.8))/4.0 + n1*8.0);
  col = mix(col, bedC, underIce);
  float iceCov = 0.0;
  // firn (old snow surviving the summer)
  float fc = smoothstep(0.30, 1.1, firn + (n1-0.5)*0.45 + (n2-0.5)*0.15)*smoothstep(0.8,2.2,firn+(n2-0.5)*0.6)*(1.0-underIce);
  col = mix(col, lin(vec3(0.80,0.79,0.74))*(0.93+0.1*n2), fc);
  // seasonal snow
  float steep = smoothstep(0.85, 1.4, tanS);
  float sc = smoothstep(0.0, 1.0, snow*24.0 - 0.25 + (n1-0.5)*1.1 + (n2-0.5)*0.5 + (n4-0.5)*0.6)*(1.0-0.8*steep)*(1.0-underIce);
  col = mix(col, lin(vec3(0.95,0.97,0.99)), sc);
  if(showMB>9.0){
    vec3 mbc = bann>0.0 ? mix(vec3(0.8,0.88,1.0), vec3(0.08,0.32,0.85), smoothstep(0.0,1.6,bann))
                        : mix(vec3(1.0,0.9,0.85), vec3(0.85,0.12,0.08), smoothstep(0.0,5.0,-bann));
    col = mix(col, lin(mbc), 0.7*max(iceCov, fc*step(0.5,H))*step(0.005, abs(bann)));
  }
  float ndl = max(dot(N, sunDir), 0.0);
  float sh = shadowOn>0.5 ? shadowAt(vW) : 1.0;
  vec3 amb = mix(gndCol, skyCol, N.y*0.5+0.5);
  vec3 lit = col*(sunCol*ndl*sh + amb);
  vec3 V = normalize(cameraPosition - vW); vec3 Hh = normalize(V+sunDir);
  float wet = iceCov*(1.0-sc)*(1.0-fc);
  lit += sunCol*pow(max(dot(N,Hh),0.0), 70.0)*(0.18*sc + 0.4*wet)*sh;
  if(showEla>0.5){
    float w = fwidth(vAlt)*1.7 + 2.5;
    float line = 1.0 - smoothstep(w*0.45, w, abs(vAlt-ela));
    float onG = max(iceCov, fc);
    float dash = step(0.45, fract((vW.x+vW.z)/140.0));
    lit = mix(lit, vec3(1.0,0.10,0.06), line*mix(0.35*dash, 1.0, onG));
  }
  float dist = length(cameraPosition - vW);
  lit = mix(lit, hazeCol, (1.0-exp(-dist*fogD))*0.5);
  vec3 x = max(vec3(0.0), lit-0.004);
  gl_FragColor = vec4((x*(6.2*x+0.5))/(x*(6.2*x+1.7)+0.06), 1.0);
}`;


const ICE_FS = COMMON + `
uniform sampler2D shadowTex; uniform mat4 lightVP; uniform float shadowOn; uniform vec2 shadowTexel;
uniform vec3 sunDir; uniform vec3 sunCol; uniform vec3 skyCol; uniform vec3 gndCol; uniform vec3 hazeCol; uniform float fogD;
uniform float ela; uniform float showEla; uniform float showMB; uniform vec4 clip; uniform float debK; uniform float layer; uniform float iceMode; uniform float lift; uniform sampler2D tE;
// Crevasse fields. The ice is split into irregular patches (~150 m, jittered Voronoi cells).
// Each patch takes the extension direction d of the model's strain-rate field at its centre and
// gets a family of parallel, slightly arched fractures perpendicular to d. Spacing shrinks and
// width grows with the tensile strain rate k. Returns core (open slit) and lip (rim) masks.
float crevField(vec2 p, out float lip, out float kk){
  const float CS = 150.0;
  vec2 cb = floor(p/CS); float dmin = 1e9; vec2 site = vec2(0.0); vec2 sid = vec2(0.0);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 c = cb + vec2(float(i), float(j));
    vec2 sp = (c + 0.2 + 0.6*vec2(hash(c), hash(c+31.7)))*CS;
    float dd = dot(p-sp, p-sp);
    if(dd < dmin){ dmin = dd; site = sp; sid = c; }
  }
  vec4 ev = bilin(tE, site);
  float k = smoothstep(0.012, 0.06, ev.x);
  kk = k; lip = 0.0;
  if(k < 0.02) return 0.0;
  float th = 0.5*atan(ev.z, ev.y) + (hash(sid+5.1)-0.5)*0.25;
  vec2 d = vec2(cos(th), sin(th)), t = vec2(-d.y, d.x);
  vec2 q = p - site;
  float u = dot(q, t), v = dot(q, d);
  v += (hash(sid+2.3)-0.5) * u*u / 260.0;                 // arched fractures
  float spc = mix(46.0, 20.0, k);
  float row = floor(v/spc + 0.5);
  float fv = v - row*spc;
  float r1 = hash(vec2(row, 3.7) + sid), r2 = hash(vec2(row, 9.1) + sid);
  float seg = mix(90.0, 220.0, r1);
  float uu = u + r2*seg;
  float si = floor(uu/seg); float fu = uu/seg - si;
  float on = step(hash(vec2(si, row) + sid*1.7), 0.35 + 0.6*k);
  float e = sin(3.14159*clamp((fu-0.06)/0.88, 0.0, 1.0));
  float w = (1.8 + 6.0*k*(0.5+r1)) * e;
  fv += sin(u/17.0 + r2*6.3)*1.2;
  float fw = fwidth(v)*0.9 + 0.05;
  float core = 1.0 - smoothstep(w*0.5 - fw, w*0.5 + fw, abs(fv));
  lip = (1.0 - smoothstep(w*0.5, w*0.5 + 1.5 + fw, abs(fv))) * on * step(0.1, w);
  return core * on * step(0.1, w);
}
varying vec3 vW; varying vec3 vN; varying float vAlt; varying vec2 vUv; varying float vTh;
float shadowAt(vec3 w){
  vec4 p = lightVP*vec4(w,1.0); vec3 q = p.xyz/p.w*0.5+0.5;
  if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0) return 1.0;
  float s=0.0;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){
    float d = texture2D(shadowTex, q.xy+vec2(float(x),float(y))*shadowTexel).r;
    s += (q.z-0.0012 > d) ? 0.0 : 1.0;
  }
  return s/9.0;
}
vec3 thickRamp(float h){
  float t = clamp(h/320.0, 0.0, 1.0);
  vec3 c0 = vec3(0.68,0.87,0.97), c1 = vec3(0.38,0.69,0.91), c2 = vec3(0.12,0.40,0.75), c3 = vec3(0.04,0.15,0.42);
  return t < 0.33 ? mix(c0,c1,t/0.33) : (t < 0.66 ? mix(c1,c2,(t-0.33)/0.33) : mix(c2,c3,(t-0.66)/0.34));
}
void main(){
  if(clip.w>0.5 && dot(vW.xz, clip.xy)+clip.z > 0.0) discard;
  float Bc,M,H,Dc; sampleA(vW.xz, Bc,M,H,Dc);
  float n1 = fbm(vW.xz/38.0), n2 = fbm(vW.xz/11.0+17.0), n3 = vnoise(vW.xz/6.0), n4 = fbm(vW.xz/140.0+3.0);
  float Hs = H; H = vTh;
  if(H < 0.6 + (n2-0.5)*0.8) discard;
  vec3 N = normalize(vN);
  vec4 sb = bilin(tB, vW.xz); float snow=max(sb.x,0.0), firn=max(sb.y,0.0), bann=sb.w;
  vec2 us = bilin(tC, vW.xz).xy;
  float sp = length(us); vec2 fd = sp>0.3 ? us/sp : vec2(1.0,0.0);
  float along = dot(vW.xz, fd), across = dot(vW.xz, vec2(-fd.y, fd.x));
  vec3 V = normalize(cameraPosition - vW);
  vec3 col; float sc = 0.0, fc = 0.0, crev = 0.0, lip = 0.0;
  if(layer > 1.5){
    col = mix(lin(vec3(0.20,0.40,0.55)), lin(vec3(0.36,0.34,0.31)), 0.35+0.4*n2);
  } else {
    float tanS = length(N.xz)/max(N.y,1e-3)/exag;
    // strain-rate field -> crevasses
    float kk; crev = crevField(vW.xz, lip, kk);
    float thk = smoothstep(8.0, 30.0, H);
    float distFade = 1.0 - smoothstep(9000.0, 20000.0, length(cameraPosition - vW));
    crev *= thk*distFade; lip *= thk*distFade;
    // bare glacier ice: blue-grey with foliation, dirt cones and cryoconite
    vec3 iceC = mix(lin(vec3(0.44,0.53,0.59)), lin(vec3(0.58,0.66,0.71)), n4);
    float fol = 0.5+0.5*sin(across/6.5 + n1*7.0 + n3*1.5);
    float ogive = 0.5+0.5*sin(along/90.0 + n1*2.5);
    iceC *= 0.86 + 0.10*fol + 0.08*ogive*smoothstep(0.0,-1.5,bann) + 0.12*(n2-0.5);
    iceC = mix(iceC, lin(vec3(0.38,0.37,0.35)), smoothstep(0.82,0.9,vnoise(vW.xz/1.7))*0.35);
    float conc = Dc/max(Hs,1.0);
    float deb = clamp(conc*debK*(0.15+smoothstep(0.0, -2.5, bann)), 0.0, 1.0);
    deb = smoothstep(0.15, 0.85, deb + (n2-0.5)*0.35)*step(0.02, conc*debK);
    iceC = mix(iceC, lin(vec3(0.46,0.42,0.38))*(0.75+0.5*n3), deb);
    fc = smoothstep(0.30, 1.1, firn + (n1-0.5)*0.45 + (n2-0.5)*0.15);
    float steep = smoothstep(0.85, 1.4, tanS);
    sc = smoothstep(0.0, 1.0, snow*24.0 - 0.25 + (n1-0.5)*1.1 + (n2-0.5)*0.5 + (n4-0.5)*0.6)*(1.0-0.8*steep);
    if(iceMode > 0.5){
      col = lin(thickRamp(H)) * (0.93 + 0.08*fol);
      col = mix(col, lin(vec3(0.95,0.97,0.99)), sc*0.25);
    } else {
      vec3 firnC = lin(vec3(0.82,0.81,0.77))*(0.93+0.1*n2);
      col = mix(iceC, firnC, fc);
      col = mix(col, lin(vec3(0.95,0.97,0.99)), sc);
    }
    // crevasses: bright blue lips, deep blue-black core; snow bridges soften them in winter
    float bridge = clamp(sc*0.75 + fc*0.12, 0.0, 0.85);
    col = mix(col, lin(vec3(0.62,0.80,0.88)), (lip-crev)*(1.0-bridge)*0.35);
    col = mix(col, lin(vec3(0.02,0.07,0.13)), crev*(1.0-bridge*0.8));
    if(showMB>0.5 && abs(bann)>0.005){
      vec3 mbc = bann>0.0 ? mix(vec3(0.8,0.88,1.0), vec3(0.08,0.32,0.85), smoothstep(0.0,1.6,bann))
                          : mix(vec3(1.0,0.9,0.85), vec3(0.85,0.12,0.08), smoothstep(0.0,5.0,-bann));
      col = mix(col, lin(mbc), 0.75);
    }
    // glacier margin: thin dark rim so the ice body reads as its own object
    float rim = 1.0 - smoothstep(0.6, 4.0, H + (n2-0.5)*1.5);
    col = mix(col, lin(vec3(0.20,0.30,0.36)), rim*0.55);
  }
  float ndl = max(dot(N, sunDir), 0.0);
  float sh = (shadowOn>0.5 && layer < 1.5) ? shadowAt(vW) : 1.0;
  vec3 amb = mix(gndCol, skyCol, N.y*0.5+0.5);
  vec3 lit = col*(sunCol*ndl*sh*(1.0-0.85*crev) + amb*1.15);
  vec3 Hh = normalize(V+sunDir);
  lit += sunCol*pow(max(dot(N,Hh),0.0), 70.0)*(0.18*sc + 0.45*(1.0-sc)*(1.0-fc))*sh*(1.0-crev);
  // icy fresnel glow at grazing angles
  float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  lit += lin(vec3(0.55,0.78,0.95))*fr*0.35;
  if(showEla>0.5 && layer < 1.5){
    float w = fwidth(vAlt)*1.7 + 2.5;
    float line = 1.0 - smoothstep(w*0.45, w, abs(vAlt-ela));
    lit = mix(lit, vec3(1.0,0.10,0.06), line);
  }
  float dist = length(cameraPosition - vW);
  lit = mix(lit, hazeCol, (1.0-exp(-dist*fogD))*0.5);
  vec3 x = max(vec3(0.0), lit-0.004);
  gl_FragColor = vec4((x*(6.2*x+0.5))/(x*(6.2*x+1.7)+0.06), 1.0);
}`;
const DEPTH_FS = `precision highp float; precision highp sampler2D; uniform vec4 clip; uniform float layer; uniform sampler2D tA; uniform vec2 cN; uniform float dxc; varying vec3 vW;
void main(){ if(clip.w>0.5 && dot(vW.xz, clip.xy)+clip.z > 0.0) discard;
  if(layer > 0.5){ vec2 g = vW.xz/dxc - 0.5; vec2 fl = floor(g); ivec2 i = ivec2(fl); vec2 f = g - fl; ivec2 mx = ivec2(cN)-1;
    float a = sqrt(max(texelFetch(tA, clamp(i,ivec2(0),mx),0).z,0.0)), b = sqrt(max(texelFetch(tA, clamp(i+ivec2(1,0),ivec2(0),mx),0).z,0.0));
    float c = sqrt(max(texelFetch(tA, clamp(i+ivec2(0,1),ivec2(0),mx),0).z,0.0)), d = sqrt(max(texelFetch(tA, clamp(i+ivec2(1,1),ivec2(0),mx),0).z,0.0));
    float h = mix(mix(a,b,f.x), mix(c,d,f.x), f.y); if(h*h < 0.9) discard; }
  gl_FragColor = vec4(1.0); }`;

const WALL_VS = COMMON + `
attribute vec2 hp; attribute float top; uniform float bottomAlt;
varying vec3 vW; varying float vAlt; varying float vSurf; varying float vBase; varying float vMor; varying float vFirn; varying float vSnow; varying float vH; varying float vAlong;
void main(){
  ivec2 p = ivec2(floor(hp));
  float b,m,h,d; float z = surfAt(p,b,m,h,d);
  vec2 xz = hp*dxh;
  vec4 sb = bilin(tB, xz);
  float alt = top>0.5 ? z : bottomAlt;
  vW = vec3(xz.x, (alt-zoff)*exag, xz.y);
  vAlt = alt; vSurf = z; vBase = b; vMor = b+m; vH = h;
  vFirn = max(sb.y,0.0)/0.6; vSnow = max(sb.x,0.0)/0.3; vAlong = xz.x + xz.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.0);
}`;
const WALL_FS = COMMON + `
uniform float ela; uniform float showEla; uniform vec3 hazeCol; uniform float fogD; uniform float layerExag;
varying vec3 vW; varying float vAlt; varying float vSurf; varying float vBase; varying float vMor; varying float vFirn; varying float vSnow; varying float vH; varying float vAlong;
void main(){
  float a = vAlt; vec3 c;
  float n = fbm(vec2(vAlong/40.0, a/12.0));
  if(a < vBase){
    float band = 0.5+0.5*sin(a/17.0 + vAlong/260.0 + n*4.0);
    c = mix(lin(vec3(0.42,0.38,0.34)), lin(vec3(0.55,0.50,0.45)), band*0.6+n*0.3);
    c *= 0.7 + 0.3*smoothstep(-500.0, 0.0, a-vBase);
  } else if(a < vMor || vH < 0.5){
    c = lin(vec3(0.62,0.58,0.52))*(0.75+0.4*vnoise(vec2(vAlong, a)/3.0));
  } else {
    float th = max(vSurf - vMor, 1.0);
    float zeta = clamp((a - vMor)/th, 0.0, 1.0);
    c = mix(lin(vec3(0.17,0.42,0.62)), lin(vec3(0.62,0.82,0.92)), pow(zeta,0.8));
    float lay = 1.0 - smoothstep(0.0, 0.04, abs(fract(zeta*5.0+0.5)-0.5));
    c = mix(c, lin(vec3(0.85,0.95,1.0)), lay*0.18);
    c = mix(c, lin(vec3(0.35,0.33,0.31)), (1.0-smoothstep(0.0,0.07,zeta))*0.6);
    if(a > vSurf - vFirn*layerExag) c = lin(vec3(0.88,0.86,0.80))*(0.92+0.1*n);
  }
  if(a > vSurf - vSnow*layerExag && vSnow > 0.05) c = lin(vec3(0.96,0.97,0.99));
  if(showEla>0.5){
    float w = fwidth(a)*1.5+1.5;
    float l = (1.0 - smoothstep(w*0.5, w, abs(a-ela)))*step(0.5, fract(vAlong/90.0));
    c = mix(c, vec3(1.0,0.1,0.06), l);
  }
  vec3 lit = c*1.05;
  float dist = length(cameraPosition - vW);
  lit = mix(lit, hazeCol, (1.0-exp(-dist*fogD))*0.7);
  vec3 x = max(vec3(0.0), lit-0.004);
  gl_FragColor = vec4((x*(6.2*x+0.5))/(x*(6.2*x+1.7)+0.06), 1.0);
}`;

const common = {
  tBase: { value: texBase }, tA: { value: texA }, tB: { value: texB }, tC: { value: texC },
  cN: { value: new THREE.Vector2(nx, ny) }, hN: { value: new THREE.Vector2(nxh, nyh) },
  dxc: { value: dxc }, dxh: { value: dxh }, exag: { value: 1 }, zoff: { value: ZOFF },
  clip: { value: new THREE.Vector4(0, 0, 0, 0) }
};
const U = Object.assign({}, common, {
  tOrtho: { value: ortho }, stride: { value: 1 },
  shadowTex: { value: null }, lightVP: { value: new THREE.Matrix4() }, shadowOn: { value: 1 }, shadowTexel: { value: new THREE.Vector2() },
  sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, skyCol: { value: new THREE.Color() }, gndCol: { value: new THREE.Color() },
  hazeCol: { value: new THREE.Color() }, fogD: { value: 1 / 75000 },
  ela: { value: 3000 }, showEla: { value: 1 }, showMB: { value: 0 }, debK: { value: 600 }, tE: { value: texE }
});
U.layer = { value: 0 }; U.lift = { value: 0 }; U.iceMode = { value: 1 };
const UIce = Object.assign({}, U, { layer: { value: 1 } }), UBase = Object.assign({}, U, { layer: { value: 2 } });
const terrainMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: TERRAIN_VS, fragmentShader: TERRAIN_FS, extensions: { derivatives: true } });
const iceMat = new THREE.ShaderMaterial({ uniforms: UIce, vertexShader: TERRAIN_VS, fragmentShader: ICE_FS, extensions: { derivatives: true }, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
const baseMat = new THREE.ShaderMaterial({ uniforms: UBase, vertexShader: TERRAIN_VS, fragmentShader: ICE_FS, extensions: { derivatives: true }, side: THREE.BackSide });
const depthMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: TERRAIN_VS, fragmentShader: DEPTH_FS });
const depthIceMat = new THREE.ShaderMaterial({ uniforms: UIce, vertexShader: TERRAIN_VS, fragmentShader: DEPTH_FS });
const UW = Object.assign({}, common, { bottomAlt: { value: 1300 }, ela: U.ela, showEla: U.showEla, hazeCol: U.hazeCol, fogD: U.fogD, layerExag: { value: 3 } });
const wallMat = new THREE.ShaderMaterial({ uniforms: UW, vertexShader: WALL_VS, fragmentShader: WALL_FS, side: THREE.DoubleSide, extensions: { derivatives: true } });

// terrain mesh (grid of hi-res texel centres)
let terrain = null, iceTop = null, iceBase = null;
function buildTerrain(stride) {
  if (terrain) { scene.remove(terrain); scene.remove(iceTop); scene.remove(iceBase); terrain.geometry.dispose(); }
  const cx = Math.floor((nxh - 1) / stride) + 1, cy = Math.floor((nyh - 1) / stride) + 1;
  const cell = new Float32Array(cx * cy * 2), pos = new Float32Array(cx * cy * 3);
  let k = 0;
  for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    const ii = Math.min(i * stride, nxh - 1), jj = Math.min(j * stride, nyh - 1);
    cell[k * 2] = ii; cell[k * 2 + 1] = jj; pos[k * 3] = ii * dxh; pos[k * 3 + 2] = jj * dxh; k++;
  }
  const idx = new Uint32Array((cx - 1) * (cy - 1) * 6); k = 0;
  for (let j = 0; j < cy - 1; j++) for (let i = 0; i < cx - 1; i++) {
    const a = j * cx + i, b = a + 1, c = a + cx, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('cell', new THREE.BufferAttribute(cell, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  terrain = new THREE.Mesh(g, terrainMat); terrain.frustumCulled = false;
  iceTop = new THREE.Mesh(g, iceMat); iceTop.frustumCulled = false; iceTop.renderOrder = 1;
  iceBase = new THREE.Mesh(g, baseMat); iceBase.frustumCulled = false; iceBase.visible = false;
  scene.add(terrain); scene.add(iceTop); scene.add(iceBase);
  U.stride.value = stride;
}
const coarseTouch = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900;
let quality = coarseTouch ? 2 : 1;
buildTerrain(quality);
document.querySelectorAll('#quality button').forEach(b => b.classList.toggle('on', +b.dataset.q === quality));

// walls: block sides + optional section
function wallGeom(pts) { // pts: array of [hx,hy] hi-res texel coords (continuous)
  const n = pts.length, hp = new Float32Array(n * 4), top = new Float32Array(n * 2), pos = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) {
    for (let t = 0; t < 2; t++) {
      const k = i * 2 + t; hp[k * 2] = pts[i][0]; hp[k * 2 + 1] = pts[i][1]; top[k] = t;
      pos[k * 3] = pts[i][0] * dxh; pos[k * 3 + 2] = pts[i][1] * dxh;
    }
  }
  const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('hp', new THREE.BufferAttribute(hp, 2)); g.setAttribute('top', new THREE.BufferAttribute(top, 1));
  g.setIndex(idx); return g;
}
const sides = new THREE.Group(); scene.add(sides);
{
  const e = 0.5, X = nxh - 0.5, Y = nyh - 0.5, L = [];
  const seg = (a, b, n) => { const p = []; for (let i = 0; i <= n; i++) p.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return p; };
  for (const [a, b, n] of [[[e, e], [X, e], nxh], [[X, e], [X, Y], nyh], [[X, Y], [e, Y], nxh], [[e, Y], [e, e], nyh]]) {
    const m = new THREE.Mesh(wallGeom(seg(a, b, n)), wallMat); m.frustumCulled = false; sides.add(m);
  }
  // bottom plate
  const bg = new THREE.PlaneGeometry(W, Hm); bg.rotateX(Math.PI / 2); bg.translate(W / 2, 1300 - ZOFF, Hm / 2);
  const bm = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0x2b2622, side: THREE.DoubleSide }));
  bm.name = 'bottom'; sides.add(bm);
}
let cutMesh = null;

// ---------------- shadows ----------------
const SHS = 4096;
const shadowRT = new THREE.WebGLRenderTarget(SHS, SHS, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
shadowRT.depthTexture = new THREE.DepthTexture(SHS, SHS); shadowRT.depthTexture.type = THREE.UnsignedIntType;
shadowRT.depthTexture.minFilter = shadowRT.depthTexture.magFilter = THREE.NearestFilter;
U.shadowTex.value = shadowRT.depthTexture; U.shadowTexel.value.set(1 / SHS, 1 / SHS);
const R = Math.hypot(W, Hm) / 2 + 500;
const lightCam = new THREE.OrthographicCamera(-R, R, R, -R, 10, 4 * R + 20000);
const depthScene = new THREE.Scene();
let depthMesh = null;
let depthIce = null;
function syncDepthMesh() {
  if (depthMesh) { depthScene.remove(depthMesh); depthScene.remove(depthIce); }
  depthMesh = new THREE.Mesh(terrain.geometry, depthMat); depthMesh.frustumCulled = false; depthScene.add(depthMesh);
  depthIce = new THREE.Mesh(terrain.geometry, depthIceMat); depthIce.frustumCulled = false; depthScene.add(depthIce);
}
syncDepthMesh();
let sunElev = 40, shadowDirty = true;
function setSun(dayFrac) { // dayFrac 0..1 from 1 Oct
  // solar declination for the calendar day; midday elevation at 46.8° N, sun a bit east of south
  const doy = (dayFrac * 365.25 + 273) % 365.25;
  const decl = 23.44 * Math.sin(2 * Math.PI * (doy - 80) / 365.25);
  sunElev = 38; // fixed sun (late-morning, mid-season): identical shading in every season and view
  const el = sunElev * Math.PI / 180, az = (158) * Math.PI / 180;
  const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  U.sunDir.value.copy(d);
  const warm = 1 - Math.min(1, (sunElev - 14) / 40);
  U.sunCol.value.setRGB(2.2, 2.05 - 0.15 * warm, 1.85 - 0.35 * warm);
  U.skyCol.value.setRGB(0.42, 0.50, 0.66); U.gndCol.value.setRGB(0.18, 0.17, 0.15);
  U.hazeCol.value.setRGB(0.62, 0.72, 0.82);
  const c = new THREE.Vector3(W / 2, 0, Hm / 2);
  lightCam.position.copy(c).addScaledVector(d, 2 * R + 6000); lightCam.lookAt(c); lightCam.updateMatrixWorld();
  lightCam.updateProjectionMatrix();
  U.lightVP.value.multiplyMatrices(lightCam.projectionMatrix, lightCam.matrixWorldInverse);
  shadowDirty = true;
}
setSun(0.75);

// ---------------- simulation worker ----------------
const WORKER = `
let m=null, run=false, speed=1, mode='scen', dT=0, dP=0, vari=true, Tall, Pall, HY0, CREF, CLATE, hef, seed, startYear=1850, acc=0, last=0, cur=null, curSrc='';
const NSUB=24;
function pick(y){
  const idx=y-HY0, ny=Tall.length/12;
  if(mode==='hist' && idx>=0 && idx<ny) return {T:Tall.subarray(idx*12,idx*12+12),P:Pall.subarray(idx*12,idx*12+12),src:'hist'};
  const late = mode==='hist';
  if(vari){ const y0 = late?1974:1961; const r=y0+Math.floor(Math.random()*30)-HY0; return {T:Tall.subarray(r*12,r*12+12),P:Pall.subarray(r*12,r*12+12),src:late?'late':'ref'}; }
  return late?{T:CLATE.T,P:CLATE.P,src:'late'}:{T:CREF.T,P:CREF.P,src:'ref'};
}
function stats(){
  const {nx,ny,H,B,M,bann}=m; const N=nx*ny; const seen=new Uint8Array(N); const st=[seed]; seen[seed]=1;
  let n=0,vol=0,zmin=1e9,bs=0;
  if(H[seed]<=5) return {area:0,vol:0,term:NaN,bal:NaN};
  while(st.length){ const k=st.pop(); n++; vol+=H[k]; const z=B[k]+M[k]+H[k]; if(z<zmin) zmin=z; bs+=bann[k];
    const j=(k/nx)|0, i=k-j*nx;
    for(const q of [i>0?k-1:-1,i<nx-1?k+1:-1,j>0?k-nx:-1,j<ny-1?k+nx:-1]) if(q>=0&&!seen[q]&&H[q]>5&&hef[q]){seen[q]=1;st.push(q);} }
  const c=m.dx*m.dx; return {area:n*c/1e6, vol:vol*c/1e9, term:zmin, bal:bs/n};
}
function snap(){
  const f={}; for(const k of ['H','M','D','snow','firn','tfree','bann','usx','usy']) f[k]=Float32Array.from(m[k]);
  postMessage({type:'snap', f, t:m.t, sub:m.sub, startYear, src:curSrc}, Object.values(f).map(a=>a.buffer));
}
function one(){
  const y = startYear + m.t + 1;
  if(m.sub===0){ cur=pick(y); curSrc=cur.src; }
  m.substep(cur.T, cur.P, dT, dP);
  if(m.sub===0){ const s=stats(); postMessage({type:'year', year:startYear+m.t, s, src:curSrc, T:Array.from(cur.T), P:Array.from(cur.P)}); }
}
// profile of the Hintereisferner: transient snowline and snow water equivalent in three altitude bands
function profile(){
  const {nx,ny,H,B,M,snow}=m; const N=nx*ny;
  const nb=32, z0=2300, bw=50, cnt=new Float64Array(nb), cov=new Float64Array(nb);
  const bands=[2600,3000,3400], bs=[0,0,0], bn=[0,0,0]; let zmin=1e9;
  for(let k=0;k<N;k++){
    if(!hef[k]||H[k]<5) continue;
    const z=B[k]+M[k]+H[k]; if(z<zmin) zmin=z;
    const b=Math.floor((z-z0)/bw); if(b>=0&&b<nb){ cnt[b]++; if(snow[k]>0.02) cov[b]++; }
    for(let q=0;q<3;q++) if(Math.abs(z-bands[q])<75){ bs[q]+=snow[k]; bn[q]++; }
  }
  // snowline = lower edge of the continuous snow cover reaching down from the top of the glacier
  let line=NaN, low=NaN;
  for(let b=nb-1;b>=0;b--){ if(cnt[b]<3) continue; low=z0+b*bw; if(cov[b]/cnt[b]>=0.5) line=z0+b*bw; else break; }
  return {line, full: isFinite(line)&&line<=low, zmin, swe: bs.map((v,q)=>bn[q]?v/bn[q]:NaN)};
}
const SEQK=['H','M','D','snow','firn','tfree','usx','usy'];
let seqClim=null;
function yearSeq(advance){
  run=false;
  if(advance && seqClim){ for(let k=0;k<NSUB;k++) m.substep(seqClim.T, seqClim.P, dT, dP); const s=stats(); postMessage({type:'year', year:startYear+m.t, s, src:seqClim.src}); }
  while(m.sub!==0) one();                      // start on 1 October
  const keys=['H','M','D','snow','firn','tfree','bacc','bann','usx','usy'];
  const save={}; for(const k of keys) save[k]=Float64Array.from(m[k]);
  const t0=m.t, y=startYear+m.t+1;
  const c=pick(y); seqClim=c;
  const frames=[], prof=[];
  const rec=()=>{ const f={}; for(const k of SEQK) f[k]=Float32Array.from(m[k]); frames.push(f); prof.push(profile()); };
  rec();
  for(let k=0;k<NSUB;k++){ m.substep(c.T, c.P, dT, dP); rec(); }
  for(const k of keys) m[k].set(save[k]); m.t=t0; m.sub=0;      // the preview does not change the simulation
  const bufs=[]; for(const f of frames) for(const k of SEQK) bufs.push(f[k].buffer);
  postMessage({type:'yearSeq', frames, prof, year:y, src:c.src, T:Array.from(c.T), P:Array.from(c.P)}, bufs);
}
function loop(){
  if(run && m){
    const now=performance.now(); acc += Math.min(0.25,(now-last)/1000)*speed*NSUB; last=now;
    const t0=performance.now(); let did=0;
    while(acc>=1 && performance.now()-t0<28){ one(); acc-=1; did++; }
    if(acc>4) acc=4;
    if(did) snap();
  }
  setTimeout(loop, run?4:60);
}
onmessage=e=>{
  const d=e.data;
  if(d.type==='init'){
    Tall=d.T; Pall=d.P; HY0=d.hy0; CREF=d.cref; CLATE=d.clate; seed=d.seed; hef=d.hef;
    m=new GlacierSim.Model({nx:d.nx,ny:d.ny,dx:d.dx,zref:d.zref,B:d.B,rad:d.rad,slopeDeg:d.slope,aval:d.aval,tbx:d.tbx,P:d.P0});
    loop();
  } else if(d.type==='state'){
    for(const k of ['H','M','D','firn','tfree']) m[k].set(d.st[k]);
    m.snow.fill(0); m.bacc.fill(0); m.bann.fill(0); m.usx.fill(0); m.usy.fill(0); m.t=0; m.sub=0; startYear=d.year; acc=0;
    // one quiet flow step to get velocities without changing the state noticeably
    m.buildActive(); m.flow(1e-4);
    const s=stats(); postMessage({type:'year', year:startYear, s, src:'start'}); snap();
  } else if(d.type==='params'){ ({speed,mode,dT,dP,vari}=Object.assign({speed,mode,dT,dP,vari},d)); }
  else if(d.type==='play'){ run=d.run; last=performance.now(); }
  else if(d.type==='yearSeq'){ yearSeq(!!d.advance); }
  else if(d.type==='snapNow'){ snap(); }
};`;
const workerSrc = document.getElementById('simsrc').textContent + '\n' + WORKER;
const worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' })));
worker.onerror = e => console.error('Simulation: ' + e.message + ' (Zeile ' + e.lineno + ')');
const seedIdx = D.seed[1] * nx + D.seed[0];
worker.postMessage({ type: 'init', nx, ny, dx: dxc, zref: D.zref, B, rad, slope: slopeDeg, aval, tbx, P0: D.par, T: Tall, P: Pall, hy0: HY0, cref: CLIM_REF, clate: CLIM_LATE, seed: seedIdx, hef: hefMask });
const SimMain = GlacierSim; // same code on the main thread for ELA curves
const PAR = Object.assign({ lapse: -0.0065, sigma: 3.0, tsnow: 1.0, ddf_s: 0.003, ddf_f: 0.0045, ddf_i: 0.0061, pgrad: 0.0004 }, D.par);

// field state (target from worker, displayed = smoothed)
const tgt = {}, dsp = {};
for (const k of ['H', 'M', 'D', 'snow', 'firn', 'tfree', 'bann', 'usx', 'usy']) { tgt[k] = new Float32Array(NC); dsp[k] = new Float32Array(NC); }
let simT = 0, simSub = 0, startYear = 1850, gotSnap = false, climSrc = 'ref', firstSnap = true;
const hist = []; // per-year stats
let lastYearClim = null;
worker.onmessage = e => {
  const d = e.data;
  if (d.type === 'snap') {
    for (const k in d.f) tgt[k].set(d.f[k]);
    if (firstSnap) { for (const k in d.f) dsp[k].set(d.f[k]); firstSnap = false; }
    if (d.startYear !== startYear) { lastSub = -1; lastYearUI = -1; }
    simT = d.t; simSub = d.sub; startYear = d.startYear; gotSnap = true; climSrc = d.src || climSrc;
    computeStrain();
  } else if (d.type === 'yearSeq') {
    startYearMode(d);
  } else if (d.type === 'year') {
    if (d.src === 'start') hist.length = 0;
    hist.push({ year: d.year, ...d.s });
    if (hist.length > 1200) hist.shift();
    if (d.T) lastYearClim = { T: d.T, P: d.P };
    showStats(d.year, d.s); drawTS();
  }
};

// ---------------- UI state ----------------
const S = { run: false, speed: 1, mode: 'scen', dT: 0, dP: 0, vari: true, ela: true, flow: true, mb: false, out: false, lbl: true, cut: false, cutDir: 'long', cutPos: 0.5, exag: 1 };
function sendParams() { worker.postMessage({ type: 'params', speed: S.speed, mode: S.mode, dT: S.dT, dP: S.dP / 100, vari: S.vari }); }
function loadState(key) {
  const st = ST[key]; firstSnap = true; lastSub = -1; lastYearUI = -1;
  worker.postMessage({ type: 'state', st: { H: st.H, M: st.M, D: st.D, firn: st.firn, tfree: st.tfree }, year: st.year });
  $('#st1850').classList.toggle('on', key === 's1850'); $('#st2003').classList.toggle('on', key === 's2003');
}
$('#play').onclick = () => { if (YM && !S.run) exitYearMode(); S.run = !S.run; worker.postMessage({ type: 'play', run: S.run }); $('#play').textContent = S.run ? '❚❚ Pause' : '▶ Abspielen'; };
document.querySelectorAll('#speed button').forEach(b => b.onclick = () => {
  S.speed = +b.dataset.s; document.querySelectorAll('#speed button').forEach(x => x.classList.toggle('on', x === b)); sendParams();
});
document.querySelectorAll('#mode button').forEach(b => b.onclick = () => {
  S.mode = b.dataset.m; document.querySelectorAll('#mode button').forEach(x => x.classList.toggle('on', x === b)); sendParams(); updateEla();
});
const dTin = $('#dT'), dPin = $('#dP');
dTin.oninput = () => { S.dT = +dTin.value; $('#dTv').textContent = sgn(S.dT, 1) + ' °C'; sendParams(); updateEla(); climChangedInYear(); };
dPin.oninput = () => { S.dP = +dPin.value; $('#dPv').textContent = sgn(S.dP) + ' %'; sendParams(); updateEla(); climChangedInYear(); };
$('#vari').onchange = e => { S.vari = e.target.checked; sendParams(); };
$('#resetClim').onclick = () => { dTin.value = 0; dPin.value = 0; dTin.oninput(); dPin.oninput(); };
$('#st1850').onclick = () => { exitYearMode(); loadState('s1850'); };
$('#st2003').onclick = () => { exitYearMode(); loadState('s2003'); };
$('#oEla').onchange = e => { U.showEla.value = e.target.checked ? 1 : 0; };
$('#oFlow').onchange = e => { S.flow = e.target.checked; particles.visible = S.flow; };
$('#oMb').onchange = e => { U.showMB.value = e.target.checked ? 1 : 0; };
$('#oOut').onchange = e => { outline.visible = e.target.checked; };
$('#oLbl').onchange = e => { S.lbl = e.target.checked; $('#labels').hidden = !S.lbl; };
$('#oCut').onchange = e => { S.cut = e.target.checked; if (S.cut) setLift(0); $('#cutBox').hidden = !S.cut; updateCut(); };
document.querySelectorAll('#cutDir button').forEach(b => b.onclick = () => { S.cutDir = b.dataset.c; document.querySelectorAll('#cutDir button').forEach(x => x.classList.toggle('on', x === b)); updateCut(); });
$('#cutpos').oninput = e => { S.cutPos = +e.target.value; updateCut(); };
$('#exag').oninput = e => { S.exag = +e.target.value; U.exag.value = S.exag; const pl = sides.getObjectByName('bottom'); if (pl) pl.position.y = (1300 - ZOFF) * (S.exag - 1); $('#exagv').textContent = fmt(S.exag, 1) + '×'; shadowDirty = true; placeOutline(); };
document.querySelectorAll('#quality button').forEach(b => b.onclick = () => {
  quality = +b.dataset.q; document.querySelectorAll('#quality button').forEach(x => x.classList.toggle('on', x === b)); buildTerrain(quality); syncDepthMesh(); shadowDirty = true;
});
function setLift(v) {
  const changed = Math.abs(U.lift.value - v) > 0.5; U.lift.value = v; iceBase.visible = v > 0.5; if (changed) for (let p = 0; p < NP; p++) pLife[p] = 0; $('#lift').value = v; $('#liftv').textContent = fmt(Math.round(v)) + ' m'; shadowDirty = true;
}
$('#lift').oninput = e => { if (S.cut && +e.target.value > 0) { $('#oCut').click(); } setLift(+e.target.value); };
document.querySelectorAll('#iceMode button').forEach(b => b.onclick = () => setIceMode(+b.dataset.i));
$('#toggle').onclick = () => { const p = $('#panel'); p.classList.toggle('min'); $('#toggle').setAttribute('aria-expanded', !p.classList.contains('min')); };

// ---------------- ELA & charts ----------------
function currentClim() {
  if (S.mode === 'hist') {
    const y = startYear + simT + 1;
    if (y - HY0 < NY) { const y1 = Math.min(Math.max(y, HY0 + 29), HY0 + NY - 1); return { c: climMean(y1 - 29, y1), label: 'Klima ' + (y1 - 29) + '–' + y1 + ' (gemessen)' }; }
    return { c: CLIM_LATE, label: 'ab 2004: Mittel 1974–2003' };
  }
  return { c: CLIM_REF, label: 'Referenz 1961–1990' };
}
let elaRef = 2990, curBal = null, refBal = null;
function updateEla() {
  const { c, label } = currentClim();
  const r = SimMain.elaFlat(PAR, c.T, c.P, S.dT, S.dP / 100, D.zref);
  const r0 = SimMain.elaFlat(PAR, CLIM_REF.T, CLIM_REF.P, 0, 0, D.zref);
  elaRef = r0.ela; curBal = r.bal; refBal = r0.bal;
  U.ela.value = r.ela;
  $('#elaVal').textContent = fmt(Math.round(r.ela)) + ' m';
  const dd = Math.round(r.ela - r0.ela);
  $('#elaDelta').textContent = sgn(dd) + ' m ggü. 1961–1990';
  $('#elaDelta').style.color = dd > 0 ? '#ffb19e' : dd < 0 ? '#a9cbff' : 'var(--ink-2)';
  $('#modeHint').textContent = label;
  drawMB();
}
function prepCanvas(c) {
  const dpr = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.height / (c._dpr || 1);
  if (!c._h) c._h = c.height;
  c.width = w * dpr; c.height = c._h * dpr; c._dpr = dpr;
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return { g, w, h: c._h };
}
function drawMB() {
  const c = $('#mbChart'); if (!c.clientWidth || !curBal) return;
  const { g, w, h } = prepCanvas(c);
  const z0 = 2100, z1 = 3800, b0 = -7, b1 = 3;
  const L = 40, Rr = 10, T = 12, Bt = 26;
  const X = b => L + (b - b0) / (b1 - b0) * (w - L - Rr), Y = z => T + (1 - (z - z0) / (z1 - z0)) * (h - T - Bt);
  g.clearRect(0, 0, w, h);
  g.font = '500 10px "Barlow Semi Condensed", sans-serif'; g.fillStyle = '#71838d'; g.strokeStyle = 'rgba(168,196,210,.14)'; g.lineWidth = 1;
  for (let z = 2200; z <= 3800; z += 400) { g.beginPath(); g.moveTo(L, Y(z)); g.lineTo(w - Rr, Y(z)); g.stroke(); g.textAlign = 'right'; g.fillText(fmt(z), L - 5, Y(z) + 3); }
  for (let b = -6; b <= 3; b += 3) { g.beginPath(); g.moveTo(X(b), T); g.lineTo(X(b), h - Bt); g.stroke(); g.textAlign = 'center'; g.fillText(sgn(b), X(b), h - Bt + 12); }
  g.fillText('Massenbilanz (m Wasseräquivalent pro Jahr)', L + (w - L - Rr) / 2, h - 3);
  g.strokeStyle = 'rgba(232,238,241,.5)'; g.beginPath(); g.moveTo(X(0), T); g.lineTo(X(0), h - Bt); g.stroke();
  // glacier cells of last year
  const H = tgt.H, bann = tgt.bann;
  g.fillStyle = 'rgba(143,208,227,.35)';
  for (let k = 0; k < NC; k += 1) if (hefMask[k] && H[k] > 5 && bann[k] !== 0) {
    const z = B[k] + tgt.M[k] + H[k]; const b = Math.max(b0, Math.min(b1, bann[k]));
    g.fillRect(X(b) - 1, Y(z) - 1, 2, 2);
  }
  const curve = (f, col, dash) => { g.strokeStyle = col; g.setLineDash(dash); g.lineWidth = 2; g.beginPath();
    for (let z = z0; z <= z1; z += 25) { const b = Math.max(b0 - 1, Math.min(b1 + 1, f(z))); z === z0 ? g.moveTo(X(b), Y(z)) : g.lineTo(X(b), Y(z)); } g.stroke(); g.setLineDash([]); };
  curve(refBal, 'rgba(169,184,192,.7)', [4, 4]);
  curve(curBal, '#e8eef1', []);
  const e = U.ela.value;
  g.strokeStyle = '#ff5a4f'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, Y(e)); g.lineTo(w - Rr, Y(e)); g.stroke();
  g.fillStyle = '#ff8b82'; g.textAlign = 'left'; g.font = '600 11px "Barlow Semi Condensed", sans-serif';
  g.fillText('ELA ' + fmt(Math.round(e)) + ' m', L + 4, Y(e) - 5);
  g.fillStyle = '#9fc3d2'; g.textAlign = 'right'; g.fillText('Nährgebiet', w - Rr - 2, T + 11);
  g.fillStyle = '#d7a99d'; g.textAlign = 'left'; g.fillText('Zehrgebiet', L + 4, h - Bt - 6);
  g.fillStyle = '#71838d'; g.font = '500 10px "Barlow Semi Condensed", sans-serif'; g.textAlign = 'right';
  g.fillText('— jetzt   - - 1961–90   · Gletscherzellen', w - Rr - 2, h - Bt - 6);
}
function showStats(year, s) {
  $('#statYear').textContent = 'Stand ' + year;
  $('#sArea').textContent = s.area ? fmt(s.area, 2) : '0';
  $('#sVol').textContent = s.vol ? fmt(s.vol, 3) : '0';
  $('#sTerm').textContent = isFinite(s.term) ? fmt(Math.round(s.term)) : '–';
  $('#sBal').textContent = isFinite(s.bal) ? sgn(s.bal, 2) : '–';
}
function drawTS() {
  const c = $('#tsChart'); if (!c.clientWidth) return;
  const { g, w, h } = prepCanvas(c);
  g.clearRect(0, 0, w, h);
  const L = 34, Rr = 38, T = 10, Bt = 18;
  g.font = '500 10px "Barlow Semi Condensed", sans-serif';
  if (hist.length < 2) { g.fillStyle = '#71838d'; g.textAlign = 'center'; g.fillText('Zeitraffer starten, um den Verlauf zu sehen', w / 2, h / 2); return; }
  const y0 = hist[0].year, y1 = Math.max(hist[hist.length - 1].year, y0 + 10);
  let a0 = 1e9, a1 = -1e9, t0 = 1e9, t1 = -1e9;
  for (const p of hist) { a0 = Math.min(a0, p.area); a1 = Math.max(a1, p.area); if (isFinite(p.term)) { t0 = Math.min(t0, p.term); t1 = Math.max(t1, p.term); } }
  a0 = Math.max(0, a0 - 0.5); a1 += 0.5; t0 -= 30; t1 += 30;
  const X = y => L + (y - y0) / (y1 - y0) * (w - L - Rr);
  const YA = a => T + (1 - (a - a0) / (a1 - a0)) * (h - T - Bt), YT = z => T + (1 - (z - t0) / (t1 - t0)) * (h - T - Bt);
  g.strokeStyle = 'rgba(168,196,210,.14)'; g.beginPath(); g.moveTo(L, h - Bt); g.lineTo(w - Rr, h - Bt); g.stroke();
  g.fillStyle = '#71838d'; g.textAlign = 'center';
  g.fillText(y0, X(y0) + 8, h - 5); g.fillText(y1, X(y1) - 10, h - 5);
  g.lineWidth = 2;
  g.strokeStyle = '#8fd0e3'; g.beginPath(); hist.forEach((p, i) => i ? g.lineTo(X(p.year), YA(p.area)) : g.moveTo(X(p.year), YA(p.area))); g.stroke();
  g.strokeStyle = '#d9b44a'; g.beginPath(); let st = false;
  hist.forEach(p => { if (!isFinite(p.term)) return; st ? g.lineTo(X(p.year), YT(p.term)) : g.moveTo(X(p.year), YT(p.term)); st = true; }); g.stroke();
  g.fillStyle = '#8fd0e3'; g.textAlign = 'right'; g.fillText(fmt(a1, 1), L - 4, T + 8); g.fillText(fmt(a0, 1), L - 4, h - Bt);
  g.fillText('km²', L - 4, (T + h - Bt) / 2 + 3);
  g.fillStyle = '#d9b44a'; g.textAlign = 'left'; g.fillText(fmt(Math.round(t1)), w - Rr + 4, T + 8); g.fillText(fmt(Math.round(t0)), w - Rr + 4, h - Bt); g.fillText('Zunge m', w - Rr + 2, (T + h - Bt) / 2 + 3);
}

// ---------------- section (cut) ----------------
const flowDir = new THREE.Vector2(D.flowDir[0], D.flowDir[1]).normalize();
function updateCut() {
  if (cutMesh) { scene.remove(cutMesh); cutMesh.geometry.dispose(); cutMesh = null; }
  const plate = sides.getObjectByName('bottom'); if (plate) plate.visible = !S.cut;
  if (!S.cut) { U.clip.value.set(0, 0, 0, 0); shadowDirty = true; return; }
  // plane normal (horizontal) and offset; long = section along the flow line (viewed from the south)
  const n = S.cutDir === 'long' ? new THREE.Vector2(-flowDir.y, flowDir.x) : flowDir.clone();
  if (S.cutDir === 'long' && n.y < 0) n.negate();
  const corners = [[0, 0], [W, 0], [W, Hm], [0, Hm]].map(c => c[0] * n.x + c[1] * n.y);
  const lo = Math.min(...corners), hi = Math.max(...corners);
  const s = lo + (hi - lo) * S.cutPos;
  U.clip.value.set(n.x, n.y, -s, 1);
  $('#cutv').textContent = S.cutDir === 'long' ? 'Nord ↔ Süd' : 'talauf ↔ talab';
  // intersection of line n·p = s with domain rectangle
  const pts = [];
  const edges = [[[0, 0], [W, 0]], [[W, 0], [W, Hm]], [[W, Hm], [0, Hm]], [[0, Hm], [0, 0]]];
  for (const [a, b] of edges) {
    const da = a[0] * n.x + a[1] * n.y - s, db = b[0] * n.x + b[1] * n.y - s;
    if ((da <= 0 && db > 0) || (da > 0 && db <= 0)) { const t = da / (da - db); pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  if (pts.length >= 2) {
    const [p, q] = pts, len = Math.hypot(q[0] - p[0], q[1] - p[1]), N = Math.max(2, Math.ceil(len / 12));
    const arr = [];
    for (let i = 0; i <= N; i++) { const t = i / N; arr.push([(p[0] + (q[0] - p[0]) * t) / dxh, (p[1] + (q[1] - p[1]) * t) / dxh]); }
    cutMesh = new THREE.Mesh(wallGeom(arr), wallMat); cutMesh.frustumCulled = false; scene.add(cutMesh);
  }
  shadowDirty = true;
}

// ---------------- outline 2003 ----------------
const outline = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffe08a, depthTest: true }));
outline.visible = false; scene.add(outline);
function hiAlt(x, z) { const i = Math.max(0, Math.min(nxh - 1, Math.floor(x / dxh))), j = Math.max(0, Math.min(nyh - 1, Math.floor(z / dxh))); return base[j * nxh + i]; }
function coarseS(x, z) {
  const gx = x / dxc - 0.5, gz = z / dxc - 0.5, i = Math.max(0, Math.min(nx - 2, Math.floor(gx))), j = Math.max(0, Math.min(ny - 2, Math.floor(gz)));
  const fx = Math.min(1, Math.max(0, gx - i)), fz = Math.min(1, Math.max(0, gz - j));
  const v = (k) => B[k] + dsp.M[k] + dsp.H[k];
  const k = j * nx + i; return (v(k) * (1 - fx) + v(k + 1) * fx) * (1 - fz) + (v(k + nx) * (1 - fx) + v(k + nx + 1) * fx) * fz;
}
function coarseU(x, z, out) {
  const gx = x / dxc - 0.5, gz = z / dxc - 0.5, i = Math.max(0, Math.min(nx - 2, Math.floor(gx))), j = Math.max(0, Math.min(ny - 2, Math.floor(gz)));
  const fx = Math.min(1, Math.max(0, gx - i)), fz = Math.min(1, Math.max(0, gz - j)), k = j * nx + i;
  const L = (a) => (a[k] * (1 - fx) + a[k + 1] * fx) * (1 - fz) + (a[k + nx] * (1 - fx) + a[k + nx + 1] * fx) * fz;
  out[0] = L(dsp.usx); out[1] = L(dsp.usy); out[2] = L(dsp.H);
}
function placeOutline() {
  const p = D.outline, arr = new Float32Array(p.length * 3);
  for (let i = 0; i < p.length; i++) { const x = p[i][0], z = p[i][1]; arr[i * 3] = x; arr[i * 3 + 1] = (hiAlt(x, z) + 6 - ZOFF) * S.exag; arr[i * 3 + 2] = z; }
  outline.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3)); outline.geometry.computeBoundingSphere();
}
placeOutline();

// ---------------- flow particles ----------------
const NP = 1600, PL = 7;
const pPos = new Float32Array(NP * 2), pAge = new Float32Array(NP), pLife = new Float32Array(NP), pTrail = new Float32Array(NP * PL * 3);
const pGeo = new THREE.BufferGeometry();
const segPos = new Float32Array(NP * (PL - 1) * 2 * 3), segCol = new Float32Array(NP * (PL - 1) * 2);
pGeo.setAttribute('position', new THREE.BufferAttribute(segPos, 3)); pGeo.setAttribute('alpha', new THREE.BufferAttribute(segCol, 1));
const particles = new THREE.LineSegments(pGeo, new THREE.ShaderMaterial({
  vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(0.04,0.32,0.62, vA*0.95); }',
  transparent: true, depthWrite: false }));
particles.frustumCulled = false; scene.add(particles);
let iceCells = [];
function refreshIceCells() { iceCells = []; for (let k = 0; k < NC; k++) if (dsp.H[k] > 12) iceCells.push(k); }
const tmpU = [0, 0, 0];
function spawn(p) {
  if (!iceCells.length) { pLife[p] = 0; return; }
  const k = iceCells[(Math.random() * iceCells.length) | 0], j = (k / nx) | 0, i = k - j * nx;
  const x = (i + Math.random()) * dxc, z = (j + Math.random()) * dxc;
  pPos[p * 2] = x; pPos[p * 2 + 1] = z; pAge[p] = 0; pLife[p] = 2.5 + Math.random() * 3.5;
  const y = (coarseS(x, z) + 4 - ZOFF) * S.exag + U.lift.value;
  for (let t = 0; t < PL; t++) { const o = (p * PL + t) * 3; pTrail[o] = x; pTrail[o + 1] = y; pTrail[o + 2] = z; }
}
let trailTimer = 0;
function updateParticles(dtw) {
  if (!S.flow) return;
  const yrs = S.run ? Math.min(dtw, 0.1) * Math.min(S.speed, 12) : dtw * 0.4; // paused: slow drift so motion stays readable
  trailTimer += dtw; const shift = trailTimer > 0.06; if (shift) trailTimer = 0;
  for (let p = 0; p < NP; p++) {
    pAge[p] += dtw;
    let x = pPos[p * 2], z = pPos[p * 2 + 1];
    coarseU(x, z, tmpU);
    if (pAge[p] > pLife[p] || tmpU[2] < 4) { spawn(p); continue; }
    x += tmpU[0] * yrs; z += tmpU[1] * yrs; pPos[p * 2] = x; pPos[p * 2 + 1] = z;
    const y = (coarseS(x, z) + 4 - ZOFF) * S.exag + U.lift.value, o = p * PL * 3;
    if (shift) pTrail.copyWithin(o + 3, o, o + (PL - 1) * 3);
    pTrail[o] = x; pTrail[o + 1] = y; pTrail[o + 2] = z;
  }
  let q = 0;
  for (let p = 0; p < NP; p++) {
    const fade = Math.min(1, pAge[p] / 0.6, (pLife[p] - pAge[p]) / 0.6);
    for (let t = 0; t < PL - 1; t++) {
      const o = (p * PL + t) * 3, a = (1 - t / (PL - 1)) * fade;
      for (let e = 0; e < 2; e++) {
        const oo = o + e * 3; segPos[q * 3] = pTrail[oo]; segPos[q * 3 + 1] = pTrail[oo + 1]; segPos[q * 3 + 2] = pTrail[oo + 2];
        segCol[q] = e ? a * (1 - 1 / (PL - 1)) : a; q++;
      }
    }
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.alpha.needsUpdate = true;
}

// ---------------- labels ----------------
const lblRoot = $('#labels');
const labels = D.labels.map(l => {
  const el = document.createElement('div'); el.className = 'lbl ' + l.t;
  el.innerHTML = l.n + (l.t === 'peak' ? '<small>' + fmt(l.z) + '</small>' : '');
  lblRoot.appendChild(el);
  return { el, x: l.x, z: l.zz, alt: l.t === 'peak' ? l.z : null, t: l.t };
});
const v3 = new THREE.Vector3();
function updateLabels() {
  if (!S.lbl) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const l of labels) {
    const alt = l.alt != null ? Math.max(l.alt, coarseS(l.x, l.z)) : coarseS(l.x, l.z) + 30;
    v3.set(l.x, (alt + 20 - ZOFF) * S.exag, l.z);
    const d = camera.position.distanceTo(v3);
    v3.project(camera);
    const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 && d < 32000;
    l.el.style.display = vis ? '' : 'none';
    if (vis) { l.el.style.left = ((v3.x + 1) / 2 * w).toFixed(1) + 'px'; l.el.style.top = ((1 - v3.y) / 2 * h).toFixed(1) + 'px'; l.el.style.opacity = d > 22000 ? 0.6 : 1; }
  }
}

// ---------------- camera views ----------------
const HEFc = new THREE.Vector3(D.hefCenter[0], (2950 - ZOFF), D.hefCenter[1]);
function flyTo(pos, tgtV) {
  const p0 = camera.position.clone(), t0 = controls.target.clone(), st = performance.now(), dur = 1300;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  (function step() {
    const t = reduce ? 1 : Math.min(1, (performance.now() - st) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(p0, pos, e); controls.target.lerpVectors(t0, tgtV, e);
    if (t < 1) requestAnimationFrame(step);
  })();
}
const fd3 = new THREE.Vector3(flowDir.x, 0, flowDir.y);
const VIEWS = {
  east: () => [HEFc.clone().addScaledVector(fd3, 9500).add(new THREE.Vector3(0, 4200, 1800)), HEFc.clone().addScaledVector(fd3, 600)],
  tongue: () => { const t = new THREE.Vector3(D.tongue[0], (2500 - ZOFF) * S.exag, D.tongue[1]); const side = new THREE.Vector3(-flowDir.y, 0, flowDir.x); if (side.z < 0) side.negate(); return [t.clone().addScaledVector(fd3, 3800).addScaledVector(side, 1600).add(new THREE.Vector3(0, 1900 * S.exag, 0)), t.clone().addScaledVector(fd3, -1400)]; },
  top: () => [new THREE.Vector3(W / 2, 26000, Hm / 2 + 10), new THREE.Vector3(W / 2, 0, Hm / 2)],
  body: () => {
    if (S.cut) $('#oCut').click();
    setLift(450);
    const side = new THREE.Vector3(-flowDir.y, 0, flowDir.x); if (side.z < 0) side.negate();
    const c = HEFc.clone().addScaledVector(fd3, 1200); c.y = (2850 - ZOFF) * S.exag + 450;
    return [c.clone().addScaledVector(side, 7800).addScaledVector(fd3, 4200).add(new THREE.Vector3(0, 1700 * S.exag, 0)), c];
  },
  side: () => {
    if (!S.cut || S.cutDir !== 'long') { $('#oCut').checked = true; S.cut = true; S.cutDir = 'long'; $('#cutBox').hidden = false; document.querySelectorAll('#cutDir button').forEach(x => x.classList.toggle('on', x.dataset.c === 'long')); S.cutPos = D.cutLong; $('#cutpos').value = S.cutPos; updateCut(); }
    const n = new THREE.Vector3(-flowDir.y, 0, flowDir.x); if (n.z < 0) n.negate();
    const c = HEFc.clone().addScaledVector(fd3, 1200);
    c.y = (2950 - ZOFF) * S.exag;
    return [c.clone().addScaledVector(n, 5200).add(new THREE.Vector3(0, 700 * S.exag, 0)), c.clone().add(new THREE.Vector3(0, -150 * S.exag, 0))];
  }
};
document.querySelectorAll('#views button').forEach(b => b.onclick = () => { if (b.dataset.view !== 'body' && U.lift.value > 0 && b.dataset.view !== 'top') setLift(0); const [p, t] = VIEWS[b.dataset.view](); flyTo(p, t); });
{ const [p, t] = VIEWS.east(); camera.position.copy(p); controls.target.copy(t); }

// ---------------- Jahreslauf (one year, step by step) ----------------
let YM = null, prevIceMode = 1, yearReq = null;
const PHASES = [
  [[9, 10], 'Herbst: erster Schnee', 'In der Höhe bleibt der Schnee liegen. Auf der Zunge schmilzt er an warmen Tagen wieder weg. Der Altschnee vom letzten Jahr ist jetzt Firn.'],
  [[11, 0, 1], 'Winter: Akkumulation', 'Schnee fällt im ganzen Gebiet und es schmilzt kaum etwas. Die Schneedecke wächst auf dem ganzen Gletscher, oben am stärksten.'],
  [[2, 3, 4], 'Frühling: Schneedecke am mächtigsten', 'Die Schneedecke erreicht im April/Mai ihr Maximum. Ab Mai beginnt unten an der Zunge die Schmelze.'],
  [[5], 'Juni: Die Schneegrenze steigt', 'Die Schneedecke schmilzt von unten nach oben ab. Die Grenze zwischen Schnee und Eis wandert den Gletscher hinauf.'],
  [[6, 7], 'Hochsommer: Eis liegt frei', 'Im Zehrgebiet liegt blankes Gletschereis frei und schmilzt mehrere Zentimeter pro Tag. Oberhalb der Schneegrenze schützt der Schnee das Eis.'],
  [[8], 'September: Ende des Haushaltsjahres', 'Die Schneegrenze erreicht ihren höchsten Stand. Was jetzt noch an Schnee liegt, überdauert den Sommer und wird zu Firn. Im langjährigen Mittel liegt diese Grenze auf der Gleichgewichtslinie.']
];
function requestYear(advance) {
  if (S.run) $('#play').click();
  $('#yearBtn').disabled = true; $('#yearBtn').textContent = 'Jahr wird berechnet …';
  $('#yNext').disabled = true; $('#yState').textContent = 'Jahr wird berechnet …';
  worker.postMessage({ type: 'yearSeq', advance: !!advance });
}
function startYearMode(d) {
  const first = !YM;
  if (first) { prevIceMode = U.iceMode.value; setIceMode(0); }
  YM = { frames: d.frames, prof: d.prof, year: d.year, src: d.src, pos: first ? 0 : (YM ? YM.pos : 0), shown: -1, playing: first ? true : (YM && YM.playing), dur: YM ? YM.dur : 60 };
  // velocities for crevasses and particles from the first frame
  tgt.usx.set(d.frames[0].usx); tgt.usy.set(d.frames[0].usy); tgt.H.set(d.frames[0].H); computeStrain();
  $('#clockSec').hidden = true; $('#yearSec').hidden = false;
  $('#yearBtn').disabled = false; $('#yearBtn').textContent = 'Jahreslauf ansehen';
  $('#yNext').disabled = false; $('#yState').textContent = '';
  const srcTxt = d.src === 'hist' ? 'gemessenes Klima ' + d.year : d.src === 'late' ? 'Wetter eines Jahres 1974–2003' : (S.vari ? 'Wetter eines Jahres 1961–1990' : 'Mittelklima 1961–1990');
  $('#ySrc').textContent = srcTxt;
  setYearPlaying(YM.playing);
  drawYearCharts();
  $('#scroll').scrollTop = 0;
}
function exitYearMode() {
  if (!YM) return;
  YM = null; firstSnap = true; lastSub = -1; lastYearUI = -1;
  worker.postMessage({ type: 'snapNow' });
  $('#clockSec').hidden = false; $('#yearSec').hidden = true;
  setIceMode(prevIceMode);
}
function setYearPlaying(p) { if (!YM) return; YM.playing = p && YM.pos < 24; $('#yPlay').textContent = YM.playing ? '❚❚ Pause' : (YM.pos >= 24 ? '↺ Von vorn' : '▶ Weiter'); }
function setIceMode(v) {
  U.iceMode.value = v;
  document.querySelectorAll('#iceMode button').forEach(x => x.classList.toggle('on', +x.dataset.i === v));
  $('#thickLegend').hidden = v < 0.5;
}
function applyYearPos() {
  const p = YM.pos, a = Math.min(23, Math.floor(p)), f = Math.min(1, p - a), A = YM.frames[a], Bf = YM.frames[a + 1];
  for (const k of ['H', 'M', 'D', 'snow', 'firn', 'usx', 'usy']) {
    const o = dsp[k], x = A[k], y = Bf[k];
    for (let i = 0; i < NC; i++) o[i] = x[i] + (y[i] - x[i]) * f;
  }
  dsp.tfree.set(f < 0.5 ? A.tfree : Bf.tfree);
  if (YM.shown < 0 || Math.floor(YM.shown) !== Math.floor(p)) shadowDirty = true;
  YM.shown = p;
  uploadFields();
  updateYearUI();
}
function yearDate(p) {
  const d = new Date(Date.UTC(2001, 9, 1) + p / 24 * 365.25 * 864e5 - (p >= 24 ? 864e5 : 0));
  return { day: d.getUTCDate(), m: d.getUTCMonth() };
}
function profAt(p) {
  const a = Math.min(23, Math.floor(p)), f = Math.min(1, p - a), A = YM.prof[a], Bp = YM.prof[a + 1];
  const L = (x, y) => isFinite(x) && isFinite(y) ? x + (y - x) * f : (f < 0.5 ? x : y);
  return { line: L(A.line, Bp.line), full: f < 0.5 ? A.full : Bp.full, swe: A.swe.map((v, q) => L(v, Bp.swe[q])) };
}
function updateYearUI() {
  const p = YM.pos, dd = yearDate(p);
  $('#yDate').textContent = dd.day + '. ' + MONTHS[dd.m];
  $('#yYear').textContent = dd.m >= 9 ? YM.year - 1 : YM.year;
  const ph = PHASES.find(x => x[0].includes(dd.m));
  $('#yPhaseT').textContent = ph[1]; $('#yPhaseX').textContent = ph[2];
  const pr = profAt(p);
  $('#yLine').textContent = !isFinite(pr.line) ? 'kein Schnee' : pr.full ? 'ganzer Gletscher verschneit' : fmt(Math.round(pr.line / 10) * 10) + ' m';
  const sw = pr.swe[1];
  $('#ySwe').textContent = isFinite(sw) ? fmt(sw * 1000 / 350, 1) + ' m' : '–';
  drawYearCharts();
}
function drawYearCharts() {
  if (!YM) return;
  // 1) snow water equivalent at three altitudes
  {
    const c = $('#ySnowChart'); if (!c.clientWidth) return;
    const { g, w, h } = prepCanvas(c); g.clearRect(0, 0, w, h);
    const L = 34, Rr = 8, T = 16, Bt = 18;
    let mx = 0.5; for (const pr of YM.prof) for (const v of pr.swe) if (isFinite(v)) mx = Math.max(mx, v);
    mx = Math.ceil(mx * 2) / 2;
    const X = i => L + i / 24 * (w - L - Rr), Y = v => T + (1 - v / mx) * (h - T - Bt);
    g.font = '500 10px "Barlow Semi Condensed", sans-serif'; g.strokeStyle = 'rgba(168,196,210,.14)'; g.fillStyle = '#71838d'; g.lineWidth = 1;
    for (let v = 0; v <= mx + 1e-6; v += mx > 2 ? 1 : 0.5) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - Rr, Y(v)); g.stroke(); g.textAlign = 'right'; g.fillText(fmt(v, v % 1 ? 1 : 0), L - 4, Y(v) + 3); }
    g.textAlign = 'center'; ['O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S'].forEach((t, i) => g.fillText(t, X(i * 2 + 1), h - 5));
    const cols = ['#d9b44a', '#8fd0e3', '#e8eef1'], names = ['2600 m', '3000 m', '3400 m'];
    g.lineWidth = 2;
    for (let q = 0; q < 3; q++) {
      g.strokeStyle = cols[q]; g.beginPath(); let st = false;
      YM.prof.forEach((pr, i) => { const v = pr.swe[q]; if (!isFinite(v)) { st = false; return; } st ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)); st = true; }); g.stroke();
      g.fillStyle = cols[q]; g.textAlign = 'left'; g.fillText(names[q], L + 4 + q * 56, T - 5);
    }
    g.fillStyle = '#71838d'; g.textAlign = 'right'; g.fillText('Schnee, m Wasser', w - Rr, T - 5);
    g.strokeStyle = '#ff5a4f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(YM.pos), T); g.lineTo(X(YM.pos), h - Bt); g.stroke();
  }
  // 2) transient snowline vs. equilibrium line
  {
    const c = $('#yLineChart'); if (!c.clientWidth) return;
    const { g, w, h } = prepCanvas(c); g.clearRect(0, 0, w, h);
    const L = 34, Rr = 8, T = 14, Bt = 18, z0 = 2300, z1 = 3700;
    const X = i => L + i / 24 * (w - L - Rr), Y = z => T + (1 - (z - z0) / (z1 - z0)) * (h - T - Bt);
    g.font = '500 10px "Barlow Semi Condensed", sans-serif'; g.strokeStyle = 'rgba(168,196,210,.14)'; g.fillStyle = '#71838d'; g.lineWidth = 1;
    for (let z = 2400; z <= 3600; z += 400) { g.beginPath(); g.moveTo(L, Y(z)); g.lineTo(w - Rr, Y(z)); g.stroke(); g.textAlign = 'right'; g.fillText(fmt(z), L - 4, Y(z) + 3); }
    g.textAlign = 'center'; ['O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S'].forEach((t, i) => g.fillText(t, X(i * 2 + 1), h - 5));
    const e = U.ela.value;
    g.setLineDash([5, 4]); g.strokeStyle = '#ff5a4f'; g.beginPath(); g.moveTo(L, Y(e)); g.lineTo(w - Rr, Y(e)); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ff8b82'; g.textAlign = 'left'; g.fillText('ELA ' + fmt(Math.round(e)) + ' m', L + 4, Y(e) - 4);
    g.strokeStyle = '#f4f7fa'; g.lineWidth = 2; g.beginPath(); let st = false;
    YM.prof.forEach((pr, i) => { const z = !isFinite(pr.line) ? NaN : Math.max(z0, pr.full ? pr.zmin : pr.line); if (!isFinite(z)) { st = false; return; } st ? g.lineTo(X(i), Y(z)) : g.moveTo(X(i), Y(z)); st = true; }); g.stroke();
    g.fillStyle = '#e8eef1'; g.textAlign = 'right'; g.fillText('Schneegrenze auf dem Gletscher', w - Rr, T - 4);
    g.strokeStyle = '#ff5a4f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(YM.pos), T); g.lineTo(X(YM.pos), h - Bt); g.stroke();
  }
}
$('#yearBtn').onclick = () => requestYear(false);
$('#yExit').onclick = exitYearMode;
$('#yNext').onclick = () => { if (YM) { YM.pos = 0; YM.playing = true; } requestYear(true); };
$('#yPlay').onclick = () => { if (!YM) return; if (YM.pos >= 24) { YM.pos = 0; $('#ypos').value = 0; setYearPlaying(true); } else setYearPlaying(!YM.playing); };
$('#ypos').oninput = e => { if (!YM) return; YM.pos = +e.target.value; setYearPlaying(false); };
document.querySelectorAll('#ySpeed button').forEach(b => b.onclick = () => { if (YM) YM.dur = +b.dataset.d; document.querySelectorAll('#ySpeed button').forEach(x => x.classList.toggle('on', x === b)); });
// changing the climate while in Jahreslauf recomputes the shown year
function climChangedInYear() { if (!YM) return; clearTimeout(yearReq); yearReq = setTimeout(() => requestYear(false), 450); }

// ---------------- frame loop ----------------
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  drawMB(); drawTS(); drawYearCharts();
}
window.addEventListener('resize', resize); resize();

function sstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
const blurA = new Float32Array(NC), blurB = new Float32Array(NC), sm = { snow: new Float32Array(NC), firn: new Float32Array(NC) };
function blur5(src, dst) { // separable binomial 1-4-6-4-1, edge-clamped
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const r = j * nx, a = Math.max(0, i - 2), b = Math.max(0, i - 1), c = Math.min(nx - 1, i + 1), d = Math.min(nx - 1, i + 2);
    blurA[r + i] = (src[r + a] + 4 * src[r + b] + 6 * src[r + i] + 4 * src[r + c] + src[r + d]) / 16;
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = Math.max(0, j - 2), b = Math.max(0, j - 1), c = Math.min(ny - 1, j + 1), d = Math.min(ny - 1, j + 2);
    dst[j * nx + i] = (blurA[a * nx + i] + 4 * blurA[b * nx + i] + 6 * blurA[j * nx + i] + 4 * blurA[c * nx + i] + blurA[d * nx + i]) / 16;
  }
}
const ub = new Float32Array(NC), vb = new Float32Array(NC);
// principal strain rate of the surface velocity field (1/yr) and the direction of maximum extension
function computeStrain() {
  blur5(tgt.usx, ub); blur5(tgt.usy, vb);
  const H = tgt.H, h2 = 2 * dxc;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, o = k * 4;
    if (H[k] < 3 || i === 0 || j === 0 || i === nx - 1 || j === ny - 1) { aE[o] = 0; aE[o + 1] = 1; aE[o + 2] = 0; continue; }
    const exx = (ub[k + 1] - ub[k - 1]) / h2, eyy = (vb[k + nx] - vb[k - nx]) / h2;
    const exy = 0.5 * ((ub[k + nx] - ub[k - nx]) / h2 + (vb[k + 1] - vb[k - 1]) / h2);
    const r = Math.sqrt(0.25 * (exx - eyy) * (exx - eyy) + exy * exy);
    aE[o] = 0.5 * (exx + eyy) + r;
    const ang = Math.atan2(2 * exy, exx - eyy);          // = 2*theta of the extension axis
    aE[o + 1] = Math.cos(ang) * aE[o]; aE[o + 2] = Math.sin(ang) * aE[o];
  }
  texE.needsUpdate = true;
}
function uploadFields() {
  blur5(dsp.snow, sm.snow); blur5(dsp.firn, sm.firn);
  for (let k = 0; k < NC; k++) {
    const o = k * 4;
    aA[o] = B[k]; aA[o + 1] = dsp.M[k]; aA[o + 2] = dsp.H[k]; aA[o + 3] = dsp.D[k];
    const tf = dsp.tfree[k], never = tf >= 9000;
    const fr = never ? 0 : 1 - sstep(10, 450, tf), mo = never ? 0 : 1 - sstep(200, 1400, tf);
    aB[o] = 0.5 * dsp.snow[k] + 0.5 * sm.snow[k]; aB[o + 1] = 0.35 * dsp.firn[k] + 0.65 * sm.firn[k]; aB[o + 2] = fr; aB[o + 3] = dsp.bann[k];
    aC[o] = dsp.usx[k]; aC[o + 1] = dsp.usy[k]; aC[o + 2] = mo;
  }
  texA.needsUpdate = texB.needsUpdate = texC.needsUpdate = true;
}
let lastT = performance.now(), fpsAcc = 0, fpsN = 0, frame = 0, lastSub = -1, lastYearUI = -1, cellsTimer = 0;
function updateClock() {
  const sub = simSub, hy = startYear + simT + (sub > 0 ? 1 : 0);
  const mIdx = (9 + Math.floor(((sub + 23) % 24) / 2)) % 12; // month of the last completed half-month
  const shown = sub === 0 ? 8 : mIdx; // after a full year: September
  const calYear = shown >= 9 ? hy - 1 : hy;
  $('#year').textContent = sub === 0 ? (startYear + simT) : calYear;
  $('#month').textContent = MONTHS[shown];
  const season = [11, 0, 1].includes(shown) ? 'Winter' : [2, 3, 4].includes(shown) ? 'Frühling' : [5, 6, 7].includes(shown) ? 'Sommer' : 'Herbst';
  $('#season').textContent = season;
  const frac = sub === 0 ? 1 : sub / 24;
  $('#seasonmark').style.left = (frac * 100).toFixed(1) + '%';
}
function tick() {
  const now = performance.now(), dtw = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (YM) {
    if (YM.playing) {
      YM.pos = Math.min(24, YM.pos + dtw * 24 / YM.dur);
      if (YM.pos >= 24) setYearPlaying(false);
      $('#ypos').value = YM.pos;
    }
    if (YM.pos !== YM.shown) applyYearPos();
  } else if (gotSnap) {
    const a = Math.min(1, dtw * (S.speed >= 4 ? 14 : 7));
    for (const k in dsp) { const d = dsp[k], t = tgt[k]; if (k === 'tfree') { d.set(t); continue; } for (let i = 0; i < NC; i++) d[i] += (t[i] - d[i]) * a; }
    uploadFields(); shadowDirty = true;
    if (simSub !== lastSub) { lastSub = simSub; updateClock(); }
    const yr = startYear + simT; if (yr !== lastYearUI) { lastYearUI = yr; if (S.mode === 'hist') updateEla(); else drawMB(); }
  }
  cellsTimer += dtw; if (cellsTimer > 0.5) { cellsTimer = 0; refreshIceCells(); }
  updateParticles(dtw);
  controls.update();
  if (shadowDirty && (frame % 2 === 0)) {
    renderer.setRenderTarget(shadowRT); renderer.clear(); renderer.render(depthScene, lightCam); renderer.setRenderTarget(null); shadowDirty = false;
  }
  renderer.render(scene, camera);
  updateLabels();
  frame++; fpsAcc += dtw; fpsN++;
  if (fpsAcc > 1) { $('#fps').textContent = (S.run ? 'Zeitraffer ' + (S.speed >= 100 ? 'max.' : fmt(S.speed, S.speed < 1 ? 2 : 0) + ' a/s') : 'Pausiert') + ' · ' + Math.round(fpsN / fpsAcc) + ' fps'; fpsAcc = 0; fpsN = 0; }
  requestAnimationFrame(tick);
}
sendParams();
loadState('s2003');
updateEla();
setLoad(1, 'Fertig');
setTimeout(() => { $('#loader').style.opacity = 0; setTimeout(() => $('#loader').remove(), 700); }, 150);
requestAnimationFrame(tick);
})();
