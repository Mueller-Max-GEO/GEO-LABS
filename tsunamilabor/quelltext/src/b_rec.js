/* ============================================================================================
   b_rec.js – Zeitachse, Szenarien und Aufzeichnung eines Simulationslaufs (ohne three.js)

   Der Ablauf wird einmal vollständig vorausberechnet. Dabei werden gespeichert:
   · Stützstellen des Wasserzustands (zum freien Vor- und Zurückspulen),
   · für jedes Gebäude, jeden Baum usw. die bisher größte Belastung durch die Strömung,
   · die Bahnen aller treibenden Gegenstände (Autos, Boote, Trümmer),
   · Lage und Höhe der Wellenberge, Wasserstand an der Küste, Reichweite der Überflutung.
   ============================================================================================ */
const SCEN={
  big:  {key:'big',  R:1,    deep:false, hx:XT+DH},
  small:{key:'small',R:0.03, deep:false, hx:XT+DH},
  deep: {key:'deep', R:0,    deep:true,  hx:4.6}
};
/* Anzeigezeit t (Sekunden der Animation) → Simulationszeit tau. Phase 1 läuft vor der Simulation (Zeitraffer),
   das Beben in Zeitlupe, danach etwa gleichmäßig. */
const T1E=14, TQ=14.8, TAU3=1.1, TAU4=4.7, TAU5=9.8, TAUEND=46;
const TSEG=[[0,0],[TQ,0],[19.3,TAU3],[25.3,TAU4],[32.8,TAU5],[64.3,TAUEND]];
const TEND=TSEG[TSEG.length-1][0];
function tauOf(t){ for(let i=1;i<TSEG.length;i++){ if(t<=TSEG[i][0]){ const a=TSEG[i-1],b=TSEG[i]; return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]); } } return TAUEND; }
function tOfTau(tau){ if(tau<=0) return TQ; for(let i=2;i<TSEG.length;i++){ if(tau<=TSEG[i][1]){ const a=TSEG[i-1],b=TSEG[i]; return a[0]+(b[0]-a[0])*(tau-a[1])/(b[1]-a[1]); } } return TEND; }
const MIN_PER_TAU=6.0;          // 1 Simulationseinheit ≈ 6 Minuten (erste Welle nach rund 65 Minuten wie 2011 in der Ebene von Sendai)

const riseOf=tau=>{ const u=clamp(tau/RISE,0,1); return u*u*u*(u*(6*u-15)+10); };
/* Verformung der Platte: 0 = entspannt, 1 = voll verbogen */
function kOfT(t,R){ if(t<T1E) return t/T1E; if(t<TQ) return 1; return 1-R*riseOf(tauOf(t)); }

const DS=0.1, KFS=0.5;          // Abstand der Messwerte / der Stützstellen in Simulationszeit
const E_DAMAGE=0.07, E_DESTROY=0.2;     // Belastung (Wassertiefe + Staudruck), ab der Holzhäuser beschädigt / zerstört werden

