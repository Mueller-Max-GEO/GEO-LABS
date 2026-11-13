/* ============================================================================================
   e_water.js – Wasser: Die Oberfläche liest Höhe, Tiefe, Trübung, Schaum und Strömung direkt aus der Simulation.
   Zwischen zwei Rechenschritten wird weich überblendet.
   ============================================================================================ */
const SIMQ=LOWQ?{nx:272,nz:48}:{nx:368,nz:64};
const S0=createSim({nx:SIMQ.nx,nz:SIMQ.nz,R:0});          // Gitter und Ruhezustand (auch für Phase 1 und das tiefe Beben)
const NXW=S0.nx, NZW=S0.nz;
const bufA=[new Float32Array(NXW*NZW*4),new Float32Array(NXW*NZW*4)], bufV=new Float32Array(NXW*NZW*2);
const texA=bufA.map(b=>{ const t=new THREE.DataTexture(b,NXW,NZW,THREE.RGBAFormat,THREE.FloatType); t.minFilter=t.magFilter=THREE.NearestFilter; t.needsUpdate=true; return t; });
const texV=new THREE.DataTexture(bufV,NXW,NZW,THREE.RGFormat,THREE.FloatType); texV.minFilter=texV.magFilter=THREE.NearestFilter; texV.needsUpdate=true;
let cur=1, simN=-2;
const WU={uA0:{value:texA[0]},uA1:{value:texA[1]},uV:{value:texV},uMix:{value:1}};
function swapA(){ cur=1-cur; WU.uA0.value=texA[1-cur]; WU.uA1.value=texA[cur]; }
/* Ruhezustand bei gegebener Verformung k (Phase 1: Der Meeresboden sinkt langsam, das Wasser bleibt ruhig) */
function packRest(k){ const A=bufA[cur], b0=S0.b0, bD=S0.bD, xs=S0.xs;
  for(let n=0;n<S0.N;n++){ const bed=b0[n]-bD[n]*k, h=(bed<0&&xs[n%NXW]<CH_X1+0.5)?-bed:0, o=4*n; A[o]=bed+h; A[o+1]=h; A[o+2]=0; A[o+3]=0; }
  bufA[1-cur].set(A); bufV.fill(0); texA[0].needsUpdate=texA[1].needsUpdate=texV.needsUpdate=true; WU.uMix.value=1; simN=-2; }
/* Simulation auf die Zeit tau bringen und in die Texturen schreiben; false = noch nicht ganz erreicht (wird im nächsten Bild fortgesetzt) */
function simFrame(tau,kk,budget){
  if(tau<=0||!rec||!rec.done||scen.R<=0){ packRest(kk); return true; }
  const S=rec.S, n=Math.min(Math.floor(tau/S.dt+1e-6),Math.floor(TAUEND/S.dt)-1);
  if(simN===n&&S.steps===n+1){ WU.uMix.value=clamp(tau/S.dt-n,0,1); return true; }
  if(simN===n-1&&S.steps===n){ swapA(); S.step(); S.pack(bufA[cur],bufV); texA[cur].needsUpdate=texV.needsUpdate=true; simN=n; WU.uMix.value=clamp(tau/S.dt-n,0,1); return true; }
  const ok=rec.seekStep(n,budget);
  S.pack(bufA[1-cur],bufV); texA[1-cur].needsUpdate=true;
  if(!ok){ bufA[cur].set(bufA[1-cur]); texA[cur].needsUpdate=texV.needsUpdate=true; WU.uMix.value=1; simN=-2; return false; }
  S.step(); S.pack(bufA[cur],bufV); texA[cur].needsUpdate=texV.needsUpdate=true; simN=n; WU.uMix.value=clamp(tau/S.dt-n,0,1); return true;
}
/* Wasserstand an einem Punkt (aus den angezeigten Daten): [Wasserspiegel bzw. Boden, Tiefe, u, w] */
const _ws=[0,0,0,0];
function waterAt(x,z){
  const fx=Math.min(S0.fxOf(x),NXW-1.001), fz=clamp((z+ZD)/S0.dz-0.5,0,NZW-1.001), i=Math.floor(fx), k=Math.floor(fz), ux=fx-i, uz=fz-k;
  const A=bufA[cur], B=bufA[1-cur], m=WU.uMix.value, n=k*NXW+i, w=[(1-ux)*(1-uz),ux*(1-uz),(1-ux)*uz,ux*uz], nn=[n,n+1,n+NXW,n+NXW+1];
  let e=0,h=0,u=0,v=0; for(let q=0;q<4;q++){ const o=4*nn[q]; e+=w[q]*(B[o]+(A[o]-B[o])*m); h+=w[q]*(B[o+1]+(A[o+1]-B[o+1])*m); u+=w[q]*bufV[2*nn[q]]; v+=w[q]*bufV[2*nn[q]+1]; }
  _ws[0]=e; _ws[1]=h; _ws[2]=u; _ws[3]=v; return _ws; }

