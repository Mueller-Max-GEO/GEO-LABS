/* ============================================================================================
   f_land.js – Küstenebene: Ort, Verkehr, Hafen, Schiffe, Bäume, Trümmer; Schäden und treibende Gegenstände
   ============================================================================================ */
const land=new THREE.Group(); world.add(land);
const mergeGeometries=BufferGeometryUtils.mergeGeometries;
let seed=11; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
function canvasTex(w,h,draw,repeat){ const c=document.createElement('canvas'); c.width=w;c.height=h; const g=c.getContext('2d',{willReadFrequently:true}); draw(g,w,h);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;} return t; }
function grain(g,w,h,a=0.06){ const d=g.getImageData(0,0,w,h); for(let i=0;i<d.data.length;i+=4){ const v=(rnd()-0.5)*255*a; d.data[i]+=v;d.data[i+1]+=v;d.data[i+2]+=v; } g.putImageData(d,0,0); }
const wallTex=(floors,cols,door)=>canvasTex(128,64*floors,(g,w,h)=>{ g.fillStyle='#F2EEE6'; g.fillRect(0,0,w,h); grain(g,w,h,0.05);
  for(let f=0;f<floors;f++){ const y0=f*64; for(let c=0;c<cols;c++){ const cw=w/cols, x=c*cw+cw*0.22, ww=cw*0.56;
    if(door&&f===floors-1&&c===Math.floor(cols/2)){ g.fillStyle='#6B4A33'; g.fillRect(x+ww*0.15,y0+22,ww*0.7,42); continue; }
    g.fillStyle='#E6E2DA'; g.fillRect(x-2,y0+14,ww+4,30); g.fillStyle='#3E5568'; g.fillRect(x,y0+16,ww,26); g.fillStyle='rgba(255,255,255,.35)'; g.fillRect(x+2,y0+18,ww*0.35,8);
    g.fillStyle='#CFC9BE'; g.fillRect(x,y0+28,ww,2); } if(f>0){ g.fillStyle='rgba(0,0,0,.08)'; g.fillRect(0,y0,w,2);} } });
