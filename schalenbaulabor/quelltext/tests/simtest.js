const {makeMantleSim}=require('/home/claude/sb2/src/sim.js'); const fs=require('fs');
const NT=+process.argv[2]||512, NR=+process.argv[3]||96, Ra=+process.argv[4]||6e6, H=+process.argv[5]||6, steps=+process.argv[6]||4000, cfl=+process.argv[7]||0.3;
const s=makeMantleSim(NT,NR,{Ra,H}); s.init(3);
let t0=Date.now(), frames=[];
for(let k=0;k<steps;k++){ const dt=Math.min(s.dtMax(), cfl*s.DR/Math.max(s.umax,1e-6)); s.step(dt);
  if(k%Math.floor(steps/8)===0||k===steps-1){ let m=0; for(let i=0;i<s.T.length;i++) m+=s.T[i]; console.log(k,'t',s.time.toExponential(2),'umax',s.umax.toFixed(0),'Tmean',(m/s.T.length).toFixed(3),'dt',dt.toExponential(2)); frames.push(Buffer.from(new Uint8Array(s.T.map(v=>v*255)))); } }
console.log('ms/step',((Date.now()-t0)/steps).toFixed(2));
fs.writeFileSync('/home/claude/sb2/build/sim_frames.bin',Buffer.concat(frames)); fs.writeFileSync('/home/claude/sb2/build/sim_last_f32.bin',Buffer.from(s.T.buffer));
