// Prüfsinn – kleiner PDF-Schreiber ohne Abhängigkeiten.
// A4, Schriften Helvetica und Helvetica-Bold (in jedem PDF-Leser vorhanden), Text bleibt markier- und kopierbar.
// Fotos (JPEG) werden ASCII85-kodiert eingebettet – so bleibt die ganze Datei reines ASCII.
// Koordinaten: Ursprung oben links, y wächst nach unten (wird intern umgerechnet).

export const SEITE = { b: 595.28, h: 841.89 };

// Zeichenbreiten der Helvetica (in 1/1000 der Schriftgröße) für die Zeichen 32 bis 126
const BREITEN = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const EXTRA = { Ä: 667, Ö: 778, Ü: 722, ä: 556, ö: 556, ü: 556, ß: 611, é: 556, è: 556, á: 556, '–': 556, '—': 1000, '„': 333, '“': 333, '”': 333, '‚': 222, '‘': 222, '’': 222,
  '€': 556, '·': 278, '×': 584, '§': 556, '°': 400, '²': 333, '…': 1000, '•': 350 };
// Zeichen außerhalb von Latin-1, die die Windows-Kodierung (WinAnsi) kennt
const CP1252 = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97 };

function putze(s) {
  return String(s ?? '').replace(/⁻¹/g, '-1').replace(/↳/g, '>').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/ /g, ' ').replace(/[\r\t]/g, ' ');
}
function hex(s) {
  let o = '';
  for (const ch of s) {
    let c = CP1252[ch] ?? ch.charCodeAt(0);
    if (c > 255 || c < 32) c = 63; // unbekanntes Zeichen → ?
    o += c.toString(16).padStart(2, '0');
  }
  return '<' + o + '>';
}
const z = (n) => Number(n).toFixed(2);

/** Bytes → ASCII85 (mit Endmarke „~>“, Zeilen à 76 Zeichen) */
function ascii85(bytes) {
  let out = '';
  let zeile = 0;
  const schreibe = (t) => { out += t; zeile += t.length; if (zeile >= 76) { out += '\n'; zeile = 0; } };
  for (let i = 0; i < bytes.length; i += 4) {
    const rest = Math.min(4, bytes.length - i);
    let n = 0;
    for (let k = 0; k < 4; k++) n = n * 256 + (k < rest ? bytes[i + k] : 0);
    if (n === 0 && rest === 4) { schreibe('z'); continue; }
    const c = new Array(5);
    for (let k = 4; k >= 0; k--) { c[k] = String.fromCharCode((n % 85) + 33); n = Math.floor(n / 85); }
    schreibe(c.slice(0, rest + 1).join(''));
  }
  return out + '~>';
}

export class Pdf {
  constructor(titel = 'Dokument') {
    this.titel = titel;
    this.seiten = [];
    this.bilder = []; // { name, breite, hoehe, farben, daten (Uint8Array, JPEG) }
    this.neueSeite();
  }
  neueSeite() { this.ops = []; this.ops.bilder = new Set(); this.seiten.push(this.ops); return this; }

  /** JPEG einbetten (einmal) und an x/y in der Größe w × h zeichnen. bild: { daten, breite, hoehe, farben } */
  bild(x, y, w, h, bild) {
    let b = this.bilder.find((v) => v.daten === bild.daten);
    if (!b) { b = { ...bild, name: 'Im' + (this.bilder.length + 1) }; this.bilder.push(b); }
    this.ops.bilder.add(b.name);
    this.ops.push(`q ${z(w)} 0 0 ${z(h)} ${z(x)} ${z(SEITE.h - y - h)} cm /${b.name} Do Q`);
    return this;
  }
  /** Auf eine bereits angelegte Seite zurückwechseln (z. B. für Fußzeilen mit Gesamtseitenzahl). */
  aufSeite(i) { this.ops = this.seiten[i]; return this; }

