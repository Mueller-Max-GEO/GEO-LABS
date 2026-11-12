// Prüft die Figuren: Reihen = Altersgruppen, pro Jahr steigt etwa ein Fünftel auf, nach langer Laufzeit stimmen die Reihen noch mit den Daten überein
const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport:{width:1100,height:700}}); const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join('|')));
  await p.goto('http://localhost:8772/pyramiden-labor.html'); await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(1500);
  const snap=()=>p.evaluate(()=>{const c=C(),t=new Float32Array(NB),g=new Float32Array(42);popAt(c,S.year,t);group5(t,g);
    const rows=[0,1].map(s=>fig.rows[s].map(r=>r.length)),want=[0,1].map(s=>Array.from({length:21},(_,i)=>g[s*21+i]/fig.per));
    let maxDiff=0,tot=0;for(let s=0;s<2;s++)for(let i=0;i<21;i++){maxDiff=Math.max(maxDiff,Math.abs(rows[s][i]-want[s][i]));tot+=rows[s][i]}
    const cls={};for(let i=0;i<NP;i++)if(fig.state[i]===1)cls[i]=fig.cls[i];
    return {year:S.year,per:fig.per,NZ:fig.NZ,tot,expected:Math.round(V.tot/fig.per),maxDiff:+maxDiff.toFixed(2),f:rows[1].join(','),w:want[1].map(v=>v.toFixed(1)).join(','),cls}});
  const cmp=(a,b)=>{let up=0,same=0,gone=0;for(const i in a.cls){if(!(i in b.cls))gone++;else if(b.cls[i]>a.cls[i])up++;else if(b.cls[i]===a.cls[i])same++}let neu=0;for(const i in b.cls)if(!(i in a.cls))neu++;return {aufgestiegen:up,geblieben:same,verschwunden:gone,neu}};
  const s0=await snap(); console.log('Start',s0.year,'1 Figur =',s0.per,'Tiefe',s0.NZ,'Figuren',s0.tot,'erwartet',s0.expected,'größte Abweichung je Reihe',s0.maxDiff); console.log(' Frauen Reihen :',s0.f); console.log(' Frauen erwartet:',s0.w);
  await p.click('#stepF'); await p.waitForTimeout(1000); 
  await p.waitForTimeout(3500); const s1=await snap(); console.log('+1 Jahr ->',s1.year,JSON.stringify(cmp(s0,s1)),'Abweichung',s1.maxDiff);
  await p.evaluate('stepYear(1,5)'); await p.waitForTimeout(9000); const s2=await snap(); console.log('+5 Jahre ->',s2.year,JSON.stringify(cmp(s1,s2)),'Abweichung',s2.maxDiff);
  await p.evaluate('setS({year:1960},true);S.speed=10;play.end=2024;S.playing=true'); await p.waitForTimeout(16000); const s3=await snap(); console.log('1960 -> abgespielt bis',s3.year,'Figuren',s3.tot,'erwartet',s3.expected,'Abweichung',s3.maxDiff); console.log(' Frauen Reihen :',s3.f); console.log(' Frauen erwartet:',s3.w);
  await p.screenshot({path:process.argv[2]});
  console.log(errs.join('\n')||'no errors'); await b.close();
})();
