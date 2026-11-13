/* ============================================================================================
   d_scene.js – three.js-Szene: Licht, Gesteinskörper mit prozeduralen Texturen, Plattengrenze, Pfeile
   ============================================================================================ */
const QS=new URLSearchParams(location.search);
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOWQ=QS.has('low');
const fl=v=>{const s=String(+(+v).toFixed(5)); return /[.e]/.test(s)?s:s+'.0';};
const lin=hex=>{const c=new THREE.Color(hex); return `vec3(${fl(c.r)},${fl(c.g)},${fl(c.b)})`;};
const $=id=>document.getElementById(id);
const state={t:0,playing:false,speed:1,stopEach:true,labels:true,lvl:'imp',arrows:true,ghost:true,autoCam:true,mode:'explore',view:'oblique',stopAt:null,dirty:true,film:false};
let scen=SCEN.big, rec=null;

const vp=$('viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
const DPR_MAX=LOWQ?1:Math.min(2,devicePixelRatio||1); let dpr=Math.min(DPR_MAX,1.5);   // beginnt maßvoll; steigt von selbst, wenn das Gerät schnell genug ist renderer.setPixelRatio(dpr);
renderer.toneMapping=THREE.NeutralToneMapping; renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=!LOWQ; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate=false; let shadowDirty=true, lastShadow=0;
vp.insertBefore(renderer.domElement,vp.firstChild);
const scene=new THREE.Scene();
/* Himmel als Umgebung: gibt dem Wasser weiche Spiegelungen (hell am Horizont, blau im Zenit, Sonne) */
{ const c=document.createElement('canvas'); c.width=512; c.height=256; const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,256); gr.addColorStop(0,'#3F74B5'); gr.addColorStop(0.3,'#7FAEDB'); gr.addColorStop(0.47,'#BFD6E8'); gr.addColorStop(0.5,'#CFE0EC'); gr.addColorStop(0.53,'#8E9AA3'); gr.addColorStop(1,'#4A5560');
  g.fillStyle=gr; g.fillRect(0,0,512,256);
  const sx=330, sy=62, sg=g.createRadialGradient(sx,sy,0,sx,sy,70); sg.addColorStop(0,'rgba(255,250,235,1)'); sg.addColorStop(0.12,'rgba(255,246,222,.9)'); sg.addColorStop(1,'rgba(255,240,210,0)'); g.fillStyle=sg; g.fillRect(sx-70,sy-70,140,140);
  g.globalAlpha=0.5; for(let i=0;i<26;i++){ const x=(i*97)%512, y=58+((i*53)%52), w=40+((i*31)%70); const cg=g.createRadialGradient(x,y,0,x,y,w); cg.addColorStop(0,'rgba(255,255,255,.55)'); cg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=cg; g.fillRect(x-w,y-w*0.4,w*2,w*0.8); }
  const tex=new THREE.CanvasTexture(c); tex.mapping=THREE.EquirectangularReflectionMapping; tex.colorSpace=THREE.SRGBColorSpace;
  const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromEquirectangular(tex).texture; scene.environmentIntensity=0.62; tex.dispose(); pm.dispose(); }
const camera=new THREE.PerspectiveCamera(34,1,0.1,400);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=0.09; controls.minDistance=3; controls.maxDistance=90; controls.maxPolarAngle=Math.PI*0.56;
scene.add(new THREE.HemisphereLight(0xf0f6ff,0x857a6c,0.6));
const sun=new THREE.DirectionalLight(0xfff3e0,2.3); sun.position.set(14,18,13); sun.target.position.set(8,0,0); scene.add(sun,sun.target);
sun.castShadow=true; sun.shadow.mapSize.set(LOWQ?1024:2048,LOWQ?1024:2048); Object.assign(sun.shadow.camera,{left:-7.5,right:7.5,top:7.5,bottom:-7.5,near:1,far:60}); sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.025;
const fill=new THREE.DirectionalLight(0xdfe8ff,0.45); fill.position.set(-14,6,16); scene.add(fill);
const world=new THREE.Group(); scene.add(world);

/* ---------- gemeinsame Shader-Bausteine ---------- */
const U={uK:{value:0},uTau:{value:0},uTime:{value:0},uR:{value:1},uSlide:{value:0}};
/* Rauschen kommt aus einer einmal berechneten, kachelbaren Textur statt aus Rechenformeln je Bildpunkt: das ist um ein Vielfaches
   schneller und flimmert in der Ferne nicht. Kanäle: R weiches Rauschen · G Wolkenrauschen (4 Oktaven) · B Zellen (Kissenlava, Kristalle) · A zweites Wolkenrauschen */
