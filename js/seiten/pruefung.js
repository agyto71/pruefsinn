// Prüfsinn – geführte Prüfung: Bildschirm für Bildschirm durch die Untersuchung, am Ende das Befundblatt.
// Reihenfolge und Praxistipps kommen aus js/ablauf.js (Vorschlag), Prüfmethode und Mängel aus dem amtlichen Katalog.

import { h, icon, clear, sheet } from '../core.js';
import { katalog, punktTitel, STUFE, FOLGEN, FRISTEN, einstufungsQuelle, katalogArt } from '../daten.js';
import { ablaufFuer, BILDER } from '../ablauf.js';
import { hole, aendere, fuegeBefundHinzu, ergebnis, eingabe, befundblattTeilen, kennzeichen } from './auftraege.js';
import { sev } from './wissen.js';

const LAGEN = ['vorne', 'hinten', 'links', 'rechts'];

export async function seite(el, id) {
  if (!hole(id)) {
    el.append(h('div', { class: 'card pad empty' }, h('h3', null, 'Auftrag nicht gefunden'), h('a', { class: 'btn', href: '#/auftraege' }, 'Zur Liste')));
    return;
  }
  // Ablauf zur Fahrzeugart des Auftrags: Pkw (auch Transporter bis 3,5 t) oder Lkw über 3,5 t
  const weg = ablaufFuer(hole(id).fahrzeugart);
  const STATIONEN = weg.stationen, SCHRITTE = weg.schritte, N = SCHRITTE.length;
  // Wurde die Fahrzeugart nachträglich geändert, beginnt der andere Ablauf von vorn (erfasste Mängel bleiben)
  if (hole(id).ablauf && (hole(id).ablauf.art || 'pkw') !== weg.id) aendere(id, (x) => { x.ablauf.art = weg.id; x.ablauf.pos = 0; });
  document.body.classList.add('pruefmodus');
  const buehne = h('div', { class: 'pm' });
  const fuss = h('div', { class: 'pm-fuss' });
  el.append(buehne, fuss);
  let ein = null;
  let kat;
  try { kat = await katalog(); } catch {
    buehne.append(h('div', { class: 'note warn' }, icon('offline', 18), h('span', null, 'Mängelkatalog nicht geladen – einmal mit Internet öffnen.')));
    return aufraeumen;
  }

  const ablauf = () => hole(id).ablauf || { pos: 0, status: {}, art: weg.id };
  const setze = (fn) => aendere(id, (x) => { if (!x.ablauf) x.ablauf = { pos: 0, status: {}, art: weg.id }; fn(x.ablauf, x); });
  const gehe = (pos) => { setze((ab) => { ab.pos = Math.max(0, Math.min(N, pos)); }); zeichne(); window.scrollTo(0, 0); };
  function aufraeumen() { ein?.stop(); document.body.classList.remove('pruefmodus'); document.removeEventListener('keydown', taste); }
  function taste(e) {
    if (e.key !== 'Enter' || /INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY/.test(document.activeElement?.tagName || '') || document.querySelector('.sheet-back')) return;
    fuss.querySelector('.pm-weiter')?.click();
  }
  document.addEventListener('keydown', taste);

  /** Punkt neben einem Schritt in der Übersicht: erledigt, mit Mangel, entfällt, offen. */
  function punkt(s) {
    const st = ablauf().status[s.id];
    const eigene = hole(id).befunde.filter((b) => b.schritt === s.id && b.s !== 'H');
    if (eigene.length) {
      const hoch = eigene.reduce((m, b) => (STUFE[b.s].rang > STUFE[m].rang ? b.s : m), 'G');
      return h('span', { class: 'dot dot-' + hoch });
    }
    return h('span', { class: 'dot', style: { background: st === 'ok' ? 'var(--ok)' : st === 'entfaellt' ? 'var(--line-strong)' : 'transparent', border: st ? '0' : '1.5px solid var(--line-strong)' } });
  }
  function uebersicht() {
    const pos = ablauf().pos;
    const s = sheet({
      title: 'Ablauf · ' + weg.lang,
      body: h('div', { class: 'stack' }, STATIONEN.map((st, si) => h('div', null,
        h('div', { class: 'eyebrow', style: { margin: '6px 4px 8px' } }, `${si + 1} · ${st.titel}`),
        h('div', { class: 'list' }, st.schritte.map((x) => {
          const i = SCHRITTE.findIndex((y) => y.id === x.id);
          return h('button', { class: 'item', style: { minHeight: '50px', background: i === pos ? 'var(--accent-soft)' : null }, onclick: () => { s.close(); gehe(i); } },
            punkt(x), h('div', { class: 'grow t' }, x.titel), h('span', { class: 'xs faint num' }, i + 1));
        }))))),
    });
  }

  function zeichne() {
    ein?.stop();
    ein = null;
    const a = hole(id);
    const pos = ablauf().pos;
    clear(buehne);
    clear(fuss);
    if (pos >= N) return abschluss(a);
    const s = SCHRITTE[pos];
    const bild = s.bild && BILDER[s.bild];
    const eintraege = kat.eintraege.filter((e) => s.punkte.includes(e.nr));
    const eigene = () => hole(id).befunde.filter((b) => b.schritt === s.id);
    const liste = h('div', { class: 'list' });
    const zusatz = h('div');
    const inner = h('div', { class: 'pm-fuss-innen' });
    fuss.append(inner);

    function zeichneFuss() {
      const hat = eigene().some((b) => b.s !== 'H');
      clear(inner).append(
        h('button', { class: 'icon-btn', 'aria-label': 'Schritt zurück', disabled: pos === 0, style: pos === 0 ? { opacity: '.3' } : null, onclick: () => gehe(pos - 1) }, icon('left')),
        h('button', { class: 'btn ghost', onclick: () => { setze((ab) => { ab.status[s.id] = 'entfaellt'; }); gehe(pos + 1); } }, 'Entfällt'),
        h('button', { class: 'btn pm-weiter', onclick: () => { setze((ab) => { ab.status[s.id] = hat ? 'mangel' : 'ok'; }); gehe(pos + 1); } },
          hat ? 'Weiter' : 'In Ordnung', icon(hat ? 'right' : 'check', 18)));
    }
    function umschalten(e) {
      const da = eigene().find((b) => b.kat === e.id);
      if (da) aendere(id, (x) => { x.befunde = x.befunde.filter((b) => b.id !== da.id); });
      else fuegeBefundHinzu(id, { ...e, titel: punktTitel(kat.punktNach.get(e.nr)) }, '', { schritt: s.id });
      zeichneListe();
      zeichneFuss();
    }
    function lage(b, l) {
      aendere(id, (x) => {
        const ziel = x.befunde.find((y) => y.id === b.id);
        const teile = new Set((ziel.ort || '').split(' ').filter(Boolean));
        if (teile.has(l)) teile.delete(l); else teile.add(l);
        ziel.ort = [...LAGEN.filter((t) => teile.has(t)), ...[...teile].filter((t) => !LAGEN.includes(t))].join(' ');
      });
      zeichneListe();
    }
    const lagenZeile = (b) => h('div', { class: 'pm-lage' }, h('span', { class: 'xs faint' }, 'Lage:'),
      LAGEN.map((l) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String((b.ort || '').split(' ').includes(l)), onclick: () => lage(b, l) }, l)));

    function zeichneListe() {
      clear(liste);
      let nr = null;
      for (const e of eintraege) {
        if (e.nr !== nr) {
          nr = e.nr;
          liste.append(h('div', { class: 'pm-gruppe' }, `${e.nr} · ${punktTitel(kat.punktNach.get(e.nr))}`));
        }
        const da = eigene().find((b) => b.kat === e.id);
        liste.append(h('div', { class: 'pm-mangel' + (da ? ' an' : '') },
          h('button', { class: 'entry', type: 'button', 'aria-pressed': String(!!da), onclick: () => umschalten(e) },
            sev(e.s[0]),
            h('div', { class: 'grow' }, e.wenn ? [h('div', { class: 't pre' }, e.wenn), h('div', { class: 'w pre', style: { marginTop: '2px' } }, e.text.split('\n')[0])] : h('div', { class: 't pre' }, e.text)),
            h('span', { class: 'pm-haken' }, icon(da ? 'check' : 'plus', 20))),
          da ? lagenZeile(da) : null));
      }
      // Über die freie Suche erfasste Mängel dieses Schritts
      const extra = eigene().filter((b) => !eintraege.some((e) => e.id === b.kat));
      clear(zusatz);
      if (extra.length) {
        zusatz.append(h('div', { class: 'eyebrow', style: { margin: '14px 4px 8px' } }, 'Zusätzlich erfasst'),
          h('div', { class: 'list' }, extra.map((b) => h('div', { class: 'pm-mangel an' },
            h('div', { class: 'entry' }, sev(b.s), h('div', { class: 'grow' }, h('div', { class: 't' }, b.titel), (b.wenn || b.text) && h('div', { class: 'w pre' }, b.wenn || b.text)),
              h('button', { class: 'icon-btn', 'aria-label': 'Entfernen', onclick: () => { aendere(id, (x) => { x.befunde = x.befunde.filter((y) => y.id !== b.id); }); zeichneListe(); zeichneFuss(); } }, icon('x', 18))),
            lagenZeile(b)))));
      }
    }

    // Freie Suche und Diktat – erst beim Aufklappen laden
    const sucheOrt = h('div');
    const suche = h('details', { class: 'pm-details', ontoggle: () => {
      if (!suche.open || ein) return;
      const vorher = new Set(hole(id).befunde.map((b) => b.id));
      ein = eingabe(hole(id), kat, () => {
        aendere(id, (x) => { for (const b of x.befunde) if (!vorher.has(b.id) && !b.schritt) b.schritt = s.id; });
        zeichneListe();
        zeichneFuss();
      });
      sucheOrt.append(ein.el);
      ein.fokus();
    } }, h('summary', null, 'Anderen Mangel suchen oder einsprechen'), h('div', null, sucheOrt));

    buehne.append(
      h('div', { class: 'pm-kopf' },
        h('a', { class: 'back', href: '#/auftraege/' + id }, icon('x', 18), 'Beenden'),
        kennzeichen(a),
        h('button', { class: 'pm-stand', onclick: uebersicht }, h('span', { class: 'num' }, `${pos + 1} / ${N}`), icon('down', 15))),
      h('div', { class: 'pm-balken', role: 'progressbar', 'aria-valuenow': pos, 'aria-valuemin': 0, 'aria-valuemax': N }, h('i', { style: { width: (pos / N * 100) + '%' } })),
      h('div', { class: 'pm-inhalt' },
        h('p', { class: 'eyebrow' }, `${weg.id === 'lkw' ? 'Lkw · ' : ''}Station ${s.si + 1} von ${STATIONEN.length} · ${s.station.titel}`),
        h('h1', null, s.titel),
        h('p', { class: 'pm-tipp' }, s.tipp),
        bild && h('div', { class: 'pm-bilder' },
          h('figure', { class: 'pm-bild go' }, h('div', { html: bild.go[0] }), h('figcaption', null, h('span', { class: 'pm-marke' }, icon('check', 13)), h('span', null, bild.go[1]))),
          h('figure', { class: 'pm-bild nogo' }, h('div', { html: bild.nogo[0] }), h('figcaption', null, h('span', { class: 'pm-marke' }, icon('x', 13)), h('span', null, bild.nogo[1])))),
        s.link && h('a', { class: 'btn small ghost', href: s.link[0] }, icon('calc', 16), s.link[1]),
        h('details', { class: 'pm-details' }, h('summary', null, 'Amtliche Prüfmethode'),
          h('div', null, s.punkte.map((nr) => { const p = kat.punktNach.get(nr); return h('div', { class: 'pm-methode' }, h('b', null, `${nr} · ${punktTitel(p)}`), h('p', { class: 'pre' }, p.methode || '–')); }),
            h('p', { class: 'src', style: { marginTop: '12px' } }, kat.quelle.titel))),
        h('div', { class: 'section-title', style: { margin: '26px 2px 12px' } }, h('h2', null, 'Auffälligkeit? Mangel antippen'), h('span', { class: 'xs faint' }, `${eintraege.length} im Katalog`)),
        liste, zusatz, suche));
    zeichneListe();
    zeichneFuss();
  }

  function abschluss(a) {
    if (a.status !== 'fertig') aendere(id, (x) => { x.status = 'fertig'; });
    a = hole(id);
    const e = ergebnis(a);
    const st = ablauf().status;
    const zaehle = (w) => SCHRITTE.filter((s) => st[s.id] === w).length;
    const offen = SCHRITTE.filter((s) => !st[s.id]).length;
    const maengel = a.befunde.filter((b) => b.s !== 'H').sort((x, y) => STUFE[y.s].rang - STUFE[x.s].rang);
    const vorab = /Vorab/.test(a.art);
    const istHU = /^(HU|Nachprüfung)/.test(a.art) && !vorab;
    const frist = FRISTEN.find((f) => f.id === a.fahrzeugart);
    buehne.append(
      h('div', { class: 'pm-kopf' }, h('a', { class: 'back', href: '#/auftraege/' + id }, icon('left', 18), 'Zum Auftrag'), kennzeichen(a),
        h('button', { class: 'pm-stand', onclick: uebersicht }, 'Ablauf', icon('down', 15))),
      h('div', { class: 'pm-balken' }, h('i', { style: { width: '100%' } })),
      h('div', { class: 'pm-inhalt' },
        h('p', { class: 'eyebrow' }, 'Geschafft'),
        h('h1', null, 'Prüfung abgeschlossen.'),
        h('div', { class: 'banner ' + e, style: { marginTop: '18px' } },
          h('div', { class: 'code' }, STUFE[e].code),
          h('div', { class: 'txt grow' }, h('b', null, STUFE[e].name), istHU && h('span', null, FOLGEN[e].text),
            vorab && h('span', null, e === 'O' ? 'Keine Mängel gefunden – das Fahrzeug kann zur HU.' : e === 'G' ? 'Geringe Mängel – vor der HU beheben empfohlen.' : 'Mit diesen Mängeln würde die HU voraussichtlich nicht bestanden.'))),
        h('div', { class: 'today-stats', style: { marginTop: '14px' } },
          h('div', { class: 'stat' }, h('b', null, zaehle('ok')), h('span', null, 'in Ordnung')),
          h('div', { class: 'stat' }, h('b', null, maengel.length), h('span', null, maengel.length === 1 ? 'Mangel' : 'Mängel')),
          h('div', { class: 'stat' }, h('b', null, zaehle('entfaellt') + offen), h('span', null, 'entfällt / offen'))),
        offen ? h('div', { class: 'note warn', style: { marginTop: '14px' } }, icon('alert', 18), h('span', null, `${offen} ${offen === 1 ? 'Schritt ist' : 'Schritte sind'} noch offen – über „Ablauf“ lassen sie sich nachholen.`)) : null,
        istHU && frist?.sp ? h('div', { class: 'note', style: { marginTop: '14px' } }, icon('info', 18), h('span', null, h('b', null, 'Sicherheitsprüfung: '), `${frist.sp} (Anlage VIII Nr. ${frist.nr} StVZO).`)) : null,
        maengel.length ? h('div', { class: 'list', style: { marginTop: '14px' } }, maengel.map((b) => h('div', { class: 'entry' }, sev(b.s),
          h('div', { class: 'grow' }, h('div', { class: 't' }, b.titel), h('div', { class: 'w pre', style: { marginTop: '2px' } }, [b.wenn || b.text, b.ort].filter(Boolean).join(' · ')))))) : null,
        h('button', { class: 'btn block', style: { marginTop: '20px' }, onclick: () => befundblattTeilen(id) }, icon('download', 18), vorab ? 'Vorab-Check für den Kunden (PDF)' : 'Befundblatt als PDF'),
        h('div', { class: 'grid2', style: { marginTop: '10px' } },
          h('a', { class: 'btn ghost', href: '#/auftraege/' + id }, 'Zum Auftrag'),
          h('button', { class: 'btn ghost', onclick: () => gehe(0) }, 'Von vorn')),
        h('p', { class: 'src', style: { marginTop: '14px' } }, 'Die Reihenfolge der Schritte ist ein Vorschlag für die Praxis. ' + einstufungsQuelle(a.befunde.length ? a.befunde.some((b) => String(b.kat || '').startsWith('de:')) : katalogArt() === 'de'))));
  }

  zeichne();
  return aufraeumen;
}