const roofTex=canvasTex(64,64,(g,w,h)=>{ g.fillStyle='#8A8F94'; g.fillRect(0,0,w,h); for(let y=0;y<h;y+=6){ g.fillStyle='rgba(0,0,0,.28)'; g.fillRect(0,y,w,1.5); for(let x=(y/6)%2*4;x<w;x+=8){ g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(x,y+2,4,3);} } grain(g,w,h,0.06); },true);
roofTex.repeat.set(2,2);
const T1=wallTex(1,3,true), T2=wallTex(2,3,true), TA=wallTex(4,6,false), TW=canvasTex(128,64,(g,w,h)=>{ g.fillStyle='#C9CFD3'; g.fillRect(0,0,w,h); for(let x=0;x<w;x+=6){g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x,0,1,h);} g.fillStyle='#5D666C'; g.fillRect(w*0.3,h*0.3,w*0.4,h*0.7); grain(g,w,h,0.04); });
const WALLCOLS=['#FFFFFF','#F3E9D8','#E8E4DC','#F1E3CF','#DDE3E6'], ROOFCOLS=['#4A5560','#3D4650','#5E6670','#8C4436','#6B5948','#3F5E7A'];
const roofGeo=(()=>{const s=new THREE.Shape(); s.moveTo(-0.5,0); s.lineTo(0.5,0); s.lineTo(0,0.42); s.lineTo(-0.5,0); const g=new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false}); g.translate(0,0,-0.5); return g;})();
const boxGeo=new THREE.BoxGeometry(1,1,1);
const ruinM=new THREE.MeshStandardMaterial({color:0xA39C90,roughness:1});
const houses=[], cars=[], boats=[], roadSegs=[], railSegs=[], poles=[], treeInst=[];
function shadowy(o){ o.traverse(m=>{ if(m.isMesh){ m.castShadow=true; m.receiveShadow=true; } }); return o; }
function addBuilding(x,z,type){
  const g=new THREE.Group(); let w,h,d,tex;
  if(type==='h1'){ w=0.36+rnd()*0.08; d=0.3+rnd()*0.06; h=0.22; tex=T1; }
  else if(type==='h2'){ w=0.36+rnd()*0.06; d=0.32; h=0.4; tex=T2; }
  else if(type==='apt'){ w=0.7; d=0.34; h=0.78; tex=TA; }
  else { w=0.9; d=0.55; h=0.34; tex=TW; }
  const wm=new THREE.MeshStandardMaterial({map:tex,color:type==='ware'?0xffffff:WALLCOLS[Math.floor(rnd()*WALLCOLS.length)],roughness:0.85});
  const body=new THREE.Mesh(boxGeo,wm); body.scale.set(w,h,d); body.position.y=h/2; g.add(body);
  if(type==='apt'||type==='ware'){ const r=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:type==='ware'?0x5F7486:0x6E7378,roughness:0.9})); r.scale.set(w+0.02,0.03,d+0.02); r.position.y=h+0.015; g.add(r); }
  else { const r=new THREE.Mesh(roofGeo,new THREE.MeshStandardMaterial({map:roofTex,color:ROOFCOLS[Math.floor(rnd()*ROOFCOLS.length)],roughness:0.7})); r.scale.set(d+0.08,0.5*(d+0.08),w+0.06); r.rotation.y=Math.PI/2; r.position.y=h; g.add(r);
    if(rnd()<0.4){ const ch=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0x8B8178})); ch.scale.set(0.04,0.1,0.04); ch.position.set(w*0.25,h+0.12,d*0.15); g.add(ch); } }
  const y=gRest(x,z); g.position.set(x,y,z); g.rotation.y=(rnd()-0.5)*0.12+(rnd()<0.3?Math.PI/2:0)*(type==='h1'?1:0);
  g.userData={x,z,y,ry:g.rotation.y,body,wm,dir:rnd()<0.5?1:-1,h,type}; shadowy(g); land.add(g); houses.push(g); return g;
}
/* Ort: Häuserreihen beidseits der Straße, Felder dazwischen */
const ROAD_X=8.75, RAIL_X=10.05;
for(const rx of [7.95,8.35,9.15,9.55,10.5]){ for(let z=-1.2;z<=5.7;z+=0.56){ if(rnd()<0.14) continue; if(rx<8.9&&Math.abs(z-chZ(rx))<0.78) continue; addBuilding(rx+(rnd()-0.5)*0.1,z+(rnd()-0.5)*0.12,rnd()<0.28?'h2':'h1'); } }
for(const [x,z] of [[9.35,-2.6],[8.1,-3.8],[9.5,-4.6],[8.4,-5.4],[10.5,-3.0],[9.2,-1.9]]) addBuilding(x,z,'h1');
addBuilding(9.4,1.2,'apt'); addBuilding(9.4,3.6,'apt'); addBuilding(7.9,-2.2,'ware'); addBuilding(7.95,5.25,'ware');
const school=(()=>{ const g=new THREE.Group(); const b=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({map:wallTex(3,8,false),color:0xffffff,roughness:0.8})); b.scale.set(1.0,0.5,0.45); b.position.y=0.25; g.add(b);
  const r=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0x56708A})); r.scale.set(1.04,0.04,0.49); r.position.y=0.52; g.add(r);
  const x=11.5,z=0.9; g.position.set(x,gRest(x,z)-0.03,z); g.userData={x,z}; shadowy(g); land.add(g); return g; })();
/* Straße mit Asphalt-Textur */
const roadTex=canvasTex(64,256,(g,w,h)=>{ g.fillStyle='#55595C'; g.fillRect(0,0,w,h); grain(g,w,h,0.09); g.fillStyle='#EDEDE6'; for(let y=0;y<h;y+=48) g.fillRect(w/2-2,y,4,26); g.fillStyle='#D9D9D0'; g.fillRect(3,0,2,h); g.fillRect(w-5,0,2,h); },true);
const NSEG=14;
for(let i=0;i<NSEG;i++){ const L=2*ZD/NSEG, z=-ZD+(i+0.5)*L; const t=roadTex.clone(); t.needsUpdate=true; t.repeat.set(1,L*1.2);
  const m=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({map:t,roughness:0.95})); m.scale.set(0.34,0.03,L-0.01); const y=gRest(ROAD_X,z)+0.016; m.position.set(ROAD_X,y,z); m.receiveShadow=true; m.userData={x:ROAD_X,z,y}; land.add(m); roadSegs.push(m); }
