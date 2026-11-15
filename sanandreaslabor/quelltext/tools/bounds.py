"""Plattengrenzen (PB2002, Bird 2003) im Koordinatensystem der Verwerfung, gruppiert nach Art."""
import json,sys,numpy as np
sys.path.insert(0,'/home/claude/sa2/tools')
from frame import sw
D='/home/claude/sa2/data/'
R=(-2100e3,2100e3,-800e3,1200e3)
st=json.load(open(D+'PB2002_steps.json'))['features']
KIND={'SUB':'sub','OSR':'ridge','CRB':'ridge','OTF':'tf','CTF':'tf','OCB':'conv','CCB':'conv'}
segs=[]; cur=None
for f in st:
    p=f['properties']; c=f['geometry']['coordinates']
    a=sw(*c[0]); b=sw(*c[-1])
    inside=all(R[0]<x[0]<R[1] and R[2]<x[1]<R[3] for x in (a,b))
    k=KIND.get(p['STEPCLASS'],'other'); pb=p['PLATEBOUND']
    if not inside: cur=None; continue
    if cur and cur['k']==k and cur['pb']==pb and np.hypot(cur['pts'][-1][0]-a[0],cur['pts'][-1][1]-a[1])<5e3: cur['pts'].append(b); cur['v'].append(p['VELOCITYLE'])
    else: cur=dict(k=k,pb=pb,pts=[a,b],v=[p['VELOCITYLE']]); segs.append(cur)
from collections import Counter
print(Counter((s['pb'],s['k']) for s in segs))
out=[]
for s in segs:
    pts=np.array(s['pts'])
    if len(pts)<2: continue
    out.append(dict(k=s['k'],pb=s['pb'],v=round(float(np.mean(s['v'])),1),p=[[round(x/1000,1),round(y/1000,1)] for x,y in pts]))
json.dump(out,open(D+'bounds_w.json','w'))
for o in out:
    if o['pb'] in ('NA-PA','PA-NA','JF\\NA','NA/JF','PA-JF','JF-PA','RI-PA','PA-RI') or 'JF' in o['pb'] or 'RI' in o['pb'] or 'CO' in o['pb']:
        print(o['pb'],o['k'],o['v'],len(o['p']),o['p'][0],o['p'][-1])
