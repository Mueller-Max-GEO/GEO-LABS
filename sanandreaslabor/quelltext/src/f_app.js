/* ============================================================================================
   f_app.js – Beschriftungen, Ablauf je Bild, Anzeige, Kamera, Steuerung, Erklärfilm
   ============================================================================================ */
const de=(v,d=0)=>v.toLocaleString('de-DE',{maximumFractionDigits:d,minimumFractionDigits:d});
let lastGT=null, shown=null, pendingScale=null, st=stateAt(0,'lock'), frameDt=0.016;
let dispSC=0, flashC=0, shakeAmp=0, lastYearC=null, lastSecB=-1;
const PHN=()=>st.ph+1;

/* ===================== Beschriftungen ===================== */
function buildLabels(){
  { const face=(lo,la)=>()=>{ if(shown!=='G') return false; const v=gdir(lo,la), c=camera.position.clone().normalize(); return v.dot(c)>0.25; };
    addLabel('Luxemburg<small>hier sind wir</small>','k',()=>GP(6.13,49.61,0.01),[0],{prio:9,cond:face(6.13,49.61)});
    addLabel('Kalifornien (USA)','k',()=>GP(-119.2,36.6,0.01),[0],{prio:9,cond:()=>face(-119.2,36.6)()&&state.t>TG*0.45});
    addLabel('Nordamerika','plate',()=>GP(-100,45,0.01),[0],{point:false,prio:()=>state.film?7:5,cond:face(-100,45)});
    addLabel('Europa','plate',()=>GP(15,52,0.01),[0],{point:false,prio:()=>state.film?7:5,cond:face(15,52)});
    addLabel('Pazifischer Ozean','w',()=>GP(-140,25,0.01),[0],{point:false,prio:()=>state.film?7:5,cond:face(-140,25)});
    addLabel('Atlantischer Ozean','w',()=>GP(-38,32,0.01),[0],{point:false,prio:()=>state.film?7:5,cond:face(-38,32)});
    addLabel('Ausschnitt von Phase 1','',()=>{ const r=SA_META.globe.rect; return GP(r[0],r[1],0.01); },[0],{prio:5,cond:()=>shown==='G'&&state.t>TG*0.6}); }
  const A=SCL.A,B=SCL.B,C=SCL.C, F=SA_META.fault, fp=n=>{ const p=F.find(q=>q[2]===n); return [p[0],p[1]]; }, PL=SA_META.places;
  const col=(L,c)=>{ L.el.style.setProperty('--c',c); return L; };
  /* --- Westen Nordamerikas --- */
  const Wp=(s,w,l=0.06)=>WP('W',s,w,l);
  addLabel('Pazifische Platte','plate',()=>Wp(-150e3,-420e3),[1],{point:false,prio:9});
  addLabel('Nordamerikanische Platte','plate',()=>Wp(-150e3,600e3,0.2),[1],{point:false,prio:9});
  addLabel('Juan-de-Fuca-Platte<small>klein, taucht ab</small>','plate jf',()=>Wp(1250e3,330e3),[1],{point:false,prio:()=>state.film?9:5});
  addLabel('Rivera-Platte','',()=>Wp(-1900e3,-250e3),[1],{prio:()=>state.film?3:5});
  addLabel('San-Andreas-Verwerfung<small>Transformstörung: Die Platten gleiten aneinander vorbei</small>','k',()=>Wp(120e3,8e3),[1],{prio:()=>state.film?8:5});
  addLabel('Golf von Kalifornien<small>Spreizung: Die Platten weichen auseinander</small>','k',()=>Wp(-1150e3,10e3),[1],{prio:()=>state.film?8:5});
  addLabel('Cascadia-Subduktionszone<small>Die Juan-de-Fuca-Platte taucht unter Nordamerika ab</small>','k',()=>Wp(1150e3,560e3),[1],{prio:()=>state.film?8:5});
  addLabel('Juan-de-Fuca-Rücken<small>Spreizung</small>','',()=>Wp(1440e3,330e3),[1],{prio:()=>state.film?5:5});
  addLabel('Mendocino-Tripelpunkt<small>hier treffen drei Platten zusammen</small>','k',()=>Wp(700e3,95e3),[1],{prio:()=>state.film?7:5,icon:'dot'});
  addLabel('Mount St. Helens<small>Vulkan</small>','',()=>Wp(...PL['Mt St Helens'],0.12),[1],{prio:()=>state.film?7:5,icon:'tri'});
  addLabel('Seattle','',()=>Wp(...PL['Seattle']),[1],{prio:()=>state.film?4:5});
  addLabel('San Francisco','',()=>Wp(...PL['San Francisco']),[1],{prio:()=>state.film?5:5});
  addLabel('Los Angeles','',()=>Wp(...PL['Los Angeles']),[1],{prio:()=>state.film?5:5});
  addLabel('Kalifornien<small>Ausschnitt von Phase 2</small>','',()=>Wp(A.bs1,A.bw1,0.08),[1],{prio:()=>state.film?6:5});
  addLabel('Pazifischer Ozean','w',()=>Wp(200e3,-560e3),[1],{point:false,prio:3});
  /* --- Kalifornien --- */
  addLabel('Pazifische Platte','plate',()=>WP('A',170e3,-200e3,0.1),[2],{point:false,prio:9});
  addLabel('Nordamerikanische Platte','plate',()=>WP('A',150e3,255e3,0.1),[2],{point:false,prio:9});
  addLabel('San-Andreas-Verwerfung<small>Grenze der beiden Platten · rund 1.300 km lang</small>','k',()=>WP('A',...fp('Cholame'),0.1),[2],{prio:5,fp:8});
  addLabel('<img class="city" src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCABwAMgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwC2lSrVFZzUqzGurlZycyLYIp4Iqtv6En8qdvyOo/Giw7loEetKDVTefanAt6iiwXLW4DqaAwPQ1X/5Z78/xbf0z/WmbzRYL2LZdR1Ipvmr25quPZs0pVuv9aLILsnMlAfPeoj6kU0uen9KLBcsbvfP0o/GoAT70ZAOeaAJs+hoz75qDeDxg0FwB7UBcmzSZqESAHrWe/iLTI5Gja6G9TggKev5U7MVzWzSVXt7yK5XdGTx1yMYqTfg9c0hvQeTSYzTC49aXzDt60AKygCoyvqKDNxTfOyKVmF0NZR2opplGfu0U9QKqgjpUyufQVGmUPIbmp039cZx2zVNkpCqxxS7iPTPqaQs390j8KQknrzQgY7d7CjJNN7dDSqC3AHNUSTw/Ppsz4+5c4/8dFRc9cHFGiyNcWeoRNnCF5BjuwZR/KmO4Tl2Cj1Y4rOD1aLmrJEob5Tg4pu761H9ptwBmeL14kFSBwSMdaomw4Of7xFKDkHBpjI4PK9BnpTc8jtk4/GjQNSTc3rRvOKZbgvbRyDLBkDE9evNV769SzjBKlnc4RMdTQmmNpothyB70obFQWjTXSr+7Bdl3bU5wM4q3LZ3UMJlkt3VAQCxpcy2Cz3MLxPdS2mlrJbyNG5kC7lOOMGuLgkaS8QudxZsknvXW+LznSU4/wCWw/ka5C2/4+Y/96tF8JPU37e7njmQLMyhmGQDiuuyQcCuKiz50ZP94V2JnRXWMyAMx+UEjJrNGkywq56jFIybRyKDbToNzxuq+pBFIduRtYluwzSv5hbyIjkcspxRAou4JJ4WVkjALc9ATgfrTLqdkguAjEsqHOOSKq6G00VleRsSqsU+U/xdf60NiSLRG3k/oKKTzBnlT+dFMZXS4K/d/XvUoeReq4z3xWItzERnzk/76q28qwECYsgYZALYzVNEJmm02xDI0W8ZC43Y/lU1lfxSl0eyQrs3Esx46d/xrIW4hkiWJHBctkKGycZ9qh8MateQRXRWXPzKPnUNgYPTPSsJpu7N4NKyLHiXVptMukihhjjLruaM5JX06modE1i6v53E0SCNV+8nBBrL8VXc97qqy3D738pRnAHHPpUel3Elrpd9LFgMuzk9snFaq/s13M3b2j7HZeEwZdPvG6lllx+LLWP4tKnS4pF2Z88dG56dMVp6JdGDQkMWV8yEuyg8McqOn41y2s3H2i3dRGFMdwVG0+1RTXvsub9xFWydni2nncp/ma6DWNYOmTYEXmBscdMetZFnpkgeFYZYrgsvzLG3KnPofrTvFQ/0vnquBj8Kq6cxWagzqNLcXloJZZSmVyTgL2HHX3rK8RXbQ28VvG5+dizHvxU7X723hzTprRirsFRyTn8s9OldXNodgunXCSWySg7pBvGcNt6iud1uR+9rqaqlzr3dDG0Iq2lWgbIHlYJ9OKq65a2G2GaG5kZ4m/iXA7VY0ZjDpdsikECLuPrVXz8zxB1R1clMEAjJ6H88GqTabsJpNK4+1ZrK58m6QoXjTYrpzyxP+FdDHcyz6XfiVt2SOoHXHFM8QWqPZpOcGSOSMBsc4Bxj9ajiV00nUAUOcdMdeDWTd2maJWTRyOvK1/AtlC6mbzVG1mx7f1oPw81CCSORLyykxtJXzcHPcVAG/wCJ1Cf+mqfzFel5fnLA/U1tVqShZIxpU4z1Z5ShCzLmPo2OtT65JImqAqRhVU1A4H2lucfOfw5q14ltDa6qYhJ5v7tTuA68VrFq9iJp2ud3Dd3dxbJdb3COu7yyRtxjp0rkZrUXnmpLIyIHI4znIrqrWVDp9tbYZp3gBWMnJPHf0H1rkrGS6s554p4fLlSXfh1ORnkf+g/rXNF2vY6GrtXD+zxoOoss84MEsYKueccjOcVq6bANRimuYrgCOKVkUkff759qreJI2OmQ5OTG+3p1J7/pVnwm8UGkSw3DhDNKSilhlhgZx605SbhzdRKNp8vQYwCtgzxn2BzRUM1lcS3LizglaIt+7zycds0V03Xc5dexzTWGraJawXV3ahY7nJRnUHGOMex9qin1G8uUKzFXGOM44r0Sws18TeGLeO/JCmV5VCfwHcen5n864qbR70anPa2sEs5hY5ESBiBnvisYVlJu+6OiVLlSa2DQII5LlZGXLKWAwfYf4mreiCJtcuNPRNqzzBEIP3CM1DDFcaAFk1C2mhWRmxlcNggDNa9vr2i6aryW9rcXb2zb8zxqshx3J9s4onJ621uKKtY53xNGYdUMTclF25HsTSRRrHpV+qZwY4mP1PNWNf17RtZhM0NhJDfs2CfM+ULnPTuTms+HWGhci0AXKBXEihg2BitItuCREkuds6TT9TSDT7C2kidhPFsG05wSy+v0pPEnhrUNKvXhtka6s33XRZVxtxwee5H9ayZdb89tOmuAS0OAxVFAIDcYA9sda6zxV9m1fVbWS31ZLV2tgw8xisZXJPzY5B56Vk21JfM0STi16HIWNq1zfwLHkyBwY1BwS2eK7G/8L2F3ZwzXlztM5Ja5eQIE+g7nqKd4S0SwlupppCjPbyAQujHD8feGfrWl4h02N9Ljt2DyRq3CnsefQVlUq3krGtOlaLuY2p+HJxpsFtpNvJdRRFWEmB849R6110p8uF/NX7q8qR7VS0HUojpFpa8hoIwrHtkcUl9qJVbh4lV0QruZjg7SOoz1rnk5Sdn0NoJLU8/Op6s1pcXFlGptmkxE6qB5Q3HAx7jitCCO4Q2BukKSSMrEEY9KS38H6ooGo21wsW0iaI5+9jngDI9KuebJqaQSTS7tVL7o45GAUqpOcn+HnPH0rrc10scqi+p03ieOSLQJ5YUEjxsjhTwDhhXCXXiTxRaBft0aLDcAhQUGHHsR9a2313UZY5bPW7USpIVUrbKHjIPPLfhUFljUZp5NOa0WGFVAguZAsaDODjjOT+NTD3d1cqWuzsYKB11aETBQ3mJkKwYdR3FelYAyCQDn1zWBZ2Ol/b0DwQNPJ88u1soBk524HHbqO1WtRn1OAKNKVbuFRh/OGJWOe/QY+napqy52h048iZQa1W7ghhlgj2KZTlY8MdhIznPNY/jNmeSzvrd9sM0IAYHBJzn+RFdNHLZtp0E00Emnyudhd0YgFjkn6H3qhq9ta3UVnpf2eExDCpNG7M+en3QcAGnCVpphKN4tFbwm1++tK1/cyXDG0/dludq8cVl+NJrpfFk6QSOF2Rkgf7tbt3YjS54hayieZF2CONyrYAB+vbp3pbgx6neQ3l1cYif/AJZCMB39fYYPGSMcURf7zn8gkvc5Sz4nm0m98NomnNE84dWZU4bABycVzejf8S++t5prfz4QCFVjtCMee/fvXRT6bLM1u2jCGbyZv9KIxvODwD0HA4OOtVdVt7nULh7m2+ym1I3BPJQ4HOT39D3zRFq3KDvfmEtp3sdTmDQSAXsmYkbI2oM9D7UVTsLnSr25S0kkmFydyK6RlMdexOAO2MUVMoq+qKjJ20Ok8HEf8I7agsOrjOf9qqNgmn2uuTTWGFuWkYzRmXlgDnJ3HAyawZdUubB0hs5BHp9sHV445dz5Pc+vPpWPf6hazX9vcaRHIGjwzmQ4LPnnkk9aI0m233CU1GKXY6jVtU0/UNSt7S3j82IuvnLMNx+YjgHP1rrfEngjQZdCuxDZQW9wsREcwJG09ieefxrzzW9QTUorW5soGg1C3b94iR/IRnOc45wRXU2PjP8AtrRrmx8QAWCvH5ZnC4809DtB7+3NU00lYnmvJ3POG8OP9kea3uBLNHIEeHOG57jtimzaPfWYxPasHK7grdcetdF4is5Rc20Oh3d1eRXI2lygUs+enHtVCV9UklE99IYjbKIsSr1I4x654rZVG1e5m6dnZIxvOjUb4yAyAbj6Gurv7Sy1Cx0iVTDZvcptkmZQBn+8cc9jVvStB0/xFbzw30bWk8Ch4jCi5kViSM9ugFZt94XltTKdNuob+CFPlDfK/OO3Tjp1qXKLaV7NAotJvdG/4fvY18NXWnWk3n3kPmFfLQsCM8H0rF1zxBENNt7UzpeSqxJkSRkCEdwO3U/lTvDVlYxwGW4vWs5RcIvlopPmP+B4HWun1nwvoeqyPb6TYWrXkUwa4AcqApyDk/gOlZvljPU0V5QsjN0HxVZ3dhFY3MKvfRHaj8uWHXIPet5NP1q+uTe2moRQWzkyLDLACyjoQcjPrgVi2ngmyt7Ge41ezNtKrBYWimwPTseTn1q/9tbT0h0eK9UzSIcR3GSSPQtwAMdqiXLe8Co3t7xLpQF9cXltHbw/6JJta5KD7x4AVM+5+uK46w1cWviLzZNzwWsmyR8ZwAcEnHX8fapf7NuIrmabRNTa5n84ebIH2Bu4xnqc1vWl5LDbMomiidj5ryOu7L+/r06VStH5hyynr2NGPWReXMC6cRJG6h3MPDhh3ZQPbuazpNCtDdymW0t1WVXKSx5Xbg/MT7469e9VbCxsjObzSZ5Y7oFWljjcrGCTwvIycmty1vClneWt6ba/uTI3Er7VViOUAA5GT65qNE/dGrtamVPYS2UcdzpUtxclVADRoGLYPGOOmfWp9Nu/thlvdQvfmizHcR3P7sIxPAH8OR9KaIry+tY4rWdbFt4WO32vGoA5/HJJPXn8Ku2MUTafNb3os7vEzec8+RmQEnp3A7d8029BdRX02S+mYW12BPHH8rOcpyOfrwPT0q4YkgZAXiuZEUEJE2SHAO484wORjuKx9F0me0hmXy57aF8bX3EoxPYKT7dc1g3X2jWbttSnAEtsoG+zm+ZSpxk5+X/Io5bu19AvbXqb2majPLrkYurJ0ZyRFNLFsCAA5PfPT9KuzaLNLMky30kTMG3GJiVIYnJO76+/0rF0mw1Ia5bX1xHIsP2hdyyNk89z/X612+vy2FxaPaDUBbybhjyJQrjHb6c0T02COq1OMh0ufR72BLfWGlTI3wSDa7c8qMgc49aj1O2ezluWhs41ijIcRQ7vNduCF9MfSq8cmvafFJE4hnMTFw20FgOnpzkd/atrQNR+2athZWS4tIiu8yApg9hwQeKbbWoJX0MC11G/vtThe9tQkiAqY7hfnGc5KjAzRXSapeQRSymXUIySSHQj5+nPK4P4cUUfFrYXw6XOa0iEaTcmPTdSW5lbpbeQ5ODg7h3OBXTDQrC8kkIsIbXysSxu7hDuOc8AZAPcZrhNYTUvCviTzJXYbl3K6NjdGeCueo6Y7VVi8QXF9qCR2LCyU5CQhQ4z7lsk596pxlL3kw5lF8rR6VNb3yxgteWMJeNo1ls4wzAD+Ehue/WsSXSNEtxHYarqSPb7twcNiSKQ9AFBPXk1xcF9rGjagtzcxtJuzmK4yUcemPSrf9va7DI97JbRNC7bgDbjZGD2B7D8aFBrqJz8jqpbIJqBXT9UMghI2x5V8hQeRjofUEelQai8d3ZrZPdQG6KCZ5p8Ag55UgDtj/8AXWbF4uvYoY3n0uDY3Q7NoZcdB6+pp1p4uaR7h5NFilEqgRrGgCAj69BjOaXK/uK5rlu1vjAkvkwxXt1nEjxb4gyDptwACBWhpGo/wt4fmAB3HEWd3OR1rn4vGUSwqsdpcWrISokt2A28kntz1x9Ks3HjERSR2tpcXExdV3zXQKMhPtnBGPahwb6CUl3L2l6SNc1i9Oq28tlK5EqFAVzzjAB7dKn0a+j8L3Wpi4WYK/7uB9hOSCQCfXtVc6tp2mOLtrlxNI523MT7mYf7p4A59aVvEdrc2533ySLFl9sp2MR6Lkt+lGsvQdlH1NSwmn8R38VvrNtLHBBF5ykEp84A5yO3PSsK+0+ytfH8tvBJHPFIoHktKcqSBwWwQOfX1rfsNYsZdDlV7mNoWbzHaR8b2zwWUc9hzjmqkUc+tL5GhTxQrFKJJGQMVbI53HGevalezfRCtexduNAumjjlW4hglg2lvKKnGAeo9f51yd1d3GnRgWLXFws7OztLbFCC359h2rsbmGOGL7RHdRXV5b4WURu2f9rgdO555rNu72QWUlrpdwYiBvbEWSe+ATwvAPGKUXqXJXRleDbkm5uLebbFK5jKh/lztcMevtmr2uaWpuTqFpqLXcEl35xt4wGVCerZB56frWVoerQtqW6/sWmDkgSTn+LjqQPb9adHf+GdbvVgnsl0pklJLnLrJk8qcEbeapxfO5EKVoKLOtudVW80d9oMYuLdgjseUPTJHbrWW0lxbwG0W1F3LGN0kyz7W3egB/AcZqzHf2cKtp7ac5tYowFaJ23OB7EjH61y90Y4L1mjS+wr4ZftKKMduM8H2qIRb3KlK2x0Vx4gt/saWd7b32mKTv8AM2dHxyQfTp2qpp0X21p1s549TgzlywxIoI44wB1FXtOuYNR8Nz2qGWEMdjF4zM5XOdxKj8OtR+ZFoFgLxrtfLePYI/L8sgjvtPzE9se+afRq2oLe72LWnxR3KSREvbCMBXAU+ueGUkenU5rNa1Fpqctrdabb3UIUbCEYyR8gj5j1HXgcVXTUHlEyaTMWsmKySDy3BZs8ngDOK0pNGlnuDKL13lnI3SzFWIUdAPTqOM0WtuG+wl5cSCdnF5cSxyjb5UcOMpnlc5P/ANen/ZLa2tPt5ZYULfLFtLMiE4xtA5PfOO9Q3ktpa2qec6STEjcXm8spjjAU4DY/rU1rf28UbXUFtI9qsZUmFQBI2BzluD6UtkHUoWmlRH7RdR3M62+SG+1bVAyM5wQCOKKusou7OMwoUeTDMss+VUdhtAxkADnpRT5u4uQ8z1LxFqOrFP7TlhndE2q7oAwHXnFQafqU1q3mQGCOQEEMwGevGK9CvdF0vUiHkeECJcOLeEIF+owc96ii8J6UQkgSRs9CF7d8fL9a0VWNrWE6OvxHGXuqX92yzXpSYx8Lvm3cdSBzWraaxdarbtbfanjijQKYyxK4HStaPRvD17eG1hheeaPICk4z+mB3qjfX994eWSCygigtWI2A2yOVI6/MQe9HMpKyWpPJyu9ylqomNrDG9wkrW7EIu4nA9AOgFVluJobN4RcL5hYOB1Axnj071d0jXBcN5eozytzkoxBV/wAMcVYnk8PSQyu8H73HyOhwE+oHWnqtGLR6pmBILmIid0Vl3feUjGfoKdeavd6leG6vis0rALvZRyB0FbCrptxbxeXZxqVzvnwSGP0qjeWtvDCXt4dz9doB4Pr9KtPuiHF9GLGZL87p4UeBc7I923acYqr5YNyU8lkhDD5N2T+dT6Ta3VxKA0qRhm2osufvfQVpr4UvLGXy7zULIySDcqrJnof73QfjRe2lwSctTJNtbLmT7Q6onI3EckVa0TxNrGnJOllP5KyYZ8ICTjoMmuhGm2sVvEsl9+7UctAifLz0Jx83TqM06XSoZnikWeK8iyUTEjDaeOSdozUOd1Z6lqm76HK2+u3c99NcS3dzbrczeZIYQfmPc4GBXR+H/EkmnLdWGnCSQahID9oniIK9c9O5z1rWltoplEVtO6xpB/ywhQhAOdu7qSfzPrVtNQgsEke8aG8Mqb4l8nY4A5AHH9aiVSLVrGqptHN3ek31oJZpS0s6zDISZicHJJIHU5zx2FZht4Z/NeQJG7xkghyioc9CD/KuntC9zdeZKF2uT5gE5AVTyq46DOMZ561b8QWyX8dvFIjQx9Xkyzq2M8kA9vX3o57Ow+VtXMZdLvrOzR57AvnaI5PMAEgI42/nms680G/lmaRLLHB3BJRlR13HnuP6111tpqweHkt428t3JLLGN4JzxzuwO1QWKLazxyGNbW6WL90ZJNyvj725evU8UlO12hNXVjkNLsNeS4xZTtbFgDzPswPU/lTv7P1SbU7dr4i7SNt4RmcjBb1x0JPUV1n2ORb6KWC+DrHkgTbpOo5BwBx7Uuu2drqySC7uP7MhtAMXERJjbJHG0DJ56ZNV7S7I9nZFXSX1zTWlijsrGMoCxQyjjpxwfb8M1YXxFq6mOBIbVZBIFco+7J/u9+vqP0rO0eZY7+5XSL77MjbQ7XUW3I7YJPUk1pGadNWIvhveNMSQqCWQ46+nIH61nJJO7NI3a0Mfxi+vX0lsl7pwjZGYQNGwO88ZzzwOlVLa+8QPoc+iDT0uIMZYp1UY65BrotWij1q1afz0sU3lQLiMKfujrx0NZ5mheGTT47m9ZoQGkKR8AAcMrHqvYDirUvdtYhxTb1OUW31C2XcnmwhxwpypNFd9Z3MdnpcbLa3GpSlwDujA8vHu39OtFV7R9ifZLuf/2Q==" alt="">San Francisco','k cityl',()=>WP('A',...PL['San Francisco'],0.1),[2],{prio:7});
  addLabel('<img class="city" src="data:image/jpeg;base64,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" alt="">Los Angeles','k cityl',()=>WP('A',...PL['Los Angeles'],0.1),[2],{prio:7});
  col(addLabel('1906 gerissen<small>477 km · Magnitude 7,9</small>','',()=>WP('A',...fp('Fort Ross'),0.1),[2],{prio:5}),'#FF8A3C');
  col(addLabel('Kriechender Abschnitt<small>gleitet ständig · keine sehr starken Beben</small>','',()=>WP('A',...fp('Bitterwater'),0.1),[2],{prio:5}),'#6FD3F5');
  col(addLabel('1857 gerissen<small>über 300 km · Magnitude 7,9</small>','',()=>WP('A',...fp('Lake Hughes'),0.1),[2],{prio:5}),'#FF4B3A');
  addLabel('Carrizo-Ebene<small>Ausschnitt der Phasen 3 und 4</small>','k',()=>WP('A',B.bs0,B.bw0,0.12),[2],{prio:5});
  addLabel('Pazifischer Ozean','w',()=>WP('A',330e3,-120e3,0.05),[2],{point:false,prio:3});
  addLabel('Hier endet die San-Andreas-Verwerfung<small>an der Salton Sea</small>','k',()=>WP('A',...PL['Bombay Beach'],0.1),[2],{prio:5,fp:7});
  addLabel('Die Plattengrenze geht weiter<small>Imperial-Verwerfung · dann Spreizung im Golf von Kalifornien</small>','y',()=>WP('A',-560e3,75e3,0.1),[2],{prio:5});
  addLabel('Mendocino-Tripelpunkt<small>weiter nördlich taucht die Juan-de-Fuca-Platte ab</small>','',()=>WP('A',...PL['Mendocino'],0.1),[2],{prio:5});
  addLabel('Sierra Nevada','',()=>WP('A',150e3,225e3,0.5),[2],{prio:3});
  addLabel('Längstal (Central Valley)','',()=>WP('A',230e3,125e3,0.1),[2],{point:false,prio:2});
  addLabel('San Diego','k',()=>WP('A',...PL['San Diego'],0.1),[2],{prio:2});
  col(addLabel('Südlicher Abschnitt<small>seit rund 300 Jahren kein großes Erdbeben</small>','',()=>WP('A',...fp('Indio Hills'),0.1),[2],{prio:3}),'#F2C14A');
  /* --- Regionalmodell --- */
  const wfB=s=>B.wf(s), creep=()=>st.creep;
  addLabel('Pazifische Platte','plate',()=>state.view==='section'?WP('B',SCL.B.bs0,-24e3,1.5):WP('B',36e3,-27e3,0.25),[3,4],{point:false,prio:9});
  addLabel('Nordamerikanische Platte','plate',()=>state.view==='section'?WP('B',SCL.B.bs0,24e3,1.5):WP('B',30e3,27e3,0.25),[3,4],{point:false,prio:9});
  addLabel('San-Andreas-Verwerfung','k',()=>WP('B',47e3,wfB(47e3),0.15),[3,4],{prio:7});
  addLabel('Messlinie<small>am Anfang gerade</small>','y',()=>WP('B',-8e3,-23e3,0.15),[3,4],{prio:()=>state.film&&st.ph===3?8:5,cond:()=>state.lines});
  addLabel('Verhakter Bereich<small>bis etwa 15 km Tiefe</small>','a',()=>WP('B',B.bs0,wfB(B.bs0),0,7200),[3,4],{prio:()=>st.ph===2?5:9,cond:()=>!creep()&&!(st.ph===3&&st.sec>=0)});
  addLabel('In der Tiefe gleiten die Platten gleichmäßig<small>heißes, verformbares Gestein</small>','',()=>WP('B',B.bs0,wfB(B.bs0),0,20500),[3,4],{prio:()=>creep()&&!state.film?8:5,cond:()=>st.ph===2||creep()});
  addLabel('Das Gestein verbiegt sich<small>und speichert Spannung</small>','a',()=>WP('B',-28e3,9.5e3,0.15),[3],{prio:5,cond:()=>!creep()&&st.year>45});
  addLabel('Die Messlinien werden zerschnitten<small>es baut sich keine Spannung auf</small>','y',()=>WP('B',12e3,wfB(12e3),0.15),[3],{prio:5,cond:()=>creep()&&st.year>30});
  addLabel('Carrizo-Ebene','',()=>WP('B',-12e3,-6e3,0.1),[3,4],{point:false,prio:4});
  addLabel('Temblor Range','',()=>WP('B',14e3,7e3,0.3),[3,4],{point:false,prio:3});
  addLabel('Soda Lake','',()=>WP('B',1.5e3,-6.2e3,0.1),[3,4],{prio:3});
  addLabel('Wallace Creek','k',()=>WP('B',0,wfB(0),0.15),[3],{prio:5});
  addLabel('Erdbebenherd<small>hier beginnt der Bruch</small>','k',()=>WP('B',B.bs0,wfB(B.bs0),0,HYP_DEPTH),[4],{prio:()=>state.film?8:5,icon:'star',cond:()=>!creep()});
  addLabel('Epizentrum<small>an der Oberfläche über dem Herd</small>','k',()=>WP('B',B.bs0+300,wfB(B.bs0),0.06),[4],{prio:()=>state.film?8:5,icon:'dot',cond:()=>!creep()&&st.sec>=0});
  addLabel('Bruchfront<small>rund 3 km pro Sekunde</small>','r',()=>{ const s=clamp(st.front,B.bs0,B.bs1); return WP('B',s,wfB(s),0.2); },[4],{prio:9,cond:()=>!creep()&&st.sec>=0&&st.front<B.bs1-2e3});
  addLabel('Erdbebenwellen','',()=>{ const r=Math.min(52e3,WAVE_V*Math.max(0,st.wsec||0)*0.9); return WP('B',B.bs0+r*0.75,wfB(B.bs0)+r*0.66,0.2); },[4],{prio:6,cond:()=>!creep()&&st.sec>3&&st.quakeNow});
  addLabel('Versatz<small>in Wirklichkeit rund 5 m</small>','y',()=>WP('B',12e3,wfB(12e3),0.15),[4],{prio:()=>state.film?8:5,cond:()=>!creep()&&st.front>30e3});
  addLabel('Kein großes Erdbeben<small>Es hat sich keine Spannung aufgebaut. Die Platten kriechen einfach weiter.</small>','k big',()=>WP('B',10e3,0,2.6),[4],{point:false,prio:10,cond:creep});
  /* --- Wallace Creek --- */
  const cp=SA_META.C.creekPts, near=(w0)=>cp.reduce((a,b)=>Math.abs(b[1]-w0)<Math.abs(a[1]-w0)?b:a);
  const up=near(240), dn=near(-250);
  addLabel('Pazifische Platte','plate',()=>state.view==='section'?WP('C',SCL.C.bs0,-330,2.4):WP('C',430,-330,0.2),[5],{point:false,prio:8});
  addLabel('Nordamerikanische Platte','plate',()=>state.view==='section'?WP('C',SCL.C.bs0,330,2.4):WP('C',430,380,0.5),[5],{point:false,prio:8});
  addLabel('San-Andreas-Verwerfung','k',()=>WP('C',600,C.wf(600),0.1),[5],{prio:7});
  addLabel('Fluss','w',()=>WP('C',up[0],up[1],0.08),[5],{prio:7,cond:()=>state.creek});
  LB.off=addLabel('Versatz','y',()=>{ const a=SA_META.C.creekUp-dispSC/2, b=SA_META.C.creekDn+dispSC/2; const p=WP('C',0,C.wf(0),0.08); p[0]=C.X((a+b)/2); return p; },[5],{prio:10});
  addLabel('Temblor Range<small>Ausläufer</small>','',()=>WP('C',-520,470,0.3),[5],{point:false,prio:3});
  addLabel('Carrizo-Ebene','',()=>WP('C',-560,-420,0.1),[5],{point:false,prio:3});
}
const LB={};

