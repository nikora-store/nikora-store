/**
 * shipping-rules.js - the ONE place that defines NIKORA's shipping rules. Loaded by every storefront page, the cart drawers and checkout.html.
 *
 *   Cost:      orders of $50.00 and above ship FREE (Express); below $50.00 a flat $4.99 is charged ONCE per order, even when the order ships in 2 packages.
 *              The amount compared is the payable subtotal after any promo discount, before tax.
 *
 *   Two fulfilment groups (split shipping):
 *     'us'  US Hardware & Devices (wands, rollers, sculptors, massagers, LED face masks) fulfilled from a United States warehouse (US to US), supplied by QKsource (SPUs are kept in lib/products.js).
 *           "US Express Shipping: 3-7 business days (1-3 days processing)"
 *     'dk'  K-Beauty skincare, delivered through Delivered Korea (Suite A03231, Busan Hub, South Korea).
 *           "International Express: 5-10 business days (2-4 days processing)"
 *   A product belongs to a group by (first match wins): item.shipFrom ('us' | 'kr' | 'mixed') -> known product id -> category / brand / name.
 *   The bundle (id 10, Glass Skin Ritual Set) contains a wand + K-Beauty, so it ships as 2 packages (one per group).
 *   Products added later in the admin panel: set the category to a device category ("Facial Wand", "Cooling Therapy", "Beauty Tech & Masks")
 *   or tick shipFrom = 'us' and they are picked up automatically. Anything else is treated as K-Beauty skincare.
 *
 * LIVE SETTINGS (admin -> Site settings & CMS -> "Holiday themes & shipping", saved in Firebase /site_content):
 *   shipping_mode            '' / 'threshold'  = free over the threshold, otherwise the flat rate   |   'free_all' = free Express shipping on every order
 *   shipping_threshold       the free-shipping minimum in dollars (default 50)
 *   holiday_text_enabled     true = the top announcement bar shows the holiday message below (replaces announcement_text)
 *   holiday_text_preset      id of a preset message (see NKShipping.PRESETS)  |  holiday_text_custom = own text, wins over the preset.
 *                            Tokens: {ship} "free Express shipping on orders of $50 or more", {Ship} (capitalised), {threshold} "$50", {flat} "$4.99"
 * Every part of the storefront reads these through this file: cart drawer (renderProgress), top bar (nav.js -> promoText), checkout (cost, checkoutSub),
 * product pages (productLine). Any element can also follow the settings with <span data-nk-ship="headline|sentence|threshold|badge|checkout|promo"></span>.
 * Server code can call NKShipping.configure(siteContentObject) and then NKShipping.cost(amount).
 *
 * Keep these numbers identical to the server's own shipping calculation (the checkout API), which is the amount actually charged.
 */
