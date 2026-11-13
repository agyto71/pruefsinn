// Prüfsinn – Wissen: Mängelkatalog, Gesetzestexte, Nachschlagetabellen

import { h, icon, clear, store, sheet, copyText, debounce, diktat, diktatMoeglich, diktatFehlerText, toast, fmt, seg } from '../core.js';
import { katalog, gesetz, GESETZE, punktTitel, STUFE, FRISTEN, FOLGEN, plakette, BREMSE, bremsUngleich, SI, tragfaehigkeit, SICHTEN, nummerVon, katalogArt } from '../daten.js';
import { sucheMaengel, sucheNormen, markiere, markiereWorte } from '../suche.js';
import { waehleAuftrag } from './auftraege.js';

export const sev = (s, tag = 'span', attrs = {}) => h(tag, { class: 'sev sev-' + s, title: STUFE[s].name, ...attrs }, STUFE[s].code);

function tabs(aktiv) {
  const T = [['', 'Mängelkatalog'], ['stvzo', 'StVZO'], ['fzv', 'FZV'], ['tabellen', 'Tabellen']];
  return h('nav', { class: 'tabs', 'aria-label': 'Bereiche' },
    T.map(([k, l]) => h('a', { href: '#/wissen' + (k ? '/' + k : ''), 'aria-current': k === aktiv ? 'page' : null }, l)));
}
function kopf(titel, sub) {
  return h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, titel), sub && h('p', { class: 'sub' }, sub)));
}
function laden(el) {
  const s = h('div', { class: 'stack' }, [72, 58, 58, 58, 58].map((x) => h('div', { class: 'skeleton', style: { height: x + 'px' } })));
  el.append(s);
  return () => s.remove();
}
function fehler(el, e) {
  el.append(h('div', { class: 'card pad empty' }, h('div', { class: 'big' }, icon('offline', 28)), h('h3', null, 'Daten nicht erreichbar'),
    h('p', null, 'Die Wissensdatenbank konnte nicht geladen werden. Einmal mit Internet öffnen – danach funktioniert sie offline.'),
    h('p', { class: 'xs faint' }, String(e && e.message || e))));
}

