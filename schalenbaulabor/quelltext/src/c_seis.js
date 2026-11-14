/* ================= Teil C: Erdbebenwellen nach PREM · gekrümmte Wellenwege, Laufzeiten, Schattenzone ================= */

/* Strahlverfolgung in der kugelsymmetrischen Erde: Strahlparameter p = r·sin(i)/v bleibt erhalten.
   dΔ/dr = p / (r·√(η²−p²)),  dT/dr = η² / (r·√(η²−p²)),  η = r/v   (Δ Winkelabstand, T Laufzeit) */
function seisTrace(p, wave){
  const W = wave==='P'?2:3, pts=[]; let r=RKM, D=0, T=0, kind=wave, end='surface', bottom=RKM;
  const eta2 = (rr)=>{ const v=premAt(rr,W); return v>0 ? (rr/v)*(rr/v) : -1; };
  pts.push(r,0,0);
  let n=0;
  while(r>0.5){
    const rm=r-0.5, e2=eta2(rm);
    if(e2<0){ end='liquid'; break; }                         // S-Welle trifft auf Flüssigkeit
    const eb=eta2(r-1+1e-4), qb=eb-p*p;
    if(eb<0 && wave==='S'){ const s0=1/(rm*Math.sqrt(Math.max(e2-p*p,1e-9))); D+=p*s0; T+=e2*s0; r-=1; end='liquid'; break; }
    if(qb<=0 || e2-p*p<=0){                                  // Umkehrpunkt in diesem Schritt (oder Totalreflexion an einer Grenze)
      const qa=eta2(r-1e-4)-p*p;
      if(qa>0){ let lo=r-1, hi=r; for(let k=0;k<26;k++){ const m=(lo+hi)/2; if(eta2(m)-p*p>0) hi=m; else lo=m; }
        const rt=hi, qr=eta2(rt+1e-3)-p*p;
        const s=qr>0.2*qa ? (r-rt)*0.5*(1/Math.sqrt(qa)+1/Math.sqrt(qr)) : 2*(r-rt)/Math.sqrt(qa);
        D+=p/r*s; T+=(qa+p*p)/r*s; r=rt; pts.push(r,D,T); }
      break;
    }
    const s=1/(rm*Math.sqrt(e2-p*p)); D+=p*s; T+=e2*s; r-=1;
    if((++n)%12===0) pts.push(r,D,T);
  }
  bottom=r;
  if(end==='liquid'){ pts.push(r,D,T); return {pts, delta:D/DEG, time:T, end, bottom, wave, kind:'S'}; }
  if(r<=0.5){ pts.push(0,D,T); bottom=0; }
  // Rückweg nach oben: Spiegelbild
  const Dt=D, Tt=T, m=pts.length/3;
  for(let k=m-2;k>=0;k--){ pts.push(pts[k*3], 2*Dt-pts[k*3+1], 2*Tt-pts[k*3+2]); }
  if(wave==='P') kind = bottom<1223 ? 'PKIKP' : (bottom<3480 ? 'PKP' : 'P');   // PKIKP: am oder im inneren Kern umgekehrt
  return {pts, delta:2*Dt/DEG, time:2*Tt, end, bottom, wave, kind};
}
const SEIS = { ready:false, rays:[], tP:null, tS:null, tPK:null, edgeP:98, edgeS:98, edgeK:144, tMax:1320 };
function seisPrepare(){
  if(SEIS.ready) return; SEIS.ready=true;
  const vP=premAt(RKM-0.5,2), vS=premAt(RKM-0.5,3), pPmax=RKM/vP, pSmax=RKM/vS;
  const pPc=3480/premAt(3480.01,2), pSc=3480/premAt(3480.01,3), pIc=1221.5/premAt(1221.51,2), pIn=1221.5/premAt(1221.4,2);
  // Laufzeit-Tabellen (0,5°-Schritte): früheste Ankunft
  const NB=361; SEIS.tP=new Float32Array(NB).fill(1e9); SEIS.tS=new Float32Array(NB).fill(1e9); SEIS.tPK=new Float32Array(NB).fill(1e9);
  const put=(arr,d,t)=>{ let x=d%360; if(x>180) x=360-x; const i=Math.round(x*2); if(i>=0&&i<NB&&t<arr[i]) arr[i]=t; };
  const table=(wave,pA,pB,n,arr)=>{ const out=[]; let prev=null;
    for(let k=0;k<n;k++){ const p=pA+(pB-pA)*(k+0.5)/n; const r=seisTrace(p,wave); const row=[p,r.delta,r.time,r.kind,r.end];
      if(r.end==='surface'){ put(arr,r.delta,r.time);
        // zwischen benachbarten Strahlen linear ergänzen
        if(prev && prev[3]===r.kind && Math.abs(prev[1]-r.delta)<8){ const m=Math.ceil(Math.abs(prev[1]-r.delta)*2)+1; for(let q=1;q<m;q++){ const f=q/m; put(arr,prev[1]+(r.delta-prev[1])*f,prev[2]+(r.time-prev[2])*f); } }
        prev=row; } else prev=null;
      out.push(row); } return out; };
  const tabP=table('P',pPc*1.0005,pPmax*0.995,300,SEIS.tP), tabS=table('S',pSc*1.0005,pSmax*0.995,300,SEIS.tS), tabK=table('P',0.5,pPc*0.9995,520,SEIS.tPK);
  // Lücken in den Tabellen schließen (Sprünge an den Übergangszonen)
  const fill=(a,lim)=>{ for(let i=1;i<NB;i++){ if(a[i]>=1e9 && i/2<lim && a[i-1]<1e9){ let j=i; while(j<NB&&a[j]>=1e9) j++; if(j<NB && j/2<=lim+2){ for(let k=i;k<j;k++) a[k]=a[i-1]+(a[j]-a[i-1])*(k-i+1)/(j-i+1); } } } };
  SEIS.edgeP=Math.max(...tabP.filter(x=>x[4]==='surface').map(x=>x[1]));
  SEIS.edgeS=Math.max(...tabS.filter(x=>x[4]==='surface').map(x=>x[1]));
  const pk=tabK.filter(x=>x[3]==='PKP'&&x[4]==='surface').map(x=>x[1]>180?360-x[1]:x[1]);
  SEIS.edgeK=Math.min(...pk);
  fill(SEIS.tP,SEIS.edgeP); fill(SEIS.tS,SEIS.edgeS);
  SEIS.tab={P:tabP,S:tabS,K:tabK};
  // Auswahl der gezeichneten Wellenwege: gleichmäßig nach Ankunftsabstand
  const pick=(tab,targets,kind)=>targets.map(d=>{ let best=null,bd=1e9; for(const x of tab){ if(kind&&x[3]!==kind) continue; if(x[4]!=='surface') continue; const dd=Math.abs(x[1]-d); if(dd<bd){ bd=dd; best=x; } } return best; }).filter(Boolean);
  const rays=[];
  const add=(wave,p,cls)=>{ const r=seisTrace(p,wave); r.cls=cls; rays.push(r); };
  pick(tabP,[12,24,36,48,60,72,84,SEIS.edgeP-0.4]).forEach(x=>add('P',x[0],'P'));
  pick(tabK,[SEIS.edgeK+0.6,150,158,166,174],'PKP').forEach(x=>add('P',x[0],'PKP'));
  // steil in den Kern eintauchende P-Wellen: große Bögen durch den äußeren Kern
  for(const f of [0.985,0.93,0.84]) add('P',pPc*f,'PKP');
  pick(tabK,[125,150,172],'PKIKP').forEach(x=>add('P',x[0],'PKIKP'));
  pick(tabS,[12,24,36,48,60,72,84,SEIS.edgeS-0.4]).forEach(x=>add('S',x[0],'S'));
  for(const f of [0.93,0.80,0.62,0.42,0.2]) add('S',pSc*f,'Sx');
  SEIS.rays=rays; SEIS.tMax=Math.max(...rays.map(r=>r.time))*1.02;
}
// früheste Ankunftszeiten an einer Messstation im Abstand deg (Grad): {P, S, core}
function seisArrivals(deg){ const i=clamp(Math.round(deg*2),0,360);
  const near=(arr)=>{ for(let k=0;k<=8;k++){ if(arr[Math.max(0,i-k)]<1e9) return arr[Math.max(0,i-k)]; if(arr[Math.min(360,i+k)]<1e9) return arr[Math.min(360,i+k)]; } return 1e9; };
  const tp=SEIS.tP[i], ts=SEIS.tS[i], tk=near(SEIS.tPK);
  return { P: (deg<=SEIS.edgeP && tp<1e9)?tp:null, S:(deg<=SEIS.edgeS && ts<1e9)?ts:null, K:(deg>=SEIS.edgeK && tk<1e9)?tk:null }; }
