// Prüfsinn – Aufträge und Befund: Tagesliste, Mängel per Sprache oder Tippen erfassen, Ergebnis ableiten

import { h, icon, clear, store, sheet, confirmSheet, copyText, shareText, toast, field, seg, uid, isoToday, fmtDate, addDays, pad2, debounce,
  diktat, diktatMoeglich, diktatFehlerText, teileDatei } from '../core.js';
import { befundPdf, befundDateiname } from '../bericht.js';
import { katalog, punktTitel, STUFE, STUFEN_WAHL, FOLGEN, FRISTEN, naechsteHU, plakette, AUFTRAGSARTEN, sichtFuer, SICHTEN, nummerVon, einstufungsQuelle } from '../daten.js';
import { sucheMaengel, teileDiktat, markiere } from '../suche.js';
import { sev, zeigePunkt } from './wissen.js';
import { plakettenBild } from './rechner.js';
import { ablaufFuer } from '../ablauf.js';
import * as pruefung from './pruefung.js';
import * as gutachten from './gutachten.js';
import { loescheFotosMit, fotosMit, speichereFoto, loescheFoto, verkleinere, jpegGroesse } from '../fotos.js';
import { sucheSchluessel, sucheTypdaten, typdatenTeile } from '../fahrzeugdaten.js';

// ---------- Daten ----------
export const alle = () => store.get('auftraege', []);
const sichere = (liste) => store.set('auftraege', liste);
export const hole = (id) => alle().find((a) => a.id === id);
export function aendere(id, fn) {
  const liste = alle();
  const a = liste.find((x) => x.id === id);
  if (!a) return null;
  fn(a);
  a.geaendert = Date.now();
  sichere(liste);
  return a;
}
export function neuerAuftrag(vorgabe = {}) {
  const jetzt = new Date();
  const a = {
    id: uid(), datum: isoToday(), zeit: `${pad2(jetzt.getHours())}:${pad2(jetzt.getMinutes())}`,
    kennzeichen: '', fahrzeug: '', fin: '', km: '', ez: '', hsn: '', kunde: '', art: AUFTRAGSARTEN[0], fahrzeugart: 'pkw', ersteHU: false,
    status: 'offen', notiz: '', befunde: [], erstellt: Date.now(), ...vorgabe,
  };
  sichere([...alle(), a]);
  return a;
}

export function ergebnis(a) {
  let s = 'O';
  for (const b of a.befunde) if (STUFE[b.s].rang > STUFE[s].rang) s = b.s;
  return s;
}
const istHU = (a) => /^(HU|Nachprüfung)/.test(a.art) && !/Vorab/.test(a.art);
export const istAbnahme = (a) => /abnahme|umbau/i.test(a.art || '');
const zaehle = (a) => {
  const z = {};
  for (const b of a.befunde) z[b.s] = (z[b.s] || 0) + 1;
  return z;
};
function plusEinMonat(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const ziel = new Date(y, m, 1);
  const letzter = new Date(ziel.getFullYear(), ziel.getMonth() + 1, 0).getDate();
  return isoToday(new Date(ziel.getFullYear(), ziel.getMonth(), Math.min(d, letzter)));
}

/** Gemeinsamer Weg zum Befundblatt (Auftragsseite und geführte Prüfung). */
export async function befundblattTeilen(id) {
  const akt = hole(id);
  if (!akt) return;
  const e = ergebnis(akt);
  // Fotos je Befund (Schlüssel <auftrag>/b-<befund>/<zeit>)
  const fotos = new Map();
  try {
    for (const f of await fotosMit(`${id}/b-`)) {
      const bid = f.schluessel.split('/')[1].slice(2);
      const daten = new Uint8Array(await f.blob.arrayBuffer());
      const gr = jpegGroesse(daten);
      if (gr) { if (!fotos.has(bid)) fotos.set(bid, []); fotos.get(bid).push({ daten, ...gr }); }
    }
  } catch { /* ohne Fotos */ }
  const blob = befundPdf(akt, { e, nachpruefung: (e === 'E' || e === 'V') ? plusEinMonat(akt.datum) : null, fotos });
  await teileDatei(blob, befundDateiname(akt));
}

export function fuegeBefundHinzu(id, e, ort = '', extra = null) {
  let neu;
  aendere(id, (a) => {
    neu = e.frei
      ? { id: uid(), frei: true, titel: e.text, text: '', s: e.s || 'H', ort, ts: Date.now() }
      : { id: uid(), kat: e.id, nr: e.nr, b: e.b, ...(e.d ? { d: true } : {}), titel: e.titel, text: e.text, wenn: e.wenn || '', s: e.s[0], ort, ts: Date.now() };
    if (extra) Object.assign(neu, extra);
    a.befunde.push(neu);
    if (a.status === 'offen') a.status = 'laeuft';
  });
  return neu;
}

/** Aus dem Katalog heraus: Auftrag wählen, zu dem der Mangel gehört. */
export async function waehleAuftrag(e) {
  const kat = await katalog();
  const eintrag = { ...e, titel: punktTitel(kat.punktNach.get(e.nr)) };
  const offen = alle().filter((a) => a.datum === isoToday() && a.status !== 'fertig');
  const nimm = (a) => {
    fuegeBefundHinzu(a.id, eintrag);
    s.close();
    toast(`Zum Befund ${a.kennzeichen || 'ohne Kennzeichen'} hinzugefügt`, { action: 'Öffnen', onAction: () => { location.hash = '#/auftraege/' + a.id; } });
  };
  const s = sheet({
    title: 'Zu welchem Befund?',
    body: h('div', { class: 'stack' },
      h('div', { class: 'rowx top' }, sev(e.s[0]), h('div', { class: 'grow small' }, h('b', null, eintrag.titel), h('div', { class: 'muted pre' }, e.wenn || e.text))),
      offen.length ? h('div', { class: 'list' }, offen.map((a) => h('button', { class: 'item', onclick: () => nimm(a) },
        kennzeichen(a), h('div', { class: 'grow' }, h('div', { class: 't' }, a.fahrzeug || a.art), h('div', { class: 'd' }, `${a.zeit} · ${a.befunde.length} Einträge`)), icon('plus', 20)))) : h('p', { class: 'muted small' }, 'Heute ist noch kein offener Auftrag angelegt.'),
      h('button', { class: 'btn tonal block', onclick: () => nimm(neuerAuftrag()) }, icon('plus', 18), 'Neuer Schnellbefund')),
  });
}

