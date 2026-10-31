import numpy as np
from scipy import ndimage as ndi
from PIL import Image
b=np.load('base.npz'); z=b['z100']; hef=b['hef']; inv=np.load('inv.npz'); Hm=inv['H']; dx=125.0
mask=(Hm>5)|hef
mask=ndi.binary_opening(mask,iterations=1)|hef
lab,n=ndi.label(mask); sizes=ndi.sum(mask,lab,range(1,n+1))
mask=np.isin(lab,1+np.where(sizes>=4)[0])
lab,n=ndi.label(mask)
# surface slope smoothed (~ several ice thicknesses)
zs=ndi.gaussian_filter(z,1.6)
gy,gx=np.gradient(zs,dx); sina=np.sin(np.arctan(np.hypot(gx,gy)))
sina=np.maximum(sina,0.06)
H=np.zeros_like(z)
for k in range(1,n+1):
    m=lab==k
    dz=(z[m].max()-z[m].min())/1000.0
    tau=(0.005+1.598*dz-0.435*dz**2)*1e5 if dz<1.6 else 1.5e5
    tau=max(tau,0.3e5)
    H[m]=tau/(0.8*900*9.81*sina[m])
# taper towards margins (parabolic edge)
# ice divides: drainage basins of the (filled, smoothed) surface; ice is thin at divides
import heapq
zf=ndi.gaussian_filter(z,1.0).copy(); nyy,nxx=zf.shape; done=np.zeros(zf.shape,bool); hq=[]
for j in range(nyy):
    for i in range(nxx):
        if j in (0,nyy-1) or i in (0,nxx-1): heapq.heappush(hq,(zf[j,i],j,i)); done[j,i]=True
while hq:
    v,j,i=heapq.heappop(hq)
    for dj,di in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
        jj,ii=j+dj,i+di
        if 0<=jj<nyy and 0<=ii<nxx and not done[jj,ii]:
            done[jj,ii]=True; zf[jj,ii]=max(zf[jj,ii],v+1e-3); heapq.heappush(hq,(zf[jj,ii],jj,ii))
rec=-np.ones(zf.size,int); bestv=np.zeros(zf.size); flat=zf.ravel()
JJ,II=np.divmod(np.arange(zf.size),nxx)
for dj,di in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
    jj=JJ+dj; ii=II+di; ok=(jj>=0)&(jj<nyy)&(ii>=0)&(ii<nxx); k=np.where(ok,jj*nxx+ii,0)
    sl_=np.where(ok,(flat-flat[k])/np.hypot(dj,di),-1); m_=sl_>bestv; bestv[m_]=sl_[m_]; rec[m_]=k[m_]
mflat=mask.ravel(); basin=-np.ones(zf.size,int)
order_=np.argsort(flat)            # low to high: receivers are processed first
for k in order_:
    r_=rec[k]
    basin[k]=k if r_<0 else basin[r_]
basin=basin.reshape(zf.shape)
div=np.zeros_like(mask)
for dj,di in ((1,0),(0,1)):
    a_=mask[:nyy-dj,:nxx-di]&mask[dj:,di:]&(basin[:nyy-dj,:nxx-di]!=basin[dj:,di:])
    div[:nyy-dj,:nxx-di]|=a_; div[dj:,di:]|=a_
print('divide cells',div.sum(),'basins',len(np.unique(basin[mask])))
np.save('divides.npy',div)
dist=ndi.distance_transform_edt(mask&~div)*dx-dx/2
H=np.minimum(H, (35+0.9*np.maximum(dist,0))*np.where(mask,1,0))
H=np.where(div,np.minimum(H,25),H)
H=ndi.gaussian_filter(H,0.8)*mask
H=np.where(mask,np.maximum(H,8),0)
Bb=z-H
print('glaciers',n,'area',mask.sum()*0.015625,'HEF meanH',H[hef].mean(),'maxH',H[hef].max(),'HEF vol km3',H[hef].sum()*dx*dx/1e9,'tot vol',H.sum()*dx*dx/1e9)
np.savez('bed.npz',B=Bb,H=H,mask=mask)
sh=np.clip(0.5+(np.gradient(z,dx)[1]*-0.7+np.gradient(z,dx)[0]*0.7)*2,0,1)
rgb=np.stack([sh]*3,-1); t=np.clip(H/300,0,1)
rgb[mask]=np.stack([1-t,1-0.5*t,np.ones_like(t)],-1)[mask]*0.8+rgb[mask]*0.2
rgb[hef&(ndi.binary_erosion(hef)==0)]=[1,0,0]
Image.fromarray((rgb*255).astype(np.uint8)).resize((152*4,130*4),0).save('glabtop.png')
