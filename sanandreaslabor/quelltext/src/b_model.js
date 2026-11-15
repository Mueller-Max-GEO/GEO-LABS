/* ============================================================================================
   b_model.js – Rechenmodell: Zeitachse, Plattenbewegung, Verhaken, Erdbeben, Verformung
   Alles hängt nur von der Zeit t auf der Zeitleiste (und vom gewählten Verhalten) ab: So lässt sich jede Stelle
   direkt anspringen, vor- und zurückspulen.
   ============================================================================================ */
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,u)=>a+(b-a)*u;
const sstep=(a,b,x)=>{ const u=clamp((x-a)/(b-a),0,1); return u*u*(3-2*u); };

/* Zeitleiste (Sekunden der Animation bei Tempo 1×) */
const TG=10, T0=TG+8, T1=T0+10, T2=T1+16, T3=T2+26, T4=T3+28, TEND=T4;
const PH_T=[[TG,T0],[T0,T1],[T1,T2],[T2,T3],[T3,T4]];
const phaseAt=t=>t<T0?0:(t<T1?1:(t<T2?2:(t<T3?3:4)));
const scaleOfPhase=p=>p===0?'W':(p===1?'A':(p===4?'C':'B'));

/* Messwerte der Wirklichkeit */
const RATE=0.0352;         // m pro Jahr: Versatzrate der San-Andreas-Verwerfung in der Carrizo-Ebene (130 m in 3.700 Jahren)
const CYCLE_Y=150;         // Jahre zwischen zwei Erdbeben im Beispielzyklus (Phase 2)
const F_CYCLE=RATE*CYCLE_Y;// 5,25 m Rückstand nach 150 Jahren
const LOCKD=15000;         // m: bis in diese Tiefe ist die Verwerfung verhakt
const RUP_V=3000;          // m/s: Geschwindigkeit der Bruchfront
const WAVE_V=3500;         // m/s: Geschwindigkeit der (S-)Erdbebenwellen
const XB=3000;             // Überhöhung der Verformung im Regionalmodell (Maßstab B)
const NOWYEAR=2026, Y0=-3700, LASTQ=-(NOWYEAR-1857), S_TOT=130;   // Wallace Creek: 130 m Versatz seit rund 3.700 Jahren

/* Ausschnitte der vier Maßstäbe (Meter im Koordinatensystem der Verwerfung: s nach Nordwesten, w nach Nordosten) */
const SCL={
  W:{key:'W',bs0:-1940e3,bs1:1940e3,bw0:-640e3,bw1:1040e3,zex:20,depth:60e3,wfA:0,wfB:0,split:false},
  A:{key:'A',bs0:-680e3,bs1:750e3,bw0:-320e3,bw1:410e3,zex:10,depth:26e3,wfA:0,wfB:0,split:false},
  B:{key:'B',bs0:-46e3,bs1:70e3,bw0:-40e3,bw1:40e3,zex:4,depth:25e3,wfA:0,wfB:0.02,split:true},
  C:{key:'C',bs0:-950,bs1:950,bw0:-570,bw1:570,zex:1.3,depth:230,wfA:9,wfB:0,split:true}
};
for(const k in SCL){ const S=SCL[k]; S.len=S.bs1-S.bs0; S.k=24/S.len; S.sc=(S.bs0+S.bs1)/2; S.wc=(S.bw0+S.bw1)/2; S.wf=s=>S.wfA+S.wfB*s;
  const n=Math.hypot(1,S.wfB); S.tan=[1/n,S.wfB/n]; }
const RUP_SEC=SCL.B.len/RUP_V;         // so lange braucht der Bruch durch den ganzen Ausschnitt (≈ 39 s)
const B_HYP_S=SCL.B.bs0;               // der Bruch beginnt am vorderen (südöstlichen) Rand des Ausschnitts
const HYP_DEPTH=10000;

/* Erdbeben am Wallace Creek seit 3.700 Jahren. Die Zeitpunkte vor 1857 sind nicht überliefert: Sie sind hier unregelmäßig,
   aber so gewählt, dass die mittlere Wiederkehrzeit (rund 150 Jahre) und der gesamte Versatz (130 m) stimmen.
   Jedes Beben holt den ganzen bis dahin aufgestauten Rückstand nach. */
const QUAKES=(()=>{ const N=24, first=Y0+34, span=LASTQ-first; const wts=[]; let sum=0;
  for(let i=0;i<N-1;i++){ const h=Math.sin(i*12.9898+4.1)*43758.5453; const r=h-Math.floor(h); const w=0.55+0.9*r; wts.push(w); sum+=w; }
  const F0=S_TOT-RATE*(LASTQ-Y0); const far=T=>F0+RATE*(T-Y0);
  const q=[]; let T=first, prev=0;
  for(let i=0;i<N;i++){ const S=far(T); q.push({T,S,slip:S-prev,n:i+1}); prev=S; if(i<N-1) T+=span*wts[i]/sum; }
  q[N-1].T=LASTQ; q[N-1].S=S_TOT; q[N-1].slip=S_TOT-q[N-2].S; q.F0=F0; return q; })();