const noiseTex=(()=>{ const N=512, L=64, data=new Uint8Array(N*N*4);
  let seed=20261113; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
  const lattice=n=>{ const a=new Float32Array(n*n); for(let i=0;i<a.length;i++) a[i]=rnd(); return a; };
  const smp=(a,n,u,v)=>{ const x=u*n, y=v*n, i=Math.floor(x), j=Math.floor(y); let fx=x-i, fy=y-j; fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy);
    const i0=i%n, i1=(i+1)%n, j0=(j%n)*n, j1=((j+1)%n)*n; return (a[j0+i0]*(1-fx)+a[j0+i1]*fx)*(1-fy)+(a[j1+i0]*(1-fx)+a[j1+i1]*fx)*fy; };
  const v0=lattice(L), fa=[lattice(L),lattice(2*L),lattice(4*L),lattice(8*L)], fb=[lattice(L),lattice(2*L),lattice(4*L),lattice(8*L)];
  const px=new Float32Array(L*L), py=new Float32Array(L*L); for(let i=0;i<L*L;i++){ px[i]=0.12+0.76*rnd(); py[i]=0.12+0.76*rnd(); }
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const u=x/N, v=y/N, o=(y*N+x)*4; let f1=0, f2=0, am=0.5;
    for(let k=0;k<4;k++){ f1+=am*smp(fa[k],L<<k,u,v); f2+=am*smp(fb[k],L<<k,u,v); am*=0.5; }
    const cx=u*L, cy=v*L, ci=Math.floor(cx), cj=Math.floor(cy); let dm=9;
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){ const ii=(ci+di+L)%L, jj=(cj+dj+L)%L, q=jj*L+ii, dx=ci+di+px[q]-cx, dy=cj+dj+py[q]-cy, d=dx*dx+dy*dy; if(d<dm) dm=d; }
    data[o]=Math.round(255*smp(v0,L,u,v)); data[o+1]=Math.round(255*clamp((f1/0.9375-0.5)*1.25+0.5,0,1)); data[o+2]=Math.round(255*Math.min(1,Math.sqrt(dm)/0.9)); data[o+3]=Math.round(255*clamp((f2/0.9375-0.5)*1.25+0.5,0,1)); }
  const t=new THREE.DataTexture(data,N,N,THREE.RGBAFormat); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearMipmapLinearFilter; t.magFilter=THREE.LinearFilter; t.generateMipmaps=true; t.anisotropy=4; t.needsUpdate=true; return t; })();
U.uNz={value:noiseTex};
const SSTGLSL=`
float sst(float a,float b,float x){ float t=clamp((x-a)/(b-a),0.0,1.0); return t*t*(3.0-2.0*t); }
`;
/* gNrm = Richtung der Fläche: Schnittflächen lesen die Textur in (x,y), Oberseiten in (x,z), Stirnflächen in (z,y) */
const NOISE=`
uniform sampler2D uNz; vec3 gNrm=vec3(0.0,0.0,1.0);
float hash3(vec3 p){ p=fract(p*0.3183099+vec3(0.71,0.113,0.419)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
vec4 nz(vec3 p){ vec3 a=abs(gNrm); vec2 q=(a.z>=a.y&&a.z>=a.x)?p.xy:((a.y>=a.x)?p.xz:p.zy); return texture2D(uNz,q*0.015625); }
float vnoise(vec3 p){ return nz(p).r; }
float fbm(vec3 p){ return nz(p).g; }
float cells(vec3 p){ return nz(p).b; }
float fbm2(vec3 p){ return nz(p).a; }
${SSTGLSL}`;
const DTIP=(-SL0+Math.sqrt(SL0*SL0+4*SLQ*(YTR-YOP)))/(2*SLQ);   // dort endet die Unterseite der kontinentalen Platte auf der abtauchenden Platte
const DEFGLSL=`
float DpF(float x){ float a=(x-(${fl(XU)}))/${fl(DPW)}; float b=(x-(${fl(XSUB)}))/${fl(DPV)}; return (${fl(DPA)}*exp(-a*a)-${fl(DPB)}*exp(-b*b))*sst(-7.0,-6.3,x); }
float HpF(float x){ float a=(x+5.2)/2.6; return 0.25*exp(-a*a)*sst(-7.0,-6.6,x); }
float TzF(float z){ return 0.5+0.5*sst(${fl(-ZR-2.5)},${fl(-ZR)},z); }
/* Mitziehen der kontinentalen Platte im blockierten Abschnitt: Verschiebung entlang der gekrümmten Plattengrenze (landwärts und nach unten).
   Sie ist am Graben null (die Spitze des Keils bleibt am Graben), im blockierten Abschnitt voll und klingt landwärts allmählich ab
   (die Stauchung verteilt sich wie in der Natur über eine lange Strecke). */
float slabY(float d){ return ${fl(YTR)}-${fl(SL0)}*d-${fl(SLQ)}*d*d; }
vec2 dragF(float x,float k){ float d=x-(${fl(XT)}); float w=sst(0.0,${fl(LOCK0+0.5)},d)*(1.0-clamp((d-${fl(LOCK1)})/4.6,0.0,1.0));
  float dl=k*${fl(LOCKDRAG)}*w; float dd=max(d,0.0); return vec2(dl,max(slabY(dd+dl),${fl(YOP)})-max(slabY(dd),${fl(YOP)})); }
`;
const COL={SEAF1:'#77746A',SEAF2:'#A09986',SED1:'#D6CBAF',SED2:'#A99A7B',BAS1:'#333D45',BAS2:'#66747D',DIK1:'#434F58',DIK2:'#65727B',GAB1:'#59656C',GAB2:'#86929A',
  PER1:'#5F7163',PER2:'#87967F',PER3:'#36423A',AST1:'#E0B598',AST2:'#C47B5B',AST3:'#EDA574',
  SAND:'#C9B993',MUD:'#857C6C',BEACH:'#E6D8AE',DUNE1:'#4D6A3A',DUNE2:'#6A834C',F1:'#7FA150',F2:'#97B562',F3:'#6E9246',F4:'#BDB264',F5:'#9C8962',PATH:'#B9AD88',FOR1:'#3F5E33',FOR2:'#5D7A43',WET:'#4E473A',WET2:'#62584A',
  SD1:'#DCCDA8',SD2:'#B49C72',SD3:'#8C7757',GR1:'#C9B6A0',GR2:'#A8937D',GR3:'#463F3B',GR4:'#C08F78',LC1:'#9A8777',LC2:'#77665A',AMB:'#E8960F'};