/** Suchfeld mit optionalem Mikrofon. */
export function suchfeld({ placeholder, value = '', onInput, autofocus, hero }) {
  const input = h('input', { type: 'search', placeholder, value, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search', 'aria-label': placeholder });
  const feuere = debounce(() => onInput(input.value), 130);
  input.addEventListener('input', feuere);
  let lauf = null;
  const mic = diktatMoeglich && h('button', { class: 'mic', type: 'button', 'aria-label': 'Spracheingabe', onclick: () => {
    if (lauf) { lauf.stop(); return; }
    mic.classList.add('live');
    lauf = diktat({
      onText: (t) => { input.value = t; onInput(t); },
      onEnd: () => { lauf = null; mic.classList.remove('live'); },
      onError: (c) => { lauf = null; mic.classList.remove('live'); toast(diktatFehlerText(c)); },
    });
    if (!lauf) mic.classList.remove('live');
  } }, icon('mic'));
  const el = h('div', { class: 'search' + (hero ? ' hero' : '') }, icon('search'), input, mic);
  if (autofocus) setTimeout(() => input.focus(), 60);
  return { el, input, stop: () => lauf && lauf.stop() };
}

// ---------------------------------------------------------------- Mängelkatalog
export function eintragZeile(r, { begriffe, onClick, mitPunkt = true }) {
  const e = r.e;
  return h('button', { class: 'entry', type: 'button', onclick: () => onClick(r) },
    sev(e.s[0]),
    h('div', { class: 'grow' },
      h('div', { class: 't pre clamp3', html: markiere(e.text, begriffe) }),
      e.wenn && h('div', { class: 'w pre clamp3', html: markiere(e.wenn, begriffe) }),
      mitPunkt && h('div', { class: 'p' }, `${nummerVon(e)} · ${r.titel || punktTitel(r.p)}`)));
}

export async function zeigePunkt(nr, { markiert } = {}) {
  const kat = await katalog();
  const p = kat.punktNach.get(nr);
  if (!p) return;
  const gruppe = kat.gruppeNach.get(p.gruppe);
  const eintraege = kat.eintraege.filter((e) => e.nr === nr);
  const noten = new Set();
  const HOCH = { '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  const sammle = (t) => {
    for (const m of (t || '').matchAll(/\((\d)\)/g)) if (kat.fussnoten[m[1]]) noten.add(m[1]);
    for (const m of (t || '').matchAll(/[¹²³⁴⁵⁶⁷⁸⁹]/g)) if (kat.fussnoten[HOCH[m[0]]]) noten.add(HOCH[m[0]]);
  };
  eintraege.forEach((e) => { sammle(e.text); sammle(e.wenn); sammle(e.fn); });
  sammle(p.titel);
  if (kat.art !== 'de') sammle(p.methode);
  const de = kat.art === 'de';

  const zeilen = [];
  let letzter = null;
  for (const e of eintraege) {
    const marke = (e.d ? 'D' : '') + '|' + e.b;
    const neu = marke !== letzter || !e.wenn;
    letzter = marke;
    zeilen.push(h('div', { class: 'entry', style: e.id === markiert ? { background: 'var(--accent-soft)' } : null },
      h('span', { class: 'letter' + (e.d ? ' d' : '') }, neu ? (e.d ? 'D' + (e.b ? ' ' + e.b + ')' : '') : e.b ? e.b + ')' : '') : ''),
      h('div', { class: 'grow' },
        !e.wenn ? h('div', { class: 't pre' }, e.text) : h('div', { class: 'w pre', style: { marginTop: 0 } }, e.wenn),
        e.wahl && h('div', { class: 'xs faint', style: { marginTop: '2px' } }, `Bewertung nach Befund: ${e.s.map((x) => STUFE[x].code).join(' oder ')}`)),
      sev(e.s[0]),
      h('button', { class: 'icon-btn', title: 'Zum Befund hinzufügen', 'aria-label': 'Zum Befund hinzufügen', onclick: () => waehleAuftrag(e) }, icon('plus', 20))));
  }
  const text = `${nr} ${punktTitel(p)}\n` + eintraege.map((e) => `${e.d ? 'D ' : ''}${e.b ? e.b + ') ' : ''}${e.wenn ? '   ↳ ' + e.wenn : e.text} [${e.s.map((x) => STUFE[x].code).join('/')}]`).join('\n');
  const s = sheet({
    title: punktTitel(p),
    cls: 'wide',
    body: h('div', { class: 'stack' },
      h('div', { class: 'rowx wrap' }, h('span', { class: 'tag' }, 'Nr. ' + nr), h('span', { class: 'tag' }, gruppe.titel), p.x && h('span', { class: 'tag' }, 'nicht wesentlich (X)')),
      (p.pflicht || p.ergaenzung) && h('div', { class: 'grid2 kriterien' },
        p.pflicht && h('div', null, h('div', { class: 'eyebrow' }, 'Pflichtuntersuchung'), h('p', { class: 'muted small pre', style: { marginTop: '4px' } }, p.pflicht)),
        p.ergaenzung && h('div', null, h('div', { class: 'eyebrow' }, 'Ergänzungsuntersuchung'), h('p', { class: 'muted small pre', style: { marginTop: '4px' } }, p.ergaenzung))),
      p.methode && h('div', null, h('div', { class: 'eyebrow' }, de ? 'Prüfmethode (EU-Katalog)' : 'Prüfmethode'), h('p', { class: 'muted small pre', style: { marginTop: '4px' } }, p.methode)),
      p.hinweis && h('div', { class: 'note' }, icon('info', 18), h('span', null, p.hinweis)),
      h('div', null, h('div', { class: 'eyebrow', style: { marginBottom: '6px' } }, 'Gründe für die Mangelfeststellung'), h('div', { class: 'list' }, zeilen)),
      noten.size ? h('div', { class: 'stack-s' }, [...noten].sort().map((n) => h('p', { class: 'xs muted' }, `(${n}) ${kat.fussnoten[n]}`))) : null,
      h('p', { class: 'src' }, de
        ? `Quelle: ${kat.quelle.titel}. ${kat.quelle.fassung}. D-Nummern sind nationale Ergänzungen. Gelesen aus dem amtlichen Verkehrsblatt – im Zweifel gilt der Abdruck dort.`
        : `Quelle: ${kat.quelle.titel}. ${kat.quelle.fassung}. Die Einstufung ist der EU-Mindestkatalog; maßgeblich für die HU in Deutschland ist die HU-Richtlinie.`)),
    footer: [h('button', { class: 'btn ghost', onclick: () => copyText(text) }, icon('copy', 18), 'Kopieren')],
  });
  if (markiert) setTimeout(() => s.body.querySelector('[style*="accent-soft"]')?.scrollIntoView({ block: 'center' }), 280);
}

async function seiteKatalog(el, teile, q) {
  el.append(kopf('Wissen', 'Amtliche Texte, durchsuchbar – auch ohne Netz.'), tabs(''));
  const fertig = laden(el);
  let kat;
  try { kat = await katalog(); } catch (e) { fertig(); fehler(el, e); return; }
  fertig();

  const zustand = { q: q.get('q') || store.get('wissen.q', ''), stufe: null, gruppe: teile[0] === 'gruppe' ? teile[1] : null, sicht: q.get('fz') === 'lkw' ? 'lkw' : 'pkw' };
  const sichtOrt = h('div', { class: 'sicht' });
  const liste = h('div');
  const chips = h('div', { class: 'chips' });
  const feld = suchfeld({ placeholder: 'Mangel suchen – z. B. „Bremsschlauch porös“', value: zustand.q, onInput: (v) => { zustand.q = v; store.set('wissen.q', v); zeichne(); } });

  function zeichneChips() {
    clear(chips);
    const anz = (s) => kat.eintraege.filter((e) => e.s.includes(s) && (!zustand.gruppe || e.nr.split('.')[0] === zustand.gruppe)).length;
    chips.append(h('button', { class: 'chip', 'aria-pressed': String(!zustand.stufe), onclick: () => { zustand.stufe = null; zeichne(); } }, 'Alle'));
    for (const s of ['G', 'E', 'V', 'U'].filter((x) => x !== 'U' || kat.eintraege.some((e) => e.s.includes('U')))) {
      chips.append(h('button', { class: 'chip', 'aria-pressed': String(zustand.stufe === s), onclick: () => { zustand.stufe = zustand.stufe === s ? null : s; zeichne(); } },
        h('span', { class: 'dot dot-' + s }), STUFE[s].kurz, h('span', { class: 'cnt' }, anz(s))));
    }
    if (zustand.gruppe) {
      const g = kat.gruppeNach.get(zustand.gruppe);
      chips.append(h('button', { class: 'chip', 'aria-pressed': 'true', onclick: () => { location.hash = '#/wissen'; } }, `${g.nr} ${g.titel}`, icon('x', 14)));
    }
  }

  function zeichne() {
    zeichneChips();
    clear(liste);
    const suchtext = zustand.q.trim();
    // Pkw oder Lkw gilt für die freie Suche; wer eine Gruppe durchblättert, sieht immer alles
    clear(sichtOrt);
    if (suchtext && !zustand.gruppe) sichtOrt.append(h('span', { class: 'xs faint' }, 'Mängel für'), seg([...SICHTEN, ['', 'alle Fahrzeuge']], zustand.sicht, (v) => { zustand.sicht = v; zeichne(); }, 'klein'));
    if (!suchtext && !zustand.stufe && !zustand.gruppe) {
      // Einstieg: Gruppen
      liste.append(h('div', { class: 'list' }, kat.gruppen.map((g) => {
        const n = kat.eintraege.filter((e) => e.nr.split('.')[0] === g.nr).length;
        return h('a', { class: 'item', href: '#/wissen/gruppe/' + g.nr },
          h('div', { class: 'kat-group grow' }, h('span', { class: 'n' }, g.nr), h('div', null, h('div', { class: 't' }, g.titel), h('div', { class: 'd' }, `${n} Mängel`))),
          h('span', { class: 'chev' }, icon('right', 18)));
      })));
      liste.append(h('p', { class: 'src', style: { marginTop: '14px' } }, `${kat.eintraege.length} Mängel in ${kat.punkte.length} Prüfpunkten · ${kat.quelle.titel} · ${kat.quelle.fassung} · ${kat.quelle.lizenz}`));
      return;
    }
    if (!suchtext && zustand.gruppe && !zustand.stufe) {
      // Gruppe: Prüfpunkte
      const punkte = kat.punkte.filter((p) => p.gruppe === zustand.gruppe);
      let bereich = null;
      const kinder = [];
      for (const p of punkte) {
        if ((p.bereich || '') !== bereich) {
          bereich = p.bereich || '';
          if (bereich) kinder.push(h('div', { class: 'item', style: { minHeight: '0', padding: '10px 16px', background: 'var(--surface-2)' } }, h('span', { class: 'eyebrow' }, bereich)));
        }
        kinder.push(h('button', { class: 'item', onclick: () => zeigePunkt(p.nr) },
          h('span', { class: 'mono faint', style: { width: '58px', flex: 'none' } }, p.nr),
          h('div', { class: 'grow' }, h('div', { class: 't' }, p.titel)),
          h('span', { class: 'xs faint num' }, p.anzahl), h('span', { class: 'chev' }, icon('right', 18))));
      }
      liste.append(h('div', { class: 'list' }, kinder));
      return;
    }
    const r = sucheMaengel(kat, suchtext, { max: 60, gruppe: zustand.gruppe, stufe: zustand.stufe, fahrzeug: zustand.gruppe ? '' : zustand.sicht });
    const mehrLkw = r.beiLkw ? h('button', { class: 'sugg-mehr', type: 'button', onclick: () => { zustand.sicht = 'lkw'; zeichne(); } }, icon('truck', 16), `${r.beiLkw} weitere Treffer bei Lkw anzeigen`) : null;
    if (!r.ergebnisse.length) {
      liste.append(h('div', { class: 'card pad empty' }, h('div', { class: 'big' }, icon('search', 28)), h('h3', null, 'Nichts gefunden'),
        h('p', null, 'Anders formulieren oder Filter lösen. Tipp: Bauteil + Zustand, z. B. „Querlenker Spiel“.'), mehrLkw));
      return;
    }
    liste.append(h('p', { class: 'xs faint', style: { margin: '0 4px 8px' } }, `${r.anzahl} Treffer${r.anzahl > r.ergebnisse.length ? ' – die besten ' + r.ergebnisse.length : ''}${r.ort ? ' · Lage erkannt: ' + r.ort : ''}`));
    liste.append(h('div', { class: 'list' }, r.ergebnisse.map((x) => eintragZeile(x, { begriffe: r.begriffe, onClick: (y) => zeigePunkt(y.e.nr, { markiert: y.e.id }) }))));
    if (mehrLkw) liste.append(mehrLkw);
  }

  el.append(feld.el, sichtOrt, chips, liste);
  zeichne();
  return () => feld.stop();
}

// ---------------------------------------------------------------- Gesetze
async function seiteGesetz(el, key, teile, q) {
  const meta = GESETZE[key];
  if (teile[0]) return seiteNorm(el, key, teile[0]);
  el.append(kopf('Wissen', 'Amtliche Texte, durchsuchbar – auch ohne Netz.'), tabs(key));
  const fertig = laden(el);
  let g;
  try { g = await gesetz(key); } catch (e) { fertig(); fehler(el, e); return; }
  fertig();
  let suchtext = q.get('q') || store.get('wissen.q.' + key, '');
  const liste = h('div');
  const feld = suchfeld({ placeholder: `${meta.kurz} durchsuchen – „§ 29“ oder „Profiltiefe“`, value: suchtext, onInput: (v) => { suchtext = v; store.set('wissen.q.' + key, v); zeichne(); } });
  const zeile = (n, aus) => h('a', { class: 'item top', href: `#/wissen/${key}/${n.id}` },
    h('div', { class: 'grow' },
      h('div', { class: 't' }, h('span', { class: 'num' }, n.bez), n.titel ? ' · ' + n.titel : ''),
      aus && h('div', { class: 'd clamp3', html: markiereWorte(aus, suchtext) })),
    h('span', { class: 'chev' }, icon('right', 18)));

  function zeichne() {
    clear(liste);
    const t = suchtext.trim();
    if (t) {
      const r = sucheNormen(g, t);
      if (!r.length) { liste.append(h('div', { class: 'card pad empty' }, h('h3', null, 'Nichts gefunden'), h('p', null, 'Alle Wörter müssen im Text vorkommen – weniger Wörter versuchen.'))); return; }
      liste.append(h('p', { class: 'xs faint', style: { margin: '0 4px 8px' } }, `${r.length} Vorschriften`), h('div', { class: 'list' }, r.map((x) => zeile(x.n, x.aus))));
      return;
    }
    const favs = store.get('favoriten', []).filter((f) => f.startsWith(key + '/')).map((f) => g.normNach.get(f.split('/')[1])).filter(Boolean);
    if (favs.length) liste.append(h('div', { class: 'section-title', style: { marginTop: '4px' } }, h('h2', null, 'Angeheftet')), h('div', { class: 'list' }, favs.map((n) => zeile(n))));
    let abschnitt = null, gruppe = null;
    for (const n of g.normen) {
      if (n.abschnitt !== abschnitt) {
        abschnitt = n.abschnitt;
        liste.append(h('div', { class: 'section-title' }, h('h2', null, abschnitt || meta.kurz)));
        gruppe = h('div', { class: 'list' });
        liste.append(gruppe);
      }
      gruppe.append(zeile(n));
    }
    liste.append(h('p', { class: 'src', style: { marginTop: '14px' } }, `${g.quelle.titel} · ${g.quelle.fassung} · ${g.quelle.herausgeber} · ${g.quelle.lizenz}`));
  }
  el.append(feld.el, liste);
  zeichne();
  return () => feld.stop();
}

async function seiteNorm(el, key, id) {
  const meta = GESETZE[key];
  el.append(h('a', { class: 'back', href: '#/wissen/' + key }, icon('left', 20), meta.kurz));
  const fertig = laden(el);
  let g;
  try { g = await gesetz(key); } catch (e) { fertig(); fehler(el, e); return; }
  fertig();
  const n = g.normNach.get(id);
  if (!n) { el.append(h('div', { class: 'card pad empty' }, h('h3', null, 'Vorschrift nicht gefunden'))); return; }
  const fk = key + '/' + id;
  const istFav = () => store.get('favoriten', []).includes(fk);
  const stern = h('button', { class: 'icon-btn' + (istFav() ? ' on' : ''), 'aria-label': 'Anheften', title: 'Anheften', onclick: () => {
    const f = store.get('favoriten', []);
    store.set('favoriten', f.includes(fk) ? f.filter((x) => x !== fk) : [...f, fk]);
    stern.classList.toggle('on', istFav());
    toast(istFav() ? 'Angeheftet' : 'Nicht mehr angeheftet');
  } }, icon('star'));
  el.append(
    h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('p', { class: 'eyebrow' }, `${meta.kurz} · ${n.abschnitt || ''}`), h('h1', null, n.bez), n.titel && h('p', { class: 'sub' }, n.titel)), stern,
      h('button', { class: 'icon-btn', 'aria-label': 'Text kopieren', title: 'Text kopieren', onclick: () => copyText(`${n.bez} ${meta.kurz} – ${n.titel}\n\n${n.text.trim()}`) }, icon('copy'))),
    h('article', { class: 'card pad prose', html: n.html }),
    h('p', { class: 'src' }, `${g.quelle.fassung}. Quelle: `, h('a', { href: g.quelle.url, target: '_blank', rel: 'noopener' }, 'gesetze-im-internet.de'), ` · ${g.quelle.lizenz}. Abbildungen sind nur im Original enthalten. Verbindlich ist die amtliche Fassung.`));
}

