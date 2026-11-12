/* ==========================================================================
   Pyramiden-Labor · Teil E: Erklärfilm und Hauptschleife
   Kapitel mit Sprecherstimme (Sprachausgabe des Browsers) und Untertiteln. Am Ende jedes Kapitels wartet der Film.
   Aufgenommene Stimmen: window.__NARR_AUDIO['de_k01'] = Adresse oder Daten-URI einer MP3-Datei (optional).
   ========================================================================== */
const PARA_GAP=1.9,SENT_GAP=.3,LEAD=1.0,TAIL=1.6,WPS={de:2.2,fr:2.6};
const FILM={i:0,t:0,dur:1,items:[],pS:[],paused:false,atEnd:false,voice:lsGet('geogym-pyr-voice')!=='off',gen:0,spoken:-1,busy:false,para:-1,saved:null,audio:null,useAudio:false,noAudio:{},hasAudio:{},tryAudio:false,utt:null};
const synthOK=()=>'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined';
function sentences(p,lang){const out=[];let cur='';for(let i=0;i<p.length;i++){const ch=p[i];cur+=ch;if('.!?'.includes(ch)&&p[i+1]===' '&&!(/[0-9]/.test(p[i-1]||'')&&ch==='.')){out.push(cur.trim());cur=''}}if(cur.trim())out.push(cur.trim());return out}
/* ---------- Stimme ---------- */
// VO.pref: vom Nutzer gewählte Stimme je Sprache · noPick: gewählte Stimme blieb stumm -> Standardstimme des Systems · dead: Sprachausgabe startet gar nicht
const VO={pref:{de:lsGet('geogym-pyr-voice-de')||'',fr:lsGet('geogym-pyr-voice-fr')||''},noPick:false,told:false,fails:0,dead:false,heard:false};
let voicePick={};
const voicesFor=lang=>synthOK()?speechSynthesis.getVoices().filter(v=>(v.lang||'').toLowerCase().replace('_','-').startsWith(lang)):[];
function pickVoice(lang){if(!synthOK())return null;if(voicePick[lang])return voicePick[lang];const want={de:'de-DE',fr:'fr-FR'}[lang],vs=voicesFor(lang);
  const pf=VO.pref[lang]&&vs.find(v=>v.name===VO.pref[lang]);if(pf){voicePick[lang]=pf;return pf}
  // Stimmen des Geräts zuerst (Netz-Stimmen bleiben in eingebetteten Seiten oft stumm), bessere Qualität vor einfachen Stimmen
  let best=null,bs=-99;for(const v of vs){let sc=0;const n=(v.name||'')+' '+(v.voiceURI||'');if((v.lang||'').replace('_','-')===want)sc+=3;if(v.localService)sc+=4;else sc-=2;
    if(/premium|enhanced|erweitert|améliorée|natural|neural|siri/i.test(n))sc+=2;if(/eloquence|novelty/i.test(n))sc-=4;if(/compact/i.test(n))sc-=1;if(v.default)sc+=1;if(sc>bs){bs=sc;best=v}}
  voicePick[lang]=best;return best}