const COLDEF=Object.entries(COL).map(([k,v])=>`#define C_${k} ${lin(v)}`).join('\n');
const ROCKFRAG=`
vec3 col; float up=vNw.y; gNrm=vNw;
#if KIND<2
 vec3 p=vec3(vS-uSlide,-vDB,vWp.z);     /* das Muster wandert mit der Platte zum Graben und in die Tiefe */
#else
 vec3 p=vP0;                            /* Lage im unverformten Gestein: Schichten und Klüfte verbiegen sich mit der Platte */
#endif
#if KIND==0
 if(up>0.55){ /* Tiefseeboden: feiner Schlamm, Hügelstreifen quer zur Bewegung (wandern mit) */
   float n=fbm(p*2.0); col=mix(C_SEAF1,C_SEAF2,n); col*=0.86+0.28*fbm2(p*9.0);
   col*=0.86+0.26*smoothstep(-0.3,0.3,sin(p.x*3.9+1.6*sin(p.x*1.3)+0.5*sin(p.z*0.7)));
   col=mix(col,C_SEAF2*1.1,smoothstep(0.6,0.8,fbm(p*vec3(0.6,1.0,3.0)))*0.35); }
 else { float d=vDB;
   if(d<0.045){ float st=fbm(vec3(p.x*1.2,d*170.0,p.z*1.2)); col=mix(C_SED1,C_SED2,smoothstep(0.35,0.65,st)); }                       /* Tiefseesedimente */
   else if(d<0.16){ float c=cells(p*13.0), c2=cells(p*31.0+7.0);                                                                        /* Kissenlava: runde Körper mit dunklen Rändern */
     col=mix(C_BAS1*0.7,C_BAS2,smoothstep(0.05,0.4,c)); col*=0.86+0.22*smoothstep(0.1,0.5,c2); col=mix(col,C_BAS2*1.2,smoothstep(0.55,0.85,c)*0.3); }
   else if(d<0.24){ float dk=fbm(vec3(p.x*34.0,p.y*2.0,p.z*34.0)); col=mix(C_DIK1*0.82,C_DIK2*1.08,smoothstep(0.36,0.64,dk)); }          /* Gänge: senkrechte Streifen */
   else { float c=cells(p*21.0); col=mix(C_GAB1*0.8,C_GAB2*1.08,smoothstep(0.12,0.6,c)); col=mix(col,vec3(0.5,0.53,0.52),smoothstep(0.7,0.9,vnoise(p*46.0))*0.35); }   /* Gabbro: grobe Kristalle */
   /* Schollen und Klüfte der ozeanischen Kruste: machen die Bewegung der ganzen Platte sichtbar */
   float blk=sin(p.x*3.9+1.6*sin(p.x*1.3)); col*=0.84+0.28*smoothstep(-0.25,0.25,blk);
   float fr=abs(fract(p.x*1.15+0.06*sin(d*11.0))-0.5); col*=1.0-0.5*smoothstep(0.02,0.0,fr)*step(0.05,d); }
#elif KIND==1
 { float n=fbm(p*2.4); col=mix(C_PER1,C_PER2,n);
   col*=0.84+0.3*smoothstep(0.08,0.6,cells(p*17.0));                                              /* körniges Gefüge (Olivin) */
   col=mix(col,C_PER3,smoothstep(0.76,0.9,vnoise(p*23.0))*0.55);
   col=mix(col,C_PER3,smoothstep(0.58,0.72,fbm2(p*vec3(1.5,5.0,1.5)))*0.42);                      /* dunkle Linsen */
   col*=0.93+0.1*sin(p.y*10.0+fbm(p*vec3(0.7,2.0,0.7))*6.0);                                      /* feine Bänderung */
   col*=0.86+0.26*smoothstep(-0.2,0.2,sin(p.x*2.6+1.1*p.y+1.2*sin(p.x*0.9)));                     /* schräg stehende Schollen */
   float vn=abs(fract(p.x*0.8+0.22*fbm(p*1.3)+0.12*p.y)-0.5); col=mix(col,C_PER2*1.35,smoothstep(0.03,0.0,vn)*0.75); } /* helle Adern */
#elif KIND==2
 { float hot=sst(-4.4,-10.0,p.y); col=mix(C_AST1,C_AST2,hot);                                     /* zähplastischer Mantel: nach unten heißer, mit Fließschlieren */
   float fw=fbm(vec3(p.x*0.5+p.y*0.3,p.y*1.7,p.z*0.5)); col*=0.84+0.34*fw;
   col=mix(col,C_AST3,smoothstep(0.58,0.8,fbm2(vec3(p.x*0.33-p.y*0.2,p.y*1.2,p.z*0.33)))*(0.12+0.3*hot)); col*=0.94+0.1*cells(p*8.0); }
#else
 float jk=1.0;
 if(up>0.55){
   float x=p.x;
   if(x<${fl(XC-0.08)}||p.y<-0.015){ float dep=-p.y; col=mix(C_SAND,C_MUD,sst(0.15,1.6,dep)); col*=0.93+0.07*sin(p.x*45.0+fbm(p*3.0)*9.0); col*=0.84+0.3*fbm(p*6.0); col*=0.92+0.14*fbm2(p*19.0);
      float rip=sin((p.x+0.25*fbm(vec3(p.x*1.3,0.0,p.z*1.3)))*90.0); col*=1.0-0.06*rip*(1.0-sst(0.3,1.2,dep)); }
   else if(x<${fl(XC+0.5)}){ col=C_BEACH*(0.88+0.2*fbm2(p*26.0)); col=mix(col,C_SAND*0.9,sst(0.035,0.0,p.y)*0.6); col*=0.96+0.06*sin(p.x*120.0+fbm(p*4.0)*8.0); }
   else if(x<${fl(XC+1.08)}){ col=mix(C_DUNE1,C_DUNE2,fbm(p*6.0)); col=mix(col,C_BEACH*0.9,sst(0.55,0.75,vnoise(p*9.0))*0.5); col*=0.88+0.2*cells(p*40.0); }
   else if(x<10.72){ vec2 q=vec2(p.x*2.4,p.z*1.6); vec2 cell=floor(q); vec2 fr=fract(q); float h=hash3(vec3(cell,3.0));
      vec3 fc = h<0.3?C_F1: h<0.55?C_F2: h<0.75?C_F3: h<0.9?C_F4: C_F5;
      float rows=0.5+0.5*sin((h<0.5?p.z:p.x)*150.0);
      col=fc*(0.84+0.24*fbm(p*7.0))*(0.93+0.1*rows)*(0.93+0.12*fbm2(p*31.0)); float e=min(min(fr.x,1.0-fr.x)/2.4,min(fr.y,1.0-fr.y)/1.6); col=mix(C_PATH,col,smoothstep(0.010,0.020,e)); }
   else { col=mix(C_FOR1,C_FOR2,fbm(p*5.0)); col*=0.86+0.26*cells(p*26.0); }
   if(vWet>0.001 && x>${fl(XC-0.1)}){ float m=vWet*(0.6+0.4*fbm(p*9.0)); vec3 mud=mix(C_WET,C_WET2,vnoise(p*26.0)); col=mix(col,mix(col*0.55,mud,0.62),m); }
 } else {
   float d=vDB; float n=fbm(p*vec3(1.4,3.0,1.4));
   float lim1=0.34+0.14*fbm2(vec3(p.x*0.4,1.0,p.z*0.4)), lim2=2.5+0.5*(fbm(vec3(p.x*0.22,3.0,p.z*0.22))-0.5);
   if(d<lim1){ /* Sedimentdecke: Schichten folgen der Oberfläche */
     float st=fbm(vec3(p.x*0.45,d*27.0,p.z*0.45)), st2=fbm2(vec3(p.x*0.9,d*74.0,p.z*0.9));
     col=mix(C_SD1,C_SD2,smoothstep(0.34,0.66,st)); col=mix(col,C_SD3,smoothstep(0.6,0.76,st2)*0.5); col*=0.93+0.12*vnoise(p*52.0); }
   else if(d<lim2){ /* obere Kruste: Granit und Gneis mit hellen und dunklen Körnern */
     col=mix(C_GR1,C_GR2,n); col*=0.88+0.2*smoothstep(0.08,0.55,cells(p*27.0));
     col=mix(col,C_GR3,smoothstep(0.8,0.92,vnoise(p*43.0))*0.5); col=mix(col,C_GR4,smoothstep(0.66,0.82,fbm2(p*37.0))*0.35);
     col*=0.92+0.12*sin(p.y*5.0+p.x*1.6+fbm(p*vec3(0.8,1.6,0.8))*7.0); }
   else { /* untere Kruste: dunkler, gebändert */
     col=mix(C_LC1,C_LC2,n); col*=0.86+0.22*smoothstep(0.08,0.6,cells(p*19.0)); col*=0.9+0.12*sin(p.y*16.0+n*7.0+p.x*2.0); }
   col*=1.0-0.4*smoothstep(0.022,0.0,abs(d-lim1)); col*=1.0-0.3*smoothstep(0.035,0.0,abs(d-lim2));
   /* steile Klüfte: Außerhalb der Verformung bleiben sie gerade, im mitgezogenen Plattenrand neigen sie sich – so sieht man, wie die Platte mitgeschleppt wird */
   if(d>lim1){ float jf=abs(fract(p.x*0.9+0.1*fbm(p*0.8)+0.03*p.y)-0.5); jk=1.0-0.5*smoothstep(0.02,0.0,jf); }
 }
 col=mix(col,C_AMB,clamp(vStrain,0.0,0.8)*0.82)*jk;
#endif
diffuseColor.rgb=col;`;
function rockMat(kind,deform){
  const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.94,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  m.defines={KIND:kind,DEFORM:deform?1:0};
  m.onBeforeCompile=sh=>{
    sh.uniforms.uK=U.uK; sh.uniforms.uTau=U.uTau; sh.uniforms.uSlide=U.uSlide; sh.uniforms.uNz=U.uNz;
    sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>
attribute float aDB; attribute float aG; attribute float aWet; attribute float aS;
uniform float uK; uniform float uTau;
varying vec3 vWp; varying vec3 vNw; varying float vDB; varying float vStrain; varying float vWet; varying float vS; varying vec3 vP0;
${SSTGLSL}${DEFGLSL}`)
    .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
#if DEFORM==1
 { float tz=TzF(position.z); float dd=(DpF(position.x+0.01)-DpF(position.x-0.01))/0.02; objectNormal.x+=uK*dd*aG*tz*objectNormal.y; objectNormal=normalize(objectNormal); }
#endif`)
    .replace('#include <begin_vertex>',`#include <begin_vertex>
#if DEFORM==1
 { /* unten wird die Platte voll mitgezogen (entlang der Plattengrenze), oben folgt die Oberfläche der berechneten Senkung und Hebung */
   float tz=TzF(position.z); float fh=1.0-smoothstep(0.42,0.97,aG); vec2 dr=dragF(position.x,uK);
   transformed.x+=(dr.x*fh+uK*HpF(position.x)*aG*0.8)*tz; transformed.y+=(dr.y*fh-uK*DpF(position.x)*(1.0-fh))*tz;
   float sa=(position.x-(${fl(XU+1.0)}))/2.6; vStrain=uK*0.62*exp(-sa*sa)*(0.35+0.65*aG)*tz; vWet=clamp((uTau-aWet)/1.5,0.0,1.0); }
#else
 vStrain=0.0; vWet=0.0;
#endif
 vDB=aDB; vS=aS; vP0=position;`)
    .replace('#include <project_vertex>',`#include <project_vertex>
 vWp=(modelMatrix*vec4(transformed,1.0)).xyz; vNw=normalize(mat3(modelMatrix)*objectNormal);`);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform float uSlide;
varying vec3 vWp; varying vec3 vNw; varying float vDB; varying float vStrain; varying float vWet; varying float vS; varying vec3 vP0;
${NOISE}
${COLDEF}`).replace('#include <color_fragment>',`#include <color_fragment>
{ ${ROCKFRAG} }`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  { /* feines Relief der Gesteinsoberfläche (Höhe aus Rauschen, wie eine Bump-Map) */
    #if KIND<2
    vec3 pb=vec3(vS-uSlide,-vDB,vWp.z);
    #else
    vec3 pb=vP0;
    #endif
    float hb=fbm(pb*7.0)*0.5+fbm2(pb*23.0)*0.3+cells(pb*24.0)*0.2;
    vec3 sx=dFdx(-vViewPosition), sy=dFdy(-vViewPosition); vec3 r1=cross(sy,normal), r2=cross(normal,sx); float det=dot(sx,r1);
    vec3 grad=sign(det)*(dFdx(hb)*r1+dFdy(hb)*r2); normal=normalize(abs(det)*normal-(KIND==2?0.012:0.03)*grad); }`);
  };
  m.customProgramCacheKey=()=>'rock'+kind+(deform?1:0);
  return m;
}

