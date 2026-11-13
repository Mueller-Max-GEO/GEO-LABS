/* ============================================================================================
   c_text.js – alle Texte: Phasen, Vorhersage-Fragen, Erklärfilm
   ============================================================================================ */
const PH=[
  {n:1,key:'lock',name:'Verhaken und Spannungsaufbau',short:'Verhaken',t0:0,t1:T1E,pill:['slow','Zeitraffer: Jahrhunderte'],
   text:'Die ozeanische Platte schiebt sich jedes Jahr einige Zentimeter unter die kontinentale Platte (vor Japan rund 8 cm). An einem Abschnitt der Kontaktfläche haben sich die Gesteine durch Reibung verhakt. Die kontinentale Platte wird deshalb mitgezogen: Ihr Rand wird nach unten gedrückt, dahinter wölbt sie sich leicht auf. Wie ein gebogenes Lineal speichert sie dabei Spannung – über Jahrhunderte. Weil der Meeresboden über dem Plattenrand langsam absinkt, wird die Wassersäule darüber höher. Eine Welle entsteht dabei nicht, denn alles geschieht sehr langsam.',
   look:'das Gestein der ozeanischen Platte: Die ganze Platte wandert zum Graben und taucht ab. Die kontinentale Platte wird am blockierten Abschnitt mitgezogen (orange = Spannung). Die hellblaue Fläche zeigt das zusätzliche Wasser über dem abgesenkten Meeresboden.'},
  {n:2,key:'quake',name:'Plötzliches Gleiten – Seebeben',short:'Seebeben',t0:T1E,t1:TSEG[2][0],pill:['fast','Zeitlupe: wenige Minuten'],
   text:'Irgendwann ist die Spannung größer als die Reibung. Der blockierte Abschnitt reißt auf, und die Platten gleiten ruckartig um viele Meter aneinander vorbei. Der Rand der kontinentalen Platte federt nach oben und zum Meer hin zurück. Der Meeresboden wird – weit draußen vor der Küste – in kurzer Zeit um mehrere Meter gehoben; weiter landwärts senkt er sich. Vom Erdbebenherd laufen Erdbebenwellen durch das Gestein.',
   look:'die schwarzen Pfeile: Sie zeigen, wie sich der Meeresboden senkrecht verschiebt. Das Wasser darüber wird im selben Augenblick mit angehoben.'},
  {n:3,key:'water',name:'Verdrängung der Wassersäule',short:'Verdrängung',t0:TSEG[2][0],t1:TSEG[3][0],pill:['mid','Zeitraffer: Minuten'],
   text:'Weil sich der Meeresboden so schnell bewegt, kann das Wasser nicht zur Seite ausweichen. Die ganze Wassersäule – vom Meeresboden bis zur Oberfläche – wird mit angehoben oder abgesenkt. Die Wasseroberfläche bekommt einen flachen, aber riesigen Buckel. Die Schwerkraft zieht das Wasser wieder nach unten: Es fließt auseinander, und lange Wellen laufen in mehrere Richtungen – zum offenen Meer und zur Küste.',
   look:'den Wasserberg über der Hebung: Er teilt sich in zwei Wellen. Schau auch von oben auf das Modell.'},
  {n:4,key:'spread',name:'Ausbreitung und Annäherung an die Küste',short:'Ausbreitung',t0:TSEG[3][0],t1:TSEG[4][0],pill:['mid','Zeitraffer: bis 1 Stunde'],
   text:'Auf dem offenen Meer ist der Tsunami flach (meist unter 1 m), sehr lang (über 200 km) und so schnell wie ein Flugzeug (rund 700 km/h). Schiffe bemerken ihn kaum. Wird das Wasser flacher, wird der vordere Teil der Welle zuerst abgebremst. Der hintere Teil holt auf, das Wasser staut sich: Die Welle wird langsamer, kürzer, höher und vorne steiler. Manchmal zieht sich das Meer an der Küste zuerst zurück.',
   look:'die gelbe Spur des Wellenbergs und die Messkarte. Vergleiche die Welle zur Küste mit der Welle zum offenen Meer.'},
  {n:5,key:'flood',name:'Überflutung der Küste und Rückstrom',short:'Überflutung',t0:TSEG[4][0],t1:TEND,pill:['mid','Zeitraffer: Stunden'],
   text:'An der Küste steigt das Wasser rasch an und strömt wie eine mächtige Flut weit ins Land. Ein Tsunami rollt sich dabei nicht wie eine Surfwelle ein. Das Wasser reißt Autos, Boote und Bäume mit und zerstört Häuser, Straßen und Bahnlinien. Danach fließt es zurück – braun von Schlamm, voller Trümmer – und zieht vieles mit ins Meer. Weitere Wellen können folgen, oft über Stunden; die erste ist nicht immer die höchste.',
   look:'wie weit das Wasser ins Land vordringt, was es mitreißt und was der Rückstrom wieder zum Meer zieht. Wo ist man sicher?'}
];
/* Zu jeder Phase: Farbe in der Zeitleiste, eine Kennzahl (Beispiel Japan 2011) und eine Beobachtungsaufgabe mit Lösung */
const PHX=[
  {c:'#E9B649',kv:'≈ 8 cm',kl:'pro Jahr schiebt sich die Pazifische Platte vor Japan unter die Nachbarplatte.',
   q:'Der Meeresboden bewegt sich – trotzdem entsteht in dieser Phase keine Welle. Warum nicht?',
   a:'Der Meeresboden sinkt nur wenige Millimeter pro Jahr. Das Wasser gleicht sich dabei ständig aus, die Oberfläche bleibt eben. Für eine Welle muss sich der Boden schnell bewegen.'},
  {c:'#F0643A',kv:'Magnitude 9,0–9,1',kl:'Tōhoku-Beben, 11. März 2011: das stärkste Beben, das in Japan je gemessen wurde.',
   q:'Vergleiche die beiden schwarzen Pfeile: Wo hebt sich der Meeresboden, wo senkt er sich?',
   a:'Nahe dem Tiefseegraben federt der Plattenrand nach oben – Hebung. Weiter zur Küste hin, wo die Platte vorher aufgewölbt war, sinkt der Boden ab – Senkung.'},
  {c:'#7CC8F0',kv:'≈ 400 km',kl:'lang war die Bruchfläche 2011. Auf dieser riesigen Fläche wurde das Wasser angehoben.',
   q:'Auf dem offenen Meer ist ein Tsunami oft nur etwa einen Meter hoch. Warum ist er trotzdem so gefährlich?',
   a:'Weil die ganze Wassersäule bewegt wird – mehrere Kilometer tief und über hunderte Kilometer Länge. In der flachen Welle steckt deshalb eine riesige Wassermenge.'},
  {c:'#4F8FE6',kv:'≈ 700 km/h',kl:'schnell ist ein Tsunami über 4000 m tiefem Meer – so schnell wie ein Flugzeug.',
   q:'Lies die Messkarte ab: Wie ändern sich Geschwindigkeit, Wellenlänge und Wellenhöhe, wenn das Meer flacher wird?',
   a:'Die Geschwindigkeit sinkt von rund 700 km/h auf unter 50 km/h, die Wellenlänge wird kürzer, die Welle wird höher. Der hintere Teil der Welle holt den vorderen ein – das Wasser staut sich.'},
  {c:'#46B8A0',kv:'≈ 65 Minuten',kl:'nach dem Beben erreichte die Flut 2011 die Ebene von Sendai – Zeit, um sich in Sicherheit zu bringen.',
   q:'Schau auf das Modell und auf den Pegel: Woran erkennt man, dass ein Tsunami keine gewöhnliche Welle ist?',
   a:'Das Wasser steigt viele Minuten lang und strömt wie ein Fluss weit ins Land, statt nach Sekunden zurückzulaufen. Danach fließt es lange und kräftig zurück. Sicher ist man nur auf höherem Gelände.'}
];
const phaseAt=t=>{ for(let i=PH.length-1;i>=0;i--) if(t>=PH[i].t0-1e-6) return i; return 0; };