/* ===================== Szene aktualisieren ===================== */
function update(){
  const t=state.t; st=stateAt(t,state.mode); const ph=st.ph, live=state.playing||state.film;
  /* Maßstab wechseln (mit kurzer Abblende, wenn die Animation läuft) */
  if(st.scale!==shown&&!pendingScale){ if(live&&shown&&!REDUCED&&!state.film&&NEXT[shown]===st.scale){ pendingScale=st.scale; zoomInto(shown,st.scale); }
    else if(live&&shown&&!REDUCED){ pendingScale=st.scale; $('fade').classList.add('on'); setTimeout(()=>{ showScale(pendingScale); pendingScale=null; $('fade').classList.remove('on'); state.dirty=true; },340); } else showScale(st.scale); }
  /* Kalifornien: einfache Linie, Abschnitte nur bei „Alle“ */
  if(AX.simple){ const all=state.lvl==='all'&&!state.film; AX.simple.forEach(m=>m.visible=!all); AX.line.visible=AX.dark.visible=BX.south.visible=BX.southDark.visible=all; }
  /* --- Erdkugel: von Luxemburg nach Kalifornien drehen --- */
  if(shown==='G'&&!pendingScale&&(state.film||(state.autoCam&&state.view==='oblique'))&&!tween&&lastGT!==t){ lastGT=t; const [lo,la,gd]=GLON(t); CAMS.g_t=gpose(lo,la,gd); const a=camPose('g_t'); camera.position.copy(a.p1); controls.target.copy(a.t1); needsRender=true; }
  if(GX.atm){ const k=clamp((camera.position.length()/RG-2.15)/0.4,0,1); GX.atm.uniforms.uA.value=k; GX.mat.uniforms.uSpec.value=k; }
  if(GX.mat) GX.mat.uniforms.uSun.value.copy(camera.position).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),-0.5).add(new THREE.Vector3(0,0.35,0)).normalize();
  /* --- Regionalmodell --- */
  { const U=UNI.B, S=SCL.B, kx=S.k*XB; let F=0,S0=0,S1=0,front=1e9,tense=0,glow=0,waveR=-10,waveA=0,waveT=0;
    if(ph===2){ F=st.F; S0=S1=st.S1; tense=st.creep?0:clamp(st.F/F_CYCLE,0,1); front=st.creep?1e9:-1e9; }
    else if(ph===3){ F=st.F; S0=st.S0; S1=st.S1; front=st.front; tense=st.creep?0:clamp(st.deficit/F_CYCLE,0,1); if(!st.creep&&st.sec>=0){ const u0=(t-T2)/(T3-T2), u=st.stage===3?(u0-0.62)/0.38:u0/0.36, fade=1-sstep(0.7,0.96,u); glow=st.front<S.bs1+RISE_B?1:0; waveR=WAVE_V*st.wsec*S.k; waveA=0.3*fade; waveT=2.4*fade; } }
    else if(ph===4){ F=F_CYCLE; S0=S1=F_CYCLE; }
    U.uF.value=F*kx; U.uS0.value=S0*kx; U.uS1.value=S1*kx; U.uFront.value=front>1e8?1e6:(front<-1e8?-1e6:S.X(front));
    U.uTense.value=tense; U.uGlow.value=glow; U.uWaveR.value=waveR; U.uWaveAmp.value=REDUCED?0:waveA; U.uWaveTint.value=waveT; U.uEpi.value.set(S.X(B_HYP_S),S.Z(S.wf(B_HYP_S)));
    U.uLineOn.value=0; U.uFaultOn.value=state.fault?1:0;
    DEF.B.F=F; DEF.B.S0=S0; DEF.B.S1=S1; DEF.B.front=front; updateLines();
    if(live&&ph===3&&!st.creep&&st.quakeNow&&state.shake&&!REDUCED){ shakeAmp=Math.max(shakeAmp,0.55); if(lastSecB<0&&st.sec>=0){ vp.classList.remove('shake'); void vp.offsetWidth; vp.classList.add('shake'); } }
    lastSecB=ph===3?st.sec:-1; }
  /* --- Wallace Creek --- */
  { const U=UNI.C, S=SCL.C, k=S.k; const T=ph===4?st.T:Y0, creep=st.creep;
    const Ftot=creep?S_TOT:farC(0), F=(ph===4?st.F:(creep?0:farC(Y0)))-Ftot, target=(ph===4?st.S1:0)-S_TOT;
    if(live&&ph===4&&shown==='C'){ if(lastYearC!==null&&!creep){ for(const q of QUAKES){ if(q.T>lastYearC&&q.T<=T){ flashC=1; if(state.shake&&!REDUCED) shakeAmp=Math.max(shakeAmp,0.2); if(q.T===LASTQ&&!state.film) toast('1857: Fort-Tejon-Erdbeben – das bisher letzte große Erdbeben an diesem Abschnitt.',4200); } } } lastYearC=T;
      dispSC+=(target-dispSC)*(1-Math.exp(-frameDt*16)); if(Math.abs(target-dispSC)<0.02) dispSC=target; else state.dirty=true; }
    else { dispSC=target; lastYearC=null; flashC=0; }
    if(flashC>0.01){ flashC*=Math.exp(-frameDt*3.4); state.dirty=true; } else flashC=0;
    U.uF.value=F*k; U.uS0.value=U.uS1.value=dispSC*k; U.uFront.value=-1e6; U.uFlash.value=flashC;
    U.uTense.value=creep?0:clamp((st.F-st.S1)/7.5,0,1)*0.9*(ph===4?1:0);
    U.uLineOn.value=0; U.uFaultOn.value=state.fault?1:0; U.uCreekOn.value=0;
    const xu=S.X(SA_META.C.creekUp-dispSC/2), xd=S.X(SA_META.C.creekDn+dispSC/2); U.uCreekSeg.value.set(Math.min(xu,xd),Math.max(xu,xd));
    DEF.C.F=F; DEF.C.S0=DEF.C.S1=dispSC; if(shown==='C') updateCreek(); }
  /* Pfeile */
  for(const a of arrows){ a.mesh.visible=state.arrows&&!(pendingScale&&a.key===shown); if(a.key==='B'||a.key==='C') placeArrow(a,a.s,a.w,a.dir,a.lift); }
  /* Beschriftungen */
  for(const L of labels){ L.vis=state.labels&&!pendingScale&&L.phases.includes(st.scale==='G'?0:ph+1)&&(!L.cond||L.cond()); }
  if(LB.off){ const off=Math.round(S_TOT+dispSC); setLabelHTML(LB.off,off<2?'Der Fluss fließt gerade über die Verwerfung':`Versatz: ${off} m`); }
  updateHUD(t,ph);
}

