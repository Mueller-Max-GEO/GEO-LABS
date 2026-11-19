import numpy as np
from pyproj import Transformer
T=Transformer.from_crs('EPSG:4326','EPSG:26911',always_xy=True)
TI=Transformer.from_crs('EPSG:26911','EPSG:4326',always_xy=True)
BEAR=318.0
P0=np.array([242822.0,3906787.0])
U=np.array([np.sin(np.radians(BEAR)),np.cos(np.radians(BEAR))])       # NW along fault
V=np.array([np.sin(np.radians(BEAR+90)),np.cos(np.radians(BEAR+90))]) # NE across
C=P0+100*U
def sw(lon,lat):
    e,n=T.transform(lon,lat); d=np.array([e,n])-C; return float(d@U), float(d@V)
def en(s,w): return C+s*U+w*V
def ll(s,w):
    p=en(s,w); return TI.transform(p[0],p[1])
