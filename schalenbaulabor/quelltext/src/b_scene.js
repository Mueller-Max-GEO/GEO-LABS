/* ================= Teil B: 3D-Szene · Renderer, HDR-Nachbearbeitung, Erde, Schnittflächen, Konvektion ================= */

/* ---------- gemeinsamer Zustand (wird von Teil D gesteuert) ---------- */
const S = {
  cur:0, mode:'explore',
  openT:Math.PI/2, openTarget:Math.PI/2,
  probeKm:0, probeTarget:0,
  flow:true, plates:false, clouds:true, field:false, aurora:false, labels:1, camFollow:true,
  hi:[0,0,0,0,0,0,0], hiOn:0, hiWant:null,
  seis:false, simRate:1, paused:false,
  time:0, myr:0
};

/* ---------- Renderer ---------- */
const stage = $('stage');
let renderer;
try{ renderer = new THREE.WebGLRenderer({antialias:false, alpha:false, powerPreference:'high-performance'}); }
catch(e){ $('veil').innerHTML='<p>3D-Darstellung nicht möglich: Dieser Browser unterstützt kein WebGL.</p>'; throw e; }
const GL2 = renderer.capabilities.isWebGL2;
renderer.localClippingEnabled = true;
renderer.setClearColor(0x04060A, 1);
stage.prepend(renderer.domElement);
const gl = renderer.getContext();
const RT_TYPE = (GL2 && gl.getExtension('EXT_color_buffer_float')) ? THREE.HalfFloatType
  : ((!GL2 && gl.getExtension('OES_texture_half_float') && gl.getExtension('EXT_color_buffer_half_float')) ? THREE.HalfFloatType : THREE.UnsignedByteType);
const HDR = RT_TYPE===THREE.HalfFloatType;
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const strong = !coarse && renderer.capabilities.maxTextureSize>=8192 && !(navigator.deviceMemory && navigator.deviceMemory<8) && QS.get('q')!=='lo';
const LOQ = QS.get('q')==='lo';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.02, 200);
camera.position.set(2.55,1.35,2.75);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.rotateSpeed = 0.75; controls.zoomSpeed = 0.9;
controls.minDistance = 0.16; controls.maxDistance = 9; controls.target.set(0.05,0,0.05);

/* ---------- HDR-Nachbearbeitung: Bloom-Kette, Tonwertabbildung, Vignette, Korn ---------- */
const fsScene=new THREE.Scene(), fsCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const fsQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),null); fsQuad.frustumCulled=false; fsScene.add(fsQuad);
const FSV=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
const fsm=(u,f)=>new THREE.ShaderMaterial({uniforms:u,vertexShader:FSV,fragmentShader:f,depthTest:false,depthWrite:false});
const downMat=fsm({t:{value:null},px:{value:new THREE.Vector2()},thr:{value:0}},`
uniform sampler2D t;uniform vec2 px;uniform float thr;varying vec2 vUv;
vec3 S(float x,float y){vec3 c=min(max(texture2D(t,vUv+vec2(x,y)*px).rgb,vec3(0.0)),vec3(40.0));
  if(thr>0.0){float m=max(c.r,max(c.g,c.b));c*=max(m-thr,0.0)/max(m,1e-4);}return c;}
void main(){
  vec3 A=S(-2.,-2.),B=S(0.,-2.),C=S(2.,-2.),D=S(-2.,0.),E=S(0.,0.),F=S(2.,0.),G=S(-2.,2.),H=S(0.,2.),I=S(2.,2.),J=S(-1.,-1.),K=S(1.,-1.),L=S(-1.,1.),M=S(1.,1.);
  gl_FragColor=vec4(E*0.125+(A+C+G+I)*0.03125+(B+D+F+H)*0.0625+(J+K+L+M)*0.125,1.0);}`);
const upMat=fsm({t:{value:null},base:{value:null},px:{value:new THREE.Vector2()},w:{value:1}},`
uniform sampler2D t,base;uniform vec2 px;uniform float w;varying vec2 vUv;
vec3 S(float x,float y){return texture2D(t,vUv+vec2(x,y)*px).rgb;}
void main(){vec3 c=(S(-1.,-1.)+S(1.,-1.)+S(-1.,1.)+S(1.,1.))+(S(0.,-1.)+S(-1.,0.)+S(1.,0.)+S(0.,1.))*2.0+S(0.,0.)*4.0;
  gl_FragColor=vec4(texture2D(base,vUv).rgb+c/16.0*w,1.0);}`);
const finalMat=fsm({tScene:{value:null},tBloom:{value:null},res:{value:new THREE.Vector2()},uBloom:{value:0.42},uT:{value:0},uCA:{value:0.0022},uVig:{value:0.34},uFade:{value:1}},`
uniform sampler2D tScene,tBloom;uniform vec2 res;uniform float uBloom,uT,uCA,uVig,uFade;varying vec2 vUv;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec3 tm(vec3 c){float m=max(c.r,max(c.g,c.b));if(m<=1e-5)return c;float a=0.80;
  float mm=m<a?m:a+(1.0-a)*(1.0-exp(-(m-a)/(1.0-a)*0.55));
  c*=mm/m;return mix(c,vec3(mm),smoothstep(1.6,9.0,m)*0.75);}
void main(){
  vec2 d=vUv-0.5;float r2=dot(d,d);vec3 c;
  if(uCA>0.0){vec2 o=d*r2*uCA*4.0;c=vec3(texture2D(tScene,vUv+o).r,texture2D(tScene,vUv).g,texture2D(tScene,vUv-o).b);}
  else c=texture2D(tScene,vUv).rgb;
  c+=texture2D(tBloom,vUv).rgb*uBloom;
  c*=1.0-uVig*smoothstep(0.10,0.62,r2);
  c=tm(max(c,0.0)*uFade);
  c=mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c));
  c+=(h21(vUv*res+fract(uT)*91.7)-0.5)/255.0;
  gl_FragColor=vec4(c,1.0);}`);
const post={scene:null,down:[],up:[],levels:6,w:0,h:0};
function rt(w,h,o){return new THREE.WebGLRenderTarget(Math.max(1,w),Math.max(1,h),Object.assign({type:RT_TYPE,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false,generateMipmaps:false},o))}
function buildTargets(w,h,msaa){
  if(post.scene)post.scene.dispose(); post.down.forEach(t=>t.dispose()); post.up.forEach(t=>t.dispose()); post.down=[];post.up=[];
  post.scene=rt(w,h,{depthBuffer:true,samples:GL2?msaa:0}); post.w=w; post.h=h;
  let cw=w,ch=h; for(let i=0;i<post.levels;i++){cw=Math.max(2,cw>>1);ch=Math.max(2,ch>>1);post.down.push(rt(cw,ch));post.up.push(rt(cw,ch))}
}
function runPass(mat,target){fsQuad.material=mat;renderer.setRenderTarget(target);renderer.render(fsScene,fsCam)}
function renderFrame(t){
  renderer.setRenderTarget(post.scene); renderer.render(scene,camera);
  const n=post.levels; let src=post.scene;
  for(let i=0;i<n;i++){downMat.uniforms.t.value=src.texture;downMat.uniforms.px.value.set(1/src.width,1/src.height);downMat.uniforms.thr.value=i===0?1.0:0;runPass(downMat,post.down[i]);src=post.down[i]}
  let acc=post.down[n-1];
  for(let i=n-2;i>=0;i--){upMat.uniforms.t.value=acc.texture;upMat.uniforms.base.value=post.down[i].texture;upMat.uniforms.px.value.set(1/acc.width,1/acc.height);upMat.uniforms.w.value=1.0;runPass(upMat,post.up[i]);acc=post.up[i]}
  finalMat.uniforms.tScene.value=post.scene.texture; finalMat.uniforms.tBloom.value=acc.texture; finalMat.uniforms.res.value.set(post.w,post.h); finalMat.uniforms.uT.value=t;
  runPass(finalMat,null);
}

/* ---------- Auflösung: volle Bildschirmauflösung, bei langsamen Geräten automatisch zurückgestuft ---------- */
const QUAL = { prMax: Math.min(window.devicePixelRatio||1, LOQ?0.75:(coarse?2:2.5)), pr:1, msaa: LOQ?0:4, acc:0, n:0, last:0 };
QUAL.pr = LOQ ? 0.6 : Math.min(QUAL.prMax, coarse?1.5:2);
let VW=1, VH=1;
function resize(force){
  const w=stage.clientWidth, h=stage.clientHeight; if(!w||!h) return;
  if(!force && w===VW && h===VH) return;
  VW=w; VH=h;
  renderer.setPixelRatio(QUAL.pr); renderer.setSize(w,h,false);
  const pw=renderer.domElement.width, ph=renderer.domElement.height;
  camera.aspect=w/h; camera.updateProjectionMatrix();
  buildTargets(pw,ph,QUAL.msaa);
  lineMats.forEach(m=>m.resolution.set(w,h));          // Linienbreiten in Bildschirmpunkten
  if(typeof onResize==='function') onResize();
}
function qualityTick(ms, now){
  if(LOQ) return;
  QUAL.acc+=ms; QUAL.n++;
  if(QUAL.n<45 || now-QUAL.last<1800) return;
  const avg=QUAL.acc/QUAL.n; QUAL.acc=0; QUAL.n=0;
  let pr=QUAL.pr;
  if(avg>30 && pr>0.7) pr=Math.max(0.7, pr*0.84);
  else if(avg<15 && pr<QUAL.prMax) pr=Math.min(QUAL.prMax, pr*1.12);
  if(Math.abs(pr-QUAL.pr)>0.02){ QUAL.pr=pr; QUAL.last=now; resize(true); }
}
const lineMats=[];
function lmat(o){ const m=new THREE.LineMaterial(Object.assign({linewidth:2, worldUnits:false, transparent:true, depthWrite:false},o)); lineMats.push(m); return m; }

/* ---------- GLSL-Bausteine ---------- */
const GL_MAP = `
uniform float uM[9];
float KNf(int i){return i==0?0.:(i==1?7.:(i==2?35.:(i==3?100.:(i==4?400.:(i==5?660.:(i==6?2890.:(i==7?5150.:6371.)))))));}
float fwd(float d){ if(d<=0.) return d*uM[1]/7.;
  for(int i=0;i<8;i++){ float k1=KNf(i+1); if(d<=k1){ float k0=KNf(i); return mix(uM[i],uM[i+1],(d-k0)/(k1-k0)); } } return 1.; }
float invm(float m){ if(m<=0.) return m*7./uM[1];
  for(int i=0;i<8;i++){ if(m<=uM[i+1]){ return mix(KNf(i),KNf(i+1),(m-uM[i])/max(uM[i+1]-uM[i],1e-6)); } } return 6371.; }
`;
const GL_NOISE = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 h22(vec2 p){float n=h21(p);return vec2(n,h21(p+n*19.19+3.7));}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm2(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(3.1,1.7);a*=.5;}return s;}
vec3 voro(vec2 p){vec2 i=floor(p),f=fract(p);float d1=9.,d2=9.,id=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=h22(i+g);float d=length(g+o-f);
    if(d<d1){d2=d1;d1=d;id=h21(i+g+7.7);}else if(d<d2){d2=d;}}
  return vec3(d1,d2,id);}
float hash31(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn3(p);p=p*2.02+vec3(1.7,9.2,3.1);a*=.5;}return s;}
`;
const GL_GRAIN = `
// Körnung, die bei jeder Vergrößerung sichtbar bleibt: zwei Maßstäbe werden überblendet (px = Korngröße in Bildpunkten)
float grainL(vec2 q,float fq,float px){float l=log2(max(fq*px,1e-7));float n=floor(l),f=l-n;float s0=exp2(-n);return mix(vn(q*s0),vn(q*s0*0.5),f);}
vec3 voroL(vec2 q,float fq,float px){float l=log2(max(fq*px,1e-7));float n=floor(l),f=l-n;float s0=exp2(-n);return mix(voro(q*s0),voro(q*s0*0.5),f);}
`;
const GL_CUBIC = `
vec4 cubicW(float v){vec4 n=vec4(1.0,2.0,3.0,4.0)-v;vec4 s=n*n*n;float x=s.x,y=s.y-4.0*s.x,z=s.z-4.0*s.y+6.0*s.x;return vec4(x,y,z,6.0-x-y-z)*(1.0/6.0);}
vec4 texCubic(sampler2D t,vec2 uv,vec2 sz){vec2 inv=1.0/max(sz,vec2(1.0));uv=uv*sz-0.5;vec2 f=fract(uv);uv-=f;
  vec4 xc=cubicW(f.x),yc=cubicW(f.y);vec4 c=uv.xxyy+vec2(-0.5,1.5).xyxy;vec4 s=vec4(xc.xz+xc.yw,yc.xz+yc.yw);vec4 o=(c+vec4(xc.yw,yc.yw)/s)*inv.xxyy;
  vec4 a=texture2D(t,o.xz),b=texture2D(t,o.yz),d=texture2D(t,o.xw),e=texture2D(t,o.yw);float sx=s.x/(s.x+s.y),sy=s.z/(s.z+s.w);return mix(mix(e,d,sx),mix(b,a,sx),sy);}
