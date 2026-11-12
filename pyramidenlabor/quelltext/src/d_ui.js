/* ==========================================================================
   Pyramiden-Labor · Teil D: Bedienung (Zeitleiste, Bedienfeld, Lernweg, Diagramm der Raten, Quiz)
   ========================================================================== */
const $=id=>document.getElementById(id), app=$('app');
const esc=s=>String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
function ageVal(cid,year,sex,a){const t=new Float32Array(NB);popAt(DATA.by[cid],year,t);return t[sex*NA+a]}
function grpVal(cid,year,sex,g){const t=new Float32Array(NB),g5=new Float32Array(42);popAt(DATA.by[cid],year,t);group5(t,g5);return g5[sex*21+g]}
let toastT=0;function toast(html,ms){const el=$('toast');el.innerHTML=html;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),ms||4200)}
const play={end:null};
// Jahr weich weiterstellen: ein Schritt = ein Jahr (bei 5-Jahres-Gruppen fünf Jahre), damit man das Hochrücken sieht
const TW={on:false,from:0,to:0,t0:0,dur:0};
function tweenYear(to,ms){const c=C();TW.from=S.year;TW.to=clamp(to,c.y0,c.y1);TW.t0=performance.now();TW.dur=ms;TW.on=Math.abs(TW.to-TW.from)>1e-4;if(!TW.on)S.year=TW.to}
function stepYear(dir,n){n=n||((S.people||S.grp===1)?1:5);const base=TW.on?TW.to:(dir>0?Math.floor(S.year+1e-6):Math.ceil(S.year-1e-6));S.playing=false;
  tweenYear(base+dir*n,S.people?(n===5?5200:1700):(n===5?2600:1000));syncUI()}
function settleYear(up){if(Math.abs(S.year-Math.round(S.year))>1e-4)tweenYear(up?Math.ceil(S.year-.03):Math.round(S.year),320)}
function tweenTick(now){if(!TW.on)return;const k=clamp((now-TW.t0)/TW.dur,0,1);S.year=lerp(TW.from,TW.to,smooth(k));if(k>=1){TW.on=false;S.year=TW.to;$('year').value=S.year}}
let hinted5=false;

/* ---------- Zustand ändern ---------- */
function setS(p,quiet){
  let reTL=false,reView=false;
  if('year' in p||'c' in p)TW.on=false;
  for(const k in p){const v=p[k];
    if(k==='c'){if(v!==S.c){S.c=v;reTL=true;S.hover=null}}
    else if(k==='view'){S.view=v;flyTo(v);reView=true}
    else if(k==='tab'){setTab(v)}
    else if(k==='people'){if(v)S.grp=5;else if(S.people&&!('grp' in p))S.grp=S.grpPref;S.people=v}
    else if(k==='grp'){S.grp=v;if(!p.people)S.grpPref=v}
    else S[k]=v}
  const c=C();S.year=clamp(S.year,c.y0,c.y1);
  if(S.cmp&&S.cmp===S.c&&S.cmpYear==null)S.cmp=null;
  if(reTL)buildTimeline();
  syncUI();if(!quiet)refreshPanels();
  if(S.grp===1&&c.five&&S.year<=c.five[1]&&!hinted5&&!S.film){hinted5=true;toast(T('onlyFive'))}
  resizeSoon()}
let rsT=0;function resizeSoon(){clearTimeout(rsT);rsT=setTimeout(()=>{const w0=USE_W,h0=USE_H;resize();
  if((Math.abs(USE_W-w0)>40||Math.abs(USE_H-h0)>40)&&VIEWS[S.view])flyTo(S.view,.8)},30)}   // freie Fläche hat sich geändert (Diagramm, Bedienfeld): Pyramide neu einpassen
