// Prüfsinn – Service Worker: macht die App offline nutzbar.
// Bei jeder Änderung an Code oder Daten VERSION erhöhen, damit Geräte die neue Fassung laden.
const VERSION = 'pruefsinn-2026-11-13-16';
// Fremdbibliotheken (pdf.js 4.10.38, Tesseract.js 5.1.1) liegen in einem eigenen Speicher: Sie ändern sich selten und sind groß.
// pdf.js wird gleich mitgeladen, die Texterkennung (rund 5 MB) erst beim ersten Scan.
const VENDOR = 'pruefsinn-vendor-2';
const VENDOR_DATEIEN = ['vendor/pdfjs/pdf.min.js', 'vendor/pdfjs/pdf.worker.min.js'];

const KERN = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/core.js', 'js/daten.js', 'js/suche.js', 'js/pdf.js', 'js/bericht.js', 'js/ablauf.js', 'js/gutachten.js', 'js/fotos.js', 'js/nachweis.js', 'js/fahrzeugdaten.js', 'js/rueckrufe.js', 'js/demo.js',
  'js/seiten/start.js', 'js/seiten/auftraege.js', 'js/seiten/pruefung.js', 'js/seiten/gutachten.js', 'js/seiten/wissen.js', 'js/seiten/rechner.js', 'js/seiten/mehr.js',
  'assets/icon.svg', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png',
  'daten/maengelkatalog.json', 'daten/hu-richtlinie.json', 'daten/stvzo.json', 'daten/fzv.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(VERSION).then((c) => c.addAll(KERN)),
    caches.open(VENDOR).then(async (c) => { for (const d of VENDOR_DATEIEN) if (!(await c.match(d))) await c.add(d); }),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VENDOR).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // fremde Dienste (z. B. NHTSA) nie zwischenspeichern

  // pdf.js: fest an die Fassung gebunden, daher direkt aus dem eigenen Speicher
  if (url.pathname.includes('/vendor/')) {
    e.respondWith(caches.open(VENDOR).then(async (c) => (await c.match(req, { ignoreSearch: true })) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  // Große Datendateien: sofort aus dem Speicher, im Hintergrund auffrischen
  if (url.pathname.includes('/daten/')) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const treffer = await c.match(req);
      const netz = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => treffer);
      return treffer || netz;
    }));
    return;
  }
  // Alles andere: erst Netz (damit Updates ankommen), sonst Speicher
  e.respondWith(
    fetch(req).then((r) => {
      if (r.ok) { const kopie = r.clone(); caches.open(VERSION).then((c) => c.put(req, kopie)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
