// Prüfsinn – Fahrzeugdaten zum Nachschlagen (erst bei Bedarf geladen, danach offline im Speicher des Service Workers).
// HSN/TSN (Feld 2.1/2.2) → Hersteller und Handelsname: KBA FZ 6.1, Datenlizenz Deutschland – Namensnennung 2.0.
// HSN/TSN → Klasse, Aufbau, Kraftstoff, kW, Hubraum, Achsen, Sitzplätze, zulässige Gesamtmasse: KBA SV 4.1–4.5,
//   Verwendung mit Zustimmung des Kraftfahrt-Bundesamts (13.11.2026).
// Genehmigung (Feld K) → Typ, Varianten, kW, Radstand, Spurweite: EEA CO2-Monitoring neuer Pkw in Deutschland, CC BY 4.0.
// Aufbereitet mit tools/fahrzeugdaten-aufbereiten.py.

import { zerlegeK } from './gutachten.js';

const BASIS = new URL('../daten/', import.meta.url);

/** Für Mehr → Über & Quellen (dieselben Angaben stehen in den Datendateien) */
export const FAHRZEUG_QUELLEN = [
  { titel: 'KBA FZ 6.1 – Bestand nach Herstellern und Typen', fassung: 'Stand 1. Januar 2024', wofuer: 'HSN/TSN → Hersteller und Handelsname',
    herausgeber: 'Kraftfahrt-Bundesamt, Flensburg', lizenz: 'Datenlizenz Deutschland – Namensnennung – Version 2.0',
    url: 'https://www.kba.de/SharedDocs/Downloads/DE/Statistik/Fahrzeuge/FZ6/fz6_2024.xlsx?__blob=publicationFile' },
  { titel: 'KBA SV 4 – Verzeichnis der Hersteller und Typen (SV 4.1–4.5)', fassung: 'Stand 15. August 2026', wofuer: 'HSN/TSN → kW, Hubraum, Klasse, Aufbau, zulässige Gesamtmasse',
    herausgeber: 'Kraftfahrt-Bundesamt, Flensburg', lizenz: 'Verwendung mit Zustimmung des Kraftfahrt-Bundesamts',
    url: 'https://www.kba.de/DE/Themen/Typgenehmigung/CoC_Daten_Fahrzeugtypdaten/Veroeffentlichungen/SV4.html' },
  { titel: 'EEA – Monitoring der CO2-Emissionen neuer Pkw (VO (EU) 2019/631)', fassung: 'Zulassungen in Deutschland 2010–2025', wofuer: 'Feld K → Typ, kW, Radstand, Spurweite',
    herausgeber: 'Europäische Umweltagentur (EEA)', lizenz: 'CC BY 4.0', url: 'https://discodata.eea.europa.eu/' },
];
const cache = new Map();
const lade = (pfad) => {
  if (!cache.has(pfad)) cache.set(pfad, fetch(new URL(pfad, BASIS)).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch((e) => { cache.delete(pfad); throw e; }));
  return cache.get(pfad);
};

// ---------------------------------------------------------------- HSN/TSN
/** "0603/BPG", "0603 BPG", "0603BPG" → { hsn, tsn } */
export function zerlegeSchluessel(text) {
  const m = /(\d{4})\s*[/\s-]?\s*([0-9a-z]{3})\b/i.exec(String(text || '').trim());
  return m ? { hsn: m[1], tsn: m[2].toUpperCase() } : null;
}

/** → { hsn, tsn, hersteller, name, bestand, quelle } oder null; wirft bei fehlenden Daten (offline, nie geladen) */
export async function sucheSchluessel(text) {
  const s = zerlegeSchluessel(text);
  if (!s) return null;
  const d = await lade('hsn-tsn.json');
  const e = d.h[s.hsn];
  if (!e) return { ...s, hersteller: '', name: '', unbekannt: 'hsn', quelle: d.quelle };
  const t = e[1][s.tsn];
  if (!t) return { ...s, hersteller: e[0], name: '', unbekannt: 'tsn', quelle: d.quelle };
  return { ...s, hersteller: e[0], name: t[0], bestand: t[1], quelle: d.quelle };
}

// ---------------------------------------------------------------- HSN/TSN → technische Daten (KBA SV 4)
const SV4_FELDER = ['heft', 'marke', 'name', 'datum', 'klasse', 'aufbau', 'kraftstoff', 'kw', 'hubraum', 'achsen', 'antriebsachsen', 'sitze', 'zgm'];

/**
 * Technische Daten zum Typschlüssel. → { hsn, tsn, hersteller, marke, name, klasse, klasseText, aufbau, aufbauText, kraftstoffText,
 * kw, hubraum, achsen, antriebsachsen, sitze, zgm, datum, heftText, quelle } · { …, unbekannt: 'hsn' | 'tsn' } · null (kein Schlüssel).
 * Wirft, wenn die Daten nicht geladen werden können (offline und nie geöffnet).
 */