function setTab(t){S.tab=t;document.querySelectorAll('.ptabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  $('pLearn').hidden=t!=='learn';$('pData').hidden=t!=='data';$('pView').hidden=t!=='view';$('pQuiz').hidden=t!=='quiz';$('pscroll').scrollTop=0}
function syncUI(){
  document.querySelectorAll('#rail [data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===S.view));
  $('tEvents').setAttribute('aria-pressed',S.events);$('tGroups').setAttribute('aria-pressed',S.groups);$('tExcess').setAttribute('aria-pressed',S.excess);
  $('tRates').setAttribute('aria-pressed',S.rates);$('tBirth').setAttribute('aria-pressed',S.birth);$('tPeople').setAttribute('aria-pressed',S.people);
  document.querySelectorAll('#segMode button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===S.mode));
  document.querySelectorAll('#segGrp button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.grp===S.grp));
  document.querySelectorAll('#speed button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.sp===S.speed));
  const one=S.people||S.grp===1;$('stepB').textContent=T(one?'stepB':'stepB5');$('stepF').textContent=T(one?'stepF':'stepF5');
  document.querySelectorAll('#countries button').forEach(b=>b.setAttribute('aria-pressed',!S.secret&&b.dataset.c===S.c));
  document.querySelectorAll('.lang button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===S.lang));
  document.querySelectorAll('#chMode button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cm===S.chartMode));
  $('chart').hidden=!S.rates;$('year').value=S.year;
  $('playIco').innerHTML=S.playing?'<path d="M4 3H8V17H4ZM12 3H16V17H12Z"/>':'<path d="M5 3L17 10L5 17Z"/>';$('play').setAttribute('aria-label',T(S.playing?'pauseT':'playT'));
  $('themeBtn').textContent=T(S.theme==='dark'?'thLight':'thDark');
  $('panelBtn').textContent=T('panelOn');$('presBtn').textContent=T('pres');$('presBtn').setAttribute('aria-pressed',S.pres);$('panelBtn').setAttribute('aria-pressed',!app.classList.contains('panel-hidden'));
  syncViewTab()}

/* ---------- Zeitleiste ---------- */
function buildTimeline(){
  const c=C(),tl=$('tl'),yr=$('year'),span=c.y1-c.y0,X=y=>((y-c.y0)/span*100).toFixed(2)+'%';
  yr.min=c.y0;yr.max=c.y1;yr.value=S.year;let h='';
  const oldEnd=c.five?c.five[1]+1:c.hmd?c.hmd[1]+1:c.y0;
  if(oldEnd>c.y0)h+=`<i class="seg-old" style="left:0;width:${X(oldEnd)}"></i>`;
  h+=`<i class="seg-est" style="left:${X(oldEnd)};width:${((c.est-oldEnd)/span*100).toFixed(2)}%"></i><i class="seg-proj" style="left:${X(c.est)};right:0"></i>`;
  if(c.census)for(const y of c.census)h+=`<i class="cen" style="left:${X(y)}" title="${T('kCensus')} ${y}"></i>`;
  tl.innerHTML=h;
  const pxw=Math.max(200,tl.getBoundingClientRect().width||800),need=S.pres?58:46,stp=[10,25,50,100].find(v=>v/span*pxw>=need)||100;let t=`<span style="left:0;transform:none">${c.y0}</span>`;
  for(let y=Math.ceil((c.y0+1)/stp)*stp;y<=c.y1;y+=stp){if((y-c.y0)/span<.07||(y!==c.y1&&(c.y1-y)/span*pxw<need*1.05))continue;t+=`<span style="left:${X(y)}"${y===c.y1?' class="last"':''}>${y}</span>`}
  $('yrs').innerHTML=t}
$('year').addEventListener('input',e=>{S.playing=false;TW.on=false;S.year=+e.target.value;syncUI()});
$('year').addEventListener('change',()=>settleYear(false));
$('play').addEventListener('click',()=>{const c=C();TW.on=false;if(!S.playing&&S.year>=(play.end||c.y1)-.05){S.year=c.y0}play.end=null;S.playing=!S.playing;if(!S.playing)settleYear(true);syncUI()});
$('step').addEventListener('click',e=>{const b=e.target.closest('button');if(b)stepYear(+b.dataset.step)});
$('speed').addEventListener('click',e=>{const b=e.target.closest('button');if(b){S.speed=+b.dataset.sp;syncUI()}});
$('segMode').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setS({mode:b.dataset.mode})});
$('segGrp').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setS({people:false,grp:+b.dataset.grp})});
$('countries').addEventListener('click',e=>{const b=e.target.closest('button');if(b){S.secret=false;setS({c:b.dataset.c})}});
$('rail').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.view)setS({view:b.dataset.view,people:false});
  else{const m={tEvents:'events',tGroups:'groups',tExcess:'excess',tRates:'rates',tBirth:'birth',tPeople:'people'}[b.id];
    if(m==='people')setS({people:!S.people,pstage:2,view:S.people?'front':'oblique'});else setS({[m]:!S[m]})}});
document.querySelector('.ptabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setTab(b.dataset.tab)});
$('panelBtn').addEventListener('click',()=>{app.classList.toggle('panel-hidden');syncUI();resize();if(VIEWS[S.view])flyTo(S.view,.6)});
$('fsBtn').addEventListener('click',()=>{const d=document;if(d.fullscreenElement){d.exitFullscreen&&d.exitFullscreen()}else{const p=app.requestFullscreen&&app.requestFullscreen();if(p&&p.catch)p.catch(()=>{})}});
document.querySelector('.lang').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.lang!==S.lang){S.lang=b.dataset.lang;lsSet('geogym-pyr-lang',S.lang);applyLang()}});
/* Vorführmodus: iPad am Beamer oder Fernseher – große Schrift, große Touch-Flächen, Bedienfeld eingeklappt, sparsam */
function setPres(on,quiet){S.pres=on;lsSet('geogym-pyr-pres',on?'1':'0');app.classList.toggle('pres',on);if(on)app.classList.add('panel-hidden');
  applyTheme(S.theme);chartColors();drawChart.k=null;wakeLock(on);syncUI();resize();buildTimeline();if(!quiet){if(VIEWS[S.view])flyTo(S.view,.6);toast(T(on?'presOn':'presOff'))}}
$('presBtn').addEventListener('click',()=>setPres(!S.pres));
$('themeBtn').addEventListener('click',()=>{applyTheme(S.theme==='dark'?'light':'dark');chartColors();drawChart.t=null;syncUI()});
$('chX').addEventListener('click',()=>setS({rates:false}));
$('chMode').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setS({chartMode:b.dataset.cm})});

/* ---------- Kopfzeile ---------- */
let headKey='';
function updateHead(){
  const c=C(),y=Math.round(S.year),kind=V.kind,key=[S.c,y,kind,S.lang,S.secret,Math.round(V.tot/50),S.people].join('|');if(key===headKey)return;headKey=key;
  $('tCountry').textContent=S.secret?'? ? ?':CN(S.c);$('tYear').textContent=y;
  const badge=kind==='proj'?`<span class="proj">${T('kProj')}</span>`:kind==='census'?`<span class="cen">${T('kCensus')}</span>`:'';
  const src=kind==='census'||kind==='interp'?T('srcStatec')+(kind==='interp'?' · '+T('kInterp'):''):kind==='hmd'?T('kHmd'):T('srcUn')+(kind==='est'?' · '+T('kEst'):'');
  $('tSub').innerHTML=(S.secret?'':`<b>${fmtBig(V.tot)} ${T('inh')}</b>`)+badge+(S.people?`<b>${T('figTag',fmtInt(fig.per>=1000?Math.round(fig.per/100)*100:Math.round(fig.per/10)*10))}</b>`:'')+`<span class="src">${kind==='census'?'':T('asOf')+' · '}${src}</span>`}

