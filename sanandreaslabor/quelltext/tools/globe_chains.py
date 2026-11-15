"""Plattengrenzen für die Erdkugel: Teilstücke zu Ketten verbinden, kurze Stücke dem Nachbarn zuschlagen, glätten."""
import json,numpy as np
O='/home/claude/sa2/data/v21/'
import os
if not os.path.exists(O+'globe_src.json'): json.dump(json.load(open(O+'globe.json')),open(O+'globe_src.json','w'))
g=json.load(open(O+'globe_src.json'))
segs=[]
for l in g['b']:
    p=np.array(l[1:]).reshape(-1,2)
    if len(p)>=2: segs.append([l[0],p])
def v3(p): lo,la=np.radians(p[:,0]),np.radians(p[:,1]); return np.stack([np.cos(la)*np.cos(lo),np.cos(la)*np.sin(lo),np.sin(la)],1)
def ll(v): v=v/np.linalg.norm(v,axis=1,keepdims=True); return np.stack([np.degrees(np.arctan2(v[:,1],v[:,0])),np.degrees(np.arcsin(np.clip(v[:,2],-1,1)))],1)
key=lambda q:(round(float(q[0])*20)%7200,round(float(q[1])*20))
from collections import defaultdict
nodes=defaultdict(list)
for i,(k,p) in enumerate(segs): nodes[key(p[0])].append((i,0)); nodes[key(p[-1])].append((i,1))
used=set(); chains=[]
def walk(i,end):
    out=[]; cur=(i,end)
    while True:
        j,e=cur; nb=[x for x in nodes[key(segs[j][1][-1] if e==1 else segs[j][1][0])] if x[0]!=j and x[0] not in used]
        if len(nodes[key(segs[j][1][-1] if e==1 else segs[j][1][0])])!=2 or not nb: return out
        n,ne=nb[0]; used.add(n); p=segs[n][1] if ne==0 else segs[n][1][::-1]; out.append((segs[n][0],p)); cur=(n,1 if ne==0 else 0)
for i in range(len(segs)):
    if i in used: continue
    used.add(i); fwd=walk(i,1); bwd=walk(i,0)
    # rückwärts gefundene Teile umdrehen und davor setzen
    ch=[(k,p[::-1]) for k,p in bwd[::-1]]+[(segs[i][0],segs[i][1])]+fwd
    chains.append(ch)
def seglen(p): v=v3(p); return float(np.sum(np.arccos(np.clip(np.sum(v[1:]*v[:-1],1),-1,1))))*6371
out=[]
for ch in chains:
    ch=[[k,p] for k,p in ch]
    for _ in range(2):
        for i,(k,p) in enumerate(ch):
            if seglen(p)>=110: continue
            a=ch[i-1] if i>0 else None; b=ch[i+1] if i+1<len(ch) else None
            n=(a if seglen(a[1])>=seglen(b[1]) else b) if a and b else (a or b)
            if n: ch[i][0]=n[0]
    # gleichmäßig abtasten (~25 km) mit Art
    P=[];K=[]
    for k,p in ch:
        v=v3(p)
        for s in range(len(v)-1):
            a,b=v[s],v[s+1]; ang=np.arccos(np.clip(a@b,-1,1)); n=max(1,int(np.ceil(ang*6371/25)))
            for j in range(n if (s<len(v)-2 or True) else n):
                if P and j==0: continue
                t=j/n; P.append(a*(1-t)+b*t); K.append(k)
        P.append(v[-1]); K.append(k)
    P=np.array(P)
    if len(P)<2: continue
    closed=np.linalg.norm(P[0]-P[-1])<1e-3
    for _ in range(5):
        Q=P.copy()
        for i in range(1,len(P)-1):
            r=min(4,i,len(P)-1-i); w=1-np.abs(np.arange(-r,r+1))/(r+1); Q[i]=(P[i-r:i+r+1]*w[:,None]).sum(0)/w.sum()
        P=Q
    L=ll(P)
    out.append([''.join(str(k) for k in K)]+[round(float(x),3) for x in L.ravel()])
g['c']=out; g.pop('b',None)
cur=json.load(open(O+'globe.json')); g.update({k:v for k,v in cur.items() if k not in ('b','c')})
json.dump(g,open(O+'globe.json','w'),separators=(',',':'))
print(len(segs),'Stücke ->',len(out),'Ketten')
