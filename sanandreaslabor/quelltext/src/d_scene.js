/* ============================================================================================
   d_scene.js – three.js-Szene: drei Maßstäbe mit echtem Gelände (USGS 3DEP) und Luftbildern,
   Verformung im Shader, Gesteinsschnittflächen, Pfeile, Verwerfungslinie
   ============================================================================================ */
const QS=new URLSearchParams(location.search);
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOWQ=QS.has('low');
const $=id=>document.getElementById(id);
const state={t:0,playing:false,speed:1,stopEach:true,labels:true,lvl:'imp',arrows:true,lines:true,fault:true,creek:true,shake:true,autoCam:true,mode:'creep',view:'oblique',stopAt:null,dirty:true,film:false};

const vp=$('viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
const DPR_MAX=LOWQ?1:Math.min(2,devicePixelRatio||1); let dpr=Math.min(DPR_MAX,1.5); renderer.setPixelRatio(dpr);
renderer.toneMapping=THREE.NeutralToneMapping; renderer.toneMappingExposure=1.0;
vp.insertBefore(renderer.domElement,vp.firstChild);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,1,0.05,400);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=0.09; controls.minDistance=2.2; controls.maxDistance=95; controls.maxPolarAngle=Math.PI*0.62; controls.zoomSpeed=0.9;
const SUN=new THREE.Vector3(-0.42,0.74,-0.52).normalize();

/* ---------- Bilder laden: Luftbild, Normalen (für das Licht), Höhen ---------- */
const IMG={}, HF={};
function loadImg(src){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im);
  im.onerror=()=>{ /* Ersatzweg, falls eine Seite eingebettete Bilddaten sperrt: dieselben Bytes als Blob laden */
    try{ const i=src.indexOf(','), mime=src.slice(5,src.indexOf(';')), bin=atob(src.slice(i+1)), u8=new Uint8Array(bin.length); for(let k=0;k<bin.length;k++) u8[k]=bin.charCodeAt(k);
      const url=URL.createObjectURL(new Blob([u8],{type:mime})), im2=new Image(); im2.onload=()=>{ URL.revokeObjectURL(url); res(im2); }; im2.onerror=()=>rej(new Error('Ein Bild konnte nicht gelesen werden.')); im2.src=url; }
    catch(e){ rej(new Error('Ein Bild konnte nicht gelesen werden.')); } };
  im.src=src; }); }
async function loadAssets(onProg){ const keys=Object.keys(SA_TEX); let n=0;
  for(const k of keys){ IMG[k]=await loadImg(SA_TEX[k]); n++; onProg&&onProg(n/keys.length); await new Promise(r=>setTimeout(r,0)); }
  for(const key of ['W','A','B','C']){ const M=SA_META[key], im=IMG[key+'_hgt']; const cv=document.createElement('canvas'); cv.width=im.width; cv.height=im.height; const g=cv.getContext('2d',{willReadFrequently:true}); g.drawImage(im,0,0);
    const px=g.getImageData(0,0,im.width,im.height).data, n2=im.width*im.height, d=new Float32Array(n2);
    for(let i=0;i<n2;i++) d[i]=M.hmin+((px[i*4]<<8)|px[i*4+1])/65535*M.hrng;
    const W=im.width,H=im.height;
    HF[key]={W,H,d,sample(s,w){ let x=(s-M.s0)/(M.s1-M.s0)*W-0.5, y=(w-M.w0)/(M.w1-M.w0)*H-0.5; x=clamp(x,0,W-1.001); y=clamp(y,0,H-1.001); const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,o=j*W+i;
      return (d[o]*(1-fx)+d[o+1]*fx)*(1-fy)+(d[o+W]*(1-fx)+d[o+W+1]*fx)*fy; }}; }
}
function tex(img,srgb){ const t=new THREE.Texture(img); t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace; t.flipY=false; t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; t.minFilter=THREE.LinearMipmapLinearFilter; t.magFilter=THREE.LinearFilter; t.generateMipmaps=true; t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); t.needsUpdate=true; return t; }

/* ---------- Shader ---------- */
const GL_NOISE=`
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y); }
float fbm(vec2 p){ return 0.5*vn(p)+0.25*vn(p*2.03+7.1)+0.125*vn(p*4.01+3.3)+0.0625*vn(p*8.1+1.7); }
`;
/* Verformung: dieselbe Formel wie dispU() im Rechenmodell – so passen Beschriftungen und Pfeile genau zum Gelände */
const GL_DEFORM=`
uniform float uSide,uF,uS0,uS1,uFront,uRise,uLock,uWaveR,uWaveAmp,uWaveK; uniform vec2 uTan,uEpi;
attribute float aD; attribute float aDepth;
varying float vD; varying float vDepth; varying vec2 vMat; varying float vSdef; varying float vSlipK; varying float vWave; varying vec3 vView;
vec3 deform(vec3 p){
  float Le=max(uLock-aDepth,1e-5);
  float a=atan(abs(aD),Le)*0.63661977;
  float kf=smoothstep(0.0,uRise,uFront-p.x);
  float S=mix(uS0,uS1,kf);
  float Uu=-uSide*(0.5*uF*a+0.5*S*(1.0-a));
  p.xz+=Uu*uTan;
  vSlipK=kf;
  float r=distance(p.xz,uEpi), ph=uWaveR-r;
  float env=smoothstep(0.0,0.5,ph)*exp(-max(ph,0.0)*0.38);
  float wv=sin(ph*uWaveK)*env/(1.0+0.1*r);
  p.y+=wv*uWaveAmp*exp(-aDepth*1.5);
  vWave=wv;
  return p;
}`;
const VS_TOP=`
${GL_DEFORM}
varying vec2 vUv;
void main(){ vUv=uv; vD=aD; vDepth=aDepth; vMat=position.xz; vec3 p=deform(position); vSdef=p.x;
  vec4 mv=modelViewMatrix*vec4(p,1.0); vView=mv.xyz; gl_Position=projectionMatrix*mv; }`;
