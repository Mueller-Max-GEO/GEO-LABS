import json,re,pickle
D='/home/claude/sa2/data/'; O=D+'v21/'
old=open(O+'a_data_v2.js').read()
om=json.loads(re.search(r'const SA_META=(\{.*?\});\n',old).group(1))
tex=pickle.load(open(O+'tex21.pkl','rb')); m=json.load(open(O+'meta21.json'))['meta']
for k in ['C_nrm','C_hgt','C_creek']:
    s=re.search(k+r':"data:([^;]*);base64,([^"]*)"',old); tex[k]=(s.group(1),s.group(2))
m['C']=om['C']; m['fault']=om['fault']; m['places']=om['places']
m['places'].update({'Seattle':[1121e3,816e3],'Portland':[979e3,631e3],'Vancouver':[1289e3,909e3],'Mt St Helens':[1003e3,711e3],'Phoenix':[-624e3,401e3],'Cerro Prieto':[-518e3,95e3],'Bombay Beach':[-412e3,134e3],'Mendocino':[680e3,112e3]})
b=json.load(open(D+'bounds_w.json'))
m['bounds']=[dict(k=x['k'],pb=x['pb'],v=x['v'],p=[[round(p[0]*1000),round(p[1]*1000)] for p in x['p']]) for x in b]
m['globe']=json.load(open(O+'globe.json'))
tex['G_day']=('image/webp',open(O+'g_day.b64').read()); tex['G_ca']=('image/webp',open(O+'g_ca.b64').read()); tex['G_wat']=('image/webp',open(O+'g_wat.b64').read())
for k,f in [('G_hgt','g_hgt'),('G_na','g_na'),('G_eu','g_eu')]: tex[k]=('image/webp',open(O+f+'.b64').read())
tex['C_nrm']=('image/webp',open(O+'c_nrm.b64').read())
order=['G_day','G_wat','G_ca','G_hgt','G_na','G_eu','W_alb','W_nrm','W_hgt','W_plt','A_alb','A_nrm','A_hgt','B_alb','B_nrm','B_hgt','C_alb','C_nrm','C_hgt','C_creek']
with open('/home/claude/sa2/src/a_data.js','w') as f:
    f.write('/* Erzeugt von tools/bake2.py + assemble21.py – Gelände (USGS 3DEP, NOAA ETOPO) und Luftbilder (USGS The National Map, NAIP); Plattengrenzen PB2002 (Bird 2003) */\n')
    f.write('const SA_META='+json.dumps(m,separators=(',',':'))+';\nconst SA_TEX={\n')
    for k in order: f.write(f'  {k}:"data:{tex[k][0]};base64,{tex[k][1]}",\n')
    f.write('};\n')
import os; print(os.path.getsize('/home/claude/sa2/src/a_data.js')/1e6,'MB')
