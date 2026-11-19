"""Version 2.1: Texturen für die vier Maßstäbe W (Westen Nordamerikas), A (Kalifornien), B (Carrizo-Ebene), C (Wallace Creek)."""
import json,sys,io,base64,numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0,'/home/claude/sa2/tools')
import importlib.util,types
_src=open('/home/claude/sa2/tools/bake.py').read().split('meta={}; tex={}')[0]
_m=types.ModuleType('bk'); exec(_src,_m.__dict__); enh,pack16,normals=_m.enh,_m.pack16,_m.normals
import plan2 as P
Image.MAX_IMAGE_PIXELS=None
D='/home/claude/sa2/data/'; O=D+'v21/'; OUT='/home/claude/sa2/src/'
SEAK=0.35          # Meerestiefen schwächer überhöht als Berge
Q=int(sys.argv[1]) if len(sys.argv)>1 else 76; QN=int(sys.argv[2]) if len(sys.argv)>2 else 70
meta={}; tex={}; tot=0
def put(name,arr,fmt,**kw):
    global tot; bio=io.BytesIO(); Image.fromarray(arr).save(bio,fmt,**kw); b=bio.getvalue(); tex[name]=('image/jpeg' if fmt=='JPEG' else 'image/png',base64.b64encode(b).decode()); tot+=len(b); print(f'{name:8s} {arr.shape} {len(b)/1024:.0f} KB')
def synth(h):
    """Farben aus der Höhe (für Meeresboden und Lücken im Luftbild): Blau nach Tiefe, an Land Wüsten- und Gebirgsfarben."""
    o=np.zeros(h.shape+(3,),np.float32)
    d=np.clip(-h/5500,0,1)[...,None]; sea=np.array([0.20,0.40,0.52])*(1-d)+np.array([0.035,0.10,0.24])*d
    shelf=np.clip(1+h/180,0,1)[...,None]; sea=sea*(1-shelf*0.5)+np.array([0.30,0.52,0.58])*shelf*0.5
    e=np.clip(h/3200,0,1)[...,None]; land=np.array([0.56,0.51,0.41])*(1-e)+np.array([0.47,0.44,0.38])*e
    land=np.where(h[...,None]>3000,land*0.6+np.array([0.75,0.74,0.72])*0.4,land)
    o=np.where(h[...,None]<0,sea,land); return (np.clip(o,0,1)*255+0.5).astype(np.uint8)
