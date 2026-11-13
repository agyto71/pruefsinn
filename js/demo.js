// Prüfsinn – Demo-Modus: legt Beispielaufträge an und führt in Stationen durch alle Funktionen.
// Alles Angelegte trägt `demo: true` und wird mit „Demo beenden“ wieder entfernt (samt Fotos und geänderten Rechner-/Suchwerten).
// Die Kennzeichen „DEMO 1 …“ sind erfunden; Fahrzeugtypen und Schlüsselnummern sind echte, öffentliche Typdaten.
//
// Den Knopf auf der Startseite später entfernen: DEMO_KNOPF auf false setzen (oder die Karte in js/seiten/start.js löschen).

import { h, icon, clear, store, toast, confirmSheet } from './core.js';
import { katalog } from './daten.js';
import { sucheMaengel } from './suche.js';
import { ablaufFuer } from './ablauf.js';
import { speichereFoto, loescheFotosMit } from './fotos.js';
import { alle, neuerAuftrag, aendere, fuegeBefundHinzu } from './seiten/auftraege.js';

export const DEMO_KNOPF = true;

const zustand = () => store.get('demo', null);
const setze = (z) => store.set('demo', z);
export const aktiv = () => !!zustand()?.aktiv;

// ---------------------------------------------------------------- Beispielfotos (gezeichnet, keine fremden Bilder)
async function beispielFoto(titel, unter, farbe = '#4a4f57') {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 900;
  const x = c.getContext('2d');
  const v = x.createLinearGradient(0, 0, 1200, 900);
  v.addColorStop(0, farbe); v.addColorStop(1, '#1d1f23');
  x.fillStyle = v; x.fillRect(0, 0, 1200, 900);
  x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 3;
  for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, 120 + i * 90); x.lineTo(1200, 60 + i * 95); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,.92)';
  x.font = '600 34px -apple-system, Helvetica, Arial, sans-serif';
  x.fillText('BEISPIELFOTO · DEMO', 70, 110);
  x.font = '700 78px -apple-system, Helvetica, Arial, sans-serif';
  x.fillText(titel, 70, 470);
  x.font = '400 44px -apple-system, Helvetica, Arial, sans-serif';
  x.fillText(unter, 70, 550);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8));
}

// ---------------------------------------------------------------- Beispieldaten
const ZB_GOLF = { hsn: '0603/BOD', k: 'e1*2007/46*0623*12', typ: 'AU', kw: '110', reifen: '225/45 R17', a1: '1150', a2: '1100' };

async function befund(kat, id, satz, ort, sicht = 'pkw') {
  const x = sucheMaengel(kat, satz, { max: 1, fahrzeug: sicht }).ergebnisse[0];
  if (!x) return null;
  return fuegeBefundHinzu(id, { ...x.e, titel: x.titel }, ort);
}

