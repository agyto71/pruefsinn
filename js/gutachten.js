// Prüfsinn – Gutachten-Assistent: Teilegutachten (vor allem für Sonderräder) lesen und auswerten.
//
// Ablauf: PDF-Text mit pdf.js holen → Zeilen und Spalten wiederherstellen → Seitenköpfe erkennen →
// Auflagen-Verzeichnis (Kürzel → Text) und Verwendungsbereich (Fahrzeug, kW, Reifen, Auflagen) herauslesen →
// zum Fahrzeug aus der Zulassungsbescheinigung passende Einträge suchen.
//
// Alles läuft im Gerät, das PDF wird nirgendwohin gesendet. Erprobt an Rädergutachten in drei Bauarten
// (Typprüfstelle Lambsheim, TÜV Nord/IFM, TÜV Austria). Was die Auswertung nicht sicher erkennt, bleibt sichtbar:
// Die Oberfläche zeigt zu jedem Eintrag die Originalzeilen und die Seite, der Prüfer entscheidet.

const PDFJS = new URL('../vendor/pdfjs/pdf.min.js', import.meta.url).href;
const WORKER = new URL('../vendor/pdfjs/pdf.worker.min.js', import.meta.url).href;
let lib = null;
async function pdfjs() {
  if (!lib) {
    lib = await import(PDFJS);
    lib.GlobalWorkerOptions.workerSrc = WORKER;
  }
  return lib;
}

// Texterkennung für eingescannte Gutachten: Tesseract.js 5.1.1 (Apache 2.0), deutsche Sprachdaten (tessdata best_int).
// Wird erst geladen, wenn eine Seite keinen Text hat; läuft im Gerät.
const TESS = new URL('../vendor/tesseract/', import.meta.url).href;

// ---------- 1. Text mit Lage holen ----------

const textMenge = (items) => items.reduce((n, it) => n + it.s.trim().length, 0);

/**
 * Liest alle Seiten. Ergebnis: [{ nr, b, hoehe, items: [{ s, x, y, w, h }], ocr? }] mit y von oben (Grundlinie).
 * Seiten ohne Text (Scans) laufen durch die Texterkennung, wenn texterkennung nicht false ist.
 * melde(art, n, m): 'lesen' | 'ocr-laden' | 'ocr' – für die Fortschrittsanzeige. abbruch(): true beendet die Texterkennung.
 */
export async function leseSeiten(daten, { fortschritt, melde, abbruch, texterkennung = true } = {}) {
  const L = await pdfjs();
  const doc = await L.getDocument({ data: daten, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 }).promise;
  const seiten = [];
  let ocr = null;
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      const items = [];
      for (const it of tc.items) {
        if (!it.str || !it.str.trim()) continue;
        const m = L.Util.transform(vp.transform, it.transform);
        // nur waagrechter Text (so, wie die Seite angezeigt wird)
        if (Math.abs(m[1]) > 0.01 && Math.abs(m[1]) > Math.abs(m[0]) * 0.3) continue;
        const groesse = Math.hypot(m[2], m[3]) || 8;
        items.push({ s: it.str, x: m[4], y: m[5], w: it.width, h: groesse });
      }
      seiten.push({ nr: n, b: vp.width, hoehe: vp.height, items });
      page.cleanup();
      fortschritt?.(n, doc.numPages);
      melde?.('lesen', n, doc.numPages);
    }
    // Eingescannte Seiten: Bild rendern und Text erkennen
    const leer = seiten.filter((s) => textMenge(s.items) < 40);
    if (leer.length && texterkennung && typeof document !== 'undefined') {
      melde?.('ocr-laden', 0, leer.length);
      ocr = await starteTexterkennung();
      for (let i = 0; i < leer.length; i++) {
        if (abbruch?.()) break;
        const s = leer[i];
        melde?.('ocr', i + 1, leer.length);
        const page = await doc.getPage(s.nr);
        const skala = Math.min(3.5, 2100 / page.getViewport({ scale: 1 }).width); // rund 250 dpi bei A4
        const vp = page.getViewport({ scale: skala });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(vp.width);
        canvas.height = Math.ceil(vp.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // intent 'print': zeichnet ohne requestAnimationFrame – sonst bleibt es stehen, solange die Seite im Hintergrund ist
        await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
        const winkel = schraeglage(ctx, canvas.width, canvas.height);
        if (Math.abs(winkel) >= 0.1) dreheZurueck(canvas, ctx, winkel);
        entferneLinien(ctx, canvas.width, canvas.height);
        const { data } = await ocr.recognize(canvas, {}, { blocks: true, text: false });
        s.schraeg = Math.round(winkel * 10) / 10;
        s.items = ausTexterkennung(data, skala);
        s.ocr = true;
        canvas.width = canvas.height = 0; // Speicher auf dem Handy sofort freigeben
        page.cleanup();
      }
    }
  } finally {
    if (ocr) await ocr.terminate().catch(() => {});
    await doc.destroy();
  }
  return seiten;
}

async function starteTexterkennung() {
  const T = (await import(TESS + 'tesseract.esm.min.js')).default;
  const w = await T.createWorker('deu', 1, {
    workerPath: TESS + 'worker.min.js',
    corePath: TESS + 'tesseract-core-simd-lstm.wasm.js',
    langPath: TESS.replace(/\/$/, ''),
    gzip: true,
    cacheMethod: 'none', // die Dateien hält der Service Worker
    workerBlobURL: false,
  });
  await w.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '250' });
  return w;
}

/**
 * Schräglage eines Scans in Grad schätzen (Projektionsprofil): Unter dem richtigen Winkel liegen die dunklen Punkte
 * einer Textzeile in wenigen Bildzeilen – die Summe der Quadrate des Zeilenprofils wird am größten.
 */
function schraeglage(ctx, w, h) {
  const f = 4; // auf ein Viertel verkleinert rechnen
  const d = ctx.getImageData(0, 0, w, h).data;
  const pkt = [];
  for (let y = 0; y < h; y += f) for (let x = 0; x < w; x += f) {
    const i = (y * w + x) * 4;
    if (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 128) pkt.push(x / f, y / f);
  }
  if (pkt.length < 200) return 0;
  const hk = Math.ceil(h / f) + Math.ceil(w / f);
  let besterWinkel = 0, besterWert = -1;
  for (let g = -2; g <= 2.0001; g += 0.1) {
    const r = (g * Math.PI) / 180, sin = Math.sin(r), cos = Math.cos(r);
    const prof = new Float64Array(hk);
    for (let k = 0; k < pkt.length; k += 2) {
      const yy = Math.round(pkt[k + 1] * cos - pkt[k] * sin) + Math.ceil(w / f);
      if (yy >= 0 && yy < hk) prof[yy]++;
    }
    let wert = 0;
    for (let k = 0; k < hk; k++) wert += prof[k] * prof[k];
    if (wert > besterWert) { besterWert = wert; besterWinkel = g; }
  }
  return besterWinkel;
}

/** Bild um den geschätzten Winkel zurückdrehen (weißer Rand). */
function dreheZurueck(canvas, ctx, grad) {
  const kopie = document.createElement('canvas');
  kopie.width = canvas.width;
  kopie.height = canvas.height;
  kopie.getContext('2d').drawImage(canvas, 0, 0);
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((-grad * Math.PI) / 180);
  ctx.drawImage(kopie, -canvas.width / 2, -canvas.height / 2);
  ctx.restore();
  kopie.width = kopie.height = 0;
}