def seak(h): return np.where(h<0,h*SEAK,h)
def zoomto(a,shape,order=1): return ndi.zoom(a,(shape[0]/a.shape[0],shape[1]/a.shape[1]),order=order)
R=P.RECT
import bm
# ---------- A ----------
A=np.load(O+'A_dem.npy'); img=np.asarray(Image.open(O+'A_img.png'))
# Fehler in einzelnen NOAA-Kacheln: Meer als 17, 35 oder 52 m über dem Meer gelesen -> Tiefe aus der Übersicht W
sA=R['A'][0]+(np.arange(A.shape[1])+0.5)*900; wA=R['A'][2]+(np.arange(A.shape[0])+0.5)*900; SS,WW=np.meshgrid(sA,wA)
Wraw=np.load(O+'W_dem.npy'); WonA=ndi.map_coordinates(Wraw,[(WW-R['W'][2])/3000-0.5,(SS-R['W'][0])/3000-0.5],order=1)
st=4420/255; art=np.zeros(A.shape,bool)
for k in (1,2,3): art|=np.abs(A-k*st)<0.12
lab,n=ndi.label(art); sz=ndi.sum(art,lab,range(1,n+1)); art=np.isin(lab,1+np.nonzero(sz>40)[0])&(WonA<5)
art=ndi.binary_dilation(art,iterations=1)&(np.abs(A-np.round(A/st)*st)<0.12)|art
print('A: DEM-Fehler ersetzt',int(art.sum()),'Punkte')
A=np.where(art,np.minimum(WonA,-2),A); np.save(O+'A_dem_fix.npy',A)
# Küstenlinie aus Blue Marble (500 m): Meer = dunkle Fläche, die mit dem offenen Ozean verbunden ist
Abm,Ahave=bm.sample('A',*R['A'],360.0); Wfb,_=bm.sample('W',*R['A'],360.0)
Abm=np.where(Ahave[...,None],Abm,Wfb)
lum=Abm.mean(-1); Aup=zoomto(A,lum.shape,order=1); wat=ndi.binary_opening((lum<34)&(Aup<40),iterations=1)
lab,n=ndi.label(wat); sz=ndi.sum(wat,lab,range(1,n+1)); big=1+np.argmax(sz); seaM=lab==big
# kleinere dunkle Flächen, die laut Tiefendaten deutlich unter dem Meer liegen, gehören auch dazu (Buchten)
seaM=ndi.binary_closing(seaM,iterations=2)
seaA=ndi.zoom(seaM.astype(np.float32),(A.shape[0]/seaM.shape[0],A.shape[1]/seaM.shape[1]),order=1)>0.5
A=np.where(seaA&(A>-6),np.minimum(WonA,-6),A); A=np.where(~seaA&(A<0)&(WonA<-50),4,A)
print('A: Meer laut Blue Marble',round(seaM.mean(),3))
Ai=zoomto(A,img.shape[:2],order=1)
white=(img>=246).all(-1); lab,n=ndi.label(white); sz=ndi.sum(white,lab,range(1,n+1)); big=np.isin(lab,1+np.nonzero(sz>3000)[0])
fill=big|(white&(Ai<2)); fill=ndi.binary_closing(fill,iterations=2); fill=ndi.binary_dilation(fill,iterations=14)
fill=fill|((Ai<0)&~seaM[:Ai.shape[0],:Ai.shape[1]]&ndi.binary_dilation(white,iterations=6))
fk=ndi.gaussian_filter(ndi.binary_dilation(fill,iterations=6).astype(np.float32),6.0)[...,None]
alb=enh(img,lo=0.3,hi=99.8,sat=1.08,out=(0.05,0.88)).astype(np.float32)
# Luftbild-Farben auf die Ersatzfarben abstimmen (gleiche mittlere Helligkeit an Land)
valid=(~fill)&(Ai>30); mland=alb[valid].mean(0); syn=synth(Ai).astype(np.float32)
land=Ai>=0; lum=syn[land].mean(-1,keepdims=True); syn[land]=syn[land]*0.3+mland[None]*0.7*lum/lum.mean()
print('A: Luftbild-Mittel an Land',np.round(mland))
# Lücken an Land: NASA Blue Marble (500 m), auf die Farben des USGS-Luftbilds abgestimmt
Abm=Abm[:alb.shape[0],:alb.shape[1]]; Ahave=np.ones(alb.shape[:2],bool)
ov=(~fill)&(Ai>30)&Ahave
gain=alb[ov].mean(0)/np.maximum(Abm[ov].mean(0),1); print('A: Blue-Marble-Abgleich',np.round(gain,2))
def bmcol(x,g): y=np.clip(x*g[None,None],0,255); return y
Bc=bmcol(Abm,gain)
landk=1-ndi.gaussian_filter(seaM[:alb.shape[0],:alb.shape[1]].astype(np.float32),1.2)[...,None]
filler=np.where(Ahave[...,None],Bc*landk+syn*(1-landk),syn)
fk=np.maximum(fk,ndi.gaussian_filter(fill.astype(np.float32),9.0)[...,None]*1.6).clip(0,1)
alb=alb*(1-fk)+filler*fk
# Meer immer aus den Tiefendaten (das Luftbild hat an der Küste blockige Ränder)
seaK=ndi.gaussian_filter(seaM[:alb.shape[0],:alb.shape[1]].astype(np.float32),1.2)[...,None]
alb=alb*(1-seaK)+syn*seaK
WALB=gain
put('A_alb',np.clip(alb,0,255).astype(np.uint8),'JPEG',quality=Q,subsampling=0)
As=ndi.gaussian_filter(A,0.8); A2=ndi.zoom(seak(As),2,order=3); put('A_nrm',normals(A2,450.0,10.0),'JPEG',quality=QN,subsampling=0)
Ah=ndi.zoom(seak(As),0.5,order=1); rgb,hmin,rng=pack16(Ah); put('A_hgt',rgb,'PNG',optimize=True)
meta['A']=dict(s0=R['A'][0],s1=R['A'][1],w0=R['A'][2],w1=R['A'][3],hmin=hmin,hrng=rng,hw=Ah.shape[1],hh=Ah.shape[0])
# ---------- W ----------
W=np.load(O+'W_dem.npy'); W=ndi.gaussian_filter(W,0.6); W2=ndi.zoom(W,2,order=3)
import bm
Wbm,Whave=bm.sample('W',*R['W'],1500.0); Wbm=np.pad(Wbm,((0,max(0,W2.shape[0]-Wbm.shape[0])),(0,max(0,W2.shape[1]-Wbm.shape[1])),(0,0)),mode='edge')[:W2.shape[0],:W2.shape[1]]
Wg=WALB
landW=np.clip((W2+30)/60,0,1)[...,None]; Wc=np.clip(Wbm*Wg[None,None],0,255)
put('W_alb',np.clip(Wc*landW+synth(W2).astype(np.float32)*(1-landW),0,255).astype(np.uint8),'JPEG',quality=Q,subsampling=0)
put('W_nrm',normals(seak(W),3000.0,20.0),'JPEG',quality=QN,subsampling=0)
Wh=ndi.zoom(seak(W),0.5,order=1); rgb,hmin,rng=pack16(Wh); put('W_hgt',rgb,'PNG',optimize=True)
pl=np.load(O+'W_plates.npy'); put('W_plt',np.stack([pl*40,pl*0,pl*0],-1).astype(np.uint8),'PNG',optimize=True)
meta['W']=dict(s0=R['W'][0],s1=R['W'][1],w0=R['W'][2],w1=R['W'][3],hmin=hmin,hrng=rng,hw=Wh.shape[1],hh=Wh.shape[0])
# ---------- B ----------
B=np.load(O+'B_dem.npy'); B=ndi.gaussian_filter(B,0.7); img=np.asarray(Image.open(O+'B_img.png'))
put('B_alb',enh(img,sat=1.1,out=(0.08,0.84)),'JPEG',quality=Q,subsampling=0)
B2=ndi.zoom(B,2,order=3); put('B_nrm',normals(B2,45.0,4.0),'JPEG',quality=QN,subsampling=0)
Bh=ndi.zoom(B,0.5,order=1); rgb,hmin,rng=pack16(Bh); put('B_hgt',rgb,'PNG',optimize=True)
meta['B']=dict(s0=R['B'][0],s1=R['B'][1],w0=R['B'][2],w1=R['B'][3],hmin=hmin,hrng=rng,hw=Bh.shape[1],hh=Bh.shape[0])
# ---------- C ----------
img=np.asarray(Image.open(O+'C_img.png')); img=np.pad(img,((40,40),(80,80),(0,0)),mode='edge')
put('C_alb',enh(img,sat=1.25,out=(0.16,0.80)),'JPEG',quality=Q,subsampling=0)
old=open(OUT+'a_data.js').read() if False else None
print('gesamt %.2f MB (base64 %.2f MB)'%(tot/1e6,tot*4/3/1e6))
json.dump(dict(meta=meta),open(O+'meta21.json','w'))
import pickle; pickle.dump(tex,open(O+'tex21.pkl','wb'))