async function legeAn() {
  const kat = await katalog();
  const ids = {};
  const neu = (vorgabe) => neuerAuftrag({ demo: true, status: 'offen', ...vorgabe });

  // 1 · HU Pkw mit Befunden, Foto und teils übertragener Übergabeliste
  const a1 = neu({ zeit: '08:00', kennzeichen: 'DEMO 1', fahrzeug: 'VW Golf VII 2.0 TDI', art: 'HU mit AU', fahrzeugart: 'pkw', hsn: '0603/BOD', ez: '05/2015', km: '148230', fin: 'WVWZZZAUZFW000001', status: 'laeuft' });
  ids.hu = a1.id;
  const b1 = await befund(kat, a1.id, 'Bremsschlauch porös', 'vorne links');
  await befund(kat, a1.id, 'Reifen abgefahren', 'hinten rechts');
  const b3 = await befund(kat, a1.id, 'Kennzeichenleuchte defekt', '');
  if (b1) await speichereFoto(`${a1.id}/b-${b1.id}/demo1`, await beispielFoto('Bremsschlauch', 'vorne links · Risse an der Ummantelung', '#6b3b33'));
  if (b3) aendere(a1.id, (x) => { const y = x.befunde.find((z) => z.id === b3.id); if (y) y.ueb = true; });

  // 2 · HU Lkw, geführte Prüfung halb durch
  const weg = ablaufFuer('lkw-12p');
  const status = {};
  weg.schritte.slice(0, 14).forEach((s) => { status[s.id] = 'ok'; });
  const a2 = neu({ zeit: '09:30', kennzeichen: 'DEMO 2', fahrzeug: 'MAN TGX 18.510', art: 'HU', fahrzeugart: 'lkw-12p', ez: '03/2019', km: '612400', status: 'laeuft',
    ablauf: { pos: 14, status, art: weg.id } });
  ids.lkw = a2.id;
  await befund(kat, a2.id, 'Luftbalg undicht', 'Achse 2 links', 'lkw');

  // 3 · Änderungsabnahme mit dem Muster-Teilegutachten (wird beim Öffnen automatisch gelesen)
  ids.abnahme = neu({ zeit: '10:30', kennzeichen: 'DEMO 3', fahrzeug: 'VW Golf VII 2.0 TDI', art: 'Änderungsabnahme § 19 (3)', hsn: '0603/BOD', ez: '05/2015', zb: { ...ZB_GOLF } }).id;

  // 4 · Werkstatt: Räderumbau nach demselben Gutachten
  ids.umbau = neu({ zeit: '11:30', kennzeichen: 'DEMO 4', fahrzeug: 'VW Golf VII 2.0 TDI', art: 'Umbau (Werkstatt)', hsn: '0603/BOD', ez: '05/2015', zb: { ...ZB_GOLF } }).id;

  // 5 · Werkstatt: HU-Vorab-Check mit Kundenbericht
  const a5 = neu({ zeit: '13:00', kennzeichen: 'DEMO 5', fahrzeug: 'Skoda Octavia III 1.4 TSI', art: 'HU-Vorab-Check (Werkstatt)', ez: '09/2015', km: '121900', status: 'laeuft' });
  ids.vorab = a5.id;
  const v1 = await befund(kat, a5.id, 'Stoßdämpfer undicht', 'hinten links');
  await befund(kat, a5.id, 'Bremslicht geht nicht', 'rechts');
  if (v1) await speichereFoto(`${a5.id}/b-${v1.id}/demo1`, await beispielFoto('Stoßdämpfer', 'hinten links · Ölspuren am Dämpfer', '#5a4a2e'));

  // 6 · Einzelabnahme (zeigt den Wegweiser)
  ids.ea = neu({ zeit: '14:00', kennzeichen: 'DEMO 6', fahrzeug: 'Wohnmobil, Import aus den USA', art: 'Einzelabnahme § 21' }).id;
  return ids;
}

// Werte, die die Demo vorbelegt – vorher sichern, beim Beenden zurückschreiben
const GESICHERT = ['fahrzeug', 'rechner.hochrechnung'];

export async function starteDemo() {
  if (aktiv()) { zeigeLeiste(); gehe(zustand().schritt || 0); return; }
  toast('Demo wird vorbereitet …');
  const backup = Object.fromEntries(GESICHERT.map((k) => [k, store.get(k, null)]));
  let ids;
  try { ids = await legeAn(); } catch (e) { toast('Demo nicht angelegt: ' + (e?.message || e)); return; }
  setze({ aktiv: true, schritt: 0, ids, backup, zu: false });
  zeigeLeiste();
  gehe(0);
}