/**
 * Tabellenlinien aus dem Bild entfernen. In Gutachten stehen Zellen oft direkt an der Linie; die Texterkennung
 * verschluckt dann den ersten Buchstaben („215/50R17“ → „15/50R17“). Lange dunkle Läufe (waagrecht oder senkrecht,
 * länger als 4 % der Seite) werden weiß – Buchstaben sind viel kürzer und bleiben stehen.
 */
function entferneLinien(ctx, w, h) {
  const bild = ctx.getImageData(0, 0, w, h);
  const d = bild.data;
  const n = w * h;
  const dunkel = new Uint8Array(n);
  for (let i = 0, j = 0; j < n; i += 4, j++) dunkel[j] = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 190 ? 1 : 0;
  const weg = new Uint8Array(n);
  const lang = Math.round(Math.min(w, h) * 0.04);
  for (let y = 0; y < h; y++) {
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const an = x < w && dunkel[y * w + x];
      if (an && start < 0) start = x;
      else if (!an && start >= 0) {
        // Linie samt der grauen Kanten darüber und darunter (gedrehte Scans sind weichgezeichnet)
        if (x - start >= lang) for (let k = start; k < x; k++) { weg[y * w + k] = 1; if (y > 0) weg[(y - 1) * w + k] = 1; if (y < h - 1) weg[(y + 1) * w + k] = 1; }
        start = -1;
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let start = -1;
    for (let y = 0; y <= h; y++) {
      const an = y < h && dunkel[y * w + x];
      if (an && start < 0) start = y;
      else if (!an && start >= 0) {
        if (y - start >= lang) for (let k = start; k < y; k++) { weg[k * w + x] = 1; if (x > 0) weg[k * w + x - 1] = 1; if (x < w - 1) weg[k * w + x + 1] = 1; }
        start = -1;
      }
    }
  }
  for (let j = 0; j < n; j++) if (weg[j]) { const i = j * 4; d[i] = d[i + 1] = d[i + 2] = 255; }
  ctx.putImageData(bild, 0, 0);
}

/** Typische Verwechslungen in Kürzeln: „AO2“ → „A02“, „SOl“ → „S01“ (nur, wenn schon eine Ziffer drin ist). */
export function ocrKorrektur(s) {
  const m = /^([A-Z]{1,3}?)([0-9OIl]{1,3})([a-z]?\)?[;,.:]?)$/.exec(s);
  if (m && /\d/.test(m[2])) return m[1] + m[2].replace(/O/g, '0').replace(/[Il]/g, '1') + m[3];
  // Nummern mit Bindestrich („99-0852-A34-VO3“): O neben Ziffern ist eine Null
  if (/^[A-Z0-9][A-Z0-9\-/.]{5,}$/.test(s) && /\d/.test(s) && /-/.test(s)) return s.replace(/O(?=\d)|(?<=\d)O/g, '0');
  return s;
}

