/* ================= GEO GYM · Schalenbau-Labor V2 · Teil A: Grundlagen, Erdmodell (PREM), Daten ================= */
'use strict';
const $ = id => document.getElementById(id);
const V3 = THREE.Vector3, DEG = Math.PI/180, TAU = Math.PI*2;
const RKM = 6371;
const clamp = (x,a,b) => x<a?a:(x>b?b:x);
const lerp = (a,b,t) => a+(b-a)*t;
const sstep = (a,b,x) => { const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const ease = x => x<.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2;
const nfDE = new Intl.NumberFormat('de-DE');
const fmtKm = d => nfDE.format(Math.round(d)) + ' km';
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const QS = new URLSearchParams(location.search);
const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;

/* ---------- Tiefen-Abbildung: echte Tiefe (km) → Modelltiefe (Anteil des Erdradius) ---------- */
const KN = [0,7,35,100,400,660,2890,5150,6371];
const MD = [0,0.02,0.05,0.085,0.17,0.24,0.52,0.81,1.0];   // didaktisch: obere Schichten gestreckt
const MR = KN.map(k=>k/RKM);                                // maßstabsgetreu
const M = MD.slice();
let exag = 0, exagTarget = 0;                               // 0 = didaktisch, 1 = maßstabsgetreu
function updM(){ for(let i=0;i<9;i++) M[i] = MD[i]+(MR[i]-MD[i])*exag; }
function fwdA(arr,d){ if(d<=0) return d*arr[1]/7; if(d>=RKM) return 1;
  for(let i=0;i<8;i++){ if(d<=KN[i+1]){ const f=(d-KN[i])/(KN[i+1]-KN[i]); return arr[i]+f*(arr[i+1]-arr[i]); } } return 1; }
function invA(arr,m){ if(m<=0) return m*7/arr[1]; if(m>=1) return RKM;
  for(let i=0;i<8;i++){ if(m<=arr[i+1]){ const f=(m-arr[i])/((arr[i+1]-arr[i])||1); return KN[i]+f*(KN[i+1]-KN[i]); } } return RKM; }
const fwd = d => fwdA(M,d);
const rad = d => 1 - fwd(d);                                 // Modellradius zur Tiefe d
const sliderToKm = v => invA(MD, v/1000);
const kmToSlider = d => fwdA(MD,d)*1000;

/* ---------- PREM (Dziewonski & Anderson 1981): Dichte, P- und S-Wellen-Geschwindigkeit ---------- */
// Koeffizienten als Polynome in x = r / 6371 km; Schichten von innen nach außen. Oberste Schicht: Kruste statt Ozean.
const PREM = [
  // rTop,   Dichte (g/cm³),                     vP (km/s),                               vS (km/s)
  [1221.5, [13.0885,0,-8.8381,0],              [11.2622,0,-6.3640,0],                   [3.6678,0,-4.4475,0]],
  [3480.0, [12.5815,-1.2638,-3.6426,-5.5281],  [11.0487,-4.0362,4.8023,-13.5732],       [0,0,0,0]],
  [3630.0, [7.9565,-6.4761,5.5283,-3.0807],    [15.3891,-5.3181,5.5242,-2.5514],        [6.9254,1.4672,-2.0834,0.9783]],
  [5600.0, [7.9565,-6.4761,5.5283,-3.0807],    [24.9520,-40.4673,51.4832,-26.6419],     [11.1671,-13.7818,17.4575,-9.2777]],
  [5701.0, [7.9565,-6.4761,5.5283,-3.0807],    [29.2766,-23.6027,5.5242,-2.5514],       [22.3459,-17.2473,-2.0834,0.9783]],
  [5771.0, [5.3197,-1.4836,0,0],               [19.0957,-9.8672,0,0],                   [9.9839,-4.9324,0,0]],
  [5971.0, [11.2494,-8.0298,0,0],              [39.7027,-32.6166,0,0],                  [22.3512,-18.5856,0,0]],
  [6151.0, [7.1089,-3.8045,0,0],               [20.3926,-12.2569,0,0],                  [8.9496,-4.4597,0,0]],
  [6346.6, [2.6910,0.6924,0,0],                [4.1875,3.9382,0,0],                     [2.1519,2.3481,0,0]],
  [6356.0, [2.9,0,0,0],                        [6.8,0,0,0],                             [3.9,0,0,0]],
  [6371.0, [2.6,0,0,0],                        [5.8,0,0,0],                             [3.2,0,0,0]],
];
function premAt(r, which, below){   // r in km; which: 1 Dichte, 2 vP, 3 vS; below=true: Wert knapp unterhalb einer Grenze
  let L = PREM[PREM.length-1];
  for(let i=0;i<PREM.length;i++){ if(below ? r<=PREM[i][0] : r<PREM[i][0]){ L=PREM[i]; break; } }
  const c=L[which], x=r/RKM; return c[0]+x*(c[1]+x*(c[2]+x*c[3]));
}
// Schwere und Druck durch Integration (1-km-Schritte)
const PREM_G = new Float32Array(RKM+1), PREM_P = new Float32Array(RKM+1);
(function(){ const G=6.6743e-11; let m=0;
  for(let r=1;r<=RKM;r++){ const rm=(r-0.5)*1000, rho=premAt(r-0.5,1)*1000; m += 4*Math.PI*rm*rm*rho*1000; PREM_G[r]=G*m/((r*1000)*(r*1000)); }
  let p=0; for(let r=RKM;r>=1;r--){ p += premAt(r-0.5,1)*1000*0.5*(PREM_G[r]+PREM_G[r-1])*1000; PREM_P[r-1]=p; }
})();
const pressureGPa = d => PREM_P[clamp(Math.round(RKM-d),0,RKM)]/1e9;
const gravityAt = d => PREM_G[clamp(Math.round(RKM-d),1,RKM)];

/* ---------- Temperatur: heutiges Modell (gerundet) und Buchwerte (M5) ---------- */
// Lithosphäre: von 15 °C an der Oberfläche bis ca. 1330 °C an ihrer Unterseite; Mantel: adiabatisch; Grenzschicht am Kern.
const GEO_K = [100, 410, 660, 2600, 2890, 5150, 6371], GEO_T = [1330, 1450, 1600, 2300, 3700, 5400, 5700];
function interp(K,V,x){ if(x<=K[0]) return V[0]; for(let i=0;i<K.length-1;i++){ if(x<=K[i+1]){ const f=(x-K[i])/(K[i+1]-K[i]); return V[i]+f*(V[i+1]-V[i]); } } return V[V.length-1]; }
function tempModel(d, lab){ lab = lab||100;
  if(d<lab) return 15 + (interp(GEO_K,GEO_T,Math.max(lab,100))-15)*d/lab;
  return interp(GEO_K,GEO_T,d); }
const M5_K=[0,100,700,2900,5150,6370], M5_T=[15,700,1300,3000,5000,6000];
const tempBook = d => interp(M5_K,M5_T,d);

/* ---------- eingebettete Dateien ---------- */
const ASSET = n => (window.__ASSETS && window.__ASSETS[n]) || n;
function b64bytes(s){ const bin=atob(s), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
function assetBytes(name){ const u=ASSET(name); return b64bytes(u.slice(u.indexOf(',')+1)); }
const diagList=[];
function diag(msg){ diagList.push(msg); const el=$('diag'); if(el){ el.hidden=false; el.querySelector('ul').innerHTML=diagList.map(m=>`<li>${m}</li>`).join(''); } }
window.addEventListener('error', e=>diag('Fehler: '+(e.message||e)+(e.lineno?' (Zeile '+e.lineno+')':'')));

/* Bild → Bitmap (direkt aus den Bytes: funktioniert auch in Safari ohne Netzanfrage) */
function loadBitmap(name, raw){
  const u=ASSET(name);
  return new Promise((ok,fail)=>{
    try{
      if(u.startsWith('data:') && typeof createImageBitmap==='function'){
        const mime=u.slice(5,u.indexOf(';')), blob=new Blob([b64bytes(u.slice(u.indexOf(',')+1))],{type:mime});
        const opt = raw ? {colorSpaceConversion:'none', premultiplyAlpha:'none'} : undefined;
        (opt ? createImageBitmap(blob,opt).catch(()=>createImageBitmap(blob)) : createImageBitmap(blob)).then(ok).catch(()=>viaImg());
      } else viaImg();
    }catch(e){ viaImg(); }
    function viaImg(){ const im=new Image(); im.onload=()=>ok(im); im.onerror=()=>fail(new Error('Bild nicht geladen: '+name)); im.src=u; }
  });
}
function bitmapCanvas(bmp, maxW){ const s=Math.min(1,(maxW||16384)/bmp.width), c=document.createElement('canvas');
  c.width=Math.round(bmp.width*s); c.height=Math.round(bmp.height*s);
  const g=c.getContext('2d',{willReadFrequently:false}); g.imageSmoothingQuality='high'; g.drawImage(bmp,0,0,c.width,c.height); if(bmp.close) bmp.close(); return c; }

/* ---------- Strukturkarten (LITHO1.0): Relief, Meerestiefe, Eis, Sedimente, Moho, Lithosphären-Unterseite ---------- */
const STRUCT = { w:1, h:1, a:null, b:null, ready:false };
const POLE_A=82, POLE_B=89.5;
function poleW(lat){ const t=clamp((Math.abs(lat)-POLE_A)/(POLE_B-POLE_A),0,1); return t*t*(3-2*t); }
// Mittelwert der Daten rund um einen Pol (Breite über 88,5°), je Kanal 0..255: [a.r,a.g,a.b,b.r,b.g,b.b]
function poleMean(north){ const W=STRUCT.w, H=STRUCT.h, rows=Math.max(1,Math.round(H*1.5/180)), m=[0,0,0,0,0,0]; let n=0;
  for(let k=0;k<rows;k++){ const y=north?k:H-1-k; for(let x=0;x<W;x++){ const i=(y*W+x)*4; for(let c=0;c<3;c++){ m[c]+=STRUCT.a[i+c]; m[3+c]+=STRUCT.b[i+c]; } n++; } }
  return m.map(v=>v/n); }
function structAt(lat, lon){   // bilinear; Rückgabe in km
  if(!STRUCT.ready) return {elev:0.3,wdep:0,ice:0,sed:0.5,moho:35,lab:100};
  const W=STRUCT.w, H=STRUCT.h;
  let x=((lon+180)/360*W-0.5), y=clamp((90-lat)/180*H-0.5,0,H-1.001);
  x=((x%W)+W)%W; const x0=Math.floor(x), y0=Math.floor(y), tx=x-x0, ty=y-y0, x1=(x0+1)%W, y1=Math.min(H-1,y0+1);
  const g=(arr,c)=>{ const p=(xx,yy)=>arr[(yy*W+xx)*4+c]; return (p(x0,y0)*(1-tx)+p(x1,y0)*tx)*(1-ty)+(p(x0,y1)*(1-tx)+p(x1,y1)*tx)*ty; };
  // an den Polen treffen beide Schnittflächen aufeinander: dort zu einem gemeinsamen Polwert überblenden, damit die Flächen nahtlos passen
  const pw=poleW(lat), P=lat>0?STRUCT.pN:STRUCT.pS;
  const g2=(arr,c)=>{ const v=g(arr,c); return P&&pw>0 ? v+(P[arr===STRUCT.a?c:3+c]-v)*pw : v; };
  const sd=g2(STRUCT.b,0)/255;
  return { elev:g2(STRUCT.a,0)/255*6.5, wdep:g2(STRUCT.a,1)/255*8, ice:g2(STRUCT.a,2)/255*4.5, sed:sd*sd*20, moho:g2(STRUCT.b,1)/255*80, lab:g2(STRUCT.b,2)/255*320 };
}

/* ---------- Geografie des Schnitts ---------- */
const LON0 = 6.13;                       // Schnittfläche A: Meridian durch Luxemburg
const LUX_LAT = 49.61;
// Welt: y = Norden; Azimut az = atan2(z,x); Länge = LON0 − az. Fläche A liegt in der Ebene z = 0, x ≥ 0.
function dirLL(lat, lon){ const az=(LON0-lon)*DEG, c=Math.cos(lat*DEG); return new V3(c*Math.cos(az), Math.sin(lat*DEG), c*Math.sin(az)); }
function llOf(v){ const r=v.length(); return { lat:Math.asin(clamp(v.y/r,-1,1))/DEG, lon:LON0-Math.atan2(v.z,v.x)/DEG }; }