export async function beendeDemo(frage = true) {
  if (frage && !(await confirmSheet('Demo beenden?', 'Die Beispielaufträge DEMO 1–6 und ihre Fotos werden entfernt. Eigene Aufträge bleiben.', 'Beenden'))) return;
  const z = zustand() || {};
  const demoIds = alle().filter((a) => a.demo).map((a) => a.id);
  store.set('auftraege', alle().filter((a) => !a.demo));
  for (const id of demoIds) await loescheFotosMit(id + '/').catch(() => {});
  for (const [k, v] of Object.entries(z.backup || {})) { if (v == null) store.remove(k); else store.set(k, v); }
  store.remove('demo');
  document.querySelector('.demo-leiste')?.remove();
  document.body.classList.remove('demo-an');
  toast('Demo beendet');
  location.hash = '#/';
}

// ---------------------------------------------------------------- Stationen
const ST = (ids) => [
  { titel: 'Willkommen bei Prüfsinn', ziel: '#/',
    text: 'Sechs Beispielaufträge sind angelegt (DEMO 1–6). Die Leiste hier führt durch alle Funktionen – „Weiter“ springt zur nächsten Station. Alles läuft im Gerät, ohne Konto.' },
  { titel: 'Befund per Sprache', ziel: `#/auftraege/${ids.hu}`,
    text: 'Golf VII zur HU. Mangel einsprechen oder tippen – Prüfsinn findet den amtlichen Mangel der HU-Richtlinie samt Einstufung und Lage. Das Ergebnis oben (EM, Nachprüfung, Plakette) rechnet sich mit.',
    fokus: () => document.querySelector('main input[placeholder^="Mangel"]'),
    aktion: ['Beispiel einsprechen', () => { window.__pkProbe?.('Stoßdämpfer hinten links undicht'); setTimeout(() => rolle(document.querySelector('main input[placeholder^="Mangel"]')), 400); }] },
  { titel: 'Übergabeliste für die Prüfsoftware', ziel: `#/auftraege/${ids.hu}`,
    text: 'Alle Mängel sortiert nach Nummer. Nummer antippen kopiert sie fürs Suchfeld der Prüfsoftware, der Haken merkt sich, was schon übertragen ist.',
    aktion: ['Übergabeliste öffnen', () => klick('Übergabeliste')] },
  { titel: 'Fotos und Befundblatt', ziel: `#/auftraege/${ids.hu}`,
    fokus: () => document.querySelector('main .finding .fotos .foto')?.closest('.finding'),
    text: 'Am Bremsschlauch hängt ein Foto (Knopf „Foto“ am Mangel). Das Befundblatt als PDF zeigt es unter dem Mangel – als Arbeitsunterlage, nicht als amtlicher Bericht.',
    aktion: ['Befundblatt erstellen', () => klick('Befundblatt als PDF')] },
  { titel: 'Geführte Prüfung (Lkw)', ziel: `#/auftraege/${ids.lkw}/pruefung`,
    text: 'Bildschirm für Bildschirm ums Fahrzeug: Praxistipp, Go/No-Go-Bild, amtliche Prüfmethode und die Mängel des Schritts. Hier ein MAN, 14 von 48 Schritten erledigt.' },
  { titel: 'Gutachten-Assistent', ziel: `#/auftraege/${ids.abnahme}/gutachten`, fokus: () => nachText('h2', 'Fahrzeug'),
    text: 'Das Muster-Teilegutachten wird gelesen: Verwendungsbereich, Auflagen, Kürzel. Mit Feld K, Typ, kW und Reifen findet Prüfsinn den Eintrag, rechnet die Achslast-Auflage und zeigt EEA-Daten und EU-Rückrufe zur Genehmigung.' },
  { titel: 'Umbau-Check für Werkstätten', ziel: `#/auftraege/${ids.umbau}/gutachten`, fokus: () => nachText('h2', 'Was zu tun ist'),
    text: 'Dasselbe Gutachten aus Sicht der Werkstatt: Auflagen nach Arbeitsschritten, je Punkt Foto und Notiz, am Ende „Bereit zur Abnahme“ und ein Nachweis als PDF für den Prüfer.' },
  { titel: 'HU-Vorab-Check', ziel: `#/auftraege/${ids.vorab}`, fokus: () => nachText('h2', 'Befund'),
    text: 'Für Werkstätten: das Auto vor der HU durchgehen wie der Prüfer. Der Bericht für den Kunden zeigt Mängel mit Fotos und eine Empfehlung – ausdrücklich keine Hauptuntersuchung.',
    aktion: ['Kundenbericht erstellen', () => klick('Vorab-Check für den Kunden')] },
  { titel: 'Fahrzeug-Check: EU-Rückrufe', ziel: '#/fahrzeug', fokus: () => document.querySelector('main .today-stats'),
    vorher: () => store.set('fahrzeug', { ...(store.get('fahrzeug', {}) || {}), marke: 'VW', modell: 'Golf', jahr: '2015', k: 'e1*2007/46*0623*12', auto: true }),
    text: 'Über 6.400 Rückrufmeldungen aus dem EU-Schnellwarnsystem, im Gerät durchsucht – am genauesten über die Genehmigung (Feld K). Meldungen außerhalb des Baujahrs sind blass.' },
  { titel: 'Wissen: Mängelkatalog', ziel: '#/wissen?q=Bremsschlauch',
    text: 'HU-Richtlinie Anlage 2 mit GM/EM/VM/VU und D-Mängeln, durchsuchbar in Werkstattsprache, dazu StVZO und FZV im Volltext – auch ohne Netz.' },
  { titel: 'Wissen: Tabellen', ziel: '#/wissen/tabellen', fokus: () => nachText('h2', 'Abgas – Sollwerte'),
    text: 'Fristen, Plakettenfarbe, Bremsen (25 %-Regel), AU-Sollwerte samt Partikelzählung, Scheinwerfer-Toleranzen und der Wegweiser für Einzelabnahmen – jeweils mit Fundstelle im Verkehrsblatt.' },
  { titel: 'Rechner: Druckluft-Hochrechnung', ziel: '#/rechner/hochrechnung',
    vorher: () => store.set('rechner.hochrechnung', { klasse: 'N23', ez: 'vor2012', einheit: 'kN', masse: '18000', f1: '22', p1: '2,1', n1: '6,5', f2: '19', p2: '1,9', n2: '6,5', f3: '', p3: '', n3: '', f4: '', p4: '', n4: '' }),
    text: 'Räder blockieren mangels Beladung? Aus Bremskraft, eingesteuertem Druck und Berechnungsdruck die Abbremsung hochrechnen (Anlage 2 a der HU-Bremsenrichtlinie). Daneben Reifen, Felge/ET, D-Wert, Fristen …' },
  { titel: 'Fertig', ziel: '#/',
    text: 'Prüfsinn lässt sich wie eine App auf den Home-Bildschirm legen und läuft offline. Kein Konto, keine Übertragung. „Demo beenden“ entfernt die Beispielaufträge wieder.' },
];

