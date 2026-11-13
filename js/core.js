// Prüfsinn – Grundfunktionen: DOM-Helfer, Speicher, Dialoge, Formatierung, Spracheingabe

const SVG = 'http://www.w3.org/2000/svg';

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  clipboard: 'M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1z M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2 M9 14l2 2 4-4.5',
  book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z M5 19.5A1.5 1.5 0 0 0 6.5 21H19 M9 7.5h6',
  calc: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M8.5 7h7v3h-7z M8.6 14h.01 M12 14h.01 M15.4 14h.01 M8.6 17.5h.01 M12 17.5h.01 M15.4 17.5h.01',
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5.5 11a6.5 6.5 0 0 0 13 0 M12 17.5V21',
  stop: 'M7 7h10v10H7z',
  plus: 'M12 5v14 M5 12h14',
  x: 'M6 6l12 12 M18 6 6 18',
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  down: 'M6 9l6 6 6-6',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  share: 'M12 15V3 M8 7l4-4 4 4 M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7',
  star: 'M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v5 M14 11v5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  truck: 'M5.7 16H2.5V6H14v10H8.3 M14 16h1.7 M18.3 16H21v-3.1L17.8 9.5H14 M7 15.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z M17 15.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z',
  car: 'M5 11l1.6-4.6A2 2 0 0 1 8.5 5h7a2 2 0 0 1 1.9 1.4L19 11 M3 11h18v6H3z M6 17v2 M18 17v2 M7 14h.01 M17 14h.01',
  alert: 'M12 4 2.5 20h19z M12 10v5 M12 17.5h.01',
  sliders: 'M4 7h10 M18 7h2 M4 17h2 M10 17h10 M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0z M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z',
  download: 'M12 4v11 M8 11l4 4 4-4 M5 20h14',
  upload: 'M12 15V4 M8 8l4-4 4 4 M5 20h14',
  doc: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M14 3v5h5 M9 13h6 M9 17h4',
  kamera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  werkzeug: 'M14.5 4.5a4 4 0 0 0-5 5L4 15v5h5l5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  text: 'M5 6h14 M5 10h14 M5 14h9 M5 18h6',
  listcheck: 'M4 6l1.5 1.5L8 5 M4 12l1.5 1.5L8 11 M4 18l1.5 1.5L8 17 M11.5 6H20 M11.5 12H20 M11.5 18H20',
  bulb: 'M9.5 18h5 M10.5 21h3 M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5 M12 8h.01',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  gauge: 'M4 16a8 8 0 1 1 16 0 M12 16l4-5.5 M12 8v1.5 M6.5 10.5l1 1 M17.5 10.5l-1 1',
  tire: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 3v6 M12 15v6 M3 12h6 M15 12h6',
  calendar: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M4 10h16 M8 3v4 M16 3v4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  beam: 'M9 5a7 7 0 0 0 0 14c1.2 0 1.2-14 0-14z M13.5 8H20 M13.5 12H21 M13.5 16H20',
  swap: 'M4 8h14 M14 4l4 4-4 4 M20 16H6 M10 12l-4 4 4 4',
  offline: 'M3 3l18 18 M8.5 16.5a5 5 0 0 1 7 0 M5 13a10 10 0 0 1 4-2.6 M19 13a10 10 0 0 0-5-2.8 M12 20h.01',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  spark: 'M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z',
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  wheel: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
  weight: 'M8 7a4 4 0 0 1 8 0 M5.5 7h13L21 20H3z M12 11v4',
  dots: 'M12 6h.01 M12 12h.01 M12 18h.01',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4 12H2 M22 12h-2 M5 5l1.4 1.4 M17.6 17.6 19 19 M5 19l1.4-1.4 M17.6 6.4 19 5',
  paragraph: 'M10 20V4h7 M14 20V4 M10 12a4 4 0 0 1 0-8',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z M12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
};

export function icon(name, size = 22) {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', name === 'dots' ? '2.6' : '1.8');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', ICONS[name] || ICONS.info);
  s.append(p);
  return s;
}

const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'open']);

