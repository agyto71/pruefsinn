// Prüfsinn – Suche: ordnet getippte oder gesprochene Werkstattsprache dem amtlichen Mängelkatalog zu.
// Ablauf: Text normalisieren → Lage (vorne links …) herauslösen → Wörter auf Stamm kürzen
//         → Werkstattbegriffe in Katalogbegriffe übersetzen → Einträge gewichten.

import { punktTitel, passtZu } from './daten.js';

const UML = { ä: 'a', ö: 'o', ü: 'u', ß: 'ss' };
export function norm(s) {
  return String(s).toLowerCase().replace(/[äöüß]/g, (c) => UML[c]).replace(/[^a-z0-9]+/g, ' ').trim();
}
export function stamm(w) {
  if (w.length <= 4 || /^\d/.test(w)) return w;
  if (w.endsWith('ungen')) return w.slice(0, -2);
  for (const suf of ['ern', 'en', 'er', 'es', 'e', 'n', 's']) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length);
  }
  return w;
}
const tokens = (s) => norm(s).split(' ').filter(Boolean).map(stamm);

const STOPP = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'einem', 'einen', 'ist', 'sind', 'war', 'hat', 'haben',
  'und', 'oder', 'am', 'an', 'im', 'in', 'auf', 'mit', 'zu', 'zum', 'zur', 'von', 'vom', 'bei', 'fur', 'als', 'auch', 'noch', 'sehr', 'etwas',
  'leicht', 'stark', 'bisschen', 'total', 'komplett', 'ganz', 'schon', 'bitte', 'mangel', 'fahrzeug', 'auto', 'wagen',
  'nicht', 'aus', 'ab', 'um', 'leuchtet', 'brennt', 'zeigt', 'steht', 'durch', 'wird', 'sich', 'mehr', 'da', 'hier', 'beim', 'nach', 'vor', 'uber', 'unter', 'es', 'er', 'sie'].map(stamm));

// Allgemeine Überschriften des Katalogs – sie sagen nichts über das Bauteil und zählen deshalb kaum
const T_ALLGEMEIN = /^(zustand|zustand und funktion|schaltung|wirkung|wirksamkeit|ubereinstimmung mit den vorschriften|ausrichtung|allgemeiner zustand|einbau und konfiguration|leistung|turen|signaleinrichtungen und sonderausstattung)$/;
const B_ALLGEMEIN = /^(mechanischer zustand( und funktion)?|andere umweltrelevante positionen)$/;

// Lage-Angaben: werden aus der Suche herausgelöst und am Befund als "Ort" vermerkt
const LAGE = [
  [/\b(vorderachse|va)\b/, 'Vorderachse'], [/\b(hinterachse|ha)\b/, 'Hinterachse'],
  [/\bachse (\d|eins|zwei|drei|vier)\b/, (m) => 'Achse ' + ({ eins: 1, zwei: 2, drei: 3, vier: 4 }[m[1]] || m[1])],
  [/\b(\d)\.? achse\b/, (m) => 'Achse ' + m[1]],
  [/\b(vorne?|vorn)\b/, 'vorne'], [/\bhinten\b/, 'hinten'],
  [/\b(links|linke[rsn]?|li)\b/, 'links'], [/\b(rechts|rechte[rsn]?|re)\b/, 'rechts'],
  [/\b(beidseitig|beide seiten|beiden seiten|beidseits)\b/, 'beidseitig'],
  [/\b(innen|innere[rsn]?)\b/, 'innen'], [/\b(aussen|aussere[rsn]?)\b/, 'außen'],
  [/\b(oben|obere[rsn]?)\b/, 'oben'], [/\b(unten|untere[rsn]?)\b/, 'unten'], [/\bmittig\b/, 'mittig'],
];

