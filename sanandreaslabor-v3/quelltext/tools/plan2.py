"""Kachelplan für Version 2.1: höhere Auflösung in allen Maßstäben, neuer Überblick W (Westen Nordamerikas)."""
import json,sys,os,urllib.parse
sys.path.insert(0,'/home/claude/sa2/tools')
from gen_tiles import tiles, rect_bbox
import numpy as np
D='/home/claude/sa2/data/'
HOST={'E':'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage',
      'T':'https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_mosaics/DEM_global_mosaic/ImageServer/exportImage',
      'B':'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/export',
      'P':'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage'}
RECT={'W':(-1950e3,1950e3,-650e3,1050e3),'A':(-690e3,760e3,-330e3,420e3),'B':(-48e3,72e3,-42e3,42e3),'C':(-960,960,-580,580)}
IMG={'A':('B',360),'B':('B',30),'C':('P',0.5)}
DEM={'W':('T',1500,[-6400,-1000,4400]),'A':('T',900,[-4600,0,4420]),'B':('E',90,[0,1100,2200])}
def fmt(b): return ','.join(('%d'%v if float(v).is_integer() else ('%.1f'%v)) for v in b)
def stretch(lo,hi):
    r={"rasterFunction":"Stretch","rasterFunctionArguments":{"StretchType":5,"Statistics":[[lo,hi,(lo+hi)//2,1]],"Min":0,"Max":255},"outputPixelType":"U8"}
    return json.dumps(r,separators=(',',':'))
def url(p):
    h=HOST[p['host']]; base=f"{h}?bbox={p['bbox']}&bboxSR=26911&imageSR=26911&size={p['size']}&f=image"
    if p['host']=='B': return base+'&format=png'
    if p['host']=='P': return base+'&format=jpg&renderingRule=%7B%22rasterFunction%22%3A%22NaturalColor%22%7D'
    if p['host']=='E':
        import urls; return urls.dem([float(x) for x in p['bbox'].split(',')],p['lo'],p['hi']).replace('bbox=','k=%s&bbox='%p['k'],1).replace('.0,',',').replace('.0&','&')
    return base+f"&format=png&k={p['k']}&renderingRule="+stretch(p['lo'],p['hi'])
def build():
    plan=[]
    for L in 'WABC':
        if L in IMG:
            h,m=IMG[L]
            for (i,j,b) in tiles(RECT[L],m,800,600,m*8): plan.append(dict(id=f'{L}i_{i}_{j}',layer=L+'i',host=h,bbox=fmt(b),size='800,600',k='',mpp=m))
        if L in DEM:
            h,m,bands=DEM[L]
            for (i,j,b) in tiles(RECT[L],m,800,600,m*4):
                for lo,hi in zip(bands[:-1],bands[1:]): plan.append(dict(id=f'{L}d_{i}_{j}_{lo}',layer=L+'d',host=h,bbox=fmt(b),size='800,600',k=str(lo),lo=lo,hi=hi,mpp=m))
    return plan
def key(p): return '|'.join((p['host'],p['bbox'],p['size'],p['k']))
if __name__=='__main__':
    import subprocess; subprocess.run([sys.executable,'-I','/home/claude/sa2/tools/harvest2.py'],check=True)
    cap=json.load(open(D+'captures2.json'))
    plan=build(); json.dump(plan,open(D+'plan2.json','w'))
    from collections import Counter
    miss=[p for p in plan if key(p) not in cap]
    print('geplant',Counter(p['layer'] for p in plan)); print('fehlen ',Counter(p['layer'] for p in miss))
    n=int(sys.argv[1]) if len(sys.argv)>1 else 0
    order=sys.argv[2] if len(sys.argv)>2 else 'WABC'
    sel=[p for L in order for p in miss if p['layer'][0]==L][:n]
    json.dump([url(p) for p in sel],open(D+'next.json','w'))
    for p in sel: print(p['id'])