function makeRecorder(scn,probes,floaters,opt){
  opt=opt||{}; probes=probes.map(p=>({x:p.x,z:p.z})); floaters=floaters.map(f=>({x0:f.x0,z0:f.z0,ry0:f.ry0,th:f.th,mob:f.mob,spin:f.spin||0,lat:f.lat||0,house:f.house,delay:f.delay}));
  const S=createSim({nx:opt.nx,nz:opt.nz,R:scn.R});
  const nx=S.nx, nz=S.nz, NS=Math.ceil(TAUEND/DS)+2, rowF=(nz-1)*nx;
  const rec={S,scn,NS,KF:[],probes,floaters,done:false,arr:null,maxRun:XC,si:0,
    crR:new Float32Array(NS).fill(XU), crRe:new Float32Array(NS), crL:new Float32Array(NS).fill(XU), crLe:new Float32Array(NS),
    shore:new Float32Array(NS), runX:new Float32Array(NS).fill(XC), flow:new Float32Array(NS*3), wetT:new Float32Array(S.N).fill(1e9), maxEta:new Float32Array(nx)};
  for(const p of probes){ p.E=new Float32Array(NS); p.cur=0; }
  for(const f of floaters){ f.X=new Float32Array(NS); f.Z=new Float32Array(NS); f.Ry=new Float32Array(NS); f.A=new Uint8Array(NS);
    f.x=f.x0; f.z=f.z0; f.ry=f.ry0; f.vx=0; f.vz=0; f.af=0; f.on=f.house==null?1:0; f.moved=0; }
  const iShore=Math.round(S.fxOf(XC-0.35)), FZ=[2.4,0.2,-2.8], iFlow=Math.round(S.fxOf(XC+1.25));
  const kOfZ=z=>clamp(Math.round((z+ZD)/S.dz-0.5),0,nz-1);
  let nextS=0, nextK=0, xr=XU, xl=XU;
  function sample(){
    const si=rec.si; if(si>=NS) return; const h=S.h, b=S.b, tau=S.tau;
    /* Wellenberge auf der Schnittfläche verfolgen */
    if(tau>1.15&&scn.R>0){
      let best=-1,be=-9; const i0=Math.max(0,Math.round(S.fxOf(xr))-2), i1=Math.min(nx-1,Math.round(S.fxOf(Math.min(XC-0.05,xr+0.42))));
      for(let i=i0;i<=i1;i++){ if(h[rowF+i]>0.004){ const e=h[rowF+i]+b[rowF+i]; if(e>be){be=e;best=i;} } }
      if(best>=0&&S.xs[best]>=xr-0.02){ xr=S.xs[best]; rec.crRe[si]=be; } else rec.crRe[si]=si?rec.crRe[si-1]:0;
      best=-1; be=-9; const j1=Math.min(nx-1,Math.round(S.fxOf(xl))+2), j0=Math.max(0,Math.round(S.fxOf(xl-0.5)));
      for(let i=j0;i<=j1;i++){ const e=h[rowF+i]+b[rowF+i]; if(e>be){be=e;best=i;} }
      if(best>=0&&S.xs[best]<=xl+0.02){ xl=S.xs[best]; rec.crLe[si]=be; } else rec.crLe[si]=si?rec.crLe[si-1]:0;
    } else { let e=S.h[rowF+Math.round(S.fxOf(XU))]+S.b[rowF+Math.round(S.fxOf(XU))]; rec.crRe[si]=rec.crLe[si]=Math.max(0,e); }
    rec.crR[si]=xr; rec.crL[si]=xl;
    rec.shore[si]=h[rowF+iShore]>0.004?h[rowF+iShore]+b[rowF+iShore]:-9;
    let run=XC; const kr=kOfZ(0.4)*nx; for(let i=nx-1;i>=0&&S.xs[i]>XC;i--){ if(h[kr+i]>0.012){ run=S.xs[i]; break; } }
    rec.runX[si]=run; if(run>rec.maxRun) rec.maxRun=run;
    for(let q=0;q<3;q++){ const n=kOfZ(FZ[q])*nx+iFlow; rec.flow[si*3+q]=h[n]>0.02?S.hu[n]/h[n]:0; }
    for(const p of probes) p.E[si]=p.cur;
    for(const f of floaters){ f.X[si]=f.x; f.Z[si]=f.z; f.Ry[si]=f.ry; f.A[si]=f.on?(f.af?1:0):2; }
    rec.si=si+1;
  }
  function afterStep(){
    const h=S.h, dt=S.dt, tau=S.tau;
    if(scn.R>0.2){
      /* Belastung der Messpunkte: Wassertiefe + Staudruck der Strömung */
      for(const p of probes){ const s=S.sample(p.x,p.z); if(s[0]>0.006){ const e=s[0]+0.5*(s[1]*s[1]+s[2]*s[2]); if(e>p.cur) p.cur=e; } }
      /* treibende Gegenstände */
      for(const f of floaters){
        if(!f.on){ if(probes[f.house].cur>=E_DESTROY&&tau>=(f.delay||0)+(probes[f.house].tD||(probes[f.house].tD=tau))) f.on=1; else continue; }
        const s=S.sample(f.x,f.z);
        if(s[0]>f.th){ const a=Math.min(1,dt*5); f.vx+=(s[1]-f.vx)*a; f.vz+=(s[2]-f.vz)*a;
          const sp=Math.hypot(f.vx,f.vz); f.x=clamp(f.x+f.vx*f.mob*dt,XL+0.4,XR-0.35); f.z=clamp(f.z+(f.vz*f.mob+f.lat*sp)*dt,-ZD+0.22,ZD-0.22);
          f.ry+=f.spin*sp*dt; f.moved+=sp*dt; f.af=1; }
        else { f.vx=0; f.vz=0; f.af=0; }
      }
      /* Zeitpunkt der ersten Überflutung je Zelle (für nassen, verschlammten Boden) */
      if((S.steps&3)===0){ const wt=rec.wetT, land=S.land; for(let n=0;n<S.N;n++){ if(land[n]&&wt[n]>1e8&&h[n]>0.012) wt[n]=tau; } }
      if(rec.arr===null&&h[rowF+Math.round(S.fxOf(XC+0.15))]>0.03) rec.arr=tau;
    }
    for(let i=0;i<nx;i++){ if(h[rowF+i]>0.004){ const e=h[rowF+i]+S.b[rowF+i]; if(e>rec.maxEta[i]) rec.maxEta[i]=e; } }
  }
  /* rechnet höchstens ms Millisekunden weiter; gibt den Fortschritt 0…1 zurück */
  rec.work=function(ms){
    const t0=Date.now();
    if(scn.R<=0){ if(!rec.KF.length){ rec.KF.push(S.save()); while(rec.si<NS) sample(); } rec.done=true; return 1; }
    while(!rec.done){
      if(S.tau>=nextK-1e-9){ rec.KF.push(S.save()); nextK+=KFS; }
      while(S.tau>=nextS-1e-9&&rec.si<NS){ sample(); nextS+=DS; }
      if(S.tau>=TAUEND){ while(rec.si<NS) sample(); rec.done=true; break; }
      S.step(); afterStep();
      if((S.steps&7)===0&&Date.now()-t0>ms) break;
    }
    return Math.min(1,S.tau/TAUEND);
  };
  /* Simulation auf die Zeit tau bringen (höchstens maxSteps Schritte); true, wenn erreicht */
  rec.seek=function(tau,maxSteps){
    tau=clamp(tau,0,TAUEND-1e-3);
    if(tau<S.tau-1e-9||tau>S.tau+KFS+0.02){ const k=Math.min(rec.KF.length-1,Math.floor(tau/KFS+1e-6)); if(!(S.tau<=tau&&S.tau>=rec.KF[k].tau)) S.load(rec.KF[k]); }
    let n=0; while(S.tau+S.dt<=tau+1e-9){ if(n++>=maxSteps) return false; S.step(); }
    return true;
  };
  /* wie seek, aber auf einen ganzen Rechenschritt genau */
  rec.seekStep=function(n,maxSteps){
    if(S.steps>n||(n-S.steps)*S.dt>KFS+0.05){ let k=Math.min(rec.KF.length-1,Math.floor(n*S.dt/KFS+1e-6)); while(k>0&&rec.KF[k].steps>n) k--; if(!(S.steps<=n&&S.steps>=rec.KF[k].steps)) S.load(rec.KF[k]); }
    let c=0; while(S.steps<n){ if(c++>=maxSteps) return false; S.step(); } return true;
  };
  const sIdx=tau=>clamp(tau/DS,0,NS-1.001);
  rec.at=function(arr,tau,stride,off){ const f=sIdx(tau), i=Math.floor(f), u=f-i; if(stride) return arr[i*stride+off]+(arr[(i+1)*stride+off]-arr[i*stride+off])*u; return arr[i]+(arr[i+1]-arr[i])*u; };
  rec.maxAt=function(arr,tau){ return arr[Math.floor(sIdx(tau))]; };
  rec.floaterAt=function(f,tau,out){ const fs=sIdx(tau), i=Math.floor(fs), u=fs-i; out[0]=f.X[i]+(f.X[i+1]-f.X[i])*u; out[1]=f.Z[i]+(f.Z[i+1]-f.Z[i])*u; out[2]=f.Ry[i]+(f.Ry[i+1]-f.Ry[i])*u; out[3]=f.A[u<0.5?i:i+1]; return out; };
  return rec;
}