/* ---------- Reiter „Zahlen“ ---------- */
function buildData(){
  $('pData').innerHTML=`<div class="kicker" id="dK"></div>
  <dl class="kv"><dt>${T('dPop')}</dt><dd id="dTot"></dd><dt>${T('dMen')}</dt><dd id="dM"></dd><dt>${T('dWomen')}</dt><dd id="dF"></dd>
  <dt>${T('dMed')}<small>${T('dMedS')}</small></dt><dd id="dMed"></dd></dl>
  <h3>${T('dG3')}</h3><div class="g3" id="dG3"><span class="y"></span><span class="w"></span><span class="o"></span></div>
  <div class="g3l"><span>${T('dY')}</span><span>${T('dW')}</span><span>${T('dO')}</span></div>
  <dl class="kv"><dt>${T('dYq')}<small>${T('dYqS')}</small></dt><dd id="dYq"></dd><dt>${T('dOq')}<small>${T('dOqS')}</small></dt><dd id="dOq"></dd></dl>
  <h3>${T('dShape')}</h3><div class="row"><b id="dSh" style="font-size:17px"></b><span class="note" id="dShd"></span></div>
  <div class="gauge"><div class="bar"></div><i id="dGa"></i></div><div class="gl"><span>${T('sh_urn')}</span><span>${T('sh_bell')}</span><span>${T('sh_pyr')}</span></div>
  <dl class="kv"><dt>${T('dBase')}</dt><dd id="dBase"></dd></dl>
  <h3>${T('dRates')}</h3><dl class="kv"><dt>${T('dCbr')}</dt><dd id="dCbr"></dd><dt>${T('dCdr')}</dt><dd id="dCdr"></dd><dt>${T('dNat')}</dt><dd id="dNat"></dd><dt>${T('dMig')}</dt><dd id="dMig"></dd><dt>${T('dTfr')}</dt><dd id="dTfr"></dd><dt>${T('dE0')}</dt><dd id="dE0"></dd></dl>
  <p class="note" id="dRn"></p>
  <h3>${T('dNeeds')}</h3><ul class="pts" id="dNeeds"></ul><p class="note">${T('needNote')}</p>`}
function updateData(){
  if(S.tab!=='data'||!$('dTot'))return;const st=V.st,c=C(),y=Math.round(S.year),t=st.t;
  $('dK').textContent=(S.secret?'? ? ?':CN(S.c))+' · '+y;
  $('dTot').textContent=fmtBig(t);$('dM').textContent=fmtBig(st.m)+' · '+fmtDec(100*st.m/t,1)+' %';$('dF').textContent=fmtBig(st.f)+' · '+fmtDec(100*st.f/t,1)+' %';
  $('dMed').textContent=fmtDec(st.med,1)+' '+T('yrs');
  const g=$('dG3').children,py=100*st.y/t,pw=100*st.w/t,po=100*st.o/t;g[0].style.flex='0 0 '+py+'%';g[1].style.flex='0 0 '+pw+'%';g[2].style.flex='1';
  g[0].textContent=fmtDec(py,0)+' %';g[1].textContent=fmtDec(pw,0)+' %';g[2].textContent=fmtDec(po,0)+' %';
  $('dYq').textContent=fmtDec(st.yq,0);$('dOq').textContent=fmtDec(st.oq,0);
  const sh=shapeOf(st.base);$('dSh').textContent=T('sh_'+sh);$('dShd').textContent=T('shd_'+sh);$('dGa').style.left=(gaugePos(st.base)*100).toFixed(1)+'%';$('dBase').textContent=fmtDec(st.base,0);
  const f=(k,d,u)=>{const v=serAt(c,k,y);return v==null?'–':fmtDec(v,d)+(u?' '+u:'')},b=serAt(c,'cbr',y),d=serAt(c,'cdr',y);
  $('dCbr').textContent=f('cbr',1,'‰');$('dCdr').textContent=f('cdr',1,'‰');$('dNat').textContent=b==null||d==null?'–':(b-d>0?'+':'')+fmtDec(b-d,1)+' ‰';
  const mg=serAt(c,'mig',y);$('dMig').textContent=mg==null?'–':(mg>0?'+':'')+fmtDec(mg,1)+' ‰';$('dTfr').textContent=f('tfr',2);$('dE0').textContent=f('e0',1,T('yrs'));
  const rs=rateSrc(c,y);$('dRn').textContent=b==null?T('noRates'):T('dRateYear',y,rs==='statec'?'STATEC':rs==='hmd'?'HMD'+T('phApprox'):T('srcUn')+(y>c.est?' · '+T('kProj'):''));
  const need=[py>=30,pw>=64,po>=17],nk=need.join();if(updateData.k!==nk+S.lang){updateData.k=nk+S.lang;
    $('dNeeds').innerHTML=[1,2,3].map(i=>`<li style="${need[i-1]?'':'opacity:.38'}">${need[i-1]?'<b>':''}${T('need'+i)}${need[i-1]?'</b>':''}</li>`).join('')}}

