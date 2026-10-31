import sys; sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import numpy as np, glac, time
from scipy import ndimage as ndi
b=np.load("base.npz"); z=b["z100"]; dx=125.0
gy,gx=np.gradient(z,dx)          # gy: d/dj (southward), gx: d/di (east)
slope=np.arctan(np.hypot(gx,gy))
# surface normal: x east, y north, z up. north gradient = -gy
nxv=-gx; nyv=gy; nzv=np.ones_like(z); nn=np.sqrt(nxv**2+nyv**2+1); nxv/=nn; nyv/=nn; nzv/=nn
lat=np.radians(46.81)
I=np.zeros_like(z); I0=0.0; ny,nx=z.shape
# melt season Apr-Sep, weighted by typical melt contribution
for decl_deg,wgt in [(4.5,0.3),(18.8,0.8),(23.3,1.3),(21.5,1.6),(13.8,1.4),(2.2,0.6)]:
 decl=np.radians(decl_deg)
 for hh in np.arange(-7.5,7.6,0.5):
     ha=np.radians(15*hh)
     el=np.arcsin(np.sin(lat)*np.sin(decl)+np.cos(lat)*np.cos(decl)*np.cos(ha))
     if el<=0.05: continue
     az=np.arctan2(-np.sin(ha), np.tan(decl)*np.cos(lat)-np.sin(lat)*np.cos(ha))  # from north, clockwise(east +)
     sx=np.cos(el)*np.sin(az); sy=np.cos(el)*np.cos(az); sz=np.sin(el)
     ci=np.clip(nxv*sx+nyv*sy+nzv*sz,0,None)
     # cast shadows by marching toward the sun
     lit=np.ones_like(z,bool); step=dx; tz=np.tan(el)
     for k in range(1,90):
         d=k*step; di=sx/np.cos(el)*d/dx; dj=-sy/np.cos(el)*d/dx
         jj=np.arange(ny)[:,None]+dj; ii=np.arange(nx)[None,:]+di
         h=ndi.map_coordinates(z,[np.broadcast_to(jj,z.shape),np.broadcast_to(ii,z.shape)],order=1,mode='nearest')
         lit&=h<z+d*tz
     trans=0.75**(1/max(sz,0.1))
     I+=wgt*(ci*lit*trans*1.0+0.12)      # direct + diffuse
     I0+=wgt*(sz*trans+0.12)
Irel=I/I0
rad=0.4+0.6*Irel
asp=np.degrees(np.arctan2(-gx,gy))
for nm,c in [('N',np.abs(asp)<30),('S',np.abs(asp)>150)]:
    q=c&(np.degrees(slope)>20); print(nm,'rad mean',rad[q].mean())
print('rad range',rad.min(),rad.max(),'HEF mean',rad[b['hef']].mean())
np.savez('terr100.npz',slope=slope,rad=rad,Irel=Irel)
