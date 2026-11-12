const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const errs=[]; const p = await b.newPage({viewport:{width:1100,height:700}});
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | '))); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push('console: '+m.text().slice(0,300)); });
  await p.goto('http://localhost:8772/pyramiden-labor.html?q=lo'); await p.waitForFunction('window.__ready===true');
  const res=await p.evaluate(async()=>{const L=window.__lab,out=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<10;i++){L.goStation(i);await wait(350)}
    for(const c of L.DATA.list){for(const y of [c.y0,c.y0+.4,1950,2024,2100]){for(const m of ['abs','pct'])for(const g of [5,1]){L.setS({c:c.id,year:y,mode:m,grp:g,view:'front',people:false,rates:true,tmpl:'auto',cmp:'JP',events:true,excess:true,groups:true,birth:true});await wait(40);
      if(!isFinite(L.V.axMax)||!isFinite(L.V.tot)||L.V.axMax<=0)out.push('bad '+c.id+' '+y+' '+m+g)}}}
    L.setS({view:'land',c:'FR',year:1900});await wait(500);L.setS({view:'side'});await wait(500);L.setS({people:true,pstage:0});await wait(400);L.setS({pstage:1});await wait(400);
    for(const lang of ['fr','de']){document.querySelector('[data-lang='+lang+']').click();await wait(200);for(const t of ['data','view','quiz','learn']){document.querySelector('[data-tab='+t+']').click();await wait(120)}}
    document.querySelector('[data-tab=quiz]').click();document.getElementById('qStart').click();
    for(let i=0;i<10;i++){await wait(150);document.querySelector('#pQuiz .opt').click();await wait(80);out.push(document.querySelector('#pQuiz h2').textContent.slice(0,60));document.getElementById('qNext').click()}
    await wait(200);out.push('END: '+document.querySelector('#pQuiz h2').textContent);
    document.getElementById('infoBtn').click();await wait(100);out.push('sheet '+document.getElementById('shB').children.length);document.getElementById('shX').click();
    L.filmStart();for(let i=0;i<8;i++){L.filmGo(i);L.FILM.t=L.FILM.dur*.5;await wait(500);L.FILM.t=L.FILM.dur*.97;await wait(400);out.push('film '+(i+1)+' dur '+L.FILM.dur.toFixed(0)+'s sentences '+L.FILM.items.length+' para '+L.FILM.para)}
    L.filmEnd();await wait(300);out.push('after film: '+L.S.c+' '+L.S.year+' film='+L.S.film);
    return out});
  console.log(res.join('\n')); console.log([...new Set(errs)].slice(0,12).join('\n')||'NO ERRORS'); await b.close();
})();