/** Wörter der Texterkennung in dieselbe Form bringen wie den Text aus dem PDF (Punkte, y = Grundlinie). */
function ausTexterkennung(data, skala) {
  const items = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) {
    const h = Math.max(4, ((l.bbox.y1 - l.bbox.y0) * 0.78) / skala);
    const bl = l.baseline;
    for (const w of l.words || []) {
      const roh = String(w.text || '').trim();
      if (!roh) continue;
      if (w.confidence < 25 && roh.length < 3) continue;
      let y = w.bbox.y1;
      if (bl && bl.has_baseline !== false && bl.x1 > bl.x0) {
        const cx = (w.bbox.x0 + w.bbox.x1) / 2;
        y = bl.y0 + ((bl.y1 - bl.y0) * (cx - bl.x0)) / (bl.x1 - bl.x0);
      }
      // Reste von Tabellenlinien („__225/45R17___K49“, „|74-107“) trennen das Wort in Stücke
      const breite = (w.bbox.x1 - w.bbox.x0) / Math.max(roh.length, 1);
      const re = /[^|_\[\]{}‚„“”]+/g;
      let m;
      while ((m = re.exec(roh))) {
        let s = m[0].replace(/^[\-–—=~.,'`´"!:;]+(?=\S)/, '').replace(/[=~'`´"!]+$/, '').trim();
        if (!s || /^[\-–—=~.,'`´"!:;]+$/.test(s)) continue;
        if (s.length === 1 && /[^A-Za-zÄÖÜäöü0-9]/.test(s)) continue;
        s = ocrKorrektur(s);
        const x0 = w.bbox.x0 + (m.index + (m[0].length - m[0].trimStart().length)) * breite;
        items.push({ s, x: x0 / skala, y: y / skala, w: (s.length * breite) / skala, h });
      }
    }
  }
  return items;
}

const median = (zahlen, sonst) => {
  if (!zahlen.length) return sonst;
  const s = [...zahlen].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Ein Text-Stück in Wörter-Gruppen trennen (lange Leerräume = eigene Spalte), Ränder abschneiden. */
function teileStueck(it) {
  const cw = it.w > 0 && it.s.length ? it.w / it.s.length : it.h * 0.5;
  const teile = [];
  const re = /\S+(?: \S+)*/g;
  let m;
  while ((m = re.exec(it.s))) teile.push({ s: m[0], x: it.x + m.index * cw, y: it.y, w: m[0].length * cw, h: it.h, cw });
  return teile;
}

/** Seiten in Zeilen zerlegen. Jede Zeile: { seite, hoehe, y, h, items (nach x sortiert), zellen, text, x0 } */
export function zeilenAus(seiten) {
  const alle = [];
  for (const seite of seiten) {
    const items = seite.items.flatMap(teileStueck).sort((a, b) => a.y - b.y || a.x - b.x);
    const zeilen = [];
    for (const it of items) {
      let z = null;
      for (let i = zeilen.length - 1; i >= 0 && i >= zeilen.length - 3; i--) {
        const k = zeilen[i];
        if (Math.abs(k.y - it.y) <= Math.min(k.h, it.h) * 0.45) { z = k; break; }
      }
      if (!z) { z = { seite: seite.nr, hoehe: seite.hoehe, y: it.y, h: it.h, items: [] }; zeilen.push(z); }
      z.items.push(it);
      z.h = Math.max(z.h, it.h);
    }
    for (const z of zeilen) {
      z.items.sort((a, b) => a.x - b.x);
      // Stücke ohne große Lücke zu Zellen verbinden; große Lücke = neue Zelle (Spalte)
      const zellen = [];
      for (const it of z.items) {
        const vor = zellen[zellen.length - 1];
        const cw = Math.max(it.cw, vor ? vor.cw : 0);
        const luecke = vor ? it.x - vor.x1 : Infinity;
        if (vor && luecke < cw * 1.8) {
          vor.s += (luecke > cw * 0.25 ? ' ' : '') + it.s;
          vor.x1 = Math.max(vor.x1, it.x + it.w);
        } else {
          zellen.push({ s: it.s, x: it.x, x1: it.x + it.w, cw: it.cw });
        }
      }
      z.zellen = zellen;
      z.text = zellen.map((c) => c.s).join('   ');
      z.x0 = zellen.length ? zellen[0].x : 0;
    }
    alle.push(...zeilen.filter((z) => z.zellen.length));
  }
  markiereSeitenkoepfe(alle, seiten.length);
  return alle;
}

/** Zeilen, die oben oder unten auf vielen Seiten wiederkehren (Kopf, Fuß, Seitenzahl), werden markiert. */
function markiereSeitenkoepfe(zeilen, seitenZahl) {
  const schluessel = (z) => z.text.replace(/\d+/g, '#').replace(/\s+/g, ' ').toLowerCase();
  const rand = (z) => z.y < z.hoehe * 0.24 || z.y > z.hoehe * 0.88;
  const seitenJe = new Map();
  for (const z of zeilen) {
    if (!rand(z)) continue;
    const k = schluessel(z);
    if (!seitenJe.has(k)) seitenJe.set(k, new Set());
    seitenJe.get(k).add(z.seite);
  }
  const grenze = Math.max(2, Math.ceil(seitenZahl * 0.5));
  for (const z of zeilen) {
    if (seitenZahl >= 2 && rand(z) && (seitenJe.get(schluessel(z))?.size || 0) >= grenze) z.wdh = true;
    // „Seite 3 von 6“ und Ähnliches immer
    const t = z.text.replace(/\s+/g, ' ').trim();
    if (/^(Seite|Blatt)\s*:?\s*\d+\s*(von|\/)\s*\d+$/i.test(t) || /^\d+\s*\/\s*\d+$/.test(t)) z.wdh = true;
  }
}

/** Zeilen als Text mit Einrückung (wie im Original) – für die Anzeige der Fundstelle. */
export function alsLayout(zeilen) {
  if (!zeilen.length) return '';
  const cw = median(zeilen.flatMap((z) => z.items.map((it) => it.cw)), 5);
  const links = Math.min(...zeilen.map((z) => z.x0));
  return zeilen.map((z) => {
    let s = '';
    for (const c of z.zellen) {
      const spalte = Math.max(0, Math.round((c.x - links) / cw));
      s += (s.length < spalte ? ' '.repeat(spalte - s.length) : (s ? '  ' : '')) + c.s;
    }
    return s.replace(/\s+$/, '');
  }).join('\n');
}

// ---------- 2. Auflagen-Verzeichnis ----------

// Kürzel, wie sie in Rädergutachten vorkommen: A02, K1a, T89, 10B, 27I, 721, DE4, M+S, Flh, Car, NBF …
const KUERZEL = /^(M\+S|[A-Z]{1,3}\d{1,3}[a-z]?|\d{1,3}[A-Z]{1,3}\d?|\d{3}|[A-Z][A-Za-z]{1,3})$/;
const MIT_ZIFFER = /\d/;
const BUCHSTABE_UND_ZIFFER = (c) => /[A-Za-z]/.test(c) && /\d/.test(c);
const UEBERSCHRIFT_AUFLAGEN = /^(?:[IVX]+\.?\s*|\d+(?:\.\d+)*\.?\s*)?(?:(?:Allgemeine\s+)?Auflagen(?:\s+und\s+Hinweise)?|Hinweise\s+und\s+Auflagen)\s*:?$/i;
const ABSCHNITT = /^(?:[IVX]+\.\s+|\d+(?:\.\d+)*\.?\s+)?(Prüfergebnis|Sonstiges|Hinweise zum|Allgemeine (Reifen|Rad)?hinweise|Anlage|Anhang|Zusammenfassung|Verwendungsbereich|Durchgeführte Prüfungen|Prüfungen|Ergebnis der|Technische|Radbefestigung|Befestigungsmittel|Kennzeichnung|Unterlagen)\b/i;
const REIFEN_QUELLE = '(\\d{3})\\s?\\/\\s?(\\d{2})\\s?Z?R\\s?F?\\s?(\\d{2}(?:[,.]5)?)(?:\\s?C\\b)?(?:[\\s-]*(\\d{2,3}(?:\\/\\d{2,3})?)\\s?([A-Z]{1,2})?\\b)?';
const HAT_REIFEN = new RegExp(REIFEN_QUELLE);
const reifenIn = (t) => [...String(t).matchAll(new RegExp(REIFEN_QUELLE, 'g'))];

function istKopfzeileTabelle(z) {
  const t = z.text;
  return z.items.length >= 3 && t.length < 160 && /Reifen/i.test(t) && /\bkW|Motorleistung|Leistung/i.test(t) && /Auflagen|Hinweise/i.test(t);
}

/** Linker Textrand je Seite (Auflagen beginnen dort, Tabellenzeilen oft weiter rechts). */
function linkeRaender(zeilen) {
  const je = new Map();
  for (const z of zeilen) {
    if (z.wdh) continue;
    if (!je.has(z.seite)) je.set(z.seite, []);
    je.get(z.seite).push(z.x0);
  }
  const out = new Map();
  for (const [s, xs] of je) { xs.sort((a, b) => a - b); out.set(s, xs[Math.floor(xs.length * 0.1)]); }
  return out;
}

/** Anfang einer Auflage in dieser Zeile? → { code, text, sicher, klammer } */
function auflageAnfang(z, rand) {
  const erste = z.zellen[0];
  if (!erste) return null;
  if (rand != null && erste.x > rand + erste.cw * 6) return null;
  const m = /^(\S+)\s*(.*)$/.exec(erste.s);
  if (!m) return null;
  let [, tok, rest] = m;
  let klammer = false;
  const k = /^(.+?)\)$/.exec(tok); // „A02)“
  if (k) { tok = k[1]; klammer = true; }
  if (!KUERZEL.test(tok)) return null;
  // Tabellenzeile mit Reifengröße in einer eigenen Spalte ist keine Auflage (im Text einer Auflage darf sie stehen)
  if (!klammer && z.items.some((it) => /^\d{3}\s?\/\s?\d{2}\s?Z?R/.test(it.s))) return null;
  const weitere = z.zellen.slice(1).map((c) => c.s).join(' ');
  const eigeneZelle = !rest && z.zellen.length > 1;
  const text = (rest ? rest + (weitere ? ' ' + weitere : '') : weitere).trim();
  if (!text) return null;
  if (klammer) return { code: tok, text, sicher: true, klammer };
  if (eigeneZelle) return { code: tok, text, sicher: MIT_ZIFFER.test(tok), klammer };
  // Kürzel mit Buchstabe und Ziffer, direkt gefolgt von einem Satz
  if (BUCHSTABE_UND_ZIFFER(tok) && /^[A-ZÄÖÜ„"]/.test(text)) return { code: tok, text, sicher: false, klammer };
  return null;
}

function leseAuflagen(zeilen, raender) {
  const funde = [];
  let nachUeberschrift = false;
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (z.wdh) continue;
    if (UEBERSCHRIFT_AUFLAGEN.test(z.text.trim())) { nachUeberschrift = true; continue; }
    if (istKopfzeileTabelle(z)) nachUeberschrift = false;
    const a = auflageAnfang(z, raender.get(z.seite));
    if (!a) continue;
    // Fortsetzung einsammeln
    const teile = [a.text];
    // Fließtext zu Absätzen verbinden; Tabellen und Listen in der Auflage behalten ihre Zeilen
    const anhaengen = (zeile, vorText) => {
      const tabelle = /\S\s{3,}\S/.test(zeile) || /:\s*$/.test(vorText) || /^(?:[-–•]|Nr\.|\d+\.\s)/.test(zeile.trim());
      const z2 = zeile.replace(/\s{3,}/g, '   ').trim();
      // Silbentrennung am Zeilenende („Rad-“ / „kombination“) wieder zusammenfügen
      if (!tabelle && /[a-zäöüß]-$/.test(teile[teile.length - 1]) && /^[a-zäöüß]/.test(z2) && !/^(und|oder|bzw|sowie)\b/.test(z2)) teile[teile.length - 1] = teile[teile.length - 1].slice(0, -1) + z2;
      else teile.push((tabelle ? '\n' : ' ') + z2);
    };
    let doppelpunkt = /:\s*$/.test(a.text);
    let vor = z;
    for (let j = i + 1; j < zeilen.length; j++) {
      const n = zeilen[j];
      if (n.wdh) continue;
      const nt = n.text.trim();
      if (auflageAnfang(n, raender.get(n.seite)) || istKopfzeileTabelle(n) || UEBERSCHRIFT_AUFLAGEN.test(nt)) break;
      if (ABSCHNITT.test(nt) && nt.length < 60) break;
      const abstand = n.seite !== vor.seite ? Infinity : (n.y - vor.y) / Math.max(vor.h, 1);
      if (abstand > 1.75 && !doppelpunkt) break;
      anhaengen(n.text, vor === z ? a.text : vor.text);
      if (/:\s*$/.test(nt)) doppelpunkt = true;
      vor = n;
    }
    const text = teile.join('').replace(/[ \t]+/g, ' ').trim();
    funde.push({ code: a.code, text, seite: z.seite, rang: nachUeberschrift ? 2 : 1, sicher: a.sicher, klammer: a.klammer, i });
  }
  return funde;
}

// ---------- 3. Verwendungsbereich ----------

function rolle(t) {
  const s = t.toLowerCase();
  if (/reifenbez|auflagen zu reifen|reifenauflagen|zu reifen/.test(s)) return 'rauf';
  if (/^auflagen|hinweise/.test(s)) return 'auf';
  if (/reifen/.test(s)) return 'reifen';
  if (/\bkw|leistung/.test(s)) return 'kw';
  if (/handels|verkaufs/.test(s)) return 'name';
  if (/betriebserl|^abe|eg-|ewg|genehm/.test(s)) return 'eg';
  if (/typ/.test(s)) return 'typ';
  return null;
}
const KOPF_WORT = /^(Fahrzeug-?\s?Typ|Typ\(?en\)?|ABE.*|E[GW]+-?.*|Hinweise|\(?kW\)?|vorne|und|hinten|,|ggf\.?.*|Auflagen.*|Reifen.*|Nr\.?|Bereich|-)$/i;
const IST_EG = (t) => /e\s?\d{1,2}\s?\*|\*\s?\d{2,4}|^\d{4}\s?[*,]/.test(t);

/** Wörter einer Auflagen-Spalte in Kürzel und Freitext trennen; „A02) bis A10)“ wird aufgefüllt. */
function zerlegeCodes(text, verzeichnis, reihenfolge) {
  const codes = [];
  const frei = [];
  const toks = String(text).replace(/\)(?=[A-Z0-9])/g, ') ').split(/[\s;,]+/).filter(Boolean);
  const auchUnbekannte = verzeichnis.size < 5; // Verzeichnis nicht gefunden: Kürzel trotzdem erkennen
  for (let i = 0; i < toks.length; i++) {
    const roh = toks[i];
    const t = roh.replace(/^\(/, '').replace(/[).:]+$/g, '');
    if (/^bis$/i.test(t) && codes.length && i + 1 < toks.length) {
      const ziel = toks[i + 1].replace(/[).:;,]+$/g, '');
      const a = reihenfolge.indexOf(codes[codes.length - 1]);
      const b = reihenfolge.indexOf(ziel);
      if (a >= 0 && b > a) { for (let k = a + 1; k <= b; k++) codes.push(reihenfolge[k]); i++; continue; }
    }
    const geklebt = !verzeichnis.has(t) && verzeichnis.size >= 5 ? zerlegeGeklebt(t, verzeichnis) : null;
    if (verzeichnis.has(t)) codes.push(t);
    else if (geklebt) codes.push(...geklebt);
    else if (/\)$/.test(roh) && !/^\(/.test(roh) && KUERZEL.test(t) && MIT_ZIFFER.test(t)) codes.push(t); // „M16)“: Kürzel, auch ohne gefundene Erklärung
    else if (auchUnbekannte && !/^\(/.test(roh) && /^([A-Z]\d{2}[a-z]?|\d{2}[A-Z]|\d{3})$/.test(t)) codes.push(t);
    else frei.push(roh);
  }
  return { codes, frei: frei.join(' ').replace(/\s+;/g, ';').trim() };
}

/** „K49K56“ (im Scan zusammengeklebt) in bekannte Kürzel zerlegen; null, wenn es nicht restlos aufgeht. */
function zerlegeGeklebt(t, verzeichnis) {
  if (t.length < 5) return null;
  for (let i = 2; i <= Math.min(5, t.length - 2); i++) {
    const a = t.slice(0, i);
    if (!verzeichnis.has(a)) continue;
    const rest = t.slice(i);
    if (verzeichnis.has(rest)) return [a, rest];
    const weiter = zerlegeGeklebt(rest, verzeichnis);
    if (weiter) return [a, ...weiter];
  }
  return null;
}

const ohneDoppelte = (liste, neu) => { for (const c of neu) if (!liste.includes(c)) liste.push(c); };

function leseTabellen(zeilen, verzeichnis, reihenfolge, raender) {
  const eintraege = [];
  let kontext = { hersteller: '', verkauf: '', typen: [] };
  let typListe = false; // TÜV-Nord-Bauart: Typ- und Genehmigungsliste über der Tabelle

  const naechste = (i) => { for (let k = i + 1; k < zeilen.length; k++) if (!zeilen[k].wdh) return zeilen[k]; return null; };

  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    const t = z.text.trim();
    if (z.wdh && !istKopfzeileTabelle(z)) continue;

    let m;
    if ((m = /^(?:Fahrzeughersteller(?:\s+oder\s+Marke)?|Verwendungsbereich\s*\/\s*Fz-Hersteller|Fz\.?-?Hersteller)\s*:?\s*(.+)$/i.exec(t))) {
      kontext = { ...kontext, hersteller: m[1].replace(/^:\s*/, '').trim() }; continue;
    }
    if ((m = /^Verkaufsbezeichnung\s*:?\s*(.+)$/i.exec(t))) { kontext = { ...kontext, verkauf: m[1].trim() }; continue; }
    if (/^Typ(?:\(en\))?\s*:/i.test(t)) {
      const n = naechste(i);
      if (/ABE|EG-Genehm|Genehmigung/i.test(t) || (n && (/EG-Genehm/i.test(n.text) || n.zellen.some((c) => IST_EG(c.s))))) {
        kontext = { ...kontext, typen: [] };
        typListe = true;
        const werte = z.zellen.map((c) => c.s.replace(/^Typ(?:\(en\))?\s*:\s*/i, '')).filter((s) => s && !/^ABE|EG-Genehm/i.test(s));
        const typ = werte.find((s) => !IST_EG(s));
        if (typ) kontext.typen.push({ typ, eg: werte.find(IST_EG) || '' });
        continue;
      }
    }
    if (typListe && !istKopfzeileTabelle(z)) {
      if ((m = /^(?:ABE\s*\/\s*)?EG-Genehmigung(?:\(en\))?\s*:?\s*(.*)$/i.exec(t))) {
        const eg = z.zellen.map((c) => c.s).filter(IST_EG).join(' ') || m[1];
        const letzte = kontext.typen[kontext.typen.length - 1];
        if (letzte && !letzte.eg) letzte.eg = eg; else kontext.typen.push({ typ: '', eg });
        continue;
      }
      if (z.zellen.length >= 2 && z.zellen.some((c) => IST_EG(c.s)) && !HAT_REIFEN.test(t)) {
        kontext.typen.push({ typ: z.zellen.filter((c) => !IST_EG(c.s)).map((c) => c.s).join(' '), eg: z.zellen.filter((c) => IST_EG(c.s)).map((c) => c.s).join(' ') });
        continue;
      }
    }
    if (!istKopfzeileTabelle(z)) continue;

    // --- Kopfzeile gefunden: Spalten festlegen ---
    typListe = false;
    // Rollen aus den Kopf-Zellen; stehen zwei Überschriften dicht beieinander („Fahrzeugtyp Betriebserlaubnis“),
    // werden sie einzeln genommen.
    const kopfStuecke = [];
    for (const c of z.zellen) {
      const drin = z.items.filter((it) => it.x >= c.x - 0.5 && it.x < c.x1 - 0.5);
      const rollen = new Set(drin.map((it) => rolle(it.s)).filter(Boolean));
      if (rollen.size > 1) kopfStuecke.push(...drin.map((it) => ({ x: it.x, rolle: rolle(it.s) })));
      else kopfStuecke.push({ x: c.x, rolle: rolle(c.s) });
    }
    const gesehen = new Set();
    const sp = kopfStuecke.filter((s) => s.rolle && (gesehen.has(s.rolle) ? false : gesehen.add(s.rolle)));
    if (!sp.some((s) => s.rolle === 'reifen')) continue;
    const cw = median(z.items.map((it) => it.cw), 5);
    const grenzen = sp.map((s) => s.x - cw * 2.2);
    const spalteVon = (x) => { let r = 0; for (let k = 0; k < grenzen.length; k++) if (x >= grenzen[k]) r = k; return sp[r].rolle; };
    const erste = sp[0].rolle;

    let e = null;
    const neu = (seite) => {
      e = { seite, name: [], typ: [], eg: [], kw: [], reifen: [], codes: [], frei: [], hersteller: kontext.hersteller, verkauf: kontext.verkauf, typen: kontext.typen.slice(), zeilen: [], ersterAuf: '' };
      eintraege.push(e);
      return e;
    };

    let j = i + 1;
    // Fortsetzung der Kopfzeile überspringen
    while (j < zeilen.length && (zeilen[j].wdh || zeilen[j].items.every((it) => KOPF_WORT.test(it.s)))) j++;
    for (; j < zeilen.length; j++) {
      const n = zeilen[j];
      if (n.wdh) continue;
      const nt = n.text.trim();
      if (istKopfzeileTabelle(n) || UEBERSCHRIFT_AUFLAGEN.test(nt) || /^Typ(?:\(en\))?\s*:/i.test(nt)
        || /^(?:Fahrzeughersteller|Verwendungsbereich|Verkaufsbezeichnung|Fz\.?-?Hersteller)/i.test(nt)) break;
      // eine Auflage am linken Rand beendet die Tabelle
      if (spalteVon(n.items[0].x) === erste && auflageAnfang(n, raender.get(n.seite))?.sicher) break;
      // Fließtext über mehrere Spalten beendet die Tabelle
      if (n.zellen.length === 1 && n.zellen[0].s.length > 55 && !HAT_REIFEN.test(nt)) break;

      const sp2 = { name: [], typ: [], eg: [], kw: [], reifen: [], rauf: [], auf: [] };
      for (const it of n.items) sp2[spalteVon(it.x)].push(it.s);
      const txt = (r) => sp2[r].join(' ').trim();
      const aufT = txt('auf');
      const aufCodes = aufT ? zerlegeCodes(aufT, verzeichnis, reihenfolge) : { codes: [], frei: '' };

      // Beginnt hier ein neuer Eintrag?
      const ersteItems = sp2[erste];
      const ersteT = ersteItems.join(' ').trim();
      const ohneEG = ersteItems.filter((s) => !IST_EG(s));
      if (erste === 'kw') {
        // „44; 50; 54; 66;“ mit Fortsetzung „80“ in der nächsten Zeile gehört zum selben Eintrag
        const fortsetzung = e && /[;,]\s*$/.test(e.kw[e.kw.length - 1] || '');
        if (ohneEG.some((s) => /\d/.test(s)) && !fortsetzung) neu(n.seite);
      } else if (ersteT && !e) {
        neu(n.seite);
      } else if (ersteT && erste === 'typ') {
        // zweiter Typ ohne eigene kW-Angabe („204“ / „204 K“) gehört zum selben Eintrag
        if (ohneEG.length && (/\d/.test(txt('kw')) || e.codes.length)) neu(n.seite);
      } else if (ersteT && erste === 'name' && ohneEG.length) {
        // Lambsheim-Bauart: Name, Typ und Genehmigung stehen untereinander in einer Spalte.
        // Neu, wenn die Auflagen-Spalte wieder von vorn beginnt – sonst gehört die Zeile zum Fahrzeug darüber.
        const neuerBeginn = aufCodes.codes.length && e.ersterAuf && aufCodes.codes[0] === e.ersterAuf;
        const ohneAuf = !aufCodes.codes.length && e.eg.length && /[a-zäöü]/.test(ersteT) && HAT_REIFEN.test(txt('reifen'));
        if (neuerBeginn || ohneAuf) neu(n.seite);
      }
      if (!e) {
        if (!HAT_REIFEN.test(txt('reifen'))) continue;
        neu(n.seite);
      }
      e.zeilen.push(j);

      // Kennung: Name / Typ / Genehmigung
      for (const r of ['name', 'typ', 'eg']) {
        for (const s of sp2[r]) {
          if (/^\d{3,4}\s?\/\s?\d{3,4}/.test(s) || /^\d\/\d{3}\/\d/.test(s)) e.frei.push(s); // Achslasten, Lochkreis o. Ä.
          else if (IST_EG(s) || r === 'eg') e.eg.push(s);
          else if (r === 'typ') e.typ.push(s);
          else if (!e.name.length) e.name.push(s);
          else if (erste === 'kw' || e.eg.length) e.name.push(s); // Zusatz zur Bezeichnung
          else e.typ.push(s);
        }
      }
      const kwT = sp2.kw.filter((s) => !IST_EG(s)).join(' ').trim();
      for (const s of sp2.kw) if (IST_EG(s)) e.eg.push(s);
      if (kwT && /\d/.test(kwT) && !e.kw.includes(kwT)) {
        if (e.kw.length && /[;,]\s*$/.test(e.kw[e.kw.length - 1])) e.kw[e.kw.length - 1] += ' ' + kwT;
        else e.kw.push(kwT);
      }

      // Reifen und ihre Auflagen
      const reifenT = txt('reifen');
      if (reifenT) {
        let rest = reifenT;
        for (const g of reifenIn(reifenT)) {
          e.reifen.push({ g: `${g[1]}/${g[2]} R${g[3].replace('.', ',')}`, li: g[4] ? g[4] + (g[5] || '') : '', kw: kwT, codes: [], frei: '', seite: n.seite });
          rest = rest.replace(g[0], ' ');
        }
        const r = e.reifen[e.reifen.length - 1];
        const { codes, frei } = zerlegeCodes(rest, verzeichnis, reihenfolge);
        if (r) { ohneDoppelte(r.codes, codes); if (frei && !/^[-–]$/.test(frei)) r.frei = (r.frei + ' ' + frei).trim(); }
        else ohneDoppelte(e.codes, codes);
      }
      const raufT = txt('rauf');
      if (raufT) {
        const r = e.reifen[e.reifen.length - 1];
        const { codes, frei } = zerlegeCodes(raufT, verzeichnis, reihenfolge);
        if (r) { ohneDoppelte(r.codes, codes); if (frei && !/^[-–]$/.test(frei)) r.frei = (r.frei + ' ' + frei).trim(); }
        else ohneDoppelte(e.codes, codes);
      }
      if (aufT) {
        if (!e.ersterAuf && aufCodes.codes.length) e.ersterAuf = aufCodes.codes[0];
        ohneDoppelte(e.codes, aufCodes.codes);
        if (aufCodes.frei && !/^[-–]$/.test(aufCodes.frei)) e.frei.push(aufCodes.frei);
      }
    }
    i = j - 1;
  }
  // Einträge ohne Reifen sind Fehlgriffe (z. B. eine Felgen-Übersicht)
  return eintraege.filter((x) => x.reifen.length);
}

