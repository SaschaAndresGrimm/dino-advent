'use strict';
// Game data: worlds, story, advent calendar. Classic script: shares one global scope with the other js/ files; load order is set in index.html.
// =====================================================================
// Game data
// =====================================================================
const WORLDS = [
  { name: 'Dschungel', speed: 282, segs: 24, patterns: ['rock', 'rock2', 'pit', 'pit', 'raptor', 'raptor2', 'plat', 'boulder', 'hopper', 'hopper2', 'plant', 'meteor', 'meteors', 'bounce', 'bounceUp', 'crumble', 'ptero', 'compy', 'pitRock'],
    startTip: 'Willkommen im Dschungel! Sammle Bernstein und finde die 3 Dino-Eier.',
    riddles: [
      { q: 'Ein Velo und eine Glocke kosten zusammen 110 Franken. Das Velo kostet 100 Franken mehr. Was kostet die Glocke?', a: ['5 Franken', '10 Franken', '1 Franken'], ok: 0, why: 'Glocke 5 + Velo 105 = 110 – und 105 ist genau 100 mehr als 5!', trick: true, d: 3 },
      { q: 'Welche Zahl kommt als Nächstes? 1, 2, 4, 7, 11, …', a: ['16', '15', '14'], ok: 0, why: 'Es kommt jedes Mal eins mehr dazu: +1, +2, +3, +4 – und jetzt +5. 11 + 5 = 16!', d: 3 },
      { q: 'Ein Seerosenblatt verdoppelt sich jeden Tag. Nach 10 Tagen ist der Teich voll. Wann war er halb voll?', a: ['Am 9. Tag', 'Am 5. Tag', 'Am 8. Tag'], ok: 0, why: 'Am 10. Tag verdoppelt es sich noch einmal – also war der Teich am 9. Tag halb voll!', d: 3 },
      { q: 'Lia hat 3 Schwestern. Jede Schwester hat einen Bruder. Wie viele Kinder sind es insgesamt?', a: ['5', '7', '4'], ok: 0, why: 'Lia und ihre 3 Schwestern sind 4 Mädchen – und alle haben denselben Bruder. Also 5 Kinder!', trick: true, d: 3 },
      { q: 'Ich habe einen Hals und einen Boden, aber weder Kopf noch Füsse. Was bin ich?', a: ['Eine Flasche', 'Eine Giraffe', 'Ein Baum'], ok: 0, why: 'Eine Flasche hat einen Flaschenhals und einen Boden – aber keinen Kopf und keine Füsse!', d: 1 },
      { q: 'Welcher passt nicht dazu: Triceratops, Stegosaurus, Pteranodon?', a: ['Pteranodon', 'Stegosaurus', 'Triceratops'], ok: 0, why: 'Der Pteranodon ist ein Flugsaurier – die anderen beiden sind echte Dinosaurier!', d: 1 },
      { q: 'Ich bin eine Zahl. Verdoppelst du mich und zählst 4 dazu, kommt 20 heraus. Wer bin ich?', a: ['8', '12', '10'], ok: 0, why: '8 + 8 = 16, und 16 + 4 = 20!', d: 2 },
      { q: 'Was kommt als Nächstes? M, D, M, D, F, S, …', a: ['S', 'M', 'D'], ok: 0, why: 'Das sind die Wochentage: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag – und dann Sonntag!', d: 2 },
      { q: 'Ein Dino-Ei braucht 3 Tage zum Schlüpfen. Wie lange brauchen 3 Eier, die zusammen im Nest liegen?', a: ['3 Tage', '9 Tage', '6 Tage'], ok: 0, why: 'Alle drei Eier brüten gleichzeitig – also schlüpfen sie alle nach 3 Tagen!', trick: true, d: 3 },
      { q: 'Wenn gestern Sonntag war: Welcher Tag ist übermorgen?', a: ['Mittwoch', 'Dienstag', 'Donnerstag'], ok: 0, why: 'Gestern Sonntag, heute Montag, morgen Dienstag – übermorgen Mittwoch!', d: 2 },
      { q: 'Ich bin riesig und habe einen ganz langen Hals. Mit ihm fresse ich Blätter von hohen Bäumen. Wer bin ich?', a: ['Ein Brachiosaurus', 'Ein Raptor', 'Ein T-Rex'], ok: 0, why: 'Der Brachiosaurus hatte einen langen Hals und frass Blätter von hohen Bäumen. Raptor und T-Rex frassen Fleisch!', d: 1 },
      { q: 'Welche Zahl passt nicht dazu? 2, 4, 6, 9, 10', a: ['9', '6', '10'], ok: 0, why: 'Alle anderen sind gerade Zahlen – nur die 9 nicht!', d: 1 },
      { q: 'Welcher Buchstabe kommt als Nächstes? A, C, E, G, …', a: ['I', 'H', 'J'], ok: 0, why: 'Immer ein Buchstabe wird übersprungen: A (B) C (D) E (F) G (H) – also I!', d: 2 },
      { q: 'Ein Raptor rennt 3 Sekunden lang 10 m pro Sekunde, dann 2 Sekunden lang 5 m pro Sekunde. Wie weit ist er gerannt?', a: ['40 m', '50 m', '35 m'], ok: 0, why: '3 mal 10 sind 30 m, dazu 2 mal 5 sind 10 m: zusammen 40 m!', d: 1 },
      { q: 'Ich laufe immer hinter dir her, aber du kannst mich nie fangen. Im Dunkeln bin ich weg. Wer bin ich?', a: ['Mein Schatten', 'Meine Spur', 'Mein Echo'], ok: 0, why: 'Dein Schatten ist nur da, wenn Licht auf dich fällt – und fangen kannst du ihn nie!', d: 1 },
      { q: 'Ich hänge den ganzen Tag kopfüber im Baum und bewege mich ganz langsam. Wer bin ich?', a: ['Ein Faultier', 'Ein Papagei', 'Ein Jaguar'], ok: 0, why: 'Das Faultier hängt fast den ganzen Tag im Baum und bewegt sich sehr langsam – so spart es Kraft!', d: 1 },
      { q: 'Ich habe viele Blätter, aber ich bin kein Baum. Man kann mich lesen. Was bin ich?', a: ['Ein Buch', 'Ein Busch', 'Ein Salat'], ok: 0, why: 'Ein Buch hat viele Blätter aus Papier – und man kann darin lesen!', d: 1 },
      { q: 'Auf einem Ast sitzen 4 Affen. Jeder hat 2 Bananen. Dann werden 3 Bananen gefressen. Wie viele Bananen sind noch da?', a: ['5', '8', '11'], ok: 0, why: '4 mal 2 sind 8 Bananen, und 8 minus 3 sind 5!', d: 1 },
      { q: 'Ein Dino-Ei wiegt 2 kg. Im Nest liegen 6 Eier, aber 2 rollen den Hang hinunter. Wie viel wiegen die Eier, die noch im Nest liegen?', a: ['8 kg', '12 kg', '4 kg'], ok: 0, why: 'Es bleiben 4 Eier, und 4 mal 2 kg sind 8 kg!', d: 2 },
      { q: 'Drei Dinos stehen in einer Reihe. Der Raptor steht weder am Anfang noch am Ende. Der T-Rex steht nicht am Anfang. Wer steht am Anfang?', a: ['Der Stegosaurus', 'Der Raptor', 'Der T-Rex'], ok: 0, why: 'Der Raptor steht in der Mitte. Der T-Rex darf nicht vorne stehen, also steht er hinten – vorne bleibt der Stegosaurus!', d: 2 },
      { q: 'Ein Papagei lernt von Montag bis Samstag jeden Tag 3 neue Wörter. Am Sonntag macht er Pause. Wie viele neue Wörter lernt er in 2 Wochen?', a: ['36', '42', '18'], ok: 0, why: 'In einer Woche sind es 6 Tage mal 3 Wörter, also 18. In 2 Wochen sind das 36 – der Sonntag zählt nicht!', d: 2 },
      { q: 'Welches dieser Tiere war KEIN Dinosaurier: Triceratops, Mosasaurus oder Brachiosaurus?', a: ['Der Mosasaurus', 'Der Triceratops', 'Der Brachiosaurus'], ok: 0, why: 'Der Mosasaurus war ein riesiges Meeresreptil – ein Verwandter der Echsen, aber kein Dinosaurier!', d: 2 },
      { q: 'Unter 3 Dino-Eiern ist eines schwerer als die anderen. Du hast eine Waage mit 2 Schalen. Wie oft musst du mindestens wiegen, um das schwere Ei sicher zu finden?', a: ['1 Mal', '2 Mal', '3 Mal'], ok: 0, why: 'Lege auf jede Schale ein Ei. Sinkt eine Schale, liegt dort das schwere Ei. Bleibt die Waage im Gleichgewicht, ist es das dritte Ei – es reicht also 1 Mal!', d: 3 },
      { q: 'Fünf Dino-Freunde begrüssen sich: Jeder gibt jedem anderen genau einmal die Pfote. Wie viele Begrüssungen gibt es?', a: ['10', '20', '25'], ok: 0, why: 'Jeder gibt 4 anderen die Pfote: 5 mal 4 sind 20. Aber so ist jede Begrüssung doppelt gezählt – also 20 geteilt durch 2 sind 10!', d: 3 },
      { q: 'Ein Dino ist heute dreimal so alt wie sein Baby. In 10 Jahren ist er nur noch doppelt so alt wie das Baby. Wie alt ist das Baby heute?', a: ['10 Jahre', '5 Jahre', '15 Jahre'], ok: 0, why: 'Baby 10 und Dino 30: In 10 Jahren sind es 20 und 40 – und 40 ist genau das Doppelte von 20!', d: 3 },
    ],
    sky: ['#0f3b3a', '#8cc49b'], far: '#2f6a50', mid: '#1f4a38', ground: '#4a3020', top: '#3f9b3a', dots: '#3a2416', edge: '#2e1d12', plat: '#6b4a2b', platTop: '#4caf50',
    rock: '#7b6b5a', deco: '#173d2c', volcS: 0.8, volcCol: '#4f8478', egg: '#f6e7b0', eggSpot: '#6aa84f' },
  { name: 'Canyon', speed: 295, segs: 30, patterns: ['rock', 'rock2', 'pit', 'pit', 'raptor', 'ptero', 'swoop', 'boulder', 'plat', 'amber', 'low', 'low', 'pitRock', 'lowRock', 'wall', 'hopper', 'hopper2', 'plant', 'meteor', 'meteors', 'bounce', 'bounceUp', 'crumble', 'raptor2'],
    startTip: 'Der heisse Canyon! Neue Fähigkeit: Halte DUCKEN gedrückt – so kommst du unter tiefen Felsen und Flugsauriern durch.',
    riddles: [
      { q: 'Ein Flugsaurier fliegt 3 km nach Norden, dann 3 km nach Osten und dann 3 km nach Süden. Wie weit ist er vom Start weg?', a: ['3 km', '0 km', '9 km'], ok: 0, why: 'Norden und Süden heben sich auf – übrig bleiben die 3 km nach Osten!', d: 2 },
      { q: 'Bei einem Rennen überholst du den Letzten. Auf welchem Platz bist du jetzt?', a: ['Das geht gar nicht!', 'Vorletzter', 'Letzter'], ok: 0, why: 'Hinter dem Letzten ist niemand – du kannst ihn gar nicht überholen!', trick: true, d: 3 },
      { q: 'Ein Elektrozug fährt nach Süden, der Wind weht nach Norden. In welche Richtung zieht der Rauch?', a: ['Es gibt keinen Rauch', 'Nach Norden', 'Nach Süden'], ok: 0, why: 'Ein Elektrozug macht gar keinen Rauch!', trick: true, d: 3 },
      { q: 'Welche Zahl kommt als Nächstes? 3, 6, 12, 24, …', a: ['48', '36', '30'], ok: 0, why: 'Jedes Mal wird verdoppelt: 24 + 24 = 48!', d: 1 },
      { q: 'Eine Schnecke klettert eine 5 m hohe Wand hoch: tagsüber 3 m rauf, nachts 2 m runter. Wann ist sie oben?', a: ['Am 3. Tag', 'Am 5. Tag', 'Am 4. Tag'], ok: 0, why: 'Nach 2 Tagen und 2 Nächten ist sie auf 2 m. Am 3. Tag klettert sie 3 m – und ist oben!', d: 3 },
      { q: 'Wie viele Monate haben 31 Tage?', a: ['7', '6', '5'], ok: 0, why: 'Januar, März, Mai, Juli, August, Oktober und Dezember – das sind 7!', d: 2 },
      { q: 'Der Vater von Tim hat 4 Söhne. Drei heissen Nord, Süd und Ost. Wie heisst der vierte?', a: ['Tim', 'West', 'Mitte'], ok: 0, why: 'Es ist doch der Vater von Tim – der vierte Sohn heisst Tim!', trick: true, d: 3 },
      { q: 'Ein Dino hat 20 Zähne. Jeden Monat fallen 2 aus, aber 3 wachsen nach. Wie viele Zähne hat er nach 4 Monaten?', a: ['24', '16', '28'], ok: 0, why: 'Jeden Monat kommt netto 1 Zahn dazu (−2 + 3). Nach 4 Monaten sind es 20 + 4 = 24!', d: 1 },
      { q: 'Welcher dieser Dinos hat am spätesten gelebt?', a: ['T-Rex', 'Stegosaurus', 'Brachiosaurus'], ok: 0, why: 'Der T-Rex lebte ganz am Ende der Dinozeit. Stegosaurus und Brachiosaurus lebten viele Millionen Jahre früher!', d: 1 },
      { q: 'Was ist die Hälfte von doppelt so viel wie 7?', a: ['7', '14', '3,5'], ok: 0, why: 'Doppelt so viel wie 7 ist 14 – und die Hälfte davon ist wieder 7!', d: 3 },
      { q: 'Welcher Buchstabe kommt als Nächstes? E, Z, D, V, F, S, S, …', a: ['A', 'N', 'Z'], ok: 0, why: 'Das sind die Anfangsbuchstaben der Zahlen: Eins, Zwei, Drei, Vier, Fünf, Sechs, Sieben – und dann Acht!', d: 1 },
      { q: 'Der Raptor steht links vom Triceratops. Der Triceratops steht links vom Stegosaurus. Wer steht in der Mitte?', a: ['Der Triceratops', 'Der Raptor', 'Der Stegosaurus'], ok: 0, why: 'Von links nach rechts: Raptor, Triceratops, Stegosaurus. In der Mitte steht der Triceratops!', d: 1 },
      { q: 'Wie viele Ecken hat ein Würfel?', a: ['8', '6', '12'], ok: 0, why: 'Ein Würfel hat 8 Ecken. (6 sind seine Flächen und 12 seine Kanten.)', d: 2 },
      { q: 'Ich habe Zähne, aber ich beisse nie. Was bin ich?', a: ['Ein Kamm', 'Ein Löffel', 'Ein Hut'], ok: 0, why: 'Ein Kamm hat Zähne, aber er beisst nicht – er macht nur die Haare schön!', d: 1 },
      { q: 'Ein Adler fliegt 20 km pro Stunde. Wie weit fliegt er in 90 Minuten?', a: ['30 km', '40 km', '20 km'], ok: 0, why: '90 Minuten sind anderthalb Stunden: 20 km + 10 km = 30 km!', d: 2 },
      { q: 'Der Pteranodon hatte Flügel aus dünner Haut statt aus Federn. Welches heutige Tier fliegt auch mit Flügeln aus Haut?', a: ['Die Fledermaus', 'Der Adler', 'Die Taube'], ok: 0, why: 'Fledermäuse fliegen mit einer dünnen Flughaut zwischen den langen Fingern – ähnlich wie die Flugsaurier!', d: 1 },
      { q: 'Um 12 Uhr sind es im Canyon 30 Grad. Bis 15 Uhr wird es jede Stunde 2 Grad wärmer. Wie warm ist es um 15 Uhr?', a: ['36 Grad', '32 Grad', '38 Grad'], ok: 0, why: 'Von 12 bis 15 Uhr sind es 3 Stunden, also 3 mal 2 = 6 Grad mehr: 30 + 6 = 36!', d: 1 },
      { q: 'Ich habe vier Beine, aber ich kann nicht laufen. Man sitzt auf mir. Was bin ich?', a: ['Ein Stuhl', 'Ein Pferd', 'Ein Hund'], ok: 0, why: 'Ein Stuhl hat vier Beine – aber er bleibt immer an derselben Stelle stehen!', d: 1 },
      { q: 'Zwei Raptoren rennen 100 m weit. Der erste rennt 10 m pro Sekunde, der zweite 8 m pro Sekunde. Wie weit vom Ziel ist der zweite, wenn der erste ankommt?', a: ['20 m', '2 m', '10 m'], ok: 0, why: 'Der erste braucht 10 Sekunden. In dieser Zeit rennt der zweite 8 mal 10 = 80 m – ihm fehlen noch 20 m!', d: 2 },
      { q: 'Ein Pfad im Canyon ist ein Rechteck: 6 m lang und 2 m breit. Wie lang ist der Zaun, der einmal rund um den Pfad geht?', a: ['16 m', '12 m', '8 m'], ok: 0, why: '6 + 2 + 6 + 2 = 16 Meter!', d: 2 },
      { q: 'Der berühmteste Canyon der Welt heisst Grand Canyon. In welchem Land liegt er?', a: ['In den USA', 'In Australien', 'In Brasilien'], ok: 0, why: 'Der Grand Canyon liegt im Südwesten der USA und ist über 400 km lang!', d: 2 },
      { q: 'Ich bin eine ungerade, zweistellige Zahl. Meine beiden Ziffern ergeben zusammen 9, und man kann mich durch 5 teilen. Wer bin ich?', a: ['45', '35', '90'], ok: 0, why: 'Durch 5 teilbar heisst: Die Zahl endet auf 0 oder 5. Ungerade, also endet sie auf 5 – und 4 + 5 = 9. Das ist die 45!', d: 2 },
      { q: 'Heute ist Mittwoch. Welcher Wochentag ist in 100 Tagen?', a: ['Freitag', 'Donnerstag', 'Samstag'], ok: 0, why: '100 Tage sind 14 Wochen und 2 Tage. Nach 14 Wochen ist wieder Mittwoch, dann noch 2 Tage: Freitag!', d: 3 },
      { q: 'Ein Zug (200 m lang) fährt mit 20 m pro Sekunde in einen 400 m langen Tunnel. Wann ist der ganze Zug wieder draussen, ab dem Moment gerechnet, in dem die Lok hineinfährt?', a: ['Nach 30 Sekunden', 'Nach 20 Sekunden', 'Nach 10 Sekunden'], ok: 0, why: 'Der Zug muss 400 m Tunnel plus seine eigene Länge von 200 m schaffen: 600 m geteilt durch 20 m pro Sekunde sind 30 Sekunden!', d: 3 },
      { q: 'Fünf gerade Zahlen hintereinander (wie 2, 4, 6, 8, 10) ergeben zusammen 100. Wie heisst die grösste von ihnen?', a: ['24', '22', '20'], ok: 0, why: 'Die mittlere Zahl ist 100 geteilt durch 5, also 20. Die Zahlen sind 16, 18, 20, 22 und 24 – die grösste ist 24!', d: 3 },
    ],
    sky: ['#d9702e', '#f7d08a'], far: '#c0643a', mid: '#9a4a2a', ground: '#b5603a', top: '#d98b4e', dots: '#8e4526', edge: '#6e2f17', plat: '#8b4a2b', platTop: '#e0a060',
    rock: '#8d5a3b', deco: '#7a3a1e', volcS: 0.65, volcCol: '#9c5a3c', mesa: true, egg: '#cfe8ff', eggSpot: '#e07b39' },
  { name: 'Eiszeit', speed: 315, segs: 34, patterns: ['rock', 'rock2', 'pit', 'icicle', 'icicle', 'raptor', 'ptero', 'boulder', 'plat', 'amber', 'low', 'compy', 'compy', 'geode', 'pitRock', 'lowRock', 'compyRun', 'hopper', 'plant', 'meteor', 'bounce', 'bounceUp', 'crumble', 'raptor2'],
    startTip: 'Brrr, die Eiszeit! Neue Fähigkeit: Spring hoch und drück STAMPF – das knackt Bernstein-Steine und plättet Kompsis!',
    riddles: [
      { q: 'Das Thermometer zeigt −3 Grad. Dann wird es 8 Grad wärmer. Wie warm ist es jetzt?', a: ['5 Grad', '11 Grad', '−11 Grad'], ok: 0, why: 'Von −3 sind es 3 Grad bis 0 – und dann noch 5 weiter: 5 Grad!', d: 1 },
      { q: 'In einer Kiste liegen rote und blaue Socken. Wie viele musst du blind herausnehmen, damit sicher 2 gleiche dabei sind?', a: ['3', '2', '4'], ok: 0, why: 'Es gibt nur 2 Farben – bei 3 Socken sind darum sicher 2 gleich!', trick: true, d: 3 },
      { q: '8 Pinguine stehen in einer Reihe, zwischen je zwei ist 1 Meter Platz. Wie lang sind alle Lücken zusammen?', a: ['7 Meter', '8 Meter', '9 Meter'], ok: 0, why: 'Zwischen 8 Pinguinen gibt es nur 7 Lücken!', d: 2 },
      { q: 'Ein Mammut ist doppelt so schwer wie ein Nashorn. Zusammen wiegen sie 9 Tonnen. Wie schwer ist das Mammut?', a: ['6 Tonnen', '4,5 Tonnen', '3 Tonnen'], ok: 0, why: 'Nashorn 3 Tonnen + Mammut 6 Tonnen = 9 Tonnen!', d: 3 },
      { q: 'Ein Höhlenlöwe schläft 16 Stunden am Tag. Wie viele Stunden ist er in einer Woche wach?', a: ['56 Stunden', '48 Stunden', '112 Stunden'], ok: 0, why: '24 − 16 = 8 Stunden wach pro Tag. Und 8 mal 7 Tage sind 56 Stunden!', d: 2 },
      { q: 'Welche Zahl kommt als Nächstes? 1, 1, 2, 3, 5, 8, …', a: ['13', '11', '10'], ok: 0, why: 'Jede Zahl ist die Summe der zwei davor: 5 + 8 = 13!', d: 3 },
      { q: 'Ein Schneemann schmilzt jeden Tag auf die Hälfte. Am 4. Tag ist er 10 cm hoch. Wie hoch war er am 1. Tag?', a: ['80 cm', '40 cm', '160 cm'], ok: 0, why: 'Rückwärts verdoppeln: 10 → 20 → 40 → 80 cm!', d: 3 },
      { q: 'Was ist schwerer: 1 Liter Wasser oder 1 Liter Eis?', a: ['1 Liter Wasser', '1 Liter Eis', 'Beide gleich'], ok: 0, why: 'Eis ist leichter als Wasser – darum schwimmen Eisberge oben!', d: 2 },
      { q: 'Es ist 10 Uhr. Wie spät ist es in 100 Minuten?', a: ['11:40 Uhr', '11:00 Uhr', '12:00 Uhr'], ok: 0, why: '100 Minuten sind 1 Stunde und 40 Minuten: 11:40 Uhr!', d: 1 },
      { q: 'Ein Eisbär steht genau auf dem Nordpol. In welche Richtung schaut er, egal wie er sich dreht?', a: ['Nach Süden', 'Nach Norden', 'Nach Osten'], ok: 0, why: 'Vom Nordpol aus geht jede Richtung nach Süden!', trick: true, d: 2 },
      { q: 'Welche Zahl kommt als Nächstes? 2, 4, 3, 6, 5, 10, …', a: ['9', '12', '20'], ok: 0, why: 'Abwechselnd mal 2 und minus 1: 10 − 1 = 9!', d: 1 },
      { q: 'Am Morgen sind es −5 Grad. Mittags wird es 4 Grad wärmer, abends 7 Grad kälter als mittags. Wie kalt ist es abends?', a: ['−8 Grad', '−2 Grad', '2 Grad'], ok: 0, why: '−5 + 4 = −1 Grad am Mittag. Und −1 − 7 = −8 Grad am Abend!', d: 1 },
      { q: 'Wer lebte später: das Wollmammut oder der T-Rex?', a: ['Das Wollmammut', 'Der T-Rex', 'Beide gleichzeitig'], ok: 0, why: 'Der T-Rex lebte vor etwa 66 Millionen Jahren. Mammuts gab es noch vor wenigen tausend Jahren!', d: 1 },
      { q: 'Drei Pinguine stehen im Kreis. Jeder gibt jedem anderen einen Fisch. Wie viele Fische werden verschenkt?', a: ['6', '3', '9'], ok: 0, why: 'Jeder Pinguin gibt 2 Fische weiter. 3 mal 2 sind 6 Fische!', d: 2 },
      { q: 'Ein Eiswürfel ist 2 cm lang, 2 cm breit und 2 cm hoch. Wie viele solche Würfel passen in eine Schachtel, die 4 cm lang, breit und hoch ist?', a: ['8', '4', '16'], ok: 0, why: 'Auf den Boden passen 4 Würfel (2 mal 2). Und es passen 2 Schichten übereinander: 8 Würfel!', d: 3 },
      { q: 'Welches Tier der Eiszeit hatte ein dickes Fell und riesige, gebogene Stosszähne?', a: ['Das Wollmammut', 'Der Eisbär', 'Die Robbe'], ok: 0, why: 'Das Wollmammut hatte langes, zotteliges Fell und Stosszähne, die mehrere Meter lang werden konnten!', d: 1 },
      { q: 'Auf einer Eisscholle stehen 4 Pinguine und 1 Eisbär. Pinguine haben 2 Füsse, der Eisbär hat 4 Pfoten. Wie viele Füsse und Pfoten sind das zusammen?', a: ['12', '10', '14'], ok: 0, why: '4 Pinguine mal 2 Füsse sind 8, dazu 4 Pfoten vom Eisbär: 12!', d: 1 },
      { q: 'Ich bin ein Haus aus festen Schneeblöcken. Menschen im hohen Norden bauen mich als Unterkunft. Was bin ich?', a: ['Ein Iglu', 'Ein Turm', 'Ein Zelt'], ok: 0, why: 'Ein Iglu wird aus Blöcken aus festem Schnee gebaut – drinnen ist es überraschend warm!', d: 1 },
      { q: 'Von einem Eisberg schaut nur ein Zehntel aus dem Wasser. Der Teil über dem Wasser ist 3 m hoch. Wie hoch ist der ganze Eisberg?', a: ['30 m', '27 m', '33 m'], ok: 0, why: 'Wenn 3 m ein Zehntel sind, ist der ganze Eisberg 10 mal so gross: 30 m!', d: 2 },
      { q: 'Wann ging die letzte Eiszeit ungefähr zu Ende?', a: ['Vor etwa 12 000 Jahren', 'Vor etwa 100 Jahren', 'Vor etwa 66 Millionen Jahren'], ok: 0, why: 'Die letzte Eiszeit endete vor etwa 12 000 Jahren. Die grossen Dinosaurier waren da schon seit 66 Millionen Jahren verschwunden!', d: 2 },
      { q: 'Ein Pinguin-Papa wärmt sein Ei 9 Wochen lang. 4 Wochen sind schon vorbei. Wie viele Tage dauert es noch bis zum Schlüpfen?', a: ['35 Tage', '5 Tage', '28 Tage'], ok: 0, why: '9 − 4 = 5 Wochen sind noch übrig, und 5 mal 7 Tage sind 35 Tage!', d: 2 },
      { q: 'Ein Wolf frisst in 3 Tagen 6 Fische, ein Bär in 2 Tagen 6 Fische. Wie viele Fische fressen beide zusammen in 6 Tagen?', a: ['30', '24', '36'], ok: 0, why: 'Der Wolf frisst 2 Fische pro Tag, der Bär 3. Zusammen sind das 5 pro Tag, und in 6 Tagen sind es 30 Fische!', d: 2 },
      { q: 'Ein Eisfeld besteht aus 3 mal 3 kleinen Quadraten. Wie viele Quadrate kannst du insgesamt zählen, kleine und grosse zusammen?', a: ['14', '9', '13'], ok: 0, why: '9 kleine, dazu 4 Quadrate aus je 2 mal 2 und 1 grosses aus 3 mal 3: 9 + 4 + 1 = 14!', d: 3 },
      { q: 'Zwei Pumpen füllen eine Eisbahn mit Wasser. Die erste braucht allein 6 Stunden, die zweite allein 3 Stunden. Wie lange brauchen beide zusammen?', a: ['2 Stunden', '4,5 Stunden', '3 Stunden'], ok: 0, why: 'In einer Stunde schafft die erste ein Sechstel, die zweite ein Drittel – zusammen die Hälfte. Also brauchen beide 2 Stunden!', d: 3 },
      { q: 'Welche Zahl kommt als Nächstes? 2, 3, 5, 9, 17, …', a: ['33', '25', '31'], ok: 0, why: 'Die Abstände verdoppeln sich: +1, +2, +4, +8 – und jetzt +16. 17 + 16 = 33!', d: 3 },
    ],
    sky: ['#0b1f3f', '#5d86b8'], far: '#c9dcf0', mid: '#8fb0d6', ground: '#5f7591', top: '#f4f8ff', dots: '#4b5f7a', edge: '#3c4f68', plat: '#9fc3e6', platTop: '#ffffff',
    rock: '#7f93ab', deco: '#1d3b4f', volcS: 0.85, volcCol: '#3a4f6e', stars: true, snow: true, egg: '#e8f4ff', eggSpot: '#5aa0e0' },
  { name: 'Vulkan', speed: 335, segs: 36, patterns: ['pit', 'pit', 'geyser', 'geyser', 'raptor', 'ptero', 'swoop', 'boulder', 'rock2', 'plat', 'low', 'compy', 'compy', 'geode', 'pitRock', 'lowRock', 'compyRun', 'hopper', 'plant', 'meteor', 'meteors', 'bounce', 'crumble', 'raptor2'],
    startTip: 'Der Vulkan! Neu: Feuer-Chilis! Damit kann {rex} Feuer spucken. Und irgendwo hier ist das goldene Ei…',
    riddles: [
      { q: 'Ben ist grösser als Ana. Ana ist kleiner als Max, aber grösser als Lou. Wer ist am kleinsten?', a: ['Lou', 'Ana', 'Max'], ok: 0, why: 'Ben und Max sind grösser als Ana, und Ana ist grösser als Lou – also ist Lou am kleinsten!', d: 1 },
      { q: 'Vulkan A bricht alle 12 Jahre aus, Vulkan B alle 8 Jahre. Heute beide. In wie vielen Jahren wieder beide?', a: ['24 Jahre', '20 Jahre', '96 Jahre'], ok: 0, why: '24 kommt in beiden Reihen zuerst vor: 12, 24 … und 8, 16, 24!', d: 3 },
      { q: 'Ich bin eine dreistellige Zahl. Alle meine Ziffern sind gleich und zusammen ergeben sie 3. Wer bin ich?', a: ['111', '300', '333'], ok: 0, why: '1 + 1 + 1 = 3 – und alle Ziffern sind gleich!', d: 1 },
      { q: 'Welcher Dino hat NICHT zur gleichen Zeit gelebt wie der T-Rex?', a: ['Stegosaurus', 'Triceratops', 'Ankylosaurus'], ok: 0, why: 'Der Stegosaurus lebte viel früher. Zwischen ihm und dem T-Rex liegt mehr Zeit als zwischen dem T-Rex und uns!', d: 2 },
      { q: 'Was kommt einmal in jeder Minute vor, zweimal in jedem Moment, aber nie in tausend Jahren?', a: ['Der Buchstabe M', 'Ein Meteorit', 'Ein Vulkanausbruch'], ok: 0, why: '„Minute“ hat ein M, „Moment“ hat zwei M – und in „tausend Jahren“ ist gar kein M!', trick: true, d: 3 },
      { q: 'Welches dieser Tiere ist am nächsten mit dem T-Rex verwandt?', a: ['Huhn', 'Krokodil', 'Eidechse'], ok: 0, why: 'Überraschung: Vögel stammen von den Dinos ab – das Huhn ist näher verwandt als Krokodil und Eidechse!', d: 1 },
      { q: 'Ein voller Krug Lava wiegt 10 kg, halb voll wiegt er 6 kg. Wie schwer ist der leere Krug?', a: ['2 kg', '5 kg', '4 kg'], ok: 0, why: 'Die halbe Lava wiegt 10 − 6 = 4 kg, also die ganze 8 kg. Für den Krug bleiben 2 kg!', d: 3 },
      { q: 'Welche Zahl kommt als Nächstes? 2, 3, 5, 7, 11, …', a: ['13', '15', '12'], ok: 0, why: 'Das sind Primzahlen – man kann sie nur durch 1 und sich selbst teilen. Die nächste ist 13!', d: 2 },
      { q: 'Ein Brett ist 2 Meter lang. Du sägst es in Stücke von 50 cm. Wie oft musst du sägen?', a: ['3 Mal', '4 Mal', '2 Mal'], ok: 0, why: 'Es gibt 4 Stücke – dafür brauchst du nur 3 Schnitte!', d: 2 },
      { q: 'Ein Vulkan spuckt am 1. Tag 1 Stein, am 2. Tag 2 Steine, am 3. Tag 3 Steine und so weiter. Wie viele Steine sind es nach 5 Tagen zusammen?', a: ['15', '10', '25'], ok: 0, why: '1 + 2 + 3 + 4 + 5 = 15 Steine!', d: 1 },
      { q: 'Ich bin eine Zahl. Man kann mich durch 2, durch 3 und durch 5 teilen, ohne Rest. Und ich bin kleiner als 40. Wer bin ich?', a: ['30', '15', '60'], ok: 0, why: '30 geteilt durch 2, 3 und 5 gibt 15, 10 und 6. Die 15 geht nicht durch 2, die 60 ist zu gross!', d: 2 },
      { q: 'Wie heisst die glühende, flüssige Masse, solange sie noch im Berg drin ist?', a: ['Magma', 'Lava', 'Asche'], ok: 0, why: 'Im Berg heisst sie Magma. Erst wenn sie aus dem Vulkan fliesst, nennt man sie Lava!', d: 1 },
      { q: 'Ein Vulkan hat 3 Krater. Aus jedem kommen pro Minute 4 Lavaströme, aber nur die Hälfte erreicht das Tal. Wie viele sind es in 3 Minuten im Tal?', a: ['18', '36', '9'], ok: 0, why: '3 mal 4 sind 12 Ströme pro Minute, die Hälfte davon 6. In 3 Minuten sind es 18!', d: 2 },
      { q: 'Welche Zahl kommt als Nächstes? 1, 8, 27, 64, …', a: ['125', '100', '216'], ok: 0, why: '1×1×1, 2×2×2, 3×3×3, 4×4×4 – als Nächstes 5×5×5 = 125!', d: 3 },
      { q: 'Zwei Väter und zwei Söhne essen zusammen 3 Pfannkuchen, und jeder isst genau einen. Wie viele Personen sind es?', a: ['3', '4', '2'], ok: 0, why: 'Grossvater, Vater und Sohn: Der Vater ist gleichzeitig Sohn und Vater!', trick: true, d: 3 },
      { q: 'Wie nennt man die Öffnung oben auf einem Vulkan, aus der Lava und Asche kommen?', a: ['Der Krater', 'Der Hang', 'Der Fuss'], ok: 0, why: 'Der Krater ist die Öffnung oben auf dem Vulkan – hier bricht das Feuer heraus!', d: 1 },
      { q: 'Frische Lava ist 1000 Grad heiss und kühlt jede Stunde um 100 Grad ab. Wie heiss ist sie nach 4 Stunden?', a: ['600 Grad', '400 Grad', '900 Grad'], ok: 0, why: '4 mal 100 Grad Abkühlung sind 400 Grad. 1000 minus 400 sind 600 Grad!', d: 1 },
      { q: 'Wie nennt man versteinerte Überreste von Tieren, zum Beispiel Dinosaurier-Knochen?', a: ['Fossilien', 'Edelsteine', 'Kristalle'], ok: 0, why: 'Fossilien sind Überreste von Lebewesen, die über Millionen von Jahren zu Stein geworden sind!', d: 1 },
      { q: 'Welcher Stein aus Vulkanen ist voller Luftblasen und kann sogar auf dem Wasser schwimmen?', a: ['Bimsstein', 'Granit', 'Marmor'], ok: 0, why: 'Bimsstein entsteht aus schäumender Lava. Die vielen Luftblasen machen ihn so leicht, dass er schwimmt!', d: 2 },
      { q: 'Auf welcher Insel liegt der berühmte Vulkan Ätna?', a: ['Auf Sizilien', 'Auf Island', 'Auf Mallorca'], ok: 0, why: 'Der Ätna liegt auf der italienischen Insel Sizilien und ist einer der aktivsten Vulkane Europas!', d: 2 },
      { q: 'Welcher Vulkan brach im Jahr 79 aus und verschüttete die römische Stadt Pompeji?', a: ['Der Vesuv', 'Der Ätna', 'Der Fuji'], ok: 0, why: 'Der Vesuv in Italien begrub Pompeji unter Asche – darum ist die Stadt heute noch so gut erhalten!', d: 2 },
      { q: 'Ein Wanderer geht 3 Stunden bergauf mit 2 km pro Stunde und danach 2 Stunden bergab mit 3 km pro Stunde. Wie viele Kilometer ist er insgesamt gegangen?', a: ['12 km', '10 km', '6 km'], ok: 0, why: 'Bergauf 3 mal 2 = 6 km, bergab 2 mal 3 = 6 km. Zusammen sind das 12 km!', d: 2 },
      { q: 'Ein Vulkan spuckt in der 1. Minute 3 Steine. In jeder weiteren Minute spuckt er doppelt so viele wie in der Minute davor. Wie viele sind es nach 4 Minuten zusammen?', a: ['45', '48', '24'], ok: 0, why: '3 + 6 + 12 + 24 = 45 Steine!', d: 3 },
      { q: 'Ein Lavastein wiegt 1 kg plus einen halben Lavastein. Wie viele kg wiegt der ganze Stein?', a: ['2 kg', '1,5 kg', '3 kg'], ok: 0, why: 'Der halbe Stein wiegt 1 kg – also wiegt der ganze Stein 2 kg!', d: 3 },
      { q: 'Du schreibst alle Zahlen von 1 bis 100 auf. Wie viele dieser Zahlen enthalten die Ziffer 9?', a: ['19', '20', '10'], ok: 0, why: 'Zahlen mit einer 9 am Ende: 9, 19, … 99 (10 Stück). Zahlen von 90 bis 99: ebenfalls 10 Stück. Die 99 ist in beiden dabei – also 19!', d: 3 },
    ],
    sky: ['#1a0505', '#8a2a10'], far: '#3a0f0a', mid: '#250807', ground: '#2a1a16', top: '#4a2a20', dots: '#ff5a1f', edge: '#170c0a', plat: '#3a2722', platTop: '#ff7a2a',
    rock: '#4a3a36', deco: '#140404', volcS: 1.25, volcCol: '#43180f', lava: true, egg: '#ffd9c2', eggSpot: '#c0392b' },
  { name: 'Weihnacht', art: 2, bonus: true, speed: 345, segs: 36, patterns: ['rock', 'rock2', 'pit', 'icicle', 'icicle', 'raptor', 'ptero', 'swoop', 'boulder', 'plat', 'amber', 'low', 'compy', 'geode', 'pitRock', 'lowRock', 'compyRun', 'hopper', 'hopper2', 'plant', 'meteor', 'meteors', 'bounce', 'bounceUp', 'crumble', 'raptor2'],
    startTip: 'Bonus-Welt: die Weihnachtsnacht! Alles, was du gelernt hast, hilft dir hier. Findest du alle 3 Eier und die Feuer-Chilis?',
    riddles: [
      { q: 'Acht Elfen tragen Geschenke. Sieben Elfen tragen je 7 Geschenke, der kleinste Elf nur 2. Wie viele Geschenke sind es zusammen?', a: ['51', '58', '56'], ok: 0, why: '7 mal 7 sind 49, dazu die 2 vom kleinsten Elf: 51!', d: 3 },
      { q: 'Welche Zahl kommt als Nächstes? 1, 3, 7, 15, 31, …', a: ['63', '47', '62'], ok: 0, why: 'Es kommt +2, +4, +8, +16 dazu – und jetzt +32: 31 + 32 = 63!', d: 3 },
      { q: 'Am Baum hängen 3 rote Kugeln für jede goldene. Es sind 4 goldene. Wie viele Kugeln sind es zusammen?', a: ['16', '12', '7'], ok: 0, why: '4 goldene und 3 mal 4 = 12 rote – zusammen 16 Kugeln!', d: 1 },
      { q: 'Am Adventskranz stehen 3 Kerzen. Du bläst eine aus. Wie viele Kerzen stehen jetzt noch am Kranz?', a: ['3', '2', '1'], ok: 0, why: 'Die ausgeblasene Kerze steht ja immer noch da – es sind weiterhin 3 Kerzen!', trick: true, d: 2 },
      { q: 'Welche Zahl kommt als Nächstes? 25, 24, 22, 19, …', a: ['15', '16', '17'], ok: 0, why: 'Es wird jedes Mal ein bisschen mehr abgezogen: −1, −2, −3 – und jetzt −4. 19 − 4 = 15!', d: 2 },
      { q: 'Was ist schwerer: 1 kg Schnee oder 1 kg Lebkuchen?', a: ['Beide gleich schwer', 'Der Lebkuchen', 'Der Schnee'], ok: 0, why: '1 Kilogramm ist immer 1 Kilogramm – egal, woraus es besteht!', trick: true, d: 1 },
      { q: 'Ein Wichtel packt in 3 Minuten 2 Geschenke ein. Wie viele packt er in 15 Minuten ein?', a: ['10', '6', '5'], ok: 0, why: '15 Minuten sind 5 mal 3 Minuten. Also 5 mal 2 = 10 Geschenke!', d: 1 },
      { q: 'Ein Geschenk kostet 20 Franken. Es ist halb so teuer wie ein Schlitten. Was kosten beide zusammen?', a: ['60 Franken', '40 Franken', '30 Franken'], ok: 0, why: 'Der Schlitten kostet 40 Franken. 20 + 40 = 60 Franken!', d: 2 },
      { q: 'Eine Adventskerze ist 24 cm lang und brennt jeden Tag 3 cm ab. Nach wie vielen Tagen ist sie nur noch 6 cm lang?', a: ['6 Tage', '8 Tage', '7 Tage'], ok: 0, why: '24 − 6 = 18 cm sind abgebrannt, und 18 geteilt durch 3 sind 6 Tage!', d: 3 },
      { q: 'Ich habe Städte, aber keine Häuser. Berge, aber keine Bäume. Wasser, aber keine Fische. Was bin ich?', a: ['Eine Landkarte', 'Ein Traum', 'Ein Bild'], ok: 0, why: 'Auf einer Landkarte sind Städte, Berge und Seen nur eingezeichnet!', d: 3 },
      { q: 'Der Schlitten hat 12 Rentiere. Ein Drittel davon hat eine rote Nase. Wie viele haben keine rote Nase?', a: ['8', '4', '3'], ok: 0, why: 'Ein Drittel von 12 sind 4 mit roter Nase. Also haben 12 − 4 = 8 keine rote Nase!', d: 2 },
      { q: 'Ich habe viele Nadeln, aber ich kann nicht nähen. Im Dezember stellt man mich ins Wohnzimmer. Was bin ich?', a: ['Ein Tannenbaum', 'Ein Igel', 'Ein Kaktus'], ok: 0, why: 'Ein Tannenbaum hat Nadeln und wird an Weihnachten mit Kugeln geschmückt!', d: 1 },
      { q: 'Ein Lebkuchen kostet 2 Franken, ein Punsch 3 Franken. Du kaufst 4 Lebkuchen und 2 Punsch und gibst 20 Franken. Wie viel Rückgeld bekommst du?', a: ['6 Franken', '14 Franken', '4 Franken'], ok: 0, why: '4 mal 2 sind 8, 2 mal 3 sind 6: zusammen 14 Franken. 20 − 14 = 6 Franken Rückgeld!', d: 3 },
      { q: 'Heute ist Montag. In 10 Tagen ist Weihnachten. Welcher Wochentag ist dann?', a: ['Donnerstag', 'Mittwoch', 'Freitag'], ok: 0, why: 'Nach 7 Tagen ist wieder Montag, dann noch 3 Tage: Dienstag, Mittwoch, Donnerstag!', d: 2 },
      { q: 'Am Baum hängt die Hälfte rote Kugeln, ein Viertel goldene und 6 silberne. Wie viele Kugeln hängen am Baum?', a: ['24', '12', '18'], ok: 0, why: 'Rot und Gold sind zusammen drei Viertel, also sind die 6 silbernen ein Viertel. 4 mal 6 sind 24 Kugeln!', d: 1 },
      { q: 'Wie viele Kerzen brennen am Adventskranz am 3. Advent?', a: ['3', '4', '2'], ok: 0, why: 'Am 1. Advent brennt 1 Kerze, am 2. Advent 2 – und am 3. Advent brennen 3 Kerzen!', d: 1 },
      { q: 'Wer kommt in der Schweiz am 6. Dezember und bringt Nüsse, Mandarinen und Lebkuchen?', a: ['Der Samichlaus', 'Der Osterhase', 'Die Zahnfee'], ok: 0, why: 'Am 6. Dezember kommt der Samichlaus, oft mit dem Schmutzli, und hat Nüsse, Mandarinen und Lebkuchen im Sack!', d: 1 },
      { q: 'Der Wichtel hat 20 Geschenke. Er verteilt sie gleichmässig auf 4 Schuhe. Wie viele Geschenke kommen in jeden Schuh?', a: ['5', '4', '16'], ok: 0, why: '20 geteilt durch 4 sind 5 Geschenke pro Schuh!', d: 1 },
      { q: 'Oma backt 3 Bleche mit je 12 Guetzli. Die Kinder essen die Hälfte davon. Wie viele Guetzli bleiben übrig?', a: ['18', '36', '24'], ok: 0, why: '3 mal 12 sind 36 Guetzli. Die Hälfte davon sind 18 – so viele bleiben übrig!', d: 2 },
      { q: 'Der 24. Dezember ist ein Dienstag. Welcher Wochentag ist dann der 31. Dezember?', a: ['Dienstag', 'Mittwoch', 'Montag'], ok: 0, why: 'Eine Woche hat 7 Tage – vom 24. bis zum 31. Dezember sind es genau 7 Tage. Also wieder Dienstag!', d: 2 },
      { q: 'Der Schlitten startet am 24. Dezember um 21 Uhr und fliegt 7 Stunden lang. Um wie viel Uhr landet er?', a: ['4 Uhr morgens', '3 Uhr morgens', '5 Uhr morgens'], ok: 0, why: 'Von 21 Uhr bis Mitternacht sind es 3 Stunden, dann noch 4 Stunden: Er landet um 4 Uhr morgens!', d: 2 },
      { q: 'Was gehört dir, wird aber von anderen viel öfter benutzt als von dir?', a: ['Dein Name', 'Dein Bett', 'Dein Schlitten'], ok: 0, why: 'Dein Name gehört dir – aber alle anderen benutzen ihn, wenn sie mit dir sprechen!', d: 2 },
      { q: 'Eine Tanne hat oben 1 Kugel, in der 2. Reihe 3 Kugeln, in der 3. Reihe 5, und so weiter (immer 2 mehr). Wie viele Kugeln hängen in 8 Reihen?', a: ['64', '56', '72'], ok: 0, why: '1 + 3 + 5 + 7 + 9 + 11 + 13 + 15 = 64. Tipp: Das ist immer die Reihenzahl mal sich selbst, also 8 mal 8!', d: 3 },
      { q: 'Ein Wichtel baut am 1. Tag 3 Spielzeuge. Jeden Tag baut er 2 mehr als am Tag davor. Wie viele sind es nach 5 Tagen insgesamt?', a: ['35', '25', '45'], ok: 0, why: '3 + 5 + 7 + 9 + 11 = 35 Spielzeuge!', d: 3 },
      { q: 'Anna, Ben und Cleo bekommen je ein Geschenk: ein Buch, einen Ball oder eine Puppe. Anna bekommt weder das Buch noch die Puppe. Ben bekommt kein Buch. Wer bekommt das Buch?', a: ['Cleo', 'Ben', 'Anna'], ok: 0, why: 'Anna bekommt den Ball. Ben darf kein Buch haben, also bekommt er die Puppe – das Buch geht an Cleo!', d: 3 },
    ],
    sky: ['#050b24', '#1c3a6e'], far: '#9fb8dc', mid: '#6b8ab4', ground: '#4f6585', top: '#f4f8ff', dots: '#3c4f6a', edge: '#2c3c54', plat: '#8fb3d8', platTop: '#ffffff',
    rock: '#7088a2', deco: '#14303f', volcS: 0.85, volcCol: '#2c3f5e', stars: true, snow: true, egg: '#ffe9c2', eggSpot: '#d63a3a' },
];

