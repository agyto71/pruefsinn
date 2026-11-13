// Prüfsinn – Umbau-Nachweis (Werkstatt) bzw. Abnahme-Checkliste (Prüfer) als PDF, mit Fotos.
// Bewusst kein amtliches Dokument: kein Logo einer Prüforganisation, kein Siegel, keine Unterschriftsfelder;
// auf jeder Seite der Vermerk „Arbeitsunterlage“. Die Bestätigung nach § 19 StVZO stellt allein der Prüfer aus.

import { Pdf, SEITE } from './pdf.js';
import { fmtDate } from './core.js';

const RAND = 42;
const INNEN = SEITE.b - 2 * RAND;
const datum = (iso) => fmtDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
const STATUS_TEXT = { werkstatt: { ok: 'Erledigt', nein: 'Geht nicht', na: 'Entfällt' }, pruefer: { ok: 'Erfüllt', nein: 'Nicht erfüllt', na: 'Entfällt' } };

/**
 * a: Auftrag, g: Gutachten-Auswertung, zb: Werte der Zulassungsbescheinigung,
 * gruppen: [{ titel, punkte: [{ code, text, seite, status, notiz, reifen }] }],
 * fotos: Map(key → [{ daten, breite, hoehe, farben }]), opts: { werkstatt, betrieb, eintrag, reifen, kunde: [text] }
 */
