/**
 * NIKORA micro-interactions.js  -  subtle, hover-only luxury effects. Vanilla JS + CSS, no dependencies, one file.
 * Loaded automatically by animations.js (which nav.js already loads on every page).
 *
 *   1. BORDER BEAM    Port of Magic UI "Border Beam" (magicuidesign/magicui). A soft champagne-gold light travels once around the border.
 *                     Hover only. Hosts: bestseller product cards (.nk-card.nk-bs, set by product-card.js), the home hero slider
 *                     (.nk-hs-frame) and the catalog promo banner (.nk-promo). Opt in any element: data-nk-beam.
 *   2. SPOTLIGHT      Port of Magic UI "Spotlight / Magic Card". A soft light follows the cursor over the two banners (.nk-hs-frame, .nk-promo).
 *                     Product cards already have their own spotlight in product-card.js, so they are not given a second one.
 *                     Opt in any element: data-nk-spotlight.
 *   3. MAGNETIC CTAs  Port of the Framer Motion (framer/motion) magnetic-button pattern: pointer offset x pull -> useSpring
 *                     (stiffness 150, damping 15, mass 0.1). Framer Motion is a React library and this site is plain HTML/JS, so the same
 *                     spring physics are integrated here directly (no React, no bundle). Buttons: .nk-add (card "Add to Cart"),
 *                     .btn-add-cart (product page), .cart-checkout (cart drawer "Checkout"), .ck-submit ("Complete Order").
 *                     Opt in: data-nk-magnetic.  Opt out: data-nk-nomagnet.
 *   4. SECTION FADE   Below-the-fold <section>s of <main> fade in once as they scroll into view (opacity only; cards and headings keep
 *                     the slide-up reveal from animations.js). Opt out: data-nk-noreveal.
 *
 * Rules kept: hover only (mouse / pen with hover), nothing on touch screens, everything off for prefers-reduced-motion
 * (the border beam then shows as a static soft gold ring on hover), transform-free beam + spotlight (opacity / offset-distance only, no layout shifts),
 * nothing runs while the pointer is away: the beam animation is paused unless hovered and the magnet loop sleeps when every button is at rest.
 *
 * Switch a feature off before this file loads:  window.NK_FX = { beam:false, spotlight:false, magnetic:false, sections:false };
 * Opt out of every effect on one element:        data-nk-nofx
 * Public API: window.NKFX = { scan(node), config }
 */