/* ---------- Reiter „Anzeige“ ---------- */
function buildViewTab(){
  const chk=(id,k,s)=>`<label class="chk"><input type="checkbox" id="${id}"><span>${T(k)}${s?`<small>${T(s)}</small>`:''}</span></label>`;
  $('pView').innerHTML=`<h3 style="margin-top:0">${T('vScale')}</h3>${chk('cFixed','vFixed','vFixedS')}${chk('cExcess','vExcess','vExcessS')}${chk('cGroups','vGroups','vGroupsS')}${chk('cStripes','vStripes','vStripesS')}${chk('cEvents','vEvents','vEventsS')}${chk('cBirth','vBirth')}${chk('cPeople','vPeople')}${chk('cRates','vRates')}
  <h3>${T('vCmp')}</h3><div class="row"><label for="sCmp">${T('vCmpWith')}</label><select class="sel" id="sCmp"><option value="">${T('vNone')}</option>${ORDER.map(id=>`<option value="${id}">${esc(CN(id))}</option>`).join('')}</select></div>
  <div class="row"><label for="sCmpY">${T('vCmpYear')}</label><select class="sel" id="sCmpY"><option value="">${T('vSame')}</option>${[1880,1900,1930,1950,1970,1990,2000,2010,2024,2040,2060,2080,2100].map(y=>`<option>${y}</option>`).join('')}</select></div>
  <h3>${T('vTmpl')}</h3><div class="seg2" id="sTmpl">${[['','vOff'],['auto','vAuto'],['pyr','sh_pyr'],['bell','sh_bell'],['urn','sh_urn']].map(a=>`<button data-tm="${a[0]}">${T(a[1])}</button>`).join('')}</div>
  <h3>${T('vCoh')}</h3><div class="row"><label for="nCoh">${T('vCohIn')}</label><input class="num" id="nCoh" type="number" min="1780" max="2100" step="1" value="2012" inputmode="numeric"><button class="ghost" id="bCoh">${T('vCohGo')}</button><button class="ghost" id="bCohX">${T('vCohOff')}</button></div><p class="note">${T('vCohS')}</p>`;
  const bind=(id,k)=>$(id).addEventListener('change',e=>{if(k==='people')setS({people:e.target.checked,pstage:2});else setS({[k]:e.target.checked})});
  bind('cFixed','fixed');bind('cStripes','stripes');bind('cExcess','excess');bind('cGroups','groups');bind('cEvents','events');bind('cBirth','birth');bind('cPeople','people');bind('cRates','rates');
  $('sCmp').addEventListener('change',e=>setS({cmp:e.target.value||null,mode:e.target.value?'pct':S.mode}));
  $('sCmpY').addEventListener('change',e=>setS({cmpYear:e.target.value?+e.target.value:null}));
  $('sTmpl').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setS({tmpl:b.dataset.tm||null})});
  $('bCoh').addEventListener('click',()=>{const v=Math.round(+$('nCoh').value);if(v>1700&&v<2101)setS({cohort:[v,v]})});
  $('bCohX').addEventListener('click',()=>setS({cohort:null}))}
function syncViewTab(){if(!$('cFixed'))return;$('cFixed').checked=S.fixed;$('cStripes').checked=S.stripes;$('cExcess').checked=S.excess;$('cGroups').checked=S.groups;$('cEvents').checked=S.events;$('cBirth').checked=S.birth;$('cPeople').checked=S.people;$('cRates').checked=S.rates;
  $('sCmp').value=S.cmp||'';$('sCmpY').value=S.cmpYear==null?'':String(S.cmpYear);document.querySelectorAll('#sTmpl button').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.tm||null)===S.tmpl))}

/* ---------- Lernweg ---------- */
function shapeSvg(tp){const w=TEMPLATE[tp];let mx=0;const g=[];for(let i=0;i<20;i++){let v=0;for(let a=0;a<5;a++)v+=w[i*5+a];g.push(v);mx=Math.max(mx,v)}
  let r='';for(let i=0;i<19;i++){const l=g[i]/mx*29,y=55-i*2.9;r+=`<rect x="${(31-l).toFixed(1)}" y="${y.toFixed(1)}" width="${l.toFixed(1)}" height="2.3" style="fill:var(--m)"/><rect x="33" y="${y.toFixed(1)}" width="${l.toFixed(1)}" height="2.3" style="fill:var(--f)"/>`}
  return `<svg viewBox="0 0 64 58" aria-hidden="true">${r}</svg>`}
const done=new Set();
function renderLearn(){
  const st=STATIONS[S.station],t=st[S.lang]||st.de,n=STATIONS.length;
  let h=`<div class="chips">${STATIONS.map((s,i)=>`<button data-st="${i}" ${i===S.station?'aria-current="step"':''} class="${(done.has(i)?'done':'')+(s.free?' free':'')}" aria-label="${s.free?T('stFree'):T('stOf',i+1,n-1)}">${s.free?T('stFree'):i+1}</button>`).join('')}</div>
  <div class="kicker">${st.free?T('stFreeK'):T('stOf',S.station+1,n-1)}</div><h2>${t.h}</h2><p class="lead">${t.lead}</p>`;
  if(t.pts)h+=`<ul class="pts">${t.pts.map(p=>`<li>${p}</li>`).join('')}</ul>`;
  if(st.shapes)h+=`<div class="shapes">${['pyr','bell','urn'].map(k=>`<button class="shape" data-shape="${k}">${shapeSvg(k)}<span>${T('sh_'+k)}</span><small>${T('shd_'+k)}</small></button>`).join('')}</div>
    <div class="vbtns">${['LU','DE','FR','CN','NG','W'].map(id=>`<button data-go="${id}">${esc(CN(id))}</button>`).join('')}</div>`;
  if(st.free&&t.note)h+=`<p class="note">${t.note}</p>`;
  if(st.acts)h+=`<div class="vbtns">${st.acts.map((a,i)=>`<button data-act="${i}">${a[S.lang]||a.de}</button>`).join('')}</div>`;
  if(!st.free&&t.note)h+=`<p class="note">${t.note}</p>`;
  if(t.task)h+=`<div class="obs"><p><b>${T('task')}:</b> ${t.task}</p><details><summary>${T('sol')}</summary><p>${typeof t.sol==='function'?t.sol():t.sol}</p></details></div>`;
  h+=`
  <div class="pnav"><button class="ghost" id="stPrev" ${S.station===0?'disabled':''}>‹ ${T('back')}</button><button class="solid" id="stNext" ${S.station===n-1?'disabled':''}>${T('next')} ›</button></div>`;
  $('pLearn').innerHTML=h}
function goStation(i,apply){S.station=clamp(i,0,STATIONS.length-1);done.add(S.station);S.playing=false;S.secret=false;
  if(apply!==false){const st=STATIONS[S.station];setS(Object.assign({events:false,excess:false,birth:false,chartMode:'land',fixed:true},st.set),true)}
  renderLearn();$('pscroll').scrollTop=0}
