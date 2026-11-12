#!/usr/bin/env python3
# Baut assets/popdata.json für das Pyramiden-Labor.
# Quellen: UN World Population Prospects 2024 (R-Paket wpp2024, github.com/PPgp/wpp2024),
#          STATEC/LUSTAT (Volkszählungen 1880–1947, Geburten/Sterbefälle 1891–2025),
#          Human Mortality Database, Frankreich (R-Paket demography, Datensatz fr.mort, 1816–2006).
import pickle, json, base64, numpy as np, warnings, sys, os
warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import statec_lu as S
SCR='/tmp/claude-0/-home-claude/f4f4a120-86eb-5e74-b413-6eb290523a98/scratchpad/dl/'
W=pickle.load(open(SCR+'wpp.pkl','rb'))
pa,pp,mi,mp,tf,tp,e0,ep=[W[k] for k in ['pa','pp','mi','mp','tf','tp','e0','ep']]
for df in (pa,pp,mi,mp,tf,tp,e0,ep): df['country_code']=df['country_code'].astype(int); df['year']=df['year'].astype(int)
C=[('LU',442),('DE',276),('FR',250),('IT',380),('RU',643),('US',840),('BR',76),('CN',156),('JP',392),('KR',410),('IN',356),('EG',818),('NG',566),('NE',562),('QA',634),('W',900)]
Y0,Y1=1950,2100            # Beschriftung: Stand 1. Januar (UN-Wert vom 31.12. des Vorjahres)
def un_pop(code):
    a=np.zeros((Y1-Y0+1,2,101))
    s=pa[pa.country_code==code]; t=pp[pp.country_code==code]
    for df in (s,t):
        yy=df.year.values+1; ag=df.age.values.astype(int); ok=(yy>=Y0)&(yy<=Y1)
        a[yy[ok]-Y0,0,ag[ok]]=df.popM.values[ok]*1000; a[yy[ok]-Y0,1,ag[ok]]=df.popF.values[ok]*1000
    assert a.sum(axis=(1,2)).min()>0, code
    return a
def un_series(code):
    out={}
    def ser(est,proj,col):
        v=[None]*(Y1-Y0+1)
        for df in (est,proj):
            d=df[df.country_code==code]
            for y,x in zip(d.year.values,d[col].values):
                if Y0<=y<=Y1 and x==x: v[y-Y0]=float(x)
        return v
    out['cbr']=ser(mi,mp,'cbr'); out['cdr']=ser(mi,mp,'cdr'); out['mig']=ser(mi,mp,'cnmr')
    out['tfr']=ser(tf,tp,'tfr'); out['e0']=ser(e0,ep,'e0B')
    return out
def g5(a):   # (…,101) -> (…,21)
    return np.concatenate([a[...,:100].reshape(a.shape[:-1]+(20,5)).sum(-1), a[...,100:]],-1)
def expand5(g):  # (21,) -> (101,) gleichmäßig auf Einzeljahre
    return np.concatenate([np.repeat(g[:20]/5.0,5), g[20:21]])
