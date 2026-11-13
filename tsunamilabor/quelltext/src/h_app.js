/* ============================================================================================
   h_app.js – Beschriftungen, Ablauf je Bild, Anzeige, Kamera, Steuerung, Vorhersage-Modus, Erklärfilm
   ============================================================================================ */
const T=()=>state.t, TAU=()=>tauOf(state.t), BIG=()=>scen.R>0.2, KK=()=>kOfT(state.t,scen.R);
const midLockX=()=>xAtDist((LOCK0+LOCK1)/2+LOCKDRAG*clamp(KK(),0,1.3));
const surfY=x=>gRest(x,ZD)-KK()*Dpat(x);
addLabel('Ozeanische Platte<small>Beispiel Japan: Pazifische Platte</small>','r',[-12.5,-3.85,ZD],[1,2],{point:false,prio:()=>T()<T1E?6:4});
addLabel('Kontinentale Platte<small>Beispiel Japan: Nordamerikanische Platte</small>','',[2.8,-3.2,ZD],[1,2],{point:false,prio:()=>T()<T1E?6:4});
addLabel('Erdmantel<small>heiß und zähplastisch</small>','g',[-7,-8.2,ZD],[1],{point:false,prio:2});
addLabel('Tiefseegraben<small>Japangraben</small>','',()=>[XT,slabTop(XT)+0.05,ZD],[1,2],{prio:()=>T()<T1E?6:4,cond:()=>T()<TQ+0.4});
addLabel('Subduktion: Platte taucht ab','r',()=>[2.6,slabTop(2.6)-0.85,ZD],[1],{point:false,prio:3});
addLabel('Plattenbewegung<small>rund 8 cm pro Jahr</small>','r',[-11.9,-3.9,ZD+0.16],[1],{prio:4,cond:()=>state.arrows});
addLabel('Blockierter Abschnitt<small>Platten durch Reibung verhakt</small>','a',()=>{const x=midLockX(); return [x,slabTop(x),ZD+0.05];},[1,2],{prio:9,cond:()=>T()<TQ+0.3||scen.deep});
addLabel('Spannung wird abgebaut<small>Platten gleiten ruckartig</small>','a',()=>{const x=midLockX(); return [x,slabTop(x),ZD+0.05];},[2],{prio:9,cond:()=>T()>=TQ+0.3&&!scen.deep});
addLabel('Rand wird nach unten gezogen','a',()=>[XU,surfY(XU),ZD],[1],{prio:7,cond:()=>T()>2});
addLabel('Platte wölbt sich auf','a',()=>[XSUB,surfY(XSUB),ZD],[1],{prio:5,cond:()=>T()>4});
addLabel('Ausgangslage','k',()=>[XSUB+2.2,gRest(XSUB+2.2,ZD),ZD+0.06],[1],{prio:3,cond:()=>state.ghost&&T()>1});
addLabel('Wassersäule wird höher<small>Der Meeresboden sinkt langsam ab</small>','w',()=>[XU+0.4,gRest(XU+0.4,ZD)-KK()*Dpat(XU+0.4)*0.5,ZD+0.02],[1],{prio:8,cond:()=>T()>3});
addLabel('Wasserberg<small>Die ganze Wassersäule wurde angehoben</small>','w',()=>{ const f=frontLevelAt(XU); return [XU,Math.max(0.02,f.h),ZD+0.02]; },[2,3],{prio:9,cond:()=>T()>=TQ+2.2&&TAU()<2.6&&BIG()});
addLabel('Lage vor dem Beben','k',()=>[XSUB+2.2,gRest(XSUB+2.2,ZD)-Dpat(XSUB+2.2),ZD+0.06],[2],{prio:3,cond:()=>state.ghost&&T()>=TQ&&BIG()});
const Lhypo=addLabel('Erdbebenherd','k',()=>{const hx=scen.hx; return [hx,scen.deep?slabTop(hx)-0.6:slabTop(hx)-0.02,ZD+0.05];},[2],{prio:10,icon:'star',cond:()=>T()>=TQ-0.2});
addLabel('Epizentrum','k',()=>[scen.hx,surfY(scen.hx),0],[2],{prio:8,icon:'dot',cond:()=>T()>=TQ-0.2&&!scen.deep});
addLabel('Hebung des Meeresbodens','k',()=>[XU,surfY(XU)-0.5,ZD+0.16],[2],{prio:9,cond:()=>T()>=TQ+0.8&&BIG()});
addLabel('Senkung','k',()=>[XSUB,surfY(XSUB)-0.45,ZD+0.16],[2],{prio:7,cond:()=>T()>=TQ+0.8&&BIG()});
addLabel('federt zurück','a',[-5.2,-3.25,ZD+0.16],[2],{prio:5,cond:()=>T()>=TQ+0.8&&BIG()});
addLabel('Erdbebenwellen','',()=>{const hx=scen.hx,hy=scen.deep?slabTop(hx)-0.6:slabTop(hx); const r=0.2+clamp(T()-TQ,0,3.2)*2.6; return [hx+r*0.7,hy-r*0.7,ZD+0.07];},[2],{prio:3,cond:()=>T()>TQ+0.3&&T()<TQ+2.6});
const LwR=addLabel('Welle Richtung Küste','w',[0,0,ZD],[3,4],{prio:9});
const LwL=addLabel('Welle Richtung offenes Meer','w',[0,0,ZD],[3,4],{prio:8});
addLabel('Normaler Meeresspiegel','k',[XL+1.6,0,ZD+0.06],[3,4,5],{prio:2,cond:()=>state.ghost});
const Lenv=addLabel('Spur des Wellenbergs<small>Er wird im flachen Wasser höher</small>','y',[0,0,ZD],[4],{prio:9,cond:BIG});
const Lgauge=addLabel('Wassertiefe','',[0,0,ZD],[4],{prio:4,cond:BIG});
for(const [x,txt] of [[-12,'4000 m'],[2.0,'200 m'],[6.55,'10 m']]) addLabel(txt,'tag',()=>[x,gRest(x,ZD),ZD+0.05],[4],{prio:3,cond:BIG});
const Ldraw=addLabel('Meer zieht sich zurück<small>Warnzeichen!</small>','w',[XC-0.75,-0.02,ZD-0.4],[4,5],{prio:9,cond:()=>false});
const Lin=addLabel('Wasser strömt ins Landesinnere','w',[0,0,0],[5],{prio:8,cond:()=>false});
const Lback=addLabel('Rückstrom zum Meer<small>zieht Trümmer, Autos und Boote mit</small>','w',[0,0,0],[5],{prio:9,cond:()=>false});
addLabel('Holzhäuser werden zerstört<small>Trümmer treiben mit der Strömung</small>','',[8.2,0.42,1.0],[5],{prio:6,cond:()=>rec&&rec.arr&&TAU()>rec.arr+2.5&&BIG()});
addLabel('Schiff auf dem offenen Meer<small>Die Welle hebt es nur kurz an – keine Schäden</small>','w',()=>{const g=seaBoats[2]; return [g.position.x,g.position.y+0.25,g.position.z];},[3,4],{prio:6,cond:()=>BIG()&&TAU()>2});
addLabel('Schiffe im tiefen Wasser bleiben unbeschädigt','w',()=>{const g=seaBoats[0]; return [g.position.x,g.position.y+0.3,g.position.z];},[5],{prio:4,cond:BIG});
addLabel('Boot wird an Land gespült','w',()=>[boats[1].position.x,boats[1].position.y+0.12,boats[1].position.z],[5],{prio:6,cond:()=>BIG()&&boats[1].position.x>boats[1].userData.x+0.5});
addLabel('Höher gelegener Ort<small>Hier ist man sicher – Evakuierung!</small>','k',()=>[school.userData.x,school.position.y+0.6,school.userData.z],[5],{prio:8});
addLabel('Küste','',[XC,0.02,ZD],[4,5],{prio:3});
addLabel('Vom Graben bis zur Küste<small>in Wirklichkeit rund 200 km</small>','',[0.5,gRest(0.5,ZD),ZD+0.05],[1],{prio:2});
addLabel('Flussmündung mit Hafen','',[7.4,0.0,chZ(7.4)],[4],{prio:2});
const Lwave=addLabel('','w big',[XC-3.6,1.55,ZD],[5],{point:false,prio:6,cond:()=>BIG()&&!state.film});
const Lnone=addLabel('','k big',[-1,1.4,ZD],[3,4,5],{point:false,prio:10,cond:()=>!BIG()});

