import pyreadr, numpy as np, sys, pickle
d='/tmp/claude-0/-home-claude/f4f4a120-86eb-5e74-b413-6eb290523a98/scratchpad/dl/wpp2024/data/'
R=lambda f: list(pyreadr.read_r(d+f+'.rda').values())[0]
pa=R('popAge1dt'); pp=R('popprojAge1dt'); mi=R('misc1dt'); mp=R('miscproj1dt')
tf=R('tfr1dt'); tp=R('tfrproj1dt'); e0=R('e01dt'); ep=R('e0proj1dt')
print(tf.head(2).to_string()); print(tp.head(2).to_string()); print(e0.head(2).to_string()); print(ep.head(2).to_string())
lu=pa[pa.country_code==442]
for y in [1949,1950,2000,2020,2022,2023]:
    s=lu[lu.year==y]; print(y, round(s.popM.sum()+s.popF.sum(),2))
l2=pp[pp.country_code==442]
for y in [2024,2025,2026,2050,2100]:
    s=l2[l2.year==y]; print(y, round(s.popM.sum()+s.popF.sum(),2))
print(pa.age.max(), pp.age.max(), pa.year.min(), pa.year.max(), pp.year.min(), pp.year.max())
pickle.dump(dict(pa=pa,pp=pp,mi=mi,mp=mp,tf=tf,tp=tp,e0=e0,ep=ep),open('/tmp/claude-0/-home-claude/f4f4a120-86eb-5e74-b413-6eb290523a98/scratchpad/dl/wpp.pkl','wb'))