`;
const GL_HEAT = `
// Glühfarbe von Gestein und Metall nach Temperatur (°C), HDR
vec3 heat(float T){
  vec3 c=vec3(0.);
  c=mix(c,vec3(.14,.010,.0),smoothstep(480.,800.,T));
  c=mix(c,vec3(.50,.060,.006),smoothstep(800.,1100.,T));
  c=mix(c,vec3(.98,.215,.022),smoothstep(1100.,1400.,T));
  c=mix(c,vec3(1.42,.47,.055),smoothstep(1400.,1900.,T));
  c=mix(c,vec3(1.85,.86,.15),smoothstep(1900.,2500.,T));
  c=mix(c,vec3(2.4,1.42,.36),smoothstep(2500.,3200.,T));
  c=mix(c,vec3(2.8,1.95,.62),smoothstep(3200.,3800.,T));
  c=mix(c,vec3(3.3,2.75,1.25),smoothstep(3800.,5000.,T));
  c=mix(c,vec3(3.9,3.5,2.1),smoothstep(5000.,6000.,T));
  return c;}
`;
function px1(r,g,b){const t=new THREE.DataTexture(new Uint8Array([r,g,b,255]),1,1,THREE.RGBAFormat);t.needsUpdate=true;return t}

/* ---------- gemeinsame Uniforms ---------- */
const U = {
  uM:{value:M}, uOpen:{value:Math.PI/2}, uTime:{value:0}, uSun:{value:new V3(0.3,0.75,0.6).normalize()},
  uHi:{value:S.hi}, uHiOn:{value:0},
  tS1:{value:px1(12,0,0)}, tS2:{value:px1(40,110,80)},
  tSimA:{value:null}, tSimB:{value:null}, uSimMix:{value:0}, uSimSz:{value:new THREE.Vector2(512,96)},
  uReady:{value:0}, uExag:{value:0}, uPR:{value:1}, uDim:{value:1}, uPN1:{value:new V3()}, uPN2:{value:new V3()}, uPS1:{value:new V3()}, uPS2:{value:new V3()}, uPoleOn:{value:0}, uFaceAvg:{value:new V3(0.7071,0,0.7071)}, uGlow:{value:new V3(0.5,0.62,0.62)}   // Leuchtstärke: Mantel, äußerer Kern, innerer Kern
};

/* ---------- Himmel: Milchstraße + Sternenstaub ---------- */
const skyMat=new THREE.ShaderMaterial({ side:THREE.BackSide, depthTest:false, depthWrite:false,
  uniforms:{tMW:{value:px1(0,0,0)},uHas:{value:0},uGain:{value:1}},
  vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*viewMatrix*vec4(cameraPosition+position,1.0);}`,
  fragmentShader:`uniform sampler2D tMW;uniform float uHas,uGain;varying vec3 vDir;
${GL_NOISE}
float dust(vec3 d,float Sc,float dens){vec3 p=d*Sc;vec3 i=floor(p);if(hash31(i+3.1)>dens)return 0.0;
  vec3 h=vec3(hash31(i),hash31(i+7.3),hash31(i+13.7));vec3 c=i+0.25+0.5*h;float dd=length(p-c);
  float w=length(fwidth(p));float sig=max(0.07,0.75*w);float b=pow(hash31(i+21.7),5.0)+0.04;
  return b*exp(-dd*dd/(2.0*sig*sig))*min(1.0,(0.07*0.07)/(sig*sig));}
void main(){
  vec3 d=normalize(vDir);
  vec3 e=vec3(d.x*0.80+d.y*0.60, -d.x*0.42+d.y*0.56+d.z*0.714, d.x*0.428-d.y*0.571+d.z*0.70);
  float ra=atan(e.y,e.x);float dec=asin(clamp(e.z,-1.0,1.0));
  vec2 uv=vec2(0.5+ra/6.28318530718,0.5+dec/3.14159265359);
  float m=texture2D(tMW,uv).r*uHas;
  float n=fbm3(d*9.0);float n2=fbm3(d*31.0+4.0);
  float mc=pow(m,1.45);
  float glow=mc*(0.45+1.1*n)*(0.55+0.9*n2);
  vec3 tint=mix(vec3(0.36,0.48,0.95),vec3(1.0,0.80,0.58),clamp(mc*1.1,0.0,1.0));
  vec3 col=tint*pow(glow,1.2)*0.13;
  float dens=0.14+0.70*m;
  float s=dust(d,230.0,dens)+dust(d*1.37+2.0,380.0,dens*0.9)*0.8+dust(d*0.71+5.0,150.0,dens*0.5)*1.3;
  vec3 sc=mix(vec3(0.70,0.80,1.0),vec3(1.0,0.84,0.66),hash31(floor(d*230.0)+5.0));
  col+=sc*s*0.85;
  col+=vec3(0.003,0.004,0.008);
  gl_FragColor=vec4(col*uGain,1.0);
}`});
skyMat.extensions={derivatives:true};
const sky=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),skyMat); sky.frustumCulled=false; sky.renderOrder=-20; scene.add(sky);

/* ---------- Erdoberfläche: echte Karte, Relief nach Höhendaten (im didaktischen Maßstab überhöht) ---------- */
const earthMat=new THREE.ShaderMaterial({
  uniforms:Object.assign({tDay:{value:px1(20,45,90)},tCW:{value:px1(0,255,255)},tHeight:{value:px1(0,0,0)},uClouds:{value:0.75},uFlowT:{value:0},uBump:{value:1}},U),
  vertexShader:`uniform sampler2D tS1;varying vec2 vUv;varying vec3 vN;varying vec3 vPos;varying vec3 vEast;varying vec3 vNorth;
${GL_MAP}
void main(){vUv=uv;mat3 m=mat3(modelMatrix);vN=normalize(m*normal);vec3 ax=vec3(0.0,1.0,0.0);
  vec3 e=cross(ax,vN);float le=length(e);vEast=le>1e-4?e/le:vec3(1.0,0.0,0.0);vNorth=cross(vN,vEast);
  vec3 s=texture2D(tS1,uv).rgb;float elev=s.r*6.5*(1.0-smoothstep(0.02,0.06,s.g*8.0));
  vec3 p=position*(1.0-fwd(-elev));
  vec4 w=modelMatrix*vec4(p,1.0);vPos=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform sampler2D tDay,tCW,tHeight;uniform vec3 uSun;uniform float uClouds,uFlowT,uOpen,uReady,uBump;
varying vec2 vUv;varying vec3 vN;varying vec3 vPos;varying vec3 vEast;varying vec3 vNorth;
void main(){
  float az=atan(vPos.z,vPos.x);
  if(uOpen>0.002 && az>=0.0 && az<=uOpen) discard;
  vec3 N=normalize(vN),Ls=normalize(uSun),V=normalize(cameraPosition-vPos),E=normalize(vEast),No=normalize(vNorth);
  vec3 cw=texture2D(tCW,vUv).rgb;
  float water=smoothstep(0.35,0.65,cw.b);
  float cl=smoothstep(0.05,0.80,texture2D(tCW,vUv-vec2(uFlowT,0.0)).r)*uClouds;
  vec2 toSun=vec2(dot(Ls,E),dot(Ls,No));
  float sh=smoothstep(0.10,0.85,texture2D(tCW,vUv+toSun*0.0011-vec2(uFlowT,0.0),2.0).r)*uClouds;
  float st=1.0/2048.0;
  float h0=texture2D(tHeight,vUv).r,hx=texture2D(tHeight,vUv+vec2(st,0.0)).r,hy=texture2D(tHeight,vUv+vec2(0.0,st*2.0)).r;
  vec3 Nb=normalize(N-(1.0-water)*uBump*((hx-h0)*E+(hy-h0)*No));
  float ndl=dot(N,Ls);
  float day=smoothstep(-0.12,0.16,ndl);
  vec3 sunCol=mix(vec3(1.0,0.46,0.20),vec3(1.0,0.97,0.92),smoothstep(-0.06,0.40,ndl));
  vec3 alb=pow(texture2D(tDay,vUv).rgb,vec3(2.2));
  float diff=clamp(mix(ndl,dot(Nb,Ls),0.85),0.0,1.0);
  vec3 Hh=normalize(Ls+V);float nh=max(dot(N,Hh),0.0);
  float spec=(pow(nh,420.0)*1.2+pow(nh,60.0)*0.14+pow(nh,10.0)*0.03)*water*(1.0-cl)*step(0.0,ndl);
  vec3 surf=alb*diff*1.22*(1.0-0.30*sh*smoothstep(0.05,0.35,ndl))*sunCol+spec*sunCol;
  vec3 cloud=vec3(0.95)*clamp(ndl*1.1+0.07,0.0,1.0)*sunCol;
  vec3 col=mix(surf,cloud,cl);
  float fres=pow(1.0-max(dot(N,V),0.0),3.2);
  float near=smoothstep(0.35,2.0,length(cameraPosition-vPos));
  col+=vec3(0.20,0.42,0.95)*(fres*mix(0.08,0.70,near)+0.03)*day;
  col+=alb*vec3(0.030,0.040,0.070)*(1.0-day);
  gl_FragColor=vec4(col*uReady,1.0);
}`});
const SEG = LOQ ? [256,128] : (strong ? [720,360] : [480,240]);
const earth=new THREE.Mesh(new THREE.SphereGeometry(1,SEG[0],SEG[1]),earthMat); earth.rotation.y=-LON0*DEG; earth.frustumCulled=false; scene.add(earth);

const R_ATM=1.07;
const atmMat=new THREE.ShaderMaterial({
  side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{uSun:U.uSun,uR:{value:1.0},uRa:{value:R_ATM},uReady:U.uReady,uOpen:U.uOpen},
  vertexShader:`varying vec3 vPos;void main(){vec4 w=modelMatrix*vec4(position,1.0);vPos=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform vec3 uSun;uniform float uR,uRa,uReady,uOpen;varying vec3 vPos;
void main(){
  vec3 ro=cameraPosition;vec3 rd=normalize(vPos-cameraPosition);
  float tca=-dot(ro,rd);if(tca<0.0)discard;
  float d=sqrt(max(dot(ro,ro)-tca*tca,0.0));
  if(d<uR)discard;
  vec3 P=ro+rd*tca;float az=atan(P.z,P.x);
  float din=min(az+0.03,uOpen+0.03-az)*length(P.xz)/max(length(P),1e-4);
  float cut=uOpen>0.002?1.0-smoothstep(-0.02,0.10,din):1.0;
  float h=(d-uR)/(uRa-uR);
  float glow=exp(-h*4.6)*(1.0-smoothstep(0.65,1.0,h));
  vec3 Ls=normalize(uSun);
  float s=dot(normalize(P),Ls);
  float lit=smoothstep(-0.34,0.22,s);
  vec3 c=mix(vec3(1.0,0.40,0.16),vec3(0.26,0.55,1.0),smoothstep(-0.14,0.28,s));
  float fw=pow(max(dot(rd,Ls),0.0),5.0);
  gl_FragColor=vec4(c*glow*lit*(1.25+2.6*fw)*uReady*cut,1.0);
}`});
const atm=new THREE.Mesh(new THREE.SphereGeometry(R_ATM,96,64),atmMat); atm.renderOrder=3; scene.add(atm);