function ART(wi) { return WORLDS[wi].art != null ? WORLDS[wi].art : wi; }

WORLDS.push(
  { name: 'Strand', art: 5, speed: 285, segs: 52, patterns: ['rock', 'rock2', 'pit', 'amber', 'raptor', 'plat', 'boulder', 'compy', 'wall', 'wall', 'tide', 'tide', 'hopper', 'plant', 'meteor', 'bounce', 'bounceUp', 'crumble', 'raptor2'],
    startTip: 'Ein Strand! Neue Fähigkeit: FLITZ! Damit rennst du durch Sandmauern und Wellen.',
    riddles: [
      { q: 'Am Strand bauen 3 Kinder je 4 Sandburgen. Jede Burg hat 3 Türme, aber 5 Burgen stürzen ein. Wie viele Türme stehen noch?', a: ['21', '36', '15'], ok: 0, why: '3 mal 4 sind 12 Burgen, 5 stürzen ein – es bleiben 7. Und 7 mal 3 sind 21 Türme!', d: 3 },
      { q: 'Welche Zahl kommt als Nächstes? 2, 6, 12, 20, 30, …', a: ['42', '40', '36'], ok: 0, why: 'Es kommt +4, +6, +8, +10 dazu – und jetzt +12: 30 + 12 = 42!', d: 3 },
      { q: 'Eine Krabbe hat 10 Beine, ein Seestern 5 Arme. Am Strand liegen 4 Tiere mit zusammen 30 Beinen und Armen. Wie viele davon sind Krabben?', a: ['2', '1', '3'], ok: 0, why: '2 Krabben (20) und 2 Seesterne (10): das sind 4 Tiere und zusammen 30!', d: 3 },
      { q: 'Was wird nasser, je mehr es dich trocknet?', a: ['Ein Handtuch', 'Ein Schwamm', 'Die Sonne'], ok: 0, why: 'Ein Handtuch wird nasser, je mehr es dich trocknet!', d: 2 },
      { q: 'Am Strand liegen 12 Muscheln. Lena sammelt ein Drittel davon, Max sammelt 4. Wie viele Muscheln bleiben liegen?', a: ['4', '5', '8'], ok: 0, why: 'Ein Drittel von 12 sind 4. Lena und Max haben zusammen 8 – es bleiben 4!', d: 1 },
      { q: 'Welcher Monat hat 28 Tage?', a: ['Alle Monate', 'Nur der Februar', 'Keiner'], ok: 0, why: 'Jeder Monat hat mindestens 28 Tage!', trick: true, d: 2 },
      { q: 'Ich habe ein Gesicht und zwei Hände, aber keine Arme und Beine. Was bin ich?', a: ['Eine Uhr', 'Ein Seestern', 'Ein Strandball'], ok: 0, why: 'Eine Uhr hat ein Zifferblatt (Gesicht) und zwei Zeiger (Hände)!', d: 1 },
      { q: 'Du hast 5 Eis und isst alle bis auf 2. Wie viele hast du gegessen?', a: ['3', '2', '5'], ok: 0, why: 'Alle bis auf 2: 5 − 2 = 3 gegessen!', trick: true, d: 2 },
      { q: 'Welche Zahl kommt als Nächstes? 1, 4, 9, 16, …', a: ['25', '20', '24'], ok: 0, why: 'Das sind 1×1, 2×2, 3×3, 4×4 – als Nächstes 5×5 = 25!', d: 1 },
      { q: 'Ein Eis kostet 3 Franken. Zu jedem 4. gekauften Eis gibt es 1 Eis gratis dazu. Du hast 12 Franken. Wie viele Eis bekommst du?', a: ['5', '4', '6'], ok: 0, why: '12 Franken sind 4 gekaufte Eis – dazu kommt 1 gratis. Also 5 Eis!', d: 3 },
      { q: 'Ein Kind hat 3 Badehosen und 2 Sonnenhüte. Wie viele verschiedene Kombinationen gibt es?', a: ['6', '5', '3'], ok: 0, why: 'Jede der 3 Badehosen passt zu 2 Hüten: 3 mal 2 sind 6 Kombinationen!', d: 1 },
      { q: 'Ich komme zweimal am Tag und gehe zweimal am Tag. Dabei ziehe ich das Meer hinaus und wieder herein. Wer bin ich?', a: ['Ebbe und Flut', 'Der Wind', 'Die Sonne'], ok: 0, why: 'Ebbe und Flut wechseln sich ab: Zweimal am Tag kommt das Wasser und zweimal geht es!', d: 1 },
      { q: 'Ich bin immer vor dir, aber du kannst mich nie sehen. Was bin ich?', a: ['Die Zukunft', 'Dein Schatten', 'Der Wind'], ok: 0, why: 'Die Zukunft liegt immer vor dir – aber sehen kann man sie nicht!', d: 2 },
      { q: 'Ein Strandtuch ist 2 m lang und 1 m breit. Wie viele Tücher passen auf eine Fläche von 4 mal 3 Metern?', a: ['6', '7', '12'], ok: 0, why: 'Die Fläche hat 4 mal 3 = 12 Quadratmeter, jedes Tuch braucht 2: das sind 6 Tücher!', d: 3 },
      { q: 'Die rote Krabbe läuft 12 m in 4 Minuten, die blaue 18 m in 6 Minuten. Welche ist schneller?', a: ['Beide gleich schnell', 'Die rote', 'Die blaue'], ok: 0, why: 'Rot: 12 geteilt durch 4 sind 3 m pro Minute. Blau: 18 geteilt durch 6 sind auch 3 m pro Minute!', d: 1 },
      { q: 'Welches Tier läuft am Strand meistens seitwärts?', a: ['Die Krabbe', 'Die Möwe', 'Der Seestern'], ok: 0, why: 'Krabben laufen am liebsten seitwärts – das geht mit ihren Beinen am schnellsten!', d: 1 },
      { q: 'Am Strand stehen 6 Sonnenschirme. Unter jedem sitzen 3 Kinder. Wie viele Kinder sind das zusammen?', a: ['18', '9', '24'], ok: 0, why: '6 mal 3 sind 18 Kinder!', d: 1 },
      { q: 'Auf dem Dach sitzen 12 Möwen. 5 fliegen weg, 3 kommen zurück, dann fliegen 4 weg. Wie viele Möwen sitzen noch auf dem Dach?', a: ['6', '8', '10'], ok: 0, why: '12 − 5 = 7, dann + 3 = 10, dann − 4 = 6!', d: 1 },
      { q: 'Lisa geht um 14:30 Uhr ins Wasser und bleibt 45 Minuten drin. Um wie viel Uhr kommt sie wieder heraus?', a: ['15:15 Uhr', '15:30 Uhr', '15:45 Uhr'], ok: 0, why: '14:30 plus 30 Minuten sind 15:00, dazu noch 15 Minuten: 15:15 Uhr!', d: 2 },
      { q: 'Ein Sandeimer fasst 3 Liter. Für die Burg braucht Max 20 Liter Wasser. Wie oft muss er mindestens mit dem Eimer zum Meer laufen?', a: ['7 Mal', '6 Mal', '8 Mal'], ok: 0, why: '6 Mal sind erst 18 Liter – das reicht noch nicht. Mit dem 7. Mal hat er 21 Liter!', d: 2 },
      { q: 'Was hat Wellen, aber kein Wasser?', a: ['Die Haare', 'Der Sonnenschirm', 'Der Eisbecher'], ok: 0, why: 'Haare können Wellen haben – ganz ohne Wasser!', d: 2 },
      { q: 'Es ist genau 15 Uhr. Wie gross ist der Winkel zwischen dem Stunden- und dem Minutenzeiger?', a: ['90 Grad', '60 Grad', '120 Grad'], ok: 0, why: 'Um 15 Uhr zeigt der Minutenzeiger auf die 12 und der Stundenzeiger auf die 3 – das ist ein Viertel des Kreises: 90 Grad!', d: 2 },
      { q: 'Mia sammelt am 1. Tag 2 Muscheln. Jeden Tag sammelt sie doppelt so viele wie am Tag davor. Wie viele Muscheln hat sie nach 6 Tagen insgesamt?', a: ['126', '128', '64'], ok: 0, why: '2 + 4 + 8 + 16 + 32 + 64 = 126 Muscheln!', d: 3 },
      { q: 'Am Boot hängt eine Leiter mit 8 Sprossen. Die 2 untersten tauchen ins Wasser. Die Flut steigt pro Stunde um 1 Sprosse. Wie viele Sprossen sind nach 3 Stunden im Wasser?', a: ['2', '5', '3'], ok: 0, why: 'Achtung, das Boot schwimmt! Es steigt mit dem Wasser nach oben, und die Leiter mit ihm. Es bleiben 2 Sprossen im Wasser!', trick: true, d: 3 },
      { q: 'Sechs Kinder bilden für ein Beachvolleyball-Turnier Zweier-Teams. Wie viele verschiedene Teams sind möglich?', a: ['15', '12', '30'], ok: 0, why: 'Jedes der 6 Kinder kann mit 5 anderen ein Team bilden: 6 mal 5 = 30. Aber so wird jedes Team doppelt gezählt – also 15!', d: 3 },
    ],
    sky: ['#4fb6e8', '#bfe9ff'], far: '#7fd0e0', mid: '#e8d29a', ground: '#e8c985', top: '#f3dca0', dots: '#c9a95e', edge: '#a8883e', plat: '#b98a54', platTop: '#f3dca0', rock: '#b8a47a', deco: '#2f7d4a', volcS: 0.3, volcCol: '#6a8aa8', egg: '#fff0c8', eggSpot: '#ff7a5a' },
  { name: 'Unterwasser', art: 6, swim: true, speed: 270, segs: 52, patterns: ['coralgate', 'coralgate', 'jellies', 'jellies', 'urchins', 'sword', 'bubbles', 'rockwall'],
    startTip: 'Unter Wasser! Tippe, um nach oben zu schwimmen. DUCKEN taucht schneller ab.',
    riddles: [
      { q: 'Ein Wal taucht alle 6 Minuten zum Atmen auf, ein Delfin alle 10 Minuten. Jetzt sind beide oben. Nach wie vielen Minuten sind sie wieder gleichzeitig oben?', a: ['30 Minuten', '60 Minuten', '16 Minuten'], ok: 0, why: 'Wal: 6, 12, 18, 24, 30 – Delfin: 10, 20, 30. Nach 30 Minuten treffen sie sich!', d: 3 },
      { q: 'Welche Zahl kommt als Nächstes? 1, 2, 6, 24, 120, …', a: ['720', '240', '600'], ok: 0, why: 'Mal 2, mal 3, mal 4, mal 5 – und jetzt mal 6: 120 mal 6 = 720!', d: 3 },
      { q: 'Die Krake denkt sich eine Zahl. Sie rechnet mal 3, zieht 5 ab und bekommt 25. Welche Zahl war es?', a: ['10', '8', '12'], ok: 0, why: 'Rückwärts: 25 + 5 = 30, und 30 geteilt durch 3 ist 10!', d: 2 },
      { q: 'Welche Zahl passt nicht dazu? 4, 9, 16, 20, 25, 36', a: ['20', '25', '9'], ok: 0, why: 'Alle anderen sind Quadratzahlen (2×2, 3×3, 4×4, 5×5, 6×6) – nur die 20 nicht!', d: 3 },
      { q: 'Je mehr man davon wegnimmt, desto grösser wird es. Was ist das?', a: ['Ein Loch', 'Ein Haufen', 'Ein Berg'], ok: 0, why: 'Ein Loch wird grösser, wenn man etwas wegnimmt!', d: 2 },
      { q: 'Wie viele Beine haben 3 Delfine und 2 Krabben (jede Krabbe hat 10 Beine)?', a: ['20', '26', '30'], ok: 0, why: 'Delfine haben keine Beine – nur die Krabben: 2 mal 10 = 20!', trick: true, d: 1 },
      { q: 'Ein Becken fasst 600 Liter. Ein Hahn füllt 20 Liter pro Minute, ein Abfluss lässt 10 Liter pro Minute ab. Beide laufen. Wie lange dauert es, bis das leere Becken voll ist?', a: ['60 Minuten', '30 Minuten', '20 Minuten'], ok: 0, why: 'Pro Minute kommen 20 − 10 = 10 Liter dazu. 600 geteilt durch 10 sind 60 Minuten!', d: 3 },
      { q: 'In einem Aquarium sind 6 Fische. Alle bis auf 4 sind blau. Wie viele sind blau?', a: ['2', '4', '6'], ok: 0, why: 'Alle bis auf 4 sind blau – also sind 6 − 4 = 2 blau!', trick: true, d: 2 },
      { q: 'Welche Zahl kommt als Nächstes? 2, 3, 5, 8, 12, …', a: ['17', '16', '15'], ok: 0, why: 'Es kommt +1, +2, +3, +4 dazu – jetzt +5: 12 + 5 = 17!', d: 3 },
      { q: 'In einem Becken schwimmen 5 Fische. Einer hat nur ein Auge, alle anderen haben zwei. Wie viele Augen sind es zusammen?', a: ['9', '10', '8'], ok: 0, why: '4 Fische mit je 2 Augen sind 8, dazu das 1 Auge des fünften: 9 Augen!', d: 1 },
      { q: 'Ein Fisch schwimmt 3 m vorwärts und 1 m rückwärts, und das Ganze gleich nochmal. Wie weit ist er vom Start entfernt?', a: ['4 m', '8 m', '6 m'], ok: 0, why: '3 − 1 = 2 m, und nochmal 3 − 1 = 2 m: zusammen 4 m!', d: 1 },
      { q: 'Ein Taucher ist auf 30 m Tiefe und steigt 4 m pro Minute auf. Wie tief ist er nach 5 Minuten?', a: ['10 m', '20 m', '15 m'], ok: 0, why: '5 mal 4 sind 20 m aufgestiegen. 30 − 20 = 10 m Tiefe!', d: 2 },
      { q: 'Welches dieser Tiere ist kein Fisch?', a: ['Der Delfin', 'Der Hai', 'Der Thunfisch'], ok: 0, why: 'Der Delfin ist ein Säugetier: Er atmet Luft und trinkt Milch bei seiner Mama!', d: 1 },
      { q: 'Welches Meerestier hat drei Herzen und blaues Blut?', a: ['Die Krake', 'Der Hai', 'Der Wal'], ok: 0, why: 'Die Krake hat sogar 3 Herzen und blaues Blut!', d: 1 },
      { q: 'Ich wachse in einer Muschel, bin rund und glänze wie der Mond. Am Anfang war ich ein Sandkorn. Was bin ich?', a: ['Eine Perle', 'Ein Korallenzweig', 'Ein Seestern'], ok: 0, why: 'Um ein Sandkorn in der Muschel wächst Schicht für Schicht eine Perle!', d: 1 },
      { q: 'Welches ist das grösste Tier, das jemals auf der Erde gelebt hat?', a: ['Der Blauwal', 'Der Elefant', 'Der Brachiosaurus'], ok: 0, why: 'Der Blauwal wird bis zu 30 m lang und ist noch schwerer als der schwerste Dinosaurier!', d: 1 },
      { q: 'Womit atmen Fische unter Wasser?', a: ['Mit Kiemen', 'Mit der Nase', 'Mit den Flossen'], ok: 0, why: 'Fische atmen mit Kiemen. Sie holen damit den Sauerstoff aus dem Wasser!', d: 1 },
      { q: 'Ein Seestern hat 5 Arme, eine Krake 8. Wie viele Arme haben 2 Seesterne und 1 Krake zusammen?', a: ['18', '13', '21'], ok: 0, why: '2 mal 5 sind 10, dazu 8 Arme der Krake: 18!', d: 1 },
      { q: 'Die Luft in der Flasche eines Tauchers reicht 40 Minuten. Er braucht 5 Minuten zum Abtauchen und 10 zum Auftauchen. Wie lange kann er unten bleiben?', a: ['25 Minuten', '35 Minuten', '30 Minuten'], ok: 0, why: '5 + 10 = 15 Minuten gehen für das Ab- und Auftauchen weg. 40 − 15 = 25 Minuten bleiben!', d: 2 },
      { q: 'In 1 Liter Meerwasser sind etwa 35 g Salz gelöst. Wie viel Salz steckt in 4 Litern?', a: ['140 g', '120 g', '70 g'], ok: 0, why: '4 mal 35 g sind 140 g Salz!', d: 2 },
      { q: 'Drei Fische kosten so viel wie 2 Krebse. Ein Krebs kostet 6 Franken. Was kostet ein Fisch?', a: ['4 Franken', '3 Franken', '9 Franken'], ok: 0, why: '2 Krebse kosten 12 Franken. Das ist der Preis für 3 Fische, also kostet ein Fisch 12 geteilt durch 3 = 4 Franken!', d: 2 },
      { q: 'Der Kopf eines Fisches ist 9 cm lang. Der Schwanz ist so lang wie der Kopf plus ein halber Körper. Der Körper ist so lang wie Kopf und Schwanz zusammen. Wie lang ist der Fisch?', a: ['72 cm', '54 cm', '36 cm'], ok: 0, why: 'Der Körper ist 36 cm, der Schwanz 9 + 18 = 27 cm und der Kopf 9 cm: zusammen 72 cm!', d: 3 },
      { q: 'Wie viele Zahlen von 1 bis 100 kannst du ohne Rest durch 3 und durch 5 teilen?', a: ['6', '5', '7'], ok: 0, why: 'Es sind die Zahlen aus dem 15er-Einmaleins: 15, 30, 45, 60, 75 und 90 – also 6!', d: 3 },
      { q: 'Ein Aquarium ist 50 cm lang, 30 cm breit und 40 cm hoch. Wie viele Liter Wasser passen höchstens hinein?', a: ['60 Liter', '600 Liter', '6 Liter'], ok: 0, why: '50 mal 30 mal 40 sind 60 000 Kubikzentimeter – und 1000 davon sind 1 Liter. Also 60 Liter!', d: 3 },
      { q: 'Zwei Fische schwimmen vor einem Fisch, zwei Fische hinter einem Fisch und ein Fisch schwimmt in der Mitte. Wie viele Fische sind es mindestens?', a: ['3', '5', '4'], ok: 0, why: 'Drei Fische hintereinander reichen: Der hinterste hat zwei vor sich, der vorderste zwei hinter sich, und der mittlere schwimmt in der Mitte!', d: 3 },
    ],
    sky: ['#0a4a7a', '#2fb0c8'], far: '#2a7a9a', mid: '#1d6a8a', ground: '#d8c48a', top: '#e8d8a0', dots: '#b8a468', edge: '#8a7a48', plat: '#2f9a8a', platTop: '#7fe0c8', rock: '#5a7a8a', deco: '#1a5a6a', volcS: 0.3, volcCol: '#1d4a6a', egg: '#d8f4ff', eggSpot: '#ff8a6a' },
  { name: 'Berge', art: 7, speed: 300, segs: 52, patterns: ['rock', 'rock2', 'widegap', 'widegap', 'updraft', 'raptor', 'ptero', 'boulder', 'plat', 'amber', 'avalanche', 'compy', 'hopper', 'plant', 'meteor', 'meteors', 'bounce', 'crumble', 'raptor2'],
    startTip: 'Hoch in den Bergen! Neue Fähigkeit: GLEITEN. Halte die Taste in der Luft gedrückt und schwebe über die Schluchten.',
    riddles: [
      { q: 'Eine Gämse springt jeden Tag 8 m höher, rutscht aber jede Nacht 3 m ab. Nach wie vielen Tagen erreicht sie die 28 m?', a: ['5 Tage', '4 Tage', '6 Tage'], ok: 0, why: 'Netto sind es 5 m pro Tag. Nach 4 Tagen ist sie bei 20 m, am 5. Tag springt sie auf 28 m!', d: 3 },
      { q: 'Welche Zahl kommt als Nächstes? 1, 4, 10, 22, 46, …', a: ['94', '92', '70'], ok: 0, why: 'Jedes Mal mal 2 plus 2: 46 mal 2 sind 92, plus 2 ergibt 94!', d: 3 },
      { q: 'Ein Berg ist 3000 m hoch. Pro 100 m Höhe wird es 0,6 Grad kälter. Unten sind es 20 Grad. Wie warm ist es oben?', a: ['2 Grad', '12 Grad', '−18 Grad'], ok: 0, why: '30 mal 0,6 sind 18 Grad kälter: 20 − 18 = 2 Grad!', d: 3 },
      { q: 'Ich habe einen Fuss, aber keine Schuhe, und einen Gipfel, aber keinen Kopf. Was bin ich?', a: ['Ein Berg', 'Ein Baum', 'Ein Turm'], ok: 0, why: 'Ein Berg hat einen Fuss (ganz unten) und einen Gipfel!', d: 1 },
      { q: 'Auf dem Gipfel sind es −6 Grad, unten im Tal +4 Grad. Wie gross ist der Unterschied?', a: ['10 Grad', '2 Grad', '24 Grad'], ok: 0, why: 'Von −6 bis 0 sind es 6 Grad, dann noch 4: zusammen 10 Grad!', d: 2 },
      { q: 'Ein Wanderweg ist 12 km lang. Du bist die Hälfte gelaufen und dann noch 2 km. Wie viele km sind es noch?', a: ['4 km', '6 km', '2 km'], ok: 0, why: 'Die Hälfte sind 6 km, dazu 2 km = 8 km gelaufen. 12 − 8 = 4 km!', d: 2 },
      { q: 'Ein Adler fliegt gegen den Wind 60 km in 2 Stunden. Mit dem Wind schafft er die 60 km in 1 Stunde. Wie viel schneller ist er mit dem Wind pro Stunde?', a: ['30 km mehr', '60 km mehr', '15 km mehr'], ok: 0, why: 'Gegen den Wind 30 km pro Stunde, mit dem Wind 60 km pro Stunde – also 30 km mehr!', d: 3 },
      { q: 'Die Seilbahn fährt um 10:15 Uhr und dann alle 20 Minuten. Wie oft fährt sie bis 12:00 Uhr (die Fahrt um 10:15 mitgezählt)?', a: ['6 Mal', '5 Mal', '7 Mal'], ok: 0, why: '10:15, 10:35, 10:55, 11:15, 11:35 und 11:55 – das sind 6 Fahrten!', d: 3 },
      { q: 'Welche Zahl kommt als Nächstes? 81, 27, 9, 3, …', a: ['1', '0', '2'], ok: 0, why: 'Jedes Mal wird durch 3 geteilt: 3 geteilt durch 3 ist 1!', d: 1 },
      { q: 'Ein Rucksack wiegt am Anfang 12 kg. Die Gruppe isst jeden Tag 1,5 kg Proviant. Nach 4 Tagen kommen 2 kg Schokolade dazu. Wie schwer ist der Rucksack dann?', a: ['8 kg', '10 kg', '4 kg'], ok: 0, why: '4 mal 1,5 sind 6 kg gegessen: 12 − 6 = 6, dazu 2 kg ergibt 8 kg!', d: 2 },
      { q: 'Zwei Wanderer starten gleichzeitig an den zwei Enden eines 12 km langen Wegs und laufen aufeinander zu. Einer läuft 4 km pro Stunde, der andere 2 km. Wann treffen sie sich?', a: ['Nach 2 Stunden', 'Nach 3 Stunden', 'Nach 6 Stunden'], ok: 0, why: 'Zusammen kommen sie 6 km pro Stunde näher. 12 geteilt durch 6 sind 2 Stunden!', d: 1 },
      { q: 'Die Berghütte hat 24 Betten. 3 Gruppen mit je 5 Wanderern übernachten. Wie viele Betten sind noch frei?', a: ['9', '19', '15'], ok: 0, why: '3 mal 5 sind 15 Betten belegt. 24 − 15 = 9 sind frei!', d: 2 },
      { q: 'Man kann mich rufen und hören, aber nie sehen oder anfassen. In den Bergen antworte ich dir. Wer bin ich?', a: ['Das Echo', 'Der Wind', 'Der Schnee'], ok: 0, why: 'Dein Ruf prallt an der Felswand ab und kommt zurück – das ist das Echo!', d: 1 },
      { q: 'Von einer Torte ist noch ein Viertel übrig. Du isst die Hälfte davon. Welcher Teil der ganzen Torte war das?', a: ['Ein Achtel', 'Ein Sechstel', 'Die Hälfte'], ok: 0, why: 'Ein Viertel in zwei gleiche Teile geteilt ergibt ein Achtel!', d: 2 },
      { q: 'Ein Murmeltier gräbt in 3 Tagen einen Gang von 12 m. Wie lange braucht es für 20 m?', a: ['5 Tage', '6 Tage', '8 Tage'], ok: 0, why: 'An einem Tag gräbt es 4 m. 20 geteilt durch 4 sind 5 Tage!', d: 1 },
      { q: 'Wie heisst der berühmte Berg bei Zermatt, der wie eine Pyramide aussieht?', a: ['Das Matterhorn', 'Der Säntis', 'Der Pilatus'], ok: 0, why: 'Das Matterhorn ist 4478 m hoch und eines der bekanntesten Wahrzeichen der Schweiz!', d: 1 },
      { q: 'Der Wanderweg ist 6 km lang. Ihr lauft 2 km pro Stunde. Wie lange braucht ihr bis zum Ziel?', a: ['3 Stunden', '4 Stunden', '2 Stunden'], ok: 0, why: '6 km geteilt durch 2 km pro Stunde sind 3 Stunden!', d: 1 },
      { q: 'Ich lebe in den Alpen, springe von Fels zu Fels und habe lange, gebogene Hörner. Wer bin ich?', a: ['Ein Steinbock', 'Ein Murmeltier', 'Ein Adler'], ok: 0, why: 'Der Steinbock klettert mit seinen sicheren Hufen auch an den steilsten Felswänden!', d: 1 },
      { q: 'Wie heisst der höchste Berg der Erde?', a: ['Der Mount Everest', 'Das Matterhorn', 'Der Mont Blanc'], ok: 0, why: 'Der Mount Everest im Himalaya ist rund 8849 m hoch – so hoch wie kein anderer Berg!', d: 2 },
      { q: 'Eine Gondel fasst 8 Personen. 20 Wanderer wollen auf den Berg. Wie viele Fahrten braucht die Gondel mindestens?', a: ['3 Fahrten', '2 Fahrten', '4 Fahrten'], ok: 0, why: '2 Fahrten bringen erst 16 Personen hinauf. Für die letzten 4 braucht es eine 3. Fahrt!', d: 2 },
      { q: 'Auf 1000 m Höhe sind es 15 Grad. Pro 100 m wird es 1 Grad kälter. Wie warm ist es auf 2000 m?', a: ['5 Grad', '10 Grad', '0 Grad'], ok: 0, why: 'Von 1000 m bis 2000 m sind es 1000 m – das sind 10 mal 100 m, also 10 Grad kälter: 15 − 10 = 5 Grad!', d: 2 },
      { q: 'Eine Gruppe startet um 8:40 Uhr und wandert 3 Stunden und 35 Minuten. Wann kommt sie an?', a: ['12:15 Uhr', '12:05 Uhr', '12:25 Uhr'], ok: 0, why: '8:40 Uhr plus 3 Stunden sind 11:40 Uhr. Dazu 35 Minuten: 12:15 Uhr!', d: 2 },
      { q: 'Eine 5 m lange Leiter lehnt an einer Felswand. Unten ist sie 3 m von der Wand entfernt. Wie hoch reicht sie die Wand hinauf?', a: ['4 m', '2 m', '3 m'], ok: 0, why: 'Das ist das berühmte 3-4-5-Dreieck: 3 mal 3 plus 4 mal 4 sind 9 + 16 = 25 – und das ist genau 5 mal 5. Also 4 m!', d: 3 },
      { q: 'In einer Wandergruppe ist ein Drittel Kinder, die Hälfte Frauen und 4 sind Männer. Wie viele Personen sind es insgesamt?', a: ['24', '12', '20'], ok: 0, why: 'Kinder und Frauen zusammen sind ein Drittel plus die Hälfte, also fünf Sechstel. Ein Sechstel sind die 4 Männer – das Ganze ist also 24!', d: 3 },
      { q: 'Du wanderst einen 6 km langen Weg hinauf mit 3 km pro Stunde und gleich wieder hinunter mit 6 km pro Stunde. Wie schnell warst du durchschnittlich?', a: ['4 km pro Stunde', '4,5 km pro Stunde', '5 km pro Stunde'], ok: 0, why: 'Hinauf 2 Stunden, hinunter 1 Stunde: 12 km in 3 Stunden sind 4 km pro Stunde – nicht der Mittelwert 4,5!', d: 3 },
    ],
    sky: ['#3a6fb0', '#c9e0f5'], far: '#9db8d6', mid: '#6f8fb0', ground: '#7a7f88', top: '#9bb07a', dots: '#5a5f68', edge: '#40444c', plat: '#8a8f98', platTop: '#b8d09a', rock: '#7a8088', deco: '#2a5a3a', volcS: 0.5, volcCol: '#6f86a8', egg: '#eaf4ff', eggSpot: '#7a9ad6' },
);

