/* ============================================================================================
   g_labels.js – Beschriftungen ohne Überlappung (intern nah am Objekt, sonst am Rand mit Führungslinie)
   ============================================================================================ */
/* ===================== Beschriftungen ohne Überlappung ===================== */
const labelLayer=$('labels'), leaderCv=$('leaders'), lctx=leaderCv.getContext('2d'); let hudRects=[], hudStamp=0, labelsMoving=false;
const labels=[];
function addLabel(html,cls,anchor,phases,opt={}){ const el=document.createElement('div'); el.className='lab '+cls; el.innerHTML=html; labelLayer.appendChild(el);
  const L={el,anchor:typeof anchor==='function'?anchor:()=>anchor,phases,cond:opt.cond,prio:opt.prio??5,point:opt.point!==false,icon:opt.icon,w:0,h:0,last:null,vis:false,_html:html};
  labels.push(L); return L; }
function setLabelHTML(L,html){ if(L._html!==html){ L.el.innerHTML=html; L._html=html; L.w=0; } }
const _pp=new THREE.Vector3();
function pointCands(w,h){ const g=14; return [[0,-(h/2+g)],[w/2+g,-(h/2+g*0.7)],[-(w/2+g),-(h/2+g*0.7)],[w/2+g+4,0],[-(w/2+g+4),0],[0,h/2+g],[w/2+g,h/2+g*0.7],[-(w/2+g),h/2+g*0.7],
  [0,-(h/2+g*3)],[w/2+g*2,-(h/2+g*2.6)],[-(w/2+g*2),-(h/2+g*2.6)],[0,h/2+g*3],[w/2+g*3.5,0],[-(w/2+g*3.5),0],[0,-(h/2+g*5)],[0,h/2+g*5]]; }
function areaCands(w,h){ return [[0,0],[0,-(h+8)],[0,h+8],[w*0.7,0],[-w*0.7,0],[0,-(h*2+16)],[0,h*2+16]]; }
const starPath=(x,y)=>{ let d=''; for(let i=0;i<10;i++){ const r=i%2?4:10, a=-Math.PI/2+i*Math.PI/5; d+=(i?'L':'M')+(x+r*Math.cos(a)).toFixed(1)+','+(y+r*Math.sin(a)).toFixed(1);} return `<path class="star" d="${d}Z"/>`; };
/* Beschriftungs-Layout nach bewährten Regeln:
   1. Beschriftung möglichst nah am Objekt (intern), sonst am Bildrand (extern) mit kurzer, gerader Führungslinie.
   2. Keine Überlappung mit anderen Beschriftungen, Bedienelementen, Pfeilen und markierten Punkten.
   3. Wichtige Beschriftungen zuerst; ruhige Bewegung (weiches Nachführen, Einblenden statt Springen).
   4. Detailstufe wählbar: „Wichtige“ oder „Alle“. */