export async function sucheTypdaten(text) {
  const s = zerlegeSchluessel(text);
  if (!s) return null;
  const info = await lade('sv4/info.json');
  const teil = await lade(`sv4/h-${String(+s.hsn % info.teile).padStart(2, '0')}.json`);
  const e = teil[s.hsn];
  if (!e) return { ...s, unbekannt: 'hsn', quelle: info.quelle };
  const roh = e[1][s.tsn];
  if (!roh) return { ...s, hersteller: e[0], unbekannt: 'tsn', quelle: info.quelle };
  const r = Object.fromEntries(SV4_FELDER.map((f, i) => [f, roh[i]]));
  return {
    ...s, ...r, hersteller: e[0],
    klasseText: info.klasse[r.klasse] || '',
    aufbauText: r.aufbau ? info.aufbau[`${r.klasse}|${r.aufbau}`] || '' : '',
    kraftstoffText: r.kraftstoff ? info.kraftstoff[r.kraftstoff] || '' : '',
    heftText: info.hefte[String(r.heft)] || '',
    quelle: info.quelle,
  };
}

/** Kurzfassung für die Anzeige: ["M1 Kombilimousine", "Benzin", "110 kW", "1395 cm³", "zul. Gesamtmasse 1820 kg", …] */
export function typdatenTeile(r) {
  if (!r || r.unbekannt) return [];
  const zahl = (x) => String(x); // ohne Tausenderpunkt, wie in der Zulassungsbescheinigung
  return [
    [r.klasse, r.aufbauText].filter(Boolean).join(' '),
    r.kraftstoffText,
    r.kw && `${zahl(r.kw)} kW`, // geschütztes Leerzeichen: Zahl und Einheit bleiben zusammen
    r.hubraum && `${zahl(r.hubraum)} cm³`,
    r.zgm && `zul. Gesamtmasse ${zahl(r.zgm)} kg`,
    r.achsen && `${r.achsen} ${r.achsen === 1 ? 'Achse' : 'Achsen'}`,
    r.sitze && `${r.sitze} ${r.sitze === 1 ? 'Sitzplatz' : 'Sitzplätze'}`,
  ].filter(Boolean);
}

// ---------------------------------------------------------------- Genehmigung → EEA
function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
const FELDER = ['nachtrag', 'typ', 'variante', 'handelsname', 'kraftstoff', 'hubraum', 'kw', 'radstand', 'spur1', 'spur2', 'von', 'bis'];

/** Schlüssel wie im Aufbereitungsprogramm: e1*2001/116*307 */
export function eeaSchluessel(k) {
  const z = zerlegeK(k);
  if (!z) return null;
  const [a, b] = z.rl.split('/');
  return { schluessel: `e${+z.land}*${+a}/${+b}*${+z.nr}`, nachtrag: z.erw ? String(+z.erw) : '' };
}

/**
 * Ausführungen zu einer Genehmigung. → { marke, alle: [...], passend: [...], nachtrag, quelle } oder null (nicht in den Daten).
 * passend = Ausführungen mit genau diesem Nachtrag (falls angegeben und vorhanden), sonst alle.
 */
export async function sucheGenehmigung(k) {
  const s = eeaSchluessel(k);
  if (!s) return null;
  const info = await lade('eea/info.json');
  const teil = await lade(`eea/k-${String(fnv(s.schluessel) % info.teile).padStart(2, '0')}.json`);
  const e = teil[s.schluessel];
  if (!e) return { schluessel: s.schluessel, marke: '', alle: [], passend: [], nachtrag: s.nachtrag, quelle: info.quelle };
  const alle = e.r.map((r) => Object.fromEntries(FELDER.map((f, i) => [f, r[i]])));
  const mitNachtrag = s.nachtrag ? alle.filter((r) => String(+r.nachtrag) === s.nachtrag) : [];
  return { schluessel: s.schluessel, marke: e.m, alle, passend: mitNachtrag.length ? mitNachtrag : alle, nachtragGefunden: !!mitNachtrag.length, nachtrag: s.nachtrag, quelle: info.quelle };
}

/** Spannweite einer Zahl über Ausführungen: "75–206" oder "1552" */
export function spanne(liste, feld) {
  const w = liste.map((r) => r[feld]).filter((x) => x > 0);
  if (!w.length) return '';
  const a = Math.min(...w), b = Math.max(...w);
  return a === b ? String(a) : `${a}–${b}`;
}
/** häufigste Werte eines Textfelds, absteigend */
export function haeufigste(liste, feld, n = 4) {
  const z = new Map();
  for (const r of liste) if (r[feld]) z.set(r[feld], (z.get(r[feld]) || 0) + 1);
  return [...z].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}
