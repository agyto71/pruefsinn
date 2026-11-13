// Prüfsinn – Rechner. Jede Formel und jeder Grenzwert nennt seine Quelle.

import { h, icon, clear, store, fmt, parseNum, field, seg, pad2 } from '../core.js';
import { FRISTEN, naechsteHU, plakette, BREMSE, bremsUngleich, tragfaehigkeit, SI } from '../daten.js';

// ---------- Bausteine ----------
function zahl(st, key, label, { einheit, hint, placeholder = '', ganz } = {}, neu) {
  const input = h('input', { class: 'input num', inputmode: ganz ? 'numeric' : 'decimal', value: st[key] ?? '', placeholder, autocomplete: 'off',
    oninput: (e) => { st[key] = e.target.value; neu(); } });
  return field(label, einheit ? h('div', { class: 'with-unit' }, input, h('span', { class: 'unit' }, einheit)) : input, hint);
}
function text(st, key, label, { hint, placeholder = '' } = {}, neu) {
  return field(label, h('input', { class: 'input', value: st[key] ?? '', placeholder, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
    oninput: (e) => { st[key] = e.target.value; neu(); } }), hint);
}
function wahl(st, key, label, optionen, neu, hint) {
  return field(label, h('select', { class: 'select', value: st[key], onchange: (e) => { st[key] = e.target.value; neu(); } },
    optionen.map(([v, l]) => h('option', { value: v }, l))), hint);
}
const gross = (wert, einheit, label) => h('div', null, label && h('div', { class: 'eyebrow', style: { marginBottom: '6px' } }, label), h('div', { class: 'big-val' }, wert, einheit && h('small', null, einheit)));
const urteil = (ton, t) => h('span', { class: 'verdict ' + ton }, icon(ton === 'ok' ? 'check' : ton === 'neutral' ? 'info' : 'alert', 16), t);
const zeilen = (liste) => h('div', { class: 'res-rows' }, liste.filter(Boolean).map(([l, v, extra]) => h('div', null, h('span', { class: 'l' }, l), h('span', { class: 'v' }, v, extra ? h('div', { style: { marginTop: '4px' } }, extra) : null))));
const quelle = (...t) => h('p', { class: 'src' }, ...t);
const leer = (t) => h('p', { class: 'muted' }, t);
const N = parseNum;

/** Schematische Prüfplakette: fällig = Monat oben, schwarze Marken zeigen wie ein Uhrzeiger auf den Monat. */
export function plakettenBild(m, y, size = 132) {
  const p = plakette(y);
  const pol = (grad, r) => [50 + r * Math.sin(grad * Math.PI / 180), 50 - r * Math.cos(grad * Math.PI / 180)];
  let s = `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="plakette" role="img" aria-label="Prüfplakette ${m}/${y}, ${p.name}" style="width:${size}px;height:${size}px">`;
  s += `<circle cx="50" cy="50" r="48" fill="${p.hex}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`;
  s += `<circle cx="50" cy="50" r="31" fill="none" stroke="#111" stroke-width="1.1"/>`;
  for (const versatz of [-15, 15]) { // Marken links und rechts der 12
    const mitte = (m - 12) * 30 + versatz;
    const [x1, y1] = pol(mitte - 6, 40), [x2, y2] = pol(mitte + 6, 40);
    s += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A40 40 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" stroke="#111" stroke-width="13" fill="none"/>`;
  }
  for (let n = 1; n <= 12; n++) {
    const grad = (m - n) * 30;
    const [x, yy] = pol(grad, 39.5);
    s += `<text x="${x.toFixed(2)}" y="${yy.toFixed(2)}" font-size="${n > 9 ? 8.5 : 10}" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#111" font-family="Arial, sans-serif" transform="rotate(${grad} ${x.toFixed(2)} ${yy.toFixed(2)})">${n}</text>`;
  }
  s += `<text x="50" y="51" font-size="27" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#111" font-family="Arial Narrow, Arial, sans-serif">${String(y).slice(-2)}</text></svg>`;
  return h('span', { html: s, style: { display: 'inline-flex' } });
}