$('pLearn').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const st=STATIONS[S.station];
  if(b.dataset.st!=null)goStation(+b.dataset.st);else if(b.id==='stPrev')goStation(S.station-1);else if(b.id==='stNext')goStation(S.station+1);
  else if(b.dataset.shape){const ex=SHAPE_EX[b.dataset.shape];setS({c:ex.c,year:ex.year,tmpl:b.dataset.shape,mode:'pct'},true)}
  else if(b.dataset.go){setS({c:b.dataset.go,year:2024,tmpl:'auto',mode:'pct'},true)}
  else if(b.dataset.act!=null){const a=st.acts[+b.dataset.act];S.playing=false;
    if(a.tog)setS({[a.tog]:!S[a.tog]},true);if(a.set)setS(a.set,true);if(a.step)stepYear(a.step,a.n);
    if(a.play){const c=C();if(a.play[0]!=null)S.year=clamp(a.play[0],c.y0,c.y1);play.end=clamp(a.play[1],c.y0,c.y1);S.playing=true;syncUI()}}});

/* ---------- Diagramm: Geburten- und Sterberate ---------- */
const PHC=['#AF52DE','#FF9500','#FFCC00','#34C759'];
const CC={};   // Farben der Grafik, aus den CSS-Werten der aktuellen Fassung
function chartColors(){const cs=getComputedStyle(document.documentElement),v=k=>cs.getPropertyValue(k).trim();CC.b=v('--birth');CC.d=v('--death');CC.ink=v('--ink');CC.mut=v('--muted');CC.line=v('--line');CC.bg=S.theme==='dark'?'#05070C':'#FFFFFF';
  CC.fb=S.theme==='dark'?'rgba(123,216,143,.22)':'rgba(52,199,89,.2)';CC.fd=S.theme==='dark'?'rgba(240,138,106,.3)':'rgba(255,59,48,.2)';CC.font=v('--f-ui')}
// Modell des demografischen Übergangs: idealisiert, glatte Kurven wie im Schulbuch (Werte konstruiert, je 1 000 Einwohner)
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*t*(t*(t*6-15)+10)};
const MODEL={cut:[.2,.44,.76],
  b:x=>38-27*sstep(.44,.78,x)-2.6*sstep(.86,1,x),   // Geburtenrate: lange hoch, sinkt in Phase 2; ganz am Ende leicht unter die Sterberate
  d:x=>35-24*sstep(.2,.6,x)+1.6*sstep(.84,1,x),     // Sterberate: sinkt in Phase 1 (bis in Phase 2 hinein); steigt am Ende leicht, weil die Bevölkerung altert
  pop:null};
{const n=400,P=new Float32Array(n+1);let lp=0;for(let i=0;i<=n;i++){const x=i/n;if(i)lp+=.32*(MODEL.b(x)-MODEL.d(x))/n;P[i]=lp}   // Bevölkerungszahl: wächst um (Geburten − Sterbefälle)
  let lo=1e9,hi=-1e9;for(const v of P){lo=Math.min(lo,Math.exp(v));hi=Math.max(hi,Math.exp(v))}MODEL.pop=x=>{const v=Math.exp(P[Math.round(clamp(x,0,1)*n)]);return 4+(v-lo)/(hi-lo)*34}}