export function nachweisPdf(a, g, zb, gruppen, fotos, { werkstatt, betrieb, eintrag, reifen, kunde = [] }) {
  const art = werkstatt ? 'werkstatt' : 'pruefer';
  const titel = werkstatt ? 'Umbau-Nachweis für die Änderungsabnahme' : 'Abnahme-Checkliste';
  const pdf = new Pdf(`${titel} ${a.kennzeichen || ''} ${datum(a.datum)}`.replace(/\s+/g, ' '));
  let y = 0;

  const kopf = (erste) => {
    pdf.text(RAND, 54, 'prüfsinn', { size: 13, fett: true });
    pdf.text(RAND + 62, 54, werkstatt ? 'Umbau-Nachweis' : 'Abnahme-Checkliste', { size: 9, grau: 0.45 });
    const bw = 220;
    pdf.rahmen(SEITE.b - RAND - bw, 36, bw, 30, { fuellung: 0.1 });
    pdf.text(SEITE.b - RAND - bw / 2, 49, 'ARBEITSUNTERLAGE', { size: 8.5, fett: true, grau: 1, mitte: true, sperren: 1.2 });
    pdf.text(SEITE.b - RAND - bw / 2, 60, werkstatt ? 'keine Bestätigung nach § 19 StVZO' : 'kein amtliches Dokument', { size: 7.5, grau: 0.86, mitte: true });
    pdf.linie(RAND, 78, SEITE.b - RAND, 78, { dicke: 0.8, grau: 0.1 });
    y = 100;
    if (!erste) { pdf.text(RAND, y, `${a.kennzeichen || 'ohne Kennzeichen'} · ${datum(a.datum)} · Fortsetzung`, { size: 9, grau: 0.4 }); y += 22; }
  };
  const platz = (hh) => { if (y + hh > SEITE.h - 70) { pdf.neueSeite(); kopf(false); } };
  const abschnitt = (t) => {
    platz(50);
    y += 14;
    pdf.text(RAND, y, t.toUpperCase(), { size: 8, fett: true, sperren: 1.1 });
    y += 6;
    pdf.linie(RAND, y, SEITE.b - RAND, y, { dicke: 0.5, grau: 0.25 });
    y += 14;
  };
  const zeile = (label, wert) => {
    if (!wert) return;
    const z = pdf.umbruch(wert, INNEN - 130, 9.5);
    platz(z.length * 12 + 4);
    pdf.text(RAND, y, label, { size: 8, grau: 0.45 });
    for (const l of z) { pdf.text(RAND + 130, y, l, { size: 9.5 }); y += 12; }
    y += 3;
  };

  kopf(true);
  pdf.text(RAND, y, titel, { size: 16, fett: true });
  y += 24;
  const m = g.meta || {};
  abschnitt(werkstatt ? 'Betrieb und Fahrzeug' : 'Fahrzeug');
  if (werkstatt) zeile('Werkstatt', betrieb || '– (in Prüfsinn unter Mehr > Einstellungen eintragen)');
  zeile('Datum', datum(a.datum));
  zeile('Kennzeichen', a.kennzeichen);
  zeile('Fahrzeug', a.fahrzeug);
  zeile('FIN', a.fin);
  zeile('Schlüssel-Nr. (2.1/2.2)', zb.hsn || a.hsn);
  zeile('Genehmigung (K)', zb.k);
  zeile('Typ (D.2)', zb.typ);
  zeile('Leistung (P.2)', zb.kw && `${zb.kw} kW`);
  zeile('Achslasten (8.1/8.2)', (zb.a1 || zb.a2) && `${zb.a1 || '–'} kg / ${zb.a2 || '–'} kg`);

  abschnitt('Gutachten');
  zeile('Gutachten', [m.art, m.nr && 'Nr. ' + m.nr, m.datum && 'vom ' + m.datum].filter(Boolean).join(' · '));
  zeile('Technischer Dienst', [m.stelle, m.kba].filter(Boolean).join(', '));
  const norm = (x) => String(x || '').replace(/[\s×xX]+/g, '').toLowerCase();
  zeile('Prüfgegenstand', [m.gegenstand, !norm(m.gegenstand).includes(norm(m.rad)) && m.rad, m.radtyp && 'Typ ' + m.radtyp].filter(Boolean).join(', '));
  zeile('Verwendungsbereich', eintrag);
  zeile('Rad/Reifen', reifen);
  if (m.ocr) zeile('Hinweis', `${m.ocr} Seite(n) per Texterkennung aus einem Scan gelesen – Kürzel und Zahlen am Original prüfen.`);

  for (const gr of gruppen) {
    if (!gr.punkte.length) continue;
    abschnitt(gr.titel);
    for (const p of gr.punkte) {
      const zText = pdf.umbruch(p.text || '–', INNEN - 150, 8.8);
      const kurz = zText.length > 14 ? [...zText.slice(0, 13), (zText[13] || '') + ' …'] : zText;
      const zNotiz = p.notiz ? pdf.umbruch('Notiz: ' + p.notiz, INNEN - 150, 8.8) : [];
      platz(kurz.length * 11 + zNotiz.length * 11 + 14);
      const top = y;
      pdf.text(RAND, y, p.code, { size: 9, fett: true });
      const st = STATUS_TEXT[art][p.status] || 'offen';
      pdf.text(SEITE.b - RAND, y, st, { size: 8.5, fett: !!p.status, grau: p.status === 'nein' ? 0 : p.status ? 0.15 : 0.5, rechts: true });
      for (const l of kurz) { pdf.text(RAND + 46, y, l, { size: 8.8, grau: 0.15 }); y += 11; }
      for (const l of zNotiz) { pdf.text(RAND + 46, y, l, { size: 8.8, fett: true }); y += 11; }
      if (p.seite) { pdf.text(RAND + 46, y, `Gutachten Seite ${p.seite}${p.reifen ? ' · ' + p.reifen : ''}`, { size: 7.5, grau: 0.5 }); y += 10; }
      // Fotos: bis zu drei je Reihe
      const bilder = fotos.get(p.key) || [];
      if (bilder.length) {
        const bw = (INNEN - 46 - 16) / 3;
        for (let i = 0; i < bilder.length; i += 3) {
          const reihe = bilder.slice(i, i + 3);
          const hoehe = Math.max(...reihe.map((b) => (bw * b.hoehe) / b.breite));
          platz(Math.min(hoehe, 150) + 10);
          reihe.forEach((b, k) => {
            const hh = Math.min((bw * b.hoehe) / b.breite, 150);
            const ww = (hh * b.breite) / b.hoehe;
            pdf.bild(RAND + 46 + k * (bw + 8), y + 2, ww, hh, b);
          });
          y += Math.min(hoehe, 150) + 8;
        }
      }
      y += 6;
      pdf.linie(RAND + 46, y - 3, SEITE.b - RAND, y - 3, { dicke: 0.3, grau: 0.85 });
      if (y - top < 0) y = top; // nie rückwärts
    }
  }

  if (werkstatt && kunde.length) {
    abschnitt('Hinweise für den Kunden');
    for (const t of kunde) {
      const z = pdf.umbruch('• ' + t, INNEN, 9);
      platz(z.length * 11.5 + 4);
      for (const l of z) { pdf.text(RAND, y, l, { size: 9 }); y += 11.5; }
      y += 3;
    }
  }

  // Fußzeile auf jeder Seite
  const n = pdf.seiten.length;
  for (let i = 0; i < n; i++) {
    pdf.aufSeite(i);
    const fy = SEITE.h - 52;
    pdf.linie(RAND, fy, SEITE.b - RAND, fy, { dicke: 0.5, grau: 0.6 });
    pdf.absatz(RAND, fy + 12, werkstatt
      ? 'Arbeitsunterlage der Werkstatt aus Prüfsinn. Maßgeblich ist das Gutachten im Original; die Änderungsabnahme und ihre Bestätigung erfolgen durch den Prüfer.'
      : 'Arbeitsunterlage aus Prüfsinn. Maßgeblich ist das Gutachten im Original.', INNEN - 70, { size: 7, grau: 0.4, zeile: 9.5 });
    pdf.text(SEITE.b - RAND, fy + 12, `Seite ${i + 1} von ${n}`, { size: 7.5, grau: 0.4, rechts: true });
  }
  return pdf.blob();
}

export function nachweisDateiname(a, werkstatt) {
  const kz = (a.kennzeichen || 'ohne-Kennzeichen').replace(/[^A-Za-z0-9ÄÖÜäöü-]+/g, '-');
  return `${werkstatt ? 'Umbau-Nachweis' : 'Abnahme-Checkliste'}_${kz}_${a.datum}.pdf`;
}