  breite(s, size = 10, fett = false) {
    let w = 0;
    for (const ch of putze(s)) w += EXTRA[ch] ?? BREITEN[ch.charCodeAt(0) - 32] ?? 556;
    return (w * size) / 1000 * (fett ? 1.065 : 1);
  }
  /** Zerlegt Text in Zeilen, die in die Breite passen. Zeilenumbrüche im Text bleiben erhalten. */
  umbruch(s, max, size = 10, fett = false) {
    const out = [];
    for (const absatz of putze(s).split('\n')) {
      let akt = '';
      for (const wort of absatz.split(' ').filter(Boolean)) {
        const probe = akt ? akt + ' ' + wort : wort;
        if (this.breite(probe, size, fett) <= max || !akt) akt = probe;
        else { out.push(akt); akt = wort; }
      }
      out.push(akt);
    }
    return out;
  }
  text(x, y, s, { size = 10, fett = false, grau = 0, rechts = false, mitte = false, sperren = 0 } = {}) {
    s = putze(s);
    if (!s) return this;
    const br = this.breite(s, size, fett) + sperren * Math.max(s.length - 1, 0);
    if (rechts) x -= br;
    if (mitte) x -= br / 2;
    this.ops.push(`BT /${fett ? 'F2' : 'F1'} ${size} Tf ${grau} g ${sperren ? z(sperren) + ' Tc ' : '0 Tc '}${z(x)} ${z(SEITE.h - y)} Td ${hex(s)} Tj ET`);
    return this;
  }
  /** Mehrzeiliger Text; gibt die y-Position nach dem letzten Zeilenabstand zurück. */
  absatz(x, y, s, max, { size = 10, fett = false, grau = 0, zeile = size * 1.38 } = {}) {
    for (const l of this.umbruch(s, max, size, fett)) { this.text(x, y, l, { size, fett, grau }); y += zeile; }
    return y;
  }
  linie(x1, y1, x2, y2, { dicke = 0.5, grau = 0.75 } = {}) {
    this.ops.push(`${grau} G ${dicke} w ${z(x1)} ${z(SEITE.h - y1)} m ${z(x2)} ${z(SEITE.h - y2)} l S`);
    return this;
  }
  rahmen(x, y, w, h, { fuellung = null, linie = null, dicke = 0.5 } = {}) {
    const r = `${z(x)} ${z(SEITE.h - y - h)} ${z(w)} ${z(h)} re`;
    if (fuellung != null) this.ops.push(`${fuellung} g ${r} f`);
    if (linie != null) this.ops.push(`${linie} G ${dicke} w ${r} S`);
    return this;
  }

  /** Fertige PDF-Datei als Blob. Der Inhalt ist reines ASCII, daher stimmen Zeichen- und Bytepositionen überein. */
  blob() {
    const obj = [];
    const n = this.seiten.length;
    const ersteSeite = 6;
    obj[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    obj[2] = `<< /Type /Pages /Kids [${this.seiten.map((_, i) => `${ersteSeite + i * 2} 0 R`).join(' ')}] /Count ${n} >>`;
    obj[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    obj[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    obj[5] = `<< /Title ${hex(putze(this.titel))} /Producer ${hex('Pruefsinn')} >>`;
    const ersteBild = ersteSeite + n * 2;
    const bildNr = new Map(this.bilder.map((b, i) => [b.name, ersteBild + i]));
    this.seiten.forEach((ops, i) => {
      const inhalt = ops.join('\n');
      const xo = ops.bilder?.size ? ` /XObject << ${[...ops.bilder].map((nm) => `/${nm} ${bildNr.get(nm)} 0 R`).join(' ')} >>` : '';
      obj[ersteSeite + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${SEITE.b} ${SEITE.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xo} >> /Contents ${ersteSeite + i * 2 + 1} 0 R >>`;
      obj[ersteSeite + i * 2 + 1] = `<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`;
    });
    this.bilder.forEach((b, i) => {
      const a85 = ascii85(b.daten);
      const farbe = b.farben === 1 ? '/DeviceGray' : '/DeviceRGB';
      obj[ersteBild + i] = `<< /Type /XObject /Subtype /Image /Width ${b.breite} /Height ${b.hoehe} /ColorSpace ${farbe} /BitsPerComponent 8 /Filter [/ASCII85Decode /DCTDecode] /Length ${a85.length} >>\nstream\n${a85}\nendstream`;
    });
    let aus = '%PDF-1.4\n';
    const pos = [];
    for (let i = 1; i < obj.length; i++) {
      pos[i] = aus.length;
      aus += `${i} 0 obj\n${obj[i]}\nendobj\n`;
    }
    const xref = aus.length;
    aus += `xref\n0 ${obj.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < obj.length; i++) aus += String(pos[i]).padStart(10, '0') + ' 00000 n \n';
    aus += `trailer\n<< /Size ${obj.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new Blob([aus], { type: 'application/pdf' });
  }
}