const FACTS_OLD = [
  { name: 'T-Rex', text: 'Der T-Rex biss etwa zehnmal so fest zu wie ein Löwe – stark genug, um Knochen zu zermalmen.|Seine winzigen Arme waren trotzdem sehr muskulös.' },
  { name: 'Triceratops', text: 'Der Triceratops hatte mehrere Hundert Zähne, die ständig nachwuchsen.|Sie sassen in dichten Reihen – perfekt für zähe Pflanzen. Sein Schädel war über 2 Meter lang!' },
  { name: 'Brachiosaurus', text: 'Der Brachiosaurus war bis zu 13 m hoch und rund 50 Tonnen schwer.|Wie bei einer Giraffe waren seine Vorderbeine länger als die hinteren. Sein Herz musste das Blut bis in den Kopf hochpumpen!' },
  { name: 'Velociraptor', text: 'Der echte Velociraptor war nur so gross wie ein Truthahn.|Dass er Federn trug, weiss man von Knubbeln am Unterarmknochen, wo Federkiele festsassen. Die Film-Raptoren waren viel zu gross!' },
  { name: 'Pteranodon', text: 'Der Pteranodon war kein Dino, sondern ein Flugsaurier – seine Flügel spannten bis zu 6 Meter.|Er hatte keine Zähne, dafür einen langen Schnabel und einen Knochenkamm auf dem Kopf.' },
  { name: 'Stegosaurus', text: 'Der T-Rex lebte zeitlich näher an uns als am Stegosaurus!|Zwischen den beiden liegen etwa 80 Mio. Jahre. Und sein Gehirn war nur so gross wie eine Walnuss.' },
  { name: 'Wollhaarmammut', text: 'Die letzten Mammuts lebten noch vor rund 4000 Jahren – da standen die Pyramiden von Gizeh schon!|Sie überlebten auf der Wrangelinsel. Ihre Stosszähne wurden bis zu 4 Meter lang.' },
  { name: 'Ankylosaurus', text: 'Der Ankylosaurus war ein wandelnder Panzer.|Knochenplatten schützten Rücken, Kopf und sogar die Augenlider. Mit der Schwanzkeule konnte er einem Angreifer die Knochen brechen.' },
  { name: 'Dino-Eier', text: 'Selbst die riesigsten Dinos legten Eier, die nur etwa so gross wie ein Fussball waren.|Dickere Schalen hätten das Küken ersticken lassen. Die längsten Dino-Eier waren über 40 cm lang, aber schmal.' },
  { name: 'Spinosaurus', text: 'Der Spinosaurus war länger als der T-Rex – und jagte wohl im Wasser.|Krokodilartige Schnauze, hoch sitzende Nasenlöcher und ein paddelförmiger Schwanz: perfekt für Fische.' },
  { name: 'Huhn', text: 'Im Knochen eines T-Rex fand man Eiweiss-Reste – sie ähnelten denen eines Huhns am meisten!|Alle Vögel sind lebende Dinosaurier.' },
  { name: 'Meteorit', text: 'Der Meteorit schlug bei Chicxulub in Mexiko ein und riss einen Krater von rund 180 km.|Staub verdunkelte den Himmel, Pflanzen starben. Nur kleine Tiere überlebten – auch die ersten Vögel.' },
  { name: 'Nadelbäume', text: 'Die Wollemie galt als ausgestorben, bis man 1994 in Australien lebende Bäume fand!|Ein Baum direkt aus der Dino-Zeit – Nadelbäume gibt es seit rund 300 Mio. Jahren.' },
  { name: 'Polar-Dinos', text: 'Vor 110 Mio. Jahren lag Südaustralien nahe am Südpol.|Der kleine Leaellynasaura hatte grosse Augen für die Polarnacht – und seinen Namen von der Tochter der Finder.' },
  { name: 'Federkleid', text: '1996 fand man in China den ersten Dino mit Federn.|An seinem Schwanz sind sogar noch rotbraune Streifen zu erkennen! Auch der 9 m lange Yutyrannus, ein T-Rex-Verwandter, trug Federn.' },
];

