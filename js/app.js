// Prüfsinn – Rahmen: Navigation, Seitenwechsel, Start

import { h, $, icon, clear, store } from './core.js';
import * as start from './seiten/start.js';
import * as auftraege from './seiten/auftraege.js';
import * as wissen from './seiten/wissen.js';
import * as rechner from './seiten/rechner.js';
import * as mehr from './seiten/mehr.js';
import * as demo from './demo.js';

const NAV = [
  ['', 'Start', 'home'],
  ['auftraege', 'Aufträge', 'clipboard'],
  ['fahrzeug', 'Fahrzeug', 'car'],
  ['wissen', 'Wissen', 'book'],
  ['rechner', 'Rechner', 'calc'],
  ['mehr', 'Mehr', 'grid'],
];
const SEITEN = { '': start.seite, auftraege: auftraege.seite, fahrzeug: mehr.seiteFahrzeug, wissen: wissen.seite, rechner: rechner.seite, mehr: mehr.seite };
const TITEL = { '': 'Start', auftraege: 'Aufträge', fahrzeug: 'Fahrzeug-Check', wissen: 'Wissen', rechner: 'Rechner', mehr: 'Mehr' };

mehr.setzeTheme(store.get('einstellungen', {}).theme);

const logo = () => h('img', { class: 'logo', src: 'assets/icon.svg', alt: '', width: 34, height: 34 });
const app = $('#app');
clear(app).append(
  h('div', { class: 'shell' },
    h('aside', { class: 'sidebar' },
      h('a', { class: 'brand', href: '#/' }, logo(), h('span', null, 'Prüf', h('b', null, 'sinn'), h('small', null, 'Der sechste Sinn in der Prüfhalle'))),
      h('button', { class: 'search side-search', style: { minHeight: '44px', borderRadius: '13px', fontSize: '.92rem', boxShadow: 'none' }, onclick: () => start.oeffneSuche() }, icon('search', 18), h('span', null, 'Suchen'), h('span', { class: 'kbd' }, '/')),
      h('nav', { 'aria-label': 'Hauptnavigation' }, NAV.map(([k, l, ic]) => h('a', { href: '#/' + k, dataset: { nav: k } }, icon(ic), l))),
      h('div', { class: 'side-foot' }, h('b', { style: { color: 'var(--text)' } }, 'Alles bleibt auf diesem Gerät.'), h('br'), 'Kein Konto, keine Übertragung – und nutzbar ohne Netz.')),
    h('main', { class: 'main', id: 'main' }),
    h('nav', { class: 'tabbar', 'aria-label': 'Hauptnavigation' }, NAV.map(([k, l, ic]) => h('a', { href: '#/' + k, dataset: { nav: k } }, h('span', { class: 'pill' }, icon(ic, 22)), l)))));

let aufraeumen = null;
let lauf = 0;
const verlauf = [];
const rollen = new Map();

function wechsle() {
  const roh = location.hash.replace(/^#\/?/, '');
  const [pfad, qs = ''] = roh.split('?');
  const teile = pfad.split('/').filter(Boolean).map(decodeURIComponent);
  const kopf = SEITEN[teile[0] || ''] ? (teile[0] || '') : '';
  const schluessel = location.hash || '#/';

  // Rollposition merken; beim Zurückgehen wiederherstellen
  const vorher = verlauf[verlauf.length - 1];
  if (vorher) rollen.set(vorher, window.scrollY);
  let zurueck = false;
  if (verlauf[verlauf.length - 2] === schluessel) { verlauf.pop(); zurueck = true; } else if (vorher !== schluessel) verlauf.push(schluessel);
  if (verlauf.length > 40) verlauf.splice(0, 20);

  if (typeof aufraeumen === 'function') { try { aufraeumen(); } catch { /* egal */ } }
  aufraeumen = null;
  const meiner = ++lauf;
  const main = $('#main');
  const page = h('div', { class: 'page' });
  clear(main).append(page);
  document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === kopf) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.title = (TITEL[kopf] ? TITEL[kopf] + ' · ' : '') + 'Prüfsinn';

  let erg;
  try { erg = SEITEN[kopf](page, teile.slice(1), new URLSearchParams(qs)); }
  catch (e) { console.error(e); page.append(h('div', { class: 'card pad empty' }, h('h3', null, 'Da ist etwas schiefgelaufen'), h('p', null, String(e.message || e)), h('a', { class: 'btn', href: '#/' }, 'Zur Startseite'))); }
  Promise.resolve(erg).then((c) => {
    if (meiner !== lauf) { if (typeof c === 'function') c(); return; }
    aufraeumen = c;
    if (zurueck) window.scrollTo(0, rollen.get(schluessel) || 0);
  }).catch((e) => console.error(e));
  if (!zurueck) window.scrollTo(0, 0);
}
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('hashchange', wechsle);
wechsle();
if (demo.aktiv()) demo.zeigeLeiste();

// Beim allerersten Öffnen: Empfehlung zeigen (nicht mitten in einer Demo)
if (!store.get('empfehlung.gesehen') && !demo.aktiv()) {
  store.set('empfehlung.gesehen', true);
  setTimeout(() => start.zeigeEmpfehlung(), 900);
}

// "/" oder Strg/Cmd+K öffnet die Suche
document.addEventListener('keydown', (e) => {
  const imFeld = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if ((e.key === '/' && !imFeld) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
    if (document.querySelector('.sheet-back')) return;
    e.preventDefault();
    start.oeffneSuche();
  }
});

// Offline-Nutzung: Service Worker nur über https oder lokal
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