let chartGeom=null;
function drawChart(){
  if(!S.rates)return;const cv=$('chCv'),cssW=cv.clientWidth,cssH=cv.clientHeight;if(!cssW||!cssH)return;
  // in der echten Größe zeichnen (vorher wurde eine feste Fläche gestreckt – auf schmalen oder breiten Bildschirmen verzerrt)
  const dpr=Math.min(window.devicePixelRatio||1,2),u=S.pres?.6:.5,key=[cssW,cssH,dpr,u,S.chartMode,S.c,S.year.toFixed(2),S.modelPh,S.theme,S.lang].join('|');
  if(key===drawChart.k)return;drawChart.k=key;if(S.chartMode!==drawChart.m){drawChart.m=S.chartMode;chartTexts()}
  const bw=Math.round(cssW*dpr),bh=Math.round(cssH*dpr);if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh}
  const g=cv.getContext('2d'),W=cssW/u,H=cssH/u,c=C(),padL=66,padR=14,padT=40,padB=S.chartMode==='model'?44:34,pw=W-padL-padR,ph=H-padT-padB;
  g.setTransform(dpr*u,0,0,dpr*u,0,0);g.clearRect(0,0,W,H);g.font='500 21px '+(CC.font||'Arial,sans-serif');g.textBaseline='middle';
  const model=S.chartMode==='model';let x0,x1,B,D,ymax=50;
  if(model){x0=0;x1=1;B=MODEL.b;D=MODEL.d}
  else{const s=c.series;let f=c.y0;while(f<c.y1&&(s.cbr[f-c.y0]==null||s.cdr[f-c.y0]==null))f++;x0=f;x1=c.y1;B=y=>s.cbr[Math.round(y)-c.y0];D=y=>s.cdr[Math.round(y)-c.y0];
    let m=0;for(let y=x0;y<=x1;y++){m=Math.max(m,B(y)||0,D(y)||0)}ymax=m>50?60:m>40?50:m>30?40:30}
  const X=v=>padL+(v-x0)/(x1-x0)*pw,Y=v=>padT+ph-clamp(v,0,ymax)/ymax*ph;chartGeom={x0,x1,padL,pw,W,model};
  // Phasenleiste
  const N=model?200:(x1-x0);
  for(let i=0;i<N;i++){const v=model?i/N:x0+i,v2=model?(i+1)/N:v+1;let p,sh=false;
    if(model){p=v<MODEL.cut[0]?0:v<MODEL.cut[1]?1:v<MODEL.cut[2]?2:3;sh=MODEL.d(v)>MODEL.b(v)}else{p=phases(c)[v-c.y0];sh=c.sh[v-c.y0]}
    if(p<0)continue;g.fillStyle=PHC[p];g.globalAlpha=1;g.fillRect(X(v),8,X(v2)-X(v)+.6,18);if(sh){g.fillStyle='#05070C';g.globalAlpha=.5;g.fillRect(X(v),17,X(v2)-X(v)+.6,9)}}
  g.globalAlpha=1;
  // Gitter
  g.strokeStyle=CC.line;g.lineWidth=1;g.fillStyle=CC.mut;g.textAlign='right';
  for(let v=0;v<=ymax;v+=10){g.beginPath();g.moveTo(padL,Y(v));g.lineTo(W-padR,Y(v));g.stroke();g.fillText(v+(v===ymax?' ‰':''),padL-8,Y(v))}
  g.textAlign='center';
  if(!model){const stp=(x1-x0)>200?50:25;for(let y=Math.ceil(x0/stp)*stp;y<=x1;y+=stp){g.textAlign=X(y)>W-padR-28?'right':'center';g.fillText(y,Math.min(X(y),W-4),H-14);g.beginPath();g.moveTo(X(y),padT+ph);g.lineTo(X(y),padT+ph+5);g.stroke()}
    if(c.est<x1){g.fillStyle='rgba(232,120,60,.10)';g.fillRect(X(c.est+1),padT,X(x1)-X(c.est+1),ph)}}
  else{const m=[0,...MODEL.cut,1];g.fillStyle=CC.mut;g.font='600 19px '+(CC.font||'Arial,sans-serif');
    for(let i=0;i<4;i++){const xa=X(m[i]),xb=X(m[i+1]),w=xb-xa-6,t=T('phs'+i),xm=(xa+xb)/2;
      if(g.measureText(t).width<=w)g.fillText(t,xm,H-18);else{const ws=t.split(' ');let l1=ws.shift(),l2=ws.join(' ');g.fillText(l1,xm,H-30);g.fillText(l2,xm,H-10)}
      if(i){g.save();g.setLineDash([5,6]);g.strokeStyle=CC.mut;g.globalAlpha=.45;g.lineWidth=1.4;g.beginPath();g.moveTo(xa,padT-6);g.lineTo(xa,padT+ph);g.stroke();g.restore()}}
    g.font='500 21px '+(CC.font||'Arial,sans-serif')}
  // Fläche zwischen den Kurven
  const n=model?240:(x1-x0),step=(x1-x0)/n;
  for(let i=0;i<n;i++){const a=x0+i*step,b=a+step,ba=B(a),da=D(a),bb=B(b),db=D(b);if(ba==null||da==null||bb==null||db==null)continue;
    g.fillStyle=ba>=da?CC.fb:CC.fd;g.beginPath();g.moveTo(X(a),Y(ba));g.lineTo(X(b),Y(bb));g.lineTo(X(b),Y(db));g.lineTo(X(a),Y(da));g.closePath();g.fill()}
  const curve=(F,col)=>{g.strokeStyle=col;g.lineWidth=3.2;g.lineJoin='round';g.beginPath();let on=false;for(let i=0;i<=n;i++){const a=x0+i*step,v=F(a);if(v==null){on=false;continue}if(on)g.lineTo(X(a),Y(v));else{g.moveTo(X(a),Y(v));on=true}}g.stroke()};
  if(model){g.save();g.setLineDash([9,7]);curve(MODEL.pop,CC.mut);g.restore();g.lineWidth=3.2}   // Bevölkerungszahl, ohne Maßstab
  curve(D,CC.d);curve(B,CC.b);
  // Zeiger
  if(!model){const y=clamp(Math.round(S.year),x0,x1);if(S.year>=x0-.5){g.strokeStyle=CC.ink;g.lineWidth=2;g.beginPath();g.moveTo(X(S.year),padT-8);g.lineTo(X(S.year),padT+ph);g.stroke();
      for(const [F,col] of [[B,CC.b],[D,CC.d]]){const v=F(y);if(v==null)continue;g.fillStyle=col;g.beginPath();g.arc(X(S.year),Y(v),6,0,7);g.fill();g.strokeStyle=CC.bg;g.lineWidth=2;g.stroke()}}}
  else if(S.modelPh!=null){const m=[0,...MODEL.cut,1],xm=S.modelPh===4?.94:(m[S.modelPh]+m[S.modelPh+1])/2;g.strokeStyle=CC.ink;g.lineWidth=2;g.beginPath();g.moveTo(X(xm),padT-8);g.lineTo(X(xm),padT+ph);g.stroke()}
  // Text darunter
  const y=Math.round(S.year);let txt;
  if(model)txt=`<span class="note">${T('phModel')}</span>`+(S.modelPh!=null?` <b>${T(S.modelPh===4?'phS':'ph'+S.modelPh)}</b> · ${esc(CN(S.c))} ${y}`:'');
  else{const p=phases(c)[clamp(y,c.y0,c.y1)-c.y0],b=B(y),d=D(y);
    txt=p<0||b==null?`<span class="note">${T('noRates')}</span>`:`<i class="dot" style="background:${PHC[p]}"></i><b>${T('ph'+p)}</b>`+(c.sh[y-c.y0]?` · ${T('phS')}`:'')+`<span class="note">${esc(CN(S.c))} ${y}: ${T('lgB')} ${fmtDec(b,1)} ‰ · ${T('lgD')} ${fmtDec(d,1)} ‰${rateSrc(c,y)==='hmd'?T('phApprox'):''}</span>`}
  if(drawChart.t!==txt){drawChart.t=txt;$('chPh').innerHTML=txt}}