/* ===================== Szene aktualisieren ===================== */
let lastQuakeShake=false;
const cLockA=new THREE.Color('#E59A1C'), cLockB=new THREE.Color('#C25E00'), cRup=new THREE.Color('#E0342B'), cDone=new THREE.Color('#8E9A90'), _cl=new THREE.Color();
function update(){
  const t=state.t, ph=phaseAt(t), tau=tauOf(t), kk=kOfT(t,scen.R), big=scen.R>0.2, live=big&&rec&&rec.done&&tau>0;
  U.uK.value=kk; U.uTau.value=live?tau:-1; U.uR.value=scen.R;
  const reached=simFrame(tau,kk,state.playing?10:18);
  /* blockierter Abschnitt */
  { const off=LOCKDRAG*clamp(kk,-0.3,1.3);
    if(Math.abs(off-lockOff)>1e-4){ lockOff=off; lockGeo.dispose(); lockGeo=lockGeoFor(off); lockMesh.geometry=lockGeo; placeTeeth(off); }
    teeth.visible=!(t>=TQ&&!scen.deep&&big);
    const a=lockGeo.attributes.color.array, uv=lockGeo.attributes.uv.array, n=lockGeo.attributes.position.count;
    const rr=t<TQ?-1:(t-TQ)*2.2, released=!scen.deep&&t>=TQ; _cl.copy(cLockA).lerp(cLockB,clamp(kk,0,1));
    for(let v=0;v<n;v++){ const d=LOCK0+(LOCK1-LOCK0)*uv[v*2]; let c=_cl;
      if(released){ const dist=Math.abs(d-DH); const reach=big?9:0.5; if(dist<Math.min(rr,reach)) c=(rr-dist<1.4)?cRup:cDone; }
      a[v*3]=c.r;a[v*3+1]=c.g;a[v*3+2]=c.b; }
    lockGeo.attributes.color.needsUpdate=true; }
  /* Marker auf der abtauchenden Platte */
  const moff=LOCKDRAG*clamp(t/T1E,0,1);
  for(const m of markers){ const p=pathAt(m.userData.u0+moff); const nx=-Math.sin(p.a), ny=Math.cos(p.a);
    m.position.set(p.x-nx*0.95,p.y-ny*0.95,ZD+0.012); m.rotation.z=p.a; m.visible=p.y-1.5>YB&&p.x<4.8; m.material.opacity=0.7*sstep(XL,XL+0.6,p.x); }
  updateStrips();
  /* Land */
  updateDamage(tau,live); updateFloaters(tau,live); updateSeaBoats();
  /* Erdbebenwellen */
  const hx=scen.hx, hy=scen.deep?slabTop(hx)-0.6:slabTop(hx)-0.02;
  rings.forEach((r,i)=>{ const u=t-TQ-i*0.45; const on=u>0&&u<3.2&&ph===1; r.visible=on; if(on){ const rad=0.2+u*2.6; r.position.set(hx,hy,ZD+0.07); r.scale.set(rad,rad,1); r.material.opacity=(1-u/3.2)*0.85; } });
  if((state.playing||state.film)&&t>=TQ&&t<TQ+0.25&&!lastQuakeShake&&!REDUCED){ vp.classList.remove('shake'); void vp.offsetWidth; vp.classList.add('shake'); lastQuakeShake=true; }
  if(t<TQ) lastQuakeShake=false;
  /* zusätzliches Wasser: unten über dem abgesenkten Meeresboden (Phase 1), oben als Wasserberg (Phase 2/3) */
  { const z=ZD+0.02;
    const colOp=ph===0?sstep(0.5,2,t):(ph===1?sstep(0.05,0.5,kk):0);
    if(colOp>0.01&&kk>0.02) setBand(colBand,colEdge,XT,-1.6,x=>gRest(x,ZD)-kk*Math.max(0,Dpat(x)),x=>gRest(x,ZD),z,colOp); else { colBand.visible=colEdge.visible=false; }
    const humpOp=big&&t>=TQ?1-sstep(2.0,3.4,tau):0;
    if(humpOp>0.01){ setBand(humpBand,humpEdge,XT-3.5,-0.6,()=>0.0,x=>{ const f=frontLevelAt(x); return f.h-f.g>0.01?f.h:0; },z,humpOp); } else { humpBand.visible=humpEdge.visible=false; } }
  gRestL.visible=state.ghost&&ph===0&&t>0.6;
  gPreL.visible=state.ghost&&ph===1&&t>=TQ&&big;
  seaLine.visible=state.ghost&&ph>=2;
  /* Wellenberge (aus der Aufzeichnung), Spur des Wellenbergs, Tiefenmaß */
  let xr=null, xl=null;
  if(live&&tau>1.5){ xr=rec.at(rec.crR,tau); xl=rec.at(rec.crL,tau); if(xr>XC-0.14) xr=null; if(xl<XL+0.5) xl=null; }
  const showEnv=ph===3&&xr!==null;
  envMesh.visible=showEnv; if(showEnv) updateEnvelope(tau);
  gauge.visible=ph===3&&xr!==null&&xr<XC-0.3;
  if(gauge.visible){ const f2=frontLevelAt(xr); const P=gauge.geometry.attributes.position.array; P[0]=xr;P[1]=f2.h;P[3]=xr;P[4]=f2.g; gauge.geometry.attributes.position.needsUpdate=true; gauge.computeLineDistances(); Lgauge.anchor=()=>[xr,(f2.h+f2.g)/2,ZD+0.08]; }
  if(showEnv){ const ta=lerp(1.4,tau,0.7), xm=rec.at(rec.crR,ta), ym=rec.at(rec.crRe,ta); Lenv.anchor=()=>[xm,ym,ZD+0.09]; }
  /* Pfeile */
  for(const k in A) A[k].visible=false;
  let flowU=0, flowDep=0;
  if(live&&ph===4){ flowU=rec.at(rec.flow,tau,3,0); flowDep=waterAt(XC+1.25,2.4)[1]; }
  if(state.arrows){
    const zf=ZD+0.16;
    if(ph<=1){ setArrow(A.plate1,[-14.3,-3.9,zf],[-11.9,-3.9,zf]); const p0=xAtDist(8.6),p1=xAtDist(10.4); setArrow(A.plate2,[p0,slabTop(p0)-0.75,zf],[p1,slabTop(p1)-0.75,zf]); }
    if(ph===0&&kk>0.08){ const s=0.25+0.75*kk; const yt=surfY(XU);
      setArrow(A.defDown,[XU,yt+0.95,zf],[XU,yt+0.95-0.8*s,zf],sstep(0.08,0.2,kk));
      const yb=surfY(XSUB); setArrow(A.defUp,[XSUB,yb+0.08,zf],[XSUB,yb+0.08+0.55*s,zf],sstep(0.15,0.3,kk));
      setArrow(A.defPush,[-6.0,-3.3,zf],[-6.0+0.9*s,-3.36,zf],sstep(0.1,0.25,kk)); }
    if(ph===1&&t>=TQ&&!scen.deep){ const op=sstep(TQ,TQ+0.4,t);
      const a0=xAtDist(DH-0.7),a1=xAtDist(DH+0.7); const sl=Math.atan(slabSlope(xAtDist(DH))); const nx=-Math.sin(sl)*0.22, ny=Math.cos(sl)*0.22;
      setArrow(A.slipOP,[a1+nx,slabTop(a1)+ny,zf],[a0+nx,slabTop(a0)+ny,zf],op); setArrow(A.slipSl,[a0-nx,slabTop(a0)-ny,zf],[a1-nx,slabTop(a1)-ny,zf],op);
      if(big){ setArrow(A.spring,[-4.3,-3.35,zf],[-5.7,-3.2,zf],op);
        const yu=surfY(XU); setArrow(A.floorUp,[XU,yu-0.95,zf],[XU,yu-0.06,zf],op);
        const yd=surfY(XSUB); setArrow(A.floorDn,[XSUB,yd-0.05,zf],[XSUB,yd-0.85,zf],op); } }
    if(big){
      if(t>=TQ+0.8&&tau<2.0){ const op=sstep(TQ+0.8,TQ+1.6,t)*(1-sstep(1.5,2.0,tau));
        [[A.col1,XU-0.8],[A.col2,XU],[A.col3,XU+0.8]].forEach(([a,x])=>{ const g=surfY(x); setArrow(a,[x,g+0.25,zf],[x,g+0.25+Math.min(1.7,(-g)*0.62),zf],op); }); }
      if(ph===2||ph===3){ const op=sstep(1.7,2.5,tau), cMax=Math.sqrt(3.2);
        if(xr!==null){ const y=Math.max(0,frontLevelAt(xr).h)+0.3; const len=0.35+1.6*Math.sqrt(depthRest(xr))/cMax; setArrow(A.waveR,[xr-len*0.4,y,zf],[xr+len*0.6,y,zf],op); LwR.anchor=()=>[xr+len*0.6,y,zf]; }
        if(xl!==null){ const y=Math.max(0,frontLevelAt(xl).h)+0.3; const len=0.35+1.6*Math.sqrt(depthRest(xl))/cMax; setArrow(A.waveL,[xl+len*0.4,y,zf],[xl-len*0.6,y,zf],op); LwL.anchor=()=>[xl-len*0.6,y,zf]; } }
      if(ph===4&&live){ [[A.flow1,2.4,0],[A.flow2,0.2,1],[A.flow3,-2.8,2]].forEach(([ar,z,q])=>{ const u=rec.at(rec.flow,tau,3,q), w=waterAt(XC+1.25,z);
          if(w[1]>0.025&&Math.abs(u)>0.035){ const y=w[0]+0.14, L=clamp(Math.abs(u)*3.2,0.55,1.7), xm=XC+1.25; setArrow(ar,u>0?[xm-L/2,y,z]:[xm+L/2,y,z],u>0?[xm+L/2,y,z]:[xm-L/2,y,z],sstep(0.025,0.05,w[1])); if(q===0){ Lin.anchor=Lback.anchor=()=>[xm,y,z]; } } }); }
    }
  }
  /* Sichtbarkeit der Beschriftungen */
  const lvlShore=waterAt(XC-0.75,ZD-0.4), drawback=live&&tau>5&&rec.arr&&tau<rec.arr+0.3&&lvlShore[0]<-0.03;
  if(drawback) Ldraw.anchor=()=>[XC-0.75,lvlShore[0],ZD-0.4];
  for(const L of labels){ let vis=state.labels&&L.phases.includes(ph+1)&&(!L.cond||L.cond());
    if(L===Ldraw) vis=state.labels&&ph>=3&&drawback;
    if(L===Lin) vis=state.labels&&ph===4&&flowDep>0.03&&flowU>0.06&&state.arrows&&A.flow1.visible;
    if(L===Lback) vis=state.labels&&ph===4&&flowDep>0.025&&flowU<-0.04&&state.arrows&&A.flow1.visible;
    if(L===LwR) vis=vis&&big&&xr!==null&&tau>2.4&&state.arrows;
    if(L===LwL) vis=vis&&big&&xl!==null&&tau>2.4&&state.arrows;
    if(L===Lenv) vis=vis&&envMesh.visible&&tau>TAU4+1.2;
    if(L===Lgauge) vis=vis&&gauge.visible;
    L.vis=vis; }
  if(ph===4&&live&&rec.arr){ setLabelHTML(Lwave,tau<rec.arr-0.2?'Der Tsunami erreicht die Küste':(tau<rec.arr+8?'Die erste Welle überflutet die Küste<small>keine Surfwelle, sondern eine strömende Flut</small>':'Die Gefahr ist nicht vorbei<small>Weitere Wellen können über Stunden folgen.</small>')); }
  setLabelHTML(Lnone,scen.deep?'Kein Tsunami<small>Der Herd liegt zu tief – der Meeresboden bewegt sich kaum.</small>':'Kein gefährlicher Tsunami<small>Bei Magnitude 6 hebt sich der Meeresboden nur wenig, auf kleiner Fläche.</small>');
  setLabelHTML(Lhypo,scen.deep?'Erdbebenherd<small>rund 300 km tief</small>':'Erdbebenherd<small>rund 30 km tief</small>');
  updateHUD(t,ph,kk,tau,xr);
  return reached;
}

