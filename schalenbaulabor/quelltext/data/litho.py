import numpy as np
from scipy.spatial import cKDTree
d=np.load('/home/claude/sb2/dl/x/litho1pt0-1.5.0/litho1pt0/data/litho_data.npz')
A=d['litho1_all_data']; C=d['litho1_mesh_coords']   # C columns? 
L={"ASTHENO-TOP":0,"LID-BOTTOM":1,"LID-TOP":2,"CRUST3-BOTTOM":3,"CRUST3-TOP":4,"CRUST2-BOTTOM":5,"CRUST2-TOP":6,"CRUST1-BOTTOM":7,"CRUST1-TOP":8,"SEDS3-BOTTOM":9,"SEDS3-TOP":10,"SEDS2-BOTTOM":11,"SEDS2-TOP":12,"SEDS1-BOTTOM":13,"SEDS1-TOP":14,"WATER-BOTTOM":15,"WATER-TOP":16,"ICE-BOTTOM":17,"ICE-TOP":18}
lat=C[:,0]; lon=C[:,2]
def xyz(la,lo):
    la=np.radians(la); lo=np.radians(lo); return np.stack([np.cos(la)*np.cos(lo),np.cos(la)*np.sin(lo),np.sin(la)],-1)
tree=cKDTree(xyz(lat,lon))
def depth(name): return A[L[name],0,:]/1000.0   # km
def sample(vals,la,lo,k=4):
    q=xyz(np.asarray(la,float),np.asarray(lo,float)); dist,idx=tree.query(q,k=k)
    w=1.0/np.maximum(dist,1e-9)**2; v=vals[idx]; ok=np.isfinite(v); w=w*ok
    return np.where(w.sum(-1)>0,(np.where(ok,v,0)*w).sum(-1)/np.maximum(w.sum(-1),1e-12),np.nan)
if __name__=='__main__':
    print(C[:3], lat.min(),lat.max(),lon.min(),lon.max())
    for n in L: 
        v=depth(n); print(n, np.nanmin(v), np.nanmax(v), np.isnan(v).sum(), np.sum(v==0))
    for la in [80,62,52,49.6,46,42,36,25,5,-5,-30,-53,-75]:
        row=[round(float(sample(depth(n),la,6.13)),1) for n in ["ICE-TOP","WATER-TOP","WATER-BOTTOM","SEDS1-TOP","CRUST1-TOP","CRUST1-BOTTOM","CRUST2-BOTTOM","CRUST3-BOTTOM","LID-BOTTOM","ASTHENO-TOP"]]
        print(la,row)