export function kennzeichen(a, gross) {
  return a.kennzeichen
    ? h('span', { class: 'plate' + (gross ? ' gross' : '') }, h('span', null, a.kennzeichen))
    : h('span', { class: 'plate leer' + (gross ? ' gross' : '') }, h('span', null, 'ohne Kennz.'));
}
const STATUS = { offen: 'Offen', laeuft: 'In Arbeit', fertig: 'Fertig' };

// ---------- Formular ----------
function formular(a, nachSpeichern) {
  const neu = !a;
  const v = a ? { ...a } : { datum: isoToday(), zeit: '', kennzeichen: '', fahrzeug: '', fin: '', km: '', ez: '', hsn: '', kunde: '', art: AUFTRAGSARTEN[0], fahrzeugart: 'pkw', ersteHU: false, notiz: '' };
  const inp = (key, attrs = {}) => h('input', { class: 'input', value: v[key] || '', oninput: (e) => { v[key] = e.target.value; }, ...attrs });
  const kz = inp('kennzeichen', { placeholder: 'B-XY 1234', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false', style: { textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' } });
  const fz = inp('fahrzeug', { placeholder: 'z. B. VW Golf VII 2.0 TDI', autocomplete: 'off' });
  // HSN/TSN (Feld 2.1/2.2) → Hersteller und Handelsname (KBA FZ 6), dazu die technischen Daten des Typs (KBA SV 4)
  const schluesselOrt = h('div', { class: 'xs muted', style: { marginTop: '-4px' } });
  const zeigeSchluessel = debounce(async () => {
    const fuer = v.hsn;
    const [fz6, sv4] = await Promise.allSettled([sucheSchluessel(fuer), sucheTypdaten(fuer)]);
    if (fuer !== v.hsn) return;
    clear(schluesselOrt);
    const r = fz6.status === 'fulfilled' ? fz6.value : null;
    const t = sv4.status === 'fulfilled' && sv4.value && !sv4.value.unbekannt ? sv4.value : null;
    if (!r && !t) {
      if (fz6.status === 'rejected' && sv4.status === 'rejected') schluesselOrt.append('KBA-Typenlisten nicht geladen – einmal mit Internet öffnen.');
      return;
    }
    // Hersteller und Name: FZ 6 (Bestand), sonst SV 4 (kennt auch neuere Typen)
    const hersteller = r && !r.unbekannt ? r.hersteller : t?.hersteller || r?.hersteller || '';
    const name = r && !r.unbekannt ? r.name : t?.name || '';
    if (!name) {
      const s = r || sv4.value || {};
      schluesselOrt.append(s.unbekannt === 'hsn' || !hersteller ? `Herstellerschlüssel ${s.hsn} steht nicht in den KBA-Verzeichnissen.` : `${hersteller}: Typschlüssel ${s.tsn} nicht in den KBA-Verzeichnissen.`);
      return;
    }
    const kurz = (t?.marke || '').split(',')[0].trim() || (hersteller.split('-').pop() || hersteller).trim();
    const vorschlag = `${kurz} ${name}`.trim();
    schluesselOrt.append(
      h('div', null, h('b', { style: { color: 'var(--text)' } }, `${hersteller} · ${name}`), r && !r.unbekannt ? ` · ${r.bestand.toLocaleString('de-DE')} im Bestand` : '',
        !String(v.fahrzeug || '').trim() ? h('button', { class: 'tag', type: 'button', style: { marginLeft: '8px', cursor: 'pointer', border: '1px solid var(--line)', font: 'inherit' }, onclick: () => { v.fahrzeug = vorschlag; fz.value = vorschlag; zeigeSchluessel(); } }, `„${vorschlag}“ übernehmen`) : null),
      t ? h('div', { class: 'num', style: { marginTop: '2px' } }, typdatenTeile(t).join(' · ')) : null,
      h('div', { class: 'faint', style: { marginTop: '2px' } }, [r && !r.unbekannt && `KBA FZ 6, ${r.quelle.lizenz}`, t && 'KBA SV 4, mit Zustimmung des KBA'].filter(Boolean).join(' · ')));
  }, 250);
  const hsnFeld = inp('hsn', { placeholder: 'z. B. 0603/BPG', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
  hsnFeld.addEventListener('input', zeigeSchluessel);
  if (v.hsn) zeigeSchluessel();
  const body = h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); speichern(); } },
    h('div', { class: 'grid2' }, field('Kennzeichen', kz), field('Uhrzeit', inp('zeit', { type: 'time' }))),
    field('Fahrzeug', fz),
    h('div', { class: 'grid2' },
      field('Art der Prüfung', h('select', { class: 'select', value: v.art, onchange: (e) => { v.art = e.target.value; } }, AUFTRAGSARTEN.map((x) => h('option', { value: x }, x)))),
      field('Datum', inp('datum', { type: 'date' }))),
    field('Fahrzeugart', h('select', { class: 'select', value: v.fahrzeugart, onchange: (e) => { v.fahrzeugart = e.target.value; } }, FRISTEN.map((f) => h('option', { value: f.id }, f.label))), 'Bestimmt die nächste Frist und den Ablauf: Lkw über 3,5 t bekommen die Lkw-Prüfung.'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!v.ersteHU, onchange: (e) => { v.ersteHU = e.target.checked; } }), h('span', null, 'Erste HU nach Erstzulassung')),
    h('div', { class: 'grid2' }, field('Kilometerstand', inp('km', { inputmode: 'numeric', placeholder: 'km' })), field('FIN (optional)', inp('fin', { autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false', maxlength: 17 }))),
    h('div', { class: 'grid2' }, field('Erstzulassung', inp('ez', { placeholder: 'MM/JJJJ', autocomplete: 'off' })), field('Schlüssel-Nr. HSN/TSN', hsnFeld)),
    schluesselOrt,
    field('Kunde / Ort (optional)', inp('kunde', { autocomplete: 'off' }), 'Bleibt nur auf diesem Gerät gespeichert.'),
    h('button', { type: 'submit', class: 'hide' }));
  function speichern() {
    v.kennzeichen = (v.kennzeichen || '').toUpperCase().trim();
    v.fin = (v.fin || '').toUpperCase().trim();
    let ziel;
    if (neu) { const vg = { ...v }; if (!vg.zeit) delete vg.zeit; ziel = neuerAuftrag(vg); }
    else ziel = aendere(a.id, (x) => Object.assign(x, v));
    s.close();
    nachSpeichern?.(ziel);
  }
  const s = sheet({
    title: neu ? 'Neuer Auftrag' : 'Auftrag bearbeiten',
    body,
    footer: [h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Abbrechen'), h('button', { class: 'btn', onclick: speichern }, neu ? 'Anlegen' : 'Speichern')],
  });
  if (neu) setTimeout(() => kz.focus(), 300);
}

// ---------- Liste ----------
function seiteListe(el) {
  let tag = store.get('auftraege.tag', isoToday());
  if (tag < addDays(isoToday(), -1)) tag = isoToday(); // nach Tageswechsel wieder auf heute
  const inhalt = h('div', { class: 'stack' });

  function zeichne() {
    store.set('auftraege.tag', tag);
    clear(inhalt);
    const heute = tag === isoToday();
    const liste = alle().filter((a) => a.datum === tag).sort((a, b) => (a.zeit || '').localeCompare(b.zeit || ''));
    const n = (st) => liste.filter((a) => a.status === st).length;
    inhalt.append(
      h('div', { class: 'rowx between' },
        h('div', { class: 'rowx' },
          h('button', { class: 'icon-btn', 'aria-label': 'Vorheriger Tag', onclick: () => { tag = addDays(tag, -1); zeichne(); } }, icon('left')),
          h('div', null, h('div', { style: { fontWeight: 700 } }, heute ? 'Heute' : fmtDate(tag, { weekday: 'long' })), h('div', { class: 'xs muted num' }, fmtDate(tag, { day: '2-digit', month: 'long', year: 'numeric' }))),
          h('button', { class: 'icon-btn', 'aria-label': 'Nächster Tag', onclick: () => { tag = addDays(tag, 1); zeichne(); } }, icon('right'))),
        !heute && h('button', { class: 'btn small ghost', onclick: () => { tag = isoToday(); zeichne(); } }, 'Heute')),
      h('div', { class: 'today-stats' },
        h('div', { class: 'stat' }, h('b', null, n('offen')), h('span', null, 'offen')),
        h('div', { class: 'stat' }, h('b', null, n('laeuft')), h('span', null, 'in Arbeit')),
        h('div', { class: 'stat' }, h('b', null, n('fertig')), h('span', null, 'fertig'))));
    if (!liste.length) {
      inhalt.append(h('div', { class: 'card pad empty' }, h('div', { class: 'big' }, icon('clipboard', 28)), h('h3', null, heute ? 'Noch keine Aufträge heute' : 'Keine Aufträge an diesem Tag'),
        h('p', null, 'Auftrag anlegen – oder direkt mit einem Schnellbefund loslegen und die Daten später ergänzen.'),
        h('div', { class: 'rowx wrap', style: { justifyContent: 'center' } },
          h('button', { class: 'btn', onclick: () => formular(null, zeichne) }, icon('plus', 18), 'Auftrag'),
          h('button', { class: 'btn tonal', onclick: () => { const a = neuerAuftrag({ datum: tag }); location.hash = '#/auftraege/' + a.id; } }, icon('mic', 18), 'Schnellbefund'))));
      return;
    }
    inhalt.append(h('div', { class: 'list' }, liste.map((a) => {
      const e = ergebnis(a);
      return h('a', { class: 'item job', href: '#/auftraege/' + a.id },
        h('span', { class: 'zeit' }, a.zeit || '–'),
        h('div', { class: 'grow stack-s' },
          h('div', { class: 'rowx wrap' }, kennzeichen(a), h('span', { class: 'tag' }, a.art)),
          h('div', { class: 't' }, a.fahrzeug || h('span', { class: 'faint' }, 'Fahrzeug nicht angegeben')),
          h('div', { class: 'status' }, h('span', { class: 'dot dot-' + (a.status === 'fertig' ? 'O' : a.status === 'laeuft' ? 'G' : 'U'), style: a.status === 'offen' ? { background: 'var(--faint)' } : null }), STATUS[a.status],
            a.befunde.length ? ` · ${a.befunde.length} ${a.befunde.length === 1 ? 'Eintrag' : 'Einträge'}` : '')),
        (a.befunde.length || a.status === 'fertig') ? sev(e) : null,
        h('span', { class: 'chev' }, icon('right', 18)));
    })));
  }

  el.append(
    h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, 'Aufträge'), h('p', { class: 'sub' }, 'Tagesplan und Befunde – gespeichert nur auf diesem Gerät.')),
      h('button', { class: 'btn fab', onclick: () => formular(null, zeichne) }, icon('plus', 20), 'Auftrag')),
    inhalt);
  zeichne();
}

