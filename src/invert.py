import sys; sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import numpy as np, glac, time
from glac import P
P['pf']=1.6; P['tbias']=0.49
b=np.load('base.npz'); t=np.load('terr100.npz')
z=b['z100']; Ty=b['T'].reshape(-1,12); Py=b['P'].reshape(-1,12)
hy=np.arange(1802,1802+Ty.shape[0]); sel=(hy>=1961)&(hy<=1990)
Tc=Ty[sel].mean(0); Pc=Py[sel].mean(0)
m=glac.Model(z,t['rad'],t['slope'])
m.debris=lambda dt: None
deg=np.degrees(t['slope'])
allow=(deg<38)&(z>2200)
DT=0.2
t0=time.time(); nst=[0]
of=m.flow
def cf(h):
    nst[0]+=1; return of(h)
m.flow=cf
for yr in range(60): m.year(Tc,Pc,DT,0)
print('spin 60yr',time.time()-t0,'s steps',nst[0],'Vol km3',m.H.sum()*1e4/1e9,'area',(m.H>5).sum()*0.0156255625)
for it in range(25):
    mis=(m.B+m.H)-z
    upd=np.where(allow&((m.H>1)|(mis<0)), np.clip(0.7*mis,-40,40),0)
    m.B=np.minimum(m.B-upd, z)
    for yr in range(15): m.year(Tc,Pc,DT,0)
    ice=m.H>1
    print(it,'rms misfit on ice %.1f'%np.sqrt((mis[ice]**2).mean()),'Hmax %.0f'%m.H.max(),'area %.1f'%(ice.sum()*0.015625),'HEF ice frac %.2f'%(ice[b['hef']].mean()), 'Hmean HEF %.0f'%m.H[b['hef']].mean(), time.time()-t0)
np.savez('inv.npz',B=m.B,H=m.H,firn=m.firn)
