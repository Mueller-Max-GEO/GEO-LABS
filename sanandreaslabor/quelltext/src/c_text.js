/* ============================================================================================
   c_text.js – alle Texte: Phasen, Kennzahlen, Aufgaben, Erklärfilm
   ============================================================================================ */
/* Geografische Einordnung (vor Phase 1, auf der Erdkugel) */
const GLOBE={n:'',key:'globe',name:'Wo liegt die San-Andreas-Verwerfung?',short:'Erde',t0:0,t1:TG,pill:['mid','Die Erde'],c:'#5B8DEF',
  text:'Wir starten in Luxemburg (roter Punkt). Die San-Andreas-Verwerfung liegt auf der anderen Seite des Atlantiks: im Westen Nordamerikas, im US-Bundesstaat Kalifornien, an der Küste des Pazifischen Ozeans. Die farbigen Linien sind Grenzen zwischen den Platten der Erdkruste. Die Erdoberfläche ist wie eine zerbrochene Eierschale aus vielen solchen Platten zusammengesetzt. Die weiße Linie umrandet den US-Bundesstaat Kalifornien – dorthin zoomen wir gleich.',
  look:'den roten Punkt (Luxemburg) und die weiße Umrandung von Kalifornien. Drücke auf Play: Die Erde dreht sich bis nach Kalifornien.',
  kv:'≈ 9.000 km',kl:'Luftlinie von Luxemburg nach Kalifornien',
  q:'Auf welchem Kontinent und an welchem Ozean liegt Kalifornien?',
  a:'Kalifornien liegt im Westen Nordamerikas (USA), an der Küste des Pazifischen Ozeans.'};