const FACTS_NEW = [
  { name: 'Ammonit', text: 'Ammoniten schwammen in Urzeit-Meeren und starben zusammen mit den Dinos aus.|Weil sich ihre Gehäuse so schnell veränderten, verraten sie Forschern genau, wie alt ein Gestein ist.' },
  { name: 'Archelon', text: 'Der Archelon wog über 2 Tonnen – und hatte keinen harten Panzer.|Sein Rücken bestand aus Lederhaut mit Knochenstreben. Seine Flossen spannten zusammen etwa 4 Meter.' },
  { name: 'Fussspuren', text: 'Bei Courtedoux im Jura fand man tausende Fussabdrücke von Langhals-Dinos.|Aus dem Abstand der Spuren berechnen Forscher sogar, wie schnell ein Dino lief.' },
  { name: 'Ichthyosaurus', text: 'Der Ichthyosaurus sah aus wie ein Delfin, war aber ein Reptil.|Er atmete Luft und gebar lebende Junge im Wasser – meist mit dem Schwanz voran, damit sie nicht ertranken.' },
  { name: 'Mosasaurus', text: 'Der Mosasaurus war ein Riesen-Verwandter der Warane und Schlangen.|Er hatte sogar eine zweite Zahnreihe im Gaumen. Seinen ersten Schädel fand man bei Maastricht – daher der Name.' },
  { name: 'Plesiosaurus', text: 'Der Plesiosaurus hatte über 30 Halswirbel – Menschen und Giraffen haben nur 7!|Das erste fast vollständige Skelett fand 1823 die Fossiliensammlerin Mary Anning.' },
  { name: 'Quetzalcoatlus', text: 'Der Quetzalcoatlus war am Boden so hoch wie eine Giraffe – und konnte trotzdem fliegen!|Am Boden lief er auf allen vieren und stocherte wie ein Storch nach Beute.' },
  { name: 'Archaeopteryx', text: '1861 fand man in Bayern ein Skelett mit Federn, Zähnen und Krallen an den Flügeln.|Ein Beweis, dass Vögel von Dinos abstammen. Wie gut er flog, ist bis heute umstritten.' },
  { name: 'Therizinosaurus', text: 'Man hielt seine Riesenkrallen (bis 50 cm) zuerst für Teile einer Riesenschildkröte!|Dabei war er ein gefiederter Pflanzenfresser.' },
];
// one card per level (24 days). Order follows the calendar: jungle, beach, canyon, underwater, ice age, mountains, volcano, Christmas.
const FACTS = [...FACTS_OLD.slice(0, 3), ...FACTS_NEW.slice(0, 3), ...FACTS_OLD.slice(3, 6), ...FACTS_NEW.slice(3, 6), ...FACTS_OLD.slice(6, 9), ...FACTS_NEW.slice(6, 9), ...FACTS_OLD.slice(9, 12), ...FACTS_OLD.slice(12, 15)];
const TREASURES = [
  { name: 'Göttis Gitarre', line: 'Meine Gitarre! Danke, ihr zwei! Tippt sie in der Schatzkiste an – dann spiele ich euch was vor.', tap: 'Götti spielt ein Lied!', hint: 'Götti vermisst etwas … Im grossen Baum klimpert es!', tip: 'Hörst du es klimpern? Im grossen Baum steckt etwas – BRÜLL ihn an!', notice: 'Meine Löffel zucken! Im Baum klimpert es!' },
  { name: 'Göttis Velo', line: 'Mein Velo! Das hat der Vulkan bis in den Canyon geschleudert. Damit machen wir drei mal eine grosse Tour!', tap: 'Kling, kling!', hint: 'Götti vermisst etwas … Ein Fels mit Riss klingelt!', tip: 'Hörst du es klingeln? Dieser Fels hat einen Riss – FLITZ hinein!', notice: 'Meine Löffel zucken! Der Fels da klingelt!' },
  { name: 'Göttis Angel', line: 'Meine Angelrute! Weisst du was? Im Winter kann man sogar durch ein Loch im Eis fischen. Das machen wir mal zusammen!', tap: 'Platsch! Ein Fisch!', hint: 'Götti vermisst etwas … Im Eis steckt etwas fest!', tip: 'Da ragt etwas aus dem Eis! Spring hoch und STAMPF aufs Eis!', notice: 'Schnüff, schnüff! Da steckt etwas im Eis!' },
  { name: 'Kiwi', line: 'Kiwi! Mein kleiner Freund ist wieder da! Kiwis sind das Wahrzeichen von Neuseeland und können nicht fliegen – darum läuft Kiwi ab jetzt mit euch mit.', tap: 'Kiwi! Kiwi!', hint: 'Götti vermisst etwas … Unter der Asche piepst es!', tip: 'Hörst du es piepsen? Unter der Asche steckt etwas – spuck FEUER!', notice: 'Meine Löffel zucken! Unter der Asche piepst es!' },
];
// =====================================================================
// Story: the Krallenkönig stole the dino family's golden egg. Three bosses each hold a piece of his map.
// DAY_STORY plays once before a level (first time), DAY_AFTER once on the map after a boss, TEASERS on the results screen.
// =====================================================================
const DAY_STORY = {
  1: [{ who: 'goetti', text: 'Tür 1! Hier im Dschungel hat der Vulkan die meisten Eier verloren. Und schaut mal: riesige Krallenspuren!' }, { who: 'fabio', text: 'Die sind ja grösser als ich!' }, { who: 'chili', text: 'Schnupper, schnupper … Das riecht nach dem Krallenkönig! Folgen wir der Spur!' }],
  2: [{ who: 'goetti', text: 'Die Spuren führen hoch hinauf. Der Räuber ist über die Baumwipfel geklettert – springt hinterher, ihr zwei!' }],
  3: [{ who: 'goetti', text: 'Heute lernt {rex} BRÜLLEN! {fabio}, das ist dein Job: Du bist ab heute unser Brüll-Chef. Drück BRÜLL, dann rennt jeder Raptor davon!' }, { who: 'fabio', text: 'ROOOAAARRR!' }, { who: 'goetti', text: 'Und irgendwo hier liegt meine Gitarre – der Vulkan hat sie weit weggeschleudert.' }],
  4: [{ who: 'goetti', text: 'Die Spuren enden am Strand! Ab heute könnt ihr FLITZEN – sogar mitten durch Sandmauern.' }, { who: 'chili', text: 'Mümmel! Hier riecht es nach Meer und nach Krallenkönig.' }],
  5: [{ who: 'goetti', text: 'Krabbenstrand! Passt auf die Krabben auf – sie benehmen sich, als würden sie etwas bewachen …' }],
  6: [{ who: 'goetti', text: 'Da vorne sitzt der Krabbenkönig! Und schaut: Um seinen Hals hängt ein Stück Pergament!' }, { who: 'papi', text: '(Funkspruch) Das ist ein Teil von der Schatzkarte des Krallenkönigs! Holt es euch, {oli} und {fabio}!' }],
  7: [{ who: 'goetti', text: 'Die heisse Schlucht! Der Räuber hat hier gelagert – die Asche ist noch warm. Ab heute könnt ihr DUCKEN: Halte den Knopf, dann kommt ihr unter tiefen Ästen durch.' }],
  8: [{ who: 'goetti', text: 'Duckt euch! Die Flugsaurier kreisen hier ständig. Sie kennen den Krallenkönig – und sie mögen keine Fremden.' }],
  9: [{ who: 'goetti', text: 'Ein Raptor-Rudel! Der Krallenkönig hat sie als Wachen zurückgelassen. {fabio}, Brüll-Chef – jetzt brauchen wir dich! Irgendwo hier liegt auch mein Velo …' }],
  10: [{ who: 'goetti', text: 'Tauchgang! Das Kartenstück zeigt: Der Weg geht unter Wasser weiter. Ab heute könnt ihr SCHWIMMEN – tippen heisst nach oben, TAUCHEN nach unten.' }, { who: 'fabio', text: 'Blubb, blubb!' }],
  11: [{ who: 'goetti', text: 'Das Korallenlabyrinth! Die Fische flüstern, dass hier ein Seeungeheuer wohnt. Es mag keine Besucher …' }],
  12: [{ who: 'goetti', text: 'Da ist es: das Seeungeheuer! Und es hält das zweite Kartenstück in seinen Tentakeln!' }, { who: 'fabio', text: 'Ich hab keine Angst. Gar keine! … Ein bisschen.' }, { who: 'mami', text: '(Funkspruch) Wir drücken euch die Daumen, ihr zwei! Bringt unser Ei zurück!' }],
  13: [{ who: 'goetti', text: 'Die Eiszeit! Alles ist gefroren. Ab heute könnt ihr STAMPFEN: Springt hoch und drückt STAMPF – das knackt sogar Bernstein-Steine.' }],
  14: [{ who: 'goetti', text: 'Die Krallenspuren sind im Schnee ganz frisch. Wir holen auf!' }],
  15: [{ who: 'goetti', text: 'Eiskalte Ebene! Und dort im Eis steckt meine Angelrute – seht ihr sie?' }],
  16: [{ who: 'goetti', text: 'Der Gipfelweg! Ab heute könnt ihr GLEITEN: Halte in der Luft die Taste gedrückt und schwebe über die Schluchten.' }, { who: 'fabio', text: 'Wir fliegen! {oli}, wir fliegen!' }],
  17: [{ who: 'goetti', text: 'Über den Wolken wohnt die Adlerkönigin. Sie hütet das letzte Kartenstück. Passt auf die Windwellen auf!' }],
  18: [{ who: 'goetti', text: 'Die Adlerkönigin! Das letzte Kartenstück liegt in ihrem Nest.' }, { who: 'papi', text: '(Funkspruch) Ihr seid so mutig, {oli} und {fabio}! Wir sind in Gedanken bei euch!' }],
  19: [{ who: 'goetti', text: 'Der Vulkan! Heiss, heiss, heiss. Sammelt die roten Feuer-Chilis, dann kann {rex} FEUER spucken!' }, { who: 'fabio', text: 'Feuer! Darf ich drücken? Bitte, bitte!' }],
  20: [{ who: 'goetti', text: 'Der Lavafluss! Hüpft von Stein zu Stein – und lasst euch nicht in die Lava fallen.' }],
  21: [{ who: 'goetti', text: 'Seine Krallenspuren glühen noch – der Räuber ist ganz nah! Und hört ihr das? Irgendwo ruft ein Kiwi …' }],
  22: [{ who: 'goetti', text: 'Wir haben den Vulkan hinter uns! Es schneit. Es ist Weihnachtsnacht – und der Krallenkönig ist ganz nah.' }, { who: 'fabio', text: 'Es schneit! {oli}, schau, es schneit!' }],
  23: [{ who: 'goetti', text: 'Der Sternenwald. Hört ihr das? Ein leises Klopfen … Das Dino-Baby im goldenen Ei ruft nach uns!' }, { who: 'mami', text: '(Funkspruch) Bitte beeilt euch! Unserem Baby ist so kalt!' }],
  24: [{ who: 'goetti', text: 'Das ist seine Höhle! Der Krallenkönig sitzt auf dem goldenen Ei – und er sieht gar nicht fröhlich aus.' }, { who: 'mami', text: 'Wir stehen hinter euch, {oli} und {fabio}!' }, { who: 'papi', text: 'Du schaffst das, {rex}! Und Chili auch!' }, { who: 'goetti', text: 'Das ist der letzte Kampf. {oli} lenkt, {fabio} brüllt – los, ihr zwei!' }],
};
const DAY_AFTER = {
  6: [{ who: 'fabio', text: 'Wir haben es! Wir haben das Kartenstück!' }, { who: 'goetti', text: 'Geschafft! Der Krabbenkönig hat ein Kartenstück verloren. Darauf ist das Meer gezeichnet – und ein goldenes Ei!' }, { who: 'chili', text: 'Mümmel! Noch zwei Stücke fehlen, dann kennen wir den Weg zum Versteck.' }],
  12: [{ who: 'goetti', text: 'Das zweite Stück! Jetzt sehen wir hohe Berge – und einen rauchenden Vulkan.' }, { who: 'chili', text: 'Mümmel! Nur noch ein Stück, ihr zwei!' }],
  18: [{ who: 'goetti', text: 'Alle drei Stücke! Zusammengelegt zeigen sie den Weg: über den Vulkan, und dahinter liegt die Höhle des Krallenkönigs.' }, { who: 'chili', text: 'Mümmel! Auf zum Vulkan!' }],
};
const TEASERS = { 5: 'Morgen wartet der Krabbenkönig mit dem ersten Kartenstück!', 11: 'Morgen taucht das Seeungeheuer auf …', 17: 'Morgen: die Adlerkönigin! Sie hütet das letzte Kartenstück.', 23: 'Morgen ist der grosse Tag – der Krallenkönig wartet!' };
const medalTotal = () => save.lvM.flat().reduce((a, b) => a + b, 0);
const worldMedalsDone = wi => LEVELS.filter(l => l.wi === wi).every(l => save.lvM[l.li].every(Boolean));
function launchLevel(i) { // first time a day starts, Götti briefs the player (a short dialog on the map)
  const day = i + 1, lines = DAY_STORY[day];
  if (lines && !save.storySeen[day]) { save.storySeen[day] = 1; writeSave(); startDialog(lines, () => startLevel(i), false, { wi: LEVELS[i].wi, boss: LEVELS[i].boss || null }); } else startLevel(i);
}
// =====================================================================
// Advent calendar: 24 levels, a new one opens every day from 1 December
// =====================================================================
const ADVENT_START = new Date(2026, 11, 1);
function adventDay() { // how many doors are open today (0 before 1 Dec, 24 from 24 Dec on)
  if (save.dayOverride != null) return clamp(save.dayOverride, 0, 24);
  let q = null; if (DEBUG) try { q = new URLSearchParams(location.search).get('day'); } catch (e) {}
  if (q != null && q !== '') return clamp(parseInt(q) || 0, 0, 24);
  const n = new Date(); return clamp(Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - ADVENT_START) / 86400000) + 1, 0, 24);
}
const LEVEL_THEMES = [0, 0, 0, 5, 5, 5, 1, 1, 1, 6, 6, 6, 2, 2, 2, 7, 7, 7, 3, 3, 3, 4, 4, 4];
const LEVEL_TITLES = ['Erste Schritte', 'Hoch hinaus', 'Brüll-Training', 'Sandburgen-Rennen', 'Krabbenstrand', 'Der Krabbenkönig', 'Raptor-Rudel', 'Duck dich!', 'Heisse Schlucht', 'Tauchgang', 'Korallenlabyrinth', 'Das Seeungeheuer', 'Mammut-Pfad', 'Stampf-Meister', 'Eiskalte Ebene', 'Gipfelweg', 'Wolkensprung', 'Die Adlerkönigin', 'Vulkan-Aufstieg', 'Lavafluss', 'Feuer-Chili', 'Verschneite Nacht', 'Sternenwald', 'Der Krallenkönig'];
const BOSS_DAYS = { 6: 'crab', 12: 'kraken', 18: 'queen', 24: 'king' };
const TREASURE_DAY = { 3: 0, 9: 1, 15: 2, 21: 3 }; // Götti's guitar, bike, rod and Kiwi
const MAX_HEARTS = 4; // story levels; endless and daily runs keep 3 (score challenge)
const LEVELS = LEVEL_THEMES.map((wi, li) => { const sub = li % 3, day = li + 1, boss = BOSS_DAYS[day] || null; return { li, day, wi, sub, title: LEVEL_TITLES[li], boss, treasure: TREASURE_DAY[day] != null ? TREASURE_DAY[day] : -1, segs: Math.round(46 + li * 0.9 - (boss ? 14 : 0)), speedMul: [0.98, 1.04, 1.1][sub], maxTier: [2, 3, 3][sub] }; });
// skills arrive with the calendar: dash on day 4, duck on 7, swim on 10, stomp on 13, glide on 16, fire on 19
const SKILL_DAYS = { dash: 4, duck: 7, swim: 10, stomp: 13, glide: 16, fire: 19 };
function skillsFor(li, wi) { const d = li == null ? 99 : li + 1; return { duck: d >= SKILL_DAYS.duck, stomp: d >= SKILL_DAYS.stomp, dash: d >= SKILL_DAYS.dash, glide: d >= SKILL_DAYS.glide, fire: d >= SKILL_DAYS.fire, swim: wi === 6 }; }
const THEME_LEARN = { 0: 'jump', 5: 'dash', 1: 'duck', 6: 'swim', 2: 'stomp', 7: 'glide', 3: 'fire' };
function giftFor(day) { // the cosmetic (or amber) hidden behind a door
  for (const [key, list] of [['skin', SKINS], ['hat', HATS], ['fire', FIRES]]) { const i = list.findIndex(it => it.gift === day); if (i >= 0) return { key, i, name: list[i].n }; }
  const a = { 5: 100, 11: 100, 21: 150 }[day]; return a ? { key: 'amber', n: a, name: a + ' Bernstein' } : null;
}
function openDoorGift(day) { // first opening of a door: add the gift to the player's collection
  if (save.gifts.includes(day)) return null; const g = giftFor(day); if (!g) return null;
  save.gifts.push(day); if (g.key !== 'amber') save.newGifts.push(g.key + ':' + g.i); if (g.key === 'amber') save.amber += g.n; else if (!save.owned[g.key].includes(g.i)) save.owned[g.key].push(g.i); writeSave(); return g;
}
function hslHex(h, sat, l) { l /= 100; const a = sat / 100 * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12, c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; }

