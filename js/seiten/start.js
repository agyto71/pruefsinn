// Prüfsinn – Startseite und übergreifende Suche

import { h, icon, clear, sheet, field, seg, isoToday, fmtDate, pad2, sperreSeite, gibSeiteFrei } from '../core.js';
import { katalog, gesetz, GESETZE, naechsteHU, plakette, SICHTEN, nummerVon } from '../daten.js';
import { sucheMaengel, sucheNormen, markiereWorte } from '../suche.js';
import { alle, neuerAuftrag, kennzeichen, ergebnis } from './auftraege.js';
import { sev, suchfeld, eintragZeile, zeigePunkt } from './wissen.js';
import { RECHNER_LISTE, plakettenBild } from './rechner.js';
import { ablaufFuer } from '../ablauf.js';
import { startKarte } from '../demo.js';

/** Übergreifende Suche: Mängel, Vorschriften, Rechner, Aufträge. */
export function oeffneSuche(start = '') {
  const erg = h('div', { class: 'stack' });
  let kat = null;
  const gesetze = {};
  let aktuell = start;
  let sicht = 'pkw'; // Mängel: zuerst immer Pkw; der Umschalter holt die Lkw-Mängel dazu
  const sichtOrt = h('div', { class: 'sicht' });
  const zeichneSicht = () => clear(sichtOrt).append(h('span', { class: 'xs faint' }, 'Mängel für'), seg([...SICHTEN, ['', 'alle Fahrzeuge']], sicht, (v) => { sicht = v; zeichne(); }, 'klein'));
  const feld = suchfeld({ placeholder: 'Mängel, Vorschriften, Rechner …', value: start, autofocus: true, onInput: (v) => { aktuell = v; zeichne(); } });
  const s = sheet({ title: 'Suchen', cls: 'wide voll', body: h('div', { class: 'stack' }, feld.el, sichtOrt, erg), onClose: () => feld.stop() });
  zeichneSicht();
  const gehe = (hash) => { s.close(); location.hash = hash; };
  const titel = (t, n) => h('div', { class: 'section-title', style: { margin: '6px 2px 8px' } }, h('h2', null, t), n != null && h('span', { class: 'xs faint' }, n));

  function zeichne() {
    clear(erg);
    const t = aktuell.trim();
    if (t.length < 2) {
      erg.append(h('p', { class: 'muted small' }, 'Tipp: Bauteil und Zustand nennen („Querlenker ausgeschlagen“), einen Paragrafen („§ 29“) oder ein Stichwort („Profiltiefe“).'),
        h('div', { class: 'chips wrap' }, (sicht === 'lkw'
          ? ['Druckluftbehälter korrodiert', 'Luftfederbalg undicht', 'Plombe Fahrtenschreiber fehlt', 'Unterfahrschutz lose', '§ 57c', 'Anlage VIII']
          : ['Bremsschlauch porös', 'Reifen abgefahren', '§ 29', 'Profiltiefe', 'Blinker defekt', 'Anlage VIII']).map((b) => h('button', { class: 'chip', onclick: () => { feld.input.value = b; aktuell = b; zeichne(); } }, b))));
      return;
    }
    const tl = t.toLowerCase();
    const rechner = RECHNER_LISTE.filter((r) => (r.titel + ' ' + r.kurz).toLowerCase().includes(tl));
    if (rechner.length) erg.append(h('div', null, titel('Rechner'), h('div', { class: 'list' }, rechner.map((r) => h('button', { class: 'item', onclick: () => gehe('#/rechner/' + r.id) }, h('span', { class: 'ico-tile' }, icon(r.icon)), h('div', { class: 'grow' }, h('div', { class: 't' }, r.titel), h('div', { class: 'd' }, r.kurz)))))));
    const auftraege = alle().filter((a) => (a.kennzeichen + ' ' + a.fahrzeug).toLowerCase().includes(tl)).slice(-4).reverse();
    if (auftraege.length) erg.append(h('div', null, titel('Aufträge'), h('div', { class: 'list' }, auftraege.map((a) => h('button', { class: 'item', onclick: () => gehe('#/auftraege/' + a.id) }, kennzeichen(a), h('div', { class: 'grow' }, h('div', { class: 't' }, a.fahrzeug || a.art), h('div', { class: 'd num' }, fmtDate(a.datum))), sev(ergebnis(a)))))));
    if (kat) {
      const r = sucheMaengel(kat, t, { max: 6, fahrzeug: sicht });
      const mehrLkw = r.beiLkw ? h('button', { class: 'sugg-mehr', type: 'button', onclick: () => { sicht = 'lkw'; zeichneSicht(); zeichne(); } }, icon('truck', 16), `${r.beiLkw} weitere Treffer bei Lkw anzeigen`) : null;
      if (r.ergebnisse.length) erg.append(h('div', null, titel(sicht === 'lkw' ? 'Mängel · Lkw' : sicht === 'pkw' ? 'Mängel · Pkw' : 'Mängel', `${r.anzahl} Treffer`), h('div', { class: 'list' }, r.ergebnisse.map((x) => eintragZeile(x, { begriffe: r.begriffe, onClick: (y) => zeigePunkt(y.e.nr, { markiert: y.e.id }) }))),
        mehrLkw,
        r.anzahl > 6 ? h('button', { class: 'btn small tonal', style: { marginTop: '10px' }, onclick: () => gehe(`#/wissen?q=${encodeURIComponent(t)}&fz=${sicht}`) }, 'Alle Mängel-Treffer') : null));
      else if (mehrLkw) erg.append(h('div', null, titel('Mängel · Pkw', 'kein Treffer'), mehrLkw));
    } else erg.append(h('div', { class: 'skeleton', style: { height: '120px' } }));
    for (const key of Object.keys(GESETZE)) {
      const g = gesetze[key];
      if (!g) continue;
      const r = sucheNormen(g, t, 4);
      if (r.length) erg.append(h('div', null, titel(GESETZE[key].kurz), h('div', { class: 'list' }, r.map((x) => h('button', { class: 'item top', onclick: () => gehe(`#/wissen/${key}/${x.n.id}`) },
        h('div', { class: 'grow' }, h('div', { class: 't' }, x.n.bez, x.n.titel ? ' · ' + x.n.titel : ''), x.aus && h('div', { class: 'd clamp2', html: markiereWorte(x.aus, t) })), h('span', { class: 'chev' }, icon('right', 18)))))));
    }
    if (!erg.children.length) erg.append(h('p', { class: 'muted' }, 'Nichts gefunden.'));
  }
  katalog().then((k) => { kat = k; zeichne(); }).catch(() => {});
  for (const key of Object.keys(GESETZE)) gesetz(key).then((g) => { gesetze[key] = g; zeichne(); }).catch(() => {});
  zeichne();
}

