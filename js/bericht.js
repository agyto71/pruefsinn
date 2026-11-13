// Prüfsinn – Befundblatt als PDF.
// Der Aufbau folgt der Reihenfolge eines Untersuchungsberichts (Untersuchung, Fahrzeug, Ergebnis, Mängel, Hinweise),
// damit sich die Angaben leicht in die Prüfsoftware übertragen lassen.
// Bewusst kein Nachbau eines amtlichen Berichts: kein Logo einer Prüforganisation, keine Plakette, kein Siegel,
// und auf jeder Seite der Vermerk "Arbeitsunterlage – kein amtlicher Untersuchungsbericht".

import { Pdf, SEITE } from './pdf.js';
import { store, fmtDate, pad2 } from './core.js';
import { STUFE, FOLGEN, FRISTEN, naechsteHU, plakette, nummerVon } from './daten.js';

const RAND = 42;
const INNEN = SEITE.b - 2 * RAND;
const datum = (iso) => fmtDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });

function titelZurArt(art) {
  if (/Vorab/.test(art)) return 'HU-Vorab-Check der Werkstatt – Einschätzung vor der Hauptuntersuchung';
  if (/^HU mit AU/.test(art)) return 'Hauptuntersuchung nach § 29 StVZO einschließlich Abgasuntersuchung';
  if (/^HU/.test(art)) return 'Hauptuntersuchung nach § 29 StVZO';
  if (/^Nachprüfung/.test(art)) return 'Nachprüfung zur Hauptuntersuchung nach § 29 StVZO';
  if (/§ 19/.test(art)) return 'Änderungsabnahme nach § 19 Abs. 3 StVZO';
  if (/§ 21/.test(art)) return 'Begutachtung nach § 21 StVZO';
  if (/§ 23/.test(art)) return 'Begutachtung nach § 23 StVZO (Oldtimer)';
  if (/^SP/.test(art)) return 'Sicherheitsprüfung nach § 29 StVZO';
  return art;
}

/** Erzeugt das Befundblatt. e = Gesamtergebnis (O/G/E/V/U), nachpruefung = ISO-Datum oder null. */
export const istVorab = (a) => /Vorab/.test(a?.art || '');

