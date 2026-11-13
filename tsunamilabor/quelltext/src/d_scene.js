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
const DPR_MAX=LOWQ?1:Math.min(2,devicePixelRatio||1); let dpr=DPR_MAX; renderer.setPixelRatio(dpr);
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
const U={uK:{value:0},uTau:{value:0},uTime:{value:0},uR:{value:1}};
const NOISE=`
float hash3(vec3 p){ p=fract(p*0.3183099+vec3(0.71,0.113,0.419)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s*1.14; }
float sst(float a,float b,float x){ float t=clamp((x-a)/(b-a),0.0,1.0); return t*t*(3.0-2.0*t); }
`;
const DEFGLSL=`
float DpF(float x){ float a=(x-(${fl(XU)}))/${fl(DPW)}; float b=(x-(${fl(XSUB)}))/${fl(DPV)}; return (${fl(DPA)}*exp(-a*a)-${fl(DPB)}*exp(-b*b))*sst(-7.0,-6.3,x); }
float HpF(float x){ float a=(x+5.2)/2.6; return 0.25*exp(-a*a)*sst(-7.0,-6.6,x); }
float TzF(float z){ return 0.5+0.5*sst(${fl(-ZR-2.5)},${fl(-ZR)},z); }
/* Mitziehen der Plattenunterseite im blockierten Abschnitt (entlang der Plattengrenze nach unten) */
vec2 dragF(float x,float g){ float d=x-(${fl(XT)}); float w=sst(${fl(LOCK0-0.7)},${fl(LOCK0+0.2)},d)*(1.0-sst(${fl(LOCK1-0.2)},${fl(LOCK1+1.4)},d));
  float fall=exp(-g*3.2); float s=-(0.267+0.04*max(d,0.0)); return vec2(1.0,s)*w*fall; }
`;
const COL={SEAF1:'#7F7B70',SEAF2:'#9A9384',SED1:'#CFC3A6',SED2:'#B3A587',BAS1:'#2F383F',BAS2:'#4E5A62',DIK1:'#46525B',DIK2:'#5E6A73',GAB1:'#5F6B72',GAB2:'#7B878D',
  PER1:'#66756A',PER2:'#83907F',PER3:'#3E4A42',AST1:'#DDB59A',AST2:'#C98466',
  SAND:'#C9B993',MUD:'#857C6C',BEACH:'#E6D8AE',DUNE1:'#4D6A3A',DUNE2:'#6A834C',F1:'#7FA150',F2:'#97B562',F3:'#6E9246',F4:'#BDB264',F5:'#9C8962',PATH:'#B9AD88',FOR1:'#3F5E33',FOR2:'#5D7A43',WET:'#4E473A',WET2:'#62584A',
  SD1:'#D7C6A1',SD2:'#B9A47C',GR1:'#C4B099',GR2:'#AE9A84',GR3:'#4E4843',LC1:'#9E8C7B',LC2:'#877565',AMB:'#E8960F'};