/* ===================== Anzeige ===================== */
let curPhaseShown=-1, curCreepShown=null;
function updateHUD(t,ph){
  if(st.scale==='G'){ $('clockTitle').textContent='Einordnung · Wo liegt Kalifornien?'; $('clockTime').textContent=t<0.4?'Start: Luxemburg':'Blick nach Kalifornien'; const pl=$('clockPill'); pl.className='pill mid'; pl.textContent='Die Erde';
    $('meter').hidden=true; $('exnote').hidden=true; const sl=$('time'); if(document.activeElement!==sl) sl.value=Math.round(t/TEND*1000); sl.setAttribute('aria-valuetext','Einordnung: die Erde');
    document.querySelectorAll('.tick').forEach(b=>b.classList.toggle('cur',b.classList.contains('gtick'))); bandEls.forEach(b=>b.classList.remove('cur','done')); gBand.classList.add('cur');
    if(curPhaseShown!==-1) showPhase(-1); return; }
  gBand.classList.remove('cur'); gBand.classList.add('done');
  const P=PH[ph], PX=(st.creep&&CREEP_X[ph])||P; $('clockTitle').textContent=`Phase ${P.n} · ${PX.short||P.short}`;
  let txt='', mTxt='', mLab='', mK=0;
  const prog=ph===3&&!st.creep?(st.sec<0?0:clamp((st.front-B_HYP_S)/SCL.B.len,0,1)):0;
  const line=(D,F,S)=>`Rückstand ${de(D,1)} m = Platten ${de(F,1)} m − Versatz ${de(S,1)} m`;
  if(ph===0){ txt='Westen Nordamerikas heute'; }
  else if(ph===1){ txt='Kalifornien heute'; }
  else if(ph===2){ txt=`Jahr ${Math.round(st.year/5)*5} – ${st.creep?'die Platten gleiten':'die Spannung wächst'}`; const S=st.creep?st.F:0; mK=(st.F-S)/F_CYCLE; mLab=st.creep?'Keine Spannung':'Spannung wächst'; mTxt=line(st.F-S,st.F,S); }
  else if(ph===3){ if(st.creep){ txt=`Jahr ${Math.round(st.year/5)*5} – nichts Besonderes geschieht`; mLab='Keine Spannung'; mTxt=line(0,st.F,st.F); }
    else if(st.stage===2){ const y=Math.round((st.year-CYCLE_Y)/5)*5; txt=`Jahr ${y} nach dem 1. Erdbeben – die Spannung wächst wieder`; const S=st.S1; mK=(st.F-S)/F_CYCLE; mLab='Spannung wächst wieder'; mTxt=line(st.F-S,st.F,S); }
    else { const n=st.stage===3?2:1, S=st.S0+F_CYCLE*prog; txt=st.sec<0?(n===2?'Jahr 150 nach dem 1. Erdbeben – kurz vor dem 2. Erdbeben':'Jahr 150 – kurz vor dem 1. Erdbeben'):(prog<1?`${n}. Erdbeben · ${Math.round(st.sec)} Sekunden nach Bruchbeginn`:`nach dem ${n}. Erdbeben`); mK=1-prog; mLab=st.sec<0?'Spannung maximal':(prog<1?'Spannung wird abgebaut':'Spannung abgebaut'); mTxt=line(st.F-S,st.F,S); } }
  else { const yrs=Math.round(-st.T/10)*10; txt=(yrs<=0?'heute':`vor ${de(yrs)} Jahren`); const d=st.creep?0:Math.max(0,st.F-st.S1); mK=d/8; mLab=st.creep?'Keine Spannung':'Spannung';
    mTxt=`Rückstand ${de(d,1)} m · Versatz des Flusses ${de(st.S1,0)} m · ${st.creep?'keine starken Erdbeben':(st.nQ===1?'1 starkes Erdbeben':st.nQ+' starke Erdbeben')}`; }
  $('clockTime').textContent=txt; const pl=$('clockPill'); const pp=(ph===3&&!st.creep&&st.stage===2)?['mid','Zeitraffer: 150 Jahre']:P.pill; pl.className='pill '+pp[0]; pl.textContent=pp[1];
  $('meter').hidden=ph<=1; $('meter').classList.toggle('big',ph===2||ph===3); $('meter').classList.toggle('glow',!st.creep&&((ph===3&&st.hold)||(ph===2&&st.year>CYCLE_Y*0.93))); $('meterBar').style.width=(clamp(mK,0,1)*100)+'%'; $('meterLab').textContent=mLab; $('meterTxt').textContent=mTxt;
  const ex=$('exnote'); ex.hidden=ph===1; ex.textContent=ph===0?'Berge 20-fach, Meerestiefen 7-fach überhöht':ph===4?'Echtes Gelände und Luftbild · Versatz in echter Größe':'Verformung 3000-fach überhöht';
  const sl=$('time'); if(document.activeElement!==sl) sl.value=Math.round(t/TEND*1000);
  sl.setAttribute('aria-valuetext',`Phase ${P.n}: ${P.name}`);
  document.querySelectorAll('.tick:not(.gtick)').forEach((b,i)=>b.classList.toggle('cur',i===ph)); document.querySelector('.gtick').classList.remove('cur');
  bandEls.forEach((b,i)=>{ b.classList.toggle('cur',i===ph); b.classList.toggle('done',i<ph); });
  if(curPhaseShown!==ph||curCreepShown!==st.creep) showPhase(ph);
  updateChart(ph);
}
function showPhase(ph){
  const first=curPhaseShown!==ph; curPhaseShown=ph; curCreepShown=st.creep; const P=ph<0?GLOBE:PH[ph];
  const X=(ph>=0&&st.creep&&CREEP_X[ph])||P;
  $('exStep').textContent=ph<0?'Einordnung · Die Erde':`Phase ${P.n} von 5 · ${P.pill[1]}`; $('exTitle').textContent=X.name||P.name; $('exText').textContent=X.text; $('exLook').textContent=X.look;
  $('keyV').textContent=X.kv; $('keyL').textContent=X.kl; $('taskQ').textContent=P.q; $('taskA').textContent=P.a; if(first) $('taskD').open=false;
  document.querySelectorAll('.phase').forEach((b,i)=>b.setAttribute('aria-current',i===ph?'step':'false'));
  buildChart(ph);
  if(ph>=0&&first&&state.autoCam&&state.view==='oblique'&&!state.film&&shown===scaleOfPhase(ph)&&!pendingScale) camTo(phaseCam(ph));
}

