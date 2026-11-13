// Prüfsinn – Mehr: Fahrzeug-Check, Textbausteine, Checklisten, Wunschliste, Datensicherung, Einstellungen, Quellen

import { h, icon, clear, store, sheet, confirmSheet, copyText, shareText, toast, field, seg, uid, isoToday, fmtDate, downloadFile } from '../core.js';
import { katalog, gesetz, WMI, WMI_LAND, WMI_REGION, modelljahre } from '../daten.js';
import { FAHRZEUG_QUELLEN } from '../fahrzeugdaten.js';
import * as RR from '../rueckrufe.js';
import { zeigeEmpfehlung } from './start.js';

const kopf = (titel, sub, extra) => [
  h('a', { class: 'back', href: '#/mehr' }, icon('left', 20), 'Mehr'),
  h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, titel), sub && h('p', { class: 'sub' }, sub)), extra),
];

export const VERSION = '0.1';

export function setzeTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

// ---------------------------------------------------------------- Fahrzeug-Check
const TEIL_DE = {
  'AIR BAGS': 'Airbags', 'SERVICE BRAKES': 'Betriebsbremse', 'SERVICE BRAKES, HYDRAULIC': 'Betriebsbremse (hydraulisch)', 'SERVICE BRAKES, AIR': 'Betriebsbremse (Druckluft)',
  'PARKING BRAKE': 'Feststellbremse', STEERING: 'Lenkung', SUSPENSION: 'Fahrwerk', 'ELECTRICAL SYSTEM': 'Elektrik', ENGINE: 'Motor', 'ENGINE AND ENGINE COOLING': 'Motor und Kühlung',
  'FUEL SYSTEM': 'Kraftstoffanlage', 'FUEL SYSTEM, GASOLINE': 'Kraftstoffanlage (Benzin)', 'FUEL SYSTEM, DIESEL': 'Kraftstoffanlage (Diesel)', 'FUEL/PROPULSION SYSTEM': 'Kraftstoff/Antrieb',
  'POWER TRAIN': 'Antriebsstrang', TIRES: 'Reifen', WHEELS: 'Räder', 'EXTERIOR LIGHTING': 'Beleuchtung', 'INTERIOR LIGHTING': 'Innenbeleuchtung', 'SEAT BELTS': 'Sicherheitsgurte', SEATS: 'Sitze',
  STRUCTURE: 'Karosserie/Struktur', VISIBILITY: 'Sicht', 'VISIBILITY/WIPER': 'Sicht/Wischer', 'VEHICLE SPEED CONTROL': 'Geschwindigkeitsregelung', 'ELECTRONIC STABILITY CONTROL': 'ESP',
  'ELECTRONIC STABILITY CONTROL (ESC)': 'ESP', 'BACK OVER PREVENTION': 'Rückfahrkamera/-warnung', 'FORWARD COLLISION AVOIDANCE': 'Notbremsassistent', 'LANE DEPARTURE': 'Spurhalteassistent',
  'LATCHES/LOCKS/LINKAGES': 'Schlösser/Verriegelungen', EQUIPMENT: 'Ausrüstung', 'UNKNOWN OR OTHER': 'Sonstiges', 'HYBRID PROPULSION SYSTEM': 'Hybridantrieb', 'TRAILER HITCHES': 'Anhängerkupplung',
  'CHILD SEAT': 'Kindersitz', 'TRACTION CONTROL SYSTEM': 'Antriebsschlupfregelung', 'EXHAUST SYSTEM': 'Abgasanlage', 'COMMUNICATION': 'Kommunikation',
};
const teilDe = (t) => { const k = String(t || '').split(':')[0].trim().toUpperCase(); return TEIL_DE[k] || (k ? k.charAt(0) + k.slice(1).toLowerCase() : 'Sonstiges'); };

export function pruefeFIN(roh) {
  const fin = String(roh || '').toUpperCase().replace(/[\s-]/g, '');
  const fehler = [];
  if (fin.length !== 17) fehler.push(`${fin.length} von 17 Zeichen`);
  if (/[IOQ]/.test(fin)) fehler.push('I, O und Q kommen in einer FIN nicht vor');
  if (/[^A-Z0-9]/.test(fin)) fehler.push('nur Buchstaben und Ziffern');
  const wmi = fin.slice(0, 3);
  return {
    fin, ok: !fehler.length, fehler, wmi,
    hersteller: WMI[wmi] || null,
    land: (WMI_LAND.find(([re]) => re.test(wmi)) || [])[1] || null,
    region: (WMI_REGION.find(([re]) => re.test(wmi)) || [])[1] || null,
    jahre: fin.length >= 10 ? modelljahre(fin[9]) : [],
    lauf: fin.length === 17 ? fin.slice(11) : '',
  };
}