const COLDEF=Object.entries(COL).map(([k,v])=>`#define C_${k} ${lin(v)}`).join('\n');
const ROCKFRAG=`
vec3 col; vec3 p=vWp; float up=vNw.y;
#if KIND==0
 if(up>0.55){ float n=fbm(p*2.0); col=mix(C_SEAF1,C_SEAF2,n); col*=0.88+0.24*vnoise(p*14.0); }
 else { float d=vDB; float n=fbm(p*3.0);
   if(d<0.05){ col=mix(C_SED1,C_SED2,0.5+0.5*sin((d+n*0.015)*300.0)); }
   else if(d<0.17){ float bl=fbm(p*vec3(10.0,14.0,10.0)); col=mix(C_BAS1,C_BAS2,smoothstep(0.42,0.58,bl)); col*=0.86+0.28*vnoise(p*30.0); }
   else if(d<0.25){ col=mix(C_DIK1,C_DIK2,0.5+0.5*sin(p.x*38.0+n*7.0)); }
   else { col=mix(C_GAB1,C_GAB2,vnoise(p*26.0)); } }
#elif KIND==1
 { float n=fbm(p*2.4); col=mix(C_PER1,C_PER2,n); col=mix(col,C_PER3,smoothstep(0.78,0.9,vnoise(p*22.0))*0.6); }
#elif KIND==2
 { float n=fbm(p*vec3(0.6,1.3,0.6)); col=mix(C_AST1,C_AST2,sst(-4.5,-10.0,p.y)); col*=0.92+0.16*n; }
#else
 if(up>0.55){
   float x=p.x;
   if(x<${fl(XC-0.08)}||p.y<-0.015){ float dep=-p.y; col=mix(C_SAND,C_MUD,sst(0.15,1.6,dep)); col*=0.93+0.07*sin(p.x*45.0+fbm(p*3.0)*9.0); col*=0.86+0.28*fbm(p*6.0);
      float rip=sin((p.x+0.25*fbm(vec3(p.xz*1.3,0.0)))*90.0); col*=1.0-0.05*rip*(1.0-sst(0.3,1.2,dep)); }
   else if(x<${fl(XC+0.5)}){ col=C_BEACH*(0.9+0.14*vnoise(p*60.0)); col=mix(col,C_SAND*0.9,sst(0.035,0.0,p.y)*0.6); }
   else if(x<${fl(XC+1.08)}){ col=mix(C_DUNE1,C_DUNE2,fbm(p*6.0)); col=mix(col,C_BEACH*0.9,sst(0.55,0.75,vnoise(p*9.0))*0.5); }
   else if(x<10.72){ vec2 q=vec2(p.x*2.4,p.z*1.6); vec2 cell=floor(q); vec2 fr=fract(q); float h=hash3(vec3(cell,3.0));
      vec3 fc = h<0.3?C_F1: h<0.55?C_F2: h<0.75?C_F3: h<0.9?C_F4: C_F5;
      float rows=0.5+0.5*sin((h<0.5?p.z:p.x)*150.0);
      col=fc*(0.86+0.2*fbm(p*7.0))*(0.94+0.08*rows); float e=min(min(fr.x,1.0-fr.x)/2.4,min(fr.y,1.0-fr.y)/1.6); col=mix(C_PATH,col,smoothstep(0.010,0.020,e)); }
   else { col=mix(C_FOR1,C_FOR2,fbm(p*5.0)); col*=0.9+0.2*vnoise(p*30.0); }
   if(vWet>0.001 && x>${fl(XC-0.1)}){ float m=vWet*(0.6+0.4*fbm(p*9.0)); vec3 mud=mix(C_WET,C_WET2,vnoise(p*26.0)); col=mix(col,mix(col*0.55,mud,0.62),m); }
 } else {
   float d=vDB; float n=fbm(p*vec3(1.4,3.0,1.4));
   if(d<0.34){ float band=sin((p.y+n*0.22+0.12*sin(p.x*0.6))*58.0); col=mix(C_SD1,C_SD2,0.5+0.5*band); }
   else if(d<2.4){ col=mix(C_GR1,C_GR2,n); float sp=vnoise(p*38.0); col=mix(col,C_GR3,smoothstep(0.84,0.93,sp)*0.4); }
   else { col=mix(C_LC1,C_LC2,n); col*=0.94+0.06*sin(p.y*18.0+n*6.0); }
 }
 col=mix(col,C_AMB,clamp(vStrain,0.0,0.8));
#endif
diffuseColor.rgb=col;`;
function rockMat(kind,deform){
  const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.94,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  m.defines={KIND:kind,DEFORM:deform?1:0};
  m.onBeforeCompile=sh=>{
    sh.uniforms.uK=U.uK; sh.uniforms.uTau=U.uTau;
    sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>
attribute float aDB; attribute float aG; attribute float aWet;
uniform float uK; uniform float uTau;
varying vec3 vWp; varying vec3 vNw; varying float vDB; varying float vStrain; varying float vWet;
${NOISE}${DEFGLSL}`)
    .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
#if DEFORM==1
 { float tz=TzF(position.z); float dd=(DpF(position.x+0.01)-DpF(position.x-0.01))/0.02; objectNormal.x+=uK*dd*aG*tz*objectNormal.y; objectNormal=normalize(objectNormal); }
#endif`)
    .replace('#include <begin_vertex>',`#include <begin_vertex>
#if DEFORM==1
 { float tz=TzF(position.z); transformed.x+=uK*HpF(position.x)*aG*tz*0.8; transformed.y-=uK*DpF(position.x)*aG*tz; transformed.xy+=uK*0.9*dragF(position.x,aG)*tz;
   float sa=(position.x-(${fl(XU+1.0)}))/2.6; vStrain=uK*0.62*exp(-sa*sa)*(0.35+0.65*aG)*tz; vWet=clamp((uTau-aWet)/1.5,0.0,1.0); }
#else
 vStrain=0.0; vWet=0.0;
#endif
 vDB=aDB;`)
    .replace('#include <project_vertex>',`#include <project_vertex>
 vWp=(modelMatrix*vec4(transformed,1.0)).xyz; vNw=normalize(mat3(modelMatrix)*objectNormal);`);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vWp; varying vec3 vNw; varying float vDB; varying float vStrain; varying float vWet;
${NOISE}
${COLDEF}`).replace('#include <color_fragment>',`#include <color_fragment>
{ ${ROCKFRAG} }`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  { /* feines Relief der Gesteinsoberfläche (Höhe aus Rauschen, wie eine Bump-Map) */
    float hb=fbm(vWp*7.0)*0.6+vnoise(vWp*27.0)*0.4;
    vec3 sx=dFdx(-vViewPosition), sy=dFdy(-vViewPosition); vec3 r1=cross(sy,normal), r2=cross(normal,sx); float det=dot(sx,r1);
    vec3 grad=sign(det)*(dFdx(hb)*r1+dFdy(hb)*r2); normal=normalize(abs(det)*normal-(KIND==2?0.012:0.03)*grad); }`);
  };
  m.customProgramCacheKey=()=>'rock'+kind+(deform?1:0);
  return m;
}

