// Prüft den Ablauf der Stimme mit einer nachgebauten Sprachausgabe: (a) funktioniert, (b) gewählte Stimme stumm, (c) gar keine Ausgabe
const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const mode of ['ok','mute-picked','dead']){
    const p = await b.newPage({viewport:{width:1100,height:700}}); const errs=[];
    p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
    await p.addInitScript(mode=>{
      const log=window.__vlog=[];const voices=[{name:'Netz Deutsch',lang:'de-DE',localService:false,voiceURI:'net'},{name:'Anna',lang:'de-DE',localService:true,voiceURI:'com.apple.voice.compact.de-DE.Anna',default:true},{name:'Eddy',lang:'de-DE',localService:true,voiceURI:'com.apple.eloquence.de-DE.Eddy'},{name:'Thomas',lang:'fr-FR',localService:true,voiceURI:'x'}];
      let cur=null,timer=0;
      const ss={speaking:false,pending:false,paused:false,getVoices:()=>voices,addEventListener(){},resume(){},
        cancel(){log.push('cancel');clearTimeout(timer);const u=cur;cur=null;this.speaking=false;if(u&&u.onerror)setTimeout(()=>u.onerror({error:'interrupted'}),0)},
        speak(u){const vn=u.voice?u.voice.name:'(default)';log.push('speak['+vn+'] '+u.text.slice(0,28));cur=u;
          const silent=mode==='dead'||(mode==='mute-picked'&&u.voice);if(silent)return;
          this.speaking=true;setTimeout(()=>{if(cur!==u)return;u.onstart&&u.onstart();timer=setTimeout(()=>{if(cur!==u)return;this.speaking=false;cur=null;log.push('end');u.onend&&u.onend()},1500)},60)}};
      Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true});
      window.SpeechSynthesisUtterance=function(t){this.text=t};
    },mode);
    await p.goto('http://localhost:8772/pyramiden-labor.html?q=lo'); await p.waitForFunction('window.__ready===true');
    await p.click('#filmBtn'); await p.waitForTimeout(16000);
    const r=await p.evaluate(()=>({log:window.__vlog.slice(0,9),toast:document.getElementById('toast').classList.contains('show')?document.getElementById('toast').textContent.slice(0,60):'',t:window.__lab.FILM.t.toFixed(1),spoken:window.__lab.FILM.spoken,sel:!!document.getElementById('cVoiceSel'),opts:[...(document.querySelectorAll('#cVoiceSel option'))].map(o=>o.textContent).join(' | ')}));
    console.log('== '+mode+'\n'+r.log.join('\n')+'\n t='+r.t+' spoken='+r.spoken+' toast="'+r.toast+'" select='+r.sel+' ['+r.opts+']'); console.log(errs.join('\n')||'no errors'); await p.close();
  }
  await b.close();
})();
