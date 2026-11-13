// Prüfsinn – EU-Rückrufe aus Safety Gate (EU-Schnellwarnsystem, Kategorie Kraftfahrzeuge).
// Daten liegen auf dem eigenen Server (daten/rueckrufe/, aufbereitet mit tools/fahrzeugdaten-aufbereiten.py rueckrufe)
// und werden erst bei Bedarf geladen – es geht nichts an Dritte. Zuordnung über die Genehmigungsnummer (Feld K) oder Marke/Modell.

import { eeaSchluessel } from './fahrzeugdaten.js';

const BASIS = new URL('../daten/rueckrufe/', import.meta.url);
const cache = new Map();
const lade = (pfad) => {
  if (!cache.has(pfad)) cache.set(pfad, fetch(new URL(pfad, BASIS)).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch((e) => { cache.delete(pfad); throw e; }));
  return cache.get(pfad);
};
export const index = () => lade('index.json');
const teil = (i) => lade(`r-${String(i).padStart(2, '0')}.json`);

const MARKEN_GLEICH = { VW: 'VOLKSWAGEN', VOLKSWAGENVW: 'VOLKSWAGEN', CITROËN: 'CITROEN', MERCEDES: 'MERCEDES-BENZ', MERCEDESBENZ: 'MERCEDES-BENZ', SKODA: 'ŠKODA', LANDROVER: 'LAND ROVER', ALFAROMEO: 'ALFA ROMEO' };
export function markeKanon(m) {
  const roh = String(m || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const zus = roh.replace(/[^A-ZÄÖÜŠË]/g, '');
  return MARKEN_GLEICH[zus] || MARKEN_GLEICH[roh] || roh;
}
const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]+/g, ' ').trim();

/** Rückrufmeldungen zu einer Genehmigungsnummer (Feld K). → { treffer: [...], quelle } */
export async function zuGenehmigung(k) {
  const s = eeaSchluessel(k);
  if (!s) return { treffer: [], quelle: (await index()).quelle };
  const ix = await index();
  const liste = ix.k[s.schluessel] || [];
  const treffer = [];
  const gesehen = new Set();
  for (const [i, id] of liste) {
    if (gesehen.has(id)) continue;
    gesehen.add(id);
    const r = (await teil(i)).find((x) => x.id === id);
    if (r) treffer.push(r);
  }
  treffer.sort((a, b) => (b.d || '').localeCompare(a.d || ''));
  return { treffer, quelle: ix.quelle };
}

/**
 * Rückrufmeldungen nach Marke, Modell und Baujahr. Modell: alle Wörter müssen in Modell, Typ oder Produkt vorkommen.
 * Baujahr: Meldungen mit Produktionszeitraum, der das Jahr nicht enthält, fallen weg; Meldungen ohne Zeitraum bleiben (unbekannt).
 */
export async function suche({ marke, modell = '', jahr = '' }) {
  const ix = await index();
  const kanon = markeKanon(marke);
  const e = ix.marken[kanon];
  if (!e) return { treffer: [], marke: kanon, unbekannt: true, quelle: ix.quelle };
  const worte = norm(modell).split(' ').filter((w) => w.length >= 1);
  const j = Number(jahr);
  const treffer = (await teil(e.teil)).filter((r) => {
    if (markeKanon(r.m) !== kanon && !(kanon && norm(r.p + ' ' + r.n).includes(norm(kanon)))) return false;
    if (worte.length) {
      const text = ' ' + norm(`${r.n || ''} ${r.t || ''} ${r.p || ''}`) + ' ';
      if (!worte.every((w) => (w.length <= 2 ? text.includes(' ' + w + ' ') : text.includes(w)))) return false;
    }
    if (j >= 1950 && r.v && r.b && (j < r.v || j > r.b)) return false;
    return true;
  });
  return { treffer, marke: kanon, quelle: ix.quelle };
}

/** Marken mit Anzahl Meldungen, häufigste zuerst (für die Auswahlliste) */
export async function marken() {
  const ix = await index();
  return Object.entries(ix.marken).filter(([m, v]) => v.n >= 3 && m !== 'UNBEKANNT' && /^[A-ZÄÖÜŠË][A-ZÄÖÜŠË0-9 .&-]{1,24}$/.test(m)).sort((a, b) => b[1].n - a[1].n).map(([m, v]) => ({ marke: m, n: v.n }));
}

/** Kurzform für Listen */
export const kurz = (r) => (r.g || r.p || '').split(/(?<=\.)\s/)[0].slice(0, 180);
export const datumDe = (iso) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('.') : iso || '');
