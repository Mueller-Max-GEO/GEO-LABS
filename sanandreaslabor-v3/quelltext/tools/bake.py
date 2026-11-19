import json,sys,io,base64,numpy as np
from PIL import Image
from scipy import ndimage as ndi
D='/home/claude/sa2/data/'; OUT='/home/claude/sa2/src/'
def enh(img,lo=0.5,hi=99.8,sat=1.0,out=(0.10,0.86),gamma=1.0):
    """Kontrast nur über die Helligkeit strecken; Farbton und Sättigung bleiben natürlich."""
    a=img.astype(np.float32)/255
    L=a.mean(-1,keepdims=True); p0,p1=np.percentile(L,[lo,hi])
    L2=np.clip((L-p0)/(p1-p0),0,1)**gamma*(out[1]-out[0])+out[0]
    a=a*(L2/np.maximum(L,1e-3))
    g=a.mean(-1,keepdims=True); a=np.clip(g+(a-g)*sat,0,1)
    return (a*255+0.5).astype(np.uint8)
def b64img(arr,fmt,**kw):
    bio=io.BytesIO(); Image.fromarray(arr).save(bio,fmt,**kw); return base64.b64encode(bio.getvalue()).decode(), len(bio.getvalue())
def pack16(h):
    hmin=float(h.min()); rng=float(h.max()-hmin) or 1.0
    q=np.clip((h-hmin)/rng*65535+0.5,0,65535).astype(np.uint32)
    rgb=np.stack([(q>>8).astype(np.uint8),(q&255).astype(np.uint8),np.zeros(q.shape,np.uint8)],-1); return rgb,hmin,rng
def normals(h,res,zex):
    gy,gx=np.gradient(h*zex,res)          # gx: d/ds (Spalten), gy: d/dw (Zeilen)
    n=np.stack([-gx,np.ones_like(h),-gy],-1); n/=np.linalg.norm(n,axis=-1,keepdims=True)
    return (np.clip(n*0.5+0.5,0,1)*255+0.5).astype(np.uint8)
meta={}; tex={}; tot=0
def put(name,arr,fmt,**kw):
    global tot; s,n=b64img(arr,fmt,**kw); tex[name]=('image/jpeg' if fmt=='JPEG' else 'image/png',s); tot+=n; print(f'{name:8s} {arr.shape} {n/1024:.0f} KB')
# ---------- C: Wallace Creek (1 m) ----------
L=np.load(D+'L_dem.npy'); L=ndi.median_filter(L,3); Ls=ndi.gaussian_filter(L,1.2)
# Lage des Bachbetts entlang der Verwerfung (s -125..-10 m): tiefster Punkt je Spalte in |w|<25 m
cols=np.arange(1000-125,1000-10); sub=Ls[600-25:600+25,cols]; wmin=np.argmin(sub,0)-25+0.5
print('Bachbett an der Verwerfung: w Median %.1f m (Quartile %.1f %.1f)'%(np.median(wmin),*np.percentile(wmin,[25,75])))
img=np.asarray(Image.open(D+'L_img.png'))
put('C_alb',enh(img,sat=1.25,out=(0.16,0.80)),'JPEG',quality=86,subsampling=0)
put('C_nrm',normals(Ls,1.0,1.0),'JPEG',quality=88,subsampling=0)
h2=ndi.zoom(Ls,0.5,order=1); rgb,hmin,rng=pack16(h2); put('C_hgt',rgb,'PNG',optimize=True)
cm=json.load(open(D+'creek_meta.json')); put('C_creek',np.asarray(Image.open(D+'C_creek.png')),'PNG',optimize=True)
cp=json.load(open(D+'creek_pts.json')); meta['C']=dict(creekPts=[[round(a),round(c)] for a,c in cp[::6]],creekUp=cm['s_up'],creekDn=cm['s_dn'],s0=-1000,s1=1000,w0=-600,w1=600,hmin=hmin,hrng=rng,hw=h2.shape[1],hh=h2.shape[0],unit='m')
# ---------- B: Region ----------
R=np.load(D+'R_dem_raw.npy'); R=ndi.gaussian_filter(R,0.8)
img=np.asarray(Image.open(D+'R_img.png'))
put('B_alb',enh(img,sat=1.1,out=(0.08,0.84)),'JPEG',quality=85,subsampling=0)
R2=ndi.zoom(R,2,order=3); put('B_nrm',normals(R2,100.0,4.0),'JPEG',quality=86,subsampling=0)
rgb,hmin,rng=pack16(R); put('B_hgt',rgb,'PNG',optimize=True)
meta['B']=dict(s0=-70000,s1=70000,w0=-45000,w1=45000,hmin=hmin,hrng=rng,hw=R.shape[1],hh=R.shape[0],unit='m')
# ---------- A: Kalifornien ----------
A=np.load(D+'A_dem_raw.npy'); img=np.asarray(Image.open(D+'A_img.png')).astype(np.int32)
sm=np.asarray(Image.fromarray(img.astype(np.uint8)).resize((A.shape[1],A.shape[0]),Image.BILINEAR)).astype(np.int32)
ocean=(sm[...,2]-sm[...,0]>18); ocean=ndi.binary_opening(ocean,iterations=1); ocean=ndi.binary_dilation(ocean,iterations=2)
A=np.where(ocean,0,A); A=ndi.gaussian_filter(A,0.9)
put('A_alb',enh(img.astype(np.uint8),lo=0.3,hi=99.8,sat=1.08,out=(0.05,0.88)),'JPEG',quality=85,subsampling=0)
A2=ndi.zoom(A,2,order=3); put('A_nrm',normals(A2,900.0,10.0),'JPEG',quality=86,subsampling=0)
rgb,hmin,rng=pack16(A); put('A_hgt',rgb,'PNG',optimize=True)
meta['A']=dict(s0=-560000,s1=740000,w0=-330000,w1=420000,hmin=hmin,hrng=rng,hw=A.shape[1],hh=A.shape[0],unit='m')
print('gesamt %.2f MB'%(tot/1e6))
import os
if os.path.exists(D+'meta_extra.json'):
    ex=json.load(open(D+'meta_extra.json')); meta['fault']=ex['fault']; meta['places']=ex['places']
with open(OUT+'a_data.js','w') as f:
    f.write('/* Erzeugt von tools/bake.py – Gelände und Luftbilder (USGS 3DEP, USGS The National Map) */\n')
    f.write('const SA_META='+json.dumps(meta)+';\nconst SA_TEX={\n')
    for k,(mime,s) in tex.items(): f.write(f'  {k}:"data:{mime};base64,{s}",\n')
    f.write('};\n')
json.dump(meta,open(D+'meta.json','w'),indent=1)
# Kontrollbilder
Image.fromarray(enh(np.asarray(Image.open(D+'L_img.png')),sat=1.25,out=(0.16,0.80))[150:750,500:1500]).save(D+'q_C_alb.jpg',quality=85)