const MEDALS = [['Eier-Profi', 'Alle 3 Eier'], ['Ohne Kratzer', 'Kein Treffer'], ['Bernstein-Sammler', '80% Bernstein']];
const SKINS = [
  { n: 'Grün', cost: 0 },
  { n: 'Blau', cost: 120, body: '#3f7fd0', dark: '#2a5aa0', belly: '#cfe6ff' },
  { n: 'Pink', cost: 250, body: '#e06aa8', dark: '#b04580', belly: '#ffd9ec' },
  { n: 'Gold', cost: 600, body: '#e0b030', dark: '#a67c10', belly: '#fff0b0' },
  { n: 'Rot', gift: 1, body: '#d8483a', dark: '#a02a20', belly: '#ffe0b0' },
  { n: 'Türkis', gift: 7, body: '#27b5b0', dark: '#16807c', belly: '#e0fff8' },
  { n: 'Lila', gift: 12, body: '#8a56d6', dark: '#5e34a0', belly: '#f0e0ff' },
  { n: 'Mint', gift: 17, body: '#7fd6a6', dark: '#4aa070', belly: '#f4ffe8' },
  { n: 'Nacht', gift: 20, body: '#2f3b6e', dark: '#1a2248', belly: '#9aa8e8' },
  { n: 'Regenbogen', gift: 23, rainbow: true, body: '#e84a6f', dark: '#8a2a4a', belly: '#fff0f8' },
  { n: 'Dino-Meister', gift: 25, rainbow: 'gold', body: '#ffd34d', dark: '#b07a10', belly: '#fff7c8' },
];
const HATS = [{ n: 'Auto', cost: 0 }, { n: 'Mütze', cost: 150, k: 'santa' }, { n: 'Cowboy', cost: 300, k: 'cowboy' }, { n: 'Astronaut', cost: 700, k: 'astro' },
  { n: 'Strohhut', gift: 2, k: 'straw' }, { n: 'Pirat', gift: 4, k: 'pirate' }, { n: 'Taucherbrille', gift: 6, k: 'goggles' }, { n: 'Kochmütze', gift: 8, k: 'chef' }, { n: 'Zylinder', gift: 10, k: 'tophat' },
  { n: 'Bergmütze', gift: 13, k: 'beanie' }, { n: 'Zauberhut', gift: 14, k: 'wizard' }, { n: 'Propeller', gift: 16, k: 'propeller' }, { n: 'Rentier', gift: 18, k: 'antlers' }, { n: 'Heiligenschein', gift: 22, k: 'halo' }, { n: 'Wikinger', gift: 24, k: 'viking' }, { n: 'Meister-Krone', gift: 25, k: 'mastercrown' }];