/* Bahnlinie: Schotter, Schwellen, Schienen */
const ballM=new THREE.MeshStandardMaterial({color:0xA39E94,roughness:1}), railM=new THREE.MeshStandardMaterial({color:0x6E6A66,metalness:0.6,roughness:0.4}), sleepM=new THREE.MeshStandardMaterial({color:0x5A4B3E,roughness:0.9});
for(let i=0;i<NSEG;i++){ const L=2*ZD/NSEG, z=-ZD+(i+0.5)*L; const g=new THREE.Group();
  const b=new THREE.Mesh(boxGeo,ballM); b.scale.set(0.28,0.04,L-0.01); g.add(b);
  const sl=[]; for(let s=0;s<7;s++){ const bg=new THREE.BoxGeometry(0.2,0.015,0.03); bg.translate(0,0.025,-L/2+(s+0.5)*L/7); sl.push(bg); }
  g.add(new THREE.Mesh(mergeGeometries(sl),sleepM));
  for(const o of [-0.055,0.055]){ const r=new THREE.Mesh(boxGeo,railM); r.scale.set(0.014,0.018,L-0.01); r.position.set(o,0.04,0); g.add(r); }
  const y=gRest(RAIL_X,z)+0.02; g.position.set(RAIL_X,y,z); g.userData={x:RAIL_X,z,y}; shadowy(g); land.add(g); railSegs.push(g); }
/* Strommasten mit Leitungen */
const poleM=new THREE.MeshStandardMaterial({color:0x8E8A82,roughness:0.8});
for(let z=-5.6;z<=5.7;z+=0.82){ const g=new THREE.Group(); const p=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.016,0.5,6),poleM); p.position.y=0.25; g.add(p);
  const c=new THREE.Mesh(boxGeo,poleM); c.scale.set(0.012,0.012,0.16); c.position.y=0.46; g.add(c);
  const x=ROAD_X+0.24; g.position.set(x,gRest(x,z),z); g.userData={x,z,y:g.position.y,dmg:0}; shadowy(g); land.add(g); poles.push(g); }
const wireGeo=new THREE.BufferGeometry(); const wire=new THREE.LineSegments(wireGeo,new THREE.LineBasicMaterial({color:0x2b2f33,transparent:true,opacity:0.7})); land.add(wire);
let wireKey='', shadowKey=null;
function updateWires(){ const pts=[]; for(let i=0;i<poles.length-1;i++){ const a=poles[i],b=poles[i+1]; if(a.userData.dmg>0.2||b.userData.dmg>0.2) continue;
  for(const off of [-0.07,0.07]){ const p0=new THREE.Vector3(0,0.46,off).applyMatrix4(a.matrixWorld), p1=new THREE.Vector3(0,0.46,off).applyMatrix4(b.matrixWorld);
    const sag=0.05; let prev=p0; for(let s=1;s<=6;s++){ const u=s/6; const q=p0.clone().lerp(p1,u); q.y-=sag*4*u*(1-u); pts.push(prev,q); prev=q; } } }
  wire.geometry.dispose(); wire.geometry=new THREE.BufferGeometry().setFromPoints(pts); }
/* Autos */
const CARCOLS=[0xF2F2F2,0x2D3A4A,0xB3261E,0x9AA3AB,0x1D1F21,0x2F6DB5,0xD8C27A];
for(let i=0;i<22;i++){ const g=new THREE.Group(); const cm=new THREE.MeshStandardMaterial({color:CARCOLS[i%CARCOLS.length],roughness:0.35,metalness:0.4});
  const b=new THREE.Mesh(boxGeo,cm); b.scale.set(0.085,0.045,0.18); b.position.y=0.035; g.add(b);
  const c=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0x2a3138,roughness:0.2,metalness:0.5})); c.scale.set(0.075,0.035,0.09); c.position.set(0,0.07,-0.01); g.add(c);
  let x,z; if(i<14){ x=ROAD_X+(i%2?0.07:-0.07); z=-5.5+rnd()*11; } else { x=7.75+rnd()*0.3; z=-2.7+rnd()*1.0+(i>18?7.3:0); }
  g.position.set(x,gRest(x,z)+0.03,z); g.rotation.y=i<14?0:rnd()*3; g.userData={x,z,ry:g.rotation.y,dir:rnd()<0.5?1:-1}; shadowy(g); land.add(g); cars.push(g); }
