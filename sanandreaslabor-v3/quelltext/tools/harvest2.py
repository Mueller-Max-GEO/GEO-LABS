"""Ordnet Bildschirmfotos (Zoom) den zuvor geladenen Adressen zu – auch mehrere Paare (navigate, zoom) in einem Stapelaufruf."""
import json,re,os,urllib.parse
from PIL import Image
J='/root/.claude/projects/-home-claude/8911e1f5-a7a2-553e-adae-17c5ff6db27a.jsonl'
D='/home/claude/sa2/data/'
HM={'3DEP':'E','DEM_global':'T','USGSImageryOnly':'B','USGSNAIPPlus':'P','USGSNAIPImagery':'N'}
def key_of(url):
    u=urllib.parse.urlparse(url); q=urllib.parse.parse_qs(u.query)
    if 'BBOX' in q and 'BlueMarble' in url: return ('G',q['BBOX'][0],'%s,%s'%(q['WIDTH'][0],q['HEIGHT'][0]),'')
    if 'bbox' not in q: return None
    h=next((v for k,v in HM.items() if k in u.path),None)
    return (h,q['bbox'][0],q.get('size',[''])[0],q.get('k',[''])[0]) if h else None
BAD=re.compile(r'ERROR|Gateway|Bad Gateway|Time-out|HTTP status|not be satisfied|still loading')
res={}
try: res=json.load(open(D+'captures2.json'))
except Exception: pass
with open(J) as f:
    for line in f:
        try: d=json.loads(line)
        except Exception: continue
        cont=(d.get('message') or {}).get('content')
        if not isinstance(cont,list): continue
        for c in cont:
            if c.get('type')!='tool_result' or not isinstance(c.get('content'),list): continue
            cur=None; ok=False; vp_ok=False
            for part in c['content']:
                if part.get('type')!='text': continue
                t=part.get('text','')
                for seg in re.split(r'(?=\[(?:navigate|computer:zoom|Claude_Browser__computer|Image: source))',t):
                    m=re.match(r'\[navigate\] navigated to (\S+)',seg)
                    if m:
                        cur=key_of(m.group(1)); tm=re.search(r'Executed on tabId: \S+\n- Available tabs:\n  • tabId \S+: "([^"]*)"',seg); nt=seg[:900]
                        ok=cur is not None and not BAD.search(nt); continue
                    if seg.startswith('[computer:zoom]') or seg.startswith('[Claude_Browser__computer'):
                        vp_ok='emulating 800x600' in seg; continue
                    m=re.match(r'\[Image: source: (\S+?)\]',seg)
                    if m and cur and ok and vp_ok:
                        p=m.group(1)
                        if os.path.exists(p):
                            try: sz=Image.open(p).size
                            except Exception: continue
                            if '%d,%d'%sz==cur[2] and (cur[0] in 'BPTG' or p.endswith('.png')): import shutil; os.makedirs(D+'cap2',exist_ok=True); q=D+'cap2/'+os.path.basename(p); shutil.copy(p,q); res['|'.join(cur)]=q
                        cur=None
json.dump(res,open(D+'captures2.json','w'),indent=0)
