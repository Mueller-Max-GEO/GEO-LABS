import json,sys,os
sys.path.insert(0,'/home/claude/sa2/tools')
from gen_tiles import *
D='/home/claude/sa2/data/'
def fit43(b):
    x0,y0,x1,y1=b; cx,cy=(x0+x1)/2,(y0+y1)/2; w=x1-x0; h=y1-y0
    if w/h<4/3: w=h*4/3
    mpp=np.ceil(w/800/10)*10; w=mpp*800; h=mpp*600
    return (round(cx-w/2),round(cy-h/2),round(cx+w/2),round(cy+h/2)),mpp
def fmt(b): return ','.join(str(int(v)) if float(v).is_integer() else str(v) for v in b)
def build():
    plan=[]
    for (i,j,b) in tiles(LOC,1.0,800,600,8): plan.append(dict(id=f'LB_{i}_{j}',host='B',bbox=fmt(b),size='800,600',k=''))
    for p in json.load(open(D+'plan_ld.json')): plan.append(dict(id=p['id'],host='E',bbox=fmt(p['bbox']),size='800,600',k=str(p['lo']),lo=p['lo'],hi=p['hi']))
    for (i,j,b) in tiles(REG,100,600,450,500): plan.append(dict(id=f'RI_{i}_{j}',host='B',bbox=fmt(b),size='600,450',k=''))
    for (i,j,b) in tiles(CAL,900,640,480,4000): plan.append(dict(id=f'AI_{i}_{j}',host='B',bbox=fmt(b),size='640,480',k=''))
    b,m=fit43(rect_bbox(*REG,pad=2000)); plan.append(dict(id='RDc',host='E',bbox=fmt(b),size='800,600',k='0',lo=0,hi=2550,mpp=m))
    b,m=fit43(rect_bbox(*CAL,pad=5000)); plan.append(dict(id='ADc',host='E',bbox=fmt(b),size='800,600',k='0',lo=0,hi=4420,mpp=m))
    if os.path.exists(D+'plan_extra.json'): plan+=json.load(open(D+'plan_extra.json'))
    return plan
def url(p):
    b=tuple(p['bbox'].split(',')); sz=tuple(p['size'].split(','))
    if p['host']=='N': return naip(b,sz)
    if p['host']=='B': return base(b,sz)
    lo,hi=p['lo'],p['hi']
    return f"{E}?bbox={p['bbox']}&bboxSR=26911&imageSR=26911&size=800,600&format=png&f=image&k={p['k']}&renderingRule="+'%7B%22rasterFunction%22%3A%22Stretch%22%2C%22rasterFunctionArguments%22%3A%7B%22StretchType%22%3A5%2C%22Statistics%22%3A%5B%5B'+f"{lo}%2C{hi}%2C{(lo+hi)//2}%2C1"+'%5D%5D%2C%22Min%22%3A0%2C%22Max%22%3A255%7D%2C%22outputPixelType%22%3A%22U8%22%7D'
if __name__=='__main__':
    import subprocess; subprocess.run([sys.executable,'-I','/home/claude/sa2/tools/harvest.py'],capture_output=True)
    cap=json.load(open(D+'captures.json'))
    plan=build(); miss=[p for p in plan if '|'.join((p['host'],p['bbox'],p['size'],p['k'])) not in cap]
    print(len(plan),'geplant,',len(miss),'fehlen')
    n=int(sys.argv[1]) if len(sys.argv)>1 else 4
    for h in 'ENB':
        mm=[p for p in miss if p['host']==h]
        print(f'--- {h}: {len(mm)} fehlen')
        for p in mm[:n]:
            if h=='E': print(p['id'],p['bbox'],p['lo'],p['hi'])
            else: print(p['id'],p['bbox'],p['size'])