/** Begrüßung beim ersten Öffnen: die drei Empfehler schweben als Band von rechts nach links vorbei.
 *  Bilder: assets/tyson.jpg, assets/dzimbo.jpg, assets/mert.jpg (auch .jpeg, .png, .webp); fehlt eines, erscheint der Anfangsbuchstabe.
 *  Die Zitate sind ein Scherz unter Freunden. */
const EMPFEHLER = [
  { datei: 'tyson', cls: 'eins', name: 'TYSON', rolle: 'Top TÜV Prüfer', zitat: 'Diese Seite hat mein Leben verändert.' },
  { datei: 'dzimbo', cls: 'zwei', name: 'DZIMBO', rolle: 'der Verrückte', zitat: 'Ich war skeptisch. Jetzt bin ich verrückt danach.' },
  { datei: 'mert', cls: 'drei', name: 'MOET MERT', rolle: 'Genießer', zitat: 'Fünf Sterne. Würde wieder klicken.' },
];
function gagFoto(name, cls) {
  const endungen = ['jpg', 'jpeg', 'png', 'webp'];
  let i = 0;
  const bild = h('img', { src: `assets/${name}.${endungen[0]}`, alt: '', width: 220, height: 242, draggable: 'false' });
  const rahmen = h('div', { class: 'gag-foto ' + cls }, h('span', { class: 'gag-bild' }, bild));
  bild.addEventListener('error', () => {
    i++;
    if (i < endungen.length) bild.src = `assets/${name}.${endungen[i]}`;
    else clear(rahmen.firstChild).append(h('span', { class: 'gag-initial' }, name[0].toUpperCase()));
  });
  return rahmen;
}
function gagKarte(p, i, doppel) {
  return h('figure', { class: 'gag-karte', 'aria-hidden': doppel ? 'true' : null, style: { animationDelay: (i * -1.5) + 's' } },
    gagFoto(p.datei, p.cls),
    h('figcaption', null,
      h('div', { class: 'gag-name ' + p.cls }, p.name),
      h('div', { class: 'gag-rolle' }, p.rolle),
      h('blockquote', null, '„' + p.zitat + '“')));
}