// ---------------------------------------------------------------- Tabellen
async function seiteTabellen(el) {
  el.append(kopf('Wissen', 'Amtliche Texte, durchsuchbar – auch ohne Netz.'), tabs('tabellen'));
  const jahr = new Date().getFullYear();
  const karte = (titel, quelle, ...inhalt) => h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, titel)), h('div', { class: 'card-body stack' }, inhalt, h('p', { class: 'src' }, quelle)));

  el.append(karte('Ergebnis der HU – Mängelklassen', h('span', null, 'Sinngemäß nach Anlage VIII Nr. 3.1.4 StVZO · ', h('a', { href: '#/wissen/stvzo/anlage-viii' }, 'Anlage VIII öffnen')),
    h('div', { class: 'stack-s' }, ['O', 'G', 'E', 'V', 'U'].map((s) => h('div', { class: 'rowx top' }, sev(s), h('div', { class: 'grow' }, h('div', { class: 't', style: { fontWeight: 650 } }, STUFE[s].name), h('div', { class: 'small muted' }, FOLGEN[s].text)))))));

  el.append(karte('HU-Fristen', h('span', null, 'Anlage VIII Nr. 2.1 und 2.2 StVZO · Frist beginnt mit Monat und Jahr der letzten HU (Nr. 2.3) · ', h('a', { href: '#/rechner/frist' }, 'Fristrechner')),
    h('div', { class: 'scroll-x' }, h('table', { class: 'ref' },
      h('thead', null, h('tr', null, h('th', null, 'Fahrzeug · Frist in Monaten'), h('th', { class: 'r' }, 'Erste'), h('th', { class: 'r' }, 'Weitere'))),
      h('tbody', null, FRISTEN.map((f) => h('tr', null,
        h('td', null, f.label, (f.sp || f.hinweis) && h('div', { class: 'xs muted' }, f.sp || f.hinweis)),
        h('td', { class: 'r' }, h('b', null, f.erst)), h('td', { class: 'r' }, h('b', null, f.folge)))))))));

  el.append(karte('Farbe der Prüfplakette', h('span', null, 'Anlage IX StVZO: Farbe nach dem Jahr der nächsten HU; Reihenfolge blau, gelb, braun, rosa, grün, orange. · ', h('a', { href: '#/wissen/stvzo/anlage-ix' }, 'Anlage IX öffnen')),
    h('div', { class: 'grid3' }, [0, 1, 2, 3, 4, 5].map((i) => {
      const p = plakette(jahr + i);
      return h('div', { class: 'rowx' }, h('span', { class: 'swatch', style: { background: p.hex } }), h('div', null, h('div', { class: 'num', style: { fontWeight: 700 } }, jahr + i), h('div', { class: 'xs muted' }, p.name)));
    }))));

  el.append(karte('Bremsen – Mindestabbremsung', h('span', null, BREMSE.quelle + ' · ', h('a', { href: '#/rechner/bremsen' }, 'Bremsenrechner')),
    h('div', { class: 'scroll-x' }, h('table', { class: 'ref' },
      h('thead', null, h('tr', null, h('th', null, 'Klasse · Erstzulassung'), h('th', { class: 'r' }, 'ab 2012'), h('th', { class: 'r' }, 'vor 2012'))),
      h('tbody', null, BREMSE.klassen.map((k) => h('tr', null, h('td', null, k.label, k.fnAb && h('div', { class: 'xs muted' }, 'Ab 2012: ' + k.fnAb), k.fnVor && h('div', { class: 'xs muted' }, 'Vor 2012: ' + k.fnVor)), h('td', { class: 'r' }, h('b', null, k.ab2012 + ' %')), h('td', { class: 'r' }, h('b', null, k.vor2012 + ' %'))))))),
    h('p', { class: 'small muted' }, `Feststellbremse: mindestens ${BREMSE.feststell} % der zulässigen Höchstmasse. Unter 50 % der Mindestwerte: gefährlicher Mangel.`),
    katalogArt() === 'de'
      ? h('p', { class: 'small muted' }, h('b', { style: { color: 'var(--text)' } }, 'Ungleichmäßigkeit (HU-Bremsenrichtlinie Nr. 6.3.3): '), `In den oberen 2/3 des Prüfbereichs höchstens ${BREMSE.ungleichDe} % Unterschied zwischen den Rädern einer Achse, bezogen auf den höheren Wert – darüber erheblicher Mangel (1.2.1 b), an gelenkter Achse über 50 % gefährlich. Feststellbremse: Unterschied höchstens 50 %, wenn sie während der Fahrt betätigt werden kann und bei Anhängern, sonst 95 %. Ab Erstzulassung 1.1.2012 Prüfung mit Bezugsbremskräften je Achse (Nr. 6.2.1.1), davor bezogen auf die zulässige Gesamtmasse; bei Druckluft notfalls Einpunkt-Hochrechnung (Anlage 2, Blockierdruck mindestens 1,7 bar).`)
      : h('p', { class: 'small muted' }, 'Ungleichmäßigkeit (EU-Mindestkatalog): Bremskraft eines Rades unter 70 % des anderen Rades derselben Achse ist ein erheblicher Mangel, an gelenkten Achsen unter 50 % ein gefährlicher. In Deutschland gilt nach HU-Bremsenrichtlinie die strengere 25-%-Grenze.'),
    h('p', { class: 'src' }, 'Ungleichmäßigkeit und Bezugsbremskräfte: ', BREMSE.quelleDe, '. Die Mindestabbremsung in Anlage 1 der HU-Bremsenrichtlinie (Fassung VkBl. 2014 S. 655) kennt weitere Stufen nach Erstzulassung – die Tabelle oben folgt dem EU-Katalog.')));

  // AU-Richtlinie: Sollwerte, wenn der Hersteller nichts vorgibt (Plakettenwert bzw. Herstellerangabe haben Vorrang)
  el.append(karte('Abgas – Sollwerte der AU-Richtlinie', h('span', null, 'AU-Richtlinie vom 27.08.2014 (VkBl. 2014 S. 658), geändert VkBl. 2017 S. 852 und VkBl. 2022 S. 682; PN-Messung seit 01.07.2023 (VkBl. 2023 S. 390). Die Verlautbarung von 2020 (VkBl. 2020 S. 527) verschob nur den PN-Termin.'),
    h('p', { class: 'small muted' }, 'Gilt, wenn weder Plakettenwert noch Herstellervorgabe vorliegen. Seit 1.1.2018 ist die Messung am Endrohr für alle AU-pflichtigen Fahrzeuge Pflicht, auch mit OBD (Nr. 1.3.1).'),
    h('div', { class: 'eyebrow' }, 'Ottomotor'),
    h('dl', { class: 'kv' },
      h('dt', null, 'ohne Kat oder ungeregelter Kat – CO Leerlauf'), h('dd', null, '≤ 3,5 % vol (Nr. 3.2.1.5)'),
      h('dt', null, 'geregelter Kat – CO Leerlauf'), h('dd', null, '≤ 0,5 % vol ohne EG-Typgenehmigung oder Erstzulassung vor 1.7.2002, sonst ≤ 0,3 % vol (Nr. 3.3.1.4)'),
      h('dt', null, 'geregelter Kat – erhöhter Leerlauf'), h('dd', null, '2500–3000 min⁻¹; CO ≤ 0,3 % bzw. ≤ 0,2 % vol, ab Euro 6 ≤ 0,1 % vol (seit 1.1.2019, Nr. 3.3.1.7, 3.4.5.5)'),
      h('dt', null, 'Lambda bei erhöhtem Leerlauf'), h('dd', null, '0,97 bis 1,03 (Nr. 3.3.1.6)')),
    h('div', { class: 'eyebrow' }, 'Dieselmotor – Trübung (Messmodus B)'),
    h('dl', { class: 'kv' },
      h('dt', null, 'Erstzulassung vor 1.10.2006'), h('dd', null, '≤ 2,5 m⁻¹'),
      h('dt', null, 'Erstzulassung ab 1.10.2006'), h('dd', null, '≤ 1,5 m⁻¹'),
      h('dt', null, 'Euro 6/VI, 1.1.2019 bis 30.6.2023'), h('dd', null, 'Herstellervorgabe, höchstens 0,25 m⁻¹ – seit 1.7.2023 ersetzt durch die Partikelzählung (Nr. 3.5.1.7, 3.6.5.7)')),
    h('div', { class: 'eyebrow' }, 'Dieselmotor ab Euro 6/VI – Partikelanzahl (PN)'),
    h('dl', { class: 'kv' },
      h('dt', null, 'Grenzwert'), h('dd', null, '≤ 2,5 × 10⁵ cm⁻³ (Nr. 3.6.8.3)'),
      h('dt', null, 'Ablauf'), h('dd', null, 'Leerlauf, Drehzahl kurz um mindestens 1000 min⁻¹ erhöhen, Beruhigung, dann bis zu drei Messungen über je 30 s. Ist schon die erste ≤ 5 × 10⁴ cm⁻³, ist sie in Ordnung; sonst zählt der Mittelwert aller drei (Nr. 3.6.9).'),
      h('dt', null, 'Seit wann'), h('dd', null, 'Seit 01.07.2023 für Fahrzeuge mit Dieselmotor ab Euro 6/VI; ersetzt bei ihnen die Trübungsmessung (VkBl. 2023 Heft 11 Nr. 73, S. 390).')),
    h('div', { class: 'rowx wrap' }, h('button', { class: 'btn small tonal', onclick: () => zeigePunkt('8.2.1.2') }, 'Otto im Katalog'), h('button', { class: 'btn small tonal', onclick: () => zeigePunkt('8.2.2.2') }, 'Diesel im Katalog'))));

  // HU-Scheinwerfer-Prüfrichtlinie, Anlage 2
  const sw = (art, e, nebel, oben, unten, seite) => h('tr', null, h('td', null, art), h('td', { class: 'r' }, h('b', null, e)), h('td', { class: 'r' }, nebel), h('td', { class: 'r' }, oben), h('td', { class: 'r' }, unten), h('td', { class: 'r' }, seite));
  el.append(karte('Scheinwerfer – Einstellmaß und Toleranzen', h('span', null, 'HU-Scheinwerfer-Prüfrichtlinie, Anlage 2 (VkBl. 2018 Heft 23 Nr. 174, S. 834; Korrektur VkBl. 2019 S. 23 betrifft nur die Aufstellflächen). Eine Änderung von 2025 ist hier nicht eingearbeitet.'),
    h('p', { class: 'small muted' }, 'Einstellmaß „e“: Neigung der Hell-Dunkel-Grenze, bei Nr. 1–2 in % (1 % = 10 cm auf 10 m), bei Nr. 3–4 in cm. Toleranzen in derselben Einheit. Scheinwerfer mit EG/ECE-Genehmigung: am Fahrzeug angegebenes Einstellmaß, Toleranzen wie unter Nr. 2.'),
    h('div', { class: 'scroll-x' }, h('table', { class: 'ref' },
      h('thead', null, h('tr', null, h('th', null, 'Fahrzeug (Scheinwerfermitte H)'), h('th', { class: 'r' }, 'e Abblend/Fern'), h('th', { class: 'r' }, 'e Nebel'), h('th', { class: 'r' }, 'oben'), h('th', { class: 'r' }, 'unten'), h('th', { class: 'r' }, 'links/rechts¹'))),
      h('tbody', null,
        sw('2a Pkw, Klein- und Kleinstwagen, Radstand ≤ 2,5 m (H ≤ 140 cm)', '1,2', '2,0', '0,2', '0,8', '0,5'),
        sw('2b Pkw, Pkw-Kombi', '1,2', '2,0', '0,5', '0,5', '0,5'),
        sw('2c–f Niveauregulierung oder automatischer Neigungsausgleich, mehrachsige Zug-/Arbeitsmaschinen, Krafträder und Kfz mit einem Scheinwerfer, Lkw mit vorn liegender Ladefläche', '1,0', '2,0', '0,5', '0,5', '0,5'),
        sw('2g–i Lkw mit hinten liegender Ladefläche, Sattelzugmaschinen, Busse (ohne 2c)', '3,0', '4,0', '1,0', '0,5', '0,5'),
        sw('3 Andere Kfz mit H > 140 cm, auch Kfz bis 40 km/h (Werte in cm)', 'H/3²', '(H/3) + 7²', '10', '5', '5'),
        sw('4 Einachsige Zug- oder Arbeitsmaschinen (cm)', '2 N³', '20', '10', '5', '5')))),
    h('p', { class: 'xs muted' }, '¹ gilt nicht für Nebelscheinwerfer · ² siehe Tabelle der Einstellmaße in Anlage 3 · ³ N: Maß, um das die Lichtbündelmitte auf 5 m Entfernung geneigt werden soll'),
    h('a', { class: 'btn small tonal', href: '#/rechner/scheinwerfer' }, 'Scheinwerfer-Rechner')));

  el.append(karte('Abgas – EU-Mindestwerte ohne Herstellerangabe', h('span', null, 'RL 2014/45/EU Anhang I Nr. 8.2.1.2 und 8.2.2.2 · Vorrang haben Herstellerangabe bzw. Plakettenwert. In Deutschland gelten die Sollwerte der AU-Richtlinie (Karte oben).'),
    h('dl', { class: 'kv' },
      h('dt', null, 'Otto, mit Abgasnachbehandlung – Leerlauf'), h('dd', null, '0,5 % / 0,3 % CO'),
      h('dt', null, 'Otto – erhöhter Leerlauf'), h('dd', null, '0,3 % / 0,2 % CO'),
      h('dt', null, 'Lambda'), h('dd', null, '1 ± 0,03'),
      h('dt', null, 'Otto, ohne moderne Abgasnachbehandlung'), h('dd', null, '4,5 % / 3,5 % CO'),
      h('dt', null, 'Diesel, Saugmotor'), h('dd', null, '2,5 m⁻¹'),
      h('dt', null, 'Diesel, Turbomotor'), h('dd', null, '3,0 m⁻¹'),
      h('dt', null, 'Diesel, neuere Fahrzeuge'), h('dd', null, '1,5 m⁻¹ / 0,7 m⁻¹ (Euro 6)')),
    h('div', { class: 'rowx wrap' }, h('button', { class: 'btn small tonal', onclick: () => zeigePunkt('8.2.1.2') }, 'Otto im Katalog'), h('button', { class: 'btn small tonal', onclick: () => zeigePunkt('8.2.2.2') }, 'Diesel im Katalog'))));

  // Einzelabnahme: Vorgehen nach der Bekanntmachung des BMVI (Bund-Länder-Fachausschuss), sinngemäß und gekürzt
  const ea = (titel, punkte, nr) => h('div', { class: 'ea-gruppe' }, h('div', { class: 'rowx', style: { justifyContent: 'space-between' } }, h('b', null, titel), h('span', { class: 'xs faint' }, nr)),
    h('ul', { class: 'ea-liste' }, punkte.map((p) => h('li', null, p))));
  el.append(h('section', { class: 'card', id: 'einzelabnahme' }, h('div', { class: 'card-head' }, h('h2', null, 'Einzelabnahme – welches Verfahren?')),
    h('div', { class: 'card-body stack' },
      ea('§ 13 EG-FGV (Einzelgenehmigung für Neufahrzeuge)', ['Neue, noch nie zugelassene Kfz mit mindestens vier Rädern über 25 km/h und ihre Anhänger (Klassen M, N, O) – auch zulassungsfreie Anhänger und angehängte Arbeitsmaschinen',
        'auch neue Fahrzeuge mit besonderer Zweckbestimmung (Wohnmobile, Krankenwagen, Leichenwagen, beschussgeschützte und rollstuhlgerechte Fahrzeuge, Mobilkräne, Wohnanhänger)'], 'Nr. 2.1'),
      ea('§ 21 StVZO (Einzelbetriebserlaubnis)', ['Klasse M und N bis 25 km/h und ihre Anhänger', 'Klasse L (VO (EU) 168/2013)', 'Klassen T und C (VO (EU) 167/2013) bzw. Zugmaschinen nach § 2 Nr. 16 FZV (im Gutachten Feld 22), dazu R und S',
        'Gleiskettenfahrzeuge, Prototypen für Testprogramme, selbstfahrende Arbeitsmaschinen (§ 2 Nr. 17 FZV), sonstige Fahrzeuge', h('b', null, 'Gebrauchtfahrzeuge aller Klassen – also schon einmal zugelassene, auch Importe')], 'Nr. 2.2'),
      ea('Wahlweise § 13 EG-FGV oder § 21 StVZO', ['Fahrzeuge vor allem für Baustellen, Steinbrüche, Häfen, Flughäfen', 'Fahrzeuge für Streitkräfte, Katastrophenschutz, Feuerwehr, Ordnungskräfte',
        'selbstfahrende Arbeitsmaschinen nach EU-Definition', 'Fahrzeuge nur für Straßenrennen'], 'Nr. 2.3'),
      ea('Sonderfälle', ['Unvollständiges Fahrzeug mit Typgenehmigung (z. B. Fahrgestell) vervollständigt: Einzelbegutachtung nach Fahrzeugart wie oben – keine Änderung nach § 19 Abs. 2. Nachweisliste mit Bezug zur TG des Basisfahrzeugs',
        'Vor der Begutachtung nach Hinweisen auf eine schon bestehende Genehmigung suchen (EU-TG, ABE, Einzelgenehmigung) – Mehrfachgenehmigungen sind unzulässig (§ 21 Abs. 1a StVZO)',
        'Neufahrzeug mit TG, nachträglich verändert: Einzelgenehmigung nur nach Bauartveränderung vor der Erstzulassung; Änderungen im Feld „Zusätzliche Bemerkungen zur Fahrzeugbeschreibung“ nachvollziehbar vermerken',
        'Änderung nach § 19 Abs. 2 ohne Nachweise nach § 19 Abs. 3 Nr. 1–4: neue Betriebserlaubnis entsprechend § 21 StVZO'], 'Nr. 3'),
      h('div', { class: 'eyebrow' }, 'Nachweisliste – Nachweistypen (Nr. 4)'),
      h('dl', { class: 'kv' },
        h('dt', null, 'X'), h('dd', null, 'Rechtsakt mit Genehmigung eingehalten (Dokument liegt vor oder am Fahrzeug/Bauteil ermittelt)'),
        h('dt', null, 'A'), h('dd', null, 'Anforderungen der Systemgenehmigung geprüft, ohne Genehmigung; Prüfprotokoll'),
        h('dt', null, 'B'), h('dd', null, 'Technische Vorschriften eingehalten; Prüfprotokoll, Herstellerbescheinigung oder Anbauprüfung'),
        h('dt', null, 'C'), h('dd', null, 'Wesentliche Bestimmungen nachgewiesen; Ersatzverfahren oder Prüfprotokoll'),
        h('dt', null, 'G'), h('dd', null, 'in der ABE/TG des Basisfahrzeugs nachgewiesen'),
        h('dt', null, 'Z'), h('dd', null, 'Ausnahmegenehmigung erforderlich bzw. vorhanden'),
        h('dt', null, 'N/A'), h('dd', null, 'nicht anwendbar / nicht verbaut')),
      ea('Vor dem Abschluss', ['Prüfprotokolle je Genehmigungsgegenstand bzw. Bauvorschrift der StVZO (Nr. 4)', 'Nachweisliste der EU-Fahrzeugklasse beigefügt – bei § 13 EG-FGV und bei § 21 auf EU-typgenehmigter Basis; StVZO-Vorschriften mit Paragraph/Absatz/Anhang (Nr. 4)',
        'Felder J, 4 und 5 nach Teil A1B der Systematisierung verschlüsselt; bei § 13 EG-FGV in Feld 22 die EU-Fahrzeugklasse (Nr. 5)', 'Inanspruchnahme der StVZO-Anforderungen bzw. Ausnahme nach § 70 StVZO stichhaltig begründet und in der Fahrzeugbeschreibung (Nr. 6)',
        '§ 21-Gutachten: „Hauptuntersuchung gemäß § 29 StVZO erforderlich: Ja/Nein“ – Ja z. B. bei Gebrauchtfahrzeugen aus Drittstaaten, EU-Importen ohne Prüfbescheinigung nach Art. 8 RL 2014/45/EU oder Änderungen an Motor (AU) oder Bremsen; die HU mit eigenem Bericht (Nr. 8)',
        'Gebühr: Nr. 413 GebOSt; zusätzlicher Aufwand bei fehlenden Unterlagen nach Fußnote 1 zu 413 bzw. Nr. 499 (Nr. 7)'], 'Nr. 4–8'),
      h('p', { class: 'src' }, 'Sinngemäß und gekürzt nach der Bekanntmachung des BMVI „Einzelgenehmigungen gemäß § 13 EG-FGV bzw. Einzelbetriebserlaubnisse gemäß § 21 StVZO“ vom 4. Dezember 2019, VkBl. 2019 Heft 24 Nr. 177, S. 916 ff. (amtliches Werk; Quelle: Verkehrsblatt-Archiv bei FragDenStaat). Der Anhang zu Nr. 2.3 und die Formulare der arge tp 21 sind hier nicht enthalten. Verbindlich ist die amtliche Fassung.'))));

  el.append(karte('Reifen – Kennzahlen', h('span', null, 'Genormte Reihen für Tragfähigkeit und Geschwindigkeit (UN-Regelungen Nr. 30 und 54). Mindestprofiltiefe 1,6 mm: § 36 StVZO · ', h('a', { href: '#/wissen/stvzo/p-36' }, '§ 36 öffnen')),
    h('div', { class: 'eyebrow' }, 'Geschwindigkeitsindex'),
    h('div', { class: 'chips wrap' }, SI.map(([b, v]) => h('span', { class: 'tag' }, h('b', null, b), ` ${v} km/h`))),
    h('div', { class: 'eyebrow' }, 'Tragfähigkeitsindex (Auswahl)'),
    h('div', { class: 'chips wrap' }, [75, 80, 82, 84, 86, 88, 91, 94, 95, 97, 98, 100, 102, 104, 106, 109, 112, 116, 121].map((li) => h('span', { class: 'tag' }, h('b', null, li), ` ${fmt(tragfaehigkeit(li), 0)} kg`))),
    h('a', { class: 'btn small tonal', href: '#/rechner/tragfaehigkeit' }, 'Alle Werte im Rechner')));
}

export function seite(el, teile, q) {
  const t = teile[0] || '';
  if (t === 'stvzo' || t === 'fzv') return seiteGesetz(el, t, teile.slice(1), q);
  if (t === 'tabellen') return seiteTabellen(el);
  return seiteKatalog(el, teile, q);
}