/* ===================== Diagramm: Weg der Platten und Versatz an der Verwerfung ===================== */
const CW=320, CH=132, CX0=34, CX1=312, CY0=14, CY1=104; let chartMode=null;
function chartDef(ph){ if(ph===4) return {mode:'long'+(st.creep?'c':''),x0:Y0,x1:0,ymax:145,
    far:T=>st.creep?S_TOT*(T-Y0)/(0-Y0):farC(T),slip:T=>st.creep?S_TOT*(T-Y0)/(0-Y0):slipC(T),steps:st.creep?[]:QUAKES.map(q=>q.T),xt:[[Y0,'vor 3.700 J.','start'],[-1850,'vor 1.850 J.','middle'],[0,'heute','end']],yt:[[0,'0 m'],[65,'65 m'],[130,'130 m']]};
  return {mode:'cyc'+(st.creep?'c':''),x0:0,x1:330,ymax:12,far:y=>RATE*y,slip:y=>st.creep?RATE*y:(y>=2*CYCLE_Y?2*F_CYCLE:(y>=CYCLE_Y?F_CYCLE:0)),steps:st.creep?[]:[CYCLE_Y,2*CYCLE_Y],xt:[[0,'Jahr 0','start'],[150,'150','middle'],[300,'300','middle']],yt:[[0,'0 m'],[5,'5 m'],[10,'10 m']]}; }