// ---------- Die Rechner ----------
const RECHNER = [
  {
    id: 'bremsen', titel: 'Bremsen', kurz: 'Abbremsung, Ungleichmäßigkeit, Feststellbremse', icon: 'gauge',
    start: { klasse: 'M1', ez: 'ab2012', einheit: 'daN', masse: '', a1l: '', a1r: '', a2l: '', a2r: '', a3l: '', a3r: '', fl: '', fr: '' },
    bau(st, neu) {
      const achse = (n) => h('div', { class: 'axle' }, h('span', { class: 'nm' }, n === 'f' ? 'Feststell' : 'Achse ' + n),
        h('input', { class: 'input num', inputmode: 'decimal', placeholder: 'links', 'aria-label': `${n} links`, value: st[(n === 'f' ? 'f' : 'a' + n) + 'l'], oninput: (e) => { st[(n === 'f' ? 'f' : 'a' + n) + 'l'] = e.target.value; neu(); } }),
        h('input', { class: 'input num', inputmode: 'decimal', placeholder: 'rechts', 'aria-label': `${n} rechts`, value: st[(n === 'f' ? 'f' : 'a' + n) + 'r'], oninput: (e) => { st[(n === 'f' ? 'f' : 'a' + n) + 'r'] = e.target.value; neu(); } }));
      return [
        wahl(st, 'klasse', 'Fahrzeugklasse', BREMSE.klassen.map((k) => [k.id, k.label]), neu),
        field('Erstzulassung', seg([['ab2012', 'ab 1.1.2012'], ['vor2012', 'vor 2012']], st.ez, (v) => { st.ez = v; neu(); }, 'full')),
        zahl(st, 'masse', 'Bezugsmasse', { einheit: 'kg', hint: 'Zulässige Gesamtmasse (bei Sattelanhängern Summe der zulässigen Achslasten).', ganz: true }, neu),
        field('Anzeige des Prüfstands', seg([['daN', 'daN'], ['kN', 'kN'], ['N', 'N']], st.einheit, (v) => { st.einheit = v; neu(); })),
        h('div', { class: 'stack-s' }, h('div', { class: 'lab small muted', style: { fontWeight: 650 } }, 'Bremskräfte Betriebsbremse'), achse(1), achse(2), achse(3)),
        h('div', { class: 'stack-s' }, h('div', { class: 'lab small muted', style: { fontWeight: 650 } }, 'Feststellbremse (optional)'), achse('f')),
      ];
    },
    ergebnis(st) {
      const k = BREMSE.klassen.find((x) => x.id === st.klasse) || BREMSE.klassen[0];
      const min = k[st.ez];
      const f = { daN: 10, kN: 1000, N: 1 }[st.einheit];
      const m = N(st.masse);
      const achsen = [1, 2, 3].map((n) => [N(st['a' + n + 'l']), N(st['a' + n + 'r'])]).filter(([l, r]) => isFinite(l) || isFinite(r)).map(([l, r]) => [l || 0, r || 0]);
      if (!(m > 0) || !achsen.length) return [leer('Masse und Bremskräfte eingeben – das Ergebnis erscheint sofort.'), quelle('Grenzwerte: ', BREMSE.quelle)];
      const G = m * 9.81;
      const summe = achsen.reduce((s, [l, r]) => s + l + r, 0) * f;
      const z = summe / G * 100;
      const ton = z >= min ? 'ok' : z >= min / 2 ? 'bad' : 'crit';
      const out = [
        gross(fmt(z, 1), '%', 'Abbremsung Betriebsbremse'),
        h('div', { class: 'meter' }, h('i', { class: ton === 'ok' ? '' : ton, style: { width: Math.min(100, z / (min * 1.5) * 100) + '%' } }), h('u', { style: { left: (100 / 1.5) + '%' } })),
        h('div', { class: 'rowx between small' }, h('span', { class: 'muted' }, `Mindestwert ${min} %`), urteil(ton, ton === 'ok' ? 'erreicht' : ton === 'bad' ? 'nicht erreicht – erheblich (1.2.2)' : 'unter der Hälfte – gefährlich (1.2.2)')),
      ];
      const rows = [['Summe der Bremskräfte', fmt(summe / 10, 0) + ' daN'], ['Gewichtskraft', fmt(G / 10, 0) + ' daN']];
      const ug = bremsUngleich();
      achsen.forEach(([l, r], i) => {
        const hi = Math.max(l, r), lo = Math.min(l, r);
        if (!(hi > 0)) return;
        const d = (1 - lo / hi) * 100;
        const t = d <= ug.grenze ? 'ok' : (i === 0 && d > BREMSE.ungleichGelenkt ? 'crit' : 'bad');
        rows.push([`Achse ${i + 1}: Ungleichmäßigkeit`, fmt(d, 0) + ' %', urteil(t, t === 'ok' ? `bis ${ug.grenze} % zulässig` : t === 'crit' ? 'über 50 % – gefährlich, wenn gelenkt' : `über ${ug.grenze} % – erheblich (1.2.1 b)`)]);
      });
      const fl = N(st.fl), fr = N(st.fr);
      if (isFinite(fl) || isFinite(fr)) {
        const zf = ((fl || 0) + (fr || 0)) * f / G * 100;
        const t = zf >= BREMSE.feststell ? 'ok' : zf >= BREMSE.feststell / 2 ? 'bad' : 'crit';
        rows.push(['Feststellbremse', fmt(zf, 1) + ' %', urteil(t, t === 'ok' ? `mind. ${BREMSE.feststell} % erreicht` : t === 'bad' ? `unter ${BREMSE.feststell} % – erheblich (1.4.2)` : 'unter der Hälfte – gefährlich')]);
      }
      out.push(zeilen(rows));
      const fn = st.ez === 'ab2012' ? k.fnAb : k.fnVor;
      if (fn) out.push(h('div', { class: 'note' }, icon('info', 18), h('span', null, h('b', null, 'Abweichend: '), fn)));
      if (k.l) out.push(h('div', { class: 'note' }, icon('info', 18), h('span', null, 'Klasse L: Wert gilt für beide Bremsen gemeinsam; Hinterradbremse allein mindestens 25 % der Gesamtmasse.')));
      out.push(quelle('z = Summe der Bremskräfte ÷ Gewichtskraft (Masse × 9,81 m/s²). Mindestabbremsung und Feststellbremse: ', BREMSE.quelle, '. Ungleichmäßigkeit (Unterschied an einer Achse, bezogen auf den höheren Wert): ', ug.quelle,
        '. Ab Erstzulassung 1.1.2012 prüft die HU-Bremsenrichtlinie mit Bezugsbremskräften je Achse (Nr. 6.2.1.1); davor zählt die auf die zulässige Gesamtmasse bezogene Abbremsung, bei Druckluft notfalls per Einpunkt-Hochrechnung (Anlage 2, Blockierdruck mindestens 1,7 bar). Dieser Rechner ersetzt den Prüfstand nicht.'));
      return out;
    },
  },
  {
    // HU-Bremsenrichtlinie vom 24.05.2012, Anlage 2 a (VkBl. 2012 S. 432); Blockierdruck mindestens 1,7 bar (Übergangsbestimmungen zu Nr. 6, VkBl. 2014 S. 655)
    id: 'hochrechnung', titel: 'Druckluft: Hochrechnung', kurz: 'Einpunkt-Hochrechnung der Abbremsung bei Druckluftbremsen', icon: 'gauge',
    start: { klasse: 'N23', ez: 'vor2012', einheit: 'daN', masse: '', f1: '', p1: '', n1: '', f2: '', p2: '', n2: '', f3: '', p3: '', n3: '', f4: '', p4: '', n4: '' },
    bau(st, neu) {
      const achse = (n) => h('div', { class: 'axle hr' }, h('span', { class: 'nm' }, 'Achse ' + n),
        ...[['f', 'Bremskraft', 'F'], ['p', 'Druck bar', 'p'], ['n', 'pN bar', 'pN']].map(([k, lbl, ph]) => h('input', { class: 'input num', inputmode: 'decimal', placeholder: ph, 'aria-label': `Achse ${n} ${lbl}`, value: st[k + n], oninput: (e) => { st[k + n] = e.target.value; neu(); } })));
      return [
        h('p', { class: 'small muted' }, 'Wenn Räder auf dem Prüfstand mangels Beladung vorzeitig blockieren und keine Bezugsbremskräfte vorliegen: Abbremsung aus Bremskraft und eingesteuertem Druck auf den Berechnungsdruck hochrechnen.'),
        wahl(st, 'klasse', 'Fahrzeugklasse', BREMSE.klassen.filter((k) => !k.l).map((k) => [k.id, k.label]), neu),
        field('Erstzulassung', seg([['vor2012', 'vor 1.1.2012'], ['ab2012', 'ab 1.1.2012']], st.ez, (v) => { st.ez = v; neu(); }, 'full')),
        zahl(st, 'masse', 'Zulässige Gesamtmasse', { einheit: 'kg', hint: 'Pmax = statische Normalkraft bei zulässiger Gesamtmasse.', ganz: true }, neu),
        field('Anzeige des Prüfstands', seg([['daN', 'daN'], ['kN', 'kN']], st.einheit, (v) => { st.einheit = v; neu(); })),
        h('div', { class: 'stack-s' }, h('div', { class: 'lab small muted', style: { fontWeight: 650 } }, 'Je Achse: Bremskraft F (beide Räder), eingesteuerter Druck p und Berechnungsdruck pN in bar (ABL-Schild)'),
          achse(1), achse(2), achse(3), achse(4)),
      ];
    },
    ergebnis(st) {
      const k = BREMSE.klassen.find((x) => x.id === st.klasse) || BREMSE.klassen[0];
      const min = k[st.ez];
      const f = { daN: 1, kN: 100 }[st.einheit];
      const m = N(st.masse);
      const achsen = [1, 2, 3, 4].map((n) => ({ n, F: N(st['f' + n]) * f, p: N(st['p' + n]), pN: N(st['n' + n]) })).filter((x) => isFinite(x.F) && x.F > 0);
      if (!(m > 0) || !achsen.length) return [leer('Zulässige Gesamtmasse und für jede Achse Bremskraft, Druck und Berechnungsdruck eingeben.'), quelle('HU-Bremsenrichtlinie, Anlage 2 a (VkBl. 2012 S. 432).')];
      const fehlt = achsen.filter((x) => !(x.p > 0.4) || !(x.pN > 0.4));
      if (fehlt.length) return [leer(`Achse ${fehlt.map((x) => x.n).join(', ')}: Druck p und Berechnungsdruck pN eingeben (beide über 0,4 bar).`)];
      const Pmax = (m * 9.81) / 10; // daN
      let summe = 0;
      const rows = [];
      for (const x of achsen) {
        const i = (x.pN - 0.4) / (x.p - 0.4);
        summe += x.F * i;
        rows.push([`Achse ${x.n}`, `${fmt(x.F, 0)} daN × ${fmt(i, 2)} = ${fmt(x.F * i, 0)} daN`, x.p < 1.7 ? urteil('bad', `Druck ${fmt(x.p, 1)} bar unter 1,7 bar – mit Beladung oder Beladungssimulation prüfen`) : null]);
      }
      const z = (summe / Pmax) * 100;
      const zuNiedrig = achsen.some((x) => x.p < 1.7);
      const ton = zuNiedrig ? 'neutral' : z >= min ? 'ok' : z >= min / 2 ? 'bad' : 'crit';
      return [
        gross(fmt(z, 1), '%', 'Hochgerechnete Abbremsung'),
        h('div', { class: 'rowx between small' }, h('span', { class: 'muted' }, `Mindestwert ${min} %`),
          urteil(ton, zuNiedrig ? 'nicht verwertbar – Blockierdruck unter 1,7 bar' : ton === 'ok' ? 'erreicht' : ton === 'bad' ? 'nicht erreicht – erheblich (1.2.2)' : 'unter der Hälfte – gefährlich')),
        zeilen([...rows, ['Pmax bei zul. Gesamtmasse', fmt(Pmax, 0) + ' daN'], ['Summe F × i', fmt(summe, 0) + ' daN']]),
        h('div', { class: 'note' }, icon('info', 18), h('span', null, 'Nur zulässig, wenn die Bremsanlage beim Anlegedruck unauffällig ist. Bei Achsen mit Regelventil höchstens den begrenzten Druck als pN einsetzen. Ab Erstzulassung 1.1.2012 gilt die Prüfung mit Bezugsbremskräften.')),
        quelle('Z = Σ(F · i) ÷ Pmax · 100 mit i = (pN − 0,4) ÷ (p − 0,4): HU-Bremsenrichtlinie vom 24.05.2012, Anlage 2 a (VkBl. 2012 S. 432). Blockierdruck mindestens 1,7 bar: Übergangsbestimmungen, geändert VkBl. 2014 S. 655. Mindestabbremsung: ', BREMSE.quelle, '.'),
      ];
    },
  },
  {
    id: 'frist', titel: 'HU-Frist', kurz: 'Nächste HU und Farbe der Plakette', icon: 'calendar',
    start: () => ({ art: 'pkw', hm: String(new Date().getMonth() + 1), hy: String(new Date().getFullYear()), erste: 'nein', ezm: '', ezy: '' }),
    bau(st, neu) {
      const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'].map((n, i) => [String(i + 1), n]);
      const f = FRISTEN.find((x) => x.id === st.art);
      return [
        wahl(st, 'art', 'Fahrzeugart', FRISTEN.map((x) => [x.id, x.label]), neu),
        h('div', { class: 'grid2' }, wahl(st, 'hm', 'HU im Monat', monate, neu), zahl(st, 'hy', 'Jahr', { ganz: true }, neu)),
        field('Untersuchung', seg([['nein', 'Folge-HU'], ['ja', 'Erste HU']], st.erste, (v) => { st.erste = v; neu(); }, 'full')),
        f && f.bis72 ? h('div', { class: 'grid2' }, wahl(st, 'ezm', 'Erstzulassung Monat', [['', '–'], ...monate], neu), zahl(st, 'ezy', 'EZ Jahr', { ganz: true }, neu)) : null,
      ];
    },
    neuBeiWahl: ['art'],
    ergebnis(st) {
      const m = Number(st.hm), y = N(st.hy);
      if (!(y > 1990 && y < 2100)) return [leer('Monat und Jahr der Untersuchung eingeben.')];
      const n = naechsteHU(st.art, m, y, st.erste === 'ja', Number(st.ezm) || 0, N(st.ezy) || 0);
      const p = plakette(n.y);
      const jetzt = new Date();
      const diff = (n.y * 12 + n.m) - (jetzt.getFullYear() * 12 + jetzt.getMonth() + 1);
      return [
        h('div', { class: 'rowx', style: { gap: '18px' } }, plakettenBild(n.m, n.y),
          h('div', null, gross(`${pad2(n.m)}/${n.y}`, '', 'Nächste HU'), h('div', { style: { marginTop: '10px' } }, urteil(diff >= 0 ? 'ok' : 'bad', diff >= 0 ? `in ${diff} Monaten` : `seit ${-diff} Monaten fällig`)))),
        zeilen([
          ['Frist', `${n.monate} Monate`],
          ['Plakette', h('span', { class: 'rowx', style: { justifyContent: 'flex-end' } }, h('span', { class: 'swatch', style: { background: p.hex, width: '18px', height: '18px' } }), `${p.name} (${p.ral})`)],
          ['Vorschrift', `Anlage VIII Nr. ${n.frist.nr}`],
          n.frist.sp ? ['Sicherheitsprüfung', h('span', { class: 'small', style: { fontWeight: 500 } }, n.frist.sp)] : null,
          n.frist.hinweis ? ['Hinweis', h('span', { class: 'small', style: { fontWeight: 500 } }, n.frist.hinweis)] : null,
        ]),
        quelle('Fristen: Anlage VIII Nr. 2.1/2.2 StVZO; die Frist beginnt mit Monat und Jahr der letzten HU (Nr. 2.3). Plakettenfarbe: Anlage IX StVZO. ', h('a', { href: '#/wissen/stvzo/anlage-viii' }, 'Anlage VIII öffnen')),
      ];
    },
  },
  {
    id: 'reifen', titel: 'Reifenvergleich', kurz: 'Abrollumfang und Tachoabweichung zweier Größen', icon: 'tire',
    start: { alt: '205/55 R16', neu: '225/45 R17', plus: '1,5', minus: '2,5' },
    bau(st, neu) {
      return [
        text(st, 'alt', 'Seriengröße', { placeholder: '205/55 R16' }, neu),
        text(st, 'neu', 'Neue Größe', { placeholder: '225/45 R17' }, neu),
        h('div', { class: 'grid2' }, zahl(st, 'plus', 'Toleranz nach oben', { einheit: '%' }, neu), zahl(st, 'minus', 'Toleranz nach unten', { einheit: '%' }, neu)),
        h('div', { class: 'note' }, icon('info', 18), h('span', null, 'Das Toleranzband ist ein einstellbarer Richtwert und nicht amtlich hinterlegt – bitte mit eurem Merkblatt abgleichen.')),
      ];
    },
    ergebnis(st) {
      const lies = (t) => { const m = String(t).toUpperCase().match(/(\d{3})\s*\/\s*(\d{2})\s*Z?R?\s*(\d{2}(?:[.,]5)?)/); return m ? { b: +m[1], q: +m[2], d: N(m[3]) } : null; };
      const a = lies(st.alt), b = lies(st.neu);
      if (!a || !b) return [leer('Beide Größen im Format 205/55 R16 eingeben.')];
      const dm = (r) => r.d * 25.4 + 2 * r.b * r.q / 100;
      const da = dm(a), db = dm(b);
      const abw = (db / da - 1) * 100;
      const plus = N(st.plus), minus = N(st.minus);
      const imBand = isFinite(plus) && isFinite(minus) ? abw <= plus && abw >= -minus : null;
      return [
        gross((abw > 0 ? '+' : '') + fmt(abw, 2), '%', 'Abweichung des Abrollumfangs'),
        h('div', { style: { marginTop: '10px' } }, imBand == null ? urteil('neutral', 'ohne Toleranzprüfung') : urteil(imBand ? 'ok' : 'bad', imBand ? `im Band +${fmt(plus, 1)} / −${fmt(minus, 1)} %` : 'außerhalb des eingestellten Bands')),
        abw > 0 ? h('div', { class: 'note warn', style: { marginTop: '12px' } }, icon('alert', 18), h('span', null, 'Größerer Umfang: das Fahrzeug ist schneller als angezeigt. Der Tacho darf nie zu wenig anzeigen – Voreilung prüfen.')) : null,
        zeilen([
          ['Durchmesser Serie', fmt(da, 0) + ' mm'], ['Durchmesser neu', fmt(db, 0) + ' mm'],
          ['Umfang Serie / neu', `${fmt(Math.PI * da, 0)} / ${fmt(Math.PI * db, 0)} mm`],
          ['Radius-Änderung', (db > da ? '+' : '') + fmt((db - da) / 2, 1) + ' mm'],
          ['Tacho zeigt 100 km/h', `tatsächlich ${fmt(100 * db / da, 1)} km/h (bei zuvor genauer Anzeige)`],
        ]),
        quelle('Rechnerischer Durchmesser = Felge × 25,4 mm + 2 × Breite × Querschnitt. Tatsächliche Abrollumfänge weichen je nach Hersteller und Last ab.'),
      ];
    },
  },
  {
    id: 'felge', titel: 'Felge & Einpresstiefe', kurz: 'Wie weit steht das Rad weiter außen oder innen?', icon: 'wheel',
    start: { jAlt: '7', etAlt: '45', jNeu: '8', etNeu: '35', dist: '0', spur: '' },
    bau(st, neu) {
      return [
        h('div', { class: 'grid2' }, zahl(st, 'jAlt', 'Felgenbreite Serie', { einheit: 'J' }, neu), zahl(st, 'etAlt', 'ET Serie', { einheit: 'mm' }, neu)),
        h('div', { class: 'grid2' }, zahl(st, 'jNeu', 'Felgenbreite neu', { einheit: 'J' }, neu), zahl(st, 'etNeu', 'ET neu', { einheit: 'mm' }, neu)),
        zahl(st, 'dist', 'Distanzscheibe je Seite', { einheit: 'mm' }, neu),
        zahl(st, 'spur', 'Spurweite der Achse, Serie (optional)', { einheit: 'mm', hint: 'Zeigt die Änderung auch in Prozent. Steht im Gutachten-Assistenten unter Feld K (EEA-Daten) oder im CoC-Papier.' }, neu),
      ];
    },
    ergebnis(st) {
      const ja = N(st.jAlt), jn = N(st.jNeu), ea = N(st.etAlt), en = N(st.etNeu), d = N(st.dist) || 0;
      if (![ja, jn, ea, en].every(isFinite)) return [leer('Felgenbreite und Einpresstiefe für beide Räder eingeben.')];
      const halb = (jn - ja) * 25.4 / 2;
      const aussen = halb + (ea - en) + d;
      const innen = halb - (ea - en) - d;
      const sag = (v, pos, neg) => (Math.abs(v) < 0.05 ? 'unverändert' : `${fmt(Math.abs(v), 1)} mm ${v > 0 ? pos : neg}`);
      return [
        gross((aussen > 0 ? '+' : '') + fmt(aussen, 1), 'mm', 'Außenkante der Felge'),
        h('div', { style: { marginTop: '10px' } }, urteil(aussen > 0.05 ? 'warn' : 'neutral', sag(aussen, 'weiter außen', 'weiter innen'))),
        zeilen([
          ['Innenkante', sag(innen, 'näher am Federbein', 'weiter weg vom Federbein')],
          ['Spurweite der Achse', (2 * ((ea - en) + d) > 0 ? '+' : '') + fmt(2 * ((ea - en) + d), 1) + ' mm'
            + (N(st.spur) > 500 ? ` (${2 * ((ea - en) + d) > 0 ? '+' : ''}${fmt((200 * ((ea - en) + d)) / N(st.spur), 2)} %)` : '')],
          ['Effektive ET', fmt(en - d, 1) + ' mm'],
        ]),
        quelle('Geometrie: halbe Breitenänderung ± Änderung der Einpresstiefe. Radabdeckung, Freigängigkeit und Gutachten bleiben am Fahrzeug zu prüfen.'),
      ];
    },
  },
  {
    id: 'tragfaehigkeit', titel: 'Tragfähigkeit & Tempo', kurz: 'Lastindex und Geschwindigkeitsindex prüfen', icon: 'weight',
    start: { li: '91', si: 'V', achslast: '', vmax: '', zw: 'einzel' },
    bau(st, neu) {
      return [
        h('div', { class: 'grid2' }, zahl(st, 'li', 'Tragfähigkeitsindex', { ganz: true, placeholder: '91' }, neu), wahl(st, 'si', 'Geschwindigkeitsindex', SI.map(([b, v]) => [b, `${b} – ${v} km/h`]), neu)),
        field('Bereifung der Achse', seg([['einzel', 'Einzel'], ['zwilling', 'Zwilling']], st.zw, (v) => { st.zw = v; neu(); }, 'full')),
        h('div', { class: 'grid2' }, zahl(st, 'achslast', 'Zulässige Achslast', { einheit: 'kg', ganz: true }, neu), zahl(st, 'vmax', 'Höchstgeschwindigkeit', { einheit: 'km/h', ganz: true }, neu)),
      ];
    },
    ergebnis(st) {
      const kg = tragfaehigkeit(N(st.li));
      if (!kg) return [leer('Tragfähigkeitsindex zwischen 50 und 169 eingeben.')];
      const reifen = st.zw === 'zwilling' ? 4 : 2;
      const achse = kg * reifen;
      const v = (SI.find(([b]) => b === st.si) || SI[0])[1];
      const al = N(st.achslast), vm = N(st.vmax);
      return [
        gross(fmt(kg, 0), 'kg je Reifen', `Index ${Math.round(N(st.li))}`),
        zeilen([
          [`Achse (${reifen} Reifen)`, fmt(achse, 0) + ' kg', isFinite(al) ? urteil(achse >= al ? 'ok' : 'crit', achse >= al ? `deckt ${fmt(al, 0)} kg` : `${fmt(al - achse, 0)} kg zu wenig`) : null],
          [`Index ${st.si}`, v + ' km/h', isFinite(vm) ? urteil(v >= vm ? 'ok' : 'bad', v >= vm ? `deckt ${fmt(vm, 0)} km/h` : `unter ${fmt(vm, 0)} km/h`) : null],
        ]),
        quelle('Genormte Kennzahlen (UN-Regelungen Nr. 30 und 54). Zu- und Abschläge – etwa bei hohen Geschwindigkeiten, Sturz, Zwillingsbereifung oder M+S-Reifen – nach Herstellerangaben und Fahrzeugpapieren beachten. Katalog: Nr. 5.2.3.'),
      ];
    },
  },
  {
    id: 'dot', titel: 'Reifenalter (DOT)', kurz: 'Herstellwoche aus der DOT-Nummer', icon: 'clock',
    start: { dot: '' },
    bau(st, neu) { return [zahl(st, 'dot', 'Letzte vier Ziffern der DOT-Nummer', { ganz: true, placeholder: 'z. B. 2319', hint: 'Woche und Jahr der Herstellung, z. B. 2319 = KW 23 in 2019.' }, neu)]; },
    ergebnis(st) {
      const m = String(st.dot).replace(/\D/g, '').match(/^(\d{2})(\d{2})$/);
      if (!m) return [leer('Vier Ziffern eingeben.')];
      const kw = +m[1], jahr = 2000 + +m[2];
      const heute = new Date();
      if (kw < 1 || kw > 53 || jahr > heute.getFullYear()) return [urteil('bad', 'Keine gültige Angabe'), leer('Woche 01–53, Jahr nicht in der Zukunft. Dreistellige Angaben stammen von vor 2000.')];
      const vier = new Date(jahr, 0, 4);
      const montag = new Date(jahr, 0, 4 - ((vier.getDay() + 6) % 7) + (kw - 1) * 7);
      const monate = Math.max(0, (heute.getFullYear() - montag.getFullYear()) * 12 + heute.getMonth() - montag.getMonth());
      return [
        gross(`${Math.floor(monate / 12)}`, `Jahre ${monate % 12} Monate`, 'Alter des Reifens'),
        zeilen([['Hergestellt', `KW ${kw} / ${jahr}`], ['Woche ab', montag.toLocaleDateString('de-DE')]]),
        quelle('Ein allgemeines Höchstalter für Pkw-Reifen nennt die StVZO nicht; maßgeblich ist der Zustand (Katalog Nr. 5.2.3). Besondere Vorgaben, etwa für Tempo-100-Anhänger, gesondert prüfen.'),
      ];
    },
  },
  {
    id: 'dwert', titel: 'Anhängelast & D-Wert', kurz: 'D-Wert der Kupplung oder zulässige Anhängelast', icon: 'link',
    start: { modus: 'd', t: '', r: '', d: '' },
    bau(st, neu) {
      return [
        field('Berechnen', seg([['d', 'D-Wert'], ['r', 'Anhängelast']], st.modus, (v) => { st.modus = v; neu(true); }, 'full')),
        zahl(st, 't', 'Zulässige Gesamtmasse Zugfahrzeug (T)', { einheit: 'kg', ganz: true }, neu),
        st.modus === 'd' ? zahl(st, 'r', 'Zulässige Gesamtmasse Anhänger (R)', { einheit: 'kg', ganz: true }, neu) : zahl(st, 'd', 'D-Wert der Kupplung', { einheit: 'kN' }, neu),
      ];
    },
    ergebnis(st) {
      const g = 9.81, T = N(st.t) / 1000;
      if (!(T > 0)) return [leer('Massen eingeben.')];
      if (st.modus === 'd') {
        const R = N(st.r) / 1000;
        if (!(R > 0)) return [leer('Masse des Anhängers eingeben.')];
        const D = g * T * R / (T + R);
        return [gross(fmt(D, 2), 'kN', 'Erforderlicher D-Wert'), zeilen([['T', fmt(T, 3) + ' t'], ['R', fmt(R, 3) + ' t']]), quelle('D = g × T × R ÷ (T + R), mit g = 9,81 m/s² und Massen in Tonnen (UN-Regelung Nr. 55). Für Zentralachsanhänger gilt derselbe Aufbau mit C statt R (Dc-Wert); Stützlast und V-Wert gesondert prüfen.')];
      }
      const D = N(st.d);
      if (!(D > 0)) return [leer('D-Wert eingeben.')];
      const nenner = g * T - D;
      if (nenner <= 0) return [urteil('ok', 'Kupplung begrenzt hier nicht'), leer('Der D-Wert ist größer als g × T – rechnerisch ergibt sich keine Grenze aus der Kupplung.')];
      const R = D * T / nenner;
      return [gross(fmt(R * 1000, 0), 'kg', 'Höchste Anhänger-Gesamtmasse aus dem D-Wert'), zeilen([['D', fmt(D, 2) + ' kN'], ['T', fmt(T, 3) + ' t']]), quelle('R = D × T ÷ (g × T − D). Maßgeblich bleiben die Angaben in den Fahrzeugpapieren und auf dem Typschild der Kupplung.')];
    },
  },
  {
    id: 'scheinwerfer', titel: 'Scheinwerfer', kurz: 'Neigung in Prozent und Zentimeter umrechnen', icon: 'beam',
    start: { neigung: '1,0', abstand: '10', hoehe: '', gemessen: '' },
    bau(st, neu) {
      return [
        h('div', { class: 'grid2' }, zahl(st, 'neigung', 'Einstellmaß', { einheit: '%' }, neu), zahl(st, 'abstand', 'Abstand zur Wand', { einheit: 'm' }, neu)),
        zahl(st, 'hoehe', 'Höhe Scheinwerfermitte (optional)', { einheit: 'cm' }, neu),
        zahl(st, 'gemessen', 'Gemessene Absenkung (optional)', { einheit: 'cm', hint: 'Rechnet zurück in Prozent.' }, neu),
      ];
    },
    ergebnis(st) {
      const p = N(st.neigung), d = N(st.abstand), H = N(st.hoehe), gm = N(st.gemessen);
      if (!(d > 0) || !isFinite(p)) return [leer('Einstellmaß und Abstand eingeben.')];
      const e = p * d; // cm, denn 1 % = 1 cm je Meter
      return [
        gross(fmt(e, 1), 'cm', `Absenkung auf ${fmt(d, 1)} m`),
        zeilen([
          ['Entspricht', `${fmt(p * 10, 1)} cm auf 10 m`],
          isFinite(H) ? ['Hell-Dunkel-Grenze an der Wand', fmt(H - e, 1) + ' cm über Boden'] : null,
          isFinite(gm) ? ['Gemessen', `${fmt(gm / d, 2)} %`, urteil('neutral', `${fmt(gm / d - p, 2)} % zum Einstellmaß`)] : null,
        ]),
        quelle('1 % Neigung = 10 cm auf 10 m. Einstellmaß laut Angabe am Fahrzeug; Toleranzen und Prüfbedingungen stehen in der HU-Scheinwerfer-Prüfrichtlinie und sind hier nicht hinterlegt. Katalog: Nr. 4.1.2.'),
      ];
    },
  },
  {
    id: 'tacho', titel: 'Tacho', kurz: 'Voreilung nach UN-Regelung Nr. 39', icon: 'gauge',
    start: { anzeige: '', ist: '' },
    bau(st, neu) { return [h('div', { class: 'grid2' }, zahl(st, 'anzeige', 'Angezeigt', { einheit: 'km/h' }, neu), zahl(st, 'ist', 'Tatsächlich', { einheit: 'km/h' }, neu))]; },
    ergebnis(st) {
      const a = N(st.anzeige), i = N(st.ist);
      if (!(a > 0) || !(i > 0)) return [leer('Angezeigte und tatsächliche Geschwindigkeit eingeben.')];
      const d = a - i, max = i / 10 + 4;
      const ok = d >= 0 && d <= max;
      return [
        gross((d > 0 ? '+' : '') + fmt(d, 1), 'km/h', 'Voreilung'),
        h('div', { style: { marginTop: '10px' } }, urteil(ok ? 'ok' : 'bad', d < 0 ? 'Tacho zeigt zu wenig an' : ok ? 'innerhalb der Grenze' : 'Voreilung zu groß')),
        zeilen([['Zulässig', `0 bis ${fmt(max, 1)} km/h`], ['Relativ', fmt(d / i * 100, 1) + ' %']]),
        quelle('UN-Regelung Nr. 39: 0 ≤ angezeigt − tatsächlich ≤ tatsächlich ÷ 10 + 4 km/h. Für ältere Fahrzeuge gilt der Anhang zu § 57 StVZO. Katalog: Nr. 7.8.'),
      ];
    },
  },
  {
    id: 'einheiten', titel: 'Einheiten', kurz: 'kW und PS, bar, Newton, Zoll', icon: 'swap',
    start: { gruppe: 'leistung', wert: '', von: 'kW' },
    gruppen: {
      leistung: ['Leistung', { kW: 1, PS: 0.73549875 }],
      druck: ['Druck', { bar: 1, kPa: 0.01, psi: 0.0689476 }],
      kraft: ['Kraft', { N: 1, daN: 10, kN: 1000, kp: 9.80665 }],
      moment: ['Drehmoment', { Nm: 1, kpm: 9.80665, 'lbf·ft': 1.355818 }],
      tempo: ['Geschwindigkeit', { 'km/h': 1, 'm/s': 3.6, mph: 1.609344 }],
      laenge: ['Länge', { mm: 1, cm: 10, Zoll: 25.4 }],
    },
    bau(st, neu) {
      const g = this.gruppen[st.gruppe];
      if (!(st.von in g[1])) st.von = Object.keys(g[1])[0];
      return [
        wahl(st, 'gruppe', 'Größe', Object.entries(this.gruppen).map(([k, v]) => [k, v[0]]), () => neu(true)),
        h('div', { class: 'grid2' }, zahl(st, 'wert', 'Wert', {}, neu), wahl(st, 'von', 'Einheit', Object.keys(g[1]).map((u) => [u, u]), neu)),
      ];
    },
    ergebnis(st) {
      const g = this.gruppen[st.gruppe][1];
      const w = N(st.wert);
      if (!isFinite(w)) return [leer('Wert eingeben.')];
      const basis = w * g[st.von];
      return [zeilen(Object.entries(g).filter(([u]) => u !== st.von).map(([u, f]) => [u, fmt(basis / f, Math.abs(basis / f) >= 100 ? 1 : 3)])), quelle('1 PS = 0,73549875 kW · 1 kp = 9,80665 N · 1 Zoll = 25,4 mm · 1 psi = 0,0689476 bar')];
    },
  },
];
export const RECHNER_LISTE = RECHNER.map(({ id, titel, kurz, icon: ic }) => ({ id, titel, kurz, icon: ic }));