if(synthOK()&&speechSynthesis.addEventListener)speechSynthesis.addEventListener('voiceschanged',()=>{voicePick={};if(S.film)filmNav()});
function synthCancel(){if(!synthOK())return;try{if(speechSynthesis.speaking||speechSynthesis.pending)speechSynthesis.cancel()}catch(e){}}
function narrStop(){FILM.gen++;FILM.busy=false;synthCancel();if(FILM.audio)try{FILM.audio.pause()}catch(e){}}
function voiceFail(why){VO.fails++;if(!VO.told){VO.told=true;toast('<b>'+T('voiceFailT')+'</b>'+T('voiceFail')+' <span style="opacity:.6">('+why+' · '+voicesFor(S.lang).length+')</span>',14000)}if(VO.fails>=2)VO.dead=true}
// n: 0 erster Versuch · 1 derselbe Satz noch einmal · 2 mit der Standardstimme des Systems
function speak(i,n){const it=FILM.items[i];FILM.spoken=i;if(!FILM.voice||FILM.useAudio||!synthOK())return;n=n||0;
  const g=FILM.gen,u=new SpeechSynthesisUtterance(it.text),v=VO.noPick?null:pickVoice(S.lang);let started=false,ended=false;
  u.lang=S.lang==='fr'?'fr-FR':'de-DE';if(v)u.voice=v;u.rate=.96;u.volume=1;u.pitch=1;FILM.busy=true;FILM.utt=u;   // Verweis halten: Chrome verwirft Äußerungen sonst vorzeitig
  u.onstart=()=>{started=true;VO.heard=true;VO.fails=0;VO.dead=false};
  u.onend=()=>{ended=true;if(g===FILM.gen&&FILM.utt===u)FILM.busy=false};
  u.onerror=e=>{ended=true;if(g!==FILM.gen||FILM.utt!==u)return;FILM.busy=false;const w=e&&e.error;if(w&&!/interrupted|canceled|cancelled/.test(w))voiceFail(w)};
  try{if(speechSynthesis.paused)speechSynthesis.resume();speechSynthesis.speak(u)}catch(e){FILM.busy=false;voiceFail('exception');return}
  setTimeout(()=>{if(g!==FILM.gen||FILM.utt!==u||started||ended)return;
    if(speechSynthesis.speaking)return;                                   // läuft offenbar, meldet nur keinen Start
    if(n<2){if(n===1)VO.noPick=true;synthCancel();speak(i,n+1)}else{FILM.busy=false;voiceFail('no start')}},2300);
  setTimeout(()=>{if(g!==FILM.gen||FILM.utt!==u||ended)return;FILM.busy=false;                // nie ein Ende gemeldet
    if(!started){synthCancel();VO.noPick=true;voiceFail('no sound')}},(it.len*2+5)*1000)}
const st=p=>setS(p,true);
const yr=(a,b,k)=>{S.year=lerp(a,b,smooth(clamp(k,0,1)))};
const hl=c=>{app.classList.remove('hl-age','hl-axis','hl-title');if(c)app.classList.add(c)};
const BASE={people:false,cmp:null,cmpYear:null,tmpl:null,cohort:null,rates:false,events:false,groups:false,excess:false,birth:false,fixed:true,chartMode:'land'};
const SHOTS=[
{enter(){st(Object.assign({},BASE,{c:'LU',year:2024,mode:'abs',grp:5,people:true,pstage:0,view:'crowd'}));fig.p=0;fig.snap=true},
 para(p){if(p===1)st({pstage:1,view:'floor'});if(p===2)st({pstage:2,view:'oblique'});if(p===3)st({year:1994});if(p===4)st({year:2024,people:false,view:'front'})},
 tick(p,k){if(p===3)yr(1994,2024,k)}},
{enter(){st(Object.assign({},BASE,{c:'LU',year:2024,mode:'abs',grp:5,view:'front'}))},
 para(p){hl(p===0?'hl-age':p===1?'hl-axis':p===3?'hl-title':null);S.hover=p===2?{s:1,i:6}:null;if(p!==2)showTip(null)},
 tick(p){if(p===2){const v=new THREE.Vector3(G.GAP+V.lens[NA+6]+.1,6.5*.5,V.depth/2),o={};project(v,o);const r=stage.getBoundingClientRect();showTip({s:1,i:6},{clientX:r.left+o.x,clientY:r.top+o.y-60})}},leave(){hl(null);S.hover=null;showTip(null)}},
{enter(){st(Object.assign({},BASE,{c:'LU',year:2024,mode:'abs',grp:5,view:'front'}))},
 para(p){if(p===1)st({cmp:'DE'});if(p===2)st({mode:'pct'});if(p===3)st({cmp:null})}},
{enter(){st(Object.assign({},BASE,{c:'LU',year:2024,mode:'pct',grp:5,view:'front'}))},
 para(p){if(p===1)st({c:'NE',year:2024,tmpl:'pyr'});if(p===2)st({c:'IN',year:2024,tmpl:'bell'});if(p===3)st({c:'JP',year:2024,tmpl:'urn'})}},
{enter(){st(Object.assign({},BASE,{c:'LU',year:1880,mode:'abs',grp:5,view:'front',events:true}))},
 tick(p,k){if(p===0)S.year=1880;if(p===1)yr(1880,1950,k);if(p===2)yr(1950,1985,k);if(p===3)yr(1985,2024,k*1.25)}},
{enter(){st(Object.assign({},BASE,{c:'DE',year:1950,mode:'abs',grp:1,view:'front',events:true}))},
 para(p){if(p===2)st({excess:true})},tick(p,k){if(p<3)S.year=1950;if(p===3)yr(1950,1975,k);if(p===4)yr(1975,2024,k)}},
{enter(){st(Object.assign({},BASE,{c:'DE',year:2024,mode:'abs',grp:1,view:'land'}))},
 para(p){if(p===1)st({cohort:[1964,1964],view:'side'});if(p===2)st({view:'land'})},tick(p,k){if(p<2)S.year=2024;if(p===2)yr(2024,2060,k);if(p===3)S.year=2060}},
{enter(){st(Object.assign({},BASE,{c:'FR',year:1820,mode:'pct',grp:5,view:'front',rates:true,tmpl:'auto'}))},
 para(p){if(p===4)st({rates:false,tmpl:null})},tick(p,k){if(p<2)S.year=1820;if(p===2)yr(1820,2024,k);if(p>=3)S.year=2024}}];