const nachText = (sel, text) => [...document.querySelectorAll('main ' + sel)].find((x) => x.textContent.trim().startsWith(text));
/** Element knapp unter den oberen Rand rollen (die Leiste sitzt unten) */
function rolle(el) {
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - (document.body.classList.contains('pruefmodus') ? 140 : 16);
  window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
}
/** Warten, bis die Seite das Element gezeichnet hat (Gutachten wird z. B. erst gelesen) */
function fokussiere(fn, bis = Date.now() + 9000) {
  const el = fn();
  if (el) { setTimeout(() => rolle(fn() || el), 150); return; }
  if (Date.now() < bis) setTimeout(() => fokussiere(fn, bis), 250);
}

function klick(text) {
  const b = [...document.querySelectorAll('main button, main .btn')].find((x) => x.textContent.includes(text));
  if (b) b.click(); else toast('Knopf nicht gefunden – kurz scrollen oder die Seite neu laden');
}

export function gehe(n) {
  const z = zustand();
  if (!z) return;
  const stationen = ST(z.ids);
  const i = Math.max(0, Math.min(stationen.length - 1, n));
  setze({ ...z, schritt: i, zu: false });
  const s = stationen[i];
  s.vorher?.();
  if (location.hash !== s.ziel) location.hash = s.ziel;
  else window.dispatchEvent(new HashChangeEvent('hashchange')); // gleiche Seite: neu zeichnen (z. B. Startkarte, vorbelegte Werte)
  zeigeLeiste();
  if (s.fokus) setTimeout(() => fokussiere(s.fokus), 300);
}