const prioOf=L=>typeof L.prio==='function'?L.prio():L.prio;
function projXY(p,W,H){ _pp.set(p[0],p[1],p[2]).project(camera); if(_pp.z>1||_pp.z<-1) return null; return [(_pp.x*0.5+0.5)*W,(-_pp.y*0.5+0.5)*H]; }
const hits=(r,q,pad=3)=>r[0]<q[2]+pad&&r[2]>q[0]-pad&&r[1]<q[3]+pad&&r[3]>q[1]-pad;
function placeLabels(){
  const W=vp.clientWidth,H=vp.clientHeight, nowT=performance.now();
  if(nowT-hudStamp>250){ hudStamp=nowT; hudRects=[]; const vr=vp.getBoundingClientRect();
    for(const c of document.querySelectorAll('[data-avoid]')){ if(c.hidden||c.offsetParent===null) continue; const r=c.getBoundingClientRect(); if(r.width<2||r.height<2) continue; hudRects.push([r.left-vr.left-4,r.top-vr.top-4,r.right-vr.left+4,r.bottom-vr.top+4]); } }
  const obst=hudRects.slice();
  /* Pfeile freihalten */
  for(const k in A){ const a=A[k]; if(!a.visible||!a.userData.from) continue; const f=a.userData.from,to=a.userData.to;
    for(const u of [0.2,0.5,0.8,1]){ const q=projXY([lerp(f[0],to[0],u),lerp(f[1],to[1],u),lerp(f[2],to[2],u)],W,H); if(q) obst.push([q[0]-8,q[1]-8,q[0]+8,q[1]+8]); } }
  const minP=state.lvl==='all'?0:6;
  const list=[];
  for(const L of labels){ L.show=false; if(!L.vis||prioOf(L)<minP) continue; const q=projXY(L.anchor(),W,H); if(!q) continue; L.ax=q[0]; L.ay=q[1]; list.push(L);
    if(L.point||L.icon){ const r=L.icon?9:5; obst.push([q[0]-r,q[1]-r,q[0]+r,q[1]+r]); } }
  list.sort((a,b)=>prioOf(b)-prioOf(a));
  const placed=[...obst], ext={l:[],r:[]};
  for(const L of list){
    if(!L.w){ L.w=L.el.offsetWidth; L.h=L.el.offsetHeight; }
    const w=L.w,h=L.h, cands=L.point?pointCands(w,h):areaCands(w,h);
    const order=[...cands.keys()]; if(L.last!=null&&L.last<cands.length){ order.splice(order.indexOf(L.last),1); order.unshift(L.last); }
    let rect=null;
    for(const ci of order){ const cx=L.ax+cands[ci][0], cy=L.ay+cands[ci][1]; const r=[cx-w/2,cy-h/2,cx+w/2,cy+h/2];
      if(r[0]<6||r[1]<6||r[2]>W-6||r[3]>H-6) continue;
      let hit=false; for(const q of placed){ if(hits(r,q)){hit=true;break;} } if(hit) continue;
      rect=r; L.last=ci; break; }
    if(rect){ placed.push(rect); L.tr=rect; L.show=true; L.ext=false; }
    else if(L.point){ L.last=null; ext[L.ax<W/2?'l':'r'].push(L); }
  }
  /* externe Beschriftungen am Rand, nach Höhe sortiert (keine gekreuzten Linien) */
  for(const side of ['l','r']){ const arr=ext[side].sort((a,b)=>a.ay-b.ay); let cursor=8;
    for(const L of arr){ const w=L.w,h=L.h, x0=side==='l'?10:W-10-w; let y=Math.max(cursor,L.ay-h/2), ok=false;
      for(let g=0;g<40&&y+h<H-8;g++){ const r=[x0,y,x0+w,y+h]; const q=placed.find(q=>hits(r,q,4)); if(!q){ ok=true; break; } y=q[3]+5; }
      if(!ok) continue; const r=[x0,y,x0+w,y+h]; placed.push(r); L.tr=r; L.show=true; L.ext=true; cursor=y+h+6; } }
  /* zeichnen: weich nachführen, Führungslinien mit hellem Rand (Canvas) */
  const pr=Math.min(2,devicePixelRatio||1); if(leaderCv.width!==Math.round(W*pr)||leaderCv.height!==Math.round(H*pr)){ leaderCv.width=Math.round(W*pr); leaderCv.height=Math.round(H*pr); }
  lctx.setTransform(pr,0,0,pr,0,0); lctx.clearRect(0,0,W,H); labelsMoving=false;
  const dot=(x,y,r,fill,stroke,lw)=>{ lctx.beginPath(); lctx.arc(x,y,r,0,Math.PI*2); lctx.fillStyle=fill; lctx.fill(); lctx.lineWidth=lw; lctx.strokeStyle=stroke; lctx.stroke(); };
  const star=(x,y)=>{ lctx.beginPath(); for(let i=0;i<10;i++){ const r=i%2?4:10, a=-Math.PI/2+i*Math.PI/5; lctx[i?'lineTo':'moveTo'](x+r*Math.cos(a),y+r*Math.sin(a)); } lctx.closePath(); lctx.fillStyle='#D2232A'; lctx.fill(); lctx.lineWidth=1.5; lctx.strokeStyle='#fff'; lctx.stroke(); };
  for(const L of labels){
    if(L.icon&&L.vis&&prioOf(L)>=minP&&L.ax!=null){ if(L.icon==='star') star(L.ax,L.ay); else dot(L.ax,L.ay,6,'#D2232A','#fff',2); }
    if(!L.show){ if(L.was){ L.el.style.opacity='0'; L.was=false; } L.ax=null; continue; }
    const r=L.tr; if(!L.was||L.cx==null){ L.cx=r[0]; L.cy=r[1]; } else { const dx=r[0]-L.cx, dy=r[1]-L.cy; if(Math.abs(dx)+Math.abs(dy)>0.6){ L.cx+=dx*0.28; L.cy+=dy*0.28; labelsMoving=true; } else { L.cx=r[0]; L.cy=r[1]; } }
    if(!L.was){ L.el.style.opacity='1'; } L.was=true;
    const tf=`translate(${L.cx.toFixed(1)}px,${L.cy.toFixed(1)}px)`; if(L._tf!==tf){ L.el.style.transform=tf; L._tf=tf; }
    if(L.point){ const x0=L.cx,y0=L.cy,x1=x0+L.w,y1=y0+L.h; const px=clamp(L.ax,x0,x1), py=clamp(L.ay,y0,y1);
      if(Math.hypot(px-L.ax,py-L.ay)>2){ lctx.beginPath(); lctx.moveTo(L.ax,L.ay); lctx.lineTo(px,py); lctx.lineWidth=3.8; lctx.strokeStyle='rgba(4,8,14,.62)'; lctx.stroke(); lctx.lineWidth=1.4; lctx.strokeStyle='rgba(255,255,255,.96)'; lctx.stroke(); }
      if(!L.icon) dot(L.ax,L.ay,3.2,'#fff','rgba(4,8,14,.8)',1.5); }
    L.ax=null; }
}
