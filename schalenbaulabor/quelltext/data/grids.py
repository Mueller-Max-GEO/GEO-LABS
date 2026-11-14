import numpy as np, sys
sys.path.insert(0,'/home/claude/sb2/data')
from litho import *
from PIL import Image
from scipy import ndimage as nd
W,H=720,360
lon=(np.arange(W)+.5)/W*360-180; lat=90-(np.arange(H)+.5)/H*180
LON,LAT=np.meshgrid(lon,lat)
def grid(name): return sample(depth(name),LAT,LON,k=6)
G={n:grid(n) for n in ["ICE-TOP","ICE-BOTTOM","WATER-TOP","WATER-BOTTOM","SEDS1-TOP","CRUST1-TOP","CRUST1-BOTTOM","CRUST2-BOTTOM","CRUST3-BOTTOM","LID-BOTTOM"]}
np.savez_compressed('/home/claude/sb2/build/litho_grids.npz',**G)
print({k:(float(np.nanmin(v)),float(np.nanmax(v))) for k,v in G.items()})