export function zeigeEmpfehlung() {
  if (document.querySelector('.gag-back')) return;
  const farben = ['#1b1a18', '#8b8175', '#cf7442', '#c9a23a', '#a8bea0', '#e2b294'];
  const konfetti = h('div', { class: 'konfetti', 'aria-hidden': 'true' }, Array.from({ length: 46 }, (_, i) => h('i', { style: {
    left: Math.random() * 100 + '%', background: farben[i % farben.length], animationDelay: (Math.random() * 0.9) + 's', animationDuration: (2.2 + Math.random() * 1.6) + 's',
    width: (6 + Math.random() * 6) + 'px', height: (10 + Math.random() * 8) + 'px', transform: `rotate(${Math.random() * 360}deg)` } })));
  const siegel = h('div', { class: 'gag-siegel', 'aria-hidden': 'true', html:
    '<svg viewBox="0 0 120 120" width="58" height="58"><defs><path id="kreis" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0"/></defs>' +
    '<circle cx="60" cy="60" r="58" fill="#1b1a18"/><circle cx="60" cy="60" r="33" fill="none" stroke="#f3efe8" stroke-width="1.2"/>' +
    '<text font-size="10.5" font-weight="600" fill="#f3efe8" font-family="Helvetica Neue, Arial, sans-serif"><textPath href="#kreis" textLength="266" lengthAdjust="spacing">TOP-PRÜFER · EMPFOHLEN · GEPRÜFT ·</textPath></text>' +
    '<path d="M47 61l9 9 18-21" fill="none" stroke="#f3efe8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
  let offen = true;
  const zu = () => { if (!offen) return; offen = false; back.classList.remove('open'); gibSeiteFrei(); setTimeout(() => back.remove(), 260); document.removeEventListener('keydown', taste); };
  const taste = (e) => { if (e.key === 'Escape') zu(); };
  // Band: die drei Karten zweimal hintereinander, damit die Schleife nahtlos läuft
  const spur = h('div', { class: 'gag-spur' }, EMPFEHLER.map((p, i) => gagKarte(p, i, false)), EMPFEHLER.map((p, i) => gagKarte(p, i, true)));
  const back = h('div', { class: 'gag-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Empfehlungen', onclick: (e) => { if (e.target === back) zu(); } },
    konfetti,
    h('div', { class: 'gag' },
      h('div', { class: 'gag-kopf' }, siegel, h('p', { class: 'gag-zeile' }, 'Empfohlen von ', h('em', null, 'den Besten.'))),
      h('div', { class: 'gag-band' }, spur),
      h('div', { class: 'gag-fuss' },
        h('div', { class: 'gag-sterne', 'aria-label': 'Fünf von fünf Sternen' }, '★★★★★'),
        h('button', { class: 'btn block', onclick: zu }, 'Na dann los'))));
  sperreSeite(back);
  document.body.append(back);
  document.addEventListener('keydown', taste);
  requestAnimationFrame(() => requestAnimationFrame(() => back.classList.add('open')));
}

/** Der kürzeste Weg zur Prüfung: Kennzeichen und Fahrzeug (beides freiwillig), dann los.
 *  art: 'pkw' oder 'lkw' – beim Lkw kommt die Gewichtsklasse dazu, sie bestimmt Frist und Ablauf. */
const LKW_KLASSEN = [['lkw-35', 'bis 3,5 t'], ['lkw-75', 'bis 7,5 t'], ['lkw-12', 'bis 12 t'], ['lkw-12p', 'über 12 t']];
export function neuesFahrzeug(art = 'pkw', { vorab = false } = {}) {
  const lkw = art === 'lkw';
  const v = { kennzeichen: '', fahrzeug: '', fahrzeugart: lkw ? 'lkw-12p' : 'pkw' };
  const kz = h('input', { class: 'input', placeholder: 'B-XY 1234', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false',
    style: { textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }, oninput: (e) => { v.kennzeichen = e.target.value; } });
  const los = (ziel) => {
    const a = neuerAuftrag({ kennzeichen: v.kennzeichen.toUpperCase().trim(), fahrzeug: v.fahrzeug.trim(), fahrzeugart: v.fahrzeugart, ...(vorab ? { art: 'HU-Vorab-Check (Werkstatt)' } : {}) });
    s.close();
    location.hash = `#/auftraege/${a.id}${ziel}`;
  };
  const hinweis = h('p', { class: 'small muted' });
  const zeichneHinweis = () => {
    const weg = ablaufFuer(v.fahrzeugart);
    hinweis.textContent = (v.fahrzeugart === 'lkw-35' ? 'Bis 3,5 t läuft die Prüfung wie beim Pkw (hydraulische Bremse). ' : '')
      + (vorab ? `Der Vorab-Check geht in ${weg.schritte.length} Schritten ums Fahrzeug wie bei der HU und endet mit einem Bericht für den Kunden – mit Fotos, ohne Plakette. ` : `Die geführte Prüfung geht in ${weg.schritte.length} Schritten ums Fahrzeug und endet mit dem Befundblatt. `)
      + 'Kennzeichen und Fahrzeug lassen sich später ergänzen.';
  };
  zeichneHinweis();
  const s = sheet({
    title: vorab ? 'HU-Vorab-Check' : lkw ? 'Neuen Lkw prüfen' : 'Neues Auto prüfen',
    body: h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); los('/pruefung'); } },
      field('Kennzeichen', kz),
      field('Fahrzeug', h('input', { class: 'input', placeholder: lkw ? 'z. B. MAN TGX 18.510' : 'z. B. VW Golf VII 2.0 TDI', autocomplete: 'off', oninput: (e) => { v.fahrzeug = e.target.value; } })),
      lkw && field('Zulässige Gesamtmasse', seg(LKW_KLASSEN, v.fahrzeugart, (x) => { v.fahrzeugart = x; zeichneHinweis(); }, 'full klein')),
      hinweis,
      h('button', { type: 'submit', class: 'hide' })),
    footer: [h('button', { class: 'btn ghost', onclick: () => los('') }, 'Nur Befund'), h('button', { class: 'btn', onclick: () => los('/pruefung') }, 'Prüfung starten', icon('right', 18))],
  });
  setTimeout(() => kz.focus(), 300);
}
export const neuesAuto = () => neuesFahrzeug('pkw');

