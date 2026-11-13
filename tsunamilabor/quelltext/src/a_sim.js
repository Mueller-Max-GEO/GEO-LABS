/* ============================================================================================
   a_sim.js – Geometrie des Modells und Flachwasser-Simulation (ohne three.js, in node testbar)

   Koordinaten: x = Querschnitt (links offenes Meer, rechts Küste und Land), y = oben (0 = Meeresspiegel),
   z = entlang der Plattengrenze; vorne (z = +ZD) liegt die Schnittfläche.

   Die Simulation löst die nichtlinearen Flachwassergleichungen (Erhaltung von Masse und Impuls):
   Finite-Volumen-Verfahren (in Laufrichtung 2. Ordnung), HLL-Fluss, hydrostatische Rekonstruktion (Audusse et al. 2004),
   damit ruhendes Wasser exakt in Ruhe bleibt und trockene Zellen sauber überflutet werden.
   Der Tsunami entsteht hier wie in der Natur: Der Meeresboden hebt sich und hebt die Wassersäule mit.
   ============================================================================================ */
const XL=-16, XR=12, ZD=6, YB=-10, XT=-7, XC=7.0, ZR=2.0;
const XU=-5.6;            // Mitte der Hebung (nahe dem Graben, weit vor der Küste)
const XSUB=-0.5;          // Mitte der Senkung
const YOP=-5.2;           // Unterkante der kontinentalen Platte
const LOCK0=0.4, LOCK1=4.4, DH=2.6, LOCKDRAG=0.9;   // blockierter Abschnitt / Herd (Abstand ab Graben entlang der Platte)
const SIM_G=1.0;          // Schwerebeschleunigung in Modelleinheiten: Wellentempo = Wurzel(Tiefe)
const RISE=1.0;           // Dauer der Hebung des Meeresbodens in Simulationszeit (entspricht rund 3–4 Minuten)

const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const gauss=(x,m,w)=>Math.exp(-(((x-m)/w)**2));
const lerp=(a,b,t)=>a+(b-a)*t;

