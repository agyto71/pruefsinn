// Prüfsinn – Gutachten-Assistent (Seite): Gutachten öffnen, Fahrzeug eingeben, Auflagen abhaken.
// Die Auswertung (js/gutachten.js) läuft im Gerät. Am Auftrag gespeichert wird nur das Ergebnis der Auswertung,
// nie das PDF selbst.

import { h, icon, clear, sheet, confirmSheet, field, toast, copyText, shareText, debounce, fmtDate, store, teileDatei } from '../core.js';
import { hole, aendere, kennzeichen, neuerAuftrag } from './auftraege.js';
import * as G from '../gutachten.js';
import { speichereFoto, loescheFoto, fotosMit, verkleinere, jpegGroesse } from '../fotos.js';
import { nachweisPdf, nachweisDateiname } from '../nachweis.js';
import * as FD from '../fahrzeugdaten.js';
import * as RR from '../rueckrufe.js';
import { rueckrufZeile } from './mehr.js';

const STATUS_PRUEFER = [['ok', 'Erfüllt'], ['nein', 'Nicht erfüllt'], ['na', 'Entfällt']];
const STATUS_WERKSTATT = [['ok', 'Erledigt'], ['nein', 'Geht nicht'], ['na', 'Entfällt']];
export const istWerkstatt = (a) => /umbau/i.test(a?.art || '');
const ZB = [ // Felder der Zulassungsbescheinigung Teil I
  ['hsn', 'Schlüssel-Nr. (Feld 2.1/2.2)', 'z. B. 0603/BPG', { autocapitalize: 'characters', spellcheck: 'false' }, 'voll'],
  ['k', 'Genehmigung (Feld K)', 'e1*2001/116*0307*37', { autocapitalize: 'off', spellcheck: 'false' }, 'voll'],
  ['typ', 'Typ (Feld D.2)', 'z. B. 3C', { autocapitalize: 'characters', spellcheck: 'false' }],
  ['kw', 'Leistung (Feld P.2)', 'kW', { inputmode: 'numeric' }],
  ['reifen', 'Reifengröße am Fahrzeug', 'z. B. 225/45 R17', { autocapitalize: 'characters', spellcheck: 'false' }, 'voll'],
  ['a1', 'Achslast vorne (Feld 8.1)', 'kg', { inputmode: 'numeric' }],
  ['a2', 'Achslast hinten (Feld 8.2)', 'kg', { inputmode: 'numeric' }],
];

/** Gruppen der Abnahme: wie viele Auflagen erfüllt, offen … (auch für die Auftragsseite) */
export function stand(a) {
  const g = a?.gutachten;
  if (!g) return null;
  const liste = punkte(g);
  const z = { ok: 0, nein: 0, na: 0, offen: 0, gesamt: liste.length };
  for (const p of liste) z[g.status?.[p.key] || 'offen']++;
  return z;
}

/** Rad laut Gutachten, ohne doppelte Angaben („PKW-Sonderrad 7,5Jx17H2 Typ 01757“ enthält Größe und Typ schon). */
function radBeschreibung(m) {
  const teile = [];
  if (m.gegenstand) teile.push(m.gegenstand);
  const kompakt = (t) => String(t || '').replace(/\s+/g, '').toLowerCase();
  const hat = (t) => teile.some((x) => kompakt(x).includes(kompakt(t)));
  if (m.rad && !hat(m.rad.replace(/ × /, 'x')) && !/\d\s?J\s?[x×]/i.test(m.gegenstand || '')) teile.push(m.rad);
  if (m.radtyp && !hat(m.radtyp)) teile.push(`Typ ${m.radtyp}`);
  if (m.et) teile.push(`ET ${m.et.join(' / ')}`);
  return teile.join(', ');
}

const anzahl = (n, eins, mehr) => `${n} ${n === 1 ? eins : mehr}`;

function titel(e) {
  const teile = [];
  for (const t of [e.hersteller, e.verkauf, e.name]) if (t && !teile.some((x) => x.toLowerCase().includes(t.toLowerCase()))) teile.push(t);
  return teile.join(' · ') || 'Fahrzeug ohne Bezeichnung';
}

/** Welche Achse trägt diesen Reifen? Aus Auflagen wie „Diese Reifengröße ist nur an Achse 1 zulässig.“ */
function achseVon(g, r) {
  const dict = new Map(g.auflagen.map(([c, t]) => [c, t]));
  for (const c of r?.codes || []) {
    const t = dict.get(c) || '';
    if (/nur an Achse 1 zulässig|nur (?:an|auf) der Vorderachse/i.test(t)) return 1;
    if (/nur an Achse 2 zulässig|nur (?:an|auf) der Hinterachse/i.test(t)) return 2;
  }
  return 0;
}

/** Die abzuhakenden Punkte zur aktuellen Wahl. */
function punkte(g) {
  const dict = new Map(g.auflagen.map(([c, t, s]) => [c, { t, s }]));
  const liste = [];
  const schon = new Map();
  const dazu = (p) => {
    if (schon.has(p.key)) { const alt = schon.get(p.key); if (p.reifen && !alt.reifenListe.includes(p.reifen)) alt.reifenListe.push(p.reifen); return; }
    const d = dict.get(p.code);
    const q = { text: d?.t || '', seite: d?.s, reifenListe: p.reifen ? [p.reifen] : [], ...p };
    schon.set(p.key, q);
    liste.push(q);
  };
  const w = g.wahl || {};
  if (w.e === -1) {
    for (const [c] of g.auflagen) dazu({ key: c, code: c, gruppe: 'Alle Auflagen des Gutachtens' });
    return liste;
  }
  const e = g.eintraege[w.e];
  if (!e) return liste;
  const gelesen = e.gelesen || {};
  const dazu0 = dazu;
  const dazuG = (p) => dazu0(gelesen[p.code] ? { ...p, gelesen: gelesen[p.code] } : p);
  for (const ri of w.r || []) {
    const r = e.reifen[ri];
    if (!r) continue;
    for (const c of r.codes) dazuG({ key: c, code: c, gruppe: 'Zum Reifen', reifen: r });
    if (r.frei) dazu({ key: 'rf:' + ri, code: '!', kurz: `Hinweis zu ${r.g}`, text: `Hinweis in der Reifenspalte zu ${r.g}: ${r.frei}`, gruppe: 'Zum Reifen', reifen: r, seite: r.seite });
  }
  for (const c of e.codes) dazuG({ key: c, code: c, gruppe: 'Zum Fahrzeug' });
  if (e.frei) dazu({ key: 'frei', code: '!', kurz: `Einschränkung laut Verwendungsbereich (${e.frei})`, text: `Einschränkung laut Verwendungsbereich: ${e.frei}`, gruppe: 'Zum Fahrzeug', seite: e.seite });
  const rad = radBeschreibung(g.meta || {});
  dazu({ key: 'rad', code: 'Rad', kurz: 'Kennzeichnung am Rad', text: `Kennzeichnung am Rad mit dem Gutachten vergleichen${rad ? ': ' + rad : ''}. Gutachten-Nr. ${g.meta?.nr || '–'}.`, gruppe: 'Am Rad' });
  return liste;
}