/* ---------- Schnittflächen: Kruste nach Messdaten, Mantel aus der Simulation, Kern ---------- */
const FACE_FS = `
uniform sampler2D tS1,tS2,tSimA,tSimB;
uniform float uSimMix,uLon,uMirror,uTime,uHiOn,uOpen,uReady,uExag,uPoleOn;
uniform vec3 uPN1,uPN2,uPS1,uPS2,uFaceAvg;
uniform float uHi[7];
uniform vec2 uSimSz;
uniform vec3 uGlow;
uniform float uPR,uDim;
uniform vec3 uFaceN,uSun;
varying vec3 vW;
${GL_MAP}${GL_NOISE}${GL_GRAIN}${GL_CUBIC}${GL_HEAT}
const float PI=3.14159265359;
const float DBL=150.0;   // Dicke der kalten Grenzschicht der Simulation (km): wird auf die echte Lithosphärendicke abgebildet
vec3 Lc(float r,float g,float b){return pow(vec3(r,g,b),vec3(2.2));}
float lineAt(float x,float w){return 1.0-smoothstep(w*0.5,w*1.5,abs(x));}
float simT(float d,float lat,float lab){
  float ds=d<lab?d/lab*DBL:DBL+(d-lab)/(2890.0-lab)*(2890.0-DBL);
  float v=clamp(1.0-ds/2890.0,0.0,1.0);
  float th=uMirror>0.5?PI-lat:lat;
  vec2 uv=vec2(th/6.28318530718+0.5/uSimSz.x,(v*(uSimSz.y-1.0)+0.5)/uSimSz.y);
  return mix(texCubic(tSimA,uv,uSimSz).r,texCubic(tSimB,uv,uSimSz).r,uSimMix);
}
void main(){
  vec3 p=vW;float r=length(p);
  if(r>1.045)discard;
  float lat=asin(clamp(p.y/max(r,1e-5),-1.0,1.0));
  vec2 guv=vec2(fract((uLon+180.0)/360.0),lat/PI+0.5);
  vec3 s1=texture2D(tS1,guv).rgb,s2=texture2D(tS2,guv).rgb;
  { float pw=smoothstep(82.0,89.5,abs(lat)*57.2957795)*uPoleOn;   // nahtloser Übergang an den Polen (beide Flächen treffen sich dort)
    s1=mix(s1,lat>0.0?uPN1:uPS1,pw); s2=mix(s2,lat>0.0?uPN2:uPS2,pw); }
  float elev=s1.r*6.5,wdep=s1.g*8.0,ice=s1.b*4.5,sed=s2.r*s2.r*20.0,moho=s2.g*80.0,lab=s2.b*320.0;
  float ocean=smoothstep(0.02,0.06,wdep);
  elev*=1.0-ocean;
  float top=-elev;
  float bed=mix(-elev+ice,wdep,ocean);
  float d=invm(1.0-r);
  float mdep=1.0-r;
  float wpx=fwidth(mdep)+1e-6;                       // Modelltiefe je Bildpunkt
  float mTop=fwd(top);
  if(mdep<mTop-wpx*0.5)discard;
  moho=max(moho,bed+sed+3.0);lab=max(lab,moho+8.0);
  vec2 q=vec2(lat*max(r,0.3),mdep);                  // Bogenlänge, Modelltiefe (isotrop auf dem Bildschirm)
  float fq=(max(fwidth(q.x),fwidth(q.y))+1e-7)*uPR;      // Modell-Länge je Bildschirmpunkt (CSS-Pixel)
  vec3 col=vec3(0.0);vec3 em=vec3(0.0);float layer=0.0;
  float cth=moho-bed-sed;
  float cont=smoothstep(11.0,19.0,cth);
  float mBed=fwd(bed),mSed=fwd(bed+sed),mMoho=fwd(moho),mLab=fwd(lab);
  if(d<bed){
    if(ocean>0.5){                                   // Meerwasser
      float wd=clamp(d/max(wdep,0.05),0.0,1.0);
      col=mix(Lc(0.16,0.60,0.84),Lc(0.015,0.10,0.30),pow(wd,0.65));
      col+=Lc(0.5,0.8,0.9)*0.10*(1.0-wd)*vn(vec2(q.x*520.0+uTime*0.15,q.y*160.0));
      col=mix(col,Lc(0.75,0.93,1.0),lineAt(mdep,wpx*1.2)*0.8);
    }else{                                           // Eisschild
      col=Lc(0.86,0.93,0.98)*(0.9+0.1*sin((d-top)/max(ice,0.1)*40.0+vn(vec2(q.x*200.0,1.0))*6.0));
    }
    layer=0.0;
  }else if(d<bed+sed){                               // Sedimente (Ablagerungen)
    float t=(d-bed)/max(sed,0.01);
    float lay=t*(3.0+sed*1.6)+vn(vec2(q.x*70.0,2.0))*0.7;
    float id=h21(vec2(floor(lay),3.0));
    vec3 a=mix(Lc(0.80,0.69,0.47),Lc(0.62,0.56,0.47),id);
    a*=0.88+0.24*grainL(q*vec2(1.0,2.5),fq,2.5);
    a*=1.0-0.35*smoothstep(0.86,1.0,fract(lay))*clamp(1.0-fq*900.0,0.0,1.0);
    col=a;layer=0.0;
  }else if(d<moho){                                  // kristalline Kruste
    float t=(d-bed-sed)/max(cth,0.5);
    // kontinental: heller Granit/Gneis oben, Gneis in der Mitte, dunkles Gestein unten
    float w1=0.38+0.07*(vn(vec2(q.x*38.0,3.0))-0.5),w2=0.69+0.07*(vn(vec2(q.x*31.0,9.0))-0.5);
    vec3 cc=mix(Lc(0.82,0.70,0.66),Lc(0.60,0.58,0.59),smoothstep(w1-0.03,w1+0.03,t));
    cc=mix(cc,Lc(0.40,0.42,0.43),smoothstep(w2-0.03,w2+0.03,t));
    float sp=grainL(q,fq,1.7),sp2=grainL(q+3.7,fq,2.3),sp3=grainL(q+9.1,fq,2.0);
    cc*=0.90+0.20*sp;
    cc=mix(cc,cc*0.50,smoothstep(0.74,0.84,sp2)*(1.0-0.5*t));                  // dunkle Minerale (Glimmer)
    cc=mix(cc,cc*1.16+0.03,smoothstep(0.76,0.88,sp3)*(1.0-0.7*t));             // helle Kristalle (Feldspat, Quarz)
    cc*=0.90+0.22*fbm2(q*vec2(120.0,260.0)+5.0);                                // wolkige Tönung des Gesteins
    float fol=sin((t*44.0+fbm2(q*vec2(48.0,130.0))*6.0)*6.2832);                // Schieferung im Gneis, nach unten stärker
    cc*=1.0-0.24*smoothstep(0.35,1.0,fol)*smoothstep(0.26,0.50,t);
    float flt=abs(fract((q.x*0.9+q.y*2.2)*42.0+0.6*vn(q*60.0))-0.5);             // einzelne Störungen (Brüche)
    cc*=1.0-0.35*(1.0-smoothstep(0.0,0.012+fq*30.0,flt))*step(0.86,h21(vec2(floor((q.x*0.9+q.y*2.2)*42.0+0.6*vn(q*60.0)),4.0)))*(1.0-t);
    float plu=smoothstep(0.62,0.70,fbm2(q*vec2(26.0,60.0)+11.0))*(1.0-smoothstep(0.30,0.50,t));
    cc=mix(cc,Lc(0.88,0.78,0.74)*(0.88+0.26*sp),plu*0.7);                        // Granitkörper
    // ozeanisch: Kissenlava, senkrechte Gänge, Gabbro
    vec3 vv=voroL(q,fq,9.0);
    vec3 pil=Lc(0.20,0.21,0.25)*(0.62+0.85*smoothstep(0.02,0.20,vv.y-vv.x))*(0.85+0.3*vv.z);
    float stp=fract(q.x*380.0+0.25*vn(vec2(q.y*300.0,1.0)));
    vec3 dk=Lc(0.31,0.32,0.36)*mix(0.62,1.12,smoothstep(0.38,0.62,stp))*(0.9+0.2*sp);
    vec3 gb=Lc(0.27,0.27,0.29)*(0.78+0.45*sp);
    gb=mix(gb,Lc(0.55,0.59,0.56),smoothstep(0.70,0.82,sp3)*0.75);
    vec3 oc=mix(pil,dk,smoothstep(0.20,0.27,t));oc=mix(oc,gb,smoothstep(0.42,0.50,t));
    col=mix(oc,cc,cont);
    col*=mix(vec3(1.0),vec3(1.10,0.95,0.88),t*0.6);
    em=heat(15.0+d/max(lab,40.0)*1315.0)*uGlow.x*smoothstep(0.55,1.0,t);
    layer=0.0;
  }else if(d<2890.0){                                // Erdmantel
    float Ts=simT(d,lat,lab);
    float Tad=1330.0+(clamp(d,100.0,2890.0)-100.0)/2790.0*1170.0;
    float f=d/2890.0;
    float Tc=Ts<0.46?mix(15.0,Tad,smoothstep(0.0,1.0,Ts/0.46)):Tad+(Ts-0.46)/0.54*mix(420.0,1250.0,f*f);
    float cold=1.0-smoothstep(650.0,1250.0,Tc);
    // fester Mantelteil der Lithosphäre: dunkles, festes Gestein wie die Unterkruste,
    // nach unten zunehmend warm (rotbraun) -> logischer Übergang zur glühenden Asthenosphäre
    vec3 vv=voroL(q,fq,8.0);
    float fl=clamp((d-moho)/max(lab-moho,10.0),0.0,1.0);
    vec3 rock=mix(Lc(0.29,0.26,0.25),Lc(0.37,0.31,0.27),vv.z);
    rock*=0.74+0.42*smoothstep(0.0,0.22,vv.y-vv.x);
    rock*=0.92+0.16*fbm2(q*vec2(90.0,200.0)+3.0);
    rock=mix(rock,rock*vec3(1.30,0.78,0.60),smoothstep(0.25,1.0,fl));
    float lith=1.0-smoothstep(lab,lab+90.0,d);
    col=mix(Lc(0.10,0.08,0.08),rock,lith)*cold;                               // abtauchende kalte Platten: dunkel
    float grain=0.90+0.20*fbm2(q*vec2(46.0,46.0)+vec2(0.0,uTime*0.004));
    float an=Ts-0.46;
    em=heat(Tc)*grain*uGlow.x*(1.0+2.2*max(an,0.0))*(1.0-0.9*clamp(-an*2.2,0.0,1.0)*smoothstep(lab,lab+60.0,d));
    // Asthenosphäre: weich, schimmert leicht; winzige Schmelzanteile blitzen auf
    float as=smoothstep(lab,lab+25.0,d)*(1.0-smoothstep(330.0,430.0,d));
    em*=1.0+as*(0.10+0.16*fbm2(q*vec2(150.0,420.0)+vec2(uTime*0.03,0.0)));
    em+=as*vec3(1.6,0.9,0.25)*smoothstep(0.90,1.0,grainL(q+vec2(uTime*0.0004,uTime*0.0002),fq,3.0))*0.5;
    em+=vec3(1.0,0.32,0.08)*uGlow.x*0.55*pow(fl,3.0)*(1.0-smoothstep(lab,lab+30.0,d))*step(d,lab+30.0);   // Glut von unten
    layer=d<lab?1.0:(d<410.0?2.0:(d<660.0?3.0:4.0));
  }else if(d<5150.0){                                // äußerer Kern: flüssiges Eisen
    float f=(d-2890.0)/2260.0;
    vec2 hc=vec2(length(p.xz),p.y);
    vec2 wq=hc*vec2(9.0,3.4);
    float w1=fbm2(wq+vec2(0.0,uTime*0.035));
    float w2=fbm2(wq*1.9+vec2(w1*2.2-uTime*0.022,w1*1.3+uTime*0.05));
    float fil=smoothstep(0.42,0.78,w2);
    float Tc=mix(2750.0,3500.0,f)+(w2-0.5)*1300.0;
    em=heat(Tc)*(0.70+0.75*fil)*uGlow.y;
    em+=vec3(1.0,0.62,0.22)*uGlow.z*(0.75*exp(-(5150.0-d)/170.0)+0.18*exp(-(5150.0-d)/600.0));   // Schein des glühenden inneren Kerns
    layer=5.0;
  }else{                                             // innerer Kern: festes Eisen, kristallin
    vec2 hc=vec2(length(p.xz),p.y);
    vec3 vv=voro(hc*vec2(46.0,15.0));
    float rc=clamp((6371.0-d)/1221.0,0.0,1.0);                                  // 0 Mitte .. 1 Rand
    float pul=0.94+0.06*sin(uTime*1.3)+0.03*sin(uTime*3.1+2.0);
    vec3 hot=mix(vec3(1.0,0.86,0.52),vec3(1.0,0.52,0.14),smoothstep(0.10,1.0,rc));
    em=hot*(2.1+1.5*(1.0-rc*rc))*(0.90+0.16*vv.z+0.10*smoothstep(0.0,0.12,vv.y-vv.x))*pul*uGlow.z;
    layer=6.0;
  }
  // Licht auf kaltem Gestein
  vec3 fn=normalize(mix(uFaceAvg,uFaceN,smoothstep(0.0,0.35,length(p.xz))));   // an der gemeinsamen Kante beide Flächen gleich hell
  float lit=0.60+0.50*max(dot(fn,uSun),0.0);
  col=col*lit+em;
  // Hervorhebung einer Schale
  float hw=layer<0.5?uHi[0]:(layer<1.5?uHi[1]:(layer<2.5?uHi[2]:(layer<3.5?uHi[3]:(layer<4.5?uHi[4]:(layer<5.5?uHi[5]:uHi[6])))));
  col*=(1.0-0.55*uHiOn*(1.0-hw))*uDim;
  // Grenzlinien
  float lw=wpx*1.15*max(1.0,uPR*0.8);
  float dash=step(0.45,fract(q.x*150.0));
  vec3 ink=vec3(0.015,0.012,0.012);
  col=mix(col,ink,lineAt(mdep-mMoho,lw)*0.85*step(bed+sed+0.2,moho));                 // Moho
  col+=vec3(0.95,0.88,0.75)*lineAt(mdep-mLab,lw*0.9)*dash*0.7*(1.0-0.6*uHiOn*(1.0-max(uHi[1],uHi[2])));   // Unterseite der Lithosphäre
  col=mix(col,ink,lineAt(mdep-fwd(410.0),lw)*0.30);
  col=mix(col,ink,lineAt(mdep-fwd(660.0),lw)*0.55);
  col=mix(col,ink,lineAt(mdep-fwd(2890.0),lw*1.2)*0.75);
  col=mix(col,ink,lineAt(mdep-fwd(5150.0),lw*1.2)*0.55);
  col=mix(col,ink,lineAt(mdep-mBed,lw)*0.5*step(0.05,bed-top));
  col=mix(col,ink*2.0,lineAt(mdep-mTop,lw*1.3)*0.7*(1.0-ocean));
  gl_FragColor=vec4(col*uReady,1.0);
}`;
const FACE_VS = `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
function faceMat(lon, mirror, n){
  const m=new THREE.ShaderMaterial({uniforms:Object.assign({uLon:{value:lon},uMirror:{value:mirror},uFaceN:{value:n}},U), vertexShader:FACE_VS, fragmentShader:FACE_FS, side:THREE.DoubleSide});
  m.extensions={derivatives:true}; return m;
}
const faceGeo=new THREE.CircleGeometry(1.045, 360, -Math.PI/2, Math.PI);
const faceA=new THREE.Mesh(faceGeo, faceMat(LON0,0,new V3(0,0,1))); scene.add(faceA);
const faceB=new THREE.Mesh(faceGeo, faceMat(LON0-90,1,new V3(1,0,0))); scene.add(faceB);
faceA.frustumCulled=false; faceB.frustumCulled=false;
const lonB = () => LON0 - S.openT/DEG;
// Punkt auf einer Schnittfläche (Welt): geografische Breite, Tiefe in km
function facePoint(lat, d, face, lift){
  const r=rad(d), c=Math.cos(lat*DEG)*r, y=Math.sin(lat*DEG)*r, e=lift==null?0.004:lift;
  if(face==='B'){ const o=S.openT; return new V3(c*Math.cos(o)+Math.sin(o)*e, y, c*Math.sin(o)-Math.cos(o)*e); }
  return new V3(c, y, e);
}

/* innerer Kern als Kugel im Keil (wie in den Buchabbildungen) */
const ballMat=new THREE.ShaderMaterial({uniforms:U,
  vertexShader:`varying vec3 vW;varying vec3 vN;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uOpen,uHiOn,uReady,uTime;uniform float uHi[7];uniform vec3 uGlow;varying vec3 vW;varying vec3 vN;