const FS_TOP=`
uniform sampler2D tAlb,tNrm,tMask,tPlt; uniform float uPltK; uniform vec3 uSun,uHazeCol; uniform float uNrmK,uDetail,uHaze,uSide,uFront,uRise,uSunK;
uniform float uStr,uLineSp,uLineOn,uLineRef,uLineW,uFaultOn,uFaultW,uTense,uGlow,uFlash,uCreekOn,uCreekW,uWaveTint,uDim; uniform vec2 uCreekSeg;
varying vec2 vUv; varying float vD; varying vec2 vMat; varying float vSdef; varying float vSlipK; varying float vWave; varying vec3 vView;
${GL_NOISE}
void main(){
  vec3 alb=texture2D(tAlb,vUv).rgb;
  if(uDetail>0.0){ float n1=vn(vMat*uDetail)*0.6+vn(vMat*uDetail*3.7+11.0)*0.4; alb*=0.9+0.2*n1; }
  vec3 nt=texture2D(tNrm,vUv).xyz*2.0-1.0; vec3 n=normalize(vec3(nt.x*uNrmK,nt.y,nt.z*uNrmK));
  float dif=max(dot(n,uSun),0.0);
  vec3 col=alb*(vec3(1.0,0.96,0.88)*dif*uSunK+vec3(0.55,0.64,0.78)*(0.26+0.2*n.y));
  if(uPltK>0.0){ float id=floor(texture2D(tPlt,vUv).r*255.0/40.0+0.5);
    vec3 pc=id<0.5?col:(id<1.5?vec3(0.30,0.52,1.0):(id<2.5?vec3(1.0,0.70,0.32):(id<3.5?vec3(0.30,0.92,0.55):vec3(1.0,0.45,0.78))));
    float lum=dot(col,vec3(0.3,0.59,0.11)); col=mix(col,pc*(0.35+lum*1.25),uPltK*step(0.5,id)); }
  col*=1.0+vWave*uWaveTint; col+=vec3(1.0,0.86,0.62)*max(vWave,0.0)*uWaveTint*0.2;
  /* Messlinien: im Gestein „aufgemalt“, sie verformen sich mit */
  if(uLineOn>0.0){ float sl=vMat.x+uSide*uLineRef; float f=abs(fract(sl/uLineSp+0.5)-0.5)*uLineSp; float aa=fwidth(sl)*1.3; float halo=1.0-smoothstep(uLineW*1.9,uLineW*1.9+aa*1.5,f); float ln=1.0-smoothstep(uLineW,uLineW+aa,f); col=mix(col,vec3(0.06,0.05,0.03),halo*0.55*uLineOn); col=mix(col,vec3(1.0,0.9,0.55),ln*uLineOn); }
  /* Verwerfung */
  float ad=abs(vD), fw=fwidth(vD)*1.4;
  float fl=(1.0-smoothstep(uFaultW,uFaultW+fw,ad))*uFaultOn;
  float g=exp(-pow((vMat.x-uFront)/(uRise*0.9),2.0))*uGlow;
  vec3 fc=mix(vec3(0.03,0.03,0.035),vec3(0.95,0.55,0.08),uTense*(1.0-vSlipK));
  fc=mix(fc,vec3(0.86,0.88,0.9),vSlipK*0.55*step(0.001,uGlow+uTense));
  col=mix(col,fc,fl);
  float halo=exp(-ad/(uFaultW*7.0));
  col+=vec3(1.0,0.34,0.12)*g*halo*2.2+vec3(1.0,0.45,0.15)*uFlash*halo*1.6+vec3(0.9,0.5,0.1)*uTense*(1.0-vSlipK)*exp(-ad/(uFaultW*3.5))*0.35*uFaultOn;
  col=mix(col,vec3(1.0,0.22,0.10)*(0.55+0.45*dot(col,vec3(0.33))),uStr*uTense*0.55/(1.0+pow(ad/(uFaultW*42.0),2.0)));
  if(uCreekOn>0.0){ float m=smoothstep(0.18,0.62,texture2D(tMask,vUv).r); float seg=(1.0-smoothstep(uCreekW*0.6,uCreekW,ad))*step(uCreekSeg.x,vSdef)*step(vSdef,uCreekSeg.y); m=max(m,seg)*uCreekOn; col=mix(col,vec3(0.03,0.26,0.9),m*0.9); }
  float dist=length(vView); col=mix(col,uHazeCol,1.0-exp(-dist*uHaze));
  col*=uDim;
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const VS_WALL=`
${GL_DEFORM}
attribute vec2 aRock; attribute float aType;
varying vec2 vRock; varying vec3 vN; varying float vType;
void main(){ vD=aD; vDepth=aDepth; vMat=position.xz; vRock=aRock; vType=aType; vN=normal; vec3 p=deform(position); vSdef=p.x;
  vec4 mv=modelViewMatrix*vec4(p,1.0); vView=mv.xyz; gl_Position=projectionMatrix*mv; }`;
const FS_WALL=`
uniform vec3 uSun,uHazeCol; uniform float uStr,uPal,uSide,uKm,uLock,uFaultW,uTense,uGlow,uHaze,uDim,uFront,uRise,uFaultOn;
varying vec2 vRock; varying vec3 vN; varying float vType; varying float vD; varying float vDepth; varying float vSlipK; varying vec3 vView; varying vec2 vMat;
${GL_NOISE}
void main(){
  vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n;
  float lit=max(dot(n,uSun),0.0)*0.9+0.5+0.12*n.y;
  vec3 col;
  float dk=vDepth/uKm;                       /* Tiefe in km */
  vec2 q=vec2(vRock.x/uKm,dk);
  if(uPal<0.5){ col=vec3(0.085,0.1,0.12)*(0.8+0.4*vn(q*0.02)); }
  else if(uPal<1.5){
    /* Regionalmodell: obere Kruste mit Sedimenten, kristallines Gestein, darunter heißes, verformbares Gestein */
    float w1=fbm(q*vec2(0.09,0.5)+uSide*7.0), w2=fbm(q*vec2(0.5,1.8)+3.0);
    float sed=2.2+1.6*w1+(uSide>0.0?1.2:0.0);
    vec3 cSed=mix(vec3(0.62,0.54,0.40),vec3(0.50,0.42,0.31),fract((dk+w2*0.5)*3.2));
    vec3 cA=uSide<0.0?mix(vec3(0.60,0.50,0.47),vec3(0.50,0.42,0.40),w2):mix(vec3(0.42,0.47,0.44),vec3(0.34,0.39,0.38),w2);
    float grain=vn(q*9.0)*0.5+vn(q*23.0)*0.5; cA*=0.86+0.28*grain;
    float crack=smoothstep(0.035,0.0,abs(fract(q.x*0.21+w1*1.7+dk*0.12)-0.5))*0.35; cA*=1.0-crack;
    vec3 cDeep=(uSide<0.0?vec3(0.36,0.27,0.25):vec3(0.25,0.28,0.29))*(0.85+0.3*fbm(q*vec2(0.16,2.6)+dk));
    col=mix(cSed,cA,smoothstep(sed-0.25,sed+0.25,dk));
    col=mix(col,cDeep,smoothstep(13.0,17.5,dk));
    col*=1.0-0.2*smoothstep(0.0,25.0,dk);
    if(vType<1.5){ /* Verwerfungsfläche: geglättetes Gestein mit Rutschstreifen in Bewegungsrichtung */
      float stri=vn(vec2(q.x*0.04,dk*5.0))*0.6+vn(vec2(q.x*0.15,dk*17.0))*0.4;
      col=mix(vec3(0.50,0.47,0.44),vec3(0.36,0.34,0.33),smoothstep(10.0,20.0,dk))*(0.82+0.32*stri); lit=max(lit,0.85); }
    if(vType>3.5){ col=cDeep*0.95; lit=max(lit,0.7); }
    if(vType>2.5&&vType<3.5){ /* Schnittfläche quer zur Verwerfung: verhakter Bereich mit Zähnen, darunter glattes Gleiten */
      float ad=abs(vD), fw=fwidth(vD)*1.5, lockK=1.0-smoothstep(uLock*0.96,uLock*1.04,vDepth);
      float tooth=abs(fract(dk*0.75)-0.5)*2.0;
      float wd=mix(uFaultW*0.55,uFaultW*(1.2+2.6*tooth),lockK);
      float fl=1.0-smoothstep(wd,wd+fw,ad);
      vec3 fc=mix(vec3(0.03,0.03,0.035),mix(vec3(0.95,0.55,0.08),vec3(1.0,0.2,0.08),uGlow),lockK*max(uTense,uGlow)*(1.0-vSlipK*(1.0-uGlow)));
      fc=mix(fc,vec3(0.72,0.75,0.78),lockK*vSlipK*(1.0-uGlow)*0.8);
      col=mix(col,fc,fl*uFaultOn);
      col+=vec3(0.95,0.5,0.1)*lockK*uTense*(1.0-vSlipK)*exp(-ad/(uFaultW*5.0))*0.3*uFaultOn;
      col=mix(col,vec3(1.0,0.22,0.10)*0.6,uStr*uTense*0.5*lockK/(1.0+pow(ad/(uFaultW*42.0),2.0)));
    }
  } else {
    /* Wallace Creek: Boden, Schwemmfächer-Ablagerungen, Sandstein */
    float dm=dk*1000.0; vec2 qm=q*1000.0;
    float w1=fbm(qm*vec2(0.012,0.06)+uSide*5.0), w2=fbm(qm*vec2(0.05,0.2)+9.0);
    float lay=fract((dm+w1*26.0+(uSide>0.0?qm.x*0.06:-qm.x*0.02))*0.045);
    vec3 cAll=mix(vec3(0.63,0.53,0.38),vec3(0.52,0.43,0.30),smoothstep(0.35,0.65,lay));
    float peb=smoothstep(0.62,0.9,vn(qm*0.9))*0.25; cAll*=1.0-peb*0.5+0.12*vn(qm*3.0);
    vec3 cSand=(uSide<0.0?vec3(0.56,0.50,0.42):vec3(0.50,0.44,0.36))*(0.85+0.3*w2);
    cSand*=1.0-0.3*smoothstep(0.04,0.0,abs(fract((dm+w1*40.0)*0.02)-0.5));
    col=mix(cAll,cSand,smoothstep(45.0,70.0,dm+w1*30.0));
    col=mix(vec3(0.27,0.21,0.14),col,smoothstep(1.5,5.0,dm));
    col*=1.0-0.22*smoothstep(0.0,230.0,dm);
    if(vType>2.5&&vType<3.5){ float ad=abs(vD), fw=fwidth(vD)*1.5; float gouge=1.0-smoothstep(uFaultW*2.2,uFaultW*4.5,ad+uFaultW*1.5*vn(qm*0.25)); col=mix(col,vec3(0.36,0.34,0.32),gouge*0.6);
      float fl=1.0-smoothstep(uFaultW*0.5,uFaultW*0.5+fw,ad); col=mix(col,vec3(0.03,0.03,0.035),fl*uFaultOn); }
  }
  col*=lit;
  float dist=length(vView); col=mix(col,uHazeCol,1.0-exp(-dist*uHaze));
  col*=uDim;
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* ---------- Aufbau eines Maßstabs ---------- */
const G={};          // Gruppen je Maßstab
const UNI={};        // gemeinsame Uniforms je Maßstab
const DEF={W:{F:0,S0:0,S1:0,front:1e9},A:{F:0,S0:0,S1:0,front:1e9},B:{F:0,S0:0,S1:0,front:1e9},C:{F:0,S0:0,S1:0,front:1e9}};   // aktuelle Verformung in Metern (für Beschriftungen)
function buildScale(key){
  const S=SCL[key], M=SA_META[key], hf=HF[key], k=S.k, zk=S.zex*k;
  S.href=key==='C'?hf.sample(0,S.wfA):0;
  S.X=s=>(s-S.sc)*k; S.Z=w=>(w-S.wc)*k; S.Y=(s,w)=>(hf.sample(s,w)-S.href)*zk; S.yBot=-S.depth*k-(key==='C'?0:0);
  const grp=new THREE.Group(); grp.visible=false; scene.add(grp); G[key]=grp;
  const exag=key==='B'?XB:1; S.exag=exag;
  const U={ uF:{value:0},uS0:{value:0},uS1:{value:0},uFront:{value:1e9},uRise:{value:(key==='B'?RISE_B:60)*k},uLock:{value:LOCKD*k},
    uWaveR:{value:-10},uWaveAmp:{value:0},uWaveK:{value:5.2},uTan:{value:new THREE.Vector2(S.tan[0],S.tan[1])},uEpi:{value:new THREE.Vector2(0,0)},
    uSun:{value:SUN},uHazeCol:{value:new THREE.Color(0x0B1420)},uHaze:{value:key==='A'||key==='W'?0.004:(key==='B'?0.0055:0.004)},uDim:{value:1},
    uLineSp:{value:(key==='B'?25000:(key==='C'?250:1e9))*k},uLineOn:{value:0},uLineRef:{value:0},uLineW:{value:(key==='B'?300:2.4)*k},
    uFaultOn:{value:key==='A'||key==='W'?0:1},uFaultW:{value:(key==='B'?330:1.7)*k},uTense:{value:0},uStr:{value:key==='B'?1:0},uGlow:{value:0},uFlash:{value:0},
    uCreekOn:{value:0},uCreekW:{value:7.5*k},uCreekSeg:{value:new THREE.Vector2(1,0)},uWaveTint:{value:0},
    uKm:{value:1000*k},uSunK:{value:key==='C'?1.05:(key==='B'?1.3:1.25)},uPal:{value:key==='A'||key==='W'?0:(key==='B'?1:2)},uPltK:{value:0} };
  UNI[key]=U;
  const tAlb=tex(IMG[key+'_alb'],true), tNrm=tex(IMG[key+'_nrm'],false), tMask=key==='C'?tex(IMG.C_creek,false):tNrm;
  let tPlt=tNrm; if(key==='W'){ tPlt=tex(IMG.W_plt,false); tPlt.minFilter=tPlt.magFilter=THREE.NearestFilter; tPlt.generateMipmaps=false; U.uPltK.value=0.3; }
  const nrmK=key==='C'?S.zex/1.0:1.0;
  const uvOf=(s,w)=>[(s-M.s0)/(M.s1-M.s0),(w-M.w0)/(M.w1-M.w0)];
  const sides=S.split?[1,-1]:[0];
  for(const side of sides){
    const NS=key==='C'?(LOWQ?240:420):(key==='B'?280:(key==='W'?320:340)), NW=key==='C'?(LOWQ?70:128):(key==='B'?100:(key==='W'?150:190));
    const wEdge=side>0?S.bw1:S.bw0, wStart=s=>side===0?S.bw0:S.wf(s), wEnd=s=>side===0?S.bw1:wEdge;
    const nv=(NS+1)*(NW+1), pos=new Float32Array(nv*3), uv=new Float32Array(nv*2), aD=new Float32Array(nv), aDp=new Float32Array(nv); let o=0;
    for(let j=0;j<=NW;j++)for(let i=0;i<=NS;i++){ const s=lerp(S.bs0,S.bs1,i/NS), b=j/NW, w=lerp(wStart(s),wEnd(s),b);
      pos[o*3]=S.X(s); pos[o*3+1]=S.Y(s,w); pos[o*3+2]=S.Z(w); const q=uvOf(s,w); uv[o*2]=q[0]; uv[o*2+1]=q[1]; aD[o]=(w-S.wf(s))*k; o++; }
    const idx=new Uint32Array(NS*NW*6); let p=0; const flip=side<0;
    for(let j=0;j<NW;j++)for(let i=0;i<NS;i++){ const a=j*(NS+1)+i,b=a+1,c=a+NS+1,d=c+1; if(flip){ idx[p++]=a;idx[p++]=b;idx[p++]=c; idx[p++]=b;idx[p++]=d;idx[p++]=c; } else { idx[p++]=a;idx[p++]=c;idx[p++]=b; idx[p++]=b;idx[p++]=c;idx[p++]=d; } }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('uv',new THREE.BufferAttribute(uv,2)); geo.setAttribute('aD',new THREE.BufferAttribute(aD,1)); geo.setAttribute('aDepth',new THREE.BufferAttribute(aDp,1)); geo.setIndex(new THREE.BufferAttribute(idx,1));
    const mat=new THREE.ShaderMaterial({vertexShader:VS_TOP,fragmentShader:FS_TOP,side:THREE.DoubleSide,
      uniforms:{...U,uSide:{value:side},tAlb:{value:tAlb},tNrm:{value:tNrm},tMask:{value:tMask},tPlt:{value:tPlt},uPltK:U.uPltK,uNrmK:{value:nrmK},uDetail:{value:key==='C'?1/(2.5*k):0}}});
    const mesh=new THREE.Mesh(geo,mat); mesh.frustumCulled=false; grp.add(mesh);
    /* Schnittflächen */
    const NK=key==='B'?26:(key==='C'?10:2), wp=[],wn=[],wd=[],wdp=[],wr=[],wt=[],wi=[]; let base=0;
    const wall=(pts,nx,nz,type,hc)=>{ const n=pts.length;
      for(let i=0;i<n;i++){ const [s,w]=pts[i], yT=S.Y(s,w);
        for(let r=0;r<=NK;r++){ const f=r/NK; wp.push(S.X(s),lerp(yT,S.yBot,f),S.Z(w)); wn.push(nx,0,nz); wd.push((type===1?1:(Math.abs(w-S.wf(s))<1?(side||1):(w-S.wf(s))))*k); wdp.push(f*S.depth*k); wr.push(hc(s,w)*k,f*S.depth*k); wt.push(type); } }
      for(let i=0;i<n-1;i++)for(let r=0;r<NK;r++){ const a=base+i*(NK+1)+r,b=a+1,c=a+NK+1,d=c+1; wi.push(a,c,b,b,c,d); }
      base+=n*(NK+1); };
    const along=(w0f,n)=>Array.from({length:n+1},(_,i)=>{ const s=lerp(S.bs0,S.bs1,i/n); return [s,w0f(s)]; });
    const across=(s,n)=>Array.from({length:n+1},(_,i)=>[s,lerp(wStart(s),wEnd(s),i/n)]);
    const nA=key==='A'||key==='W'?120:160, nC=key==='A'||key==='W'?60:110;
    if(side!==0) wall(along(s=>S.wf(s),nA),0,-side,1,(s,w)=>s);
    wall(along(s=>side===0?S.bw1:wEdge,nA),0,side===0?1:side,2,(s,w)=>s);
    if(side===0) wall(along(s=>S.bw0,nA),0,-1,2,(s,w)=>s);
    wall(across(S.bs0,nC),-1,0,3,(s,w)=>w); wall(across(S.bs1,nC),1,0,3,(s,w)=>w);
    { /* Unterseite: der Block ist geschlossen */ const nb=8;
      for(let i=0;i<=nA;i++){ const s=lerp(S.bs0,S.bs1,i/nA); for(let j=0;j<=nb;j++){ const w=lerp(wStart(s),wEnd(s),j/nb), dd=w-S.wf(s);
        wp.push(S.X(s),S.yBot,S.Z(w)); wn.push(0,-1,0); wd.push((Math.abs(dd)<1?(side||1):dd)*k); wdp.push(S.depth*k); wr.push(s*k,S.depth*k); wt.push(4); } }
      for(let i=0;i<nA;i++)for(let j=0;j<nb;j++){ const a=base+i*(nb+1)+j,b=a+1,c=a+nb+1,e=c+1; wi.push(a,b,c,b,e,c); }
      base+=(nA+1)*(nb+1); }
    const wg=new THREE.BufferGeometry(); wg.setAttribute('position',new THREE.Float32BufferAttribute(wp,3)); wg.setAttribute('normal',new THREE.Float32BufferAttribute(wn,3)); wg.setAttribute('aD',new THREE.Float32BufferAttribute(wd,1)); wg.setAttribute('aDepth',new THREE.Float32BufferAttribute(wdp,1)); wg.setAttribute('aRock',new THREE.Float32BufferAttribute(wr,2)); wg.setAttribute('aType',new THREE.Float32BufferAttribute(wt,1)); wg.setIndex(wi);
    const wm=new THREE.ShaderMaterial({vertexShader:VS_WALL,fragmentShader:FS_WALL,side:THREE.DoubleSide,uniforms:{...U,uSide:{value:side}}});
    const wmesh=new THREE.Mesh(wg,wm); wmesh.frustumCulled=false; grp.add(wmesh);
  }
  /* weicher Schatten unter dem Block */
  { const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'); const gr=g.createRadialGradient(64,64,10,64,64,64); gr.addColorStop(0,'rgba(0,0,0,.6)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128);
    const t=new THREE.CanvasTexture(c); const zl=(S.bw1-S.bw0)*k; const m=new THREE.Mesh(new THREE.PlaneGeometry(24*1.7,zl*2.0),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));
    m.rotation.x=-Math.PI/2; m.position.y=S.yBot-0.25; m.renderOrder=-1; grp.add(m); }
  return grp;
}
/* Punkt (s,w) des Geländes in Szenenkoordinaten – mit der aktuellen Verformung */
function WP(key,s,w,lift=0,depth=0){ const S=SCL[key], D=DEF[key], d=w-S.wf(s);
  const Sl=key==='B'?lerp(D.S0,D.S1,sstep(0,RISE_B,D.front-s)):D.S1;
  const U=S.split?dispU(d===0?1e-9:d,depth,D.F,Sl)*S.exag*S.k:0;
  return [S.X(s)+U*S.tan[0],(depth>0?-depth*S.k:S.Y(s,w))+lift,S.Z(w)+U*S.tan[1]]; }