function monotone(pts){
  const n=pts.length,xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),d=[],m=new Array(n);
  for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
  m[0]=d[0];m[n-1]=d[n-2];
  for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
  for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue;}const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i];}}
  return x=>{if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];let i=0;while(x>xs[i+1])i++;
    const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1];};
}
/* Oberfläche der kontinentalen Platte: Graben → Kontinentalhang → Schelfkante → breiter Schelf → Küste → Küstenebene → Hügel */
const ySurf=monotone([[-7,-3.4],[-6.2,-3.05],[-5,-2.62],[-3.5,-2.15],[-2.2,-1.78],[-1.1,-1.42],[0.5,-1.08],[2,-0.82],[3.5,-0.6],[5,-0.38],[6,-0.21],[6.6,-0.09],[7,0],[7.3,0.03],[8,0.058],[9,0.1],[10,0.145],[10.6,0.27],[11,0.6],[11.6,1.02],[12,1.15]]);
function slabTop(x){ if(x<=XT){ if(x<=-10) return -3; const u=(x+10)/3; return -3-0.4*u*u; } const d=x-XT; return -3.4-0.267*d-0.02*d*d; }
function slabSlope(x){ if(x<=XT) return x<=-10?0:-0.2667*(x+10)/3; return -(0.267+0.04*(x-XT)); }
const xAtDist=d=>XT+d;
function yS(x){ return x<=XT ? slabTop(x) : ySurf(x); }
/* Muster der senkrechten Verschiebung beim Beben: Hebung nahe dem Graben, Senkung weiter landwärts (USGS Circular 1187) */
const DPA=0.5, DPW=1.7, DPB=0.15, DPV=2.0;
function Dpat(x){ return (DPA*gauss(x,XU,DPW) - DPB*gauss(x,XSUB,DPV))*sstep(-7,-6.3,x); }
function Hpat(x){ return 0.25*gauss(x,-5.2,2.6)*sstep(-7,-6.6,x); }
function Tz(z){ return 0.5+0.5*sstep(-ZR-2.5,-ZR,z); }      // der Bruch wird nach hinten schwächer (in Wirklichkeit ist er viel länger als der Block)
function depthRest(x){ return Math.max(0.04, -yS(x)); }
/* Kleinräumiges Relief (Tiefseehügel, Hang, Küstenebene, Düne) */
function hash2(x,y){ const h=Math.sin(x*127.1+y*311.7)*43758.5453; return h-Math.floor(h); }
function vnoise2(x,y){ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm2(x,y){ let s=0,a=0.5; for(let i=0;i<4;i++){ s+=a*vnoise2(x,y); x=x*2.03+1.7; y=y*2.03+9.2; a*=0.5; } return s-0.47; }
function reliefOcean(x,z){ return 0.09*(1-sstep(XT-1.8,XT-0.5,x))*fbm2(x*0.8,z*0.8); }
const DUNE_X=XC+0.78;
function reliefOP(x,z){ return fbm2(x*1.1+3,z*1.1)*(0.05*sstep(XT+0.3,XT+1.3,x)*(1-sstep(XC-1.3,XC-0.3,x))+0.05*sstep(XC+1.2,XC+2.2,x)) + 0.008*gauss(x,DUNE_X,0.22)*(0.4+1.2*vnoise2(z*1.5,3)); }
/* Flussmündung mit kleinem Hafen: Rinne unter dem Meeresspiegel, quer durch Strand und Düne */
const CH_X0=5.9, CH_X1=8.52, CH_W=0.4;
const chZ=x=>4.05+0.22*Math.sin((x-6.0)*1.25);
function chMask(x,z){ if(x<CH_X0-0.6||x>CH_X1+0.4) return 0; const w=CH_W*(1-0.35*sstep(7.6,CH_X1,x)); return sstep(w+0.26,w-0.02,Math.abs(z-chZ(x)))*sstep(CH_X0-0.6,CH_X0+0.5,x)*(1-sstep(CH_X1-0.25,CH_X1+0.3,x)); }
function gRest(x,z){
  if(x<=XT) return slabTop(x)+reliefOcean(x,z);
  let g=yS(x)+reliefOP(x,z);
  const m=chMask(x,z); if(m>0){ const bed=-0.15+0.05*sstep(6.5,CH_X1,x); if(bed<g) g=lerp(g,bed,m); }
  return g;
}
/* Rauigkeit des Untergrunds (Reibungsbeiwert der Strömung): Meer glatt, Felder mäßig, Wald und Ort rau */
const TOWN={x0:7.75,x1:10.75,z0:-1.6,z1:5.9};
function roughAt(x,z){
  if(x<XC-0.05) return 0.004;
  if(chMask(x,z)>0.5) return 0.006;
  let c=0.009;                                                            // Strand, Felder
  c=Math.max(c,0.035*gauss(x,DUNE_X+0.05,0.3));                             // Kiefernwald auf der Düne
  if(x>TOWN.x0&&x<TOWN.x1&&z>TOWN.z0&&z<TOWN.z1) c=Math.max(c,0.022);      // Ort
  if(x>10.8) c=Math.max(c,0.1);                                            // Wald am Hang
  return c;
}

/* ============================== Simulation ==============================
   Gitter: in x ungleichmäßig (im tiefen Meer grob, auf dem Schelf und an Land fein), in z gleichmäßig.
   x-Richtung (Laufrichtung der Welle): 2. Ordnung (MUSCL-Hancock, Minmod-Begrenzer) – die Welle behält ihre Form.
   z-Richtung: 1. Ordnung. Beide: HLL-Fluss mit hydrostatischer Rekonstruktion, trockene Zellen werden sauber geflutet. */
const dxWish=x=>lerp(0.14,0.055,sstep(-8.5,-0.5,x))+0.06*sstep(11.0,12,x);
function createSim(opt){
  const nx=opt.nx||368, nz=opt.nz||64, N=nx*nz, dz=2*ZD/nz, G=SIM_G;
  const R=opt.R==null?1:opt.R;                 // Anteil der gelösten Spannung (1 = starkes Beben, 0,03 = Magnitude 6)
  const wallH=opt.wall||0;                     // Höhe einer Schutzmauer hinter dem Strand (0 = keine)
  const EPS=1e-5, HMIN=2e-3, HS=0.012;
  /* Zellgrenzen in x aus der gewünschten Zellbreite */
  const xe=new Float32Array(nx+1), xs=new Float32Array(nx), dxs=new Float32Array(nx), zs=new Float32Array(nz);
  { const M=4000, cum=new Float64Array(M+1); for(let m=1;m<=M;m++){ const x=XL+(XR-XL)*(m-0.5)/M; cum[m]=cum[m-1]+(XR-XL)/M/dxWish(x); }
    let m=0; for(let i=0;i<=nx;i++){ const t=cum[M]*i/nx; while(m<M&&cum[m+1]<t) m++; const f=m<M?(t-cum[m])/(cum[m+1]-cum[m]):0; xe[i]=XL+(XR-XL)*(m+f)/M; }
    xe[0]=XL; xe[nx]=XR; for(let i=0;i<nx;i++){ xs[i]=0.5*(xe[i]+xe[i+1]); dxs[i]=xe[i+1]-xe[i]; } }
  for(let k=0;k<nz;k++) zs[k]=-ZD+(k+0.5)*dz;
  /* x → Zellindex (gebrochen, bezogen auf Zellmitten) über eine Tabelle */
  const LUT=2048, lut=new Float32Array(LUT+1);
  { let i=0; for(let m=0;m<=LUT;m++){ const x=XL+(XR-XL)*m/LUT; while(i<nx-2&&xs[i+1]<x) i++; lut[m]=clamp(i+(x-xs[i])/(xs[i+1]-xs[i]),0,nx-1); } }
  const fxOf=x=>{ const f=clamp((x-XL)/(XR-XL),0,1)*LUT, m=Math.min(LUT-1,Math.floor(f)); return lut[m]+(lut[m+1]-lut[m])*(f-m); };
  let dt=1e9; for(let i=0;i<nx;i++){ const d=Math.max(0,-yS(xs[i])), sm=Math.sqrt(G*(d+0.45))+(xs[i]>XC-1.5?1.05:0.5); dt=Math.min(dt,0.85*dxs[i]/sm); }
  dt=Math.min(dt,0.85*dz/2.4);
  const b0=new Float32Array(N), bD=new Float32Array(N), b=new Float32Array(N), fric=new Float32Array(N), land=new Uint8Array(N);
  const h=new Float32Array(N), hu=new Float32Array(N), hw=new Float32Array(N), ct=new Float32Array(N), cf=new Float32Array(N);
  const srcIdx=[];
  for(let k=0;k<nz;k++)for(let i=0;i<nx;i++){ const n=k*nx+i, x=xs[i], z=zs[k];
    let g=gRest(x,z);
    if(wallH>0&&chMask(x,z)<0.3){ const wv=wallH*sstep(0.16,0.05,Math.abs(x-(XC+0.36))); if(wv>0) g=Math.max(g,wv); }
    b0[n]=g; const d=x>XT?Dpat(x)*Tz(z):0; bD[n]=d; if(Math.abs(d)>1e-5) srcIdx.push(n);
    fric[n]=roughAt(x,z); land[n]=(x>XC-0.02&&g>0.0)?1:0; }
  const src=Int32Array.from(srcIdx);
  const M=Math.max(nx,nz)+1, Fh=new Float64Array(M), FqL=new Float64Array(M), FqR=new Float64Array(M), Ft=new Float64Array(M), Fc=new Float64Array(M), Ff=new Float64Array(M);
  const HL=new Float64Array(M), HR=new Float64Array(M), BL=new Float64Array(M), BR=new Float64Array(M), UL=new Float64Array(M), UR=new Float64Array(M), SR=new Float64Array(M);
  const S={nx,nz,N,dz,dt,G,R,xs,xe,dxs,zs,fxOf,b0,bD,b,h,hu,hw,ct,cf,land,fric,tau:0,steps:0,maxCFL:0};

  S.reset=function(){
    for(let n=0;n<N;n++){ b[n]=b0[n]-bD[n]; const x=xs[n%nx]; h[n]=(b[n]<0&&x<CH_X1+0.5)?-b[n]:0; hu[n]=0; hw[n]=0; ct[n]=0; cf[n]=0; }
    S.tau=0; S.steps=0; S.maxCFL=0;
  };
  const rise=t=>{ const u=clamp(t/RISE,0,1); return u*u*u*(u*(6*u-15)+10); };     // weich, ohne Überschwingen
  S.kOf=tau=>1-R*rise(tau);                                                        // 1 = Platte voll verbogen, 0 = entspannt

  /* x-Richtung, 2. Ordnung */
  function sweepX(){
    for(let j=0;j<nz;j++){
      const off=j*nx;
      /* 1. Steigungen und Vorhersage auf den halben Zeitschritt: Werte an der linken/rechten Zellkante */
      for(let i=0;i<nx;i++){
        const c=off+i, hc=h[c], bc=b[c], uc=hc>HMIN?hu[c]/hc:0;
        let hl=hc, hr=hc, bl=bc, br=bc, ul=uc, ur=uc;
        if(hc>HS&&i>0&&i<nx-1){ const hm=h[c-1], hp=h[c+1];
          if(hm>HS&&hp>HS){
            const dm=2/(dxs[i]+dxs[i-1]), dp=2/(dxs[i]+dxs[i+1]), hx=0.5*dxs[i];
            const ec=hc+bc, e1=(ec-hm-b[c-1])*dm, e2=(hp+b[c+1]-ec)*dp, h1=(hc-hm)*dm, h2=(hp-hc)*dp;
            const um=hu[c-1]/hm, up=hu[c+1]/hp, u1=(uc-um)*dm, u2=(up-uc)*dp;
            const de=(e1*e2<=0?0:(Math.abs(e1)<Math.abs(e2)?e1:e2))*hx, dh=(h1*h2<=0?0:(Math.abs(h1)<Math.abs(h2)?h1:h2))*hx, du=(u1*u2<=0?0:(Math.abs(u1)<Math.abs(u2)?u1:u2))*hx;
            let l=hc-dh, r=hc+dh;
            if(l>HMIN&&r>HMIN){
              const bl2=ec-de-l, br2=ec+de-r, ql=l*(uc-du), qr=r*(uc+du), rr=0.5*dt/dxs[i];
              const dE=-rr*(qr-ql), dQ=-rr*(qr*(uc+du)+0.5*G*r*r-ql*(uc-du)-0.5*G*l*l+G*0.5*(l+r)*(br2-bl2));
              const l2=l+dE, r2=r+dE;
              if(l2>HMIN&&r2>HMIN){ hl=l2; hr=r2; bl=bl2; br=br2; ul=(ql+dQ)/l2; ur=(qr+dQ)/r2; }
            }
          }
        }
        HL[i]=hl; HR[i]=hr; BL[i]=bl; BR[i]=br; UL[i]=ul; UR[i]=ur; SR[i]=-G*0.5*(hl+hr)*(br-bl);
      }
      /* 2. Flüsse an den Zellgrenzen */
      for(let i=0;i<=nx;i++){
        let hl,hr,bl,br,ul,ur,a,c;
        if(i>0){ a=off+i-1; hl=HR[i-1]; bl=BR[i-1]; ul=UR[i-1]; }
        if(i<nx){ c=off+i; hr=HL[i]; br=BL[i]; ur=UL[i]; }
        if(i===0){ hl=hr; bl=br; ul=ur; a=c; }                       // offener Rand links: Welle läuft hinaus
        else if(i===nx){ hr=hl; br=bl; ur=-ul; c=a; }                // Wand rechts (Hügel)
        const bm=bl>br?bl:br;
        let hls=hl+bl-bm; if(hls<0)hls=0; let hrs=hr+br-bm; if(hrs<0)hrs=0;
        let f0=0,f1=0;
        if(hls>EPS||hrs>EPS){
          const cl=Math.sqrt(G*hls), cr=Math.sqrt(G*hrs); let sL,sR;
          if(hls<=EPS){ sL=ur-2*cr; sR=ur+cr; } else if(hrs<=EPS){ sL=ul-cl; sR=ul+2*cl; }
          else { sL=ul-cl<ur-cr?ul-cl:ur-cr; sR=ul+cl>ur+cr?ul+cl:ur+cr; }
          const ql=hls*ul, qr=hrs*ur, fl1=ql*ul+0.5*G*hls*hls, fr1=qr*ur+0.5*G*hrs*hrs;
          if(sL>=0){ f0=ql; f1=fl1; } else if(sR<=0){ f0=qr; f1=fr1; }
          else { const inv=1/(sR-sL), ss=sL*sR; f0=(sR*ql-sL*qr+ss*(hrs-hls))*inv; f1=(sR*fl1-sL*fr1+ss*(qr-ql))*inv; }
        }
        Fh[i]=f0; FqL[i]=f1+0.5*G*(hl*hl-hls*hls); FqR[i]=f1+0.5*G*(hr*hr-hrs*hrs);
        if(f0>=0){ const ha=h[a]; Ft[i]=f0*(ha>HMIN?hw[a]/ha:0); Fc[i]=f0*ct[a]; Ff[i]=f0*cf[a]; }
        else { const hb=h[c]; Ft[i]=f0*(hb>HMIN?hw[c]/hb:0); Fc[i]=f0*ct[c]; Ff[i]=f0*cf[c]; }
      }
      /* 3. Zellen aktualisieren */
      for(let i=0;i<nx;i++){
        const c=off+i, h0=h[c], r=dt/dxs[i]; const hn=h0-r*(Fh[i+1]-Fh[i]);
        if(hn<=EPS){ h[c]=hn>0?hn:0; hu[c]=0; hw[c]=0; ct[c]=0; cf[c]=0; continue; }
        const mc=h0*ct[c]-r*(Fc[i+1]-Fc[i]), mf=h0*cf[c]-r*(Ff[i+1]-Ff[i]);
        h[c]=hn;
        if(hn>HMIN){ hu[c]-=r*(FqL[i+1]-FqR[i]-SR[i]); hw[c]-=r*(Ft[i+1]-Ft[i]); } else { hu[c]=0; hw[c]=0; }
        let v=mc/hn; ct[c]=v<0?0:v>1?1:v; v=mf/hn; cf[c]=v<0?0:v>1?1:v;
      }
    }
  }
  /* z-Richtung, 1. Ordnung */
  function sweepZ(){
    const r=dt/dz;
    for(let i=0;i<nx;i++){
      for(let k=0;k<=nz;k++){
        let hl=0,hr=0,bl=0,br=0,ul=0,ur=0,tl=0,tr=0,a=-1,c=-1;
        if(k>0){ a=(k-1)*nx+i; hl=h[a]; bl=b[a]; if(hl>HMIN){ ul=hw[a]/hl; tl=hu[a]/hl; } }
        if(k<nz){ c=k*nx+i; hr=h[c]; br=b[c]; if(hr>HMIN){ ur=hw[c]/hr; tr=hu[c]/hr; } }
        if(k===0){ hl=hr; bl=br; ul=ur; tl=tr; a=c; }                 // offener Rand hinten
        else if(k===nz){ hr=hl; br=bl; ur=-ul; tr=tl; c=a; }          // Spiegelebene vorn (Schnittfläche)
        const bm=bl>br?bl:br;
        let hls=hl+bl-bm; if(hls<0)hls=0; let hrs=hr+br-bm; if(hrs<0)hrs=0;
        let f0=0,f1=0;
        if(hls>EPS||hrs>EPS){
          const cl=Math.sqrt(G*hls), cr=Math.sqrt(G*hrs); let sL,sR;
          if(hls<=EPS){ sL=ur-2*cr; sR=ur+cr; } else if(hrs<=EPS){ sL=ul-cl; sR=ul+2*cl; }
          else { sL=ul-cl<ur-cr?ul-cl:ur-cr; sR=ul+cl>ur+cr?ul+cl:ur+cr; }
          const ql=hls*ul, qr=hrs*ur, fl1=ql*ul+0.5*G*hls*hls, fr1=qr*ur+0.5*G*hrs*hrs;
          if(sL>=0){ f0=ql; f1=fl1; } else if(sR<=0){ f0=qr; f1=fr1; }
          else { const inv=1/(sR-sL), ss=sL*sR; f0=(sR*ql-sL*qr+ss*(hrs-hls))*inv; f1=(sR*fl1-sL*fr1+ss*(qr-ql))*inv; }
        }
        Fh[k]=f0; FqL[k]=f1+0.5*G*(hl*hl-hls*hls); FqR[k]=f1+0.5*G*(hr*hr-hrs*hrs);
        if(f0>=0){ Ft[k]=f0*tl; Fc[k]=f0*ct[a]; Ff[k]=f0*cf[a]; } else { Ft[k]=f0*tr; Fc[k]=f0*ct[c]; Ff[k]=f0*cf[c]; }
      }
      for(let k=0;k<nz;k++){
        const c=k*nx+i, h0=h[c]; const hn=h0-r*(Fh[k+1]-Fh[k]);
        if(hn<=EPS){ h[c]=hn>0?hn:0; hu[c]=0; hw[c]=0; ct[c]=0; cf[c]=0; continue; }
        const mc=h0*ct[c]-r*(Fc[k+1]-Fc[k]), mf=h0*cf[c]-r*(Ff[k+1]-Ff[k]);
        h[c]=hn;
        if(hn>HMIN){ hw[c]-=r*(FqL[k+1]-FqR[k]); hu[c]-=r*(Ft[k+1]-Ft[k]); } else { hu[c]=0; hw[c]=0; }
        let v=mc/hn; ct[c]=v<0?0:v>1?1:v; v=mf/hn; cf[c]=v<0?0:v>1?1:v;
      }
    }
  }
  /* Reibung, Trübung (aufgewirbelter Schlamm) und Schaum */
  function sources(){
    let mc=0;
    for(let k=0;k<nz;k++){ const off=k*nx;
      for(let i=0;i<nx;i++){ const n=off+i, hh=h[n]; if(hh<=HMIN) continue;
        let u=hu[n]/hh, w=hw[n]/hh; const sp=Math.sqrt(u*u+w*w);
        if(sp>1e-7){ const f=1/(1+dt*fric[n]*sp/hh); hu[n]*=f; hw[n]*=f; u*=f; w*=f; }
        const cfl=(Math.abs(u)+Math.sqrt(G*hh))*dt/dxs[i]; if(cfl>mc) mc=cfl;
        /* Trübung: über Land und in flachem, schnell strömendem Wasser wird Schlamm aufgewirbelt; er setzt sich langsam wieder ab */
        let c=ct[n];
        if(land[n]) c+=(1-c)*Math.min(1,dt*(1.5+7*sp));
        else if(hh<0.45) c+=(1-c)*Math.min(1,dt*2.2*sp*sp/(hh+0.03));
        c-=c*dt*0.012; ct[n]=c;
        /* Schaum: an steilen Wellenfronten und in schießender Strömung; zerfällt in wenigen Sekunden */
        let f=cf[n]; const il=i>0?n-1:n, ir=i<nx-1?n+1:n, kb=k>0?n-nx:n, kf=k<nz-1?n+nx:n, e0=hh+b[n];
        const el=h[il]>HMIN?h[il]+b[il]:e0, er=h[ir]>HMIN?h[ir]+b[ir]:e0, eb=h[kb]>HMIN?h[kb]+b[kb]:e0, ef=h[kf]>HMIN?h[kf]+b[kf]:e0;
        const gx=(er-el)/(xs[i<nx-1?i+1:i]-xs[i>0?i-1:i]+1e-9), gz=(ef-eb)/(2*dz), steep=Math.sqrt(gx*gx+gz*gz), fr=sp/Math.sqrt(G*hh);
        let gen=sstep(0.45,1.3,steep)*2.5+(hh<0.5?sstep(0.9,1.7,fr)*(land[n]?0.3:1.1):0);
        f+=(1-f)*Math.min(1,dt*gen); f-=f*dt*(land[n]?0.95:0.42); cf[n]=f;
      } }
    if(mc>S.maxCFL) S.maxCFL=mc;
  }
  S.step=function(){
    /* Meeresboden heben: Die Wassertiefe bleibt, der Wasserspiegel steigt mit */
    if(S.tau<RISE+dt&&R>0){ const k1=1-R*rise(S.tau+dt); for(let q=0;q<src.length;q++){ const n=src[q]; b[n]=b0[n]-bD[n]*k1; } }
    if(S.steps&1){ sweepZ(); sweepX(); } else { sweepX(); sweepZ(); }
    sources();
    S.tau+=dt; S.steps++;
  };
  /* Zustand sichern / wiederherstellen (für das Vor- und Zurückspulen) */
  S.save=function(){ const q=new Uint8Array(N*2); for(let n=0;n<N;n++){ q[2*n]=Math.round(ct[n]*255); q[2*n+1]=Math.round(cf[n]*255); }
    return {tau:S.tau,steps:S.steps,h:h.slice(),hu:hu.slice(),hw:hw.slice(),q,k:S.kOf(S.tau)}; };
  S.load=function(K){ h.set(K.h); hu.set(K.hu); hw.set(K.hw); for(let n=0;n<N;n++){ ct[n]=K.q[2*n]/255; cf[n]=K.q[2*n+1]/255; }
    S.tau=K.tau; S.steps=K.steps; const k1=K.k; for(let n=0;n<N;n++) b[n]=b0[n]-bD[n]*k1; };
  /* Für die Darstellung: Wasserspiegel (bei trockenen Zellen der Boden), Tiefe, Trübung, Schaum, Strömung */
  S.pack=function(A,V){ for(let n=0;n<N;n++){ const hh=h[n], o=4*n; A[o]=b[n]+hh; A[o+1]=hh; A[o+2]=ct[n]; A[o+3]=cf[n];
      if(hh>HMIN){ V[2*n]=hu[n]/hh; V[2*n+1]=hw[n]/hh; } else { V[2*n]=0; V[2*n+1]=0; } } };
  /* bilineare Abfrage an einem Punkt: [Wassertiefe, u, w, Bodenhöhe] */
  const smp=[0,0,0,0];
  S.sample=function(x,z){
    const fx=Math.min(fxOf(x),nx-1.001), fz=clamp((z+ZD)/dz-0.5,0,nz-1.001);
    const i=Math.floor(fx), k=Math.floor(fz), ux=fx-i, uz=fz-k, n=k*nx+i;
    const w00=(1-ux)*(1-uz), w10=ux*(1-uz), w01=(1-ux)*uz, w11=ux*uz;
    const n1=n+1, n2=n+nx, n3=n+nx+1;
    const hh=h[n]*w00+h[n1]*w10+h[n2]*w01+h[n3]*w11;
    smp[0]=hh; smp[3]=b[n]*w00+b[n1]*w10+b[n2]*w01+b[n3]*w11;
    if(hh>HMIN){ smp[1]=(hu[n]*w00+hu[n1]*w10+hu[n2]*w01+hu[n3]*w11)/hh; smp[2]=(hw[n]*w00+hw[n1]*w10+hw[n2]*w01+hw[n3]*w11)/hh; } else { smp[1]=0; smp[2]=0; }
    return smp;
  };
  S.mass=function(){ let m=0; for(let k=0;k<nz;k++)for(let i=0;i<nx;i++) m+=h[k*nx+i]*dxs[i]; return m*dz; };
  S.reset();
  return S;
}