/* ---------- Körper aus Querschnittsprofilen (hohe Auflösung) ---------- */
/* Weg entlang der Oberkante der ozeanischen Platte (Bogenlänge) – Koordinate für die mitwandernden Gesteinsmuster */
const SARC=(()=>{ const n=Math.round((XR-XL)/0.01), a=new Float32Array(n+1); for(let i=1;i<=n;i++){ const x=XL+(i-0.5)*0.01; a[i]=a[i-1]+0.01*Math.sqrt(1+slabSlope(x)**2); } return a; })();
const sArc=x=>{ const f=clamp((x-XL)/0.01,0,SARC.length-1.001), i=Math.floor(f); return SARC[i]+(SARC[i+1]-SARC[i])*(f-i); };
function makeBody({x0,x1,nx,top,bottom,ny=6,nz=1,kind,deform=false}){
  const pos=[],aDB=[],aG=[],idx=[];
  function grid(nu,nv,fn,flip){ const start=pos.length/3;
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){ const [x,y,z,g,db]=fn(i,j); pos.push(x,y,z); aG.push(g); aDB.push(db); }
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){ const a=start+j*(nu+1)+i,b=a+1,d=a+(nu+1),e=d+1; if(flip) idx.push(a,e,b,a,d,e); else idx.push(a,b,e,a,e,d); } }
  const X=i=>x0+(x1-x0)*i/nx;
  const T=(x,z)=>Math.max(YB,top(x,z)), B=x=>Math.max(YB,bottom(x));
  for(const zz of [ZD,-ZD]) grid(nx,ny,(i,j)=>{const x=X(i),b=B(x),t=T(x,zz),y=b+(t-b)*j/ny;return [x,y,zz,j/ny,t-y];});
  grid(nx,nz,(i,k)=>{const x=X(i),z=-ZD+2*ZD*k/nz;return [x,T(x,z),z,1,0];},true);   // Oberseite: Normale zeigt nach oben
  grid(nx,1,(i,k)=>{const x=X(i);return [x,B(x),-ZD+2*ZD*k,0,1];});
  for(const xx of [x0,x1]) grid(ny,nz,(j,k)=>{const z=-ZD+2*ZD*k/nz,b=B(xx),t=T(xx,z),y=b+(t-b)*j/ny;return [xx,y,z,j/ny,t-y];});
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('aDB',new THREE.Float32BufferAttribute(aDB,1));
  geo.setAttribute('aG',new THREE.Float32BufferAttribute(aG,1));
  geo.setAttribute('aWet',new THREE.Float32BufferAttribute(new Float32Array(aG.length).fill(1e9),1));
  { const aS=new Float32Array(aG.length); if(kind<2) for(let v=0;v<aS.length;v++) aS[v]=sArc(pos[v*3]); geo.setAttribute('aS',new THREE.Float32BufferAttribute(aS,1)); }
  geo.setIndex(idx); geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,rockMat(kind,deform)); mesh.receiveShadow=true; mesh.frustumCulled=false; world.add(mesh);
  return {mesh,geo};
}
const crustB=x=>slabTop(x)-0.34*Math.sqrt(1+slabSlope(x)**2);
const lithB=x=>slabTop(x)-1.95*Math.sqrt(1+slabSlope(x)**2);
makeBody({x0:XL,x1:XR,nx:LOWQ?300:460,top:(x,z)=>slabTop(x)+(x<XT?reliefOcean(x,z):0),bottom:crustB,ny:8,nz:LOWQ?60:100,kind:0});
makeBody({x0:XL,x1:XR,nx:300,top:x=>crustB(x),bottom:lithB,ny:6,kind:1});
makeBody({x0:XL,x1:XR,nx:240,top:x=>lithB(x),bottom:()=>YB,ny:8,kind:2});
const XW=(()=>{let lo=XT,hi=XR;for(let i=0;i<60;i++){const m=(lo+hi)/2; if(slabTop(m)>YOP)lo=m;else hi=m;}return (lo+hi)/2;})();
makeBody({x0:XW,x1:XR,nx:140,top:()=>YOP,bottom:slabTop,ny:6,kind:2});
const OP=makeBody({x0:XT,x1:XR,nx:LOWQ?380:640,top:(x,z)=>gRest(x,z),bottom:x=>Math.max(slabTop(x),YOP),ny:18,nz:LOWQ?100:170,kind:3,deform:true});