out={'ages':101,'countries':[]}
for cid,code in C:
    pop=un_pop(code); ser=un_series(code); y0=Y0; meta={'id':cid,'un':code,'est':2024}
    if cid=='LU':
        cen=S.census(); cy=[y for y in sorted(cen) if y<1950]
        pts=[(y,np.array([cen[y][0][:21],cen[y][1][:21]],float)) for y in cy]
        # unbekanntes Alter anteilig verteilen
        pts=[(y,g*(1+np.array([[cen[y][0][21]],[cen[y][1][21]]])/g.sum(1,keepdims=True))) for y,g in pts]
        pts.append((1950,g5(pop[0])))
        y0=cy[0]; pre=[]
        for y in range(y0,1950):
            k=max(i for i,(yy,_) in enumerate(pts) if yy<=y); (ya,ga),(yb,gb)=pts[k],pts[k+1]; w=(y-ya)/(yb-ya)
            g=ga*(1-w)+gb*w; pre.append(np.stack([expand5(g[0]),expand5(g[1])]))
        pop=np.concatenate([np.array(pre),pop]); meta['census']=cy; meta['five']=[y0,1949]
        # Raten: STATEC 1891–2025, danach UN-Projektion
        B,D,P,M=S.BIRTHS,S.DEATHS,S.POP3112,S.NETMIG
        n=Y1-y0+1; cbr=[None]*n; cdr=[None]*n; mig=[None]*n
        for i,y in enumerate(range(1891,2026)):
            mid=(P[i-1]+P[i])/2 if i>0 else P[i]-675
            cbr[y-y0]=B[i]/mid*1000; cdr[y-y0]=D[i]/mid*1000
            if M[i] is not None: mig[y-y0]=M[i]/mid*1000
        for y in range(2026,Y1+1):
            cbr[y-y0]=ser['cbr'][y-Y0]; cdr[y-y0]=ser['cdr'][y-Y0]; mig[y-y0]=ser['mig'][y-Y0]
        pad=[None]*(Y0-y0)
        ser={'cbr':cbr,'cdr':cdr,'mig':mig,'tfr':pad+ser['tfr'],'e0':pad+ser['e0']}
        meta['ratesrc']=[[1891,2025,'statec'],[2026,2100,'un']]
        un24=pop[2024-y0].sum(); print('LU 1.1.2024 UN %.0f / STATEC 672050; 1.1.2026 UN-Proj %.0f / STATEC 690959'%(un24,pop[2026-y0].sum()))
    if cid=='FR':
        import rdata
        r=rdata.conversion.convert(rdata.parser.parse_file(SCR+'demography/data/france.rda'))['fr.mort']
        yrs=[int(v) for v in r['year']]; pm=np.asarray(r['pop']['male']); pf=np.asarray(r['pop']['female'])
        rm=np.nan_to_num(np.asarray(r['rate']['male'])); rf=np.nan_to_num(np.asarray(r['rate']['female']))
        def col(p,j): c=np.nan_to_num(p[:,j]); return np.concatenate([c[:100],[c[100:].sum()]])
        E=lambda j: np.stack([col(pm,j),col(pf,j)])   # Personenjahre im Kalenderjahr ≈ mittlere Bevölkerung
        y0=1817; pre=[]
        for y in range(y0,1950):
            j=yrs.index(y); pre.append((E(j-1)+E(j))/2)
        pre=np.array(pre)
        hm=(E(yrs.index(1949))+E(yrs.index(1950)))/2
        print('FR 1.1.1950: HMD %.0f / UN %.0f'%(hm.sum(),pop[0].sum()), ' 0-4: %.0f/%.0f  20-24: %.0f/%.0f'%(hm[:,:5].sum(),pop[0][:,:5].sum(),hm[:,20:25].sum(),pop[0][:,20:25].sum()))
        pop=np.concatenate([pre,pop])
        n=Y1-y0+1; pad=[None]*(Y0-y0); cbr=list(pad); cdr=list(pad)
        for y in range(y0,1950):
            j=yrs.index(y); Et=np.nansum(pm[:,j])+np.nansum(pf[:,j])
            Dt=np.nansum(pm[:,j]*rm[:,j])+np.nansum(pf[:,j]*rf[:,j]); D0=pm[0,j]*rm[0,j]+pf[0,j]*rf[0,j]
            Bn=pm[0,j]+pf[0,j]+0.72*D0      # Geburten ≈ Personenjahre im Alter 0 + Anteil der Säuglingssterbefälle (Näherung)
            cdr[y-y0]=Dt/Et*1000; cbr[y-y0]=Bn/Et*1000
        # Kontrolle der Näherung an den UN-Jahren 1950–2006
        chk=[]
        for y in (1950,1960,1975,1990,2005):
            j=yrs.index(y); Et=np.nansum(pm[:,j])+np.nansum(pf[:,j]); D0=pm[0,j]*rm[0,j]+pf[0,j]*rf[0,j]
            chk.append((y,round((pm[0,j]+pf[0,j]+0.72*D0)/Et*1000,1),round(ser['cbr'][y-Y0],1), round((np.nansum(pm[:,j]*rm[:,j])+np.nansum(pf[:,j]*rf[:,j]))/Et*1000,1), round(ser['cdr'][y-Y0],1)))
        print('FR Geburten-/Sterberate Näherung vs UN:',chk)
        print('FR cbr/cdr 1820,1850,1871,1900,1916,1918,1935,1946:',[(y,round(cbr[y-y0],1),round(cdr[y-y0],1)) for y in (1820,1850,1871,1900,1916,1918,1935,1946)])
        ser={'cbr':cbr+ser['cbr'][0:],'cdr':cdr+ser['cdr'],'mig':pad+ser['mig'],'tfr':pad+ser['tfr'],'e0':pad+ser['e0']}
        meta['hmd']=[y0,1949]; meta['ratesrc']=[[y0,1949,'hmd'],[1950,2100,'un']]
    mx=pop.max(); sc=mx/65535.0
    q=np.round(pop/sc).astype('<u2')
    meta.update({'y0':y0,'y1':Y1,'scale':sc,'pop':base64.b64encode(q.tobytes()).decode(),
        'series':{k:[None if v is None else round(v,2) for v in ser[k]] for k in ser}})
    assert all(len(ser[k])==Y1-y0+1 for k in ser), (cid,[len(ser[k]) for k in ser])
    out['countries'].append(meta)
    tot=pop.sum(axis=(1,2)); yi=lambda y: y-y0
    c15=pop[:,:,:15].sum(axis=(1,2)); a3044=pop[:,:,30:45].sum(axis=(1,2)); o65=pop[:,:,65:].sum(axis=(1,2))
    print('%-3s %d–%d  1950 %.3g  2024 %.3g  2100 %.3g | Basis-Index(0–14 je 100 30–44) 1950 %3.0f 1990 %3.0f 2024 %3.0f 2060 %3.0f | 65+ 2024 %.1f%%'%(cid,y0,Y1,tot[yi(1950)],tot[yi(2024)],tot[yi(2100)],*[100*c15[yi(y)]/a3044[yi(y)] for y in (1950,1990,2024,2060)],100*o65[yi(2024)]/tot[yi(2024)]))
    if cid=='LU': print('   LU Index 1880 %.0f 1910 %.0f 1930 %.0f 1947 %.0f'%tuple(100*c15[yi(y)]/a3044[yi(y)] for y in (1880,1910,1930,1947)))
    if cid=='FR': print('   FR Index 1817 %.0f 1850 %.0f 1900 %.0f 1930 %.0f'%tuple(100*c15[yi(y)]/a3044[yi(y)] for y in (1817,1850,1900,1930)))
json.dump(out,open(os.path.dirname(os.path.abspath(__file__))+'/../assets/popdata.json','w'),separators=(',',':'))
print('popdata.json %.2f MB'%(os.path.getsize(os.path.dirname(os.path.abspath(__file__))+'/../assets/popdata.json')/1e6))
