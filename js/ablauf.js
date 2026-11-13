// Prüfsinn – geführte Prüfabläufe (Pkw und Lkw): Stationen, Schritte und Go/No-Go-Bilder.
//
// WICHTIG: Die Reihenfolge ist ein Vorschlag, wie man in der Halle sinnvoll um das Fahrzeug geht. Sie stammt aus keiner
// amtlichen Quelle und soll vom Prüfer bestätigt oder umgestellt werden (einfach die Einträge unten umsortieren).
// Amtlich sind die Inhalte je Schritt: "punkte" verweist auf Prüfpunkte des Mängelkatalogs (RL 2014/45/EU Anhang I);
// von dort kommen Prüfmethode, Mängel und Einstufung. "tipp" ist ein kurzer Praxishinweis ohne amtlichen Charakter.
// Zahlen in den Tipps stehen nur dort, wo sie am Katalog oder an der StVZO geprüft sind (Fundstelle steht dabei).

// ---------- Pkw und Transporter bis 3,5 t (hydraulische Bremse, Hebebühne) ----------
const PKW = [
  { id: 'papiere', titel: 'Papiere und Identität', schritte: [
    { id: 'kennzeichen', titel: 'Kennzeichen', punkte: ['0.1'], bild: 'kennzeichen', tipp: 'Vorn und hinten ansehen: fest montiert, lesbar und passend zu den Fahrzeugpapieren.' },
    { id: 'fin', titel: 'Fahrzeug-Identnummer', punkte: ['0.2'], bild: 'fin', tipp: 'FIN am Fahrzeug suchen und Zeichen für Zeichen mit den Papieren vergleichen.', link: ['#/fahrzeug', 'FIN im Fahrzeug-Check prüfen'] },
  ] },
  { id: 'innen', titel: 'Innenraum', schritte: [
    { id: 'kontroll', titel: 'Kontrollleuchten', punkte: ['1.6', '7.1.5', '7.1.6', '7.12', '2.6'], bild: 'kontroll', tipp: 'Zündung einschalten: Die Leuchten für ABS, Airbag, ESP und Lenkung gehen an und nach dem Selbsttest wieder aus.' },
    { id: 'gurte', titel: 'Sicherheitsgurte', punkte: ['7.1.1', '7.1.2'], bild: 'gurt', tipp: 'Jeden Gurt ganz herausziehen, auf Schnitte prüfen, einrasten lassen und kräftig rucken. Rollt er wieder auf?' },
    { id: 'sitze', titel: 'Sitze', punkte: ['6.2.5', '6.2.6'], bild: 'sitz', tipp: 'Sitze rütteln und verstellen: fest verankert, Verstellung rastet sicher ein.' },
    { id: 'pedal', titel: 'Bremspedal und Feststellbremse', punkte: ['1.1.1', '1.1.2', '1.1.6'], bild: 'pedal', tipp: 'Pedal treten und halten: fester Druckpunkt, genug Wegreserve. Feststellbremse betätigen: rastet und hält.' },
    { id: 'lenkrad', titel: 'Lenkrad und Lenkungsspiel', punkte: ['2.2.1', '2.3'], bild: 'lenkrad', tipp: 'Lenkrad bei stehenden Rädern leicht hin- und herbewegen: Die Räder müssen ohne großen Leerweg folgen.' },
    { id: 'hupe', titel: 'Hupe und Tacho', punkte: ['7.7', '7.8', '7.11'], bild: 'hupe', tipp: 'Hupe kurz betätigen. Tacho und Kilometerzähler ansehen, Stand notieren.' },
    { id: 'sicht', titel: 'Scheiben und Sichtfeld', punkte: ['3.1', '3.2'], bild: 'scheibe', tipp: 'Von innen und außen ansehen. Entscheidend ist, was im Wischbereich vor dem Fahrer liegt.' },
    { id: 'wischer', titel: 'Spiegel, Wischer, Waschanlage', punkte: ['3.3', '3.4', '3.5'], bild: 'wischer', tipp: 'Spiegel fest und klar? Wischer laufen lassen, Waschanlage betätigen.' },
    { id: 'ausruestung', titel: 'Warndreieck und Verbandkasten', punkte: ['7.4', '7.5'], bild: 'ausruestung', tipp: 'Beides zeigen lassen: vorhanden und vollständig.' },
  ] },
  { id: 'licht', titel: 'Licht rundum', schritte: [
    { id: 'scheinwerfer', titel: 'Scheinwerfer', punkte: ['4.1.1', '4.1.3'], bild: 'leuchte', tipp: 'Abblend- und Fernlicht schalten. Beide Seiten leuchten gleich hell, Streuscheiben klar und dicht.' },
    { id: 'schluss', titel: 'Stand- und Schlusslicht', punkte: ['4.2.1'], bild: 'schluss', tipp: 'Einmal ums Fahrzeug gehen: vorn weiß, hinten rot, alle Leuchten an.' },
    { id: 'bremslicht', titel: 'Bremsleuchten', punkte: ['4.3.1'], bild: 'bremslicht', tipp: 'Bremse treten lassen oder im Spiegel einer Wand prüfen – auch die dritte Bremsleuchte.' },
    { id: 'blinker', titel: 'Blinker und Warnblinker', punkte: ['4.4.1', '4.4.4'], bild: 'leuchte', tipp: 'Links, rechts, Warnblinker. Auf gleichmäßigen Takt achten – zu schnelles Blinken deutet auf eine ausgefallene Lampe.' },
    { id: 'weitere', titel: 'Nebel-, Rückfahr- und Kennzeichenlicht', punkte: ['4.5.1', '4.6.1', '4.7.1', '4.8.1'], bild: 'kennzeichenlicht', tipp: 'Nebelschlussleuchte, Rückfahrlicht und Kennzeichenbeleuchtung schalten. Rückstrahler vorhanden und heil?' },
  ] },
  { id: 'aussen', titel: 'Außen', schritte: [
    { id: 'karosserie', titel: 'Karosserie und Türen', punkte: ['6.2.1', '6.2.3', '6.1.4', '6.2.10'], bild: 'karosserie', tipp: 'Rundgang: scharfe Kanten, lose Teile, Stoßfänger fest? Türen öffnen und schließen, sie müssen sicher einrasten.' },
    { id: 'reifen', titel: 'Räder und Reifen', punkte: ['5.2.2', '5.2.3'], bild: 'reifen', tipp: 'Jedes Rad einzeln: Profil über die ganze Breite messen, Flanken auf Risse und Beulen absuchen, Größe mit den Papieren vergleichen.', link: ['#/rechner/tragfaehigkeit', 'Tragfähigkeit und Tempo prüfen'] },
    { id: 'ahk', titel: 'Anhängerkupplung', punkte: ['6.1.6', '4.10'], bild: 'ahk', tipp: 'Falls vorhanden: Kugel und Befestigung ansehen, Steckdose prüfen. Sonst „Entfällt“.' },
  ] },
  { id: 'motorraum', titel: 'Motorraum', schritte: [
    { id: 'bremsfl', titel: 'Bremsflüssigkeit', punkte: ['1.8', '1.1.10'], bild: 'bremsfl', tipp: 'Stand zwischen Min und Max? Flüssigkeit klar? Hauptbremszylinder und Bremskraftverstärker trocken und fest.' },
    { id: 'elektrik', titel: 'Batterie und Leitungen', punkte: ['4.13', '4.11'], bild: 'batterie', tipp: 'Batterie fest und dicht. Leitungen sauber verlegt, nichts scheuert oder hängt lose.' },
    { id: 'dicht', titel: 'Dichtheit und Motorlager', punkte: ['8.4.1', '6.1.8', '2.1.5'], bild: 'dicht', tipp: 'Auf Öl-, Kühlmittel- und Kraftstoffspuren achten. Motorlager und Servolenkung ansehen.' },
  ] },
  { id: 'buehne', titel: 'Hebebühne', schritte: [
    { id: 'leitungen', titel: 'Bremsleitungen und -schläuche', punkte: ['1.1.11', '1.1.12'], bild: 'schlauch', tipp: 'Leitungen von vorn nach hinten abgehen. Schläuche bei eingeschlagenen Rädern biegen und auf Risse achten.' },
    { id: 'bremse', titel: 'Scheiben, Beläge, Sättel', punkte: ['1.1.13', '1.1.14', '1.1.16', '1.1.15'], bild: 'scheibe-bremse', tipp: 'Belagstärke und Scheibenbild an jedem Rad. Sättel trocken? Handbremsseile freigängig?' },
    { id: 'lenkung', titel: 'Lenkgetriebe und Gestänge', punkte: ['2.1.1', '2.1.2', '2.1.3'], bild: 'lenkung', tipp: 'Lenkung hin- und herbewegen lassen und Spurstangen, Manschetten und Befestigung beobachten.' },
    { id: 'achsen', titel: 'Achsen und Radlager', punkte: ['5.1.1', '5.1.2', '5.1.3'], bild: 'radlager', tipp: 'Rad oben und unten fassen und kippen, dann drehen: kein Spiel, kein Mahlen.' },
    { id: 'gelenke', titel: 'Lenker und Gelenke', punkte: ['5.3.3', '5.3.4'], bild: 'spiel', tipp: 'Mit Montiereisen oder Gelenkspieltester belasten: Gelenke und Buchsen dürfen kein fühlbares Spiel haben.' },
    { id: 'federn', titel: 'Federn und Stoßdämpfer', punkte: ['5.3.1', '5.3.2'], bild: 'daempfer', tipp: 'Federn rundum auf Brüche ansehen – gern am unteren Windungsende. Dämpfer trocken und fest?' },
    { id: 'unterboden', titel: 'Unterboden und Rahmen', punkte: ['6.1.1', '6.2.4'], bild: 'rost', tipp: 'Schweller, Träger und Aufnahmen abklopfen. Entscheidend ist, ob tragende Teile geschwächt sind.' },
    { id: 'auspuff', titel: 'Auspuff und Kraftstoffanlage', punkte: ['6.1.2', '6.1.3'], bild: 'auspuff', tipp: 'Anlage rütteln: fest, dicht, Halter vollständig. Tank und Leitungen trocken?' },
    { id: 'antrieb', titel: 'Antrieb', punkte: ['6.1.7'], bild: 'antrieb', tipp: 'Gelenkwellen und Manschetten ansehen, Wellen von Hand bewegen.' },
  ] },
  { id: 'pruefstand', titel: 'Bremsenprüfstand', schritte: [
    { id: 'bba', titel: 'Betriebsbremse', punkte: ['1.2.1', '1.2.2'], bild: 'pruefstand', tipp: 'Achse für Achse langsam steigern. Links und rechts vergleichen, auf Schwankungen bei jeder Radumdrehung achten.', link: ['#/rechner/bremsen', 'Abbremsung im Bremsenrechner'] },
    { id: 'fba', titel: 'Feststellbremse', punkte: ['1.4.1', '1.4.2'], bild: 'fba', tipp: 'Auf dem Prüfstand betätigen: beide Seiten ziehen, Wirkung reicht aus.', link: ['#/rechner/bremsen', 'Abbremsung im Bremsenrechner'] },
  ] },
  { id: 'einstellung', titel: 'Scheinwerfer einstellen', schritte: [
    { id: 'einstellen', titel: 'Scheinwerfer-Einstellung', punkte: ['4.1.2', '4.1.5', '4.5.2'], bild: 'einstellung', tipp: 'Fahrzeug gerade vor das Prüfgerät, Leuchtweitenregler auf Grundstellung. Hell-Dunkel-Grenze mit dem Einstellmaß am Fahrzeug vergleichen.', link: ['#/rechner/scheinwerfer', 'Neigung umrechnen'] },
  ] },
  { id: 'abgas', titel: 'Abgas und Geräusch', schritte: [
    { id: 'abgas', titel: 'Abgasuntersuchung', punkte: ['8.2.1.1', '8.2.1.2', '8.2.2.1', '8.2.2.2'], bild: 'abgas', tipp: 'Abgasanlage vollständig und unverändert? Dann messen – maßgeblich sind Herstellerwert oder Plakettenwert.' },
    { id: 'geraeusch', titel: 'Geräusch', punkte: ['8.1.1'], bild: 'geraeusch', tipp: 'Bei laufendem Motor hinhören und Schalldämpfer ansehen: nichts lose, nichts verändert.' },
  ] },
];

