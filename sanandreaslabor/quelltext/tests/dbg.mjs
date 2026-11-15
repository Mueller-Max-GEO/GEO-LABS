import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:780}});
p.on('pageerror',e=>console.log('PAGEERR '+e.message));
await p.goto('file:///home/claude/sa2/build/san-andreas-labor-v2.html');
await p.waitForFunction(()=>window.__sa&&window.__sa.ready(),null,{timeout:120000});
await p.selectOption('#speed','2'); await p.click('#bPlay');
for(let i=0;i<14;i++){ await p.waitForTimeout(3000); console.log(JSON.stringify(await p.evaluate(()=>({t:+window.__sa.state.t.toFixed(2),pl:window.__sa.state.playing,stopAt:window.__sa.state.stopAt,sh:window.__sa.cur().shown,fade:document.getElementById('fade').className})))); }
await b.close();