let CD=null;
function buildChart(ph){ const d=chartDef(ph); if(d.mode===chartMode) return; chartMode=d.mode; CD=d;
  const X=x=>CX0+(CX1-CX0)*(x-d.x0)/(d.x1-d.x0), Y=y=>CY1-(CY1-CY0)*y/d.ymax; d.X=X; d.Y=Y;
  let pf='', ps='', n=240, prev=null; const xs=[]; for(let i=0;i<=n;i++) xs.push(lerp(d.x0,d.x1,i/n)); for(const s of d.steps){ xs.push(s-1e-6,s); } xs.sort((a,b)=>a-b);
  for(const x of xs){ pf+=(pf?'L':'M')+X(x).toFixed(1)+','+Y(d.far(x)).toFixed(1); ps+=(ps?'L':'M')+X(x).toFixed(1)+','+Y(d.slip(x)).toFixed(1); }
  let gap=pf; for(let i=xs.length-1;i>=0;i--) gap+='L'+X(xs[i]).toFixed(1)+','+Y(d.slip(xs[i])).toFixed(1); gap+='Z';
  let ax=`<line class="ax" x1="${CX0}" y1="${CY1}" x2="${CX1}" y2="${CY1}" style="stroke-dasharray:none"/>`;
  for(const [v,l] of d.yt) ax+=`<line class="ax" x1="${CX0}" y1="${Y(v)}" x2="${CX1}" y2="${Y(v)}"/><text class="tx" x="${CX0-4}" y="${Y(v)+3}" text-anchor="end">${l}</text>`;
  for(const [v,l,a] of d.xt) ax+=`<line class="ax" x1="${X(v)}" y1="${CY1}" x2="${X(v)}" y2="${CY1+4}" style="stroke-dasharray:none"/><text class="tx" x="${X(v)}" y="${CY1+15}" text-anchor="${a}">${l}</text>`;
  if(d.mode==='cyc') ax+=`<text class="tx" x="${X(CYCLE_Y)+3}" y="${Y(2.6)}" style="fill:#F0874A">Erdbeben</text>`;
  $('chartSvg').innerHTML=`${ax}<path class="gap" d="${gap}"/><path class="ln" d="${pf}"/><path class="ln2" d="${ps}"/>
    <text class="tx lg" x="${CX0+4}" y="${CY0+2}" style="fill:#6FC3F0">— Platten, weit entfernt</text><text class="tx lg" x="${CX0+4}" y="${CY0+14}" style="fill:#FFC83D">— Versatz an der Verwerfung</text>
    <line class="cur" id="cCur" x1="0" y1="${CY0-6}" x2="0" y2="${CY1}"/><circle class="dot" id="cDotF" r="3.2" style="fill:#6FC3F0"/><circle class="dot" id="cDotS" r="3.2" style="fill:#FFC83D"/>`;
}
function updateChart(ph){ if(!CD) return; const c=$('cCur'); if(!c) return; let x, f, s;
  if(ph===4){ x=st.T; f=CD.far(x); s=st.creep?f:st.S1; }
  else { x=ph<=1?0:st.year; f=ph<=1?0:st.F; s=ph<=2?(st.creep?f:0):(st.creep?f:st.F-st.deficit); }
  const X=CD.X(x); c.setAttribute('x1',X); c.setAttribute('x2',X); const a=$('cDotF'), b=$('cDotS'); a.setAttribute('cx',X); a.setAttribute('cy',CD.Y(f)); b.setAttribute('cx',X); b.setAttribute('cy',CD.Y(s)); }