/** Kleiner DOM-Baukasten: h('div', {class:'x', onclick: fn}, kind1, 'text', …) */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  const later = [];
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v; // nur für selbst erzeugte, geprüfte Inhalte
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (PROPS.has(k)) later.push([k, v]);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  add(el, kids);
  for (const [k, v] of later) el[k] = v;
  return el;
}
function add(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false || k === true) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}
export const $ = (sel, root = document) => root.querySelector(sel);
export function clear(el) { el.replaceChildren(); return el; }

// ---------- Speicher (nur auf diesem Gerät) ----------
const PRE = 'pk.';
export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(PRE + key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(PRE + key, JSON.stringify(val)); return true; }
    catch { toast('Speichern nicht möglich – Gerätespeicher voll?'); return false; }
  },
  remove(key) { try { localStorage.removeItem(PRE + key); } catch { /* egal */ } },
  all() {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PRE)) out[k.slice(PRE.length)] = JSON.parse(localStorage.getItem(k));
      }
    } catch { /* egal */ }
    return out;
  },
  importAll(obj) {
    for (const [k, v] of Object.entries(obj || {})) this.set(k, v);
  },
};

// ---------- Formatierung ----------
const nf = (d) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
export function fmt(n, digits = 1) {
  if (n == null || !isFinite(n)) return '–';
  return nf(digits).format(n);
}
export function parseNum(v) {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return NaN;
  return Number(s);
}
export const pad2 = (n) => String(n).padStart(2, '0');
export function isoToday(d = new Date()) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
export function fmtDate(iso, opts = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', opts);
}
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return isoToday(new Date(y, m - 1, d + n));
}
/** Monat/Jahr + n Monate → {m, y} */
export function addMonths(m, y, n) {
  const t = (y * 12 + (m - 1)) + n;
  return { m: (t % 12) + 1, y: Math.floor(t / 12) };
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export function debounce(fn, ms = 160) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- Hinweise ----------
let toastBox;
export function toast(msg, { action, onAction, ms = 2600 } = {}) {
  if (!toastBox) { toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(toastBox); }
  const t = h('div', { class: 'toast' }, msg, action && h('button', { onclick: () => { onAction?.(); weg(); } }, action));
  toastBox.append(t);
  const weg = () => { t.classList.add('out'); setTimeout(() => t.remove(), 220); };
  setTimeout(weg, action ? 5000 : ms);
}

// ---------- Blatt / Dialog ----------
// ---------- Seite hinter einem Dialog festhalten ----------
// Solange ein Dialog offen ist, darf die Seite dahinter nicht mitscrollen.
// Auf Touch-Geräten geschieht das hier: Wischen auf der Dialogfläche wird nur dort durchgelassen, wo der Dialog selbst
// scrollen kann. Die Seite per CSS festzusetzen (overflow: hidden, position: fixed) verändert in Safari auf dem iPhone
// die Höhe des Bildschirms und schiebt den Dialog unter die Leiste – deshalb gilt die CSS-Sperre nur am Rechner.
let sperren = 0;
export function sperreSeite(flaeche) {
  if (sperren++ === 0) document.documentElement.classList.add('gesperrt');
  flaeche?.addEventListener('touchmove', (e) => {
    for (let n = e.target; n && n !== flaeche; n = n.parentElement) {
      const st = getComputedStyle(n);
      if (n.scrollHeight > n.clientHeight + 1 && /auto|scroll/.test(st.overflowY)) return;
      if (n.scrollWidth > n.clientWidth + 1 && /auto|scroll/.test(st.overflowX)) return;
    }
    e.preventDefault();
  }, { passive: false });
}
export function gibSeiteFrei() {
  if (sperren > 0 && --sperren === 0) document.documentElement.classList.remove('gesperrt');
}

export function sheet({ title, body, footer, cls = '', onClose }) {
  const back = h('div', { class: 'sheet-back' });
  const box = h('div', { class: 'sheet ' + cls, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-head' },
      h('h2', null, title),
      h('button', { class: 'icon-btn', 'aria-label': 'Schließen', onclick: () => close() }, icon('x'))),
    h('div', { class: 'sheet-body' }, body),
    footer && h('div', { class: 'sheet-foot' }, footer));
  back.append(box);
  const vorher = document.activeElement;
  let zu = false;
  function close() {
    if (zu) return;
    zu = true;
    back.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    gibSeiteFrei();
    setTimeout(() => back.remove(), 240);
    onClose?.();
    if (vorher && vorher.focus) vorher.focus({ preventScroll: true });
  }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', onKey);
  sperreSeite(back);
  document.body.append(back);
  requestAnimationFrame(() => requestAnimationFrame(() => back.classList.add('open')));
  return { close, el: box, body: box.querySelector('.sheet-body') };
}

export function confirmSheet(title, text, okLabel = 'Löschen', danger = true) {
  return new Promise((resolve) => {
    let ok = false;
    const s = sheet({
      title,
      body: h('p', { class: 'muted' }, text),
      footer: [
        h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Abbrechen'),
        h('button', { class: 'btn ' + (danger ? 'danger' : ''), onclick: () => { ok = true; s.close(); } }, okLabel),
      ],
      onClose: () => resolve(ok),
    });
  });
}

// ---------- Zwischenablage / Teilen ----------
export async function copyText(text, msg = 'Kopiert') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* nichts */ }
    ta.remove();
  }
  toast(msg);
}
export async function shareText(title, text) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  await copyText(text, 'In die Zwischenablage kopiert');
}
/** Datei teilen (Handy: Teilen-Menü) oder herunterladen (Rechner). */
export async function teileDatei(blob, name) {
  try {
    const datei = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [datei] }) && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ files: [datei], title: name });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Gespeichert: ' + name);
}
export function downloadFile(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- Formular-Bausteine ----------
export function field(label, control, hint) {
  // Ein <label> darf nur ein einzelnes Eingabefeld umschließen. Liegt es um eine Knopfgruppe, reicht Safari auf dem
  // iPhone jeden Tipp an den ersten Knopf weiter – die Auswahl springt dann immer auf die erste Möglichkeit.
  const einzeln = !!control && /^(INPUT|SELECT|TEXTAREA)$/.test(control.tagName || '');
  return h(einzeln ? 'label' : 'div', { class: 'field', role: einzeln ? null : 'group', 'aria-label': einzeln ? null : label },
    h('span', { class: 'lab' }, label), control, hint && h('span', { class: 'hint' }, hint));
}
export function seg(options, value, onChange, cls = '') {
  // Die Knöpfe werden einmal gebaut und nie ersetzt: Ein Knopf, der während seines eigenen Klicks aus der Seite
  // verschwindet, bringt Browser bei der weiteren Verarbeitung des Klicks durcheinander.
  const knoepfe = options.map(([v, l]) => h('button', { type: 'button', onclick: () => { setze(v); onChange(v); } }, l));
  const setze = (val) => knoepfe.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === val)));
  setze(value);
  return h('div', { class: 'seg ' + cls, role: 'group' }, knoepfe);
}

