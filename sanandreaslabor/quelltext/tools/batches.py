import json,sys
sys.path.insert(0,'/home/claude/sa2/tools')
D='/home/claude/sa2/data/'
urls=json.load(open(D+'next.json')); tabs=['seed','tab-1','tab-2','tab-3','tab-4','tab-5']; per=int(sys.argv[1]) if len(sys.argv)>1 else 3
for t_i,tab in enumerate(tabs):
    mine=urls[t_i*per:(t_i+1)*per]
    if not mine: continue
    acts=[]
    for u in mine: acts+= [{"name":"navigate","input":{"tabId":tab,"url":u}},{"name":"computer","input":{"tabId":tab,"action":"zoom","region":[0,0,800,600]}}]
    acts.insert(1,{"name":"resize_window","input":{"tabId":tab,"width":800,"height":600}})
    print(json.dumps(acts,separators=(',',':')))
