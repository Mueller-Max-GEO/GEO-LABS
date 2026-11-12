// erzeugt Sprecherskript.md aus src/c_text.js
const fs=require('fs'),path=require('path'),R=path.join(__dirname,'..');
const src=fs.readFileSync(R+'/src/c_text.js','utf8');const S={lang:'de'};
const FILM_TXT=new Function('S',src+';return FILM_TXT')(S);
let o='# Pyramiden-Labor – Sprecherskript des Erklärfilms\n\nAcht Kapitel. Jeder Absatz gehört zu einem Bild; nach jedem Absatz folgt eine kurze Pause. Dateinamen für Aufnahmen: `de_k01.mp3` … `de_k08.mp3`, `fr_k01.mp3` … `fr_k08.mp3`.\n';
for(const [lang,name] of [['de','Deutsch'],['fr','Français']]){o+='\n## '+name+'\n';FILM_TXT[lang].forEach((c,i)=>{o+='\n### '+(lang==='de'?'Kapitel ':'Chapitre ')+(i+1)+' · '+c.t+' (`'+lang+'_k0'+(i+1)+'.mp3`)\n\n'+c.p.join('\n\n')+'\n'})}
fs.writeFileSync(R+'/Sprecherskript.md',o);console.log('Sprecherskript.md',o.length,'Zeichen');
