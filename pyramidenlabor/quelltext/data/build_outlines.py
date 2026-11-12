#!/usr/bin/env python3
# Landesumrisse für die Menschenmenge (Station 1): Natural Earth (public domain), Luxemburg 1:10 Mio., übrige Länder 1:50 Mio.
import json, math, os
SCR='/tmp/claude-0/-home-claude/f4f4a120-86eb-5e74-b413-6eb290523a98/scratchpad/dl/ne/'
A3={'LU':'LUX','DE':'DEU','FR':'FRA','IT':'ITA','RU':'RUS','US':'USA','BR':'BRA','CN':'CHN','JP':'JPN','KR':'KOR','IN':'IND','EG':'EGY','NG':'NGA','NE':'NER','QA':'QAT'}
def load(f): return {ft['properties']['ADM0_A3']:ft['geometry'] for ft in json.load(open(SCR+f))['features']}
hi=load('ne_10m_admin_0_countries.geojson'); lo=load('ne_50m_admin_0_countries.geojson')
def area(r): return abs(sum(r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1] for i in range(len(r)-1)))/2
def dp(pts,tol):   # Douglas-Peucker
    if len(pts)<3: return pts
    keep=[False]*len(pts); keep[0]=keep[-1]=True; st=[(0,len(pts)-1)]
    while st:
        a,b=st.pop(); ax,ay=pts[a]; bx,by=pts[b]; dx,dy=bx-ax,by-ay; L=math.hypot(dx,dy) or 1e-12; md=0; mi=-1
        for i in range(a+1,b):
            d=abs((pts[i][0]-ax)*dy-(pts[i][1]-ay)*dx)/L
            if d>md: md=d; mi=i
        if md>tol and mi>0: keep[mi]=True; st+= [(a,mi),(mi,b)]
    return [p for p,k in zip(pts,keep) if k]
out={}
for cid,a3 in A3.items():
    g=(hi if cid in('LU','QA') else lo)[a3]; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    rings=[p[0] for p in polys]
    if cid=='RU': rings=[[[x+360 if x<0 else x,y] for x,y in r] for r in rings]
    lat0=sum(y for r in rings for x,y in r)/sum(len(r) for r in rings); k=math.cos(math.radians(lat0))
    rings=[[[x*k,y] for x,y in r] for r in rings]; rings.sort(key=area,reverse=True)
    main=rings[0]; xs=[p[0] for p in main]; ys=[p[1] for p in main]; w=max(xs)-min(xs); h=max(ys)-min(ys); cx=(max(xs)+min(xs))/2; cy=(max(ys)+min(ys))/2
    sel=[main]
    for r in rings[1:]:
        if area(r)<.01*area(main): break
        rx=sum(p[0] for p in r)/len(r); ry=sum(p[1] for p in r)/len(r)
        if abs(rx-cx)<w*.85 and abs(ry-cy)<h*.85: sel.append(r)
    xs=[p[0] for r in sel for p in r]; ys=[p[1] for r in sel for p in r]; x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys); s=1000/max(x1-x0,y1-y0)
    res=[]
    for r in sel:
        q=[[(x-(x0+x1)/2)*s,(y-(y0+y1)/2)*s] for x,y in r]; tol=.4
        far=max(range(len(q)),key=lambda i:(q[i][0]-q[0][0])**2+(q[i][1]-q[0][1])**2)   # geschlossener Ring: in zwei Hälften vereinfachen
        while True:
            d=dp(q[:far+1],tol)[:-1]+dp(q[far:],tol)
            if len(d)<=(260 if r is main else 90): break
            tol*=1.4
        res.append([[round(x),round(y)] for x,y in d])
    out[cid]=res; print(cid,[len(r) for r in res],'Breite/Höhe %.2f'%((x1-x0)/(y1-y0)))
json.dump(out,open(os.path.dirname(os.path.abspath(__file__))+'/../assets/outlines.json','w'),separators=(',',':'))
print('outlines.json %.1f KB'%(os.path.getsize(os.path.dirname(os.path.abspath(__file__))+'/../assets/outlines.json')/1e3))