/* ---------- Pfeile: flach auf dem Gelände ---------- */
const arrows=[];
function makeFlatArrow(key,len,wid,color=0xD2432F){
  const sh=new THREE.Shape(), hw=wid*1.35, hl=Math.min(len*0.42,wid*2.6), sw=wid*0.5;
  sh.moveTo(-len/2,-sw); sh.lineTo(len/2-hl,-sw); sh.lineTo(len/2-hl,-hw); sh.lineTo(len/2,0); sh.lineTo(len/2-hl,hw); sh.lineTo(len/2-hl,sw); sh.lineTo(-len/2,sw); sh.closePath();
  const geo=new THREE.ExtrudeGeometry(sh,{depth:wid*0.16,bevelEnabled:false}); geo.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.95}));
  const ol=new THREE.LineSegments(new THREE.EdgesGeometry(geo,30),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.9})); m.add(ol);
  m.renderOrder=6; G[key].add(m); const a={key,mesh:m,len}; arrows.push(a); return a;
}
function placeArrow(a,s,w,dir,lift,vec){ const S=SCL[a.key], p=WP(a.key,s,w,lift); a.mesh.position.set(p[0],p[1],p[2]); a.mesh.rotation.y=vec?-Math.atan2(vec[1],vec[0]):-Math.atan2(S.tan[1],S.tan[0])+(dir<0?Math.PI:0); a.s=s; a.w=w; a.dir=dir; a.lift=lift; }

