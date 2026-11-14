/* ================= Teil E: Bedienung · Stationen, Reise, Sonde, Beschriftungen, Aufgaben, Hauptschleife ================= */

const app=$('app'), labelsEl=$('labels'), leadersEl=$('leaders');
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),3200); }

/* ---------- Tiefenleiste ---------- */
const BANDS=[[0,35,0],[35,100,1],[100,400,2],[400,660,3],[660,2890,4],[2890,5150,5],[5150,6371,6]];
BANDS.forEach(([a,b,L])=>{ const s=document.createElement('span'); s.style.flex=(fwdA(MD,b)-fwdA(MD,a))+' 0 0'; s.style.background=LAY[L].col; s.textContent=LAY[L].short; s.dataset.l=L; $('bands').appendChild(s); });
// Namen in der Tiefenleiste immer ganz lesbar: bei Platzmangel kürzere Formen, sonst Text klein
const BAND_ALT={'Erdkruste':['Kruste','Kr.'],'Lithosphäre':['Litho','Li.'],'Asthenosphäre':['Astheno','As.'],'oberer Mantel':['ob. Mantel','ob. M.'],'oberer Erdmantel':['ob. Mantel','ob. M.']};
function fitBands(){ document.querySelectorAll('#bands span').forEach(sp=>{ const full=LAY[+sp.dataset.l].short; sp.title=LAY[+sp.dataset.l].name||full;
  const opts=[full,...(BAND_ALT[full]||[])]; sp.style.fontSize=''; for(const t of opts){ sp.textContent=t; if(sp.scrollWidth<=sp.clientWidth+1) return; }
  sp.style.fontSize='9.5px'; }); }
addEventListener('resize',fitBands); requestAnimationFrame(fitBands); if(document.fonts) document.fonts.ready.then(fitBands);
[0,35,100,400,660,2890,5150,6371].forEach(k=>{ const s=document.createElement('span'); s.style.left=(fwdA(MD,k)*100)+'%'; s.textContent=nfDE.format(k)+(k===6371?' km':''); $('kms').appendChild(s); });

/* ---------- Stationen ---------- */
const chipsEl=$('stChips');
ST.forEach((s,i)=>{ const b=document.createElement('button'); b.textContent=i; b.title=s.n; b.setAttribute('aria-label','Station '+i+': '+s.n); b.dataset.i=i; chipsEl.appendChild(b); });
chipsEl.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b){ stopPlay(); goStation(+b.dataset.i); } });
let playing=false, dwell=0, opening=false, cutBefore=90, visited=new Set([0]);
function probeLayer(d){ if(d<PROBE_S.moho) return 0; if(d<PROBE_S.lab) return 1; if(d<410) return 2; if(d<660) return 3; if(d<2890) return 4; if(d<5150) return 5; return 6; }
function stationDepth(i){ if(i===2) return Math.round((PROBE_S.moho+PROBE_S.lab)/2); if(i===1) return Math.round(PROBE_S.moho*0.5); return ST[i].depth; }
function renderExplain(i){
  const s=ST[i];
  $('exKick').textContent=`Station ${i} von 7`;
  $('exTitle').textContent=s.title; $('exText').innerHTML=s.text;
  $('exFacts').innerHTML=s.facts.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join('');
  $('exObs').textContent=s.obs; $('exSol').textContent=s.sol; $('exSolD').open=false;
  $('exNote').innerHTML=s.note;
  const v=$('exViews'); v.innerHTML=''; v.hidden=!(s.views||s.toggles);
  (s.views||[]).forEach(([t,k],n)=>{ const b=document.createElement('button'); b.textContent=t; b.dataset.sub=k; b.setAttribute('aria-pressed',n===0?'true':'false'); v.appendChild(b); });
  (s.toggles||[]).forEach(([t,k])=>{ const b=document.createElement('button'); b.textContent=t; b.dataset.tog=k; b.setAttribute('aria-pressed',S[k]?'true':'false'); v.appendChild(b); });
  $('exPrev').disabled=i<=0; $('exNext').textContent=i>=7?'Zum Anfang':'Weiter →';
  chipsEl.querySelectorAll('button').forEach(b=>{ const k=+b.dataset.i; b.setAttribute('aria-current',k===i?'step':'false'); b.classList.toggle('done',visited.has(k)); });
}
$('exViews').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.sub){ $('exViews').querySelectorAll('[data-sub]').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false')); flyTo(...subCam(b.dataset.sub)); }
  if(b.dataset.tog){ setToggle(b.dataset.tog, !S[b.dataset.tog]); b.setAttribute('aria-pressed',S[b.dataset.tog]?'true':'false'); } });
$('exPrev').onclick=()=>{ stopPlay(); if(S.cur>0) goStation(S.cur-1); };
$('exNext').onclick=()=>{ stopPlay(); goStation(S.cur>=7?0:S.cur+1); };

function goStation(i, opt){
  opt=opt||{};
  const changed=i!==S.cur, was=S.cur; S.cur=i; visited.add(i);
  if(popOpen && INFO[popOpen.info].st!==i) closePop();
  renderExplain(i);
  const isSeis=i===7;
  if(isSeis && !S.seis){ cutBefore=Math.round(S.openTarget/DEG)||90; setCut(180); SEISV.t=0; }
  if(!isSeis && S.seis){ setCut(cutBefore>=179?90:cutBefore); }
  S.seis=isSeis; $('seisCard').hidden=!isSeis; cardsVis();
  if(isSeis) seisCardUpdate(true);
  if(!opt.keepDepth && !opt.fromSlider && ST[i].depth!==null){ S.probeTarget=stationDepth(i); if(!playing) $('depth').value=kmToSlider(S.probeTarget); }
  if((changed||opt.force) && S.camFollow && S.mode!=='label'){ flyTo(...camFor(i)); setViewBtn(null); }
  if(i===2 && S.mode==='explore' && !S.plates) setToggle('plates',true);
  if(i===5 && S.mode==='explore' && !S.field && changed) setToggle('field',true);
  if(was===5 && i!==5 && S.field && S.mode==='explore') setToggle('field',false);
  if(was===5 && i!==5 && S.aurora && S.mode==='explore') setToggle('aurora',false);
  if(!isSeis && S.openTarget<0.3 && S.mode==='explore') setCut(90);   // nach „Ganze Erde“ wieder öffnen
  updPlayBtn();
}

