import sys; sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import numpy as np, glac
from glac import P
b=np.load('base.npz'); Ty=b['T'].reshape(-1,12); Py=b['P'].reshape(-1,12)
hy=np.arange(1802,1802+Ty.shape[0]); sel=(hy>=1961)&(hy<=1990)
Tc=Ty[sel].mean(0); Pc=Py[sel].mean(0)
def solve(target):
    lo,hi=-6.0,8.0
    for _ in range(30):
        P['tbias']=0.5*(lo+hi); e,_=glac.ela_profile(Tc,Pc,0,0)
        if e<target: lo=P['tbias']
        else: hi=P['tbias']
for pf in [1.0,1.3,1.6,2.0,2.4]:
    P['pf']=pf; solve(2990)
    e,bal=glac.ela_profile(Tc,Pc,0,0)
    prof=[round(float(bal(z)),2) for z in (2400,2600,2800,3000,3200,3400,3600)]
    s=[glac.ela_profile(Tc,Pc,d,0)[0]-e for d in (-1,1)]
    q=[glac.ela_profile(Tc,Pc,0,d)[0]-e for d in (-.25,.25)]
    print(f'pf {pf} tbias {P["tbias"]:.2f} ELA {e:.0f} b(z) {prof} dT-1/+1 {s[0]:.0f}/{s[1]:.0f} dP-25/+25 {q[0]:.0f}/{q[1]:.0f}')