/** Änderungs- oder Einzelabnahme anlegen und direkt zum Gutachten-Assistenten. */
const ABNAHME_ARTEN = [['Änderungsabnahme § 19 (3)', 'Änderung § 19 (3)'], ['Einzelabnahme § 21', 'Einzelabnahme § 21']];
export function neueAbnahme({ werkstatt = false } = {}) {
  const v = { kennzeichen: '', fahrzeug: '', art: werkstatt ? 'Umbau (Werkstatt)' : ABNAHME_ARTEN[0][0] };
  const kz = h('input', { class: 'input', placeholder: 'B-XY 1234', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false',
    style: { textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }, oninput: (e) => { v.kennzeichen = e.target.value; } });
  const los = () => {
    const a = neuerAuftrag({ kennzeichen: v.kennzeichen.toUpperCase().trim(), fahrzeug: v.fahrzeug.trim(), art: v.art });
    s.close();
    location.hash = `#/auftraege/${a.id}/gutachten`;
  };
  const s = sheet({
    title: werkstatt ? 'Umbau vorbereiten' : 'Gutachten prüfen',
    body: h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); los(); } },
      field('Kennzeichen', kz),
      field('Fahrzeug', h('input', { class: 'input', placeholder: 'z. B. VW Passat Alltrack', autocomplete: 'off', oninput: (e) => { v.fahrzeug = e.target.value; } })),
      werkstatt ? null : field('Art der Abnahme', seg(ABNAHME_ARTEN, v.art, (x) => { v.art = x; }, 'full klein')),
      h('p', { class: 'small muted' }, werkstatt
        ? 'Danach das Teilegutachten als PDF öffnen. Prüfsinn sucht den Eintrag zum Fahrzeug und sortiert die Auflagen nach Arbeitsschritten: Teile prüfen, Nacharbeiten, Einbau, Reifen, Abnahme. Je Punkt ein Foto – am Ende ein Nachweis für den Prüfer. Alles bleibt auf diesem Gerät.'
        : 'Danach das Teilegutachten als PDF öffnen. Prüfsinn liest den Verwendungsbereich, sucht den Eintrag zum Fahrzeug und macht aus den Auflagen eine Checkliste. Das PDF bleibt auf diesem Gerät.'),
      h('button', { type: 'submit', class: 'hide' })),
    footer: [h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Abbrechen'), h('button', { class: 'btn', onclick: los }, 'Weiter', icon('right', 18))],
  });
  setTimeout(() => kz.focus(), 300);
}