/* ---------- Kamera ---------- */
let camTw=null;
function flyTo(pos,tgt,dur,zoom){
  dur=dur==null?1.7:dur; if(reduceMotion) dur=0.01;
  const fr=freeRect(); let fit=clamp((0.407*VH)/(0.46*Math.min(fr.w,fr.h)),1,2.6); if(zoom) fit=Math.pow(fit,0.35);
  const p=new V3(...pos), t=new V3(...tgt); p.sub(t).multiplyScalar(fit).add(t);
  camTw={p0:camera.position.clone(), t0:controls.target.clone(), p1:p, t1:t, s:0, d:dur};
}
controls.addEventListener('start',()=>{ camTw=null; setViewBtn(null); });
let globeClosed=false;
const PA=(lat,d)=>{ const r=rad(d); return [Math.cos(lat*DEG)*r, Math.sin(lat*DEG)*r, 0]; };
function camFor(i){
  switch(i){
    case 1:{ const q=PA(46.6,18); return [[q[0]+0.10,q[1]+0.07,0.44],q,undefined,true]; }
    case 2:{ const q=PA(46,70); return [[q[0]+0.17,q[1]+0.10,0.66],q,undefined,true]; }
    case 3:{ const q=PA(44,220); return [[q[0]+0.24,q[1]+0.13,0.92],q,undefined,true]; }
    case 4: return [[1.18,0.78,2.08],[0.43,0.27,0]];
    case 5: return [[1.12,0.52,1.68],[0.28,0.04,0.06]];
    case 6: return [[0.78,0.38,1.02],[0.12,-0.02,0.06]];
    case 7: return [[0,0.06,3.75],[0,0,0]];
    default: return [[2.5,1.32,2.7],[0.05,-0.02,0.05]];
  }
}
function subCam(k){
  if(k==='alps'){ const q=PA(45.2,24); return [[q[0]+0.05,q[1]+0.04,0.25],q,undefined,true]; }
  if(k==='ocean'){ const q=PA(74,12); return [[q[0]+0.03,q[1]+0.07,0.34],q,undefined,true]; }
  if(k==='aurora'){ setToggle('aurora',true); return [[0.2,5.2,5.6],[-0.6,0.55,0]]; }
  if(k==='core'){ setToggle('aurora',false); return camFor(5); }
  return camFor(1);
}
function setViewBtn(v){ document.querySelectorAll('.rbtn[data-view]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.view===v?'true':'false')); }
document.querySelectorAll('.rbtn[data-view]').forEach(b=>b.addEventListener('click',()=>{
  const v=b.dataset.view;
  if(v==='oblique'){ if(S.openTarget>Math.PI*0.75||S.openTarget<0.3) setCut(90); flyTo(...camFor(0)); }
  if(v==='section'){ if(S.openTarget>Math.PI*0.75||S.openTarget<0.3) setCut(90); flyTo([0.52,0.05,3.05],[0.52,0,0]); }
  if(v==='half'){ setCut(180); flyTo([0,0.06,3.75],[0,0,0]); }
  if(v==='globe'){ setCut(0); flyTo([2.6,1.2,3.0],[0,0,0]); }
  setViewBtn(v);
}));

/* ---------- Schalter ---------- */
function setToggle(k,on){
  S[k]=on;
  if(k==='aurora'&&on&&!S.field) setToggle('field',true);
  if(k==='field'&&!on&&S.aurora) setToggle('aurora',false);
  const map={flow:'tFlow',plates:'tPlates',clouds:'tClouds',field:'tField',aurora:'tAurora'}; if(map[k]) $(map[k]).setAttribute('aria-pressed',on?'true':'false');
  const tb=$('exViews').querySelector(`[data-tog="${k}"]`); if(tb) tb.setAttribute('aria-pressed',on?'true':'false');
  if(typeof freeSync==='function') freeSync();
}
$('tFlow').onclick=()=>setToggle('flow',!S.flow);
$('tPlates').onclick=()=>setToggle('plates',!S.plates);
$('tClouds').onclick=()=>setToggle('clouds',!S.clouds);
$('tField').onclick=()=>setToggle('field',!S.field);
$('tAurora').onclick=()=>{ setToggle('aurora',!S.aurora); if(S.aurora&&S.cur!==5&&S.mode==='explore') goStation(5); };
$('tLabels').onclick=()=>{ S.labels=(S.labels+1)%3; $('tLabels').setAttribute('aria-pressed',S.labels>0?'true':'false'); $('tLabelsTxt').textContent=['Namen aus','Namen','Alle Namen'][S.labels]; };
function setCut(deg){ const was=S.openTarget<0.05; S.openTarget=deg*DEG; if(was!==(S.openTarget<0.05)&&typeof lastCard!=='undefined') cardsVis(); $('cut').value=deg; $('cutOut').textContent=Math.round(deg)+'°'; if(typeof freeSync==='function') freeSync(); }
$('cut').addEventListener('input',()=>{ const d=+$('cut').value; S.openTarget=d*DEG; $('cutOut').textContent=d+'°'; if(S.seis && d<170){ goStation(0); } });
document.querySelectorAll('[data-scale]').forEach(b=>b.addEventListener('click',()=>{
  exagTarget=b.dataset.scale==='real'?1:0;
  document.querySelectorAll('[data-scale]').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
  toast(exagTarget?'Maßstabsgetreu: Erdkruste und Lithosphäre sind jetzt hauchdünn. Auch die Gebirge verschwinden fast.':'Gestreckt: Die oberen Schichten sind überhöht gezeichnet, damit man sie sieht.');
}));
$('speed').addEventListener('change',()=>simSetRate(+$('speed').value));
$('panelBtn').onclick=()=>{ const h=app.classList.toggle('panel-hidden'); $('panelBtn').setAttribute('aria-pressed',h?'true':'false'); $('panelBtn').textContent=h?'Bedienfeld an':'Bedienfeld aus'; };
$('fsBtn').onclick=()=>{ const d=document, el=app;
  if(d.fullscreenElement||d.webkitFullscreenElement){ (d.exitFullscreen||d.webkitExitFullscreen).call(d); return; }
  const rq=el.requestFullscreen||el.webkitRequestFullscreen; if(rq){ try{ const p=rq.call(el); if(p&&p.catch) p.catch(()=>toast('Vollbild ist hier gesperrt. Öffne die Seite in einem eigenen Tab.')); }catch(e){ toast('Vollbild ist hier gesperrt.'); } } else toast('Vollbild wird von diesem Gerät nicht unterstützt.'); };

$('infoBtn').onclick=()=>{ $('sheet').hidden=false; $('sheetX').focus(); };
$('sheetX').onclick=()=>{ $('sheet').hidden=true; };
$('sheet').addEventListener('click',e=>{ if(e.target===$('sheet')) $('sheet').hidden=true; });
document.addEventListener('keydown',e=>{
  if(e.target&&/INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY/.test(e.target.tagName)&&e.key!=='Escape') return;
  if(e.key==='Escape'){ $('sheet').hidden=true; }
  else if(e.key===' '){ e.preventDefault(); playing?stopPlay():startPlay(); }
  else if(e.key==='ArrowRight'){ stopPlay(); if(S.cur<7) goStation(S.cur+1); }
  else if(e.key==='ArrowLeft'){ stopPlay(); if(S.cur>0) goStation(S.cur-1); }
});

/* ---------- Modus: Erkunden · Beschriften · Quiz ---------- */
function setMode(m){
  S.mode=m; closePop();
  document.querySelectorAll('.ptabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.mode===m?'true':'false'));
  $('pExplore').hidden=m!=='explore'; $('pLabel').hidden=m!=='label'; $('pQuiz').hidden=m!=='quiz'; $('pFree').hidden=m!=='free';
  if(app.classList.contains('panel-hidden')) $('panelBtn').click();
  if(m==='label'){ stopPlay(); if(S.cur===7) goStation(0); setCut(90); flyTo([2.9,1.5,3.1],[0.05,-0.02,0.05]); if(!labRows.length) buildLabTask(); }
  if(m==='quiz'){ stopPlay(); showQ(); }
  if(m==='free'){ stopPlay(); if(S.seis) goStation(4); freeSync(); }
  cardsVis();
}
document.querySelectorAll('.ptabs button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
function cardsVis(){ $('probe').hidden = S.seis || S.mode==='label' || S.openTarget<0.05; lastCard=''; }

/* ---------- Frei entdecken ---------- */
function freeSync(){ const F=$('freeTog'); if(!F) return;
  F.querySelectorAll('[data-ft]').forEach(b=>{ const k=b.dataset.ft; b.setAttribute('aria-pressed', (k==='labels'?S.labels>0:!!S[k])?'true':'false'); });
  const c=Math.round(S.openTarget/DEG); $('freeCut').querySelectorAll('[data-fc]').forEach(b=>b.setAttribute('aria-pressed', Math.abs(+b.dataset.fc-c)<2?'true':'false')); }
$('freeTog').addEventListener('click',e=>{ const b=e.target.closest('[data-ft]'); if(!b) return; const k=b.dataset.ft;
  if(k==='labels'){ S.labels=S.labels>0?0:2; $('tLabels').setAttribute('aria-pressed',S.labels>0?'true':'false'); $('tLabelsTxt').textContent=['Namen aus','Namen','Alle Namen'][S.labels]; }
  else setToggle(k,!S[k]);
  freeSync(); });
$('freeCut').addEventListener('click',e=>{ const b=e.target.closest('[data-fc]'); if(!b) return; const d=+b.dataset.fc; setCut(d); if(d===0) setViewBtn('globe'); freeSync(); });
$('freeFly').addEventListener('click',e=>{ const b=e.target.closest('[data-ff]'); if(!b) return; const k=b.dataset.ff;
  if(k==='globe'){ flyTo([3.4,1.8,4.2],[0,0,0]); return; }
  if(k==='aurora'){ setToggle('aurora',true); flyTo([0.2,5.2,5.6],[-0.6,0.55,0]); freeSync(); return; }
  if(S.openTarget<0.3) setCut(90);
  if(k==='core'){ flyTo(...camFor(5)); return; }
  if(k==='lux'){ flyTo(...camFor(1)); return; }
  flyTo(...subCam(k)); freeSync(); });

/* ---------- Reise ---------- */
function updPlayBtn(){ $('icoPlay').toggleAttribute('hidden',playing); $('icoPause').toggleAttribute('hidden',!playing); $('bPlay').setAttribute('aria-label',playing?'Reise anhalten':'Reise starten');
  $('bPrev').disabled=S.cur<=0; $('bNext').disabled=S.cur>=7;
  $('tourBtn').textContent = playing ? '❚❚ Reise anhalten' : (S.cur===0&&S.probeKm<1 ? '▶ Reise zum Erdmittelpunkt' : (S.cur>=7?'▶ Reise neu starten':'▶ Weiterreisen')); }
function stopPlay(){ if(playing){ playing=false; updPlayBtn(); } }
function startPlay(){
  if(S.mode!=='explore') setMode('explore');
  if(S.cur>=7){ goStation(0); S.probeKm=S.probeTarget=0; $('depth').value=0; }
  playing=true; dwell=0;
  if(S.openTarget<1.2) setCut(90);
  if(S.cur===0 && S.probeKm<0.5){ S.openT=0.001; opening=true; }
  else if(S.cur<7 && Math.abs(S.probeKm-S.probeTarget)<0.5) goStation(S.cur+1);
  updPlayBtn();
}
$('bPlay').onclick=()=>{ playing?stopPlay():startPlay(); };
$('tourBtn').onclick=()=>{ playing?stopPlay():startPlay(); };
$('bNext').onclick=()=>{ stopPlay(); if(S.cur<7) goStation(S.cur+1); };
$('bPrev').onclick=()=>{ stopPlay(); if(S.cur>0) goStation(S.cur-1); };
$('depth').addEventListener('input',()=>{
  stopPlay(); const d=sliderToKm(+$('depth').value); S.probeTarget=d; S.probeKm=d;
  const st=d<0.5?0:stationOfLayer(probeLayer(d)); if(st!==S.cur) goStation(st,{fromSlider:true});
});

/* ---------- Sonde: Messwerte nach PREM ---------- */
let lastCard='';
function num(x,dig){ return x.toLocaleString('de-DE',{minimumFractionDigits:dig,maximumFractionDigits:dig}); }
function fmtPress(d){ if(d<0.03) return '1 bar'; const g=pressureGPa(d); if(g<1) return nfDE.format(Math.round(g*10000/100)*100)+' bar'; return (g<10?num(g,1):nfDE.format(Math.round(g)))+' GPa'; }
function fmtTempC(t){ return 'ca. '+nfDE.format(t<100?Math.round(t):Math.round(t/50)*50)+' °C'; }
function updProbeCard(){
  const d=S.probeKm, L=d<0.05?-1:probeLayer(d), key=Math.round(d)+'|'+L+'|'+S.cur+'|'+S.mode; if(key===lastCard) return; lastCard=key;
  $('pDepth').textContent=fmtKm(d);
  const name=L<0?'Erdoberfläche':LAY[L].name;
  $('pLayer').textContent=L<0?'Erdoberfläche':LAY[L].short.replace(/^./,c=>c.toUpperCase()); $('pSw').style.background=L<0?'#6C9A58':LAY[L].col;
  $('pState').textContent=L<0?'fest':LAY[L].state; $('pState').className='st '+(L<0?'s':LAY[L].st);
  const T=tempModel(d,PROBE_S.lab); $('pTemp').textContent=fmtTempC(T); $('pTb').style.width=(T/5700*100).toFixed(1)+'%';
  $('pBook').textContent=d>1?(VW<1340?'M5: ':'Buch M5: ')+fmtTempC(tempBook(d)):'heutiges Wissen';
  $('pPress').textContent=fmtPress(d); $('pPb').style.width=(Math.pow(pressureGPa(d)/364,0.6)*100).toFixed(1)+'%';
  const fac=pressureGPa(d)*9869, facR=fac>1e5?Math.round(fac/1e4)*1e4:Math.round(fac/100)*100;
  $('pFac').textContent=d>1?nfDE.format(facR)+' × Luftdruck':'Luftdruck';
  const r=RKM-d, rho=premAt(Math.max(r,0.5),1,true); $('pDens').textContent=num(rho,1)+' g/cm³'; $('pDb').style.width=(rho/13.1*100).toFixed(1)+'%';
  const vp=premAt(Math.max(r,0.5),2,true), vs=premAt(Math.max(r,0.5),3,true);
  $('pWave').innerHTML=`P ${num(vp,1)} · S ${vs>0?num(vs,1):'<span style="color:#FF7A5A">keine</span>'}`;
  $('bigTitle').textContent = S.seis ? 'Erdbebenwellen' : (S.mode==='label'?'Beschrifte den Schalenbau':name.split(' · ')[0]);
  $('bigSub').innerHTML = S.seis ? '<span>P- und S-Wellen laufen durch die Erde</span>' : (S.mode==='label' ? '<span>Ziehe die Begriffe an die richtige Stelle.</span>' : `<span>Sonde unter Luxemburg in <b>${fmtKm(d)}</b> Tiefe</span><span>${L<0?'Boden und Gestein':STUFF[L]}</span>`);
  document.querySelectorAll('#bands span').forEach(s=>s.classList.toggle('cur', +s.dataset.l===L));
}

/* ---------- Beschriftungen ---------- */
function mkLab(html, cls, col){ const el=document.createElement('div'); el.className='lb '+(cls||''); if(col) el.style.setProperty('--c',col); el.innerHTML=html; labelsEl.appendChild(el); return el; }
const sA=lat=>structAt(lat,LON0);
const bedOf=s=>(s.wdep>0.2?s.wdep:-s.elev+s.ice);
const FLOWA={plume:20, slab:-30, t:0, pd:1300, sd:1300};
const LABELS=[
  {info:'kruste', lvl:1, at:()=>{ const s=sA(47); return facePoint(47,(bedOf(s)+s.sed+s.moho)/2); }, html:'Erdkruste<small>fest · 5 bis 70 km dick</small>', L:0},
  {info:'litho', lvl:1, at:()=>{ const s=sA(40); return facePoint(40,(s.moho+labAt(40,'A'))/2); }, html:'Lithosphäre<small>Kruste + fester oberer Mantel · starr</small>', L:1},
  {info:'astheno', lvl:1, at:()=>facePoint(33,(labAt(33,'A')+400)/2), html:'Asthenosphäre<small>verformbar · bis ca. 400 km</small>', L:2},
  {info:'om', lvl:1, at:()=>facePoint(26,540), html:'oberer Erdmantel<small>bis ca. 700 km</small>', L:3},
  {info:'um', lvl:1, at:()=>facePoint(14,1700), html:'unterer Erdmantel<small>fest · bis 2900 km</small>', L:4},
  {info:'aek', lvl:1, at:()=>facePoint(5,4000), html:'äußerer Erdkern<small>flüssig · bis 5150 km</small>', L:5},
  {info:'iek', lvl:1, at:()=>facePoint(-62,5820), html:'innerer Erdkern<small>fest · bis 6370 km</small>', L:6},
  {info:'plume', lvl:1, only:4, at:()=>facePoint(FLOWA.plume,FLOWA.pd), html:'heißer Aufstrom<small>steigt vom Kern auf</small>', L:4},
  {info:'slab', lvl:1, only:4, at:()=>facePoint(FLOWA.slab,FLOWA.sd), html:'kalter Abstrom<small>sinkt von oben ab</small>', L:4},
  {info:'wurzel', lvl:2, zoom:1, at:()=>{ const s=sA(45.4); return facePoint(45.4,s.moho-5); }, html:'Gebirgswurzel<small>dicke Kruste unter den Alpen</small>', L:0},
  {info:'moho', lvl:2, zoom:1, at:()=>{ const s=sA(52.5); return facePoint(52.5,s.moho); }, html:'Moho<small>Grenze Kruste / Mantel</small>', L:0},
  {info:'ozk', lvl:2, at:()=>{ const s=sA(-14); return facePoint(-14,bedOf(s)+s.sed+(s.moho-bedOf(s)-s.sed)*0.5); }, html:'ozeanische Kruste<small>dünn · Basalt und Gabbro</small>', L:0},
  {info:'sed', lvl:2, zoom:1, at:()=>{ const s=sA(4.6); return facePoint(4.6,bedOf(s)+s.sed*0.5); }, html:'Sedimente<small>Ablagerungen</small>', L:0},
  {info:'lab', lvl:2, zoom:1, at:()=>facePoint(57,labAt(57,'A')), html:'Unterseite der Lithosphäre<small>ca. 1300 °C</small>', L:1},
];
const LCOL=['#C9A58C','#9A8576','#D4532A','#E0692B','#EE8E33','#F6BE45','#FFE27A'];
LABELS.forEach(o=>{ o.el=mkLab(o.html,'',INFO[o.info].c||LCOL[o.L]); makeClickable(o); });
const TAGS=[410,660,2890,5150].map(d=>({d, el:mkLab(nfDE.format(d)+' km','tag')}));
const GEO=[['Arktis',84],['Europäisches Nordmeer',74],['Norwegen',61.6],['Nordsee',56],['Luxemburg',LUX_LAT],['Alpen',45.3],['Mittelmeer',40.4],['Sahara',25],['Äquator',0],['Südatlantik',-30],['Antarktis',-78]].map(([t,lat])=>({t,lat,el:mkLab(t,'geo')}));
const SEIS_LABELS=[
  {info:'herd', at:()=>new V3(0,rad(0)+0.004,0.01), html:'Erdbebenherd'},
  {info:'ps', at:()=>{ const a=42*DEG; return new V3(1.06*Math.sin(a),1.06*Math.cos(a),0.01); }, html:'P- und S-Wellen kommen an'},
  {info:'schatten', at:()=>{ const a=(SEIS.edgeS+SEIS.edgeK)/2*DEG; return new V3(1.06*Math.sin(a),1.06*Math.cos(a),0.01); }, html:'Schattenzone<small>keine direkten Wellen</small>'},
  {info:'nurp', at:()=>{ const a=163*DEG; return new V3(1.06*Math.sin(a),1.06*Math.cos(a),0.01); }, html:'nur P-Wellen<small>durch den Kern gelaufen</small>'},
  {info:'sende', at:()=>{ const r=rad(2890), a=26*DEG; return new V3(r*Math.sin(a),r*Math.cos(a),0.01); }, html:'S-Wellen enden hier<small>der äußere Kern ist flüssig</small>'},
  {info:'station', at:()=>seisStationPos(SEISV.station), html:'Messstation'},
];
SEIS_LABELS.forEach(o=>{ o.el=mkLab(o.html,'',INFO[o.info].c); makeClickable(o); });
const MAG_LABELS=[
  {info:'sonnenwind', at:()=>MAGF.src.clone().multiplyScalar(3.6).addScaledVector(_cu,1.2), html:'Sonnenwind<small>Teilchen von der Sonne</small>'},
  {info:'magnetosphaere', at:()=>MAGF.src.clone().multiplyScalar(A_MP*0.97).add(new V3(0,-0.7,0)), html:'Magnetfeld lenkt ab<small>Schutzschild der Erde</small>'},
  {info:'polarlicht', at:()=>{ const n=auroraPoint(1,1.07), c=camera.position; return n.dot(c)>auroraPoint(-1,1.07).dot(c)?n:auroraPoint(-1,1.07); }, html:'Polarlicht<small>Nordlicht · Südlicht</small>'},
];
MAG_LABELS.forEach(o=>{ o.el=mkLab(o.html,'',INFO[o.info].c); makeClickable(o); });

let popOpen=null;
function makeClickable(o){
  if(!o.info) return; const el=o.el; el.classList.add('clk'); el.tabIndex=0; el.setAttribute('role','button'); el.setAttribute('aria-label',INFO[o.info].t+': Infotext öffnen');
  const open=e=>{ e.stopPropagation(); if(popOpen===o) closePop(); else openPop(o); };
  el.addEventListener('click',open); el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(e); } });
}
function openPop(o){
  if(popOpen) popOpen.el.classList.remove('open'); popOpen=o; o.el.classList.add('open');
  const I=INFO[o.info], P=$('pop'); P.style.setProperty('--c',I.c);
  $('popT').textContent=I.t; $('popSrc').textContent='Text '+I.src;
  $('popList').innerHTML=I.li.map(x=>`<li>${x}</li>`).join('');
  $('popFacts').innerHTML=I.f.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join(''); $('popFacts').hidden=!I.f.length;
  $('popGo').textContent=`Zur Station ${I.st}: ${ST[I.st].n} ▸`; $('popGo').hidden = S.mode!=='explore' || S.cur===I.st;
  P.hidden=false; placePop();
}
function closePop(){ if(popOpen){ popOpen.el.classList.remove('open'); popOpen=null; } $('pop').hidden=true; }
function placePop(){
  if(!popOpen) return; const P=$('pop');
  if(popOpen.el.style.visibility==='hidden'){ closePop(); return; }
  const pw=P.offsetWidth, ph=P.offsetHeight; let x,y;
  if(VW<700){ x=8; y=Math.max(70,VH-ph-190); }
  else{ const lx=popOpen.lx||0, ly=popOpen.ly||0; x=lx-pw-14; y=ly-14; if(x<110){ x=Math.min(VW-pw-8,lx); y=ly+popOpen.el.offsetHeight+10; } y=clamp(y,70,VH-ph-150); }
  P.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;
}
$('popX').onclick=closePop;
$('popGo').onclick=()=>{ const I=INFO[popOpen.info]; closePop(); stopPlay(); goStation(I.st); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&popOpen) closePop(); });
renderer.domElement.addEventListener('pointerdown',()=>{ if(popOpen) closePop(); });

