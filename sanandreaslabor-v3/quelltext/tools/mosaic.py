import json,sys,os,numpy as np
from scipy import ndimage as ndi
sys.path.insert(0,'/home/claude/sa2/tools')
from PIL import Image
import plan as P
D='/home/claude/sa2/data/'
cap=json.load(open(D+'captures.json'))
pl=P.build()
def img(p): return np.asarray(Image.open(cap['|'.join((p['host'],p['bbox'],p['size'],p['k']))]).convert('RGB'))
def bb(p): return [float(v) for v in p['bbox'].split(',')]
def mosaic_rgb(prefix,mpp):
    ps=[p for p in pl if p['id'].startswith(prefix)]
    x0=min(bb(p)[0] for p in ps); y1=max(bb(p)[3] for p in ps); x1=max(bb(p)[2] for p in ps); y0=min(bb(p)[1] for p in ps)
    W=int(round((x1-x0)/mpp)); H=int(round((y1-y0)/mpp)); out=np.zeros((H,W,3),np.uint8); m=np.zeros((H,W),bool)
    for p in ps:
        b=bb(p); a=img(p); c=int(round((b[0]-x0)/mpp)); r=int(round((y1-b[3])/mpp)); out[r:r+a.shape[0],c:c+a.shape[1]]=a; m[r:r+a.shape[0],c:c+a.shape[1]]=True
    return out,m,(x0,y1,mpp)
def mosaic_dem(prefix,mpp):
    ps=[p for p in pl if p['id'].startswith(prefix) and p['id'] not in('RDc','ADc')]
    groups={}
    for p in ps: groups.setdefault(p['bbox'],[]).append(p)
    x0=min(bb(p)[0] for p in ps); y1=max(bb(p)[3] for p in ps); x1=max(bb(p)[2] for p in ps); y0=min(bb(p)[1] for p in ps)
    W=int(round((x1-x0)/mpp)); H=int(round((y1-y0)/mpp)); out=np.full((H,W),np.nan,np.float32)
    for k,g in groups.items():
        g.sort(key=lambda p:p['lo']); b=bb(g[0])
        for q,r in zip(g[:-1],g[1:]): assert q['hi']==r['lo'],(q['id'],r['id'])
        e=np.full(img(g[0]).shape[:2],float(g[0]['lo']),np.float32)
        arrs=[]
        for p in g:
            a=img(p); assert (a[...,0]==a[...,1]).all() and (a[...,1]==a[...,2]).all(), p['id']
            arrs.append(a[...,0].copy())
        nod=np.zeros(arrs[0].shape,bool)
        for i in range(len(arrs)-1):
            nod|=(arrs[i+1]>0)&(arrs[i]<200)          # keine Daten: grauer Hintergrund in allen Bändern
        for i,a in enumerate(arrs):
            T=(a==255); Dz=ndi.binary_dilation(T,iterations=6)&~T
            cl=ndi.grey_closing(a,size=(7,7)); a[Dz]=cl[Dz]
            if i+1<len(arrs): a[(arrs[i+1]>0)&~nod]=255
            e+=a.astype(np.float32)/255.0*(g[i]['hi']-g[i]['lo'])
        e[nod]=0
        lowsat=(img(g[0])[...,0]==0).mean(); hisat=(img(g[-1])[...,0]==255).mean()
        print(k, [p['lo'] for p in g], 'min %.1f max %.1f  lowsat %.4f hisat %.4f'%(e.min(),e.max(),lowsat,hisat))
        c=int(round((b[0]-x0)/mpp)); r=int(round((y1-b[3])/mpp)); out[r:r+e.shape[0],c:c+e.shape[1]]=e
    return out,(x0,y1,mpp)
if __name__=='__main__':
    dl,gl=mosaic_dem('LD_',1.0); np.save(D+'dem_loc.npy',dl); json.dump(gl,open(D+'dem_loc.json','w'))
    il,ml,g=mosaic_rgb('LB_',1.0); Image.fromarray(il).save(D+'img_loc.png'); json.dump(g,open(D+'img_loc.json','w'))
    ir,mr,g=mosaic_rgb('RI_',100.0); Image.fromarray(ir).save(D+'img_reg.png'); json.dump(g,open(D+'img_reg.json','w'))
    ia,ma,g=mosaic_rgb('AI_',900.0); Image.fromarray(ia).save(D+'img_cal.png'); json.dump(g,open(D+'img_cal.json','w'))
    dr,g=mosaic_dem('RD',290.0); np.save(D+'dem_reg.npy',dr); json.dump(g,open(D+'dem_reg.json','w'))
    ad=img([p for p in pl if p['id']=='ADc'][0])[...,0]; print('ADc Ecke',ad[5,5],ad[300,20]); da=np.where(ad==ad[5,5],0,ad).astype(np.float32)/255*4420; np.save(D+'dem_cal.npy',da); json.dump((-772025,4744855,2470.0),open(D+'dem_cal.json','w'))
    print(il.shape, ir.shape, ia.shape, dl.shape)