/* ===================== Anzeige ===================== */
const DMAP=[[0.04,2],[0.1,10],[0.35,50],[0.85,200],[1.5,1000],[2.3,2500],[3.0,4000],[3.5,5500]];
function realDepth(dm){ if(dm<=DMAP[0][0]) return DMAP[0][1]; for(let i=1;i<DMAP.length;i++){ if(dm<=DMAP[i][0]){ const [a,ra]=DMAP[i-1],[b,rb]=DMAP[i]; const u=(dm-a)/(b-a); return Math.exp(lerp(Math.log(ra),Math.log(rb),u)); } } return DMAP[DMAP.length-1][1]; }
const de=(v,d=0)=>v.toLocaleString('de-DE',{maximumFractionDigits:d,minimumFractionDigits:d});
function updateHUD(t,ph,kk,tau,xr){
  const P=PH[ph]; $('clockTitle').textContent=`Phase ${P.n} · ${P.short}`;
  let txt='';
  if(ph===0) txt=`Jahr ${Math.round(clamp(t/T1E,0,1)*50)*10} – die Spannung wächst`;
  else if(ph===1) txt=t<TQ?'kurz vor dem Beben':`${Math.round(Math.min(tau,TAU3)/TAU3*18)*10} Sekunden nach Bebenbeginn`;
  else { const m=tau*MIN_PER_TAU; txt=m<90?`etwa ${Math.round(m/5)*5} Minuten nach dem Beben`:`etwa ${de(Math.round(m/30)/2,1)} Stunden nach dem Beben`; }
  $('clockTime').textContent=txt; const pl=$('clockPill'); pl.className='pill '+P.pill[0]; pl.textContent=P.pill[1];
  $('meter').hidden=ph>1;
  $('meterBar').style.width=(clamp(kk,0,1)*100)+'%';
  { const ex=kk*7; $('wcolTxt').textContent=ph===0||t<TQ?`Wassersäule über dem Plattenrand: +${de(ex,1)} m`:(scen.R>0.2?`Meeresboden hebt sich um bis zu ${de(Math.max(0,(1-kk))*7,1)} m`:'Meeresboden bleibt fast in Ruhe'); }
  $('meterLab').textContent=ph===0?'Spannung in der Platte':(t<TQ?'Spannung maximal':(scen.R>0.2?'Spannung wird abgebaut':(scen.deep?'Spannung bleibt (Beben in der Tiefe)':'Spannung kaum abgebaut')));
  const showW=xr!==null&&tau>2.6&&(ph===2||ph===3);
  $('wcard').hidden=!showW||state.film;
  if(showW){ const d=realDepth(depthRest(xr)), v=Math.sqrt(9.81*d)*3.6, Lk=v*0.3, Hm=Math.min(12,0.5*Math.sqrt(4000/d));
    $('wvD').textContent=d>=100?`${de(Math.round(d/10)*10)} m`:`${de(Math.max(1,Math.round(d)))} m`; $('wbD').style.width=clamp(d/4500*100,1,100)+'%';
    $('wvV').textContent=`${de(Math.round(v/5)*5)} km/h`; $('wbV').style.width=clamp(v/800*100,1,100)+'%';
    $('wvL').textContent=`${de(Lk,Lk<20?1:0)} km`; $('wbL').style.width=clamp(Lk/240*100,1,100)+'%';
    $('wvH').textContent=Hm<1?'unter 1 m':(Hm>=9.5?'rund 10 m':`${de(Hm,Hm<3?1:0)} m`); $('wbH').style.width=clamp(Hm/12*100,3,100)+'%'; }
  const sl=$('time'); if(document.activeElement!==sl) sl.value=Math.round(t/TEND*1000);
  sl.setAttribute('aria-valuetext',`Phase ${P.n}: ${P.name}`);
  document.querySelectorAll('.tick').forEach((b,i)=>b.classList.toggle('cur',i===ph));
  bandEls.forEach((b,i)=>{ b.classList.toggle('cur',i===ph); b.classList.toggle('done',i<ph); });
  updateGauge(tau);
  if(curPhaseShown!==ph) showPhase(ph);
}
let curPhaseShown=-1;
function showPhase(ph){
  curPhaseShown=ph; const P=PH[ph];
  const X=PHX[ph]; $('exStep').textContent=`Phase ${P.n} von 5 · ${P.pill[1]}`; $('exTitle').textContent=P.name; $('exText').textContent=P.text; $('exLook').textContent=P.look;
  $('keyV').textContent=X.kv; $('keyL').textContent=X.kl; $('taskQ').textContent=X.q; $('taskA').textContent=X.a; $('taskD').open=false;
  document.querySelectorAll('.phase').forEach((b,i)=>b.setAttribute('aria-current',i===ph?'step':'false'));
  if(state.autoCam&&state.view==='oblique'&&!state.film) camTo(P.key==='quake'&&scen.deep?'deepq':P.key);
}