/* Hafen: Mole und Fischerboote */
const pier=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0xA9A49A,roughness:0.95})); pier.scale.set(1.25,0.13,0.2); pier.position.set(7.3,0.0,chZ(7.3)-0.62); shadowy(pier); land.add(pier); pier.userData={x:7.3,z:chZ(7.3)-0.62,y:0.0};
const hullGeo=(()=>{ const s=new THREE.Shape(); s.moveTo(-0.24,0.06); s.lineTo(0.2,0.06); s.quadraticCurveTo(0.27,0.06,0.26,0.0); s.lineTo(-0.22,-0.03); s.lineTo(-0.24,0.06);
  const g=new THREE.ExtrudeGeometry(s,{depth:0.11,bevelEnabled:true,bevelSize:0.012,bevelThickness:0.01,bevelSegments:2}); g.translate(0,0,-0.055); return g; })();
for(const [x,z,ry] of [[7.0,chZ(7.0)-0.22,0.1],[7.55,chZ(7.55)-0.2,-0.08],[7.9,chZ(7.9)+0.12,0.12],[6.5,chZ(6.5)+0.15,0.3]]){ const g=new THREE.Group();
  const h=new THREE.Mesh(hullGeo,new THREE.MeshStandardMaterial({color:0xF4F4F0,roughness:0.5})); g.add(h);
  const st=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0x2F6DB5})); st.scale.set(0.5,0.015,0.13); st.position.y=0.04; g.add(st);
  const cab=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0xE8E8E2})); cab.scale.set(0.11,0.08,0.09); cab.position.set(-0.05,0.1,0); g.add(cab);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.2,5),poleM); mast.position.set(0.06,0.16,0); g.add(mast);
  g.rotation.y=Math.PI/2+ry; g.position.set(x,0,z); g.userData={x,z,ry:g.rotation.y}; shadowy(g); land.add(g); boats.push(g); }
/* Schiffe auf dem offenen Meer: Der Tsunami hebt sie nur kurz an – sie bleiben unbeschädigt */
const seaBoats=[];
for(const [x,z,ry,sc,hc] of [[-11.2,2.2,0.15,1.9,0xB3261E],[-5.9,3.3,2.95,1.6,0x2F6DB5],[-2.6,-0.4,-0.1,1.5,0x2D3A4A]]){ const g=new THREE.Group();
  g.add(new THREE.Mesh(hullGeo,new THREE.MeshStandardMaterial({color:0xF4F4F0,roughness:0.5})));
  const st=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:hc})); st.scale.set(0.5,0.02,0.13); st.position.y=0.035; g.add(st);
  const cab=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0xE8E8E2})); cab.scale.set(0.13,0.09,0.1); cab.position.set(-0.07,0.105,0); g.add(cab);
  const win=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0x2a3138,roughness:0.2})); win.scale.set(0.135,0.025,0.102); win.position.set(-0.07,0.125,0); g.add(win);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.24,5),poleM); mast.position.set(0.07,0.17,0); g.add(mast);
  g.scale.setScalar(sc); g.position.set(x,0,z); g.userData={x,z,ry,sc}; shadowy(g); land.add(g); seaBoats.push(g); }
function updateSeaBoats(){ for(const g of seaBoats){ const u=g.userData, e=0.2*u.sc;
  const h=waterAt(u.x,u.z)[0], hf=waterAt(u.x+e,u.z)[0], hb=waterAt(u.x-e,u.z)[0];
  g.position.set(u.x,h-0.012*u.sc,u.z); g.rotation.set(0,u.ry,0); g.rotateZ(Math.atan2(hf-hb,2*e)*Math.cos(u.ry)); } }
