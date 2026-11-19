"""Blue Marble (NASA, EPSG:4326) auf das Raster der Verwerfung (s,w) abbilden."""
import json,sys,numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0,'/home/claude/sa2/tools')
from frame import C,U,V,TI
D='/home/claude/sa2/data/'
cap=json.load(open(D+'captures2.json')); plan=json.load(open(D+'bm_plan.json'))
def mosaic(L):
    ps=[p for p in plan if p['L']==L]; bs=[[float(v) for v in p['bbox'].split(',')] for p in ps]
    lo0=min(b[0] for b in bs); la1=max(b[3] for b in bs); dx=(bs[0][2]-bs[0][0])/800
    W=int(round((max(b[2] for b in bs)-lo0)/dx)); H=int(round((la1-min(b[1] for b in bs))/dx))
    out=np.zeros((H,W,3),np.float32); have=np.zeros((H,W),bool)
    for p,b in zip(ps,bs):
        k='G|%s|800,600|'%p['bbox']
        if k not in cap: print('fehlt',k); continue
        a=np.asarray(Image.open(cap[k]).convert('RGB')).astype(np.float32); c=int(round((b[0]-lo0)/dx)); r=int(round((la1-b[3])/dx))
        out[r:r+600,c:c+800]=a; have[r:r+600,c:c+800]=True
    return out,have,(lo0,la1,dx)
def sample(L,s0,s1,w0,w1,res):
    img,have,(lo0,la1,dx)=mosaic(L)
    ns=int(round((s1-s0)/res)); nw=int(round((w1-w0)/res))
    S=s0+(np.arange(ns)+0.5)*res; Wv=w0+(np.arange(nw)+0.5)*res; SS,WW=np.meshgrid(S,Wv)
    lon,lat=TI.transform((C[0]+SS*U[0]+WW*V[0]).ravel(),(C[1]+SS*U[1]+WW*V[1]).ravel())
    col=(np.array(lon)-lo0)/dx-0.5; row=(la1-np.array(lat))/dx-0.5
    o=np.stack([ndi.map_coordinates(img[...,i],[row,col],order=1,mode='nearest') for i in range(3)],-1).reshape(nw,ns,3)
    h=ndi.map_coordinates(have.astype(np.float32),[row,col],order=0,mode='constant').reshape(nw,ns)>0.5
    return o,h
