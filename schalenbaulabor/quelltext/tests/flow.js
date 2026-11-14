// node flow.js '<query>' w h '<steps json>'   steps: [{c:'selector'},{w:ms},{s:'name.png'},{e:'js'}]
const { chromium } = require('playwright');
(async()=>{
  const [query,w,h,stepsJ]=process.argv.slice(2); const steps=JSON.parse(stepsJ);
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport:{width:+w,height:+h},reducedMotion:'reduce'}); const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text().slice(0,400)); });
  await p.goto('http://localhost:8771/'+(process.env.PAGE||'test-local.html')+'?'+query);
  await p.waitForFunction('window.__ready===true',null,{timeout:180000}).catch(e=>errs.push('not ready'));
  for(const s of steps){
    try{
      if(s.c) await p.click(s.c,{timeout:20000,force:true});
      if(s.w) await p.waitForTimeout(s.w);
      if(s.e) console.log('eval',JSON.stringify(await p.evaluate(s.e)));
      if(s.s) await p.screenshot({path:s.s,timeout:240000});
    }catch(e){ errs.push('STEP '+JSON.stringify(s)+' '+String(e).slice(0,200)); }
  }
  const u=[...new Set(errs)]; console.log(u.slice(0,10).join('\n')||'no errors'); await b.close();
})();