// ---------- Befund-Eingabe (Tippen + Diktat) ----------
export function eingabe(a, kat, onAenderung) {
  const el = h('div', { class: 'composer' });
  const live = h('div', { class: 'live-text hide' });
  const vorschlaege = h('div');
  const input = h('input', { type: 'search', placeholder: 'Mangel eintippen oder einsprechen …', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search', 'aria-label': 'Mangel suchen' });
  let lauf = null;
  let auto = store.get('befund.auto', false);
  const erkannt = []; // gesprochene Phrasen, die noch auf Auswahl warten
  // Sicht der Suche: richtet sich nach der Fahrzeugart des Auftrags und lässt sich hier umschalten
  let sicht = sichtFuer(a.fahrzeugart);

  function nimm(e, ort, quelle) {
    fuegeBefundHinzu(a.id, e, ort);
    if (quelle) { const i = erkannt.indexOf(quelle); if (i >= 0) erkannt.splice(i, 1); }
    else { input.value = ''; }
    zeichne();
    onAenderung();
  }
  function block(phrase, quelle) {
    const r = sucheMaengel(kat, phrase, { max: quelle ? 3 : 6, fahrzeug: sicht });
    return h('div', { class: 'sugg' },
      h('div', { class: 'sugg-head' },
        h('div', { class: 'small', style: { fontWeight: 650 } }, quelle ? `„${phrase}“` : `${r.anzahl} Treffer`, r.ort && h('span', { class: 'tag ort', style: { marginLeft: '8px' } }, icon('pin', 13), r.ort)),
        quelle && h('button', { class: 'icon-btn', 'aria-label': 'Verwerfen', style: { width: '34px', height: '34px' }, onclick: () => { erkannt.splice(erkannt.indexOf(quelle), 1); zeichne(); } }, icon('x', 18))),
      r.ergebnisse.map((x) => h('button', { class: 'sugg-item', type: 'button', onclick: () => nimm({ ...x.e, titel: x.titel }, r.ort, quelle) },
        sev(x.e.s[0]),
        h('div', { class: 'grow' }, h('div', { class: 't' }, x.titel), h('div', { class: 'd pre clamp2', html: markiere(x.e.wenn ? x.e.text + ' – ' + x.e.wenn : x.e.text, r.begriffe) })),
        h('span', { class: 'add' }, icon('plus', 20)))),
      r.beiLkw ? h('button', { class: 'sugg-mehr', type: 'button', onclick: () => waehleSicht('lkw') }, icon('truck', 16), `${r.beiLkw} weitere Treffer bei Lkw anzeigen`) : null,
      h('button', { class: 'sugg-item', type: 'button', onclick: () => nimm({ frei: true, text: phrase.trim() }, '', quelle) },
        sev('H'), h('div', { class: 'grow' }, h('div', { class: 't' }, 'Als Freitext übernehmen'), h('div', { class: 'd' }, r.ergebnisse.length ? 'Ohne Katalogbezug, Einstufung danach wählen' : 'Kein passender Katalogeintrag gefunden')), h('span', { class: 'add' }, icon('plus', 20))));
  }
  function zeichne() {
    clear(vorschlaege);
    for (const p of erkannt) vorschlaege.append(block(p.text, p));
    const t = input.value.trim();
    if (t.length >= 2 && !lauf) vorschlaege.append(block(t, null));
  }
  function gesprochen(text, final) {
    live.classList.remove('hide');
    live.textContent = final ? '' : text + ' …';
    if (!final) return;
    for (const phrase of teileDiktat(text)) {
      const r = sucheMaengel(kat, phrase, { max: 1, fahrzeug: sicht });
      if (auto && r.ergebnisse.length) {
        const x = r.ergebnisse[0];
        const neu = fuegeBefundHinzu(a.id, { ...x.e, titel: x.titel }, r.ort);
        toast(`${STUFE[x.e.s[0]].code} · ${x.titel}`, { action: 'Rückgängig', onAction: () => { aendere(a.id, (y) => { y.befunde = y.befunde.filter((b) => b.id !== neu.id); }); onAenderung(); } });
        onAenderung();
      } else {
        erkannt.push({ text: phrase });
      }
    }
    zeichne();
  }
  const mic = h('button', { class: 'mic', type: 'button', 'aria-label': 'Diktat starten oder beenden', onclick: () => {
    if (lauf) { lauf.stop(); return; }
    if (!diktatMoeglich) { toast(diktatFehlerText('nicht-unterstuetzt'), { ms: 5000 }); input.focus(); return; }
    const ende = () => { lauf = null; mic.classList.remove('live'); el.classList.remove('live'); live.classList.add('hide'); clear(mic).append(icon('mic')); zeichne(); };
    lauf = diktat({ onText: gesprochen, onEnd: ende, onError: (c) => { toast(diktatFehlerText(c), { ms: 5000 }); ende(); } });
    if (lauf) { mic.classList.add('live'); el.classList.add('live'); clear(mic).append(icon('stop')); live.classList.remove('hide'); live.textContent = 'Ich höre zu – Mangel nennen, z. B. „Bremsschlauch vorne links porös“'; zeichne(); }
  } }, icon('mic'));

  input.addEventListener('input', debounce(zeichne, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); vorschlaege.querySelector('.sugg:last-child .sugg-item')?.click(); }
  });
  const sichtOrt = h('div', { class: 'sicht' });
  function waehleSicht(v) { sicht = v; zeichneSicht(); zeichne(); }
  function zeichneSicht() {
    clear(sichtOrt);
    if (sicht) sichtOrt.append(h('span', { class: 'xs faint' }, 'Mängel für'), seg(SICHTEN, sicht, (v) => { sicht = v; zeichne(); }, 'klein'));
  }
  zeichneSicht();
  el.append(
    h('div', { class: 'zeile' }, icon('search'), input, mic),
    sichtOrt,
    live,
    h('label', { class: 'check small muted', style: { minHeight: '40px', marginTop: '4px' } },
      h('input', { type: 'checkbox', checked: auto, onchange: (e) => { auto = e.target.checked; store.set('befund.auto', auto); } }),
      h('span', null, 'Beim Diktat den besten Treffer direkt übernehmen')),
    vorschlaege);
  return { el, stop: () => lauf && lauf.stop(), fokus: () => input.focus(), probe: (t) => gesprochen(t, true),
    sichtNeu: (art) => { sicht = sichtFuer(art); zeichneSicht(); zeichne(); } };
}