const szc=new WeakMap();
function sizeOf(el){ let s=szc.get(el); if(!s||el._dirty||!s.w){ s={w:el.offsetWidth,h:el.offsetHeight}; szc.set(el,s); el._dirty=false; } return s; }
const _pv=new V3();
function project(v){ _pv.copy(v).project(camera); return {x:(_pv.x+1)/2*VW, y:(1-_pv.y)/2*VH, ok:_pv.z<1&&_pv.z>-1}; }
function hide(el){ if(el.style.visibility!=='hidden'){ el.style.opacity=0; el.style.visibility='hidden'; } }
function layout(items){
  let svg='';
  const c=project(new V3(0,0,0)), cr=new V3().setFromMatrixColumn(camera.matrixWorld,0), e=project(cr), rs=Math.hypot(e.x-c.x,e.y-c.y);
  const vis=[];
  const narrow=VW<860, panelOn=!app.classList.contains('panel-hidden')&&!narrow;
  const rightLim=panelOn?VW-PANEL_W-30:VW-10;
  for(const it of items){
    if(!it.show){ hide(it.el); continue; }
    const p=project(it.at());
    if(!p.ok||p.x<-30||p.x>VW+30||p.y<40||p.y>VH-110){ hide(it.el); continue; }
    vis.push({it,p,s:sizeOf(it.el)});
  }
  if(!vis.length){ leadersEl.innerHTML=''; return; }
  const maxw=Math.max(...vis.map(v=>v.s.w));
  let x0=Math.min(c.x+rs+30, rightLim-maxw); if(narrow) x0=VW-maxw-8;
  vis.sort((a,b)=>a.p.y-b.p.y);
  const top=narrow?132:96, bot=narrow?narrowBottom():VH-((S.seis||S.mode==='label')?150:226), gap=narrow?4:6; let y=top;
  for(const v of vis){ v.y=Math.max(v.p.y-v.s.h/2,y); y=v.y+v.s.h+gap; }
  let lim=bot; for(let i=vis.length-1;i>=0;i--){ const v=vis[i]; if(v.y+v.s.h>lim) v.y=lim-v.s.h; lim=v.y-gap; }
  for(const v of vis){
    const x=Math.max(x0,4); v.it.el.style.transform=`translate(${x.toFixed(1)}px,${v.y.toFixed(1)}px)`; v.it.el.style.opacity=1; v.it.el.style.visibility='visible'; v.it.lx=x; v.it.ly=v.y;
    const ly=v.y+v.s.h/2;
    if(x>v.p.x+8) svg+=`<line class="halo" x1="${v.p.x.toFixed(1)}" y1="${v.p.y.toFixed(1)}" x2="${x}" y2="${ly.toFixed(1)}"/><line x1="${v.p.x.toFixed(1)}" y1="${v.p.y.toFixed(1)}" x2="${x}" y2="${ly.toFixed(1)}"/><circle cx="${v.p.x.toFixed(1)}" cy="${v.p.y.toFixed(1)}" r="3"/>`;
    else svg+=`<circle cx="${v.p.x.toFixed(1)}" cy="${v.p.y.toFixed(1)}" r="3"/>`;
  }
  leadersEl.innerHTML=svg;
}
function placeDirect(show){
  const faceSeen=camera.position.z>0.08;
  for(const t of TAGS){ const p=project(facePoint(74,t.d)); const s=sizeOf(t.el); const ok=show&&S.labels===2&&p.ok&&faceSeen;
    if(ok){ t.el.style.transform=`translate(${(p.x-s.w-5).toFixed(1)}px,${(p.y-s.h/2).toFixed(1)}px)`; t.el.style.opacity=1; t.el.style.visibility='visible'; } else hide(t.el); }
  const dist=camera.position.distanceTo(controls.target);
  for(const g of GEO){ const s0=sA(g.lat), p=project(facePoint(g.lat,-(s0.wdep>0.2?0:s0.elev)-0.2)), s=sizeOf(g.el);
    const ok=show&&S.labels>0&&p.ok&&faceSeen&&dist<1.25&&p.y>70&&p.y<VH-130&&p.x>100;
    if(ok){ g.el.style.transform=`translate(${(p.x-s.w/2).toFixed(1)}px,${(p.y-s.h-3).toFixed(1)}px)`; g.el.style.opacity=1; g.el.style.visibility='visible'; } else hide(g.el); }
}
// heißen Aufstrom und kalten Abstrom in der Simulation suchen (Fläche A)
function findFlow(dt){
  // Beschriftung „heißer Aufstrom / kalter Abstrom“: verfolgt ihren Strom ruhig weiter und springt nur,
  // wenn dieser deutlich schwächer geworden ist (frühestens nach 12 s)
  FLOWA.t-=dt; FLOWA.hold=(FLOWA.hold||0)-dt; if(FLOWA.t>0||!SIM.cur) return; FLOWA.t=0.5;
  const NT=SIM.NT, NR=SIM.NR, T=SIM.cur.T, j0=Math.round(NR*0.5);
  const val=lat=>{ let i=Math.round(lat*DEG/TAU*NT); i=((i%NT)+NT)%NT; let s=0; for(let k=-10;k<=10;k+=2) s+=T[(j0+k)*NT+i]; return s; };
  let mean=0,n=0,gmax=-1e9,gl=FLOWA.plume,gmin=1e9,gs=FLOWA.slab;
  for(let lat=-60;lat<=68;lat+=1){ const v=val(lat); mean+=v; n++; if(v>gmax){gmax=v;gl=lat;} if(v<gmin){gmin=v;gs=lat;} }
  mean/=n;
  // lokal nachführen (±5°)
  const track=(cur,sign)=>{ let b=cur, bv=sign*val(cur); for(let d=-5;d<=5;d++){ const l=clamp(Math.round(cur)+d,-60,68), v=sign*val(l); if(v>bv){bv=v;b=l;} } return [b,bv]; };
  let [pl,pv]=track(FLOWA.pt==null?FLOWA.plume:FLOWA.pt,1), [sl,sv]=track(FLOWA.stg==null?FLOWA.slab:FLOWA.stg,-1);
  if(FLOWA.hold<=0){
    if(pv-mean < 0.45*(gmax-mean) && Math.abs(gl-pl)>8){ pl=gl; FLOWA.hold=12; }
    if(-sv-(-mean) < 0.45*(mean-gmin) && Math.abs(gs-sl)>8){ sl=gs; FLOWA.hold=12; } }
  if(Math.abs(pl-sl)<10){ sl=FLOWA.stg==null?FLOWA.slab:FLOWA.stg; }
  FLOWA.pt=pl; FLOWA.stg=sl;
  const RI=3480/6371, ds=(1-(RI+j0*(1-RI)/(NR-1)))*RKM; FLOWA.pd=simDepthToReal(ds,labAt(pl,'A')); FLOWA.sd=simDepthToReal(ds*0.8,labAt(sl,'A'));
}