function filmPrep(){
  const ch=(FILM_TXT[S.lang]||FILM_TXT.de)[FILM.i],w=WPS[S.lang]||2.3;narrStop();FILM.items=[];FILM.pS=[];let t=LEAD;
  ch.p.forEach((para,p)=>{if(p)t+=PARA_GAP-SENT_GAP;FILM.pS.push(t);sentences(para,S.lang).forEach(s=>{const len=.4+s.split(/\s+/).length/w;FILM.items.push({text:s,p,t0:t,len});t+=len+SENT_GAP})});
  FILM.dur=t+TAIL;FILM.pS.push(FILM.dur);FILM.t=0;FILM.spoken=-1;FILM.para=-1;FILM.atEnd=false;FILM.paused=false;FILM.useAudio=false;
  FILM.tryAudio=false}
// aufgenommene Stimme: window.__NARR_AUDIO[key] oder Datei audio/<Sprache>_kNN.mp3 neben der Seite; sonst Sprachausgabe des Browsers
function filmAudio(){
  const key=S.lang+'_k'+String(FILM.i+1).padStart(2,'0'),own=window.__NARR_AUDIO&&window.__NARR_AUDIO[key],lang=S.lang;
  const src=own||(FILM.noAudio[lang]||!/^https?:|^file:/.test(location.protocol)?null:'audio/'+key+'.mp3');if(!src||!FILM.voice)return false;
  const a=FILM.audio||(FILM.audio=new Audio()),g=FILM.gen;a.onended=()=>{if(g===FILM.gen&&FILM.useAudio){FILM.useAudio=false;FILM.t=Math.max(FILM.t,FILM.dur-TAIL)}};
  const fail=()=>{if(g!==FILM.gen)return;FILM.useAudio=false;if(!own)FILM.noAudio[lang]=true;if(FILM.tryAudio){FILM.tryAudio=false}};
  a.onerror=fail;a.src=src;
  try{const p=a.play();if(p&&p.then)p.then(()=>{if(g!==FILM.gen){a.pause();return}if(!isFinite(a.duration)||a.duration<2){a.pause();fail();return}
      FILM.useAudio=true;FILM.hasAudio[lang]=true;FILM.tryAudio=false;FILM.busy=false;synthCancel();FILM.aScale=(FILM.dur-LEAD-TAIL)/a.duration}).catch(fail)}catch(e){fail()}
  return !!(own||FILM.hasAudio[lang])}     // true: Aufnahme wird erwartet -> Sprachausgabe wartet
function filmGo(i,click){const prev=SHOTS[FILM.i];if(prev&&prev.leave)prev.leave();hl(null);FILM.i=clamp(i,0,SHOTS.length-1);S.playing=false;filmPrep();SHOTS[FILM.i].enter();
  FILM.tryAudio=filmAudio();
  // Der erste Satz startet direkt im Klick: Safari und iPad erlauben Ton nur als Antwort auf eine Bedienung
  if(click&&FILM.voice&&!FILM.tryAudio&&synthOK()){FILM.t=FILM.items[0].t0;speak(0)}
  filmNav();filmCap()}