// ---------- Lkw über 3,5 t (Druckluftbremse, Grube) ----------
// Ein Prüfpunkt steht nur in einem Schritt, damit derselbe Mangel nicht zweimal erfasst wird.
const LKW = [
  { id: 'papiere', titel: 'Papiere und Identität', schritte: [
    { id: 'kennzeichen', titel: 'Kennzeichen', punkte: ['0.1'], bild: 'kennzeichen', tipp: 'Vorn und hinten ansehen: fest montiert, lesbar und passend zu den Fahrzeugpapieren.' },
    { id: 'fin', titel: 'Fahrzeug-Identnummer', punkte: ['0.2'], bild: 'fin', tipp: 'FIN am Rahmen und auf dem Fabrikschild suchen und Zeichen für Zeichen mit den Papieren vergleichen.', link: ['#/fahrzeug', 'FIN im Fahrzeug-Check prüfen'] },
  ] },
  { id: 'fuehrerhaus', titel: 'Im Führerhaus', schritte: [
    { id: 'kontroll', titel: 'Kontrollleuchten', punkte: ['1.6', '1.7', '7.1.5', '7.1.6', '7.12', '2.6'], bild: 'kontroll', tipp: 'Zündung einschalten: Die Leuchten für ABS, EBS und Stabilitätsregelung gehen an und nach dem Selbsttest wieder aus.' },
    { id: 'luft', titel: 'Druckluftvorrat und Warnanzeige', punkte: ['1.1.3', '1.1.4'], bild: 'manometer', tipp: 'Motor laufen lassen: Der Druck baut sich zügig auf. Dann bei stehendem Motor pumpen, bis die Warnanzeige anspricht – danach muss der Vorrat noch für mindestens vier Bremsungen reichen (Nr. 1.1.3 a).' },
    { id: 'pedal', titel: 'Bremspedal und Feststellbremsventil', punkte: ['1.1.1', '1.1.2', '1.1.5', '1.1.6'], bild: 'handventil', tipp: 'Pedal treten: leichtgängig, kein Spiel in der Lagerung, Belag rutschfest. Feststellbremsventil betätigen: rastet sicher ein, nichts bläst ab.' },
    { id: 'lenkrad', titel: 'Lenkrad und Lenkungsspiel', punkte: ['2.2.1', '2.2.2', '2.3'], bild: 'lenkrad', tipp: 'Bei laufendem Motor das Lenkrad leicht hin- und herbewegen: Die Räder müssen ohne großen Leerweg folgen. Lenksäule und Verstellung fest?' },
    { id: 'gurte', titel: 'Sicherheitsgurte', punkte: ['7.1.1', '7.1.2'], bild: 'gurt', tipp: 'Jeden Gurt ganz herausziehen, auf Schnitte prüfen, einrasten lassen und kräftig rucken. Rollt er wieder auf?' },
    { id: 'sitze', titel: 'Sitze', punkte: ['6.2.5', '6.2.6'], bild: 'sitz', tipp: 'Sitze rütteln und verstellen: fest verankert, Verstellung rastet sicher ein.' },
    { id: 'hupe', titel: 'Hupe und Tacho', punkte: ['7.7', '7.8', '7.11'], bild: 'hupe', tipp: 'Hupe kurz betätigen. Tacho und Kilometerzähler ansehen, Stand notieren.' },
    { id: 'tacho', titel: 'Fahrtenschreiber und Begrenzer', punkte: ['7.9', '7.10'], bild: 'plombe', tipp: 'Einbauschilder suchen und lesen, Plomben ansehen. Passt die Reifengröße zu den Angaben auf dem Schild? Lkw über 3,5 t brauchen einen Geschwindigkeitsbegrenzer, eingestellt auf höchstens 90 km/h (§ 57c StVZO).' },
    { id: 'sicht', titel: 'Scheiben und Sichtfeld', punkte: ['3.1', '3.2'], bild: 'scheibe', tipp: 'Von innen und außen ansehen. Entscheidend ist, was im Wischbereich vor dem Fahrer liegt.' },
    { id: 'wischer', titel: 'Spiegel, Wischer, Waschanlage', punkte: ['3.3', '3.4', '3.5'], bild: 'wischer', tipp: 'Alle Spiegel und Kamerasysteme fest, klar und einstellbar? Wischer laufen lassen, Waschanlage betätigen.' },
    { id: 'ausruestung', titel: 'Warndreieck, Verbandkasten, Unterlegkeile', punkte: ['7.4', '7.5', '7.6'], bild: 'keil', tipp: 'Zeigen lassen: Warndreieck, Warnleuchte und Verbandkasten. Unterlegkeile über 4 t: mindestens einer, bei drei und mehr Achsen zwei – in einer festen Halterung (§ 41 Abs. 14 und § 53a StVZO).' },
  ] },
  { id: 'licht', titel: 'Licht rundum', schritte: [
    { id: 'scheinwerfer', titel: 'Scheinwerfer', punkte: ['4.1.1', '4.1.3'], bild: 'leuchte', tipp: 'Abblend- und Fernlicht schalten. Beide Seiten leuchten gleich hell, Streuscheiben klar und dicht.' },
    { id: 'schluss', titel: 'Begrenzungs-, Schluss- und Umrissleuchten', punkte: ['4.2.1'], bild: 'schluss', tipp: 'Einmal ums Fahrzeug gehen: Begrenzungs-, Schluss-, Umriss- und Seitenmarkierungsleuchten – alle an, keine gebrochen.' },
    { id: 'bremslicht', titel: 'Bremsleuchten', punkte: ['4.3.1'], bild: 'bremslicht', tipp: 'Bremse treten lassen oder im Spiegel einer Wand prüfen.' },
    { id: 'blinker', titel: 'Blinker und Warnblinker', punkte: ['4.4.1', '4.4.4'], bild: 'leuchte', tipp: 'Links, rechts, Warnblinker – auch die seitlichen Blinker. Auf gleichmäßigen Takt achten.' },
    { id: 'weitere', titel: 'Nebel-, Rückfahr- und Kennzeichenlicht', punkte: ['4.5.1', '4.6.1', '4.7.1'], bild: 'kennzeichenlicht', tipp: 'Nebelschlussleuchte, Rückfahrlicht und Kennzeichenbeleuchtung schalten.' },
    { id: 'kontur', titel: 'Rückstrahler und Konturmarkierung', punkte: ['4.8.1', '4.8.2'], bild: 'kontur', tipp: 'Rückstrahler hinten und an den Seiten, Konturmarkierung und Kennzeichnungstafeln: vollständig, unbeschädigt, fest.' },
  ] },
  { id: 'aussen', titel: 'Außen', schritte: [
    { id: 'aufbau', titel: 'Führerhaus, Aufbau und Einstieg', punkte: ['6.2.1', '6.2.2', '6.2.3', '6.2.8'], bild: 'fuehrerhaus', tipp: 'Rundgang: Führerhaus und Aufbau sitzen fest auf dem Rahmen, nichts steht ab. Türen rasten sicher ein, Trittstufen sind fest.' },
    { id: 'reifen', titel: 'Räder und Reifen', punkte: ['5.2.1', '5.2.2', '5.2.3'], bild: 'reifen', tipp: 'Jedes Rad einzeln, bei Zwillingsreifen auch das innere: Radmuttern vollzählig und fest, Profil über die ganze Breite messen, Flanken auf Risse und Beulen absuchen. Größe mit den Papieren vergleichen.', link: ['#/rechner/tragfaehigkeit', 'Tragfähigkeit und Tempo prüfen'] },
    { id: 'schutz', titel: 'Unterfahrschutz und Spritzschutz', punkte: ['6.1.4', '6.2.10'], bild: 'unterfahr', tipp: 'Hinterer Unterfahrschutz und seitliche Schutzvorrichtungen: vorhanden, fest, nicht verbogen (§§ 32b, 32c StVZO). Kotflügel und Spritzschutz vollständig.' },
    { id: 'anbau', titel: 'Reserverad und Anbaugeräte', punkte: ['6.1.5', '6.2.9'], bild: 'reserverad', tipp: 'Reserverad sicher im Halter? Ladebordwand, Kran oder Kipper: Befestigung fest, Hydraulik dicht.' },
    { id: 'kupplung', titel: 'Anhänge- oder Sattelkupplung', punkte: ['6.1.6'], bild: 'sattel', tipp: 'Falls vorhanden: auf Verschleiß und Risse ansehen, Verriegelung und Sicherung betätigen, Befestigung am Rahmen prüfen. Sonst „Entfällt“.' },
    { id: 'anschluss', titel: 'Anschlüsse zum Anhänger', punkte: ['1.1.8', '1.1.20', '4.10'], bild: 'kupplungskopf', tipp: 'Falls vorhanden: Kupplungsköpfe dicht und unbeschädigt, Steckdosen fest, Kontakte sauber. Sonst „Entfällt“.' },
  ] },
  { id: 'motorraum', titel: 'Motorraum', schritte: [
    { id: 'luftanlage', titel: 'Kompressor, Lufttrockner, Ventile', punkte: ['1.1.7', '1.1.21'], bild: 'trockner', tipp: 'Führerhaus kippen oder Klappe öffnen. Kompressor, Druckregler und Lufttrockner ansehen und abhören: kein Öl am Kompressor, nichts bläst ab, alles fest.' },
    { id: 'bremsfl', titel: 'Bremsflüssigkeit (hydraulische Bremse)', punkte: ['1.8', '1.1.10'], bild: 'bremsfl', tipp: 'Nur bei hydraulischer oder druckluft-hydraulischer Bremse: Stand zwischen Min und Max, Flüssigkeit klar, Hauptbremszylinder trocken. Bei reiner Druckluftbremse „Entfällt“.' },
    { id: 'elektrik', titel: 'Batterien und Leitungen', punkte: ['4.13', '4.11'], bild: 'batterie', tipp: 'Batteriekasten öffnen: Batterien fest und dicht. Leitungen sauber verlegt, nichts scheuert oder hängt lose.' },
    { id: 'dicht', titel: 'Dichtheit und Motorlager', punkte: ['8.4.1', '6.1.8', '2.1.5'], bild: 'dicht', tipp: 'Auf Öl-, Kühlmittel- und Kraftstoffspuren achten. Motorlager und Servolenkung ansehen.' },
  ] },
  { id: 'grube', titel: 'Grube', schritte: [
    { id: 'behaelter', titel: 'Druckluftbehälter', punkte: ['1.1.9'], bild: 'kessel', tipp: 'Behälter und Halterung ansehen: fest, keine Rostnarben, keine Beulen. Entwässerung betätigen – sie muss funktionieren und wieder dicht schließen.' },
    { id: 'leitungen', titel: 'Bremsleitungen und -schläuche', punkte: ['1.1.11', '1.1.12'], bild: 'schlauch', tipp: 'Leitungen am Rahmen entlang abgehen: fest in den Haltern, nichts scheuert. Schläuche an den Achsen biegen und auf Risse achten, Verbindungen abhören.' },
    { id: 'regler', titel: 'Bremskraftregler und Prüfanschlüsse', punkte: ['1.1.17', '1.1.22'], bild: 'ventil', tipp: 'Lastabhängigen Bremskraftregler ansehen: Gestänge fest und nicht verbogen, Schild mit den Einstellwerten vorhanden und lesbar. Prüfanschlüsse vorhanden und dicht.' },
    { id: 'zylinder', titel: 'Bremszylinder und Gestängesteller', punkte: ['1.1.16', '1.1.18', '1.1.15'], bild: 'zylinder', tipp: 'Bremse betätigen lassen und an jedem Rad zusehen: Zylinder und Federspeicher fest und dicht, der Hub bleibt klein, der Gestängesteller ist freigängig.' },
    { id: 'bremse', titel: 'Scheiben, Trommeln und Beläge', punkte: ['1.1.13', '1.1.14'], bild: 'scheibe-bremse', tipp: 'Belagstärke an jedem Rad ansehen – an der Verschleißanzeige oder durch das Schauloch. Scheiben und Trommeln ohne Risse und starke Riefen.' },
    { id: 'lenkung', titel: 'Lenkgetriebe und Gestänge', punkte: ['2.1.1', '2.1.2', '2.1.3', '2.1.4'], bild: 'spiel', tipp: 'Lenkung hin- und herbewegen lassen und Lenkgetriebe, Lenkhebel, Lenk- und Spurstange beobachten: kein Spiel in den Gelenken, alles fest am Rahmen.' },
    { id: 'achsen', titel: 'Achsen, Achsschenkel, Radlager', punkte: ['5.1.1', '5.1.2', '5.1.3'], bild: 'radlager', tipp: 'Mit dem Radspieldetektor oder dem Montiereisen belasten: kein Spiel am Achsschenkel, Radlager laufen ruhig, Achskörper ohne Risse.' },
    { id: 'gelenke', titel: 'Lenker und Lager', punkte: ['5.3.3', '5.3.4'], bild: 'buchse', tipp: 'Lenker, Stabilisator und ihre Lager unter Last beobachten: nichts ausgeschlagen, nichts gerissen, Befestigung fest.' },
    { id: 'federn', titel: 'Blattfedern und Stoßdämpfer', punkte: ['5.3.1', '5.3.2'], bild: 'blattfeder', tipp: 'Federpakete ansehen: kein Blatt gebrochen, Befestigung an Rahmen und Achse fest. Dämpfer trocken und fest.' },
    { id: 'luftfeder', titel: 'Luftfederung', punkte: ['5.3.5'], bild: 'luftfeder', tipp: 'Falls vorhanden: Bälge rundum auf Risse und Scheuerstellen ansehen, auf Zischen achten. Sonst „Entfällt“.' },
    { id: 'rahmen', titel: 'Rahmen', punkte: ['6.1.1'], bild: 'rahmen', tipp: 'Längs- und Querträger abgehen: keine Risse, keine Verformung, Verstärkungen und Befestigungen fest, kein Rost, der die Festigkeit mindert.' },
    { id: 'auspuff', titel: 'Auspuff und Kraftstoffanlage', punkte: ['6.1.2', '6.1.3'], bild: 'auspuff', tipp: 'Anlage rütteln: fest, dicht, Halter vollständig. Tanks fest in den Bändern, Leitungen und Verschluss dicht.' },
    { id: 'antrieb', titel: 'Gelenkwelle und Antrieb', punkte: ['6.1.7'], bild: 'kardan', tipp: 'Gelenkwellen von Hand drehen und rütteln: kein Spiel in den Gelenken und im Mittellager, Schrauben vollzählig.' },
    { id: 'dauerbremse', titel: 'Dauerbremse', punkte: ['1.1.19', '1.5'], bild: 'dauerbremse', tipp: 'Motorbremse oder Retarder: Anschlüsse und Befestigung ansehen, dann – soweit möglich – die Funktion prüfen. Nicht vorhanden und nicht vorgeschrieben: „Entfällt“.' },
  ] },
  { id: 'pruefstand', titel: 'Bremsenprüfstand', schritte: [
    { id: 'bba', titel: 'Betriebsbremse', punkte: ['1.2.1', '1.2.2'], bild: 'pruefstand', tipp: 'Achse für Achse langsam steigern. Links und rechts vergleichen, auf Schwankungen bei jeder Radumdrehung achten. Die Abbremsung bezieht sich auf die zulässige Gesamtmasse.', link: ['#/rechner/bremsen', 'Abbremsung im Bremsenrechner (Klasse N2/N3)'] },
    { id: 'fba', titel: 'Feststell- und Hilfsbremse', punkte: ['1.4.1', '1.4.2', '1.3.1', '1.3.2'], bild: 'fba', tipp: 'Feststellbremse auf dem Prüfstand betätigen: beide Seiten ziehen, Wirkung reicht aus. Ist die Hilfsbremse ein eigenes System, wird sie wie die Betriebsbremse geprüft.', link: ['#/rechner/bremsen', 'Abbremsung im Bremsenrechner (Klasse N2/N3)'] },
  ] },
  { id: 'einstellung', titel: 'Scheinwerfer einstellen', schritte: [
    { id: 'einstellen', titel: 'Scheinwerfer-Einstellung', punkte: ['4.1.2', '4.1.5', '4.5.2'], bild: 'einstellung', tipp: 'Fahrzeug gerade vor das Prüfgerät, Leuchtweitenregler auf Grundstellung. Hell-Dunkel-Grenze mit dem Einstellmaß am Fahrzeug vergleichen.', link: ['#/rechner/scheinwerfer', 'Neigung umrechnen'] },
  ] },
  { id: 'abgas', titel: 'Abgas und Geräusch', schritte: [
    { id: 'abgas', titel: 'Abgasuntersuchung', punkte: ['8.2.1.1', '8.2.1.2', '8.2.2.1', '8.2.2.2'], bild: 'abgas', tipp: 'Abgasanlage und Abgasnachbehandlung vollständig und unverändert? Dann messen – maßgeblich sind Herstellerwert oder Plakettenwert.' },
    { id: 'geraeusch', titel: 'Geräusch', punkte: ['8.1.1'], bild: 'geraeusch', tipp: 'Bei laufendem Motor hinhören und Schalldämpfer ansehen: nichts lose, nichts verändert.' },
  ] },
];