const QUIZ=[
  {q:'Die ozeanische Platte schiebt sich weiter unter die kontinentale Platte. Ein Abschnitt der Kontaktfläche ist aber verhakt. Was passiert in den nächsten Jahrhunderten?',
   o:[['Die kontinentale Platte wird mitgezogen und verbiegt sich langsam: Ihr Rand wird nach unten gezogen, dahinter wölbt sie sich auf.',1,'Richtig. Die Platte verformt sich elastisch – wie ein Lineal, das man biegt. Dabei speichert sie Spannung.'],
      ['Nichts – solange die Platten verhakt sind, bewegt sich auch die ozeanische Platte nicht.',0,'Die ozeanische Platte wird weiter angetrieben und bewegt sich jedes Jahr einige Zentimeter. Nur an der Kontaktfläche hakt es.'],
      ['Jedes Jahr gibt es ein kleines Seebeben, das sofort einen Tsunami auslöst.',0,'Im verhakten Abschnitt baut sich die Spannung über sehr lange Zeit auf – ohne Tsunami.'],
      ['Das Gestein an der Kontaktfläche schmilzt und gibt sofort nach.',0,'Im verhakten Abschnitt ist das Gestein fest. Gerade deshalb hält es so lange.']]},
  {q:'Die Spannung in der verbogenen Platte wird immer größer. Was passiert, wenn sie größer wird als die Reibung?',
   o:[['Der verhakte Abschnitt reißt in Sekunden bis Minuten auf. Die Platte federt zurück, und der Meeresboden wird gehoben.',1,'Richtig. Die über Jahrhunderte gespeicherte Spannung entlädt sich in kurzer Zeit: ein Seebeben.'],
      ['Die Platten trennen sich, und zwischen ihnen öffnet sich ein Spalt bis zum Meeresboden.',0,'Es öffnet sich kein Spalt. Die Platten gleiten ruckartig aneinander vorbei und bleiben in Kontakt.'],
      ['Die Spannung wird über weitere Jahrhunderte langsam und ohne Beben abgebaut.',0,'Weil der Abschnitt verhakt war, löst sich die Spannung ruckartig – nicht langsam.'],
      ['Der Meeresboden verschiebt sich nur waagerecht, nicht nach oben oder unten.',0,'Der Rand der Platte federt auch nach oben zurück. Gerade diese senkrechte Bewegung ist für den Tsunami entscheidend.']]},
  {q:'Der Meeresboden wurde gerade in kurzer Zeit um mehrere Meter gehoben. Was passiert mit dem Wasser darüber?',
   o:[['Das ganze Wasser bis zur Oberfläche wird mit angehoben. Dieser Wasserberg fließt auseinander, und Wellen laufen in mehrere Richtungen.',1,'Richtig. Die ganze Wassersäule wird verdrängt. Der flache, riesige Buckel teilt sich in Wellen zum offenen Meer und zur Küste.'],
      ['Nur an der Oberfläche entsteht eine kleine Welle; das Wasser in der Tiefe bleibt ruhig.',0,'Bei einem Tsunami bewegt sich das Wasser vom Meeresboden bis zur Oberfläche. Das unterscheidet ihn von einer Windwelle.'],
      ['Es entsteht eine einzige Welle, die nur in Richtung Küste läuft.',0,'Die Wellen laufen in mehrere Richtungen – auch hinaus aufs offene Meer und zur Seite.'],
      ['Das Wasser bleibt ruhig, weil sich der Boden nur ein paar Meter bewegt hat.',0,'Ein paar Meter auf einer Fläche von vielen hundert Kilometern – das ist eine riesige Wassermenge.']]},
  {q:'Die Welle läuft vom tiefen Meer in das flacher werdende Wasser vor der Küste. Wie verändert sie sich?',
   o:[['Sie wird langsamer, kürzer und höher.',1,'Richtig. Im flachen Wasser wird die Welle vorne abgebremst, das Wasser dahinter holt auf und staut sich (Buch M2).'],
      ['Sie wird schneller, länger und flacher.',0,'Umgekehrt: Je flacher das Wasser, desto langsamer die Welle.'],
      ['Sie bleibt gleich, bis sie auf die Küste trifft.',0,'Die Meerestiefe bestimmt Tempo, Länge und Höhe der Welle. Darum ändert sie sich unterwegs.'],
      ['Sie wird langsamer, aber länger und flacher.',0,'Langsamer stimmt. Weil das Wasser dahinter aufholt, wird die Welle aber kürzer und höher.']]},
  {q:'Die Welle erreicht die Küste. Was geschieht?',
   o:[['Das Wasser steigt rasch an und strömt weit ins Land. Dann fließt es zurück, und weitere Wellen können folgen.',1,'Richtig. Ein Tsunami ist eine schnell strömende Flut. Die Gefahr dauert oft Stunden.'],
      ['Eine riesige Welle rollt sich ein und bricht wie beim Surfen am Strand. Danach ist die Gefahr vorbei.',0,'Ein Tsunami rollt sich nicht wie eine Surfwelle ein (NOAA). Und nach der ersten Welle ist die Gefahr nicht vorbei.'],
      ['Das Wasser bleibt am Strand stehen, weil der Sand es aufhält.',0,'Das Wasser hat so viel Energie, dass es oft mehrere Kilometer weit ins Land strömt.'],
      ['Nur die erste Welle ist gefährlich; spätere Wellen sind immer kleiner.',0,'Die erste Welle ist nicht immer die höchste. Man muss warten, bis die Behörden Entwarnung geben.']]},
  {q:'Transfer: Nicht jedes Seebeben löst einen gefährlichen Tsunami aus. Bei welchem Beben ist ein großer Tsunami am wahrscheinlichsten?',
   o:[['Magnitude 9 an einer Subduktionszone, Herd rund 30 km tief, der Meeresboden hebt sich auf großer Fläche.',1,'Richtig. Stark, flach und mit großer senkrechter Hebung des Meeresbodens – das sind die Bedingungen für einen großen Tsunami.'],
      ['Magnitude 6, flach unter dem Meeresboden.',0,'Bei Magnitude 6 ist die Bruchfläche klein und die Hebung gering. Meist entsteht höchstens eine winzige Welle.'],
      ['Magnitude 8,5 in 400 km Tiefe.',0,'So tief unten bewegt sich der Meeresboden kaum. Ein gefährlicher Tsunami ist deshalb unwahrscheinlich.'],
      ['Magnitude 7,5 an einer Blattverschiebung, bei der die Platten waagerecht aneinander vorbeigleiten.',0,'Bei waagerechter Bewegung wird der Meeresboden kaum angehoben. Tsunamis sind dort selten.']]}
];