function filmStart(){if(S.film)return filmEnd();const keep={};for(const k in S)keep[k]=Array.isArray(S[k])?S[k].slice():S[k];FILM.saved={S:keep,cam:camera.position.clone(),tgt:controls.target.clone(),p:fig.p};
  S.film=true;S.secret=false;S.playing=false;app.classList.add('film');$('cine').hidden=false;$('filmBtn').textContent=T('filmEnd');showTip(null);
  if(FILM.voice&&!synthOK())toast(T('noVoice'),9000);
  VO.told=false;VO.fails=0;VO.dead=false;
  filmGo(0,true);resize()}
function filmEnd(){if(!S.film)return;narrStop();const sh=SHOTS[FILM.i];if(sh.leave)sh.leave();hl(null);S.film=false;app.classList.remove('film');$('cine').hidden=true;$('filmBtn').textContent=T('film');
  const k=FILM.saved;if(k){for(const key in k.S)if(key!=='lang'&&key!=='film')S[key]=k.S[key];buildTimeline();camera.position.copy(k.cam);controls.target.copy(k.tgt);cam.a=null;fig.p=k.p}
  syncUI();renderLearn();headKey='';resize()}
function filmNav(){const n=SHOTS.length;let h=`<button data-f="prev" aria-label="‹">‹</button>`;for(let i=0;i<n;i++)h+=`<button data-f="${i}" ${i===FILM.i?'aria-current="true"':''}>${i+1}</button>`;
  h+=`<button data-f="next" class="next${FILM.atEnd&&FILM.i<n-1?' pulse':''}" aria-label="›">›</button><button data-f="pause">${T(FILM.paused?'cGo':'cPause')}</button><button data-f="voice">${T(FILM.voice?'cVoiceOn':'cVoiceOff')}</button>`;
  const vs=voicesFor(S.lang);if(FILM.voice&&vs.length>1&&!FILM.useAudio){const curV=VO.noPick?null:pickVoice(S.lang);
    h+=`<select class="sel" id="cVoiceSel" aria-label="${T('cVoicePick')}"><option value="">${T('cVoiceAuto')}</option>${vs.map(v=>`<option value="${esc(v.name).replace(/"/g,'&quot;')}"${VO.pref[S.lang]===v.name?' selected':''}>${esc(v.name)}${curV&&curV.name===v.name&&!VO.pref[S.lang]?' ✓':''}</option>`).join('')}</select>`}
  h+=`<button data-f="end"${FILM.atEnd&&FILM.i===n-1?' class="next pulse"':''}>${T('cEnd')}</button>`;$('cnav').innerHTML=h}
function filmCap(){const ch=(FILM_TXT[S.lang]||FILM_TXT.de)[FILM.i],it=FILM.items[Math.max(0,FILM.spoken)];const h=`<small>${T('cChap',FILM.i+1,ch.t)}</small>${FILM.spoken<0?'':esc(it.text)}`;if(filmCap.h!==h){filmCap.h=h;$('cap').innerHTML=h}}
function respeak(){const i=Math.max(0,FILM.spoken);narrStop();FILM.t=FILM.items[i].t0;speak(i)}
$('cnav').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const f=b.dataset.f;
  if(f==='prev')filmGo(FILM.t>4||FILM.i===0?FILM.i:FILM.i-1,true);else if(f==='next'){if(FILM.i<SHOTS.length-1)filmGo(FILM.i+1,true);else filmEnd()}
  else if(f==='pause'){FILM.paused=!FILM.paused;if(FILM.paused){narrStop()}else if(FILM.atEnd){filmGo(FILM.i,true)}else if(FILM.useAudio&&FILM.audio){FILM.audio.play()}else{respeak()}filmNav()}
  else if(f==='voice'){FILM.voice=!FILM.voice;lsSet('geogym-pyr-voice',FILM.voice?'on':'off');if(!FILM.voice)narrStop();else{VO.told=false;VO.fails=0;VO.dead=false;if(!FILM.paused&&!FILM.atEnd)respeak()}filmNav()}
  else if(f==='end')filmEnd();else filmGo(+f,true)});
$('cnav').addEventListener('change',e=>{if(e.target.id!=='cVoiceSel')return;VO.pref[S.lang]=e.target.value;lsSet('geogym-pyr-voice-'+S.lang,e.target.value);voicePick={};VO.noPick=false;VO.told=false;VO.fails=0;VO.dead=false;
  if(!FILM.paused&&!FILM.atEnd)respeak();filmNav()});
