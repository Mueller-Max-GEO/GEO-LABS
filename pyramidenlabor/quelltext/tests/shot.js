// node tests/shot.js out.png "query" w h waitMs "js to eval before shot"
const { chromium } = require('playwright');
(async()=>{
  const [out,query,w,h,wait,js]=process.argv.slice(2);
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const errs=[];
  const p = await b.newPage({viewport:{width:+(w||1440),height:+(h||900)}});
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message+' '+(e.stack||'').split('\n').slice(0,3).join(' | '))); p.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text().slice(0,400)); });
  await p.goto('http://localhost:8772/pyramiden-labor.html?'+(query||''));
  await p.waitForFunction('window.__ready===true',null,{timeout:60000}).catch(e=>errs.push('not ready'));
  if(js){ for(const step of js.split('@@')){ const m=step.match(/^wait:(\d+)$/), mm=step.match(/^(mouse|click):(\d+),(\d+)$/); if(m) await p.waitForTimeout(+m[1]); else if(mm){ if(mm[1]==='mouse') await p.mouse.move(+mm[2],+mm[3],{steps:4}); else await p.mouse.click(+mm[2],+mm[3]); } else { const r=await p.evaluate(step).catch(e=>errs.push('EVAL '+e.message)); if(r!==undefined&&typeof r!=='object') console.log('->',r); } } }
  await p.waitForTimeout(+(wait||2500));
  await p.screenshot({path:out, timeout:120000});
  console.log('frames',await p.evaluate('window.__frames'));
  const u=[...new Set(errs)]; console.log(u.slice(0,10).join('\n')||'no errors'); await b.close();
})();
