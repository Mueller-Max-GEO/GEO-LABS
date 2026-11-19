"""Setzt die Kacheln von Version 2.1 zusammen (Luftbilder und Höhenbänder) und entzerrt sie ins Koordinatensystem der Verwerfung."""
import json,sys,numpy as np
from scipy import ndimage as ndi
from PIL import Image
sys.path.insert(0,'/home/claude/sa2/tools')
import plan2 as P
from warp import warp
D='/home/claude/sa2/data/'; O=D+'v21/'
cap=json.load(open(D+'captures2.json')); pl=json.load(open(D+'plan2.json'))
def img(p): return np.asarray(Image.open(cap[P.key(p)]).convert('RGB'))
def bb(p): return [float(v) for v in p['bbox'].split(',')]
def frame(ps,mpp):
    x0=min(bb(p)[0] for p in ps); y1=max(bb(p)[3] for p in ps); x1=max(bb(p)[2] for p in ps); y0=min(bb(p)[1] for p in ps)
    return x0,y0,x1,y1,int(round((x1-x0)/mpp)),int(round((y1-y0)/mpp))
def mosaic_rgb(layer,balance=False,band=24):
    ps=[p for p in pl if p['layer']==layer]; mpp=ps[0]['mpp']; x0,y0,x1,y1,W,H=frame(ps,mpp)
    out=np.zeros((H,W,3),np.float32); pos={}; arrs={}
    for p in ps:
        b=bb(p); c=int(round((b[0]-x0)/mpp)); r=int(round((y1-b[3])/mpp)); pos[p['id']]=(r,c); arrs[p['id']]=img(p).astype(np.float32)
    if balance:   # Helligkeitsunterschiede zwischen Aufnahmen ausgleichen: je Kachel ein Faktor pro Farbkanal (kleinste Quadrate an den Kanten)
        ids=list(arrs); ix={k:i for i,k in enumerate(ids)}; rows=[]; rhs=[]
        def m(a): ok=(a<245).all(-1)&(a>8).all(-1); return np.log(a[ok].mean(0)+1) if ok.mean()>0.3 else None
        for k in ids:
            r,c=pos[k]
            for k2 in ids:
                r2,c2=pos[k2]
                if r2==r and c2==c+800: A=m(arrs[k][:,-band:]); B=m(arrs[k2][:,:band])
                elif c2==c and r2==r+600: A=m(arrs[k][-band:]); B=m(arrs[k2][:band])
                else: continue
                if A is None or B is None: continue
                row=np.zeros(len(ids)); row[ix[k]]=1; row[ix[k2]]=-1; rows.append(row); rhs.append(B-A)
        row=np.ones(len(ids))/len(ids); rows.append(row*10); rhs.append(np.zeros(3))
        g=np.linalg.lstsq(np.array(rows),np.array(rhs),rcond=None)[0]
        print(layer,'Ausgleich: Faktoren',np.round(np.exp(g).min(0),3),np.round(np.exp(g).max(0),3))
        for k in ids: arrs[k]=arrs[k]*np.exp(g[ix[k]])[None,None]
    for k,a in arrs.items():
        r,c=pos[k]; out[r:r+600,c:c+800]=a[:H-r,:W-c]
    return np.clip(out,0,255),(x0,y1,mpp)
def mosaic_dem(layer,nodata=False):
    ps=[p for p in pl if p['layer']==layer]; mpp=ps[0]['mpp']; x0,y0,x1,y1,W,H=frame(ps,mpp)
    groups={}
    for p in ps: groups.setdefault(p['bbox'],[]).append(p)
    out=np.full((H,W),np.nan,np.float32)
    for k,g in groups.items():
        g.sort(key=lambda p:p['lo']); b=bb(g[0])
        arrs=[img(p)[...,0].copy() for p in g]
        e=np.full(arrs[0].shape,float(g[0]['lo']),np.float32); nod=np.zeros(arrs[0].shape,bool)
        if nodata:
            for i in range(len(arrs)-1): nod|=(arrs[i+1]>0)&(arrs[i]<200)
        for i,a in enumerate(arrs):
            T=(a==255); Dz=ndi.binary_dilation(T,iterations=4)&~T
            cl=ndi.grey_closing(a,size=(5,5)); a[Dz]=cl[Dz]
            if i+1<len(arrs): a[(arrs[i+1]>0)&~nod]=255
            e+=a.astype(np.float32)/255.0*(g[i]['hi']-g[i]['lo'])
        if nodata: e[nod]=0
        c=int(round((b[0]-x0)/mpp)); r=int(round((y1-b[3])/mpp)); out[r:r+600,c:c+800]=e[:H-r,:W-c]
    print(layer,'nan %.4f'%np.isnan(out).mean(),'min %.0f max %.0f'%(np.nanmin(out),np.nanmax(out)))
    return np.where(np.isnan(out),0,out),(x0,y1,mpp)
R=P.RECT
if __name__=='__main__':
    # W: Westen Nordamerikas (nur Gelände + Meeresboden), 3 km
    d,g=mosaic_dem('Wd'); W=warp(d,g,*R['W'],3000.0); np.save(O+'W_dem.npy',W)
    # A: Kalifornien, Bild 360 m, Gelände 900 m
    a,g=mosaic_rgb('Ai'); AI=warp(a.astype(np.float32),g,*R['A'],360.0); Image.fromarray(np.clip(AI,0,255).astype(np.uint8)).save(O+'A_img.png')
    d,g=mosaic_dem('Ad'); A=warp(d,g,*R['A'],900.0); np.save(O+'A_dem.npy',A)
    # B: Carrizo-Ebene, Bild 30 m, Gelände 90 m
    a,g=mosaic_rgb('Bi',balance=True); BI=warp(a.astype(np.float32),g,*R['B'],30.0); Image.fromarray(np.clip(BI,0,255).astype(np.uint8)).save(O+'B_img.png')
    d,g=mosaic_dem('Bd',nodata=True); B=warp(d,g,*R['B'],90.0); np.save(O+'B_dem.npy',B)
    # C: Wallace Creek, Bild 0,5 m
    a,g=mosaic_rgb('Ci',balance=True); CI=warp(a.astype(np.float32),g,*R['C'],0.5); Image.fromarray(np.clip(CI,0,255).astype(np.uint8)).save(O+'C_img.png')
    for n,x in [('W',W),('A',A),('B',B)]: print(n,x.shape,x.min(),x.max())
    print(AI.shape,BI.shape,CI.shape)