// ---------- 4. Kopfdaten ----------

const STELLE = /((?:Technologiezentrum\s+)?Typprüfstelle[^,;]{0,60}?GmbH|[A-ZÄÖÜ][\wÄÖÜäöü&.\- ]{1,50}?(?:GmbH|GMBH)(?: & Co\. KG)?|IFM - Institut für Fahrzeugtechnik und Mobilität)/;
const ORG = /\b(TÜV(?! Merkblatt)(?:\s[A-ZÄÖÜ][\wÄÖÜäöü]*){0,2}|DEKRA[\w ]*|GTÜ[\w ]*|KÜS[\w ]*)/;

function leseKopf(zeilen) {
  const seite1 = zeilen.filter((z) => z.seite === 1);
  const kopf = zeilen.filter((z) => z.seite <= 2);
  const voll = zeilen.map((z) => z.text).join('\n');
  const meta = {};
  const artZ = kopf.map((z) => z.text).find((t) => /Teilegutachten|Allgemeine Betriebserlaubnis|EG-Typgenehmigung|Gutachten/i.test(t)) || '';
  meta.art = /Teilegutachten/i.test(artZ) ? 'Teilegutachten nach § 19 (3) StVZO'
    : /Allgemeine Betriebserlaubnis|\bABE\b/i.test(artZ) ? 'Allgemeine Betriebserlaubnis (ABE)' : 'Gutachten';
  const nrRe = /(?<![\w-])((?:[A-Z]{2,3}-)?\d{2,6}-[0-9A-Z]{2,6}(?:-[0-9A-Z]{1,6}){1,3}(?:\/[0-9A-Z]{1,4})?)(?![\w-])/;
  const mitWort = kopf.find((z) => /gutachten|\bnr\b|nummer/i.test(z.text) && nrRe.test(z.text));
  const nrZ = mitWort || kopf.find((z) => nrRe.test(z.text));
  if (nrZ) meta.nr = nrRe.exec(nrZ.text)[1];
  const wert = (re) => {
    for (const z of seite1) {
      const m = re.exec(z.text);
      if (m) return m[1].replace(/^[:\s]+/, '').replace(/\s{2,}/g, ' ').trim();
    }
    return '';
  };
  meta.gegenstand = wert(/^(?:Prüfgegenstand|Fahrzeugteil\s*:|Art\s*:)\s*(.+)$/i) || wert(/^\s*über den Verwendungsbereich von\s+(.+)$/i);
  meta.radtyp = wert(/^(?:Radtyp|Typ|Teiletyp)\s*:?\s+(\S.*)$/i);
  const rg = /(\d{1,2}(?:[,.]\d)?)\s?J\s?[xX×]\s?(\d{2}(?:[,.]\d)?)\s?(E?H2\+?)?/.exec(voll);
  if (rg) meta.rad = `${rg[1].replace('.', ',')} J × ${rg[2]}${rg[3] ? ' ' + rg[3] : ''}`;
  const ets = new Set();
  for (const m of voll.matchAll(/\bET\s?(\d{1,3})\b/g)) ets.add(Number(m[1]));
  if (ets.size) meta.et = [...ets].sort((a, b) => a - b);
  // Technischer Dienst: Nummer und Name aus der Nähe der KBA-Nummer
  const kbaRe = /KBA\s*[-–]?\s*P\s*(\d{4,5})\s*[-–]\s*(\d{2})/;
  for (let i = zeilen.length - 1; i >= 0; i--) {
    const m = kbaRe.exec(zeilen[i].text);
    if (!m) continue;
    if (!meta.kba) meta.kba = `KBA-P ${m[1]}-${m[2]}`;
    for (let k = i; k >= Math.max(0, i - 5) && !meta.stelle; k--) {
      const s = STELLE.exec(zeilen[k].text);
      if (s && /TÜV|DEKRA|GTÜ|KÜS|Prüf|Institut|Typprüf/i.test(s[1])) meta.stelle = s[1].replace(/^Prüflaboratorium\s+/i, '').trim();
    }
    if (meta.stelle) break;
  }
  if (!meta.stelle) for (const z of seite1) { const o = ORG.exec(z.zellen[0]?.s || ''); if (o) { meta.stelle = o[1].trim(); break; } }
  const datum = [...voll.matchAll(/^\s*(?:[A-ZÄÖÜ][\wäöüß. -]{2,40},\s*|Stand:?\s*)(\d{1,2}\.\s?(?:\d{1,2}\.|[A-Za-zäöü]+)\s?\d{4})\s*$/gm)];
  if (datum.length) meta.datum = datum[datum.length - 1][1].replace(/\.(?=[A-Za-zäöü])/, '. ');
  return meta;
}