$('chCv').addEventListener('click',e=>{if(!chartGeom)return;const r=e.target.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*chartGeom.W,u=clamp((px-chartGeom.padL)/chartGeom.pw,0,1);
  if(chartGeom.model){const p=u<MODEL.cut[0]?0:u<MODEL.cut[1]?1:u<MODEL.cut[2]?2:u<.9?3:4,ex=MODEL_EX[p];S.modelPh=p;S.playing=false;setS({c:ex.c,year:ex.year,tmpl:'auto',mode:'pct'},true)}
  else{S.playing=false;TW.on=false;S.year=Math.round(chartGeom.x0+u*(chartGeom.x1-chartGeom.x0));syncUI()}});
function chartTexts(){$('chTitle').textContent=T('chTitle')+' (‰)';const b=$('chMode').children;b[0].textContent=T('chLand');b[1].textContent=T('chModel');
  $('chLg').innerHTML=`<span><i style="background:var(--birth)"></i>${T('lgB')}</span><span><i style="background:var(--death)"></i>${T('lgD')}</span><span><i style="background:var(--birth);opacity:.35;height:9px"></i>${T('lgN')}</span>`+(S.chartMode==='model'?`<span><i class="dash"></i>${T('lgP')}</span>`:'')}

/* ---------- Ablesen mit dem Zeiger ---------- */
const tipEl=$('tip'),cvEl=renderer.domElement;
function showTip(h,ev){
  if(!h){tipEl.classList.remove('on');return}
  const c=C(),y=Math.floor(S.year+1e-6),g5=S.grp===5,a0=g5?h.i*5:h.i,a1=g5?(h.i===20?100:a0+4):h.i,v=(g5?cur5[h.s*21+h.i]:h.i>=100&&V.ext?V.ext[h.s*(101+NE)+h.i]:cur[h.s*NA+h.i]);
  const age=(g5&&h.i===20)?T('tipAge100'):g5?T('tipAge5',a0,a1):T('tipAge1',a0)+(h.i>=100?T('tipEst'):'');
  const born=(g5&&a1===100)?'':(g5?T('tipBorn2',byear(a1,S.year),byear(a0,S.year)):T('tipBorn1',byear(a0,S.year)));
  tipEl.style.setProperty('--c',h.s?'var(--f)':'var(--m)');
  tipEl.innerHTML=`<b>${T(h.s?'women':'men')} · ${age}</b><span class="v">${fmtBig(v)} ${T('tipPers')}</span><span>${T('tipPct',fmtDec(100*v/V.tot,2))}</span>${born?`<span>${born}</span>`:''}<span class="h">${T('tipClick')}</span>`;
  const r=stage.getBoundingClientRect();let x=ev.clientX-r.left+16,yy=ev.clientY-r.top+16;if(x>r.width-230)x=ev.clientX-r.left-220;if(yy>r.height-150)yy=ev.clientY-r.top-140;
  tipEl.style.transform=`translate(${x}px,${yy}px)`;tipEl.classList.add('on')}
cvEl.addEventListener('pointermove',e=>{if(e.buttons||S.film||S.people){S.hover=null;showTip(null);return}const h=pick(e);S.hover=h;showTip(h,e)});
cvEl.addEventListener('pointerleave',()=>{S.hover=null;showTip(null)});
cvEl.addEventListener('pointerdown',e=>{downAt={x:e.clientX,y:e.clientY,t:performance.now()}});
cvEl.addEventListener('pointerup',e=>{if(!downAt||S.film||S.people)return;const d=Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y);if(d>6)return;const h=pick(e);
  if(!h){if(e.pointerType!=='mouse')showTip(null);return}
  const g5=S.grp===5,a0=g5?h.i*5:h.i,a1=g5?(h.i===20?100:a0+4):h.i,co=[byear(a1,S.year),byear(a0,S.year)];
  if(S.cohort&&S.cohort[0]===co[0]&&S.cohort[1]===co[1])setS({cohort:null},true);else setS({cohort:co},true);
  if(e.pointerType!=='mouse'){S.hover=h;showTip(h,e);setTimeout(()=>{S.hover=null;showTip(null)},2600)}});
labelsEl.addEventListener('click',e=>{const el=e.target.closest('.lb.ev');if(!el)return;const o=L.ev.find(x=>x.el===el);if(o&&o.ev){const t=o.ev[S.lang]||o.ev.de;toast(`<b>${t.t}</b>${t.d}`,9000)}});

/* ---------- Hinweise & Quellen ---------- */
$('infoBtn').addEventListener('click',()=>{$('shT').textContent=T('srcT');$('shB').innerHTML=(SOURCES[S.lang]||SOURCES.de).map(s=>`<div><h3>${s[0]}</h3><ul>${s[1].map(li=>`<li>${li}</li>`).join('')}</ul></div>`).join('');$('sheet').hidden=false});
$('shX').addEventListener('click',()=>{$('sheet').hidden=true});$('sheet').addEventListener('click',e=>{if(e.target===$('sheet'))$('sheet').hidden=true});

/* ---------- Quiz ---------- */
const QZ={list:[],i:-1,score:0,answered:false};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function makeQuiz(){
  const pool=[],t=new Float32Array(NB);
  for(const c of DATA.list)for(const y of [c.y0+2,1900,1930,1950,1975,2000,2024,2050,2080]){if(y<c.y0||y>c.y1||c.id==='QA')continue;popAt(c,y,t);const b=stats(t).base;if(Math.abs(b-SHAPE_T[0])>14&&Math.abs(b-SHAPE_T[1])>24)pool.push({k:'shape',c:c.id,year:y,base:b,sh:shapeOf(b)})}
  shuffle(pool);const pickSh=[];for(const sh of ['pyr','bell','urn','pyr','urn'])pickSh.push(pool.find(p=>p.sh===sh&&!pickSh.includes(p)));
  const q=pickSh.filter(Boolean).slice(0,4);
  for(let n=0;n<2;n++){const cid=shuffle(['LU','DE','FR','JP','IN','NG'])[0],sex=Math.random()<.5?0:1,g=2+Math.floor(Math.random()*12);q.push({k:'read',c:cid,year:2024,sex,g,v:grpVal(cid,2024,sex,g)})}
  {const cid=shuffle(['LU','NG','JP','IN','CN','DE'])[0];popAt(DATA.by[cid],2024,t);const s=stats(t);q.push({k:'pct',c:cid,year:2024,v:100*s.y/s.t})}
  shuffle(QUIZ_FIX.slice()).slice(0,3).forEach(f=>q.push({k:'fix',f}));
  return shuffle(q)}