/** EU-Rückrufmeldung als Listeneintrag und Detailblatt */
export function rueckrufZeile(r, jahr) {
  const j = Number(jahr);
  const ausserhalb = j >= 1950 && r.v && r.b && (j < r.v || j > r.b);
  return h('button', { class: 'item top' + (ausserhalb ? ' blass' : ''), type: 'button', onclick: () => rueckrufBlatt(r) },
    h('div', { class: 'grow' },
      ausserhalb && h('span', { class: 'tag', style: { marginBottom: '6px' } }, `Baujahr ${j} außerhalb der Produktion`),
      h('div', { class: 't' }, [r.m, r.n].filter(Boolean).join(' · ') || r.p),
      h('div', { class: 'd clamp2' }, RR.kurz(r)),
      h('div', { class: 'xs faint', style: { marginTop: '4px' } }, [RR.datumDe(r.d), r.z && 'Produktion ' + r.z, r.c && 'Code ' + r.c, r.r].filter(Boolean).join(' · '))),
    h('span', { class: 'chev' }, icon('right', 18)));
}
export function rueckrufBlatt(r) {
  const kv = (l, w) => (w ? [h('dt', null, l), h('dd', null, w)] : []);
  sheet({ title: [r.m, r.n].filter(Boolean).join(' · ') || 'Rückruf', cls: 'wide', body: h('div', { class: 'stack' },
    h('div', { class: 'rowx wrap' }, r.r && h('span', { class: 'tag' }, r.r), r.c && h('span', { class: 'tag' }, 'Rückrufcode ' + r.c), r.d && h('span', { class: 'tag' }, RR.datumDe(r.d))),
    h('div', null, h('div', { class: 'eyebrow' }, 'Gefahr'), h('p', { class: 'small' }, r.g || '–')),
    h('dl', { class: 'kv stapel' }, ...kv('Produkt', r.p), ...kv('Typ / Genehmigung', r.t), ...kv('Produktionszeitraum', r.z), ...kv('Maßnahme', [r.a, r.w && `(${r.w})`].filter(Boolean).join(' ')),
      ...kv('Meldendes Land', r.l), ...kv('Meldung', r.id)),
    h('div', { class: 'rowx wrap' },
      r.u && h('a', { class: 'btn small tonal', href: r.u, target: '_blank', rel: 'noopener' }, icon('external', 16), 'Meldung bei Safety Gate'),
      r.x && /^https?:/.test(r.x) && h('a', { class: 'btn small ghost', href: r.x, target: '_blank', rel: 'noopener' }, icon('external', 16), 'Rückrufseite des Herstellers')),
    h('p', { class: 'src' }, 'Quelle: Europäische Kommission, Safety Gate (EU-Schnellwarnsystem). Ob ein bestimmtes Fahrzeug betroffen ist, sagt nur der Hersteller anhand der FIN; maßgeblich für Deutschland ist das KBA.')) });
}

