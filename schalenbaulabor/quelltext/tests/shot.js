const { chromium } = require('playwright');
(async()=>{
  const [out,query,w,h,wait,page_]=process.argv.slice(2);
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const errs=[];
  const qs=(query||'').split('||'); let k=0;
  for(const q of qs){
    const p = await b.newPage({viewport:{width:+(w||1280),height:+(h||800)}});
    p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text().slice(0,600)); });
    await p.goto('http://localhost:8771/'+(page_||'test-local.html')+'?'+q);
    await p.waitForFunction('window.__ready===true',null,{timeout:120000}).catch(e=>errs.push('not ready'));
    await p.waitForTimeout(+(wait||6000));
    await p.screenshot({path:qs.length>1?out.replace('.png','_'+(k++)+'.png'):out, timeout:180000});
    const fr=await p.evaluate('window.__frames'); console.log('frames',fr); await p.close();
  }
  const u=[...new Set(errs)]; console.log(u.slice(0,8).join('\n')||'no errors', u.length>8?('\n… +'+(u.length-8)):''); await b.close();
})();