/* ---------- Körper aus Querschnittsprofilen (hohe Auflösung) ---------- */
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
  geo.setIndex(idx); geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,rockMat(kind,deform)); mesh.receiveShadow=true; mesh.frustumCulled=false; world.add(mesh);
  return {mesh,geo};
}
const crustB=x=>slabTop(x)-0.34*Math.sqrt(1+slabSlope(x)**2);
const lithB=x=>slabTop(x)-1.45*Math.sqrt(1+slabSlope(x)**2);
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
function lockGeoFor(off){ const g=new THREE.TubeGeometry(curveAlong(LOCK0+off,LOCK1+off,60,ZD+0.05),120,0.09,10,false);
  g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3),3)); return g; }
let lockGeo=lockGeoFor(0);
const lockMesh=new THREE.Mesh(lockGeo,new THREE.MeshBasicMaterial({vertexColors:true})); world.add(lockMesh);
/* kleine Zähne zeigen die Verhakung */
const teeth=new THREE.Group(); world.add(teeth);
const toothGeo=new THREE.ConeGeometry(0.06,0.16,4); const toothM=new THREE.MeshBasicMaterial({color:0x9A4A00});
for(let i=0;i<7;i++){ const m=new THREE.Mesh(toothGeo,toothM); m.userData.f=(i+0.5)/7; teeth.add(m); }
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
for(let i=0;i<Math.ceil(PL/MSP);i++){ const m=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.9,0.02),new THREE.MeshBasicMaterial({color:0xe9edf0,transparent:true,opacity:0.7}));
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