/* ===================== Kamera ===================== */
const NORTH=[0.743,0.669];
const topCam=(tx,tz,h)=>({p:[tx-NORTH[0]*h*0.04,h,tz-NORTH[1]*h*0.04],t:[tx,0,tz]});
const gpose=(lo,la,dist,tgt=0)=>{ const d=gdir(lo,la); return {p:d.clone().multiplyScalar(RG*dist).toArray(),t:d.clone().multiplyScalar(RG*tgt).toArray()}; };
const GLON=t=>{ const u=sstep(0.9,TG-1.8,t); return [lerp(6,-119.4,u),lerp(48,37.3,u),1.75+(3.6-1.75)*sstep(0.3,1.9,t)-(3.6-1.42)*sstep(TG-2.9,TG-0.3,t)]; };
const CAMS={
  g_eu:gpose(6,48,1.75), g_ca:gpose(-119.4,37.3,1.42), g_t:gpose(6,48,1.75), g_top:gpose(-119.4,37.3,1.42), g_near:gpose(-119.5,36.8,1.12,1),
  w_top:topCam(0,0.6,36), w_obl:{p:[-11.5,17,-19],t:[0.2,0,1.4]}, w_low:{p:[-24,4.5,-2],t:[0,0,0.8]}, w_zoom:{p:[-3.2,6.2,-6.5],t:[1.0,0,0.6]}, w_south:{p:[-15,7,-8.5],t:[-7.5,0,0.5]}, w_north:{p:[1.5,6.5,-8.5],t:[6.5,0,2.4]},
  a_top:topCam(0.6,0.2,36), a_obl:{p:[-11.5,25,-16.5],t:[0.4,0,0.6]}, a_fault:{p:[-13,8.5,-6.5],t:[1.5,0,0.8]}, a_zoom:{p:[-4.3,4.6,-4.5],t:[-0.45,0,-0.55]}, a_low:{p:[-21,7,-3],t:[0,0,0.5]},
  b_obl:{p:[-29,14,-14],t:[0.4,-2.5,0.3]}, b_top:topCam(0,0,38), b_sec:{p:[-34,-1.2,0],t:[0,-2.6,0]}, b_quake:{p:[-28,11,-9.5],t:[1.0,-2.6,0.2]}, b_near:{p:[-18.5,5.2,-6.2],t:[-6.5,-1.6,0.2]},
  c_obl:{p:[-24.5,15.5,-16.5],t:[-1.9,-0.9,-0.5]}, c_top:topCam(0,0,33), c_sec:{p:[-36,0.2,0],t:[0,-1.1,0]}, c_creek:{p:[-2.6,5.4,-7.2],t:[-0.6,0,0.7]}
};
const VIEWS={oblique:{G:'g_t',W:'w_obl',A:'a_obl',B:'b_obl',C:'c_obl'},top:{G:'g_top',W:'w_top',A:'a_top',B:'b_top',C:'c_top'},section:{G:'g_ca',W:'w_low',A:'a_low',B:'b_sec',C:'c_sec'},near:{G:'g_top',W:'w_zoom',A:'a_zoom',B:'b_near',C:'c_creek'}};
const phaseCam=ph=>['w_obl','a_obl','b_obl','b_quake','c_obl'][ph];
let tween=null, freeAspect=1.6, xfadeAt=null, bRefD=0;
function camPose(key,far=1){ const c=CAMS[key], t1=new THREE.Vector3(...c.t), p1=new THREE.Vector3(...c.p);
  const kA=Math.pow(clamp(1.55/freeAspect,1.0,2.6),0.92)*far*(state.film?1.16:1); p1.sub(t1).multiplyScalar(kA).add(t1); return {p1,t1}; }
function camTo(key,dur=1.3){ if(!CAMS[key]) return; const {p1,t1}=camPose(key); tween={p0:camera.position.clone(),t0:controls.target.clone(),p1,t1,s:performance.now(),d:(REDUCED?0.01:dur)*1000}; }
function desiredCam(){ if(state.film&&film.cam&&film.cam[0].toUpperCase()===shown) return film.cam; if(state.view==='oblique') return state.autoCam||!shown?phaseCam(st.ph):VIEWS.oblique[shown]; return VIEWS[state.view][shown]; }
/* Hineinzoomen: Die Kamera fliegt im großen Maßstab auf den Ausschnitt zu, dann wird ohne Sprung auf den kleinen Maßstab umgeschaltet. */
const NEXT={G:'W',W:'A',A:'B',B:'C'};
function zoomInto(from,to){
  if(from==='G'){ const e=camPose('g_near',1); controls.minDistance=0.01; tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:e.p1,t1:e.t1,s:performance.now(),d:1900,zoom:true};
    xfadeAt={to,at:performance.now()+1850}; return; }
  const T=SCL[to], ck=(state.view==='oblique'&&state.autoCam)?phaseCam(phaseAt(state.t)):VIEWS[state.view][to], key=CAMS[ck]&&ck[0].toUpperCase()===to?ck:VIEWS.oblique[to];
  const end=camPose(key,1.32), cT=new THREE.Vector3(...WP(to,T.sc,T.wc,0)), cF=new THREE.Vector3(...WP(from,T.sc,T.wc,0)), r=SCL[from].k/T.k;
  const pF=end.p1.clone().sub(cT).multiplyScalar(r).add(cF), tF=end.t1.clone().sub(cT).multiplyScalar(r).add(cF);
  const d0=camera.position.distanceTo(controls.target), d1=pF.distanceTo(tF), dur=clamp(0.9+0.35*Math.log2(Math.max(1,d0/d1)),1.2,2.4);
  controls.minDistance=0.01; state.dirty=true;
  tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:pF,t1:tF,s:performance.now(),d:dur*1000,zoom:true};
  xfadeAt={to,at:performance.now()+dur*1000};
}
function showScale(key){ shown=key; for(const k in G) G[k].visible=k===key;
  controls.minDistance=key==='C'?1.3:(key==='G'?RG*1.08:2.2); lastGT=null; hudStamp=0;
  let ck=desiredCam(); if(!CAMS[ck]||ck[0].toUpperCase()!==key) ck=VIEWS.oblique[key];
  const a=camPose(ck,REDUCED?1:1.32); camera.position.copy(a.p1); controls.target.copy(a.t1); camTo(ck,1.7); needsRender=true; }
function setView(v){ state.view=v; state.dirty=true; document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));
  camTo(v==='oblique'&&state.autoCam?phaseCam(st.ph):VIEWS[v][shown],1.1);
  if(v==='section') note(shown==='A'||shown==='W'?'Flacher Blick entlang der Verwerfung nach Nordwesten.':'Schnittfläche quer zur Verwerfung: links die Pazifische, rechts die Nordamerikanische Platte.',3800); else $('viewnote').hidden=true; }
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view===state.view&&b.dataset.view!=='oblique'?'oblique':b.dataset.view)));
function zoom(f){ const d=camera.position.clone().sub(controls.target); d.multiplyScalar(f); d.setLength(clamp(d.length(),controls.minDistance,controls.maxDistance)); camera.position.copy(controls.target).add(d); needsRender=true; }
$('zin').onclick=()=>zoom(0.8); $('zout').onclick=()=>zoom(1.25);
controls.addEventListener('start',()=>{ tween=null; });
let toastTimer=null;
function toast(msg,ms=2800){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),ms); }
let noteTimer=null;
function note(msg,ms){ const el=$('viewnote'); el.textContent=msg; el.hidden=false; clearTimeout(noteTimer); if(ms) noteTimer=setTimeout(()=>el.hidden=true,ms); }
/* Maßstabsleiste und Nordpfeil */
const _a=new THREE.Vector3(), _b=new THREE.Vector3();
function updateScaleBar(){ if(!shown) return; const H=vp.clientHeight, dist=shown==='G'?Math.max(0.01,camera.position.length()-RG):camera.position.distanceTo(controls.target); const mpp=2*dist*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/H/(shown==="G"?RG/6.371e6:SCL[shown].k);
  const want=mpp*120, e=Math.pow(10,Math.floor(Math.log10(want))), m=want/e, nice=(m>=5?5:(m>=2?2:1))*e;
  $('sbBar').style.width=(nice/mpp).toFixed(0)+'px'; $('sbTxt').textContent=nice>=1000?`${de(nice/1000,nice<1000?1:0)} km`:`${de(nice)} m`;
  _a.copy(controls.target).project(camera); _b.set(controls.target.x+NORTH[0],controls.target.y,controls.target.z+NORTH[1]).project(camera);
  const ang=Math.atan2((_b.x-_a.x)*camera.aspect,(_b.y-_a.y))*180/Math.PI; $('needle').setAttribute('transform',`rotate(${ang.toFixed(1)})`); $('compass').style.visibility=shown==='G'?'hidden':''; }

/* ===================== Steuerung ===================== */
const app=$('app'), ticks=$('ticks'), bandEls=[];
const gBand=document.createElement('span'); gBand.style.flex=`${TG} 0 0`; gBand.style.background=GLOBE.c; $('bands').appendChild(gBand);
{ const b=document.createElement('button'); b.className='tick gtick'; b.type='button'; b.style.setProperty('--c',GLOBE.c); b.style.left='0%'; b.style.width=(TG/TEND*100)+'%'; b.innerHTML='<b>🌍</b>Erde'; b.title='Einordnung: Wo liegt Kalifornien?'; b.onclick=()=>{ pause(); state.stopAt=null; setTime(0); }; ticks.appendChild(b); }
PH.forEach((P,i)=>{ const sp=document.createElement('span'); sp.style.flex=`${P.t1-P.t0} 0 0`; sp.style.background=P.c; $('bands').appendChild(sp); bandEls.push(sp);
  const b=document.createElement('button'); b.className='tick'; b.type='button'; b.style.setProperty('--c',P.c); b.style.left=(P.t0/TEND*100)+'%'; b.style.width=((P.t1-P.t0)/TEND*100)+'%';
  b.innerHTML=`<b>${P.n}</b>${P.short}`; b.setAttribute('aria-label',`Phase ${P.n}: ${P.name}`); b.title=`Phase ${P.n}: ${P.name}`; b.onclick=()=>gotoPhase(i,true); ticks.appendChild(b);
  const li=document.createElement('li'), pb=document.createElement('button'); pb.className='phase'; pb.type='button'; pb.textContent=P.n; pb.title=`Phase ${P.n}: ${P.name}`; pb.setAttribute('aria-label',`Phase ${P.n}: ${P.name}`); pb.onclick=()=>gotoPhase(i,true); li.appendChild(pb); $('phases').appendChild(li); });
