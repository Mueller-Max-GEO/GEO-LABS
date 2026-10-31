import sys; sys.path.insert(0, __import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)), "..", "src"))
import numpy as np, glac, json
from glac import P
P['pf']=1.6; P['tbias']=0.49
b=np.load('base.npz'); t=np.load('terr100.npz'); z=b['z100']
Ty=b['T'].reshape(-1,12); Py=b['P'].reshape(-1,12); Tc=Ty[159:189].mean(0); Pc=Py[159:189].mean(0)
m=glac.Model(z,t['rad'],t['slope']); m.H=np.where(b['hef'],120.0,0.0); m.M=np.where(b['hef'],0,1.0)*(z<2600)*3.0
np.save('t_B.npy',z); np.save('t_rad.npy',t['rad']); np.save('t_sl.npy',np.degrees(t['slope'])); np.save('t_H.npy',m.H); np.save('t_M.npy',m.M)
json.dump({'T':[float(x) for x in Tc],'P':[float(x) for x in Pc],'nx':z.shape[1],'ny':z.shape[0]},open('t_clim.json','w'))
for y in range(2): m.year(Tc,Pc,0.3,0.1)
np.savez('t_py.npz',H=m.H,M=m.M,D=m.D,firn=m.firn,snow=m.snow,bann=m.bann,usx=m.us[0])
print('py vol',m.H.sum(),'D',m.D.sum(),'M',m.M.sum())