// ---------------------------------------------------------------- Leiste
export function zeigeLeiste() {
  const z = zustand();
  document.querySelector('.demo-leiste')?.remove();
  if (!z?.aktiv) return;
  const stationen = ST(z.ids);
  const i = z.schritt || 0;
  const s = stationen[i];
  const zu = !!z.zu;
  const leiste = h('aside', { class: 'demo-leiste' + (zu ? ' zu' : ''), 'aria-label': 'Demo' });
  const umschalten = () => { setze({ ...zustand(), zu: !zu }); zeigeLeiste(); };
  if (zu) {
    leiste.append(h('button', { class: 'demo-pille', type: 'button', onclick: umschalten }, icon('spark', 16), `Demo ${i + 1}/${stationen.length}`));
  } else {
    leiste.append(...[
      h('div', { class: 'demo-kopf' },
        h('span', { class: 'demo-zahl' }, `Demo · ${i + 1} von ${stationen.length}`),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Einklappen', onclick: umschalten }, icon('down', 18)),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Demo beenden', onclick: () => beendeDemo() }, icon('x', 18))),
      h('div', { class: 'demo-balken' }, h('i', { style: { width: `${((i + 1) / stationen.length) * 100}%` } })),
      h('h3', null, s.titel),
      h('p', null, s.text),
      s.aktion ? h('button', { class: 'btn small tonal demo-aktion', type: 'button', onclick: s.aktion[1] }, icon('spark', 15), s.aktion[0]) : null,
      h('div', { class: 'demo-knoepfe' },
        i > 0 ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => gehe(i - 1) }, icon('left', 16), 'Zurück') : h('span'),
        i < stationen.length - 1
          ? h('button', { class: 'btn small', type: 'button', onclick: () => gehe(i + 1) }, 'Weiter', icon('right', 16))
          : h('button', { class: 'btn small', type: 'button', onclick: () => beendeDemo() }, 'Demo beenden')),
    ].filter(Boolean));
  }
  document.body.append(leiste);
  document.body.classList.toggle('demo-an', !zu);
}

/** Karte für die Startseite */
export function startKarte() {
  if (!DEMO_KNOPF) return null;
  const an = aktiv();
  return h('div', { class: 'card pad demo-start' },
    h('div', { class: 'rowx', style: { gap: '14px', alignItems: 'flex-start' } },
      h('span', { class: 'ico-tile' }, icon('spark')),
      h('div', { class: 'grow' },
        h('b', null, an ? 'Demo läuft' : 'Demo: alle Funktionen in 13 Stationen'),
        h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, an
          ? 'Beispielaufträge DEMO 1–6 sind angelegt. Weiter mit der Leiste unten – oder hier beenden.'
          : 'Legt Beispielaufträge mit Befunden, Fotos und einem Muster-Gutachten an und führt durch alles. Danach mit einem Tipp wieder entfernt.'))),
    h('div', { class: 'rowx wrap', style: { gap: '8px', marginTop: '12px' } },
      h('button', { class: 'btn small', type: 'button', onclick: () => starteDemo() }, icon(an ? 'right' : 'spark', 16), an ? 'Fortsetzen' : 'Demo starten'),
      an ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => beendeDemo() }, 'Demo beenden') : null));
}