/* ---------- Kalifornien: Verlauf der Verwerfung, weitere Plattengrenzen, Ausschnitt ---------- */
const AX={};
function buildCalifornia(){
  const S=SCL.A, k=S.k, pts=SA_META.fault.map(p=>new THREE.Vector3(p[0],0,p[1]));
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal',0.5), N=420, sp=curve.getSpacedPoints(N);
  AX.trace=sp.map(v=>[v.x,v.z]);
  const segCol=s=>s>233e3?new THREE.Color(0xFF8A3C):(s>88e3?new THREE.Color(0x6FD3F5):(s>-212e3?new THREE.Color(0xFF4B3A):new THREE.Color(0xF2C14A)));
  const ribbon=(off,half,lift,colorFn,uvScale)=>{ const pos=[],col=[],uv=[],idx=[]; let L=0;
    for(let i=0;i<=N;i++){ const a=sp[Math.max(0,i-1)], b=sp[Math.min(N,i+1)], tx=b.x-a.x, tz=b.z-a.z, l=Math.hypot(tx,tz), nx=-tz/l, nz=tx/l; if(i>0) L+=Math.hypot(sp[i].x-sp[i-1].x,sp[i].z-sp[i-1].z);
      for(const e of [-1,1]){ const s=sp[i].x+nx*(off+e*half), w=sp[i].z+nz*(off+e*half); pos.push(S.X(s),S.Y(s,w)+lift,S.Z(w)); const c=colorFn?colorFn(sp[i].x):null; if(c) col.push(c.r,c.g,c.b); uv.push(L*uvScale,e); }
      if(i<N){ const a2=i*2; idx.push(a2,a2+2,a2+1,a2+1,a2+2,a2+3); } }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); if(col.length) g.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.userData.L=L*uvScale; return g; };
  const dark=new THREE.Mesh(ribbon(0,6200,0.075,null,1),new THREE.MeshBasicMaterial({color:0x05070A,side:THREE.DoubleSide,transparent:true,opacity:0.85,depthTest:false})); dark.renderOrder=3; G.A.add(dark);
  const line=new THREE.Mesh(ribbon(0,3400,0.08,segCol,1),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,depthTest:false,transparent:true})); line.renderOrder=4; G.A.add(line); AX.line=line; AX.dark=dark;
  /* Ausschnitt des Regionalmodells */
  const B=SCL.B, cs=[[B.bs0,B.bw0],[B.bs1,B.bw0],[B.bs1,B.bw1],[B.bs0,B.bw1],[B.bs0,B.bw0]], rp=[];
  for(let e=0;e<4;e++)for(let i=0;i<=20;i++){ const s=lerp(cs[e][0],cs[e+1][0],i/20), w=lerp(cs[e][1],cs[e+1][1],i/20); rp.push(new THREE.Vector3(S.X(s),S.Y(s,w)+0.11,S.Z(w))); }
  const rect=new THREE.Line(new THREE.BufferGeometry().setFromPoints(rp),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,depthTest:false})); rect.renderOrder=6; G.A.add(rect); AX.rect=rect;
}

