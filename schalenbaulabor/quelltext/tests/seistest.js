const fs=require('fs'); let a=fs.readFileSync('/home/claude/sb2/src/a_core.js','utf8'), c=fs.readFileSync('/home/claude/sb2/src/c_seis.js','utf8');
a=a.slice(a.indexOf('const PREM = ['), a.indexOf('/* ---------- Temperatur'));
c=c.slice(0,c.indexOf('/* ---------- Darstellung'));
const RKM=6371, DEG=Math.PI/180, clamp=(x,a,b)=>x<a?a:(x>b?b:x);
eval(a+c+`
const t0=Date.now(); seisPrepare(); console.log('prep ms',Date.now()-t0);
console.log('edgeP',SEIS.edgeP.toFixed(1),'edgeS',SEIS.edgeS.toFixed(1),'edgeK',SEIS.edgeK.toFixed(1),'tMax',SEIS.tMax.toFixed(0));
for(const d of [10,30,60,90,98,110,130,145,160,180]){ const x=seisArrivals(d); console.log(d, x.P&&x.P.toFixed(0), x.S&&x.S.toFixed(0), x.K&&x.K.toFixed(0)); }
console.log(SEIS.rays.map(r=>r.cls+':'+r.delta.toFixed(0)+'/'+r.time.toFixed(0)+'/'+r.bottom.toFixed(0)+(r.end==='liquid'?'x':'')).join('  '));
const K=SEIS.tab.K.filter(x=>x[4]==='surface'); console.log('PKIKP delta range', Math.min(...K.filter(x=>x[3]==='PKIKP').map(x=>x[1])).toFixed(1), Math.max(...K.filter(x=>x[3]==='PKIKP').map(x=>x[1])).toFixed(1), 'PKP range', Math.min(...K.filter(x=>x[3]==='PKP').map(x=>x[1])).toFixed(1), Math.max(...K.filter(x=>x[3]==='PKP').map(x=>x[1])).toFixed(1));
`);
eval(a+c+`
seisPrepare();
const K2=SEIS.tab.K.filter(x=>x[4]==='surface'&&x[3]==='PKP'&&(x[1]>180?360-x[1]:x[1])<144.5);
console.log(K2.slice(0,12).map(x=>x[0].toFixed(1)+':'+x[1].toFixed(1)).join(' '));
for(const p of [117,117.5,118,118.5,119,120,125,140,200,250]){ const r=seisTrace(p,'P'); console.log(p,r.kind,r.delta.toFixed(1),r.bottom.toFixed(1),r.time.toFixed(0)); }
`);