const farC=T=>QUAKES.F0+RATE*(T-Y0);                      // Weg der Platten weit entfernt (m) seit Beginn
function slipC(T){ let S=0; for(const q of QUAKES){ if(T>=q.T) S=q.S; else break; } return S; }
function quakeCountC(T){ let n=0; for(const q of QUAKES){ if(T>=q.T) n++; else break; } return n; }
const C_HOLD=3.0;                                          // am Ende von Phase 4 bleibt „heute“ kurz stehen
const yearC=t=>lerp(Y0,0,clamp((t-T3)/(T4-T3-C_HOLD),0,1));

/* Zustand zu einem Zeitpunkt t.  mode: 'lock' (verhakt, wie in Wirklichkeit) oder 'creep' (gleitet gleichmäßig – Vergleich) */
function stateAt(t,mode){
  const ph=phaseAt(t), creep=mode==='creep';
  const o={ph,scale:t<TG?'G':scaleOfPhase(ph),creep,year:0,sec:-1,F:0,S0:0,S1:0,front:-1e9,T:0,nQ:0,quakeNow:false};
  if(ph===2){ o.year=(t-T1)/(T2-T1)*CYCLE_Y; o.F=RATE*o.year; o.S0=o.S1=creep?o.F:0; o.front=1e9; }
  else if(ph===3){ const u=(t-T2)/(T3-T2);
    /* zwei Erdbeben: Beben 1 · Spannung baut sich wieder auf (150 Jahre) · Beben 2 */
    const Q1=0.36, R2=0.62, QW=0.24, QD=0.2, quake=(v,base)=>{ o.sec=v<QW?-1:Math.min(1,(v-QW)/QD)*RUP_SEC*1.25; o.wsec=v<QW?-1:(v-QW)/QD*RUP_SEC*1.25; o.S0=base; o.S1=base+F_CYCLE; o.front=v<QW?-1e9:B_HYP_S+RUP_V*o.sec; o.quakeNow=v>=QW&&v<0.62; o.after=v>=0.62; o.hold=v<QW; };
    if(creep){ const y=u*1.2*CYCLE_Y; o.year=CYCLE_Y+y; o.F=RATE*o.year; o.S0=o.S1=o.F; o.front=1e9; o.stage=u<Q1?1:(u<R2?2:3); }
    else if(u<Q1){ o.stage=1; o.year=CYCLE_Y; o.F=F_CYCLE; quake(u/Q1,0); }
    else if(u<R2){ o.stage=2; const v=(u-Q1)/(R2-Q1); o.year=CYCLE_Y+v*CYCLE_Y; o.F=F_CYCLE+RATE*v*CYCLE_Y; o.S0=o.S1=F_CYCLE; o.front=-1e9; o.n2=true; }
    else { o.stage=3; o.year=2*CYCLE_Y; o.F=2*F_CYCLE; quake((u-R2)/(1-R2),F_CYCLE); o.n2=true; } }
  else if(ph===4){ o.T=yearC(t); o.F=creep?S_TOT*(o.T-Y0)/(0-Y0):farC(o.T); o.S0=o.S1=creep?o.F:slipC(o.T); o.nQ=creep?0:quakeCountC(o.T); o.front=1e9; }
  o.S=o.S1; o.deficit=Math.max(0,o.F-(ph===3&&!creep?(o.front>-1e8?lerp(o.S0,o.S1,clamp((o.front-B_HYP_S)/SCL.B.len,0,1)):o.S0):o.S1));
  return o;
}

/* Verschiebung eines Punkts entlang der Verwerfung (m, positiv nach Nordwesten).
   d: Abstand von der Verwerfung (m, positiv = Nordamerikanische Platte), depth: Tiefe (m), F: Weg der Platten weit entfernt, S: Versatz an der Verwerfung.
   Solange die Verwerfung bis in die Tiefe LOCKD verhakt ist, verteilt sich die Bewegung wie arctan(d/LOCKD) (Savage & Burford 1973).
   Beim Erdbeben holt die Umgebung der Verwerfung den Rückstand nach (elastischer Rückprall, Reid 1910). */
function dispU(d,depth,F,S){ const Le=Math.max(LOCKD-depth,1), a=Math.atan2(Math.abs(d),Le)*(2/Math.PI), sg=d>=0?1:-1; return -sg*(0.5*F*a+0.5*S*(1-a)); }
function slipLocalB(st,s){ const k=sstep(0,RISE_B,st.front-s); return lerp(st.S0,st.S1,k); }
const RISE_B=5000;                                         // m: Breite der Bruchfront im Regionalmodell (zur Darstellung)

if(typeof module!=='undefined') module.exports={TG,stateAt,dispU,QUAKES,farC,slipC,yearC,SCL,T0,T1,T2,T3,T4,RATE,F_CYCLE,S_TOT,Y0,LASTQ,RUP_SEC};