// ---------- Auswertung gesamt ----------

/** Auswertung eines Gutachtens aus den Seiten von leseSeiten(). */
export function auswerten(seiten) {
  const zeilen = zeilenAus(seiten);
  const raender = linkeRaender(zeilen);
  const zeichen = zeilen.reduce((n, z) => n + z.text.length, 0);
  const funde = leseAuflagen(zeilen, raender);
  // pro Kürzel die beste Fundstelle (nach der Überschrift „Auflagen“ vor allem anderen)
  const besten = new Map();
  for (const f of funde) {
    const alt = besten.get(f.code);
    if (!alt || f.rang > alt.rang || (f.rang === alt.rang && !alt.sicher && f.sicher)) besten.set(f.code, f);
  }
  let reihenfolge = [...besten.values()].sort((a, b) => a.i - b.i).map((f) => f.code);
  let verzeichnis = new Map(reihenfolge.map((c) => [c, besten.get(c)]));
  let eintraege = leseTabellen(zeilen, verzeichnis, reihenfolge, raender);
  // Fehlgriffe aussortieren: Kürzel behalten, die im Verwendungsbereich vorkommen, mit Klammer geschrieben sind
  // („A02)“) oder als Buchstabe+Ziffer nach der Überschrift „Auflagen“ stehen.
  const benutzt = new Set(eintraege.flatMap((e) => [...e.codes, ...e.reifen.flatMap((r) => r.codes)]));
  const behalten = (c) => { const f = verzeichnis.get(c); return benutzt.has(c) || f.klammer || (f.rang === 2 && BUCHSTABE_UND_ZIFFER(c)); };
  const neuReihe = reihenfolge.filter(behalten);
  if (neuReihe.length !== reihenfolge.length) {
    reihenfolge = neuReihe;
    verzeichnis = new Map(reihenfolge.map((c) => [c, besten.get(c)]));
    eintraege = leseTabellen(zeilen, verzeichnis, reihenfolge, raender);
  }

  const meta = leseKopf(zeilen);
  meta.seiten = seiten.length;
  meta.ocr = seiten.filter((x) => x.ocr).length;
  // Bei Scans: Kürzel, die es im Verzeichnis nicht gibt, aber genau einem bekannten Kürzel bis auf ein Zeichen gleichen
  // („A983“ → „A93“), auf dieses zurückführen. Die Originalschreibweise bleibt in „gelesen“ sichtbar.
  if (meta.ocr) {
    const bekannt = [...verzeichnis.keys()];
    const fix = (liste, gelesen) => liste.map((c) => {
      if (verzeichnis.has(c)) return c;
      const nah = bekannt.filter((k) => abstand(k, c) === 1);
      if (nah.length === 1) { gelesen[nah[0]] = c; return nah[0]; }
      return c;
    });
    for (const e of eintraege) {
      e.gelesen = {};
      e.codes = [...new Set(fix(e.codes, e.gelesen))];
      for (const r of e.reifen) r.codes = [...new Set(fix(r.codes, e.gelesen))];
    }
  }
  return {
    meta,
    textArm: zeichen < 120 * seiten.length, // kaum Text: vermutlich ein Scan
    auflagen: reihenfolge.map((c) => { const f = verzeichnis.get(c); return [c, f.text, f.seite]; }),
    eintraege: eintraege.map((e, n) => ({
      n,
      seite: e.seite,
      hersteller: e.hersteller,
      verkauf: e.verkauf,
      name: e.name.join(' '),
      typ: [...e.typ, ...e.typen.map((t) => t.typ).filter(Boolean)].join(', '),
      eg: [...e.eg, ...e.typen.map((t) => t.eg).filter(Boolean)].join(' '),
      kw: e.kw.join(' · '),
      reifen: e.reifen,
      codes: e.codes,
      frei: e.frei.join(' ').replace(/\s+/g, ' ').trim(),
      roh: alsLayout(e.zeilen.map((k) => zeilen[k])),
      gelesen: e.gelesen && Object.keys(e.gelesen).length ? e.gelesen : undefined,
    })),
    zeilen,
  };
}