(function () {
  'use strict';
  if (window.NKFX) return;

  var doc = document, root = doc.documentElement;
  var cfg = window.NK_FX || {};
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var mqFine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  function reduced() { return !!mqReduce.matches; }
  function fine() { return !!mqFine.matches; }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function warn(what, e) { if (window.console) console.warn('[micro-interactions] ' + what + ' off:', e); }

  /* ---------------------------------------------------------------- targets */
  var BEAM_SEL = '.nk-card.nk-bs,.nk-hs-frame,.nk-promo,[data-nk-beam]';
  var SPOT_SEL = '.nk-hs-frame,.nk-promo,[data-nk-spotlight]';
  var HOST_SEL = BEAM_SEL + ',' + SPOT_SEL;
  var MAG_SEL = '.nk-add,.btn-add-cart,.cart-checkout,.ck-submit,[data-nk-magnetic]';
  var SECTION_SEL = 'main > section,main > .container > section,[data-nk-section]';
  var SECTION_SKIP = '[hidden],.hero,.nk-hs,.nk-promo-wrap,.reveal,[data-nk-noreveal],[data-nk-nofx]';

  /* ---------------------------------------------------------------- CSS */
  var CSS = [
    ':root{--nk-fx-gold:229,186,115;--nk-fx-gold-deep:200,155,84;}',

    /* shared overlay layers: transparent to the mouse, invisible until the host is hovered */
    '.nk-beam,.nk-spot{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .45s ease;}',

    /* --- 1. BORDER BEAM (Magic UI): the host's border ring is cut out with a mask, a 72px gold gradient rides the ring on offset-path --- */
    '.nk-beam{z-index:4;box-sizing:border-box;padding:var(--nk-beam-w,1.5px);',
    ' -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;',
    ' mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);}',
    '.nk-beam::after{content:"";position:absolute;aspect-ratio:1/1;width:var(--nk-beam-size,72px);',
    ' background:linear-gradient(to left,rgba(var(--nk-fx-gold),.95),rgba(var(--nk-fx-gold-deep),.5) 45%,transparent);',
    ' offset-anchor:90% 50%;offset-path:rect(0 auto auto 0 round var(--nk-r,20px));',
    ' animation:nkBeam var(--nk-beam-dur,7s) linear infinite;animation-play-state:paused;}',
    '@keyframes nkBeam{to{offset-distance:100%;}}',

    /* --- 2. SPOTLIGHT (Magic UI): a very soft light that follows the cursor --- */
    '.nk-spot{z-index:3;background:radial-gradient(380px circle at var(--nk-sx,50%) var(--nk-sy,50%),rgba(255,240,214,.12),rgba(var(--nk-fx-gold),.045) 42%,transparent 72%);}',

    /* hover only, mouse / pen only (touch screens never show the effects) */
    '@media (hover:hover) and (pointer:fine){',
    ' [data-nk-fx~="beam"]:hover>.nk-beam,[data-nk-fx~="spot"]:hover>.nk-spot{opacity:1;}',
    ' [data-nk-fx~="beam"]:hover>.nk-beam::after{animation-play-state:running;}',
    '}',
    '[data-nk-fx~="beam"]:has(:focus-visible)>.nk-beam{opacity:1;}',      /* keyboard users get the beam too (separate rule: :has() is not in every browser) */

    /* fallback: no offset-path support, or reduced motion -> a static soft gold ring instead of a moving beam */
    '@supports not (offset-path:rect(0 auto auto 0 round 10px)){',
    ' .nk-beam{background:linear-gradient(135deg,rgba(var(--nk-fx-gold),.6),rgba(var(--nk-fx-gold-deep),.22));}',
    ' .nk-beam::after{display:none;}',
    '}',
    '@media (prefers-reduced-motion:reduce){',
    ' .nk-beam{background:linear-gradient(135deg,rgba(var(--nk-fx-gold),.6),rgba(var(--nk-fx-gold-deep),.22));transition:none;}',
    ' .nk-beam::after{display:none;}',
    ' .nk-spot{transition:none;}',
    '}',
    '@media print{.nk-beam,.nk-spot{display:none !important;}}'
  ].join('\n');
  function injectCss() {
    if (doc.getElementById('nk-fx-css')) return;
    var st = doc.createElement('style'); st.id = 'nk-fx-css'; st.textContent = CSS;
    (doc.head || root).appendChild(st);
  }

  /* ================================================================= 1 + 2. BORDER BEAM and SPOTLIGHT hosts */
  function addToken(host, token) {
    var t = (host.getAttribute('data-nk-fx') || '').split(' ').filter(Boolean);
    if (t.indexOf(token) < 0) { t.push(token); host.setAttribute('data-nk-fx', t.join(' ')); }
  }
  function setRadius(host) {                                                /* the beam's path follows the host's own corner radius (it changes at phone widths) */
    var r = window.getComputedStyle(host).borderTopLeftRadius;
    if (r && /^[\d.]+(px|rem|em)$/.test(r)) host.style.setProperty('--nk-r', r);
  }
  function layer(host, cls) {
    var found = host.querySelector(':scope > .' + cls);
    if (found) return found;
    var el = doc.createElement('span'); el.className = cls; el.setAttribute('aria-hidden', 'true');
    host.appendChild(el);
    return el;
  }
  function ensureHost(host) {
    if (host.hasAttribute('data-nk-nofx')) return;
    var wantBeam = cfg.beam !== false && host.matches(BEAM_SEL);
    var wantSpot = cfg.spotlight !== false && host.matches(SPOT_SEL);
    if (!wantBeam && !wantSpot) return;
    if (window.getComputedStyle(host).position === 'static') host.style.position = 'relative';
    if (wantBeam) { layer(host, 'nk-beam'); addToken(host, 'beam'); }
    if (wantSpot) { layer(host, 'nk-spot'); addToken(host, 'spot'); }
    setRadius(host);
  }

  /* ================================================================= 3. MAGNETIC CTAs (Framer Motion spring pattern) */
  var SPRING = { stiffness: 150, damping: 15, mass: 0.1 };                  /* the useSpring values of the canonical Framer Motion magnetic button */
  var PULL = 0.28;                                                          /* share of the pointer's offset from the button centre the button follows */
  var MAX_X = 8, MAX_Y = 6;                                                 /* never more than 8px / 6px: a pull, not a chase */
  var PAD = 8;                                                              /* the button stays "held" this far outside its resting box (no flicker at the edge) */
  var pointer = { x: 0, y: 0 }, live = [], magRaf = 0, lastT = 0;

  function eligible(el) {
    return !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !el.hasAttribute('data-nk-nomagnet') && !el.hasAttribute('data-nk-nofx') && el.offsetWidth > 0;
  }
  function Mag(el) { this.el = el; this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.tx = 0; this.ty = 0; this.hover = false; }
  function guardTransition(el) {                                            /* `transition: all` would smooth the translate a second time and make it lag behind the spring */
    if (el._nkTg) return; el._nkTg = true;
    var tp = window.getComputedStyle(el).transitionProperty || '';
    if (/(^|,\s*)(all|translate)(\s*,|$)/.test(tp)) el.style.transitionProperty = 'background-color,color,border-color,box-shadow,filter,opacity,transform';
  }
  function engage(el) {
    var m = el._nkm || (el._nkm = new Mag(el));
    if (!m.hover) { m.hover = true; guardTransition(el); el.style.willChange = 'translate'; }
    if (live.indexOf(m) < 0) live.push(m);
    if (!magRaf) { lastT = 0; magRaf = window.requestAnimationFrame(tick); }
  }
  function releaseAll() { live.forEach(function (m) { m.hover = false; m.tx = 0; m.ty = 0; }); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function tick(now) {
    magRaf = 0;
    var dt = lastT ? Math.min((now - lastT) / 1000, 1 / 30) : 1 / 60; lastT = now;
    var steps = Math.max(1, Math.ceil(dt * 240)), h = dt / steps;           /* fixed small sub-steps keep the spring stable at any frame rate */
    var next = [];
    for (var i = 0; i < live.length; i++) {
      var m = live[i], el = m.el;
      if (m.hover) {
        if (!eligible(el) || reduced() || !fine() || !el.isConnected) { m.hover = false; m.tx = m.ty = 0; }
        else {
          var r = el.getBoundingClientRect();                                /* r includes the current translate; subtract it to get the resting centre */
          var cx = r.left + r.width / 2 - m.x, cy = r.top + r.height / 2 - m.y;
          var inside = pointer.x >= cx - r.width / 2 - PAD && pointer.x <= cx + r.width / 2 + PAD && pointer.y >= cy - r.height / 2 - PAD && pointer.y <= cy + r.height / 2 + PAD;
          if (!inside) { m.hover = false; m.tx = m.ty = 0; }
          else {
            var mx = Math.min(MAX_X, r.width * 0.08), my = Math.min(MAX_Y, r.height * 0.2);
            m.tx = clamp((pointer.x - cx) * PULL, -mx, mx);
            m.ty = clamp((pointer.y - cy) * PULL, -my, my);
          }
        }
      }
      for (var s = 0; s < steps; s++) {                                      /* damped spring: a = (-k (x - target) - c v) / m */
        m.vx += ((-SPRING.stiffness * (m.x - m.tx) - SPRING.damping * m.vx) / SPRING.mass) * h; m.x += m.vx * h;
        m.vy += ((-SPRING.stiffness * (m.y - m.ty) - SPRING.damping * m.vy) / SPRING.mass) * h; m.y += m.vy * h;
      }
      var rest = !m.hover && Math.abs(m.x) < 0.02 && Math.abs(m.y) < 0.02 && Math.abs(m.vx) < 0.02 && Math.abs(m.vy) < 0.02;
      if (rest) { m.x = m.y = m.vx = m.vy = 0; el.style.translate = ''; el.style.willChange = ''; }
      else { el.style.translate = m.x.toFixed(2) + 'px ' + m.y.toFixed(2) + 'px'; next.push(m); }
    }
    live = next;
    if (live.length) magRaf = window.requestAnimationFrame(tick);            /* sleeps completely once every button is back at rest */
  }

  /* ================================================================= pointer plumbing (one delegated listener each, nothing per element) */
  var spotRaf = 0, spotHost = null, spotX = 0, spotY = 0, lastHost = null;
  function onMove(e) {
    if (e.pointerType === 'touch') return;
    pointer.x = e.clientX; pointer.y = e.clientY;
    var t = e.target;
    if (!t || !t.closest) return;
    if (cfg.magnetic !== false && !reduced() && fine()) {
      var b = t.closest(MAG_SEL);
      if (b && eligible(b)) engage(b);
    }
    var s = t.closest('[data-nk-fx~="spot"]');
    if (s) {
      spotHost = s; spotX = e.clientX; spotY = e.clientY;
      if (!spotRaf) spotRaf = window.requestAnimationFrame(function () {
        spotRaf = 0; if (!spotHost) return;
        var r = spotHost.getBoundingClientRect();
        spotHost.style.setProperty('--nk-sx', (spotX - r.left).toFixed(1) + 'px');
        spotHost.style.setProperty('--nk-sy', (spotY - r.top).toFixed(1) + 'px');
      });
    }
  }
  function onOver(e) {
    var h = e.target && e.target.closest ? e.target.closest('[data-nk-fx]') : null;
    if (h && h !== lastHost) { lastHost = h; setRadius(h); }
  }

  /* ================================================================= 4. SECTION FADE */
  var secIO = null, hidden = [];
  function showSection(el) {
    el.style.removeProperty('opacity');
    var i = hidden.indexOf(el); if (i > -1) hidden.splice(i, 1);
    if (reduced() || typeof el.animate !== 'function') return;
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-out', fill: 'backwards' });
  }
  function initSectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { secIO.unobserve(en.target); showSection(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    window.addEventListener('beforeprint', function () { hidden.slice().forEach(function (el) { secIO.unobserve(el); showSection(el); }); });
  }
  var seenSec = (typeof WeakSet === 'function') ? new WeakSet() : { has: function () { return false; }, add: function () {} };
  function considerSection(el) {
    if (!secIO || seenSec.has(el)) return;
    seenSec.add(el);
    if (el.matches(SECTION_SKIP) || el.closest('.nkn-header,.nkn-drawer,.nkn-footer,#cart-drawer,[role="dialog"],[aria-modal="true"]')) return;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.top <= window.innerHeight * 0.98) return;   /* hidden, or already on screen: never hide it */
    el.style.opacity = '0'; hidden.push(el); secIO.observe(el);
  }

  /* ================================================================= scan + boot */
  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.classList && (node.classList.contains('nk-beam') || node.classList.contains('nk-spot'))) return;
    var host = node.closest ? node.closest(HOST_SEL) : null;                /* a re-rendered child inside a host: make sure the host still has its layers */
    if (host) ensureHost(host);
    each(node.querySelectorAll(HOST_SEL), ensureHost);
    if (cfg.sections !== false) {
      if (node.matches && node.matches(SECTION_SEL)) considerSection(node);
      each(node.querySelectorAll(SECTION_SEL), considerSection);
    }
  }

  function start() {
    try { if (cfg.sections !== false) initSectionObserver(); } catch (e) { warn('section fade', e); }
    try { scan(doc.body); } catch (e) { warn('scan', e); }
    try {
      doc.addEventListener('pointermove', onMove, { passive: true });
      doc.addEventListener('pointerover', onOver, { passive: true });
      root.addEventListener('mouseleave', releaseAll);
      window.addEventListener('blur', releaseAll);
    } catch (e) { warn('pointer effects', e); }
    if (window.MutationObserver) {                                           /* Firebase grids, hero slider and promo banner are rendered after load */
      var queue = [], raf = 0;
      new MutationObserver(function (list) {
        list.forEach(function (m) { each(m.addedNodes, function (n) { if (n.nodeType === 1) queue.push(n); }); });
        if (queue.length && !raf) raf = window.requestAnimationFrame(function () {
          raf = 0; var q = queue; queue = [];
          q.forEach(function (n) { try { scan(n); } catch (e) { /* one bad node never stops the rest */ } });
        });
      }).observe(doc.body, { childList: true, subtree: true });
    }
  }

  injectCss();
  window.NKFX = { scan: scan, config: cfg, version: '1.0' };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
