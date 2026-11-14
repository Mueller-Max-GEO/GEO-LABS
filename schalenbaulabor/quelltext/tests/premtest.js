const fs=require('fs'); let s=fs.readFileSync('/home/claude/sb2/src/a_core.js','utf8');
s=s.slice(s.indexOf('const PREM = ['), s.indexOf('/* ---------- Temperatur'));
const RKM=6371, clamp=(x,a,b)=>x<a?a:(x>b?b:x);
eval(s+`
console.log('rho center',premAt(0,1).toFixed(2),'CMB core',premAt(3480,1,true).toFixed(2),'CMB mantle',premAt(3480,1).toFixed(2),'670 below',premAt(5701,1,true).toFixed(2),'above',premAt(5701,1).toFixed(2));
console.log('vp CMB mantle',premAt(3480,2).toFixed(2),'core',premAt(3480,2,true).toFixed(2),'ICB oc',premAt(1221.5,2).toFixed(2),'ic',premAt(1221.5,2,true).toFixed(2),'vs bottom mantle',premAt(3480,3).toFixed(2),'vs ic',premAt(1000,3).toFixed(2));
console.log('P center',pressureGPa(6371).toFixed(1),'CMB',pressureGPa(2891).toFixed(1),'ICB',pressureGPa(5150).toFixed(1),'660',pressureGPa(660).toFixed(1),'100',pressureGPa(100).toFixed(2),'g surf',gravityAt(0).toFixed(2),'g CMB',gravityAt(2891).toFixed(2));
`);
