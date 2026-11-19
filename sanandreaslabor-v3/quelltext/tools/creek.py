import numpy as np, heapq, json, io, base64
from scipy import ndimage as ndi
from PIL import Image
D='/home/claude/sa2/data/'
L=np.load(D+'L_dem.npy'); L=ndi.gaussian_filter(ndi.median_filter(L,3),1.0)
Z=ndi.zoom(L,0.5,order=1).astype(np.float64)   # 2 m: Zeilen = w (-600..600), Spalten = s (-1000..1000)
H,W=Z.shape
# Senken füllen (Priority-Flood) und Fließrichtung
filled=Z.copy(); done=np.zeros((H,W),bool); pq=[]
for r in range(H):
    for c in (0,W-1): heapq.heappush(pq,(Z[r,c],r,c)); done[r,c]=True
for c in range(W):
    for r in (0,H-1):
        if not done[r,c]: heapq.heappush(pq,(Z[r,c],r,c)); done[r,c]=True
to=np.full((H,W,2),-1,np.int32); nb=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
order=[]
while pq:
    z,r,c=heapq.heappop(pq); order.append((r,c))
    for dr,dc in nb:
        rr,cc=r+dr,c+dc
        if 0<=rr<H and 0<=cc<W and not done[rr,cc]:
            done[rr,cc]=True; filled[rr,cc]=max(Z[rr,cc],z+1e-4); to[rr,cc]=(r,c); heapq.heappush(pq,(filled[rr,cc],rr,cc))
acc=np.ones((H,W),np.float64)
for r,c in reversed(order):
    tr,tc=to[r,c]
    if tr>=0: acc[tr,tc]+=acc[r,c]
# Wallace Creek: größter Zufluss, der die Verwerfung (w=+9 m) zwischen s=-200..-80 m erreicht
row=300+5; cols=np.arange(500-110,500-40); 
seg=acc[row+8:row+30,cols]; i=np.unravel_index(np.argmax(seg),seg.shape); start=(row+8+i[0],cols[i[1]])
print('Start (w,s) m:', (start[0]-300)*2,(start[1]-500)*2,'acc',acc[start])
# flussabwärts
path=[start]; r,c=start
while to[r,c][0]>=0: r,c=to[r,c]; path.append((r,c))
# flussaufwärts: jeweils größter Zufluss
r,c=start; up=[]
while True:
    best=None
    for dr,dc in nb:
        rr,cc=r+dr,c+dc
        if 0<=rr<H and 0<=cc<W and tuple(to[rr,cc])==(r,c) and (best is None or acc[rr,cc]>acc[best]): best=(rr,cc)
    if best is None or acc[best]<150: break
    up.append(best); r,c=best
full=up[::-1]+path
pts=np.array([((c-500)*2+1,(r-300)*2+1) for r,c in full],float)   # (s,w) in m
print(len(full),'Zellen; Anfang',pts[0],'Ende',pts[-1])
# wo quert der Bach die Verwerfung (w=9)?
cr=[i for i in range(len(pts)-1) if (pts[i,1]-9)*(pts[i+1,1]-9)<=0]; print('Querungen bei s=',[pts[i,0] for i in cr])
al=[p for p in pts if abs(p[1]-9)<14]; print('entlang der Verwerfung s von',min(p[0] for p in al),'bis',max(p[0] for p in al))
near=[i for i,p in enumerate(pts) if abs(p[1]-9)<14]; i0,i1=near[0],near[-1]
print('Eintritt',pts[i0],'Austritt',pts[i1])
json.dump(dict(s_up=float(pts[i0,0]),s_dn=float(pts[i1,0])),open(D+'creek_meta.json','w'))
mask=np.zeros((1200,2000),np.float32)
for k,(s,w) in enumerate(pts):
    if k<=i0 or k>=i1: mask[int(w+600),int(s+1000)]=1
mask=ndi.gaussian_filter(ndi.binary_dilation(mask>0,iterations=5).astype(np.float32),1.6); mask/=mask.max()
m8=(np.clip(mask,0,1)*255).astype(np.uint8)
m8=np.asarray(Image.fromarray(m8).resize((1000,600),Image.BILINEAR))
Image.fromarray(m8).save(D+'C_creek.png',optimize=True)
json.dump([[float(a),float(b)] for a,b in pts[::4]],open(D+'creek_pts.json','w'))
# Kontrollbild
img=np.asarray(Image.open(D+'L_img.png')).copy(); mm=np.asarray(Image.fromarray(m8).resize((2000,1200)))
img[mm>90]=(40,140,255); Image.fromarray(img[100:1100:2,300:1700:2]).save(D+'q_creek.jpg',quality=80)
