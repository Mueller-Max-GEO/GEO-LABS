"""Blue-Marble-Kacheln (NASA GIBS, EPSG:4326) für W (ganz) und A (nur Lücken an Land)."""
import json,sys,numpy as np
sys.path.insert(0,'/home/claude/sa2/tools')
from frame import C,U,V,TI
import plan2 as P
from scipy import ndimage as ndi
from PIL import Image
D='/home/claude/sa2/data/'
def url(b): return 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=BlueMarble_NextGeneration&STYLES=&FORMAT=image/jpeg&SRS=EPSG:4326&BBOX=%s&WIDTH=800&HEIGHT=600'%b
def fmt(v): return ('%.3f'%v).rstrip('0').rstrip('.')
tiles=[]
# W: 16 x 12 Grad
for lo in (-142,-126,-110):
    for la in (18,30,42): tiles.append(('W',[lo,la,lo+16,la+12]))
# A: 4 x 3 Grad, nur wo Luftbild fehlt und Land ist
A=np.load(D+'v21/A_dem.npy'); img=np.asarray(Image.open(D+'v21/A_img.png'))
Ai=ndi.zoom(A,(img.shape[0]/A.shape[0],img.shape[1]/A.shape[1]),order=1)
white=(img>=246).all(-1)&(Ai>1)&(np.abs(Ai-17.33)>0.2)
s0,s1,w0,w1=P.RECT['A']; r,c=np.nonzero(white[::4,::4]); S=s0+(c*4+0.5)*360; Wv=w0+(r*4+0.5)*360
lon,lat=TI.transform(C[0]+S*U[0]+Wv*V[0],C[1]+S*U[1]+Wv*V[1])
need=set(zip(np.floor((np.array(lon)+130)/4).astype(int),np.floor((np.array(lat)-28)/3).astype(int)))
for i,j in sorted(need): lo=-130+4*i; la=28+3*j; tiles.append(('A',[lo,la,lo+4,la+3]))
cap=json.load(open(D+'captures2.json'))
plan=[dict(L=L,bbox=','.join(fmt(v) for v in b),url=url(','.join(fmt(v) for v in b))) for L,b in tiles]
json.dump(plan,open(D+'bm_plan.json','w'))
miss=[p for p in plan if 'G|%s|800,600|'%p['bbox'] not in cap]
print(len(plan),'geplant,',len(miss),'fehlen'); [print(p['L'],p['bbox']) for p in miss]
