// Prüfsinn – Daten: Nachladen der Wissensdatenbank + fest hinterlegte Nachschlagewerte
// Jede Zahl hier trägt ihre Quelle. Nichts ohne Quelle eintragen (siehe CLAUDE.md).

const cache = {};
function lade(name) {
  if (!cache[name]) {
    cache[name] = fetch(`daten/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`daten/${name}.json: ${r.status}`);
      return r.json();
    }).catch((e) => { delete cache[name]; throw e; });
  }
  return cache[name];
}

/**
 * Welcher Mängelkatalog gilt: 'de' = HU-Richtlinie, Anlage 2 (Standard; deutsche Einstufung mit VU und D-Mängeln),
 * 'eu' = EU-Mindestkatalog (RL 2014/45/EU Anhang I). Einstellbar unter Mehr → Einstellungen.
 */
export function katalogArt() {
  try { return JSON.parse(localStorage.getItem('pk.einstellungen') || '{}').katalog === 'eu' ? 'eu' : 'de'; } catch { return 'de'; }
}
const katalogFertig = {};
/** Mängelkatalog mit Nachschlage-Indizes. kat.art sagt, welcher es tatsächlich ist ('de' oder Rückfall 'eu'). */
export function katalog() {
  const art = katalogArt();
  if (!katalogFertig[art]) {
    katalogFertig[art] = (async () => {
      const eu = await lade('maengelkatalog');
      let k = { ...eu, art: 'eu' };
      if (art === 'de') {
        try {
          const de = await lade('hu-richtlinie');
          // Titel des EU-Katalogs als zusätzliche Suchwörter: Die Richtlinie sagt z. B. „Blockierverhinderer (ABV)“, der EU-Katalog „Antiblockiersystem (ABS)“
          const euP = new Map(eu.punkte.map((p) => [p.nr, p]));
          const punkte = de.punkte.map((p) => (euP.get(p.nr) && euP.get(p.nr).titel !== p.titel ? { ...p, euTitel: euP.get(p.nr).titel } : p));
          k = { quelle: de.quelle, fussnoten: de.fussnoten, anmerkungen: eu.anmerkungen, gruppen: eu.gruppen, punkte, eintraege: de.eintraege, art: 'de' };
        } catch { /* ohne Netz und ohne gespeicherte Daten: EU-Katalog */ }
      }
      k.punktNach = new Map(k.punkte.map((p) => [p.nr, p]));
      k.gruppeNach = new Map(k.gruppen.map((g) => [g.nr, g]));
      k.eintragNach = new Map(k.eintraege.map((e) => [e.id, e]));
      return k;
    })().catch((e) => { delete katalogFertig[art]; throw e; });
  }
  return katalogFertig[art];
}

/** Mangelnummer zum Anzeigen: „4.7.1 a)“, „D 5.2.2 b)“, „D 101“ */
export function nummerVon(x) {
  if (!x || !x.nr) return '';
  return `${x.d ? 'D ' : ''}${x.nr}${x.b ? ' ' + x.b + ')' : ''}`;
}
/** Hinweis zur Herkunft von Nummer und Einstufung – je nachdem, aus welchem Katalog ein Eintrag stammt. */
export function einstufungsQuelle(ausDe) {
  return ausDe
    ? 'Nummern und Einstufung nach HU-Richtlinie, Anlage 2 (VkBl. 2019 S. 871, Stand 04/2024).'
    : 'Nummern und Einstufung nach RL 2014/45/EU Anhang I (Mindestkatalog); maßgeblich ist die HU-Richtlinie.';
}

export const GESETZE = {
  stvzo: { kurz: 'StVZO', name: 'Straßenverkehrs-Zulassungs-Ordnung' },
  fzv: { kurz: 'FZV', name: 'Fahrzeug-Zulassungsverordnung' },
};
export async function gesetz(key) {
  const g = await lade(key);
  if (!g._bereit) {
    for (const n of g.normen) {
      n.text = n.html.replace(/<(br|\/p|\/tr|\/dd|\/li|\/h4)>/g, '\n').replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ');
      n.such = (n.bez + ' ' + n.titel + ' ' + n.text).toLowerCase();
    }
    g.normNach = new Map(g.normen.map((n) => [n.id, n]));
    g._bereit = true;
  }
  return g;
}

/** Voller Titel eines Prüfpunkts: allgemeine Titel ("Zustand und Funktion") bekommen den Bereich davor. */
const ALLGEMEIN = /^(Zustand|Zustand und Funktion|Schaltung|Wirkung|Wirksamkeit|Übereinstimmung mit den Vorschriften|Ausrichtung|Allgemeiner Zustand|Einbau und Konfiguration|Leistung|Türen|Signaleinrichtungen und Sonderausstattung)$/;
export function punktTitel(p) {
  if (!p) return '';
  return p.bereich && ALLGEMEIN.test(p.titel) ? `${p.bereich} · ${p.titel}` : p.titel;
}

// ---------- Einstufung ----------
// G/E/V stammen aus dem EU-Katalog (gering/erheblich/gefährlich); U und H ergänzt nach Anlage VIII Nr. 3.1.4 StVZO.
export const STUFE = {
  O: { code: 'OM', name: 'Ohne festgestellte Mängel', kurz: 'ohne Mängel', rang: 0 },
  H: { code: 'Hinw.', name: 'Hinweis', kurz: 'Hinweis', rang: 0 },
  G: { code: 'GM', name: 'Geringe Mängel', kurz: 'gering', rang: 1 },
  E: { code: 'EM', name: 'Erhebliche Mängel', kurz: 'erheblich', rang: 2 },
  V: { code: 'VM', name: 'Gefährliche Mängel', kurz: 'gefährlich', rang: 3 },
  U: { code: 'VU', name: 'Verkehrsunsicher', kurz: 'verkehrsunsicher', rang: 4 },
};
export const STUFEN_WAHL = ['H', 'G', 'E', 'V', 'U'];

/** Folgen je Ergebnis – sinngemäß nach Anlage VIII Nr. 3.1.4.1 bis 3.1.4.5 StVZO */
export const FOLGEN = {
  O: { plakette: true, text: 'Prüfplakette wird zugeteilt.', nr: '3.1.4.1' },
  G: { plakette: true, text: 'Plakette kann zugeteilt werden. Mängel unverzüglich, spätestens innerhalb eines Monats beheben lassen.', nr: '3.1.4.2' },
  E: { plakette: false, text: 'Keine Plakette. Mängel unverzüglich beheben; Nachprüfung spätestens einen Monat nach dem Tag der HU.', nr: '3.1.4.3' },
  V: { plakette: false, text: 'Keine Plakette. Halter auf die Gefährdung hinweisen; Nachprüfung spätestens einen Monat nach dem Tag der HU.', nr: '3.1.4.4' },
  U: { plakette: false, text: 'Vorhandene Plakette entfernen, Zulassungsbehörde unverzüglich benachrichtigen. Fahrzeug darf nicht mehr auf öffentlichen Straßen betrieben werden.', nr: '3.1.4.5' },
};

// ---------- HU-Fristen: Anlage VIII Nr. 2.1 / 2.2 StVZO (am Gesetzestext geprüft) ----------
export const FRISTEN = [
  { id: 'pkw', label: 'Pkw', nr: '2.1.2.1', erst: 36, folge: 24 },
  { id: 'pkw-pbefg', label: 'Pkw zur Personenbeförderung (Taxi, Mietwagen mit Fahrer)', nr: '2.1.2.2', erst: 12, folge: 12 },
  { id: 'kranken', label: 'Krankenkraftwagen, Behinderten-Transportfahrzeug', nr: '2.1.2.3', erst: 12, folge: 12 },
  { id: 'miet', label: 'Selbstfahrer-Mietfahrzeug (Mietdauer unter 1 Jahr)', nr: '2.2', erst: 12, folge: 12 },
  { id: 'krad', label: 'Kraftrad', nr: '2.1.1', erst: 24, folge: 24 },
  { id: 'kom', label: 'Kraftomnibus (mehr als 8 Fahrgastplätze)', nr: '2.1.3', erst: 12, folge: 12, sp: 'SP: 12–36 Monate nach EZ alle 6 Monate, danach alle 3 Monate (3/6/9)' },
  { id: 'lkw-35', label: 'Lkw, Zugmaschine, SAM bis 3,5 t oder bis 40 km/h', nr: '2.1.4.1', erst: 24, folge: 24 },
  { id: 'lkw-75', label: 'Lkw, Zugmaschine, SAM über 3,5 t bis 7,5 t', nr: '2.1.4.2', erst: 12, folge: 12 },
  { id: 'lkw-12', label: 'Lkw, Zugmaschine, SAM über 7,5 t bis 12 t', nr: '2.1.4.3', erst: 12, folge: 12, sp: 'SP alle 6 Monate – erst nach den ersten 36 Monaten' },
  { id: 'lkw-12p', label: 'Lkw, Zugmaschine, SAM über 12 t', nr: '2.1.4.4', erst: 12, folge: 12, sp: 'SP alle 6 Monate – erst nach den ersten 24 Monaten' },
  { id: 'anh-075', label: 'Anhänger bis 0,75 t oder ohne eigene Bremse', nr: '2.1.5.1', erst: 36, folge: 24 },
  { id: 'anh-35', label: 'Anhänger über 0,75 t bis 3,5 t', nr: '2.1.5.2', erst: 24, folge: 24 },
  { id: 'anh-10', label: 'Anhänger über 3,5 t bis 10 t', nr: '2.1.5.3', erst: 12, folge: 12 },
  { id: 'anh-10p', label: 'Anhänger über 10 t', nr: '2.1.5.4', erst: 12, folge: 12, sp: 'SP alle 6 Monate – erst nach den ersten 24 Monaten' },
  { id: 'womo-35', label: 'Wohnmobil bis 3,5 t', nr: '2.1.6.1', erst: 36, folge: 24 },
  { id: 'womo-75', label: 'Wohnmobil über 3,5 t bis 7,5 t', nr: '2.1.6.2', erst: 24, folge: 12, bis72: true, hinweis: 'In den ersten 72 Monaten ab Erstzulassung alle 24 Monate, danach alle 12 Monate' },
  { id: 'womo-75p', label: 'Wohnmobil über 7,5 t', nr: '2.1.6.3', erst: 12, folge: 12 },
];

// ---------- Pkw oder Lkw: welche Prüfpunkte nur schwere Fahrzeuge betreffen ----------
// Der Katalog trennt nicht nach Fahrzeugart (nur Abschnitt 9 nennt die Klassen M2/M3). Diese Zuordnung ist eine
// Einteilung von Prüfsinn nach Bauart – Druckluftbremse, Dauerbremse, Fahrtenschreiber, Begrenzer, Drehkranz –
// und dient allein dazu, die Suche übersichtlich zu halten. Im Zweifel bleibt ein Prüfpunkt für beide sichtbar.
export const NUR_LKW = new Set(['1.1.4', '1.1.5', '1.1.7', '1.1.8', '1.1.9', '1.1.18', '1.1.19', '1.1.20', '1.1.22', '1.5', '2.5', '7.9', '7.10']);
/** Gehört ein Prüfpunkt zur gewählten Sicht? fahrzeug: 'pkw', 'lkw' oder leer (ganzer Katalog). */
export function passtZu(p, fahrzeug) {
  if (!fahrzeug) return true;
  if (p.gruppe === '9' && !/^109\./.test(p.nr)) return false; // Abschnitt 9: nur Kraftomnibusse (109.x: Taxi, Mietwagen, Krankenwagen)
  return fahrzeug === 'lkw' || !NUR_LKW.has(p.nr);
}
/** Sicht der Suche zu einer Fahrzeugart (Schlüssel aus FRISTEN): leichte Fahrzeuge 'pkw', Lkw über 3,5 t 'lkw',
 *  alles andere (Bus, Anhänger, Kraftrad, schwere Wohnmobile) der ganze Katalog. */
export function sichtFuer(fahrzeugart) {
  if (/^lkw-(75|12|12p)$/.test(fahrzeugart || '')) return 'lkw';
  if (/^(pkw|pkw-pbefg|kranken|miet|lkw-35|womo-35)$/.test(fahrzeugart || 'pkw')) return 'pkw';
  return '';
}
export const SICHTEN = [['pkw', 'Pkw'], ['lkw', 'Lkw']];

/** Nächste HU: Monat/Jahr der HU + Frist. ezM/ezY nur für Wohnmobile 3,5–7,5 t nötig. */
export function naechsteHU(art, huM, huY, erste, ezM, ezY) {
  const f = FRISTEN.find((x) => x.id === art) || FRISTEN[0];
  let monate = erste ? f.erst : f.folge;
  if (f.bis72) {
    const alter = ezY ? (huY * 12 + huM) - (ezY * 12 + ezM) : (erste ? 0 : 999);
    monate = alter < 72 ? 24 : 12;
  }
  const t = huY * 12 + (huM - 1) + monate;
  return { m: (t % 12) + 1, y: Math.floor(t / 12), monate, frist: f };
}

// ---------- Prüfplakette: Anlage IX StVZO ----------
// "2008 blau, 2009 gelb, 2010 braun, 2011 rosa, 2012 grün, 2013 orange" – danach in dieser Reihenfolge.
const PLAKETTE = [
  { name: 'blau', ral: 'RAL 5015', hex: '#2271b3', ink: '#fff' },
  { name: 'gelb', ral: 'RAL 1012', hex: '#e2c12b', ink: '#111' },
  { name: 'braun', ral: 'RAL 8004', hex: '#8e402a', ink: '#fff' },
  { name: 'rosa', ral: 'RAL 3015', hex: '#eaa0aa', ink: '#111' },
  { name: 'grün', ral: 'RAL 6018', hex: '#57a639', ink: '#111' },
  { name: 'orange', ral: 'RAL 2000', hex: '#ed760e', ink: '#111' },
];
export function plakette(jahr) { return PLAKETTE[(((jahr - 2008) % 6) + 6) % 6]; }

// ---------- Bremsen: RL 2014/45/EU Anh. I Nr. 1.2.2, 1.3.2, 1.4.2, 1.2.1 ----------
export const BREMSE = {
  klassen: [
    { id: 'M1', label: 'M1 – Pkw', ab2012: 58, vor2012: 50, fnVor: '48 % für Fahrzeuge ohne ABS oder mit Typgenehmigung vor dem 1.10.1991.' },
    { id: 'M23', label: 'M2/M3 – Bus', ab2012: 50, vor2012: 50, fnVor: '48 % für Fahrzeuge ohne ABS oder mit Typgenehmigung vor dem 1.10.1991.' },
    { id: 'N1', label: 'N1 – Lkw bis 3,5 t', ab2012: 50, vor2012: 45 },
    { id: 'N23', label: 'N2/N3 – Lkw über 3,5 t', ab2012: 50, vor2012: 43, fnVor: '45 % für Fahrzeuge, die nach 1988 oder ab dem in den Vorschriften vorgesehenen Anwendungsdatum zugelassen wurden (späterer Zeitpunkt).' },
    { id: 'OS', label: 'O2–O4 – Sattelanhänger', ab2012: 45, vor2012: 40, fnAb: '43 % für Sattelanhänger mit Typgenehmigung vor dem 1.1.2012.', fnVor: '43 % für Anhänger, die nach 1988 oder ab dem in den Vorschriften vorgesehenen Anwendungsdatum zugelassen wurden (späterer Zeitpunkt).' },
    { id: 'OD', label: 'O2–O4 – Deichselanhänger', ab2012: 50, vor2012: 40, fnVor: '43 % für Anhänger, die nach 1988 oder ab dem in den Vorschriften vorgesehenen Anwendungsdatum zugelassen wurden (späterer Zeitpunkt).' },
    { id: 'L3', label: 'L3e – Kraftrad', ab2012: 50, vor2012: 50, l: true },
    { id: 'L1', label: 'L1e – Kleinkraftrad', ab2012: 42, vor2012: 42, l: true },
    { id: 'L4', label: 'L4e – Kraftrad mit Beiwagen', ab2012: 46, vor2012: 46, l: true },
    { id: 'L57', label: 'L5e/L7e – drei-/vierrädrig', ab2012: 44, vor2012: 44, l: true },
    { id: 'L26', label: 'L2e/L6e – leicht, drei-/vierrädrig', ab2012: 40, vor2012: 40, l: true },
  ],
  feststell: 16,          // % der zulässigen Höchstmasse (Nr. 1.4.2)
  ungleich: 30,           // EU: Rad < 70 % des anderen Rades derselben Achse (Nr. 1.2.1 b)
  ungleichGelenkt: 50,    // gelenkte Achse < 50 % → gefährlich
  quelle: 'RL 2014/45/EU Anhang I Nr. 1.2.1, 1.2.2, 1.4.2',
  // Deutschland: HU-Bremsenrichtlinie Nr. 6.3.3 – in den oberen 2/3 des Prüfbereichs höchstens 25 % Unterschied an einer Achse,
  // bezogen auf den höheren Wert; die HU-Richtlinie (Anlage 2, 1.2.1 b) nennt denselben Grenzwert.
  ungleichDe: 25,
  quelleDe: 'HU-Bremsenrichtlinie vom 24.05.2012 (VkBl. 2012 S. 432) Nr. 6.3.3, geändert VkBl. 2014 S. 655; HU-Richtlinie Anlage 2 Nr. 1.2.1 b',
};
/** Grenze der Ungleichmäßigkeit nach eingestelltem Katalog: { grenze, quelle } */
export function bremsUngleich() {
  return katalogArt() === 'de' ? { grenze: BREMSE.ungleichDe, quelle: BREMSE.quelleDe } : { grenze: BREMSE.ungleich, quelle: BREMSE.quelle };
}

// ---------- Reifen: Tragfähigkeits- und Geschwindigkeitskennzahlen (genormte Reihe, UN-R 30/54) ----------
const LI_BASIS = [190, 195, 200, 206, 212, 218, 224, 230, 236, 243, 250, 257, 265, 272, 280, 290, 300, 307, 315, 325,
  335, 345, 355, 365, 375, 387, 400, 412, 425, 437, 450, 462, 475, 487, 500, 515, 530, 545, 560, 580,
  600, 615, 630, 650, 670, 690, 710, 730, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000, 1030,
  1060, 1090, 1120, 1150, 1180, 1215, 1250, 1285, 1320, 1360, 1400, 1450, 1500, 1550, 1600, 1650, 1700, 1750, 1800, 1850]; // LI 50 … 129
export function tragfaehigkeit(li) {
  li = Math.round(li);
  if (li >= 50 && li <= 129) return LI_BASIS[li - 50];
  if (li >= 130 && li <= 169) return LI_BASIS[li - 130] * 10; // Reihe wiederholt sich je 80 LI mit Faktor 10
  return null;
}
export const SI = [['J', 100], ['K', 110], ['L', 120], ['M', 130], ['N', 140], ['P', 150], ['Q', 160], ['R', 170], ['S', 180],
  ['T', 190], ['U', 200], ['H', 210], ['V', 240], ['W', 270], ['Y', 300]];

// ---------- Fahrzeug-Identnummer: Weltherstellerkennung (ISO 3780), Auswahl gängiger Marken ----------
export const WMI = {
  WVW: 'Volkswagen', WV1: 'Volkswagen Nutzfahrzeuge', WV2: 'Volkswagen Nutzfahrzeuge', WVG: 'Volkswagen (SUV)', WAU: 'Audi', WUA: 'Audi Sport', TRU: 'Audi (Ungarn)',
  WBA: 'BMW', WBS: 'BMW M', WBY: 'BMW i', WMW: 'MINI', WDB: 'Mercedes-Benz', WDD: 'Mercedes-Benz', WDC: 'Mercedes-Benz (SUV)', W1K: 'Mercedes-Benz', W1N: 'Mercedes-Benz (SUV)', W1V: 'Mercedes-Benz Vans', WDF: 'Mercedes-Benz Vans', WME: 'smart',
  W0L: 'Opel', W0V: 'Opel', WP0: 'Porsche', WP1: 'Porsche (SUV)', WF0: 'Ford (Deutschland)', TMB: 'Škoda', VSS: 'SEAT', VF1: 'Renault', VF3: 'Peugeot', VF7: 'Citroën', VR1: 'DS', VR3: 'Peugeot', VR7: 'Citroën',
  UU1: 'Dacia', ZFA: 'Fiat', ZAR: 'Alfa Romeo', ZLA: 'Lancia', ZFF: 'Ferrari', YV1: 'Volvo', YS3: 'Saab', SAL: 'Land Rover', SAJ: 'Jaguar', SB1: 'Toyota (UK)', VNK: 'Toyota (Frankreich)', NMT: 'Toyota (Türkei)',
  JTD: 'Toyota', JTN: 'Toyota', JTM: 'Toyota', JMZ: 'Mazda', JN1: 'Nissan', SJN: 'Nissan (UK)', VSK: 'Nissan (Spanien)', JHM: 'Honda', SHH: 'Honda (UK)', JF1: 'Subaru', JSA: 'Suzuki', TSM: 'Suzuki (Ungarn)', JMB: 'Mitsubishi',
  KMH: 'Hyundai', TMA: 'Hyundai (Tschechien)', NLH: 'Hyundai (Türkei)', KNA: 'Kia', KNE: 'Kia', U5Y: 'Kia (Slowakei)', '5YJ': 'Tesla', '7SA': 'Tesla', LRW: 'Tesla (China)', XP7: 'Tesla (Deutschland)',
  WMA: 'MAN', XLR: 'DAF', YS2: 'Scania', YV2: 'Volvo Trucks', VF6: 'Renault Trucks', ZCF: 'Iveco', WKK: 'Kässbohrer/Setra', WSM: 'Schmitz Cargobull', W09: 'Kleinserienhersteller (Deutschland)',
};
export const WMI_REGION = [
  [/^[A-H]/, 'Afrika'], [/^[J-R]/, 'Asien'], [/^[S-Z]/, 'Europa'], [/^[1-5]/, 'Nordamerika'], [/^[67]/, 'Ozeanien'], [/^[89]/, 'Südamerika'],
];
export const WMI_LAND = [
  [/^W/, 'Deutschland'], [/^V[F-R]/, 'Frankreich'], [/^V[S-W]/, 'Spanien'], [/^Z[A-R]/, 'Italien'], [/^S[A-M]/, 'Vereinigtes Königreich'], [/^S[N-T]/, 'Deutschland'],
  [/^T[J-P]/, 'Tschechien'], [/^T[R-V]/, 'Ungarn'], [/^U[5-7]/, 'Slowakei'], [/^U[U-Z]/, 'Rumänien'], [/^Y[S-W]/, 'Schweden'], [/^X[L-R]/, 'Niederlande'], [/^Y[6-9A-E]/, 'Belgien'],
  [/^J/, 'Japan'], [/^K[L-R]/, 'Südkorea'], [/^L/, 'China'], [/^N[L-R]/, 'Türkei'], [/^[145]/, 'USA'], [/^2/, 'Kanada'], [/^3/, 'Mexiko'],
];
// Modelljahr-Kennung an Stelle 10 (ISO 3779, 30-Jahres-Zyklus; bei europäischen Herstellern nicht immer belegt)
const MJ = 'ABCDEFGHJKLMNPRSTVWXY123456789';
export function modelljahre(ch) {
  const i = MJ.indexOf(ch);
  if (i < 0) return [];
  const jetzt = new Date().getFullYear() + 1;
  return [1980 + i, 2010 + i, 2040 + i].filter((j) => j <= jetzt);
}

export const AUFTRAGSARTEN = ['HU mit AU', 'HU', 'Nachprüfung', 'Änderungsabnahme § 19 (3)', 'Einzelabnahme § 21', 'Umbau (Werkstatt)', 'HU-Vorab-Check (Werkstatt)', 'Oldtimer § 23', 'SP', 'Gasprüfung', 'Sonstiges'];
