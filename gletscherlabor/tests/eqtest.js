const fs=require('fs'); const S=require('../src/sim.js');
function npy(f){const b=fs.readFileSync(f); const hl=b.readUInt16LE(8); const off=10+hl; return new Float64Array(b.buffer.slice(b.byteOffset+off,b.byteOffset+b.length));}
const c=JSON.parse(fs.readFileSync('t_clim.json'));
const m=new S.Model({nx:c.nx,ny:c.ny,B:npy('t_B.npy'),rad:npy('t_rad.npy'),slopeDeg:npy('t_sl.npy'),aval:(()=>{const b=fs.readFileSync('aval.npy');const hl=b.readUInt16LE(8);return new Int32Array(b.buffer.slice(b.byteOffset+10+hl,b.byteOffset+b.length));})()});
m.H.set(npy('t_H.npy')); m.M.set(npy('t_M.npy'));
const t0=Date.now();
for(let k=0;k<48;k++) m.substep(c.T,c.P,0.3,0.1);
console.log('js ms',Date.now()-t0,'steps',m.steps);
const sum=a=>a.reduce((x,y)=>x+y,0);
console.log('js vol',sum(m.H),'D',sum(m.D),'M',sum(m.M));
for(const f of ['H','M','D','firn','snow','bann','usx']) fs.writeFileSync('t_js_'+f+'.bin',Buffer.from(m[f].buffer));
