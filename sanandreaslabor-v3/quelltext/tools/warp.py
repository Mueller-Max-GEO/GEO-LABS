import json,sys,numpy as np
sys.path.insert(0,'/home/claude/sa2/tools')
from frame import *
from PIL import Image
from scipy import ndimage as ndi
D='/home/claude/sa2/data/'
def warp(src,geo,s0,s1,w0,w1,res,order=1,cval=0):
    x0,y1,mpp=geo
    ns=int(round((s1-s0)/res)); nw=int(round((w1-w0)/res))
    S=s0+(np.arange(ns)+0.5)*res; Wv=w0+(np.arange(nw)+0.5)*res
    SS,WW=np.meshgrid(S,Wv)                 # rows = w (increasing), cols = s
    E=C[0]+SS*U[0]+WW*V[0]; N=C[1]+SS*U[1]+WW*V[1]
    col=(E-x0)/mpp-0.5; row=(y1-N)/mpp-0.5
    if src.ndim==2: return ndi.map_coordinates(src,[row,col],order=order,mode='constant',cval=cval)
    return np.stack([ndi.map_coordinates(src[...,k],[row,col],order=order,mode='constant',cval=cval) for k in range(src.shape[2])],-1)
if __name__=='__main__':
    # --- Wallace Creek
    dem=np.load(D+'dem_loc.npy'); g=json.load(open(D+'dem_loc.json'))
    print('nan frac in source',np.isnan(dem).mean())
    demf=np.where(np.isnan(dem),-1,dem)
    L=warp(demf,g,-1000,1000,-600,600,1.0,order=1,cval=-1); print('loc dem',L.shape,(L<0).sum(),L[L>0].min(),L.max()); np.save(D+'L_dem.npy',L)
    img=np.asarray(Image.open(D+'img_loc.png')).astype(np.float32); g=json.load(open(D+'img_loc.json'))
    LI=warp(img,g,-1000,1000,-600,600,1.0,order=1); Image.fromarray(np.clip(LI,0,255).astype(np.uint8)).save(D+'L_img.png')
    # --- Region
    dr=np.load(D+'dem_reg.npy'); g=json.load(open(D+'dem_reg.json'))
    R=warp(dr,g,-70e3,70e3,-45e3,45e3,200.0,order=1); np.save(D+'R_dem_raw.npy',R)
    img=np.asarray(Image.open(D+'img_reg.png')).astype(np.float32); g=json.load(open(D+'img_reg.json'))
    RI=warp(img,g,-70e3,70e3,-45e3,45e3,100.0,order=1); Image.fromarray(np.clip(RI,0,255).astype(np.uint8)).save(D+'R_img.png')
    # --- Kalifornien
    da=np.load(D+'dem_cal.npy'); g=json.load(open(D+'dem_cal.json'))
    A=warp(da,g,-560e3,740e3,-330e3,420e3,1800.0,order=1); np.save(D+'A_dem_raw.npy',A)
    img=np.asarray(Image.open(D+'img_cal.png')).astype(np.float32); g=json.load(open(D+'img_cal.json'))
    AI=warp(img,g,-560e3,740e3,-330e3,420e3,900.0,order=1); Image.fromarray(np.clip(AI,0,255).astype(np.uint8)).save(D+'A_img.png')
    print(LI.shape,RI.shape,AI.shape,R.shape,A.shape)
    # Schnellansichten
    def hs(d,res,az=300,alt=40,z=1):
        gy,gx=np.gradient(d*z,res); sl=np.arctan(np.hypot(gx,gy)); asp=np.arctan2(-gx,gy)
        a=np.radians(az); h=np.radians(alt); return np.clip(np.sin(h)*np.cos(sl)+np.cos(h)*np.sin(sl)*np.cos(a-asp),0,1)
    q=(hs(L,1.0)*255).astype(np.uint8); Image.fromarray(q[::2,::2]).save(D+'q_L_hs.png')
    Image.fromarray(np.clip(LI,0,255).astype(np.uint8)[::2,::2]).save(D+'q_L_img.jpg',quality=80)
