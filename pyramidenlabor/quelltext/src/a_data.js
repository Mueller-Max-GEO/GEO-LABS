/* ==========================================================================
   Pyramiden-Labor · Teil A: Daten
   POPDATA (aus data/build_data.py): je Land Bevölkerung nach Einzelalter (0…100+) und Geschlecht, Stand 1. Januar.
   ========================================================================== */
'use strict';
const NA=101;                                   // Alter 0 … 100+
const DATA={list:[],by:{}};
(function(){
  const raw=window.__POPDATA;
  for(const c of raw.countries){
    const bin=atob(c.pop),n=bin.length/2,u=new Float32Array(n);
    for(let i=0;i<n;i++)u[i]=(bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8))*c.scale;
    const o={id:c.id,y0:c.y0,y1:c.y1,nY:c.y1-c.y0+1,pop:u,series:c.series,census:c.census||null,five:c.five||null,hmd:c.hmd||null,est:c.est,ratesrc:c.ratesrc||[[1950,2100,'un']]};
    // Summen je Jahr
    o.tot=new Float64Array(o.nY);
    for(let y=0;y<o.nY;y++){let s=0;const b=y*2*NA;for(let i=0;i<2*NA;i++)s+=u[b+i];o.tot[y]=s}
    o.max={};                                    // Achsen-Maxima (über alle Jahre), je Modus und Gruppierung
    DATA.list.push(o);DATA.by[c.id]=o;
  }
})();
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, smooth=t=>t*t*(3-2*t);

// Bevölkerung eines Landes zu einem (auch gebrochenen) Jahr -> out[0..100]=Männer, out[101..201]=Frauen
/* Über 100: Die Quellen geben nur „100 und älter“ an. Bei einzelnen Jahrgängen verteilt das Labor diese Gruppe auf die Alter
   100, 101 … 119, jedes Jahr um denselben Faktor weniger (geschätzt aus dem Rückgang von 98 auf 99 Jahre); die Summe bleibt gleich.
   Ohne das stünden alle Hochbetagten im Balken „100“, und die Spitze wäre breiter als der Balken darunter. */
const NE=20;
function tail100(p,o,out,off){
  const N=p[o+100],p99=p[o+99],p98=p[o+98];
  if(!(N>0)){for(let k=0;k<NE;k++)out[off+k]=0;return}
  const q=p98>0?clamp(p99/p98,.35,.85):.5;let n0=p99*q;if(!(n0>0))n0=N*.5;
  const r=clamp(1-n0/N,.3,.85),f=N*(1-r)/(1-Math.pow(r,NE));for(let k=0;k<NE;k++)out[off+k]=f*Math.pow(r,k)}
const _t100=new Float32Array(NE);
function fix100(arr,n,scale){   // Einzeljahr-Reihe (Länge n je Geschlecht): Wert bei 100 = nur die 100-Jährigen
  for(let s=0;s<2;s++){tail100(arr,s*n,_t100,0);arr[s*n+100]=_t100[0]}}
function popAt(c,year,out){
  const y=clamp(year,c.y0,c.y1)-c.y0,i=Math.min(c.nY-2,Math.floor(y)),f=y-i,a=i*2*NA,b=a+2*NA,p=c.pop;
  for(let k=0;k<2*NA;k++)out[k]=p[a+k]+(p[b+k]-p[a+k])*f;
  return out}
function total(arr){let s=0;for(let k=0;k<2*NA;k++)s+=arr[k];return s}
// 5-Jahres-Gruppen: 0–4 … 95–99, 100+  -> 21 Gruppen je Geschlecht
function group5(arr,out){for(let s=0;s<2;s++){for(let g=0;g<20;g++){let v=0;for(let a=0;a<5;a++)v+=arr[s*NA+g*5+a];out[s*21+g]=v}out[s*21+20]=arr[s*NA+100]}return out}
// Kennzahlen
function stats(arr){
  let m=0,f=0,y=0,w=0,o=0;
  for(let a=0;a<NA;a++){const M=arr[a],F=arr[NA+a];m+=M;f+=F;if(a<15)y+=M+F;else if(a<65)w+=M+F;else o+=M+F}
  const t=m+f;let acc=0,med=0;
  for(let a=0;a<NA;a++){const v=arr[a]+arr[NA+a];if(acc+v>=t/2){med=a+(t/2-acc)/Math.max(v,1e-9);break}acc+=v}
  let c15=0,a3044=0;for(let a=0;a<15;a++)c15+=arr[a]+arr[NA+a];for(let a=30;a<45;a++)a3044+=arr[a]+arr[NA+a];
  let m80=0,f80=0;for(let a=80;a<NA;a++){m80+=arr[a];f80+=arr[NA+a]}
  return {t,m,f,y,w,o,med,yq:100*y/w,oq:100*o/w,base:100*c15/Math.max(a3044,1e-9),f80:f80/Math.max(m80+f80,1e-9)}}