/** Editierabstand (Levenshtein) für kurze Kürzel */
function abstand(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 1) return 2;
  let vor = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const akt = [i];
    for (let j = 1; j <= n; j++) akt[j] = Math.min(vor[j] + 1, akt[j - 1] + 1, vor[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    vor = akt;
  }
  return vor[n];
}

// ---------- 5. Fahrzeug zuordnen ----------

const jahr = (j) => (j.length === 2 ? (Number(j) < 50 ? '20' : '19') + j : j);
function normRL(rl) { const [a, b] = rl.split('/'); return `${jahr(a)}/${b}`; }

/** Genehmigungsnummer aus Feld K zerlegen: e1*2001/116*0307*37 */
export function zerlegeK(k) {
  const s = String(k || '').replace(/\s/g, '').toLowerCase();
  const m = /e(\d{1,2})\*(\d{2,4}\/\d{1,4})\*(\d{4,5})(?:\*(\d{1,3}))?/.exec(s);
  if (!m) return null;
  return { land: m[1], rl: normRL(m[2]), nr: m[3], erw: m[4] || '' };
}

/** Alle Genehmigungen in einem Text: [{ land, rl: [...], nr: [...] }] */
export function genehmigungen(text) {
  const s = String(text || '').replace(/\s/g, '').toLowerCase();
  const out = [];
  for (const m of s.matchAll(/e(\d{1,2})\*((?:\d{2,4}\/\d{1,4}\*?,?)+)((?:\d{4,5},?)*)/g)) {
    out.push({ land: m[1], rl: m[2].split(/[*,]+/).filter(Boolean).map(normRL), nr: m[3].split(',').filter(Boolean) });
  }
  return out;
}