const FIRES = [
  { n: 'Orange', cost: 0, a: '255,190,60', b: '255,80,10', c: '255,40,0', fl: ['#fff3b0', '#ffa628', '#ff4a10'], ball: '#ff8a20', glow: '255,140,30' },
  { n: 'Blau', cost: 200, a: '130,200,255', b: '40,100,255', c: '0,30,200', fl: ['#e6f4ff', '#5fb0ff', '#2a50ff'], ball: '#4a90ff', glow: '80,150,255' },
  { n: 'Lila', cost: 450, a: '225,160,255', b: '150,50,230', c: '90,0,160', fl: ['#f6e6ff', '#c070ff', '#8a30e0'], ball: '#b060ff', glow: '170,90,255' },
  { n: 'Grün', gift: 3, a: '170,255,150', b: '60,200,60', c: '0,120,20', fl: ['#f0ffe6', '#7aff7a', '#2ab52a'], ball: '#4adf4a', glow: '90,230,90' },
  { n: 'Rosa', gift: 9, a: '255,190,225', b: '240,90,170', c: '170,20,100', fl: ['#fff0f8', '#ff9ad0', '#e0409a'], ball: '#ff70b8', glow: '255,120,190' },
  { n: 'Gold', gift: 15, a: '255,240,150', b: '255,190,30', c: '200,120,0', fl: ['#fffbe0', '#ffe066', '#e8a317'], ball: '#ffd034', glow: '255,215,80' },
  { n: 'Regenbogen', gift: 19, rainbow: true, a: '255,200,100', b: '255,80,80', c: '200,0,60', fl: ['#fff', '#ff9a3c', '#ff4a8a'], ball: '#ff8a20', glow: '255,160,80' },
];
// jackets: index 0 is Oli's red, 1 is Fabio's yellow (both free); a jacket comes with its scarf
const JACKETS = [
  { n: 'Rot', cost: 0, jac: ['#f26a5e', '#e0473c', '#a82e26'], scarf: '#2e9e5b', scarfD: 'rgba(15,70,35,.5)', zip: '#ffd34d', pocket: 'rgba(120,20,20,.55)' },
  { n: 'Gelb', cost: 0, jac: ['#ffd65c', '#f5b324', '#c2800e'], scarf: '#2f8fd6', scarfD: 'rgba(15,50,100,.5)', zip: '#fff4c8', pocket: 'rgba(140,80,0,.55)' },
  { n: 'Blau', cost: 150, jac: ['#6aa8f2', '#3a7ee0', '#22549e'], scarf: '#ffb02e', scarfD: 'rgba(120,70,0,.5)', zip: '#fff', pocket: 'rgba(20,40,100,.55)' },
  { n: 'Grün', cost: 150, jac: ['#7fd67a', '#46ad4a', '#2a7a30'], scarf: '#e53935', scarfD: 'rgba(110,10,10,.5)', zip: '#ffe08a', pocket: 'rgba(20,70,20,.55)' },
  { n: 'Lila', cost: 250, jac: ['#c49af0', '#9a5ed8', '#6a34a8'], scarf: '#ffd34d', scarfD: 'rgba(120,90,0,.5)', zip: '#fff', pocket: 'rgba(60,20,100,.55)' },
  { n: 'Nacht', cost: 300, jac: ['#5a6aa8', '#34407a', '#1c2450'], scarf: '#40c4ff', scarfD: 'rgba(0,60,100,.5)', zip: '#ffd34d', pocket: 'rgba(0,0,30,.55)' },
  { n: 'Weihnacht', cost: 400, jac: ['#e85a5a', '#c62828', '#8a1414'], scarf: '#ffffff', scarfD: 'rgba(160,160,170,.6)', zip: '#ffffff', pocket: 'rgba(255,255,255,.6)' },
  { n: 'Gold', cost: 600, jac: ['#ffe680', '#f0c030', '#b08010'], scarf: '#c62828', scarfD: 'rgba(100,10,10,.5)', zip: '#fff8d0', pocket: 'rgba(120,80,0,.55)' },
];
const CHILI_ITEMS = [{ n: 'Ohne', cost: 0 }, { n: 'Schleife', cost: 80, k: 'bow' }, { n: 'Halstuch', cost: 120, k: 'scarf' }, { n: 'Mini-Mütze', cost: 150, k: 'santa' }, { n: 'Sonnenbrille', cost: 200, k: 'glasses' }, { n: 'Rucksack', cost: 250, k: 'pack' }, { n: 'Blumenkranz', cost: 300, k: 'flowers' }];
// Götti's vouchers: real outings, bought once with the shared amber and redeemed with Götti
const WISHES = [
  { n: 'Velotour', cost: 600, text: 'eine grosse Velotour mit Götti', icon: (x, y, k) => drawBike(x, y + 30 * k, 0.62 * k) },
  { n: 'Fischen', cost: 900, text: 'einen Tag Fischen mit Götti', icon: (x, y, k) => drawRod(x, y + 8 * k, 0.8 * k, T * 3) },
  { n: 'Dino-Museum', cost: 1200, text: 'einen Ausflug ins Dino-Museum mit Götti', icon: (x, y, k) => drawTrike(x - 2 * k, y + 22 * k, 0.62 * k, '#c98f5a', 0, false) },
  { n: 'Europa-Park', cost: 2500, text: 'eine Reise in den Europa-Park mit Götti', icon: (x, y, k) => drawCoaster(x, y + 4 * k, 0.9 * k) },
];
function rgbStr(hex) { return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`; }
function fireOf(i) { const f = FIRES[i] || FIRES[0]; if (!f.rainbow) return f; const h = (T * 90) % 360, a = hslHex(h, 100, 78), b = hslHex(h, 100, 56), c = hslHex(h, 100, 36); return Object.assign({}, f, { a: rgbStr(a), b: rgbStr(b), c: rgbStr(c), fl: [hslHex(h, 100, 94), a, b], ball: b, glow: rgbStr(b) }); }
function rexLook(wi) { const sk = SKINS[save.equip.skin] || SKINS[0], h = HATS[save.equip.hat] || HATS[0], h2 = HATS[save.equip.fabioHat] || HATS[0], auto = wi === 2 || wi === 4 || wi === 7 ? 'santa' : null, jungle = wi === 0 && !sk.body; return { hat2: h2.k || auto, dive: wi === 6, rainbow: sk.rainbow, body: jungle ? '#22a98c' : sk.body, dark: jungle ? '#167a68' : sk.dark, belly: sk.belly, hat: h.k || (wi === 2 || wi === 4 || wi === 7 ? 'santa' : null) }; }
const WHO = { goetti: 'Götti', chili: 'Chili', rex: () => save.rexName || 'T-Rex', mami: 'Mamasaurus', papi: 'Papasaurus', fabio: () => save.fabioName || 'Fabio', kiwi: 'Kiwi' };