/* ===================== Pegel: Wasserstand an der Küste über die Zeit ===================== */
const GW=320, GH=96, GX0=30, GX1=312, GY0=10, GY1=76, GMIN=-0.12, GMAX=0.2;
const gx=tau=>GX0+(GX1-GX0)*clamp(tau/TAUEND,0,1), gy=e=>GY1-(GY1-GY0)*(clamp(e,GMIN,GMAX)-GMIN)/(GMAX-GMIN);
function buildGauge(){
  let d='', ar=''; const ok=rec&&rec.done&&scen.R>0;
  for(let i=0;i<=230;i++){ const tau=TAUEND*i/230; let e=ok?rec.at(rec.shore,tau):0; if(e<-1) e=GMIN; const x=gx(tau).toFixed(1), y=gy(e).toFixed(1); d+=(i?'L':'M')+x+','+y; }
  ar=d+`L${GX1},${gy(0).toFixed(1)}L${GX0},${gy(0).toFixed(1)}Z`;
  let tx=''; for(const h of [0,1,2,3,4]){ const tau=h*60/MIN_PER_TAU; if(tau>TAUEND) break; tx+=`<line class="ax" x1="${gx(tau)}" y1="${GY1+2}" x2="${gx(tau)}" y2="${GY1+6}" style="stroke-dasharray:none"/><text class="tx" x="${gx(tau)}" y="${GH-4}" text-anchor="${h?'middle':'start'}">${h===0?'Beben':h+' h'}</text>`; }
  $('gaugeSvg').innerHTML=`<path class="ar" d="${ar}"/><line class="ax" x1="${GX0}" y1="${gy(0)}" x2="${GX1}" y2="${gy(0)}"/><text class="tx" x="2" y="${gy(0)+3}">normal</text><text class="tx" x="2" y="${GY0+6}">hoch</text><text class="tx" x="2" y="${GY1}">tief</text>${tx}<path class="ln" d="${d}"/><line class="cur" id="gCur" x1="0" y1="${GY0-4}" x2="0" y2="${GY1+2}"/><circle class="dot" id="gDot" r="3.5" cx="0" cy="0"/>`;
}
function updateGauge(tau){ const c=$('gCur'); if(!c) return; const ok=rec&&rec.done&&scen.R>0; let e=ok?rec.at(rec.shore,tau):0; if(e<-1) e=GMIN; const x=gx(Math.max(0,tau)), y=gy(e);
  c.setAttribute('x1',x); c.setAttribute('x2',x); const d=$('gDot'); d.setAttribute('cx',x); d.setAttribute('cy',y); }

