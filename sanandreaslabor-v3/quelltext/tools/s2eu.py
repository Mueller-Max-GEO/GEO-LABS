"""Europa hochaufgelöst: Sentinel-2 cloudless (EOX, CC BY 4.0), Kacheln 8°×6° → 100 Pixel pro Grad; nur Land, Farben an die Erdkugel angepasst."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
D='/root/.claude/projects/-home-claude/8911e1f5-a7a2-553e-adae-17c5ff6db27a/tool-results/mcp-remote-devices-blob-'
rows=[['1794737434015-0h5o2d','1794737434015-cq34zm','1794737434015-et40be','1794737434015-3h7hg8','1794737434016-f3ra9m','1794737434016-jn41k7'],
['1794737450141-taan6q','1794737450141-fgprrm','1794737450142-30xxeu','1794737450142-njcfrw','1794737450142-enuyz5','1794737450142-qnl9u3'],
['1794737469429-mmb2rs','1794737469429-5grsk1','1794737469429-wcdk2t','1794737469429-vyjz2r','1794737469430-djuj96','1794737469430-us6cv6'],
['1794737486920-1wux83','1794737486920-viyt5r','1794737486920-zn0nl4','1794737486920-gnj5e2','1794737486920-sbqhcy','1794737486920-nc1g2w'],
['1794737504317-kst2j7','1794737504317-btvgv9','1794737504317-n76vys','1794737504317-kzmjun','1794737504318-5eezbs','1794737504318-8hdxro']]
im=np.zeros((3000,4800,3),np.float32)
for r,row in enumerate(rows):
  for c,n in enumerate(row): im[r*600:(r+1)*600,c*800:(c+1)*800]=np.asarray(Image.open(D+n+'.jpg').convert('RGB'),np.float32)
R,G,B=im[...,0],im[...,1],im[...,2]
water=(B>G+3)&(B>R+8)
land=ndi.binary_opening(~water,iterations=2); land=ndi.binary_closing(land,iterations=2)
# Referenz: Erdumlauf-Europa (-12..42, 34..71.5, 60 px/Grad) auf dasselbe Raster
E=np.asarray(Image.open('/mnt/user-data/uploads/GEO GYM/Erdumlauf-Labor/github/erdumlauf/earth_europe.jpg').convert('RGB'),np.float32)
lon=-12+(np.arange(4800)+0.5)/100; lat=65-(np.arange(3000)+0.5)/100
LO,LA=np.meshgrid(lon,lat); ex=(LO+12)*60-0.5; ey=(71.5-LA)*60-0.5
ok=(LO<42)
Er=np.stack([ndi.map_coordinates(E[...,i],[ey,ex],order=1,mode='nearest') for i in range(3)],-1)
m=land&ok&(LA>36)
out=im.copy()
for i in range(3):
  a=im[...,i][m]; b=Er[...,i][m]; ma,sa,mb,sb=a.mean(),a.std(),b.mean(),b.std(); print(i,ma,sa,mb,sb)
  t=(im[...,i]-ma)/sa*sb+mb; out[...,i]=np.clip(im[...,i]*0.25+t*0.75,0,255)
al=ndi.gaussian_filter(land.astype(np.float32),1.5)
# Rand weich ausblenden (2°)
al[(LO>-11)&(LO<-5.4)&(LA>51.2)&(LA<55.6)]=0; al=ndi.gaussian_filter(al,2)
ed=np.minimum.reduce([LO+12,36-LO,LA-35,65-LA]); al*=np.clip(ed/1.5,0,1)
Image.fromarray(np.dstack([out,al*255]).astype(np.uint8)).save('/home/claude/sa2/data/s2/europa.webp',quality=82,method=6)
Image.fromarray(out.astype(np.uint8)).resize((1200,750)).save('/tmp/claude-0/eu_s.jpg')
import os; print(os.path.getsize('/home/claude/sa2/data/s2/europa.webp'))