/* ---------- Plattengrenze, blockierter Abschnitt ---------- */
function curveAlong(d0,d1,n,zz,off=0){ const pts=[]; for(let i=0;i<=n;i++){ const x=xAtDist(d0+(d1-d0)*i/n); pts.push(new THREE.Vector3(x,slabTop(x)+off,zz)); } return new THREE.CatmullRomCurve3(pts); }
const dMax=(()=>{let d=0; while(slabTop(xAtDist(d))>YB+0.05 && d<20) d+=0.05; return d;})();
world.add(new THREE.Mesh(new THREE.TubeGeometry(curveAlong(0,dMax,120,ZD+0.03),200,0.035,8,false),new THREE.MeshBasicMaterial({color:0x1d2224})));
/* Der blockierte Abschnitt haftet an der abtauchenden Platte: Er wird in Phase 1 mit ihr nach unten gezogen und federt beim Beben zurück. */
let lockOff=-1;
/* Röhre entlang der Plattengrenze; ihre Lage wird direkt neu berechnet (kein Neuaufbau der Geometrie in jedem Bild) */
const LSEG=96, LRAD=10, LR=0.09;
const lockGeo=(()=>{ const g=new THREE.BufferGeometry(), n=(LSEG+1)*(LRAD+1); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
  g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(n*3),3)); const uv=new Float32Array(n*2), idx=[];
  for(let i=0;i<=LSEG;i++)for(let j=0;j<=LRAD;j++){ uv[(i*(LRAD+1)+j)*2]=i/LSEG; }
  for(let i=0;i<LSEG;i++)for(let j=0;j<LRAD;j++){ const a=i*(LRAD+1)+j, b=a+1, c=a+LRAD+1, d=c+1; idx.push(a,c,d,a,d,b); }
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(idx); return g; })();
function setLock(off){ const P=lockGeo.attributes.position.array;
  for(let i=0;i<=LSEG;i++){ const x=xAtDist(LOCK0+off+(LOCK1-LOCK0)*i/LSEG), y=slabTop(x), a=Math.atan(slabSlope(x)), nx=-Math.sin(a), ny=Math.cos(a);
    for(let j=0;j<=LRAD;j++){ const f=j/LRAD*Math.PI*2, c=Math.cos(f)*LR, w=Math.sin(f)*LR, o=(i*(LRAD+1)+j)*3; P[o]=x+nx*c; P[o+1]=y+ny*c; P[o+2]=ZD+0.05+w; } }
  lockGeo.attributes.position.needsUpdate=true; }