/* ===================== Kamera ===================== */
const CAMS={
  oblique:{p:[10,12,35],t:[-1,-3,0]},
  intro:{p:[-2,3.5,40],t:[-2,-3.4,0]},
  lock:{p:[-1.4,2.4,21.5],t:[-4.4,-3.4,2]},
  quake:{p:[-1.4,3.0,22.5],t:[-4.4,-3.0,2]},
  water:{p:[-9,9,30],t:[-3.5,-1.6,0]},
  spread:{p:[-0.5,4.4,34],t:[-0.5,-1.3,0]},
  coast:{p:[2.4,3.0,15],t:[7.6,-0.1,1.4]},
  flood:{p:[3.4,5.2,15],t:[8.9,0.1,0.8]},
  back:{p:[5.2,3.6,13],t:[8.1,0.0,2.0]},
  safe:{p:[5.4,4.6,14],t:[10.4,0.45,0.8]},
  deepq:{p:[6,1,30],t:[2.5,-6.2,1]},
  top:{p:[-2,44,5],t:[-2,-1,0]}
};
let tween=null;
function camTo(key,dur=1.2){ const c=CAMS[key]; if(!c) return; const t1=new THREE.Vector3(...c.t), p1=new THREE.Vector3(...c.p);
  if(key!=='section'){ const k=Math.pow(clamp(1.5/freeAspect,0.9,2.4),0.75); p1.sub(t1).multiplyScalar(k).add(t1); }
  tween={p0:camera.position.clone(),t0:controls.target.clone(),p1,t1,s:performance.now(),d:(REDUCED?0.01:dur)*1000}; }
function sectionCam(){ const w=vp.clientWidth,h=vp.clientHeight,asp=w/h; const halfW=14.8*asp/freeAspect, halfH=8.4; const tanv=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const dist=Math.max(halfH/tanv,halfW/(tanv*asp))+ZD; return {p:[-2,-3.9,dist],t:[-2,-3.9,0]}; }
function setView(v,quiet){
  state.view=v; state.dirty=true; document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));
  controls.enableRotate=v!=='section';
  if(v==='section'){ CAMS.section=sectionCam(); camTo('section',0.9); if(!quiet) note('Querschnittsansicht: Die Vorderseite des Blocks ist ein Schnitt durch die Subduktionszone. Drehen ist hier gesperrt; vergrößern und verschieben geht.',4200); }
  else if(v==='top'){ camTo('top',1.0); }
  else if(v==='coast'){ camTo('flood',1.0); }
  else { camTo(state.autoCam?PH[phaseAt(state.t)].key:'oblique',1.0); }
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
function zoom(f){ const d=camera.position.clone().sub(controls.target); d.multiplyScalar(f); d.setLength(clamp(d.length(),controls.minDistance,controls.maxDistance)); camera.position.copy(controls.target).add(d); needsRender=true; }
$('zin').onclick=()=>zoom(0.82); $('zout').onclick=()=>zoom(1.22);
controls.addEventListener('start',()=>{ tween=null; });
let toastTimer=null;
function toast(msg,ms=2600){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),ms); }
let noteTimer=null;
function note(msg,ms){ const el=$('viewnote'); el.textContent=msg; el.hidden=false; clearTimeout(noteTimer); if(ms) noteTimer=setTimeout(()=>el.hidden=true,ms); }

/* ===================== Steuerung ===================== */
const app=$('app');
const ticks=$('ticks'), bandEls=[];
PH.forEach((P,i)=>{ const sp=document.createElement('span'); sp.style.flex=`${P.t1-P.t0} 0 0`; sp.style.background=PHX[i].c; $('bands').appendChild(sp); bandEls.push(sp);
  const b=document.createElement('button'); b.className='tick'; b.type='button'; b.style.setProperty('--c',PHX[i].c);
  b.style.left=(P.t0/TEND*100)+'%'; b.style.width=((P.t1-P.t0)/TEND*100)+'%';
  b.innerHTML=`<b>${P.n}</b>${P.short}`; b.setAttribute('aria-label',`Phase ${P.n}: ${P.name}`); b.title=`Phase ${P.n}: ${P.name}`;
  b.onclick=()=>gotoPhase(i,true); ticks.appendChild(b); });
const plist=$('phases');
PH.forEach((P,i)=>{ const li=document.createElement('li'); const b=document.createElement('button'); b.className='phase'; b.type='button';
  b.textContent=P.n; b.title=`Phase ${P.n}: ${P.name}`; b.setAttribute('aria-label',`Phase ${P.n}: ${P.name}`); b.onclick=()=>gotoPhase(i,true); li.appendChild(b); plist.appendChild(li); });
function maxAllowed(){ if(state.mode!=='task') return TEND; const q=task; if(q.idx>=5) return TEND; return q.stage==='ask'?PH[q.idx].t0:PH[q.idx].t1; }
function setTime(t){ state.t=clamp(t,0,maxAllowed()); state.dirty=true; }
function play(){ if(state.t>=maxAllowed()-1e-3){ if(state.mode==='task') return; setTime(0); } state.playing=true; syncButtons(); }
function pause(){ state.playing=false; state.stopAt=null; syncButtons(); }
function syncButtons(){ const lockT=state.mode==='task';
  $('bPlay').disabled=lockT&&!state.playing&&(task.stage==='ask'&&task.idx<5); $('playIcon').setAttribute('d',state.playing?'M7 5h4v14H7zM13 5h4v14h-4z':'M8 5v14l11-7z'); $('bPlay').setAttribute('aria-label',state.playing?'Pause':'Start');
  document.querySelectorAll('.phase,.tick').forEach(b=>b.disabled=lockT); $('bNext').disabled=lockT; $('bPrev').disabled=lockT; $('time').disabled=lockT&&task.stage==='ask'; }