/* ---------- Beschriften ---------- */
let labLevel='m1', labRows=[], selChip=null;
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function buildLabTask(){
  labRows.forEach(r=>r.el.remove()); labRows=[];
  const set=LABSETS[labLevel];
  set.rows.forEach(r=>{ const html=r.html.replace(/\[([^\]|]+)(\|short)?\]/g,(m,ans,sh)=>`<button type="button" class="slot${sh?' short':''}" data-ans="${ans}" aria-label="Leeres Kästchen"></button>`);
    const el=mkLab(html,'slotrow'); labRows.push({el, at:()=>facePoint(r.lat, r.d<110 ? (r.d<40 ? sA(r.lat).moho*0.5 : (sA(r.lat).moho+labAt(r.lat,'A'))/2) : r.d), show:true}); });
  const ch=$('chips'); ch.innerHTML='';
  shuffle(set.chips).forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='wchip'; b.textContent=t; b.dataset.term=t; ch.appendChild(b); });
  selChip=null; $('labFb').innerHTML=''; $('labFb').className='fb';
}
const slotsAll=()=>[...labelsEl.querySelectorAll('.slot')];
const chipOf=term=>[...$('chips').children].find(c=>c.dataset.term===term&&c.classList.contains('used'));
function clearMarks(){ slotsAll().forEach(s=>s.classList.remove('ok','bad')); $('labFb').innerHTML=''; $('labFb').className='fb'; }
function placeChip(chip,slot){
  if(slot.dataset.val){ const old=chipOf(slot.dataset.val); if(old) old.classList.remove('used'); }
  slot.textContent=chip.dataset.term; slot.dataset.val=chip.dataset.term; slot.classList.add('filled'); slot.setAttribute('aria-label','Kästchen: '+chip.dataset.term);
  chip.classList.add('used'); chip.classList.remove('sel'); selChip=null; slot.closest('.lb')._dirty=true; clearMarks();
}
function freeSlot(slot){ if(!slot.dataset.val) return; const c=chipOf(slot.dataset.val); if(c) c.classList.remove('used');
  slot.textContent=''; delete slot.dataset.val; slot.classList.remove('filled','ok','bad'); slot.setAttribute('aria-label','Leeres Kästchen'); slot.closest('.lb')._dirty=true; }
