/* ==========================================================================
   Pyramiden-Labor · Teil B: 3D-Szene
   Achsen: x = Anzahl (Männer nach links, Frauen nach rechts), y = Alter, z = Zeit (Zukunft kommt nach vorn).
   ========================================================================== */
const G={AH:0.1,H:10.1,XW:6.0,GAP:0.5,DZ:0.13,DEPTH:0.9};
const QS=new URLSearchParams(location.search), QLO=QS.get('q')==='lo';
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}}, lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};

// Zustand
const S={pres:QS.has('vorfuehren')||QS.has('beamer')||lsGet('geogym-pyr-pres')==='1',lang:lsGet('geogym-pyr-lang')||'de',theme:lsGet('geogym-pyr-theme')==='dark'?'dark':'light',c:'LU',year:2024,mode:'abs',grp:1,grpPref:1,fixed:true,view:'front',
  events:true,groups:false,excess:false,rates:false,birth:false,people:false,pstage:2,stripes:true,
  cmp:null,cmpYear:null,tmpl:null,cohort:null,playing:false,speed:4,station:0,tab:'learn',chartMode:'land',film:false,hover:null};
const C=()=>DATA.by[S.c];

const stage=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setClearColor(0xF4F6F9,1);
stage.insertBefore(renderer.domElement,stage.firstChild);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(30,1,0.1,600);
camera.position.set(0,5.2,27.5);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.target.set(0,4.9,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=6;controls.maxDistance=90;controls.maxPolarAngle=Math.PI*.497;controls.enablePan=true;controls.screenSpacePanning=true;

// Farben beider Fassungen; applyTheme() setzt sie
const COL={m:new THREE.Color(),f:new THREE.Color(),my:new THREE.Color(),fy:new THREE.Color(),mo:new THREE.Color(),fo:new THREE.Color(),mw:new THREE.Color(),fw:new THREE.Color(),mx:new THREE.Color(),fx:new THREE.Color(),hi:new THREE.Color()};
const THEMES={
  light:{bg:'#F5F5F7',floorBg:[.961,.961,.969],base:[.992,.992,.996],glow:[-.012,-.012,-.010],grid:[.62,.64,.70],gridK:.42,skyTop:[.995,.995,.998],skyBot:[.961,.961,.969],
    tick:0x8E8E93,tickOp:.38,axis:0x1D1D1F,axisOp:.78,col:{m:'#0A7AFF',f:'#FF2D6F',my:'#00B8A9',fy:'#2ED0B4',mo:'#FF9500',fo:'#FFB340',mw:'#7DB2F5',fw:'#F79ABB',mx:'#0047B3',fx:'#B80046',hi:'#FFB800'},
    cmp:0xFF9500,tmpl:0x1D1D1F,now:0x1D1D1F,outline:0x1D1D1F,fill:0xE4E6EC,fillOp:.9,light:1,bloom:false,shadow:.11,gloss:1},
  dark:{bg:'#05070C',floorBg:[.02,.028,.047],base:[.02,.028,.047],glow:[.035,.05,.085],grid:[.3,.38,.52],gridK:.34,skyTop:[.012,.016,.028],skyBot:[.036,.05,.085],
    tick:0x8FA3BD,tickOp:.32,axis:0xC9D3DF,axisOp:.6,col:{m:'#4AA3FF',f:'#FF6F91',my:'#33C7B8',fy:'#5BE0A8',mo:'#F2A93B',fo:'#FFC560',mw:'#5C86B8',fw:'#B8708A',mx:'#BFE0FF',fx:'#FFD0DB',hi:'#FFF1BF'},
    cmp:0xFFE08A,tmpl:0xFFFFFF,now:0xFFFFFF,outline:0xEAF0F7,fill:0x121A28,fillOp:.9,light:0,bloom:true,shadow:0,gloss:.45}};
let TH=THEMES.light;
const U_LIGHT={value:1},U_HI={value:new THREE.Vector3(1,.64,0)},U_BG={value:new THREE.Vector3(.961,.961,.969)},U_GLOSS={value:1};

/* ---------- Boden und Hintergrund ---------- */
const floor=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.ShaderMaterial({
  extensions:{derivatives:true},
  uniforms:{uBg:{value:new THREE.Vector3()},uBase:{value:new THREE.Vector3()},uGlow:{value:new THREE.Vector3()},uGrid:{value:new THREE.Vector3()},uGridK:{value:.5},uShadow:{value:0}},
  vertexShader:`varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`varying vec3 vW;uniform vec3 uBg,uBase,uGlow,uGrid;uniform float uGridK,uShadow;
    float grid(vec2 p,float s){vec2 q=p/s;vec2 g=abs(fract(q-.5)-.5)/fwidth(q);return 1.-min(min(g.x,g.y),1.);}
    void main(){float r=length(vW.xz*vec2(1.,.75));float glow=exp(-r*r/90.);float far=exp(-r/38.);
      vec3 c=mix(uBg,uBase,exp(-r/60.))+uGlow*glow;
      float gl=(grid(vW.xz,1.)*.42+grid(vW.xz,5.)*.8)*far;
      c=mix(c,uGrid,clamp(gl*uGridK,0.,1.));
      float ax=abs(vW.x)/7.4,az=(vW.z-.5)/1.9;c*=1.-uShadow*exp(-ax*ax*ax*ax)*exp(-az*az);   // weicher Schatten: die Pyramide steht auf dem Tisch
      gl_FragColor=vec4(c,1.);}`}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.012;scene.add(floor);
const sky=new THREE.Mesh(new THREE.SphereGeometry(300,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
  uniforms:{uTop:{value:new THREE.Vector3()},uBot:{value:new THREE.Vector3()}},
  vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vP;uniform vec3 uTop,uBot;void main(){float h=normalize(vP).y;gl_FragColor=vec4(mix(uBot,uTop,smoothstep(0.,.55,h)),1.);}`}));
scene.add(sky);