(function (root) {
  'use strict';
  var FREE_AT = 50, FLAT = 4.99, MODE = 'threshold';   /* FREE_AT and MODE follow the admin settings (see LIVE SETTINGS) */
  var SUPPLIERS = {
    us: { name: 'US Warehouse', source: 'QKsource', what: 'hardware & devices', hub: 'United States Warehouse', origin: 'United States (US to US fulfillment)', process: [1, 3], transit: [3, 7], carriers: 'US express carriers' },
    dk: { name: 'Delivered Korea', what: 'K-Beauty skincare', hub: 'Suite A03231, Busan Hub', origin: 'Busan, South Korea', process: [2, 4], transit: [5, 10], carriers: 'FedEx, DHL or K-Packet' }
  };
  var ORDER = ['us', 'dk'];
  /* Known ids (legacy numeric ids and slugs). Anything not listed is classified by shipFrom / category / brand / name, then defaults to 'dk'. */
  var MAP = { '1': ['dk'], '2': ['dk'], '3': ['dk'], '4': ['dk'], '5': ['dk'], '6': ['dk'], '7': ['dk'],
    '8': ['us'], '9': ['us'], '10': ['us', 'dk'], '25': ['us'], '26': ['us'],
    '11': ['dk'], '12': ['dk'], '13': ['dk'], '14': ['dk'], '15': ['dk'], '16': ['dk'], '17': ['dk'], '18': ['dk'], '19': ['dk'], '20': ['dk'], '21': ['dk'], '22': ['dk'], '23': ['dk'],
    '24': ['us'],
    'nikora-booster-wand': ['us'], 'nikora-cryo-globe': ['us'], 'nikora-glass-skin-bundle': ['us', 'dk'], 'nikora-hello-face-led-mask': ['us'], 'nikora-ice-roller-set': ['us'], 'nikora-4in1-skin-massager': ['us'] };
  var US_CATEGORY = /^(facial wand|cooling therapy|beauty tech( & masks)?|beauty-tech|led masks?|microcurrent devices?|wands?|rollers?|ice rollers?|massagers?|skin massagers?|sculptors?|devices?)$/i;
  var US_NAME = /\bLED\b.*\bmask\b|\b(wand|roller|sculptor|ice globe|microcurrent|massager)\b/i;
  var LS = 'nk_ship_groups';

  function money(n) { return '$' + Number(n).toFixed(2); }
  function rng(r) { return r[0] + '\u2013' + r[1]; }
  function total(k) { var s = SUPPLIERS[k || 'dk'] || SUPPLIERS.dk; return [s.process[0] + s.transit[0], s.process[1] + s.transit[1]]; }
  /** The exact customer-facing terms line of a group. */
  function terms(k) {
    return k === 'us' ? 'US Express Shipping: ' + rng(SUPPLIERS.us.transit) + ' business days (' + rng(SUPPLIERS.us.process) + ' days processing)'
                      : 'International Express: ' + rng(SUPPLIERS.dk.transit) + ' business days (' + rng(SUPPLIERS.dk.process) + ' days processing)';
  }

  /* groups remembered from product pages, so admin-added products keep their group in the cart on other pages */
  function learned() { try { return JSON.parse(root.localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } }
  function learn(list) {
    if (!list) return;
    var all = learned(), changed = false;
    [].concat(list).forEach(function (p) {
      if (!p || typeof p !== 'object' || p.id == null) return;
      var g = classify(p, true);
      if (g && String(all[p.id]) !== g.join(',')) { all[p.id] = g.join(','); changed = true; }
    });
    if (changed) { try { root.localStorage.setItem(LS, JSON.stringify(all)); } catch (e) {} }
  }
  function classify(it, ignoreMemory) {
    var id = (it && typeof it === 'object') ? it.id : it, key = id == null ? '' : String(id), o = (it && typeof it === 'object') ? it : {};
    if (o.shipFrom === 'us') return ['us'];
    if (o.shipFrom === 'mixed') return ['us', 'dk'];
    if (o.shipFrom === 'kr' || o.shipFrom === 'dk') return ['dk'];
    if (MAP[key]) return MAP[key].slice();
    if (!ignoreMemory) { var m = learned()[key]; if (m) return m.split(','); }
    if (US_CATEGORY.test(String(o.category || '').trim()) || /^NIKORA (Beauty )?Tech$/i.test(String(o.brand || '').trim())) return ['us'];
    if (o.name && US_NAME.test(String(o.name))) return ['us'];
    return ['dk'];
  }
  function groupsOf(it) { return classify(it); }
  /** Shipping fee for a payable amount (after discount): 0 from the threshold (or always in free_all mode), else 4.99. Cent-exact. */
  function cost(amount) {
    if (MODE === 'free_all') return 0;
    return Math.round((Number(amount) || 0) * 100) >= Math.round(FREE_AT * 100) ? 0 : FLAT;
  }
  /** Package keys needed by a list of cart items, in fixed order ['us','dk']; [] for an empty cart. */
  function packagesOf(items) {
    if (!items || !items.length) return [];
    var seen = {};
    items.forEach(function (it) { classify(it).forEach(function (g) { seen[g] = 1; }); });
    return ORDER.filter(function (g) { return seen[g]; });
  }
  function suppliersOf(items) { return items ? packagesOf(items) : ORDER.slice(); }
  /** [{key, name, what, total:[min,max]}] for a cart. */
  function shipmentsOf(items) {
    return packagesOf(items).map(function (k) { return { key: k, name: SUPPLIERS[k].name, what: SUPPLIERS[k].what, total: total(k) }; });
  }
  /** Notice for orders that ship in more than one package. */
  function multiPackageNotice() { return 'Orders containing items from multiple fulfillment facilities may arrive in separate packages with individual tracking numbers.'; }

  /** Badge / terms text for one product (or a cart): the exact terms line, both lines joined for a 2-package item. */
  function badge(it) {
    var g = it && it.length != null && typeof it !== 'string' ? packagesOf(it) : classify(it);
    return g.map(terms).join(' + ');
  }
  /** 'processing' wording for stock lines, e.g. "1-3 business days". */
  function processText(it) {
    var g = classify(it), lo = 99, hi = 0;
    g.forEach(function (k) { lo = Math.min(lo, SUPPLIERS[k].process[0]); hi = Math.max(hi, SUPPLIERS[k].process[1]); });
    return rng([lo, hi]) + ' business days';
  }
  /** Short sentence used on cards, the cart drawer and checkout. */
  function pipelineShort(it) {
    var g = classify(it);
    if (g.length > 1) return 'Ships in 2 packages \u00b7 ' + badge(it);
    return g[0] === 'us' ? 'Ships from our US warehouse \u00b7 ' + terms('us') : 'Ships from Busan Hub (' + SUPPLIERS.dk.name + ') \u00b7 ' + terms('dk');
  }
  /** One-line estimate for a product card / page. Never null. */
  function cardLine(it) {
    var g = classify(it);
    if (g.length > 1) return 'Ships in 2 packages: ' + badge(it);
    return g[0] === 'us' ? terms('us') : terms('dk');
  }
  /** Product page "Shipping Details" policy text. */
  function productLine(it) {
    var g = classify(it), fee = feeLine();
    var us = 'Ships from our United States warehouse (US to US fulfillment): ' + terms('us') + '.';
    var dk = 'Ships from our Busan Hub (' + SUPPLIERS.dk.name + '): ' + terms('dk') + ' (' + SUPPLIERS.dk.carriers + ').';
    if (g.length > 1) return 'This set ships in 2 separate packages, each with its own tracking number. ' + us + ' ' + dk + ' ' + fee;
    return (g[0] === 'us' ? us : dk) + ' ' + fee;
  }
  /** One-line note under the cart drawer's free-shipping bar. */
  function cartNote(items) {
    var p = packagesOf(items);
    if (!p.length) return '';
    if (p.length > 1) return 'Ships in 2 separate packages \u2014 shipping fee applies only once.';
    return p[0] === 'us' ? 'Ships from our US warehouse \u00b7 ' + terms('us') : 'Ships from Busan Hub (' + SUPPLIERS.dk.name + ') \u00b7 ' + terms('dk');
  }
  /** Updates a cart drawer's free-shipping progress (text + bar + fulfilment note). payable = subtotal after discount. */
  function renderProgress(textEl, fillEl, payable, count, items, icons) {
    if (!textEl || !fillEl) return;
    var all = MODE === 'free_all';
    var cents = Math.round((Number(payable) || 0) * 100), thr = Math.round(FREE_AT * 100);
    var unlocked = all || cents >= thr, pct = all ? 100 : Math.min(100, Math.round(cents / thr * 100));
    fillEl.style.width = pct + '%';
    textEl.classList.toggle('unlocked', unlocked);
    fillEl.classList.toggle('unlocked', unlocked);
    var bar = fillEl.parentNode;
    if (bar) { bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(pct)); bar.setAttribute('aria-label', all ? 'Free Express shipping on every order' : 'Progress toward free Express shipping'); }
    var msg = all ? (count > 0 ? 'You\u2019ve unlocked FREE Express Shipping \u2014 free on every order!' : headline())
      : unlocked ? 'You\u2019ve unlocked FREE Express Shipping!'
      : (count > 0 ? 'Add ' + money((thr - cents) / 100) + ' more to unlock FREE Express Shipping (otherwise ' + money(FLAT) + ' flat rate)' : headline());
    textEl.innerHTML = (icons ? icons[unlocked ? 'check' : 'truck'] : '') + msg;
    var note = document.getElementById('ship-split-note');
    if (!note && textEl.parentNode && bar) { note = document.createElement('div'); note.id = 'ship-split-note'; note.className = 'ship-split-note'; textEl.parentNode.insertBefore(note, bar.nextSibling); }
    if (note) { var t = count > 0 ? cartNote(items) : ''; note.textContent = t; note.hidden = !t; }
  }

  /* ---------------- live settings from the admin (Firebase /site_content) ---------------- */
  var CFG_KEY = 'nk_ship_cfg_v1';
  var SITE_KEYS = ['shipping_mode', 'shipping_threshold', 'holiday_text_enabled', 'holiday_text_preset', 'holiday_text_custom'];
  var PRESETS = [        /* [id, label, text]  -  keep in sync with the list in the admin's "Holiday themes & shipping" panel */
    ['', 'Default shipping message', '{Ship}.'],
    ['winter', 'Winter sale', 'Winter wonderland sale \u2014 {ship}.'],
    ['newyear', 'New Year', 'Happy New Year from NIKORA \u2014 {ship}. Start the year glowing.'],
    ['blackfriday', 'Black Friday', 'Black Friday is here \u2014 our best offers of the year, plus {ship}.'],
    ['cybermonday', 'Cyber Monday', 'Cyber Monday \u2014 last chance for our best offers, plus {ship}.'],
    ['valentines', 'Valentine\u2019s Day', 'Give the gift of glow this Valentine\u2019s Day \u2014 {ship}.'],
    ['halloween', 'Halloween', 'Treat your skin this Halloween \u2014 {ship}.'],
    ['autumn', 'Autumn', 'Cozy autumn glow \u2014 {ship}.'],
    ['spring', 'Spring / Cherry blossom', 'Spring glow-up is here \u2014 fresh offers and {ship}.'],
    ['holiday', 'Happy holidays', 'Happy holidays from NIKORA \u2014 {ship}.']
  ];
  var cfg = { mode: 'threshold', threshold: 50, holidayText: false, preset: '', custom: '' }, cfgKey = '', siteRaw = {}, draftRaw = {};

  function moneyShort(n) { n = Number(n) || 0; return '$' + (Math.round(n) === n ? String(n) : n.toFixed(2)); }
  /** "free Express shipping on orders of $50 or more"  /  "free Express shipping on every order" */
  function sentence(cap) {
    var t = MODE === 'free_all' ? 'free Express shipping on every order' : 'free Express shipping on orders of ' + moneyShort(FREE_AT) + ' or more';
    return cap ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  }
  function headline() { return MODE === 'free_all' ? 'FREE Express Shipping on every order' : 'FREE Express Shipping on orders of ' + money(FREE_AT) + '+ \u00b7 ' + money(FLAT) + ' flat rate below'; }
  function feeLine() { return MODE === 'free_all' ? 'Express shipping is FREE on every order.' : 'Express shipping is FREE on orders of ' + money(FREE_AT) + '+, otherwise a ' + money(FLAT) + ' flat rate per order.'; }
  function checkoutSub() {
    return 'Complete your order in just a couple of minutes. ' + (MODE === 'free_all' ? 'Free Express shipping on every order.' : 'Free Express shipping on orders of ' + money(FREE_AT) + ' and above, a flat ' + money(FLAT) + ' below that.');
  }
  function badgeLine() { return MODE === 'free_all' ? 'Free on every order' : 'Free on orders of ' + moneyShort(FREE_AT) + '+, flat ' + money(FLAT) + ' below'; }
  function fill(t) {
    return String(t).replace(/\{Ship\}/g, sentence(true)).replace(/\{ship\}/g, sentence(false)).replace(/\{threshold\}/g, moneyShort(FREE_AT)).replace(/\{flat\}/g, money(FLAT));
  }
  /** The holiday message for the top announcement bar ('' when the admin has it switched off). */
  function promoText() {
    if (!cfg.holidayText) return '';
    var t = cfg.custom;
    if (!t) { for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i][0] === cfg.preset) { t = PRESETS[i][2]; break; } }
    return fill(t || PRESETS[0][2]).slice(0, 300);
  }
  function paintHooks() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    var list = document.querySelectorAll('[data-nk-ship]');
    for (var i = 0; i < list.length; i++) {
      var k = list[i].getAttribute('data-nk-ship'), v = k === 'headline' ? headline() : k === 'sentence' ? sentence(true) + '.' : k === 'threshold' ? moneyShort(FREE_AT)
        : k === 'badge' ? badgeLine() : k === 'checkout' ? checkoutSub() : k === 'promo' ? (promoText() || headline()) : null;
      if (v != null && list[i].textContent !== v) list[i].textContent = v;
    }
  }
  function announce() { try { document.dispatchEvent(new CustomEvent('nk:shipping-config', { detail: config() })); } catch (e) {} }
  function config() { return JSON.parse(JSON.stringify(cfg)); }
  function recompute(silent) {
    var c = {}, k;
    for (k in siteRaw) c[k] = siteRaw[k];
    for (k in draftRaw) c[k] = draftRaw[k];
    var n = Number(c.shipping_threshold);
    var next = {
      mode: c.shipping_mode === 'free_all' ? 'free_all' : 'threshold',
      threshold: (isFinite(n) && n >= 1 && n <= 1000) ? Math.round(n * 100) / 100 : 50,
      holidayText: c.holiday_text_enabled === true || c.holiday_text_enabled === 'true',
      preset: typeof c.holiday_text_preset === 'string' ? c.holiday_text_preset : '',
      custom: typeof c.holiday_text_custom === 'string' ? c.holiday_text_custom.trim().slice(0, 300) : ''
    };
    var key = JSON.stringify(next);
    if (key === cfgKey) return;
    cfgKey = key; cfg = next; MODE = next.mode; FREE_AT = next.threshold;
    paintHooks();
    if (!silent) announce();
  }
  /** Feed in the raw /site_content object (or any object holding the keys above). */
  function setSite(c) {
    var next = {};
    c = c || {};
    SITE_KEYS.forEach(function (k) { if (c[k] != null && c[k] !== '') next[k] = c[k]; });
    if (JSON.stringify(next) === JSON.stringify(siteRaw)) return;
    siteRaw = next;
    try { root.localStorage.setItem(CFG_KEY, JSON.stringify(siteRaw)); } catch (e) {}
    recompute();
  }
  function restLoad() {                                  /* fallback when nav.js (NikoraSite) is not on the page */
    if (typeof fetch !== 'function' || typeof Promise === 'undefined') return;
    var base = 'https://nikora-store-default-rtdb.firebaseio.com/site_content.json?orderBy=' + encodeURIComponent('"$key"');
    Promise.all(['shipping_', 'holiday_text_'].map(function (p) {
      return fetch(base + '&startAt=' + encodeURIComponent('"' + p + '"') + '&endAt=' + encodeURIComponent('"' + p + '\uf8ff"'), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    })).then(function (parts) {
      var all = {}, got = false;
      parts.forEach(function (o) { if (o && typeof o === 'object') { got = true; for (var k in o) all[k] = o[k]; } });
      if (got) setSite(all);
    });
  }
  function onConfig(fn) {
    if (typeof fn !== 'function' || typeof document === 'undefined') return function () {};
    var h = function (e) { try { fn(e.detail || config()); } catch (err) {} };
    document.addEventListener('nk:shipping-config', h);
    return function () { document.removeEventListener('nk:shipping-config', h); };
  }
  function startLive() {
    try { siteRaw = JSON.parse(root.localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (e) { siteRaw = {}; }
    recompute(true);                                     /* first paint from the last known settings */
    var tries = 0;
    (function hook() {
      if (root.NikoraSite && root.NikoraSite.onChange) { root.NikoraSite.onChange(setSite); return; }   /* nav.js keeps /site_content live */
      if (++tries < 40) { setTimeout(hook, 150); return; }
      restLoad(); setInterval(restLoad, 60000);
    })();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { paintHooks(); announce(); });
    else { paintHooks(); setTimeout(announce, 0); }
    /* the admin's live preview sends unsaved edits with postMessage({type:'nk:field', key, value}) */
    root.addEventListener('message', function (e) {
      var m = e && e.data;
      if (!m || m.type !== 'nk:field' || typeof m.key !== 'string' || SITE_KEYS.indexOf(m.key) < 0) return;
      try { if (root.parent === root || e.source !== root.parent) return; } catch (x) { return; }
      draftRaw[m.key] = m.value; recompute();
    });
  }

  if (typeof document !== 'undefined') {
    var st = document.createElement('style');
    st.textContent = '.ship-split-note{margin:8px 0 0;font-size:11.5px;line-height:1.5;color:var(--text-soft,#8a8493)}.ship-split-note[hidden]{display:none}' +
      '.nk-card .nk-ship{margin:-6px 0 12px;font-size:11px;line-height:1.4;color:var(--text-faint,#8a8493)}';
    (document.head || document.documentElement).appendChild(st);
  }
  root.NKShipping = { FLAT: FLAT, SUPPLIERS: SUPPLIERS, MAP: MAP, cost: cost, suppliersOf: suppliersOf, packagesOf: packagesOf, shipmentsOf: shipmentsOf, groupsOf: groupsOf,
    total: total, range: rng, terms: terms, badge: badge, processText: processText, learn: learn, multiPackageNotice: multiPackageNotice,
    cardLine: cardLine, productLine: productLine, cartNote: cartNote, pipelineShort: pipelineShort, renderProgress: renderProgress,
    config: config, configure: setSite, onConfig: onConfig, promoText: promoText, headline: headline, sentence: sentence, checkoutSub: checkoutSub, badgeLine: badgeLine,
    feeLine: feeLine, moneyShort: moneyShort, PRESETS: PRESETS, SITE_KEYS: SITE_KEYS };
  Object.defineProperty(root.NKShipping, 'FREE_AT', { enumerable: true, get: function () { return FREE_AT; } });
  Object.defineProperty(root.NKShipping, 'MODE', { enumerable: true, get: function () { return MODE; } });
  Object.defineProperty(root.NKShipping, 'freeAll', { enumerable: true, get: function () { return MODE === 'free_all'; } });
  if (typeof document !== 'undefined' && root.addEventListener) startLive();
  if (typeof module !== 'undefined' && module.exports) module.exports = root.NKShipping;
})(typeof window !== 'undefined' ? window : this);