/* Erklärfilm: Kapitel mit Einstellungen. a → b = Abschnitt der Animation, cam = Kameraposition, text = Untertitel (wird auf Wunsch vorgelesen) */
const FILM=[
  {title:'Einstieg',shots:[
    {a:0,b:0,cam:'oblique',text:'Am 11. März 2011 bebt vor der Küste Japans der Meeresboden. Etwa eine Stunde später überflutet ein Tsunami die Ebene von Sendai. Wie entsteht eine solche Welle?'},
    {a:0,b:0,cam:'intro',text:'Wir schauen von der Seite in die Erde. Links liegt die ozeanische Platte unter dem tiefen Meer, rechts die kontinentale Platte mit der Küste.'}]},
  {title:'1 Verhaken',shots:[
    {a:0,b:5,cam:'lock',text:'Die ozeanische Platte schiebt sich unter die kontinentale Platte – nur wenige Zentimeter pro Jahr.'},
    {a:5,b:10,cam:'lock',text:'An der Kontaktfläche haben sich die Platten verhakt. Die kontinentale Platte wird mitgezogen und verbiegt sich wie ein Lineal.'},
    {a:10,b:T1E,cam:'lock',text:'Ihr Rand sinkt langsam ab. Über Jahrhunderte baut sich immer mehr Spannung auf.'}]},
  {title:'2 Seebeben',shots:[
    {a:T1E,b:16.6,cam:'quake',text:'Dann reißt der verhakte Abschnitt auf. Die Platte federt in wenigen Minuten zurück: ein Seebeben.'},
    {a:16.6,b:TSEG[2][0],cam:'quake',text:'Dabei wird der Meeresboden um mehrere Meter gehoben – auf einer riesigen Fläche.'}]},
  {title:'3 Verdrängung',shots:[
    {a:TSEG[2][0],b:21.6,cam:'water',text:'Das ganze Wasser darüber wird mit angehoben, vom Meeresboden bis zur Oberfläche.'},
    {a:21.6,b:TSEG[3][0],cam:'water',text:'Der Wasserberg fließt auseinander. Lange Wellen laufen hinaus aufs offene Meer und zur Küste.'}]},
  {title:'4 Ausbreitung',shots:[
    {a:TSEG[3][0],b:27.6,cam:'spread',text:'Auf dem tiefen Meer ist der Tsunami so schnell wie ein Flugzeug, aber flach. Schiffe bemerken ihn kaum.'},
    {a:27.6,b:30.6,cam:'spread',text:'Im flachen Wasser wird er langsamer. Das Wasser staut sich: Die Welle wird kürzer und höher.'},
    {a:30.6,b:TSEG[4][0],cam:'coast',text:'An der Küste zieht sich das Meer manchmal zuerst zurück. Das ist ein Warnzeichen!'}]},
  {title:'5 Überflutung',shots:[
    {a:TSEG[4][0],b:36.5,cam:'flood',text:'Der Tsunami rollt sich nicht ein wie eine Surfwelle. Er kommt als schnell steigende, strömende Flut.'},
    {a:36.5,b:42.5,cam:'flood',text:'Das Wasser dringt weit ins Land vor. Es reißt Autos und Boote mit und zerstört Häuser.'},
    {a:42.5,b:53,cam:'back',text:'Dann strömt es zurück zum Meer – braun von Schlamm – und zieht Trümmer mit.'},
    {a:53,b:TEND,cam:'back',text:'Weitere Wellen können folgen, oft über Stunden. Die erste ist nicht immer die höchste.'}]},
  {title:'Merke',shots:[
    {a:TEND,b:TEND,cam:'oblique',text:'Merke: Nicht jedes Seebeben löst einen Tsunami aus. Entscheidend ist, dass sich der Meeresboden schnell und auf großer Fläche hebt oder senkt.'},
    {a:TEND,b:TEND,cam:'safe',text:'Bebt die Erde an der Küste stark oder lange, oder zieht sich das Meer plötzlich zurück: sofort auf höheres Gelände – und dort bleiben, bis Entwarnung kommt.'}]}
];