/** kW-Angaben wie „74-107“, „110 bis 176“, „44; 50; 54“, „235, 330“ prüfen. null = keine Angabe lesbar. */
export function kwPasst(text, kw) {
  if (!text || !kw) return null;
  const s = String(text).replace(/bis/gi, '-').replace(/–/g, '-');
  let gefunden = false;
  for (const m of s.matchAll(/(\d{2,3})\s*-\s*(\d{2,3})/g)) { gefunden = true; if (kw >= Number(m[1]) && kw <= Number(m[2])) return true; }
  const ohne = s.replace(/(\d{2,3})\s*-\s*(\d{2,3})/g, ' ');
  for (const m of ohne.matchAll(/\b(\d{2,3})\b/g)) { gefunden = true; if (Number(m[1]) === kw) return true; }
  return gefunden ? false : null;
}

export const normReifen = (r) => String(r || '').toUpperCase().replace(/\s/g, '').replace(/ZR/, 'R').replace(/,/g, '.').replace(/^(\d{3}\/\d{2}R\d{2}(?:\.5)?).*$/, '$1');

/**
 * Einträge bewerten. f: { k, typ, name, kw, reifen }
 * Ergebnis nach Punkten sortiert: [{ e, punkte, merkmale: [{ text, gut }], kwOk, reifen: Index | -1 }]
 */