labelsEl.addEventListener('click',e=>{ const s=e.target.closest('.slot'); if(!s) return; if(selChip) placeChip(selChip,s); else if(s.dataset.val){ freeSlot(s); clearMarks(); } });
let drag=null;
$('chips').addEventListener('pointerdown',e=>{ const c=e.target.closest('.wchip'); if(!c||c.classList.contains('used')) return; drag={c,x0:e.clientX,y0:e.clientY,g:null,hot:null}; try{ c.setPointerCapture(e.pointerId); }catch(_){} });
$('chips').addEventListener('pointermove',e=>{ if(!drag) return;
  if(!drag.g&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>6){ drag.g=document.createElement('div'); drag.g.className='ghostchip'; drag.g.textContent=drag.c.dataset.term; app.appendChild(drag.g); }
  if(drag.g){ drag.g.style.transform=`translate(${e.clientX-24}px,${e.clientY-20}px)`; const el=document.elementFromPoint(e.clientX,e.clientY), s=el&&el.closest?el.closest('.slot'):null;
    if(drag.hot&&drag.hot!==s) drag.hot.classList.remove('hot'); if(s) s.classList.add('hot'); drag.hot=s; } });
function endDrag(cancel){ if(!drag) return;
  if(drag.g){ drag.g.remove(); if(drag.hot){ drag.hot.classList.remove('hot'); if(!cancel) placeChip(drag.c,drag.hot); } }
  else if(!cancel){ const was=drag.c.classList.contains('sel'); [...$('chips').children].forEach(x=>x.classList.remove('sel')); if(!was){ drag.c.classList.add('sel'); selChip=drag.c; } else selChip=null; }
  drag=null; }