/* ---------- Plattengrenzen (PB2002): Bänder auf dem Gelände, Zacken an Subduktionszonen ---------- */
const BCOL={tf:0xFFD23F,conv:0xFFD23F,ridge:0x4ADE80,sub:0xC084FC};
function boundRibbon(key,pts,half,lift,color,dash){ const S=SCL[key], pos=[], idx=[], n=pts.length; let L=0; const keep=[];
  for(let i=0;i<n;i++){ const a=pts[Math.max(0,i-1)], b=pts[Math.min(n-1,i+1)], tx=b[0]-a[0], tz=b[1]-a[1], l=Math.hypot(tx,tz)||1, nx=-tz/l, nz=tx/l;
    if(i>0) L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
    for(const e of [-1,1]){ const s=pts[i][0]+nx*e*half, w=pts[i][1]+nz*e*half; pos.push(S.X(s),S.Y(s,w)+lift,S.Z(w)); }
    keep.push(dash?Math.floor(L/dash)%2===0:true);
    if(i<n-1&&(!dash||keep[i])){ const a2=i*2; idx.push(a2,a2+2,a2+1,a2+1,a2+2,a2+3); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,transparent:true})); m.renderOrder=color===0x05070A?3:4; G[key].add(m); return m; }
function densify(pts,step){ const out=[pts[0]]; for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/step)); for(let j=1;j<=n;j++) out.push([lerp(a[0],b[0],j/n),lerp(a[1],b[1],j/n)]); } return out; }
function teeth(key,pts,size,gap,lift,color,toward){ /* Dreiecke auf der Seite der oberen Platte (toward: Richtung w) */ const S=SCL[key], pos=[]; let acc=0;
  for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]); acc+=l; if(acc<gap) continue; acc=0;
    const tx=(b[0]-a[0])/l,tz=(b[1]-a[1])/l; let nx=-tz,nz=tx; if(nz*toward<0){ nx=-nx; nz=-nz; }
    const p=[(a[0]+b[0])/2,(a[1]+b[1])/2], v=[[p[0]-tx*size*0.6,p[1]-tz*size*0.6],[p[0]+tx*size*0.6,p[1]+tz*size*0.6],[p[0]+nx*size,p[1]+nz*size]];
    for(const q of v) pos.push(S.X(q[0]),S.Y(q[0],q[1])+lift,S.Z(q[1])); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,transparent:true})); m.renderOrder=5; G[key].add(m); return m; }
const BX={};
/* Plattengrenzen glätten: Teilstücke zu Ketten verbinden, sehr kurze Stücke dem Nachbarn zuschlagen,
   Golf von Kalifornien als Spreizungszone, Linie gleichmäßig abtasten und weich glätten (runde Kurven). */
function boundChains(BD){
  const segs=BD.map(b=>({k:b.k==='conv'?'tf':b.k, pair:b.pb.split(/[-\\]/).sort().join('-'), p:b.p.map(q=>[q[0],q[1]])}));
  for(const g of segs) if(g.pair==='NA-PA'&&g.p.every(q=>q[0]<-425e3)) g.k='ridge';
  const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<2e3, used=new Set(), chains=[];
  for(let i=0;i<segs.length;i++){ if(used.has(i)) continue; used.add(i); let ch=[segs[i]];
    for(let grow=true;grow;){ grow=false; for(let j=0;j<segs.length;j++){ if(used.has(j)||segs[j].pair!==ch[0].pair||(segs[j].k==='sub')!==(ch[0].k==='sub')) continue; const g=segs[j], A=ch[0].p, B=ch[ch.length-1].p;
        if(near(B[B.length-1],g.p[0])){ ch.push(g); } else if(near(B[B.length-1],g.p[g.p.length-1])){ g.p.reverse(); ch.push(g); }
        else if(near(A[0],g.p[g.p.length-1])){ ch.unshift(g); } else if(near(A[0],g.p[0])){ g.p.reverse(); ch.unshift(g); } else continue; used.add(j); grow=true; } }
    chains.push(ch); }
  const len=p=>{ let L=0; for(let i=1;i<p.length;i++) L+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]); return L; };
  const out=[];
  for(const ch of chains){
    /* kurze Stücke (< 65 km) übernehmen die Art des längeren Nachbarn */
    for(let pass=0;pass<2;pass++) for(let i=0;i<ch.length;i++){ if(len(ch[i].p)>=65e3) continue; const a=ch[i-1], b=ch[i+1]; const n=(a&&b)?(len(a.p)>=len(b.p)?a:b):(a||b); if(n) ch[i].k=n.k; }
    /* Punkte mit Art, gleichmäßig alle 6 km */
    const P=[], K=[]; for(const g of ch){ const d=densify(g.p,6e3); for(let i=(P.length?1:0);i<d.length;i++){ P.push(d[i]); K.push(g.k); } }
    if(P.length<2) continue;
    /* weich glätten (gleitendes Mittel über ±30 km, Enden bleiben fest), dann noch einmal */
    let Q=P; for(let it=0;it<6;it++){ Q=Q.map((q,i)=>{ if(i===0||i===Q.length-1) return q; const r=Math.min(6,i,Q.length-1-i); let x=0,y=0,c=0; for(let j=-r;j<=r;j++){ const wgt=1-Math.abs(j)/(r+1); x+=Q[i+j][0]*wgt; y+=Q[i+j][1]*wgt; c+=wgt; } return [x/c,y/c]; }); }
    out.push({p:Q,k:K,pair:ch[0].pair}); }
  return out; }
