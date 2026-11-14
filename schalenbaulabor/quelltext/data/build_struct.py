# Baut die Struktur-Karten (LITHO1.0 + Höhenbild) für das Schalenbau-Labor V2
import numpy as np, json
from PIL import Image
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS=None
B='/home/claude/sb2/build/'
G=np.load(B+'litho_grids.npz')
W,H=1440,720
def up(a):  # 720x360 -> 1440x720, periodisch in Länge
    a=np.asarray(a,np.float32); p=np.concatenate([a[:,-2:],a,a[:,:2]],1)
    z=nd.zoom(p,(2,2),order=1,mode='nearest'); return z[:,4:-4]
def sm(a,s): return nd.gaussian_filter(a,s,mode=['nearest','wrap'])
ice_top=G['ICE-TOP']; ice_bot=G['ICE-BOTTOM']; wat_top=G['WATER-TOP']; wat_bot=G['WATER-BOTTOM']; sed_top=G['SEDS1-TOP']; cr_top=G['CRUST1-TOP']
moho=G['CRUST3-BOTTOM']; lab=G['LID-BOTTOM']
ice_th=np.clip(ice_bot-ice_top,0,None); wat_th=np.clip(wat_bot-wat_top,0,None); sed_th=np.clip(cr_top-sed_top,0,None)
ocean=(wat_th>0.05)&(ice_th<0.05)
elev_c=np.where(ocean,0,np.clip(-ice_top,0,None))        # sichtbare Oberfläche (Land/Eis) über dem Meer, km
wdep=np.where(ocean,np.clip(wat_bot,0,None),0)            # Meerestiefe, km
elev_c=up(elev_c); wdep=up(sm(wdep,0.6)); ice=up(sm(ice_th,0.8)); sed=up(sm(sed_th,0.8)); moho_c=up(sm(moho,0.9)); lab_c=up(sm(lab,5.0))
# feines Relief aus dem Höhenbild (0..250 ~ linear, 0.0255 km je Stufe)
h=np.asarray(Image.open('/home/claude/sb2/assets_src/earth_height.jpg').convert('L'),dtype=np.float32)
hf=np.asarray(Image.fromarray(sm(h,0.7)).resize((W,H),Image.LANCZOS),dtype=np.float32)*0.0255
data=np.asarray(Image.open('/home/claude/sb2/assets_src/earth_data.jpg'))
water=np.asarray(Image.fromarray(data[...,2]).resize((W,H),Image.LANCZOS),dtype=np.float32)/255
landm=np.clip(1-water,0,1)
elev=np.where(landm>0.5,np.maximum(hf,0.0),0.0)
elev=sm(elev,0.6)
# Meerestiefe nur dort, wo Wasser ist; an Küsten weich auslaufen lassen
wdep=np.where(water>0.5,np.maximum(wdep,0.05+0.35*sm(water,3)),0)
wdep=sm(wdep,1.2)*np.clip((water-0.3)/0.4,0,1)
# Gebirgswurzeln (Airy-Isostasie): feines Relief minus grobes Relief -> tiefere Moho
elev_s=sm(elev,10.0)
moho=moho_c+6.5*np.clip(elev-elev_s,-0.3,None)*landm
moho=sm(moho,1.0)
bed=np.where(water>0.5,wdep,-elev+ice)                    # Tiefe der Gesteinsoberfläche (unter Meeresspiegel, km)
moho=np.maximum(moho,bed+sed+4.5)
lab=np.maximum(lab_c,moho+12)
lab=sm(lab,3.0)
def enc(a,mx): return np.clip(np.round(np.clip(a,0,mx)/mx*255),0,255).astype(np.uint8)
S1=np.stack([enc(elev,6.5),enc(wdep,8.0),enc(ice,4.5)],-1)
S2=np.stack([enc(np.sqrt(np.clip(sed,0,20)/20),1.0),enc(moho,80.0),enc(lab,320.0)],-1)
Image.fromarray(S1).save(B+'struct1.png',optimize=True); Image.fromarray(S2).save(B+'struct2.png',optimize=True)
np.savez_compressed(B+'struct_float.npz',elev=elev,wdep=wdep,ice=ice,sed=sed,moho=moho,lab=lab)
import os; print(os.path.getsize(B+'struct1.png'),os.path.getsize(B+'struct2.png'))
def at(a,la,lo): return float(a[int((90-la)/180*H)%H,int((lo+180)/360*W)%W])
for n,la,lo in [('Lux',49.6,6.13),('MontBlanc',45.83,6.86),('Sahara',23,6.13),('Guinea',0,6.13),('SAtl',-30,6.13),('Ridge',-53,6.13),('Antarkt',-80,6.13),('Hudson',60,-83.87),('Ohio',40,-83.87),('Golf',25,-83.87),('CostaRica',10,-83.87),('Pazifik',-20,-83.87),('Tibet',33,88),('Kanada',55,-100)]:
    print(n,[round(at(x,la,lo),1) for x in (elev,wdep,ice,sed,moho,lab)])
# Profil-Bild zur Kontrolle (Länge 6.13)
