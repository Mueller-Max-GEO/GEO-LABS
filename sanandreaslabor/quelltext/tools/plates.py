"""Rasterkarte der Platten (PB2002) für die Übersicht W: 0 = keine, 1 PA, 2 NA, 3 JF, 4 RI, 5 CO."""
import json,sys,numpy as np
from matplotlib.path import Path
sys.path.insert(0,'/home/claude/sa2/tools')
from frame import C,U,V,TI
import plan2 as P
D='/home/claude/sa2/data/'
s0,s1,w0,w1=P.RECT['W']; res=6000.0
ns=int((s1-s0)/res); nw=int((w1-w0)/res)
S=s0+(np.arange(ns)+0.5)*res; Wv=w0+(np.arange(nw)+0.5)*res; SS,WW=np.meshgrid(S,Wv)
E=C[0]+SS*U[0]+WW*V[0]; N=C[1]+SS*U[1]+WW*V[1]
lon,lat=TI.transform(E.ravel(),N.ravel()); pts=np.stack([lon,lat],-1)
codes={'PA':1,'NA':2,'JF':3,'RI':4,'CO':5}
out=np.zeros(len(pts),np.uint8)
for f in json.load(open(D+'PB2002_plates.json'))['features']:
    c=f['properties']['Code']
    if c not in codes: continue
    g=f['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    for poly in polys:
        ring=np.array(poly[0])
        if ring[:,0].max()-ring[:,0].min()>300: ring[:,0]=np.where(ring[:,0]>0,ring[:,0]-360,ring[:,0])
        m=Path(ring).contains_points(pts); out[m&(out==0)]=codes[c]
out=out.reshape(nw,ns)
from collections import Counter; print(Counter(out.ravel().tolist()))
np.save(D+'v21/W_plates.npy',out)
from PIL import Image
pal=np.array([[0,0,0],[60,90,200],[220,160,60],[60,180,90],[220,80,160],[200,60,60]],np.uint8)
Image.fromarray(pal[out][::-1]).resize((ns*2,nw*2),Image.NEAREST).save('/tmp/claude-0/plates.png')
