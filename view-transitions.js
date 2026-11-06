/**
 * NIKORA view-transitions.js  -  app-like page navigation + UI state transitions (no dependencies, one file, one <script> tag).
 *
 *   1. PAGE NAVIGATION   Cross-document View Transitions (Chrome 126+, Edge 126+, Safari 18.2+). The store is a multi-page site, so there is no
 *                        API to call: the CSS rule `@view-transition { navigation: auto }` (injected below) opts every page that loads this file in.
 *                        Look: the old page stays put, the new page fades in (opacity only, 220 ms, 160 ms on phones).
 *   2. PRODUCT HERO      catalog / home card photo -> product.html gallery morph (and back, best effort). Only ONE element is ever named, because
 *                        every named element costs a separate GPU layer.
 *   3. UI STATE CHANGES  NKVT.run(update, opts) wraps document.startViewTransition(). Catalog category / concern / sort changes are wired
 *                        automatically: the visible product cards glide to their new grid positions, new ones fade in, removed ones fade out.
 *   4. INSTANT FEEL      Speculation Rules: links are prerendered when the pointer hovers (desktop) or presses (touch), so most navigations are instant.
 *   5. ACCESSIBILITY     prefers-reduced-motion: the @view-transition opt-in is only declared for `no-preference`, NKVT.run() runs the update with no
 *                        transition, and a safety net kills every view-transition animation. Save-Data / 2G skip prerendering.
 *
 * Loading: ONE line in the <head> of each page, as a normal (synchronous) script so the pageswap / pagereveal listeners and the opt-in CSS exist before
 * the first paint:   <script src="view-transitions.js"></script>
 * Do NOT add it to checkout.html (payment page stays untouched: without the opt-in on both pages there is simply no transition into or out of it).
 *
 * Coexistence: animations.js already styles ::view-transition-old/new(root) with `animation:none` for the radial theme transition. Everything here is
 * scoped under html[data-nk-vt] (set only while one of THESE transitions runs), so the theme switch is not affected and vice versa.
 *
 * Optional overrides (define BEFORE this script):  window.NK_VT = { speculation:'prefetch', pageMs:200, ... }   see CFG below.
 */