function setTime(t){ state.t=clamp(t,0,TEND); state.dirty=true; }
function play(){ if(state.t>=TEND-1e-3) setTime(0); state.playing=true; syncButtons(); }
function pause(){ state.playing=false; state.stopAt=null; syncButtons(); }
function syncButtons(){ $('playIcon').setAttribute('d',state.playing?'M7 5h4v14H7zM13 5h4v14h-4z':'M8 5v14l11-7z'); $('bPlay').setAttribute('aria-label',state.playing?'Pause':'Start'); }
const endOf=i=>i<4?PH[i].t1-0.02:PH[i].t1;      /* Halt kurz vor dem Phasenende: Bild und Text der Phase bleiben stehen */
function gotoPhase(i,andPlay){ i=clamp(i,0,4); setTime(PH[i].t0+(i===0?0:0.001)); state.stopAt=i===2?T1+0.05:(i===4?T3+0.05:endOf(i)); if(andPlay) state.playing=true; syncButtons(); }
$('bPlay').onclick=()=>{ if(state.playing) pause(); else { state.stopAt=null; play(); } };
$('bNext').onclick=()=>{ const ph=phaseAt(state.t); if(state.t>=TEND-0.01) return; const nx=(state.t<PH[ph].t0+0.05&&!state.playing)?ph:ph+1; if(nx>4){ setTime(TEND); pause(); return; } gotoPhase(nx,true); };
$('bPrev').onclick=()=>{ const ph=phaseAt(state.t); const pv=(state.t>PH[ph].t0+0.6)?ph:ph-1; gotoPhase(Math.max(0,pv),true); };
$('bReset').onclick=()=>{ pause(); setTime(0); state.view='oblique'; document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='oblique'))); if(shown==='W') camTo('w_obl'); };
$('speed').onchange=e=>state.speed=+e.target.value;
$('stopEach').onchange=e=>state.stopEach=e.target.checked;
$('time').addEventListener('input',e=>{ pause(); setTime(e.target.value/1000*TEND); });
document.querySelectorAll('input[name=lvl]').forEach(r=>r.addEventListener('change',e=>{ state.lvl=e.target.value; state.labels=state.lvl!=='off'; state.dirty=true; }));
for(const [id,key] of [['tArrows','arrows'],['tLines','lines'],['tFault','fault'],['tCreek','creek'],['tShake','shake']]) $(id).onchange=e=>{ state[key]=e.target.checked; state.dirty=true; };
$('tCam').onchange=e=>{ state.autoCam=e.target.checked; if(state.autoCam&&state.view==='oblique') camTo(phaseCam(st.ph)); };
function setMode(m,quiet){ state.mode=m; const inp=document.querySelector(`input[name=mode][value=${m}]`); if(inp) inp.checked=true; document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===m))); chartMode=null; state.dirty=true;
  relabelTicks(); if(!quiet){ const ph=phaseAt(state.t); gotoPhase(ph===4?4:2,true); state.stopAt=ph===4?endOf(4):endOf(3); } }
function relabelTicks(){ document.querySelectorAll('.tick:not(.gtick)').forEach((b,i)=>{ const X=(state.mode==='creep'&&CREEP_X[i])||PH[i]; b.innerHTML=`<b>${PH[i].n}</b>${X.short||PH[i].short}`; }); }
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{ if(state.mode!==b.dataset.mode) setMode(b.dataset.mode); }));
document.querySelectorAll('input[name=mode]').forEach(r=>r.addEventListener('change',e=>{ if(state.film) filmEnd(); setMode(e.target.value); }));
function selectTab(k){ for(const b of document.querySelectorAll('.tabs button')){ const on=b.id==='tab-'+k; b.setAttribute('aria-selected',String(on)); $(b.getAttribute('aria-controls')).hidden=!on; } }
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>selectTab(b.id.slice(4))));
function togglePanel(){ const off=app.classList.toggle('nopanel'); $('bPanel').textContent=off?'Bedienfeld ein':'Bedienfeld aus'; resize(); }
$('bPanel').onclick=togglePanel;
function toggleFull(){ const d=document, el=app; if(d.fullscreenElement||d.webkitFullscreenElement){ (d.exitFullscreen||d.webkitExitFullscreen).call(d); } else { const f=el.requestFullscreen||el.webkitRequestFullscreen; if(f){ const r=f.call(el); if(r&&r.catch) r.catch(()=>toast('Vollbild ist hier nicht verfügbar.')); } else toast('Vollbild ist hier nicht verfügbar.'); } }
$('bFull').onclick=toggleFull;
document.addEventListener('keydown',e=>{ if(e.target.closest('select,textarea')||(e.target.closest('input')&&e.target.type==='range'&&e.key.startsWith('Arrow'))) return; if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(state.film){ if(e.key==='Escape'||e.key==='e'||e.key==='E'){ filmEnd(); } else if(e.code==='Space'){ e.preventDefault(); $('fPlay').click(); } else if(e.key==='ArrowRight'){ $('fNext').click(); } else if(e.key==='ArrowLeft'){ $('fPrev').click(); } return; }
  if(e.code==='Space'&&!e.target.closest('button,input')){ e.preventDefault(); $('bPlay').click(); }
  else if(e.key==='ArrowRight'){ $('bNext').click(); } else if(e.key==='ArrowLeft'){ $('bPrev').click(); }
  else if(e.key>='1'&&e.key<='5'&&!e.target.closest('input')){ gotoPhase(+e.key-1,true); }
  else if(e.key==='f'||e.key==='F'){ toggleFull(); } else if(e.key==='b'||e.key==='B'){ togglePanel(); } else if(e.key==='e'||e.key==='E'){ filmStart(); } else if(e.key==='v'||e.key==='V'){ setMode(state.mode==='creep'?'lock':'creep'); } });

/* ===================== Erklärfilm ===================== */
const film={ch:0,sh:0,el:0,dur:1,paused:false,wait:false,speaking:false,ended:false,cam:null};
const shotDur=s=>Math.max(2.2+s.text.length*0.07,(s.b-s.a)*1.0);
$('chapters').innerHTML=FILM.map((c,i)=>`<button type="button" data-ch="${i}" title="${c.title}">${c.title}</button>`).join('');
$('chapters').querySelectorAll('button').forEach(b=>b.onclick=()=>filmShot(+b.dataset.ch,0));
function speak(text){ film.speaking=false; if(!('speechSynthesis' in window)) return; speechSynthesis.cancel(); if(!$('fVoice').checked) return;
  const u=new SpeechSynthesisUtterance(text.replace(/–/g,',')); u.lang='de-DE'; const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.startsWith('de')); if(v) u.voice=v; u.rate=0.95;
  film.speaking=true; const sh=film.sh, ch=film.ch; const done=()=>{ if(film.sh===sh&&film.ch===ch) film.speaking=false; }; u.onend=done; u.onerror=done; setTimeout(done,(film.dur+6)*1000); speechSynthesis.speak(u); }
let preFilm=null;
function filmStart(){ if(state.film) return; pause(); preFilm={mode:state.mode,t:state.t,view:state.view}; if(state.mode!=='lock') setMode('lock',true);
  state.film=true; state.view='oblique'; app.classList.add('film'); $('bFilm').textContent='■ Film beenden'; $('cap').hidden=false; $('cinenav').hidden=false; $('dock').hidden=true; $('viewnote').hidden=true; resize(); hudStamp=0; filmShot(0,0); }
function filmShot(ch,sh){ film.ch=ch; film.sh=sh; const s=FILM[ch].shots[sh]; film.el=0; film.dur=shotDur(s); film.paused=false; film.wait=false; film.ended=false; film.cam=s.cam;
  state.t=s.a; state.dirty=true; $('capCh').textContent=FILM[ch].title; $('capTx').textContent=s.text; if(s.cam[0]!=='g'&&s.cam[0].toUpperCase()===shown&&scaleOfPhase(phaseAt(s.a))===shown) camTo(s.cam,2.2); else if(s.cam[0]==='g') lastGT=-1; speak(s.text);
  $('fPlay').textContent='Pause'; $('chapters').querySelectorAll('button').forEach((b,i)=>{ b.classList.toggle('cur',i===ch); b.classList.toggle('done',i<ch); }); }
function filmStep(dt){ if(film.paused||film.wait) return; film.el+=dt; const s=FILM[film.ch].shots[film.sh], u=clamp(film.el/film.dur,0,1);
  const nt=s.a+(s.b-s.a)*u; if(nt!==state.t){ state.t=nt; state.dirty=true; }
  $('fProg').style.width=((film.sh+u)/FILM[film.ch].shots.length*100).toFixed(1)+'%';
  if(u>=1&&!film.speaking){
    if(film.sh+1<FILM[film.ch].shots.length) filmShot(film.ch,film.sh+1);
    else if(film.ch+1<FILM.length){ if($('fStop').checked){ film.wait=true; $('fPlay').textContent='Weiter ▶'; } else filmShot(film.ch+1,0); }
    else { film.wait=true; film.ended=true; $('fPlay').textContent='Noch einmal ↺'; } } }
function filmEnd(){ if(!state.film) return; state.film=false; film.cam=null; app.classList.remove('film'); $('bFilm').textContent='▶ Erklärfilm'; $('cap').hidden=true; $('cinenav').hidden=true; $('dock').hidden=false; resize();
  if(preFilm&&preFilm.mode!==state.mode) setMode(preFilm.mode,true);
  if('speechSynthesis' in window) speechSynthesis.cancel(); hudStamp=0; curPhaseShown=-1; state.dirty=true; if(shown&&state.autoCam) camTo(phaseCam(phaseAt(state.t))); syncButtons(); }
$('bFilm').onclick=()=>{ if(state.film) filmEnd(); else filmStart(); }; $('fEnd').onclick=filmEnd;
$('fPlay').onclick=()=>{ if(film.ended){ filmShot(0,0); } else if(film.wait){ filmShot(film.ch+1,0); } else { film.paused=!film.paused; $('fPlay').textContent=film.paused?'Weiter ▶':'Pause'; if(film.paused&&'speechSynthesis' in window) speechSynthesis.cancel(); } };
$('fNext').onclick=()=>{ if(film.ch+1<FILM.length) filmShot(film.ch+1,0); };
$('fPrev').onclick=()=>{ filmShot(film.el>2.5||film.sh>0?film.ch:Math.max(0,film.ch-1),0); };
$('fVoice').onchange=e=>{ if(!e.target.checked&&'speechSynthesis' in window) speechSynthesis.cancel(); else if(!('speechSynthesis' in window)){ e.target.checked=false; toast('Vorlesen wird von diesem Browser nicht unterstützt.'); } };