function zusammenfassung(a, g, zb) {
  const z = [];
  const liste = punkte(g);
  const e = g.eintraege[g.wahl?.e];
  const m = g.meta || {};
  const werkstatt = istWerkstatt(a);
  z.push(`${werkstatt ? 'UMBAU' : 'ABNAHME'} · ${a.art}`);
  z.push([a.kennzeichen && `Kennzeichen: ${a.kennzeichen}`, a.fahrzeug && `Fahrzeug: ${a.fahrzeug}`].filter(Boolean).join(' · ') || 'Fahrzeug: –');
  z.push(`Datum: ${fmtDate(a.datum, { day: '2-digit', month: '2-digit', year: 'numeric' })}`);
  z.push('');
  z.push(`Gutachten: ${m.art || 'Gutachten'}${m.nr ? ' Nr. ' + m.nr : ''}${m.datum ? ' vom ' + m.datum : ''}`);
  if (m.stelle || m.kba) z.push(`Technischer Dienst: ${[m.stelle, m.kba].filter(Boolean).join(', ')}`);
  const rad = radBeschreibung(m);
  if (rad) z.push(`Prüfgegenstand: ${rad}`);
  const fz = [zb.hsn && `Schlüssel-Nr. ${zb.hsn}`, zb.k && `Genehmigung ${zb.k}`, zb.typ && `Typ ${zb.typ}`, zb.kw && `${zb.kw} kW`, zb.a1 && `Achslast vorne ${zb.a1} kg`, zb.a2 && `hinten ${zb.a2} kg`].filter(Boolean);
  if (fz.length) z.push(`Fahrzeug laut ZB I: ${fz.join(', ')}`);
  if (e) {
    z.push(`Verwendungsbereich: ${titel(e)}${e.typ ? ', Typ ' + e.typ : ''}${e.kw ? ', ' + e.kw + ' kW' : ''} (Seite ${e.seite})`);
    const rs = (g.wahl.r || []).map((i) => e.reifen[i]).filter(Boolean);
    if (rs.length) z.push(`Rad/Reifen: ${rs.map((r) => r.g + (r.li ? ' ' + r.li : '')).join(' / ')}`);
  } else if (g.wahl?.e === -1) z.push('Verwendungsbereich: ohne Zuordnung, alle Auflagen geprüft');
  const nach = (st) => liste.filter((p) => (g.status?.[p.key] || 'offen') === st).map((p) => (p.kurz || p.code) + (g.notizen?.[p.key] ? ` (${g.notizen[p.key]})` : ''));
  const block = (titelT, l, trenner = ', ') => { if (l.length) z.push('', `${titelT}: ${l.join(trenner)}`); };
  block(werkstatt ? 'Geht nicht' : 'Nicht erfüllt', nach('nein'), '; ');
  block('Offen', nach('offen'), '; ');
  block(werkstatt ? 'Erledigt' : 'Erfüllt', nach('ok'), '; ');
  block('Entfällt', nach('na'), '; ');
  z.push('', 'Arbeitsunterlage aus Prüfsinn – maßgeblich ist das Gutachten im Original.');
  return z.join('\n');
}

// ---------- Seite ----------