${GL_NOISE}${GL_HEAT}
void main(){float az=atan(vW.z,vW.x);if(!(az>=0.0&&az<=uOpen))discard;
  vec3 N=normalize(vN),V=normalize(cameraPosition-vW);
  vec3 vv=voro(vec2(atan(N.z,N.x)*7.0,N.y*9.0));
  float rim=pow(1.0-max(dot(N,V),0.0),2.0);
  float pul=0.94+0.06*sin(uTime*1.3)+0.03*sin(uTime*3.1+2.0);
  vec3 hot=mix(vec3(1.0,0.84,0.48),vec3(1.0,0.48,0.12),rim);
  vec3 c=hot*(2.6+2.4*rim)*(0.90+0.16*vv.z+0.10*smoothstep(0.0,0.12,vv.y-vv.x))*pul*uGlow.z;
  c*=1.0-0.55*uHiOn*(1.0-uHi[6]);
  gl_FragColor=vec4(c*uReady,1.0);}`});
const ball=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),ballMat); scene.add(ball);

/* ---------- Konvektions-Simulation: eigener Rechen-Thread, Bilder werden weich überblendet ---------- */
const SIM = { NT:512, NR:96, ready:false, worker:null, local:null, cur:null, prev:null, tPrev:0, tCur:0, interval:0.06, mixT:0, ur:null, ut:null, umax:1, time:0, rate:1.2e-5, pool:[] };
function simTex(){ const t=new THREE.DataTexture(new Uint8Array(SIM.NT*SIM.NR), SIM.NT, SIM.NR, GL2?THREE.RedFormat:THREE.LuminanceFormat, THREE.UnsignedByteType);
  t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.ClampToEdgeWrapping; t.minFilter=t.magFilter=THREE.LinearFilter; t.generateMipmaps=false; t.needsUpdate=true; return t; }
function simStart(){
  const T0 = assetBytes('sim0');
  let nt=512, nr=96;
  if(T0.length!==nt*nr){ diag('Startzustand der Simulation hat die falsche Größe'); }
  const useWorker = typeof Worker==='function' && QS.get('worker')!=='0';
  const setup=(NT,NR)=>{ SIM.NT=NT; SIM.NR=NR; U.uSimSz.value.set(NT,NR); U.tSimA.value=simTex(); U.tSimB.value=simTex(); };
  const WSRC = SIM_SRC + `
let sim=null, rate=1.2e-5, paused=false, last=0, debt=0;
function post(){ const T=new Uint8Array(sim.T.length); for(let i=0;i<T.length;i++) T[i]=sim.T[i]*255+0.5;
  const ur=new Float32Array(sim.ur), ut=new Float32Array(sim.ut);
  self.postMessage({type:'frame',t:sim.time,T:T,ur:ur,ut:ut,umax:sim.umax},[T.buffer,ur.buffer,ut.buffer]); }
function tick(){ const now=performance.now(); const el=Math.min(0.25,(now-last)/1000); last=now;
  if(sim && !paused){ debt+=rate*el; let n=0; const t0=performance.now();
    while(debt>0 && n<24 && performance.now()-t0<30){ const dt=Math.min(sim.dtMax(), 0.3*sim.DR/Math.max(sim.umax,1e-6), Math.max(debt,1e-9)); sim.step(dt); debt-=dt; n++; }
    if(debt>rate*0.5) debt=rate*0.5;
    if(n>0) post(); }
  setTimeout(tick, 45); }