const WCOL={ABYSS:'#041C3C',DEEP:'#0A3560',MID:'#1B69A8',SHAL:'#45B5C9',CREST:'#BFE3F2',MUD:'#7F775C',MUD2:'#B3A078',FOAM:'#F5F8F9'};
const waterMat=new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,roughness:0.1,metalness:0,side:THREE.FrontSide,depthWrite:false,envMapIntensity:0.62});
waterMat.onBeforeCompile=sh=>{
  Object.assign(sh.uniforms,WU,{uTime:U.uTime,uNz:U.uNz});
  sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>
uniform sampler2D uA0; uniform sampler2D uA1; uniform sampler2D uV; uniform float uMix;
attribute float aI; attribute float aFz; attribute float aDx;
varying vec4 vA; varying vec2 vVel; varying vec3 vWp2;
vec4 sA(int i,float fz){ fz=clamp(fz,0.0,${fl(NZW-1)}); int k0=int(floor(fz)); int k1=min(k0+1,${NZW-1}); float u=fz-float(k0);
  vec4 a=mix(texelFetch(uA0,ivec2(i,k0),0),texelFetch(uA0,ivec2(i,k1),0),u);
  vec4 b=mix(texelFetch(uA1,ivec2(i,k0),0),texelFetch(uA1,ivec2(i,k1),0),u); return mix(a,b,uMix); }`)
  .replace('#include <beginnormal_vertex>',`
  int ii=int(aI+0.5); vec4 c=sA(ii,aFz);
  vec4 cl=sA(max(ii-1,0),aFz), cr=sA(min(ii+1,${NXW-1}),aFz), cb=sA(ii,aFz-1.0), cf=sA(ii,aFz+1.0);
  float e0=c.r, el=cl.g>0.004?cl.r:e0, er=cr.g>0.004?cr.r:e0, eb=cb.g>0.004?cb.r:e0, ef=cf.g>0.004?cf.r:e0;
  vec3 objectNormal=normalize(vec3(-(er-el)/aDx,1.0,-(ef-eb)/${fl(2*S0.dz)}));
  vA=c; vVel=texelFetch(uV,ivec2(ii,int(clamp(floor(aFz+0.5),0.0,${fl(NZW-1)}))),0).rg;
  #ifdef USE_TANGENT
  vec3 objectTangent=vec3(1.0,0.0,0.0);
  #endif`)
  .replace('#include <begin_vertex>',`vec3 transformed=vec3(position.x, c.g>0.003?c.r:c.r-0.03, position.z);`)
  .replace('#include <project_vertex>',`#include <project_vertex>
  vWp2=(modelMatrix*vec4(transformed,1.0)).xyz;`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform float uTime;
varying vec4 vA; varying vec2 vVel; varying vec3 vWp2;
float gFoam=0.0; vec2 gQ1; vec2 gQ2; float gWq;
uniform sampler2D uNz;
${SSTGLSL}
/* bewegtes Rauschen aus der Rauschtextur: zwei gegeneinander wandernde Lagen */
vec4 wn(vec2 q,float t){ vec4 a=texture2D(uNz,q*0.015625+vec2(0.012,0.008)*t), b=texture2D(uNz,q*0.0207-vec2(0.006,-0.010)*t+0.37); return clamp((0.5*(a+b)-0.5)*1.4+0.5,0.0,1.0); }
${Object.entries(WCOL).map(([k,v])=>`#define W_${k} ${lin(v)}`).join('\n')}`)
  .replace('#include <color_fragment>',`#include <color_fragment>
  { float dep=vA.g, turb=clamp(vA.b,0.0,1.0), foam=clamp(vA.a,0.0,1.0), eta=vA.r;
    if(dep<0.0025) discard;
    /* Muster wandern mit der Strömung (zwei versetzte Phasen, weich überblendet) */
    vec2 fv=clamp(vVel,-1.5,1.5)*0.7; float p1=fract(uTime*0.35), p2=fract(p1+0.5); gWq=abs(1.0-2.0*p1);
    gQ1=vWp2.xz-fv*p1; gQ2=vWp2.xz-fv*p2+vec2(3.7,1.9);
    float nA=mix(wn(gQ1*3.0,uTime).g,wn(gQ2*3.0,uTime).g,gWq);
    vec4 f1=wn(gQ1*16.0,uTime*3.0), f2=wn(gQ2*16.0,uTime*3.0); float nF=mix(0.6*f1.r+0.4*f1.a,0.6*f2.r+0.4*f2.a,gWq);
    float sea=1.0-sst(${fl(XC-0.4)},${fl(XC+0.1)},vWp2.x);
    vec3 col=mix(W_SHAL,W_MID,sst(0.03,0.75,dep)); col=mix(col,W_DEEP,sst(0.75,2.9,dep)); col=mix(col,W_ABYSS,sst(3.05,3.85,dep));   /* über der Tiefseerinne am dunkelsten */
    col=mix(col,W_CREST,clamp(eta*1.3,0.0,0.32)*sea); col=mix(col,W_DEEP*0.72,clamp(-eta*2.2,0.0,0.4)*sea);
    vec3 mud=mix(W_MUD,W_MUD2,0.25+0.6*nA);
    col=mix(col,mud,turb*mix(0.8,0.9,sea));
    col*=1.0+turb*(0.42*nF-0.2);                                  // Schlieren im trüben Wasser: zeigen die Strömung
    float fm=clamp(foam*1.5+(1.0-sst(0.0,0.035,dep))*0.4*sea,0.0,1.0);
    float lace=sst(0.82-0.78*fm,1.04-0.62*fm,nF*0.72+nA*0.5);
    float fa=lace*clamp(fm*2.0,0.0,1.0); gFoam=fa;
    col=mix(col,mix(W_FOAM,mud*1.45+0.1,turb*0.8),fa*0.9);
    float al=clamp(0.5+dep*0.6,0.5,0.95); al=mix(al,0.95,turb); al=mix(al,0.97,fa); al*=sst(0.0025,0.014,dep);
    diffuseColor=vec4(col,al); }`)
  .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
  roughnessFactor=mix(roughnessFactor,0.85,gFoam); roughnessFactor=mix(roughnessFactor,0.34,clamp(vA.b,0.0,1.0));`)
  .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  { float tt=uTime*2.2, e1=0.14; vec2 qa=mix(gQ1,gQ2,gWq)*7.0, qb=mix(gQ1,gQ2,gWq)*19.0;
    float a0=wn(qa,tt).r, ax=wn(qa+vec2(e1,0.0),tt).r, az=wn(qa+vec2(0.0,e1),tt).r;
    float b0=wn(qb,tt*1.7).a, bx=wn(qb+vec2(e1,0.0),tt*1.7).a, bz=wn(qb+vec2(0.0,e1),tt*1.7).a;
    float amp=0.02*(1.0+1.6*clamp(length(vVel),0.0,1.0));
    vec3 pert=vec3(-(ax-a0)-(bx-b0)*0.5,0.0,-(az-a0)-(bz-b0)*0.5)/e1*amp;
    normal=normalize(normal+(viewMatrix*vec4(pert,0.0)).xyz); }`);
};
waterMat.customProgramCacheKey=()=>'waterSim';
/* Gitter der Wasseroberfläche: in x die Zellmitten der Simulation (plus Rand), in z doppelt so fein */
const surf=(()=>{ const NC=NXW+2, NR=2*NZW+1, g=new THREE.BufferGeometry(); const P=new Float32Array(NC*NR*3), aI=new Float32Array(NC*NR), aFz=new Float32Array(NC*NR), aDx=new Float32Array(NC*NR);
  for(let r=0;r<NR;r++)for(let c=0;c<NC;c++){ const n=r*NC+c, i=clamp(c-1,0,NXW-1), x=c===0?XL:(c===NC-1?XR:S0.xs[i]), z=-ZD+r*S0.dz/2;
    P[n*3]=x; P[n*3+2]=z; aI[n]=i; aFz[n]=r/2-0.5; aDx[n]=S0.xs[Math.min(i+1,NXW-1)]-S0.xs[Math.max(i-1,0)]; }
  g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('aI',new THREE.BufferAttribute(aI,1)); g.setAttribute('aFz',new THREE.BufferAttribute(aFz,1)); g.setAttribute('aDx',new THREE.BufferAttribute(aDx,1));
  const idx=new Uint32Array((NC-1)*(NR-1)*6); let q=0; for(let r=0;r<NR-1;r++)for(let c=0;c<NC-1;c++){ const a=r*NC+c,b=a+1,d=a+NC,e=d+1; idx[q++]=a;idx[q++]=d;idx[q++]=e;idx[q++]=a;idx[q++]=e;idx[q++]=b; }
  g.setIndex(new THREE.BufferAttribute(idx,1));
  const m=new THREE.Mesh(g,waterMat); m.frustumCulled=false; m.renderOrder=3; world.add(m); return m; })();

/* Seitenflächen des Wassers (Querschnitt): aus der vordersten, hintersten und linken Zellreihe */
function stripMesh(n,matOpts){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((n+1)*2*3),3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array((n+1)*2*4),4));
  const idx=[]; for(let i=0;i<n;i++){const a=i*2,b=a+1,c=a+2,d=a+3; idx.push(a,c,d,a,d,b);} g.setIndex(idx);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,side:THREE.DoubleSide,depthWrite:false,...matOpts})); m.frustumCulled=false; m.renderOrder=2; world.add(m); return m; }
const NXS=NXW+1;
const fStrip=stripMesh(NXS), bStrip=stripMesh(NXS), lStrip=stripMesh(NZW+1), rim=stripMesh(NXS); rim.renderOrder=4;
const cAby=new THREE.Color('#06213F'), cTop=new THREE.Color('#5FA8DC'), cBot=new THREE.Color('#123A64'), cMud=new THREE.Color('#7A705B'), cRim=new THREE.Color('#E8F5FF');
const FRONT_H=new Float32Array(NXS+1), FRONT_G=new Float32Array(NXS+1), FRONT_X=new Float32Array(NXS+1);
for(let c=0;c<=NXS;c++){ const i=clamp(c-1,0,NXW-1); FRONT_X[c]=c===0?XL:(c===NXS?XR:S0.xs[i]); }
function updateStrips(){
  const A=bufA[cur], B=bufA[1-cur], m=WU.uMix.value;
  const val=(n,o)=>B[4*n+o]+(A[4*n+o]-B[4*n+o])*m;
  const put=(strip,count,get,store)=>{ const P=strip.geometry.attributes.position.array, C=strip.geometry.attributes.color.array;
    for(let q=0;q<=count;q++){ const [x,z,n]=get(q); const e=val(n,0), h=val(n,1), tb=clamp(val(n,2),0,1), g=e-h, wet=h>0.004, top=wet?e:g;
      P[q*6]=x;P[q*6+1]=g;P[q*6+2]=z;P[q*6+3]=x;P[q*6+4]=top;P[q*6+5]=z;
      const al=wet?0.9:0, r=lerp(cTop.r,cMud.r,tb), gg=lerp(cTop.g,cMud.g,tb), bb=lerp(cTop.b,cMud.b,tb), k2=tb*0.75;
      const ab=sstep(2.2,3.9,h); C[q*8]=lerp(lerp(cBot.r,cAby.r,ab),cMud.r,k2);C[q*8+1]=lerp(lerp(cBot.g,cAby.g,ab),cMud.g,k2);C[q*8+2]=lerp(lerp(cBot.b,cAby.b,ab),cMud.b,k2);C[q*8+3]=al;
      C[q*8+4]=r;C[q*8+5]=gg;C[q*8+6]=bb;C[q*8+7]=wet?lerp(0.6,0.88,tb):0; if(store) store(q,top,g); }
    strip.geometry.attributes.position.needsUpdate=true; strip.geometry.attributes.color.needsUpdate=true; };
  put(fStrip,NXS,c=>[FRONT_X[c],ZD+0.003,(NZW-1)*NXW+clamp(c-1,0,NXW-1)],(c,h,g)=>{FRONT_H[c]=h;FRONT_G[c]=g;});
  put(bStrip,NXS,c=>[FRONT_X[c],-ZD-0.003,clamp(c-1,0,NXW-1)]);
  put(lStrip,NZW+1,r=>[XL-0.003,r===0?-ZD:(r===NZW+1?ZD:S0.zs[r-1]),clamp(r-1,0,NZW-1)*NXW]);
  /* heller Rand oben an der Schnittfläche: zeigt die Wellenform */
  const P=rim.geometry.attributes.position.array, C=rim.geometry.attributes.color.array;
  for(let c=0;c<=NXS;c++){ const x=FRONT_X[c], h=FRONT_H[c], wet=h-FRONT_G[c]>0.008;
    P[c*6]=x;P[c*6+1]=h-0.03;P[c*6+2]=ZD+0.006;P[c*6+3]=x;P[c*6+4]=h+0.006;P[c*6+5]=ZD+0.006;
    for(let j=0;j<2;j++){C[c*8+j*4]=cRim.r;C[c*8+j*4+1]=cRim.g;C[c*8+j*4+2]=cRim.b;C[c*8+j*4+3]=wet?0.95:0;} }
  rim.geometry.attributes.position.needsUpdate=true; rim.geometry.attributes.color.needsUpdate=true;
}
/* Wasserspiegel und Boden an der Schnittfläche */
function frontLevelAt(x){ const f=clamp(S0.fxOf(x)+1,0,NXS-0.001), i=Math.floor(f), u=f-i; return {h:lerp(FRONT_H[i],FRONT_H[i+1],u),g:lerp(FRONT_G[i],FRONT_G[i+1],u)}; }

/* ---------- Spur des Wellenbergs (Phase 4): verbindet die Lagen des Wellenbergs ---------- */
const ENVN=Math.ceil(TAU5/DS)+14;
const envGeo=new THREE.BufferGeometry(); envGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((ENVN+1)*6),3));
{ const idx=[]; for(let i=0;i<ENVN;i++){const a=i*2; idx.push(a,a+2,a+3,a,a+3,a+1);} envGeo.setIndex(idx); }
const envMesh=new THREE.Mesh(envGeo,new THREE.MeshBasicMaterial({color:0xFFC83D,side:THREE.DoubleSide,depthTest:false,transparent:true})); envMesh.renderOrder=9; envMesh.frustumCulled=false; envMesh.visible=false; world.add(envMesh);
const ENV0=Math.round(1.4/DS);
function updateEnvelope(tau){ const P=envGeo.attributes.position.array; const sNow=Math.min(tau/DS,ENV0+ENVN-0.001); let lx=0, ly=0;
  for(let q=0;q<=ENVN;q++){ const s=Math.min(ENV0+q,sNow), i=Math.floor(s), u=s-i; const x=lerp(rec.crR[i],rec.crR[i+1],u), y=lerp(rec.crRe[i],rec.crRe[i+1],u);
    if(x<XC-0.12||q===0){ lx=x; ly=y; }
    P[q*6]=lx;P[q*6+1]=ly-0.035;P[q*6+2]=ZD+0.09;P[q*6+3]=lx;P[q*6+4]=ly+0.035;P[q*6+5]=ZD+0.09; }
  envGeo.attributes.position.needsUpdate=true; }
