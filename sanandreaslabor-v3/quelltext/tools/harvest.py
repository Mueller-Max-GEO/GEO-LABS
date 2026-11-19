"""Ordnet die Bildschirmfotos aus dem Browserfenster den angefragten Kartenausschnitten zu (über das Sitzungsprotokoll)."""
import json, re, os, sys, shutil, urllib.parse
J='/root/.claude/projects/-home-claude/8911e1f5-a7a2-553e-adae-17c5ff6db27a.jsonl'
OUT='/home/claude/sa2/data/cap'
os.makedirs(OUT,exist_ok=True)
def key_of(url):
    u=urllib.parse.urlparse(url); q=urllib.parse.parse_qs(u.query)
    if 'bbox' not in q: return None
    host='N' if 'NAIP' in u.path else ('E' if '3DEP' in u.path else 'B')
    return (host, q['bbox'][0], q.get('size',[''])[0], q.get('k',[''])[0])
last_nav={}   # tabId -> url (from tool_use inputs)
uses={}       # tool_use_id -> list of (tab,url) navigations in that call
res={}        # key -> path
def walk_use(inp,name):
    out=[]
    if name.endswith('browser_batch'):
        for a in inp.get('actions',[]):
            if a.get('name')=='navigate': out.append((a['input'].get('tabId','seed'),a['input']['url']))
    elif name.endswith('__navigate'):
        out.append((inp.get('tabId','seed'),inp['url']))
    return out
with open(J) as f:
    for line in f:
        try: d=json.loads(line)
        except Exception: continue
        msg=d.get('message') or {}
        cont=msg.get('content')
        if not isinstance(cont,list): continue
        for c in cont:
            if c.get('type')=='tool_use' and 'Claude_Browser' in c.get('name',''):
                for tab,url in walk_use(c.get('input',{}),c['name']): last_nav[tab]=url
            elif c.get('type')=='tool_result':
                parts=c.get('content'); 
                if not isinstance(parts,list): continue
                txt='\n'.join(p.get('text','') for p in parts if p.get('type')=='text')
                imgs=re.findall(r'\[Image: source: (\S+?)\]',txt)
                if not imgs: continue
                m=re.findall(r'Executed on tabId: (\S+)',txt)
                if not m: continue
                tab=m[-1]
                # aktuelle Adresse des Tabs laut Ergebnis (bbox sichtbar), Fehlerseiten überspringen
                tm=re.findall(r'tabId '+re.escape(tab)+r': "([^"]*)" \("([^"]+)"\)',txt)
                if not tm: continue
                title,cururl=tm[-1]
                if 'ERROR' in title or 'Bad Gateway' in title or 'Timeout' in title or 'HTTP status' in txt.split('tabId '+tab+':')[-1][:600]: continue
                url=last_nav.get(tab)
                if not url: continue
                k=key_of(url); kc=key_of(cururl)
                if not k or not kc or k[:3]!=kc[:3] or (kc[3] and kc[3]!=k[3]): continue   # Seite zeigt (noch) etwas anderes
                if len(imgs)!=1: continue
                p=imgs[0]
                if p.endswith('.png') and os.path.exists(p):
                    from PIL import Image
                    try: sz=Image.open(p).size
                    except Exception: continue
                    if '%d,%d'%sz==k[2]: res[k]=p
json.dump({'|'.join(k):v for k,v in res.items()},open('/home/claude/sa2/data/captures.json','w'),indent=0)
if __name__=='__main__':
    from collections import Counter
    print(Counter(k[0]+':'+k[2] for k in res))
