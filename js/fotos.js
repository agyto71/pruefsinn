// Prüfsinn – Fotos im Gerät (IndexedDB). localStorage wäre für Bilder zu klein.
// Schlüssel: "<auftrag>/<punkt>/<zeit>". Fotos werden beim Aufnehmen verkleinert (lange Seite 1280 px, JPEG).

const DB = 'pruefsinn-fotos';
const ABLAGE = 'fotos';
let dbVersprechen = null;

function db() {
  if (!dbVersprechen) {
    dbVersprechen = new Promise((ok, fehler) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ABLAGE);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => { dbVersprechen = null; fehler(r.error); };
    });
  }
  return dbVersprechen;
}
async function anfrage(modus, fn) {
  const d = await db();
  return new Promise((ok, fehler) => {
    const tx = d.transaction(ABLAGE, modus);
    const r = fn(tx.objectStore(ABLAGE));
    tx.oncomplete = () => ok(r?.result);
    tx.onerror = () => fehler(tx.error);
    tx.onabort = () => fehler(tx.error);
  });
}

export const speichereFoto = (schluessel, blob) => anfrage('readwrite', (s) => s.put(blob, schluessel));
export const loescheFoto = (schluessel) => anfrage('readwrite', (s) => s.delete(schluessel));

/** Alle Fotos, deren Schlüssel mit praefix beginnt: [{ schluessel, blob }] (nach Aufnahmezeit sortiert) */
export async function fotosMit(praefix) {
  const d = await db();
  return new Promise((ok, fehler) => {
    const out = [];
    const tx = d.transaction(ABLAGE, 'readonly');
    const r = tx.objectStore(ABLAGE).openCursor(IDBKeyRange.bound(praefix, praefix + '￿'));
    r.onsuccess = () => { const c = r.result; if (c) { out.push({ schluessel: c.key, blob: c.value }); c.continue(); } };
    tx.oncomplete = () => ok(out.sort((a, b) => a.schluessel.localeCompare(b.schluessel)));
    tx.onerror = () => fehler(tx.error);
  });
}
export async function loescheFotosMit(praefix) {
  return anfrage('readwrite', (s) => s.delete(IDBKeyRange.bound(praefix, praefix + '￿')));
}

/** Foto verkleinern und als JPEG zurückgeben (dreht nach EXIF, wo der Browser das kann). */
export async function verkleinere(datei, lang = 1280, qualitaet = 0.72) {
  let bild;
  try { bild = await createImageBitmap(datei, { imageOrientation: 'from-image' }); }
  catch {
    bild = await new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = URL.createObjectURL(datei); });
  }
  const b = bild.width, hh = bild.height;
  const f = Math.min(1, lang / Math.max(b, hh));
  const c = document.createElement('canvas');
  c.width = Math.round(b * f);
  c.height = Math.round(hh * f);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bild, 0, 0, c.width, c.height);
  bild.close?.();
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', qualitaet));
  c.width = c.height = 0;
  return blob;
}

/** Breite und Höhe eines JPEG aus den Bytes (für das PDF). */
export function jpegGroesse(bytes) {
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const m = bytes[i + 1];
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (m >= 0xc0 && m <= 0xc3) return { hoehe: (bytes[i + 5] << 8) | bytes[i + 6], breite: (bytes[i + 7] << 8) | bytes[i + 8], farben: bytes[i + 9] };
    i += 2 + len;
  }
  return null;
}