self.onmessage=e=>{ const m=e.data;
  if(m.type==='init'){ sim=makeMantleSim(m.NT,m.NR,{Ra:m.Ra,H:m.H,flowEvery:2}); for(let i=0;i<sim.T.length;i++) sim.T[i]=m.T0[i]/255; sim.flow(); last=performance.now(); post(); tick(); }
  else if(m.type==='rate'){ rate=m.rate; }
  else if(m.type==='pause'){ paused=m.on; } };`;
  function onFrame(m){
    SIM.prev=SIM.cur; SIM.cur=m; SIM.ur=m.ur; SIM.ut=m.ut; SIM.umax=m.umax; SIM.time=m.t;
    const now=performance.now()/1000; if(SIM.tCur) SIM.interval=lerp(SIM.interval, clamp(now-SIM.tCur,0.02,0.4), 0.2); SIM.tCur=now;
    // A = bisheriges Bild, B = neues Bild
    const a=U.tSimA.value, b=U.tSimB.value;
    if(SIM.prev){ a.image.data.set(SIM.prev.T); a.needsUpdate=true; } else { a.image.data.set(m.T); a.needsUpdate=true; }
    b.image.data.set(m.T); b.needsUpdate=true; SIM.mixT=0; SIM.ready=true;
  }
  if(useWorker){
    try{
      setup(nt,nr);
      const w=new Worker(URL.createObjectURL(new Blob([WSRC],{type:'text/javascript'})));
      w.onmessage=e=>{ if(e.data.type==='frame') onFrame(e.data); };
      w.onerror=e=>{ diag('Simulation im Hintergrund nicht möglich, rechne im Hauptprogramm'); SIM.worker=null; localSim(); };
      w.postMessage({type:'init',NT:nt,NR:nr,Ra:6e6,H:6,T0:T0});
      SIM.worker=w; return;
    }catch(e){ }
  }
  localSim();
  function localSim(){
    // ohne Hintergrund-Thread: kleineres Gitter direkt im Hauptprogramm
    const NT=256, NR=64; setup(NT,NR);
    const sim=(new Function(SIM_SRC+';return makeMantleSim;'))()(NT,NR,{Ra:6e6,H:6,flowEvery:2});
    for(let j=0;j<NR;j++) for(let i=0;i<NT;i++){ const jj=Math.min(nr-1,Math.round(j/(NR-1)*(nr-1))), ii=(i*nt/NT)|0; sim.T[j*NT+i]=T0[jj*nt+ii]/255; }
    sim.flow(); SIM.local=sim; SIM.debt=0;
    SIM.localStep=(el)=>{ if(S.paused) return; SIM.debt+=SIM.rate*el; let n=0;
      while(SIM.debt>0 && n<2){ const dt=Math.min(sim.dtMax(),0.3*sim.DR/Math.max(sim.umax,1e-6),Math.max(SIM.debt,1e-9)); sim.step(dt); SIM.debt-=dt; n++; }
      if(SIM.debt>SIM.rate*0.3) SIM.debt=SIM.rate*0.3;
      if(n>0){ const T=new Uint8Array(sim.T.length); for(let i=0;i<T.length;i++) T[i]=sim.T[i]*255+0.5; onFrame({t:sim.time,T:T,ur:sim.ur,ut:sim.ut,umax:sim.umax}); } };
  }
}
function simSetRate(k){ SIM.rate=1.2e-5*k; if(SIM.worker) SIM.worker.postMessage({type:'rate',rate:SIM.rate}); }
function simPause(on){ S.paused=on; if(SIM.worker) SIM.worker.postMessage({type:'pause',on:on}); }
// Geschwindigkeit und Temperatur aus dem aktuellen Simulationsbild (bilinear)
const _vel=[0,0];
function simVel(r, th){
  const NT=SIM.NT, NR=SIM.NR, RI=3480/6371, DR=(1-RI)/(NR-1), DT=TAU/NT;
  let y=(r-RI)/DR; if(y<0)y=0; if(y>NR-1.001)y=NR-1.001; const j0=y|0, ty=y-j0;
  let x=th/DT; x-=Math.floor(x/NT)*NT; const i0=x|0, tx=x-i0, i1=(i0+1)&(NT-1), a=j0*NT, b=a+NT, ur=SIM.ur, ut=SIM.ut;
  _vel[0]=(ur[a+i0]*(1-tx)+ur[a+i1]*tx)*(1-ty)+(ur[b+i0]*(1-tx)+ur[b+i1]*tx)*ty;
  _vel[1]=(ut[a+i0]*(1-tx)+ut[a+i1]*tx)*(1-ty)+(ut[b+i0]*(1-tx)+ut[b+i1]*tx)*ty; return _vel;
}
/* Lithosphären-Unterseite entlang beider Schnittflächen (für Teilchen und Beschriftungen), in 1°-Schritten */
const LABP = { A:new Float32Array(181), B:new Float32Array(181), lonB:null };
function labProfiles(){
  if(!STRUCT.ready) { LABP.A.fill(100); LABP.B.fill(100); return; }
  if(LABP.lonB===null) for(let i=0;i<=180;i++){ const s=structAt(i-90,LON0); LABP.A[i]=Math.max(s.lab, Math.max(s.moho, (s.wdep>0.2?s.wdep:-s.elev+s.ice)+s.sed+3)+8); }
  const lb=lonB(); if(LABP.lonB===null || Math.abs(lb-LABP.lonB)>0.4){ LABP.lonB=lb;
    for(let i=0;i<=180;i++){ const s=structAt(i-90,lb); LABP.B[i]=Math.max(s.lab, Math.max(s.moho, (s.wdep>0.2?s.wdep:-s.elev+s.ice)+s.sed+3)+8); } }
}
function labAt(lat, face){ const P=face==='B'?LABP.B:LABP.A, x=clamp(lat+90,0,179.999), i=x|0, t=x-i; return P[i]*(1-t)+P[i+1]*t; }
const DBL=150;
// Tiefe in der Simulation → echte Tiefe (die kalte Grenzschicht der Simulation wird auf die echte Lithosphärendicke gelegt)
function simDepthToReal(ds, lab){ return ds<DBL ? ds/DBL*lab : lab+(ds-DBL)/(2890-DBL)*(2890-lab); }
function realDepthToSim(d, lab){ return d<lab ? d/lab*DBL : DBL+(d-lab)/(2890-lab)*(2890-DBL); }

/* ---------- Strömungsteilchen mit Leuchtspur: aufsteigend rot-gelb, absinkend blau ---------- */
const PT = { n: LOQ?400:(coarse?700:1000), K:14 };
PT.r=new Float32Array(PT.n); PT.th=new Float32Array(PT.n); PT.age=new Float32Array(PT.n); PT.life=new Float32Array(PT.n); PT.w=new Float32Array(PT.n);
PT.hist=new Float32Array(PT.n*PT.K*2); PT.head=0; PT.tick=0;
function ptSpawn(i, init){ const RI=3480/6371; PT.r[i]=RI+0.01+(1-RI-0.035)*Math.sqrt(Math.random()*0.999+0.0005)*1.0; PT.r[i]=RI+0.012+(1-RI-0.06)*Math.random();
  PT.th[i]=Math.random()*TAU; PT.life[i]=7+Math.random()*9; PT.age[i]=init?Math.random()*PT.life[i]:0; PT.w[i]=0;
  for(let k=0;k<PT.K;k++){ PT.hist[(i*PT.K+k)*2]=PT.r[i]; PT.hist[(i*PT.K+k)*2+1]=PT.th[i]; } }
for(let i=0;i<PT.n;i++) ptSpawn(i,true);
function makeTrail(){
  const g=new THREE.LineSegmentsGeometry(); const nseg=PT.n*(PT.K-1);
  g.setPositions(new Float32Array(nseg*6)); g.setColors(new Float32Array(nseg*6));
  const m=lmat({vertexColors:true, linewidth:coarse?1.6:1.9, blending:THREE.AdditiveBlending, depthTest:true});
  const l=new THREE.LineSegments2(g,m); l.frustumCulled=false; l.renderOrder=6; return l;
}
const trailA=makeTrail(), trailB=makeTrail(); faceA.add(trailA); faceB.add(trailB);
trailA.position.z=0.0035; trailB.position.z=-0.0035;
// Pfeilspitzen an einem Teil der Teilchen
const ARW = { n: Math.floor(PT.n/5) };
function makeHeads(){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(ARW.n*9),3)); g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(ARW.n*9),3));
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,side:THREE.DoubleSide})); m.frustumCulled=false; m.renderOrder=7; return m; }
const headA=makeHeads(), headB=makeHeads(); faceA.add(headA); faceB.add(headB); headA.position.z=0.004; headB.position.z=-0.004;
const _pa=[], _ca=[];
function ptModel(r, th, out){   // Simulationskoordinate → lokale Flächenkoordinate (x ≥ 0, y) und Fläche
  let t=th%TAU; if(t<0) t+=TAU; let lat, face;
  if(t<=Math.PI/2){ lat=t; face=0; } else if(t>=3*Math.PI/2){ lat=t-TAU; face=0; } else { lat=Math.PI-t; face=1; }
  const ds=(1-r)*RKM, d=simDepthToReal(ds, labAt(lat/DEG, face?'B':'A')), rm=rad(d);
  out[0]=rm*Math.cos(lat); out[1]=rm*Math.sin(lat); out[2]=face; return out;
}
const _pm=[0,0,0], _pm2=[0,0,0];
function particlesUpdate(dt, visible){
  trailA.visible=trailB.visible=headA.visible=headB.visible=visible;
  if(!visible || !SIM.ready) return;
  const RI=3480/6371, dts=SIM.rate*dt*(S.paused?0:1); PT.camD=camera.position.distanceTo(controls.target);
  PT.acc=(PT.acc||0)+dt; const push=PT.acc>0.22; if(push) PT.acc=0;
  if(push) PT.head=(PT.head+1)%PT.K;
  const posA=trailA.geometry.attributes.instanceStart.data.array, colA=trailA.geometry.attributes.instanceColorStart.data.array;
  const posB=trailB.geometry.attributes.instanceStart.data.array, colB=trailB.geometry.attributes.instanceColorStart.data.array;
  const hpA=headA.geometry.attributes.position.array, hcA=headA.geometry.attributes.color.array, hpB=headB.geometry.attributes.position.array, hcB=headB.geometry.attributes.color.array;
  const K=PT.K, vnorm=1/Math.max(SIM.umax*0.35,1);
  const gain = lerp(1.0, 1.0, 0);
  for(let i=0;i<PT.n;i++){
    const v=simVel(PT.r[i],PT.th[i]);
    PT.r[i]+=v[0]*dts; PT.th[i]+=v[1]/PT.r[i]*dts; PT.age[i]+=dt;
    PT.w[i]=lerp(PT.w[i], clamp(v[0]*vnorm,-1,1), 0.08);
    if(PT.age[i]>PT.life[i] || PT.r[i]<RI+0.004 || PT.r[i]>0.9975){ ptSpawn(i,false); }
    if(push){ const o=(i*K+PT.head)*2; PT.hist[o]=PT.r[i]; PT.hist[o+1]=PT.th[i]; }
    const fade=Math.min(1,PT.age[i]/1.2,(PT.life[i]-PT.age[i])/1.2);
    const w=PT.w[i], sp=Math.min(1,Math.hypot(v[0],v[1])*vnorm*1.3);
    // Farbe: aufsteigend rot-gelb, absinkend blau, sonst blass
    let cr,cg,cb; const up=clamp(w*1.6,0,1), dn=clamp(-w*1.6,0,1), ne=1-Math.max(up,dn);
    cr=up*2.3+dn*0.06+ne*0.13; cg=up*0.95+dn*0.42+ne*0.11; cb=up*0.12+dn*2.2+ne*0.10;
    const a0=fade*sstep(0.10,0.55,sp);
    // Spur
    let px=0,py=0,pf=-1,hx=0,hy=0,qx=0,qy=0,hf=-1;
    for(let k=0;k<K;k++){
      const idx=((PT.head-k)%K+K)%K, o=(i*K+idx)*2;
      const rr=k===0?PT.r[i]:PT.hist[o], tt=k===0?PT.th[i]:PT.hist[o+1];
      ptModel(rr,tt,_pm);
      if(k===0){ hx=_pm[0]; hy=_pm[1]; hf=_pm[2]; }
      if(k===1){ qx=_pm[0]; qy=_pm[1]; }
      if(k>0){
        const s=(i*(K-1)+(k-1))*6, same=(pf===_pm[2]);
        const fa=a0*(1-(k-1)/(K-1)), fb=a0*(1-k/(K-1));
        const P=pf===0?posA:posB, C=pf===0?colA:colB, P2=pf===0?posB:posA, C2=pf===0?colB:colA;
        if(same){ P[s]=px;P[s+1]=py;P[s+2]=0;P[s+3]=_pm[0];P[s+4]=_pm[1];P[s+5]=0; C[s]=cr*fa;C[s+1]=cg*fa;C[s+2]=cb*fa;C[s+3]=cr*fb;C[s+4]=cg*fb;C[s+5]=cb*fb; }
        else { P[s]=P[s+1]=P[s+2]=P[s+3]=P[s+4]=P[s+5]=0; C[s]=C[s+1]=C[s+2]=C[s+3]=C[s+4]=C[s+5]=0; }
        P2[s]=P2[s+1]=P2[s+2]=P2[s+3]=P2[s+4]=P2[s+5]=0; C2[s]=C2[s+1]=C2[s+2]=C2[s+3]=C2[s+4]=C2[s+5]=0;
      }
      px=_pm[0]; py=_pm[1]; pf=_pm[2];
    }
    // Pfeilspitze
    if(i<ARW.n){
      const o=i*9; let dx=hx-qx, dy=hy-qy; const L=Math.hypot(dx,dy);
      const HP=hf===0?hpA:hpB, HC=hf===0?hcA:hcB, HP2=hf===0?hpB:hpA;
      for(let k=0;k<9;k++) HP2[o+k]=0;
      if(L>1e-6 && Math.abs(w)>0.18){ dx/=L; dy/=L; const sz=Math.min(0.011,0.0042*PT.camD), nx=-dy, ny=dx, a=a0*1.1;
        HP[o]=hx+dx*sz*1.5; HP[o+1]=hy+dy*sz*1.5; HP[o+2]=0; HP[o+3]=hx-dx*sz*0.4+nx*sz*0.62; HP[o+4]=hy-dy*sz*0.4+ny*sz*0.62; HP[o+5]=0; HP[o+6]=hx-dx*sz*0.4-nx*sz*0.62; HP[o+7]=hy-dy*sz*0.4-ny*sz*0.62; HP[o+8]=0;
        for(let k=0;k<3;k++){ HC[o+k*3]=cr*a; HC[o+k*3+1]=cg*a; HC[o+k*3+2]=cb*a; }
      } else { for(let k=0;k<9;k++){ HP[o+k]=0; } }
    }
  }
  for(const t of [trailA,trailB]){ t.geometry.attributes.instanceStart.data.needsUpdate=true; t.geometry.attributes.instanceColorStart.data.needsUpdate=true; }
  for(const h of [headA,headB]){ h.geometry.attributes.position.needsUpdate=true; h.geometry.attributes.color.needsUpdate=true; }
}

/* ---------- Tiefensonde ---------- */
const probeDir = new V3(Math.cos(LUX_LAT*DEG), Math.sin(LUX_LAT*DEG), 0);
const probeG = new THREE.Group(); scene.add(probeG);
const rodMat = new THREE.MeshBasicMaterial({color:new THREE.Color(0.85,0.9,0.95)});
const rod = new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,8), rodMat); probeG.add(rod);
const mkMatO = new THREE.MeshBasicMaterial({color:new THREE.Color(1.5,1.6,1.7), depthTest:false, transparent:true});
const mkMatI = new THREE.MeshBasicMaterial({color:new THREE.Color(0.02,0.03,0.05), depthTest:false, transparent:true});
const mkMatD = new THREE.MeshBasicMaterial({color:new THREE.Color(3.2,0.9,0.5), depthTest:false, transparent:true});
const marker = new THREE.Group();
{ const a=new THREE.Mesh(new THREE.RingGeometry(0.78,1,40),mkMatO), b=new THREE.Mesh(new THREE.CircleGeometry(0.78,40),mkMatI), c=new THREE.Mesh(new THREE.CircleGeometry(0.34,24),mkMatD);
  b.renderOrder=20; a.renderOrder=21; c.renderOrder=22; marker.add(b,a,c); }
scene.add(marker);
let PROBE_S = {elev:0.3,wdep:0,ice:0,sed:0.5,moho:35,lab:100};
function probeUpdate(show){
  probeG.visible=show; marker.visible=show; if(!show) return;
  const top=probeDir.clone().multiplyScalar(rad(-PROBE_S.elev)+0.05).setZ(0.005), bot=probeDir.clone().multiplyScalar(rad(Math.max(S.probeKm,-PROBE_S.elev))).setZ(0.005);
  const dist=camera.position.distanceTo(bot), len=Math.max(1e-4, top.distanceTo(bot));
  rod.position.copy(top).add(bot).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(new V3(0,1,0), top.clone().sub(bot).normalize());
  const w=dist*0.0007; rod.scale.set(w,len,w);
  marker.position.copy(bot); marker.quaternion.copy(camera.quaternion); marker.scale.setScalar(dist*0.0105*(1+0.06*Math.sin(S.time*3)));
}

/* ---------- Plattengrenzen (Bird 2003, PB2002) als scharfe Linien auf dem Relief ---------- */
let plates=null;
const plateClip=[new THREE.Plane(new V3(0,0,-1),0), new THREE.Plane(new V3(-1,0,0),0)];
const plateMat=lmat({color:new THREE.Color(2.4,0.42,0.22), linewidth:coarse?1.5:1.8, clippingPlanes:plateClip, clipIntersection:true, depthTest:true});
function buildPlates(){
  const pos=[];
  for(const ln of PLATES){
    let prev=null;
    for(let k=0;k<ln.length;k+=2){
      const lon=ln[k], lat=ln[k+1];
      if(prev){ const n=Math.max(1,Math.ceil(Math.max(Math.abs(lon-prev[0]),Math.abs(lat-prev[1]))/0.7));
        for(let j=0;j<n;j++){ for(const f of [j/n,(j+1)/n]){ const lo=prev[0]+(lon-prev[0])*f, la=prev[1]+(lat-prev[1])*f;
          const s=structAt(la,lo); const el=(s.wdep>0.2?0:s.elev); const v=dirLL(la,lo).multiplyScalar(rad(-el)+0.0022); pos.push(v.x,v.y,v.z); } } }
      prev=[lon,lat];
    }
  }
  const g=new THREE.LineSegmentsGeometry(); g.setPositions(pos);
  if(plates){ scene.remove(plates); plates.geometry.dispose(); }
  plates=new THREE.LineSegments2(g,plateMat); plates.frustumCulled=false; plates.renderOrder=4; scene.add(plates); plates.visible=false;
}
let platesBuiltFor=-1;

/* ---------- Magnetfeld (Dipol, Achse wie heute geneigt), Sonnenwind und Polarlicht ---------- */
// geomagnetischer Nordpol (IGRF 2025): 80,8° N / 72,8° W – das Feld ist um gut 9° gegen die Erdachse geneigt
const MAGAX=dirLL(80.8,-72.8).normalize();
const MAGQ=new THREE.Quaternion().setFromUnitVectors(new V3(0,1,0),MAGAX);
const fieldG=new THREE.Group(); scene.add(fieldG); fieldG.visible=false;
const fieldMat=lmat({color:new THREE.Color(0.30,0.85,1.9), linewidth:1.4, blending:THREE.AdditiveBlending});
const aurLineMat=lmat({color:new THREE.Color(0.25,1.5,0.6), linewidth:1.5, blending:THREE.AdditiveBlending});
const fieldFaint=lmat({color:new THREE.Color(0.20,0.50,1.1), linewidth:1.0, blending:THREE.AdditiveBlending});
const FL=[], AURL=[];   // Feldlinien als Punktlisten (Welt): blau = Magnetfeld, grün = Linien zum Polarlichtoval
const AUR_L=6.5;        // Feldlinien, die im Polarlichtoval (ca. 67° magn. Breite) enden
const A_MP=2.1;         // Abstand der Magnetopause (Modell, verkleinert)
// Verformung durch den Sonnenwind: Tagseite zusammengedrückt (bleibt innerhalb der Magnetopause), Nachtseite zum Schweif gezogen.
// Jede Linie bleibt dabei eine geschlossene Schleife von Pol zu Pol.
function magDeform(v, src){
  const sd=v.dot(src);
  const s2= sd>0 ? A_MP*0.93*Math.tanh(sd/(A_MP*0.93)) : sd*(1+0.13*Math.min(-sd,5));
  const lat=v.clone().addScaledVector(src,-sd), lr=lat.length();
  if(sd>0 && lr>0.8) lat.multiplyScalar(1-0.10*Math.tanh(sd/A_MP)*Math.min(1,(lr-0.8)));   // Tagseite auch seitlich etwas enger
  const out=lat.addScaledVector(src,s2), r=v.length(), w=clamp((r-1.02)/0.9,0,1), ww=w*w*(3-2*w);
  return v.clone().lerp(out,ww);   // nahe der Erde unverformt: Linien enden auf der Oberfläche
}
function dipLoop(L,az,src,N){ const ca=Math.cos(az), sa=Math.sin(az), c0=Math.asin(Math.sqrt(0.995/L)), pts=[], v=new V3();
  for(let k=0;k<=N;k++){ const c=c0+(Math.PI-2*c0)*k/N, r=L*Math.sin(c)**2;
    v.set(r*Math.sin(c)*ca, r*Math.cos(c), r*Math.sin(c)*sa).applyQuaternion(MAGQ); const w=magDeform(v,src); pts.push(w.x,w.y,w.z); }
  return pts; }
let fieldSrc=null; const fieldLines=[];
function buildField(src){
  src=src||new V3(-1,0,0); fieldSrc=src.clone();
  const sets=[]; FL.length=0; AURL.length=0;
  // Ebenen der Feldlinien nach der Sonne ausrichten: so sieht man Tagseite (gestaucht) und Nachtseite (Schweif)
  const ref=new V3().copy(src).addScaledVector(MAGAX,-src.dot(MAGAX)).normalize(); const loc=ref.clone().applyQuaternion(MAGQ.clone().invert()); const az0=Math.atan2(loc.z,loc.x);
  // Hauptebene (Sonne–Erde–Magnetachse, quer zum Blick): wie die Lehrbuchskizze, Tagseite gestaucht, Nachtseite gestreckt
  for(const az of [az0, az0+Math.PI]){
    for(const L of [1.35,1.75,2.3,3.1,4.3]){ const p=dipLoop(L,az,src,120); FL.push(p); sets.push([p,fieldMat]); }
    for(const L of [AUR_L,8.5]){ const p=dipLoop(L,az,src,180); AURL.push(p); sets.push([p,aurLineMat]); } }
  // schwächere Linien rundherum: das Feld umgibt die ganze Erde
  for(let a=1;a<6;a++){ if(a===3) continue; const az=az0+a/6*TAU; for(const L of [1.6,2.4,3.4]){ const p=dipLoop(L,az,src,100); FL.push(p); sets.push([p,fieldFaint]); } }
  for(let a=0;a<6;a++){ if(a===0||a===3) continue; const az=az0+a/6*TAU; const p=dipLoop(AUR_L,az,src,160); AURL.push(p); sets.push([p,aurLineMat]); }
  for(let k=sets.length;k<fieldLines.length;k++) fieldLines[k].visible=false;
  sets.forEach(([p,m],k)=>{ let l=fieldLines[k];
    if(!l){ l=new THREE.Line2(new THREE.LineGeometry(),m); l.frustumCulled=false; l.renderOrder=5; fieldG.add(l); fieldLines[k]=l; }
    const ia=l.geometry.attributes.instanceStart; if(ia&&ia.data.array.length===(p.length/3-1)*6){ const A=ia.data.array; for(let q=0;q<p.length/3-1;q++){ for(let c=0;c<3;c++){ A[q*6+c]=p[q*3+c]; A[q*6+3+c]=p[q*3+3+c]; } } ia.data.needsUpdate=true; l.geometry.computeBoundingSphere(); } else { l.geometry.dispose(); l.geometry=new THREE.LineGeometry(); l.geometry.setPositions(p); } l.material=m; l.visible=true; l.userData.aur=m===aurLineMat; });
}
const aurLines={ forEach(f){ fieldLines.forEach((l,k)=>{ if(l.userData.aur&&k<FL.length+AURL.length) f(l); }); } };
buildField();

// Magnetopause: Grenze, an der der Sonnenwind abgelenkt wird (leuchtender Saum, Schweif zur Nachtseite)
// Form wie die Stromlinie um einen Rankine-Halbkörper: Abstand der Nase A_MP, Schweif-Radius 2·A_MP
function mpRadius(th){ const c=Math.cos(th), sn=Math.sin(th); return sn<1e-4 ? A_MP : A_MP*Math.sqrt(2*(1+c))/sn; }   // th: Winkel zur Schweifachse
const mpGeo=(()=>{ const NU=120, NV=64, pos=[], idx=[];
  for(let i=0;i<=NU;i++){ const th=Math.PI-(Math.PI-0.30)*i/NU, r=mpRadius(th);
    for(let k=0;k<=NV;k++){ const ph=k/NV*TAU, rho=r*Math.sin(th); pos.push(-r*Math.cos(th), rho*Math.cos(ph), rho*Math.sin(ph)); } }
  for(let i=0;i<NU;i++) for(let k=0;k<NV;k++){ const a=i*(NV+1)+k, b=a+NV+1; idx.push(a,b,a+1,b,b+1,a+1); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
const mpMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  uniforms:{uOn:{value:0},uTime:U.uTime},
  vertexShader:`varying vec3 vN,vV;varying float vX;void main(){vec4 w=modelMatrix*vec4(position,1.0);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);vX=position.x;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uOn,uTime;varying vec3 vN,vV;varying float vX;
    void main(){float f=pow(1.0-abs(dot(vN,vV)),3.0);float nose=smoothstep(-0.5,2.6,vX);
      float wav=0.85+0.15*sin(vX*6.0-uTime*2.0);
      gl_FragColor=vec4(vec3(0.45,0.55,1.6)*f*(0.15+0.85*smoothstep(-3.0,2.2,vX))*wav*uOn*0.28,1.0);}`});
const mpMesh=new THREE.Mesh(mpGeo,mpMat); mpMesh.frustumCulled=false; mpMesh.renderOrder=4; scene.add(mpMesh); mpMesh.visible=false;
// Sonne: heller Schein in Richtung des Sonnenwinds
const sunMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,uniforms:{uOn:{value:0},uTime:U.uTime},
  vertexShader:`varying vec2 vU;void main(){vU=uv*2.0-1.0;vec4 mv=modelViewMatrix*vec4(0.0,0.0,0.0,1.0);mv.xy+=position.xy;gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform float uOn,uTime;varying vec2 vU;void main(){float r=length(vU);if(r>1.0)discard;
    float core=smoothstep(0.32,0.26,r);float halo=exp(-r*r*5.0)*0.9+exp(-r*2.6)*0.35;
    float a=atan(vU.y,vU.x);float rays=0.5+0.5*sin(a*14.0+uTime*0.4)*sin(a*5.0-uTime*0.25);halo*=0.85+0.3*rays*smoothstep(0.25,0.9,r);
    gl_FragColor=vec4((vec3(3.6,2.9,1.6)*core+vec3(2.2,1.3,0.45)*halo)*uOn,1.0);}`});
const sunMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),sunMat); sunMesh.frustumCulled=false; sunMesh.renderOrder=1; scene.add(sunMesh); sunMesh.visible=false;

// leuchtende Punkte (Feldrichtung, Sonnenwind, eingefangene Teilchen)
function glowPoints(n,col,size){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));
  g.setAttribute('aA',new THREE.Float32BufferAttribute(new Float32Array(n),1));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{uCol:{value:col},uSize:{value:size},uPR:U.uPR,uOpen:U.uOpen},
    vertexShader:`attribute float aA;uniform float uSize,uPR;varying float vA;
      void main(){vA=aA;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=uSize*uPR*clamp(3.0/-mv.z,0.6,2.2);}`,
    fragmentShader:`uniform vec3 uCol;varying float vA;void main(){vec2 d=gl_PointCoord-0.5;float r=dot(d,d)*4.0;if(r>1.0)discard;
      float k=exp(-r*4.0)+0.25*exp(-r*1.2);gl_FragColor=vec4(uCol*k*vA,1.0);}`});
  const p=new THREE.Points(g,m); p.frustumCulled=false; p.renderOrder=6; scene.add(p); p.visible=false; return p;
}
const NW=1100, WK=9, NF=220, FK=12;   // Sonnenwind-Teilchen, Spursegmente; eingefangene Teilchen, Spurpunkte
const MAGF={ dots:glowPoints(240,new V3(0.55,1.4,3.0),9), wind:glowPoints(NW,new V3(3.0,2.3,1.1),6), fun:glowPoints(NF,new V3(2.2,3.4,2.4),12),
  d:[], w:[], f:[], src:new V3(-1,0,0), view:new V3(0,0,1), on:0, aur:0 };
for(let i=0;i<240;i++) MAGF.d.push({l:(Math.random()*FL.length)|0, t:Math.random(), v:0.10+Math.random()*0.08});
function insideMP(x,y,z){ const r=Math.hypot(x,y,z), th=Math.acos(Math.max(-1,Math.min(1,x/(r||1)))); return r<mpRadius(th)*1.04; }
function windSpawn(o,first){ do{ o.x=first?-8+Math.random()*15:-8-Math.random()*1.5; o.y=(Math.random()*2-1)*4.8; o.z=(Math.random()*2-1)*0.12; }while(insideMP(o.x,o.y,o.z)); o.v=0.9+Math.random()*0.5; }   // flache Schicht quer zum Blick: Umströmung gut sichtbar
for(let i=0;i<NW;i++){ const o={}; windSpawn(o,true); MAGF.w.push(o); }
const windLine=(()=>{ const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(NW*WK*6),3)); g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(NW*WK*6),3));
  const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}));
  l.frustumCulled=false; l.renderOrder=6; l.visible=false; scene.add(l); return l; })();
for(let i=0;i<NF;i++) MAGF.f.push({on:false, h:new Float32Array(FK*3), hn:0});
const funLine=(()=>{ const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(NF*(FK-1)*6),3)); g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(NF*(FK-1)*6),3));
  const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}));
  l.frustumCulled=false; l.renderOrder=7; l.visible=false; scene.add(l); return l; })();
// Einschläge am Polarlichtoval: lassen das Polarlicht dort kurz aufleuchten
const AUR_HITS=10, aurHits=[]; for(let i=0;i<AUR_HITS;i++) aurHits.push(new THREE.Vector4(0,1,0,0));

// Polarlicht: leuchtende Vorhänge entlang der Polarlichtovale (nach dem Erdumlauf-Labor V2)
const AUR_N=384, aurGeo=new THREE.BufferGeometry();
{ const pos=[],uv=[],idx=[]; for(let i=0;i<=AUR_N;i++) for(let j=0;j<2;j++){ pos.push(0,0,0); uv.push(i/AUR_N,j); }
  for(let i=0;i<AUR_N;i++){ const a=i*2; idx.push(a,a+2,a+1,a+1,a+2,a+3); }
  aurGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); aurGeo.setAttribute('auv',new THREE.Float32BufferAttribute(uv,2)); aurGeo.setIndex(idx); }
const aurU={uMag:{value:MAGAX}, uNight:{value:new V3(1,0,0)}, uOn:{value:0}, uHit:{value:aurHits}};
function aurMat(sign,flat){ return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  uniforms:Object.assign({uSign:{value:sign},uFlat:{value:flat?1:0},uTime:U.uTime,uOpen:U.uOpen},aurU),
  vertexShader:`attribute vec2 auv;uniform vec3 uMag,uNight;uniform float uTime,uSign,uFlat;varying vec2 vA;varying float vMid;varying vec3 vW;
  void main(){vec3 m=normalize(uMag)*uSign;vec3 a=normalize(uNight-m*dot(uNight,m)),b=cross(m,a);
    float ph=(auv.x*2.0-1.0)*3.14159265;
    float th0=radians(19.0+3.5*cos(ph))+0.02*sin(3.0*ph+uTime*0.15)+0.01*sin(7.0*ph-uTime*0.31);
    float th=th0+uFlat*(auv.y-0.5)*radians(5.0);
    vec3 d=cos(th)*m+sin(th)*(cos(ph)*a+sin(ph)*b);
    float ch=cos(ph*0.5);vMid=0.40+0.60*ch*ch;vA=vec2(ph,auv.y);
    vec4 w=modelMatrix*vec4(d*mix(1.016+auv.y*0.085,1.004,uFlat),1.0);vW=w.xyz;
    gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime,uOn,uFlat,uOpen;uniform vec4 uHit[10];varying vec2 vA;varying float vMid;varying vec3 vW;
  ${GL_NOISE}
  void main(){float az=atan(vW.z,vW.x);if(uOpen>0.002&&az>-0.02&&az<uOpen+0.02)discard;
    float ph=vA.x,h=vA.y;vec2 c=vec2(cos(ph),sin(ph));
    float rn=vn(c*26.0+vec2(uTime*0.55,uTime*0.21));float rays=0.15+1.1*rn*rn+0.35*vn(c*7.0+vec2(uTime*0.18,4.0));
    float folds=0.45+0.55*vn(c*3.0+vec2(uTime*0.06,9.0));
    float I,shape;vec3 col;
    if(uFlat>0.5){float q=(h-0.5)*2.0;shape=exp(-q*q*5.0);col=vec3(0.20,1.0,0.50);I=shape*(0.35+0.5*rays)*vMid*0.55;}
    else{shape=smoothstep(0.0,0.10,h)*(1.0-smoothstep(0.15,1.0,h))*(1.0-0.45*h);
      col=mix(vec3(0.16,1.0,0.46),vec3(0.95,0.16,0.42),smoothstep(0.35,0.95,h));I=shape*rays*folds*vMid*2.4;}
    vec3 dn=normalize(vW);float hit=0.0;
    for(int i=0;i<10;i++){float c=dot(dn,uHit[i].xyz);hit+=uHit[i].w*exp(-(1.0-c)*1800.0);}
    I+=hit*(uFlat>0.5?0.6:1.0)*(uFlat>0.5?1.0:shape*1.6+0.15*(1.0-h));
    col=mix(col,vec3(0.75,1.0,0.80),clamp(hit*0.35,0.0,0.5));
    gl_FragColor=vec4(col*I*uOn,1.0);}`}); }
const auroraG=new THREE.Group(); scene.add(auroraG); auroraG.visible=false;
[1,-1].forEach(sg=>{ [0,1].forEach(fl=>{ const m=new THREE.Mesh(aurGeo,aurMat(sg,fl)); m.frustumCulled=false; m.renderOrder=fl?2:7; auroraG.add(m); }); });
// Punkt auf dem Polarlichtoval (Mitternachtsseite), für Beschriftung und Kamera
function auroraPoint(sign,r){ const m=MAGAX.clone().multiplyScalar(sign), n=aurU.uNight.value;
  const a=n.clone().addScaledVector(m,-n.dot(m)).normalize(), th=22.5*DEG; return m.multiplyScalar(Math.cos(th)).addScaledVector(a,Math.sin(th)).multiplyScalar(r||1.05); }

const _mw=new V3(), _mq=new V3(), _mb1=new V3(), _mb2=new V3(), _ft=new V3(), _fn=new V3(), _fb=new V3(), _fp=new V3();
// Punkt auf einer grünen Feldlinie: t=0 Scheitel, t=1 Fußpunkt am Pol der Halbkugel s
function aurLinePt(l,s,t,out){ const L=AURL[l], n=L.length/3-1, u=s>0?0.5-0.5*t:0.5+0.5*t, x=clamp(u,0,1)*n, k=Math.min(n-1,Math.floor(x)), f=x-k;
  return out.set(L[k*3]+(L[k*3+3]-L[k*3])*f, L[k*3+1]+(L[k*3+4]-L[k*3+1])*f, L[k*3+2]+(L[k*3+5]-L[k*3+2])*f); }
function funCapture(o,p0){ if(!AURL.length) return;
  const s=p0.dot(MAGAX)>=0?1:-1;
  // Tagseitige grüne Linie wählen, deren Scheitel der Einfangstelle am nächsten liegt
  let best=0,bd=1e9; for(let l=0;l<AURL.length;l++){ aurLinePt(l,s,0.22,_fp); const d=_fp.distanceToSquared(p0)+(Math.random()*0.3); if(d<bd){bd=d;best=l;} }
  o.on=true; o.l=best; o.s=s; o.t=0.22; o.age=0; o.blend=0.45+Math.random()*0.25; o.v=0.22+Math.random()*0.10; o.flash=0;
  o.p0=(o.p0||new V3()).copy(p0); o.ph=Math.random()*TAU; o.w=7+Math.random()*4; o.hn=0; }
function funPos(o,out){
  aurLinePt(o.l,o.s,o.t,_fp);
  // Kreisbewegung um die Feldlinie: Radius wird zum Pol hin kleiner (stärkeres Feld)
  aurLinePt(o.l,o.s,Math.min(1,o.t+0.01),_ft); _ft.sub(_fp); if(_ft.lengthSq()<1e-10) _ft.copy(MAGAX); _ft.normalize();
  _fn.copy(Math.abs(_ft.y)<0.9?new V3(0,1,0):new V3(1,0,0)).cross(_ft).normalize(); _fb.crossVectors(_ft,_fn);
  o.ph+=o.w*(1+2.5*o.t)*Math.min(0.05,o.dt||0.016); const rg=0.07*(1-o.t)*(1-o.t)+0.004;
  out.copy(_fp).addScaledVector(_fn,Math.cos(o.ph)*rg).addScaledVector(_fb,Math.sin(o.ph)*rg);
  if(o.age<o.blend){ const b=o.age/o.blend, e=b*b*(3-2*b); out.lerp(o.p0,1-e); }   // vom Einfangort weich zur Feldlinie schwenken
  return out; }
function funHit(o){ aurLinePt(o.l,o.s,1,_fp); _fp.normalize();
  let h=aurHits[0]; for(const q of aurHits) if(q.w<h.w) h=q; h.set(_fp.x,_fp.y,_fp.z,1.0); }
// Strömung des Sonnenwinds um die Magnetosphäre (Umströmung einer Kugel, Radius A_MP)
function magUpdate(dt, fieldOn, aurOn, camRight, camBack){
  dt=Math.min(dt,0.05)*(window.__magSpeed||1);   // (Testhilfe: __magSpeed beschleunigt nur diese Animation)
  if(camBack) MAGF.view.copy(camBack);
  MAGF.on+=((fieldOn?1:0)-MAGF.on)*Math.min(1,dt*4); MAGF.aur+=((aurOn?1:0)-MAGF.aur)*Math.min(1,dt*3);
  fieldG.visible=MAGF.on>0.01; fieldMat.opacity=MAGF.on; fieldFaint.opacity=MAGF.on*0.55; aurLineMat.opacity=MAGF.aur*0.85;
  aurLines.forEach(l=>l.visible=MAGF.aur>0.01);
  // Sonne/Sonnenwind kommt immer von links im Bild
  // Sonnenrichtung folgt der Kamera weich (kein Springen beim Drehen); Feld wird in kleinen Schritten nachgeführt
  _mq.copy(camRight).multiplyScalar(-1).normalize();
  if(MAGF.src.dot(_mq)<0.2) MAGF.src.copy(_mq); else MAGF.src.lerp(_mq,Math.min(1,dt*4)).normalize();
  if(fieldG.visible && (!fieldSrc || fieldSrc.dot(MAGF.src)<0.99997)) buildField(MAGF.src);   // Feld folgt der Sonnenrichtung (alle ca. 3°)
  aurU.uNight.value.copy(MAGF.src).multiplyScalar(-1); aurU.uOn.value=MAGF.aur; auroraG.visible=MAGF.aur>0.01;
  // Feldrichtung: Lichtpunkte wandern von der Süd- zur Nordhalbkugel
  { const P=MAGF.dots, pos=P.geometry.attributes.position.array, al=P.geometry.attributes.aA.array; P.visible=MAGF.on>0.01;
    if(P.visible) MAGF.d.forEach((o,i)=>{ o.t-=dt*o.v; if(o.t<0){ o.t=1; o.l=(Math.random()*FL.length)|0; }
      const L=FL[o.l], n=L.length/3-1, x=o.t*n, k=Math.min(n-1,Math.floor(x)), f=x-k;
      _mq.set(L[k*3]+(L[k*3+3]-L[k*3])*f, L[k*3+1]+(L[k*3+4]-L[k*3+1])*f, L[k*3+2]+(L[k*3+5]-L[k*3+2])*f);
      pos[i*3]=_mq.x; pos[i*3+1]=_mq.y; pos[i*3+2]=_mq.z; al[i]=MAGF.on*Math.sin(Math.PI*o.t)*0.9; });
    P.geometry.attributes.position.needsUpdate=true; P.geometry.attributes.aA.needsUpdate=true; }
  // Sonnenwind: leuchtende Teilchen, deren Spur der gebogenen Strömung folgt (rückwärts entlang der Stromlinie berechnet)
  const flowV=(x,y,z,out)=>{ const r2=x*x+y*y+z*z, r=Math.sqrt(r2), m2=A_MP*A_MP/(r2*r); out[0]=1+m2*x; out[1]=m2*y; out[2]=m2*z; return out; };
  const fv=[0,0,0];
  { const P=MAGF.wind, pos=P.geometry.attributes.position.array, al=P.geometry.attributes.aA.array; P.visible=windLine.visible=MAGF.aur>0.01;
    if(P.visible){ const ex=MAGF.src.clone().multiplyScalar(-1); _mb2.copy(MAGF.view).addScaledVector(ex,-MAGF.view.dot(ex)).normalize(); _mb1.crossVectors(_mb2,ex).normalize();
      const LP=windLine.geometry.attributes.position, LC=windLine.geometry.attributes.color, lp=LP.array, lc=LC.array;
      const W=(x,y,z,o)=>o.copy(ex).multiplyScalar(x).addScaledVector(_mb1,y).addScaledVector(_mb2,z);
      MAGF.w.forEach((o,i)=>{
        flowV(o.x,o.y,o.z,fv); const sp=o.v*1.5;
        // halbe Schritte: genauer an der Nase
        for(let h=0;h<2;h++){ flowV(o.x,o.y,o.z,fv); o.x+=fv[0]*sp*dt*0.5; o.y+=fv[1]*sp*dt*0.5; o.z+=fv[2]*sp*dt*0.5; }
        flowV(o.x,o.y,o.z,fv); const vl=Math.hypot(fv[0],fv[1],fv[2]);
        if(o.x>8||Math.abs(o.y)>6.5||(o.x>-A_MP*1.6&&vl<0.10)) { windSpawn(o,false); flowV(o.x,o.y,o.z,fv); }
        // Einfangen: am Tagseiten-Rand oberhalb/unterhalb der Nase („Trichter“ über den Polen)
        const rr=Math.hypot(o.x,o.y,o.z), th=Math.acos(clamp(o.x/rr,-1,1)), gap=rr-mpRadius(th);
        if(o.x>-A_MP*0.9&&o.x<A_MP*0.5&&Math.abs(o.y)>A_MP*0.55&&gap<0.30&&Math.random()<dt*2.2){
          const f=MAGF.f.find(q=>!q.on); if(f){ W(o.x,o.y,o.z,_mw); funCapture(f,_mw); windSpawn(o,false); flowV(o.x,o.y,o.z,fv); } }
        const bend=Math.min(1,Math.hypot(fv[1],fv[2])*2.2);
        const A=MAGF.aur*Math.min(1,(o.x+9.5)*0.6)*Math.min(1,(7.5-o.x)*0.5)*(0.55+0.75*bend);
        // Spur: WK Segmente rückwärts entlang der Stromlinie, Länge abhängig von der Geschwindigkeit
        let x=o.x,y=o.y,z=o.z; const segL=(0.07+0.05*o.v)*Math.min(1.6,0.45+vl);
        W(x,y,z,_mw); pos[i*3]=_mw.x; pos[i*3+1]=_mw.y; pos[i*3+2]=_mw.z; al[i]=A*0.9;
        for(let k=0;k<WK;k++){ flowV(x,y,z,fv); const l=Math.hypot(fv[0],fv[1],fv[2])||1;
          const x2=x-fv[0]/l*segL, y2=y-fv[1]/l*segL, z2=z-fv[2]/l*segL;
          W(x2,y2,z2,_mq); const j=(i*WK+k)*6, a0=A*Math.pow(1-k/WK,2.2), a1=A*Math.pow(1-(k+1)/WK,2.2);
          lp[j]=_mw.x; lp[j+1]=_mw.y; lp[j+2]=_mw.z; lp[j+3]=_mq.x; lp[j+4]=_mq.y; lp[j+5]=_mq.z;
          lc[j]=2.1*a0; lc[j+1]=1.35*a0; lc[j+2]=0.45*a0; lc[j+3]=2.1*a1; lc[j+4]=1.2*a1; lc[j+5]=0.35*a1;
          _mw.copy(_mq); x=x2; y=y2; z=z2; } });
      LP.needsUpdate=true; LC.needsUpdate=true; }
    P.geometry.attributes.position.needsUpdate=true; P.geometry.attributes.aA.needsUpdate=true; }
  // eingefangene Teilchen: schwenken auf eine grüne Feldlinie ein, kreisen spiralförmig um sie (wie echte geladene Teilchen)
  // und rasen zum Pol – dort bringen sie die Luft zum Leuchten (Polarlicht flammt auf)
  { const P=MAGF.fun, pos=P.geometry.attributes.position.array, al=P.geometry.attributes.aA.array, FLp=funLine.geometry.attributes.position, FLc=funLine.geometry.attributes.color;
    P.visible=funLine.visible=MAGF.aur>0.01;
    // ab und zu auch ohne sichtbaren Einfang einen Teilchenstrom starten (gleichmäßiger Eindruck)
    for(let q=0;q<4;q++) if(P.visible&&AURL.length&&Math.random()<dt*1.4){ const f=MAGF.f.find(q=>!q.on); if(f){ const sg=Math.random()<0.5?1:-1;
      const l=(Math.random()*AURL.length)|0; aurLinePt(l,sg,0.22,_mw); _mw.addScaledVector(MAGF.src,0.12); funCapture(f,_mw); } }
    MAGF.f.forEach((o,i)=>{ const j0=i*(FK-1)*6;
      if(!o.on){ al[i]=0; for(let k=0;k<(FK-1)*6;k++) FLc.array[j0+k]=0; return; }
      o.age+=dt; o.dt=dt; o.hs=(o.hs||0)+dt;
      if(o.flash>0){ o.flash-=dt; if(o.flash<=0){ o.on=false; } }
      else if(o.age>o.blend){ o.t+=dt*o.v*(0.35+1.6*o.t*o.t); if(o.t>=1){ o.t=1; o.flash=0.5; funHit(o); } }
      funPos(o,_mw);
      pos[i*3]=_mw.x; pos[i*3+1]=_mw.y; pos[i*3+2]=_mw.z;
      // Verlauf (Spur)
      if(o.flash<=0){ const dx=_mw.x-o.h[3],dy=_mw.y-o.h[4],dz=_mw.z-o.h[5]; if(o.hn<2||dx*dx+dy*dy+dz*dz>0.0016){ o.hs=0; o.h.copyWithin(3,0,(FK-1)*3); o.hn=Math.min(FK,o.hn+1); } o.h[0]=_mw.x; o.h[1]=_mw.y; o.h[2]=_mw.z; }
      const fade=o.flash>0?o.flash/0.5:1;
      al[i]=MAGF.aur*(o.flash>0?2.2*fade:Math.min(1,o.age*2.5)*1.0);
      for(let k=0;k<FK-1;k++){ const j=j0+k*6, ok=k+1<o.hn && (Math.hypot(o.h[k*3]-o.h[k*3+3],o.h[k*3+1]-o.h[k*3+4],o.h[k*3+2]-o.h[k*3+5])<0.2);
        for(let c=0;c<3;c++){ FLp.array[j+c]=o.h[k*3+c]; FLp.array[j+3+c]=o.h[(k+1)*3+c]; }
        const a0=ok?MAGF.aur*fade*Math.pow(1-k/(FK-1),1.6):0, a1=ok?MAGF.aur*fade*Math.pow(1-(k+1)/(FK-1),1.6):0;
        FLc.array[j]=0.9*a0; FLc.array[j+1]=2.3*a0; FLc.array[j+2]=1.2*a0; FLc.array[j+3]=0.5*a1; FLc.array[j+4]=1.6*a1; FLc.array[j+5]=0.8*a1; } });
    FLp.needsUpdate=true; FLc.needsUpdate=true;
    P.geometry.attributes.position.needsUpdate=true; P.geometry.attributes.aA.needsUpdate=true; }
  // Einschläge klingen ab
  aurHits.forEach(h=>{ h.w=Math.max(0,h.w-dt*0.9); });
  // Magnetopause, Sonne
  mpMesh.visible=sunMesh.visible=MAGF.aur>0.01; mpMat.uniforms.uOn.value=MAGF.aur; sunMat.uniforms.uOn.value=MAGF.aur;
  mpMesh.quaternion.setFromUnitVectors(new V3(1,0,0),MAGF.src);
  sunMesh.position.copy(MAGF.src).multiplyScalar(6.0).addScaledVector(_mb1,0.0);
}

/* ---------- Texturen laden ---------- */
function prepTex(t,mip){ t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.ClampToEdgeWrapping; t.anisotropy=maxAniso; t.minFilter=mip?THREE.LinearMipmapLinearFilter:THREE.LinearFilter; t.magFilter=THREE.LinearFilter; t.generateMipmaps=!!mip; t.needsUpdate=true; return t; }
function texFrom(name, maxW, mip, raw){ return loadBitmap(name, raw).then(b=>{ const c=bitmapCanvas(b,maxW); const t=new THREE.Texture(c); if(c.width>4096) t.onUpdate=()=>{ setTimeout(()=>{ c.width=1; c.height=1; },0); }; return prepTex(t,mip); }); }
let assetsLeft=0;
function loadAssets(done){
  const jobs=[];
  const structJob=(name,key,uni)=>loadBitmap(name,true).then(b=>{ const c=bitmapCanvas(b); const g=c.getContext('2d'); STRUCT.w=c.width; STRUCT.h=c.height; STRUCT[key]=g.getImageData(0,0,c.width,c.height).data;
    const t=new THREE.DataTexture(new Uint8Array(STRUCT[key].buffer.slice(0)), c.width, c.height, THREE.RGBAFormat); t.flipY=true;
    // DataTexture kennt kein flipY beim Hochladen: Zeilen selbst spiegeln
    const W=c.width,H=c.height,src=STRUCT[key],dst=t.image.data; for(let y=0;y<H;y++){ dst.set(src.subarray((H-1-y)*W*4,(H-y)*W*4), y*W*4); }
    t.flipY=false; t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.ClampToEdgeWrapping; t.minFilter=t.magFilter=THREE.LinearFilter; t.generateMipmaps=false; t.needsUpdate=true; uni.value=t; });
  jobs.push(structJob('struct1.png','a',U.tS1), structJob('struct2.png','b',U.tS2));
  jobs.push(texFrom('earth_day.jpg', strong?8192:4096, true).then(t=>{ earthMat.uniforms.tDay.value=t; }));
  jobs.push(texFrom('earth_cw.jpg', 4096, true).then(t=>{ earthMat.uniforms.tCW.value=t; }));
  jobs.push(texFrom('earth_height.jpg', 2048, false).then(t=>{ earthMat.uniforms.tHeight.value=t; }));
  jobs.push(texFrom('milkyway.jpg', 2048, false).then(t=>{ skyMat.uniforms.tMW.value=t; skyMat.uniforms.uHas.value=1; }).catch(()=>{}));
  Promise.all(jobs.map(j=>j.catch(e=>{ diag(String(e&&e.message||e)); }))).then(()=>{
    STRUCT.ready=!!(STRUCT.a&&STRUCT.b);
    if(STRUCT.ready){ STRUCT.pN=poleMean(true); STRUCT.pS=poleMean(false);
      const f=v=>v/255; U.uPN1.value.set(f(STRUCT.pN[0]),f(STRUCT.pN[1]),f(STRUCT.pN[2])); U.uPN2.value.set(f(STRUCT.pN[3]),f(STRUCT.pN[4]),f(STRUCT.pN[5]));
      U.uPS1.value.set(f(STRUCT.pS[0]),f(STRUCT.pS[1]),f(STRUCT.pS[2])); U.uPS2.value.set(f(STRUCT.pS[3]),f(STRUCT.pS[4]),f(STRUCT.pS[5])); U.uPoleOn.value=1; }
    PROBE_S=structAt(LUX_LAT,LON0);
    labProfiles(); buildPlates();
    done();
  });
}