/* Bäume: Küstenkiefernwald auf der Düne, Laubwald auf dem Hügel (Instanzen) */
const pineCanopy=mergeGeometries([new THREE.ConeGeometry(0.075,0.16,8).translate(0,0.2,0),new THREE.ConeGeometry(0.06,0.14,8).translate(0,0.28,0),new THREE.ConeGeometry(0.042,0.12,8).translate(0,0.35,0)]);
const trunkGeo=new THREE.CylinderGeometry(0.012,0.016,0.16,6).translate(0,0.08,0);
const decCanopy=(()=>{ const g=new THREE.IcosahedronGeometry(0.11,1); const p=g.attributes.position; for(let i=0;i<p.count;i++){ const s=0.85+0.3*hash2(p.getX(i)*9,p.getY(i)*7+p.getZ(i)*3); p.setXYZ(i,p.getX(i)*s,p.getY(i)*s*0.85,p.getZ(i)*s); } g.computeVertexNormals(); g.translate(0,0.22,0); return g; })();
const treeSpots=[];
for(let z=-5.85;z<=5.85;z+=0.13){ for(let c=0;c<4;c++){ const x=XC+0.55+c*0.12+(rnd()-0.5)*0.07; if(Math.abs(z-chZ(x))<0.66) continue; treeSpots.push([x,z+(rnd()-0.5)*0.08,'p']); } }
for(let i=0;i<190;i++){ const x=10.72+rnd()*1.22, z=-5.8+rnd()*11.6; if(Math.abs(x-11.5)<0.68&&Math.abs(z-0.9)<0.5) continue; treeSpots.push([x,z,'d']); }
for(let i=0;i<40;i++){ treeSpots.push([8.0+rnd()*2.6,-5.8+rnd()*4.2,'d']); }
function instTrees(kind,canopyGeo,canopyCol){
  const spots=treeSpots.filter(s=>s[2]===kind); const n=spots.length;
  const can=new THREE.InstancedMesh(canopyGeo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.85}),n), tr=new THREE.InstancedMesh(trunkGeo,new THREE.MeshStandardMaterial({color:0x6A5139,roughness:0.9}),n);
  can.castShadow=tr.castShadow=true; can.receiveShadow=true; can.frustumCulled=tr.frustumCulled=false; const col=new THREE.Color();
  spots.forEach((s,i)=>{ col.set(canopyCol[Math.floor(rnd()*canopyCol.length)]).offsetHSL(0,0,(rnd()-0.5)*0.06); can.setColorAt(i,col);
    treeInst.push({mesh:can,tr,i,x:s[0],z:s[1],y:gRest(s[0],s[1]),s:0.85+rnd()*0.4,ry:rnd()*6.28,dir:rnd()<0.5?1:-1}); });
  land.add(can,tr); return {can,tr}; }
instTrees('p',pineCanopy,['#2F4F2C','#36573A','#2B4627','#3C5B35']);
instTrees('d',decCanopy,['#4F7337','#5E7F3D','#466A33','#6C8A45']);
const treeMeshes=[...new Set(treeInst.flatMap(o=>[o.mesh,o.tr]))];
const _m=new THREE.Matrix4(), _q=new THREE.Quaternion(), _e=new THREE.Euler(), _s=new THREE.Vector3(), _p3=new THREE.Vector3();
function setTree(o,dx,tilt){ _e.set(tilt*0.15*o.dir,o.ry,-tilt); _q.setFromEuler(_e); _s.setScalar(o.s); _p3.set(o.x+dx,o.y,o.z); _m.compose(_p3,_q,_s); o.mesh.setMatrixAt(o.i,_m); o.tr.setMatrixAt(o.i,_m); }
treeInst.forEach(o=>setTree(o,0,0));

