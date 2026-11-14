/* ===== Mantelkonvektion: 2D-Ringspalt, unendliche Prandtl-Zahl, Boussinesq, gleichförmige Viskosität =====
   ∇²ω = Ra/r · ∂T/∂θ ,  ∇²ψ = −ω ,  u_r = (1/r) ∂ψ/∂θ ,  u_θ = −∂ψ/∂r ,  ∂T/∂t + u·∇T = ∇²T + H
   Längeneinheit = Erdradius; r von RI (Kern-Mantel-Grenze, 3480 km) bis 1 (Oberfläche).
   Lösung: FFT in θ, Tridiagonal-Löser in r; Advektion semi-Lagrange (kubisch, begrenzt); Diffusion explizit. */
function makeMantleSim(NT, NR, opt){
  opt = opt || {};
  const RI = 3480/6371, DR = (1-RI)/(NR-1), DT = 2*Math.PI/NT;
  const Ra = opt.Ra || 6e6, H = opt.H == null ? 6 : opt.H;
  const N = NT*NR;
  const T = new Float32Array(N), T2 = new Float32Array(N), psi = new Float32Array(N), ur = new Float32Array(N), ut = new Float32Array(N);
  const rr = new Float32Array(NR); for(let j=0;j<NR;j++) rr[j] = RI + j*DR;
  // --- FFT (radix 2, komplex) ---
  const LOG = Math.round(Math.log2(NT)); if((1<<LOG)!==NT) throw new Error('NT muss Zweierpotenz sein');
  const rev = new Uint16Array(NT); for(let i=0;i<NT;i++){ let r=0; for(let b=0;b<LOG;b++) if(i&(1<<b)) r|=1<<(LOG-1-b); rev[i]=r; }
  const cs = new Float32Array(NT/2), sn = new Float32Array(NT/2); for(let i=0;i<NT/2;i++){ cs[i]=Math.cos(2*Math.PI*i/NT); sn[i]=Math.sin(2*Math.PI*i/NT); }
  function fft(re, im, o, inv){   // in-place auf re[o..o+NT), im[o..o+NT)
    for(let i=0;i<NT;i++){ const j=rev[i]; if(j>i){ let t=re[o+i]; re[o+i]=re[o+j]; re[o+j]=t; t=im[o+i]; im[o+i]=im[o+j]; im[o+j]=t; } }
    for(let len=2, step=NT>>1; len<=NT; len<<=1, step>>=1){
      const half=len>>1;
      for(let s=0;s<NT;s+=len){
        for(let k=0,w=0;k<half;k++,w+=step){
          const wr=cs[w], wi=inv?sn[w]:-sn[w];
          const a=o+s+k, b=a+half;
          const xr=re[b]*wr-im[b]*wi, xi=re[b]*wi+im[b]*wr;
          re[b]=re[a]-xr; im[b]=im[a]-xi; re[a]+=xr; im[a]+=xi;
        }
      }
    }
  }
  // --- Tridiagonal-Faktoren je Wellenzahl (Thomas) ---
  const MH = NT/2+1, NI = NR-2;
  const A = new Float32Array(NR), C = new Float32Array(NR);
  for(let j=1;j<NR-1;j++){ A[j]=(rr[j]-DR/2)/(rr[j]*DR*DR); C[j]=(rr[j]+DR/2)/(rr[j]*DR*DR); }
  const lam = new Float32Array(MH), dth = new Float32Array(MH);
  for(let m=0;m<MH;m++){ lam[m]=(2-2*Math.cos(m*DT))/(DT*DT); dth[m]=Math.sin(m*DT)/DT; }
  const cp = new Float32Array(MH*NR), den = new Float32Array(MH*NR);
  for(let m=0;m<MH;m++){
    let prev=0;
    for(let j=1;j<NR-1;j++){
      const b = -(A[j]+C[j]) - lam[m]/(rr[j]*rr[j]);
      const d = b - A[j]*prev; den[m*NR+j]=1/d; prev = C[j]/d; cp[m*NR+j]=prev;
    }
  }
  const sRe = new Float32Array(N), sIm = new Float32Array(N), wRe = new Float32Array(N), wIm = new Float32Array(N);
  const dR = new Float32Array(NR), dI = new Float32Array(NR);
  function solveTri(m, gRe, gIm, fRe, fIm){  // L f = g je Mode m; Randwerte 0; Felder im Layout [j*NT+m]
    const o=m*NR; let pr=0, pi=0;
    for(let j=1;j<NR-1;j++){ const k=j*NT+m; pr=(gRe[k]-A[j]*pr)*den[o+j]; pi=(gIm[k]-A[j]*pi)*den[o+j]; dR[j]=pr; dI[j]=pi; }
    let xr=0, xi=0;
    for(let j=NR-2;j>=1;j--){ xr=dR[j]-cp[o+j]*xr; xi=dI[j]-cp[o+j]*xi; const k=j*NT+m; fRe[k]=xr; fIm[k]=xi; }
  }
  function flow(){
    // FFT der Temperaturzeilen
    for(let j=1;j<NR-1;j++){ const o=j*NT; for(let i=0;i<NT;i++){ sRe[o+i]=T[o+i]; sIm[o+i]=0; } fft(sRe,sIm,o,false); }
    // rechte Seite: Ra/r * dT/dθ  ->  i*dth[m]*That
    for(let m=0;m<MH;m++){
      for(let j=1;j<NR-1;j++){ const k=j*NT+m, f=Ra/rr[j]*dth[m]; const a=sRe[k], b=sIm[k]; sRe[k]=-f*b; sIm[k]=f*a; }
      solveTri(m, sRe, sIm, wRe, wIm);                       // ω-Dach
      for(let j=1;j<NR-1;j++){ const k=j*NT+m; sRe[k]=-wRe[k]; sIm[k]=-wIm[k]; }
      solveTri(m, sRe, sIm, wRe, wIm);                       // ψ-Dach
    }
    // konjugiert-symmetrisch ergänzen, zurücktransformieren
    for(let j=1;j<NR-1;j++){ const o=j*NT;
      for(let m=1;m<NT/2;m++){ wRe[o+NT-m]=wRe[o+m]; wIm[o+NT-m]=-wIm[o+m]; }
      fft(wRe,wIm,o,true);
      for(let i=0;i<NT;i++) psi[o+i]=wRe[o+i]/NT;
    }
    for(let i=0;i<NT;i++){ psi[i]=0; psi[(NR-1)*NT+i]=0; }
    // Geschwindigkeit
    let umax=0;
    for(let j=0;j<NR;j++){ const o=j*NT, r=rr[j];
      for(let i=0;i<NT;i++){
        const ip=(i+1)&(NT-1), im=(i-1)&(NT-1);
        const u=(psi[o+ip]-psi[o+im])/(2*DT*r);
        let v;
        if(j===0) v=-(-3*psi[o+i]+4*psi[o+NT+i]-psi[o+2*NT+i])/(2*DR);
        else if(j===NR-1) v=-(3*psi[o+i]-4*psi[o-NT+i]+psi[o-2*NT+i])/(2*DR);
        else v=-(psi[o+NT+i]-psi[o-NT+i])/(2*DR);
        ur[o+i]= (j===0||j===NR-1)?0:u; ut[o+i]=v;
        const s=Math.abs(u)+Math.abs(v); if(s>umax) umax=s;
      }
    }
    return umax;
  }
  function cub(a,b,c,d,t){ // Catmull-Rom, auf [min(b,c),max(b,c)] begrenzt
    const v=b+0.5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*(b-c)+d-a)));
    const lo=b<c?b:c, hi=b<c?c:b; return v<lo?lo:(v>hi?hi:v);
  }
  function rowAt(j,i0,t){ const o=j*NT, M=NT-1; return cub(T[o+((i0-1)&M)],T[o+(i0&M)],T[o+((i0+1)&M)],T[o+((i0+2)&M)],t); }
  function advect(dt){
    for(let j=1;j<NR-1;j++){ const o=j*NT, r=rr[j];
      for(let i=0;i<NT;i++){
        const x=i-ut[o+i]/(r*DT)*dt, y=j-ur[o+i]/DR*dt;
        const i0=Math.floor(x), tx=x-i0; let j0=Math.floor(y), ty=y-j0;
        if(j0<0){ j0=0; ty=0; } if(j0>NR-2){ j0=NR-2; ty=1; }
        const ja=j0>0?j0-1:0, jd=j0<NR-2?j0+2:NR-1;
        T2[o+i]=cub(rowAt(ja,i0,tx),rowAt(j0,i0,tx),rowAt(j0+1,i0,tx),rowAt(jd,i0,tx),ty);
      }
    }
    for(let i=0;i<NT;i++){ T2[i]=1; T2[(NR-1)*NT+i]=0; }
  }
  function diffuse(dt){
    for(let j=1;j<NR-1;j++){ const o=j*NT, r=rr[j], kt=1/(r*r*DT*DT);
      for(let i=0;i<NT;i++){
        const c=T2[o+i], ip=(i+1)&(NT-1), im=(i-1)&(NT-1);
        const lap=C[j]*(T2[o+NT+i]-c)-A[j]*(c-T2[o-NT+i])+kt*(T2[o+ip]-2*c+T2[o+im]);
        let v=c+dt*(lap+H); T[o+i]=v<0?0:(v>1?1:v);
      }
    }
    for(let i=0;i<NT;i++){ T[i]=1; T[(NR-1)*NT+i]=0; }
  }
  const sim = { NT, NR, RI, DR, DT, T, psi, ur, ut, rr, umax:1, time:0, steps:0,
    init(seed){ let s=seed||7; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
      for(let j=0;j<NR;j++){ const z=j/(NR-1); for(let i=0;i<NT;i++){ const th=i*DT;
        let v=0.55*(1-z)+0.25*(z<0.9?1:(1-z)/0.1)*0.6; v=0.5+0.5*Math.exp(-z*9)-0.5*Math.exp(-(1-z)*9);
        v+=0.04*(rnd()-0.5)+0.05*Math.sin(5*th+1.3)*Math.sin(Math.PI*z)+0.04*Math.sin(9*th)*Math.sin(Math.PI*z);
        T[j*NT+i]=Math.min(1,Math.max(0,v)); } }
      for(let i=0;i<NT;i++){ T[i]=1; T[(NR-1)*NT+i]=0; }
      sim.umax=flow(); },
    flow(){ sim.umax=flow(); return sim.umax; },
    step(dt){ if(sim.steps%sim.flowEvery===0) sim.umax=flow(); advect(dt); diffuse(dt); sim.time+=dt; sim.steps++; },
    flowEvery: opt.flowEvery||2,
    dtMax(){ return 0.2*Math.min(DR*DR, (RI*DT)*(RI*DT)); },
    velAt(r, th, out){ // bilinear, r in [RI,1], th beliebig
      let y=(r-RI)/DR; if(y<0)y=0; if(y>NR-1.001)y=NR-1.001; const j0=y|0, ty=y-j0;
      let x=th/DT; x-=Math.floor(x/NT)*NT; const i0=x|0, tx=x-i0, i1=(i0+1)&(NT-1), a=j0*NT, b=a+NT;
      out[0]=(ur[a+i0]*(1-tx)+ur[a+i1]*tx)*(1-ty)+(ur[b+i0]*(1-tx)+ur[b+i1]*tx)*ty;
      out[1]=(ut[a+i0]*(1-tx)+ut[a+i1]*tx)*(1-ty)+(ut[b+i0]*(1-tx)+ut[b+i1]*tx)*ty; return out; },
    tempAt(r, th){ let y=(r-RI)/DR; if(y<0)y=0; if(y>NR-1.001)y=NR-1.001; const j0=y|0, ty=y-j0;
      let x=th/DT; x-=Math.floor(x/NT)*NT; const i0=x|0, tx=x-i0, i1=(i0+1)&(NT-1), a=j0*NT, b=a+NT;
      return (T[a+i0]*(1-tx)+T[a+i1]*tx)*(1-ty)+(T[b+i0]*(1-tx)+T[b+i1]*tx)*ty; }
  };
  return sim;
}
if(typeof module!=='undefined') module.exports={makeMantleSim};