const PH=[
  {n:1,key:'bounds',name:'Plattengrenzen im Westen Nordamerikas',short:'Plattengrenzen',t0:TG,t1:T0,pill:['mid','Übersicht: 3.900 km'],c:'#A78BFA',
   text:'Weit draußen im Pazifik liegt die riesige Pazifische Platte, im Osten die Nordamerikanische Platte. Ihre Grenze hat nicht überall dieselbe Art. Im Golf von Kalifornien reißt die Kruste auf: Dort entfernen sich die Platten voneinander (Spreizung). Durch Kalifornien gleiten sie waagerecht aneinander vorbei: die San-Andreas-Verwerfung, eine Transformstörung. Weiter nördlich liegt die kleine Juan-de-Fuca-Platte. Sie taucht unter Nordamerika ab (Subduktion) – darüber stehen Vulkane wie der Mount St. Helens. Am Kap Mendocino treffen alle drei Platten zusammen.',
   look:'die Farben der Plattengrenzen: Gelb: Die Platten gleiten aneinander vorbei. Grün: Sie weichen auseinander. Violett: Eine Platte taucht ab. Die Zacken zeigen auf die obere Platte.',
   kv:'3 Arten',kl:'von Plattengrenzen auf einer Karte: auseinander (Spreizung), aneinander vorbei (Transformstörung) und abtauchen (Subduktion).',
   q:'Warum gibt es in Kalifornien keine Vulkane wie in Oregon und Washington?',
   a:'Vulkane entstehen über einer abtauchenden Platte: Das Gestein in der Tiefe schmilzt, und Magma steigt auf. In Kalifornien gleiten die Platten nur aneinander vorbei. Dort taucht keine Platte ab, also entsteht auch kein Magma.'},
  {n:2,key:'plates',name:'Zwei Platten gleiten aneinander vorbei',short:'Zwei Platten',t0:T0,t1:T1,pill:['mid','Übersicht: Kalifornien'],c:'#7CC8F0',
   text:'Quer durch Kalifornien verläuft die Grenze zwischen zwei Platten: der Pazifischen Platte im Westen und der Nordamerikanischen Platte im Osten. Die Platten stoßen hier nicht zusammen und entfernen sich nicht voneinander – sie gleiten waagerecht aneinander vorbei. Eine solche Plattengrenze heißt Transformstörung. Gegenüber der Nordamerikanischen Platte bewegt sich die Pazifische Platte nach Nordwesten, rund 5 cm pro Jahr. Die wichtigste Bruchlinie ist die San-Andreas-Verwerfung. Sie ist rund 1.300 km lang. Im Süden endet sie an der Salton Sea. Die Plattengrenze geht dort aber weiter: über die Imperial-Verwerfung in den Golf von Kalifornien.',
   look:'die roten Pfeile: Sie zeigen, wie sich die Platten zueinander bewegen. Folge der Plattengrenze nach Süden bis in den Golf von Kalifornien. Auf welcher Platte liegt Los Angeles, auf welcher San Francisco?',
   kv:'≈ 5 cm',kl:'pro Jahr gleiten die beiden Platten aneinander vorbei – etwa so schnell, wie Fingernägel wachsen.',
   q:'Los Angeles und San Francisco liegen auf verschiedenen Platten. Was geschieht mit ihrem Abstand?',
   a:'Los Angeles liegt auf der Pazifischen Platte und wandert nach Nordwesten. San Francisco liegt knapp östlich der Verwerfung auf der Nordamerikanischen Platte. Die beiden Städte rücken deshalb jedes Jahr einige Zentimeter näher zusammen. Nebeneinander lägen sie erst in 10 bis 20 Millionen Jahren.'},
  {n:3,key:'lock',name:'Verhakt: Spannung baut sich auf',short:'Verhakt',t0:T1,t1:T2,pill:['slow','Zeitraffer: 150 Jahre'],c:'#E9B649',
   text:'Die Platten sind keine glatten Scheiben. An der Verwerfung pressen die Gesteine fest aufeinander und verhaken sich – bis in etwa 15 km Tiefe. Dort bewegt sich jahrzehntelang nichts. Weit entfernt von der Verwerfung und in der Tiefe wandern die Platten aber weiter. Das Gestein dazwischen wird verbogen wie ein Stab, den man spannt, und speichert immer mehr Spannung. Die hellen Messlinien waren am Anfang gerade.',
   look:'die Messlinien: An der Verwerfung bleiben sie zusammen, weiter draußen werden sie mitgezogen. An der Vorderseite des Blocks siehst du, dass die Platten in der Tiefe weitergleiten.',
   kv:'≈ 5 m',kl:'Rückstand entstehen in 150 Jahren, wenn die Verwerfung verhakt bleibt (3,5 cm pro Jahr).',
   q:'Warum merkt man an der Erdoberfläche jahrzehntelang nichts von der Plattenbewegung?',
   a:'Weil die Verwerfung verhakt ist, entsteht dort kein Versatz. Das Gestein verbiegt sich nur ganz allmählich und über viele Kilometer verteilt. Das kann nur eine sehr genaue Vermessung nachweisen, heute zum Beispiel mit Satelliten (GPS).'},
  {n:4,key:'quake',name:'Die Spannung entlädt sich: Erdbeben',short:'Erdbeben',t0:T2,t1:T3,pill:['fast','Zeitlupe: unter 1 Minute'],c:'#F0643A',
   text:'Irgendwann ist die Spannung größer als die Reibung. Am Erdbebenherd reißt die Verwerfung auf. Der Bruch rast mit rund 3 km pro Sekunde die Verwerfung entlang. Hinter der Bruchfront schnellt das verbogene Gestein in seine entspannte Form zurück: In Sekunden holt es nach, was sich in 150 Jahren aufgestaut hat. Die beiden Seiten sind danach um mehrere Meter gegeneinander versetzt. Vom Bruch gehen Erdbebenwellen aus und erschüttern den Boden. Danach verhakt sich die Verwerfung von Neuem: Die Spannung wächst wieder, bis zum nächsten Erdbeben. Die Animation zeigt diesen Kreislauf zweimal hintereinander.',
   look:'die Messlinien hinter der Bruchfront: Sie werden wieder gerade – sind aber an der Verwerfung zerrissen und versetzt.',
   kv:'Magnitude 7,9',kl:'Fort-Tejon-Erdbeben, 9. Januar 1857: Die Verwerfung riss auf über 300 km Länge. Der Boden wurde hier um bis zu 9 m versetzt.',
   q:'Stell dich in Gedanken auf eine Seite der Verwerfung und schau hinüber. In welche Richtung hat sich die andere Seite verschoben?',
   a:'Nach rechts – egal, auf welcher Seite du stehst. Deshalb nennt man die San-Andreas-Verwerfung eine rechtsseitige Horizontalverschiebung.'},
  {n:5,key:'trace',name:'Spuren in der Landschaft: Wallace Creek',short:'Spuren',t0:T3,t1:T4,pill:['slow','Zeitraffer: 3.700 Jahre'],c:'#46B8A0',
   text:'Nach dem Erdbeben verhakt sich die Verwerfung wieder, und alles beginnt von vorn. Jedes Erdbeben versetzt die Landschaft um einige Meter. Am Wallace Creek in der Carrizo-Ebene sieht man das Ergebnis: Vor rund 3.700 Jahren floss der Fluss gerade über die Verwerfung. Seitdem haben ihn viele Erdbeben Stück für Stück zerrissen. Heute fließt er rund 130 m an der Verwerfung entlang, bevor er in sein altes Bett zurückkehrt. Gelände und Luftbild sind echt, der Versatz ist in echter Größe dargestellt.',
   look:'den blauen Fluss. Zwischen den Erdbeben bewegt sich an der Verwerfung nichts. Bei jedem Erdbeben springt der Teil des Flusses auf der Pazifischen Platte ein Stück weiter nach Nordwesten. Tippe auf den Fluss, um mehr zu erfahren.',
   kv:'130 m',kl:'Versatz in rund 3.700 Jahren – im Durchschnitt 3,5 cm pro Jahr.',
   q:'Das letzte große Erdbeben war hier 1857. Wie groß ist der Rückstand, der sich seitdem aufgebaut hat?',
   a:'Seit 1857 sind rund 170 Jahre vergangen: 170 × 3,5 cm ≈ 6 m. So viel Bewegung ist an diesem Abschnitt aufgestaut. Wann sie sich entlädt, kann niemand vorhersagen.'}
];
/* Vergleich „Die Platten gleiten gleichmäßig“: abweichende Texte für die Phasen 2 bis 4 */
const CREEP_X={
  2:{name:'Die Platten gleiten gleichmäßig',short:'Gleiten',
   text:'Hier gleiten die Platten gleichmäßig aneinander vorbei, ohne sich zu verhaken. Die Messlinien werden an der Verwerfung jedes Jahr ein kleines Stück weiter zerschnitten. Das Gestein verbiegt sich nicht, es baut sich keine Spannung auf. So verhält sich der mittlere Abschnitt der San-Andreas-Verwerfung zwischen San Juan Bautista und Parkfield.',
   look:'die Messlinien: Sie bleiben gerade, sind aber an der Verwerfung zerschnitten. Wähle dann unter „Was wäre, wenn …?“: „Die Platten verhaken sich“ – und vergleiche.',
   kv:'0 m',kl:'Rückstand: An der Verwerfung entsteht jedes Jahr so viel Versatz, wie die Platten wandern.'},
  3:{name:'Kein großes Erdbeben',short:'Kein Beben',
   text:'Weil sich keine Spannung aufgebaut hat, gibt es hier kein großes Erdbeben. Die Platten kriechen einfach weiter. Starke Erdbeben entstehen nur dort, wo sich die Platten verhaken.',
   look:'die Anzeige „Rückstand“: Sie bleibt bei null. Der Versatz der Messlinien ist trotzdem genauso groß wie nach einem Erdbeben.',
   kv:'kein Ruck',kl:'Der kriechende Abschnitt erzeugt viele kleine, aber keine sehr starken Erdbeben.'},
  4:{name:'Der Fluss wird gleichmäßig versetzt',short:'Spuren',
   text:'Würde die Verwerfung hier gleichmäßig kriechen, wäre der Fluss ganz allmählich versetzt worden – ohne Sprünge und ohne große Erdbeben. Der Versatz wäre am Ende derselbe: rund 130 m in 3.700 Jahren.',
   look:'den Fluss auf der Pazifischen Platte: Er wandert jetzt gleichmäßig, nicht ruckweise. Im Diagramm fallen die beiden Linien zusammen.',
   kv:'130 m',kl:'Derselbe Versatz wie mit Erdbeben – nur ohne Rucke.'}
};
const MODE_MSG={lock:'Die Platten verhaken sich – wie am Wallace Creek: Spannung baut sich auf und entlädt sich in Erdbeben.',creep:'Die Platten gleiten gleichmäßig. Es baut sich keine Spannung auf.'};

