/* Bedienprobe im Testbrowser (Software-Grafik, daher langsam): Tasten, Ansichten, Schalter, Vergleich, Film, Regler. */
import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:900,height:560}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!m.text().includes('ERR_TUNNEL')) errs.push(m.text().slice(0,300)); });
await p.goto('file:///home/claude/sa2/build/san-andreas-labor-v2.html?low');
await p.waitForFunction(()=>window.__sa&&window.__sa.ready(),null,{timeout:120000});
const log=[]; const snap=tag=>p.evaluate(tag=>({tag,t:+window.__sa.state.t.toFixed(2),pl:window.__sa.state.playing,title:document.getElementById('clockTitle').textContent,time:document.getElementById('clockTime').textContent,m:document.getElementById('meterLab').textContent+' | '+document.getElementById('meterTxt').textContent,sh:window.__sa.cur().shown,h:document.getElementById('exTitle').textContent}),tag);
const stopped=()=>p.waitForFunction(()=>!window.__sa.state.playing&&!document.getElementById('fade').classList.contains('on'),null,{timeout:240000});
// 1) Abspielen bis zum Halt am Ende jeder Phase (Start jeweils kurz vor dem Ende)
for(const t of [5.6,13.6,23.6,39.6,65.6,93.6]){ await p.evaluate(t=>window.__sa.setTime(t),t); await p.waitForTimeout(700); await p.click('#bPlay'); await stopped(); log.push(await snap('halt')); }
// 2) Tasten
await p.keyboard.press('2'); await p.waitForTimeout(1500); log.push(await snap('Taste 2')); await p.keyboard.press('Space'); await p.waitForTimeout(300);
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1500); log.push(await snap('Pfeil rechts')); await p.click('#bPlay'); await p.waitForTimeout(200);
await p.click('#bReset'); await p.waitForTimeout(1200); log.push(await snap('Zurücksetzen'));
// 3) Ansichten und Schalter in jedem Maßstab
for(const t of [3,10,20,30,50,80]){ await p.evaluate(t=>window.__sa.setTime(t),t); await p.waitForTimeout(600);
  for(const v of ['top','section','near','oblique']){ await p.click(`[data-view=${v}]`); await p.waitForTimeout(250); } }
await p.click('#tab-view'); for(const id of ['tArrows','tLines','tFault','tCreek','tShake','tCam','stopEach']){ await p.click('#'+id); await p.waitForTimeout(120); await p.click('#'+id); }
for(const v of ['all','off','imp']){ await p.click(`input[name=lvl][value=${v}]`,{force:true}); await p.waitForTimeout(300); }
await p.click('#zin'); await p.click('#zout'); await p.click('#bPanel'); await p.waitForTimeout(300); await p.click('#bPanel');
// 4) Vergleich „gleichmäßig gleiten“
await p.click('#tab-ex'); await p.evaluate(()=>window.__sa.setMode('creep',true)); for(const t of [20,30,50,80]){ await p.evaluate(t=>window.__sa.setTime(t),t); await p.waitForTimeout(900); log.push(await snap('Vergleich')); }
await p.evaluate(()=>window.__sa.setMode('lock',true));
// 5) Erklärfilm: jede Einstellung kurz anspielen, Ende erreichen
await p.click('#bFilm'); await p.waitForTimeout(500);
const shots=await p.evaluate(()=>{ const out=[]; document.querySelectorAll('#chapters button').forEach((b,i)=>out.push(i)); return out; });
for(const ch of shots){ for(let sh=0;sh<5;sh++){ const ok=await p.evaluate(([ch,sh])=>{ try{ window.__sa.filmShot(ch,sh); return true; }catch(e){ return false; } },[ch,sh]); if(!ok) break; await p.waitForTimeout(450); } }
log.push(await p.evaluate(()=>({tag:'Film',cap:document.getElementById('capTx').textContent.slice(0,70),ch:document.getElementById('capCh').textContent})));
await p.keyboard.press('Escape'); await p.waitForTimeout(800); log.push(await p.evaluate(()=>({tag:'Film beendet',film:window.__sa.state.film,dock:!document.getElementById('dock').hidden})));
// 6) Regler hin und her, über alle Maßstabsgrenzen
await p.evaluate(()=>{ const s=document.getElementById('time'); for(const v of [0,150,151,152,400,560,575,576,990,1000,3]){ s.value=v; s.dispatchEvent(new Event('input')); } }); await p.waitForTimeout(1500); log.push(await snap('Regler'));
log.push({diag:await p.evaluate(()=>document.getElementById('diag')?.textContent||'')});
for(const l of log) console.log(JSON.stringify(l)); console.log(errs.join('\n')||'keine Fehler'); await b.close();