export function seite(el) {
  const jetzt = new Date();
  const std = jetzt.getHours();
  const gruss = std < 5 ? 'Gute Nacht' : std < 11 ? 'Guten Morgen' : std < 18 ? 'Guten Tag' : 'Guten Abend';
  const heute = isoToday();
  const liste = alle().filter((a) => a.datum === heute).sort((a, b) => (a.zeit || '').localeCompare(b.zeit || ''));
  const n = (st) => liste.filter((a) => a.status === st).length;
  const fakten = h('div', { class: 'facts' }, h('span', null, icon('db', 16), 'Wissensdatenbank wird geladen …'));
  const n1 = naechsteHU('pkw', jetzt.getMonth() + 1, jetzt.getFullYear(), false);

  // Live-Demo: tippt Beispiel-Sätze und zeigt, was die echte Suche im amtlichen Katalog dazu findet
  const demoText = h('span');
  const demoTreffer = h('div', { class: 'demo-treffer' });
  const demo = h('div', { class: 'demo' },
    h('div', { class: 'demo-sagen' }, h('div', { class: 'wellen' }, h('i'), h('i'), h('i'), h('i'), h('i')), h('div', { class: 'demo-text' }, '„', demoText, h('i', { class: 'strich' }), '“')),
    demoTreffer);
  const wow = h('section', { class: 'wow' },
    h('div', { class: 'wow-text' },
      h('span', { class: 'kicker' }, h('i'), 'Befund per Sprache'),
      h('h2', null, 'Einfach sagen, was auffällt.'),
      h('p', null, 'Prüfsinn findet den passenden amtlichen Mangel, schlägt die Einstufung vor und merkt sich die Lage – freihändig, auch unter dem Auto.')),
    demo,
    h('button', { class: 'btn wow-los', onclick: () => { const a = neuerAuftrag(); location.hash = '#/auftraege/' + a.id; } }, icon('mic', 18), 'Schnellbefund starten'));
  const SAETZE = ['Bremsschlauch vorne links porös', 'Reifen hinten rechts abgefahren', 'Kennzeichenleuchte defekt', 'Feder hinten links gebrochen', 'Stoßdämpfer hinten undicht', 'Bremslicht rechts geht nicht'];
  let aktiv = true, satzNr = 0;
  const warte = (ms) => new Promise((r) => setTimeout(r, ms));
  const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function demoLauf(kat) {
    while (aktiv) {
      const satz = SAETZE[satzNr++ % SAETZE.length];
      const r = sucheMaengel(kat, satz, { max: 1 });
      const x = r.ergebnisse[0];
      demoTreffer.classList.remove('da');
      demo.classList.add('spricht');
      demoText.textContent = '';
      if (ruhig) demoText.textContent = satz;
      else for (let i = 1; i <= satz.length && aktiv; i++) { demoText.textContent = satz.slice(0, i); await warte(34 + Math.random() * 40); }
      demo.classList.remove('spricht');
      await warte(350);
      if (!aktiv) return;
      if (x) {
        clear(demoTreffer).append(sev(x.e.s[0]),
          h('div', { class: 'grow' }, h('div', { class: 't' }, x.titel), h('div', { class: 'd clamp2' }, (x.e.wenn || x.e.text).split('\n')[0]),
            r.ort && h('span', { class: 'tag' }, icon('pin', 13), r.ort)),
          h('span', { class: 'amt' }, 'Nr. ' + nummerVon(x.e)));
        demoTreffer.classList.add('da');
      }
      await warte(ruhig ? 6000 : 3200);
    }
  }

  el.append(
    h('div', { class: 'hero' },
      h('p', { class: 'hello' }, `${gruss} · ${jetzt.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}`),
      h('h1', null, 'Mangel sagen. ', h('em', null, 'Einstufung sehen.')),
      fakten,
      h('div', { class: 'hero-knoepfe' },
        h('button', { class: 'btn hero-los', type: 'button', onclick: () => neuesFahrzeug('pkw') }, icon('car', 20), 'Neues Auto prüfen'),
        h('button', { class: 'btn ghost hero-los', type: 'button', onclick: () => neuesFahrzeug('lkw') }, icon('truck', 20), 'Neuen Lkw prüfen'))),
    // Demo-Knopf (später entfernen: DEMO_KNOPF in js/demo.js auf false)
    startKarte(),
    h('button', { class: 'search hero', onclick: () => oeffneSuche() }, icon('search'), h('span', null, 'Mängel, Vorschriften, Rechner suchen'), h('span', { class: 'kbd' }, '/')),
    h('button', { class: 'pm-start gut-start', type: 'button', onclick: () => neueAbnahme() },
      h('span', { class: 'ico-tile' }, icon('doc')),
      h('div', { class: 'grow' }, h('b', null, 'Gutachten prüfen'), h('span', null, 'Änderungsabnahme: Teilegutachten öffnen, Fahrzeug eingeben – Prüfsinn findet den Eintrag und macht aus den Auflagen eine Checkliste.')),
      icon('right', 18)),
    h('button', { class: 'pm-start gut-start', type: 'button', onclick: () => neueAbnahme({ werkstatt: true }) },
      h('span', { class: 'ico-tile' }, icon('werkzeug')),
      h('div', { class: 'grow' }, h('b', null, 'Umbau vorbereiten'), h('span', null, 'Für Werkstätten: Räder nach Gutachten montieren – was vorher zu tun ist, Fotos je Auflage und ein Nachweis für den Prüfer.')),
      icon('right', 18)),
    h('button', { class: 'pm-start gut-start', type: 'button', onclick: () => neuesFahrzeug('pkw', { vorab: true }) },
      h('span', { class: 'ico-tile' }, icon('listcheck')),
      h('div', { class: 'grow' }, h('b', null, 'HU-Vorab-Check'), h('span', null, 'Für Werkstätten: das Auto vor der HU durchgehen wie der Prüfer – Mängel mit Fotos, Bericht für den Kunden, ohne Plakette.')),
      icon('right', 18)),
    wow,
    h('div', { class: 'section-title' }, h('h2', null, 'Heute'), h('a', { href: '#/auftraege', class: 'small' }, 'Alle Aufträge')),
    liste.length
      ? h('div', { class: 'stack' },
        h('div', { class: 'today-stats' }, h('div', { class: 'stat' }, h('b', null, n('offen')), h('span', null, 'offen')), h('div', { class: 'stat' }, h('b', null, n('laeuft')), h('span', null, 'in Arbeit')), h('div', { class: 'stat' }, h('b', null, n('fertig')), h('span', null, 'fertig'))),
        h('div', { class: 'list' }, liste.slice(0, 5).map((a) => h('a', { class: 'item', href: '#/auftraege/' + a.id },
          h('span', { class: 'num muted small', style: { width: '42px', flex: 'none', fontWeight: 650 } }, a.zeit || '–'), kennzeichen(a),
          h('div', { class: 'grow' }, h('div', { class: 't clamp2' }, a.fahrzeug || a.art)), (a.befunde.length || a.status === 'fertig') ? sev(ergebnis(a)) : null, h('span', { class: 'chev' }, icon('right', 18))))))
      : h('div', { class: 'card pad rowx' }, h('span', { class: 'ico-tile plain' }, icon('clipboard')), h('div', { class: 'grow' }, h('div', { style: { fontWeight: 650 } }, 'Noch keine Aufträge heute'), h('div', { class: 'small muted' }, 'Tagesplan anlegen oder direkt loslegen.')), h('a', { class: 'btn small tonal', href: '#/auftraege' }, 'Anlegen')),
    h('div', { class: 'section-title' }, h('h2', null, 'Rechner'), h('a', { href: '#/rechner', class: 'small' }, 'Alle Rechner')),
    h('div', { class: 'tiles four' }, RECHNER_LISTE.slice(0, 4).map((r) => h('a', { class: 'tile', href: '#/rechner/' + r.id }, h('span', { class: 'ico-tile' }, icon(r.icon)), h('div', null, h('div', { class: 't' }, r.titel), h('div', { class: 'd clamp2' }, r.kurz))))),
    h('div', { class: 'section-title' }, h('h2', null, 'Plakette des Monats')),
    h('a', { class: 'card pad rowx', href: '#/rechner/frist', style: { gap: '16px', color: 'inherit', textDecoration: 'none' } }, plakettenBild(n1.m, n1.y, 76),
      h('div', { class: 'grow' }, h('div', { style: { fontWeight: 700 } }, `Pkw heute geprüft → nächste HU ${pad2(n1.m)}/${n1.y}`), h('div', { class: 'small muted' }, `Plakette ${plakette(n1.y).name}. Andere Fahrzeugarten im Fristrechner.`)), h('span', { class: 'chev faint' }, icon('right', 18))));

  katalog().then((k) => {
    demoLauf(k);
    clear(fakten).append(
      h('span', null, h('b', null, k.eintraege.length), 'amtliche Mängel'), h('span', null, h('b', null, k.punkte.length), 'Prüfpunkte'),
      h('span', null, icon('offline', 15), 'auch ohne Netz'));
    return gesetz('stvzo');
  }).then((g) => { fakten.insertBefore(h('span', null, h('b', null, g.normen.length), 'StVZO-Vorschriften'), fakten.lastChild); }).catch(() => {
    clear(fakten).append(h('span', null, icon('offline', 15), 'Wissensdatenbank nicht geladen – einmal mit Internet öffnen'));
  });
  return () => { aktiv = false; };
}