/** fotos: Map(Befund-ID → [{ daten, breite, hoehe, farben }]) – erscheinen unter dem jeweiligen Mangel */
export function befundPdf(a, { e, nachpruefung, fotos = new Map() }) {
  const vorab = istVorab(a);
  const istHU = /^(HU|Nachprüfung)/.test(a.art) && !vorab;
  const name = vorab ? 'HU-Vorab-Check' : 'Befundblatt';
  const pdf = new Pdf(`${name} ${a.kennzeichen || ''} ${datum(a.datum)}`.replace(/\s+/g, ' '));
  let y = 0;

  const kopf = (erste) => {
    pdf.text(RAND, 54, 'prüfsinn', { size: 13, fett: true });
    pdf.text(RAND + 62, 54, name, { size: 9, grau: 0.45 });
    // Vermerk oben rechts – auf jeder Seite
    const bw = 210;
    pdf.rahmen(SEITE.b - RAND - bw, 36, bw, 30, { fuellung: 0.1 });
    pdf.text(SEITE.b - RAND - bw / 2, 49, vorab ? 'KEINE HAUPTUNTERSUCHUNG' : 'ARBEITSUNTERLAGE', { size: 8.5, fett: true, grau: 1, mitte: true, sperren: 1.2 });
    pdf.text(SEITE.b - RAND - bw / 2, 60, vorab ? 'Einschätzung der Werkstatt' : 'kein amtlicher Untersuchungsbericht', { size: 7.5, grau: 0.86, mitte: true });
    pdf.linie(RAND, 78, SEITE.b - RAND, 78, { dicke: 0.8, grau: 0.1 });
    y = 100;
    if (!erste) {
      pdf.text(RAND, y, `${a.kennzeichen || 'ohne Kennzeichen'} · ${datum(a.datum)} · Fortsetzung`, { size: 9, grau: 0.4 });
      y += 22;
    }
  };
  const platz = (h) => { if (y + h > SEITE.h - 76) { pdf.neueSeite(); kopf(false); } };
  const abschnitt = (t) => {
    platz(52);
    y += 17;
    pdf.text(RAND, y, t.toUpperCase(), { size: 8, fett: true, sperren: 1.1 });
    y += 6;
    pdf.linie(RAND, y, SEITE.b - RAND, y, { dicke: 0.5, grau: 0.25 });
    y += 6;
  };
  /** Formularzeile aus beschrifteten Kästen; breiten in Anteilen von 12. */
  const felder = (zeile) => {
    const h = 34;
    platz(h + 4);
    let x = RAND;
    for (const [label, wert, anteil] of zeile) {
      const w = INNEN * anteil / 12;
      pdf.rahmen(x, y, w, h, { linie: 0.72 });
      pdf.text(x + 6, y + 10.5, label, { size: 6.4, grau: 0.42 });
      const wtext = wert ? String(wert) : '–';
      let size = 11;
      while (size > 7 && pdf.breite(wtext, size, true) > w - 12) size -= 0.5;
      pdf.text(x + 6, y + 26, wtext, { size, fett: !!wert, grau: wert ? 0 : 0.6 });
      x += w;
    }
    y += h;
  };

  kopf(true);
  pdf.text(RAND, y + 8, name, { size: 22, fett: true });
  y += 28;
  y = pdf.absatz(RAND, y, titelZurArt(a.art), INNEN, { size: 11.5, grau: 0.25 });
  y += 8;

  abschnitt('Untersuchung');
  const st = store.get('einstellungen', {});
  felder([['Art der Untersuchung', a.art, 4], ['Datum', datum(a.datum), 2.5], ['Uhrzeit', a.zeit, 1.5], vorab ? ['Werkstatt', st.betrieb || st.name, 4] : ['Prüfer', st.name, 4]]);

  abschnitt('Fahrzeug');
  const fa = FRISTEN.find((f) => f.id === a.fahrzeugart);
  felder([['Amtliches Kennzeichen', a.kennzeichen, 3], ['Fahrzeugart', fa ? fa.label : '', 5], ['Erstzulassung', a.ez, 2], ['km-Stand', a.km, 2]]);
  felder([['Hersteller / Typ', a.fahrzeug, 5], ['Fahrzeug-Identifizierungsnummer (FIN)', a.fin, 4.5], ['Schlüssel-Nr. (HSN/TSN)', a.hsn, 2.5]]);
  if (a.kunde) felder([['Auftraggeber / Ort', a.kunde, 12]]);

  abschnitt(vorab ? 'Einschätzung' : 'Ergebnis der Untersuchung');
  const zaehler = {};
  for (const b of a.befunde) zaehler[b.s] = (zaehler[b.s] || 0) + 1;
  const hoch = 74;
  platz(hoch + 6);
  pdf.rahmen(RAND, y, INNEN, hoch, { linie: 0.1, dicke: 1 });
  pdf.rahmen(RAND, y, 96, hoch, { fuellung: e === 'O' ? 0.9 : 0.1 });
  pdf.text(RAND + 48, y + 46, STUFE[e].code, { size: 26, fett: true, grau: e === 'O' ? 0 : 1, mitte: true });
  let ty = y + 21;
  pdf.text(RAND + 110, ty, STUFE[e].name, { size: 14, fett: true });
  ty += 15;
  const teile = ['U', 'V', 'E', 'G'].filter((s) => zaehler[s]).map((s) => `${zaehler[s]} × ${STUFE[s].code}`).join('  ·  ');
  pdf.text(RAND + 110, ty, teile || 'Keine Mängel eingetragen', { size: 9.5, grau: 0.3 });
  ty += 14;
  if (istHU) {
    ty = pdf.absatz(RAND + 110, ty, FOLGEN[e].text, INNEN - 124, { size: 8.6, grau: 0.25, zeile: 11 });
  } else if (vorab) {
    const rat = e === 'O' ? 'Keine Mängel gefunden – das Fahrzeug kann zur Hauptuntersuchung.'
      : e === 'G' ? 'Geringe Mängel – Beheben vor der Hauptuntersuchung empfohlen.'
        : 'Mit diesen Mängeln würde die Hauptuntersuchung voraussichtlich nicht bestanden – vorher beheben.';
    ty = pdf.absatz(RAND + 110, ty, rat, INNEN - 124, { size: 8.6, grau: 0.25, zeile: 11 });
  }
  y += hoch;
  if (istHU) {
    const zeile = [];
    zeile.push(['Prüfplakette', FOLGEN[e].plakette ? 'Zuteilung möglich' : 'keine Zuteilung', 4]);
    if (FOLGEN[e].plakette) {
      const [jj, mm] = a.datum.split('-').map(Number);
      const n = naechsteHU(a.fahrzeugart, mm, jj, a.ersteHU);
      zeile.push(['Nächste Hauptuntersuchung', `${pad2(n.m)}/${n.y}`, 4], ['Farbe der Plakette', plakette(n.y).name, 4]);
    } else {
      zeile.push(['Nachprüfung spätestens', nachpruefung ? datum(nachpruefung) : '', 4], ['Vorschrift', `Anlage VIII Nr. ${FOLGEN[e].nr} StVZO`, 4]);
    }
    felder(zeile);
  }

  // Mängeltabelle
  const SP = { nr: RAND, text: RAND + 62, lage: RAND + 362, st: SEITE.b - RAND - 34 };
  const tabellenkopf = (mitStufe) => {
    pdf.rahmen(RAND, y, INNEN, 16, { fuellung: 0.93 });
    pdf.text(SP.nr + 5, y + 11, 'Nr.', { size: 7, fett: true });
    pdf.text(SP.text, y + 11, mitStufe ? 'Untersuchungspunkt und Mangel' : 'Hinweis', { size: 7, fett: true });
    pdf.text(SP.lage, y + 11, 'Lage', { size: 7, fett: true });
    if (mitStufe) pdf.text(SP.st + 17, y + 11, 'Einst.', { size: 7, fett: true, mitte: true });
    y += 16;
  };
  const liste = (titel, eintraege, mitStufe) => {
    abschnitt(titel);
    if (!eintraege.length) { pdf.text(RAND, y + 10, mitStufe ? 'Keine Mängel festgestellt.' : '–', { size: 10, grau: 0.3 }); y += 20; return; }
    platz(60);
    tabellenkopf(mitStufe);
    for (const b of eintraege) {
      const tb = SP.lage - SP.text - 10;
      const zTitel = pdf.umbruch(b.titel, tb, 9.5, true);
      const zText = pdf.umbruch(b.wenn || b.text || '', tb, 9, false).filter(Boolean);
      const zLage = pdf.umbruch(b.ort || '–', SP.st - SP.lage - 8, 9, false);
      const hoehe = Math.max(zTitel.length * 12 + zText.length * 11.5, zLage.length * 11.5, 14) + 10;
      if (y + hoehe > SEITE.h - 76) { pdf.neueSeite(); kopf(false); tabellenkopf(mitStufe); }
      let yy = y + 13;
      pdf.text(SP.nr + 5, yy, b.nr ? nummerVon(b) : '–', { size: 9, fett: true });
      for (const l of zTitel) { pdf.text(SP.text, yy, l, { size: 9.5, fett: true }); yy += 12; }
      for (const l of zText) { pdf.text(SP.text, yy, l, { size: 9, grau: 0.2 }); yy += 11.5; }
      let ly = y + 13;
      for (const l of zLage) { pdf.text(SP.lage, ly, l, { size: 9, grau: b.ort ? 0 : 0.6 }); ly += 11.5; }
      if (mitStufe) {
        pdf.rahmen(SP.st, y + 4, 34, 14, b.s === 'G' ? { linie: 0.1, dicke: 0.8 } : { fuellung: 0.1 });
        pdf.text(SP.st + 17, y + 14, STUFE[b.s].code, { size: 8.5, fett: true, grau: b.s === 'G' ? 0 : 1, mitte: true });
      }
      y += hoehe;
      // Fotos zum Mangel: bis zu drei je Reihe unter dem Text
      const bilder = fotos.get(b.id) || [];
      const bw = (SP.st - SP.text - 16) / 3;
      for (let i = 0; i < bilder.length; i += 3) {
        const reihe = bilder.slice(i, i + 3);
        const hh = Math.min(110, Math.max(...reihe.map((x) => (bw * x.hoehe) / x.breite)));
        if (y + hh + 10 > SEITE.h - 76) { pdf.neueSeite(); kopf(false); }
        reihe.forEach((x, k) => {
          const hb = Math.min((bw * x.hoehe) / x.breite, 110);
          pdf.bild(SP.text + k * (bw + 8), y + 2, (hb * x.breite) / x.hoehe, hb, x);
        });
        y += hh + 8;
      }
      pdf.linie(RAND, y, SEITE.b - RAND, y, { dicke: 0.4, grau: 0.8 });
    }
  };
  const maengel = a.befunde.filter((b) => b.s !== 'H').sort((x, z2) => STUFE[z2.s].rang - STUFE[x.s].rang || x.ts - z2.ts);
  const hinweise = a.befunde.filter((b) => b.s === 'H');
  liste('Festgestellte Mängel', maengel, true);
  if (hinweise.length) liste('Hinweise', hinweise, false);

  if (a.notiz && a.notiz.trim()) {
    abschnitt('Bemerkungen');
    for (const l of pdf.umbruch(a.notiz.trim(), INNEN, 10, false)) { platz(16); pdf.text(RAND, y + 10, l, { size: 10 }); y += 14; }
  }

  // Fußzeile auf jeder Seite
  const n = pdf.seiten.length;
  for (let i = 0; i < n; i++) {
    pdf.aufSeite(i);
    const fy = SEITE.h - 58;
    pdf.linie(RAND, fy, SEITE.b - RAND, fy, { dicke: 0.5, grau: 0.6 });
    pdf.absatz(RAND, fy + 12, (vorab ? 'Vorab-Check der Werkstatt mit Prüfsinn – keine Hauptuntersuchung nach § 29 StVZO, keine Prüfplakette; das Ergebnis der HU kann abweichen. '
      : 'Arbeitsunterlage aus Prüfsinn – kein amtlicher Untersuchungsbericht und kein Nachweis einer Hauptuntersuchung nach § 29 StVZO. ') +
      (a.befunde.some((b) => String(b.kat || '').startsWith('de:')) ? 'Mängelnummern und Einstufung nach HU-Richtlinie, Anlage 2 (VkBl. 2019 S. 871, Stand 04/2024); maßgeblich ist der Bericht der Prüforganisation.' : 'Mängelnummern und Einstufung nach Richtlinie 2014/45/EU Anhang I; maßgeblich sind die HU-Richtlinie und der Bericht der Prüforganisation.'), INNEN - 70, { size: 7, grau: 0.4, zeile: 9.5 });
    pdf.text(SEITE.b - RAND, fy + 12, `Seite ${i + 1} von ${n}`, { size: 7.5, grau: 0.4, rechts: true });
  }
  return pdf.blob();
}

export function befundDateiname(a) {
  const kz = (a.kennzeichen || 'ohne-Kennzeichen').replace(/[^A-Za-z0-9ÄÖÜäöü]+/g, '-').replace(/^-|-$/g, '');
  return `${istVorab(a) ? 'HU-Vorab-Check' : 'Befundblatt'}_${kz}_${a.datum}.pdf`;
}
