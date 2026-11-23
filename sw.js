/* Anbar Mobil - oflayn ishleme. Merkeze sorgular (POST, Neon) SW-den kechmir - hemishe birbasha.
   Tetbiq fayllari: evvel shebeke (yenilik gelsin); 2,5 san cavab yoxdursa ve ya internet yoxdursa - kesh.
   Sehife achilishlari (unvanda parametr olsa da) bir kesh yazisinda saxlanir: index.html.
   Barkod kitabxanasi ve onun .wasm fayli (jsDelivr, versiyali unvan): evvel kesh. Bashqa unvanlara (mehsul bazasi, AI) toxunulmur. */
const TETBIQ = 'uyum-mobil-tetbiq-v20', KITAB = 'uyum-mobil-kitabxana-v1';
const FAYLLAR = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => e.waitUntil(
  caches.open(TETBIQ).then(c => Promise.all(FAYLLAR.map(f => fetch(f, {cache: 'no-cache'}).then(r => { if (!r.ok) throw new Error(f); return c.put(f, r); })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== TETBIQ && k !== KITAB).map(k => caches.delete(k)))).then(() => self.clients.claim())));

const gec = ms => new Promise(r => setTimeout(() => r(null), ms));

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin && u.search === '?versiya') return;      // yeni versiya yoxlaması — həmişə birbaşa serverə (keşsiz)
  if (u.origin === self.location.origin) {
    const acar = r.mode === 'navigate' ? new Request('./index.html') : r;
    e.respondWith((async () => {
      const kes = await caches.match(acar, {ignoreSearch: true});
      // 'no-cache': brauzerin oz keshi kohne nusxeni vermesin - her defe serverden sorushulur (deyishmeyibse 304, suretlidir)
      const sebeke = fetch(u.href, {cache: 'no-cache'}).then(c => { if (c && c.ok) { const k = c.clone(); caches.open(TETBIQ).then(x => x.put(acar, k)); } return c; }).catch(() => null);
      const ilk = kes ? await Promise.race([sebeke, gec(2500)]) : await sebeke;
      return (ilk && ilk.ok ? ilk : null) || kes || ilk || Response.error();
    })());
  } else if (/(^|\.)jsdelivr\.net$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(c => {
      if (c && (c.ok || c.type === 'opaque')) { const k = c.clone(); caches.open(KITAB).then(x => x.put(r, k)); }
      return c;
    })));
  }
});