function gotoPhase(i,andPlay){ if(state.mode==='task') return; i=clamp(i,0,4); setTime(PH[i].t0+(i===0?0:0.001)); state.stopAt=PH[i].t1; if(andPlay) state.playing=true; syncButtons(); }
$('bPlay').onclick=()=>{ if(state.playing) pause(); else { state.stopAt=null; play(); } };
$('bNext').onclick=()=>{ const ph=phaseAt(state.t); if(state.t>=TEND-0.01) return; const nx=(state.t<PH[ph].t0+0.05&&!state.playing)?ph:ph+1; if(nx>4){ setTime(TEND); pause(); return;} gotoPhase(nx,true); };
$('bPrev').onclick=()=>{ const ph=phaseAt(state.t); const pv=(state.t>PH[ph].t0+0.6)?ph:ph-1; gotoPhase(Math.max(0,pv),true); };
$('bReset').onclick=()=>{ pause(); if(state.mode==='task'){ startTask(); } else setTime(0); setView('oblique',true); if(!state.autoCam) camTo('oblique'); };
$('speed').onchange=e=>state.speed=+e.target.value;
$('stopEach').onchange=e=>state.stopEach=e.target.checked;
$('time').addEventListener('input',e=>{ pause(); setTime(e.target.value/1000*TEND); });
document.querySelectorAll('input[name=lvl]').forEach(r=>r.addEventListener('change',e=>{ state.lvl=e.target.value; state.labels=state.lvl!=='off'; state.dirty=true; }));
$('tArrows').onchange=e=>{state.arrows=e.target.checked;state.dirty=true;};
$('tGhost').onchange=e=>{state.ghost=e.target.checked;state.dirty=true;};
$('tSimp').onchange=e=>{ $('simp').hidden=!e.target.checked; };
$('tCam').onchange=e=>{state.autoCam=e.target.checked; if(state.autoCam&&state.view==='oblique') camTo(PH[phaseAt(state.t)].key);};
const SCEN_MSG={big:'Starkes, flaches Beben: Der Meeresboden hebt sich stark – ein Tsunami entsteht.',small:'Magnitude 6: Der Meeresboden hebt sich nur wenig – höchstens eine winzige Welle.',deep:'Tiefes Beben: Die Erde bebt, aber der Meeresboden hebt sich kaum – kein Tsunami.'};
document.querySelectorAll('input[name=scen]').forEach(r=>r.addEventListener('change',e=>setScen(e.target.value)));
/* Tabs, Bedienfeld, Vollbild */
function selectTab(k){ for(const b of document.querySelectorAll('.tabs button')){ const on=b.id==='tab-'+k; b.setAttribute('aria-selected',String(on)); $(b.getAttribute('aria-controls')).hidden=!on; } }
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>selectTab(b.id.slice(4))));
function togglePanel(){ const off=app.classList.toggle('nopanel'); $('bPanel').textContent=off?'Bedienfeld ein':'Bedienfeld aus'; resize(); }
$('bPanel').onclick=togglePanel;
function toggleFull(){ const d=document, el=app; if(d.fullscreenElement||d.webkitFullscreenElement){ (d.exitFullscreen||d.webkitExitFullscreen).call(d); } else { const f=el.requestFullscreen||el.webkitRequestFullscreen; if(f) f.call(el).catch?.(()=>toast('Vollbild ist hier nicht verfügbar.')); else toast('Vollbild ist hier nicht verfügbar.'); } }
$('bFull').onclick=toggleFull;
document.addEventListener('keydown',e=>{ if(e.target.closest('select,textarea')||(e.target.closest('input')&&e.target.type==='range'&&e.key.startsWith('Arrow'))) return; if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(state.film){ if(e.key==='Escape'){ filmEnd(); } else if(e.code==='Space'){ e.preventDefault(); $('fPlay').click(); } else if(e.key==='ArrowRight'){ $('fNext').click(); } else if(e.key==='ArrowLeft'){ $('fPrev').click(); } return; }
  if(e.code==='Space'&&!e.target.closest('button,input')){ e.preventDefault(); $('bPlay').click(); }
  else if(e.key==='ArrowRight'){ $('bNext').click(); } else if(e.key==='ArrowLeft'){ $('bPrev').click(); }
  else if(e.key>='1'&&e.key<='5'&&!e.target.closest('input')){ gotoPhase(+e.key-1,true); }
  else if(e.key==='f'||e.key==='F'){ toggleFull(); } else if(e.key==='b'||e.key==='B'){ togglePanel(); } });

/* ===================== Szenario wählen: Simulation (neu) berechnen ===================== */
const recCache={}; let preparing=false;
function setScen(key,quiet){
  const inp=document.querySelector(`input[name=scen][value=${key}]`); if(inp) inp.checked=true;
  if(scen.key===key&&rec&&rec.done) return Promise.resolve();
  scen=SCEN[key]; curPhaseShown=-1;
  return prepare().then(()=>{ if(!quiet&&state.mode!=='task'&&!state.film){ setTime(PH[1].t0); toast(SCEN_MSG[key],4800); state.stopAt=null; state.playing=true; syncButtons(); } });
}
function prepare(){
  pause(); preparing=true; simN=-2;
  const veil=$('loading'), first=!veil.classList.contains('soft');
  const finish=()=>{ preparing=false; applyWetMap(); buildGauge(); state.dirty=true; veil.classList.add('hide'); setTimeout(()=>{ veil.classList.add('soft'); },600); };
  if(recCache[scen.key]){ rec=recCache[scen.key]; finish(); return Promise.resolve(); }
  rec=makeRecorder(scen,probes,floatSpecs,SIMQ);
  if(scen.R<=0){ rec.work(1); recCache[scen.key]=rec; finish(); return Promise.resolve(); }
  veil.classList.remove('hide'); $('loadTxt').textContent='Das Wasser wird berechnet';
  return new Promise(res=>{ const tick=()=>{ const p=rec.work(first?45:30); $('loadBar').style.width=(p*100).toFixed(1)+'%';
      if(rec.done){ if(scen.key!=='small') recCache[scen.key]=rec; finish(); res(); } else setTimeout(tick,0); }; setTimeout(tick,30); });
}

/* ===================== Vorhersage-Modus ===================== */
const task={idx:0,stage:'ask',choice:null,score:0,answered:[],order:[]};
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function startTask(){ task.idx=0; task.stage='ask'; task.choice=null; task.score=0; task.answered=[]; task.order=QUIZ.map(q=>shuffle(q.o.map((_,i)=>i)));
  setScen('big',true);
  state.playing=false; state.t=0; state.dirty=true; renderTask(); syncButtons(); }