/* Trümmer aus zerstörten Häusern (Instanzen) */
const DEBN=LOWQ?140:260;
const debris=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.85}),DEBN);
debris.castShadow=true; debris.frustumCulled=false; land.add(debris);
const debInfo=[]; { const cols=['#8A6B4A','#A88B66','#E9E4DA','#5E6670','#7A5A3A','#C9C2B5','#4A5560']; const c=new THREE.Color();
  for(let i=0;i<DEBN;i++){ const k=rnd(); const sc=k<0.5?[0.24,0.03,0.07]:(k<0.8?[0.15,0.025,0.15]:[0.1,0.08,0.11]);
    debInfo.push({sc,spin:(rnd()-0.5)*7,jx:(rnd()-0.5),jz:(rnd()-0.5),lat:(rnd()-0.5)*0.5,tx:(rnd()-0.5)*0.6,tz:(rnd()-0.5)*0.6}); c.set(cols[Math.floor(rnd()*cols.length)]); debris.setColorAt(i,c); } }
/* ---------- Messpunkte (Belastung durch die Strömung) und treibende Gegenstände für die Aufzeichnung ---------- */
const probes=[], floatSpecs=[];
const addProbe=(x,z)=>{ probes.push({x,z}); return probes.length-1; };
for(const o of [...houses,...roadSegs,...railSegs,...poles]) o.userData.pi=addProbe(o.userData.x,o.userData.z);
for(const o of treeInst) o.pi=addProbe(o.x,o.z);
{ let q=7; const r2=()=>{q=(q*16807)%2147483647;return q/2147483647;};
  for(const o of cars){ const u=o.userData; floatSpecs.push({kind:'car',o,x0:u.x,z0:u.z,ry0:u.ry,th:0.028*(0.75+0.5*r2()),mob:0.82+0.16*r2(),spin:2.2*u.dir,lat:0.05*u.dir,sink:0.03,rest:0.03,tilt:[0.25*u.dir,0.2]}); }
  boats.forEach((o,i)=>{ const u=o.userData; floatSpecs.push({kind:'boat',o,x0:u.x,z0:u.z,ry0:u.ry,th:0.013,mob:0.9+0.1*r2(),spin:(i%2?1.2:-1.2),lat:(i%2?-0.04:0.04),sink:0.02,rest:0.03,tilt:[0.3,0.35]}); });
  /* Trümmer: je Holzhaus bis zu sechs Teile; sie werden frei, sobald das Haus zerstört ist */
  const wooden=houses.filter(h=>h.userData.type==='h1'||h.userData.type==='h2').sort((a,b)=>a.userData.x-b.userData.x); let d=0;
  for(const h of wooden){ const n=h.userData.type==='h2'?6:5; for(let k=0;k<n&&d<DEBN;k++,d++){ const I=debInfo[d], light=I.sc[1]<0.05;
      floatSpecs.push({kind:'deb',i:d,house:h.userData.pi,delay:k*0.1,x0:h.userData.x+I.jx*0.3,z0:h.userData.z+I.jz*0.3,ry0:I.spin,th:(light?0.0045:0.008)*(0.7+0.6*r2()),mob:0.9+0.1*r2(),spin:I.spin,lat:I.lat*0.12,sink:0.008,rest:0.012,tilt:[I.tx,I.tz]}); } }
}
const _dm=new THREE.Matrix4(), _dq=new THREE.Quaternion(), _de=new THREE.Euler(), _dsv=new THREE.Vector3(), _dp=new THREE.Vector3(), _fa=[0,0,0,0];
function updateFloaters(tau,active){
  for(let j=0;j<floatSpecs.length;j++){ const f=floatSpecs[j];
    let x=f.x0, z=f.z0, ry=f.ry0, a=f.kind==='deb'?2:0;
    if(active){ rec.floaterAt(rec.floaters[j],tau,_fa); x=_fa[0]; z=_fa[1]; ry=_fa[2]; a=_fa[3]; }
    if(f.kind==='deb'&&a===2){ _dm.makeScale(0,0,0); debris.setMatrixAt(f.i,_dm); continue; }
    const w=waterAt(x,z), afloat=w[1]>f.th*0.55, y=afloat?w[0]-f.sink:w[0]-w[1]+f.rest;
    const moved=Math.hypot(x-f.x0,z-f.z0)>0.08, bob=afloat?0.06*Math.sin(tau*5+f.x0*9):0, tx=(!afloat&&moved)?f.tilt[0]:bob, tz=(!afloat&&moved)?f.tilt[1]:bob*0.7;
    if(f.kind==='deb'){ const I=debInfo[f.i]; _de.set(tx+0.2*Math.sin(ry*1.3),ry,tz+0.2*Math.cos(ry)); _dq.setFromEuler(_de); _dsv.set(I.sc[0],I.sc[1],I.sc[2]); _dp.set(x,y+I.sc[1]/2,z); _dm.compose(_dp,_dq,_dsv); debris.setMatrixAt(f.i,_dm); }
    else { f.o.position.set(x,y,z); f.o.rotation.set(tx,ry,tz); }
  }
  debris.instanceMatrix.needsUpdate=true;
}
/* Schäden: aus der bisher größten Belastung E (Wassertiefe + Staudruck) an jedem Gegenstand */
function updateDamage(tau,active){
  const E=o=>active?rec.maxAt(rec.probes[o].E,tau):0;
  for(const o of houses){ const u=o.userData, e=E(u.pi); let dmg=sstep(E_DAMAGE,E_DESTROY,e), col=sstep(E_DESTROY,E_DESTROY*1.22,e);
    if(u.type==='apt'){ dmg*=0.0; col=0; } else if(u.type==='ware'){ col=sstep(E_DESTROY*1.25,E_DESTROY*1.5,e); }
    o.position.set(u.x+0.1*dmg+0.16*col,u.y-0.015*col,u.z+0.05*u.dir*dmg); o.rotation.set(0.04*u.dir*dmg,u.ry+0.22*u.dir*dmg+0.3*u.dir*col,-0.16*dmg-0.3*col); o.scale.set(1,1-0.84*col,1);
    o.children.forEach(c=>{ if(c!==u.body) c.visible=col<0.55; }); u.body.material=col>0.5?ruinM:u.wm; }
  for(const o of [...roadSegs,...railSegs]){ const u=o.userData, dmg=sstep(0.13,0.3,E(u.pi)); u.dmg=dmg; o.position.set(u.x+0.22*dmg,u.y+0.012*dmg,u.z); o.rotation.set(0.3*dmg*(u.z>0?1:-1),0.3*dmg,-0.22*dmg); }
  for(const o of poles){ const u=o.userData, dmg=sstep(0.1,0.24,E(u.pi)); u.dmg=dmg; o.position.set(u.x+0.1*dmg,u.y,u.z); o.rotation.set(0.3*dmg,0,-1.25*dmg); }
  { let ch=false; for(const o of treeInst){ const d=sstep(0.12,0.3,E(o.pi)); if(o.ld!==d){ o.ld=d; setTree(o,0.1*d,1.15*d); ch=true; } }
    if(ch) for(const m of treeMeshes) m.instanceMatrix.needsUpdate=true; }
  land.updateMatrixWorld(true); { const key=poles.map(p=>Math.round((p.userData.dmg||0)*20)).join(''); if(key!==wireKey){ wireKey=key; updateWires(); } }
  { const sk=active?Math.round(tau*10):-1; if(sk!==shadowKey){ shadowKey=sk; shadowDirty=true; } }
}
/* Nasser, verschlammter Boden: Zeitpunkt der ersten Überflutung an jedem Punkt der Landoberfläche */
function applyWetMap(){
  const pos=OP.geo.attributes.position.array, aWet=OP.geo.attributes.aWet.array, aG=OP.geo.attributes.aG.array, aDB=OP.geo.attributes.aDB.array, wt=rec&&scen.R>0.2?rec.wetT:null;
  for(let v=0;v<aWet.length;v++){ aWet[v]=1e9; if(!wt) continue; const x=pos[v*3], z=pos[v*3+2]; if(x<XC-0.1||aG[v]<1||aDB[v]>0) continue;
    const i=Math.round(S0.fxOf(x)), k=clamp(Math.round((z+ZD)/S0.dz-0.5),0,NZW-1); let m=wt[k*NXW+i];
    if(i>0) m=Math.min(m,wt[k*NXW+i-1]+0.4); aWet[v]=m; }
  OP.geo.attributes.aWet.needsUpdate=true;
}
