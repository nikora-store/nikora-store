/**
 * bestsellers.js - shared by index.html and catalog.html so both pages rank, badge and show galleries identically.
 * Data comes from GET /api/catalog (a read-only view of lib/products.js) for names, prices, descriptions and bestseller ranks.
 * If that endpoint is missing (404), failing or not JSON, the Firebase Realtime Database REST API (/products.json) is used instead, and the failure is
 * remembered for 30 minutes per browser session so the missing endpoint is requested at most once. Set window.NK_CATALOG_API = false to skip it entirely.
 * PHOTOS come ONLY from Firebase /products (the product's own images[]). lib/products.js images are never used: a product with no
 * images (or a photo that fails to load) shows the branded NIKORA placeholder below.
 * Load with a plain <script src="bestsellers.js"></script> before the page's main script.
 */
(function (root) {
  'use strict';
  var ENDPOINT = '/api/catalog';
  var FIREBASE_URL = String(root.NK_FIREBASE_URL || 'https://nikora-store-default-rtdb.firebaseio.com').replace(/\/+$/, '');   // REST fallback when /api/catalog is unavailable
  var API_DOWN_KEY = 'nk_catalog_api_down', API_DOWN_MS = 30 * 60 * 1000;   // after one failure, skip the endpoint for 30 min (no repeated 404s)
  var LEGACY_NAMES = ['NIKORA RED Light & EMS Facial Wand 4-in-1', '3D EMS Gua Sha Sculptor', 'Hydro-Vacuum Pore Cleaner', 'LED Therapy Mask 7-in-1 Pro', 'EMS Body Sculptor RF', 'Sonic Eye Massager', 'Ultrasonic Skin Scrubber', 'Thermal Neck & Face Massager', 'Cryo Ice Roller', 'RF Anti-Aging Device', 'NIKORA Ultimate Glow Ritual Set (Full Gadget Bundle)'];
  var TOP_RATED_MIN = 4.5;          // "TOP RATED" only shows for a REAL rating at or above this
  var BUNDLE_CATEGORY = 'Bundles & Sets';
  var SERVER_FIELDS = ['name', 'category', 'price', 'desc', 'oldPrice', 'bestseller', 'bestsellerRank', 'bestsellerLabel', 'rating', 'salesCount'];
  var serverList = null, pending = null, rankingSource = null;   // 'sales' = ranked from real store orders, 'fallback' = initial ranks from lib/products.js

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { if (v == null || v === '') return null; var n = Number(v); return isFinite(n) ? n : null; }

  /** BADGE FIX: one place that reads EVERY field a bestseller can be marked with.
   *  bestseller / isBestseller (admin panel writes both), bestsellerRank, bestsellerLabel and the catalog.json `flag` text
   *  ("Bestseller", "Bestseller #3", "Bestseller #2 Bundle"). Before, only `bestseller === true` counted, so a product carrying just
   *  `flag` or `isBestseller` showed its badge from local data and lost it the moment the async Firebase / API sync replaced the record.
   *  Returns { is, rank, label, flag }. */
  function flagInfo(p) {
    var out = { is: false, rank: null, label: null, flag: null };
    if (!p || typeof p !== 'object') return out;
    var flag = typeof p.flag === 'string' ? p.flag.trim() : '';
    var fromFlag = /bestseller/i.test(flag);
    out.is = p.bestseller === true || p.isBestseller === true || fromFlag;
    out.flag = flag || null;
    out.rank = num(p.bestsellerRank);
    if (out.rank === null && fromFlag) { var m = /#\s*(\d+)/.exec(flag); if (m) out.rank = Number(m[1]); }
    out.label = p.bestsellerLabel ? String(p.bestsellerLabel) : null;
    if (!out.label && fromFlag) { var rest = flag.replace(/^\s*bestseller\s*/i, '').trim(); if (rest) out.label = rest; }
    if (!out.is) { out.rank = null; out.label = null; }
    return out;
  }
  /** Shallow copy of p with bestseller / bestsellerRank / bestsellerLabel / flag normalised from every source field. Never drops a field. */
  function stampFlags(p) {
    if (!p || typeof p !== 'object') return p;
    var o = {}, k, f = flagInfo(p);
    for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) o[k] = p[k];
    o.bestseller = f.is; o.bestsellerRank = f.rank; o.bestsellerLabel = f.label;
    if (f.flag) o.flag = f.flag;
    return o;
  }

  function apiSkipped() {
    if (root.NK_CATALOG_API === false || (root.location && root.location.protocol === 'file:')) return true;
    try { var t = Number(root.sessionStorage.getItem(API_DOWN_KEY)); return !!t && Date.now() - t < API_DOWN_MS; } catch (e) { return false; }
  }
  function markApiDown() { try { root.sessionStorage.setItem(API_DOWN_KEY, String(Date.now())); } catch (e) {} }

  /** GET url -> parsed JSON. Rejects on HTTP errors and on non-JSON answers (a static host may answer a missing /api route with an HTML page). */
  function fetchJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var ct = (r.headers && r.headers.get && r.headers.get('content-type')) || '';
      if (ct && ct.indexOf('json') === -1) throw new Error('not JSON (' + ct + ')');
      return r.json();
    });
  }

  /** 1st choice: /api/catalog (lib/products.js + live prices + real sales ranking). */
  function loadFromApi() {
    if (apiSkipped()) return Promise.reject(new Error('catalog API skipped'));
    /* no-store + a changing query string: neither the browser nor a CDN may hand back an old copy of the catalog */
    return fetchJson(ENDPOINT + '?_=' + Date.now()).then(function (d) {
      if (!d || !Array.isArray(d.products)) throw new Error('unexpected /api/catalog answer');
      if (!d.products.length) { var e = new Error('/api/catalog returned no products'); e.keepApi = true; throw e; }
      return d;
    }, function (err) { markApiDown(); throw err; });
  }

  /** Firebase /products record -> the same public shape /api/catalog returns (explicit fields only, legacy / deleted / unpriced records dropped).
   *  Bestsellers without a stored bestsellerRank are ranked after the ranked ones, by id. */
  function fromFirebase(obj) {
    var out = [], maxRank = 0;
    Object.keys(obj || {}).forEach(function (k) {
      var p = obj[k];
      if (!p || typeof p !== 'object' || p._deleted) return;
      var price = num(p.price);
      if (!p.name || price === null || !(price > 0) || LEGACY_NAMES.indexOf(String(p.name)) !== -1) return;
      var orig = num(p.originalPrice != null ? p.originalPrice : p.oldPrice);
      var promo = p.promoEnabled !== false && orig !== null && orig > price;
      var fi = flagInfo(p), rank = fi.rank;
      if (rank !== null && rank > maxRank) maxRank = rank;
      out.push({ id: p.id != null ? p.id : k, name: String(p.name), category: p.category || '', price: price, desc: p.desc || '', oldPrice: promo ? orig : null,
        bestseller: fi.is, bestsellerRank: rank, bestsellerLabel: fi.label, flag: fi.flag, rating: num(p.rating), salesCount: num(p.salesCount) });
    });
    out.filter(function (p) { return p.bestseller && p.bestsellerRank === null; })
      .sort(function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); })
      .forEach(function (p) { p.bestsellerRank = ++maxRank; });
    return out;
  }

  /** 2nd choice: the Realtime Database over plain REST (the storefront already reads /products from the same database). */
  function loadFromFirebase() {
    return fetchJson(FIREBASE_URL + '/products.json').then(function (obj) {
      var list = fromFirebase(obj);
      if (!list.length) throw new Error('Firebase REST returned no products');
      return { source: 'firebase', products: list };
    });
  }

  /** Promise<product[]>. Resolves [] (never rejects) when neither source is reachable; the page then keeps using its own data. */
  function load() {
    if (serverList) return Promise.resolve(serverList);
    if (pending) return pending;
    if (typeof fetch !== 'function') return Promise.resolve([]);
    pending = loadFromApi()
      .catch(function (err) {
        if (root.console && console.info) console.info('Bestsellers: /api/catalog unavailable (' + (err && err.message) + '), reading Firebase REST instead.');
        return loadFromFirebase();
      })
      .then(function (d) {
        serverList = d.products;
        rankingSource = d.source || null;
        if (rankingSource === 'fallback' && root.console && console.info) console.info('Bestsellers: no store sales logged yet, showing the initial ranking from lib/products.js.');
        pending = null; return serverList;
      })
      .catch(function (err) { console.warn('Bestseller data unavailable, using storefront data.', err); pending = null; return []; });
    return pending;
  }

  /** Branded neutral placeholder (inline SVG, so it can never fail to load): obsidian, gold ring, NIKORA wordmark. */
  var PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%2317141c'/><stop offset='1' stop-color='%230B0B0E'/></linearGradient></defs><rect width='400' height='400' fill='url(%23g)'/><circle cx='200' cy='168' r='58' fill='none' stroke='%23C89B54' stroke-width='3' opacity='.85'/><circle cx='200' cy='168' r='40' fill='none' stroke='%23C89B54' stroke-width='1.5' opacity='.45'/><text x='200' y='262' text-anchor='middle' font-family='Playfair Display,Georgia,serif' font-size='34' font-weight='600' letter-spacing='6' fill='%23F7F4F0'>NIK<tspan fill='%23C89B54' font-style='italic' font-weight='500'>ORA</tspan></text><text x='200' y='296' text-anchor='middle' font-family='Montserrat,Arial,sans-serif' font-size='11' letter-spacing='3' fill='%23C89B54' opacity='.8'>PHOTO COMING SOON</text></svg>";

  /** The photos stored on the product in Firebase (`images`: array or {0:..,1:..} object), trimmed and de-duplicated, in order.
   *  Any number of photos (1..N) is shown exactly as saved. Returns [] when images is missing, null or empty; there is NO fallback
   *  to lib/products.js and no minimum photo count. */
  function ownImages(p) {
    var v = p && p.images, seen = {}, out = [];
    if (v && typeof v === 'object' && !Array.isArray(v)) v = Object.keys(v).sort(function (a, c) { return Number(a) - Number(c); }).map(function (k) { return v[k]; });
    if (!Array.isArray(v)) return [];
    v.forEach(function (u) { if (typeof u !== 'string') return; u = u.trim(); if (u && !seen[u]) { seen[u] = true; out.push(u); } });
    return out;
  }

  /** True when the Firebase record carries its own price. The admin panel writes price / oldPrice there, so those are the LIVE values. */
  function hasLivePrice(p) { var n = num(p && p.price); return n !== null && n > 0; }

  /** Copy of p with the server record s laid over it; images stay the admin's own list when it has one.
   *  PRICES: when the Firebase record has a price it wins over /api/catalog (a stale or cached server answer used to overwrite
   *  an admin price edit with the built-in default). The server price is only the fallback for products without a Firebase price. */
  function overlayRecord(p, s) {
    var o = {}, k, live = hasLivePrice(p);
    for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) o[k] = p[k];
    SERVER_FIELDS.forEach(function (f) { if (live && (f === 'price' || f === 'oldPrice')) return; o[f] = s[f]; });
    /* BESTSELLER FIX: a product the admin flagged in Firebase (bestseller: true) stays a bestseller even when the server ranking
       (real sales / the built-in fallback table) does not list it. The server can ADD bestsellers; it can no longer silently erase the admin's own. */
    /* BADGE FIX: the two sources are OR-merged, never replaced. The server ranking (real sales) wins the rank / label when it knows the product as a
       bestseller; the product's own flag (Firebase / catalog.json: bestseller, isBestseller or `flag`) survives whenever the server does not list it. */
    var own = flagInfo(p), srv = flagInfo(s);
    if (srv.is) {
      o.bestseller = true;
      o.bestsellerRank = srv.rank !== null ? srv.rank : own.rank;
      o.bestsellerLabel = srv.label || own.label;
    } else if (own.is) {
      o.bestseller = true;
      o.bestsellerRank = own.rank;
      o.bestsellerLabel = own.label;
      o._bestsellerManual = true;
    } else { o.bestseller = false; o.bestsellerRank = null; o.bestsellerLabel = null; }
    if (own.flag) o.flag = own.flag; else if (srv.flag) o.flag = srv.flag;
    var mine = ownImages(p);
    o.images = mine; o.img = mine[0] || '';          /* Firebase photos only; empty means the placeholder is shown */
    return o;
  }

  /** Admin-flagged bestsellers that the server ranking does not know get a rank AFTER the server-ranked ones (admin rank, then id), so the order is
   *  always 1, 2, 3 ... with no duplicate ranks. Mutates and returns the list. */
  function rankManualBestsellers(list) {
    var max = 0, manual = [];
    list.forEach(function (p) {
      if (!p || !p.bestseller) return;
      if (p._bestsellerManual) manual.push(p);
      else { var r = num(p.bestsellerRank); if (r !== null && r > max) max = r; }
    });
    manual.sort(function (a, b) {
      var ra = num(a.bestsellerRank), rb = num(b.bestsellerRank);
      if (ra === null) ra = Infinity;
      if (rb === null) rb = Infinity;
      return (ra - rb) || (Number(a.id) - Number(b.id)) || 0;
    });
    /* BADGE FIX: an admin / catalog rank is kept when no server-ranked product already holds it (so the flagged "Bestseller #1" stays #1);
       only colliding or missing ranks are appended after the highest used rank. */
    var used = {};
    list.forEach(function (p) { if (p && p.bestseller && !p._bestsellerManual) { var r = num(p.bestsellerRank); if (r !== null) used[r] = true; } });
    manual.forEach(function (p) {
      var r = num(p.bestsellerRank);
      if (r === null || used[r]) { while (used[++max]) {} r = max; }
      used[r] = true; if (r > max) max = r;
      p.bestsellerRank = r; delete p._bestsellerManual;
    });
    return list;
  }

  /** Overlays lib/products.js data onto a storefront list. Server wins for name, category, price, images and all rank fields;
   *  Firebase keeps desc / oldPrice / lowStock. Products missing from lib/products.js lose their bestseller flag. No-op until load() succeeded. */
  function apply(list) {
    list = Array.isArray(list) ? list : [];
    /* BADGE FIX: normalise the flags BEFORE the server answer arrives, so the very first render (local cache / Firebase) already carries
       bestseller / bestsellerRank / bestsellerLabel / flag and the later re-render with /api/catalog data keeps the same values. */
    list = list.map(stampFlags);
    if (!serverList || !serverList.length) return list;
    var byId = {}, seen = {}, k;
    serverList.forEach(function (s) { byId[String(s.id)] = s; });
    var out = list.map(function (p) {
      if (!p) return p;
      var s = byId[String(p.id)], o = {};
      for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) o[k] = p[k];
      if (!s) {
        /* BESTSELLER FIX: a product that exists only in Firebase (added from the admin panel, so not in lib/products.js) used to lose its
           bestseller flag here. It now keeps the flag the admin set; rankManualBestsellers() below orders it after the server-ranked ones. */
        var fi = flagInfo(p);
        o.bestseller = fi.is;
        o.bestsellerRank = fi.rank;
        o.bestsellerLabel = fi.label;
        if (fi.flag) o.flag = fi.flag;
        if (o.bestseller) o._bestsellerManual = true;
        return o;
      }
      seen[String(p.id)] = true;
      return overlayRecord(p, s);
    });
    serverList.forEach(function (s) {
      if (seen[String(s.id)]) return;
      var o = { desc: '' };
      for (k in s) if (Object.prototype.hasOwnProperty.call(s, k)) o[k] = s[k];
      o.images = []; o.img = '';                   /* never carry lib/products.js photos into the storefront */
      out.push(o);
    });
    return rankManualBestsellers(out);
  }

  /** One product with lib/products.js data laid over it (name, category, price, was-price, description, images, rank fields).
   *  Used by product.html so the detail page shows exactly what the home page and catalog show. Returns the same object until load() has succeeded. */
  function overlayOne(p) {
    if (!p) return p;
    if (!serverList || !serverList.length) return stampFlags(p);
    var s = get(p.id), o = {}, k;
    if (s) { o = overlayRecord(p, s); delete o._bestsellerManual; return o; }
    for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) o[k] = p[k];
    var fi = flagInfo(p);                                       /* admin-only product: keep the admin's own flag */
    o.bestseller = fi.is; o.bestsellerRank = fi.rank; o.bestsellerLabel = fi.label; if (fi.flag) o.flag = fi.flag;
    return o;
  }

  /* ---- stock / urgency (same rules as stockStateOf() in lib/products.js) ----
   * Fields on the Firebase product: stockCount (real units), lowStockThreshold (1..99, default 6), scarcityMode (false = badges off),
   * stockStatus ('in' | 'low' | null), lowStock (legacy). Returns { state: 'in' | 'low' | 'out', left, label }. */
  var DEFAULT_LOW_THRESHOLD = 6;
  function stockOf(p) {
    p = p || {};
    var c = num(p.stockCount); c = (c !== null && c >= 0) ? Math.floor(c) : null;
    var t = num(p.lowStockThreshold); t = (t !== null && t >= 1 && t <= 99) ? Math.floor(t) : DEFAULT_LOW_THRESHOLD;
    if (c === 0) return { state: 'out', left: 0, label: 'Sold out' };
    if (p.stockStatus === 'in' || p.scarcityMode === false) return { state: 'in', left: c, label: '' };
    if (c !== null && c <= t) return { state: 'low', left: c, label: 'Only ' + c + ' left in stock' };
    if (p.stockStatus === 'low' || (c === null && p.lowStock === true)) return { state: 'low', left: null, label: 'Low stock' };
    return { state: 'in', left: c, label: '' };
  }

  /** Sort comparator: bestsellerRank 1, 2, 3 ... then unranked products by id. */
  function compare(a, b) {
    var ra = num(a.bestsellerRank), rb = num(b.bestsellerRank);
    if (ra === null) ra = Infinity;
    if (rb === null) rb = Infinity;
    return (ra - rb) || (Number(a.id) - Number(b.id));   // Infinity - Infinity is NaN, which falls through to the id compare
  }
  /** Only the "Bundles & Sets" products (e.g. #11), best rank first, then by id. */
  function bundles(list) { return (list || []).filter(function (p) { return p && p.category === BUNDLE_CATEGORY; }).sort(compare); }

  /** Only bestsellers, best rank first. */
  function ranked(list) { return (list || []).filter(function (p) { return p && p.bestseller; }).sort(compare); }

  /** Badge texts for a product, e.g. ['BESTSELLER', 'TOP BUNDLE']. TOP RATED needs a real rating, so it stays hidden while rating is null. */
  function badges(p) {
    var out = [], fi = flagInfo(p);
    if (fi.is) {
      out.push('BESTSELLER');
      if (fi.label && !/bestseller/i.test(fi.label)) out.push(String(fi.label).toUpperCase());     /* e.g. '#3', '#2 BUNDLE', 'TRENDING' */
    }
    var r = num(p.rating);
    if (r !== null && r >= TOP_RATED_MIN) out.push('TOP RATED');
    return out;
  }

  /** The server's record (from lib/products.js) for one product id, or null until load() has succeeded. */
  function get(id) {
    if (!serverList) return null;
    for (var i = 0; i < serverList.length; i++) if (String(serverList[i].id) === String(id)) return serverList[i];
    return null;
  }

  /** Always at least one URL: the product's own Firebase photos, otherwise the placeholder. */
  function imagesOf(p) {
    var own = ownImages(p);
    return own.length ? own : [PLACEHOLDER];
  }
  function thumbUrl(u, size) {
    u = String(u); size = size || 120;
    if (u.indexOf('images.unsplash.com') === -1) return u;
    var parts = u.split('?'), m = (parts[1] || '').match(/crop=([a-z]+)/);
    return parts[0] + '?w=' + size + '&h=' + size + '&fit=crop&crop=' + (m ? m[1] : 'entropy') + '&q=70';
  }
  /** Thumbnail strip (empty string when the product has a single image). */
  function thumbsHtml(p) {
    var imgs = imagesOf(p);
    if (imgs.length < 2) return '';
    return '<div class="bs-thumbs" role="group" aria-label="Product images">' + imgs.map(function (src, i) {
      return '<button type="button" class="bs-thumb' + (i === 0 ? ' is-active' : '') + '" data-src="' + esc(src) + '" aria-label="Show image ' + (i + 1) + ' of ' + imgs.length + '">' +
        '<img src="' + esc(thumbUrl(src)) + '" alt="" loading="lazy" draggable="false"></button>';
    }).join('') + '</div>';
  }

  /** A photo that fails to load (img onerror): thumbnails are removed; a failed hero switches to the next working photo or the placeholder.
   *  Never throws, never loops (the placeholder is an inline SVG). */
  function imgFail(img) {
    if (!img || !img.getAttribute || img.getAttribute('src') === PLACEHOLDER) return;
    var card = img.closest && img.closest('[data-bs-card]');
    if (img.hasAttribute('data-bs-main')) {
      var bad = img.getAttribute('data-bs-src0'), next = PLACEHOLDER, t = card ? card.querySelectorAll('.bs-thumb') : [], i;
      for (i = 0; i < t.length; i++) { var s0 = t[i].getAttribute('data-src'); if (s0 && s0 !== bad && s0 !== img.getAttribute('src')) { next = s0; break; } }
      img.setAttribute('data-bs-src0', next); img.setAttribute('src', next);
      return;
    }
    var btn = img.closest && img.closest('.bs-thumb');
    if (!btn) return;
    var strip = btn.parentNode, failed = btn.getAttribute('data-src');
    if (strip) strip.removeChild(btn);
    if (strip && strip.querySelectorAll('.bs-thumb').length < 2) strip.style.display = 'none';
    var m = card && card.querySelector('[data-bs-main]');
    if (m && m.getAttribute('src') === failed) imgFail(m);
  }
  root.NKImgFail = imgFail;

  function setImage(card, src) {
    var img = card.querySelector('[data-bs-main]');
    if (!img || !src) return;
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    var t = card.querySelectorAll('.bs-thumb');
    for (var i = 0; i < t.length; i++) t[i].classList.toggle('is-active', t[i].getAttribute('data-src') === src);
  }
  /** Hover / focus / tap a thumbnail to swap the main image; leaving the card restores image 1. Needs [data-bs-card] on the card and [data-bs-main][data-bs-src0] on its main <img>. Safe to call repeatedly. */
  function bindGallery(rootEl) {
    if (!rootEl || rootEl.getAttribute('data-bs-bound')) return;
    rootEl.setAttribute('data-bs-bound', '1');
    function show(e) {
      var t = e.target.closest && e.target.closest('.bs-thumb');
      var card = (t || e.target).closest && (t || e.target).closest('[data-bs-card]');
      if (!card) return;
      if (t) { setImage(card, t.getAttribute('data-src')); return; }
      /* hovering the card's own image previews the 2nd image (unless a thumbnail was already chosen) */
      if (e.type === 'mouseover' && e.target.closest('.bs-media, .card-media')) {
        var th = card.querySelectorAll('.bs-thumb'), img = card.querySelector('[data-bs-main]');
        if (th.length > 1 && img && img.getAttribute('src') === img.getAttribute('data-bs-src0')) setImage(card, th[1].getAttribute('data-src'));
      }
    }
    rootEl.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'IMG') imgFail(e.target); }, true);   /* error events do not bubble: capture them */
    rootEl.addEventListener('mouseover', show);
    rootEl.addEventListener('focusin', show);
    rootEl.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.bs-thumb')) { e.preventDefault(); show(e); } });
    rootEl.addEventListener('mouseout', function (e) {
      var card = e.target.closest && e.target.closest('[data-bs-card]');
      if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
      var img = card.querySelector('[data-bs-main]');
      if (img) setImage(card, img.getAttribute('data-bs-src0'));
    });
  }

  var api = { stockOf: stockOf, placeholder: PLACEHOLDER, imgFail: imgFail, source: function () { return rankingSource; }, ownImages: ownImages, overlayOne: overlayOne, bundles: bundles, load: load, get: get, thumbUrl: thumbUrl, apply: apply, compare: compare, ranked: ranked, badges: badges, imagesOf: imagesOf, thumbsHtml: thumbsHtml, bindGallery: bindGallery, esc: esc };
  api.flagInfo = flagInfo; api.stampFlags = stampFlags;
  root.NKBestsellers = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; api._setServerList = function (l) { serverList = l; }; }
})(typeof window !== 'undefined' ? window : this);