const flach = (stationen) => stationen.flatMap((st, si) => st.schritte.map((s) => ({ ...s, station: st, si })));
export const ABLAEUFE = {
  pkw: { id: 'pkw', name: 'Pkw', lang: 'Pkw und Transporter bis 3,5 t', stationen: PKW, schritte: flach(PKW) },
  lkw: { id: 'lkw', name: 'Lkw', lang: 'Lkw über 3,5 t', stationen: LKW, schritte: flach(LKW) },
};
/** Ablauf zur Fahrzeugart eines Auftrags (Schlüssel aus FRISTEN in daten.js).
 *  Lkw bis 3,5 t haben in aller Regel eine hydraulische Bremse und laufen deshalb wie ein Pkw. */
export const ablaufFuer = (fahrzeugart) => (/^lkw-(75|12|12p)$/.test(fahrzeugart || '') ? ABLAEUFE.lkw : ABLAEUFE.pkw);

// ---------- Go/No-Go-Bilder ----------
// Kleine Strichzeichnungen mit einfachen Animationen (Klassen in css/app.css, Abschnitt "Prüfmodus").
// s = Strich, f = helle Fläche, t = Tinte gefüllt, r = roter Strich, g = grüner Strich; d = gestrichelt.
const svg = (inhalt) => `<svg viewBox="0 0 160 100" class="il" aria-hidden="true">${inhalt}</svg>`;
const BODEN = '<path class="s d" d="M10 86h140"/>';