// Redewendungen, die vor dem Zerlegen ersetzt werden
const PHRASEN = [
  [/\b(geschwindigkeitsbegrenzer|tempobegrenzer|begrenzer|abregelung) (falsch|zu hoch|zu niedrig)( eingestellt)?\b/g, 'geschwindigkeitsbegrenzer abregelgeschwindigkeit'],
  // Licht geht nicht: in der HU-Richtlinie „Lichtquelle schadhaft“ (vor der allgemeinen Regel)
  [/\b(\w*(?:licht|lichter|leuchte|leuchten|lampe|birne|scheinwerfer|blinker))((?:\s+\w+){0,2})\s+(?:geht|gehen|funktioniert|funktionieren|leuchtet|leuchten|brennt|brennen)\s+nicht\b/g, '$1$2 lichtquelle defekt'],
  [/\b(geht|gehen|funktioniert|funktionieren|leuchtet|leuchten|brennt|brennen) nicht\b/g, 'defekt'],
  // „Reifen abgefahren“ meint die Profiltiefe; „einseitig abgefahren“ ist ein eigener D-Mangel
  [/\b(?<!einseitig )abgefahren\b/g, 'profiltiefe gering'],
  [/\b(ohne|keine) funktion\b/g, 'defekt'], [/\bausser funktion\b/g, 'defekt'], [/\bkaputt\b/g, 'defekt'], [/\bausgefallen\b/g, 'defekt'],
  [/\bzu (hoch|tief|niedrig)( eingestellt)?\b/g, 'ausrichtung'], [/\bfalsch eingestellt\b/g, 'ausrichtung'], [/\bverstellt\b/g, 'ausrichtung'],
  [/\bzu wenig profil\b/g, 'profiltiefe'], [/\bkein profil\b/g, 'profiltiefe'], [/\bnicht vorhanden\b/g, 'fehlt'], [/\bnicht mehr da\b/g, 'fehlt'],
  [/\bzu (laut)\b/g, 'gerauschpegel'], [/\bzu viel spiel\b/g, 'spiel'], [/\bhat spiel\b/g, 'spiel'],
  [/\bzu (gross|lang|viel)\b/g, 'ubermassig'], [/\b(blast ab|verliert luft)\b/g, 'luftaustritt'], [/\bverliert ol\b/g, 'olverlust'],
];

