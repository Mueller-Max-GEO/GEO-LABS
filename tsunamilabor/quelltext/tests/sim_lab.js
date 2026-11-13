// Werkbank für die Simulation: node tests/sim_lab.js [nx] [nz] [tauEnd]
const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../src/a_sim.js'),'utf8');
const api=new Function(src+'\nreturn {createSim,XL,XR,ZD,XC,XU,gRest,yS,depthRest,Dpat,chZ,RISE};')();
module.exports=api;
if(require.main===module){
  const nx=+process.argv[2]||368, nz=+process.argv[3]||64, tEnd=+process.argv[4]||42;
  const {createSim,XL,XR,ZD,XC,XU,yS}=api;
  // 1) ruhendes Wasser bleibt in Ruhe
  let S=createSim({nx,nz,R:0}); const m0=S.mass();
  for(let i=0;i<200;i++) S.step();
  let vmax=0; for(let n=0;n<S.N;n++){ if(S.h[n]>2e-3){ const v=Math.hypot(S.hu[n],S.hw[n])/S.h[n]; if(v>vmax)vmax=v; } }
  console.log('Ruhe: max. Geschwindigkeit nach 200 Schritten',vmax.toExponential(2),' Masse rel.',((S.mass()-m0)/m0).toExponential(2));
  // 2) voller Lauf
  S=createSim({nx,nz,R:1}); console.log('nx',nx,'nz',nz,'dx',Math.min(...S.dxs).toFixed(4),'…',Math.max(...S.dxs).toFixed(4),'dz',S.dz.toFixed(4),'dt',S.dt.toFixed(4));
  const kF=nz-1, row=kF*nx; const ix=x=>Math.round(S.fxOf(x));
  const t0=Date.now(); let next=0, arr=null; const shore=[], maxEta=new Float32Array(nx);
  const mStart=S.mass();
  while(S.tau<tEnd){ S.step();
    for(let i=0;i<nx;i++){ const e=S.h[row+i]>2e-3?S.h[row+i]+S.b[row+i]:-9; if(e>maxEta[i]) maxEta[i]=e; }
    if(arr===null&&S.h[row+ix(XC+0.15)]>0.03) arr=S.tau;
    if(S.tau>=next){ next+=(S.tau<10?2:S.tau<24?1:2);
      // Profil der Vorderseite: Kamm-Position und -höhe, Wasserstand an Messpunkten
      let im=0,em=-9; for(let i=0;i<nx;i++){ if(S.h[row+i]>2e-3){ const e=S.h[row+i]+S.b[row+i]; if(e>em){em=e;im=i;} } }
      let front=XC; for(let i=nx-1;i>=0;i--){ if(S.h[row+i]>0.01){ front=S.xs[i]; break; } }
      const d=x=>S.h[row+ix(x)].toFixed(2);
      console.log('tau',S.tau.toFixed(1).padStart(5),'Kamm x',S.xs[im].toFixed(2).padStart(6),'eta',em.toFixed(3),'| Front bis x',front.toFixed(2),'| Tiefe 7.3/8.5/9.5/10.3:',d(7.3),d(8.5),d(9.5),d(10.3),'| eta(6.5)',(S.h[row+ix(6.5)]+S.b[row+ix(6.5)]).toFixed(2),'u(8.5)',(S.h[row+ix(8.5)]>2e-3?S.hu[row+ix(8.5)]/S.h[row+ix(8.5)]:0).toFixed(2));
    } }
  const ms=Date.now()-t0;
  console.log('Schritte',S.steps,'Zeit',ms,'ms  =',(ms/S.steps).toFixed(2),'ms/Schritt; max. CFL',S.maxCFL.toFixed(2),'Ankunft',arr&&arr.toFixed(2));
  console.log('Spur des Wellenbergs (x: max eta):',[-12,-9,-6,-4,-2,0,1,2,3,4,5,6,6.8].map(x=>x+': '+maxEta[ix(x)].toFixed(2)).join('  '));
  console.log('Masse rel. Änderung',((S.mass()-mStart)/mStart).toExponential(2),'(Abfluss über offene Ränder möglich)');
}
