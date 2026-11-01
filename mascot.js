/**
 * NIKORA mascot.js  -  the NIKORA Rabbit as a reusable UI guide (stand-alone, no dependencies, lives next to nav.js in the repo root).
 *
 * Artwork: the official bunny head from the header logo (same ear / head outlines, eyes, nose and mouth), drawn as inline SVG.
 *   Gold outline = #C89B54, face = obsidian in light mode / white in dark mode (CSS variables, so it follows the theme toggle without a swap).
 *   Poses add one small line-art prop: 'head' (default), 'sparkle' (tips), 'bag' (empty cart), 'search' (no results), 'box' (parcels), 'lost' (404).
 *
 * API  (window.NKMascot)
 *   svg(pose, { size: 96, label: '' })            -> SVG string (decorative unless a label is given)
 *   tip(text, { title: 'NIKORA Rabbit Tip', mini: false })   -> callout HTML
 *   empty({ pose, title, text, cta: { label, href, closeCart } })  -> empty-state HTML
 *   help(text, { cta: { label, href } })           -> small help strip HTML (FAQ blocks, help sections)
 *   enhance(root)                                  -> upgrades the placeholders below (runs automatically for the whole page and for anything added later)
 *
 * Declarative placeholders (no JS needed in the page):
 *   <div data-nk-mascot-tip="Apply on damp skin for maximum Glass Skin absorption"></div>      add data-nk-mascot-mini for the one-line card version
 *   <div data-nk-mascot-help="Still curious?" data-cta-label="Ask the concierge" data-cta-href="contact.html"></div>
 *   <div data-nk-mascot-empty data-pose="lost" data-title="..." data-text="..." data-cta-label="..." data-cta-href="..."></div>
 * Automatic upgrades (existing markup, no page edits): the empty cart (.cart-empty) and the empty catalog search (.no-results).
 * Opt out of an automatic upgrade with data-nk-mascot-off.
 *
 * LIVE COMPANION (v3): a free-standing solid rabbit (obsidian body, gold #C89B54 outline, soft drop-shadow, no button disc) on every page, checkout included.
 *   Modes      ROAM (default): it drifts down the left edge as the page scrolls. PIN: the pushpin on the rabbit grounds it in the bottom corner, quiet and still
 *               (saved in localStorage 'nikora_mascot_pinned'). At checkout it is always docked in the corner so it never sits over the payment form.
 *   Speech     idle tips, answers to the popup's ask box and checkout reassurance come from NikoraAssistant.speak() (ai-assistant.js: the live endpoint when
 *               configured, else the local engine, using the customer's chat history + remembered profile); built-in lines are only the fallback.
 *   Layer      z-index 999999 so it stays crisp above cart drawers, modals and their blurred backdrops.
 *   Motion      gentle float + breathing, ear wiggles, eye blinks (all off for prefers-reduced-motion; paused while the tab is hidden).
 *   Reactions   joyful bounce when the bag count really goes up; "Lab Specialist" goggles + sparkles while the pointer is on a key ingredient
 *               (mark any element with data-nk-ingredient, optionally data-nk-lab="short fact" for a bubble); a helpful tip after 15 s idle (max 3 per visit).
 *   Memory      reads / writes the customer's skin type + concerns in this browser (localStorage 'nikora_profile'):
 *                 NKMascot.learn(text)   call it with each sentence the CUSTOMER types in the Concierge; it spots "dry", "sensitive", "barrier repair", ...
 *                 NKMascot.setProfile({ skinTypes:['dry'], concerns:['Barrier Repair'] })   or save a profile you already have
 *                 NKMascot.getProfile() / NKMascot.forget()     window event 'nikora:profile' fires on every change
 *   Click       opens a quick guidance popup; "Chat with the Concierge" calls window.openAiAssistant().
 *   Config      window.NK_MASCOT = { widget:true, side:'left'|'right', roam:true|false (false = always pinned), idleMs:15000, maxNudges:3, hideOn:[] }  (set before this file loads)
 */