/* ---------- Balken ---------- */
const NB=2*NA;
const barGeo=new THREE.BoxGeometry(1,1,1);barGeo.translate(.5,.5,0);
const NBX=NB+2;   // + je ein Balken für die Neugeborenen des laufenden Jahres
const aCol=new THREE.InstancedBufferAttribute(new Float32Array(NBX*3),3),aHi=new THREE.InstancedBufferAttribute(new Float32Array(NBX),1);
const U_YEAR={value:2024},U_STRIPE={value:.07};
barGeo.setAttribute('aCol',aCol);barGeo.setAttribute('aHi',aHi);
const BAR_VS=`attribute vec3 aCol;attribute float aHi;varying vec3 vCol;varying float vHi;varying vec3 vN;varying vec3 vL;varying vec3 vW;
  void main(){vec4 wp=modelMatrix*instanceMatrix*vec4(position,1.);vL=position;vec3 n=normal;n.x*=sign(instanceMatrix[0][0]);vN=n;vCol=aCol;vHi=aHi;vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const BAR_FS=`uniform float uAlpha;uniform float uProj;uniform float uYear;uniform float uStripe;uniform float uLight;uniform float uGloss;uniform vec3 uHi;varying vec3 vCol;varying float vHi;varying vec3 vN;varying vec3 vL;varying vec3 vW;
  void main(){vec3 L=normalize(vec3(.3,.85,.6));float d=max(dot(normalize(vN),L),0.);
    float g=mix(mix(.6,.86,uLight),1.,smoothstep(0.,1.,vL.x));
    vec3 c=vCol*(mix(.4,.72,uLight)+mix(.72,.34,uLight)*d)*g;
    c+=vCol*mix(.22,.05,uLight)*step(.5,vN.y);
    float by=floor(uYear-vW.y/.1+1e-3);c*=1.+uStripe*(step(5.,mod(by,10.))*2.-1.);   // je fünf Geburtsjahrgänge heller/dunkler: die Streifen wandern mit
    float s=step(.5,fract((vW.x*sign(vW.x)+vW.y)*2.4));vec3 cp=mix(c*(.62+.38*s),mix(c,vec3(1.),.45*(1.-s)),uLight);c=mix(c,cp,uProj*step(.5,abs(vN.z)));   // Projektion: schraffiert
    c=mix(c,uHi*(mix(.85,.94,uLight)+mix(.5,.12,uLight)*d),vHi);
    float fr=step(.5,abs(vN.z))*uGloss;c=mix(c,vec3(1.),fr*.15*smoothstep(.55,1.,vL.y));c*=1.-fr*.09*smoothstep(.35,0.,vL.y);   // Glanzkante
    gl_FragColor=vec4(c,uAlpha);}`;
const barMat=new THREE.ShaderMaterial({uniforms:{uAlpha:{value:1},uProj:{value:0},uYear:U_YEAR,uStripe:U_STRIPE,uLight:U_LIGHT,uGloss:U_GLOSS,uHi:U_HI},vertexShader:BAR_VS,fragmentShader:BAR_FS,side:THREE.DoubleSide,transparent:false});
const bars=new THREE.InstancedMesh(barGeo,barMat,NBX);bars.frustumCulled=false;scene.add(bars);
// Überschuss (das Stück, um das ein Geschlecht das andere überragt)
const NX=NA+NE-1;   // Überschuss: 0 … 100 und 101 … 119
const exGeo=barGeo.clone();const exCol=new THREE.InstancedBufferAttribute(new Float32Array(NX*3),3),exHi=new THREE.InstancedBufferAttribute(new Float32Array(NX),1);
exGeo.setAttribute('aCol',exCol);exGeo.setAttribute('aHi',exHi);
const exMat=new THREE.ShaderMaterial({uniforms:{uAlpha:{value:1},uProj:{value:0},uYear:U_YEAR,uStripe:{value:0},uLight:U_LIGHT,uGloss:U_GLOSS,uHi:U_HI},vertexShader:BAR_VS,fragmentShader:BAR_FS,side:THREE.DoubleSide});
const exBars=new THREE.InstancedMesh(exGeo,exMat,NX);exBars.frustumCulled=false;exBars.visible=false;scene.add(exBars);
// Jahrgänge über 100 (nur bei „1 Jahr“): die Pyramide läuft oben weiter aus, ohne dass die Altersachse verlängert wird
const NT=NE-1,topGeo=barGeo.clone(),tCol=new THREE.InstancedBufferAttribute(new Float32Array(2*NT*3),3),tHi=new THREE.InstancedBufferAttribute(new Float32Array(2*NT),1);
topGeo.setAttribute('aCol',tCol);topGeo.setAttribute('aHi',tHi);
const topBars=new THREE.InstancedMesh(topGeo,barMat,2*NT);topBars.frustumCulled=false;scene.add(topBars);
const ES=101+NE,eA=new Float32Array(2*ES),eB=new Float32Array(2*ES),eC=new Float32Array(2*ES);   // erweiterte Einzeljahre 0 … 119 (+ eine Null)
function extend(p,e){for(let s=0;s<2;s++){const o=s*ES;for(let a=0;a<100;a++)e[o+a]=p[s*NA+a];tail100(p,s*NA,e,o+100);e[o+ES-1]=0}}

/* ---------- Rückwand, Skalenstriche, Umrisse ---------- */
const wall=new THREE.Group();scene.add(wall);
const tickMat=new THREE.LineBasicMaterial({color:0x7C8796,transparent:true,opacity:.4}),axisMat=new THREE.LineBasicMaterial({color:0x2F3A48,transparent:true,opacity:.8});
let tickLines=null,floorTicks=null,axisLines=null;
function buildTicks(ticks,axMax){
  if(tickLines){wall.remove(tickLines);tickLines.geometry.dispose()}
  if(axisLines){wall.remove(axisLines);axisLines.geometry.dispose()}
  if(floorTicks){scene.remove(floorTicks);floorTicks.geometry.dispose()}
  const p=[],q=[],ax=[],zb=-G.DEPTH/2-.02,XE=G.GAP+G.XW;
  for(const t of ticks){const x=G.GAP+t/axMax*G.XW;for(const s of[-1,1]){p.push(s*x,0,zb,s*x,G.H,zb);q.push(s*x,0,-.7,s*x,0,.9)}}
  for(let a=10;a<=100;a+=10){const y=a*G.AH;p.push(-XE,y,zb,-G.GAP,y,zb,G.GAP,y,zb,XE,y,zb)}
  // Achsen: Grundlinie und die beiden Nulllinien in der Mitte
  for(const s of[-1,1]){ax.push(s*G.GAP,0,zb,s*XE,0,zb,s*G.GAP,0,zb,s*G.GAP,G.H,zb);q.push(s*G.GAP,0,-.7,s*G.GAP,0,.9)}
  tickLines=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(p,3)),tickMat);wall.add(tickLines);
  axisLines=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(ax,3)),axisMat);wall.add(axisLines);
  floorTicks=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(q,3)),tickMat);scene.add(floorTicks)}
// Altersachse: Pfeil über der Zahl 100 (das Alter geht weiter nach oben), „Alter“ steht über der Pfeilspitze
const arrowMat=new THREE.MeshBasicMaterial({color:0x1D1D1F,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
const ageArrow=new THREE.Group();ageArrow.position.z=-G.DEPTH/2-.02;scene.add(ageArrow);
const arrowShaft=new THREE.Mesh(new THREE.PlaneGeometry(.04,1).translate(0,.5,0),arrowMat),arrowHead=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-.11,0),new THREE.Vector2(.11,0),new THREE.Vector2(0,.2)])),arrowMat);
arrowShaft.renderOrder=arrowHead.renderOrder=2;ageArrow.add(arrowShaft,arrowHead);
let ARROW_TIP=G.H+.9;
function setArrow(){ARROW_TIP=Math.max(G.H+.9,(V.topY||0)+.32);const y0=G.H+.24;arrowShaft.position.y=y0;arrowShaft.scale.y=ARROW_TIP-.2-y0;arrowHead.position.y=ARROW_TIP-.2}   // wächst mit, wenn Balken über 100 höher reichen
function fatLine(color,w,dashed){const m=new THREE.LineMaterial({color,linewidth:w,transparent:true,opacity:.95,dashed:!!dashed,dashSize:.22,gapSize:.14});const l=new THREE.Line2(new THREE.LineGeometry(),m);l.frustumCulled=false;l.visible=false;scene.add(l);return l}
const cmpLine=fatLine(0xFFE08A,2.6,false),tmplLine=fatLine(0xFFFFFF,2.4,true),nowLine=fatLine(0xFFFFFF,1.8,false);
function setOutline(line,vals,n,h,axMax,z){   // vals: Länge n je Geschlecht (Männer zuerst), gestuft
  const p=[];const X=v=>G.GAP+Math.min(v/axMax,1.25)*G.XW;
  for(let i=0;i<n;i++){const y0=i*h,y1=Math.min(G.H,(i+1)*h),x=-X(vals[i]);if(i===0)p.push(-G.GAP,0,z);p.push(x,y0,z,x,y1,z)}
  p.push(-G.GAP,G.H,z,G.GAP,G.H,z);
  for(let i=n-1;i>=0;i--){const y0=i*h,y1=Math.min(G.H,(i+1)*h),x=X(vals[n+i]);p.push(x,y1,z,x,y0,z)}
  p.push(G.GAP,0,z);
  line.geometry.dispose();line.geometry=new THREE.LineGeometry();line.geometry.setPositions(p);line.computeLineDistances()}

/* ---------- Zeitgebirge (alle Jahre hintereinander) ---------- */
const landMat=new THREE.ShaderMaterial({extensions:{derivatives:true},side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:4,
  uniforms:{uYear:{value:2024},uEst:{value:2024},uCo0:{value:-1e5},uCo1:{value:-1e5},uFade:{value:0},uSide:{value:0},uCut:{value:.12},uLight:U_LIGHT,uHi:U_HI,uBg:U_BG},
  vertexShader:`attribute vec3 aC;attribute vec2 aAY;varying vec3 vC;varying vec2 vAY;varying vec3 vW;
    varying vec3 vNn;void main(){vC=aC;vAY=aAY;vNn=normal;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uYear,uEst,uCo0,uCo1,uFade,uSide,uLight,uCut;uniform vec3 uHi,uBg;varying vec3 vC;varying vec2 vAY;varying vec3 vW;varying vec3 vNn;
    float ln(float v,float per,float w){float f=abs(fract(v/per+.5)-.5)*per;return 1.-smoothstep(0.,w*fwidth(v)+1e-4,f);}
    void main(){
      if(uFade<.02)discard;
      if(abs(vW.z)<uCut)discard;   // dort stehen die Balken des aktuellen Jahres: keine zweite Fläche am selben Ort (sonst flackert es)
      float fut=step(uYear+.45,vAY.y);
      if(fut>.5&&uSide<.5)discard;
      if(fut>.5&&uSide>.5&&vAY.y>uEst+.5){vec2 fc=floor(gl_FragCoord.xy);if(mod(fc.x+fc.y,2.)<.5)discard;}
      vec3 n=normalize(vNn);float d=abs(dot(n,normalize(vec3(.35,.6,.72))));
      vec3 c=vC*(.52+.55*d)*mix(.62,.93,uLight);
      if(uSide>.5){float t=clamp((max(vC.r,vC.b)-.22)/.9,0.,1.);t=pow(t,1.5);   // Seitenansicht: kräftigere Farbe = mehr Menschen
        vec3 d0=vec3(.03,.05,.15),d1=vec3(.07,.30,.68),d2=vec3(.26,.66,.86),d3=vec3(.90,.84,.52),l0=vec3(.92,.94,.97),l1=vec3(.62,.78,.94),l2=vec3(.22,.50,.85),l3=vec3(.05,.20,.48);
        vec3 p0=mix(d0,l0,uLight),p1=mix(d1,l1,uLight),p2=mix(d2,l2,uLight),p3=mix(d3,l3,uLight);
        c=t<.4?mix(p0,p1,t/.4):t<.78?mix(p1,p2,(t-.4)/.38):mix(p2,p3,(t-.78)/.22);}
      float by=vAY.y-1.-vAY.x;
      float co=ln(by,10.,1.3),yl=ln(vAY.y,10.,1.2),al=ln(vAY.x,10.,1.);
      vec3 dk=mix(vec3(.02,.03,.05),vec3(.10,.14,.20),uLight);c=mix(c,vec3(1.),mix(.42,.6,uLight)*co);c=mix(c,dk,mix(.5,.34,uLight)*yl*(1.-co));c=mix(c,dk,mix(.28,.2,uLight)*al*(1.-co));
      float sel=step(uCo0-.5,by)*step(by,uCo1+.5);c=mix(c,uHi*mix(1.25,1.,uLight),sel*.92);
      float near=1.-smoothstep(0.,1.2,abs(vAY.y-uYear));c=mix(c,uHi,.55*near*uSide);
      c=mix(c,c*vec3(1.25,.95,.7)+vec3(.05,.02,0.),step(uEst+.5,vAY.y)*.55);
      gl_FragColor=vec4(mix(uBg,c,uFade),1.);}`});
let land=null,landKey='';
function buildLand(c,mode,grp,axMax){
  if(land){scene.remove(land);land.geometry.dispose();land=null}
  const nY=c.nY,pos=new Float32Array(2*nY*NA*3),col=new Float32Array(2*nY*NA*3),ay=new Float32Array(2*nY*NA*2),t=new Float32Array(NB),g=new Float32Array(42);
  const idx=new Uint32Array(2*(nY-1)*(NA-1)*6);let ii=0;
  for(let y=0;y<nY;y++){popAt(c,c.y0+y,t);const tt=mode==='pct'?total(t):1;if(grp===5)group5(t,g);else fix100(t,NA);
    for(let s=0;s<2;s++)for(let a=0;a<NA;a++){
      const v=(grp===5?g[s*21+Math.min(20,Math.floor(a/5))]:t[s*NA+a])/tt,r=v/axMax,k=(s*nY+y)*NA+a,base=s?COL.f:COL.m,b=.22+.95*Math.pow(Math.min(r,1),.8);
      pos[3*k]=(s?1:-1)*(G.GAP+r*G.XW);pos[3*k+1]=Math.min(G.H,(a+.5)*G.AH);pos[3*k+2]=y*G.DZ;
      col[3*k]=base.r*b;col[3*k+1]=base.g*b;col[3*k+2]=base.b*b;ay[2*k]=a+.5;ay[2*k+1]=c.y0+y}}
  for(let s=0;s<2;s++)for(let y=0;y<nY-1;y++)for(let a=0;a<NA-1;a++){const k=(s*nY+y)*NA+a;idx[ii++]=k;idx[ii++]=k+NA;idx[ii++]=k+NA+1;idx[ii++]=k;idx[ii++]=k+NA+1;idx[ii++]=k+1}   // Dreiecke entlang der Jahrgänge: keine Sägezähne quer zu den Jahrgangslinien
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aC',new THREE.BufferAttribute(col,3));geo.setAttribute('aAY',new THREE.BufferAttribute(ay,2));geo.setIndex(new THREE.BufferAttribute(idx,1));geo.computeVertexNormals();   // weiche Schattierung statt einzeln beleuchteter Dreiecke
  land=new THREE.Mesh(geo,landMat);land.frustumCulled=false;scene.add(land)}

/* ---------- Figuren (Menschen-Modus) ---------- */
const NP=QLO?700:1500;
const figGeo=(function(){
  const body=new THREE.CylinderGeometry(.13,.2,.62,10,1),head=new THREE.SphereGeometry(.17,12,8);body.translate(0,.31,0);head.translate(0,.8,0);
  const g=new THREE.BufferGeometry(),pa=body.attributes.position.array,pb=head.attributes.position.array,na=body.attributes.normal.array,nb=head.attributes.normal.array;
  const P=new Float32Array(pa.length+pb.length),N=new Float32Array(P.length);P.set(pa);P.set(pb,pa.length);N.set(na);N.set(nb,na.length);
  const ia=Array.from(body.index.array),ib=Array.from(head.index.array).map(v=>v+pa.length/3);
  g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setIndex(ia.concat(ib));return g})();
const pCol=new THREE.InstancedBufferAttribute(new Float32Array(NP*3),3);figGeo.setAttribute('aCol',pCol);
const figMat=new THREE.ShaderMaterial({uniforms:{uAlpha:{value:1}},
  vertexShader:`attribute vec3 aCol;varying vec3 vCol;varying vec3 vN;varying float vY;void main(){vCol=aCol;vN=normal;vY=position.y;gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vCol;varying vec3 vN;varying float vY;void main(){float d=max(dot(normalize(vN),normalize(vec3(.3,.8,.6))),0.);vec3 c=vCol*(.42+.75*d);c=mix(c,c*1.25+.05,step(.62,vY));gl_FragColor=vec4(c,1.);}`});
const figs=new THREE.InstancedMesh(figGeo,figMat,NP);figs.frustumCulled=false;figs.visible=false;scene.add(figs);
// Die Reihen sind feste Altersgruppen (0–4, 5–9 …). Jede Figur hat einen Geburtszeitpunkt und wird mit der Zeit älter.
// Überschreitet sie eine Altersgrenze (5, 10, 15 … Jahre), steigt sie aus ihrer Reihe in die Reihe darüber auf – pro Jahr etwa jede fünfte Figur.
// Unten kommen Neugeborene dazu; schrumpft ein Jahrgang (Sterbefälle, Wegzug), verschwindet eine seiner Figuren, wächst er (Zuzug), kommt eine von außen dazu.
const fig={p:2,per:1,snap:true,grace:0,NZ:4,key:'',lastT:null,free:[],coh:new Map(),touched:new Set(),rows:[[],[]],state:new Uint8Array(NP),
  X:new Float32Array(NP),Y:new Float32Array(NP),Z:new Float32Array(NP),Sc:new Float32Array(NP),tx:new Float32Array(NP),ty:new Float32Array(NP),tz:new Float32Array(NP),ts:new Float32Array(NP),
  sex:new Uint8Array(NP),born:new Float64Array(NP),lump:new Uint8Array(NP),cls:new Int8Array(NP),ck:new Int32Array(NP),fresh:new Uint8Array(NP),flash:new Float32Array(NP),ageNow:new Float32Array(NP),rnd:new Float32Array(NP*3)};
for(let s=0;s<2;s++)for(let g=0;g<21;g++)fig.rows[s].push([]);
for(let i=0;i<NP;i++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random());fig.rnd[3*i]=Math.cos(a)*r;fig.rnd[3*i+1]=Math.sin(a)*r;fig.rnd[3*i+2]=Math.random()}
function figReset(){fig.coh.clear();for(const r of fig.rows)for(const l of r)l.length=0;fig.free.length=0;for(let i=NP-1;i>=0;i--){fig.free.push(i);fig.state[i]=0;fig.Sc[i]=0}}
figReset();
function figSpawn(s,key,born,lump){if(!fig.free.length)return -1;const i=fig.free.pop();fig.state[i]=1;fig.sex[i]=s;fig.ck[i]=key;fig.born[i]=born;fig.lump[i]=lump?1:0;fig.cls[i]=-1;fig.flash[i]=0;fig.Sc[i]=0;fig.fresh[i]=1;
  let l=fig.coh.get(key);if(!l){l=[];fig.coh.set(key,l)}l.push(i);return i}
function figKill(i){const r=fig.cls[i]>=0?fig.rows[fig.sex[i]][fig.cls[i]]:null;if(r){const j=r.indexOf(i);if(j>=0)r.splice(j,1)}fig.cls[i]=-1;fig.state[i]=2}
const pA=new Float32Array(NB),pB=new Float32Array(NB);
// Landesumriss am Boden; die Menschenmenge steht darin (gleichmäßig verteilte Punkte im Umriss)
const OUTL=window.__OUTLINES||{},outlineGroup=new THREE.Group();scene.add(outlineGroup);outlineGroup.visible=false;
const outlineFill=new THREE.MeshBasicMaterial({color:0xDDE4EC,transparent:true,opacity:.9,depthWrite:false}),outlineLineMat=new THREE.LineMaterial({color:0x131A24,linewidth:2.2,transparent:true,opacity:1});
const crowd={x:new Float32Array(NP),z:new Float32Array(NP),key:null};
function buildCrowd(cid){
  if(crowd.key===cid)return;crowd.key=cid;
  while(outlineGroup.children.length){const o=outlineGroup.children.pop();o.geometry.dispose()}
  const polys=OUTL[cid];
  if(!polys){for(let i=0;i<NP;i++){crowd.x[i]=fig.rnd[3*i]*7.5;crowd.z[i]=3.4+fig.rnd[3*i+1]*4.2}return}
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const r of polys)for(const q of r){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])}
  const k=Math.min(13.5/(x1-x0),9/(y1-y0)),cx=(x0+x1)/2,cy=(y0+y1)/2,zc=3.6,P=polys.map(r=>r.map(q=>[(q[0]-cx)*k,zc-(q[1]-cy)*k]));   // Norden zeigt nach hinten
  let area=0;
  for(const r of P){const sh=new THREE.Shape(r.map(q=>new THREE.Vector2(q[0],-q[1]))),m=new THREE.Mesh(new THREE.ShapeGeometry(sh),outlineFill);m.rotation.x=-Math.PI/2;m.position.y=.004;m.renderOrder=1;outlineGroup.add(m);
    const pos=[];for(const q of r)pos.push(q[0],.014,q[1]);pos.push(r[0][0],.014,r[0][1]);const l=new THREE.Line2(new THREE.LineGeometry(),outlineLineMat);l.geometry.setPositions(pos);l.frustumCulled=false;l.renderOrder=2;outlineGroup.add(l);
    let a=0;for(let i=0;i<r.length;i++){const q=r[i],n=r[(i+1)%r.length];a+=q[0]*n[1]-n[0]*q[1]}area+=Math.abs(a)/2}
  const inside=(x,z)=>{for(const r of P){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c}if(c)return true}return false};
  let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  let d=Math.sqrt(area/(NP*1.1)),pts=[];
  for(let tries=0;tries<14;tries++){pts=[];let row=0;
    for(let z=zc-(y1-y0)*k/2;z<=zc+(y1-y0)*k/2;z+=d*.866,row++)for(let x=-(x1-x0)*k/2+(row%2?d/2:0);x<=(x1-x0)*k/2;x+=d){const px=x+(rnd()-.5)*d*.5,pz=z+(rnd()-.5)*d*.5;if(inside(px,pz))pts.push([px,pz])}
    if(pts.length>=NP)break;d*=.96}
  for(let i=pts.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)),t=pts[i];pts[i]=pts[j];pts[j]=t}
  for(let i=0;i<NP;i++){const q=pts[i%Math.max(1,pts.length)]||[0,zc];crowd.x[i]=q[0];crowd.z[i]=q[1]}}
const _m4=new THREE.Matrix4(),_v=new THREE.Vector3(),_q=new THREE.Quaternion(),_s=new THREE.Vector3();
function figUpdate(dt){
  const c=C(),t=clamp(S.year,c.y0,c.y1),y0=Math.min(c.y1-1,Math.floor(t+1e-9)),f=t-y0,den=S.mode==='pct'?V.tot:1,key0=S.c+S.mode;
  let instant=fig.snap;
  if(key0!==fig.key||fig.lastT==null||Math.abs(t-fig.lastT)>7){fig.key=key0;instant=true;
    let mt=0;for(let y=0;y<c.nY;y++)mt=Math.max(mt,c.tot[y]);const raw=mt/(NP*.95),p10=Math.pow(10,Math.floor(Math.log10(raw))-1);fig.per=Math.ceil(raw/p10)*p10;   // Menschen je Figur (für alle Jahre gleich)
    fig.NZ=clamp(Math.round(.2*den*V.axMax/(fig.per*G.XW)),1,6)}
  if(instant){figReset();fig.grace=3}else if(fig.grace>0)fig.grace--;
  const inst=instant||fig.grace>0,rate=fig.lastT==null||dt<=0?0:Math.abs(t-fig.lastT)/dt,glow=inst?0:clamp(2.2/Math.max(rate,.01),0,1);fig.lastT=t;fig.snap=false;   // glow: bei schnellem Zeitraffer leuchten die Aufsteiger schwächer
  popAt(c,y0,pA);popAt(c,y0+1,pB);
  // 1. Wie viele Figuren hat jeder Geburtsjahrgang? Jahrgänge werden entlang ihres Lebenswegs verfolgt (Alter a im Jahr y0 -> a+1 im Jahr y0+1).
  const touched=fig.touched;touched.clear();
  for(let s=0;s<2;s++){const o=s*NA,rest=pA[o+99]+pA[o+100]+1e-9;let acc=0,prev=0;
    for(let a=100;a>=-1;a--){const b=y0-1-a,lump=a===100,key=s*100000+(lump?99999:b+50000);touched.add(key);let v;
      if(a<0)v=f*pB[o];else if(a<99)v=pA[o+a]+(pB[o+a+1]-pA[o+a])*f;else if(a===99)v=pA[o+99]+(pB[o+100]*pA[o+99]/rest-pA[o+99])*f;else v=pA[o+100]+(pB[o+100]*pA[o+100]/rest-pA[o+100])*f;
      const want=v/fig.per,l=fig.coh.get(key);let m=l?l.length:0;
      if(instant){acc+=want;const r=Math.round(acc),n=r-prev;prev=r;for(let j=0;j<n;j++)figSpawn(s,key,lump?0:b+(a<0?f*(j+.5)/n:(j+Math.random())/n),lump)}
      else{while(want>m+.58){if(figSpawn(s,key,lump?0:b+(a<0?Math.min(f,.999):Math.random()),lump)<0)break;m++}
        while(l&&want<m-.58&&m>0){figKill(l.pop());m--}}}}
  for(const [key,l] of fig.coh)if(!touched.has(key)){for(const i of l)if(fig.state[i]===1)figKill(i);fig.coh.delete(key)}
  // 2. Alter jeder Figur -> Altersgruppe. Wer eine Grenze überschreitet, wechselt die Reihe und behält dabei möglichst seinen Platz (steigt gerade nach oben).
  for(let i=0;i<NP;i++){if(fig.state[i]!==1)continue;const sx_=fig.sex[i],age=fig.lump[i]?100.5:t-fig.born[i],g=fig.lump[i]?20:clamp(Math.floor(age/5),0,19),g0=fig.cls[i];fig.ageNow[i]=age;
    if(g!==g0){let j=1e9;if(g0>=0){const r=fig.rows[sx_][g0];j=r.indexOf(i);if(j>=0)r.splice(j,1);else j=1e9;fig.flash[i]=glow}
      const r2=fig.rows[sx_][g];if(j>=r2.length)r2.push(i);else r2.splice(j,0,i);fig.cls[i]=g}}
  // 3. Plätze in den Reihen
  const NZ=fig.NZ,sx=NZ*fig.per*G.XW/(den*V.axMax),sc=Math.min(.46,sx*2.2),sz=Math.min(.22,sx);
  for(let s=0;s<2;s++){const sgn=s?1:-1;for(let g=0;g<21;g++){const r=fig.rows[s][g],y=g*.5+.02;
      for(let j=0;j<r.length;j++){const i=r[j],cx=Math.floor(j/NZ),cz=j%NZ,age=fig.ageNow[i];
        fig.tx[i]=sgn*(G.GAP+(cx+.5)*sx);fig.ty[i]=y;fig.tz[i]=((NZ-1)/2-cz)*sz;fig.ts[i]=sc*(g===20?.3:age<15?.5+.5*Math.max(0,age)/15:1);   // Kinder sind kleiner
        if(fig.fresh[i]){fig.fresh[i]=0;
          if(inst){fig.X[i]=fig.tx[i];fig.Y[i]=y;fig.Z[i]=fig.tz[i];fig.Sc[i]=fig.ts[i]}
          else if(age<1.2){fig.X[i]=fig.tx[i];fig.Y[i]=y-.1;fig.Z[i]=fig.tz[i];fig.Sc[i]=0}                 // Neugeborene wachsen am Boden herein
          else{fig.X[i]=sgn*(G.GAP+G.XW+2.5);fig.Y[i]=y;fig.Z[i]=fig.tz[i];fig.Sc[i]=0}}}}}                  // Zugezogene kommen von außen
  // 4. bewegen und zeichnen: 2 = aufrechte Pyramide, 1 = am Boden nach Alter aufgereiht, 0 = Menschenmenge im Landesumriss
  buildCrowd(S.c);
  const k=inst?1:1-Math.exp(-dt*7),P=fig.p,pp=P<1?P:P-1;
  let mv=0;
  for(let i=0;i<NP;i++){const stt=fig.state[i];if(!stt){_m4.makeScale(0,0,0);figs.setMatrixAt(i,_m4);continue}
    if(stt===2){mv=1;fig.Sc[i]-=fig.Sc[i]*Math.min(1,dt*5);fig.Y[i]+=dt*.3;if(fig.Sc[i]<.015||inst){fig.state[i]=0;fig.Sc[i]=0;fig.free.push(i)}}
    else{fig.X[i]+=(fig.tx[i]-fig.X[i])*k;fig.Y[i]+=(fig.ty[i]-fig.Y[i])*k;fig.Z[i]+=(fig.tz[i]-fig.Z[i])*k;fig.Sc[i]+=(fig.ts[i]-fig.Sc[i])*k;fig.flash[i]=Math.max(0,fig.flash[i]-dt*1.6);
      mv=Math.max(mv,Math.abs(fig.tx[i]-fig.X[i])+Math.abs(fig.ty[i]-fig.Y[i])+Math.abs(fig.ts[i]-fig.Sc[i]),fig.flash[i])}
    let x=fig.X[i],y=fig.Y[i],z=fig.Z[i];
    if(P<1.999){const e=ease(clamp(pp*1.35-fig.rnd[3*i+2]*.35,0,1)),fx=x*1.05,fz=5.2-(y/.5)*.52+z*.9;
      if(P<1){x=lerp(crowd.x[i],fx,e);z=lerp(crowd.z[i],fz,e);y=0}else{x=lerp(fx,x,e);z=lerp(fz,z,e);y=lerp(0,y,e)}}
    _m4.compose(_v.set(x,y,z),_q,_s.setScalar(fig.Sc[i]));figs.setMatrixAt(i,_m4);
    const sx_=fig.sex[i],a=fig.ageNow[i],cc=S.groups?(a<15?(sx_?COL.fy:COL.my):a>=65?(sx_?COL.fo:COL.mo):(sx_?COL.fw:COL.mw)):(sx_?COL.f:COL.m),fl=fig.flash[i]*.8;   // wer gerade aufgestiegen ist, leuchtet kurz auf
    pCol.array[3*i]=cc.r+(COL.hi.r-cc.r)*fl;pCol.array[3*i+1]=cc.g+(COL.hi.g-cc.g)*fl;pCol.array[3*i+2]=cc.b+(COL.hi.b-cc.b)*fl}
  fig.mv=mv;figs.instanceMatrix.needsUpdate=true;pCol.needsUpdate=true}

/* ---------- Beschriftungen ---------- */
const labelsEl=document.getElementById('labels'),leadersEl=document.getElementById('leaders');
const LB=[];
function mkLabel(cls,ax){const el=document.createElement('div');el.className='lb '+cls;labelsEl.appendChild(el);const o={el,p:new THREE.Vector3(),ax:ax||'c',ay:'m',on:false,dx:0,dy:0,txt:''};LB.push(o);return o}
function setTxt(o,html){if(o.txt!==html){o.txt=html;o.el.innerHTML=html}}
const L={age:[],byr:[],tick:[],yr:[],ev:[]};
for(let i=0;i<=10;i++){L.age.push(mkLabel('age','c'));L.byr.push(mkLabel('byr','l'))}
for(let i=0;i<16;i++)L.tick.push(mkLabel('tick','c'));
for(let i=0;i<32;i++)L.yr.push(mkLabel('yr','c'));
for(let i=0;i<8;i++){const o=mkLabel('ev','l');o.line=document.createElementNS('http://www.w3.org/2000/svg','line');leadersEl.appendChild(o.line);o.tip=new THREE.Vector3();o.clampX=true;L.ev.push(o)}
L.sexM=mkLabel('sex m','r');L.sexF=mkLabel('sex f','l');L.axis=mkLabel('axis','c');L.ageT=mkLabel('axis agehd','c');L.sexM.clampX=L.sexF.clampX=true;L.byrT=mkLabel('axis','l');
L.cmp=mkLabel('tag','l');L.tmpl=mkLabel('tag','r');L.coh=mkLabel('tag','l');L.fig=mkLabel('tag','c');L.coh.clampX=true;L.born=mkLabel('tag','l');L.born.clampX=true;L.byrT.clampX=true;L.byr.forEach(o=>o.clampX=true);
const _p=new THREE.Vector3();
let VW=1,VH=1,OFFX=0,OFFY=0,UI_L=0,UI_R=1e4;
function project(v,out){_p.copy(v).project(camera);out.x=(_p.x*.5+.5)*VW;out.y=(-_p.y*.5+.5)*VH;out.z=_p.z;return out}
const _o={x:0,y:0,z:0};
let LSC=1;const _w=new THREE.Vector3();
function placeLabels(){
  for(const o of LB){
    if(!o.on){if(o.vis){o.vis=false;o.el.style.opacity=0;o.el.style.visibility='hidden'}if(o.line)o.line.style.display='none';continue}
    project(o.p,_o);const ok=_o.z<1&&_o.x>-80&&_o.x<VW+80&&_o.y>-40&&_o.y<VH+40;
    if(!ok){if(o.vis){o.vis=false;o.el.style.opacity=0;o.el.style.visibility='hidden'}if(o.line)o.line.style.display='none';continue}
    const tx=o.ax==='c'?'-50%':o.ax==='r'?'-100%':'0',ty=o.ay==='t'?'0':o.ay==='b'?'-100%':'-50%';
    o.sx=_o.x+o.dx;o.sy=_o.y+o.dy;
    if(o.clampX){const w=o.el.offsetWidth||120;if(o.ax==='l')o.sx=Math.min(o.sx,UI_R-w-6);else if(o.ax==='r')o.sx=Math.max(o.sx,UI_L+w+6);else if(o.ax==='c')o.sx=clamp(o.sx,UI_L+w/2+6,Math.max(UI_L+w/2+6,UI_R-w/2-6))}
    const sc=o.rs?LSC:1,org=(o.ax==='c'?'50%':o.ax==='r'?'100%':'0')+' '+(o.ay==='t'?'0':o.ay==='b'?'100%':'50%');if(o.org!==org){o.org=org;o.el.style.transformOrigin=org}
    const tf=`translate(${o.sx.toFixed(1)}px,${o.sy.toFixed(1)}px) translate(${tx},${ty})`+(sc!==1?` scale(${sc.toFixed(3)})`:'');if(o.tf!==tf){o.tf=tf;o.el.style.transform=tf}
    if(!o.vis){o.vis=true;o.el.style.visibility='visible';o.el.style.opacity=1}
    if(o.line){project(o.tip,_o);o.line.style.display='';o.line.setAttribute('x1',o.sx);o.line.setAttribute('y1',o.sy);o.line.setAttribute('x2',_o.x);o.line.setAttribute('y2',_o.y)}
  }}

/* ---------- Anzeige berechnen (jedes Bild) ---------- */
const cur=new Float32Array(NB),cur5=new Float32Array(42),cmpA=new Float32Array(NB),cmp5=new Float32Array(42);
const V={mt:1,mk:null,my:null,shown:new Float32Array(NBX),mFrom:new Float32Array(NBX),cmpA:1,cmpK:'',tmplA:1,tmplK:'',exA:0,lensT:new Float32Array(2*NE),by0T:new Float32Array(NE),ext:null,axMax:1,axShown:0,ticks:[],lens:new Float32Array(NBX),by0:new Float32Array(NBX),bh:new Float32Array(NBX),frac:0,moving:false,n:21,h:.5,tot:1,depth:G.DEPTH,depthT:G.DEPTH,landFade:0,proj:0,st:null,unit:1};
const fmtInt=n=>Math.round(n).toLocaleString(S.lang==='fr'?'fr-FR':'de-DE').replace(/[  .]/g,' ');
const fmtDec=(n,d)=>n.toLocaleString(S.lang==='fr'?'fr-FR':'de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtMax=(n,d)=>n.toLocaleString(S.lang==='fr'?'fr-FR':'de-DE',{maximumFractionDigits:d});
function fmtBig(n){const a=Math.abs(n);if(a>=1e9)return fmtMax(n/1e9,2)+' '+T('mrd');if(a>=1e6)return fmtMax(n/1e6,a>=1e8?0:a>=1e7?1:2)+' '+T('mio');if(a>=1e4)return fmtInt(Math.round(n/100)*100);return fmtInt(n)}
function tickLabel(v){if(S.mode==='pct')return fmtDec(v*100,V.step*100<1?1:0)+' %';const u=V.unit;return u===1?fmtInt(v):fmtDec(v/u,(V.step/u)%1?1:0)}
const byear=(age,year)=>Math.floor(year)-1-age;     // Geburtsjahr der Menschen, die am 1. Januar <year> <age> Jahre alt sind
function barColor(s,age,out){
  if(S.groups){const c=age<15?(s?COL.fy:COL.my):age>=65?(s?COL.fo:COL.mo):(s?COL.fw:COL.mw);out.copy(c)}else out.copy(s?COL.f:COL.m)}
const _c=new THREE.Color();
function computeView(dt){
  const c=C(),year=S.year;popAt(c,year,cur);V.tot=total(cur);V.st=stats(cur);
  const g5=S.grp===5;V.n=g5?21:NA;V.h=g5?5*G.AH:G.AH;if(g5)group5(cur,cur5);
  const src=g5?cur5:cur,den=S.mode==='pct'?V.tot:1;
  let mx=0;for(let k=0;k<2*V.n;k++){if(!g5&&(k===100||k===201))continue;mx=Math.max(mx,src[k]/den)}
  const want=S.fixed?axisMaxAll(c,S.mode,S.grp):mx;
  const step=niceStep(want,4.2),tgt=Math.ceil(want/step-1e-9)*step;
  if(!V.axShown||V.key!==S.c+S.mode+S.grp||Math.abs(Math.log(V.axShown/tgt))>1.2){V.axShown=tgt;V.key=S.c+S.mode+S.grp}
  V.axShown+=(tgt-V.axShown)*Math.min(1,dt*5);if(Math.abs(V.axShown-tgt)<tgt*1e-3)V.axShown=tgt;
  V.axMax=V.axShown;V.step=niceStep(V.axMax,4.2);
  const tk=[];for(let t=V.step;t<=V.axMax*1.001;t+=V.step)tk.push(t);
  V.unit=S.mode==='pct'?1:(V.step>=1e6?1e6:V.step>=1e3?1e3:1);
  const tkKey=tk.length+'|'+V.axMax.toPrecision(5);
  if(tkKey!==V.tkKey){V.tkKey=tkKey;V.ticks=tk;buildTicks(tk,V.axMax)}
  // Balken
  V.depthT=(S.view==='land'||S.view==='side')?.22:G.DEPTH;V.depth+=(V.depthT-V.depth)*Math.min(1,dt*6);
  const kind=kindOf(c,year);V.kind=kind;V.proj+=((kind==='proj'?1:0)-V.proj)*Math.min(1,dt*6);barMat.uniforms.uProj.value=exMat.uniforms.uProj.value=V.proj;
  const co=S.cohort,hv=S.hover,gap=g5?.035:.012;
  const yi=Math.min(c.y1-1,Math.floor(year+1e-9)),fr=g5?0:clamp(year-yi,0,1);V.frac=fr;
  if(!g5){popAt(c,yi,pA);popAt(c,yi+1,pB);extend(pA,eA);extend(pB,eB)}extend(cur,eC);V.ext=eC;
  if(V.prevYear!=null&&Math.abs(year-V.prevYear)>1e-5)V.moveT=.7;else V.moveT=Math.max(0,(V.moveT||0)-dt);V.prevYear=year;V.moving=V.moveT>0;
  U_YEAR.value=year;U_STRIPE.value+=((S.stripes?(V.moving?.17:.075):0)-U_STRIPE.value)*Math.min(1,dt*5);
  // Übergang: wechselt das Bild sprunghaft (anderes Land, Anzahl ↔ Prozent, Jahressprung), gleiten die Balken in 0,9 s in die neue Länge
  {const mk=S.c+'|'+S.mode+'|'+S.grp+'|'+(S.people?1:0),jump=V.my!=null&&Math.abs(year-V.my)>1.5&&performance.now()-(V.scrub||0)>400;
    if(V.mk!=null&&(V.mk!==mk||jump)&&V.mk.split('|')[2]===String(S.grp)&&!S.people){V.mFrom.set(V.shown);V.mt=0}
    V.mk=mk;V.my=year;if(V.mt<1)V.mt=Math.min(1,V.mt+dt/.9)}
  const me=V.mt<1?ease(V.mt):1;
  for(let s=0;s<2;s++)for(let i=0;i<=NA;i++){                    // i = NA: die Neugeborenen des laufenden Jahres (nur bei einzelnen Jahrgängen)
    const k=i<NA?s*NA+i:NB+s;let len=0,y0=0,h=0,hi=0,age=i;
    if(i<V.n){let v;
      if(g5){v=src[s*21+i];y0=i*V.h;h=(i===20?G.AH:V.h)-gap;age=i*5+2}
      else{const o=s*ES;   // der Jahrgang, der im Jahr yi i Jahre alt ist, ist ein Jahr später i+1 Jahre alt: der Balken gleitet eine Stufe nach oben
        v=eA[o+i]+(eB[o+i+1]-eA[o+i])*fr;y0=(i+fr)*G.AH;h=G.AH-gap;age=i+fr}
      len=clamp(v/den/V.axMax*G.XW,1e-4,G.XW*1.04);
      if(co){const a0=g5?i*5:i,a1=g5?(i===20?100:i*5+4):i;if(byear(a1,year)<=co[1]&&byear(a0,year)>=co[0])hi=1}
      if(hv&&hv.i===i)hi=Math.max(hi,hv.s===s?.75:.35)}
    else if(i===NA&&!g5&&fr>.012){len=clamp(pB[s*NA]/den/V.axMax*G.XW,1e-4,G.XW*1.04);y0=0;h=fr*G.AH-gap;age=0}
    if(me<1)len=V.mFrom[k]+(len-V.mFrom[k])*me;V.shown[k]=len;
    V.lens[k]=len;V.by0[k]=y0;V.bh[k]=h;
    _m4.makeScale((s?1:-1)*len,Math.max(h,1e-4),V.depth);_m4.setPosition((s?1:-1)*G.GAP,y0+gap/2,0);bars.setMatrixAt(k,_m4);
    barColor(s,age,_c);aCol.array[3*k]=_c.r;aCol.array[3*k+1]=_c.g;aCol.array[3*k+2]=_c.b;aHi.array[k]=hi}
  bars.instanceMatrix.needsUpdate=true;aCol.needsUpdate=true;aHi.needsUpdate=true;
  // über 100
  topBars.visible=!g5&&!S.people;
  V.topY=0;
  if(topBars.visible){for(let s=0;s<2;s++)for(let j=0;j<NT;j++){const i=101+j,k=s*NT+j,o=s*ES,v=eA[o+i]+(eB[o+i+1]-eA[o+i])*fr;let hi=0;
      let len=v>0?clamp(v/den/V.axMax*G.XW,1e-4,G.XW*1.04):0;if(len<.012)len=0;   // fast leere Jahrgänge ganz weglassen: sonst stünde ihre Seitenwand als dünne Säule im Bild
      const y0=(i+fr)*G.AH,h=G.AH-gap;V.lensT[k]=len;V.by0T[j]=y0;if(len>0)V.topY=Math.max(V.topY,y0+h);
      if(co&&byear(i,year)<=co[1]&&byear(i,year)>=co[0])hi=1;if(hv&&hv.i===i)hi=Math.max(hi,hv.s===s?.75:.35);
      if(len>0){_m4.makeScale((s?1:-1)*len,h,V.depth);_m4.setPosition((s?1:-1)*G.GAP,y0+gap/2,0)}else _m4.makeScale(0,0,0);topBars.setMatrixAt(k,_m4);
      barColor(s,100,_c);tCol.array[3*k]=_c.r;tCol.array[3*k+1]=_c.g;tCol.array[3*k+2]=_c.b;tHi.array[k]=hi}
    topBars.instanceMatrix.needsUpdate=true;tCol.needsUpdate=true;tHi.needsUpdate=true}
  // Überschuss
  V.exA+=((S.excess?1:0)-V.exA)*Math.min(1,dt*3.5);if(Math.abs((S.excess?1:0)-V.exA)<.003)V.exA=S.excess?1:0;exMat.uniforms.uStripe.value=U_STRIPE.value*(1-V.exA);
  exBars.visible=(S.excess||V.exA>.003)&&!S.people;
  if(exBars.visible){for(let i=0;i<NA;i++){let x0=0,len=0,s=0,y0=0,h=0;
      if(i<V.n){const m=V.lens[i],f=V.lens[NA+i];s=f>m?1:0;x0=Math.min(m,f);len=Math.abs(f-m);y0=V.by0[i];h=V.bh[i];
        if(len>2e-4){const k=s*NA+i;_m4.makeScale((s?1:-1)*Math.max(x0,1e-4),Math.max(h,1e-4),V.depth);_m4.setPosition((s?1:-1)*G.GAP,y0+gap/2,0);bars.setMatrixAt(k,_m4)}}   // längerer Balken: nur bis zum Beginn des Überschusses
      if(len>2e-4&&h>0){_m4.makeScale((s?1:-1)*len,h,V.depth);_m4.setPosition((s?1:-1)*(G.GAP+x0),y0+gap/2,0)}else _m4.makeScale(0,0,0);exBars.setMatrixAt(i,_m4);   // kein Überschuss: nichts zeichnen (sonst läge eine Fläche auf dem Balkenende)
      barColor(s,g5?i*5+2:i,_c);_c.lerp(s?COL.fx:COL.mx,V.exA);exCol.array[3*i]=_c.r;exCol.array[3*i+1]=_c.g;exCol.array[3*i+2]=_c.b}
    for(let j=0;j<NT;j++){const i=NA+j;let x0=0,len=0,s=0,y0=0,h=0;
      if(topBars.visible){const m=V.lensT[j],f=V.lensT[NT+j];s=f>m?1:0;x0=Math.min(m,f);len=Math.abs(f-m);y0=V.by0T[j];h=G.AH-gap;
        if(len>2e-4&&x0>0){_m4.makeScale((s?1:-1)*x0,h,V.depth);_m4.setPosition((s?1:-1)*G.GAP,y0+gap/2,0);topBars.setMatrixAt(s*NT+j,_m4)}}
      if(len>2e-4){_m4.makeScale((s?1:-1)*len,h,V.depth);_m4.setPosition((s?1:-1)*(G.GAP+x0),y0+gap/2,0)}else _m4.makeScale(0,0,0);exBars.setMatrixAt(i,_m4);
      barColor(s,100,_c);_c.lerp(s?COL.fx:COL.mx,V.exA);exCol.array[3*i]=_c.r;exCol.array[3*i+1]=_c.g;exCol.array[3*i+2]=_c.b}
    exBars.instanceMatrix.needsUpdate=true;exCol.needsUpdate=true;bars.instanceMatrix.needsUpdate=true;topBars.instanceMatrix.needsUpdate=true}
  // Vergleich
  const zf=V.depth/2+.03;
  if(S.cmp){const cc=DATA.by[S.cmp],yy=clamp(S.cmpYear==null?year:S.cmpYear,cc.y0,cc.y1);popAt(cc,yy,cmpA);const tt=total(cmpA),d2=S.mode==='pct'?tt:1;
    let a=cmpA,n=NA;if(g5){group5(cmpA,cmp5);a=cmp5;n=21}
    const vals=new Float32Array(2*n);for(let k=0;k<2*n;k++)vals[k]=a[k]/d2;if(!g5)fix100(vals,n);
    setOutline(cmpLine,vals,n,V.h,V.axMax,zf);cmpLine.visible=true;{const k=S.cmp+S.mode+S.c+S.grp+(S.cmpYear==null?'':S.cmpYear);if(k!==V.cmpK){V.cmpK=k;V.cmpA=0}V.cmpA=Math.min(1,V.cmpA+dt/.7);cmpLine.material.opacity=.95*ease(V.cmpA)}V.cmpYear=yy;V.cmpTot=tt}else cmpLine.visible=false;
  // heller Umriss des aktuellen Jahres (im Zeitgebirge)
  if(V.landFade>.3&&S.view==='land'&&(g5||fr<.03||fr>.97)){const n=V.n,vals=new Float32Array(2*n);for(let k=0;k<2*n;k++)vals[k]=src[k]/den;if(!g5)fix100(vals,n);setOutline(nowLine,vals,n,V.h,V.axMax,zf);nowLine.visible=true}else nowLine.visible=false;
  // Idealform
  if(S.tmpl){const tp=S.tmpl==='auto'?shapeOf(V.st.base):S.tmpl,w=TEMPLATE[tp],n=V.n,vals=new Float32Array(2*n),sc=S.mode==='pct'?1:V.tot;
    for(let i=0;i<n;i++){let v=0;if(g5){if(i<20)for(let a=0;a<5;a++)v+=w[i*5+a];else v=w[100]}else v=w[i];vals[i]=vals[n+i]=v*sc}
    setOutline(tmplLine,vals,n,V.h,V.axMax,zf+.02);tmplLine.visible=true;{const k=tp+S.c+S.mode+S.grp;if(k!==V.tmplK){V.tmplK=k;V.tmplA=0}V.tmplA=Math.min(1,V.tmplA+dt/.7);tmplLine.material.opacity=.95*ease(V.tmplA)}V.tmplType=tp}else tmplLine.visible=false;
  // Zeitgebirge
  const wantLand=(S.view==='land'||S.view==='side')&&!S.people;
  V.landFade+=((wantLand?1:0)-V.landFade)*Math.min(1,dt*4);
  if(wantLand||V.landFade>.02){const key=S.c+S.mode+S.grp+'|'+V.axMax.toPrecision(4);if(key!==landKey){landKey=key;buildLand(c,S.mode,S.grp,V.axMax)}
    land.position.z=-(year-c.y0)*G.DZ;const u=landMat.uniforms;u.uYear.value=year;u.uEst.value=c.est;u.uFade.value=V.landFade;u.uSide.value=S.view==='side'?1:0;u.uCut.value=-1;
    u.uCo0.value=co?co[0]:-1e5;u.uCo1.value=co?co[1]:-1e5}
  else if(land){landMat.uniforms.uFade.value=0}
  wall.visible=V.landFade<.5&&!(S.people&&S.pstage<2);floorTicks.visible=!(S.people&&S.pstage<2);
  {const fu=floor.material.uniforms.uShadow,tg=(S.people&&S.pstage<2)?0:TH.shadow*(1-V.landFade);fu.value+=(tg-fu.value)*Math.min(1,dt*4)}
  // Figuren
  figs.visible=S.people;
  barMat.uniforms.uAlpha.value+=((S.people?0:1)-barMat.uniforms.uAlpha.value)*Math.min(1,dt*6);bars.visible=barMat.uniforms.uAlpha.value>.01;
  barMat.transparent=barMat.uniforms.uAlpha.value<.98;barMat.depthWrite=!barMat.transparent;
  if(S.people){fig.p+=(S.pstage-fig.p)*Math.min(1,dt*1.5);if(Math.abs(S.pstage-fig.p)<.002)fig.p=S.pstage;figUpdate(dt)}else fig.lastT=null;
  {const al=S.people?clamp(1.25-fig.p*1.15,0,1):0;outlineGroup.visible=al>.01;outlineFill.opacity=TH.fillOp*al;outlineLineMat.opacity=al}
}

/* ---------- Idealformen (Anteil je Altersjahr und Geschlecht, Summe 0,5) ---------- */
const TEMPLATE=(function(){const mk=f=>{const w=new Float32Array(NA);let s=0;for(let a=0;a<NA;a++){w[a]=Math.max(0,f(a));s+=w[a]}for(let a=0;a<NA;a++)w[a]*=.5/s;return w};
  const taper=(a,a0,a1)=>a<a0?1:a>a1?0:.5*(1+Math.cos(Math.PI*(a-a0)/(a1-a0)));
  return {pyr:mk(a=>Math.exp(-a/36)*(a>84?Math.max(0,(100-a)/16):1)),bell:mk(a=>taper(a,48,96)),urn:mk(a=>(a<52?.56+.44*smooth(a/52):1)*taper(a,56,99))}})();

/* ---------- Beschriftungen befüllen ---------- */
function updateLabels(){
  const c=C(),year=S.year,sideV=S.view==='land'||S.view==='side',zf=V.depth/2+.02,film=S.film,zw=-G.DEPTH/2-.02;
  // Maßstab der Beschriftung: folgt dem Abstand der Gitterlinien auf dem Bildschirm (Heranzoomen = größere Zahlen)
  project(_w.set(0,0,zw),_o);const y0p=_o.y;project(_w.set(0,10*G.AH,zw),_o);LSC=clamp(Math.abs(y0p-_o.y)/62,.8,1.3);
  // Alter
  const az=camera.position.x-controls.target.x,aax=sideV?'c':az>2.5?'r':az<-2.5?'l':'c',adx=aax==='r'?-.06:aax==='l'?.06:0;   // Blick von rechts: Zahl endet an der Mitte (liegt in der Gasse), von links umgekehrt
  for(let i=0;i<=10;i++){const o=L.age[i],a=i*10;o.on=!S.people||S.pstage===2;
    if(sideV)o.p.set(-(G.GAP+G.XW+.45),a*G.AH,0);else o.p.set(adx,a*G.AH+(S.grp===5&&a<100?.25:.05),zw);o.ax=aax;o.rs=true;
    setTxt(o,S.grp===5&&!sideV?(a<100?a+'–'+(a+4):'100+'):String(a));
    const b=L.byr[i];b.on=S.birth&&!sideV&&!S.people;b.p.set(G.GAP+G.XW+.35,a*G.AH+.05,zw);b.rs=true;setTxt(b,String(byear(a,year)))}
  L.ageT.on=!S.people||S.pstage===2;if(sideV)L.ageT.p.set(-(G.GAP+G.XW+.45),G.H+.45,0);else{setArrow();L.ageT.p.set(0,ARROW_TIP+.05,zw);L.ageT.ay='b'}L.ageT.ax='c';L.ageT.rs=true;if(sideV)L.ageT.ay='m';
  ageArrow.visible=!sideV&&V.landFade<.5&&(!S.people||S.pstage===2);setArrow();setTxt(L.ageT,T('axAge'));
  L.byrT.on=S.birth&&!sideV&&!S.people;L.byrT.p.set(G.GAP+G.XW+.35,G.H+.42,zw);setTxt(L.byrT,T('axBirth'));
  // Skala
  let k=0;const front=!sideV;
  const flat=S.people&&S.pstage<2;
  for(const t of V.ticks){if(S.view==='side'||flat)break;for(const s of[-1,1]){const o=L.tick[k++];if(!o)break;o.on=true;o.p.set(s*(G.GAP+t/V.axMax*G.XW),0,front?zf+.25:1.0);o.ay='t';o.dy=6;o.rs=true;setTxt(o,tickLabel(t))}}
  for(;k<L.tick.length;k++)L.tick[k].on=false;
  L.axis.on=S.view!=='side'&&!flat;L.axis.p.set(0,0,front?zf+.25:1.0);L.axis.ay='t';L.axis.dy=26;
  setTxt(L.axis,S.mode==='pct'?T(S.grp===5?'axPct5':'axPct1'):T(S.grp===5?'axAbs5':'axAbs1')+(V.unit===1e6?' '+T('inMio'):V.unit===1e3?' '+T('inTsd'):''));
  L.sexM.on=!flat;L.sexF.on=S.view!=='side'&&!flat;L.sexM.p.set(-G.GAP-G.XW*.52,G.H+.42,sideV?0:zf);L.sexF.p.set(G.GAP+G.XW*.52,G.H+.42,sideV?0:zf);L.sexM.ax='c';L.sexF.ax='c';L.sexM.rs=L.sexF.rs=true;
  if(S.view==='side'){L.sexM.p.set(-G.GAP-G.XW,G.H+.45,-3.2)}
  setTxt(L.sexM,S.view==='side'?T('menSide'):T('men'));setTxt(L.sexF,T('women'));
  // Jahre am Zeitgebirge
  k=0;if(V.landFade>.5){const stp=c.nY>200?20:10;for(let y=Math.ceil(c.y0/stp)*stp;y<=(S.view==='side'?c.y1:year);y+=stp){const o=L.yr[k++];if(!o)break;o.on=true;o.p.set(S.view==='side'?-(G.GAP+G.XW*.3):G.GAP+G.XW+.6,0,(y-year)*G.DZ);o.ay='t';o.dy=S.view==='side'?8:0;setTxt(o,String(y))}}
  for(;k<L.yr.length;k++)L.yr[k].on=false;
  // Ereignisse (wandern mit dem Jahrgang)
  k=0;
  if(S.events&&!S.people&&!sideV){const evs=(EVENTS[S.c]||[]),used=[];
    const maxEv=VW<=860?3:L.ev.length;
    for(const e of evs){if(k>=maxEv)break;
      let a0,a1;if(e.ages){if(year<e.from||year>e.to)continue;a0=e.ages[0];a1=e.ages[1]}else{a0=byear(0,year)-e.b[1];a1=byear(0,year)-e.b[0];if(year<(e.from||e.b[1]+1)||year>(e.to||9999))continue}
      if(a1<0||a0>96)continue;a0=clamp(a0,0,100);a1=clamp(a1,0,100);const am=(a0+a1+1)/2+(e.ages?0:V.frac),s=e.sex==='m'?0:1;
      let i=S.grp===5?Math.min(20,Math.floor(am/5)):Math.round(am-.5);const len=V.lens[s*NA+i];
      let y=am*G.AH;if(used.some(u=>u.s===s&&Math.abs(u.y-y)<.62))continue;used.push({s,y});
      const o=L.ev[k++];o.on=true;o.ev=e;o.ax=s?'l':'r';o.p.set((s?1:-1)*(G.GAP+Math.max(len+.75,G.XW*.3)),y,zf);o.tip.set((s?1:-1)*(G.GAP+len+.05),y,zf);
      o.el.style.setProperty('--c',e.kind==='plus'?'var(--ok)':e.kind==='mig'?'var(--cmp)':'var(--bad)');
      setTxt(o,e[S.lang].t+'<small>'+(e.ages?T('evAges',e.ages[0],e.ages[1]):T('evBorn',e.b[0],e.b[1]))+'</small>')}}
  for(;k<L.ev.length;k++)L.ev[k].on=false;
  // Vergleich, Idealform, Jahrgang
  L.cmp.on=!!S.cmp;if(S.cmp){L.cmp.el.style.setProperty('--c','var(--cmp)');L.cmp.p.set(G.GAP+G.XW*.55,G.H*.78,zf);L.cmp.ax='c';setTxt(L.cmp,T('cmpTag',CN(S.cmp),Math.round(V.cmpYear)))}
  L.tmpl.on=!!S.tmpl;if(S.tmpl){L.tmpl.p.set(-G.GAP-G.XW*.55,G.H*.78,zf);L.tmpl.ax='c';setTxt(L.tmpl,T('tmplTag',T('sh_'+V.tmplType)))}
  L.coh.on=!!S.cohort&&!S.people;if(S.cohort){const co=S.cohort,a=byear(0,year)-(co[0]+co[1])/2;L.coh.on=L.coh.on&&a>=-.5&&a<=100.5;
    if(L.coh.on){const i=S.grp===5?Math.min(20,Math.floor(clamp(a,0,100)/5)):Math.round(clamp(a,0,100)),len=Math.max(V.lens[i],V.lens[NA+i]);
      L.coh.el.style.setProperty('--c','var(--cmp)');L.coh.p.set(G.GAP+V.lens[NA+i]+.25,Math.min(G.H,(a+V.frac+.5)*G.AH),zf);L.coh.ax='l';
      setTxt(L.coh,(co[0]===co[1]?T('cohTag1',co[0]):T('cohTag2',co[0],co[1]))+' · '+T('cohAge',Math.max(0,Math.round(a))))}}
  L.fig.on=false;
  L.born.on=V.moving&&!sideV&&!(S.people&&S.pstage<2)&&year<C().y1-.01;
  if(L.born.on){const len=S.people?G.XW*.45:(S.grp===5?V.lens[NA]:Math.max(V.lens[NB+1],V.lens[NA]));L.born.el.style.setProperty('--c','var(--ok)');L.born.p.set(G.GAP+len+.3,.12,zf);L.born.ax='l';setTxt(L.born,T('bornTag'))}
}

/* ---------- Kamera ---------- */
const VIEWS={front:{p:[0,5.5,29],t:[0,5.3,0]},oblique:{p:[13.5,8.85,24],t:[0,5.15,0]},land:{p:[14.5,10.5,26.5],t:[.8,4.6,-2.6]},side:{p:[-36,5.3,.02],t:[0,5.3,0]},
  crowd:{p:[0,21,18.5],t:[0,0,3.3]},floor:{p:[0,19,19],t:[0,1.5,.6]}};
const cam={a:null,t0:0,dur:1.4,fromP:new THREE.Vector3(),fromT:new THREE.Vector3(),toP:new THREE.Vector3(),toT:new THREE.Vector3()};
let USE_W=800,USE_H=500;
function fitDist(){ // Abstand, bei dem die ganze Pyramide in den freien Bereich passt
  const needW=2*(G.GAP+G.XW)+1.2,needH=G.H+2.0,t=Math.tan(camera.fov*Math.PI/360);
  return Math.max(needH/(2*t)*(VH/USE_H),needW/(2*t*(VW/VH))*(VW/USE_W))}
function flyTo(name,dur){const v=VIEWS[name];if(!v)return;cam.fromP.copy(camera.position);cam.fromT.copy(controls.target);cam.toP.fromArray(v.p);cam.toT.fromArray(v.t);
  const f=fitDist()/29,k={front:f,oblique:f*1.1,side:f*1.2,land:Math.max(1,f*1.12),crowd:Math.max(1,f),floor:Math.max(1,f)}[name]||1;
  cam.toP.sub(cam.toT).multiplyScalar(k).add(cam.toT);
  cam.a=name;cam.t0=performance.now();cam.dur=(dur==null?(S.film?2.2:1.4):dur)*1000;if(cam.dur<=0){camera.position.copy(cam.toP);controls.target.copy(cam.toT);cam.a=null}}
function camStep(now){if(!cam.a)return;const k=clamp((now-cam.t0)/cam.dur,0,1),e=ease(k);camera.position.lerpVectors(cam.fromP,cam.toP,e);controls.target.lerpVectors(cam.fromT,cam.toT,e);if(k>=1)cam.a=null}
renderer.domElement.addEventListener('pointerdown',()=>{cam.a=null});

/* ---------- Bloom ---------- */
let composer=null,bloom=null,useBloom=!QLO;
function setupComposer(w,h,pr){
  if(!useBloom)return;
  try{const rt=new THREE.WebGLRenderTarget(w*pr,h*pr,{samples:renderer.capabilities.isWebGL2?4:0,type:THREE.HalfFloatType});
    composer=new THREE.EffectComposer(renderer,rt);composer.addPass(new THREE.RenderPass(scene,camera));
    bloom=new THREE.UnrealBloomPass(new THREE.Vector2(w,h),.42,.7,.8);composer.addPass(bloom)}
  catch(e){useBloom=false;composer=null}}

/* ---------- helle / dunkle Fassung ---------- */
function applyTheme(name){
  TH=THEMES[name]||THEMES.light;S.theme=TH===THEMES.dark?'dark':'light';document.documentElement.dataset.lab=S.theme;lsSet('geogym-pyr-theme',S.theme);
  const bg=new THREE.Color(TH.bg);renderer.setClearColor(bg,1);U_BG.value.set(bg.r,bg.g,bg.b);U_LIGHT.value=TH.light;U_GLOSS.value=TH.gloss;
  for(const k in TH.col)COL[k].set(TH.col[k]);U_HI.value.set(COL.hi.r,COL.hi.g,COL.hi.b);
  const fu=floor.material.uniforms;fu.uBg.value.fromArray(TH.floorBg);fu.uBase.value.fromArray(TH.base);fu.uGlow.value.fromArray(TH.glow);fu.uGrid.value.fromArray(TH.grid);fu.uGridK.value=TH.gridK;
  sky.material.uniforms.uTop.value.fromArray(TH.skyTop);sky.material.uniforms.uBot.value.fromArray(TH.skyBot);
  arrowMat.color.set(TH.axis);arrowMat.opacity=Math.min(1,TH.axisOp*1.1);tickMat.color.set(TH.tick);tickMat.opacity=Math.min(1,TH.tickOp*(S.pres?1.5:1));axisMat.color.set(TH.axis);axisMat.opacity=TH.axisOp;
  cmpLine.material.color.set(TH.cmp);tmplLine.material.color.set(TH.tmpl);nowLine.material.color.set(TH.now);outlineLineMat.color.set(TH.outline);outlineFill.color.set(TH.fill);
  landKey='';if(typeof resize==='function'&&VW>1)resize()}

/* ---------- Größe ---------- */
let PR=1,QLEVEL=QLO?2:0;
const TOUCH=(navigator.maxTouchPoints||0)>1&&matchMedia('(pointer:coarse)').matches,ECO=()=>TOUCH||S.pres;   // Tablet oder Vorführmodus: sparsam zeichnen   // 0 volle Auflösung · 1 reduzierte Auflösung · 2 ohne Leuchten, einfache Auflösung
function resize(){
  const r=stage.getBoundingClientRect();VW=Math.max(1,r.width);VH=Math.max(1,r.height);PR=Math.min(window.devicePixelRatio||1,QLEVEL===2?1:QLEVEL===1?1.25:(ECO()?1.5:2));
  renderer.setPixelRatio(PR);renderer.setSize(VW,VH,false);
  const app=document.getElementById('app'),panel=document.getElementById('panel'),dock=document.getElementById('dock'),narrow=VW<=860,pOn=!app.classList.contains('panel-hidden')&&!S.film;
  const ch=document.getElementById('chart'),chOn=S.rates&&!ch.hidden,chR=!narrow&&!pOn&&!S.film&&chOn;   // Bedienfeld zu: das Diagramm steht rechts
  const pw=(!narrow&&pOn)?panel.getBoundingClientRect().width+16:chR?ch.getBoundingClientRect().width+22:0,rw=narrow?0:(chOn&&!chR?ch.getBoundingClientRect().width+22:S.film?0:176);
  if(!narrow){const tb=document.querySelector('.tools').getBoundingClientRect().bottom;panel.style.top=Math.round(Math.max(66,tb+12))+'px'}else panel.style.top='';   // Bedienfeld beginnt unter den Knöpfen oben rechts
  const dH=dock.getBoundingClientRect().height;app.style.setProperty('--dock-h',Math.round(dH)+'px');
  const topR=narrow?Math.max(118,document.querySelector('.title').getBoundingClientRect().bottom+34,chOn?document.getElementById('chart').getBoundingClientRect().bottom+30:0):104,botR=S.film?document.getElementById('cine').getBoundingClientRect().height-6:dH-14+(narrow?(pOn?Math.min(VH*.34,panel.getBoundingClientRect().height)+60:52):0);
  OFFX=(pw-rw)/2;OFFY=(botR-topR)/2;UI_L=rw?rw+8:8;UI_R=VW-pw-8;USE_W=Math.max(200,VW-pw-rw-20);USE_H=Math.max(160,VH-topR-botR);
  camera.aspect=VW/VH;camera.setViewOffset(VW,VH,OFFX,OFFY,VW,VH);camera.updateProjectionMatrix();
  cmpLine.material.resolution.set(VW,VH);tmplLine.material.resolution.set(VW,VH);nowLine.material.resolution.set(VW,VH);
  outlineLineMat.resolution.set(VW,VH);
  if(useBloom&&TH.bloom){if(!composer)setupComposer(VW,VH,PR);if(composer){composer.setPixelRatio(PR);composer.setSize(VW,VH)}}}
window.addEventListener('resize',()=>{resize();if(!cam.a&&VIEWS[S.view])flyTo(S.view,.5)});

/* ---------- Zeiger: Balken ablesen ---------- */
const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();let downAt=null;
function pick(ev){const r=renderer.domElement.getBoundingClientRect();
  // der Bildausschnitt ist verschoben (Bedienfeld): gleiche Verschiebung für den Sehstrahl
  ptr.x=((ev.clientX-r.left+OFFX)/r.width)*2-1;ptr.y=-((ev.clientY-r.top+OFFY)/r.height)*2+1;
  camera.clearViewOffset();camera.updateProjectionMatrix();ray.setFromCamera(ptr,camera);camera.setViewOffset(VW,VH,OFFX,OFFY,VW,VH);camera.updateProjectionMatrix();
  const h=ray.intersectObjects(topBars.visible?[bars,topBars]:[bars],false)[0];if(!h||h.instanceId==null)return null;const id=h.instanceId;
  if(h.object===topBars){const s=id>=NT?1:0;return {s,i:101+id-s*NT}}if(id>=NB)return {s:id-NB,i:0};const s=id>=NA?1:0,i=id-s*NA;if(i>=V.n)return null;return {s,i}}
