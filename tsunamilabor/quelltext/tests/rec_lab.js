// Prüft die Aufzeichnung: node tests/rec_lab.js
const fs=require('fs'), path=require('path');
const src=['a_sim.js','b_rec.js'].map(f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8')).join('\n');
const A=new Function(src+'\nreturn {makeRecorder,SCEN,XC,ZD,TAUEND,DS,E_DAMAGE,E_DESTROY,tauOf,tOfTau,TEND,gRest};')();
const probes=[]; for(const x of [7.4,7.95,8.35,8.75,9.15,9.55,10.05,10.55,11.0]) for(const z of [-4,-1,2,5]) probes.push({x,z});
const fl=[]; for(let i=0;i<40;i++){ const x=7.3+ (i%8)*0.4, z=-5+i*0.26; fl.push({x0:x,z0:z,ry0:0,th:i%2?0.012:0.035,mob:0.9,lat:0,spin:1}); }
for(const [x,z] of [[7.2,4.1],[7.8,4.0],[6.6,4.25],[6.2,3.65]]) fl.push({x0:x,z0:z,ry0:0,th:0.012,mob:0.95,lat:0,spin:1,boat:1});
const rec=A.makeRecorder(A.SCEN.big,probes,fl,{});
const t0=Date.now(); while(!rec.done) rec.work(1000); console.log('Rechenzeit',Date.now()-t0,'ms; Stützstellen',rec.KF.length,'Ankunft tau',rec.arr&&rec.arr.toFixed(2),'t',A.tOfTau(rec.arr).toFixed(1),'max. Reichweite x',rec.maxRun.toFixed(2));
console.log('Belastung E (max) je x, über z gemittelt:'); for(let q=0;q<9;q++){ const g=rec.probes.slice(q*4,q*4+4); console.log('  x',g[0].x,' E',g.map(p=>p.cur.toFixed(3)).join(' ')); }
const st=rec.floaters.map((f,i)=>({dx:f.x-f.x0,x:f.x,af:f.af,boat:fl[i].boat}));
console.log('Treibgut: ins Meer zurück (x<XC):',st.filter(s=>s.x<A.XC).length,' an Land versetzt:',st.filter(s=>s.x>=A.XC&&Math.abs(s.dx)>0.1).length,' unbewegt:',st.filter(s=>Math.abs(s.dx)<=0.1).length);
console.log('Rückweg: weiter landwärts als Start',st.filter(s=>s.dx>0.3).length,' zurückgezogen (dx<-0.3)',st.filter(s=>s.dx<-0.3).length);
console.log('Boote x am Ende:',st.filter(s=>s.boat).map(s=>s.x.toFixed(2)).join(' '));
const line=(name,arr,n=1,o=0)=>console.log(name,[...Array(24)].map((_,i)=>{const tau=i*2; return rec.at(arr,tau,n>1?n:0,o).toFixed(2);}).join(' '));
line('Kamm R x  ',rec.crR); line('Kamm R eta',rec.crRe); line('Kamm L x  ',rec.crL); line('Küste eta ',rec.shore); line('Reichweite',rec.runX); line('Strömung  ',rec.flow,3,1);
// Vor- und Zurückspulen: gleicher Zustand wie beim direkten Durchlauf?
rec.seek(20.33,1e9); const hA=rec.S.h.slice(); rec.seek(3,1e9); rec.seek(20.33,1e9); let d=0; for(let n=0;n<hA.length;n++) d=Math.max(d,Math.abs(hA[n]-rec.S.h[n])); console.log('Spulen: max. Abweichung',d.toExponential(2));