export function seiteFahrzeug(el) {
  const st = { fin: '', marke: '', modell: '', jahr: '', k: '', ...store.get('fahrzeug', {}) };
  const auto = st.auto; delete st.auto;
  const lokal = h('div');
  const online = h('div', { class: 'stack' });
  const eu = h('div', { class: 'stack' });
  const sichere = () => store.set('fahrzeug', st);
  const finInput = h('input', { class: 'input mono', value: st.fin, placeholder: 'WVWZZZ1KZ6W000001', maxlength: 20, autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false',
    style: { textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '1.05rem' }, oninput: (e) => { st.fin = e.target.value; sichere(); zeichneLokal(); } });
  const inp = (key, ph, attrs = {}) => h('input', { class: 'input', value: st[key], placeholder: ph, autocomplete: 'off', oninput: (e) => { st[key] = e.target.value; sichere(); }, ...attrs });
  const marke = inp('marke', 'z. B. Volkswagen', { list: 'rr-marken' }), modell = inp('modell', 'z. B. Golf'), jahr = inp('jahr', 'z. B. 2015', { inputmode: 'numeric' });
  const kFeld = inp('k', 'e1*2007/46*0623*12', { autocapitalize: 'off', spellcheck: 'false' });
  const markenListe = h('datalist', { id: 'rr-marken' });
  RR.marken().then((l) => markenListe.append(...l.map((m) => h('option', { value: m.marke })))).catch(() => {});

  // EU-Rückrufe (Safety Gate): Daten vom eigenen Server, danach offline
  async function euRueckrufe() {
    const k = st.k.trim(), mk = st.marke.trim();
    if (!k && !mk) { toast('Genehmigung (Feld K) oder Marke angeben'); return; }
    clear(eu).append(h('div', { class: 'skeleton', style: { height: '120px' } }));
    try {
      const [rk, rm] = await Promise.all([k ? RR.zuGenehmigung(k) : null, mk ? RR.suche({ marke: mk, modell: st.modell, jahr: st.jahr }) : null]);
      const ids = new Set((rk?.treffer || []).map((r) => r.id));
      const weitere = (rm?.treffer || []).filter((r) => !ids.has(r.id));
      const quelle = (rk || rm).quelle;
      const j = Number(st.jahr);
      const passt = (r) => (j >= 1950 && r.v && r.b && (j < r.v || j > r.b) ? 0 : 1);
      clear(eu);
      eu.append(h('div', { class: 'today-stats', style: { gridTemplateColumns: k && mk ? '1fr 1fr' : '1fr' } },
        k ? h('div', { class: 'stat' }, h('b', null, rk.treffer.length), h('span', null, 'zu dieser Genehmigung')) : null,
        mk ? h('div', { class: 'stat' }, h('b', null, rm.treffer.length), h('span', null, rm.unbekannt ? `„${mk}“ nicht in den Meldungen` : `${rm.marke}${st.modell ? ' ' + st.modell : ''}${st.jahr ? ' · ' + st.jahr : ''}`)) : null));
      if (rk?.treffer.length) eu.append(h('div', { class: 'section-title', style: { marginTop: '6px' } }, h('h2', null, 'Zur Genehmigung'), h('span', { class: 'xs faint' }, k)),
        h('div', { class: 'list' }, [...rk.treffer].sort((a, b) => passt(b) - passt(a)).map((r) => rueckrufZeile(r, st.jahr))));
      if (weitere.length) eu.append(h('div', { class: 'section-title', style: { marginTop: '6px' } }, h('h2', null, k ? 'Weitere zu Marke und Modell' : 'Meldungen'), h('span', { class: 'xs faint' }, weitere.length)),
        h('div', { class: 'list' }, weitere.slice(0, 60).map((r) => rueckrufZeile(r, st.jahr))),
        weitere.length > 60 ? h('p', { class: 'xs faint' }, `Die neuesten 60 von ${weitere.length} – Modell oder Baujahr eingrenzen.`) : null);
      if (!rk?.treffer.length && !weitere.length) eu.append(h('div', { class: 'note' }, icon('info', 18), h('span', null, 'Keine EU-Rückrufmeldung gefunden. Das heißt nicht, dass es keinen Rückruf gibt – nicht jeder Rückruf wird über Safety Gate gemeldet.')));
      eu.append(h('p', { class: 'src' }, `${quelle.herausgeber}, ${quelle.titel}. ${quelle.fassung}. ${quelle.lizenz}. Gesucht wird auf diesem Gerät; Eingaben werden nicht übertragen. Ob ein Fahrzeug betroffen ist, klärt der Hersteller anhand der FIN. `,
        h('a', { href: 'https://www.kba.de/DE/Themen/Marktueberwachung/Rueckrufe/Rueckrufdatenbank/rueckrufdatenbank_node.html', target: '_blank', rel: 'noopener' }, 'Rückrufdatenbank des KBA'), '.'));
    } catch (e) {
      clear(eu).append(h('div', { class: 'note warn' }, icon('offline', 18), h('span', null, 'EU-Rückrufdaten nicht geladen – einmal mit Internet öffnen. (' + e.message + ')')));
    }
  }

  function zeichneLokal() {
    clear(lokal);
    if (!st.fin.trim()) return;
    const p = pruefeFIN(st.fin);
    lokal.append(h('div', { class: 'card pad stack' },
      h('div', { class: 'rowx wrap' }, h('span', { class: 'verdict ' + (p.ok ? 'ok' : 'warn') }, icon(p.ok ? 'check' : 'alert', 16), p.ok ? 'Aufbau plausibel' : p.fehler.join(' · '))),
      h('dl', { class: 'kv' },
        h('dt', null, 'Hersteller (Stellen 1–3)'), h('dd', null, p.hersteller || (p.wmi.length === 3 ? `${p.wmi} – nicht in der Liste` : '–')),
        h('dt', null, 'Herkunft'), h('dd', null, [p.land, p.region].filter(Boolean).join(' · ') || '–'),
        h('dt', null, 'Modelljahr (Stelle 10)'), h('dd', null, p.jahre.length ? p.jahre.join(' oder ') : '–'),
        h('dt', null, 'Fertigungsnummer'), h('dd', { class: 'mono' }, p.lauf || '–')),
      h('p', { class: 'src' }, 'Aufbau nach ISO 3779/3780. Europäische Hersteller belegen Stelle 10 nicht immer mit dem Modelljahr – Angabe nur als Anhalt.')));
  }

  async function hole(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Antwort ' + r.status);
    return r.json();
  }
  async function entschluesseln() {
    const p = pruefeFIN(st.fin);
    if (!p.ok) { toast('Bitte zuerst eine vollständige FIN eingeben'); return; }
    clear(online).append(h('div', { class: 'skeleton', style: { height: '90px' } }));
    try {
      const d = await hole(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(p.fin)}?format=json`);
      const v = (d.Results || [])[0] || {};
      const zeilen = [['Marke', v.Make], ['Modell', v.Model], ['Modelljahr', v.ModelYear], ['Aufbau', v.BodyClass], ['Kraftstoff', v.FuelTypePrimary], ['Hubraum (l)', v.DisplacementL],
        ['Werk', [v.PlantCity, v.PlantCountry].filter(Boolean).join(', ')], ['Hersteller', v.Manufacturer]].filter(([, w]) => w);
      clear(online);
      if (!zeilen.length) { online.append(h('div', { class: 'note' }, icon('info', 18), h('span', null, 'Zu dieser FIN liefert die US-Datenbank keine Angaben – bei Fahrzeugen für den europäischen Markt häufig.'))); return; }
      if (v.Make && !st.marke.trim()) { st.marke = v.Make; marke.value = v.Make; }
      if (v.Model) { st.modell = v.Model; modell.value = v.Model; }
      if (v.ModelYear) { st.jahr = v.ModelYear; jahr.value = v.ModelYear; }
      sichere();
      online.append(h('div', { class: 'card pad stack' }, h('h3', null, 'Angaben aus der FIN'),
        h('dl', { class: 'kv' }, zeilen.flatMap(([l, w]) => [h('dt', null, l), h('dd', null, w)])),
        h('p', { class: 'src' }, 'Quelle: NHTSA vPIC (US-Verkehrssicherheitsbehörde). Vollständig nur für Fahrzeuge des US-Markts.')));
    } catch (e) {
      clear(online).append(h('div', { class: 'note warn' }, icon('offline', 18), h('span', null, 'Abfrage nicht möglich – besteht eine Internetverbindung? (' + e.message + ')')));
    }
  }
  async function rueckrufe() {
    if (!st.marke.trim() || !st.modell.trim() || !/^\d{4}$/.test(String(st.jahr).trim())) { toast('Marke, Modell und Modelljahr (vierstellig) angeben'); return; }
    clear(online).append(h('div', { class: 'skeleton', style: { height: '160px' } }));
    const q = `make=${encodeURIComponent(st.marke.trim())}&model=${encodeURIComponent(st.modell.trim())}&modelYear=${encodeURIComponent(String(st.jahr).trim())}`;
    try {
      const [rr, bb] = await Promise.all([
        hole('https://api.nhtsa.gov/recalls/recallsByVehicle?' + q).catch(() => ({ results: [] })),
        hole('https://api.nhtsa.gov/complaints/complaintsByVehicle?' + q).catch(() => ({ results: [] })),
      ]);
      const rec = rr.results || [], bes = bb.results || [];
      const zaehler = {};
      for (const b of bes) for (const t of String(b.components || '').split(',')) { const k = teilDe(t); zaehler[k] = (zaehler[k] || 0) + 1; }
      const top = Object.entries(zaehler).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const max = top.length ? top[0][1] : 1;
      clear(online).append(
        h('div', { class: 'today-stats', style: { gridTemplateColumns: '1fr 1fr' } },
          h('div', { class: 'stat' }, h('b', null, rec.length), h('span', null, 'Rückrufe (USA)')),
          h('div', { class: 'stat' }, h('b', null, bes.length), h('span', null, 'Halter-Beschwerden'))),
        top.length ? h('div', { class: 'card pad stack' }, h('h3', null, 'Häufig gemeldete Baugruppen'),
          h('div', { class: 'stack-s' }, top.map(([name, n]) => h('div', null,
            h('div', { class: 'rowx between small' }, h('span', null, name), h('b', { class: 'num' }, n)),
            h('div', { class: 'meter', style: { margin: '5px 0 2px', height: '6px' } }, h('i', { style: { width: (n / max * 100) + '%', background: 'var(--accent)' } }))))),
          h('p', { class: 'src' }, 'Zahl der Beschwerden von Fahrzeughaltern bei der NHTSA – ein Hinweis, wo genauer hinzusehen ist, kein Prüfergebnis.')) : null,
        rec.length ? h('div', null, h('div', { class: 'section-title', style: { marginTop: '6px' } }, h('h2', null, 'Rückrufe')),
          h('div', { class: 'list' }, rec.map((r) => h('button', { class: 'item top', onclick: () => sheet({ title: teilDe(r.Component), cls: 'wide', body: h('div', { class: 'stack' },
            h('div', { class: 'rowx wrap' }, h('span', { class: 'tag' }, 'Nr. ' + r.NHTSACampaignNumber), h('span', { class: 'tag' }, r.ReportReceivedDate), r.parkIt && h('span', { class: 'sev sev-V' }, 'Nicht fahren')),
            h('div', null, h('div', { class: 'eyebrow' }, 'Mangel'), h('p', { class: 'small' }, r.Summary)),
            h('div', null, h('div', { class: 'eyebrow' }, 'Folge'), h('p', { class: 'small' }, r.Consequence)),
            h('div', null, h('div', { class: 'eyebrow' }, 'Abhilfe'), h('p', { class: 'small' }, r.Remedy)),
            h('p', { class: 'src' }, 'Originaltext der NHTSA (Englisch).')) }) },
            h('div', { class: 'grow' }, h('div', { class: 't' }, teilDe(r.Component)), h('div', { class: 'd clamp2' }, r.Summary), h('div', { class: 'xs faint', style: { marginTop: '4px' } }, r.ReportReceivedDate)),
            h('span', { class: 'chev' }, icon('right', 18)))))) : h('div', { class: 'note' }, icon('info', 18), h('span', null, 'Keine US-Rückrufe zu dieser Kombination gefunden. Schreibweise wie in den USA üblich verwenden (z. B. „Golf“, „3 Series“).')),
        h('p', { class: 'src' }, 'Quelle: NHTSA (US-Verkehrssicherheitsbehörde), frei verfügbare Daten. Sie betreffen in den USA verkaufte Fahrzeuge und sind nicht ohne Weiteres übertragbar. Deutsche Rückrufe: ',
          h('a', { href: 'https://www.kba.de/DE/Themen/Marktueberwachung/Rueckrufe/Rueckrufdatenbank/rueckrufdatenbank_node.html', target: '_blank', rel: 'noopener' }, 'Rückrufdatenbank des KBA'), '.'));
    } catch (e) {
      clear(online).append(h('div', { class: 'note warn' }, icon('offline', 18), h('span', null, 'Abfrage nicht möglich – besteht eine Internetverbindung? (' + e.message + ')')));
    }
  }

  el.append(h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, 'Fahrzeug-Check'), h('p', { class: 'sub' }, 'FIN prüfen, bekannte Rückrufe und Schwachstellen nachschlagen.'))),
    h('div', { class: 'card pad stack' },
      field('Fahrzeug-Identnummer (FIN)', finInput, 'Die Prüfung des Aufbaus läuft auf dem Gerät. Erst „Online entschlüsseln“ sendet die FIN an die US-Behörde NHTSA.'),
      h('button', { class: 'btn tonal', onclick: entschluesseln }, icon('external', 18), 'Online entschlüsseln')),
    lokal,
    h('div', { class: 'card pad stack' }, h('h3', null, 'Rückrufe'),
      field('Genehmigung (Feld K, optional)', kFeld, 'Findet Meldungen, in denen genau diese EG-Typgenehmigung steht – am treffsichersten.'),
      h('div', { class: 'grid2' }, field('Marke', marke), field('Modell', modell)),
      field('Baujahr', jahr),
      markenListe,
      h('button', { class: 'btn', onclick: euRueckrufe }, icon('search', 18), 'EU-Rückrufe suchen'),
      h('p', { class: 'src' }, 'EU: Safety Gate der Europäischen Kommission, über 6.400 Kfz-Meldungen seit 2005, auf diesem Gerät durchsucht.')),
    eu,
    h('div', { class: 'card pad stack' }, h('h3', null, 'USA: Rückrufe und Halter-Beschwerden'),
      h('p', { class: 'small muted' }, 'Gleiche Angaben, Abfrage bei der US-Behörde NHTSA. Gilt für US-Modelle; nützlich als Hinweis auf bekannte Schwachstellen.'),
      h('button', { class: 'btn ghost', onclick: rueckrufe }, icon('external', 18), 'Bei der NHTSA nachschlagen'),
      h('p', { class: 'src' }, 'Online-Abfrage mit Marke, Modell und Modelljahr – ohne FIN, ohne Kennzeichen.')),
    online);
  zeichneLokal();
  // FIN-Herstellerkennung als Vorschlag für die Marke
  finInput.addEventListener('input', () => { const p = pruefeFIN(st.fin); if (p.hersteller && !st.marke.trim()) { st.marke = p.hersteller.split(/[ (]/)[0]; marke.value = st.marke; sichere(); } });
  if (auto) { sichere(); euRueckrufe(); }
}

// ---------------------------------------------------------------- Textbausteine
const TEXTE_START = [
  { titel: 'Nachprüfung', text: 'Die festgestellten Mängel sind unverzüglich zu beheben. Das Fahrzeug ist spätestens innerhalb eines Monats zur Nachprüfung vorzuführen; bitte den Untersuchungsbericht mitbringen.' },
  { titel: 'Geringe Mängel', text: 'Es wurden geringe Mängel festgestellt. Die Plakette wurde zugeteilt; die Mängel sind unverzüglich, spätestens innerhalb eines Monats zu beheben.' },
  { titel: 'Hinweis Reifen', text: 'Hinweis: Die Reifen nähern sich der Verschleißgrenze – zeitnaher Ersatz wird empfohlen.' },
  { titel: 'Hinweis Bremsflüssigkeit', text: 'Hinweis: Wechsel der Bremsflüssigkeit nach Herstellervorgabe empfohlen.' },
  { titel: 'Unterlagen fehlen', text: 'Für die Begutachtung fehlen Unterlagen (Teilegutachten, ABE oder Herstellerbescheinigung). Bitte nachreichen.' },
];
function seiteTexte(el) {
  if (store.get('texte') == null) store.set('texte', TEXTE_START.map((t) => ({ id: uid(), ...t })));
  const liste = h('div');
  function bearbeite(t) {
    const v = t ? { ...t } : { titel: '', text: '' };
    const s = sheet({
      title: t ? 'Baustein bearbeiten' : 'Neuer Baustein',
      body: h('div', { class: 'stack' },
        field('Kurzname', h('input', { class: 'input', value: v.titel, placeholder: 'z. B. Nachprüfung', oninput: (e) => { v.titel = e.target.value; } })),
        field('Text', h('textarea', { class: 'textarea', style: { minHeight: '150px' }, value: v.text, oninput: (e) => { v.text = e.target.value; } }))),
      footer: [
        t && h('button', { class: 'btn danger', onclick: () => { store.set('texte', store.get('texte', []).filter((x) => x.id !== t.id)); s.close(); zeichne(); } }, 'Löschen'),
        h('button', { class: 'btn', onclick: () => {
          if (!v.text.trim()) { toast('Bitte einen Text eingeben'); return; }
          const alle = store.get('texte', []);
          if (t) Object.assign(alle.find((x) => x.id === t.id), v); else alle.push({ id: uid(), titel: v.titel.trim() || v.text.slice(0, 24), text: v.text });
          store.set('texte', alle); s.close(); zeichne();
        } }, 'Speichern')],
    });
  }
  function zeichne() {
    const alle = store.get('texte', []);
    clear(liste);
    if (!alle.length) { liste.append(h('div', { class: 'card pad empty' }, h('div', { class: 'big' }, icon('text', 28)), h('h3', null, 'Noch keine Bausteine'), h('p', null, 'Formulierungen, die du täglich brauchst – einmal anlegen, mit einem Tipp kopieren.'))); return; }
    liste.append(h('div', { class: 'list' }, alle.map((t) => h('div', { class: 'item top' },
      h('button', { class: 'grow', style: { background: 'none', border: 0, textAlign: 'left', padding: 0, color: 'inherit' }, onclick: () => copyText(t.text, `„${t.titel}“ kopiert`) },
        h('div', { class: 't' }, t.titel), h('div', { class: 'd clamp3' }, t.text)),
      h('button', { class: 'icon-btn', 'aria-label': 'Bearbeiten', onclick: () => bearbeite(t) }, icon('edit', 20))))));
  }
  el.append(...kopf('Textbausteine', 'Antippen kopiert den Text. In Aufträgen lassen sie sich in die Notiz einfügen.',
    h('button', { class: 'btn fab', onclick: () => bearbeite(null) }, icon('plus', 20), 'Baustein')), liste,
  h('p', { class: 'src' }, 'Die vorbelegten Texte sind Beispiele – bitte an eure Formulierungen anpassen.'));
  zeichne();
}

// ---------------------------------------------------------------- Checklisten
const LISTEN_START = [
  { titel: 'Annahme HU', punkte: ['Zulassungsbescheinigung Teil I liegt vor', 'FIN am Fahrzeug mit Papieren verglichen', 'Kennzeichen vorn und hinten geprüft', 'Kilometerstand notiert',
    'Kontrollleuchten beim Einschalten der Zündung beobachtet', 'Änderungen am Fahrzeug erfragt, Nachweise gesichtet', 'Warndreieck, Verbandkasten, Warnweste vorhanden'] },
  { titel: 'Räder und Reifen – Änderung', punkte: ['Gutachten oder ABE passt zum Fahrzeugtyp', 'Rad- und Reifengröße wie im Gutachten', 'Auflagen und Hinweise abgearbeitet',
    'Freigängigkeit bei Volleinschlag und Einfederung', 'Radabdeckung ausreichend', 'Tragfähigkeit und Geschwindigkeitsindex ausreichend', 'Befestigungsmittel und Anzugsmoment', 'Abrollumfang und Tachoanzeige'] },
  { titel: 'Oldtimer', punkte: ['Erstzulassung vor mindestens 30 Jahren', 'Weitestgehend im Originalzustand', 'Guter Erhaltungszustand', 'Änderungen zeitgenössisch und belegt', 'Umfang der Hauptuntersuchung erfüllt', 'Fotos für das Gutachten aufgenommen'] },
];
function seiteListen(el, teile) {
  if (store.get('listen') == null) store.set('listen', LISTEN_START.map((l) => ({ id: uid(), titel: l.titel, punkte: l.punkte.map((t) => ({ id: uid(), t, ok: false })) })));
  const alle = () => store.get('listen', []);
  const sichere = (l) => store.set('listen', l);
  if (teile[0]) {
    const id = teile[0];
    const inhalt = h('div');
    const zeichne = () => {
      const l = alle().find((x) => x.id === id);
      if (!l) { location.hash = '#/mehr/checklisten'; return; }
      const offen = l.punkte.filter((p) => !p.ok).length;
      const neu = h('input', { class: 'input', placeholder: 'Punkt hinzufügen …', enterkeyhint: 'done' });
      const fuege = () => { if (!neu.value.trim()) return; const a = alle(); a.find((x) => x.id === id).punkte.push({ id: uid(), t: neu.value.trim(), ok: false }); sichere(a); zeichne(); setTimeout(() => inhalt.querySelector('input.input')?.focus(), 30); };
      neu.addEventListener('keydown', (e) => { if (e.key === 'Enter') fuege(); });
      clear(inhalt).append(
        h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, l.titel), h('p', { class: 'sub' }, offen ? `${offen} von ${l.punkte.length} offen` : 'Alles erledigt')),
          h('button', { class: 'btn small ghost', onclick: () => { const a = alle(); a.find((x) => x.id === id).punkte.forEach((p) => { p.ok = false; }); sichere(a); zeichne(); } }, 'Zurücksetzen')),
        h('div', { class: 'list', style: { marginTop: '16px' } }, l.punkte.map((p) => h('div', { class: 'item' },
          h('label', { class: 'check grow', style: { minHeight: '0' } },
            h('input', { type: 'checkbox', checked: p.ok, onchange: (e) => { const a = alle(); a.find((x) => x.id === id).punkte.find((y) => y.id === p.id).ok = e.target.checked; sichere(a); zeichne(); } }),
            h('span', { style: p.ok ? { color: 'var(--faint)', textDecoration: 'line-through' } : null }, p.t)),
          h('button', { class: 'icon-btn', 'aria-label': 'Punkt entfernen', onclick: () => { const a = alle(); const li = a.find((x) => x.id === id); li.punkte = li.punkte.filter((y) => y.id !== p.id); sichere(a); zeichne(); } }, icon('x', 18))))),
        h('div', { class: 'rowx', style: { marginTop: '12px' } }, neu, h('button', { class: 'btn', 'aria-label': 'Hinzufügen', onclick: fuege }, icon('plus', 20))),
        h('button', { class: 'btn danger small', style: { marginTop: '22px' }, onclick: async () => { if (await confirmSheet('Checkliste löschen?', `„${l.titel}“ wird entfernt.`)) { sichere(alle().filter((x) => x.id !== id)); location.hash = '#/mehr/checklisten'; } } }, icon('trash', 16), 'Liste löschen'));
    };
    el.append(h('a', { class: 'back', href: '#/mehr/checklisten' }, icon('left', 20), 'Checklisten'), inhalt);
    zeichne();
    return;
  }
  const liste = h('div');
  const zeichne = () => clear(liste).append(h('div', { class: 'list' }, alle().map((l) => {
    const fertig = l.punkte.filter((p) => p.ok).length;
    return h('a', { class: 'item', href: '#/mehr/checklisten/' + l.id }, h('span', { class: 'ico-tile plain' }, icon('listcheck')),
      h('div', { class: 'grow' }, h('div', { class: 't' }, l.titel), h('div', { class: 'd num' }, `${fertig} von ${l.punkte.length} erledigt`)), h('span', { class: 'chev' }, icon('right', 18)));
  })));
  el.append(...kopf('Checklisten', 'Eigene Abläufe zum Abhaken.', h('button', { class: 'btn fab', onclick: () => {
    let titel = '';
    const s = sheet({ title: 'Neue Checkliste', body: field('Name', h('input', { class: 'input', placeholder: 'z. B. Anhänger-Abnahme', oninput: (e) => { titel = e.target.value; } })),
      footer: [h('button', { class: 'btn', onclick: () => { if (!titel.trim()) return; const l = { id: uid(), titel: titel.trim(), punkte: [] }; sichere([...alle(), l]); s.close(); location.hash = '#/mehr/checklisten/' + l.id; } }, 'Anlegen')] });
  } }, icon('plus', 20), 'Liste')), liste, h('p', { class: 'src' }, 'Die vorbelegten Listen sind Vorlagen – bitte an eure Abläufe anpassen.'));
  zeichne();
}

// ---------------------------------------------------------------- Wunschliste
const DRANG = { 1: 'wäre nett', 2: 'wichtig', 3: 'fehlt mir täglich' };
function seiteWuensche(el) {
  const alle = () => store.get('wuensche', []);
  const liste = h('div');
  const text = () => 'Wünsche für Prüfsinn – Stand ' + fmtDate(isoToday(), { day: '2-digit', month: '2-digit', year: 'numeric' }) + '\n\n' +
    alle().sort((a, b) => b.drang - a.drang).map((w, i) => `${i + 1}. [${DRANG[w.drang]}] ${w.titel}${w.text ? '\n   ' + w.text.replace(/\n/g, '\n   ') : ''}`).join('\n\n');
  function neu() {
    const v = { titel: '', text: '', drang: 2 };
    const s = sheet({
      title: 'Was fehlt dir?',
      body: h('div', { class: 'stack' },
        field('In einem Satz', h('input', { class: 'input', placeholder: 'z. B. Achslastverteilung für Wohnmobile rechnen', oninput: (e) => { v.titel = e.target.value; } })),
        field('Wie läuft es heute – und was würde helfen? (optional)', h('textarea', { class: 'textarea', oninput: (e) => { v.text = e.target.value; } })),
        field('Wie dringend?', seg([[1, 'wäre nett'], [2, 'wichtig'], [3, 'täglich']], v.drang, (x) => { v.drang = x; }, 'full'))),
      footer: [h('button', { class: 'btn', onclick: () => { if (!v.titel.trim()) { toast('Bitte kurz beschreiben'); return; } store.set('wuensche', [...alle(), { id: uid(), ...v, datum: isoToday() }]); s.close(); zeichne(); } }, 'Merken')],
    });
  }
  function zeichne() {
    const a = alle();
    clear(liste);
    if (!a.length) { liste.append(h('div', { class: 'card pad empty' }, h('div', { class: 'big' }, icon('bulb', 28)), h('h3', null, 'Hier entsteht die nächste Version'),
      h('p', null, 'Immer wenn dir im Alltag etwas fehlt oder nervt: kurz notieren. Die Liste geht mit einem Tipp an den Entwickler.'), h('button', { class: 'btn', onclick: neu }, icon('plus', 18), 'Ersten Wunsch notieren'))); return; }
    liste.append(h('div', { class: 'list' }, a.sort((x, y) => y.drang - x.drang).map((w) => h('div', { class: 'item top' },
      h('div', { class: 'grow' }, h('div', { class: 't' }, w.titel), w.text && h('div', { class: 'd pre' }, w.text), h('div', { class: 'meta', style: { display: 'flex', gap: '6px', marginTop: '8px' } }, h('span', { class: 'tag' + (w.drang === 3 ? ' ort' : '') }, DRANG[w.drang]), h('span', { class: 'tag' }, fmtDate(w.datum, { day: '2-digit', month: '2-digit' })))),
      h('button', { class: 'icon-btn', 'aria-label': 'Entfernen', onclick: () => { store.set('wuensche', alle().filter((x) => x.id !== w.id)); zeichne(); } }, icon('x', 18))))),
    h('div', { class: 'grid2', style: { marginTop: '14px' } }, h('button', { class: 'btn ghost', onclick: () => copyText(text(), 'Liste kopiert') }, icon('copy', 18), 'Kopieren'), h('button', { class: 'btn', onclick: () => shareText('Wünsche für Prüfsinn', text()) }, icon('share', 18), 'Senden')));
  }
  el.append(...kopf('Wunschliste', 'Was fehlt im Prüfalltag? Sammeln und an den Entwickler schicken.', h('button', { class: 'btn fab', onclick: neu }, icon('plus', 20), 'Wunsch')), liste);
  zeichne();
}

// ---------------------------------------------------------------- Datensicherung
function seiteDaten(el) {
  const datei = h('input', { type: 'file', accept: 'application/json,.json', class: 'hide', onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || d.app !== 'pruefsinn' || typeof d.daten !== 'object') throw new Error('keine Prüfsinn-Sicherung');
      if (await confirmSheet('Sicherung einspielen?', `Stand ${d.datum || 'unbekannt'}. Vorhandene Daten auf diesem Gerät werden überschrieben.`, 'Einspielen', false)) { store.importAll(d.daten); toast('Sicherung eingespielt'); setTimeout(() => location.reload(), 600); }
    } catch (err) { toast('Datei nicht lesbar: ' + err.message, { ms: 5000 }); }
    e.target.value = '';
  } });
  const d = store.all();
  el.append(...kopf('Datensicherung', 'Alles liegt nur auf diesem Gerät. Eine Sicherung schützt vor Verlust und überträgt Daten auf ein anderes Gerät.'),
    h('div', { class: 'today-stats' },
      h('div', { class: 'stat' }, h('b', null, (d.auftraege || []).length), h('span', null, 'Aufträge')),
      h('div', { class: 'stat' }, h('b', null, (d.texte || []).length), h('span', null, 'Bausteine')),
      h('div', { class: 'stat' }, h('b', null, (d.wuensche || []).length), h('span', null, 'Wünsche'))),
    h('div', { class: 'stack' },
      h('button', { class: 'btn block', onclick: () => downloadFile(`pruefsinn-sicherung-${isoToday()}.json`, JSON.stringify({ app: 'pruefsinn', version: VERSION, datum: isoToday(), daten: store.all() }, null, 1)) }, icon('download', 18), 'Sicherung herunterladen'),
      h('button', { class: 'btn ghost block', onclick: () => datei.click() }, icon('upload', 18), 'Sicherung einspielen'), datei,
      h('button', { class: 'btn danger block', onclick: async () => {
        if (await confirmSheet('Wirklich alles löschen?', 'Aufträge, Befunde, Bausteine, Checklisten und Einstellungen werden von diesem Gerät entfernt. Das lässt sich nicht rückgängig machen.', 'Alles löschen')) {
          Object.keys(store.all()).forEach((k) => store.remove(k)); toast('Alle Daten gelöscht'); setTimeout(() => location.reload(), 600);
        }
      } }, icon('trash', 18), 'Alle Daten auf diesem Gerät löschen')),
    h('div', { class: 'note' }, icon('shield', 18), h('span', null, 'Die Sicherungsdatei enthält Kennzeichen und Notizen im Klartext – bitte entsprechend sorgfältig aufbewahren.')));
}

// ---------------------------------------------------------------- Einstellungen
function seiteEinstellungen(el) {
  const st = { theme: 'system', name: '', katalog: 'de', ...store.get('einstellungen', {}) };
  const sichere = () => store.set('einstellungen', st);
  el.append(...kopf('Einstellungen'),
    h('div', { class: 'card pad stack-l' },
      field('Darstellung', seg([['system', 'Wie das Gerät'], ['light', 'Hell'], ['dark', 'Dunkel']], st.theme, (v) => { st.theme = v; sichere(); setzeTheme(v); }, 'full')),
      field('Mängelkatalog', seg([['de', 'HU-Richtlinie'], ['eu', 'EU-Mindestkatalog']], st.katalog, (v) => { st.katalog = v; sichere(); toast(v === 'de' ? 'Einstufung nach HU-Richtlinie (Deutschland)' : 'Einstufung nach EU-Mindestkatalog'); }, 'full'),
        'HU-Richtlinie: deutsche Einstufung mit verkehrsunsicherem Mangel (VU) und den nationalen D-Mängeln, Stand 04/2024. EU-Mindestkatalog: Richtlinie 2014/45/EU, Anhang I.'),
      field('Dein Name (erscheint im Befundtext)', h('input', { class: 'input', value: st.name, placeholder: 'optional', autocomplete: 'name', oninput: (e) => { st.name = e.target.value; sichere(); } })),
      field('Werkstatt (erscheint im Umbau-Nachweis)', h('input', { class: 'input', value: st.betrieb || '', placeholder: 'z. B. Reifen Müller, Hauptstr. 1, Musterstadt', autocomplete: 'organization', oninput: (e) => { st.betrieb = e.target.value; sichere(); } }))));
}

// ---------------------------------------------------------------- Über & Quellen
async function seiteUeber(el) {
  el.append(...kopf('Über & Quellen', 'Woher die Inhalte stammen und was die App mit Daten macht.'));
  const quellen = h('div', { class: 'list' });
  el.append(
    h('div', { class: 'card pad stack' }, h('h3', null, 'Arbeitshilfe, kein amtliches Werkzeug'),
      h('p', { class: 'small muted' }, 'Prüfsinn ist ein unabhängiges Hilfsmittel für Prüfingenieurinnen und Prüfingenieure. Es gehört zu keiner Prüforganisation und ersetzt weder die HU-Richtlinie noch die Software, in der der amtliche Untersuchungsbericht entsteht. Verbindlich sind stets die amtlichen Vorschriften in der aktuellen Fassung. Rechenergebnisse und Einstufungen sind Vorschläge – die Entscheidung trifft die prüfende Person.')),
    h('div', { class: 'section-title' }, h('h2', null, 'Quellen der Wissensdatenbank')), quellen,
    h('div', { class: 'section-title' }, h('h2', null, 'Datenschutz')),
    h('div', { class: 'card pad stack-s small muted' },
      h('p', null, h('b', { style: { color: 'var(--text)' } }, 'Alles bleibt auf dem Gerät. '), 'Aufträge, Kennzeichen, Befunde und Notizen werden nur im Speicher dieses Browsers abgelegt und nirgendwohin übertragen. Es gibt kein Konto, keine Auswertung, keine Werbung.'),
      h('p', null, h('b', { style: { color: 'var(--text)' } }, 'Spracheingabe: '), 'Die Erkennung übernimmt der Browser. Je nach Gerät wird die Aufnahme dafür an den Dienst des Herstellers (z. B. Apple oder Google) gesendet – bitte keine Namen oder Kennzeichen diktieren.'),
      h('p', null, h('b', { style: { color: 'var(--text)' } }, 'Fahrzeug-Check: '), 'EU-Rückrufe werden auf dem Gerät durchsucht. Nur auf Knopfdruck werden FIN bzw. Marke, Modell und Jahr an die US-Behörde NHTSA gesendet.'),
      h('p', null, h('b', { style: { color: 'var(--text)' } }, 'Gutachten: '), 'Geöffnete PDFs werden im Gerät gelesen und nicht hochgeladen. Am Auftrag gespeichert wird nur das Ergebnis der Auswertung, nicht die Datei. Fotos zum Umbau bleiben verkleinert im Speicher des Browsers und werden mit dem Auftrag gelöscht.')),
    h('div', { class: 'section-title' }, h('h2', null, 'Verwendete Software')),
    h('div', { class: 'list' }, h('div', { class: 'item top' }, h('div', { class: 'grow' }, h('div', { class: 't' }, 'pdf.js 4.10.38'),
      h('div', { class: 'd' }, 'Liest die Gutachten-PDFs im Gerät'), h('div', { class: 'xs faint', style: { marginTop: '4px' } }, 'Mozilla Foundation · Apache-Lizenz 2.0 · vendor/pdfjs/LICENSE')),
      h('a', { class: 'icon-btn', href: 'https://github.com/mozilla/pdf.js', target: '_blank', rel: 'noopener', 'aria-label': 'Quelle öffnen' }, icon('external', 20))),
      h('div', { class: 'item top' }, h('div', { class: 'grow' }, h('div', { class: 't' }, 'Tesseract.js 5.1.1'),
        h('div', { class: 'd' }, 'Texterkennung für eingescannte Gutachten, im Gerät; deutsche Sprachdaten aus tessdata'), h('div', { class: 'xs faint', style: { marginTop: '4px' } }, 'Projekt Naptha / Tesseract OCR · Apache-Lizenz 2.0 · vendor/tesseract/')),
        h('a', { class: 'icon-btn', href: 'https://github.com/naptha/tesseract.js', target: '_blank', rel: 'noopener', 'aria-label': 'Quelle öffnen' }, icon('external', 20)))),
    h('button', { class: 'btn small ghost', onclick: zeigeEmpfehlung }, icon('star', 16), 'Empfehlung noch einmal zeigen'),
    h('p', { class: 'src' }, `Prüfsinn ${VERSION}`));
  const zeile = (q, extra) => h('div', { class: 'item top' }, h('div', { class: 'grow' }, h('div', { class: 't' }, q.titel), h('div', { class: 'd' }, [q.fassung, extra].filter(Boolean).join(' · ')), h('div', { class: 'xs faint', style: { marginTop: '4px' } }, q.herausgeber + ' · ' + q.lizenz)),
    h('a', { class: 'icon-btn', href: q.url, target: '_blank', rel: 'noopener', 'aria-label': 'Quelle öffnen' }, icon('external', 20)));
  try {
    const [k, s, f] = await Promise.all([katalog(), gesetz('stvzo'), gesetz('fzv')]);
    quellen.append(zeile(k.quelle, `${k.eintraege.length} Mängel`), zeile(s.quelle, `${s.normen.length} Vorschriften`), zeile(f.quelle, `${f.normen.length} Vorschriften`));
  } catch { quellen.append(h('div', { class: 'item' }, 'Wissensdatenbank nicht geladen.')); }
  // Fahrzeugdaten: werden erst bei Bedarf geladen, hier nur die Angaben zur Quelle
  quellen.append(...FAHRZEUG_QUELLEN.map((q) => zeile(q, q.wofuer)));
  RR.index().then((ix) => quellen.append(zeile(ix.quelle, 'Rückrufe im Fahrzeug-Check, im Auftrag und bei Feld K'))).catch(() => {});
}

export function seite(el, teile) {
  const t = teile[0];
  if (t === 'fahrzeug') { location.replace('#/fahrzeug'); return; }
  if (t === 'texte') return seiteTexte(el);
  if (t === 'checklisten') return seiteListen(el, teile.slice(1));
  if (t === 'wuensche') return seiteWuensche(el);
  if (t === 'daten') return seiteDaten(el);
  if (t === 'einstellungen') return seiteEinstellungen(el);
  if (t === 'ueber') return seiteUeber(el);
  const eintrag = (href, ic, titel, d) => h('a', { class: 'item', href }, h('span', { class: 'ico-tile' }, icon(ic)), h('div', { class: 'grow' }, h('div', { class: 't' }, titel), h('div', { class: 'd' }, d)), h('span', { class: 'chev' }, icon('right', 18)));
  el.append(
    h('header', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, 'Mehr'))),
    h('div', { class: 'section-title', style: { marginTop: '6px' } }, h('h2', null, 'Werkzeuge')),
    h('div', { class: 'list' },
      eintrag('#/mehr/texte', 'text', 'Textbausteine', 'Häufige Formulierungen mit einem Tipp kopieren'),
      eintrag('#/mehr/checklisten', 'listcheck', 'Checklisten', 'Eigene Abläufe zum Abhaken')),
    h('div', { class: 'section-title' }, h('h2', null, 'Mitgestalten')),
    h('div', { class: 'list' }, eintrag('#/mehr/wuensche', 'bulb', 'Wunschliste', 'Was fehlt? Notieren und an den Entwickler senden')),
    h('div', { class: 'section-title' }, h('h2', null, 'App')),
    h('div', { class: 'list' },
      eintrag('#/mehr/daten', 'db', 'Datensicherung', 'Sichern, übertragen, löschen'),
      eintrag('#/mehr/einstellungen', 'sliders', 'Einstellungen', 'Darstellung und Name'),
      eintrag('#/mehr/ueber', 'info', 'Über & Quellen', 'Herkunft der Inhalte, Datenschutz')));
}
