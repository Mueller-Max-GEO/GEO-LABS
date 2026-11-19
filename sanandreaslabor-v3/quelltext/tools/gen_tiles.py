import json, sys, numpy as np
sys.path.insert(0,'/home/claude/sa2/tools')
from frame import *
from urls import *
def rect_bbox(s0,s1,w0,w1,pad=0):
    pts=np.array([en(s,w) for s in (s0,s1) for w in (w0,w1)])
    return pts[:,0].min()-pad, pts[:,1].min()-pad, pts[:,0].max()+pad, pts[:,1].max()+pad
def tiles(rect, mpp, tw, th, pad):
    s0,s1,w0,w1=rect
    x0,y0,x1,y1=rect_bbox(*rect,pad=pad)
    x0=np.floor(x0/mpp)*mpp; y1=np.ceil(y1/mpp)*mpp
    out=[]; j=0
    while y1-j*th*mpp>y0:
        i=0
        while x0+i*tw*mpp<x1:
            b=(x0+i*tw*mpp, y1-(j+1)*th*mpp, x0+(i+1)*tw*mpp, y1-j*th*mpp)
            cs=np.array([[(np.array([e,n])-C)@U,(np.array([e,n])-C)@V] for e in (b[0],b[2]) for n in (b[1],b[3])])
            if not (cs[:,0].max()<s0-pad or cs[:,0].min()>s1+pad or cs[:,1].max()<w0-pad or cs[:,1].min()>w1+pad):
                out.append((i,j,tuple(round(v,3) for v in b)))
            i+=1
        j+=1
    return out
LOC=(-1000,1000,-600,600); REG=(-70e3,70e3,-45e3,45e3); CAL=(-560e3,740e3,-330e3,420e3)
if __name__=='__main__':
    plan=[]
    for (i,j,b) in tiles(LOC,0.6,560,420,6): plan.append(dict(id=f'LN_{i}_{j}',layer='LN',bbox=b,size=(560,420),url=naip(b,(560,420))))
    for (i,j,b) in tiles(REG,100,560,420,500): plan.append(dict(id=f'RI_{i}_{j}',layer='RI',bbox=b,size=(560,420),url=base(b,(560,420))))
    for (i,j,b) in tiles(CAL,600,560,420,3000): plan.append(dict(id=f'AI_{i}_{j}',layer='AI',bbox=b,size=(560,420),url=base(b,(560,420))))
    # coarse DEM overviews
    b=rect_bbox(*REG,pad=2000); plan.append(dict(id='RD_coarse',layer='RDc',bbox=b,size=(800,600),url=dem(tuple(round(v) for v in b),0,2550)))
    b=rect_bbox(*CAL,pad=5000); plan.append(dict(id='AD_coarse',layer='ADc',bbox=b,size=(800,600),url=dem(tuple(round(v) for v in b),0,4420)))
    json.dump(plan,open('/home/claude/sa2/data/plan1.json','w'),indent=0)
    from collections import Counter; print(Counter(p['layer'] for p in plan))
    for p in plan[:2]+plan[-2:]: print(p['id'],p['url'])