// Werkstattsprache → Begriffe des Katalogs
const SYN_ROH = {
  handbremse: 'feststellbremse', handbremsseil: 'bremsseile feststellbremse', handbremshebel: 'feststellbremse betatigungshebel',
  fussbremse: 'betriebsbremse', bremslicht: 'bremsleuchten lichtquelle', bremslichter: 'bremsleuchten lichtquelle', rucklicht: 'schlussleuchten', rucklichter: 'schlussleuchten',
  schlusslicht: 'schlussleuchten', standlicht: 'begrenzungsleuchten', abblendlicht: 'frontscheinwerfer', fernlicht: 'frontscheinwerfer',
  hauptscheinwerfer: 'frontscheinwerfer', scheinwerfer: 'frontscheinwerfer', tagfahrlicht: 'tagfahrleuchten', blinker: 'fahrtrichtungsanzeiger',
  blinklicht: 'fahrtrichtungsanzeiger', warnblinker: 'warnblinkleuchten', warnblinkanlage: 'warnblinkleuchten', nebellampe: 'nebelscheinwerfer',
  nebelschlusslicht: 'nebelschlussleuchten', ruckfahrlicht: 'ruckfahrscheinwerfer', ruckfahrleuchte: 'ruckfahrscheinwerfer',
  kennzeichenlicht: 'kennzeichenbeleuchtung', kennzeichenleuchte: 'kennzeichenbeleuchtung', nummernschildbeleuchtung: 'kennzeichenbeleuchtung',
  reflektor: 'ruckstrahler', katzenauge: 'ruckstrahler', birne: 'lichtquelle', gluhbirne: 'lichtquelle', lampe: 'lichtquelle leuchte',
  leuchtmittel: 'lichtquelle', glas: 'abschlussscheibe streu', streuscheibe: 'abschlussscheibe streu', blind: 'abschlussscheibe schadhaft', matt: 'abschlussscheibe schadhaft',
  leuchtweitenregulierung: 'niveauregulierungsvorrichtung', lwr: 'niveauregulierungsvorrichtung', leuchtweitenregelung: 'niveauregulierungsvorrichtung',
  hupe: 'akustische warnvorrichtung', horn: 'akustische warnvorrichtung', tacho: 'geschwindigkeitsmesser', tachometer: 'geschwindigkeitsmesser',
  kilometerstand: 'kilometerzahler', stossdampfer: 'schwingungsdampfer', dampfer: 'schwingungsdampfer', federbein: 'schwingungsdampfer federn',
  querlenker: 'fuhrungslenker dreiecklenker aufhangungsarme', langslenker: 'fuhrungslenker aufhangungsarme', lenker: 'fuhrungslenker',
  traggelenk: 'aufhangungsgelenke', fuhrungsgelenk: 'aufhangungsgelenke', kugelgelenk: 'aufhangungsgelenke', koppelstange: 'stabilisatoren',
  pendelstutze: 'stabilisatoren', stabi: 'stabilisatoren', stabilisator: 'stabilisatoren', feder: 'federn', federbruch: 'federn gebrochen',
  spurstange: 'lenkgestange', spurstangenkopf: 'lenkgestange', spurstangenkopfe: 'lenkgestange', lenkmanschette: 'staubabdichtung lenkgestange',
  servo: 'servolenkung', servopumpe: 'servolenkung', lenkspiel: 'lenkungsspiel', achsmanschette: 'staubabdichtung kraftubertragung',
  manschette: 'staubabdichtung', staubmanschette: 'staubabdichtung', antriebswelle: 'kraftubertragung gelenkwelle', kardanwelle: 'kraftubertragung gelenkwelle',
  getriebe: 'kraftubertragung', felge: 'rader', felgen: 'rader', rad: 'rader', radmutter: 'rader radmuttern', radbolzen: 'rader', radschraube: 'rader radmuttern',
  profil: 'reifen profiltiefe', abgefahren: 'profiltiefe', glatze: 'profiltiefe', sommerreifen: 'reifen', winterreifen: 'reifen',
  auspuff: 'auspuffrohre schalldampfer', auspuffanlage: 'auspuffrohre schalldampfer', abgasanlage: 'auspuffrohre schalldampfer', endtopf: 'schalldampfer',
  mitteltopf: 'schalldampfer', topf: 'schalldampfer', kat: 'abgasnachbehandlungssystem', katalysator: 'abgasnachbehandlungssystem',
  dpf: 'abgasnachbehandlungssystem', partikelfilter: 'abgasnachbehandlungssystem', russfilter: 'abgasnachbehandlungssystem', agr: 'abgasnachbehandlungssystem',
  olverlust: 'flussigkeitsverlust', ol: 'flussigkeitsverlust', olt: 'flussigkeitsverlust', tropft: 'flussigkeitsverlust leckage tropfenbildung',
  leckt: 'leckage undicht', nass: 'leckage undicht', feucht: 'leckage undicht', schwitzt: 'leckage undicht', verolt: 'flussigkeitsverlust leckage',
  tank: 'kraftstofftank', kraftstoffleitung: 'kraftstoffleitungen kraftstofftank', benzinleitung: 'kraftstoffleitungen', spritleitung: 'kraftstoffleitungen',
  rost: 'korrodiert korrosion', rostig: 'korrodiert korrosion', verrostet: 'korrodiert korrosion', angerostet: 'korrodiert korrosion',
  durchgerostet: 'korrodiert korrosion', durchrostung: 'korrodiert korrosion', korrosion: 'korrodiert', gammel: 'korrodiert',
  schweller: 'fahrgestell karosserie allgemeiner', unterboden: 'fahrgestell boden allgemeiner', rahmen: 'fahrgestell', langstrager: 'fahrgestell langs rahmen', quertrager: 'fahrgestell quertrager rahmen',
  achstrager: 'achsen fahrgestell', hilfsrahmen: 'fahrgestell', stossstange: 'stossstangen', stossfanger: 'stossstangen',
  anhangerkupplung: 'mechanische verbindungs abschleppeinrichtungen', ahk: 'mechanische verbindungs abschleppeinrichtungen',
  kupplungskugel: 'mechanische verbindungs abschleppeinrichtungen', anhangerdose: 'elektrische verbindungen zugfahrzeug anhanger', steckdose: 'elektrische verbindungen zugfahrzeug anhanger',
  kabel: 'elektrische leitungen', kabelbaum: 'elektrische leitungen', gurt: 'sicherheitsgurte', gurte: 'sicherheitsgurte', anschnallgurt: 'sicherheitsgurte',
  airbagleuchte: 'airbag storungsanzeige', kontrollleuchte: 'warnvorrichtung storungsanzeige kontrollleuchten', warnleuchte: 'warnvorrichtung storungsanzeige',
  leuchte: 'leuchte warnvorrichtung storungsanzeige', kontrolllampe: 'warnvorrichtung storungsanzeige', fehlermeldung: 'storungsanzeige fehler fehlermeldung',
  rollt: 'retraktor', aufroller: 'retraktor', gurtaufroller: 'retraktor', gurtschloss: 'gurtschlosser gurtschloss',
  aufrollt: 'retraktor', aufrollautomatik: 'retraktor', gurtautomatik: 'retraktor', abs: 'antiblockiersystem blockierverhinderer', absleuchte: 'antiblockiersystem blockierverhinderer warnvorrichtung', esp: 'fahrdynamikregelung',
  motorkontrollleuchte: 'obd storungsanzeige', mkl: 'obd storungsanzeige', mil: 'storungsanzeige', bremssattel: 'radbremszylinder', bremszange: 'radbremszylinder',
  bremskolben: 'radbremszylinder', bkv: 'bremskraftverstarker', bremsbelag: 'bremsbelage', belag: 'bremsbelage', belage: 'bremsbelage', bremsklotze: 'bremsbelage bremsklotze',
  bremsscheibe: 'bremsscheiben', scheibe: 'bremsscheiben scheiben', trommel: 'bremstrommeln', bremsleitung: 'bremsleitungen', bremsschlauch: 'bremsschlauche',
  bremswirkung: 'wirkung wirksamkeit bremskraft', bremswerte: 'wirksamkeit', windschutzscheibe: 'scheiben sichtfeld', frontscheibe: 'scheiben sichtfeld',
  steinschlag: 'scheiben beschadigt sichtfeld', spiegel: 'ruckspiegel', aussenspiegel: 'ruckspiegel', innenspiegel: 'ruckspiegel', wischer: 'scheibenwischer',
  wischerblatt: 'scheibenwischer', wischerblatter: 'scheibenwischer', wischergummi: 'scheibenwischer', waschanlage: 'windschutzscheiben waschanlage',
  wischwasser: 'windschutzscheiben waschanlage', spritzduse: 'windschutzscheiben waschanlage', geblase: 'antibeschlagsystem', kennzeichen: 'kennzeichenschild',
  nummernschild: 'kennzeichenschild', fin: 'fahrzeugidentifizierungs', fahrgestellnummer: 'fahrzeugidentifizierungs', tur: 'turen', sitz: 'fahrersitz sitze',
  kotflugel: 'radabdeckungen', radhaus: 'radabdeckungen', radlauf: 'radabdeckungen', motorlager: 'motorbefestigungen', getriebelager: 'motorbefestigungen',
  verbandkasten: 'verbandskasten', laut: 'gerauschpegel gerauschdampfungssystem', gerausch: 'gerauschpegel gerauschdampfungssystem',
  abgas: 'emissionen abgase', abgaswerte: 'gasformige emissionen', trubung: 'abgastrubung', co: 'emissionen', batterie: 'batterie',
  poros: 'poros beschadigt', rissig: 'beschadigt poros eingerissen', sprode: 'beschadigt poros', riss: 'eingerissen rissig gebrochen beschadigt', risse: 'eingerissen rissig gebrochen beschadigt',
  gerissen: 'eingerissen rissig gebrochen beschadigt gerissen', beule: 'beschadigt', blase: 'beschadigt', ausbeulung: 'beschadigt', eingeschnitten: 'eingeschnitten beschadigt', gebrochen: 'gebrochen', bruch: 'gebrochen', ausgeschlagen: 'spiel abgenutzt verschleiss', verschlissen: 'abgenutzt verschleiss verschlissen schadhaft',
  abgenutzt: 'abgenutzt verschleiss verschlissen', runter: 'abgenutzt verschlissen', eingelaufen: 'abgenutzt riefen', riefig: 'riefen abgenutzt', riefen: 'riefen abgenutzt',
  lose: 'locker befestigung unsicher', wackelt: 'locker spiel', locker: 'locker befestigung unsicher', verbogen: 'verformt', krumm: 'verformt', verzogen: 'verformt',
  undicht: 'undicht leckage austritt', fest: 'schwergangig klemmt', festgegangen: 'schwergangig klemmt', schwergangig: 'schwergangig klemmt', hangt: 'klemmt schwergangig',
  defekt: 'defekt schadhaft funktion', schaden: 'beschadigt schadhaft', beschadigt: 'beschadigt schadhaft', eingerissen: 'eingerissen beschadigt', fehlt: 'fehlt fehlen',
  scheuert: 'scheuern angescheuert', scheuerstelle: 'scheuern angescheuert', aufgescheuert: 'scheuern angescheuert', schwach: 'unzureichend ungenugend wirksamkeit',
  ungleich: 'bremskraft achse', einseitig: 'einseitig bremskraft', zieht: 'abweichung geraden', schief: 'abweichung geraden', flattert: 'schwankung bremskraft', rubbelt: 'schwankung bremskraft',
  // ---- Lkw ----
  kessel: 'energievorratsbehalter druckluftbehalter', luftkessel: 'energievorratsbehalter druckluftbehalter', druckluftkessel: 'energievorratsbehalter druckluftbehalter',
  luftbehalter: 'energievorratsbehalter druckluftbehalter', druckbehalter: 'energievorratsbehalter druckluftbehalter', entwasserungsventil: 'entwasserungsvorrichtung',
  luftbalg: 'luftfederung', luftfederbalg: 'luftfederung', federbalg: 'luftfederung', balg: 'luftfederung', luftfeder: 'luftfederung',
  begrenzer: 'geschwindigkeitsbegrenzer', tempobegrenzer: 'geschwindigkeitsbegrenzer', abregelung: 'geschwindigkeitsbegrenzer abregelgeschwindigkeit',
  fahrtenschreiber: 'kontrollgerat', fahrtschreiber: 'kontrollgerat', tachograph: 'kontrollgerat', tachograf: 'kontrollgerat', plombe: 'verplombung', plomben: 'verplombung',
  hub: 'weg betatigungskolben', kolbenhub: 'weg betatigungskolben', bremszylinder: 'radbremszylinder', membranzylinder: 'radbremszylinder', federspeicher: 'radbremszylinder federspeicher',
  sattelkupplung: 'mechanische verbindungs abschleppeinrichtungen', sattelplatte: 'mechanische verbindungs abschleppeinrichtungen', maulkupplung: 'mechanische verbindungs abschleppeinrichtungen',
  anhangekupplung: 'mechanische verbindungs abschleppeinrichtungen', konigszapfen: 'mechanische verbindungs abschleppeinrichtungen', zugmaul: 'mechanische verbindungs abschleppeinrichtungen',
  zugose: 'mechanische verbindungs abschleppeinrichtungen', kupplungsbolzen: 'mechanische verbindungs abschleppeinrichtungen', verriegelung: 'sicherungsvorrichtung',
  retarder: 'dauerbremssystem dauerbremsanlage', intarder: 'dauerbremssystem dauerbremsanlage', motorbremse: 'dauerbremssystem dauerbremsanlage', dauerbremse: 'dauerbremssystem dauerbremsanlage', staudruckbremse: 'dauerbremssystem dauerbremsanlage',
  lufttrockner: 'lufttrockner vollstandiges bremssystem', trockner: 'lufttrockner vollstandiges bremssystem', luftpresser: 'kompressor',
  vierkreisschutzventil: 'mehrkreisschutzventil', alb: 'bremskraftregler', zischt: 'luftaustritt leckage luftverlust', luftverlust: 'luftverlust luftaustritt druckabfall leckage',
  druckverlust: 'druckabfall luftverlust', warnsummer: 'druckwarnanzeige', manometer: 'manometer druckwarnanzeige', ebs: 'elektronisches bremssystem',
  seitenschutz: 'unterfahrschutz seitlicher', spritzlappen: 'spritzschutzvorrichtung radabdeckungen', schmutzfanger: 'spritzschutzvorrichtung radabdeckungen',
  trittbrett: 'trittstufen einstieg', aufstieg: 'trittstufen einstieg', trittstufe: 'trittstufen einstieg', fahrerhaus: 'fuhrerhaus', kabine: 'fuhrerhaus',
  konturmarkierung: 'markierung ruckstrahler', reflexfolie: 'markierung ruckstrahler', warntafel: 'kennzeichnungstafeln', warntafeln: 'kennzeichnungstafeln',
  zwillingsreifen: 'reifen', zwillingsbereifung: 'reifen', blattfeder: 'federn federblatt', federpaket: 'federn federblatt', drehschemel: 'drehkranz',
  ladebordwand: 'zubehorteile ausrustungen hydraulische', ladekran: 'zubehorteile ausrustungen hydraulische', kipper: 'zubehorteile ausrustungen hydraulische',
  adblue: 'abgasnachbehandlungssystem', scr: 'abgasnachbehandlungssystem', unterlegkeil: 'unterlegkeil', keil: 'unterlegkeil', keile: 'unterlegkeil',
};
const SYN = new Map();
for (const [k, v] of Object.entries(SYN_ROH)) SYN.set(stamm(k), [...new Set(v.split(' ').map(stamm))]);