setLock(0);
const lockMesh=new THREE.Mesh(lockGeo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})); lockMesh.frustumCulled=false; world.add(lockMesh);
/* kleine Zähne zeigen die Verhakung */
const teeth=new THREE.Group(); world.add(teeth);
const toothGeo=new THREE.ConeGeometry(0.1,0.26,4); const toothM=new THREE.MeshBasicMaterial({color:0x8A3F00}), toothM2=new THREE.MeshBasicMaterial({color:0x2B3238});
for(let i=0;i<10;i++){ const m=new THREE.Mesh(toothGeo,i%2?toothM2:toothM); m.userData.f=(i+0.5)/10; teeth.add(m); }
function placeTeeth(off){ teeth.children.forEach((m,i)=>{ const d=LOCK0+off+(LOCK1-LOCK0)*m.userData.f, x=xAtDist(d), a=Math.atan(slabSlope(x));
  m.position.set(x,slabTop(x),ZD+0.07); m.rotation.set(0,0,a+(i%2?0:Math.PI)); }); }
{ const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(XT,slabTop(XT)+0.02,-ZD),new THREE.Vector3(XT,slabTop(XT)+0.02,ZD)]);
  world.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x22282a}))); }

/* ---------- Gestrichelte Linien ---------- */
function dashedLine(pts,color=0x17201b,dash=0.18,gap=0.12){
  const g=new THREE.BufferGeometry().setFromPoints(pts);
  const l=new THREE.Line(g,new THREE.LineDashedMaterial({color,dashSize:dash,gapSize:gap,depthTest:false,transparent:true}));
  l.computeLineDistances(); l.renderOrder=6; world.add(l); return l;
}
const NG=220, ghostRest=[], ghostPre=[];
for(let i=0;i<=NG;i++){ const x=XT+(XC+1.2-XT)*i/NG; ghostRest.push(new THREE.Vector3(x,gRest(x,ZD),ZD+0.06)); ghostPre.push(new THREE.Vector3(x,gRest(x,ZD)-Dpat(x),ZD+0.06)); }
const gRestL=dashedLine(ghostRest), gPreL=dashedLine(ghostPre,0x17201b,0.1,0.08);
const seaLine=dashedLine([new THREE.Vector3(XL,0,ZD+0.06),new THREE.Vector3(XC+0.4,0,ZD+0.06)],0x0b3d91,0.22,0.14);
const gauge=dashedLine([new THREE.Vector3(0,0,ZD+0.08),new THREE.Vector3(0,-1,ZD+0.08)],0xffffff,0.08,0.06); gauge.material.opacity=0.95;
/* Zusätzliches Wasser: unten über dem abgesenkten Meeresboden (Phase 1), oben als Wasserberg (Phase 2/3) */
const BANDN=200;
function bandMesh(color,op){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((BANDN+1)*6),3));
  const idx=[]; for(let i=0;i<BANDN;i++){const a=i*2; idx.push(a,a+2,a+3,a,a+3,a+1);} g.setIndex(idx);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,side:THREE.DoubleSide,depthTest:false})); m.renderOrder=5; m.frustumCulled=false; m.visible=false; world.add(m); return m; }