/* Band entlang einer geglätteten Kette: gleiche Höhe für Rand und Farbe, runde Enden */
function chainRibbon(key,pts,half,lift,color,ro,from=0,to=pts.length-1,caps=true,H=null){ const S=SCL[key], pos=[], idx=[];
  const nrm=i=>{ const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)], tx=b[0]-a[0], tz=b[1]-a[1], l=Math.hypot(tx,tz)||1; return [-tz/l,tx/l,tx/l,tz/l]; };
  let yc=0; const V=(s,w)=>pos.push(S.X(s),yc+lift,S.Z(w));
  const Yc=(q,i)=>H?H[i]:S.Y(q[0],q[1]);
  for(let i=from;i<=to;i++){ const [nx,nz]=nrm(i), q=pts[i]; yc=Yc(q,i); V(q[0]+nx*half,q[1]+nz*half); V(q[0]-nx*half,q[1]-nz*half); if(i<to){ const a=(i-from)*2; idx.push(a,a+2,a+1,a+1,a+2,a+3); } }
  if(caps) for(const [i,sg] of [[from,-1],[to,1]]){ const [nx,nz,tx,tz]=nrm(i), q=pts[i], c=pos.length/3; yc=Yc(q,i); V(q[0],q[1]); const N=10;
    for(let j=0;j<=N;j++){ const an=Math.PI*j/N, cx=Math.cos(an), sx=Math.sin(an); V(q[0]+(nx*cx+tx*sg*sx)*half,q[1]+(nz*cx+tz*sg*sx)*half); if(j) idx.push(c,c+j,c+j+1); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,transparent:true})); m.renderOrder=ro; G[key].add(m); return m; }
function drawChains(key,chains,ok,half,lift,toothSize,toothGap){
  for(const c of chains){ /* nur der sichtbare Teil */ let i0=-1; const parts=[];
    for(let i=0;i<c.p.length;i++){ const o=ok(c.p[i]); if(o&&i0<0) i0=i; if((!o||i===c.p.length-1)&&i0>=0){ const i1=o?i:i-1; if(i1>i0) parts.push([i0,i1]); i0=-1; } }
    /* Höhe entlang der Linie geglättet: gleichmäßiges Band ohne Zacken */
    const S=SCL[key]; let H=c.p.map(q=>{ let h=-1e9; for(const d of [-1,0,1]) h=Math.max(h,S.Y(q[0]+d*4e3,q[1]),S.Y(q[0],q[1]+d*4e3)); return h; });
    for(let it=0;it<3;it++) H=H.map((_,i)=>{ let a=0,n=0; for(let j=-6;j<=6;j++){ const q=H[clamp(i+j,0,H.length-1)]; a+=q; n++; } return Math.max(a/n,H[i]-0.01); });
    for(const [a,b] of parts){ chainRibbon(key,c.p,half*1.5,lift,0x05070A,3,a,b,true,H);
      let r0=a; for(let i=a+1;i<=b;i++){ if(i===b||c.k[i]!==c.k[r0]){ const e=i===b?b:i; chainRibbon(key,c.p,half,lift+0.001,BCOL[c.k[r0]],4,r0,e,false,H); r0=i; } }
      if(c.k[a]==='sub') teeth(key,c.p.slice(a,b+1),toothSize,toothGap,lift,BCOL.sub,1); } } }
function buildBounds(){
  const W=SCL.W, BD=SA_META.bounds, k=W.k;
  /* Westen Nordamerikas: alle Plattengrenzen nach Art */
  const lw=key=>key==='W'?7.5e3:2.6e3;
  const inW=q=>q[0]>W.bs0+15e3&&q[0]<W.bs1-15e3&&q[1]>W.bw0+15e3&&q[1]<W.bw1-15e3;
  const runs=(pts,ok)=>{ const out=[]; let cur=[]; for(const q of pts){ if(ok(q)) cur.push(q); else { if(cur.length>1) out.push(cur); cur=[]; } } if(cur.length>1) out.push(cur); return out; };
  const CH=boundChains(BD); BX.chains=CH;
  drawChains('W',CH,inW,lw('W'),0.04,26e3,70e3);
  /* Ausschnitt Kalifornien auf der Übersicht */
  const A=SCL.A, cs=[[A.bs0,A.bw0],[A.bs1,A.bw0],[A.bs1,A.bw1],[A.bs0,A.bw1],[A.bs0,A.bw0]], rp=[];
  for(let e=0;e<4;e++)for(let i=0;i<=30;i++){ const s=lerp(cs[e][0],cs[e+1][0],i/30), w=lerp(cs[e][1],cs[e+1][1],i/30); rp.push(new THREE.Vector3(W.X(s),W.Y(s,w)+0.05,W.Z(w))); }
  const rect=new THREE.Line(new THREE.BufferGeometry().setFromPoints(rp),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.85,depthTest:false})); rect.renderOrder=6; G.W.add(rect); BX.rect=rect;
  /* Kalifornien: Fortsetzung der Plattengrenze nach Süden (gestrichelt) und Grenzen im Norden */
  const inA=q=>q[0]>A.bs0+5e3&&q[0]<A.bs1-5e3&&q[1]>A.bw0+5e3&&q[1]<A.bw1-5e3;
  const south=[[-412e3,134e3]]; for(const b of BD){ if(b.pb==='NA-PA') for(const q of b.p) if(q[0]<-420e3&&inA(q)) south.push(q); }
  south.sort((a,b)=>b[0]-a[0]);
  const sp=densify(south,8e3); BX.southDark=boundRibbon('A',sp,5200,0.075,0x05070A,22e3); BX.south=boundRibbon('A',sp,2600,0.08,0xFFD23F,22e3);
  /* vereinfachte Darstellung (Beschriftung „Wichtige“): eine durchgehende gelbe Linie von der San-Andreas-Verwerfung bis in den Golf */
  { const tr=AX.trace.filter(q=>q[0]>-412e3).sort((a,b)=>b[0]-a[0]); let P=densify(tr.concat(south.filter(q=>q[0]<-412e3)),6e3);
    for(let it=0;it<4;it++) P=P.map((q,i)=>{ if(i===0||i===P.length-1) return q; const r=Math.min(5,i,P.length-1-i); let x=0,y=0,c=0; for(let j=-r;j<=r;j++){ const wg=1-Math.abs(j)/(r+1); x+=P[i+j][0]*wg; y+=P[i+j][1]*wg; c+=wg; } return [x/c,y/c]; });
    const ok=P.map(inA); let a=ok.indexOf(true), b=ok.lastIndexOf(true);
    AX.simple=[chainRibbon('A',P,6200,0.075,0x05070A,3,a,b), chainRibbon('A',P,3400,0.08,0xFFD23F,4,a,b)]; AX.simple[0].material.opacity=0.85; }
  drawChains('A',CH.filter(c=>c.pair!=='NA-PA'),inA,2600,0.08,14e3,32e3);
}