function renderTask(){
  const q=QUIZ[task.idx]; if(!q) return;
  $('score').textContent=`${task.score} von ${task.answered.length} richtig`;
  $('qText').textContent=(task.idx<5?`Vor Phase ${task.idx+1}: `:'')+q.q;
  const fs=$('qOpts'); fs.querySelectorAll('.opt').forEach(e=>e.remove());
  task.order[task.idx].forEach(oi=>{ const [txt]=q.o[oi]; const l=document.createElement('label'); l.className='opt';
    l.innerHTML=`<input type="radio" name="qopt" value="${oi}"><span>${txt}</span>`; fs.appendChild(l);
    l.querySelector('input').onchange=()=>{ task.choice=oi; $('qSubmit').disabled=false; }; });
  $('qSubmit').hidden=false; $('qSubmit').disabled=true; $('qSubmit').textContent=task.idx<5?'Vorhersage prüfen ▶':'Antwort prüfen';
  $('qNext').hidden=true; $('qReplay').hidden=true; $('qFb').className='fb'; $('qFb').innerHTML='';
  if(task.idx<5) note(`Vorhersage: Was passiert in Phase ${task.idx+1}? Wähle rechts eine Antwort.`); else $('viewnote').hidden=true;
}
$('qSubmit').onclick=()=>{
  if(task.choice===null) return;
  document.querySelectorAll('#qOpts input').forEach(i=>{ i.disabled=true; i.closest('.opt').classList.add('dis'); });
  $('qSubmit').hidden=true;
  if(task.idx<5){ task.stage='watch'; $('viewnote').hidden=true; setTime(PH[task.idx].t0+0.001); state.stopAt=PH[task.idx].t1; state.playing=true; syncButtons();
    $('qFb').className='fb info'; $('qFb').innerHTML='<p>Beobachte die Animation. Danach siehst du, ob deine Vorhersage stimmt.</p>'; }
  else showTaskFeedback();
};
function showTaskFeedback(){
  const q=QUIZ[task.idx], [,ok,why]=q.o[task.choice]; const right=q.o.findIndex(o=>o[1]);
  if(!task.answered.includes(task.idx)){ task.answered.push(task.idx); if(ok) task.score++; }
  document.querySelectorAll('#qOpts .opt').forEach(l=>{ const v=+l.querySelector('input').value; if(v===right) l.classList.add('ok'); else if(v===task.choice) l.classList.add('bad'); });
  const fb=$('qFb'); fb.className='fb '+(ok?'ok':'bad');
  fb.innerHTML=`<p><b>${ok?'Gut vorhergesagt!':'Nicht ganz.'}</b> ${why}</p>`+(ok?'':`<p>${q.o[right][2]}</p>`);
  $('score').textContent=`${task.score} von ${task.answered.length} richtig`;
  task.stage='feedback';
  if(task.idx<5){ $('qReplay').hidden=false; $('qNext').hidden=false; $('qNext').textContent=task.idx<4?'Nächste Vorhersage':'Zur Transferfrage'; }
  else { fb.innerHTML+=`<p><b>Ergebnis: ${task.score} von 6 richtig.</b></p><p><button class="btn" id="tryDeep">Im Modell ausprobieren: tiefes Beben</button></p>`;
    $('qNext').hidden=false; $('qNext').textContent='Noch einmal von vorn';
    $('tryDeep').onclick=()=>{ setMode('explore'); selectTab('ex'); setScen('deep'); }; }
  syncButtons();
}
$('qNext').onclick=()=>{ if(task.idx>=5){ startTask(); return; } task.idx++; task.stage='ask'; task.choice=null; if(task.idx===5){ state.t=TEND; state.dirty=true; } renderTask(); syncButtons(); };
$('qReplay').onclick=()=>{ setTime(PH[task.idx].t0+0.001); state.stopAt=PH[task.idx].t1; state.playing=true; syncButtons(); };
function setMode(m){ state.mode=m; $('qcard').hidden=m!=='task'; $('taskIntro').hidden=m==='task';
  if(m==='task'){ startTask(); setView('oblique'); } else { $('viewnote').hidden=true; } syncButtons(); }
$('taskStart').onclick=()=>{ pause(); setMode('task'); };
$('taskEnd').onclick=()=>{ pause(); setMode('explore'); };

/* ===================== Erklärfilm ===================== */
const film={ch:0,sh:0,el:0,dur:1,paused:false,wait:false,speaking:false,ended:false};
const shotDur=s=>Math.max(1.8+s.text.length*0.068,(s.b-s.a)*1.0);
$('chapters').innerHTML=FILM.map((c,i)=>`<button type="button" data-ch="${i}" title="${c.title}">${c.title}</button>`).join('');
$('chapters').querySelectorAll('button').forEach(b=>b.onclick=()=>filmShot(+b.dataset.ch,0));
function speak(text){ film.speaking=false; if(!('speechSynthesis' in window)) return; speechSynthesis.cancel(); if(!$('fVoice').checked) return;
  const u=new SpeechSynthesisUtterance(text.replace(/–/g,',')); u.lang='de-DE'; const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.startsWith('de')); if(v) u.voice=v; u.rate=0.95;
  film.speaking=true; const sh=film.sh, ch=film.ch; const done=()=>{ if(film.sh===sh&&film.ch===ch) film.speaking=false; }; u.onend=done; u.onerror=done; setTimeout(done,(film.dur+6)*1000); speechSynthesis.speak(u); }
function filmStart(){
  pause(); if(state.mode==='task') setMode('explore');
  const go=()=>{ state.film=true; app.classList.add('film'); $('bFilm').textContent='■ Film beenden'; $('cap').hidden=false; $('cinenav').hidden=false; $('dock').hidden=true; $('viewnote').hidden=true; resize();
    if(state.view!=='oblique') setView('oblique',true); hudStamp=0; filmShot(0,0); };
  if(scen.key!=='big') setScen('big',true).then(go); else go();
}
function filmShot(ch,sh){ film.ch=ch; film.sh=sh; const s=FILM[ch].shots[sh]; film.el=0; film.dur=shotDur(s); film.paused=false; film.wait=false; film.ended=false;
  state.t=s.a; state.dirty=true; $('capCh').textContent=FILM[ch].title; $('capTx').textContent=s.text; camTo(s.cam,1.8); speak(s.text);
  $('fPlay').textContent='Pause'; $('chapters').querySelectorAll('button').forEach((b,i)=>{ b.classList.toggle('cur',i===ch); b.classList.toggle('done',i<ch); }); }
