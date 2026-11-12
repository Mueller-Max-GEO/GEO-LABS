// node tests/filmbilder.js outdir – Bilder aus jedem Filmkapitel (Mitte jedes Absatzes), Stimme aus
const { chromium } = require('playwright');
(async()=>{const out=process.argv[2];const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:1280,height:800}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8772/pyramiden-labor.html');await p.waitForFunction('window.__ready===true',null,{timeout:60000});
  await p.evaluate("localStorage.setItem('geogym-pyr-voice','off')");await p.reload();await p.waitForFunction('window.__ready===true',null,{timeout:60000});
  await p.evaluate('__lab.filmStart()');
  const chs=(process.argv[3]||'0,1,2,3,4,5,6,7').split(',').map(Number);
  for(const ch of chs){await p.evaluate(c=>__lab.filmGo(c),ch);await p.waitForTimeout(1600);
    const n=await p.evaluate('__lab.FILM.pS.length-1');
    for(let q=0;q<n;q++){await p.evaluate(q=>{const F=__lab.FILM;F.t=(F.pS[q]+F.pS[q+1])/2;F.spoken=F.items.findIndex(it=>it.p===q);},q);await p.waitForTimeout(2600);
      await p.screenshot({path:`${out}/f${ch+1}_${q+1}.png`});}}
  console.log(errs.join('\n')||'keine Fehler');await b.close()})();