export const BILDER = {
  kennzeichen: {
    go: [svg('<rect class="f s" x="22" y="32" width="116" height="36" rx="5"/><rect class="blau" x="22" y="32" width="16" height="36" rx="5"/><text x="88" y="57" text-anchor="middle" class="schrift">D EM 123</text>'), 'Fest, lesbar, passt zu den Papieren'],
    nogo: [svg('<g transform="rotate(9 80 50)"><rect class="f s" x="22" y="32" width="116" height="36" rx="5"/><rect class="blau" x="22" y="32" width="16" height="36" rx="5"/><text x="88" y="57" text-anchor="middle" class="schrift blass">D E   1 3</text><path class="r" d="M70 38l22 24M96 40l-10 20"/></g><circle class="t wackelpunkt" cx="30" cy="30" r="2.5"/>'), 'Lose oder nicht mehr lesbar'],
  },
  kontroll: {
    go: [svg('<path class="s" d="M20 78a60 60 0 0 1 120 0"/><g class="aus"><circle class="gelb" cx="52" cy="52" r="9"/><circle class="gelb" cx="80" cy="40" r="9"/><circle class="gelb" cx="108" cy="52" r="9"/></g><circle class="s" cx="52" cy="52" r="9"/><circle class="s" cx="80" cy="40" r="9"/><circle class="s" cx="108" cy="52" r="9"/>'), 'Gehen an – und wieder aus'],
    nogo: [svg('<path class="s" d="M20 78a60 60 0 0 1 120 0"/><circle class="s" cx="52" cy="52" r="9"/><circle class="gelb blink" cx="80" cy="40" r="9"/><circle class="s" cx="80" cy="40" r="9"/><circle class="s" cx="108" cy="52" r="9"/>'), 'Eine Leuchte bleibt an'],
  },
  gurt: {
    go: [svg('<path class="f s" d="M46 12h26l42 76H88z"/><rect class="s f" x="84" y="74" width="34" height="16" rx="4"/>'), 'Gewebe heil, rollt auf, rastet ein'],
    nogo: [svg('<path class="f s" d="M46 12h26l16 29-9 5 12 4 23 38H88L72 60l8-4-11-5z"/><path class="r" d="M66 44l-10 3M68 50l-12 5M92 46l11-3M90 53l12 2"/><rect class="s f" x="84" y="74" width="34" height="16" rx="4"/>'), 'Eingeschnitten oder ausgefranst'],
  },
  scheibe: {
    go: [svg('<path class="f s" d="M24 80l14-58h84l14 58z"/><path class="s d" d="M36 78a44 44 0 0 1 60-44"/><path class="s" d="M126 30l3 5 5-3-3 5 5 3-6 0 1 6-4-5-4 4 1-6-6-1 5-3z"/>'), 'Kleiner Schaden außerhalb des Wischbereichs'],
    nogo: [svg('<path class="f s" d="M24 80l14-58h84l14 58z"/><path class="s d" d="M36 78a44 44 0 0 1 60-44"/><path class="r" d="M52 70l8-12-3-8 10-9 2-9"/>'), 'Riss im Wischbereich vor dem Fahrer'],
  },
  leuchte: {
    go: [svg('<path class="f s" d="M52 30h34a22 22 0 0 1 0 44H52z"/><g class="blink"><path class="gelbstrich" d="M118 52h24M114 34l20-10M114 70l20 10"/></g>'), 'Leuchtet hell und gleichmäßig'],
    nogo: [svg('<path class="f s" d="M52 30h34a22 22 0 0 1 0 44H52z"/><path class="r" d="M70 34l8 12-6 8 9 14"/><path class="r" d="M118 40l20 24M138 40l-20 24"/>'), 'Dunkel, gesprungen oder undicht'],
  },
  reifen: {
    go: [svg(BODEN + '<path class="f s" d="M18 86V52h20v22h10V52h20v22h10V52h20v22h10V52h20v34"/><rect class="t" x="40" y="68" width="6" height="6"/><g class="mess"><rect class="gruenfl" x="71" y="40" width="4" height="34"/><path class="g" d="M64 40h18"/></g>'), 'Profil deutlich über dem Abnutzungsanzeiger (mind. 1,6 mm)'],
    nogo: [svg(BODEN + '<path class="f s" d="M18 86V68h20v6h10v-6h20v6h10v-6h20v6h10v-6h20v18"/><rect class="rotfl blink" x="40" y="68" width="6" height="6"/><rect class="rotfl blink" x="70" y="68" width="6" height="6"/>'), 'Abnutzungsanzeiger liegt auf Profilhöhe'],
  },
  schlauch: {
    go: [svg('<rect class="s f" x="14" y="24" width="18" height="14" rx="3"/><rect class="s f" x="128" y="62" width="18" height="14" rx="3"/><path class="dick" d="M32 31c40 0 30 38 96 38"/>'), 'Glatt, trocken, frei verlegt'],
    nogo: [svg('<rect class="s f" x="14" y="24" width="18" height="14" rx="3"/><rect class="s f" x="128" y="62" width="18" height="14" rx="3"/><path class="dick" d="M32 31c40 0 30 38 96 38"/><path class="r" d="M62 38l6 8M70 42l6 8M78 48l6 7M86 55l5 6"/><circle class="rotfl tropf" cx="76" cy="62" r="3"/>'), 'Porös, rissig, feucht oder scheuert'],
  },
  'scheibe-bremse': {
    go: [svg('<circle class="f s" cx="72" cy="50" r="36"/><circle class="s" cx="72" cy="50" r="12"/><rect class="s f" x="96" y="34" width="26" height="32" rx="6"/>'), 'Glatte Fläche, genug Belag'],
    nogo: [svg('<circle class="f s" cx="72" cy="50" r="36"/><circle class="s d" cx="72" cy="50" r="28"/><circle class="s d" cx="72" cy="50" r="21"/><circle class="s" cx="72" cy="50" r="12"/><path class="r" d="M80 42l14-14 4 6 10-10"/><rect class="s f" x="96" y="34" width="26" height="32" rx="6"/>'), 'Riefen, Risse, starker Rand'],
  },
  spiel: {
    go: [svg('<path class="s f" d="M48 22h64v18a32 32 0 0 1-64 0z"/><circle class="s f" cx="80" cy="44" r="14"/><path class="dick" d="M80 58v30"/>'), 'Sitzt fest, kein fühlbares Spiel'],
    nogo: [svg('<path class="s f" d="M48 22h64v18a32 32 0 0 1-64 0z"/><g class="wackel"><circle class="s f" cx="80" cy="44" r="11"/><path class="dick" d="M80 55v33"/></g><path class="r" d="M46 78h-12l5-5M34 78l5 5M114 78h12l-5-5M126 78l-5 5"/>'), 'Lässt sich hin- und herbewegen'],
  },
  daempfer: {
    go: [svg('<path class="dick" d="M80 8v26"/><rect class="s f" x="66" y="34" width="28" height="48" rx="6"/><circle class="s f" cx="80" cy="90" r="5"/>'), 'Trocken und fest'],
    nogo: [svg('<path class="dick" d="M80 8v26"/><rect class="s f" x="66" y="34" width="28" height="48" rx="6"/><path class="rotfl" d="M70 38h20v20c-4 8-6 14-10 22-4-8-6-14-10-22z" opacity=".55"/><circle class="s f" cx="80" cy="90" r="5"/><circle class="rotfl tropf" cx="96" cy="70" r="3"/>'), 'Ölfeucht – Dämpfer undicht'],
  },
  rost: {
    go: [svg('<path class="s f" d="M12 40h136v24a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8z"/><path class="s d" d="M22 52h116"/>'), 'Tragende Teile fest und geschlossen'],
    nogo: [svg('<path class="s f" d="M12 40h136v24a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8z"/><path class="rotfl" d="M64 48l10-4 9 3 8-2 5 7-4 8-9 3-8-2-9 2-5-7z"/><path class="r" d="M40 58l4 3M110 46l4 4M122 60l4-3M50 46l3 3"/>'), 'Durchgerostet oder geschwächt'],
  },
  auspuff: {
    go: [svg('<path class="s f" d="M10 44h60v16H10z"/><rect class="s f" x="70" y="34" width="56" height="36" rx="16"/><path class="s f" d="M126 46h24v12h-24z"/>'), 'Fest, dicht, Halter vollständig'],
    nogo: [svg('<path class="s f" d="M10 44h60v16H10z"/><rect class="s f" x="70" y="34" width="56" height="36" rx="16"/><path class="s f" d="M126 46h24v12h-24z"/><path class="r" d="M66 38l8 28"/><circle class="grau rauch" cx="72" cy="36" r="6"/><circle class="grau rauch spaeter" cx="66" cy="32" r="5"/>'), 'Undicht – Abgas tritt vorher aus'],
  },
  pruefstand: {
    go: [svg(BODEN + '<rect class="gruenfl wachs" x="44" y="26" width="24" height="60" rx="4"/><rect class="gruenfl wachs" x="92" y="30" width="24" height="56" rx="4"/><text x="56" y="98" text-anchor="middle" class="klein">L</text><text x="104" y="98" text-anchor="middle" class="klein">R</text>'), 'Links und rechts ziehen etwa gleich'],
    nogo: [svg(BODEN + '<rect class="gruenfl wachs" x="44" y="26" width="24" height="60" rx="4"/><rect class="rotfl wachs" x="92" y="56" width="24" height="30" rx="4"/><path class="s d" d="M84 44h40"/><text x="134" y="47" class="klein">70 %</text><text x="56" y="98" text-anchor="middle" class="klein">L</text><text x="104" y="98" text-anchor="middle" class="klein">R</text>'), 'Ein Rad unter 70 % des anderen (Nr. 1.2.1 b)'],
  },
  einstellung: {
    go: [svg('<path class="s d" d="M14 44h132"/><path class="gelbfl" d="M14 54h60l14-8h58v40H14z" opacity=".5"/><path class="s" d="M14 54h60l14-8h58"/><text x="146" y="38" text-anchor="end" class="klein">Einstellmaß</text>'), 'Hell-Dunkel-Grenze liegt auf dem Einstellmaß'],
    nogo: [svg('<path class="s d" d="M14 44h132"/><path class="gelbfl blink" d="M14 34h60l14-8h58v60H14z" opacity=".5"/><path class="r" d="M14 34h60l14-8h58"/><text x="146" y="58" text-anchor="end" class="klein">zu hoch</text>'), 'Grenze zu hoch – der Gegenverkehr wird geblendet'],
  },
  abgas: {
    go: [svg('<path class="s f" d="M10 50h70v16H10z"/><path class="dick" d="M80 58h30"/><rect class="s f" x="110" y="46" width="36" height="24" rx="5"/><path class="g" d="M120 58l6 6 12-13"/>'), 'Werte im Rahmen, Anlage vollständig'],
    nogo: [svg('<path class="s f" d="M10 50h70v16H10z"/><circle class="grau rauch" cx="92" cy="54" r="8"/><circle class="grau rauch spaeter" cx="100" cy="48" r="7"/><circle class="grau rauch" cx="110" cy="56" r="6"/>'), 'Grenzwert überschritten oder Teile fehlen'],
  },
  // ---- zweite Lieferung: Bilder für die übrigen Schritte ----
  fin: {
    go: [svg('<rect class="f s" x="14" y="16" width="124" height="26" rx="4"/><text x="76" y="34" text-anchor="middle" class="mono-il">WVWZZZ1KZ6W…</text><rect class="s" x="30" y="56" width="92" height="30" rx="3"/><text x="76" y="75" text-anchor="middle" class="mono-il">WVWZZZ1KZ6W…</text><path class="g" d="M134 64l5 6 10-13"/>'), 'Am Fahrzeug lesbar und gleich wie in den Papieren'],
    nogo: [svg('<rect class="f s" x="14" y="16" width="124" height="26" rx="4"/><text x="76" y="34" text-anchor="middle" class="mono-il blass">WVW Z 1K  6W…</text><path class="r" d="M58 20l9 18M94 20l-8 18"/><rect class="s" x="30" y="56" width="92" height="30" rx="3"/><text x="76" y="75" text-anchor="middle" class="mono-il">WVWZZZ1KZ6W…</text><text x="142" y="78" text-anchor="middle" class="rottext">≠</text>'), 'Unleserlich oder weicht von den Papieren ab'],
  },
  sitz: {
    go: [svg('<path class="s" d="M36 84h92M56 74v10M104 74v10"/><path class="f s" d="M50 60h54a6 6 0 0 1 6 6v8H50z"/><path class="f s" d="M50 60l-8-38a6 6 0 0 1 6-8h8a6 6 0 0 1 6 5l8 41z"/><path class="g" d="M122 30l5 6 10-13"/>'), 'Fest verankert, Verstellung rastet'],
    nogo: [svg('<path class="s" d="M36 84h92M56 74v10M104 74v10"/><path class="f s" d="M50 60h54a6 6 0 0 1 6 6v8H50z"/><g class="kipp" style="transform-origin:56px 60px"><path class="f s" d="M50 60l-8-38a6 6 0 0 1 6-8h8a6 6 0 0 1 6 5l8 41z"/></g><path class="r" d="M22 30c2-9 8-15 16-17M20 20l2 10 9-4"/>'), 'Sitz oder Lehne lose'],
  },
  pedal: {
    go: [svg('<path class="s d" d="M18 88h124"/><path class="s" d="M120 10v78"/><circle class="t" cx="104" cy="18" r="3.5"/><g class="druck" style="transform-origin:104px 18px"><path class="dick" d="M104 18L72 58"/><path class="dick" d="M58 54l22 16"/></g><path class="g" d="M96 76v10M92 76h8M92 86h8"/>'), 'Fester Druckpunkt, Wegreserve bleibt'],
    nogo: [svg('<path class="s d" d="M18 88h124"/><path class="s" d="M120 10v78"/><circle class="t" cx="104" cy="18" r="3.5"/><g class="durch" style="transform-origin:104px 18px"><path class="dick" d="M104 18L72 58"/><path class="dick" d="M58 54l22 16"/></g><path class="r" d="M64 88h40"/>'), 'Pedal sinkt durch – keine Wegreserve'],
  },
  lenkrad: {
    go: [svg('<g class="dreh-klein"><circle class="s" cx="80" cy="52" r="32"/><circle class="s f" cx="80" cy="52" r="9"/><path class="s" d="M48 52h23M89 52h23M80 61v23"/></g><path class="g" d="M124 18l5 6 10-13"/>'), 'Räder folgen ohne Leerweg'],
    nogo: [svg('<g class="dreh-gross"><circle class="s" cx="80" cy="52" r="32"/><circle class="s f" cx="80" cy="52" r="9"/><path class="s" d="M48 52h23M89 52h23M80 61v23"/></g><path class="r d" d="M46 20a46 46 0 0 1 68 0"/><path class="r" d="M46 20l1 9M46 20l9 0M114 20l-1 9M114 20l-9 0"/>'), 'Zu viel Spiel am Lenkrad'],
  },
  hupe: {
    go: [svg('<path class="f s" d="M36 40h18l28-18v56L54 60H36z"/><path class="s blink" d="M96 36a20 20 0 0 1 0 28M108 26a34 34 0 0 1 0 48"/>'), 'Deutlich hörbar'],
    nogo: [svg('<path class="f s" d="M36 40h18l28-18v56L54 60H36z"/><path class="r" d="M100 38l22 24M122 38l-22 24"/>'), 'Stumm oder zu leise'],
  },
  wischer: {
    go: [svg('<path class="f s" d="M18 86l14-62h96l14 62z"/><path class="s d" d="M36 72a52 52 0 0 1 88 0"/><g class="wisch" style="transform-origin:80px 86px"><path class="dick2" d="M80 86V34"/></g><circle class="t" cx="80" cy="86" r="3"/>'), 'Wischt sauber über das ganze Feld'],
    nogo: [svg('<path class="f s" d="M18 86l14-62h96l14 62z"/><path class="r" d="M46 66c10-16 22-22 34-22M56 74c8-12 16-17 26-18M70 40c10 2 22 10 30 24"/><g transform="rotate(24 80 86)"><path class="dick2" d="M80 86V34"/></g><circle class="t" cx="80" cy="86" r="3"/>'), 'Blatt schadhaft – Schlieren im Sichtfeld'],
  },
  ausruestung: {
    go: [svg('<path class="s f" d="M22 76l24-42 24 42z"/><path class="s" d="M46 50v13"/><circle class="t" cx="46" cy="69" r="1.6"/><rect class="f s" x="92" y="40" width="46" height="34" rx="6"/><path class="g" d="M115 47v20M105 57h20"/>'), 'Warndreieck und Verbandkasten an Bord'],
    nogo: [svg('<path class="s d" d="M22 76l24-42 24 42z"/><rect class="s d" x="92" y="40" width="46" height="34" rx="6"/><text x="46" y="70" text-anchor="middle" class="rottext">?</text><text x="115" y="63" text-anchor="middle" class="rottext">?</text>'), 'Fehlt oder unvollständig'],
  },
  schluss: {
    go: [svg('<rect class="f s" x="22" y="28" width="116" height="46" rx="12"/><rect class="gelb" x="28" y="38" width="24" height="13" rx="3"/><rect class="gelb" x="108" y="38" width="24" height="13" rx="3"/><rect class="s" x="28" y="38" width="24" height="13" rx="3"/><rect class="s" x="108" y="38" width="24" height="13" rx="3"/><rect class="s" x="62" y="54" width="36" height="11" rx="2"/><path class="dick" d="M40 78v7M120 78v7"/>'), 'Alle Leuchten an'],
    nogo: [svg('<rect class="f s" x="22" y="28" width="116" height="46" rx="12"/><rect class="gelb" x="28" y="38" width="24" height="13" rx="3"/><rect class="s" x="28" y="38" width="24" height="13" rx="3"/><rect class="s" x="108" y="38" width="24" height="13" rx="3"/><path class="r" d="M113 40l14 9M127 40l-14 9"/><rect class="s" x="62" y="54" width="36" height="11" rx="2"/><path class="dick" d="M40 78v7M120 78v7"/>'), 'Eine Leuchte dunkel'],
  },
  bremslicht: {
    go: [svg('<rect class="f s" x="22" y="28" width="116" height="46" rx="12"/><g class="blink"><rect class="gelb" x="28" y="40" width="24" height="13" rx="3"/><rect class="gelb" x="108" y="40" width="24" height="13" rx="3"/><rect class="gelb" x="66" y="32" width="28" height="6" rx="2"/></g><rect class="s" x="28" y="40" width="24" height="13" rx="3"/><rect class="s" x="108" y="40" width="24" height="13" rx="3"/><rect class="s" x="66" y="32" width="28" height="6" rx="2"/><path class="dick" d="M40 78v7M120 78v7"/>'), 'Alle Bremsleuchten leuchten auf'],
    nogo: [svg('<rect class="f s" x="22" y="28" width="116" height="46" rx="12"/><g class="blink"><rect class="gelb" x="28" y="40" width="24" height="13" rx="3"/><rect class="gelb" x="108" y="40" width="24" height="13" rx="3"/></g><rect class="s" x="28" y="40" width="24" height="13" rx="3"/><rect class="s" x="108" y="40" width="24" height="13" rx="3"/><rect class="s" x="66" y="32" width="28" height="6" rx="2"/><path class="r" d="M72 20l16 12M88 20l-16 12"/><path class="dick" d="M40 78v7M120 78v7"/>'), 'Eine Bremsleuchte bleibt dunkel'],
  },
  kennzeichenlicht: {
    go: [svg('<rect class="s f" x="66" y="20" width="28" height="9" rx="3"/><path class="gelbstrich blink" d="M68 34l-7 9M80 34v9M92 34l7 9"/><rect class="f s" x="30" y="48" width="100" height="30" rx="4"/><text x="80" y="69" text-anchor="middle" class="schrift">D EM 123</text>'), 'Kennzeichen ist beleuchtet'],
    nogo: [svg('<rect class="s f" x="66" y="20" width="28" height="9" rx="3"/><path class="r" d="M70 32l20 12M90 32l-20 12"/><rect class="f s" x="30" y="48" width="100" height="30" rx="4"/><text x="80" y="69" text-anchor="middle" class="schrift blass">D EM 123</text>'), 'Beleuchtung ausgefallen'],
  },
  karosserie: {
    go: [svg(BODEN + '<path class="f s" d="M12 70V56l18-4 18-20h50l22 20 24 6v12z"/><path class="s" d="M72 32v38M48 52h72"/><circle class="s f" cx="42" cy="72" r="11"/><circle class="s f" cx="116" cy="72" r="11"/>'), 'Türen schließen sicher, nichts steht ab'],
    nogo: [svg(BODEN + '<path class="f s" d="M12 70V56l18-4 18-20h50l22 20 24 6v12z"/><path class="s" d="M48 52h72"/><path class="r" d="M72 32l-9 38"/><path class="r" d="M144 62l12-5-6 9 8 3"/><circle class="s f" cx="42" cy="72" r="11"/><circle class="s f" cx="116" cy="72" r="11"/>'), 'Scharfe Kanten oder lose Teile'],
  },
  ahk: {
    go: [svg('<rect class="f s" x="14" y="34" width="62" height="28" rx="7"/><path class="dick" d="M76 50h28V36"/><circle class="f s" cx="104" cy="26" r="12"/><circle class="t" cx="60" cy="48" r="2.4"/><circle class="t" cx="30" cy="48" r="2.4"/>'), 'Fest verschraubt, Kugel nicht abgenutzt'],
    nogo: [svg('<rect class="f s" x="14" y="34" width="62" height="28" rx="7"/><g class="kipp" style="transform-origin:76px 50px"><path class="dick" d="M76 50h28V36"/><circle class="f s" cx="104" cy="26" r="12"/></g><circle class="s" cx="60" cy="48" r="2.4"/><circle class="t" cx="30" cy="48" r="2.4"/><path class="r" d="M124 44l10 4-10 4M124 30l10-4"/>'), 'Lose oder beschädigt'],
  },
  bremsfl: {
    go: [svg('<rect class="f s" x="62" y="12" width="36" height="10" rx="3"/><path class="gelbfl" opacity=".55" d="M50 48h60v30a6 6 0 0 1-6 6H56a6 6 0 0 1-6-6z"/><path class="s" d="M50 22h60v56a6 6 0 0 1-6 6H56a6 6 0 0 1-6-6z"/><path class="s" d="M110 38h9M110 68h9"/><text x="123" y="41" class="klein">MAX</text><text x="123" y="71" class="klein">MIN</text>'), 'Stand zwischen MIN und MAX, klar'],
    nogo: [svg('<rect class="f s" x="62" y="12" width="36" height="10" rx="3"/><path class="rotfl" opacity=".6" d="M50 75h60v3a6 6 0 0 1-6 6H56a6 6 0 0 1-6-6z"/><path class="s" d="M50 22h60v56a6 6 0 0 1-6 6H56a6 6 0 0 1-6-6z"/><path class="s" d="M110 38h9M110 68h9"/><text x="123" y="41" class="klein">MAX</text><text x="123" y="71" class="klein">MIN</text><circle class="t" cx="68" cy="80" r="1.6"/><circle class="t" cx="84" cy="79" r="1.6"/><circle class="t" cx="96" cy="81" r="1.6"/>'), 'Unter MIN oder verschmutzt'],
  },
  batterie: {
    go: [svg('<path class="s" d="M34 86h92"/><rect class="f s" x="44" y="36" width="72" height="46" rx="5"/><rect class="s f" x="56" y="28" width="13" height="8" rx="2"/><rect class="s f" x="91" y="28" width="13" height="8" rx="2"/><text x="62" y="62" text-anchor="middle" class="klein">+</text><text x="98" y="62" text-anchor="middle" class="klein">–</text><path class="g" d="M38 86V46h84v40"/>'), 'Sicher befestigt und dicht'],
    nogo: [svg('<path class="s" d="M34 86h92"/><g class="kipp" style="transform-origin:80px 82px"><rect class="f s" x="44" y="36" width="72" height="46" rx="5"/><rect class="s f" x="56" y="28" width="13" height="8" rx="2"/><rect class="s f" x="91" y="28" width="13" height="8" rx="2"/><text x="62" y="62" text-anchor="middle" class="klein">+</text><text x="98" y="62" text-anchor="middle" class="klein">–</text></g><circle class="rotfl tropf" cx="124" cy="60" r="3"/>'), 'Lose oder läuft aus'],
  },
  dicht: {
    go: [svg(BODEN + '<path class="s" d="M52 20v-8h56v8"/><rect class="f s" x="40" y="20" width="80" height="38" rx="4"/><path class="f s" d="M50 58h60l-7 13H57z"/><path class="s" d="M40 40H26M120 40h14"/>'), 'Trocken – nichts tropft'],
    nogo: [svg(BODEN + '<path class="s" d="M52 20v-8h56v8"/><rect class="f s" x="40" y="20" width="80" height="38" rx="4"/><path class="f s" d="M50 58h60l-7 13H57z"/><path class="s" d="M40 40H26M120 40h14"/><circle class="rotfl tropf" cx="80" cy="64" r="3"/><ellipse class="rotfl" cx="80" cy="87" rx="18" ry="3" opacity=".6"/>'), 'Flüssigkeit tritt aus'],
  },
  lenkung: {
    go: [svg('<path class="dick" d="M10 50h30M120 50h30"/><path class="f s" d="M40 40l6-5 6 5 6-5 6 5 6-5 6 5v20l-6 5-6-5-6 5-6-5-6 5-6-5z"/><rect class="f s" x="76" y="36" width="44" height="28" rx="7"/>'), 'Manschette heil, Gestänge fest'],
    nogo: [svg('<path class="dick" d="M10 50h30M120 50h30"/><path class="f s" d="M40 40l6-5 6 5 6-5 6 5 6-5 6 5v20l-6 5-6-5-6 5-6-5-6 5-6-5z"/><rect class="f s" x="76" y="36" width="44" height="28" rx="7"/><path class="r" d="M52 32l9 36"/><circle class="rotfl tropf" cx="58" cy="68" r="3"/>'), 'Manschette gerissen oder undicht'],
  },
  radlager: {
    go: [svg(BODEN + '<rect class="f s" x="58" y="12" width="34" height="74" rx="11"/><path class="dick" d="M92 49h48"/><circle class="t" cx="92" cy="49" r="4"/>'), 'Kein Spiel, läuft ruhig'],
    nogo: [svg(BODEN + '<g class="kipp" style="transform-origin:92px 49px"><rect class="f s" x="58" y="12" width="34" height="74" rx="11"/></g><path class="dick" d="M92 49h48"/><circle class="t" cx="92" cy="49" r="4"/><path class="r" d="M30 22h16l-5-5M46 22l-5 5M30 78h16l-5-5M46 78l-5 5"/>'), 'Rad lässt sich kippen'],
  },
  antrieb: {
    go: [svg('<path class="dick" d="M10 50h42M112 50h38"/><path class="f s" d="M52 42l60-16v48L52 58z"/><path class="s" d="M67 38v24M82 34v32M97 30v40"/>'), 'Manschette dicht'],
    nogo: [svg('<path class="dick" d="M10 50h42M112 50h38"/><path class="f s" d="M52 42l60-16v48L52 58z"/><path class="s" d="M67 38v24M97 30v40"/><path class="r" d="M78 30l9 42"/><circle class="t" cx="70" cy="82" r="2.2"/><circle class="t" cx="86" cy="88" r="2.2"/><circle class="t" cx="98" cy="82" r="1.8"/>'), 'Manschette gerissen'],
  },
  fba: {
    go: [svg(BODEN + '<circle class="s" cx="24" cy="28" r="11"/><text x="24" y="31.5" text-anchor="middle" class="klein fett">P</text><rect class="gruenfl wachs" x="58" y="40" width="24" height="46" rx="4"/><rect class="gruenfl wachs" x="102" y="42" width="24" height="44" rx="4"/><text x="70" y="98" text-anchor="middle" class="klein">L</text><text x="114" y="98" text-anchor="middle" class="klein">R</text>'), 'Beide Seiten ziehen'],
    nogo: [svg(BODEN + '<circle class="s" cx="24" cy="28" r="11"/><text x="24" y="31.5" text-anchor="middle" class="klein fett">P</text><rect class="gruenfl wachs" x="58" y="40" width="24" height="46" rx="4"/><rect class="rotfl" x="102" y="80" width="24" height="6" rx="2"/><text x="70" y="98" text-anchor="middle" class="klein">L</text><text x="114" y="98" text-anchor="middle" class="klein">R</text>'), 'Eine Seite ohne Wirkung'],
  },
  geraeusch: {
    go: [svg('<path class="s f" d="M8 44h24v12H8zM96 44h22v12H96z"/><rect class="f s" x="32" y="34" width="64" height="32" rx="15"/><path class="s" d="M126 42a10 10 0 0 1 0 16"/>'), 'Leise, alles fest'],
    nogo: [svg('<path class="s f" d="M8 44h24v12H8zM96 44h22v12H96z"/><rect class="f s" x="32" y="34" width="64" height="32" rx="15"/><path class="r blink" d="M126 38a16 16 0 0 1 0 24M136 30a28 28 0 0 1 0 40"/><path class="r" d="M52 34V20M76 34l7-13"/>'), 'Zu laut oder Teile lose'],
  },
  // ---- dritte Lieferung: Bilder für die Lkw-Schritte ----
  manometer: {
    go: [svg('<circle class="f s" cx="80" cy="54" r="38"/><path class="r" d="M57.1 70.1A28 28 0 0 1 52.4 49.1"/><path class="s d" d="M53.7 44.4A28 28 0 1 1 102.9 70.1"/><g class="steig" style="transform-origin:80px 54px"><path class="dick2" d="M80 54L95.6 38.4"/></g><circle class="t" cx="80" cy="54" r="4.5"/><text x="80" y="80" text-anchor="middle" class="klein">bar</text><circle class="s" cx="138" cy="20" r="7"/>'), 'Druck baut sich auf, Warnanzeige geht aus'],
    nogo: [svg('<circle class="f s" cx="80" cy="54" r="38"/><path class="r" d="M57.1 70.1A28 28 0 0 1 52.4 49.1"/><path class="s d" d="M53.7 44.4A28 28 0 1 1 102.9 70.1"/><path class="dick2" d="M80 54L58.7 59.7"/><circle class="t" cx="80" cy="54" r="4.5"/><text x="80" y="80" text-anchor="middle" class="klein">bar</text><circle class="rotfl blink" cx="138" cy="20" r="7"/><circle class="s" cx="138" cy="20" r="7"/>'), 'Zeiger in der Gefahrenzone, Warnanzeige an'],
  },
  handventil: {
    go: [svg('<circle class="s" cx="26" cy="26" r="11"/><text x="26" y="29.5" text-anchor="middle" class="klein fett">P</text><rect class="f s" x="50" y="60" width="60" height="26" rx="6"/><path class="dick" d="M80 64L104 28"/><circle class="t" cx="106" cy="25" r="7"/><path class="g" d="M126 64l5 6 10-13"/>'), 'Rastet sicher ein, nichts bläst ab'],
    nogo: [svg('<circle class="s" cx="26" cy="26" r="11"/><text x="26" y="29.5" text-anchor="middle" class="klein fett">P</text><rect class="f s" x="50" y="60" width="60" height="26" rx="6"/><g class="durch" style="transform-origin:80px 64px"><path class="dick" d="M80 64L104 28"/><circle class="t" cx="106" cy="25" r="7"/></g><path class="r" d="M128 40c-4-14-16-22-30-22M98 18l8-6M98 18l7 7"/>'), 'Rastet nicht – Hebel springt zurück'],
  },
  plombe: {
    go: [svg('<rect class="f s" x="14" y="22" width="88" height="52" rx="4"/><path class="s" d="M24 37h52M24 48h66M24 59h40"/><path class="s" d="M102 42c12-8 22-2 24 8"/><circle class="f s" cx="128" cy="62" r="13"/><path class="g" d="M121 62l5 6 9-11"/>'), 'Einbauschild lesbar, Plombe unversehrt'],
    nogo: [svg('<rect class="f s" x="14" y="22" width="88" height="52" rx="4"/><path class="s d" d="M24 37h52M24 48h66M24 59h40"/><path class="s" d="M102 42c8-6 14-5 17-2"/><path class="f s" d="M117 54a13 13 0 0 0 4 20z"/><path class="f s" d="M131 50a13 13 0 0 1 6 22z"/><path class="r" d="M126 46l-4 10 7 4-5 14"/>'), 'Plombe fehlt oder ist beschädigt'],
  },
  keil: {
    go: [svg(BODEN + '<path class="s f" d="M12 78l17-30 17 30z"/><path class="s" d="M29 60v9"/><circle class="t" cx="29" cy="73.5" r="1.4"/><rect class="f s" x="54" y="56" width="30" height="22" rx="4"/><path class="g" d="M69 61v12M63 67h12"/><circle class="f s" cx="114" cy="64" r="22"/><circle class="s" cx="114" cy="64" r="8"/><path class="t" d="M130 86h22l-2-15z"/>'), 'Warndreieck, Verbandkasten und Unterlegkeile an Bord'],
    nogo: [svg(BODEN + '<path class="s f" d="M12 78l17-30 17 30z"/><path class="s" d="M29 60v9"/><circle class="t" cx="29" cy="73.5" r="1.4"/><rect class="f s" x="54" y="56" width="30" height="22" rx="4"/><path class="s" d="M69 61v12M63 67h12"/><circle class="f s" cx="114" cy="64" r="22"/><circle class="s" cx="114" cy="64" r="8"/><path class="s d" d="M130 86h22l-2-15z"/><text x="146" y="62" text-anchor="middle" class="rottext">?</text>'), 'Unterlegkeil fehlt oder ist nicht in Ordnung'],
  },
  kontur: {
    go: [svg('<rect class="f s" x="42" y="8" width="76" height="68" rx="3"/><rect class="gelbstrich" x="49" y="15" width="62" height="54"/><path class="s" d="M34 78h92"/><rect class="s" x="38" y="80" width="14" height="7" rx="2"/><rect class="s" x="108" y="80" width="14" height="7" rx="2"/><path class="dick" d="M60 84v6M100 84v6"/>'), 'Rückstrahler und Markierung vollständig'],
    nogo: [svg('<rect class="f s" x="42" y="8" width="76" height="68" rx="3"/><path class="gelbstrich" d="M49 69V15h34"/><path class="s d" d="M83 15h28v54H49"/><path class="r" d="M92 34l14 14M106 34L92 48"/><path class="s" d="M34 78h92"/><rect class="s" x="38" y="80" width="14" height="7" rx="2"/><rect class="s d" x="108" y="80" width="14" height="7" rx="2"/><path class="dick" d="M60 84v6M100 84v6"/>'), 'Fehlt oder ist beschädigt'],
  },
  fuehrerhaus: {
    go: [svg(BODEN + '<path class="s" d="M12 68h136"/><path class="f s" d="M14 68V36l8-16h26v48z"/><path class="s" d="M22 38l5-11h15v11z"/><rect class="f s" x="54" y="14" width="92" height="54" rx="2"/><circle class="s f" cx="34" cy="75" r="10"/><circle class="s f" cx="116" cy="75" r="10"/><path class="g" d="M90 36l6 7 12-15"/>'), 'Führerhaus und Aufbau sitzen fest'],
    nogo: [svg(BODEN + '<path class="s" d="M12 68h136"/><path class="f s" d="M14 68V36l8-16h26v48z"/><path class="s" d="M22 38l5-11h15v11z"/><g class="kipp" style="transform-origin:146px 68px"><rect class="f s" x="54" y="14" width="92" height="54" rx="2"/></g><path class="r" d="M58 71h36"/><circle class="s f" cx="34" cy="75" r="10"/><circle class="s f" cx="116" cy="75" r="10"/>'), 'Aufbau oder Führerhaus lose'],
  },
  unterfahr: {
    go: [svg(BODEN + '<path class="f s" d="M8 14h114v44H8"/><path class="s" d="M8 58h114"/><circle class="s f" cx="62" cy="71" r="15"/><path class="dick2" d="M116 58v14"/><rect class="t" x="108" y="70" width="16" height="10" rx="2"/><path class="g" d="M134 66l5 6 10-13"/>'), 'Vorhanden, fest und gerade'],
    nogo: [svg(BODEN + '<path class="f s" d="M8 14h114v44H8"/><path class="s" d="M8 58h114"/><circle class="s f" cx="62" cy="71" r="15"/><g class="kipp" style="transform-origin:116px 58px"><path class="dick2" d="M116 58l8 13"/><rect class="t" x="118" y="68" width="16" height="10" rx="2" transform="rotate(-24 126 73)"/></g><path class="r" d="M140 52l8-4M142 62h9"/>'), 'Lose, verbogen oder fehlt'],
  },
  reserverad: {
    go: [svg('<path class="s" d="M12 18h136"/><path class="s" d="M42 18v44h76V18"/><ellipse class="f s" cx="80" cy="50" rx="33" ry="10"/><ellipse class="s" cx="80" cy="50" rx="13" ry="4"/><path class="dick2" d="M80 18v30"/><path class="g" d="M130 72l5 6 10-13"/>'), 'Sitzt fest im Halter'],
    nogo: [svg('<path class="s" d="M12 18h136"/><path class="s" d="M42 18v44h44"/><path class="s d" d="M118 18v30"/><path class="r" d="M112 50l12 6M124 46l-8 14"/><g class="kipp" style="transform-origin:48px 58px"><ellipse class="f s" cx="80" cy="56" rx="33" ry="10" transform="rotate(12 48 58)"/><ellipse class="s" cx="80" cy="56" rx="13" ry="4" transform="rotate(12 48 58)"/></g>'), 'Halter gebrochen oder Rad lose'],
  },
  sattel: {
    go: [svg('<circle class="f s" cx="80" cy="48" r="38"/><path class="s" d="M66 83l9-27a8 8 0 1 1 10 0l9 27"/><circle class="t" cx="80" cy="50" r="4.5"/><path class="dick2" d="M68 66h24"/><path class="g" d="M128 26l5 6 10-13"/>'), 'Verriegelt und gesichert, kein Verschleiß'],
    nogo: [svg('<circle class="f s" cx="80" cy="48" r="38"/><path class="s" d="M66 83l9-27a8 8 0 1 1 10 0l9 27"/><circle class="t" cx="80" cy="50" r="4.5"/><g class="kipp" style="transform-origin:68px 66px"><path class="dick2" d="M68 66l18 16"/></g><path class="r" d="M52 26l8 6-4 6 8 5"/>'), 'Verriegelung schließt nicht oder Teil gerissen'],
  },
  kupplungskopf: {
    go: [svg('<rect class="f s" x="16" y="34" width="46" height="32" rx="9"/><circle class="s" cx="39" cy="50" r="9"/><path class="dick2" d="M62 50c7 0 7-12 14-12s7 24 14 24 7-24 14-24 7 12 14 12h10"/><rect class="f s" x="128" y="41" width="18" height="18" rx="4"/>'), 'Dicht, fest, Dichtung heil'],
    nogo: [svg('<rect class="f s" x="16" y="34" width="46" height="32" rx="9"/><circle class="s" cx="39" cy="50" r="9"/><path class="r" d="M33 44l12 12"/><path class="dick2" d="M62 50c7 0 7-12 14-12s7 24 14 24 7-24 14-24 7 12 14 12h10"/><rect class="f s" x="128" y="41" width="18" height="18" rx="4"/><circle class="grau rauch" cx="40" cy="28" r="6"/><circle class="grau rauch spaeter" cx="48" cy="24" r="5"/>'), 'Undicht – Luft entweicht'],
  },
  trockner: {
    go: [svg('<path class="dick2" d="M16 72h34M110 72h34"/><rect class="f s" x="50" y="58" width="60" height="28" rx="4"/><rect class="f s" x="58" y="12" width="44" height="46" rx="9"/><path class="s" d="M58 26h44"/>'), 'Trocken, dicht und fest'],
    nogo: [svg('<path class="dick2" d="M16 72h34M110 72h34"/><rect class="f s" x="50" y="58" width="60" height="28" rx="4"/><rect class="f s" x="58" y="12" width="44" height="46" rx="9"/><path class="s" d="M58 26h44"/><circle class="rotfl tropf" cx="113" cy="60" r="3"/><circle class="grau rauch" cx="106" cy="18" r="6"/><circle class="grau rauch spaeter" cx="112" cy="12" r="5"/>'), 'Öl oder Luft tritt aus'],
  },
  kessel: {
    go: [svg('<path class="s" d="M12 12h136"/><path class="s" d="M48 12v10M112 12v10"/><rect class="f s" x="22" y="22" width="116" height="38" rx="19"/><path class="s" d="M48 22v38M112 22v38"/><path class="dick2" d="M80 60v7"/><circle class="s f" cx="80" cy="72" r="4.5"/>'), 'Fest, ohne Rostschäden, Entwässerung funktioniert'],
    nogo: [svg('<path class="s" d="M12 12h136"/><path class="s" d="M48 12v10M112 12v10"/><rect class="f s" x="22" y="22" width="116" height="38" rx="19"/><path class="s" d="M48 22v38M112 22v38"/><path class="rotfl" opacity=".8" d="M60 44l8-5 9 3 8-2 5 6-4 7-9 3-8-2-8 1-5-6z"/><path class="dick2" d="M80 60v7"/><circle class="s f" cx="80" cy="72" r="4.5"/><circle class="t tropf" cx="80" cy="74" r="2.6"/>'), 'Stark korrodiert, undicht oder Entwässerung defekt'],
  },
  ventil: {
    go: [svg('<path class="s" d="M12 16h136"/><rect class="f s" x="60" y="16" width="38" height="28" rx="5"/><rect class="s" x="20" y="24" width="28" height="18" rx="2"/><path class="s" d="M25 31h18M25 36h11"/><path class="dick2" d="M98 32l26 6"/><path class="s" d="M124 38v38"/><circle class="t" cx="124" cy="38" r="3.2"/><circle class="t" cx="124" cy="76" r="3.2"/><path class="dick" d="M30 80h118"/>'), 'Gestänge fest, Schild lesbar'],
    nogo: [svg('<path class="s" d="M12 16h136"/><rect class="f s" x="60" y="16" width="38" height="28" rx="5"/><rect class="s d" x="20" y="24" width="28" height="18" rx="2"/><path class="dick2" d="M98 32l26 6"/><circle class="t" cx="124" cy="38" r="3.2"/><g class="kipp" style="transform-origin:124px 76px"><path class="s" d="M124 76l-14-24"/></g><circle class="t" cx="124" cy="76" r="3.2"/><path class="r" d="M130 46l8 5M132 56h9"/><path class="dick" d="M30 80h118"/>'), 'Gestänge lose oder verbogen, Schild fehlt'],
  },
  zylinder: {
    go: [svg('<rect class="f s" x="14" y="28" width="50" height="44" rx="15"/><path class="s" d="M39 28v44"/><g class="hub-kurz"><path class="dick2" d="M64 50h34"/><circle class="s f" cx="103" cy="50" r="6"/></g><path class="g" d="M70 34h10M70 30v8M80 30v8"/>'), 'Dicht und fest, kurzer Hub'],
    nogo: [svg('<rect class="f s" x="14" y="28" width="50" height="44" rx="15"/><path class="s" d="M39 28v44"/><g class="hub-lang"><path class="dick2" d="M64 50h34"/><circle class="s f" cx="103" cy="50" r="6"/></g><path class="r" d="M70 34h36M70 30v8M106 30v8"/>'), 'Hub zu groß – zu wenig Reserve'],
  },
  buchse: {
    go: [svg('<path class="dick" d="M16 50h70"/><circle class="f s" cx="110" cy="50" r="24"/><circle class="s" cx="110" cy="50" r="14"/><circle class="t" cx="110" cy="50" r="6"/>'), 'Lager fest, kein Spiel'],
    nogo: [svg('<path class="dick" d="M16 50h70"/><circle class="f s" cx="110" cy="50" r="24"/><circle class="s d" cx="110" cy="50" r="14"/><path class="r" d="M97 40l6 5M120 62l6 4M99 61l-5 4M122 38l5-4"/><circle class="t wackel" cx="113" cy="53" r="6"/>'), 'Ausgeschlagen oder gerissen'],
  },
  blattfeder: {
    go: [svg('<circle class="s f" cx="12" cy="30" r="6"/><circle class="s f" cx="148" cy="30" r="6"/><path class="dick2" d="M16 34Q80 64 144 34"/><path class="dick2" d="M30 46Q80 70 130 46"/><path class="dick2" d="M46 56Q80 74 114 56"/><rect class="f s" x="70" y="44" width="20" height="32" rx="3"/><circle class="s f" cx="80" cy="84" r="9"/>'), 'Alle Blätter heil, Befestigung fest'],
    nogo: [svg('<circle class="s f" cx="12" cy="30" r="6"/><circle class="s f" cx="148" cy="30" r="6"/><path class="dick2" d="M16 34Q80 64 144 34"/><path class="dick2" d="M30 46Q46 54 58 58"/><path class="dick2" d="M100 64Q118 60 130 52"/><path class="r" d="M104 50l-5 7 7 3-5 8"/><path class="dick2" d="M46 56Q80 74 114 56"/><rect class="f s" x="70" y="44" width="20" height="32" rx="3"/><circle class="s f" cx="80" cy="84" r="9"/>'), 'Federblatt gebrochen'],
  },
  luftfeder: {
    go: [svg('<path class="s" d="M34 12h92"/><rect class="f s" x="50" y="12" width="60" height="9" rx="2"/><path class="f s" d="M56 21c-13 5-13 20 0 25c-13 5-13 20 0 25h48c13-5 13-20 0-25c13-5 13-20 0-25z"/><rect class="f s" x="62" y="71" width="36" height="16" rx="3"/>'), 'Balg heil und dicht'],
    nogo: [svg('<path class="s" d="M34 12h92"/><rect class="f s" x="50" y="12" width="60" height="9" rx="2"/><path class="f s" d="M56 21c-13 5-13 20 0 25c-13 5-13 20 0 25h48c13-5 13-20 0-25c13-5 13-20 0-25z"/><rect class="f s" x="62" y="71" width="36" height="16" rx="3"/><path class="r" d="M100 28l6 7-5 6 6 8"/><circle class="grau rauch" cx="118" cy="38" r="6"/><circle class="grau rauch spaeter" cx="124" cy="46" r="5"/>'), 'Balg rissig – Luft entweicht'],
  },
  rahmen: {
    go: [svg('<rect class="f s" x="10" y="22" width="140" height="11" rx="2"/><rect class="f s" x="10" y="67" width="140" height="11" rx="2"/><path class="dick2" d="M34 35v30M70 35v30M106 35v30M138 35v30"/>'), 'Längs- und Querträger ohne Risse'],
    nogo: [svg('<rect class="f s" x="10" y="22" width="140" height="11" rx="2"/><rect class="f s" x="10" y="67" width="140" height="11" rx="2"/><path class="dick2" d="M34 35v30M70 35v30M106 35v30M138 35v30"/><path class="r" d="M86 16l5 7-6 4 6 6-4 5"/><path class="r" d="M98 12l8-5M100 20h9"/>'), 'Träger gerissen oder verformt'],
  },
  kardan: {
    go: [svg('<rect class="f s" x="8" y="42" width="52" height="16" rx="3"/><path class="s" d="M60 36h13v28H60z"/><circle class="t" cx="80" cy="50" r="5"/><path class="s" d="M87 36h13v28H87z"/><rect class="f s" x="100" y="42" width="52" height="16" rx="3"/>'), 'Gelenke und Lager ohne Spiel'],
    nogo: [svg('<rect class="f s" x="8" y="42" width="52" height="16" rx="3"/><path class="s" d="M60 36h13v28H60z"/><circle class="t" cx="80" cy="50" r="5"/><g class="kipp" style="transform-origin:80px 50px"><path class="s" d="M87 36h13v28H87z"/><rect class="f s" x="100" y="42" width="52" height="16" rx="3"/></g><path class="r" d="M74 24l6 8 6-8M74 76l6-8 6 8"/>'), 'Spiel im Gelenk'],
  },
  dauerbremse: {
    go: [svg(BODEN + '<path class="dick" d="M16 66L72 44"/><circle class="t" cx="76" cy="42" r="7"/><rect class="gruenfl wachs" x="100" y="68" width="11" height="18" rx="2"/><rect class="gruenfl wachs" x="116" y="54" width="11" height="32" rx="2"/><rect class="gruenfl wachs" x="132" y="40" width="11" height="46" rx="2"/>'), 'Wirkt und lässt sich abstufen'],
    nogo: [svg(BODEN + '<path class="dick" d="M16 66L72 44"/><circle class="t" cx="76" cy="42" r="7"/><rect class="s d" x="100" y="68" width="11" height="18" rx="2"/><rect class="s d" x="116" y="54" width="11" height="32" rx="2"/><rect class="s d" x="132" y="40" width="11" height="46" rx="2"/><path class="r" d="M108 22l18 18M126 22l-18 18"/>'), 'Keine Wirkung'],
  },
};
