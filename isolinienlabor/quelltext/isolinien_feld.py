import numpy as np, base64, os
from scipy import ndimage as nd
N=281; E=9000.0; CELL=E/(N-1)
H=np.frombuffer(base64.b64decode(open('mh.b64').read()),'<u2').astype(np.float64).reshape(N,N)/10
gy,gx=np.gradient(H,CELL); SL=np.degrees(np.arctan(np.hypot(gx,gy)))
soft=nd.gaussian_filter(H,2.6,mode='nearest'); light=nd.gaussian_filter(H,1.2,mode='nearest')
t=np.clip((SL-8)/24,0,1); w=t*t*(3-2*t); HC=soft+(light-soft)*w
print('HC max',HC.max())
F=2; NF=(N-1)*F+1
c=np.linspace(0,N-1,NF); J,I=np.meshgrid(c,c,indexing='ij')
HF=nd.map_coordinates(HC,[J,I],order=3,mode='nearest')
HR=nd.map_coordinates(H,[J,I],order=1,mode='nearest')
CF=E/(NF-1); minc=int(0.05e6/(CF*CF))
def specks(HF,step=50,maxex=22):
    tot=0
    for L in np.arange(np.ceil(HF.min()/step)*step, HF.max(), step):
        for above in (True,False):
            m = HF>=L if above else HF<L
            lab,n=nd.label(m)
            if n==0: continue
            idx=np.arange(1,n+1)
            sizes=nd.sum(np.ones_like(lab),lab,index=idx)
            ex = nd.maximum(HF-L,lab,index=idx) if above else nd.maximum(L-HF,lab,index=idx)
            exr = nd.maximum(HR-L,lab,index=idx) if above else nd.maximum(L-HR,lab,index=idx)
            border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))
            for k,s,e,er in zip(idx,sizes,ex,exr):
                if s<minc and e<maxex and er<45 and k not in border:
                    HF[lab==k] = (L-0.3) if above else (L+0.3); tot+=1
    return tot
for it in range(4):
    n=specks(HF); print('removed',n)
    if n==0: break
# report remaining small closed loops at 50 m
def report(step=50):
    small=0
    for L in np.arange(np.ceil(HF.min()/step)*step, HF.max(), step):
        for m in (HF>=L, HF<L):
            lab,n=nd.label(m); 
            if n==0: continue
            sizes=nd.sum(np.ones_like(lab),lab,index=np.arange(1,n+1))
            border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))
            small+=sum(1 for k,s in enumerate(sizes,1) if s<minc and k not in border)
    return small
print('remaining small loops (real peaks/pits)',report())
print('HF min',HF.min(),'max',HF.max())
d=np.round(HF*10).astype('<u2'); open('hf.b64','w').write(base64.b64encode(d.tobytes()).decode())
print('b64 KB',os.path.getsize('hf.b64')//1024)
np.save('hf.npy',HF)