/** Zerlegt eine Eingabe in Suchbegriffe (mit Synonymen) und erkannte Lage-Angaben. */
export function zerlege(eingabe) {
  let s = ' ' + norm(eingabe) + ' ';
  const ort = [];
  for (const [re, name] of LAGE) {
    const m = s.match(re);
    if (m) {
      const n = typeof name === 'function' ? name(m) : name;
      if (!ort.includes(n)) ort.push(n);
      s = s.replace(new RegExp(re.source, 'g'), ' ');
    }
  }
  for (const [re, ers] of PHRASEN) s = s.replace(re, ' ' + ers + ' ');
  const begriffe = [];
  for (const w of s.split(' ').filter(Boolean)) {
    const st = stamm(w);
    if (STOPP.has(st) || (st.length < 2 && !/\d/.test(st))) continue;
    const varianten = new Set([st, ...(SYN.get(st) || [])]);
    begriffe.push({ wort: st, varianten: [...varianten] });
  }
  return { begriffe, ort: ort.join(' ') };
}

function guete(q, d) {
  if (q === d) return 1;
  const lq = q.length, ld = d.length;
  if (lq >= 4 && d.startsWith(q)) return 0.85;
  if (ld >= 4 && ld >= lq * 0.5 && q.startsWith(d)) return 0.7;
  if (lq >= 5 && d.includes(q)) return 0.6;                       // Suchwort steckt in einem Katalog-Kompositum
  if (ld >= 5 && ld >= lq * 0.5 && q.includes(d)) return 0.5;     // Katalogwort steckt im gesuchten Kompositum
  return 0;
}
function beste(varianten, liste) {
  let b = 0;
  for (let i = 0; i < varianten.length; i++) {
    const abzug = i === 0 ? 1 : 0.9; // Treffer über ein Synonym zählt etwas weniger
    for (const d of liste) {
      const g = guete(varianten[i], d) * abzug;
      if (g > b) { b = g; if (b === 1) return 1; }
    }
  }
  return b;
}