/* ===================== Schleife ===================== */
function resize(){ needsRender=true; hudStamp=0; const w=vp.clientWidth,h=vp.clientHeight; if(w<2||h<2) return; renderer.setSize(w,h,false); camera.aspect=w/h; if(GX.lmats) GX.lmats.forEach(m=>m.resolution.set(w,h));
  const wide=!matchMedia('(max-width:820px), (orientation:portrait) and (max-width:1100px)').matches, pw=(wide&&!state.film&&!app.classList.contains('nopanel'))?$('panel').offsetWidth+16:0, lw=wide&&!state.film?70:0, dh=state.film?150:(wide?70:60);
  camera.setViewOffset(w,h,Math.round((pw-lw)/2),Math.round(dh/2-18),w,h); freeAspect=Math.max(0.5,(w-pw-lw)/Math.max(200,h-dh-70)); camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(vp);
let last=performance.now(), needsRender=true, prevActive=false, started=false;
const fq={ema:16.7,n:0,stamp:performance.now(),blockUp:0};
controls.addEventListener('change',()=>{ needsRender=true; });
function adaptQuality(now,ft){ if(LOWQ) return; fq.ema=fq.ema*0.9+ft*0.1; fq.n++; if(now-fq.stamp<1500||fq.n<40) return; fq.stamp=now; fq.n=0;
  if(fq.ema>24&&dpr>1){ dpr=Math.max(1,dpr-0.25); renderer.setPixelRatio(dpr); resize(); fq.blockUp=now+10000; }
  else if(fq.ema<17.5&&dpr<DPR_MAX&&now>fq.blockUp){ dpr=Math.min(DPR_MAX,dpr+0.25); renderer.setPixelRatio(dpr); resize(); } }
const _sv=new THREE.Vector3();
function loop(now){
  const raw=now-last, dt=Math.min(0.1,raw/1000); last=now; frameDt=dt;
  if(!started){ requestAnimationFrame(loop); return; }
  if(state.film) filmStep(dt);
  else if(state.playing&&!pendingScale){ const prev=state.t; let nt=prev+dt*state.speed;
    let stop=state.stopAt; if(state.stopEach&&stop===null){ for(const H of [TG-0.02,T1+0.05,T3+0.05]) if(stop===null&&prev<H-1e-6&&nt>=H-1e-6) stop=H; for(let i=0;i<5;i++){ const e=endOf(i); if(prev<e-1e-6&&nt>=e-1e-6&&!(stop!==null&&stop<e)){ stop=e; break; } } }
    if(stop!==null&&nt>=stop) nt=stop; if(nt>=TEND) nt=TEND;
    state.t=nt; state.dirty=true;
    if((stop!==null&&nt>=stop-1e-6)||nt>=TEND){ state.playing=false; state.stopAt=null; syncButtons(); } }
  if(tween){ const u=clamp((now-tween.s)/tween.d,0,1), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2; camera.position.lerpVectors(tween.p0,tween.p1,e); controls.target.lerpVectors(tween.t0,tween.t1,e); if(u>=1) tween=null; needsRender=true; }
  if(shown==='B'&&LINES.built){ if(!bRefD){ const r=camPose('b_obl'); bRefD=r.p1.distanceTo(r.t1); } const wk=clamp(camera.position.distanceTo(controls.target)/bRefD,0.05,1.4);
    if(Math.abs(wk-LINES.wk)>LINES.wk*0.02){ LINES.wk=wk; UNI.B.uFaultW.value=330*SCL.B.k*Math.max(wk,0.15); updateLines(); needsRender=true; } }
  if(state.dirty){ state.dirty=false; update(); needsRender=true; }
  if(controls.update()) needsRender=true;
  if(shakeAmp>0.005){ shakeAmp*=Math.exp(-dt*4.5); needsRender=true; } else shakeAmp=0;
  const active=needsRender||state.playing||state.film||labelsMoving;
  if(active){ if(prevActive) adaptQuality(now,raw);
    let saved=null; if(shakeAmp>0){ saved=_sv.copy(camera.position); const a=shakeAmp*0.012*camera.position.distanceTo(controls.target); camera.position.x+=(Math.random()-0.5)*a; camera.position.y+=(Math.random()-0.5)*a; camera.position.z+=(Math.random()-0.5)*a; camera.updateMatrixWorld(); }
    renderer.render(scene,camera);
    if(xfadeAt&&now>=xfadeAt.at){ const xc=$('xfade'), src=renderer.domElement; xc.width=src.width; xc.height=src.height; xc.getContext('2d').drawImage(src,0,0);
      xc.classList.remove('go'); xc.classList.add('on'); const to=xfadeAt.to; xfadeAt=null; tween=null; showScale(to); pendingScale=null; state.dirty=true;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ xc.classList.add('go'); xc.classList.remove('on'); })); }
    if(saved){ camera.position.copy(saved); camera.updateMatrixWorld(); }
    if(state.labels) placeLabels(); else if(labels.some(L=>L.was)){ labels.forEach(L=>{ L.el.style.opacity='0'; L.was=false; }); lctx.clearRect(0,0,leaderCv.width,leaderCv.height); }
    updateScaleBar(); needsRender=false; prevActive=true; } else prevActive=false;
  requestAnimationFrame(loop);
}

/* ===================== Start ===================== */
function diag(msg){ let d=$('diag'); if(!d){ d=document.createElement('div'); d.id='diag'; d.className='diag'; document.body.appendChild(d); } d.textContent+=(d.textContent?'\n':'')+msg; }
window.addEventListener('error',e=>diag('Fehler: '+(e.message||e.error)));
window.addEventListener('unhandledrejection',e=>diag('Fehler: '+(e.reason&&e.reason.message||e.reason)));
(async function start(){
  requestAnimationFrame(loop);
  await loadAssets(p=>{ $('loadBar').style.width=(p*82).toFixed(0)+'%'; });
  for(const k of ['W','A','B','C']){ buildScale(k); $('loadBar').style.width=(82+4.5*('WABC'.indexOf(k)+1))+'%'; await new Promise(r=>setTimeout(r,0)); }
  buildCalifornia(); buildBounds(); buildLines(); buildCreek(); buildGlobe();
  { const w1=makeFlatArrow('W',4.2,0.42), w2=makeFlatArrow('W',4.2,0.42), w3=makeFlatArrow('W',2.4,0.34,0xB06CF0); placeArrow(w1,-250e3,-300e3,1,0.3); placeArrow(w2,-450e3,420e3,-1,0.4); placeArrow(w3,1350e3,240e3,1,0.25,[-0.21,0.98]);
    const a1=makeFlatArrow('A',5.4,0.5), a2=makeFlatArrow('A',5.4,0.5); placeArrow(a1,150e3,-95e3,1,0.45); placeArrow(a2,40e3,135e3,-1,0.6);
    const b1=makeFlatArrow('B',6.4,0.62), b2=makeFlatArrow('B',6.4,0.62); placeArrow(b1,24e3,-14e3,1,0.55); placeArrow(b2,-2e3,15e3,-1,0.75);
    const c1=makeFlatArrow('C',4.6,0.46), c2=makeFlatArrow('C',4.6,0.46); placeArrow(c1,-430,-250,1,0.35); placeArrow(c2,400,300,-1,0.9); }
  buildLabels();
  resize(); setMode(state.mode,true); update(); showPhase(0); syncButtons(); started=true;
  $('loading').classList.add('hide');
  if(QS.has('film')) filmStart();
  if(QS.has('t')){ setTime(+QS.get('t')); }
})().catch(e=>diag('Start fehlgeschlagen: '+(e&&e.message||e)));
window.__sa={renderer,state,PH,TEND,setTime,setView,setMode,camTo,film,filmStart,filmShot,filmEnd,gotoPhase,scene,camera,controls,UNI,SCL,G,stateAt,ready:()=>started,creekXY:fr=>{ const r=renderer.domElement.getBoundingClientRect(), cp=SA_META.C.creekPts, q=cp[Math.floor(cp.length*fr)], v=projXY(WP("C",q[0],q[1],0.05),r.width,r.height); return [r.left+v[0],r.top+v[1],q[1]]; },cur:()=>({shown,st,dispSC})};

/* ===================== Fluss antippen (Wallace Creek): Ober- oder Unterlauf ===================== */
(()=>{ const cv=renderer.domElement, tip=document.createElement('div'); tip.className='rtip'; tip.hidden=true; $('labels').appendChild(tip);
  let down=null, tipT=0;
  const hit=(x,y)=>{ if(shown!=='C'||!state.creek||state.film) return null; const r=cv.getBoundingClientRect(), W=r.width, H=r.height; let best=null,bd=22;
    for(const q of SA_META.C.creekPts){ const p=projXY(WP('C',q[0],q[1],0.05),W,H); if(!p) continue; const d=Math.hypot(p[0]-(x-r.left),p[1]-(y-r.top)); if(d<bd){ bd=d; best={q,x:p[0],y:p[1]}; } } return best; };
  cv.addEventListener('pointerdown',e=>{ down=[e.clientX,e.clientY]; });
  cv.addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse'||e.buttons) return; cv.style.cursor=hit(e.clientX,e.clientY)?'pointer':''; });
  cv.addEventListener('pointerup',e=>{ if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6) return; down=null; const h=hit(e.clientX,e.clientY);
    if(!h){ tip.hidden=true; return; }
    const upper=h.q[1]>0;
    tip.innerHTML=upper?'<b>Oberlauf</b>Hier kommt das Wasser aus den Bergen. Dieser Teil des Flusses liegt auf der Nordamerikanischen Platte.'
                       :'<b>Unterlauf</b>Hier fließt das Wasser weiter in die Ebene. Dieser Teil liegt auf der Pazifischen Platte und wird mit ihr versetzt.';
    tip.hidden=false; const r=cv.getBoundingClientRect(), w=tip.offsetWidth, ht=tip.offsetHeight;
    tip.style.left=clamp(h.x-w/2,8,r.width-w-8)+'px'; tip.style.top=(h.y-ht-16<70?h.y+16:h.y-ht-16)+'px';
    clearTimeout(tipT); tipT=setTimeout(()=>tip.hidden=true,7000); });
  controls.addEventListener('start',()=>{ tip.hidden=true; });
})();

/* Stadtfoto nur nach Antippen des Namens */
labelLayer.addEventListener('click',e=>{ const el=e.target.closest('.lab.cityl'); if(!el) return; el.classList.toggle('open'); const L=labels.find(x=>x.el===el); if(L) L.w=0; state.dirty=true; needsRender=true; });
