/* Bedienprobe im Testbrowser (Software-Grafik, daher langsam): Tasten, Ansichten, Schalter, Vergleich, Film, Regler. */
import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:720}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!m.text().includes('ERR_TUNNEL')) errs.push(m.text().slice(0,300)); });
await p.goto('file:///home/claude/sa3/build/san-andreas-labor-v3.html?low');
await p.waitForFunction(()=>window.__sa&&window.__sa.ready(),null,{timeout:120000});
const log=[]; const snap=tag=>p.evaluate(tag=>({tag,t:+window.__sa.state.t.toFixed(2),pl:window.__sa.state.playing,title:document.getElementById('clockTitle').textContent,time:document.getElementById('clockTime').textContent,m:document.getElementById('meterLab').textContent+' | '+document.getElementById('meterTxt').textContent,sh:window.__sa.cur().shown,h:document.getElementById('exTitle').textContent}),tag);
const stopped=()=>p.waitForFunction(()=>!window.__sa.state.playing&&!document.getElementById('fade').classList.contains('on'),null,{timeout:240000});
// 1) Abspielen bis zum Halt am Ende jeder Phase (Start jeweils kurz vor dem Ende)
for(const t of [9.6,17.6,27.6,43.6,85.6,113.6]){ await p.evaluate(t=>window.__sa.setTime(t),t); await p.waitForTimeout(700); await p.click('#bPlay'); await stopped(); log.push(await snap('halt')); }
// 2) Tasten
await p.keyboard.press('2'); await p.waitForTimeout(1500); log.push(await snap('Taste 2')); await p.keyboard.press('Space'); await p.waitForTimeout(300);
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1500); log.push(await snap('Pfeil rechts')); await p.click('#bPlay'); await p.waitForTimeout(200);
await p.click('.gtick'); await p.waitForTimeout(1200); log.push(await snap('Erde-Knopf'));
for(let i=0;i<5;i++){ await p.click(`.tick:not(.gtick):nth-child(${i+2})`); await p.waitForTimeout(1600); log.push(await snap('Phasenknopf '+(i+1))); }
for(let i=0;i<3;i++){ await p.click('#bLvl'); await p.waitForTimeout(300); } log.push(await p.evaluate(()=>({tag:'Beschriftung',txt:document.getElementById('bLvl').textContent,lvl:window.__sa.state.lvl})));
for(const m of ['lock','creep']){ await p.click(`[data-mode=${m}]`); await p.waitForTimeout(400); }
// 3) Ansichten und Schalter in jedem Maßstab
for(const t of [3,14,24,34,60,100]){ await p.evaluate(t=>window.__sa.setTime(t),t); await p.waitForTimeout(600);
  for(const v of ['top','section','near','oblique']){ await p.click(`[data-view=${v}]`); await p.waitForTimeout(250); } }
await p.click('#bPanel'); await p.waitForTimeout(300); await p.click('#tab-view'); for(const id of ['tArrows','tLines','tFault','tCreek','tShake','tCam','stopEach']){ await p.click('#'+id); await p.waitForTimeout(120); await p.click('#'+id); }
for(const v of ['all','off','imp']){ await p.click(`input[name=lvl][value=${v}]`,{force:true}); await p.waitForTimeout(300); }
await p.click('#zin'); await p.click('#zout'); await p.click('#bPanel'); await p.waitForTimeout(300); await p.click('#bPanel');
// 4) Vergleich „gleichmäßig gleiten“
await p.click('#tab-ex'); await p.evaluate(()=>window.__sa.setMode('creep',true)); for(const t of [24,34,60,100]){ await p.evaluate(t=>window.__sa.setTime(t),t); await p.waitForTimeout(900); log.push(await snap('Vergleich')); }
await p.evaluate(()=>window.__sa.setMode('lock',true));
// 6) Regler hin und her, über alle Maßstabsgrenzen
await p.evaluate(()=>{ const s=document.getElementById('time'); for(const v of [0,150,151,152,400,560,575,576,990,1000,3]){ s.value=v; s.dispatchEvent(new Event('input')); } }); await p.waitForTimeout(1500); log.push(await snap('Regler'));
log.push({diag:await p.evaluate(()=>document.getElementById('diag')?.textContent||'')});
for(const l of log) console.log(JSON.stringify(l)); console.log(errs.join('\n')||'keine Fehler'); await b.close();