$('filmBtn').addEventListener('click',filmStart);
function filmLang(){if(S.film){filmGo(FILM.i)}}
function filmTick(dt){
  if(!S.film)return;const sh=SHOTS[FILM.i];
  if(!FILM.paused&&!FILM.atEnd){
    if(FILM.useAudio&&FILM.audio&&!FILM.audio.paused){FILM.t=LEAD+FILM.audio.currentTime*FILM.aScale}
    else{const nx=FILM.items[FILM.spoken+1];let step=dt;
      if(FILM.tryAudio&&FILM.t+step>LEAD-.05&&FILM.spoken<0)step=0;                                                             // wartet kurz auf die Aufnahme
      else if(FILM.voice&&synthOK()&&!FILM.useAudio&&!VO.dead){if(FILM.busy&&nx&&FILM.t+step>nx.t0-.02)step=Math.max(0,nx.t0-.02-FILM.t);   // auf die Stimme warten
        else if(!FILM.busy&&FILM.spoken>=0&&nx&&nx.p===FILM.items[FILM.spoken].p&&FILM.t<nx.t0-SENT_GAP)step=dt*3}            // die Stimme war schneller: aufholen
      FILM.t+=step}
    const nx=FILM.items[FILM.spoken+1];if(nx&&FILM.t>=nx.t0){speak(FILM.spoken+1);filmCap()}
    if(FILM.t>=FILM.dur&&!FILM.busy){FILM.atEnd=true;filmNav()}}
  let p=0;while(p<FILM.pS.length-2&&FILM.t>=FILM.pS[p+1]-PARA_GAP*.5)p++;
  if(p!==FILM.para){FILM.para=p;if(sh.para)sh.para(p)}
  const a=FILM.pS[p],b=FILM.pS[p+1]-PARA_GAP*.6;if(sh.tick)sh.tick(p,clamp((FILM.t-a)/Math.max(.5,b-a),0,1));
  $('cbar').style.width=(clamp(FILM.t/FILM.dur,0,1)*100).toFixed(1)+'%'}

/* ---------- Hauptschleife ---------- */
let last=performance.now(),uiT=0,frames=0;window.__frames=0;
/* ---------- Energiesparen ----------
   Gezeichnet wird nur, solange sich etwas bewegt (Abspielen, Kamera, Übergänge, Film, Figuren) und noch 2,5 s danach.
   Steht alles still, schläft die Schleife ganz; jede Berührung oder Zustandsänderung weckt sie wieder.
   Höchstens 60 Bilder pro Sekunde (auch auf 120-Hz-Bildschirmen), im Vorführmodus 30, solange niemand das Bild berührt. */
const PWR={run:false,wake:0,sig:'',touch:-1e9,lastDraw:0,fresh:0};
function stateSig(){const h=S.hover,co=S.cohort;return [S.c,S.year,S.mode,S.grp,S.view,S.events,S.groups,S.excess,S.rates,S.birth,S.people,S.pstage,S.stripes,S.cmp,S.cmpYear,S.tmpl,co?co[0]+'-'+co[1]:'',S.theme,S.lang,S.fixed,S.chartMode,S.modelPh,h?h.s+'.'+h.i:'',S.film,S.playing,S.pres,VW,VH].join('|')}
function wake(ms){const now=performance.now();PWR.wake=Math.max(PWR.wake,now+(ms||2500));if(!PWR.run){PWR.run=true;last=now;PWR.lastDraw=0;PWR.fresh=4;requestAnimationFrame(frame)}}
function busy(){return S.playing||TW.on||!!cam.a||V.moving||(S.film&&(FILM.busy||(!FILM.paused&&!FILM.atEnd)))||(S.people&&((fig.mv||0)>.004||Math.abs(S.pstage-fig.p)>.002))}
['pointerdown','keydown','wheel','input','change','click','touchstart'].forEach(t=>document.addEventListener(t,e=>{if(t==='pointerdown'||t==='touchstart')PWR.touch=performance.now();wake()},{passive:true,capture:true}));
document.addEventListener('pointermove',e=>{if(e.buttons){PWR.touch=performance.now();wake(800)}else if(e.target===renderer.domElement)wake(600)},{passive:true});
window.addEventListener('resize',()=>wake());
document.addEventListener('visibilitychange',()=>{if(!document.hidden){wake();if(S.pres)wakeLock(true)}});
setInterval(()=>{if(!PWR.run&&!document.hidden&&stateSig()!==PWR.sig)wake()},250);   // Änderungen, die ohne Berührung passieren (Sprachausgabe, Zeitgeber)
// Vorführmodus: der Bildschirm soll beim Präsentieren nicht ausgehen
let WL=null;async function wakeLock(on){try{if(on&&!WL&&navigator.wakeLock&&!document.hidden){WL=await navigator.wakeLock.request('screen');WL.addEventListener('release',()=>{WL=null})}else if(!on&&WL){const w=WL;WL=null;await w.release()}}catch(e){WL=null}}

