import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:780}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/claude/sa3/build/san-andreas-labor-v3.html'); await p.waitForFunction(()=>window.__sa&&window.__sa.ready(),null,{timeout:120000});
await p.evaluate(()=>window.__sa.setTime(73.5)); await p.waitForTimeout(3500);
const pts=await p.evaluate(()=>[window.__sa.creekXY(0.2),window.__sa.creekXY(0.8)]).catch(e=>String(e));
console.log(JSON.stringify(pts));
if(Array.isArray(pts)){ await p.mouse.click(pts[0][0],pts[0][1]); await p.waitForTimeout(800); await p.screenshot({path:'build/tap1.png'}); await p.mouse.click(pts[1][0],pts[1][1]); await p.waitForTimeout(800); await p.screenshot({path:'build/tap2.png'}); }
console.log(errs.join('\n')||'keine Fehler'); await b.close();
