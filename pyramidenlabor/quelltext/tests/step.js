// Prüft Schritt-Knöpfe, Einrasten nach dem Abspielen und die Figuren-Reihen
const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport:{width:1100,height:700}}); const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  await p.goto('http://localhost:8772/pyramiden-labor.html?q=lo'); await p.waitForFunction('window.__ready===true');
  const Y=()=>p.evaluate('window.__lab.S.year');
  await p.evaluate('window.__lab.goStation(5)'); await p.waitForTimeout(800);
  await p.click('#stepF'); await p.waitForTimeout(2500); console.log('Balken 1 Jahr: 1950 ->',await Y());
  await p.click('#stepF'); await p.click('#stepF'); await p.waitForTimeout(3500); console.log('zweimal schnell ->',await Y());
  await p.click('#stepB'); await p.waitForTimeout(2500); console.log('zurück ->',await Y());
  await p.click('#play'); await p.waitForTimeout(2600); await p.click('#play'); await p.waitForTimeout(1500); const y=await Y(); console.log('Abspielen/Anhalten ->',y,'ganzzahlig:',Number.isInteger(y));
  await p.evaluate('window.__lab.goStation(0)'); await p.waitForTimeout(1200);
  console.log('Figuren Start',await Y(), await p.evaluate('document.querySelector("#stepF").textContent'));
  await p.click('#stepF'); await p.waitForTimeout(6500); console.log('Figuren +5 ->',await Y());
  await p.click('#play'); await p.waitForTimeout(3000); await p.click('#play'); await p.waitForTimeout(4500); const y2=await Y(); console.log('Figuren Abspielen/Anhalten ->',y2,'auf Stufe:',(y2-2024)%5===0);
  console.log(errs.join('\n')||'no errors'); await b.close();
})();