function edgeLine(color){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((BANDN+1)*3),3));
  const l=new THREE.Line(g,new THREE.LineBasicMaterial({color,depthTest:false,transparent:true})); l.renderOrder=6; l.frustumCulled=false; l.visible=false; world.add(l); return l; }
const colBand=bandMesh(0x22A9E6,0.78), humpBand=bandMesh(0x22A9E6,0.78), colEdge=edgeLine(0x0b4f7a), humpEdge=edgeLine(0x0b4f7a);
function setBand(m,edge,x0,x1,lo,hi,z,op){ const P=m.geometry.attributes.position.array, E=edge.geometry.attributes.position.array;
  for(let i=0;i<=BANDN;i++){ const x=x0+(x1-x0)*i/BANDN; const a=lo(x); let b=hi(x); if(b<a) b=a;
    P[i*6]=x;P[i*6+1]=a;P[i*6+2]=z;P[i*6+3]=x;P[i*6+4]=b;P[i*6+5]=z; E[i*3]=x;E[i*3+1]=(edge===colEdge)?a:b;E[i*3+2]=z; }
  m.geometry.attributes.position.needsUpdate=true; edge.geometry.attributes.position.needsUpdate=true; m.material.opacity=0.78*op; edge.material.opacity=op; m.visible=edge.visible=op>0.01; }