// Form: Kinder (0–14) je 100 Erwachsene im Alter von 30–44 Jahren
const SHAPE_T=[90,150];
function shapeOf(base){return base>=SHAPE_T[1]?'pyr':base>=SHAPE_T[0]?'bell':'urn'}
function gaugePos(base){ // Anzeige 0…1: Urne 0–0,3 · Glocke 0,3–0,5 · Pyramide 0,5–1
  if(base<SHAPE_T[0])return clamp(.3*(base-30)/(SHAPE_T[0]-30),0,.3);
  if(base<SHAPE_T[1])return .3+.2*(base-SHAPE_T[0])/(SHAPE_T[1]-SHAPE_T[0]);
  return clamp(.5+.5*(base-SHAPE_T[1])/(350-SHAPE_T[1]),.5,1)}
// Achsen-Maximum eines Landes (alle Jahre), je Modus 'abs'|'pct' und Gruppierung 1|5
function axisMaxAll(c,mode,grp){
  const key=mode+grp;if(c.max[key])return c.max[key];
  const t=new Float32Array(2*NA),g=new Float32Array(42);let mx=0;
  for(let y=c.y0;y<=c.y1;y++){popAt(c,y,t);const tt=mode==='pct'?total(t):1;
    if(grp===5){group5(t,g);for(let k=0;k<42;k++)mx=Math.max(mx,g[k]/tt)}else{for(let k=0;k<2*NA-1;k++)if(k!==100)mx=Math.max(mx,t[k]/tt)}}
  return c.max[key]=mx}
function niceStep(max,target){const raw=max/target,p=Math.pow(10,Math.floor(Math.log10(raw))),r=raw/p;return (r<1.5?1:r<3.5?2:r<7.5?5:10)*p}
// Wert einer Zeitreihe (Geburtenrate …) zu einem Jahr, null wenn nicht vorhanden
function serAt(c,key,year){const s=c.series[key];if(!s)return null;const i=Math.round(clamp(year,c.y0,c.y1))-c.y0;return s[i]==null?null:s[i]}
function serSmooth(c,key,year,h){let s=0,n=0;for(let y=year-h;y<=year+h;y++){const v=(y>=c.y0&&y<=c.y1)?c.series[key][y-c.y0]:null;if(v!=null){s+=v;n++}}return n?s/n:null}
// Einordnung in das Modell des demografischen Übergangs (einfache Schwellenwerte, nie rückwärts)
// 0 vor dem Übergang · 1 Sterberate sinkt · 2 Geburtenrate sinkt · 3 nach dem Übergang;  shrink: Sterberate > Geburtenrate
const PH_T={cbrHi:28,cbrLo:18,cdrHi:22};
function phases(c){
  if(c.ph)return c.ph;const ph=new Int8Array(c.nY).fill(-1),sh=new Uint8Array(c.nY);let cur=-1;
  for(let y=c.y0;y<=c.y1;y++){const b=serSmooth(c,'cbr',y,2),d=serSmooth(c,'cdr',y,2);if(b==null||d==null)continue;
    const p=b<PH_T.cbrLo?3:b<PH_T.cbrHi?2:d<PH_T.cdrHi?1:0;cur=Math.max(cur,p);ph[y-c.y0]=cur;sh[y-c.y0]=d>b?1:0}
  c.ph=ph;c.sh=sh;return ph}
function rateSrc(c,year){for(const r of c.ratesrc)if(year>=r[0]&&year<=r[1])return r[2];return null}
// Art der Daten für ein Jahr: 'census' (Volkszählung), 'interp' (zwischen Zählungen), 'hmd', 'est' (UN-Schätzung), 'proj' (UN-Projektion)
function kindOf(c,year){const y=Math.round(year);
  if(c.five&&y<=c.five[1])return c.census.includes(y)&&Math.abs(year-y)<.26?'census':'interp';
  if(c.hmd&&y<=c.hmd[1])return 'hmd';
  return y<=c.est?'est':'proj'}