let index = null;
let indexKat = null;
export function baueIndex(kat) {
  indexKat = kat;
  index = kat.eintraege.map((e, pos) => {
    const p = kat.punktNach.get(e.nr);
    const g = kat.gruppeNach.get(p.gruppe);
    const tAllg = T_ALLGEMEIN.test(norm(p.titel)) && !!p.bereich;
    const bAllg = B_ALLGEMEIN.test(norm(p.bereich || ''));
    return {
      e, p, pos,
      t: tokens(p.titel + (p.euTitel ? ' ' + p.euTitel : '')), wt: tAllg ? 1 : 3,
      b: tokens(p.bereich || ''), wb: bAllg ? 0.3 : (tAllg ? 3 : 1.6),
      x: tokens(e.text + ' ' + (e.wenn || '')),
      g: tokens(g ? g.titel : ''),
    };
  });
  return index;
}

/** Sucht Katalogeinträge. Rückgabe: [{e, p, titel, score, treffer}] – beste zuerst. */
export function sucheMaengel(kat, eingabe, { max = 30, gruppe = null, stufe = null, fahrzeug = '' } = {}) {
  if (!index || indexKat !== kat) baueIndex(kat);
  const { begriffe, ort } = zerlege(eingabe);
  const out = [];
  let beiLkw = 0; // Treffer, die die Pkw-Sicht ausblendet und die Lkw-Sicht zeigen würde
  const nrSuche = /^\d+(\.\d+)*\.?$/.test(eingabe.trim()) ? eingabe.trim().replace(/\.$/, '') : null;
  for (const d of index) {
    if (gruppe != null && d.p.gruppe !== gruppe) continue;
    if (stufe && !d.e.s.includes(stufe)) continue;
    const sichtbar = passtZu(d.p, fahrzeug);
    const merke = () => { if (fahrzeug === 'pkw' && passtZu(d.p, 'lkw')) beiLkw++; };
    if (nrSuche) {
      if (d.e.nr === nrSuche || d.e.nr.startsWith(nrSuche + '.')) { if (sichtbar) out.push({ ...d, score: 10 - d.pos / 10000, treffer: 1 }); else merke(); }
      continue;
    }
    if (!begriffe.length) { if (sichtbar) out.push({ ...d, score: 0, treffer: 0 }); continue; }
    let score = 0, treffer = 0, imText = 0;
    for (const q of begriffe) {
      const st = beste(q.varianten, d.t) * d.wt;
      const sb = beste(q.varianten, d.b) * d.wb;
      const sx = beste(q.varianten, d.x) * 2;
      const s = Math.max(st, sb, sx);
      if (s >= 0.5) { treffer++; score += s; if (sx >= st && sx >= sb) imText++; }
      else score += beste(q.varianten, d.g) * 0.4; // Gruppe: kleiner Bonus, zählt nicht als Treffer
    }
    if (!treffer) continue;
    if (treffer / begriffe.length < 0.5) continue;
    if (!sichtbar) { merke(); continue; }
    // Feinheiten: Grundfall vor "wenn"-Variante, kurze Einträge vor langen
    score += treffer * 2 + (d.e.wenn ? 0 : 0.15) - Math.min(d.x.length, 40) / 400 - d.pos / 100000;
    out.push({ ...d, score, treffer, imText });
  }
  out.sort((a, b) => b.treffer - a.treffer || b.score - a.score || a.pos - b.pos);
  return { ergebnisse: out.slice(0, max).map((r) => ({ ...r, titel: punktTitel(r.p) })), anzahl: out.length, ort, begriffe, beiLkw };
}