$('chips').addEventListener('pointerup',()=>endDrag(false)); $('chips').addEventListener('pointercancel',()=>endDrag(true));
$('chips').addEventListener('keydown',e=>{ const c=e.target.closest('.wchip'); if(!c||c.classList.contains('used')) return; if(e.key==='Enter'||e.key===' '){ e.preventDefault(); [...$('chips').children].forEach(x=>x.classList.remove('sel')); c.classList.add('sel'); selChip=c; toast('Wähle jetzt ein Kästchen im Modell (Tab-Taste).'); } });
function labCheck(){
  const ss=slotsAll(); let ok=0; ss.forEach(s=>{ const good=s.dataset.val===s.dataset.ans; s.classList.toggle('ok',good); s.classList.toggle('bad',!good&&!!s.dataset.val); if(good) ok++; });
  const fb=$('labFb');
  if(ok===ss.length){ fb.className='fb ok'; fb.innerHTML='<p><b>Alles richtig!</b> '+(labLevel==='m1'?'Fachlich genauer heißt „zähflüssig“: fest, aber plastisch verformbar.':'Du kennst alle Schalen.')+'</p><p>'+(labLevel==='m1'?'Versuche jetzt die Profi-Stufe.':'Teste dich jetzt im Quiz.')+'</p>'; }
  else if(ss.some(s=>!s.dataset.val)){ fb.className='fb'; fb.innerHTML=`<p><b>${ok} von ${ss.length} richtig.</b> Noch nicht alle Kästchen sind gefüllt.</p>`; }
  else{ fb.className='fb bad'; fb.innerHTML=`<p><b>${ok} von ${ss.length} richtig.</b> Tippe ein rotes Kästchen an, um den Begriff zurückzulegen.</p><p>Tipp: Schau dir unter „Erkunden“ die Stationen noch einmal an.</p>`; }
}
$('labCheck').onclick=labCheck;
$('labSolve').onclick=()=>{ slotsAll().forEach(freeSlot); slotsAll().forEach(s=>{ const c=[...$('chips').children].find(x=>x.dataset.term===s.dataset.ans&&!x.classList.contains('used')); if(c) placeChip(c,s); }); labCheck(); };
$('labReset').onclick=buildLabTask;
document.querySelectorAll('[data-lvl]').forEach(b=>b.addEventListener('click',()=>{ labLevel=b.dataset.lvl; document.querySelectorAll('[data-lvl]').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false')); buildLabTask(); }));

/* ---------- Quiz ---------- */
let qi=0, qScore=0, qAnswered=false, qChoice=-1;
function showQ(){
  const Q=QUIZ[qi]; qAnswered=false; qChoice=-1;
  $('qKick').textContent=`Frage ${qi+1} von ${QUIZ.length} · ${qScore} richtig`; $('qText').textContent=Q.q;
  const box=$('qOpts'); box.innerHTML='';
  Q.o.forEach((t,i)=>{ const l=document.createElement('label'); l.className='opt'; l.innerHTML=`<input type="radio" name="qopt" value="${i}"><span>${t}</span>`; box.appendChild(l); });
  box.querySelectorAll('input').forEach(inp=>inp.addEventListener('change',()=>{ qChoice=+inp.value; $('qSubmit').disabled=false; }));
  $('qSubmit').disabled=true; $('qSubmit').hidden=false; $('qNext').hidden=true; $('qFb').innerHTML=''; $('qFb').className='fb';
}
$('qSubmit').onclick=()=>{ if(qChoice<0||qAnswered) return; qAnswered=true; const Q=QUIZ[qi];
  [...$('qOpts').querySelectorAll('label')].forEach((l,i)=>{ l.querySelector('input').disabled=true; if(i===Q.a) l.classList.add('ok'); else if(i===qChoice) l.classList.add('bad'); });
  const good=qChoice===Q.a; if(good) qScore++;
  $('qFb').className='fb '+(good?'ok':'bad'); $('qFb').innerHTML=`<p><b>${good?'Richtig!':'Nicht ganz.'}</b> ${Q.e}</p><p>Das Modell zeigt jetzt Station ${Q.st}: ${ST[Q.st].n}.</p>`;
  $('qKick').textContent=`Frage ${qi+1} von ${QUIZ.length} · ${qScore} richtig`;
  $('qSubmit').hidden=true; $('qNext').hidden=false; $('qNext').textContent=qi<QUIZ.length-1?'Nächste Frage →':`Ergebnis: ${qScore} von ${QUIZ.length} · Neu starten`;
  goStation(Q.st); };
$('qNext').onclick=()=>{ if(qi<QUIZ.length-1) qi++; else { qi=0; qScore=0; } showQ(); };

/* ---------- Erdbebenwellen: Karte mit Seismogramm ---------- */
$('sP').onchange=()=>{ SEISV.showP=$('sP').checked; }; $('sS').onchange=()=>{ SEISV.showS=$('sS').checked; };
$('sReplay').onclick=()=>{ SEISV.t=0; };
$('sStation').addEventListener('input',()=>{ SEISV.station=+$('sStation').value; seisCardUpdate(true); });
let seisCardKey='';
function seisCardUpdate(force){
  if(!SEIS.ready) return;
  const deg=SEISV.station, a=seisArrivals(deg), tp=a.P!=null?a.P:a.K, now=SEIS.now||0;
  if(force){
    $('sDeg').textContent=deg+'°'; $('sKm').textContent=nfDE.format(Math.round(deg*DEG*RKM/10)*10)+' km';
    let h='';
    h+=`<span>P-Welle</span><b>${a.P!=null?'nach '+fmtMin(a.P):(a.K!=null?'nach '+fmtMin(a.K)+' (durch den Kern)':'keine direkte Welle (Schattenzone)')}</b>`;
    h+=`<span>S-Welle</span><b>${a.S!=null?'nach '+fmtMin(a.S):'kommt nicht an (flüssiger Kern)'}</b>`;
    if(a.P!=null&&a.S!=null) h+=`<span>Abstand S − P</span><b>${fmtMin(a.S-a.P)}</b>`;
    $('sArr').innerHTML=h;
  }
  $('sClock').textContent=Math.floor(now/60)+' min';
  // Seismogramm
  const cv=$('sGram'), g=cv.getContext('2d'), W=cv.width, H=cv.height, tMax=SEIS.tMax; g.clearRect(0,0,W,H);
  g.strokeStyle='rgba(234,240,247,.14)'; g.lineWidth=1; g.font='500 19px ui-monospace,Menlo,monospace'; g.fillStyle='rgba(150,164,182,.9)';
  for(let m=0;m<=tMax/60;m+=5){ const x=m*60/tMax*W; g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); if(m>0) g.fillText(m+' min',x+5,H-8); }
  const wig=(t,t0,amp,per)=>{ const u=t-t0; if(u<0) return 0; return amp*Math.exp(-u/ (per*5))*Math.sin(u/per*TAU)*(1-Math.exp(-u/(per*0.4))); };
  g.strokeStyle='#EAF0F7'; g.lineWidth=2.2; g.beginPath();
  const tEnd=Math.min(now,tMax);
  for(let x=0;x<=W;x+=1.5){ const t=x/W*tMax; if(t>tEnd) break; let y=H*0.46+Math.sin(t*0.9)*0.7+Math.sin(t*2.3+1)*0.5;
    if(tp!=null) y+=wig(t,tp,H*0.17,7); if(a.S!=null) y+=wig(t,a.S,H*0.34,12); if(x===0) g.moveTo(x,y); else g.lineTo(x,y); }
  g.stroke();
  const mark=(t,col,txt)=>{ if(t==null) return; const x=t/tMax*W; g.strokeStyle=col; g.lineWidth=2; g.setLineDash([5,5]); g.beginPath(); g.moveTo(x,6); g.lineTo(x,H-30); g.stroke(); g.setLineDash([]); g.fillStyle=col; g.font='700 22px system-ui,sans-serif'; g.fillText(txt,x+5,24); };
  mark(tp,'#5DB8FF','P'); mark(a.S,'#FF7AD0','S');
  g.fillStyle='rgba(240,135,74,.9)'; g.fillRect(tEnd/tMax*W-1,0,2,H);
}

/* ---------- Schale antippen ---------- */
const ray=new THREE.Raycaster(); let downP=null;
renderer.domElement.addEventListener('pointerdown',e=>{ downP={x:e.clientX,y:e.clientY,t:performance.now()}; });
renderer.domElement.addEventListener('pointerup',e=>{
  if(!downP||S.mode==='label'||S.seis) return; const moved=Math.hypot(e.clientX-downP.x,e.clientY-downP.y), dt=performance.now()-downP.t; downP=null;
  if(moved>6||dt>500) return;
  const r=renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1)),camera);
  const hits=ray.intersectObjects([faceA,faceB,ball,earth],false);
  for(const h of hits){
    const p=h.point, az=Math.atan2(p.z,p.x), inW=S.openT>0.01&&az>=0&&az<=S.openT;
    if(h.object===earth){ if(inW) continue; stopPlay(); if(S.mode==='quiz') return; goStation(0); return; }
    if(h.object===ball&&!inW) continue;
    if((h.object===faceA||h.object===faceB)&&S.openT<0.01) continue;
    const ll=llOf(p), lon=h.object===faceB?lonB():LON0, st=structAt(ll.lat,lon);
    let d=h.object===ball?5900:invA(M,1-p.length());
    if(d<-(st.wdep>0.2?0:st.elev)) continue;
    const L=d<st.moho?0:(d<Math.max(st.lab,st.moho+8)?1:(d<410?2:(d<660?3:(d<2890?4:(d<5150?5:6)))));
    stopPlay(); if(S.mode==='quiz') return;
    if(S.mode==='free'){ const it=LABELS.find(o=>o.L===L&&o.info); if(it){ openPop(it); return; } }
    S.probeTarget=clamp(d,0,RKM); if(L===0) S.probeTarget=Math.min(S.probeTarget,PROBE_S.moho-2); if(L===1) S.probeTarget=clamp(d,PROBE_S.moho+2,PROBE_S.lab-2);
    $('depth').value=kmToSlider(S.probeTarget);
    goStation(stationOfLayer(L),{keepDepth:true}); toast(`${LAY[L].name.split(' · ')[0]}: ${LAY[L].state}`); return;
  }
});