/* ---------- Marker auf der ozeanischen Platte (zeigen die Bewegung) ---------- */
const pathPts=[]; for(let x=XL;x<=5.0;x+=0.02) pathPts.push([x,slabTop(x)]);
const pathLen=[0]; for(let i=1;i<pathPts.length;i++){ const a=pathPts[i-1],b=pathPts[i]; pathLen.push(pathLen[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1])); }
const PL=pathLen[pathLen.length-1];
function pathAt(u){ u=((u%PL)+PL)%PL; let lo=0,hi=pathLen.length-1; while(hi-lo>1){const m=(lo+hi)>>1; if(pathLen[m]<u)lo=m;else hi=m;}
  const f=(u-pathLen[lo])/Math.max(1e-9,pathLen[hi]-pathLen[lo]); const x=lerp(pathPts[lo][0],pathPts[hi][0],f); return {x,y:slabTop(x),a:Math.atan(slabSlope(x))}; }
const markers=[]; const MSP=1.6;
for(let i=0;i<0;i++){ const m=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.9,0.02),new THREE.MeshBasicMaterial({color:0xe9edf0,transparent:true,opacity:0.7}));
  m.userData.u0=i*MSP; world.add(m); markers.push(m); }

/* ---------- Pfeile ---------- */
const arrowGroup=new THREE.Group(); world.add(arrowGroup);
const UP=new THREE.Vector3(0,1,0);
function makeArrow(color,r=0.06){
  const g=new THREE.Group(); const m=new THREE.MeshBasicMaterial({color,transparent:true,depthTest:false});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,12),m); const head=new THREE.Mesh(new THREE.ConeGeometry(r*2.7,r*6,16),m);
  shaft.renderOrder=head.renderOrder=8; g.add(shaft,head); g.userData={shaft,head,m,hl:r*6}; arrowGroup.add(g); g.visible=false; return g;
}
const _v=new THREE.Vector3();
function setArrow(a,from,to,op=1){
  const d=_v.set(to[0]-from[0],to[1]-from[1],to[2]-from[2]); const L=d.length(); if(L<0.05||op<=0.01){a.visible=false;return;}
  a.visible=true; d.normalize(); const hl=Math.min(a.userData.hl,L*0.5), sl=L-hl;
  a.position.set(...from); a.quaternion.setFromUnitVectors(UP,d);
  a.userData.shaft.scale.set(1,sl,1); a.userData.shaft.position.set(0,sl/2,0); a.userData.head.position.set(0,sl+hl/2,0);
  a.userData.m.opacity=op; a.userData.to=to; a.userData.from=from;
}
const C_PLATE=0xA61B1B, C_DEF=0xE08A00, C_FLOOR=0x1E2320, C_WATER=0x1C5FB8;
const A={ plate1:makeArrow(C_PLATE,0.075), plate2:makeArrow(C_PLATE,0.075),
  defDown:makeArrow(C_DEF), defUp:makeArrow(C_DEF), defPush:makeArrow(C_DEF),
  slipOP:makeArrow(C_PLATE,0.05), slipSl:makeArrow(C_PLATE,0.05), spring:makeArrow(C_DEF),
  floorUp:makeArrow(C_FLOOR,0.075), floorDn:makeArrow(C_FLOOR,0.075),
  col1:makeArrow(C_WATER), col2:makeArrow(C_WATER), col3:makeArrow(C_WATER),
  waveR:makeArrow(C_WATER,0.075), waveL:makeArrow(C_WATER,0.075), waveB:makeArrow(C_WATER,0.065),
  flow1:makeArrow(C_WATER,0.07), flow2:makeArrow(C_WATER,0.07), flow3:makeArrow(C_WATER,0.07) };

/* ---------- Erdbebenwellen ---------- */
const rings=[]; for(let i=0;i<3;i++){ const pts=[]; for(let k=0;k<=96;k++){const a=k/96*Math.PI*2; pts.push(new THREE.Vector3(Math.cos(a),Math.sin(a),0));}
  const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xD2232A,transparent:true,depthTest:false}));
  l.renderOrder=7; l.visible=false; world.add(l); rings.push(l); }