/** Teilt ein Diktat in einzelne Mängel-Phrasen. */
export function teileDiktat(text) {
  return text
    .split(/\s*(?:[.;!?]|\bnachster mangel\b|\bnächster mangel\b|\bnächster punkt\b|\bneuer mangel\b|\baußerdem\b|\bausserdem\b|\bweiterhin\b|\bdes weiteren\b|\bund dann\b|\bdann noch\b|\bkomma\b)\s*/i)
    .map((s) => s.trim()).filter((s) => s.length > 2);
}

/** Hebt Suchbegriffe in einem Text hervor (liefert HTML, Eingabe wird maskiert). */
export function markiere(text, begriffe) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  if (!begriffe || !begriffe.length) return esc(text);
  const alle = begriffe.flatMap((b) => b.varianten);
  return text.split(/(\s+|[,;:()/–-])/).map((teil) => {
    const t = stamm(norm(teil));
    if (t.length >= 3 && alle.some((q) => guete(q, t) >= 0.5)) return '<mark>' + esc(teil) + '</mark>';
    return esc(teil);
  }).join('');
}

/** Volltextsuche in Gesetzen: alle Wörter müssen vorkommen. */
export function sucheNormen(g, eingabe, max = 40) {
  const worte = eingabe.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!worte.length) return [];
  const out = [];
  const para = eingabe.trim().match(/^§?\s*(\d+[a-z]?)$/i);
  for (const n of g.normen) {
    let score = 0;
    if (para && n.bez.toLowerCase() === '§ ' + para[1].toLowerCase()) score += 1000;
    const kopf = (n.bez + ' ' + n.titel).toLowerCase();
    let alle = true;
    for (const w of worte) {
      const i = n.such.indexOf(w);
      if (i < 0) { alle = false; break; }
      score += kopf.includes(w) ? 20 : 1;
      let c = 0, pos = i;
      while (pos >= 0 && c < 20) { c++; pos = n.such.indexOf(w, pos + w.length); }
      score += Math.min(c, 20) * 0.4;
    }
    if (!alle && score < 1000) continue;
    // Textausschnitt um den ersten Treffer im Fließtext
    let aus = '';
    const tl = n.text.toLowerCase();
    const i = tl.indexOf(worte[0]);
    if (i >= 0) {
      const a = Math.max(0, i - 70), b = Math.min(n.text.length, i + 150);
      aus = (a > 0 ? '… ' : '') + n.text.slice(a, b).replace(/\s+/g, ' ').trim() + (b < n.text.length ? ' …' : '');
    }
    out.push({ n, score, aus });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, max);
}
export function markiereWorte(text, eingabe) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const worte = eingabe.toLowerCase().split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!worte.length) return esc(text);
  const re = new RegExp('(' + worte.join('|') + ')', 'gi');
  return text.split(re).map((t, i) => (i % 2 ? '<mark>' + esc(t) + '</mark>' : esc(t))).join('');
}