const sig2=v=>{const p=Math.pow(10,Math.floor(Math.log10(v))-1);return Math.round(v/p)*p};
function quizShow(){
  const q=QZ.list[QZ.i];QZ.answered=false;S.playing=false;let text,opts,right,expl;const base={people:false,view:'front',cmp:null,tmpl:null,cohort:null,rates:false,groups:false,excess:false,events:false,fixed:false,grp:5};
  if(q.k==='shape'){S.secret=true;setS(Object.assign(base,{c:q.c,year:q.year,mode:'pct'}),true);text=T('qShapeQ');opts=['pyr','bell','urn'].map(k=>T('sh_'+k));right=['pyr','bell','urn'].indexOf(q.sh);
    expl=()=>T('qShapeA',CN(q.c),q.year,fmtDec(q.base,0),T(q.sh==='pyr'?'qG1':q.sh==='bell'?'qG2':'qG3'))}
  else if(q.k==='read'){S.secret=false;setS(Object.assign(base,{c:q.c,year:q.year,mode:'abs'}),true);const cv=sig2(q.v),o=shuffle([cv,sig2(q.v*.5),sig2(q.v*1.6),sig2(q.v*2.4)]);
    text=T('qReadQ',CN(q.c),q.year,T(q.sex?'women':'men'),q.g*5,q.g*5+4);opts=o.map(fmtBig);right=o.indexOf(cv);expl=()=>T('qReadA',fmtBig(cv))}
  else if(q.k==='pct'){S.secret=false;setS(Object.assign(base,{c:q.c,year:q.year,mode:'pct',groups:true}),true);const cv=Math.round(q.v),o=shuffle([cv,cv+11,Math.max(3,cv-9),cv+24]);
    text=T('qPctQ',CN(q.c),q.year);opts=o.map(v=>v+' %');right=o.indexOf(cv);expl=()=>T('qPctA',cv)}
  else{S.secret=false;const f=q.f,t=f[S.lang]||f.de;setS(Object.assign(base,{chartMode:'land'},f.set),true);const idx=shuffle([0,1,2]);text=t.q;opts=idx.map(i=>t.a[i]);right=idx.indexOf(f.r);expl=()=>t.e}
  QZ.right=right;QZ.expl=expl;
  $('pQuiz').innerHTML=`<div class="kicker">${T('qN',QZ.i+1,QZ.list.length)}</div><h2>${text}</h2><div class="opts">${opts.map((o,i)=>`<button class="opt" data-o="${i}">${esc(o)}</button>`).join('')}</div><div class="fb" id="qFb"></div>
  <div class="pnav"><span class="score">${T('qScore',QZ.score,QZ.i)}</span><button class="solid" id="qNext" disabled>${QZ.i===QZ.list.length-1?T('qEnd'):T('qNext')} ›</button></div>`}
function quizHome(endScore){S.secret=false;if(endScore!=null)setS({grp:1,events:true},true);syncUI();headKey='';
  $('pQuiz').innerHTML=(endScore!=null?`<div class="kicker">${T('qEnd')}</div><h2>${T('qScore',QZ.score,QZ.list.length)}</h2>`:`<h2>${T('tabQuiz')}</h2>`)+`<p class="lead">${T('qIntro')}</p><div class="pnav"><span></span><button class="solid" id="qStart">${T(endScore!=null?'qAgain':'qStart')}</button></div>`}
$('pQuiz').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='qStart'){QZ.list=makeQuiz();QZ.i=0;QZ.score=0;quizShow()}
  else if(b.id==='qNext'){if(QZ.i>=QZ.list.length-1){QZ.i=-1;quizHome(QZ.score)}else{QZ.i++;quizShow()}}
  else if(b.dataset.o!=null&&!QZ.answered){QZ.answered=true;const i=+b.dataset.o,ok=i===QZ.right;if(ok)QZ.score++;
    document.querySelectorAll('#pQuiz .opt').forEach((o,k)=>{o.disabled=true;if(k===QZ.right)o.classList.add('ok');else if(k===i)o.classList.add('bad')});
    S.secret=false;headKey='';syncUI();const q=QZ.list[QZ.i];if(q.k==='shape')setS({tmpl:'auto'},true);
    const fb=$('qFb');fb.className='fb '+(ok?'ok':'bad');fb.innerHTML=`<b>${T(ok?'qRight':'qWrong')}</b> ${QZ.expl().replace('..','.')}`;$('qNext').disabled=false;
    document.querySelector('#pQuiz .score').textContent=T('qScore',QZ.score,QZ.i+1)}});

/* ---------- Sprache ---------- */
function refreshPanels(){renderLearn()}
function applyLang(){
  document.documentElement.lang=S.lang;document.querySelectorAll('[data-t]').forEach(el=>{el.textContent=T(el.dataset.t)});
  $('filmBtn').textContent=T(S.film?'filmEnd':'film');$('veilT').textContent=T('veil');
  $('countries').innerHTML=ORDER.map(id=>`<button data-c="${id}" aria-pressed="false">${esc(CN(id))}</button>`).join('');
  chartColors();buildData();buildViewTab();chartTexts();buildTimeline();renderLearn();if(QZ.i>=0)quizShow();else quizHome();headKey='';drawChart.t=null;updateData.k=null;syncUI();
  if(typeof filmLang==='function')filmLang()}

/* ---------- Tastatur ---------- */
window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;if(S.film)return;
  if(e.key===' '){e.preventDefault();$('play').click()}else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();stepYear(e.key==='ArrowRight'?1:-1)}});