// ---------- Befundtext ----------
export function befundText(a) {
  const e = ergebnis(a);
  const z = [];
  z.push(`BEFUND · ${a.art}`);
  z.push([a.kennzeichen && `Kennzeichen: ${a.kennzeichen}`, a.fahrzeug && `Fahrzeug: ${a.fahrzeug}`].filter(Boolean).join(' · ') || 'Fahrzeug: –');
  const extra = [a.fin && `FIN: ${a.fin}`, a.km && `km-Stand: ${a.km}`].filter(Boolean).join(' · ');
  if (extra) z.push(extra);
  const pruefer = store.get('einstellungen', {}).name;
  z.push(`Datum: ${fmtDate(a.datum, { day: '2-digit', month: '2-digit', year: 'numeric' })}${pruefer ? ' · Prüfer: ' + pruefer : ''}`);
  z.push('');
  z.push(`Ergebnis: ${STUFE[e].code} – ${STUFE[e].name}`);
  if (istHU(a)) {
    z.push(FOLGEN[e].text);
    if (e === 'E' || e === 'V') z.push(`Nachprüfung spätestens bis ${fmtDate(plusEinMonat(a.datum), { day: '2-digit', month: '2-digit', year: 'numeric' })}.`);
    if (FOLGEN[e].plakette) {
      const [y, m] = a.datum.split('-').map(Number);
      const n = naechsteHU(a.fahrzeugart, m, y, a.ersteHU);
      z.push(`Nächste HU: ${pad2(n.m)}/${n.y} (Plakette ${plakette(n.y).name}).`);
    }
  }
  const maengel = a.befunde.filter((b) => b.s !== 'H');
  const hinweise = a.befunde.filter((b) => b.s === 'H');
  const zeile = (b) => [b.titel, b.wenn || b.text].filter(Boolean).join(' – ').replace(/\n/g, ' ') + (b.ort ? ` (${b.ort})` : '') + (b.nr ? ` · Nr. ${nummerVon(b)}` : '');
  if (maengel.length) {
    z.push('', 'Mängel:');
    maengel.sort((x, y) => STUFE[y.s].rang - STUFE[x.s].rang).forEach((b, i) => z.push(`${i + 1}. [${STUFE[b.s].code}] ${zeile(b)}`));
  }
  if (hinweise.length) { z.push('', 'Hinweise:'); hinweise.forEach((b) => z.push(`- ${zeile(b)}`)); }
  if (a.notiz && a.notiz.trim()) z.push('', 'Notiz: ' + a.notiz.trim());
  if (maengel.some((b) => b.nr)) z.push('', einstufungsQuelle(maengel.some((b) => String(b.kat || '').startsWith('de:'))));
  return z.join('\n');
}