/* ---------- Bildausschnitt: Modell zwischen Ansichtsleiste und Bedienfeld zentrieren ---------- */
let viewOff={x:0,y:0,tx:0,ty:0};
function onResize(){ labelsEl.querySelectorAll('.lb').forEach(el=>el._dirty=true); PANEL_W=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--panel-w'))||356; }
let PANEL_W=356, PANEL_TOP=0;
const panelEl=$('panel');
function measurePanel(){ const r=panelEl.getBoundingClientRect(); PANEL_TOP=r.height>0?r.top:0; }
if(typeof ResizeObserver==='function') new ResizeObserver(measurePanel).observe(panelEl);
addEventListener('resize',measurePanel); measurePanel();
function narrowBottom(){ return (!app.classList.contains('panel-hidden')&&PANEL_TOP>0) ? PANEL_TOP-8 : VH-206; }
function freeRect(){   // freie Fläche für das Modell zwischen Ansichtsleiste, Beschriftungen, Bedienfeld, Titel und Abspielleiste
  const narrow=VW<860, panelOn=!app.classList.contains('panel-hidden')&&!narrow;
  const left=narrow?0:(S.seis?330:182), lbw=S.mode==='label'?238:(VW<1100?168:238), right=panelOn?VW-PANEL_W-16-(S.labels>0||S.mode==='label'?lbw:30):VW-(S.labels>0&&!narrow?lbw:0);
  const top=narrow?(S.seis?250:128):96, bottom=narrow?narrowBottom():VH-(S.seis||S.mode==='label'?140:212);
  return {left,right,top,bottom,w:Math.max(120,right-left),h:Math.max(120,bottom-top)};
}
function updViewOffset(dt){
  const fr=freeRect();
  viewOff.tx=VW/2-(fr.left+fr.right)/2; viewOff.ty=VH/2-(fr.top+fr.bottom)/2;
  viewOff.x+=(viewOff.tx-viewOff.x)*Math.min(1,dt*5); viewOff.y+=(viewOff.ty-viewOff.y)*Math.min(1,dt*5);
  camera.setViewOffset(VW,VH,viewOff.x,viewOff.y,VW,VH);
}

/* ---------- Hauptschleife ---------- */
let lastT=performance.now(), started=false;
const _cr=new V3(), _cu=new V3(), _cb=new V3();
function frame(now){
  const ms=now-lastT, dt=Math.min(0.05,ms/1000); lastT=now; S.time+=dt; U.uTime.value=S.time;
  const speed=+$('speed').value;
  resize();
  // Maßstab
  if(Math.abs(exag-exagTarget)>1e-4){ exag+=Math.sign(exagTarget-exag)*Math.min(Math.abs(exagTarget-exag),dt/1.4); updM(); platesBuiltFor=-1; labelsEl.querySelectorAll('.lb').forEach(el=>el._dirty=true);
  }
  { const my=2*speed; const txt=(exagTarget?'Maßstabsgetreu':'Obere Schichten gestreckt')+' · Zeitraffer: 1 s ≈ '+(my<1.5?'1 Mio.':Math.round(my)+' Mio.')+' Jahre'; if($('scaleNote').textContent!==txt) $('scaleNote').textContent=txt; }
  if(platesBuiltFor!==exag && Math.abs(exag-exagTarget)<1e-4 && STRUCT.ready){ buildPlates(); platesBuiltFor=exag; }
  U.uExag.value=exag; earthMat.uniforms.uBump.value=lerp(9.0,2.5,exag); U.uPR.value=QUAL.pr; U.uDim.value+=((S.seis?0.42:1)-U.uDim.value)*Math.min(1,dt*4);
  // Schnitt öffnen
  if(opening){ S.openT=Math.min(S.openTarget,S.openT+dt*(Math.PI/2)/2.4*speed); if(S.openT>=S.openTarget-1e-4) opening=false; }
  else if(Math.abs(S.openT-S.openTarget)>1e-4){ S.openT+=Math.sign(S.openTarget-S.openT)*Math.min(Math.abs(S.openTarget-S.openT),dt*1.5); }
  const o=S.openT; U.uOpen.value=o; faceB.rotation.y=-o; faceB.material.uniforms.uLon.value=lonB(); faceB.material.uniforms.uFaceN.value.set(Math.sin(o),0,-Math.cos(o)); U.uFaceAvg.value.set(Math.sin(o),0,1-Math.cos(o)); if(U.uFaceAvg.value.lengthSq()<1e-6) U.uFaceAvg.value.set(1,0,0); U.uFaceAvg.value.normalize();
  plateClip[1].normal.set(-Math.sin(o),0,Math.cos(o));
  const faceVis=o>0.004; faceA.visible=faceB.visible=faceVis; ball.visible=faceVis&&!S.seis; ball.scale.setScalar(rad(5150));
  // Hervorhebung
  const popL=popOpen&&popOpen.L!==undefined&&!popOpen.only ? (popOpen.info==='litho'?[1,1,0,0,0,0,0]:[0,1,2,3,4,5,6].map(k=>k===popOpen.L?1:0)) : null;
  const want=popL||((S.mode==='explore'&&ST[S.cur].hi)?ST[S.cur].hi:null);
  for(let k=0;k<7;k++) S.hi[k]+=((want?want[k]:1)-S.hi[k])*Math.min(1,dt*4);
  S.hiOn+=((want?1:0)-S.hiOn)*Math.min(1,dt*4); U.uHiOn.value=S.hiOn*0.9;
  // Reise
  if(playing){
    if(opening){}
    else if(S.cur===0&&S.probeKm<0.5){ dwell+=dt*speed; if(dwell>1.2){ dwell=0; goStation(1); } }
    else{ const sv=fwdA(MD,S.probeKm), tv=fwdA(MD,S.probeTarget);
      if(Math.abs(sv-tv)>1e-4){ const ns=sv+Math.sign(tv-sv)*Math.min(Math.abs(tv-sv),dt*0.11*speed); S.probeKm=invA(MD,ns); $('depth').value=Math.round(ns*1000); if(Math.abs(ns-tv)<=1e-4) S.probeKm=S.probeTarget; }
      else if(S.cur<7){ if($('stopEach').checked){ stopPlay(); toast(`Station ${S.cur}: ${ST[S.cur].n}. Lies den Text und drücke dann wieder ▶.`); } else { dwell+=dt*speed; if(dwell>5){ dwell=0; goStation(S.cur+1); } } }
      else stopPlay(); }
  } else { S.probeKm+=(S.probeTarget-S.probeKm)*Math.min(1,dt*5); if(Math.abs(S.probeTarget-S.probeKm)<0.2) S.probeKm=S.probeTarget; }
  // Kamera
  if(camTw){ camTw.s+=Math.min(0.12,ms/1000)/camTw.d; const e=ease(Math.min(1,camTw.s)); camera.position.lerpVectors(camTw.p0,camTw.p1,e); controls.target.lerpVectors(camTw.t0,camTw.t1,e); if(camTw.s>=1) camTw=null; }
  controls.update(); updViewOffset(dt);
  camera.updateMatrixWorld(); _cr.setFromMatrixColumn(camera.matrixWorld,0); _cu.setFromMatrixColumn(camera.matrixWorld,1); _cb.setFromMatrixColumn(camera.matrixWorld,2);
  U.uSun.value.copy(_cr).multiplyScalar(-0.5).addScaledVector(_cu,0.55).addScaledVector(_cb,0.67).normalize();
  sky.position.copy(camera.position);
  // Erde
  earthMat.uniforms.uClouds.value+=((S.clouds?0.72:0)-earthMat.uniforms.uClouds.value)*Math.min(1,dt*4);
  earthMat.uniforms.uFlowT.value=(S.time*0.00035)%1;
  // Simulation und Strömung
  if(SIM.localStep) SIM.localStep(dt);
  SIM.mixT=Math.min(1,SIM.mixT+dt/Math.max(0.03,SIM.interval)); U.uSimMix.value=SIM.mixT;
  S.myr+=dt*speed*(S.paused?0:4);
  labProfiles(); findFlow(dt);
  const faceSeen=camera.position.z>0.08||o>2.6;
  particlesUpdate(dt, S.flow&&faceVis&&o>0.35&&!S.seis);
  // Sonde
  probeUpdate(S.mode!=='label'&&!S.seis&&faceVis&&faceSeen&&o>0.5); updProbeCard();
  // Ebenen
  if(plates) plates.visible=S.plates&&S.mode!=='label';
  magUpdate(dt, S.field||S.aurora, S.aurora&&!S.seis, _cr, _cb);
  seisUpdate(dt); if(S.seis) seisCardUpdate(false);
  renderFrame(S.time);
  // Beschriftungen
  const labOk=faceVis&&o>1.2&&faceSeen;
  const zoomed=camera.position.distanceTo(controls.target)<1.3;
  LABELS.forEach(l=>{ l.show=labOk&&(!S.aurora||S.mode==='free')&&S.mode!=='label'&&!S.seis&&S.labels>=l.lvl&&(l.only==null||l.only===S.cur)&&(!l.zoom||zoomed||S.labels===2); if(l.only!=null&&!S.flow) l.show=false; });
  SEIS_LABELS.forEach(l=>{ l.show=S.seis&&S.labels>0&&SEIS.ready; });
  MAG_LABELS.forEach(l=>{ l.show=S.aurora&&MAGF.aur>0.6&&!S.seis&&(S.mode==='explore'||S.mode==='free')&&S.labels>0; });
  labRows.forEach(r=>{ r.show=S.mode==='label'&&labOk; });
  // weiche Bewegung der Strömungs-Beschriftungen
  { const mv=(c,t)=>{ if(t==null) return c; const d=t-c; return c+Math.sign(d)*Math.min(Math.abs(d)*Math.min(1,dt*0.8),dt*6); }; FLOWA.plume=mv(FLOWA.plume,FLOWA.pt); FLOWA.slab=mv(FLOWA.slab,FLOWA.stg); }   // ruhig gleiten, max. 6°/s
  layout([...LABELS,...SEIS_LABELS,...MAG_LABELS,...labRows]); placeDirect(labOk&&S.mode!=='label'&&!S.seis); placePop();
  qualityTick(ms,now);
  window.__frames=(window.__frames||0)+1;
  requestAnimationFrame(frame);
}

/* ---------- Start ---------- */
window.addEventListener('resize',()=>resize());
resize(true); renderExplain(0); updPlayBtn();
loadAssets(()=>{
  $('veilTxt').textContent='Erdbebenwellen werden berechnet …';
  setTimeout(()=>{
    try{ seisPrepare(); }catch(e){ diag('Erdbebenwellen: '+e.message); }
    simStart(); simSetRate(1);
    U.uReady.value=1; goStation(0,{force:true}); flyTo(...camFor(0),0.01);
    $('veil').classList.add('done'); started=true; window.__ready=true;
    requestAnimationFrame(frame);
  },30);
});