(function () {
  'use strict';
  if (window.NKMascot) return;
  var doc = document;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeHref(u) { u = String(u || ''); return /^(https?:|mailto:|tel:|#|\/|[A-Za-z0-9_.\-]+(\.html)?([?#].*)?$)/.test(u) ? u : '#'; }

  /* ---------------------------------------------------------------- artwork */
  var G = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  var HEAD =
    '<g ' + G + ' style="stroke-width:8">' +
      '<path d="M23 56C14 44 8 29 7.5 15C7.3 7 12 3.7 17.5 3.7C24 4 30 12 34 24C37 33 38.5 42 38.2 50.5"/>' +
      '<path d="M74.2 56C83.2 44 89.2 29 89.7 15C89.9 7 85.2 3.7 79.7 3.7C73.2 4 67.2 12 63.2 24C60.2 33 58.7 42 59 50.5"/>' +
      '<ellipse cx="48.6" cy="86.5" rx="43.2" ry="37"/>' +
    '</g>' +
    '<g style="fill:var(--nkm-face)"><ellipse cx="31.8" cy="76.7" rx="5" ry="5.6"/><ellipse cx="66" cy="76.7" rx="5" ry="5.6"/>' +
    '<path d="M42.6 84.6C42.6 83.7 45.5 83.2 48.6 83.2C51.7 83.2 54.6 83.7 54.6 84.6C54.2 87.2 51.5 89.2 48.6 90.2C45.7 89.2 43 87.2 42.6 84.6Z"/></g>' +
    '<path d="M48.6 89.5V96.5M48.6 96.5C46 99.4 42.6 100.4 39.6 99.5C37.6 98.9 36.2 97.4 35.9 95.6M48.6 96.5C51.2 99.4 54.6 100.4 57.6 99.5C59.6 98.9 61 97.4 61.3 95.6" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--nkm-face)"/>';
  var SPARK = 'M0,-11 L2.6,-2.6 L11,0 L2.6,2.6 L0,11 L-2.6,2.6 L-11,0 L-2.6,-2.6Z';
  var POSES = {
    head:   { vb: [-2, -2, 101.2, 133], art: HEAD },
    sparkle:{ vb: [-2, -2, 125, 133],   art: HEAD + '<path transform="translate(110 20)" d="' + SPARK + '" fill="currentColor"/><path transform="translate(104 48) scale(.5)" d="' + SPARK + '" fill="currentColor"/>' },
    bag:    { vb: [-14, -2, 125, 168],  art: HEAD +
      '<g ' + G + ' style="stroke-width:5;fill:var(--nkm-bag)"><path d="M33 120v-6a16 16 0 0 1 32 0v6" style="fill:none"/><path d="M19 120h60l-4 42H23z"/></g>' +
      '<path d="M40 136c0 5 4 8 9 8s9-3 9-8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" opacity=".6"/>' },
    search: { vb: [-2, -2, 135, 152],   art: HEAD +
      '<circle cx="98" cy="108" r="17" ' + G + ' style="stroke-width:6;fill:var(--nkm-glass)"/><path d="M110 121L126 138" ' + G + ' style="stroke-width:7"/>' },
    box:    { vb: [-14, -2, 125, 168],  art: HEAD +
      '<g ' + G + ' style="stroke-width:5;fill:var(--nkm-bag)"><path d="M16 118h66v42H16z"/><path d="M49 118v42M16 132h66" style="fill:none"/></g>' },
    lost:   { vb: [-8, -2, 136, 133],   art: '<g transform="rotate(-8 48.6 86)">' + HEAD + '</g>' +
      '<path d="M104 34c0-10 17-10 17 0c0 7-8 8-8 17" ' + G + ' style="stroke-width:5"/><circle cx="113" cy="63" r="3.4" fill="currentColor"/>' }
  };
  function svg(pose, o) {
    o = o || {};
    var p = POSES[pose] || POSES.head, vb = p.vb, h = Number(o.size) || 96, w = Math.round(h * vb[2] / vb[3] * 10) / 10;
    var a11y = o.label ? 'role="img" aria-label="' + esc(o.label) + '"' : 'aria-hidden="true" focusable="false"';
    return '<svg class="nkm' + (o.className ? ' ' + esc(o.className) : '') + '" viewBox="' + vb.join(' ') + '" width="' + w + '" height="' + h + '" ' + a11y + '>' + p.art + '</svg>';
  }

  /* ---------------------------------------------------------------- styles */
  var CSS = [
    ':root{--nkm-gold:#C89B54;--nkm-face:#0B0B0E;--nkm-bag:#FAF7F2;--nkm-glass:rgba(200,155,84,.16);--nkm-tint:rgba(200,155,84,.11);--nkm-bd:rgba(200,155,84,.38);--nkm-title:#80591F;}',
    ':root[data-theme="dark"]{--nkm-face:#F7F4F0;--nkm-bag:#1A1620;--nkm-glass:rgba(200,155,84,.2);--nkm-tint:rgba(200,155,84,.14);--nkm-bd:rgba(200,155,84,.5);--nkm-title:#E5BA73;}',
    '.nkm{display:block;flex:none;overflow:visible;color:var(--nkm-gold);}',
    /* tip / help callout */
    '.nkm-tip{display:flex;align-items:flex-start;gap:12px;box-sizing:border-box;margin:14px 0 0;padding:12px 14px;border-radius:16px;background:var(--nkm-tint);border:1px solid var(--nkm-bd);text-align:left;}',
    '.nkm-ava{flex:none;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:38px;height:38px;padding:7px;border-radius:50%;background:var(--nkm-tint);border:1px solid var(--nkm-bd);}',
    '.nkm-ava .nkm{width:100%;height:100%;}',
    '.nkm-body{min-width:0;flex:1;}',
    '.nkm-title{margin:0 0 3px;font-size:10.5px;font-weight:700;line-height:1.3;letter-spacing:.09em;text-transform:uppercase;color:var(--nkm-title);}',
    '.nkm-text{margin:0;font-size:13px;line-height:1.55;color:var(--text-soft,rgba(26,22,21,.7));}',
    '.nkm-link{display:inline-block;margin-top:6px;font-size:12px;font-weight:700;color:var(--nkm-title);text-decoration:underline;text-underline-offset:3px;}',
    '.nkm-tip--mini{margin:0 0 12px;padding:8px 10px;gap:9px;border-radius:12px;}',
    '.nkm-tip--mini .nkm-ava{width:28px;height:28px;padding:5px;}',
    '.nkm-tip--mini .nkm-title{margin:0 0 1px;font-size:9.5px;}',
    '.nkm-tip--mini .nkm-text{font-size:12px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    /* empty state */
    '.nkm-empty{display:flex;flex-direction:column;align-items:center;gap:4px;box-sizing:border-box;padding:28px 22px 22px;text-align:center;}',
    '.nkm-empty .nkm{margin:0 auto 8px;animation:nkmFloat 4.2s ease-in-out infinite;}',
    '.nkm-empty-title{margin:0;font-family:"Playfair Display",Georgia,serif;font-size:19px;font-weight:500;line-height:1.3;color:var(--text,#1A1615);}',
    '.nkm-empty-text{margin:0;max-width:34ch;font-size:13px;line-height:1.55;color:var(--text-soft,rgba(26,22,21,.62));}',
    '.nkm-cta{display:inline-flex;align-items:center;justify-content:center;margin-top:12px;padding:11px 24px;border:0;border-radius:100px;background:var(--gold,#C89B54);color:#241c0f;font-family:inherit;font-size:12px;font-weight:700;letter-spacing:.04em;text-decoration:none;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease;}',
    '.nkm-cta:hover{transform:translateY(-1px);box-shadow:0 10px 22px -10px rgba(200,155,84,.7);}',
    '.nkm-cta:focus-visible{outline:2px solid var(--gold,#C89B54);outline-offset:3px;}',
    '@keyframes nkmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '@media (prefers-reduced-motion:reduce){.nkm-empty .nkm{animation:none}.nkm-cta{transition:none}}'
  ].join('\n');
  function injectCss() {
    if (doc.getElementById('nk-mascot-css')) return;
    var st = doc.createElement('style'); st.id = 'nk-mascot-css'; st.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(st);
  }

  /* ---------------------------------------------------------------- components */
  function tipInner(text, o) {
    o = o || {};
    return '<span class="nkm-ava">' + svg('sparkle', { size: 40 }) + '</span>' +
      '<span class="nkm-body"><span class="nkm-title" style="display:block">' + esc(o.title || 'NIKORA Rabbit Tip') + '</span><span class="nkm-text" style="display:block">' + esc(text) + '</span></span>';
  }
  function tip(text, o) {
    o = o || {};
    return '<aside class="nkm-tip' + (o.mini ? ' nkm-tip--mini' : '') + '" data-nkm-done="1">' + tipInner(text, o) + '</aside>';
  }
  function help(text, o) {
    o = o || {}; var c = o.cta;
    return '<aside class="nkm-tip" data-nkm-done="1"><span class="nkm-ava">' + svg('head', { size: 40 }) + '</span><span class="nkm-body">' +
      '<span class="nkm-text" style="display:block">' + esc(text) + '</span>' +
      (c && c.label ? '<a class="nkm-link" href="' + esc(safeHref(c.href)) + '">' + esc(c.label) + '</a>' : '') + '</span></aside>';
  }
  function emptyInner(o) {
    o = o || {}; var c = o.cta;
    return svg(o.pose || 'head', { size: o.size || 104 }) +
      (o.title ? '<h3 class="nkm-empty-title">' + esc(o.title) + '</h3>' : '') +
      (o.text ? '<p class="nkm-empty-text">' + esc(o.text) + '</p>' : '') +
      (c && c.label ? '<a class="nkm-cta" href="' + esc(safeHref(c.href)) + '"' + (c.closeCart ? ' data-nkm-close-cart' : '') + '>' + esc(c.label) + '</a>' : '');
  }
  function empty(o) { return '<div class="nkm-empty" data-nkm-done="1">' + emptyInner(o) + '</div>'; }

  /* ---------------------------------------------------------------- upgrades */
  var SEL = '[data-nk-mascot-tip],[data-nk-mascot-help],[data-nk-mascot-empty],.cart-empty,.no-results';
  function enhanceOne(el) {
    if (!el || el.nodeType !== 1 || el.getAttribute('data-nkm-done') || el.hasAttribute('data-nk-mascot-off')) return false;
    var d = el.dataset || {};
    if (el.hasAttribute('data-nk-mascot-tip')) {
      var mini = el.hasAttribute('data-nk-mascot-mini');
      el.className = (el.className ? el.className + ' ' : '') + 'nkm-tip' + (mini ? ' nkm-tip--mini' : '');
      el.innerHTML = tipInner(el.getAttribute('data-nk-mascot-tip'), { title: d.title });
    } else if (el.hasAttribute('data-nk-mascot-help')) {
      el.className = (el.className ? el.className + ' ' : '') + 'nkm-tip';
      el.innerHTML = '<span class="nkm-ava">' + svg('head', { size: 40 }) + '</span><span class="nkm-body"><span class="nkm-text" style="display:block">' + esc(el.getAttribute('data-nk-mascot-help')) + '</span>' +
        (d.ctaLabel ? '<a class="nkm-link" href="' + esc(safeHref(d.ctaHref)) + '">' + esc(d.ctaLabel) + '</a>' : '') + '</span>';
    } else if (el.hasAttribute('data-nk-mascot-empty')) {
      el.className = (el.className ? el.className + ' ' : '') + 'nkm-empty';
      el.innerHTML = emptyInner({ pose: d.pose, title: d.title, text: d.text, cta: d.ctaLabel ? { label: d.ctaLabel, href: d.ctaHref } : null });
    } else if (el.classList.contains('cart-empty')) {                              /* the empty cart drawer (renderCart() on every page) */
      el.className = el.className + ' nkm-empty';
      el.innerHTML = emptyInner({ pose: 'bag', size: 96, title: 'Your beauty routine is empty', text: 'Add a favorite below to start your glow ritual.',
        cta: { label: 'Explore Bestsellers', href: 'catalog.html?filter=bestsellers', closeCart: true } });
    } else if (el.classList.contains('no-results')) {                              /* the empty catalog search: keeps the page's own message */
      var msg = (el.textContent || '').trim();
      el.className = el.className + ' nkm-empty';
      el.innerHTML = emptyInner({ pose: 'search', size: 112, title: 'No matches yet', text: msg || 'Try another skin concern or clear the search.',
        cta: { label: 'Explore Bestsellers', href: 'catalog.html?filter=bestsellers' } });
    } else return false;
    el.setAttribute('data-nkm-done', '1');
    return true;
  }
  function enhance(root) {
    root = root || doc.body; if (!root) return;
    var changed = enhanceOne(root);
    Array.prototype.forEach.call(root.querySelectorAll ? root.querySelectorAll(SEL) : [], function (el) { if (enhanceOne(el)) changed = true; });
    if (changed && typeof window.refreshAccordionHeights === 'function') { try { window.refreshAccordionHeights(); } catch (e) {} }   /* product.html sizes its accordion panels in px */
  }

  /* ====================================================================== 5. LIVE COMPANION (floating widget, reactions, memory) ====================================================================== */
  var CFG = (function () {
    var d = { widget: true, side: 'left', idleMs: 15000, maxNudges: 3, hideOn: [], roam: true }, u = window.NK_MASCOT || {}, k;
    for (k in u) if (Object.prototype.hasOwnProperty.call(u, k)) d[k] = u[k];
    return d;
  })();
  var reduceMotion = function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  function store(kind) {
    return {
      get: function (k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window[kind].setItem(k, v); } catch (e) {} },
      del: function (k) { try { window[kind].removeItem(k); } catch (e) {} }
    };
  }
  var LS = store('localStorage'), SS = store('sessionStorage');

  /* ---------- 5a. customer profile (skin type + concerns), kept in this browser only ----------
     Written by learn() / setProfile() (the Beauty Concierge calls them), read by every page. Key: localStorage 'nikora_profile'
     { v:1, skinTypes:['dry','sensitive'], concerns:['Barrier Repair'], updatedAt }. Nothing is sent anywhere by this file. */
  var PROFILE_KEY = 'nikora_profile';
  var SKIN_RE = { dry: /\b(dry|dryness)\b/i, oily: /\b(oily|greasy)\b/i, combination: /\b(combination|combo)\b/i, sensitive: /\b(sensitive|sensitivity|reactive|irritated)\b/i, normal: /\bnormal skin\b/i };
  var CONCERN_RE = {
    'Barrier Repair': /\b(barrier|damaged skin|compromised skin)\b/i,
    'Hydration': /\b(hydrat\w*|dehydrat\w*|moisturi[sz]\w*)\b/i,
    'Acne & Blemishes': /\b(acne|breakouts?|blemish\w*|pimples?)\b/i,
    'Dullness': /\b(dull\w*|brighten\w*|radiance)\b/i,
    'Redness': /\b(redness|rosacea|flushed)\b/i,
    'Dark Spots': /\b(dark spots?|hyperpigmentation|pigmentation|sun spots?)\b/i,
    'Fine Lines': /\b(fine lines?|wrinkles?|aging|ageing|firming)\b/i,
    'Pores': /\bpores?\b/i
  };
  /* what a product page has to mention before the rabbit says it lines up with the customer's profile (never claimed otherwise) */
  var PRODUCT_RE = {
    dry: /\b(dry|dryness|hydrat\w*|moisturi[sz]\w*)\b/i, oily: /\b(oil\w*|sebum|pores?)\b/i, combination: /\b(combination|balanc\w*)\b/i,
    sensitive: /\b(sensitive|soothing|calming|centella)\b/i, normal: /\b(all skin types|every skin type)\b/i,
    'Barrier Repair': /\b(barrier|ceramide\w*|repair\w*)\b/i, 'Hydration': /\b(hydrat\w*|moisturi[sz]\w*|hyaluronic)\b/i,
    'Acne & Blemishes': /\b(acne|blemish\w*|breakouts?)\b/i, 'Dullness': /\b(glow\w*|brighten\w*|radian\w*)\b/i, 'Redness': /\b(redness|soothing|calming)\b/i,
    'Dark Spots': /\b(dark spots?|pigment\w*)\b/i, 'Fine Lines': /\b(fine lines?|wrinkle\w*|firm\w*|collagen|lift\w*)\b/i, 'Pores': /\bpores?\b/i
  };
  function negated(text, idx) { return /\b(not|no|isn'?t|never|without)\s+(really\s+|very\s+)?$/i.test(text.slice(Math.max(0, idx - 14), idx)); }
  function hit(re, text) {
    var g = new RegExp(re.source, 'ig'), m;
    while ((m = g.exec(text))) { if (!negated(text, m.index)) return true; }
    return false;
  }
  function cleanList(a, allowed) {
    var out = [];
    (Array.isArray(a) ? a : (a ? [a] : [])).forEach(function (v) {
      v = String(v || '').trim(); if (!v) return;
      var key = allowed ? Object.keys(allowed).filter(function (k) { return k.toLowerCase() === v.toLowerCase(); })[0] : v.slice(0, 40);
      if (key && out.indexOf(key) < 0) out.push(key);
    });
    return out;
  }
  /* tolerant reader for whatever the Concierge itself stores: looks for skinType(s) / concerns / goals up to 3 levels deep */
  var EXTERNAL_KEYS = ['nikora_ai_profile', 'nkai_profile', 'nkai_memory', 'nikora_ai_memory', 'nikora_assistant_memory'];
  function digProfile(o, depth, out) {
    if (!o || typeof o !== 'object' || depth > 3) return;
    Object.keys(o).forEach(function (k) {
      var v = o[k], lk = k.toLowerCase().replace(/[^a-z]/g, '');
      if (/^(skintype|skintypes)$/.test(lk)) String(Array.isArray(v) ? v.join(' ') : v).toLowerCase().split(/[\s,\/&]+/).forEach(function (w) { if (SKIN_RE[w]) out.skinTypes.push(w); });
      else if (/^(concern|concerns|skinconcerns|goal|goals|skingoals)$/.test(lk)) (Array.isArray(v) ? v : [v]).forEach(function (c) {
        c = String(c || ''); Object.keys(CONCERN_RE).forEach(function (n) { if (n.toLowerCase() === c.trim().toLowerCase() || CONCERN_RE[n].test(c)) out.concerns.push(n); });
      });
      else if (v && typeof v === 'object') digProfile(v, depth + 1, out);
    });
  }
  function getProfile() {
    var p = { skinTypes: [], concerns: [] }, raw = LS.get(PROFILE_KEY), o;
    try { o = raw ? JSON.parse(raw) : null; } catch (e) { o = null; }
    if (o) { p.skinTypes = cleanList(o.skinTypes, SKIN_RE); p.concerns = cleanList(o.concerns, CONCERN_RE); }
    EXTERNAL_KEYS.forEach(function (k) { var r = LS.get(k); if (!r) return; try { digProfile(JSON.parse(r), 0, p); } catch (e) {} });
    p.skinTypes = cleanList(p.skinTypes, SKIN_RE); p.concerns = cleanList(p.concerns, CONCERN_RE).slice(0, 4);
    return (p.skinTypes.length || p.concerns.length) ? p : null;
  }
  function saveProfile(p) {
    LS.set(PROFILE_KEY, JSON.stringify({ v: 1, skinTypes: p.skinTypes, concerns: p.concerns.slice(0, 4), updatedAt: Date.now() }));
    try { window.dispatchEvent(new CustomEvent('nikora:profile', { detail: getProfile() })); } catch (e) {}
    if (widget.el) refreshDot();
  }
  /** Merge a profile object { skinTypes | skinType, concerns | concern } into the saved profile. */
  function setProfile(o) {
    o = o || {}; var cur = getProfile() || { skinTypes: [], concerns: [] };
    var st = cleanList([].concat(o.skinTypes || [], o.skinType || []).map(function (s) { return String(s).toLowerCase(); }), SKIN_RE);
    var cn = cleanList([].concat(o.concerns || [], o.concern || []), CONCERN_RE);
    cur.skinTypes = cleanList(cur.skinTypes.concat(st), SKIN_RE); cur.concerns = cleanList(cur.concerns.concat(cn), CONCERN_RE);
    saveProfile(cur); return getProfile();
  }
  /** Reads a sentence the CUSTOMER typed to the Concierge ("my skin is dry and sensitive, I want barrier repair") and remembers skin type / concerns. */
  function learn(text) {
    text = String(text || '').slice(0, 600); if (!text) return getProfile();
    var st = [], cn = [];
    Object.keys(SKIN_RE).forEach(function (k) { if (hit(SKIN_RE[k], text)) st.push(k); });
    Object.keys(CONCERN_RE).forEach(function (k) { if (hit(CONCERN_RE[k], text)) cn.push(k); });
    return (st.length || cn.length) ? setProfile({ skinTypes: st, concerns: cn }) : getProfile();
  }
  function forget() { LS.del(PROFILE_KEY); EXTERNAL_KEYS.forEach(function (k) { LS.del(k); }); if (widget.el) refreshDot(); try { window.dispatchEvent(new CustomEvent('nikora:profile', { detail: null })); } catch (e) {} }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function profileLabel(p) { return p ? (p.skinTypes.length ? p.skinTypes.map(cap).join('/') + ' skin' : p.concerns[0]) : ''; }

  /* the one personal note: a product page only gets "matches" when its own text mentions what the customer asked for */
  function productText() {
    var parts = [], h1 = doc.querySelector('h1'), md = doc.querySelector('meta[name="description"]'), sci = doc.getElementById('panel-science');
    if (h1) parts.push(h1.textContent); if (md) parts.push(md.getAttribute('content')); if (sci) parts.push(sci.textContent);
    return parts.join(' ').slice(0, 4000);
  }
  function personalNote() {
    var p = getProfile(); if (!p) return null;
    if (/product(\.html)?$/i.test(location.pathname) || /product\.html/i.test(location.pathname)) {
      var txt = productText(), keys = p.skinTypes.concat(p.concerns), i, m;
      for (i = 0; i < keys.length; i++) {
        var re = PRODUCT_RE[keys[i]]; if (!re || !txt) continue;
        if ((m = re.exec(txt))) return { text: 'Mascot Note: this one mentions \u201c' + m[0].toLowerCase() + '\u201d, which lines up with your ' + (SKIN_RE[keys[i]] ? cap(keys[i]) + ' skin' : keys[i]) + ' goals.' };
      }
    }
    if (p.skinTypes.indexOf('sensitive') >= 0) return { text: 'Mascot Note: Remember to patch test on sensitive skin!' };
    if (p.skinTypes.indexOf('dry') >= 0) return { text: 'Mascot Note: Dry skin loves hydration layered on damp skin.' };
    if (p.concerns.length) return { text: 'Mascot Note: Your focus is ' + p.concerns[0] + '. Ask me for picks that fit.', ask: true };
    return null;
  }
  function pageTip() {
    var path = location.pathname.toLowerCase(), t;
    if (/checkout/.test(path)) return { text: reassureLine(0) };
    if (/product/.test(path)) { t = doc.querySelector('[data-nk-mascot-tip]'); var s = t && (t.getAttribute('data-nk-mascot-tip') || ''); return { text: s ? 'Tip: ' + s : 'Not sure about this one? Ask the Beauty Concierge.', ask: !s }; }
    if (/catalog/.test(path)) return { text: 'Tip: use the concern chips to narrow your routine faster.' };
    if (/track/.test(path)) return { text: 'This page updates live when your order ships.' };
    if (/faq|contact|shipping|returns/.test(path)) return { text: 'Cannot find an answer? The Beauty Concierge can help.', ask: true };
    return { text: 'New here? Bestsellers are a lovely place to start.', href: 'catalog.html?filter=bestsellers', hrefLabel: 'Explore Bestsellers' };
  }

  /* ---------- 5b. the live rabbit: a free-standing solid character (no button disc), obsidian body, gold outline, cream face ---------- */
  var EAR_L = 'M23 56C14 44 8 29 7.5 15C7.3 7 12 3.7 17.5 3.7C24 4 30 12 34 24C37 33 38.5 42 38.2 50.5Z';
  var EAR_R = 'M74.2 56C83.2 44 89.2 29 89.7 15C89.9 7 85.2 3.7 79.7 3.7C73.2 4 67.2 12 63.2 24C60.2 33 58.7 42 59 50.5Z';
  function liveSvg() {
    return '<svg class="nkm-live" viewBox="-2 -2 101.2 133" aria-hidden="true" focusable="false">' +
      '<g class="nkm-body"><g class="nkm-tilt">' +
        '<path class="nkm-ear nkm-ear-l nkm-shape" d="' + EAR_L + '"/><path class="nkm-ear nkm-ear-r nkm-shape" d="' + EAR_R + '"/>' +
        '<ellipse class="nkm-shape" cx="48.6" cy="86.5" rx="43.2" ry="37"/>' +
        '<g class="nkm-gaze"><g class="nkm-eyes"><ellipse class="nkm-cream" cx="31.8" cy="76.7" rx="5" ry="5.6"/><ellipse class="nkm-cream" cx="66" cy="76.7" rx="5" ry="5.6"/></g></g>' +
        '<g class="nkm-eye-happy"><path d="M26.2 78.4Q31.8 70 37.4 78.4"/><path d="M60.4 78.4Q66 70 71.6 78.4"/></g>' +
        '<g class="nkm-goggles"><rect x="21.5" y="67.5" width="20.6" height="18" rx="8.4"/><rect x="55.7" y="67.5" width="20.6" height="18" rx="8.4"/><path d="M42.1 76.7H55.7"/><path d="M21.5 76.7L8 74M76.3 76.7L90 74"/></g>' +
        '<path class="nkm-nose" d="M42.6 84.6C42.6 83.7 45.5 83.2 48.6 83.2C51.7 83.2 54.6 83.7 54.6 84.6C54.2 87.2 51.5 89.2 48.6 90.2C45.7 89.2 43 87.2 42.6 84.6Z"/>' +
        '<path class="nkm-mouth" d="M48.6 89.5V96.5M48.6 96.5C46 99.4 42.6 100.4 39.6 99.5C37.6 98.9 36.2 97.4 35.9 95.6M48.6 96.5C51.2 99.4 54.6 100.4 57.6 99.5C59.6 98.9 61 97.4 61.3 95.6"/>' +
      '</g></g>' +
      '<path class="nkm-spk nkm-spk1" transform="translate(92 22)" d="' + SPARK + '"/><path class="nkm-spk nkm-spk2" transform="translate(6 38) scale(.7)" d="' + SPARK + '"/><path class="nkm-spk nkm-spk3" transform="translate(88 62) scale(.5)" d="' + SPARK + '"/>' +
    '</svg>';
  }
  var PIN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><g class="nkm-pin-g" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16.5V22"/><path d="M8.5 3h7l-1 6.2 3 3.3v2H6.5v-2l3-3.3z"/></g></svg>';

  var COMPANION_CSS = [
    /* the layer covers the viewport but lets every click through; only the character, pin, bubble and popup take pointer events */
    '.nkm-widget{position:fixed;inset:0;z-index:999999;pointer-events:none;font-family:"Montserrat",system-ui,sans-serif;--nkm-w:66px;}',
    '@media (max-width:640px){.nkm-widget{--nkm-w:54px;}}',
    'html.nkn-menu-open .nkm-widget{visibility:hidden;}',
    '@media (max-width:640px){.nkm-widget.is-chat-open{visibility:hidden;}}',
    '.nkm-stage{position:absolute;left:0;top:0;width:var(--nkm-w);pointer-events:none;will-change:transform;}',
    '.nkm-stage.is-gliding{transition:transform .65s cubic-bezier(.2,.8,.2,1);}',
    '.nkm-char{display:block;width:100%;padding:0;margin:0;border:0;background:none;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent;transition:transform .2s ease;}',
    '.nkm-char:hover{transform:scale(1.06);}',
    '.nkm-char:focus-visible{outline:2px solid #E5BA73;outline-offset:6px;border-radius:16px;}',
    '.nkm-lean{display:block;transform:rotate(var(--nkm-lean,0deg));transform-origin:50% 90%;transition:transform .25s ease-out;}',
    '.nkm-jump{display:block;}',
    '.nkm-float{display:block;animation:nkmFloatW 5s ease-in-out infinite;}',
    '.nkm-live{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 8px 16px rgba(0,0,0,.18));}',
    '.nkm-live .nkm-shape{fill:#1C1722;stroke:#C89B54;stroke-width:6.5;stroke-linejoin:round;stroke-linecap:round;}',
    ':root[data-theme="dark"] .nkm-live .nkm-shape{fill:#261F2E;}',
    '.nkm-live .nkm-cream{fill:#F7F4F0;}',
    '.nkm-live .nkm-nose{fill:#C89B54;}',
    '.nkm-live .nkm-mouth{fill:none;stroke:#F7F4F0;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}',
    '.nkm-live .nkm-eye-happy,.nkm-live .nkm-goggles{opacity:0;transition:opacity .18s ease;}',
    '.nkm-live .nkm-eye-happy{fill:none;stroke:#F7F4F0;stroke-width:3.4;stroke-linecap:round;}',
    '.nkm-live .nkm-goggles{fill:rgba(200,155,84,.2);stroke:#E5BA73;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;}',
    '.nkm-live .nkm-spk{fill:#E5BA73;opacity:0;transform-box:fill-box;transform-origin:center;}',
    '.nkm-live .nkm-body{transform-box:fill-box;transform-origin:50% 100%;animation:nkmBreathe 4.2s ease-in-out infinite;}',
    /* cursor tracking: the head tilts toward the pointer (--nkm-tilt) and the eyes look at it (--nkm-gx / --nkm-gy, SVG units) */
    '.nkm-live .nkm-tilt{transform-box:fill-box;transform-origin:50% 100%;transform:rotate(var(--nkm-tilt,0deg));transition:transform .22s ease-out;}',
    '.nkm-live .nkm-gaze{transform:translate(calc(var(--nkm-gx,0) * 1px),calc(var(--nkm-gy,0) * 1px));transition:transform .18s ease-out;}',
    '.nkm-live .nkm-ear{transform-box:fill-box;transform-origin:50% 96%;}',
    '.nkm-live .nkm-eyes{transform-box:fill-box;transform-origin:center;transition:transform .09s ease,opacity .15s ease;}',
    '.nkm-live.is-blink .nkm-eyes{transform:scaleY(.1);}',
    '.nkm-live.is-wiggle .nkm-ear-l{animation:nkmWigL .75s ease;}',
    '.nkm-live.is-wiggle .nkm-ear-r{animation:nkmWigR .75s ease .08s;}',
    /* reactions */
    '.nkm-widget.is-joy .nkm-jump{animation:nkmJoy .85s cubic-bezier(.3,.7,.4,1);}',
    '.nkm-widget.is-joy .nkm-eyes{opacity:0;}.nkm-widget.is-joy .nkm-eye-happy{opacity:1;}',
    '.nkm-widget.is-joy .nkm-live .nkm-ear-l{transform:rotate(-8deg);}.nkm-widget.is-joy .nkm-live .nkm-ear-r{transform:rotate(8deg);}',
    '.nkm-widget.is-joy .nkm-spk,.nkm-widget.is-lab .nkm-spk{opacity:1;animation:nkmTwinkle 1.1s ease-in-out infinite;}',
    '.nkm-widget.is-lab .nkm-goggles{opacity:1;}',
    '.nkm-widget.is-lab .nkm-spk2{animation-delay:.3s;}.nkm-widget.is-lab .nkm-spk3{animation-delay:.6s;}',
    /* pinned = grounded in the corner and quiet: no float, no breathing, no wiggles, no head tracking */
    '.nkm-widget.is-pinned .nkm-float,.nkm-widget.is-pinned .nkm-live .nkm-body{animation:none;}',
    /* pin / dock toggle: a small gold pushpin that tilts when free and stands upright, filled, when pinned */
    '.nkm-pin{position:absolute;top:-10px;right:-16px;display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;background:none;color:#C89B54;cursor:pointer;pointer-events:auto;opacity:.55;transition:opacity .2s ease,transform .2s ease;-webkit-tap-highlight-color:transparent;}',
    '.nkm-pin svg{display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));}',
    '.nkm-pin .nkm-pin-g{transform-origin:50% 50%;transform:rotate(32deg);transition:transform .25s ease;}',
    '.nkm-stage:hover .nkm-pin,.nkm-pin:focus-visible,.nkm-pin[aria-pressed="true"]{opacity:1;}',
    '.nkm-pin[aria-pressed="true"] .nkm-pin-g{transform:rotate(0);fill:currentColor;}',
    '.nkm-pin:focus-visible{outline:2px solid #E5BA73;outline-offset:1px;border-radius:50%;}',
    '.nkm-widget.is-forced-dock .nkm-pin{display:none;}',
    /* bubble + popup: solid obsidian with a gold hairline, identical in both themes; they sit above / below and left / right of the character */
    '.nkm-bubble,.nkm-pop{position:absolute;box-sizing:border-box;pointer-events:auto;color:#F7F4F0;background:#0B0B0E;border:1px solid rgba(200,155,84,.55);border-radius:18px;box-shadow:0 22px 44px -18px rgba(0,0,0,.7);}',
    '.nkm-stage[data-v="u"] .nkm-bubble,.nkm-stage[data-v="u"] .nkm-pop{bottom:calc(100% + 8px);}',
    '.nkm-stage[data-v="d"] .nkm-bubble,.nkm-stage[data-v="d"] .nkm-pop{top:calc(100% + 8px);}',
    '.nkm-stage[data-h="l"] .nkm-bubble,.nkm-stage[data-h="l"] .nkm-pop{left:0;}',
    '.nkm-stage[data-h="r"] .nkm-bubble,.nkm-stage[data-h="r"] .nkm-pop{right:0;}',
    '.nkm-bubble{width:max-content;max-width:min(280px,calc(100vw - 32px));padding:12px 34px 12px 14px;font-size:12.5px;line-height:1.5;animation:nkmPop .28s cubic-bezier(.2,.8,.2,1);}',
    '.nkm-bubble::after{content:"";position:absolute;width:12px;height:12px;background:#0B0B0E;}',
    '.nkm-stage[data-v="u"] .nkm-bubble::after{bottom:-7px;border-right:1px solid rgba(200,155,84,.55);border-bottom:1px solid rgba(200,155,84,.55);transform:rotate(45deg);}',
    '.nkm-stage[data-v="d"] .nkm-bubble::after{top:-7px;border-left:1px solid rgba(200,155,84,.55);border-top:1px solid rgba(200,155,84,.55);transform:rotate(45deg);}',
    '.nkm-stage[data-h="l"] .nkm-bubble::after{left:26px;}.nkm-stage[data-h="r"] .nkm-bubble::after{right:26px;}',
    '.nkm-bubble[hidden],.nkm-pop[hidden]{display:none;}',
    '.nkm-bubble b{color:#E5BA73;font-weight:700;}',
    '.nkm-x{position:absolute;top:6px;right:6px;width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:rgba(247,244,240,.6);font-size:16px;line-height:1;cursor:pointer;}',
    '.nkm-x:hover{color:#F7F4F0;background:rgba(255,255,255,.08);}',
    '.nkm-b-act{display:inline-block;margin:8px 10px 0 0;padding:0;border:0;background:none;color:#E5BA73;font:inherit;font-size:12px;font-weight:700;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}',
    '.nkm-pop{width:min(310px,calc(100vw - 32px));padding:16px 16px 14px;animation:nkmPop .28s cubic-bezier(.2,.8,.2,1);}',
    '.nkm-pop-h{margin:0 0 6px;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#E5BA73;}',
    '.nkm-pop-t{margin:0 0 12px;font-size:13px;line-height:1.55;color:rgba(247,244,240,.88);}',
    '.nkm-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;}',
    '.nkm-chip{padding:6px 11px;border-radius:100px;border:1px solid rgba(200,155,84,.45);color:#F7F4F0;font-size:11.5px;font-weight:600;text-decoration:none;transition:background .2s ease;}',
    '.nkm-chip:hover{background:rgba(200,155,84,.18);}',
    '.nkm-ask{display:flex;gap:6px;margin:0 0 8px;}',
    '.nkm-ask input{flex:1;min-width:0;box-sizing:border-box;padding:9px 12px;border-radius:100px;border:1px solid rgba(200,155,84,.45);background:rgba(255,255,255,.06);color:#F7F4F0;font:inherit;font-size:12.5px;}',
    '.nkm-ask input::placeholder{color:rgba(247,244,240,.45);}',
    '.nkm-ask input:focus{outline:2px solid #E5BA73;outline-offset:1px;}',
    '.nkm-ask button{flex:none;width:36px;height:36px;border:0;border-radius:50%;background:#C89B54;color:#241c0f;cursor:pointer;display:flex;align-items:center;justify-content:center;}',
    '.nkm-ask button svg{display:block;width:16px;height:16px;}',
    '.nkm-answer{margin:0 0 10px;font-size:12.5px;line-height:1.5;color:#F7F4F0;}',
    '.nkm-answer:empty{display:none;}',
    '.nkm-go{display:flex;align-items:center;justify-content:center;width:100%;padding:11px 14px;border:0;border-radius:100px;background:#C89B54;color:#241c0f;font:inherit;font-size:12px;font-weight:700;letter-spacing:.03em;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease;}',
    '.nkm-go:hover{transform:translateY(-1px);box-shadow:0 10px 22px -10px rgba(200,155,84,.75);}',
    '.nkm-foot{display:flex;justify-content:space-between;gap:10px;margin-top:10px;}',
    '.nkm-foot button{padding:0;border:0;background:none;color:rgba(247,244,240,.55);font:inherit;font-size:11px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}',
    '.nkm-foot button:hover{color:#F7F4F0;}',
    '.nkm-widget button:focus-visible,.nkm-widget a:focus-visible,.nkm-widget input:focus-visible{outline:2px solid #E5BA73;outline-offset:2px;}',
    '@keyframes nkmFloatW{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
    '@keyframes nkmBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.014,1.03)}}',
    '@keyframes nkmWigL{0%,100%{transform:rotate(0)}25%{transform:rotate(-11deg)}55%{transform:rotate(6deg)}80%{transform:rotate(-3deg)}}',
    '@keyframes nkmWigR{0%,100%{transform:rotate(0)}25%{transform:rotate(11deg)}55%{transform:rotate(-6deg)}80%{transform:rotate(3deg)}}',
    '@keyframes nkmJoy{0%{transform:translateY(0) scale(1,1)}14%{transform:translateY(0) scale(1.1,.88)}40%{transform:translateY(-26px) scale(.95,1.08)}62%{transform:translateY(0) scale(1.07,.92)}78%{transform:translateY(-9px) scale(1)}100%{transform:translateY(0) scale(1)}}',
    '@keyframes nkmTwinkle{0%,100%{transform:scale(.4);opacity:.25}50%{transform:scale(1.15);opacity:1}}',
    '@keyframes nkmPop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}',
    '@media (prefers-reduced-motion:reduce){.nkm-float,.nkm-live .nkm-body,.nkm-widget.is-joy .nkm-jump,.nkm-live.is-wiggle .nkm-ear,.nkm-bubble,.nkm-pop,.nkm-widget.is-joy .nkm-spk,.nkm-widget.is-lab .nkm-spk{animation:none !important;}.nkm-widget.is-joy .nkm-spk,.nkm-widget.is-lab .nkm-spk{opacity:1;transform:none;}.nkm-stage.is-gliding,.nkm-live .nkm-tilt,.nkm-live .nkm-gaze,.nkm-lean{transition:none;}}'
  ].join('\n');

  var widget = { el: null, stage: null, live: null, bubble: null, pop: null, char: null, pin: null, lean: null };
  var pos = { x: 0, y: 0 }, roamRaf = 0, trackRaf = 0, trackPt = null, liftPx = 0;
  var bubbleTimer = 0, joyTimer = 0, labTimer = 0, idleTimer = 0, lastBubbleAt = 0, lastJoyAt = 0, lastActivity = 0, glideTimer = 0;
  var MUTE_KEY = 'nkm_mute_until', NUDGE_KEY = 'nkm_nudges', PIN_KEY = 'nikora_mascot_pinned';
  var userPinned = false, onCheckout = false;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function muted() { return Number(LS.get(MUTE_KEY) || 0) > Date.now(); }
  function docked() { return userPinned || onCheckout; }               /* pinned by the customer, or checkout (never roams over the payment form) */
  function quiet() { return userPinned; }                              /* quiet = no unsolicited bubbles, no head tracking, no extra motion */
  function charW() { return window.innerWidth <= 640 ? 54 : 66; }
  function charH() { return Math.round(charW() * 133 / 101.2); }

  /* checkout reassurance (all facts from the store's own policies; the Concierge phrases the same lines when it is loaded) */
  var CK_LINES = [
    'Your card details go straight to Stripe\u2019s secure payment form, never into NIKORA\u2019s own fields.',
    'Every order is covered by our 30-Day Money-Back Guarantee on unopened, unused items.',
    'Free Express Shipping on every order, with a tracking link once it ships.',
    'Processing takes 1\u20133 business days, then 7\u201315 business days in transit.',
    'Questions about your order? Our team replies within 2\u20134 business hours.'
  ];
  function reassureLine(i) { return CK_LINES[(Number(i) || 0) % CK_LINES.length]; }

  /* ---------- position: roam with the scroll, or sit in the corner ---------- */
  function target() {
    var vw = window.innerWidth, vh = window.innerHeight, W = charW(), H = charH();
    var right = CFG.side === 'right';
    if (docked()) return { x: right ? vw - W - 16 : 16, y: Math.max(8, vh - H - 16 - liftPx) };
    var hdr = doc.getElementById('nkn-header'), top = (hdr ? Math.max(0, hdr.getBoundingClientRect().bottom) : 0) + 14;
    var bottom = Math.max(top, vh - H - 22 - liftPx);
    var range = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight) - vh;
    var p = range > 40 ? clamp((window.pageYOffset || doc.documentElement.scrollTop || 0) / range, 0, 1) : 1;
    var gut = Math.min(90, vw * 0.07), sway = 0.5 + 0.5 * Math.sin(p * 6.4);
    return { x: right ? vw - W - 12 - sway * gut : 12 + sway * gut, y: top + p * (bottom - top) };
  }
  function place() {
    if (!widget.stage) return;
    var vw = window.innerWidth;
    widget.stage.style.transform = 'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,0)';
    widget.stage.setAttribute('data-h', pos.x + charW() / 2 > vw * 0.55 ? 'r' : 'l');
    widget.stage.setAttribute('data-v', pos.y < 230 ? 'd' : 'u');
  }
  function frame() {
    roamRaf = 0;
    var t = target(), k = reduceMotion() ? 1 : 0.1, dx = t.x - pos.x, dy = t.y - pos.y;
    pos.x += dx * k; pos.y += dy * k; place();
    if (widget.lean) widget.lean.style.setProperty('--nkm-lean', clamp(dy * 0.22, -9, 9).toFixed(1) + 'deg');
    if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) roamRaf = window.requestAnimationFrame(frame);
    else { pos.x = t.x; pos.y = t.y; place(); if (widget.lean) widget.lean.style.setProperty('--nkm-lean', '0deg'); }
  }
  function kick(snap) {
    if (!widget.stage) return;
    if (snap || docked()) { var t = target(); pos.x = t.x; pos.y = t.y; place(); return; }
    if (!roamRaf) roamRaf = window.requestAnimationFrame(frame);
  }

  /* ---------- pin / dock toggle (saved in localStorage 'nikora_mascot_pinned') ---------- */
  function setPinned(v, silent) {
    userPinned = !!v;
    if (!silent) LS.set(PIN_KEY, userPinned ? '1' : '0');
    if (!widget.el) return;
    widget.el.classList.toggle('is-pinned', userPinned);
    widget.pin.setAttribute('aria-pressed', userPinned ? 'true' : 'false');
    widget.pin.setAttribute('aria-label', userPinned ? 'Let the rabbit roam again' : 'Pin the rabbit to the corner');
    widget.pin.title = userPinned ? 'Let the rabbit roam again' : 'Pin the rabbit to the corner';
    if (userPinned) { hideBubble(); stopTrack(); }
    if (!silent) {                                                      /* glide to the new spot instead of jumping */
      widget.stage.classList.add('is-gliding'); clearTimeout(glideTimer);
      glideTimer = window.setTimeout(function () { widget.stage.classList.remove('is-gliding'); }, 700);
    }
    kick(false);
    if (docked()) { var t = target(); pos.x = t.x; pos.y = t.y; place(); }
    if (!silent) say(userPinned ? 'Pinned. I will stay quietly here.' : 'Off I go!', { ms: 2200, force: true, quiet: true });
    armIdle();
  }

  /* ---------- speech ---------- */
  function openAssistant() {
    closePop(true); hideBubble();
    if (typeof window.openAiAssistant === 'function') window.openAiAssistant();
    else if (window.NikoraAssistant && typeof window.NikoraAssistant.open === 'function') window.NikoraAssistant.open();
    else window.location.href = 'contact.html';
  }
  function hideBubble() { clearTimeout(bubbleTimer); if (widget.bubble) widget.bubble.hidden = true; }
  /** Speech bubble. o: { ms, ask (adds "Ask the Concierge"), href + hrefLabel, force (ignores "Hide tips" and quiet mode), quiet (no "Hide tips" link) }. */
  function say(text, o) {
    o = o || {};
    if (!widget.el || !text || (!o.force && (muted() || quiet())) || (widget.pop && !widget.pop.hidden)) return;
    var plain = String(text), m = /^(Mascot Note:|Tip:)\s*(.*)$/.exec(plain);
    var html = m ? '<b>' + esc(m[1]) + '</b> ' + esc(m[2]) : esc(plain);
    if (o.ask) html += '<br><button type="button" class="nkm-b-act" data-nkm="ask">Ask the Concierge</button>';
    if (o.href) html += '<br><a class="nkm-b-act" href="' + esc(safeHref(o.href)) + '">' + esc(o.hrefLabel || 'Take me there') + '</a>';
    if (o.quiet !== true && (o.ask || o.href)) html += '<button type="button" class="nkm-b-act" data-nkm="mute">Hide tips</button>';
    widget.bubble.innerHTML = html + '<button type="button" class="nkm-x" data-nkm="close" aria-label="Dismiss">\u00d7</button>';
    widget.bubble.hidden = false; lastBubbleAt = Date.now();
    clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(hideBubble, o.ms || (o.ask || o.href ? 9000 : 6500));
  }
  /** Live line from the Beauty Concierge (ai-assistant.js): resolves null when it is not loaded or has nothing to say. */
  function dynamicLine(kind, extra) {
    var A = window.NikoraAssistant;
    if (!A || typeof A.speak !== 'function') return Promise.resolve(null);
    var o = { kind: kind, page: location.pathname }, k; for (k in (extra || {})) o[k] = extra[k];
    return Promise.resolve(A.speak(o)).then(function (r) { return r && r.text ? r : null; }, function () { return null; });
  }

  /* ---------- reactions ---------- */
  function setClass(c, on) { if (widget.el) widget.el.classList.toggle(c, on); }
  function react(kind, o) {
    if (!widget.el) return;
    if (kind === 'joy') {
      if (Date.now() - lastJoyAt < 1500) return; lastJoyAt = Date.now();
      setClass('is-lab', false); setClass('is-joy', false); void widget.el.offsetWidth; setClass('is-joy', true);
      clearTimeout(joyTimer); joyTimer = window.setTimeout(function () { setClass('is-joy', false); }, 1100);
      if (!(o && o.silent) && Date.now() - lastBubbleAt > 6000) say(['Great pick!', 'Added to your routine.', 'Lovely choice!'][Math.floor(Math.random() * 3)], { ms: 2200 });
    } else if (kind === 'lab') {
      if (widget.el.classList.contains('is-joy')) return;
      setClass('is-lab', true); clearTimeout(labTimer);
      labTimer = window.setTimeout(function () { setClass('is-lab', false); }, (o && o.ms) || 2400);
    }
  }
  function cartCount() { try { return (JSON.parse(LS.get('nikora_cart') || '[]') || []).reduce(function (n, i) { return n + (Number(i && (i.qty != null ? i.qty : i.quantity)) || 1); }, 0); } catch (e) { return 0; } }
  var LAB_SEL = '[data-nk-ingredient],[data-nk-lab],.ingredient,.ingredient-chip,.key-active,#panel-science li,#panel-science strong,.mech-btn';

  /* ---------- cursor tracking: head tilt + eyes follow the pointer (not when pinned, on touch, or with reduced motion) ---------- */
  function stopTrack() { trackPt = null; if (widget.live) { widget.live.style.setProperty('--nkm-tilt', '0deg'); widget.live.style.setProperty('--nkm-gx', '0'); widget.live.style.setProperty('--nkm-gy', '0'); } }
  function applyTrack() {
    trackRaf = 0; if (!trackPt || !widget.live || quiet() || reduceMotion()) return;
    var cx = pos.x + charW() / 2, cy = pos.y + charH() * 0.62, dx = trackPt.x - cx, dy = trackPt.y - cy;
    widget.live.style.setProperty('--nkm-tilt', (clamp(dx / (window.innerWidth * 0.4), -1, 1) * 10).toFixed(1) + 'deg');
    widget.live.style.setProperty('--nkm-gx', (clamp(dx / 160, -1, 1) * 2.6).toFixed(2));
    widget.live.style.setProperty('--nkm-gy', (clamp(dy / 160, -1, 1) * 2).toFixed(2));
  }
  function onPointer(e) {
    if (e.pointerType === 'touch' || quiet() || reduceMotion()) return;
    trackPt = { x: e.clientX, y: e.clientY };
    if (!trackRaf) trackRaf = window.requestAnimationFrame(applyTrack);
  }

  /* ---------- idle life: blink + ear wiggle (paused while the tab is hidden; wiggles stop when pinned) ---------- */
  function lifeLoop() {
    if (reduceMotion() || !widget.live) return;
    function blink() {
      if (doc.hidden) return;
      widget.live.classList.add('is-blink');
      window.setTimeout(function () { widget.live.classList.remove('is-blink'); if (Math.random() < 0.28) window.setTimeout(function () { widget.live.classList.add('is-blink'); window.setTimeout(function () { widget.live.classList.remove('is-blink'); }, 110); }, 150); }, 120);
    }
    function wiggle() { if (doc.hidden || quiet()) return; widget.live.classList.add('is-wiggle'); window.setTimeout(function () { widget.live.classList.remove('is-wiggle'); }, 900); }
    (function loopB() { window.setTimeout(function () { blink(); loopB(); }, 2800 + Math.random() * 3200); })();
    (function loopW() { window.setTimeout(function () { wiggle(); loopW(); }, 7000 + Math.random() * 6000); })();
  }

  /* ---------- idle nudge: after 15 s without interaction the rabbit asks the Concierge for a line (live endpoint or local engine) and falls back to the built-in tips ---------- */
  function showNudge() {
    var n = Number(SS.get(NUDGE_KEY) || 0), max = onCheckout ? Math.max(CFG.maxNudges, 4) : CFG.maxNudges;
    if (n >= max || Date.now() - lastBubbleAt < 45000) return;
    SS.set(NUDGE_KEY, String(n + 1));
    if (widget.live && !reduceMotion()) { widget.live.classList.add('is-wiggle'); window.setTimeout(function () { widget.live.classList.remove('is-wiggle'); }, 900); }
    dynamicLine(onCheckout ? 'reassure' : 'tip', { i: n }).then(function (r) {
      if (r) { say(onCheckout || r.source === 'live' ? r.text : (/^(Tip:|Mascot Note:)/.test(r.text) ? r.text : 'Tip: ' + r.text), { ask: r.ask, href: r.href, hrefLabel: r.hrefLabel }); return; }
      var note = onCheckout ? { text: reassureLine(n) } : (personalNote() || pageTip());
      say(note.text, { ask: note.ask, href: note.href, hrefLabel: note.hrefLabel });
    });
  }
  function armIdle() {
    clearTimeout(idleTimer);
    if (quiet()) return;
    idleTimer = window.setTimeout(function () {
      if (doc.hidden || muted() || quiet() || (widget.pop && !widget.pop.hidden)) return;
      showNudge();
    }, CFG.idleMs);
  }
  function onActivity() { var t = Date.now(); if (t - lastActivity < 400) return; lastActivity = t; armIdle(); }

  /* ---------- quick guidance popup (note + links + ask box + chat button) ---------- */
  var SEND_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  function popHtml() {
    var p = getProfile(), note = personalNote(), chips = [];
    chips.push('<a class="nkm-chip" href="catalog.html?filter=bestsellers">Bestsellers</a>');
    if (p && p.concerns.indexOf('Hydration') >= 0) chips.push('<a class="nkm-chip" href="catalog.html?concern=Hydration">Hydration picks</a>');
    chips.push('<a class="nkm-chip" href="track-order.html">Track an order</a>');
    var intro = onCheckout ? reassureLine(0) : (note ? note.text.replace(/^Mascot Note:\s*/, '') : 'Hi, I am the NIKORA Rabbit. Ask me about a product or routine, and tell the Concierge your skin type so I can remember it.');
    return '<button type="button" class="nkm-x" data-nkm="closepop" aria-label="Close">\u00d7</button>' +
      '<p class="nkm-pop-h">' + (note && !onCheckout ? 'Mascot Note' : 'NIKORA Rabbit') + (p ? ' \u00b7 ' + esc(profileLabel(p)) : '') + '</p>' +
      '<p class="nkm-pop-t">' + esc(intro) + '</p>' +
      '<form class="nkm-ask" data-nkm-form><input type="text" name="q" maxlength="160" autocomplete="off" placeholder="Ask me about a product or routine" aria-label="Ask the NIKORA Rabbit"><button type="submit" aria-label="Ask">' + SEND_SVG + '</button></form>' +
      '<p class="nkm-answer" aria-live="polite"></p>' +
      '<div class="nkm-chips">' + chips.join('') + '</div>' +
      '<button type="button" class="nkm-go" data-nkm="ask">Chat with the Concierge</button>' +
      '<div class="nkm-foot">' + (p ? '<button type="button" data-nkm="forget">Clear my skin profile</button>' : '<span></span>') +
      '<button type="button" data-nkm="' + (muted() ? 'unmute' : 'mute') + '">' + (muted() ? 'Show tips' : 'Hide tips') + '</button></div>';
  }
  function askRabbit(q) {
    var out = widget.pop.querySelector('.nkm-answer'); if (!out) return;
    q = String(q || '').replace(/\s+/g, ' ').trim().slice(0, 160); if (!q) return;
    learn(q);                                                           /* "I have dry skin" typed here is remembered too */
    out.textContent = 'Let me think\u2026';
    dynamicLine('answer', { question: q }).then(function (r) {
      if (!out.isConnected && !doc.contains(out)) return;
      if (!r) { out.innerHTML = 'That one is best in the full chat. <button type="button" class="nkm-b-act" data-nkm="continue" data-q="' + esc(q) + '">Continue in chat</button>'; return; }
      out.innerHTML = esc(r.text) + (r.href ? ' <a class="nkm-b-act" href="' + esc(safeHref(r.href)) + '">' + esc(r.hrefLabel || 'View') + '</a>' : '') +
        (r.more ? ' <button type="button" class="nkm-b-act" data-nkm="continue" data-q="' + esc(q) + '">Continue in chat</button>' : '');
    });
  }
  function openPop() {
    hideBubble(); widget.pop.innerHTML = popHtml(); widget.pop.hidden = false; widget.char.setAttribute('aria-expanded', 'true');
    var inp = widget.pop.querySelector('.nkm-ask input'); if (inp) try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
  }
  function closePop(skipFocus) {
    if (!widget.pop || widget.pop.hidden) return;
    widget.pop.hidden = true; widget.char.setAttribute('aria-expanded', 'false'); if (!skipFocus) widget.char.focus();
  }

  function lift() {
    var bar = doc.getElementById('mobile-cta-bar'), v = 0;
    if (bar) { var cs = window.getComputedStyle(bar); if (cs.display !== 'none' && !/matrix\([^)]*,\s*[1-9]\d*\)$/.test(cs.transform) && bar.getBoundingClientRect().top < window.innerHeight) v = bar.offsetHeight + 8; }
    if (v !== liftPx) { liftPx = v; kick(false); }
  }
  function refreshDot() { /* the free-standing rabbit has no badge; kept so profile changes can call it */ }

  function initCompanion() {
    if (!CFG.widget || doc.getElementById('nkm-widget')) return;
    var path = location.pathname.toLowerCase();
    for (var i = 0; i < CFG.hideOn.length; i++) if (path.indexOf(CFG.hideOn[i]) >= 0) return;
    onCheckout = /checkout/.test(path);
    userPinned = LS.get(PIN_KEY) === '1' || CFG.roam === false;
    var st = doc.createElement('style'); st.id = 'nk-mascot-live-css'; st.textContent = COMPANION_CSS; (doc.head || doc.documentElement).appendChild(st);
    var el = doc.createElement('div');
    el.className = 'nkm-widget'; el.id = 'nkm-widget';
    el.innerHTML = '<div class="nkm-stage"><div class="nkm-bubble" role="status" aria-live="polite" hidden></div><div class="nkm-pop" role="dialog" aria-label="NIKORA Rabbit guide" hidden></div>' +
      '<button type="button" class="nkm-char" aria-label="Open the NIKORA Rabbit guide" aria-expanded="false"><span class="nkm-lean"><span class="nkm-jump"><span class="nkm-float">' + liveSvg() + '</span></span></span></button>' +
      '<button type="button" class="nkm-pin" aria-pressed="false">' + PIN_SVG + '</button></div>';
    doc.body.appendChild(el);
    widget.el = el; widget.stage = el.querySelector('.nkm-stage'); widget.bubble = el.querySelector('.nkm-bubble'); widget.pop = el.querySelector('.nkm-pop');
    widget.char = el.querySelector('.nkm-char'); widget.pin = el.querySelector('.nkm-pin'); widget.lean = el.querySelector('.nkm-lean'); widget.live = el.querySelector('.nkm-live');
    if (onCheckout) el.classList.add('is-forced-dock');
    setPinned(userPinned, true);
    lift(); kick(true);

    widget.char.addEventListener('click', function () { if (widget.pop.hidden) openPop(); else closePop(); });
    widget.pin.addEventListener('click', function (e) { e.stopPropagation(); setPinned(!userPinned); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-nkm]'); if (!b) return;
      var a = b.getAttribute('data-nkm');
      if (a === 'ask') openAssistant();
      else if (a === 'close') hideBubble();
      else if (a === 'closepop') closePop();
      else if (a === 'mute') { LS.set(MUTE_KEY, String(Date.now() + 7 * 864e5)); hideBubble(); if (!widget.pop.hidden) widget.pop.innerHTML = popHtml(); }
      else if (a === 'unmute') { LS.del(MUTE_KEY); if (!widget.pop.hidden) widget.pop.innerHTML = popHtml(); }
      else if (a === 'forget') { forget(); widget.pop.innerHTML = popHtml(); }
      else if (a === 'continue') {                                       /* hand the question to the full chat */
        var q = b.getAttribute('data-q') || ''; closePop(true); hideBubble();
        if (window.NikoraAssistant && typeof window.NikoraAssistant.send === 'function') window.NikoraAssistant.send(q); else openAssistant();
      }
    });
    el.addEventListener('submit', function (e) { var f = e.target; if (f && f.matches && f.matches('[data-nkm-form]')) { e.preventDefault(); askRabbit(f.q.value); } });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!widget.pop.hidden) closePop(); else hideBubble(); } });
    doc.addEventListener('click', function (e) { if (widget.pop && !widget.pop.hidden && !el.contains(e.target)) closePop(true); }, true);
    window.addEventListener('nikora:assistant-open', function () { closePop(true); hideBubble(); setClass('is-chat-open', true); });
    window.addEventListener('nikora:assistant-close', function () { setClass('is-chat-open', false); });

    /* roaming follows the scroll; resize / orientation re-places the rabbit */
    window.addEventListener('scroll', function () { kick(false); }, { passive: true });
    window.addEventListener('resize', function () { kick(true); });
    window.addEventListener('load', function () { kick(false); });
    window.addEventListener('pointermove', onPointer, { passive: true });
    /* joyful jump when something was really added to the cart (the bag count went up after the click) */
    doc.addEventListener('click', function () { var before = cartCount(); window.setTimeout(function () { if (cartCount() > before) react('joy'); }, 350); }, true);
    /* science mode: lab goggles + sparkles while the pointer is on a key ingredient */
    doc.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest(LAB_SEL); if (!t) return;
      react('lab', { ms: 2600 });
      var msg = t.getAttribute && t.getAttribute('data-nk-lab'); if (msg && Date.now() - lastBubbleAt > 4000) say(msg, { ms: 4200, quiet: true });
    });
    ['pointermove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(function (ev) { window.addEventListener(ev, onActivity, { passive: true }); });
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) armIdle(); });
    window.setInterval(lift, 800); lifeLoop(); armIdle();
    /* checkout: the rabbit is there to reassure, with one friendly line a few seconds after the page opens */
    if (onCheckout && !quiet() && !muted() && !SS.get('nkm_ck_hello')) {
      SS.set('nkm_ck_hello', '1');
      window.setTimeout(function () { dynamicLine('reassure', { i: 0 }).then(function (r) { say(r ? r.text : reassureLine(0), { quiet: true, ms: 8000 }); }); }, 4000);
    }
  }

  injectCss();
  var api = { version: '1.0', svg: svg, tip: tip, help: help, empty: empty, enhance: enhance, poses: Object.keys(POSES),
    learn: learn, setProfile: setProfile, getProfile: getProfile, forget: forget, say: say, react: react, open: openAssistant };
  window.NKMascot = api;

  function start() {
    enhance(doc.body);
    initCompanion();
    if (window.MutationObserver) {
      var queue = [], raf = 0;
      new MutationObserver(function (list) {
        list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) queue.push(n); }); });
        if (queue.length && !raf) raf = window.requestAnimationFrame(function () { raf = 0; var q = queue; queue = []; q.forEach(enhance); });
      }).observe(doc.body, { childList: true, subtree: true });
    }
    doc.addEventListener('click', function (e) {                                  /* the cart CTA closes the drawer before navigating */
      var a = e.target.closest && e.target.closest('[data-nkm-close-cart]');
      if (a && typeof window.closeCart === 'function') { try { window.closeCart(); } catch (err) {} }
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