export function seite(el, id) {
  // Nur zum Testen am eigenen Rechner (z. B. im iPhone-Simulator, wo es keine Dateiauswahl gibt):
  // #/auftraege/test/gutachten?probe=/quellen/gutachten/datei.pdf öffnet ein Testgutachten direkt.
  const lokal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const probe = lokal ? new URLSearchParams(location.hash.split('?')[1] || '').get('probe') : null;
  if (probe && /^test(-umbau)?$/.test(id) && !hole(id)) neuerAuftrag({ id, art: id === 'test' ? 'Änderungsabnahme § 19 (3)' : 'Umbau (Werkstatt)', kennzeichen: 'TEST' });
  let a = hole(id);
  el.append(h('a', { class: 'back', href: '#/auftraege/' + id }, icon('left', 20), 'Auftrag'));
  if (!a) { el.append(h('div', { class: 'card pad empty' }, h('h3', null, 'Auftrag nicht gefunden'), h('a', { class: 'btn', href: '#/auftraege' }, 'Zur Liste'))); return; }
  const werkstatt = istWerkstatt(a);
  const STATUS = werkstatt ? STATUS_WERKSTATT : STATUS_PRUEFER;
  const urls = []; // Vorschaubilder der Fotos, beim Verlassen freigeben

  let g = a.gutachten ? JSON.parse(JSON.stringify(a.gutachten)) : null;
  let zeilen = null; // Volltext nur, solange das PDF in dieser Sitzung gelesen wurde
  const zb = { hsn: a.hsn || '', k: '', typ: '', kw: '', reifen: '', a1: '', a2: '', ...(a.zb || {}) };
  if (!zb.hsn && a.hsn) zb.hsn = a.hsn;
  let alleZeigen = false;

  const karteG = h('section', { class: 'card pad gut-karte' });
  const karteF = h('section', { class: 'card pad gut-karte' });
  const karteR = h('section', { class: 'card pad gut-karte' });
  const karteA = h('section', { class: 'gut-karte' });
  const karteE = h('section', { class: 'card pad gut-karte' });
  const kopfFahrzeug = h('div', { class: 'rowx wrap', style: { marginTop: '10px' } }, kennzeichen(a), h('span', { class: 'tag' }, a.art), a.fahrzeug && h('span', { class: 'small muted' }, a.fahrzeug));
  el.append(
    h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, werkstatt ? 'Umbau prüfen' : 'Gutachten prüfen'),
      h('p', { class: 'sub' }, werkstatt
        ? 'Für die Werkstatt: Gutachten öffnen, Fahrzeug eingeben – Prüfsinn sagt, was vor der Abnahme zu tun ist. Fotos als Nachweis für den Prüfer. Alles bleibt auf diesem Gerät.'
        : 'Gutachten öffnen, Fahrzeug eingeben, Auflagen abhaken. Das PDF bleibt auf diesem Gerät.'), kopfFahrzeug,
      /Einzelabnahme|§ ?21/.test(a.art || '') ? h('a', { class: 'note', href: '#/wissen/tabellen', style: { marginTop: '12px', textDecoration: 'none' } }, icon('info', 18),
        h('span', null, h('b', null, 'Einzelabnahme: '), 'Welches Verfahren (§ 13 EG-FGV oder § 21 StVZO), Nachweisliste und HU-Vermerk – nach VkBl. 2019 Nr. 177 unter Wissen → Tabellen.')) : null)),
    karteG, karteF, karteR, karteA, karteE,
    h('p', { class: 'src', style: { marginTop: '18px' } }, werkstatt
      ? 'Arbeitshilfe: Prüfsinn liest Verwendungsbereich und Auflagen automatisch aus dem Text des Gutachtens und ordnet sie Arbeitsschritten zu – ein Vorschlag. Maßgeblich ist das Gutachten im Original. Die Änderungsabnahme macht der Prüfer.'
      : 'Arbeitshilfe: Prüfsinn liest Verwendungsbereich und Auflagen automatisch aus dem Text des Gutachtens. Maßgeblich ist das Gutachten im Original – jede Auflage nennt ihre Seite. Die Entscheidung trifft der Prüfer.'));

  function speichere() {
    a = aendere(id, (x) => {
      x.gutachten = g;
      x.zb = { ...zb };
      if (zb.hsn && !x.hsn) x.hsn = zb.hsn; // auch im Auftrag, damit Formular und Befundblatt sie kennen
      if (x.status === 'offen' && g) x.status = 'laeuft';
    }) || a;
  }

  // ---------- 1. Gutachten ----------
  const dateiFeld = h('input', { type: 'file', accept: 'application/pdf,.pdf', class: 'hide', onchange: (e) => { const f = e.target.files?.[0]; e.target.value = ''; oeffne(f); } });
  el.append(dateiFeld);
  const waehleDatei = () => dateiFeld.click();

  async function oeffne(datei) {
    if (!datei) return;
    if (g && Object.keys(g.status || {}).length && !(await confirmSheet('Anderes Gutachten öffnen?', 'Die bisher abgehakten Auflagen dieses Auftrags werden verworfen.', 'Öffnen', false))) return;
    const status = h('p', { class: 'small muted' }, 'Gutachten wird gelesen …');
    let abgebrochen = false;
    const stopp = h('button', { class: 'btn small ghost hide', type: 'button', onclick: () => { abgebrochen = true; stopp.disabled = true; status.textContent = 'Wird nach dieser Seite beendet …'; } }, 'Abbrechen');
    clear(karteG).append(h('div', { class: 'gut-laden' }, h('span', { class: 'spinner' }), h('div', { class: 'grow' }, h('b', null, datei.name), status), stopp));
    const melde = (art, n, m) => {
      if (art === 'lesen') status.textContent = `Seite ${n} von ${m} gelesen …`;
      else if (art === 'ocr-laden') { status.textContent = `Eingescannt: ${m === 1 ? 'eine Seite' : m + ' Seiten'} ohne Text. Texterkennung wird geladen (beim ersten Mal rund 5 MB) …`; stopp.classList.remove('hide'); }
      else if (art === 'ocr') status.textContent = `Texterkennung: Seite ${n} von ${m} …`;
    };
    try {
      const daten = new Uint8Array(await datei.arrayBuffer());
      const seiten = await G.leseSeiten(daten, { melde, abbruch: () => abgebrochen });
      const erg = G.auswerten(seiten);
      zeilen = erg.zeilen;
      g = { datei: datei.name, gelesen: Date.now(), meta: erg.meta, textArm: erg.textArm, ocr: erg.meta.ocr || 0, ocrAbgebrochen: abgebrochen, auflagen: erg.auflagen, eintraege: erg.eintraege, wahl: { e: null, r: [] }, status: {} };
      autoWahl();
      speichere();
      alles();
      toast(erg.eintraege.length ? `${anzahl(erg.eintraege.length, 'Fahrzeugeintrag', 'Fahrzeugeinträge')} und ${anzahl(erg.auflagen.length, 'Auflage', 'Auflagen')} erkannt` : 'Gutachten gelesen');
    } catch (err) {
      console.error(err);
      const pw = err && (err.name === 'PasswordException' || /password/i.test(err.message || ''));
      clear(karteG).append(h('div', { class: 'note warn' }, icon('alert', 18), h('span', null, h('b', null, pw ? 'Das PDF ist mit einem Kennwort geschützt. ' : 'Das PDF ließ sich nicht lesen. '),
        pw ? 'Bitte eine Fassung ohne Kennwort öffnen.' : 'Ist es ein beschädigtes oder ungewöhnliches PDF? ' + (err?.message || ''))),
      h('button', { class: 'btn', style: { marginTop: '14px' }, onclick: waehleDatei }, icon('upload', 18), 'Anderes PDF wählen'));
    }
  }

  function zeichneGutachten() {
    clear(karteG);
    if (!g) {
      const flaeche = h('div', { class: 'gut-drop' },
        h('span', { class: 'ico-tile' }, icon('doc')),
        h('h2', null, 'Gutachten öffnen'),
        h('p', null, 'Teilegutachten nach § 19 (3) StVZO als PDF, zum Beispiel für Sonderräder – auch eingescannt. Die Datei bleibt auf diesem Gerät – sie wird weder hochgeladen noch gespeichert.'),
        h('button', { class: 'btn', type: 'button', onclick: waehleDatei }, icon('upload', 18), 'PDF auswählen'));
      flaeche.addEventListener('dragover', (e) => { e.preventDefault(); flaeche.classList.add('ueber'); });
      flaeche.addEventListener('dragleave', () => flaeche.classList.remove('ueber'));
      flaeche.addEventListener('drop', (e) => { e.preventDefault(); flaeche.classList.remove('ueber'); oeffne(e.dataTransfer.files?.[0]); });
      karteG.append(flaeche);
      return;
    }
    const m = g.meta || {};
    const zeilenDaten = [
      ['Gutachten', [m.art, m.nr && 'Nr. ' + m.nr].filter(Boolean).join(' · ')],
      ['Gegenstand', m.gegenstand],
      ['Rad', [m.rad, m.radtyp && 'Typ ' + m.radtyp, m.et && 'ET ' + m.et.join(' / ')].filter(Boolean).join(' · ')],
      ['Prüfstelle', [m.stelle, m.kba].filter(Boolean).join(' · ')],
      ['Datum', m.datum],
      ['Datei', `${g.datei} · ${m.seiten ? anzahl(m.seiten, 'Seite', 'Seiten') : '? Seiten'}`],
    ].filter(([, v]) => v);
    karteG.append(...[
      h('div', { class: 'card-titel' }, h('span', { class: 'schritt' }, '1'), h('h2', null, 'Gutachten'),
        h('button', { class: 'btn small ghost', type: 'button', onclick: waehleDatei }, 'Anderes')),
      h('dl', { class: 'gut-meta' }, zeilenDaten.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
      h('div', { class: 'rowx wrap', style: { marginTop: '14px', gap: '8px' } },
        h('span', { class: 'tag' }, anzahl(g.eintraege.length, 'Fahrzeugeintrag', 'Fahrzeugeinträge')), h('span', { class: 'tag' }, anzahl(g.auflagen.length, 'Auflage', 'Auflagen')),
        zeilen && h('button', { class: 'tag', type: 'button', onclick: volltext }, icon('text', 13), 'Volltext')),
      g.ocr > 0 && h('div', { class: 'note warn', style: { marginTop: '14px' } }, icon('alert', 18), h('span', null, h('b', null, `Eingescannt – ${g.ocr === 1 ? 'eine Seite' : g.ocr + ' Seiten'} per Texterkennung gelesen${g.ocrAbgebrochen ? ' (abgebrochen)' : ''}. `), 'Kürzel, Zahlen und Genehmigungsnummern besonders sorgfältig mit dem Original vergleichen.')),
      g.textArm && h('div', { class: 'note warn', style: { marginTop: '14px' } }, icon('alert', 18), h('span', null, h('b', null, 'Kaum Text gefunden. '), g.ocr ? 'Auch die Texterkennung konnte wenig lesen – ist der Scan scharf und gerade?' : 'Bitte das Gutachten im Original prüfen.')),
      !g.textArm && !g.eintraege.length && h('div', { class: 'note warn', style: { marginTop: '14px' } }, icon('alert', 18), h('span', null, h('b', null, 'Verwendungsbereich nicht als Tabelle erkannt. '), g.auflagen.length ? 'Die Auflagen lassen sich unten trotzdem einzeln abhaken.' : 'Bitte das Gutachten im Original prüfen.'))].filter(Boolean));
  }

  function volltext() {
    if (!zeilen) return;
    const seitenNr = [...new Set(zeilen.map((z) => z.seite))];
    sheet({ title: g.datei, cls: 'breit', body: h('div', { class: 'stack' }, seitenNr.map((n) => h('div', null, h('div', { class: 'xs faint', style: { marginBottom: '6px' } }, `Seite ${n}`),
      h('pre', { class: 'roh' }, G.alsLayout(zeilen.filter((z) => z.seite === n)))))) });
  }

  // ---------- 2. Fahrzeug ----------
  const trefferOrt = h('div');
  const speichereSpaeter = debounce(() => { speichere(); }, 400);
  // Feld K → Angaben der Hersteller aus den EEA-Daten (Typ, kW, Spurweite); lädt nur das passende Teilstück
  let eeaOrt = h('div');
  let eeaFuer = null;
  const zeigeEea = debounce(async () => {
    const k = String(zb.k || '').trim();
    if (k === eeaFuer) return;
    eeaFuer = k;
    clear(eeaOrt);
    if (!FD.eeaSchluessel(k)) return;
    let r;
    try { r = await FD.sucheGenehmigung(k); } catch { eeaOrt.append(h('p', { class: 'xs faint' }, 'Fahrzeugdaten der EEA nicht geladen – einmal mit Internet öffnen.')); return; }
    if (k !== String(zb.k || '').trim()) return;
    if (!r.alle.length) { eeaOrt.append(h('p', { class: 'xs faint eea-leer' }, 'Diese Genehmigung steht nicht in den EEA-Daten (dort nur Pkw mit Erstzulassung in Deutschland 2010–2025).')); rueckrufHinweis(k); return; }
    const l = r.passend;
    const typen = FD.haeufigste(l, 'typ', 3);
    const namen = FD.haeufigste(l, 'handelsname', 3);
    const kw = FD.spanne(l, 'kw'), rad = FD.spanne(l, 'radstand'), s1 = FD.spanne(l, 'spur1'), s2 = FD.spanne(l, 'spur2');
    eeaOrt.append(h('div', { class: 'eea-box' },
      h('div', { class: 'xs muted' }, 'Laut EEA-Daten zu dieser Genehmigung' + (r.nachtragGefunden ? ` (Nachtrag ${r.nachtrag})` : r.nachtrag ? ` – Nachtrag ${r.nachtrag} nicht dabei, alle Nachträge:` : '')),
      h('div', { class: 'small', style: { marginTop: '4px' } }, h('b', null, [r.marke, namen.join(', ')].filter(Boolean).join(' · ')),
        typen.length ? ` · Typ ${typen.join(', ')}` : '', kw ? ` · ${kw} kW` : ''),
      (rad || s1 || s2) && h('div', { class: 'xs muted', style: { marginTop: '2px' } }, [rad && `Radstand ${rad} mm`, s1 && `Spurweite vorn ${s1} mm`, s2 && `hinten ${s2} mm`].filter(Boolean).join(' · ')),
      h('div', { class: 'rowx wrap', style: { gap: '6px', marginTop: '8px' } },
        typen.length === 1 && !String(zb.typ || '').trim() ? h('button', { class: 'tag', type: 'button', onclick: () => { zb.typ = typen[0]; speichere(); zeichneFahrzeug(); neuBewerten(); } }, icon('check', 13), `Typ ${typen[0]} übernehmen`) : null,
        h('button', { class: 'tag', type: 'button', onclick: () => ausfuehrungen(r) }, `${l.length} ${l.length === 1 ? 'Ausführung' : 'Ausführungen'}`)),
      h('p', { class: 'xs faint', style: { marginTop: '6px' } }, `Quelle: ${r.quelle.herausgeber}, ${r.quelle.lizenz}. Herstellerangaben aus dem CO2-Monitoring – maßgeblich ist die Zulassungsbescheinigung.`)));
    rueckrufHinweis(k);
  }, 300);

  /** EU-Rückrufmeldungen (Safety Gate) zu derselben Genehmigung */
  async function rueckrufHinweis(k) {
    let r;
    try { r = await RR.zuGenehmigung(k); } catch { return; }
    if (k !== String(zb.k || '').trim() || !r.treffer.length) return;
    const n = r.treffer.length;
    eeaOrt.append(h('button', { class: 'note warn rr-hinweis', type: 'button', onclick: () => sheet({ title: 'EU-Rückrufe zur Genehmigung', cls: 'wide', body: h('div', { class: 'stack' },
      h('p', { class: 'small muted' }, `Meldungen, in denen die Genehmigung ${k.replace(/\*\d{1,3}$/, '')} genannt ist – neueste zuerst. Ob dieses Fahrzeug betroffen ist, klärt der Hersteller anhand der FIN.`),
      h('div', { class: 'list' }, r.treffer.map((x) => rueckrufZeile(x))),
      h('p', { class: 'src' }, `${r.quelle.herausgeber}, ${r.quelle.titel}. ${r.quelle.fassung}.`)) }) },
      icon('alert', 18), h('span', null, h('b', null, `${n} EU-Rückrufmeldung${n === 1 ? '' : 'en'} zu dieser Genehmigung. `), 'Antippen zum Ansehen – vor der Abnahme fragen, ob sie erledigt sind.')));
  }

  // Feld 2.1/2.2 → technische Daten des Typs aus dem KBA-Verzeichnis SV 4 (kW, Hubraum, Gesamtmasse …)
  let sv4Ort = h('div');
  let sv4Fuer = null;
  const zeigeSv4 = debounce(async () => {
    const s = String(zb.hsn || '').trim();
    const kwJetzt = String(zb.kw || '').trim();
    if (s + '|' + kwJetzt === sv4Fuer) return;
    sv4Fuer = s + '|' + kwJetzt;
    if (!FD.zerlegeSchluessel(s)) { clear(sv4Ort); return; }
    let r;
    try { r = await FD.sucheTypdaten(s); } catch { clear(sv4Ort); sv4Ort.append(h('p', { class: 'xs faint' }, 'KBA-Typverzeichnis nicht geladen – einmal mit Internet öffnen.')); return; }
    if (s !== String(zb.hsn || '').trim()) return;
    clear(sv4Ort);
    if (r.unbekannt) {
      sv4Ort.append(h('p', { class: 'xs faint eea-leer' }, r.unbekannt === 'hsn' ? `Herstellerschlüssel ${r.hsn} steht nicht im KBA-Typverzeichnis.` : `${r.hersteller}: Typschlüssel ${r.tsn} steht nicht im KBA-Typverzeichnis (Stand ${r.quelle.fassung.replace(/^Stand /, '')}).`));
      return;
    }
    const kwZb = parseInt(kwJetzt, 10);
    const abweichung = r.kw && kwZb && kwZb !== r.kw;
    sv4Ort.append(h('div', { class: 'eea-box' },
      h('div', { class: 'xs muted' }, `Laut KBA-Typverzeichnis zu ${r.hsn}/${r.tsn}`),
      h('div', { class: 'small', style: { marginTop: '4px' } }, h('b', null, [r.marke || r.hersteller, r.name].filter(Boolean).join(' · '))),
      h('div', { class: 'xs muted num', style: { marginTop: '2px' } }, FD.typdatenTeile(r).join(' · ')),
      abweichung ? h('p', { class: 'xs', style: { marginTop: '6px', color: 'var(--e)' } }, `Feld P.2 (${kwZb} kW) weicht ab: Das Verzeichnis nennt ${r.kw} kW für diesen Typschlüssel. Bitte die Zulassungsbescheinigung prüfen.`) : null,
      r.kw && !kwZb ? h('div', { class: 'rowx wrap', style: { gap: '6px', marginTop: '8px' } },
        h('button', { class: 'tag', type: 'button', onclick: () => { zb.kw = String(r.kw); speichere(); zeichneFahrzeug(); neuBewerten(); } }, icon('check', 13), `${r.kw} kW übernehmen`)) : null,
      h('p', { class: 'xs faint', style: { marginTop: '6px' } }, `Quelle: ${r.quelle.herausgeber}, SV 4 (${r.quelle.fassung}), ${r.quelle.lizenz}. Hubraum, Achsen und Gesamtmasse sind Höchstwerte des Typs – maßgeblich ist die Zulassungsbescheinigung.`)));
  }, 300);

  function ausfuehrungen(r) {
    const liste = [...r.passend].sort((x, y) => (x.kw || 0) - (y.kw || 0)).slice(0, 120);
    const s = sheet({
      title: `Ausführungen · ${r.marke || 'Genehmigung'}`,
      body: h('div', { class: 'stack-s' },
        h('p', { class: 'small muted' }, 'Antippen übernimmt Typ und Leistung in die Felder. Variante und Version stehen in der Zulassungsbescheinigung unter D.2.'),
        h('div', { class: 'list' }, liste.map((x) => h('button', { class: 'item top', type: 'button', onclick: () => {
          if (x.typ) zb.typ = x.typ;
          if (x.kw) zb.kw = String(x.kw);
          speichere(); s.close(); zeichneFahrzeug(); neuBewerten();
        } }, h('div', { class: 'grow' },
          h('div', { class: 't' }, [x.handelsname, x.kw && x.kw + ' kW', x.kraftstoff].filter(Boolean).join(' · ')),
          h('div', { class: 'd num' }, [x.typ && 'Typ ' + x.typ, x.variante && 'Variante ' + x.variante, x.nachtrag && 'Nachtrag ' + x.nachtrag, x.hubraum && x.hubraum + ' cm³'].filter(Boolean).join(' · ')),
          h('div', { class: 'xs faint num' }, [x.spur1 && `Spur ${x.spur1}${x.spur2 ? ' / ' + x.spur2 : ''} mm`, x.radstand && `Radstand ${x.radstand} mm`, `Erstzulassung ${x.von === x.bis ? x.von : x.von + '–' + x.bis}`].filter(Boolean).join(' · ')))))),
        r.passend.length > liste.length ? h('p', { class: 'xs faint' }, `Die ersten ${liste.length} von ${r.passend.length} – mit Nachtrag im Feld K wird die Liste kürzer.`) : null),
    });
  }

  function zeichneFahrzeug() {
    clear(karteF);
    if (!g) { karteF.classList.add('hide'); return; }
    karteF.classList.remove('hide');
    eeaOrt = h('div', { class: 'voll' });
    eeaFuer = null;
    sv4Ort = h('div', { class: 'voll' });
    sv4Fuer = null;
    const felder = ZB.map(([k, l, ph, attrs, breite]) => {
      const inp = h('input', { class: 'input', value: zb[k] || '', placeholder: ph, autocomplete: 'off', ...attrs,
        oninput: (e) => { zb[k] = e.target.value; neuBewerten(); speichereSpaeter(); if (k === 'k') zeigeEea(); if (k === 'hsn' || k === 'kw') zeigeSv4(); } });
      const f = field(l, inp);
      if (breite) f.classList.add('voll');
      return k === 'k' ? [f, eeaOrt] : k === 'hsn' ? [f, sv4Ort] : f;
    }).flat();
    karteF.append(
      h('div', { class: 'card-titel' }, h('span', { class: 'schritt' }, '2'), h('h2', null, 'Fahrzeug')),
      h('p', { class: 'small muted' }, 'Werte aus der Zulassungsbescheinigung Teil I. Prüfsinn sucht damit den passenden Eintrag im Verwendungsbereich.'),
      h('div', { class: 'gut-felder' }, felder),
      trefferOrt);
    zeichneTreffer();
    zeigeEea();
    zeigeSv4();
  }

  const neuBewerten = debounce(() => {
    if (!g) return;
    if (!g.wahl?.manuell) { autoWahl(); zeichneReifen(); zeichneAuflagen(); zeichneErgebnis(); }
    else { zeichneReifen(); zeichneAuflagen(); }
    zeichneTreffer();
  }, 200);

  const hatAngaben = () => ['k', 'typ', 'kw', 'reifen'].some((k) => String(zb[k] || '').trim());

  /** Ohne Zutun des Prüfers den klar besten Eintrag wählen. */
  function autoWahl() {
    if (!g || !g.eintraege.length || !hatAngaben()) return;
    const r = G.suche(g, zb);
    const best = r[0];
    const zweit = r[1];
    if (best && best.punkte >= 6 && (!zweit || best.punkte > zweit.punkte) && best.kwOk !== false) {
      const reifen = best.reifen >= 0 ? [best.reifen] : (g.wahl?.e === best.e.n ? g.wahl.r : []);
      if (g.wahl?.e !== best.e.n || String(g.wahl.r) !== String(reifen)) g.wahl = { e: best.e.n, r: reifen, manuell: false };
    }
  }

  function waehleEintrag(n, reifen) {
    g.wahl = { e: n, r: reifen >= 0 ? [reifen] : [], manuell: true };
    speichere();
    zeichneTreffer(); zeichneReifen(); zeichneAuflagen(); zeichneErgebnis();
    karteR.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function trefferKnopf(x) {
    const e = x.e;
    const gewaehlt = g.wahl?.e === e.n;
    return h('button', { class: 'item gut-eintrag', type: 'button', 'aria-pressed': String(gewaehlt), onclick: () => waehleEintrag(e.n, x.reifen) },
      h('span', { class: 'wahl' }, gewaehlt ? icon('check', 16) : null),
      h('div', { class: 'grow' },
        h('div', { class: 't' }, titel(e)),
        h('div', { class: 'd' }, [e.typ && 'Typ ' + e.typ, e.eg, e.kw && e.kw + ' kW'].filter(Boolean).join(' · ')),
        x.merkmale.length ? h('div', { class: 'merkmale' }, x.merkmale.map((mk) => h('span', { class: 'merk ' + (mk.gut ? 'gut' : 'schlecht') }, icon(mk.gut ? 'check' : 'x', 12), mk.text))) : null),
      h('span', { class: 'xs faint', style: { flex: 'none' } }, 'S. ' + e.seite));
  }

  function zeichneTreffer() {
    clear(trefferOrt);
    if (!g) return;
    if (!g.eintraege.length) {
      trefferOrt.append(h('button', { class: 'btn tonal block', style: { marginTop: '16px' }, onclick: () => { g.wahl = { e: -1, r: [], manuell: true }; speichere(); zeichneReifen(); zeichneAuflagen(); zeichneErgebnis(); } },
        icon('listcheck', 18), `Alle ${g.auflagen.length} Auflagen abhaken`));
      return;
    }
    const r = G.suche(g, zb);
    const mitAngaben = hatAngaben();
    const best = r[0];
    let zeigen = r;
    if (!alleZeigen) zeigen = mitAngaben ? r.filter((x, i) => i < 3 && x.punkte > 0) : (r.length <= 5 ? r : []);
    // gewählter Eintrag bleibt immer sichtbar
    if (g.wahl?.e >= 0 && !zeigen.some((x) => x.e.n === g.wahl.e)) { const w = r.find((x) => x.e.n === g.wahl.e); if (w) zeigen = [w, ...zeigen]; }
    trefferOrt.append(h('div', { class: 'section-title', style: { margin: '22px 2px 10px' } }, h('h3', null, mitAngaben ? 'Passende Einträge' : 'Verwendungsbereich'), h('span', { class: 'xs faint' }, `${anzahl(g.eintraege.length, 'Eintrag', 'Einträge')} im Gutachten`)));
    if (mitAngaben && (!best || best.punkte < 6)) {
      trefferOrt.append(h('div', { class: 'note warn', style: { marginBottom: '12px' } }, icon('alert', 18), h('span', null, h('b', null, 'Kein Eintrag passt eindeutig. '), 'Genehmigung und Typ prüfen – oder das Fahrzeug steht nicht im Verwendungsbereich.')));
    } else if (mitAngaben && best && best.kwOk === false) {
      trefferOrt.append(h('div', { class: 'note warn', style: { marginBottom: '12px' } }, icon('alert', 18), h('span', null, h('b', null, 'Leistung außerhalb des Bereichs. '), `${zb.kw} kW stehen beim besten Eintrag nicht im Gutachten.`)));
    }
    if (zeigen.length) trefferOrt.append(h('div', { class: 'list' }, zeigen.map(trefferKnopf)));
    else if (!mitAngaben) trefferOrt.append(h('p', { class: 'small muted' }, 'Noch keine Angaben – oder den Eintrag selbst aus der Liste wählen.'));
    if (!mitAngaben && zeigen.length) trefferOrt.querySelector('.section-title').after(h('p', { class: 'small muted', style: { marginBottom: '10px' } }, 'Werte oben eintragen – oder den Eintrag direkt antippen.'));
    trefferOrt.append(h('div', { class: 'rowx wrap', style: { marginTop: '10px', gap: '8px' } },
      g.eintraege.length > 5 && h('button', { class: 'btn small ghost', type: 'button', onclick: () => { alleZeigen = !alleZeigen; zeichneTreffer(); } }, alleZeigen ? 'Weniger zeigen' : `Alle ${g.eintraege.length} Einträge zeigen`),
      g.wahl?.e !== -1 && h('button', { class: 'btn small ghost', type: 'button', onclick: () => { g.wahl = { e: -1, r: [], manuell: true }; speichere(); zeichneTreffer(); zeichneReifen(); zeichneAuflagen(); zeichneErgebnis(); } }, 'Ohne Zuordnung abhaken')));
  }

  // ---------- 3. Rad und Reifen ----------
  function zeichneReifen() {
    clear(karteR);
    const e = g?.eintraege[g.wahl?.e];
    if (!e) { karteR.classList.add('hide'); return; }
    karteR.classList.remove('hide');
    const kw = Number(String(zb.kw).replace(',', '.')) || 0;
    const mehrereKw = new Set(e.reifen.map((r) => r.kw).filter(Boolean)).size > 1;
    const chips = e.reifen.map((r, i) => {
      const an = (g.wahl.r || []).includes(i);
      const kwFalsch = kw && r.kw && G.kwPasst(r.kw, kw) === false;
      const achse = achseVon(g, r);
      return h('button', { class: 'chip reifen-chip', type: 'button', 'aria-pressed': String(an), onclick: () => {
        const liste = new Set(g.wahl.r || []);
        liste.has(i) ? liste.delete(i) : liste.add(i);
        g.wahl = { ...g.wahl, r: [...liste].sort((x, y) => x - y), manuell: true };
        speichere(); zeichneReifen(); zeichneAuflagen(); zeichneErgebnis();
      } }, h('b', null, r.g), r.li && h('span', { class: 'cnt' }, r.li), achse ? h('span', { class: 'cnt' }, `Achse ${achse}`) : null,
        (mehrereKw || kwFalsch) && r.kw ? h('span', { class: 'cnt' + (kwFalsch ? ' falsch' : '') }, `${r.kw} kW`) : null,
        r.codes.includes('M+S') ? h('span', { class: 'cnt' }, 'M+S') : null);
    });
    karteR.append(
      h('div', { class: 'card-titel' }, h('span', { class: 'schritt' }, '3'), h('h2', null, 'Rad und Reifen'),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => sheet({ title: `Verwendungsbereich · Seite ${e.seite}`, cls: 'breit', body: h('div', { class: 'stack' }, h('p', { class: 'small muted' }, titel(e)), h('pre', { class: 'roh' }, e.roh)) }) }, 'Original')),
      h('p', { class: 'small' }, h('b', null, titel(e)), h('span', { class: 'muted' }, ' · ', [e.typ && 'Typ ' + e.typ, e.kw && e.kw + ' kW'].filter(Boolean).join(' · '))),
      h('p', { class: 'small muted', style: { marginTop: '6px' } }, 'Montierte Reifengröße wählen – bei Mischbereifung beide.'),
      h('div', { class: 'chips wrap', style: { marginTop: '12px' } }, chips));
  }

  // ---------- 4. Auflagen ----------
  const fortschritt = h('div', { class: 'gut-fortschritt' });
  function zeichneFortschritt() {
    const z = stand({ gutachten: g });
    clear(fortschritt);
    if (!z || !z.gesamt) return;
    const geprueft = z.gesamt - z.offen;
    fortschritt.append(h('div', { class: 'balken' }, h('i', { style: { width: `${Math.round((geprueft / z.gesamt) * 100)}%` } })),
      h('span', { class: 'xs muted num' }, `${geprueft} von ${z.gesamt} ${werkstatt ? 'erledigt' : 'geprüft'}`, z.nein ? ` · ${z.nein} ${werkstatt ? 'geht nicht' : 'nicht erfüllt'}` : ''));
  }

  function hinweisZu(p) {
    const out = [];
    const text = p.text || '';
    // Achslast-Grenze gegen Feld 8.1 / 8.2
    const r = p.reifenListe[0];
    const achse = r ? achseVon(g, r) : 0;
    const a1 = achse === 2 ? '' : zb.a1;
    const a2 = achse === 1 ? '' : zb.a2;
    const al = G.achslastPruefung(text, a1, a2);
    if (al) {
      if (al.ok == null) out.push(h('div', { class: 'gut-hinweis' }, icon('weight', 14), `Grenze ${al.grenze} kg – Achslast oben eintragen, dann prüft Prüfsinn mit.`));
      else out.push(h('div', { class: 'gut-hinweis ' + (al.ok ? 'gut' : 'schlecht') }, icon(al.ok ? 'check' : 'alert', 14),
        `${al.ok ? 'Passt' : 'Passt nicht'}: ${al.max} kg ${al.ok ? '≤' : '>'} ${al.grenze} kg${achse ? ` (Achse ${achse})` : ''} laut Feld ${achse === 1 ? '8.1' : achse === 2 ? '8.2' : '8.1/8.2'}`));
    }
    const rechner = G.rechnerZu(text);
    if (rechner) out.push(h('a', { class: 'tag', href: '#/rechner/' + rechner.id }, icon('calc', 13), rechner.titel));
    return out;
  }

  function auflageKarte(p) {
    let st = g.status?.[p.key] || null;
    const knoepfe = STATUS.map(([v, l]) => h('button', { type: 'button', class: 'st st-' + v, 'aria-pressed': String(st === v), onclick: () => setze(st === v ? null : v) }, l));
    const karte = h('div', { class: 'auflage' + (st ? ' ist-' + st : '') });
    function setze(v) {
      st = v;
      g.status = { ...(g.status || {}) };
      if (v) g.status[p.key] = v; else delete g.status[p.key];
      speichere();
      // Knöpfe bleiben stehen (Safari mag es nicht, wenn ein Knopf während seines Klicks ersetzt wird)
      knoepfe.forEach((b, i) => b.setAttribute('aria-pressed', String(STATUS[i][0] === v)));
      karte.className = 'auflage' + (v ? ' ist-' + v : '');
      zeichneFortschritt();
      zeichneErgebnis();
    }
    // Fotos und Notiz zur Auflage (bleiben im Gerät; die Fotos in IndexedDB)
    const praefix = `${id}/${p.key}/`;
    const fotoOrt = h('div', { class: 'fotos' });
    const zeigeFotos = async () => {
      let liste = [];
      try { liste = await fotosMit(praefix); } catch { return; }
      clear(fotoOrt);
      for (const f of liste) {
        const url = URL.createObjectURL(f.blob);
        urls.push(url);
        fotoOrt.append(h('button', { class: 'foto', type: 'button', 'aria-label': 'Foto ansehen', onclick: () => {
          const s = sheet({ title: `Foto · ${p.code === '!' ? 'Hinweis' : p.code}`, body: h('img', { src: url, alt: '', class: 'foto-gross' }),
            footer: [h('button', { class: 'btn danger', onclick: async () => { await loescheFoto(f.schluessel); s.close(); zeigeFotos(); } }, icon('trash', 18), 'Löschen'),
              h('button', { class: 'btn', onclick: () => s.close() }, 'Schließen')] });
        } }, h('img', { src: url, alt: '' })));
      }
    };
    const fotoFeld = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hide', onchange: async (ev) => {
      const dateien = [...(ev.target.files || [])];
      ev.target.value = '';
      for (const d of dateien) {
        try { await speichereFoto(praefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), await verkleinere(d)); }
        catch (err) { toast('Foto nicht gespeichert: ' + (err?.message || err)); }
      }
      zeigeFotos();
    } });
    let notizT = g.notizen?.[p.key] || '';
    const notizFeld = h('textarea', { class: 'textarea notiz' + (notizT ? '' : ' hide'), rows: 2, placeholder: werkstatt ? 'Was wurde gemacht? z. B. Radhauskante hinten bördelt' : 'Notiz zur Auflage', value: notizT });
    notizFeld.addEventListener('input', debounce(() => { g.notizen = { ...(g.notizen || {}), [p.key]: notizFeld.value.trim() }; if (!g.notizen[p.key]) delete g.notizen[p.key]; speichere(); }, 300));
    const extra = h('div', { class: 'auflage-extra' },
      h('button', { class: 'tag', type: 'button', onclick: () => fotoFeld.click() }, icon('kamera', 13), 'Foto'),
      h('button', { class: 'tag', type: 'button', onclick: () => { notizFeld.classList.remove('hide'); notizFeld.focus(); } }, icon('edit', 13), 'Notiz'),
      fotoFeld);
    zeigeFotos();
    const textEl = h('div', { class: 'auflage-text' + ((p.text || '').length > 240 ? ' zu' : '') }, p.text || 'Zu diesem Kürzel steht im Gutachten keine Erklärung, die Prüfsinn lesen konnte – bitte im Original nachsehen.');
    if (textEl.classList.contains('zu')) textEl.addEventListener('click', () => textEl.classList.toggle('zu'));
    karte.append(
      h('div', { class: 'auflage-kopf' },
        h('span', { class: 'code' + (p.code.length > 4 ? ' lang' : '') }, p.code === '!' ? icon('alert', 14) : p.code),
        h('div', { class: 'grow' },
          textEl,
          h('div', { class: 'auflage-fuss' },
            p.gelesen ? h('span', { class: 'xs', style: { color: 'var(--g)' } }, `im Scan gelesen als „${p.gelesen}“`) : null,
            p.reifenListe.length ? h('span', { class: 'xs faint' }, p.reifenListe.map((r) => r.g).join(', ')) : null,
            p.seite ? h('span', { class: 'xs faint' }, 'Seite ' + p.seite) : null),
          hinweisZu(p),
          extra, notizFeld, fotoOrt)),
      h('div', { class: 'auflage-status', role: 'group', 'aria-label': 'Prüfergebnis ' + p.code }, knoepfe));
    return karte;
  }

  function zeichneAuflagen() {
    clear(karteA);
    const liste = g ? punkte(g) : [];
    if (!g || (!liste.length && g.wahl?.e == null)) { karteA.classList.add('hide'); return; }
    karteA.classList.remove('hide');
    const e = g.eintraege[g.wahl?.e];
    zeichneFortschritt();
    karteA.append(h('div', { class: 'card-titel lose' }, h('span', { class: 'schritt' }, '4'), h('h2', null, werkstatt ? 'Was zu tun ist' : 'Auflagen'), fortschritt));
    if (e && !(g.wahl.r || []).length) karteA.append(h('div', { class: 'note', style: { marginBottom: '12px' } }, icon('info', 18), h('span', null, 'Noch keine Reifengröße gewählt – die Auflagen zum Reifen fehlen unten noch.')));
    for (const gr of gruppiere(liste)) {
      karteA.append(...[h('div', { class: 'section-title', style: { margin: '18px 2px 10px' } }, h('h3', null, gr.titel), h('span', { class: 'xs faint' }, gr.punkte.length)),
        gr.hinweis && h('p', { class: 'xs muted', style: { margin: '-4px 2px 10px' } }, gr.hinweis),
        h('div', { class: 'stack-s' }, gr.punkte.map(auflageKarte))].filter(Boolean));
    }
  }

  /** Prüfer: nach „Zum Reifen / Zum Fahrzeug“; Werkstatt: nach Arbeitsschritten */
  function gruppiere(liste) {
    if (!werkstatt) return [...new Set(liste.map((p) => p.gruppe))].map((t) => ({ titel: t, punkte: liste.filter((p) => p.gruppe === t) }));
    return G.WERKSTATT_GRUPPEN.map((gr) => ({
      ...gr,
      hinweis: gr.id === 'kunde' ? 'Kein Arbeitsschritt – dem Kunden mitteilen (steht auch im Nachweis).' : gr.id === 'abnahme' ? 'Nachweise und Vorführung beim Prüfer.' : '',
      punkte: liste.filter((p) => G.werkstattGruppe(p) === gr.id),
    })).filter((gr) => gr.punkte.length);
  }

  async function pdfErstellen() {
    const liste = punkte(g);
    const fotos = new Map();
    for (const p of liste) {
      let fs = [];
      try { fs = await fotosMit(`${id}/${p.key}/`); } catch { /* ohne Fotos */ }
      const bilder = [];
      for (const f of fs) {
        const daten = new Uint8Array(await f.blob.arrayBuffer());
        const gr = jpegGroesse(daten);
        if (gr) bilder.push({ daten, ...gr });
      }
      if (bilder.length) fotos.set(p.key, bilder);
    }
    const e = g.eintraege[g.wahl?.e];
    const rs = e ? (g.wahl.r || []).map((i) => e.reifen[i]).filter(Boolean) : [];
    // Kundenhinweise stehen beim Umbau gesammelt am Ende des Nachweises, nicht noch einmal als Arbeitsschritt
    const gruppen = gruppiere(liste).filter((gr) => !werkstatt || gr.id !== 'kunde').map((gr) => ({ titel: gr.titel, punkte: gr.punkte.map((p) => ({
      key: p.key, code: p.code === '!' ? 'Hinweis' : p.code, text: p.text, seite: p.seite, status: g.status?.[p.key], notiz: g.notizen?.[p.key],
      reifen: p.reifenListe.map((r) => r.g).join(', '),
    })) }));
    const blob = nachweisPdf(hole(id), g, zb, gruppen, fotos, {
      werkstatt,
      betrieb: store.get('einstellungen', {}).betrieb || '',
      eintrag: e ? `${titel(e)}${e.typ ? ', Typ ' + e.typ : ''}${e.kw ? ', ' + e.kw + ' kW' : ''} (Seite ${e.seite})` : (g.wahl?.e === -1 ? 'ohne Zuordnung' : ''),
      reifen: rs.map((r) => r.g + (r.li ? ' ' + r.li : '')).join(' / '),
      kunde: werkstatt ? liste.filter((p) => G.werkstattGruppe(p) === 'kunde').map((p) => p.text) : [],
    });
    await teileDatei(blob, nachweisDateiname(hole(id), werkstatt));
  }

  // ---------- 5. Ergebnis ----------
  function zeichneErgebnis() {
    if (werkstatt) return zeichneErgebnisWerkstatt();
    clear(karteE);
    const z = g ? stand({ gutachten: g }) : null;
    if (!z || !z.gesamt) { karteE.classList.add('hide'); return; }
    karteE.classList.remove('hide');
    const fertig = z.offen === 0;
    const text = () => zusammenfassung(hole(id), g, zb);
    karteE.append(
      h('div', { class: 'card-titel' }, h('span', { class: 'schritt' }, '5'), h('h2', null, 'Ergebnis')),
      z.nein ? h('div', { class: 'note warn' }, icon('alert', 18), h('span', null, h('b', null, `${z.nein} ${z.nein === 1 ? 'Auflage' : 'Auflagen'} nicht erfüllt. `), 'So ist die Änderung nicht abnahmefähig.'))
        : fertig ? h('div', { class: 'note gut' }, icon('check', 18), h('span', null, h('b', null, 'Alle Auflagen geprüft. '), `${z.ok} erfüllt${z.na ? `, ${z.na} entfallen` : ''}.`))
          : h('p', { class: 'small muted' }, `${z.offen} von ${z.gesamt} Punkten sind noch offen.`),
      h('div', { class: 'grid2', style: { marginTop: '14px' } },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => copyText(text(), 'Zusammenfassung kopiert') }, icon('copy', 18), 'Kopieren'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => shareText('Abnahme ' + (a.kennzeichen || ''), text()) }, icon('share', 18), 'Teilen')),
      h('button', { class: 'btn ghost block', type: 'button', style: { marginTop: '10px' }, onclick: pdfErstellen }, icon('download', 18), 'Checkliste als PDF (mit Fotos)'),
      h('button', { class: 'btn block', type: 'button', style: { marginTop: '10px' }, disabled: !fertig || null, onclick: () => {
        aendere(id, (x) => { x.status = 'fertig'; });
        toast('Abnahme abgeschlossen', { action: 'Zum Auftrag', onAction: () => { location.hash = '#/auftraege/' + id; } });
      } }, icon('check', 18), 'Abnahme abschließen'));
  }

  function zeichneErgebnisWerkstatt() {
    clear(karteE);
    const liste = g ? punkte(g) : [];
    if (!liste.length) { karteE.classList.add('hide'); return; }
    karteE.classList.remove('hide');
    const sperrt = new Set(G.WERKSTATT_GRUPPEN.filter((x) => x.sperrt).map((x) => x.id));
    const wichtig = liste.filter((p) => sperrt.has(G.werkstattGruppe(p)));
    const offen = wichtig.filter((p) => !g.status?.[p.key]);
    const geht = wichtig.filter((p) => g.status?.[p.key] === 'nein');
    const kunde = liste.filter((p) => G.werkstattGruppe(p) === 'kunde');
    const bereit = !offen.length && !geht.length;
    const text = () => zusammenfassung(hole(id), g, zb);
    karteE.append(
      h('div', { class: 'card-titel' }, h('span', { class: 'schritt' }, '5'), h('h2', null, 'Bereit zur Abnahme?')),
      geht.length ? h('div', { class: 'note warn' }, icon('alert', 18), h('span', null, h('b', null, `${geht.length} ${geht.length === 1 ? 'Punkt geht' : 'Punkte gehen'} nicht. `), 'So ist der Umbau nach diesem Gutachten nicht abnahmefähig – Teile, Reifengröße oder Gutachten prüfen.'))
        : bereit ? h('div', { class: 'note gut' }, icon('check', 18), h('span', null, h('b', null, 'Bereit zur Abnahme. '), 'Alle Arbeitsschritte erledigt oder entfallen. Nachweis mit Fotos für den Prüfer erstellen und dem Kunden mitgeben.'))
          : h('p', { class: 'small muted' }, `Noch ${offen.length} von ${wichtig.length} Arbeitsschritten offen.`),
      h('button', { class: 'btn block', type: 'button', style: { marginTop: '14px' }, onclick: pdfErstellen }, icon('download', 18), 'Nachweis als PDF'),
      h('p', { class: 'xs muted', style: { margin: '8px 2px 0' } }, 'Für den Prüfer: Fahrzeug, Gutachten, alle Arbeitsschritte mit Status, Notizen und Fotos.'),
      h('div', { class: 'grid2 eng', style: { marginTop: '10px' } },
        kunde.length ? h('button', { class: 'btn ghost', type: 'button', onclick: () => shareText('Hinweise zu Ihren neuen Rädern', 'Hinweise aus dem Gutachten zu Ihrem Umbau:\n\n' + kunde.map((p) => '• ' + p.text).join('\n\n')) }, icon('share', 18), 'Kundeninfo') : null,
        h('button', { class: 'btn ghost', type: 'button', onclick: () => copyText(text(), 'Zusammenfassung kopiert') }, icon('copy', 18), 'Kopieren')),
      h('button', { class: 'btn ghost block', type: 'button', style: { marginTop: '10px' }, disabled: !bereit || null, onclick: () => {
        aendere(id, (x) => { x.status = 'fertig'; });
        toast('Umbau fertig – bereit zur Abnahme', { action: 'Zum Auftrag', onAction: () => { location.hash = '#/auftraege/' + id; } });
      } }, icon('check', 18), 'Umbau fertig'));
  }

  function alles() { zeichneGutachten(); zeichneFahrzeug(); zeichneReifen(); zeichneAuflagen(); zeichneErgebnis(); }
  alles();
  window.__pkGutachten = (datei) => oeffne(datei); // nur für Tests: Datei ohne Auswahldialog öffnen
  // Demo: Muster-Teilegutachten (frei erfunden, assets/demo/) beim ersten Öffnen selbst laden
  if (a.demo && !g) {
    fetch(new URL('../../assets/demo/Beispiel-Teilegutachten.pdf', import.meta.url)).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then((b) => oeffne(new File([b], 'Beispiel-Teilegutachten.pdf', { type: 'application/pdf' })))
      .catch((e) => toast('Muster-Gutachten nicht geladen: ' + e.message));
  }
  if (probe && /^\/quellen\/gutachten\/[^/]+\.pdf$/i.test(probe)) {
    // &eintrag=0 wählt zusätzlich den ersten Fahrzeugeintrag (Simulator: Tippen ist dort unzuverlässig)
    const nr = new URLSearchParams(location.hash.split('?')[1] || '').get('eintrag');
    fetch(probe).then((r) => r.blob()).then(async (b) => {
      g = null;
      await oeffne(new File([b], probe.split('/').pop(), { type: 'application/pdf' }));
      if (nr !== null && g?.eintraege?.[+nr]) waehleEintrag(+nr);
    }).catch((e) => toast('Test-PDF nicht geladen: ' + e.message));
  }
  return () => { delete window.__pkGutachten; urls.forEach((u) => URL.revokeObjectURL(u)); };
}