function filmStep(dt){
  if(film.paused||film.wait) return; film.el+=dt; const s=FILM[film.ch].shots[film.sh], u=clamp(film.el/film.dur,0,1);
  const nt=s.a+(s.b-s.a)*u; if(nt!==state.t){ state.t=nt; state.dirty=true; }
  $('fProg').style.width=((film.sh+u)/FILM[film.ch].shots.length*100).toFixed(1)+'%';
  if(u>=1&&!film.speaking){
    if(film.sh+1<FILM[film.ch].shots.length) filmShot(film.ch,film.sh+1);
    else if(film.ch+1<FILM.length){ if($('fStop').checked){ film.wait=true; $('fPlay').textContent='Weiter ▶'; } else filmShot(film.ch+1,0); }
    else { film.wait=true; film.ended=true; $('fPlay').textContent='Noch einmal ↺'; } }
}
function filmEnd(){ state.film=false; app.classList.remove('film'); $('bFilm').textContent='▶ Erklärfilm'; $('cap').hidden=true; $('cinenav').hidden=true; $('dock').hidden=false; resize(); if(state.autoCam) camTo(PH[phaseAt(state.t)].key); if('speechSynthesis' in window) speechSynthesis.cancel(); hudStamp=0; state.dirty=true; curPhaseShown=-1; syncButtons(); }
$('bFilm').onclick=()=>{ if(state.film) filmEnd(); else filmStart(); }; $('fEnd').onclick=filmEnd;
$('fPlay').onclick=()=>{ if(film.ended){ filmShot(0,0); } else if(film.wait){ filmShot(film.ch+1,0); } else { film.paused=!film.paused; $('fPlay').textContent=film.paused?'Weiter ▶':'Pause'; if(film.paused&&'speechSynthesis' in window) speechSynthesis.cancel(); } };
$('fNext').onclick=()=>{ if(film.ch+1<FILM.length) filmShot(film.ch+1,0); };
$('fPrev').onclick=()=>{ filmShot(film.el>2.5||film.sh>0?film.ch:Math.max(0,film.ch-1),0); };
$('fVoice').onchange=e=>{ if(!e.target.checked&&'speechSynthesis' in window) speechSynthesis.cancel(); else if(!('speechSynthesis' in window)){ e.target.checked=false; toast('Vorlesen wird von diesem Browser nicht unterstützt.'); } };

/* ===================== Schleife ===================== */
let freeAspect=1.6;
function resize(){ needsRender=true; hudStamp=0; const w=vp.clientWidth,h=vp.clientHeight; if(w<2||h<2) return; renderer.setSize(w,h,false); camera.aspect=w/h;
  const wide=innerWidth>820, pw=(wide&&!state.film&&!app.classList.contains('nopanel'))?$('panel').offsetWidth+16:0, lw=wide&&!state.film?70:0, dh=state.film?150:(wide?70:60);
  camera.setViewOffset(w,h,Math.round((pw-lw)/2),Math.round(dh/2-18),w,h); freeAspect=Math.max(0.5,(w-pw-lw)/Math.max(200,h-dh-70)); camera.updateProjectionMatrix();
  if(state.view==='section'){ CAMS.section=sectionCam(); const c=CAMS.section; camera.position.set(...c.p); controls.target.set(...c.t); } }
new ResizeObserver(resize).observe(vp);
let last=performance.now(), lastActive=0, animTime=0, needsRender=true, prevActive=false;
const fq={ema:16.7,n:0,stamp:performance.now(),blockUp:0};
controls.addEventListener('change',()=>{ needsRender=true; });
function adaptQuality(now,ft){
  if(LOWQ) return; fq.ema=fq.ema*0.9+ft*0.1; fq.n++;
  if(now-fq.stamp<1500||fq.n<40) return; fq.stamp=now; fq.n=0;
  if(fq.ema>22&&dpr>1){ dpr=Math.max(1,dpr-0.25); renderer.setPixelRatio(dpr); resize(); fq.blockUp=now+10000; }
  else if(fq.ema>36&&dpr<=1&&renderer.shadowMap.enabled){ renderer.shadowMap.enabled=false; scene.traverse(o=>{ if(o.material) o.material.needsUpdate=true; }); }
  else if(fq.ema<17.5&&dpr<DPR_MAX&&now>fq.blockUp){ dpr=Math.min(DPR_MAX,dpr+0.25); renderer.setPixelRatio(dpr); resize(); }
}
function loop(now){
  const raw=now-last, dt=Math.min(0.1,raw/1000); last=now;
  if(preparing){ requestAnimationFrame(loop); return; }
  if(state.film) filmStep(dt);
  else if(state.playing){ const prev=state.t; let nt=prev+dt*state.speed;
    let stop=state.stopAt; if(state.stopEach&&stop===null){ for(const P of PH){ if(prev<P.t1-1e-6&&nt>=P.t1-1e-6){ stop=P.t1; break; } } }
    const mx=maxAllowed(); if(stop!==null&&nt>=stop) nt=stop; if(nt>=mx) nt=mx;
    state.t=nt; state.dirty=true;
    if((stop!==null&&nt>=stop-1e-6)||nt>=mx-1e-6||nt>=TEND){ state.playing=false; state.stopAt=null; syncButtons(); if(state.mode==='task'&&task.stage==='watch') showTaskFeedback(); } }
  if(tween){ const u=clamp((now-tween.s)/tween.d,0,1), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2; camera.position.lerpVectors(tween.p0,tween.p1,e); controls.target.lerpVectors(tween.t0,tween.t1,e); if(u>=1) tween=null; needsRender=true; }
  if(state.dirty){ state.dirty=!update(); needsRender=true; }
  if(controls.update()) needsRender=true;
  const active=needsRender||state.playing||state.film||labelsMoving;
  if(active) lastActive=now;
  const ripple=!REDUCED&&now-lastActive<2500;   /* Wasser und Schaum bewegen sich nach jeder Änderung noch kurz weiter, danach ruht die Seite */
  if(active||ripple){
    if(prevActive) adaptQuality(now,raw);
    animTime+=dt; U.uTime.value=REDUCED?0:animTime;
    if(renderer.shadowMap.enabled&&shadowDirty&&now-lastShadow>90){ renderer.shadowMap.needsUpdate=true; shadowDirty=false; lastShadow=now; }
    renderer.render(scene,camera);
    if(state.labels) placeLabels(); else if(labels.some(L=>L.was)){ labels.forEach(L=>{L.el.style.opacity='0';L.was=false;}); lctx.clearRect(0,0,leaderCv.width,leaderCv.height); }
    needsRender=false; prevActive=true;
  } else prevActive=false;
  requestAnimationFrame(loop);
}
/* ===================== Start ===================== */
camera.position.set(...CAMS.lock.p); controls.target.set(...CAMS.lock.t);
packRest(0); resize(); update(); showPhase(0); syncButtons();
requestAnimationFrame(loop);
prepare().then(()=>{ if(QS.has('film')) filmStart(); });
window.__tsu={renderer,state,PH,TEND,setTime:t=>setTime(t),setView,setMode,setScen,task,camTo,film,filmStart,filmShot,rec:()=>rec,tauOf,tOfTau,ready:()=>!preparing&&rec&&rec.done,upd:()=>{ let n=0; while(!update()&&n++<400); },scene,camera,controls,dbg:{OP,houses,S0,bufA,floatSpecs,debris,waterAt}};