/* Erklärfilm: Kapitel mit Einstellungen. a,b = Zeitpunkte auf der Zeitleiste, cam = Kamerastellung */
const FILM=[
  {title:'Einstieg',shots:[
    {a:0,b:0.4,cam:'g_eu',text:'Wir beginnen hier: in Luxemburg, mitten in Europa.'},
    {a:0.4,b:TG-0.05,cam:'g_ca',text:'Rund 9.000 Kilometer weiter westlich liegt Kalifornien. Am 9. Januar 1857 erschüttert dort ein gewaltiges Erdbeben das Land.'},
    {a:TG+0.02,b:TG+2.4,cam:'w_obl',text:'Die Ursache liegt tief unter der Landschaft: Hier grenzen Platten der Erdkruste aneinander.'}]},
  {title:'1 Plattengrenzen',shots:[
    {a:TG+2.4,b:TG+4.2,cam:'w_obl',text:'Im Westen liegt die Pazifische Platte, im Osten die Nordamerikanische Platte. Ihre Grenze hat drei Gesichter.'},
    {a:TG+4.2,b:TG+5.8,cam:'w_south',text:'Im Golf von Kalifornien weichen die Platten auseinander. Durch Kalifornien gleiten sie aneinander vorbei.'},
    {a:TG+5.8,b:T0-0.05,cam:'w_north',text:'Im Norden taucht die kleine Juan-de-Fuca-Platte unter Nordamerika ab. Darüber stehen Vulkane.'}]},
  {title:'2 Zwei Platten',shots:[
    {a:T0+0.02,b:T0+3,cam:'a_obl',text:'Im Westen liegt die Pazifische Platte, im Osten die Nordamerikanische Platte. Ihre Grenze ist die San-Andreas-Verwerfung.'},
    {a:T0+3,b:T0+6.5,cam:'a_fault',text:'Die Platten gleiten waagerecht aneinander vorbei – rund fünf Zentimeter pro Jahr. Das nennt man eine Transformstörung.'},
    {a:T0+6.5,b:T1-0.05,cam:'a_zoom',text:'Wir schauen genauer hin: in die Carrizo-Ebene, auf halbem Weg zwischen San Francisco und Los Angeles.'}]},
  {title:'3 Verhakt',shots:[
    {a:T1+0.02,b:T1+3.5,cam:'b_obl',text:'Der Block ist 116 Kilometer lang und 25 Kilometer dick. Die hellen Messlinien verlaufen gerade über die Verwerfung.'},
    {a:T1+3.5,b:T1+9,cam:'b_obl',text:'Die Platten wandern weiter. Doch an der Verwerfung sind die Gesteine verhakt: Dort bewegt sich nichts.'},
    {a:T1+9,b:T1+13,cam:'b_sec',text:'Nur in der Tiefe, unterhalb von etwa 15 Kilometern, gleiten die Platten gleichmäßig.'},
    {a:T1+13,b:T2-0.02,cam:'b_top',text:'Das Gestein verbiegt sich wie ein gespannter Stab. 150 Jahre lang wächst die Spannung.'}]},
  {title:'4 Erdbeben',shots:[
    {a:T2-0.02,b:T2+2.25,cam:'b_quake',text:'Die Spannung ist am größten – die Anzeige glüht. Dann ist die Spannung größer als die Reibung. Am Erdbebenherd reißt die Verwerfung auf.'},
    {a:T2+2.25,b:T2+4.4,cam:'b_quake',text:'Die Bruchfront rast mit drei Kilometern pro Sekunde durch das Gestein. Dahinter schnellen beide Seiten zurück.'},
    {a:T2+4.4,b:T2+7,cam:'b_top',text:'Erdbebenwellen breiten sich aus. Die Messlinien sind wieder gerade – aber an der Verwerfung um mehrere Meter versetzt.'},
    {a:T2+7,b:T2+9.4,cam:'b_obl',text:'Die Spannung ist abgebaut. Jetzt verhakt sich die Verwerfung von Neuem.'},
    {a:T2+9.4,b:T2+16.1,cam:'b_top',text:'Wieder wandern die Platten weiter, wieder verbiegt sich das Gestein. 150 Jahre lang wächst die Spannung.'},
    {a:T2+16.1,b:T3-0.02,cam:'b_quake',text:'Und wieder: ein Erdbeben. Die Spannung entlädt sich, der Versatz wächst. So geht es immer weiter.'}]},
  {title:'5 Spuren',shots:[
    {a:T3+0.02,b:T3+0.6,cam:'c_obl',text:'Am Wallace Creek hat die Verwerfung ihre Spuren hinterlassen. Vor 3.700 Jahren floss der Fluss gerade hinüber.'},
    {a:T3+0.6,b:T3+13,cam:'c_obl',text:'Zwischen den Erdbeben geschieht an der Verwerfung nichts. Jedes Erdbeben aber versetzt den Fluss um einige Meter.'},
    {a:T3+13,b:T4-C_HOLD,cam:'c_creek',text:'Ruck für Ruck wandert die Pazifische Platte nach Nordwesten – und der Fluss wird immer weiter zerrissen.'},
    {a:T4-C_HOLD,b:T4,cam:'c_top',text:'Heute beträgt der Versatz 130 Meter. Das Luftbild und das Gelände sind echt.'}]},
  {title:'Zusammenfassung',shots:[
    {a:T4,b:T4,cam:'c_creek',text:'An einer Transformstörung gleiten zwei Platten aneinander vorbei. Wo sie sich verhaken, baut sich Spannung auf.'},
    {a:T4,b:T4,cam:'c_obl',text:'Entlädt sich die Spannung ruckartig, bebt die Erde. Seit 1857 hat sich hier wieder ein Rückstand von fast sechs Metern aufgebaut.'},
    {a:T0+1,b:T0+1,cam:'a_obl',text:'Wann das nächste große Erdbeben kommt, kann niemand vorhersagen. Sicher ist nur: Die Platten bewegen sich weiter.'}]}
];