const fmtMin = s => { const m=Math.floor(s/60), r=Math.round(s-m*60); return m+' min '+(r<10?'0':'')+r+' s'; };

/* ---------- Darstellung ---------- */
const seisG=new THREE.Group(); scene.add(seisG); seisG.visible=false; seisG.position.z=0.006;
const SEIS_COL = { P:new THREE.Color(0.20,0.62,1.0), PKP:new THREE.Color(0.20,0.62,1.0), PKIKP:new THREE.Color(0.45,0.92,0.95), S:new THREE.Color(1.0,0.30,0.72), Sx:new THREE.Color(1.0,0.30,0.72) };
const seisMats={}; for(const k in SEIS_COL) seisMats[k]=lmat({color:SEIS_COL[k], linewidth:k==='PKIKP'?1.4:2.0, depthTest:false});
const seisObjs=[]; let seisBuiltExag=-1;
const seisDotGeo=new THREE.CircleGeometry(1,20);
function seisBuild(){
  seisPrepare();
  while(seisG.children.length){ const c=seisG.children.pop(); if(c.geometry&&c.geometry!==seisDotGeo) c.geometry.dispose(); }
  seisObjs.length=0;
  for(const ray of SEIS.rays){
    for(const side of [1,-1]){
      const n=ray.pts.length/3, pos=new Float32Array(n*3), times=new Float32Array(n);
      for(let k=0;k<n;k++){ const r=ray.pts[k*3], D=ray.pts[k*3+1], rm=rad(RKM-r); pos[k*3]=side*rm*Math.sin(D); pos[k*3+1]=rm*Math.cos(D); pos[k*3+2]=0; times[k]=ray.pts[k*3+2]; }
      const g=new THREE.LineGeometry(); g.setPositions(pos);
      const l=new THREE.Line2(g,seisMats[ray.cls]); l.frustumCulled=false; l.renderOrder=30; seisG.add(l);
      const dot=new THREE.Mesh(seisDotGeo,new THREE.MeshBasicMaterial({color:SEIS_COL[ray.cls].clone().multiplyScalar(2.2),depthTest:false,transparent:true})); dot.renderOrder=31; dot.scale.setScalar(0.010); seisG.add(dot);
      let stop=null; if(ray.end==='liquid'){ stop=new THREE.Mesh(new THREE.RingGeometry(0.55,1,20),new THREE.MeshBasicMaterial({color:SEIS_COL.S.clone().multiplyScalar(1.4),depthTest:false,transparent:true})); stop.renderOrder=31; stop.scale.setScalar(0.013); stop.position.set(pos[(n-1)*3],pos[(n-1)*3+1],0); seisG.add(stop); }
      seisObjs.push({ray,l,dot,stop,pos,times,n});
    }
  }
  // Zonen an der Oberfläche
  const band=(d1,d2,col)=>{ for(const side of [1,-1]){ const a1=side>0?(90-d2)*DEG:(90+d1)*DEG; const m=new THREE.Mesh(new THREE.RingGeometry(1.028,1.05,96,1,a1,(d2-d1)*DEG),new THREE.MeshBasicMaterial({color:col,side:THREE.DoubleSide,depthTest:false,transparent:true})); m.renderOrder=29; seisG.add(m); } };
  band(0,SEIS.edgeS,new THREE.Color(0.25,0.85,0.48)); band(SEIS.edgeS,SEIS.edgeK,new THREE.Color(0.30,0.32,0.36)); band(SEIS.edgeK,180,new THREE.Color(0.20,0.55,1.0));
  // Erdbebenherd
  const q=new THREE.Mesh(new THREE.CircleGeometry(0.022,5),new THREE.MeshBasicMaterial({color:new THREE.Color(3.2,0.5,0.3),depthTest:false})); q.position.set(0,rad(0),0); q.rotation.z=Math.PI/2; q.renderOrder=32; seisG.add(q);
  // Messstation
  SEIS.stationMesh=new THREE.Mesh(new THREE.CircleGeometry(0.026,3),new THREE.MeshBasicMaterial({color:new THREE.Color(2.6,2.6,2.6),depthTest:false})); SEIS.stationMesh.renderOrder=33; seisG.add(SEIS.stationMesh);
  seisBuiltExag=exag;
}
const SEISV = { t:0, dur:16, hold:3.5, showP:true, showS:true, station:60, playing:true };
function seisStationPos(deg, out){ const a=deg*DEG, r=1.075; return (out||new V3()).set(r*Math.sin(a), r*Math.cos(a), 0.006); }
function seisUpdate(dt){
  seisG.visible=S.seis && S.openT>3.05; if(!S.seis) return;
  if(S.openT<=3.05){ SEISV.t=0; return; }
  if(seisBuiltExag<0 || (seisBuiltExag!==exag && Math.abs(exag-exagTarget)<1e-4)) seisBuild();
  if(SEISV.playing) SEISV.t+=dt; if(SEISV.t>SEISV.dur+SEISV.hold) SEISV.t=0;
  const tm=Math.min(1,SEISV.t/SEISV.dur)*SEIS.tMax; SEIS.now=tm;
  for(const o of seisObjs){
    const isP=o.ray.wave==='P', vis=isP?SEISV.showP:SEISV.showS;
    o.l.visible=vis; if(!vis){ o.dot.visible=false; if(o.stop) o.stop.visible=false; continue; }
    let k=0; const T=o.times; while(k<o.n && T[k]<=tm) k++;
    o.l.geometry.instanceCount=Math.max(0,k-1);
    const done=k>=o.n; o.dot.visible=!done && k>0;
    if(o.dot.visible){ const f=k<o.n?(tm-T[k-1])/Math.max(1e-6,T[k]-T[k-1]):0; o.dot.position.set(lerp(o.pos[(k-1)*3],o.pos[k*3],f), lerp(o.pos[(k-1)*3+1],o.pos[k*3+1],f), 0); }
    if(o.stop) o.stop.visible=done;
  }
  if(SEIS.stationMesh){ seisStationPos(SEISV.station,SEIS.stationMesh.position); SEIS.stationMesh.position.z=0; SEIS.stationMesh.rotation.z=-SEISV.station*DEG+Math.PI/2+Math.PI; }
}
