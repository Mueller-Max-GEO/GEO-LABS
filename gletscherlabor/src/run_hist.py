import sys; sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import numpy as np, glac, time, json
from glac import P
P['pf']=1.6; P['tbias']=0.49
b=np.load('base.npz'); t=np.load('terr100.npz'); bed=np.load('bed.npz'); hef=b['hef']
Ty=b['T'].reshape(-1,12); Py=b['P'].reshape(-1,12); HY0=1802
hy=np.arange(HY0,HY0+Ty.shape[0]); ref=(hy>=1961)&(hy<=1990)
Tc=Ty[ref].mean(0); Pc=Py[ref].mean(0); refyrs=np.where(ref)[0]
LIA=[float(x) for x in sys.argv[1:4]] if len(sys.argv)>3 else [-1.0,-0.6,-0.9]
HB=float(sys.argv[4]) if len(sys.argv)>4 else 0.0   # historical temperature offset
P['tbias']=0.49+(float(sys.argv[5]) if len(sys.argv)>5 else 0.0)
OUT=sys.argv[6] if len(sys.argv)>6 else 'states.npz'
rng=np.random.default_rng(42)
TBX=float(sys.argv[7]) if len(sys.argv)>7 else 0.0
from scipy import ndimage as _nd
# Hintereisferner region: outline + 4-cell buffer + Rofental corridor below the 2003 tongue
_z=b['z100']; _tj,_ti=np.unravel_index(np.argmin(np.where(hef,_z,1e9)),_z.shape)
_low=(_z<2490)&(_z>2100); _lab,_=_nd.label(_low|_nd.binary_dilation(hef,iterations=1))
_JJ,_II=np.mgrid[0:_z.shape[0],0:_z.shape[1]]
_corr=(_lab==_lab[_tj,_ti])&_low&(np.hypot(_JJ-_tj,_II-_ti)*125<4500)
_reg=(_nd.binary_dilation(hef,iterations=4)|_nd.binary_dilation(_corr,iterations=2)).astype(float)
np.save('hefregion.npy',_reg>0)
tbx=TBX*(1-np.clip(_nd.gaussian_filter(_nd.binary_dilation(_reg>0,iterations=3).astype(float),2.0)*1.4,0,1))
np.save('tbx_%s.npy'%OUT.replace('.npz',''),tbx)
m=glac.Model(bed['B'],t['rad'],t['slope'],tbx=tbx); m.H=bed['H'].copy()
seed=np.unravel_index(np.argmax(np.where(hef&(b['z100']>3100),bed['H'],0)),hef.shape)
from scipy import ndimage as ndi
z=b['z100']
# HEF region: outline + 4-cell buffer + valley corridor below the 2003 tongue (steepest descent path)
tj,ti=np.unravel_index(np.argmin(np.where(hef,z,1e9)),z.shape)
low=(z<2490)&(z>2100)
lab_,_=ndi.label(low|ndi.binary_dilation(hef,iterations=1))
JJ,II=np.mgrid[0:z.shape[0],0:z.shape[1]]
dist=np.hypot(JJ-tj,II-ti)*125
corr=(lab_==lab_[tj,ti])&low&(dist<4500)
region=ndi.binary_dilation(hef,iterations=4)|ndi.binary_dilation(corr,iterations=2)
np.save('hefregion.npy',region)
def stats():
    lab,n=ndi.label((m.H>5)&region); l=lab[seed]
    if l==0: return 0,0,np.nan
    c=lab==l; S=m.B+m.M+m.H
    return c.sum()*0.015625, m.H[c].sum()*125*125/1e9, S[c].min()
t0=time.time(); log=[]
for yr in range(1600,1851):
    dT=LIA[0] if yr<1700 else (LIA[1] if yr<1780 else LIA[2])
    r=rng.choice(refyrs)
    m.year(Ty[r],Py[r],dT,0)
    if yr%25==0 or yr==1850: print(yr,'HEF area %.2f vol %.3f term %.0f'%stats(),'%.0fs'%(time.time()-t0),flush=True)
s1850={k:getattr(m,k).copy() for k in ('H','M','D','firn','tfree')}
for yr in range(1851,2004):
    i=yr-HY0
    m.year(Ty[i],Py[i],HB,0)
    a,v,tm=stats(); log.append((yr,a,v,tm))
    if yr%25==0 or yr==2003: print(yr,'HEF area %.2f vol %.3f term %.0f'%(a,v,tm),flush=True)
s2003={k:getattr(m,k).copy() for k in ('H','M','D','firn','tfree')}
np.savez(OUT,**{'a_'+k:v for k,v in s1850.items()},**{'b_'+k:v for k,v in s2003.items()},log=np.array(log),seed=np.array(seed))
print('tbias',P['tbias'],'M max',m.M.max(),'M>2 area',(m.M>2).sum()*0.015625,'total ice area',(m.H>5).sum()*0.015625)
