const M=require('../src/b_model.js'); const assert=require('assert');
const Q=M.QUAKES; console.log(Q.length,'Erdbeben; erstes',Q[0].T.toFixed(0),'letztes',Q[Q.length-1].T,'F0',Q.F0.toFixed(2));
console.log('Versatz je Beben (m):',Q.map(q=>q.slip.toFixed(1)).join(' '));
console.log('Abstände (Jahre):',Q.slice(1).map((q,i)=>(q.T-Q[i].T).toFixed(0)).join(' '));
assert(Math.abs(Q[Q.length-1].S-130)<1e-9); assert(Q.every(q=>q.slip>2&&q.slip<10));
assert(Math.abs(M.slipC(0)-130)<1e-9); console.log('Rückstand heute',(M.farC(0)-M.slipC(0)).toFixed(2),'m');
// Verformung: an der Verwerfung 0, weit weg ±F/2; nach dem Beben starr ±S/2
assert(Math.abs(M.dispU(1e-6,0,5,0))<1e-6); assert(Math.abs(M.dispU(1e9,0,5,0)+2.5)<1e-3); assert(Math.abs(M.dispU(-1e9,0,5,0)-2.5)<1e-3);
for(const d of [1,100,1e4,5e4]) assert(Math.abs(M.dispU(d,0,5,5)+2.5)<1e-9);
assert(Math.abs(M.dispU(200,20000,5,0)+2.5)<1e-2);   // unterhalb der verhakten Zone: freies Gleiten
for(const t of [0,3,6.01,10,14.01,20,24.01,32,40.01,44,52,58,66.01,80,93.9]){ const s=M.stateAt(t,'lock'); console.log(t,s.scale,'F',s.F.toFixed(2),'S',s.S1.toFixed(2),'def',s.deficit.toFixed(2),'sec',(s.sec??0).toFixed(1),'T',s.T.toFixed(0),'nQ',s.nQ); }
console.log('ok');