/* ---------- Wallace Creek als sauberes, geglättetes Band (folgt dem Versatz an der Verwerfung) ---------- */
const CREEK={built:false};
function buildCreek(){ const mk=(color,op,ro)=>{ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(4000*6),3));
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:op,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6})); m.renderOrder=ro; m.frustumCulled=false; G.C.add(m); return m; };
  CREEK.edge=mk(0x06142E,0.55,7); CREEK.body=mk(0x2F7BFF,1,8); CREEK.built=true; }
function updateCreek(){ if(!CREEK.built) return; const S=SCL.C, k=S.k, on=state.creek; CREEK.edge.visible=CREEK.body.visible=on; if(!on) return;
  const cp=SA_META.C.creekPts, wf=S.wf, M=SA_META.C; const raw=[];
  const H=(s,w)=>{ let h=-1e9; for(const ds of [-8,0,8]) for(const dw of [-8,0,8]) h=Math.max(h,S.Y(s+ds,w+dw)); return h; };
  const add=(s,w,side)=>{ const ww=side?wf(s)+side*0.5:w, p=WP('C',s,ww,0); p[1]=H(s,ww); raw.push(p); };
  for(const q of cp) if(q[1]-wf(q[0])>22) add(q[0],q[1],0);
  add(M.creekUp,0,1); add(M.creekDn,0,-1);
  for(const q of cp) if(q[1]-wf(q[0])<-22) add(q[0],q[1],0);
  /* gleichmäßig abtasten (≈ 4 m), dann weich glätten: runde Kurven, durchgehend */
  let P=[raw[0]]; for(let i=1;i<raw.length;i++){ const a=raw[i-1],b=raw[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/(4*k))); for(let j=1;j<=n;j++) P.push([lerp(a[0],b[0],j/n),lerp(a[1],b[1],j/n),lerp(a[2],b[2],j/n)]); }
  for(let it=0;it<4;it++) P=P.map((q,i)=>{ if(i===0||i===P.length-1) return q; const r=Math.min(4,i,P.length-1-i); let x=0,y=0,z=0,c=0; for(let j=-r;j<=r;j++){ const w=1-Math.abs(j)/(r+1); x+=P[i+j][0]*w; y+=P[i+j][1]*w; z+=P[i+j][2]*w; c+=w; } return [x/c,Math.max(y/c,q[1]),z/c]; });
  const n=Math.min(P.length,3999);
  for(const [m,hw,lift] of [[CREEK.edge,9.5,1.2],[CREEK.body,6.5,1.6]]){ const A=m.geometry.attributes.position.array, idx=[];
    for(let i=0;i<n;i++){ const a=P[Math.max(0,i-1)], b=P[Math.min(n-1,i+1)], tx=b[0]-a[0], tz=b[2]-a[2], l=Math.hypot(tx,tz)||1, nx=-tz/l*hw*k, nz=tx/l*hw*k, p=P[i];
      A.set([p[0]+nx,p[1]+lift*k,p[2]+nz,p[0]-nx,p[1]+lift*k,p[2]-nz],i*6); if(i<n-1){ const c=i*2; idx.push(c,c+2,c+1,c+1,c+2,c+3); } }
    m.geometry.setIndex(idx); m.geometry.setDrawRange(0,idx.length); m.geometry.attributes.position.needsUpdate=true; } }

/* ---------- Messlinien als eigene, geglättete Bänder (statt auf das Gelände gemalt) ---------- */
const LINES={meshes:[],built:false,wk:1};
function buildLines(){ const S=SCL.B, k=S.k, grp=G.B, step=150, sp=25000;
  const mk=(color,op,ro)=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:op,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
  for(let sL=S.sc-Math.floor((S.sc-S.bs0)/sp)*sp; sL<S.bs1; sL+=sp){ if(sL<S.bs0+1500||sL>S.bs1-1500) continue;
    for(const side of [-1,1]){ const wf=S.wf(sL), w0=side<0?S.bw0+300:wf+side*120, w1=side<0?wf-120:S.bw1-300, n=Math.max(2,Math.round(Math.abs(w1-w0)/step));
      const ws=[],hs=[]; for(let i=0;i<=n;i++){ const w=lerp(w0,w1,i/n); let h=-1e9; for(const ds of [-700,-350,0,350,700]) for(const dw of [-700,-350,0,350,700]) h=Math.max(h,S.Y(sL+ds,w+dw)); ws.push(w); hs.push(h); }
      /* Höhe glätten: erst obere Hülle (±3), dann weiches Mittel (±10, dreimal) – ruhige, gleichmäßige Linie */
      let hsm=hs.map((_,i)=>{ let h=-1e9; for(let j=-3;j<=3;j++) h=Math.max(h,hs[clamp(i+j,0,n)]); return h; });
      for(let it=0;it<3;it++) hsm=hsm.map((_,i)=>{ let a=0,c=0; for(let j=-10;j<=10;j++){ const wg=1-Math.abs(j)/11; a+=hsm[clamp(i+j,0,n)]*wg; c+=wg; } return Math.max(a/c,hs[i]-0.002); });
      for(const [hw,color,op,ro,lift] of [[620,0x14100A,0.5,7,0.02],[300,0xFFF1C4,1.0,8,0.026]]){
        const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array((n+1)*6),3));
        const idx=[]; for(let i=0;i<n;i++){ const a=i*2; idx.push(a,a+1,a+2,a+1,a+3,a+2); } g.setIndex(idx);
        const m=new THREE.Mesh(g,mk(color,op)); m.renderOrder=ro; m.frustumCulled=false; grp.add(m);
        LINES.meshes.push({m,sL,ws,hs:hsm,hw,lift,side}); } } }
  LINES.built=true; }
function updateLines(){ if(!LINES.built) return; const S=SCL.B, D=DEF.B, k=S.k;
  for(const L of LINES.meshes){ L.m.visible=state.lines; if(!state.lines) continue; const P=L.m.geometry.attributes.position.array, n=L.ws.length-1;
    const pts=L.ws.map((w,i)=>{ const d=w-S.wf(L.sL), Sl=lerp(D.S0,D.S1,sstep(0,RISE_B,D.front-L.sL)), U=dispU(d,0,D.F,Sl)*S.exag*k; return [S.X(L.sL)+U*S.tan[0],L.hs[i]+L.lift,S.Z(w)+U*S.tan[1]]; });
    for(let i=0;i<=n;i++){ const a=pts[Math.max(0,i-1)], b=pts[Math.min(n,i+1)], tx=b[0]-a[0], tz=b[2]-a[2], l=Math.hypot(tx,tz)||1, nx=-tz/l*L.hw*k*LINES.wk, nz=tx/l*L.hw*k*LINES.wk, p=pts[i];
      P.set([p[0]+nx,p[1],p[2]+nz,p[0]-nx,p[1],p[2]-nz],i*6); }
    L.m.geometry.attributes.position.needsUpdate=true; } }