(function () {
  'use strict';
  if (window.NKVT) return;

  var doc = document, root = doc.documentElement;

  /* ====================================================================== configuration */
  var CFG = {
    pageMs: 220,                    /* new page fade-in (desktop)                                              */
    heroMs: 380,                    /* product photo morph                                                      */
    uiMs: 340,                      /* cards sliding to new grid positions                                      */
    mobilePageMs: 160,              /* the same three on phones (max-width: 768px)                              */
    mobileHeroMs: 320,
    mobileUiMs: 260,
    speculation: 'prerender',       /* 'prerender' | 'prefetch' | false.  Use 'prefetch' if a page has side effects on load                    */
    speculationExclude: ['/checkout*', '/api/*', '/server/*'],
    heroId: 'gallery-main',         /* product.html: the gallery box that receives the card photo                                               */
    cardSelector: '[data-product-id]',                         /* product-card.js article                                                      */
    cardMediaSelector: '.nk-media',                            /* the photo box inside the card                                                */
    catalogIntent: '#category-tabs .cat-tab, #concern-chips .concern-chip, .nk-tag, [data-routine-shop]',   /* clicks that may re-render the grid with a transition */
    catalogGridId: 'product-grid'
  };
  var user = window.NK_VT;
  if (user && typeof user === 'object') { for (var key in user) { if (Object.prototype.hasOwnProperty.call(user, key)) CFG[key] = user[key]; } }

  var HERO = 'nk-product-hero', FLAG = 'nk-vt-shared', MARK = 'data-nk-vtn';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduced() { return !!mq.matches; }
  function noop() {}

  /* ====================================================================== 0. CSS (injected synchronously, so it is there before the first paint) */
  var CSS = [
    ':root{--nk-vt-page:' + CFG.pageMs + 'ms;--nk-vt-hero:' + CFG.heroMs + 'ms;--nk-vt-ui:' + CFG.uiMs + 'ms;--nk-vt-ease:cubic-bezier(.2,.8,.2,1)}',
    '@media (max-width:768px){:root{--nk-vt-page:' + CFG.mobilePageMs + 'ms;--nk-vt-hero:' + CFG.mobileHeroMs + 'ms;--nk-vt-ui:' + CFG.mobileUiMs + 'ms}}',

    /* cross-document opt-in: only for people who have NOT asked for reduced motion */
    '@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}}',
    '@keyframes nk-vt-in{from{opacity:0}to{opacity:1}}',

    /* every named group (the product photo, the grid cards): same easing, duration depends on the kind of transition */
    'html[data-nk-vt]::view-transition-group(*){animation-timing-function:var(--nk-vt-ease)}',
    'html[data-nk-vt="page"]::view-transition-group(*){animation-duration:var(--nk-vt-hero)}',
    'html[data-nk-vt="filter"]::view-transition-group(*),html[data-nk-vt="ui"]::view-transition-group(*){animation-duration:var(--nk-vt-ui)}',

    /* the page itself: the old view stays fully opaque underneath, the new view fades in on top (one animated layer, opacity only,
       no cross-fade dip, and the frosted header never changes pixels while it is being captured) */
    'html[data-nk-vt]::view-transition-group(root){animation:none}',
    'html[data-nk-vt]::view-transition-old(root){animation:none;mix-blend-mode:normal}',
    'html[data-nk-vt]::view-transition-new(root){animation:nk-vt-in var(--nk-vt-page) var(--nk-vt-ease) both;mix-blend-mode:normal}',
    'html[data-nk-vt="filter"]::view-transition-new(root),html[data-nk-vt="ui"]::view-transition-new(root){animation-duration:calc(var(--nk-vt-ui) * .55)}',

    /* product photo: card photo box <-> gallery box. Both are 1:1 with a 20px radius, so this is a pure move + scale */
    'html[data-nk-vt]::view-transition-group(' + HERO + '){overflow:clip;border-radius:20px}',
    'html[data-nk-vt]::view-transition-old(' + HERO + '),html[data-nk-vt]::view-transition-new(' + HERO + '){width:100%;height:100%;object-fit:cover}',

    /* safety net: reduced motion never plays a view-transition animation, whatever opted in */
    '@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none !important}}'
  ].join('\n');

  (function injectCss() {
    if (doc.getElementById('nk-vt-css')) return;
    var st = doc.createElement('style'); st.id = 'nk-vt-css'; st.textContent = CSS;
    (doc.head || root).appendChild(st);
  })();

  /* ====================================================================== helpers */
  function setName(el, name) { if (el && el.style) el.style.setProperty('view-transition-name', name); }
  function clearName(el) { if (el && el.style) { el.style.removeProperty('view-transition-name'); if (el.removeAttribute) el.removeAttribute(MARK); } }
  function sweep() {                                   /* removes every name this file ever set: a duplicate name would abort a transition */
    var list = doc.querySelectorAll('[' + MARK + ']');
    for (var i = 0; i < list.length; i++) clearName(list[i]);
  }
  function inViewport(el) {
    var r = el.getBoundingClientRect(), h = window.innerHeight || root.clientHeight;
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < h;
  }
  function isProductPage() { return /\/product(\.html)?\/?$/i.test(location.pathname); }
  function productIdOf(url) {
    if (!url) return null;
    try {
      var u = new URL(url, location.href);
      if (u.origin !== location.origin || !/\/product(\.html)?\/?$/i.test(u.pathname)) return null;
      return u.searchParams.get('id');
    } catch (e) { return null; }
  }
  function cardMedia(id) {
    var cards = doc.querySelectorAll(CFG.cardSelector), want = String(id);
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-product-id') === want) {
        var m = cards[i].querySelector(CFG.cardMediaSelector);
        if (m) return m;
      }
    }
    return null;
  }
  function heroEl() { return doc.getElementById(CFG.heroId); }
  function setFlag() { try { sessionStorage.setItem(FLAG, String(Date.now())); } catch (e) {} }
  function takeFlag() {
    try {
      var t = Number(sessionStorage.getItem(FLAG)); sessionStorage.removeItem(FLAG);
      return !!t && Date.now() - t < 8000;
    } catch (e) { return false; }
  }
  function fromUrl() {
    try { if (window.navigation && navigation.activation && navigation.activation.from) return navigation.activation.from.url; } catch (e) {}
    return doc.referrer || '';
  }

  /* ====================================================================== 1. CROSS-DOCUMENT NAVIGATION (old page: pageswap, new page: pagereveal) */
  /* Old page: if we are leaving for a product page, the clicked card's photo box becomes the shared element; if we are leaving a product page, its gallery box does. */
  window.addEventListener('pageswap', function (e) {
    var vt = e.viewTransition; if (!vt) return;
    var to = e.activation && e.activation.entry ? e.activation.entry.url : '';
    var id = productIdOf(to), el = null;
    if (id) {
      var m = cardMedia(id);
      if (m && inViewport(m)) { el = m; var card = m.closest ? m.closest(CFG.cardSelector) : null; if (card) card.style.transform = ''; }   /* drop the hover tilt so the morph starts flat */
    }
    if (!el && isProductPage()) { var h = heroEl(); if (h && inViewport(h)) el = h; }
    if (!el) return;
    setName(el, HERO); setFlag();
    function done() { clearName(el); }
    vt.finished.then(done, done);
  });

  /* New page: tag the root (scopes the CSS above), and name the matching element if the old page named one. */
  window.addEventListener('pagereveal', function (e) {
    var vt = e.viewTransition; if (!vt) return;
    root.setAttribute('data-nk-vt', 'page');
    try { if (vt.types && vt.types.add) vt.types.add('nk-page'); } catch (err) {}
    var el = null;
    if (takeFlag()) {
      if (isProductPage()) { var h = heroEl(); if (h && h.getClientRects().length) el = h; }          /* getClientRects: skip while product.html shows its loading state */
      else { var id = productIdOf(fromUrl()); if (id) { var m = cardMedia(id); if (m && inViewport(m)) el = m; } }
    }
    if (el) setName(el, HERO);
    function done() { clearName(el); root.removeAttribute('data-nk-vt'); }
    vt.finished.then(done, done);
    if (vt.ready && vt.ready.catch) vt.ready.catch(noop);
  });

  /* ====================================================================== 2. SAME-DOCUMENT TRANSITIONS: NKVT.run / NKVT.wrap */
  /** Names the cards that are on screen (at most spec.max, default 12) so each one is tracked individually.
   *  spec = { container: selector | element, selector: '.nk-card', key: function(el){...}, max: 12 } */
  function tagItems(spec) {
    var out = [];
    if (!spec) return out;
    var box = typeof spec.container === 'string' ? doc.querySelector(spec.container) : spec.container;
    if (!box) return out;
    var els = box.querySelectorAll(spec.selector || ':scope > *'), max = spec.max || 12, seen = {};
    for (var i = 0; i < els.length && out.length < max; i++) {
      var el = els[i];
      if (!inViewport(el)) continue;
      var k = spec.key ? spec.key(el) : (el.getAttribute('data-product-id') || el.id);
      if (!k) continue;
      var name = 'nk-i-' + String(k).replace(/[^\w-]/g, '_');
      if (seen[name]) continue;
      seen[name] = 1;
      el.setAttribute(MARK, ''); setName(el, name); out.push(el);
    }
    return out;
  }

  var seq = 0;
  /**
   * NKVT.run(update, opts)  runs update() (any DOM change, may return a Promise) inside document.startViewTransition().
   *   opts.type   'filter' | 'ui' (default 'ui')   picks the CSS timing set; written to <html data-nk-vt>
   *   opts.items  { container, selector, key, max } cards to morph individually (see tagItems)
   * Without View Transitions support, with reduced motion, or in a hidden tab, update() simply runs with no transition.
   * Returns a Promise that resolves when the DOM update has finished.
   */
  function run(update, opts) {
    opts = opts || {};
    function plain() { return Promise.resolve().then(update); }
    if (typeof doc.startViewTransition !== 'function' || reduced() || doc.hidden) return plain();

    var id = ++seq, tagged = [], type = opts.type || 'ui';
    function tag() { tagged = tagged.concat(tagItems(opts.items)); }
    function untag() { for (var i = 0; i < tagged.length; i++) clearName(tagged[i]); tagged = []; }
    function finish() { if (seq !== id) return; sweep(); root.removeAttribute('data-nk-vt'); }

    sweep();
    tag();                                                    /* OLD state: the cards as they are now */
    root.setAttribute('data-nk-vt', type);
    var vt;
    try {
      vt = doc.startViewTransition(function () {
        untag();
        return Promise.resolve(update()).then(tag);           /* NEW state: same keys on the re-rendered cards */
      });
    } catch (err) { finish(); return plain(); }
    vt.finished.then(finish, finish);
    if (vt.ready && vt.ready.catch) vt.ready.catch(noop);     /* a skipped transition rejects `ready`; that is not an error for us */
    return vt.updateCallbackDone.then(noop);
  }

  /** NKVT.wrap(obj, 'method', opts)  replaces obj.method with a version that runs through NKVT.run (async: it returns undefined).
   *  opts.when(...args) may return false to call the original immediately (typing, slider drags, background syncs). */
  function wrap(obj, method, opts) {
    var orig = obj && obj[method], o = opts || {};
    if (typeof orig !== 'function' || orig.__nkvt) return false;
    var wrapped = function () {
      var self = this, args = arguments;
      if (typeof o.when === 'function' && !o.when.apply(self, args)) return orig.apply(self, args);
      run(function () { return orig.apply(self, args); }, o);
    };
    wrapped.__nkvt = true;
    obj[method] = wrapped;
    return true;
  }

  /* catalog.html: only deliberate choices (category tab, skin-concern chip / tag, sort menu) animate. Typing in the search box, dragging the price
     slider, the Firebase live sync and the first render all keep calling renderGrid() directly, with no transition. */
  function initCatalog() {
    var grid = doc.getElementById(CFG.catalogGridId);
    if (!grid || typeof window.renderGrid !== 'function') return;
    var last = -Infinity;                                    /* performance.now() starts at navigation, so 0 would count the first render as a click */
    function mark() { last = performance.now(); }
    doc.addEventListener('click', function (e) { var t = e.target; if (t && t.closest && t.closest(CFG.catalogIntent)) mark(); }, true);
    var sort = doc.getElementById('sort-select');
    if (sort) sort.addEventListener('change', mark, true);
    wrap(window, 'renderGrid', {
      type: 'filter',
      items: { container: grid, selector: '.nk-card', max: 12 },
      when: function () { var go = performance.now() - last < 600; last = -Infinity; return go; }
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', initCatalog); else initCatalog();

  /* ====================================================================== 3. SPECULATION RULES (instant navigations) */
  function initSpeculation() {
    var mode = CFG.speculation;
    if (!mode || doc.prerendering) return;
    if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'))) return;
    var c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;       /* never spend a data-saver / slow connection on guesses */
    var rules = {}, list = mode === 'prefetch' ? 'prefetch' : 'prerender';
    rules[list] = [{
      where: { and: [
        { href_matches: '/*' },
        { not: { href_matches: CFG.speculationExclude } },
        { not: { selector_matches: '[rel~="nofollow"],[target="_blank"],[download]' } }
      ] },
      eagerness: 'moderate'                              /* desktop: ~200 ms hover; touch: on press, so nothing is wasted on scrolling */
    }];
    var s = doc.createElement('script'); s.type = 'speculationrules'; s.textContent = JSON.stringify(rules);
    (doc.head || root).appendChild(s);
  }
  try { initSpeculation(); } catch (e) { /* best effort only */ }

  /* ====================================================================== public API */
  window.NKVT = {
    version: '1.0',
    supported: typeof doc.startViewTransition === 'function',
    run: run,
    wrap: wrap,
    tagItems: tagItems,
    config: CFG
  };
})();