function seiteRechner(el, id) {
  const r = RECHNER.find((x) => x.id === id);
  if (!r) { location.hash = '#/rechner'; return; }
  const start = typeof r.start === 'function' ? r.start() : r.start;
  const st = { ...start, ...store.get('rechner.' + id, {}) };
  const form = h('div', { class: 'card pad stack' });
  const erg = h('div', { class: 'result sticky stack' });
  const rechne = () => { store.set('rechner.' + id, st); clear(erg).append(...r.ergebnis(st)); };
  const baue = () => clear(form).append(...r.bau(st, (neuBauen) => { if (neuBauen === true) baue(); rechne(); }).filter(Boolean));
  // Felder, deren Wahl das Formular verändert
  form.addEventListener('change', (e) => { if (r.neuBeiWahl && e.target.tagName === 'SELECT') baue(); });
  el.append(
    h('a', { class: 'back', href: '#/rechner' }, icon('left', 20), 'Rechner'),
    h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, r.titel), h('p', { class: 'sub' }, r.kurz)),
      h('button', { class: 'btn small ghost', onclick: () => { Object.keys(st).forEach((k) => delete st[k]); Object.assign(st, typeof r.start === 'function' ? r.start() : r.start); baue(); rechne(); } }, 'Zurücksetzen')),
    h('div', { class: 'cols' }, form, erg));
  baue();
  rechne();
}

export function seite(el, teile) {
  if (teile[0]) return seiteRechner(el, teile[0]);
  el.append(
    h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, 'Rechner'), h('p', { class: 'sub' }, 'Schnell gerechnet, mit Quelle – Eingaben bleiben gespeichert.'))),
    h('div', { class: 'tiles' }, RECHNER.map((r) => h('a', { class: 'tile', href: '#/rechner/' + r.id },
      h('span', { class: 'ico-tile' }, icon(r.icon)), h('div', null, h('div', { class: 't' }, r.titel), h('div', { class: 'd' }, r.kurz))))));
}