/** Fahrzeug-Check mit den Angaben des Auftrags öffnen und die EU-Rückrufe gleich suchen */
function rueckrufePruefen(a) {
  const [mk = '', md = ''] = String(a.fahrzeug || '').trim().split(/\s+/);
  const jahr = (/(\d{4})\s*$/.exec(a.ez || '') || [])[1] || '';
  const k = a.zb?.k || '';
  if (!mk && !k) { toast('Im Auftrag zuerst das Fahrzeug eintragen (z. B. „VW Golf“)'); return; }
  store.set('fahrzeug', { ...store.get('fahrzeug', {}), marke: mk, modell: md, jahr, k, auto: true });
  location.hash = '#/fahrzeug';
}

// ---------- Detail ----------
async function seiteDetail(el, id) {
  let a = hole(id);
  el.append(h('a', { class: 'back', href: '#/auftraege' }, icon('left', 20), 'Aufträge'));
  if (!a) { el.append(h('div', { class: 'card pad empty' }, h('h3', null, 'Auftrag nicht gefunden'), h('a', { class: 'btn', href: '#/auftraege' }, 'Zur Liste'))); return; }
  const kopf = h('div');
  const banner = h('div');
  const befunde = h('div');
  const aktionen = h('div');
  const eingabeOrt = h('div', null, h('div', { class: 'skeleton', style: { height: '74px' } }));
  el.append(kopf, banner, eingabeOrt, befunde, aktionen);
  let ein = null;

  const pdfTeilen = () => befundblattTeilen(id);
  // Umbau in der Werkstatt: kein HU-Befund, nur Umbau-Check und Notizen
  const ws = () => gutachten.istWerkstatt(hole(id));
  function zeichneKopf() {
    a = hole(id);
    const weg = ablaufFuer(a.fahrzeugart);
    clear(kopf).append(
      h('div', { class: 'rowx top' },
        h('div', { class: 'grow stack-s' },
          h('div', { class: 'rowx wrap' }, kennzeichen(a, true), h('span', { class: 'tag' }, a.art), weg.id === 'lkw' && h('span', { class: 'tag' }, icon('truck', 13), 'Lkw')),
          h('h2', { style: { fontSize: '1.25rem' } }, a.fahrzeug || h('span', { class: 'faint' }, 'Fahrzeug ergänzen')),
          h('p', { class: 'small muted num' }, [fmtDate(a.datum), a.zeit, a.km && a.km + ' km', a.kunde].filter(Boolean).join(' · '))),
        h('button', { class: 'icon-btn', 'aria-label': 'EU-Rückrufe prüfen', title: 'EU-Rückrufe prüfen', onclick: () => rueckrufePruefen(hole(id)) }, icon('alert')),
        h('button', { class: 'icon-btn', 'aria-label': 'Bearbeiten', onclick: () => formular(a, alles) }, icon('edit')),
        h('button', { class: 'icon-btn', 'aria-label': 'Löschen', onclick: async () => {
          if (await confirmSheet('Auftrag löschen?', 'Der Auftrag, sein Befund und seine Fotos werden von diesem Gerät entfernt.')) { sichere(alle().filter((x) => x.id !== id)); loescheFotosMit(id + '/').catch(() => {}); location.hash = '#/auftraege'; }
        } }, icon('trash'))),
      h('div', { style: { marginTop: '12px' } }, seg([['offen', 'Offen'], ['laeuft', 'In Arbeit'], ['fertig', 'Fertig']], a.status, (v) => {
        aendere(id, (x) => { x.status = v; }); a = hole(id); zeichneBanner();
        if (v === 'fertig' && !ws()) toast('Befundblatt ist bereit', { action: 'PDF öffnen', onAction: pdfTeilen });
      }, 'full')),
      // Änderungs- und Einzelabnahme: Gutachten-Assistent statt HU-Ablauf
      istAbnahme(a) ? gutachtenStart(a) :
      // Einstieg in die geführte Prüfung
      h('a', { class: 'pm-start', href: `#/auftraege/${id}/pruefung` },
        h('span', { class: 'ico-tile' }, icon('listcheck')),
        h('div', { class: 'grow' }, h('b', null, 'Geführte Prüfung'),
          h('span', null, a.ablauf && (a.ablauf.art || 'pkw') === weg.id ? (a.ablauf.pos >= weg.schritte.length ? 'Abgeschlossen – noch einmal ansehen' : `Schritt ${a.ablauf.pos + 1} von ${weg.schritte.length} – fortsetzen`) : `${weg.lang}: ${weg.schritte.length} Schritte bis zum Befundblatt`)),
        icon('right', 18)));
  }
  function gutachtenStart(x) {
    const z = gutachten.stand(x);
    const g = x.gutachten;
    const ws = gutachten.istWerkstatt(x);
    const zeile = !g ? (ws ? 'Gutachten öffnen – Prüfsinn sagt, was vor der Abnahme zu tun ist' : 'Gutachten öffnen, Fahrzeug eingeben, Auflagen abhaken')
      : !z.gesamt ? `${g.meta?.nr ? 'Nr. ' + g.meta.nr + ' · ' : ''}Eintrag im Verwendungsbereich wählen`
        : `${z.gesamt - z.offen} von ${z.gesamt} ${ws ? 'Punkten erledigt' : 'Auflagen geprüft'}${z.nein ? ` · ${z.nein} ${ws ? 'geht' : 'nicht erfüllt'}${ws ? ' nicht' : ''}` : ''}`;
    return h('a', { class: 'pm-start', href: `#/auftraege/${id}/gutachten` },
      h('span', { class: 'ico-tile' }, icon(ws ? 'werkzeug' : 'doc')),
      h('div', { class: 'grow' }, h('b', null, ws ? 'Umbau prüfen' : 'Gutachten prüfen'), h('span', null, zeile)),
      icon('right', 18));
  }
  function zeichneBanner() {
    a = hole(id);
    const e = ergebnis(a);
    const z = zaehle(a);
    const teile = ['U', 'V', 'E', 'G', 'H'].filter((s) => z[s]).map((s) => `${z[s]} × ${STUFE[s].code}`).join(' · ');
    clear(banner);
    if (ws()) return;
    if (!a.befunde.length && a.status !== 'fertig') {
      banner.append(h('div', { class: 'note' }, icon('spark', 18), h('span', null, h('b', null, 'Befund aufnehmen: '), 'Mangel unten eintippen oder das Mikrofon antippen und einfach sprechen. Die App schlägt den passenden amtlichen Mangel mit Einstufung vor.')));
      return;
    }
    const zeigeFolge = istHU(a);
    let plak = null;
    if (zeigeFolge && FOLGEN[e].plakette) {
      const [y, m] = a.datum.split('-').map(Number);
      const n = naechsteHU(a.fahrzeugart, m, y, a.ersteHU);
      plak = h('div', { class: 'rowx', style: { gap: '12px' } }, plakettenBild(n.m, n.y, 54), h('div', { class: 'small' }, h('b', { class: 'num' }, `Nächste HU ${pad2(n.m)}/${n.y}`), h('div', { style: { opacity: .85 } }, `Plakette ${plakette(n.y).name} · ${n.monate} Monate`)));
    }
    banner.append(h('div', { class: 'banner ' + e },
      h('div', { class: 'code' }, STUFE[e].code),
      h('div', { class: 'txt grow' }, h('b', null, STUFE[e].name), h('span', null, teile || 'Keine Mängel eingetragen'),
        zeigeFolge && h('span', { style: { display: 'block', marginTop: '4px' } }, FOLGEN[e].text, (e === 'E' || e === 'V') ? ` Frist: ${fmtDate(plusEinMonat(a.datum), { day: '2-digit', month: '2-digit', year: 'numeric' })}.` : '')),
      plak));
    if (a.status === 'fertig') banner.append(h('div', { class: 'bericht', style: { marginTop: '12px' } },
      h('div', { class: 'grow' }, h('b', null, 'Befundblatt als PDF'), h('span', null, 'Aufgebaut wie ein Untersuchungsbericht – zum Übertragen.')),
      h('button', { class: 'btn', onclick: pdfTeilen }, icon('download', 18), 'PDF')));
  }
  function stufeWaehlen(b) {
    const s = sheet({
      title: 'Einstufung',
      body: h('div', { class: 'stack' },
        h('p', { class: 'small muted' }, b.titel, !b.kat ? '' : String(b.kat).startsWith('de:') ? ' – Vorgabe laut HU-Richtlinie. Anpassen, wenn der Einzelfall es verlangt.' : ' – Vorgabe laut EU-Mindestkatalog. Anpassen, wenn die HU-Richtlinie oder der Einzelfall es verlangt.'),
        h('div', { class: 'list' }, STUFEN_WAHL.map((st) => h('button', { class: 'item', onclick: () => { aendere(id, (x) => { x.befunde.find((y) => y.id === b.id).s = st; }); s.close(); zeichneBefunde(); zeichneBanner(); } },
          sev(st), h('div', { class: 'grow' }, h('div', { class: 't' }, STUFE[st].name), st !== 'H' && h('div', { class: 'd' }, FOLGEN[st].text)), b.s === st && icon('check', 20))))),
    });
  }
  function ortWaehlen(b) {
    let wert = b.ort || '';
    const inp = h('input', { class: 'input', value: wert, placeholder: 'z. B. vorne links, Achse 2', oninput: (e) => { wert = e.target.value; } });
    const setze = (t) => { const teile = new Set(wert.split(' ').filter(Boolean)); teile.has(t) ? teile.delete(t) : teile.add(t); wert = [...teile].join(' '); inp.value = wert; };
    const fertig = () => { aendere(id, (x) => { x.befunde.find((y) => y.id === b.id).ort = wert.trim(); }); s.close(); zeichneBefunde(); };
    const s = sheet({
      title: 'Lage am Fahrzeug',
      body: h('div', { class: 'stack' }, inp, h('div', { class: 'chips wrap' }, ['vorne', 'hinten', 'links', 'rechts', 'beidseitig', 'innen', 'außen', 'Achse 1', 'Achse 2', 'Achse 3'].map((t) => h('button', { class: 'chip', type: 'button', onclick: () => setze(t) }, t)))),
      footer: [h('button', { class: 'btn', onclick: fertig }, 'Übernehmen')],
    });
  }
  function zeichneBefunde() {
    a = hole(id);
    clear(befunde);
    if (!a.befunde.length) return;
    const sortiert = [...a.befunde].sort((x, y) => STUFE[y.s].rang - STUFE[x.s].rang || x.ts - y.ts);
    befunde.append(
      h('div', { class: 'section-title', style: { marginTop: '8px' } }, h('h2', null, 'Befund'), h('span', { class: 'xs faint' }, `${a.befunde.length} ${a.befunde.length === 1 ? 'Eintrag' : 'Einträge'}`)),
      h('div', { class: 'list' }, sortiert.map((b) => h('div', { class: 'finding' },
        sev(b.s, 'button', { 'aria-label': 'Einstufung ändern', onclick: () => stufeWaehlen(b) }),
        h('div', { class: 'grow' },
          h('div', { class: 't' }, b.titel),
          (b.wenn || b.text) && h('div', { class: 'd pre' }, b.wenn || b.text),
          h('div', { class: 'meta' },
            h('button', { class: 'tag' + (b.ort ? ' ort' : ''), onclick: () => ortWaehlen(b) }, icon('pin', 13), b.ort || 'Lage'),
            b.nr && h('button', { class: 'tag', onclick: () => zeigePunkt(b.nr, { markiert: b.kat }) }, `Nr. ${nummerVon(b)}`),
            b.frei && h('span', { class: 'tag' }, 'Freitext'),
            h('button', { class: 'tag', type: 'button', onclick: () => fotoWaehlen(b) }, icon('kamera', 13), 'Foto'),
            b.ueb && h('span', { class: 'tag', title: 'in die Prüfsoftware übertragen' }, icon('check', 13), 'übertragen')),
          fotoLeiste(b)),
        h('button', { class: 'icon-btn', 'aria-label': 'Entfernen', onclick: () => {
          const kopie = { ...b };
          aendere(id, (x) => { x.befunde = x.befunde.filter((y) => y.id !== b.id); });
          zeichneBefunde(); zeichneBanner();
          toast('Eintrag entfernt', { action: 'Rückgängig', onAction: () => { aendere(id, (x) => { x.befunde.push(kopie); }); zeichneBefunde(); zeichneBanner(); } });
        } }, icon('x', 18))))));
  }
  // ---------- Fotos je Befund ----------
  const fotoUrls = [];
  const fotoFeld = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hide' });
  let fotoFuer = null;
  fotoFeld.addEventListener('change', async () => {
    const dateien = [...(fotoFeld.files || [])];
    fotoFeld.value = '';
    for (const d of dateien) {
      try { await speichereFoto(`${id}/b-${fotoFuer}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, await verkleinere(d)); }
      catch (err) { toast('Foto nicht gespeichert: ' + (err?.message || err)); }
    }
    zeichneBefunde();
  });
  function fotoWaehlen(b) { fotoFuer = b.id; fotoFeld.click(); }
  function fotoLeiste(b) {
    const ort = h('div', { class: 'fotos' });
    fotosMit(`${id}/b-${b.id}/`).then((liste) => {
      for (const f of liste) {
        const url = URL.createObjectURL(f.blob);
        fotoUrls.push(url);
        ort.append(h('button', { class: 'foto', type: 'button', 'aria-label': 'Foto ansehen', onclick: () => {
          const s = sheet({ title: 'Foto · ' + b.titel, body: h('img', { src: url, alt: '', class: 'foto-gross' }),
            footer: [h('button', { class: 'btn danger', onclick: async () => { await loescheFoto(f.schluessel); s.close(); zeichneBefunde(); } }, icon('trash', 18), 'Löschen'),
              h('button', { class: 'btn', onclick: () => s.close() }, 'Schließen')] });
        } }, h('img', { src: url, alt: '' })));
      }
    }).catch(() => {});
    return ort;
  }

  // ---------- Übergabeliste: Befund Zeile für Zeile in die Prüfsoftware übertragen ----------
  function uebergabeListe() {
    const reihe = (x) => String(x.nr || '999').split('.').map((n) => String(parseInt(n, 10) || 0).padStart(3, '0')).join('.') + (x.b || '') + (x.d ? 'z' : '');
    const zeileText = (b) => [b.nr ? nummerVon(b) : '(Freitext)', STUFE[b.s].code, b.ort, b.titel].filter(Boolean).join(' · ');
    let liste;
    const kopfZahl = h('p', { class: 'small muted' });
    const zeichne = () => {
      const akt = hole(id);
      const bs = [...akt.befunde].sort((x, y) => reihe(x).localeCompare(reihe(y)));
      const fertig = bs.filter((b) => b.ueb).length;
      kopfZahl.textContent = `${fertig} von ${bs.length} übertragen. Nummer antippen kopiert sie für das Suchfeld der Prüfsoftware; der Haken merkt sich, was schon drin ist.`;
      clear(liste).append(...bs.map((b) => h('div', { class: 'item uebergabe' + (b.ueb ? ' ist-ok' : '') },
        h('button', { class: 'ueb-haken', type: 'button', 'aria-pressed': b.ueb ? 'true' : 'false', 'aria-label': 'übertragen', onclick: () => { aendere(id, (x) => { const y = x.befunde.find((z) => z.id === b.id); y.ueb = !y.ueb; }); zeichne(); zeichneBefunde(); } }, icon('check', 16)),
        h('button', { class: 'ueb-nr', type: 'button', onclick: () => copyText(b.nr ? nummerVon(b) : b.titel, `${b.nr ? nummerVon(b) : 'Text'} kopiert`) }, b.nr ? nummerVon(b) : 'Freitext'),
        h('div', { class: 'grow' }, h('div', { class: 't' }, b.titel || (b.wenn || b.text || '').split('\n')[0]), h('div', { class: 'd' }, [b.ort, b.titel && b.wenn ? b.wenn.split('\n')[0] : ''].filter(Boolean).join(' · '))),
        sev(b.s))));
    };
    liste = h('div', { class: 'list' });
    zeichne();
    const akt = hole(id);
    sheet({ title: 'Übergabeliste', cls: 'wide', body: h('div', { class: 'stack' }, kopfZahl, liste,
      h('p', { class: 'src' }, 'Sortiert nach Mängelnummer, wie im Katalog der Prüfsoftware. ' + einstufungsQuelle(akt.befunde.some((b) => String(b.kat || '').startsWith('de:'))))),
      footer: [h('button', { class: 'btn ghost', onclick: () => copyText(akt.befunde.length ? [...hole(id).befunde].sort((x, y) => reihe(x).localeCompare(reihe(y))).map(zeileText).join('\n') : '', 'Liste kopiert') }, icon('copy', 18), 'Alles kopieren')] });
  }

  function zeichneAktionen() {
    a = hole(id);
    const notiz = h('textarea', { class: 'textarea', placeholder: 'Notizen zum Fahrzeug …', value: a.notiz || '' });
    notiz.addEventListener('input', debounce(() => aendere(id, (x) => { x.notiz = notiz.value; }), 300));
    const bausteine = store.get('texte', []);
    clear(aktionen).append(
      h('div', { class: 'section-title' }, h('h2', null, 'Notizen'),
        bausteine.length ? h('button', { class: 'btn small ghost', onclick: () => {
          const s = sheet({ title: 'Textbaustein einfügen', body: h('div', { class: 'list' }, bausteine.map((t) => h('button', { class: 'item top', onclick: () => {
            notiz.value = (notiz.value ? notiz.value.replace(/\s*$/, '\n') : '') + t.text; aendere(id, (x) => { x.notiz = notiz.value; }); s.close();
          } }, h('div', { class: 'grow' }, h('div', { class: 't' }, t.titel), h('div', { class: 'd clamp2' }, t.text))))) });
        } }, icon('text', 16), 'Baustein') : null),
      notiz, fotoFeld);
    if (ws()) return;
    aktionen.append(
      a.befunde.length ? h('button', { class: 'btn tonal block', style: { marginTop: '16px' }, onclick: uebergabeListe }, icon('listcheck', 18), `Übergabeliste für die Prüfsoftware (${a.befunde.filter((b) => b.ueb).length}/${a.befunde.length})`) : null,
      h('button', { class: 'btn block', style: { marginTop: '10px' }, onclick: pdfTeilen }, icon('download', 18), gutachten.istWerkstatt(a) ? 'Befundblatt als PDF' : (/Vorab/.test(a.art) ? 'Vorab-Check für den Kunden (PDF mit Fotos)' : 'Befundblatt als PDF (mit Fotos)')),
      h('div', { class: 'grid2', style: { marginTop: '10px' } },
        h('button', { class: 'btn ghost', onclick: () => copyText(befundText(hole(id)), 'Befund kopiert') }, icon('copy', 18), 'Text kopieren'),
        h('button', { class: 'btn ghost', onclick: () => shareText('Befund ' + (a.kennzeichen || ''), befundText(hole(id))) }, icon('share', 18), 'Text teilen')),
      h('p', { class: 'src', style: { marginTop: '10px' } }, 'Der Befund ist eine Arbeitshilfe. Der amtliche Untersuchungsbericht entsteht weiterhin in der Software deiner Prüforganisation.'));
  }
  function alles() { zeichneKopf(); zeichneBanner(); zeichneBefunde(); zeichneAktionen(); ein?.sichtNeu(hole(id).fahrzeugart); }
  alles();

  if (ws()) { clear(eingabeOrt); return; }
  try {
    const kat = await katalog();
    ein = eingabe(a, kat, () => { zeichneKopf(); zeichneBanner(); zeichneBefunde(); });
    clear(eingabeOrt).append(ein.el);
    if (!a.befunde.length && window.matchMedia('(min-width: 900px)').matches) ein.fokus();
    window.__pkProbe = ein.probe; // nur für Tests: simuliert ein Diktat
  } catch {
    clear(eingabeOrt).append(h('div', { class: 'note warn' }, icon('offline', 18), h('span', null, 'Mängelkatalog nicht geladen – einmal mit Internet öffnen.')));
  }
  return () => { ein?.stop(); delete window.__pkProbe; fotoUrls.forEach((u) => URL.revokeObjectURL(u)); };
}

export function seite(el, teile) {
  if (teile[0] && teile[1] === 'pruefung') return pruefung.seite(el, teile[0]);
  if (teile[0] && teile[1] === 'gutachten') return gutachten.seite(el, teile[0]);
  if (teile[0]) return seiteDetail(el, teile[0]);
  return seiteListe(el);
}