/* ---------- Erdkugel: geografische Einordnung (Karte NASA Blue Marble, Plattengrenzen PB2002) ---------- */
const RG=6;
function gdir(lon,lat){ const u=(lon+180)/360, phi=u*Math.PI*2, th=(90-lat)*Math.PI/180; return new THREE.Vector3(-Math.cos(phi)*Math.sin(th),Math.cos(th),Math.sin(phi)*Math.sin(th)); }
function GP(lon,lat,lift=0){ return gdir(lon,lat).multiplyScalar(RG*(1+lift)).toArray(); }
const GX={};
function buildGlobe(){
  const grp=new THREE.Group(); grp.visible=false; scene.add(grp); G.G=grp;
  const tDay=tex(IMG.G_day,true), tWat=tex(IMG.G_wat,false), tCa=tex(IMG.G_ca,true), tNa=tex(IMG.G_na,true), tEu=tex(IMG.G_eu,true), tHgt=tex(IMG.G_hgt,false); tDay.wrapS=tWat.wrapS=tHgt.wrapS=THREE.RepeatWrapping; tDay.anisotropy=tCa.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const cb=SA_META.globe.cab;
  const mat=new THREE.ShaderMaterial({uniforms:{tDay:{value:tDay},tWat:{value:tWat},tCa:{value:tCa},uCab:{value:new THREE.Vector4(...cb)},tNa:{value:tNa},tEu:{value:tEu},tHgt:{value:tHgt},uNab:{value:new THREE.Vector4(...SA_META.globe.nab)},uEub:{value:new THREE.Vector4(...SA_META.globe.eub)},uSun:{value:new THREE.Vector3()},uSpec:{value:1}},
    vertexShader:`varying vec2 vUv;varying vec3 vN;varying vec3 vP;void main(){vUv=vec2(uv.x,1.0-uv.y);vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.0);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform sampler2D tDay,tWat,tCa,tNa,tEu,tHgt;uniform vec4 uCab,uNab,uEub;uniform vec3 uSun;uniform float uSpec;varying vec2 vUv;varying vec3 vN;varying vec3 vP;
vec2 puv(vec2 ll,vec4 b){ return vec2((ll.x-b.x)/(b.y-b.x),(b.w-ll.y)/(b.w-b.z)); }
float pin(vec2 u){ vec2 e=min(u,1.0-u); return smoothstep(0.0,0.06,min(e.x,e.y)); }
void main(){ vec3 N=normalize(vN),V=normalize(cameraPosition-vP),L=normalize(uSun);
  vec3 alb=texture2D(tDay,vUv).rgb;
  vec2 ll=vec2(vUv.x*360.0-180.0,90.0-vUv.y*180.0);
  vec2 nu=puv(ll,uNab); float na=pin(nu); if(na>0.0) alb=mix(alb,texture2D(tNa,nu).rgb,na);
  vec2 eu=puv(ll,uEub); float ea=pin(eu); if(ea>0.0) alb=mix(alb,texture2D(tEu,eu).rgb,ea);
  vec2 cu=puv(ll,uCab); if(cu.x>0.0&&cu.x<1.0&&cu.y>0.0&&cu.y<1.0){ vec4 c=texture2D(tCa,cu); alb=mix(alb,c.rgb,c.a); }
  /* Relief aus der Höhenkarte (wie im Erdumlauf-Labor) */
  { float st=1.0/2048.0; float h0=texture2D(tHgt,vUv).r, hx=texture2D(tHgt,vUv+vec2(st,0.0)).r, hy=texture2D(tHgt,vUv+vec2(0.0,st*2.0)).r;
    vec3 E=normalize(cross(vec3(0.0,1.0,0.0),N)+vec3(1e-5)), Nn=cross(N,E); float k=5.0;
    N=normalize(N-k*((hx-h0)*E+(h0-hy)*Nn)); } float wat=smoothstep(0.35,0.65,texture2D(tWat,vUv).r);
  float ndl=dot(N,L), day=smoothstep(-0.15,0.25,ndl);
  vec3 col=alb*(0.16+1.05*clamp(ndl,0.0,1.0));
  vec3 H=normalize(L+V); float sp=(pow(max(dot(normalize(vN),H),0.0),220.0)*0.35+pow(max(dot(normalize(vN),H),0.0),30.0)*0.04)*wat*step(0.0,ndl);
  col+=vec3(1.0,0.96,0.9)*sp*uSpec;
  float fr=pow(1.0-max(dot(N,V),0.0),3.0); col+=vec3(0.22,0.45,1.0)*fr*0.75*(0.35+0.65*day);
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`});
  const earth=new THREE.Mesh(new THREE.SphereGeometry(RG,LOWQ?128:256,LOWQ?64:128),mat); grp.add(earth); GX.mat=mat;
  /* Atmosphäre: leuchtender Rand */
  const atm=new THREE.Mesh(new THREE.SphereGeometry(RG*1.035,96,48),new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying vec3 vN;varying vec3 vP;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.0);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    uniforms:{uA:{value:1}},fragmentShader:`uniform float uA;varying vec3 vN;varying vec3 vP;void main(){vec3 V=normalize(cameraPosition-vP);float r=1.0-abs(dot(normalize(vN),V));gl_FragColor=vec4(vec3(0.25,0.5,1.0)*pow(r,4.0)*1.6*uA,1.0);}`}));
  grp.add(atm); GX.atm=atm.material;
  /* Sterne */
  { const n=1800, p=new Float32Array(n*3); for(let i=0;i<n;i++){ const v=new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).normalize().multiplyScalar(300); p.set(v.toArray(),i*3); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3));
    grp.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xaab8d0,size:1.2,sizeAttenuation:false,transparent:true,opacity:0.7}))); }
  /* Plattengrenzen */
    const pos={1:[],2:[],3:[]};
  for(const c of SA_META.globe.c){ const K=c[0]; for(let i=0;i+1<K.length;i++){ const j=1+i*2; pos[K[i]].push(...GP(c[j],c[j+1],0.006),...GP(c[j+2],c[j+3],0.006)); } }
  /* breite Linien (wie im Schalenbau-Labor): dunkler Rand + kräftige Farbe */
  const fat=(arr,col,w,ro,op=1)=>{ const g=new LineSegmentsGeometry(); g.setPositions(arr); const m=new LineMaterial({color:col,linewidth:w,transparent:true,opacity:op,worldUnits:false,depthWrite:false,toneMapped:false}); m.resolution.set(innerWidth,innerHeight); GX.lmats.push(m);
    const l=new LineSegments2(g,m); l.renderOrder=ro; l.frustumCulled=false; grp.add(l); return l; };
  GX.lmats=[];
  const brightC={1:0xFFD23F,2:0x4ADE80,3:0xD08CFF};
  for(const k in pos){ fat(pos[k],0x06101c,6.2,3,0.5); }
  for(const k in pos){ fat(pos[k],brightC[k],3.4,4); }
  /* Umriss Kaliforniens (US-Bundesstaat, us-atlas / Natural Earth) */
  { const cp=[]; for(const ring of SA_META.globe.ca){ for(let i=0;i<ring.length;i++){ const a=ring[i], b=ring[(i+1)%ring.length]; cp.push(...GP(a[0],a[1],0.005),...GP(b[0],b[1],0.005)); } }
    fat(cp,0x06101c,4.6,5,0.6); GX.rect=fat(cp,0xffffff,2.4,6); }
  /* Luxemburg */
  const m=new THREE.Mesh(new THREE.SphereGeometry(0.05,16,8),new THREE.MeshBasicMaterial({color:0xFF5A3C})); m.position.set(...GP(6.13,49.61,0.004)); grp.add(m);
}
function globeCam(lon,lat,dist,tilt=0){ const d=gdir(lon,lat), up=new THREE.Vector3(0,1,0), e=new THREE.Vector3().crossVectors(up,d).normalize(), n=new THREE.Vector3().crossVectors(d,e);
  const p=d.clone().multiplyScalar(RG*dist).add(n.clone().multiplyScalar(-RG*tilt)); const t=d.clone().multiplyScalar(RG*Math.max(0,1-(dist-1)*0.0)*(dist<1.6?1:0)); return {p:p.toArray(),t:t.toArray()}; }
