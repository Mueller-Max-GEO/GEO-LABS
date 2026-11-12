// node tests/energie.js – prüft, dass das Labor im Stillstand nicht mehr zeichnet und bei Bedienung sofort wieder aufwacht
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:1280,height:800}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8772/pyramiden-labor.html');await p.waitForFunction('window.__ready===true');
  const F=()=>p.evaluate('window.__frames'),W=ms=>p.waitForTimeout(ms);
  await W(5000);let a=await F();await W(2000);let b2=await F();console.log('Stillstand: Bilder in 2 s =',b2-a,'(soll 0) · schläft:',!(await p.evaluate('__lab.PWR.run')));
  await p.click('#play');await W(2000);let c=await F();console.log('Abspielen: Bilder in 2 s =',c-b2);
  await p.click('#play');await W(4000);a=await F();await W(1500);b2=await F();console.log('nach Anhalten wieder still:',b2-a===0);
  await p.mouse.move(640,400);await W(300);await p.mouse.move(660,420);await W(500);c=await F();console.log('Zeiger über der Pyramide weckt:',c>b2);
  await p.evaluate("__lab.setPres(true)");await W(300);await p.click('#play');await W(2000);a=await F();await W(2000);b2=await F();console.log('Vorführmodus beim Abspielen: Bilder/s ≈',((b2-a)/2).toFixed(0),'(Obergrenze 30)');
  await p.click('#play');
  // Stillstand mit Figuren
  await p.evaluate("__lab.setPres(false);__lab.goStation(0)");await W(9000);a=await F();await W(2000);b2=await F();console.log('Figuren still:',b2-a===0,'· Bewegung',(await p.evaluate('__lab.PWR'),await p.evaluate('window.__lab.V.moving')));
  console.log(errs.length?errs.join('\n'):'keine Fehler');await b.close()})();