function frame(now){
  if(!PWR.run)return;
  const cap=S.pres&&now-PWR.touch>600?30:60;
  if(now-PWR.lastDraw<1000/cap-2.5){requestAnimationFrame(frame);return}
  PWR.lastDraw=now;
  const dt=Math.min(.1,(now-last)/1000);last=now;
  tweenTick(now);
  if(S.playing){const c=C(),end=play.end||c.y1;S.year+=S.speed*(S.people?.5:1)*dt;if(S.year>=end){S.year=end;S.playing=false;syncUI()}}
  filmTick(dt);camStep(now);if(controls.update())wake(350);
  computeView(dt);
  updateLabels();placeLabels();
  if(composer&&useBloom&&TH.bloom)composer.render();else renderer.render(scene,camera);
  uiT+=dt;if(uiT>.07){uiT=0;updateHead();updateData();if(S.playing||S.film)$('year').value=S.year;drawChart()}
  window.__frames=++frames;
  // Bildrate beobachten: bei dauerhaft unter 24 Bildern pro Sekunde (im Vorführmodus: unter 20) die Qualität senken
  if(PWR.fresh>0)PWR.fresh--;else{emaDt+=(dt-emaDt)*.05;if(frames%120===0&&frames>=240&&emaDt>(cap===30?.05:.042)&&QLEVEL<2&&!document.hidden){QLEVEL++;if(QLEVEL===2)useBloom=false;resize();emaDt=.02}}
  const sg=stateSig();if(sg!==PWR.sig){PWR.sig=sg;wake(2500)}
  if(busy())wake(400);
  if(now>PWR.wake){PWR.run=false;return}   // alles steht: schlafen
  requestAnimationFrame(frame)}
let emaDt=.016;
window.addEventListener('error',e=>{const d=$('diag');d.hidden=false;d.textContent='Fehler: '+(e.message||e.type)+(e.filename?' ('+String(e.filename).split('/').pop()+':'+e.lineno+')':'')});
function init(){
  if(QS.get('lang')==='fr'||QS.get('lang')==='de')S.lang=QS.get('lang');
  // Gibt es Aufnahmen neben der Seite (audio/de_k01.mp3 …)? Einmal vorab nachsehen, damit der Klick auf „Erklärfilm“ sofort die Browserstimme startet
  if(/^https?:/.test(location.protocol))for(const l of['de','fr'])fetch('audio/'+l+'_k01.mp3',{method:'HEAD'}).then(r=>{if(!r.ok)FILM.noAudio[l]=true}).catch(()=>{FILM.noAudio[l]=true});
  if(S.pres)setPres(true,true);
  applyTheme(S.theme);applyLang();goStation(0);resize();flyTo(S.view,0);fig.p=S.pstage;fig.snap=true;
  wake(3000);
  setTimeout(()=>{$('veil').classList.add('done');window.__ready=true},350);setTimeout(()=>{$('veil').hidden=true},1400);
  if(TOUCH&&!S.pres&&!lsGet('geogym-pyr-prestip')){lsSet('geogym-pyr-prestip','1');setTimeout(()=>toast(T('presTip')),2200)}}
(document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))]):Promise.resolve()).then(init);
window.__lab={PWR,wake,setPres,S,setS,goStation,filmStart,filmEnd,filmGo,FILM,V,C,flyTo,camera,controls,DATA};