export function suche(aw, f) {
  const K = zerlegeK(f.k);
  const typ = String(f.typ || '').trim().toUpperCase();
  const kw = Number(String(f.kw || '').replace(',', '.')) || 0;
  const nameW = String(f.name || '').toLowerCase().split(/[\s,/]+/).filter((w) => w.length >= 2);
  const rf = normReifen(f.reifen);
  const ergebnis = [];
  for (const e of aw.eintraege) {
    let punkte = 0;
    const merkmale = [];
    if (K) {
      const gen = genehmigungen(e.eg);
      const passt = gen.filter((g) => g.land === K.land && g.rl.includes(K.rl));
      if (passt.some((g) => g.nr.includes(K.nr))) { punkte += 6; merkmale.push({ text: 'Genehmigung passt', gut: true }); }
      else if (passt.some((g) => !g.nr.length)) { punkte += 3; merkmale.push({ text: 'Genehmigung passt (ohne Nummer)', gut: true }); }
      else if (gen.length) merkmale.push({ text: 'andere Genehmigung', gut: false });
    }
    if (typ) {
      const ohneLeer = (x) => x.replace(/\s+/g, '');
      const ganze = e.typ.toUpperCase().split(/[,;/]+/).map((x) => ohneLeer(x)).filter(Boolean);
      const typen = e.typ.toUpperCase().split(/[\s,;/]+/).filter(Boolean);
      if (ganze.includes(ohneLeer(typ)) || typen.includes(typ)) { punkte += 4; merkmale.push({ text: 'Typ passt', gut: true }); }
      else if (typen.some((t) => t.length >= 2 && (t.startsWith(typ) || typ.startsWith(t)))) { punkte += 1; merkmale.push({ text: 'Typ ähnlich', gut: true }); }
    }
    if (nameW.length) {
      const hay = `${e.hersteller} ${e.verkauf} ${e.name}`.toLowerCase();
      const n = nameW.filter((w) => hay.includes(w)).length;
      if (n) { punkte += n; merkmale.push({ text: 'Bezeichnung passt', gut: true }); }
    }
    let kwOk = null;
    if (kw) {
      kwOk = kwPasst(e.kw || e.reifen.map((r) => r.kw).join(' '), kw);
      if (kwOk === true) { punkte += 2; merkmale.push({ text: `${kw} kW im Bereich`, gut: true }); }
      else if (kwOk === false) { punkte -= 3; merkmale.push({ text: `${kw} kW nicht im Bereich`, gut: false }); }
    }
    let reifen = -1;
    if (rf) {
      reifen = e.reifen.findIndex((r) => normReifen(r.g) === rf && (!kw || kwPasst(r.kw, kw) !== false));
      if (reifen < 0) reifen = e.reifen.findIndex((r) => normReifen(r.g) === rf);
      if (reifen >= 0) { punkte += 2; merkmale.push({ text: `${e.reifen[reifen].g} aufgeführt`, gut: true }); }
      else merkmale.push({ text: 'Reifengröße nicht aufgeführt', gut: false });
    }
    ergebnis.push({ e, punkte, merkmale, kwOk, reifen });
  }
  return ergebnis.sort((a, b) => b.punkte - a.punkte || a.e.n - b.e.n);
}

// ---------- 6. Hilfen zu einzelnen Auflagen ----------

/** Rechner, der zu einer Auflage passt */
export function rechnerZu(text) {
  if (/Tragfähigkeit|Lastindex|Load ?index|Tragfähigkeitskennzahl|Geschwindigkeitssymbol|Geschwindigkeitsbereich/i.test(text)) return { id: 'tragfaehigkeit', titel: 'Tragfähigkeit & Tempo' };
  if (/Geschwindigkeitsmesser|Tacho|Wegstreckenzähler/i.test(text)) return { id: 'tacho', titel: 'Tacho' };
  if (/Abrollumfang/i.test(text)) return { id: 'reifen', titel: 'Reifenvergleich' };
  if (/Einpre(?:ss|ß)tiefe|Spurweite|Spurverbreiterung/i.test(text)) return { id: 'felge', titel: 'Felge & Einpresstiefe' };
  return null;
}

/** Achslast-Grenze aus einer Auflage („… nur zulässig für Fahrzeuge mit zul. Achslasten bis 1230 kg“) gegen Feld 8.1/8.2 prüfen. */
export function achslastPruefung(text, a1, a2) {
  const m = /Achslast(?:en)?[^.\d]{0,40}?bis\s+(\d{3,4})\s*kg/i.exec(text) || /bis\s+(\d{3,4})\s*kg[^.]{0,30}Achslast/i.exec(text);
  if (!m) return null;
  const grenze = Number(m[1]);
  const werte = [Number(a1) || 0, Number(a2) || 0].filter(Boolean);
  if (!werte.length) return { grenze, ok: null };
  const max = Math.max(...werte);
  return { grenze, max, ok: max <= grenze };
}

// ---------- 7. Werkstatt: Auflagen nach Arbeitsschritt ----------

/** Reihenfolge und Bezeichnung der Gruppen im Umbau-Check der Werkstatt. sperrt: muss vor der Abnahme erledigt sein. */
export const WERKSTATT_GRUPPEN = [
  { id: 'teile', titel: 'Teile prüfen', sperrt: true },
  { id: 'passt', titel: 'Passt das Fahrzeug?', sperrt: true },
  { id: 'nacharbeit', titel: 'Nacharbeiten am Fahrzeug', sperrt: true },
  { id: 'montage', titel: 'Beim Einbau', sperrt: true },
  { id: 'reifen', titel: 'Reifen', sperrt: true },
  { id: 'sonstige', titel: 'Weitere Auflagen', sperrt: true },
  { id: 'abnahme', titel: 'Für die Abnahme vorbereiten', sperrt: false },
  { id: 'kunde', titel: 'Dem Kunden mitgeben', sperrt: false },
];

/**
 * Ordnet eine Auflage einem Arbeitsschritt zu – nach Stichworten im Text. Ein Vorschlag: Die Werkstatt sieht immer den
 * ganzen Text und entscheidet selbst.
 */
export function werkstattGruppe(p) {
  if (p.code === 'Rad') return 'teile';
  if (p.code === '!') return 'passt';
  const t = p.text || '';
  // Reihenfolge zählt: eindeutige Tätigkeiten zuerst, allgemeine Stichworte (Achse, Reifen) zuletzt
  if (/Reifen(druck|fülldruck)kontroll|RDKS|Reifendrucküberwachung|Druckmesssensor/i.test(t)) return 'montage';
  if (/Bezieher|darauf hinzuweisen|Schneeketten|Reifenfülldruck|Mindestluftdruck|Ersatzrad|mäßiger Geschwindigkeit/i.test(t)) return 'kunde';
  if (/Bestätigung des Reifenherstellers|Rad\/Reifen-Kombination ist zulässig: Reifengröße|unterschiedlicher Reifengrößen|Folgende Reifen wurden geprüft/i.test(t)) return 'reifen';
  if (/Achslast|\bLI\s?\d|Lastindex|Tragfähigkeit/i.test(t)) return 'reifen';
  if (/herzustellen|nachzuarbeiten|Nacharbeit|bördeln|umzulegen|umlegen|anzulegen|Anlegen|aufzuweiten|aufweiten|auszustellen|Ausstellen|auszuschneiden|zu kürzen|umzubiegen|zu entfernen|anzubringen/i.test(t)) return 'nacharbeit';
  if (/Befestigungsmittel|Befestigungsteile|Radschraube|Radmutter|Schraube\b|Schrauben|Muttern?\b|Kegelbund|Kugelbund|Flachbund|Anzugsmoment|Einschraubtiefe|Ventil|auswucht|Klebegewicht|Zentrierring|Distanzscheibe|Adapter|Zentrierstift/i.test(t)) return 'montage';
  if (/nur zulässig (für|an|bei)|nicht zulässig (für|an|bei)|zulässig für Fahrzeug|Aufbauart|Allradantrieb|Fahrzeugausführung|serienmäßig ausschließlich|Serienstand|nur an Achse|Vorderachse|Hinterachse/i.test(t)) return 'passt';
  if (/Radhaus|Kotflügel|Schürze|Stoßfänger|Freigängigkeit|Radabdeckung|Abdeckung der Reifen|Kunststoffeinsätze|Anbau von/i.test(t)) return 'nacharbeit';
  if (/Montage|montier|schlauchlos/i.test(t)) return 'montage';
  if (/Reifen|Profiltyp|M\+S|Geschwindigkeits(symbol|bereich|kategorie)/i.test(t)) return 'reifen';
  if (/Sachverständig|Prüfingenieur|bescheinig|Anbauabnahme|Änderungsabnahme|vorzuführen|Nachweis|Geschwindigkeitsmesser|Wegstreckenzähler|Fahrzeugpapiere|gesondert zu beurteilen/i.test(t)) return 'abnahme';
  return 'sonstige';
}