// ---------- Spracheingabe ----------
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const diktatMoeglich = !!SR;

/** Startet die Spracherkennung. onText(text, final) – liefert Zwischen- und Endergebnisse. */
export function diktat({ onText, onEnd, onError }) {
  if (!SR) { onError?.('nicht-unterstuetzt'); return null; }
  const r = new SR();
  r.lang = 'de-DE';
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 1;
  let aktiv = true;
  r.onresult = (e) => {
    let zwischen = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) onText(res[0].transcript.trim(), true);
      else zwischen += res[0].transcript;
    }
    if (zwischen) onText(zwischen.trim(), false);
  };
  r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') onError?.(e.error); };
  r.onend = () => {
    // Manche Browser beenden nach kurzer Pause – solange aktiv, einfach weiterhören
    if (aktiv) { try { r.start(); return; } catch { /* dann eben Ende */ } }
    onEnd?.();
  };
  try { r.start(); } catch { onError?.('start'); return null; }
  return { stop() { aktiv = false; try { r.stop(); } catch { /* egal */ } } };
}
export function diktatFehlerText(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Mikrofon nicht freigegeben – bitte im Browser erlauben.';
  if (code === 'network') return 'Spracherkennung braucht hier eine Internetverbindung.';
  if (code === 'nicht-unterstuetzt') return 'Dieser Browser unterstützt keine Spracheingabe – bitte die Diktierfunktion der Tastatur nutzen.';
  return 'Spracheingabe nicht möglich (' + code + ').';
}
