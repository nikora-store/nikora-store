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
 *   Modes      ROAMING GUIDE: it rests in the bottom corner, but travels across the viewport to point at buttons and sections (gold ring + speech bubble), wanders between screen edges when idle, and offers a "Show me around" tour (section 5c). At checkout it never roams. Legacy note:
 *               (saved in localStorage 'nikora_mascot_pinned'). At checkout it is always docked in the corner so it never sits over the payment form.
 *   Speech     idle tips, answers to the popup's ask box and checkout reassurance come from NikoraAssistant.speak() (ai-assistant.js: the live endpoint when
 *               configured, else the local engine, using the customer's chat history + remembered profile); built-in lines are only the fallback.
 *   Theme      light: obsidian body, gold #C89B54 outline, cream face. dark: cream-gold body, crisp obsidian face. Pure CSS on <html data-theme>, so it flips with the toggle.
 *   Autonomy   says hello with a hop on arrival, leans with the page scroll and hops when a long scroll stops, then every 8-15 s hops, wiggles, or points (head turn + gold arrow + a line) at the cart or the Bestsellers; emotions (cart joy, lab goggles, surprise) are 0 ms.
 *   Guide      proactive scenes per page (arrival, idle), hints after cart adds / cart open / search focus / filter clicks, exit intent, a "where is ...?" finder in the ask box and a guided tour; NKMascot.guide.show(el, text), .tour(), .home(), .wander() for your own pages.
 *   Returning buyers start PINNED when localStorage 'nikora_has_purchased' is set (checkout.html sets it and fires 'nikora:order-complete'); an explicit pin choice always wins.
 *   Memory     a curation filter keeps only skin type, concerns, ingredients, avoid-list and preferences (see section 5a); NKMascot.curate(text) shows what it would keep.
 *   Layer      z-index 999999 so it stays crisp above cart drawers, modals and their blurred backdrops.
 *   Motion      gentle float + breathing, ear wiggles, eye blinks (floating and jumping are off for prefers-reduced-motion, which keeps blinks, glow and tips; paused while the tab is hidden).
 *   Reactions   joyful bounce when the bag count really goes up; "Lab Specialist" goggles + sparkles while the pointer is on a key ingredient
 *               (mark any element with data-nk-ingredient, optionally data-nk-lab="short fact" for a bubble); a helpful tip after 15 s idle (max 3 per visit).
 *   Memory      reads / writes the customer's skin type + concerns in this browser (localStorage 'nikora_profile'):
 *                 NKMascot.learn(text)   call it with each sentence the CUSTOMER types in the Concierge; it spots "dry", "sensitive", "barrier repair", ...
 *                 NKMascot.setProfile({ skinTypes:['dry'], concerns:['Barrier Repair'] })   or save a profile you already have
 *                 NKMascot.getProfile() / NKMascot.forget()     window event 'nikora:profile' fires on every change
 *   Click       opens a quick guidance popup; "Chat with the Concierge" calls window.openAiAssistant().
 *   Config      window.NK_MASCOT = { widget:true, side:'left'|'right', roam:true|false (false = always pinned), idleMs:15000, maxNudges:3, hideOn:[], guide:true|false (false = no proactive messages or roaming), motion:'auto'|'full' (full = keep the jumping / floating even when the visitor's system asks for reduced motion) }  (set before this file loads)
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
    var d = { widget: true, side: 'left', idleMs: 15000, maxNudges: 3, hideOn: [], roam: true, autoStatic: true, motion: 'auto', guide: true }, u = window.NK_MASCOT || {}, k;
    for (k in u) if (Object.prototype.hasOwnProperty.call(u, k)) d[k] = u[k];
    return d;
  })();
  var reduceMotion = function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  /* Motion policy. 'auto' follows the visitor's system setting: with "reduce motion" on the rabbit runs in CALM mode (no floating, jumping or travelling; it still blinks, glows, speaks and points).
     window.NK_MASCOT = { motion: 'full' } keeps the playful motion for everyone. NKMascot.motion() tells which mode is active. */
  function calm() { return reduceMotion() && CFG.motion !== 'full'; }
  function store(kind) {
    return {
      get: function (k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window[kind].setItem(k, v); } catch (e) {} },
      del: function (k) { try { window[kind].removeItem(k); } catch (e) {} }
    };
  }
  var LS = store('localStorage'), SS = store('sessionStorage');

  /* ---------- 5a. customer profile + CURATION FILTER (skin type, concerns, ingredients, avoid-list, preferences) ----------
     Kept in this browser only (localStorage 'nikora_profile', v2). Only controlled vocabulary is ever stored, never the customer's raw words:
       skinTypes / concerns / prefs come from fixed lists, ingredients and the avoid-list from the LIVE catalog vocabulary (NikoraAssistant.vocab(),
       so products added in the admin panel are understood without any code change) plus a built-in ingredient lexicon.
     The curation filter decides what is worth remembering:
       - drops small talk, order / shipping / account chatter, emails, phone numbers and order numbers before anything is read
       - never reads a sentence that touches health topics (pregnancy, eczema, allergies, medication ...)
       - a first-person or explicit statement ("my skin is dry", "I want niacinamide", "avoid fragrance") is learned at once
       - a casual mention (a question about an ingredient) only counts after it came up twice; unused items fade after 120 days
     setProfile() validates every value against the same lists, so a language model's suggestion cannot add anything outside them. */
  var PROFILE_KEY = 'nikora_profile', DAY = 864e5, KEEP_MS = 120 * DAY;
  var SKIN_RE = { dry: /\b(dry|dryness)\b/i, oily: /\b(oily|greasy)\b/i, combination: /\b(combination|combo)\b/i, sensitive: /\b(sensitive|sensitivity|reactive|irritated)\b/i, normal: /\bnormal skin\b/i };
  var CONCERN_RE = {
    'Barrier Repair': /\b(barrier|damaged skin|compromised skin)\b/i,
    'Hydration': /\b(hydrat\w*|dehydrat\w*|moisturi[sz]\w*)\b/i,
    'Acne & Blemishes': /\b(acne|breakouts?|blemish\w*|pimples?)\b/i,
    'Dullness': /\b(dull\w*|brighten\w*|radiance)\b/i,
    'Redness': /\b(redness|flushed)\b/i,
    'Dark Spots': /\b(dark spots?|hyperpigmentation|pigmentation|sun spots?)\b/i,
    'Fine Lines': /\b(fine lines?|wrinkles?|aging|ageing|firming)\b/i,
    'Pores': /\bpores?\b/i
  };
  var PREF_RE = {
    'fragrance-free': /\b(fragrance[- ]free|unscented|no fragrance|without fragrance|scent[- ]free)\b/i,
    'alcohol-free': /\b(alcohol[- ]free|no alcohol|without alcohol)\b/i,
    'vegan': /\bvegan\b/i,
    'cruelty-free': /\bcruelty[- ]free\b/i,
    'lightweight': /\b(lightweight|light texture|non[- ]greasy|not greasy)\b/i
  };
  var AVOID_RE = { 'fragrance': /\b(fragrance|perfume|parfum)\b/i, 'alcohol': /\balcohol\b/i, 'essential oils': /\bessential oils?\b/i, 'sulfates': /\bsulfates?\b/i, 'parabens': /\bparabens?\b/i };
  /* built-in ingredient lexicon: the floor of the vocabulary when the Concierge (and its live catalog) is not loaded yet */
  var LEXICON = ['niacinamide', 'hyaluronic acid', 'ceramide', 'retinol', 'vitamin c', 'centella', 'snail mucin', 'heartleaf', 'birch', 'collagen', 'peptide', 'panthenol', 'squalane',
    'salicylic acid', 'glycolic acid', 'lactic acid', 'azelaic acid', 'propolis', 'mugwort', 'green tea', 'tea tree', 'aloe', 'madecassoside', 'adenosine', 'allantoin', 'ginseng', 'zinc'];
  /* conversational noise and things that must never become profile data */
  var SMALLTALK_RE = /^(hi|hello|hey|yo|thanks|thank you|thx|ok|okay|yes|no|yep|nope|sure|lol|haha|bye|goodbye|good (morning|afternoon|evening|night)|great|cool|nice|please|help|test)\W*$/i;
  var SUPPORT_RE = /\b(order|tracking|track|refund|returns?|returned|shipping|shipped|deliver\w*|payment|charged?|invoice|cancel\w*|email|account|password|promo code|discount code)\b/i;
  var SENSITIVE_RE = /\b(pregnan\w*|breast[- ]?feed\w*|nursing|eczema|psoriasis|dermatitis|rosacea|allerg\w*|medicat\w*|prescription|doctor|diagnos\w*|cancer|chemo\w*|pacemaker|implant\w*|surgery|medical)\b/i;
  var STRONG_RE = /\b(my skin|my face|i have|i am|i'?m|i get|mine is|i want|i need|i'?d like|looking for|i prefer|i love|i like|i use|i avoid|avoid|stay away|steer clear|without|free of|free from|do not want|don'?t want|can'?t use|cannot use|hate|dislike)\b/i;
  var AVOID_CUE = /\b(avoid|stay away|steer clear|without|free of|free from|do not want|don'?t want|can'?t use|cannot use|hate|dislike|breaks? me out|irritates? me)\b|\bno (fragrance|alcohol|essential|sulfate|paraben)/i;
  var CAPS = { skinTypes: 3, concerns: 4, ingredients: 8, avoid: 6, prefs: 5 };
  /* what a product page has to mention before the rabbit says it lines up with the customer's profile (never claimed otherwise) */
  var PRODUCT_RE = {
    dry: /\b(dry|dryness|hydrat\w*|moisturi[sz]\w*)\b/i, oily: /\b(oil\w*|sebum|pores?)\b/i, combination: /\b(combination|balanc\w*)\b/i,
    sensitive: /\b(sensitive|soothing|calming|centella)\b/i, normal: /\b(all skin types|every skin type)\b/i,
    'Barrier Repair': /\b(barrier|ceramide\w*|repair\w*)\b/i, 'Hydration': /\b(hydrat\w*|moisturi[sz]\w*|hyaluronic)\b/i,
    'Acne & Blemishes': /\b(acne|blemish\w*|breakouts?)\b/i, 'Dullness': /\b(glow\w*|brighten\w*|radian\w*)\b/i, 'Redness': /\b(redness|soothing|calming)\b/i,
    'Dark Spots': /\b(dark spots?|pigment\w*)\b/i, 'Fine Lines': /\b(fine lines?|wrinkle\w*|firm\w*|collagen|lift\w*)\b/i, 'Pores': /\bpores?\b/i
  };
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function uniq(a) { var o = []; a.forEach(function (v) { if (o.indexOf(v) < 0) o.push(v); }); return o; }
  function negated(text, idx) { return /\b(not|no|isn'?t|never|without)\s+(really\s+|very\s+)?$/i.test(text.slice(Math.max(0, idx - 14), idx)); }
  function hit(re, text) {
    var g = new RegExp(re.source, 'ig'), m;
    while ((m = g.exec(text))) { if (!negated(text, m.index)) return true; }
    return false;
  }
  function scrub(t) {
    return String(t || '').slice(0, 600).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ' ').replace(/\b(nk|ret)[-\s]?\d{3,}\b/gi, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/\+?\d[\d\s().-]{7,}\d/g, ' ');
  }
  function cleanList(a, allowed) {
    var out = [];
    (Array.isArray(a) ? a : (a ? [a] : [])).forEach(function (v) {
      v = String(v || '').trim(); if (!v) return;
      var key = allowed ? Object.keys(allowed).filter(function (k) { return k.toLowerCase() === v.toLowerCase(); })[0] : null;
      if (key && out.indexOf(key) < 0) out.push(key);
    });
    return out;
  }
  function cleanTerms(a) {                                              /* stored ingredient / avoid terms: plain lowercase words only */
    return uniq((Array.isArray(a) ? a : []).map(function (v) { return String(v || '').toLowerCase().trim(); }).filter(function (v) { return /^[a-z0-9][a-z0-9 \-]{1,38}$/.test(v); }));
  }

  /** The live ingredient vocabulary: the Concierge derives it from the catalog it just loaded (new products appear automatically), plus the built-in lexicon. */
  function vocabulary() {
    var out = {}, A = window.NikoraAssistant, list = [];
    try { if (A && typeof A.vocab === 'function') list = A.vocab() || []; } catch (e) {}
    list.forEach(function (v) { var t = String((v && v.term) || v || '').toLowerCase().trim(); if (t.length >= 3 && t.length <= 40) out[t] = 1; });
    LEXICON.forEach(function (t) { out[t] = 1; });
    return Object.keys(out);
  }
  function allowed() { return { skinTypes: Object.keys(SKIN_RE), concerns: Object.keys(CONCERN_RE), prefs: Object.keys(PREF_RE), avoid: Object.keys(AVOID_RE).concat(vocabulary()), ingredients: vocabulary() }; }
  /** Cheap pre-check (used before spending a language-model call): is this message worth reading at all? */
  function looksUseful(text) {
    var t = scrub(text).trim();
    return t.length >= 8 && !SMALLTALK_RE.test(t) && STRONG_RE.test(t) && !SENSITIVE_RE.test(t);
  }

  /** Pure: reads one customer message and returns what is worth remembering. weak = casual mentions that need a second sighting. */
  function curate(text) {
    var out = { skinTypes: [], concerns: [], ingredients: [], avoid: [], prefs: [], weak: [] };
    text = scrub(text); if (!text.trim() || SMALLTALK_RE.test(text.trim())) return out;
    var terms = vocabulary();
    text.split(/[.!?\n;]+/).forEach(function (s) {
      s = s.trim(); if (s.length < 4 || SENSITIVE_RE.test(s)) return;                       /* health sentences are never read */
      var avoidCue = AVOID_CUE.test(s), strong = STRONG_RE.test(s) || avoidCue;
      var st = [], cn = [], pf = [], av = [], ing = [];
      Object.keys(SKIN_RE).forEach(function (k) { if (hit(SKIN_RE[k], s)) st.push(k); });
      Object.keys(CONCERN_RE).forEach(function (k) { if (hit(CONCERN_RE[k], s)) cn.push(k); });
      Object.keys(PREF_RE).forEach(function (k) { if (PREF_RE[k].test(s)) pf.push(k); });
      if (avoidCue) Object.keys(AVOID_RE).forEach(function (k) { if (AVOID_RE[k].test(s)) av.push(k); });
      terms.forEach(function (t) { if (new RegExp('\\b' + escRe(t) + 's?\\b', 'i').test(s)) ing.push(t); });
      if (!(st.length || cn.length || pf.length || av.length || ing.length)) return;
      if (SUPPORT_RE.test(s) && !strong) return;                                             /* order / shipping / account chatter */
      if (avoidCue) { av = av.concat(ing); ing = []; }                                       /* "avoid retinol" -> avoid-list, not interest */
      if (strong) {
        out.skinTypes = out.skinTypes.concat(st); out.concerns = out.concerns.concat(cn); out.prefs = out.prefs.concat(pf);
        out.avoid = out.avoid.concat(av); out.ingredients = out.ingredients.concat(ing);
      } else {
        st.forEach(function (k) { out.weak.push('st:' + k); }); cn.forEach(function (k) { out.weak.push('cn:' + k); }); ing.forEach(function (k) { out.weak.push('ing:' + k); });
      }
    });
    ['skinTypes', 'concerns', 'ingredients', 'avoid', 'prefs', 'weak'].forEach(function (k) { out[k] = uniq(out[k]); });
    return out;
  }

  /* ---- storage: v2 record { skinTypes, concerns, ingredients, avoid, prefs, pending{}, seen{} } ---- */
  var EXTERNAL_KEYS = ['nikora_ai_profile', 'nkai_profile', 'nkai_memory', 'nikora_ai_memory', 'nikora_assistant_memory'];
  function readRaw() {
    var r; try { r = JSON.parse(LS.get(PROFILE_KEY) || 'null'); } catch (e) { r = null; }
    r = r && typeof r === 'object' ? r : {};
    return { v: 2, skinTypes: cleanList(r.skinTypes, SKIN_RE), concerns: cleanList(r.concerns, CONCERN_RE), prefs: cleanList(r.prefs, PREF_RE),
      avoid: cleanTerms(r.avoid), ingredients: cleanTerms(r.ingredients),
      pending: r.pending && typeof r.pending === 'object' ? r.pending : {}, seen: r.seen && typeof r.seen === 'object' ? r.seen : {} };
  }
  function writeRaw(r) {
    r.updatedAt = Date.now(); LS.set(PROFILE_KEY, JSON.stringify(r));
    try { window.dispatchEvent(new CustomEvent('nikora:profile', { detail: getProfile() })); } catch (e) {}
  }
  function merge(r, add) {                                                                   /* validate, de-duplicate, cap (oldest out), stamp */
    var now = Date.now(), vocab = vocabulary(), avoidOk = Object.keys(AVOID_RE).concat(vocab);
    function put(list, vals, prefix) {
      vals.forEach(function (v) { if (r[list].indexOf(v) < 0) r[list].push(v); r.seen[prefix + ':' + v] = now; });
      while (r[list].length > CAPS[list]) {
        var oldest = r[list].slice().sort(function (a, b) { return (r.seen[prefix + ':' + a] || 0) - (r.seen[prefix + ':' + b] || 0); })[0];
        r[list].splice(r[list].indexOf(oldest), 1); delete r.seen[prefix + ':' + oldest];
      }
    }
    put('skinTypes', cleanList([].concat(add.skinTypes || [], add.skinType || []).map(function (s) { return String(s).toLowerCase(); }), SKIN_RE), 's');
    put('concerns', cleanList([].concat(add.concerns || [], add.concern || []), CONCERN_RE), 'c');
    put('prefs', cleanList(add.prefs, PREF_RE), 'p');
    put('ingredients', cleanTerms(add.ingredients).filter(function (t) { return vocab.indexOf(t) >= 0; }), 'i');
    put('avoid', cleanTerms(add.avoid).filter(function (t) { return avoidOk.indexOf(t) >= 0; }), 'a');
    return r;
  }
  /* tolerant reader for whatever the Concierge itself might store: skinType(s) / concerns / goals up to 3 levels deep */
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
    var r = readRaw(), now = Date.now(), p = { skinTypes: [], concerns: [], ingredients: [], avoid: [], prefs: [] };
    var pre = { skinTypes: 's', concerns: 'c', ingredients: 'i', avoid: 'a', prefs: 'p' };
    Object.keys(pre).forEach(function (k) { p[k] = r[k].filter(function (v) { var t = r.seen[pre[k] + ':' + v]; return !t || now - t < KEEP_MS; }); });   /* unused items fade */
    EXTERNAL_KEYS.forEach(function (k) { var raw = LS.get(k); if (!raw) return; try { digProfile(JSON.parse(raw), 0, p); } catch (e) {} });
    p.skinTypes = cleanList(p.skinTypes, SKIN_RE); p.concerns = cleanList(p.concerns, CONCERN_RE).slice(0, CAPS.concerns);
    return (p.skinTypes.length || p.concerns.length || p.ingredients.length || p.avoid.length || p.prefs.length) ? p : null;
  }
  /** Merge a profile object { skinTypes | skinType, concerns | concern, ingredients, avoid, prefs } into the saved profile (every value is validated). */
  function setProfile(o) { var r = merge(readRaw(), o || {}); writeRaw(r); return getProfile(); }
  /** Reads a sentence the CUSTOMER typed ("my skin is dry, I want niacinamide, avoid fragrance") and remembers what the curation filter keeps. */
  function learn(text) {
    var c = curate(text), r = readRaw(), now = Date.now(), promo = { skinTypes: [], concerns: [], ingredients: [] };
    Object.keys(r.pending).forEach(function (k) { if (!r.pending[k] || now - (r.pending[k].at || 0) > 14 * DAY) delete r.pending[k]; });
    c.weak.forEach(function (w) {                                                            /* a casual mention counts on its second sighting */
      var rec = r.pending[w] || { n: 0 }; rec.n++; rec.at = now;
      if (rec.n >= 2) { var kind = w.slice(0, w.indexOf(':')), val = w.slice(w.indexOf(':') + 1); delete r.pending[w]; (kind === 'st' ? promo.skinTypes : kind === 'cn' ? promo.concerns : promo.ingredients).push(val); }
      else r.pending[w] = rec;
    });
    var add = { skinTypes: c.skinTypes.concat(promo.skinTypes), concerns: c.concerns.concat(promo.concerns), ingredients: c.ingredients.concat(promo.ingredients), avoid: c.avoid, prefs: c.prefs };
    var any = add.skinTypes.length || add.concerns.length || add.ingredients.length || add.avoid.length || add.prefs.length;
    if (any) merge(r, add);
    if (any || c.weak.length) writeRaw(r);
    return getProfile();
  }
  function forget() { LS.del(PROFILE_KEY); EXTERNAL_KEYS.forEach(function (k) { LS.del(k); }); try { window.dispatchEvent(new CustomEvent('nikora:profile', { detail: null })); } catch (e) {} }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function profileLabel(p) { return p ? (p.skinTypes.length ? p.skinTypes.map(cap).join('/') + ' skin' : (p.concerns[0] || (p.ingredients[0] ? cap(p.ingredients[0]) : ''))) : ''; }

  /* the one personal note: a product page only gets "matches" when its own text mentions what the customer asked for (or wanted to avoid) */
  function productText() {
    var parts = [], h1 = doc.querySelector('h1'), md = doc.querySelector('meta[name="description"]'), sci = doc.getElementById('panel-science');
    if (h1) parts.push(h1.textContent); if (md) parts.push(md.getAttribute('content')); if (sci) parts.push(sci.textContent);
    return parts.join(' ').slice(0, 4000);
  }
  function mentions(txt, term) {                                          /* "fragrance-free" / "without alcohol" do not count as mentioning the term */
    var re = new RegExp('\\b' + escRe(term) + 's?\\b', 'ig'), m;
    while ((m = re.exec(txt))) {
      var after = txt.slice(m.index + m[0].length, m.index + m[0].length + 6), before = txt.slice(Math.max(0, m.index - 12), m.index);
      if (/^[\s-]*free/i.test(after) || /\b(free of|free from|without|no)\s*$/i.test(before)) continue;
      return m[0].toLowerCase();
    }
    return '';
  }
  function personalNote() {
    var p = getProfile(); if (!p) return null;
    if (/product/i.test(location.pathname)) {
      var txt = productText(), i, w;
      if (txt) {
        for (i = 0; i < p.avoid.length; i++) if ((w = mentions(txt, p.avoid[i]))) return { text: 'Mascot Note: Heads up, this one mentions \u201c' + w + '\u201d, which you wanted to avoid.' };
        for (i = 0; i < p.ingredients.length; i++) if ((w = mentions(txt, p.ingredients[i]))) return { text: 'Mascot Note: this one mentions \u201c' + w + '\u201d, one of the ingredients you were interested in.' };
        var keys = p.skinTypes.concat(p.concerns), m;
        for (i = 0; i < keys.length; i++) {
          var re = PRODUCT_RE[keys[i]]; if (!re) continue;
          if ((m = re.exec(txt))) return { text: 'Mascot Note: this one mentions \u201c' + m[0].toLowerCase() + '\u201d, which lines up with your ' + (SKIN_RE[keys[i]] ? cap(keys[i]) + ' skin' : keys[i]) + ' goals.' };
        }
      }
    }
    if (p.skinTypes.indexOf('sensitive') >= 0) return { text: 'Mascot Note: Remember to patch test on sensitive skin!' };
    if (p.skinTypes.indexOf('dry') >= 0) return { text: 'Mascot Note: Dry skin loves hydration layered on damp skin.' };
    if (p.ingredients.length) return { text: 'Mascot Note: You were curious about ' + p.ingredients[0] + '. Ask me which products feature it.', ask: true };
    if (p.concerns.length) return { text: 'Mascot Note: Your focus is ' + p.concerns[0] + '. Ask me for picks that fit.', ask: true };
    if (p.prefs.length) return { text: 'Mascot Note: You prefer ' + p.prefs[0] + '. Check each ingredient list before you buy.' };
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
        '<ellipse class="nkm-mouth-o" cx="48.6" cy="98" rx="3.8" ry="5"/>' +
      '</g></g>' +
      '<path class="nkm-spk nkm-spk1" transform="translate(92 22)" d="' + SPARK + '"/><path class="nkm-spk nkm-spk2" transform="translate(6 38) scale(.7)" d="' + SPARK + '"/><path class="nkm-spk nkm-spk3" transform="translate(88 62) scale(.5)" d="' + SPARK + '"/>' +
    '</svg>';
  }
  var PIN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><g class="nkm-pin-g" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16.5V22"/><path d="M8.5 3h7l-1 6.2 3 3.3v2H6.5v-2l3-3.3z"/></g></svg>';

  var COMPANION_CSS = [
    /* the layer covers the viewport but lets every click through; only the character, pin, bubble and popup take pointer events */
    '.nkm-widget{position:fixed;inset:0;z-index:999999;pointer-events:none;font-family:"Montserrat",system-ui,sans-serif;--nkm-w:66px;}',
    /* theme sync (instant, pure CSS on <html data-theme>): light = obsidian body + gold outline + cream face; dark = cream-gold body + crisp obsidian face */
    '.nkm-widget{--nkm-fill:#1C1722;--nkm-line:#C89B54;--nkm-face:#F7F4F0;--nkm-nose:#C89B54;--nkm-spark:#C89B54;--nkm-gog:rgba(200,155,84,.26);--nkm-gogline:#C89B54;}',
    ':root[data-theme="dark"] .nkm-widget{--nkm-fill:#F2E3BE;--nkm-line:#D9AE62;--nkm-face:#0B0B0E;--nkm-nose:#8F6726;--nkm-spark:#F4D58D;--nkm-gog:rgba(11,11,14,.14);--nkm-gogline:#0B0B0E;}',
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
    '.nkm-float{display:block;transform-origin:50% 100%;animation:nkmFloatW 3.4s ease-in-out infinite;}',
    '.nkm-live{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 8px 16px rgba(0,0,0,.18));}',
    '.nkm-live .nkm-shape{fill:var(--nkm-fill);stroke:var(--nkm-line);stroke-width:6.5;stroke-linejoin:round;stroke-linecap:round;}',
    '.nkm-live .nkm-cream{fill:var(--nkm-face);}',
    '.nkm-live .nkm-nose{fill:var(--nkm-nose);}',
    '.nkm-live .nkm-mouth{fill:none;stroke:var(--nkm-face);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}',
    '.nkm-live .nkm-mouth-o{fill:var(--nkm-face);opacity:0;}',
    /* emotions switch with NO transition (0 ms): the state class is the only thing that changes */
    '.nkm-live .nkm-eye-happy,.nkm-live .nkm-goggles{opacity:0;transition:none;}',
    '.nkm-live .nkm-eye-happy{fill:none;stroke:var(--nkm-face);stroke-width:3.4;stroke-linecap:round;}',
    '.nkm-live .nkm-goggles{fill:var(--nkm-gog);stroke:var(--nkm-gogline);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;}',
    '.nkm-live .nkm-spk{fill:var(--nkm-spark);opacity:0;transform-box:fill-box;transform-origin:center;}',
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
    /* playful hop, surprise, pointing arrow */
    '.nkm-widget.is-hop .nkm-jump{animation:nkmHop .7s cubic-bezier(.3,.7,.4,1);}',
    '.nkm-widget.is-surprise .nkm-jump{animation:nkmHop .45s cubic-bezier(.3,.7,.4,1);}',
    '.nkm-widget.is-surprise .nkm-live .nkm-cream{transform-box:fill-box;transform-origin:center;transform:scale(1.42);}',
    '.nkm-widget.is-surprise .nkm-live .nkm-mouth{opacity:0;}.nkm-widget.is-surprise .nkm-live .nkm-mouth-o{opacity:1;}',
    '.nkm-widget.is-surprise .nkm-live .nkm-ear-l{transform:rotate(-7deg) translateY(-3px);}.nkm-widget.is-surprise .nkm-live .nkm-ear-r{transform:rotate(7deg) translateY(-3px);}',
    '.nkm-arrow{position:absolute;left:0;top:0;width:22px;height:22px;pointer-events:none;color:#C89B54;transform:rotate(var(--nkm-ang,0deg));filter:drop-shadow(0 2px 5px rgba(0,0,0,.4));}',
    '.nkm-arrow[hidden]{display:none;}',
    '.nkm-arrow svg{display:block;width:100%;height:100%;animation:nkmNudge .7s ease-in-out infinite;}',
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
    '.nkm-bubble{width:max-content;max-width:min(280px,calc(100vw - 32px));padding:12px 34px 12px 14px;font-size:12.5px;line-height:1.5;animation:nkmPop .14s cubic-bezier(.2,.8,.2,1);}',
    '.nkm-bubble::after{content:"";position:absolute;width:12px;height:12px;background:#0B0B0E;}',
    '.nkm-stage[data-v="u"] .nkm-bubble::after{bottom:-7px;border-right:1px solid rgba(200,155,84,.55);border-bottom:1px solid rgba(200,155,84,.55);transform:rotate(45deg);}',
    '.nkm-stage[data-v="d"] .nkm-bubble::after{top:-7px;border-left:1px solid rgba(200,155,84,.55);border-top:1px solid rgba(200,155,84,.55);transform:rotate(45deg);}',
    '.nkm-stage[data-h="l"] .nkm-bubble::after{left:26px;}.nkm-stage[data-h="r"] .nkm-bubble::after{right:26px;}',
    '.nkm-bubble[hidden],.nkm-pop[hidden]{display:none;}',
    '.nkm-bubble b{color:#E5BA73;font-weight:700;}',
    '.nkm-x{position:absolute;top:6px;right:6px;width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:rgba(247,244,240,.6);font-size:16px;line-height:1;cursor:pointer;}',
    '.nkm-x:hover{color:#F7F4F0;background:rgba(255,255,255,.08);}',
    '.nkm-b-act{display:inline-block;margin:8px 10px 0 0;padding:0;border:0;background:none;color:#E5BA73;font:inherit;font-size:12px;font-weight:700;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}',
    '.nkm-pop{width:min(310px,calc(100vw - 32px));padding:16px 16px 14px;animation:nkmPop .14s cubic-bezier(.2,.8,.2,1);}',
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
    /* roaming guide: gold ring around the thing it points at, bounding hops while it travels, button-style chip */
    '.nkm-chip-btn{background:none;font-family:inherit;cursor:pointer;}',
    '.nkm-ring{position:absolute;box-sizing:border-box;pointer-events:none;border:2px solid #E5BA73;border-radius:14px;box-shadow:0 0 0 4px rgba(200,155,84,.2),0 0 24px rgba(229,186,115,.55);animation:nkmRing 1.3s ease-in-out infinite;}',
    '.nkm-ring[hidden]{display:none;}',
    '.nkm-widget.is-travel .nkm-jump{animation:nkmTravel .46s ease-in-out infinite;}',
    '@keyframes nkmRing{0%,100%{box-shadow:0 0 0 3px rgba(200,155,84,.2),0 0 14px rgba(229,186,115,.4)}50%{box-shadow:0 0 0 8px rgba(200,155,84,.12),0 0 30px rgba(229,186,115,.8)}}',
    '@keyframes nkmTravel{0%,100%{transform:translateY(0) scale(1,1)}22%{transform:translateY(0) scale(1.06,.93)}55%{transform:translateY(-12px) scale(.96,1.06)}}',
    '@keyframes nkmHop{0%{transform:translateY(0) scale(1,1)}20%{transform:translateY(0) scale(1.07,.92)}50%{transform:translateY(-17px) scale(.96,1.06)}78%{transform:translateY(0) scale(1.05,.94)}100%{transform:translateY(0) scale(1)}}',
    '@keyframes nkmNudge{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}',
    '@keyframes nkmFloatW{0%,100%{transform:translateY(0) rotate(-1.4deg)}50%{transform:translateY(-8px) rotate(1.4deg)}}',
    '@keyframes nkmBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.02,1.045)}}',
    '@keyframes nkmWigL{0%,100%{transform:rotate(0)}25%{transform:rotate(-11deg)}55%{transform:rotate(6deg)}80%{transform:rotate(-3deg)}}',
    '@keyframes nkmWigR{0%,100%{transform:rotate(0)}25%{transform:rotate(11deg)}55%{transform:rotate(-6deg)}80%{transform:rotate(3deg)}}',
    '@keyframes nkmJoy{0%{transform:translateY(0) scale(1,1)}14%{transform:translateY(0) scale(1.1,.88)}40%{transform:translateY(-26px) scale(.95,1.08)}62%{transform:translateY(0) scale(1.07,.92)}78%{transform:translateY(-9px) scale(1)}100%{transform:translateY(0) scale(1)}}',
    '@keyframes nkmTwinkle{0%,100%{transform:scale(.4);opacity:.25}50%{transform:scale(1.15);opacity:1}}',
    '@keyframes nkmPop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}',
    /* reduced motion = CALM mode (unless NK_MASCOT.motion is 'full'): no floating, jumping, breathing or travelling; reactions become a soft gold glow */
    '@keyframes nkmGlowPulse{0%,100%{filter:drop-shadow(0 8px 16px rgba(0,0,0,.18))}40%{filter:drop-shadow(0 0 3px rgba(229,186,115,1)) drop-shadow(0 0 16px rgba(229,186,115,.9)) drop-shadow(0 8px 16px rgba(0,0,0,.18))}}',
    '@media (prefers-reduced-motion:reduce){.nkm-widget:not(.is-full-motion) :is(.nkm-float,.nkm-live .nkm-body,.nkm-jump,.nkm-arrow svg,.nkm-live.is-wiggle .nkm-ear,.nkm-bubble,.nkm-pop,.nkm-spk,.nkm-ring){animation:none !important;}.nkm-widget:not(.is-full-motion).is-joy .nkm-spk,.nkm-widget:not(.is-full-motion).is-lab .nkm-spk{opacity:1;transform:none;}.nkm-widget:not(.is-full-motion).is-joy .nkm-live,.nkm-widget:not(.is-full-motion).is-hop .nkm-live,.nkm-widget:not(.is-full-motion).is-surprise .nkm-live{animation:nkmGlowPulse .9s ease-out;}.nkm-widget:not(.is-full-motion) .nkm-stage.is-gliding,.nkm-widget:not(.is-full-motion) .nkm-live .nkm-tilt,.nkm-widget:not(.is-full-motion) .nkm-live .nkm-gaze,.nkm-widget:not(.is-full-motion) .nkm-lean{transition:none;}}'
  ].join('\n');

  var widget = { el: null, stage: null, live: null, bubble: null, pop: null, char: null, pin: null, lean: null, arrow: null };
  var pos = { x: 0, y: 0 }, roamRaf = 0, trackRaf = 0, trackPt = null, liftPx = 0;
  var bubbleTimer = 0, joyTimer = 0, labTimer = 0, idleTimer = 0, lastBubbleAt = 0, lastJoyAt = 0, lastActivity = 0, glideTimer = 0;
  var MUTE_KEY = 'nkm_mute_until', NUDGE_KEY = 'nkm_nudges', PIN_KEY = 'nikora_mascot_pinned';
  var userPinned = false, onCheckout = false, pointing = false, pointTimer = 0, autoTimer = 0, autoCount = 0, lastScroll = 0, hopTimer = 0, surpriseTimer = 0;
  var PURCHASED_KEY = 'nikora_has_purchased';
  function hasPurchased() { return LS.get(PURCHASED_KEY) === '1'; }
  function markPurchased() { LS.set(PURCHASED_KEY, '1'); }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function muted() { return Number(LS.get(MUTE_KEY) || 0) > Date.now(); }
  function docked() { return !roamPos; }               /* always docked: no scroll-driven roaming any more */               /* pinned by the customer, or checkout (never roams over the payment form) */
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
    /* DOCKED: the mascot is position:fixed inside a fixed layer and always sits at the same screen spot; the page scroll offset is never read. */
    if (roamPos) return { x: clamp(roamPos.x, 8, Math.max(8, vw - W - 8)), y: clamp(roamPos.y, 8, Math.max(8, vh - H - 8)) };   /* sent somewhere by the guide (section 5c) */
    return { x: right ? vw - W - 16 : 16, y: Math.max(8, vh - H - 16 - liftPx) };
  }
  function place() {
    if (!widget.stage) return;
    var vw = window.innerWidth;
    widget.stage.style.transform = 'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,0)';
    widget.stage.setAttribute('data-h', guideH || (pos.x + Math.min(310, vw - 32) <= vw - 8 ? 'l' : 'r'));
    widget.stage.setAttribute('data-v', guideV || (pos.y > window.innerHeight - pos.y - charH() ? 'u' : 'd'));
  }
  function frame() {
    roamRaf = 0;
    var t = target(), k = calm() ? 1 : 0.085, dx = t.x - pos.x, dy = t.y - pos.y;
    pos.x += dx * k; pos.y += dy * k; place();
    setClass('is-travel', !calm() && (Math.abs(dx) > 26 || Math.abs(dy) > 26));                 /* little bounding hops while it travels */
    if (widget.lean) widget.lean.style.setProperty('--nkm-lean', clamp(dx * 0.05 + dy * 0.12, -12, 12).toFixed(1) + 'deg');
    if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) roamRaf = window.requestAnimationFrame(frame);
    else { pos.x = t.x; pos.y = t.y; place(); setClass('is-travel', false); if (widget.lean) widget.lean.style.setProperty('--nkm-lean', '0deg'); }
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
    if (o.actions) html += '<br>' + o.actions.map(function (a) { return '<button type="button" class="nkm-b-act" data-nkm="' + esc(a.act) + '">' + esc(a.label) + '</button>'; }).join('');
    if (o.mute || (o.quiet !== true && (o.ask || o.href))) html += '<button type="button" class="nkm-b-act" data-nkm="mute">Hide tips</button>';
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
  /* Every emotion is applied SYNCHRONOUSLY (0 ms): a class flips, CSS has no transition on the face. */
  function clearEmotions() { ['is-joy', 'is-lab', 'is-hop', 'is-surprise'].forEach(function (c) { setClass(c, false); }); }
  function react(kind, o) {
    if (!widget.el) return;
    o = o || {};
    if (kind === 'joy') {
      if (Date.now() - lastJoyAt < 1500) return; lastJoyAt = Date.now();
      clearEmotions(); void widget.el.offsetWidth; setClass('is-joy', true);
      clearTimeout(joyTimer); joyTimer = window.setTimeout(function () { setClass('is-joy', false); }, 1100);
      if (!o.silent && Date.now() - lastBubbleAt > 6000) say(['Great pick!', 'Added to your routine.', 'Lovely choice!'][Math.floor(Math.random() * 3)], { ms: 2200 });
    } else if (kind === 'lab') {
      if (widget.el.classList.contains('is-joy') || widget.el.classList.contains('is-surprise')) return;
      setClass('is-lab', true); clearTimeout(labTimer);
      labTimer = window.setTimeout(function () { setClass('is-lab', false); }, o.ms || 2400);
    } else if (kind === 'surprise') {
      if (widget.el.classList.contains('is-joy')) return;
      setClass('is-lab', false); setClass('is-surprise', false); void widget.el.offsetWidth; setClass('is-surprise', true);
      clearTimeout(surpriseTimer); surpriseTimer = window.setTimeout(function () { setClass('is-surprise', false); }, o.ms || 1300);
    } else if (kind === 'hop') {
      if (widget.el.classList.contains('is-joy') || widget.el.classList.contains('is-surprise')) return;
      setClass('is-hop', false); void widget.el.offsetWidth; setClass('is-hop', true);
      clearTimeout(hopTimer); hopTimer = window.setTimeout(function () { setClass('is-hop', false); }, 750);
    }
  }
  function cartCount() { try { return (JSON.parse(LS.get('nikora_cart') || '[]') || []).reduce(function (n, i) { return n + (Number(i && (i.qty != null ? i.qty : i.quantity)) || 1); }, 0); } catch (e) { return 0; } }
  var ADD_SEL = '.nk-add,[data-action="add-to-cart"],[data-bs-add],#add-to-cart-btn,#mcta-add-btn,.btn-add-cart,.cart-rec-add,[data-add]';
  var SURPRISE_SEL = '.nk-badge.sale,.nk-badge.low,.nk-urgency';
  var LAB_SEL = '[data-nk-ingredient],[data-nk-lab],.ingredient,.ingredient-chip,.key-active,#panel-science li,#panel-science strong,.mech-btn';

  /* ---------- cursor tracking: head tilt + eyes follow the pointer (not when pinned, on touch, or with reduced motion) ---------- */
  function stopTrack() { trackPt = null; if (widget.live) { widget.live.style.setProperty('--nkm-tilt', '0deg'); widget.live.style.setProperty('--nkm-gx', '0'); widget.live.style.setProperty('--nkm-gy', '0'); } }
  function applyTrack() {
    trackRaf = 0; if (!trackPt || !widget.live || quiet() || calm() || pointing) return;
    var cx = pos.x + charW() / 2, cy = pos.y + charH() * 0.62, dx = trackPt.x - cx, dy = trackPt.y - cy;
    widget.live.style.setProperty('--nkm-tilt', (clamp(dx / (window.innerWidth * 0.4), -1, 1) * 10).toFixed(1) + 'deg');
    widget.live.style.setProperty('--nkm-gx', (clamp(dx / 160, -1, 1) * 2.6).toFixed(2));
    widget.live.style.setProperty('--nkm-gy', (clamp(dy / 160, -1, 1) * 2).toFixed(2));
  }
  function onPointer(e) {
    if (e.pointerType === 'touch' || quiet() || calm() || pointing) return;
    trackPt = { x: e.clientX, y: e.clientY };
    if (!trackRaf) trackRaf = window.requestAnimationFrame(applyTrack);
  }

  /* ---------- idle life: blink + ear wiggle (paused while the tab is hidden; wiggles stop when pinned) ---------- */
  function lifeLoop() {
    if (!widget.live) return;
    function blink() {
      if (doc.hidden) return;
      widget.live.classList.add('is-blink');
      window.setTimeout(function () { widget.live.classList.remove('is-blink'); if (Math.random() < 0.28) window.setTimeout(function () { widget.live.classList.add('is-blink'); window.setTimeout(function () { widget.live.classList.remove('is-blink'); }, 110); }, 150); }, 120);
    }
    function wiggle() { if (doc.hidden || quiet() || calm()) return; widget.live.classList.add('is-wiggle'); window.setTimeout(function () { widget.live.classList.remove('is-wiggle'); }, 900); }
    (function loopB() { window.setTimeout(function () { blink(); loopB(); }, 2800 + Math.random() * 3200); })();
    (function loopW() { window.setTimeout(function () { wiggle(); loopW(); }, 7000 + Math.random() * 6000); })();
  }

  /* ---------- idle nudge: after 15 s without interaction the rabbit asks the Concierge for a line (live endpoint or local engine) and falls back to the built-in tips ---------- */
  function showNudge() {
    var n = Number(SS.get(NUDGE_KEY) || 0), max = onCheckout ? Math.max(CFG.maxNudges, 4) : CFG.maxNudges;
    if (n >= max || Date.now() - lastBubbleAt < 45000) return;
    SS.set(NUDGE_KEY, String(n + 1));
    if (widget.live && !calm()) { widget.live.classList.add('is-wiggle'); window.setTimeout(function () { widget.live.classList.remove('is-wiggle'); }, 900); }
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
      if (!guiding && !tour.on) showNudge();
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
    chips.push('<button type="button" class="nkm-chip nkm-chip-btn" data-nkm="tour">Show me around</button>');
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
    if (guideIntent(q)) { var ans = widget.pop && widget.pop.querySelector('.nkm-answer'); if (ans) ans.textContent = 'Let me show you.'; return; }   /* "where is ...?" questions: the rabbit walks over and points */
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

  /* ---------- autonomous behaviour: the rabbit does something on its own every 8-15 s (never when pinned, at checkout it only hops / wiggles) ---------- */
  function setTilt(deg, gx, gy) {
    if (!widget.live) return;
    widget.live.style.setProperty('--nkm-tilt', deg.toFixed(1) + 'deg'); widget.live.style.setProperty('--nkm-gx', gx.toFixed(2)); widget.live.style.setProperty('--nkm-gy', gy.toFixed(2));
  }
  function cartEl() { return doc.getElementById('open-cart-btn') || (doc.getElementById('cart-count') && doc.getElementById('cart-count').parentNode) || null; }
  function bestEl() { return doc.querySelector('[data-nk-point="bestsellers"]') || doc.getElementById('bestseller') || doc.querySelector('a[href*="filter=bestsellers"]') || null; }
  function endPoint() {
    clearTimeout(pointTimer); pointing = false; if (widget.arrow) widget.arrow.hidden = true; setTilt(0, 0, 0);
  }
  /** Turn toward an element (head tilt + eyes + a pulsing gold arrow) and say something about it. Returns false when the element is not on screen. */
  function pointAt(el, text, o) {
    o = o || {};
    if (!el || !widget.stage || quiet()) return false;
    var r = el.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    if (r.width < 2 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return false;
    var cx = pos.x + charW() / 2, cy = pos.y + charH() / 2, dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy, ang = Math.atan2(dy, dx), rad = charW() * 0.82;
    pointing = true; setTilt(clamp(dx / 220, -1, 1) * 14, clamp(dx / 120, -1, 1) * 2.8, clamp(dy / 120, -1, 1) * 2.2);
    widget.arrow.style.left = (charW() / 2 + Math.cos(ang) * rad - 11) + 'px'; widget.arrow.style.top = (charH() / 2 + Math.sin(ang) * rad - 11) + 'px';
    widget.arrow.style.setProperty('--nkm-ang', (ang * 180 / Math.PI).toFixed(1) + 'deg'); widget.arrow.hidden = false;
    clearTimeout(pointTimer); pointTimer = window.setTimeout(endPoint, o.ms || 4200);
    if (text) say(text, { href: o.href, hrefLabel: o.hrefLabel, ms: o.ms || 4600, quiet: !o.href });
    return true;
  }
  function scheduleAuto(first) { clearTimeout(autoTimer); if (widget.el) autoTimer = window.setTimeout(runAuto, first ? 4500 : 8000 + Math.random() * 7000); }
  function runAuto() {
    scheduleAuto();
    if (doc.hidden || quiet() || (widget.pop && !widget.pop.hidden) || pointing || guiding || tour.on || Date.now() - lastScroll < 1500 || Date.now() - lastBubbleAt < 6000) return;
    var acts = calm() ? ['hop'] : ['hop', 'hop', 'wiggle'];
    /* pointing at the cart / Bestsellers is now the guide's job (section 5c) */
    var a = acts[Math.floor(Math.random() * acts.length)];
    if (a === 'hop') react('hop');
    else if (a === 'wiggle') { widget.live.classList.add('is-wiggle'); window.setTimeout(function () { widget.live.classList.remove('is-wiggle'); }, 900); }
    else if (a === 'cart') { autoCount++; react('hop'); pointAt(cartEl(), cartCount() > 0 ? 'Your bag is ready whenever you are.' : 'Your bag lives up here.'); }
    else if (a === 'best') { autoCount++; react('hop'); pointAt(bestEl(), 'Bestsellers are a lovely place to start.', { href: 'catalog.html?filter=bestsellers', hrefLabel: 'Explore Bestsellers' }); }
  }

  function lift() {
    var bar = doc.getElementById('mobile-cta-bar'), v = 0;
    if (bar) { var cs = window.getComputedStyle(bar); if (cs.display !== 'none' && !/matrix\([^)]*,\s*[1-9]\d*\)$/.test(cs.transform) && bar.getBoundingClientRect().top < window.innerHeight) v = bar.offsetHeight + 8; }
    if (v !== liftPx) { liftPx = v; kick(false); }
  }
  function refreshDot() { /* the free-standing rabbit has no badge; kept so profile changes can call it */ }

  /* ====================================================================== 5c. ROAMING GUIDE ======================================================================
     The rabbit travels across the viewport (roamPos = where it should stand; frame() glides it there), stands next to the button or section it is talking about,
     draws a gold ring around it and speaks in its bubble. Messages come from three places: "scenes" per page (arrival, idle), reactions to what the visitor does
     (cart add, cart open, search focus, filter click, exit intent) and the visitor's own questions ("where is ...?" in the ask box, the "Show me around" tour).
     Nothing roams at checkout; "Hide tips" silences every proactive message; reduced motion makes moves instant (calm mode).
     It never points at something that is covered (an open cart drawer or modal on top of it); inside a side panel it stands OUTSIDE the panel. */
  var roamPos = null, guideV = null, guideH = null, guiding = false, ringEl = null, ringTarget = null, ringRaf = 0;
  var guideEnd = 0, settleTimer = 0, lastSceneAt = 0, lastWanderAt = 0, scenesPlayed = 0, genericPlayed = 0, cartHints = 0;
  var follow = null, coverAt = 0;
  var tour = { on: false, steps: [], i: -1 };
  var PAGE = (function () { var f = location.pathname.split('/').pop().toLowerCase().replace(/\.html$/, ''); return f || 'index'; })();
  var SEEN_KEY = 'nkg_seen';
  var GENERIC = ['Free Express Shipping on every order, with tracking once it ships.', 'Every order has a 30-Day Money-Back Guarantee on unopened items.',
    'Tell the Beauty Concierge your skin type and I will remember it for next time.', 'New here? I can walk you through the store in under a minute.'];

  function ext(a, b) { var k; for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }
  function dur(t) { return Math.min(14000, Math.max(5200, String(t).length * 75)); }
  function moveSoon() { if (!roamRaf) roamRaf = window.requestAnimationFrame(frame); }
  function readSeen() { try { return JSON.parse(SS.get(SEEN_KEY) || '[]') || []; } catch (e) { return []; } }
  function markSeen(id) { var a = readSeen(); if (a.indexOf(id) < 0) { a.push(id); SS.set(SEEN_KEY, JSON.stringify(a.slice(-60))); } }

  /* ---- finding things on the page (works without knowing each page's markup) ---- */
  function inView(r) { return r.bottom > 24 && r.top < window.innerHeight - 24 && r.right > 0 && r.left < window.innerWidth; }
  function uncovered(el, r) {                                            /* is the element really what is on top at its centre? (an open drawer / overlay covers it otherwise) */
    var p = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!p) return false;
    if (p === el || el.contains(p)) return true;
    return p.contains(el) && p !== doc.body && p !== doc.documentElement;
  }
  function vis(el, strict) {
    if (!el || !el.getBoundingClientRect || (el.closest && el.closest('.nkm-widget'))) return false;
    var r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6) return false;
    var cs = window.getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    return strict ? (inView(r) && uncovered(el, r)) : true;
  }
  function pickEl(sel, strict) { var l = doc.querySelectorAll(sel), i; for (i = 0; i < l.length; i++) if (vis(l[i], strict !== false)) return l[i]; return null; }
  function textEl(re, scope, strict) {
    var l = (scope || doc).querySelectorAll('a,button,[role="button"]'), i, t;
    for (i = 0; i < l.length; i++) { t = (l[i].textContent || '').replace(/\s+/g, ' ').trim(); if (t && t.length < 40 && re.test(t) && vis(l[i], strict !== false)) return l[i]; }
    return null;
  }
  function navEl(file) { return pickEl('.nkn-primary a[href*="' + file + '"]'); }
  function burgerEl() { return pickEl('#mobile-menu-btn'); }
  function nav(file) { return function () { return navEl(file) || burgerEl(); }; }
  function cartBtn() { return pickEl('#open-cart-btn'); }                /* null while a drawer covers it */
  function cartOpen() {                                                  /* is the Your Bag drawer on screen? */
    var d = doc.getElementById('cart-drawer'); if (!d) return false;
    var r = d.getBoundingClientRect(), cs = window.getComputedStyle(d);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 100 && r.left < window.innerWidth - 40 && r.right > 40;
  }
  function cartCheckoutEl() {                                            /* the Checkout button inside the drawer: the lowest matching, visible, uncovered one */
    var dr = doc.getElementById('cart-drawer'); if (!dr) return null;
    var l = dr.querySelectorAll('a,button,[role="button"]'), i, t, el, best = null;
    for (i = 0; i < l.length; i++) {
      el = l[i]; t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length > 40 || !(/check\s*out|proceed/i.test(t) || /checkout/i.test(el.getAttribute('href') || ''))) continue;
      if (!vis(el, true)) continue;
      if (!best || el.getBoundingClientRect().bottom > best.getBoundingClientRect().bottom) best = el;
    }
    return best;
  }
  function whenStable(find, cb, tries) {                                 /* wait until the element exists and has stopped moving (drawer finished sliding) */
    var last = null, same = 0, n = 0;
    (function poll() {
      var el = find(), r = el && el.getBoundingClientRect();
      if (el && last && Math.abs(r.top - last.top) < 1 && Math.abs(r.left - last.left) < 1 && Math.abs(r.height - last.height) < 1) same++; else same = 0;
      last = r ? { top: r.top, left: r.left, height: r.height } : null;
      if (el && same >= 3) { cb(el); return; }
      if (++n < (tries || 20)) window.setTimeout(poll, 100);
    })();
  }
  function bestEl2() { return pickEl('[data-nk-point="bestsellers"],#bestseller,a[href*="filter=bestsellers"]'); }
  function addBtn() { return pickEl('#add-to-cart-btn,#mcta-add-btn,[data-bs-add],.btn-add-cart') || textEl(/^add to (bag|cart)/i); }
  function cardEl() { return pickEl('.product-card,.nk-card'); }
  function searchEl() { return pickEl('input[type="search"],input[placeholder*="earch" i],#search-input,#catalog-search'); }
  function filterEl() { return pickEl('.f-chips-wrap,.filter-bar,.catalog-controls,.toolbar-wrap,.search-filter-container,.rv-toolbar,.r-tabs-wrap'); }
  function formInput() { return pickEl('main input[type="text"],main input[type="email"],main input:not([type])'); }
  function mm(el, label, text) { return el && el.id === 'mobile-menu-btn' ? 'Open the menu and tap ' + label + '. ' + text : text; }

  /* ---- the ring around the thing being pointed at ---- */
  function ringOff() { if (ringRaf) window.cancelAnimationFrame(ringRaf); ringRaf = 0; if (ringEl && ringEl.parentNode) ringEl.parentNode.removeChild(ringEl); ringEl = null; ringTarget = null; }
  function ringLoop() {
    ringRaf = 0;
    if (!ringEl || !ringTarget) return;
    var r = ringTarget.getBoundingClientRect();
    if (r.width < 4 || !inView(r) || !doc.contains(ringTarget)) ringEl.hidden = true;
    else if (!uncovered(ringTarget, r)) {                                /* a drawer / modal opened on top of it */
      ringEl.hidden = true;
      if (!coverAt) coverAt = Date.now();
      else if (Date.now() - coverAt > 600) { hideBubble(); endGuide(); return; }
    } else {
      coverAt = 0; ringEl.hidden = false;
      ringEl.style.left = (r.left - 5) + 'px'; ringEl.style.top = (r.top - 5) + 'px'; ringEl.style.width = (r.width + 10) + 'px'; ringEl.style.height = (r.height + 10) + 'px';
      if (follow && (Math.abs(r.top - follow.top) > 6 || Math.abs(r.left - follow.left) > 6)) {   /* the target moved (drawer sliding, scrolling): keep the rabbit beside it */
        follow = { top: r.top, left: r.left };
        var sp = spotFor(r, ringTarget); guideV = sp.v; guideH = sp.h; roamPos = { x: sp.x, y: sp.y }; moveSoon();
      }
    }
    ringRaf = window.requestAnimationFrame(ringLoop);
  }
  function ringOn(el, on) {
    ringOff();
    if (!on || !widget.el) return;
    var br = parseFloat(window.getComputedStyle(el).borderTopLeftRadius) || 0, r = el.getBoundingClientRect();
    ringEl = doc.createElement('div'); ringEl.className = 'nkm-ring'; ringEl.setAttribute('aria-hidden', 'true');
    ringEl.style.borderRadius = br >= Math.min(r.width, r.height) / 2 - 1 ? '999px' : (br + 5) + 'px';
    widget.el.insertBefore(ringEl, widget.stage); ringTarget = el; ringLoop();
  }

  /* ---- where to stand: next to the target, never on top of it, with room for the bubble (and OUTSIDE a side panel such as the cart drawer) ---- */
  function spotFor(r, el) {
    var vw = window.innerWidth, vh = window.innerHeight, W = charW(), H = charH(), m = 8, g = 14, bw = Math.min(310, vw - 32), bh = 130;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var hdr = !!(el.closest && el.closest('.nkn-header')), wide = r.width > r.height * 2.4 || r.width > vw * 0.5;
    var dlg = el.closest && el.closest('#cart-drawer,[role="dialog"],[aria-modal="true"]'), box = null, bx;
    if (dlg) { bx = dlg.getBoundingClientRect(); if (bx.width > 120 && bx.width < vw - 40) box = bx; }   /* a side panel: stand OUTSIDE it */
    var east = { x: r.right + g, y: cy - H / 2, h: 'l' }, west = { x: r.left - g - W, y: cy - H / 2, h: 'r' };
    var south = { x: cx - W / 2, y: r.bottom + g, v: 'd' }, north = { x: cx - W / 2, y: r.top - g - H, v: 'u' };
    var order = hdr ? [south, east, west, north] : (wide ? [south, north, east, west] : [east, west, south, north]);
    if (box) order = [box.left >= vw - box.right ? { x: box.left - g - W, y: cy - H / 2, h: 'r' } : { x: box.right + g, y: cy - H / 2, h: 'l' }].concat(order);
    var i, c, best = null, okX, okY, okH, okV, hit;
    for (i = 0; i < order.length; i++) {
      c = order[i];
      c.h = c.h || (c.x + bw <= vw - m ? 'l' : 'r');
      c.v = c.v || (c.y > vh - c.y - H ? 'u' : 'd');
      okX = c.x >= m && c.x <= vw - W - m; okY = c.y >= m && c.y <= vh - H - m;
      okH = c.h === 'l' ? c.x + bw <= vw - m : c.x + W - bw >= m;
      okV = c.v === 'u' ? c.y - m >= bh : vh - (c.y + H) - m >= bh;
      hit = c.x < r.right + 4 && c.x + W > r.left - 4 && c.y < r.bottom + 4 && c.y + H > r.top - 4;
      if (box && c.x < box.right && c.x + W > box.left && c.y < box.bottom && c.y + H > box.top) hit = true;
      if (okX && okY && okH && okV && !hit) return c;
      if (!best && okX && okY && !hit) best = c;
    }
    c = best || order[0];
    return { x: clamp(c.x, m, vw - W - m), y: clamp(c.y, m, vh - H - m), h: c.h, v: c.v };
  }
  function anchors() {                                                   /* resting places along the screen edges (first = the bottom corner dock) */
    var vw = window.innerWidth, vh = window.innerHeight, W = charW(), H = charH(), L = 16, R = vw - W - 16, B = Math.max(8, vh - H - 16 - liftPx), right = CFG.side === 'right';
    var out = [{ x: right ? R : L, y: B }, { x: right ? L : R, y: B }];
    if (vw > 640) out.push({ x: L, y: Math.round(vh * 0.5 - H / 2) }, { x: R, y: Math.round(vh * 0.5 - H / 2) }, { x: R, y: Math.round(vh * 0.28) });
    return out;
  }
  function goHome() { clearTimeout(settleTimer); roamPos = null; guideV = null; guideH = null; moveSoon(); }
  function wander() {                                                    /* idle life: stroll to another edge of the screen */
    if (onCheckout || !widget.stage || (widget.pop && !widget.pop.hidden)) return;
    var a = anchors(), far = [], i;
    for (i = 0; i < a.length; i++) if (Math.abs(a[i].x - pos.x) + Math.abs(a[i].y - pos.y) > 120) far.push(a[i]);
    if (!far.length) return;
    var t = far[Math.floor(Math.random() * far.length)];
    lastWanderAt = Date.now(); guideV = null; guideH = null; roamPos = (t === a[0]) ? null : { x: t.x, y: t.y }; moveSoon();
  }
  function settle() {                                                    /* after pointing: step back to the nearest resting place so it never sits on content */
    if (guiding || tour.on || !widget.stage || (widget.pop && !widget.pop.hidden)) return;
    var a = anchors(), best = a[0], d = 1e9, i, dd;
    for (i = 0; i < a.length; i++) { dd = Math.abs(a[i].x - pos.x) + Math.abs(a[i].y - pos.y); if (dd < d) { d = dd; best = a[i]; } }
    roamPos = (best === a[0]) ? null : { x: best.x, y: best.y }; moveSoon();
  }
  function endGuide(stay) {
    clearTimeout(guideEnd); guiding = false; ringOff(); follow = null; coverAt = 0; guideV = null; guideH = null; endPoint(); place();
    if (!stay && !tour.on) { clearTimeout(settleTimer); settleTimer = window.setTimeout(settle, 2200); }
  }

  /** Walk to an element, ring it and say something. o: { force (ignore "Hide tips"), mute (add a Hide tips link), scroll (scroll it into view first), ring:false, ms, href, hrefLabel, ask, actions }. */
  function guideShow(el, text, o) {
    o = o || {};
    if (!el || !widget.stage || onCheckout || !doc.contains(el) || !vis(el, false)) return false;
    if (!o.force && (muted() || quiet())) return false;
    var r = el.getBoundingClientRect();
    if (!inView(r)) {
      if (!o.scroll || o.tried) return false;
      o.tried = true;
      try { el.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' }); } catch (e) { el.scrollIntoView(); }
      window.setTimeout(function () { guideShow(el, text, o); }, calm() ? 80 : 700);
      return true;
    }
    if (!uncovered(el, r)) return false;                                 /* an open drawer / modal is on top of it: never point at a hidden thing */
    clearTimeout(settleTimer); clearTimeout(guideEnd); closePop(true);
    var sp = spotFor(r, el), ms = o.ms || dur(text), delay = calm() ? 0 : 750, W = charW(), H = charH();
    guideV = sp.v; guideH = sp.h; roamPos = { x: sp.x, y: sp.y }; guiding = true; moveSoon();
    ringOn(el, o.ring !== false); follow = { top: r.top, left: r.left };
    window.setTimeout(function () {                                      /* it has arrived: turn the head toward the target and speak */
      if (!guiding) return;
      var dx = r.left + r.width / 2 - (sp.x + W / 2), dy = r.top + r.height / 2 - (sp.y + H / 2);
      pointing = true; setTilt(clamp(dx / 220, -1, 1) * 14, clamp(dx / 120, -1, 1) * 2.8, clamp(dy / 120, -1, 1) * 2.2);
      clearTimeout(pointTimer); pointTimer = window.setTimeout(endPoint, ms);
      if (text) say(text, { ms: ms, force: o.force, mute: o.mute, ask: o.ask, href: o.href, hrefLabel: o.hrefLabel, actions: o.actions, quiet: !(o.mute || o.ask || o.href) });
    }, delay);
    guideEnd = window.setTimeout(function () { endGuide(); }, ms + delay + 400);
    return true;
  }
  /** A bubble from where it stands (no travelling), with a little hop. */
  function guideSay(text, o) {
    o = ext({ ms: dur(text) }, o || {});
    if (!o.force && (muted() || quiet())) return;
    react('hop'); say(text, o);
  }

  /* ---- scenes: what the rabbit says on each page, on its own ---- */
  function sc(id, when, find, text, o) { return ext({ id: PAGE + ':' + id, when: when, find: find, text: text }, o || {}); }
  function navSc(id, when, file, label, text) { return sc(id, when, nav(file), function (el) { return mm(el, label, text); }); }
  function scenes() {
    var L = [];
    switch (PAGE) {
      case 'index':
        L.push(sc('shop', 'arrive', nav('catalog.html'), function (el) { return mm(el, 'Shop', 'Welcome to NIKORA. Tap Shop to browse the whole collection.'); }));
        L.push(sc('best', 'idle', bestEl2, 'Most people start with the Bestsellers. Want a look?', { href: 'catalog.html?filter=bestsellers', hrefLabel: 'Show me' }));
        L.push(navSc('rev', 'idle', 'reviews.html', 'Reviews', 'Real routines from real customers live here.'));
        L.push(navSc('sci', 'idle', 'science.html', 'Science', 'Curious how it works? The Science page explains every device.'));
        L.push(navSc('trk', 'idle', 'track-order.html', 'Track Order', 'Already ordered? Track your parcel here anytime.'));
        break;
      case 'catalog':
        L.push(sc('filters', 'arrive', function () { return filterEl() || searchEl(); }, 'Narrow the collection by skin concern with these, or search by name.'));
        L.push(sc('card', 'idle', cardEl, 'Tap any card for ingredients, reviews and the science behind it.'));
        L.push(navSc('sci', 'idle', 'science.html', 'Science', 'Want the why behind a device? The Science page has it.'));
        break;
      case 'product':
        L.push(sc('add', 'arrive', addBtn, 'Ready when you are: tap Add to Bag. Free Express Shipping on every order.'));
        L.push(navSc('shop', 'idle', 'catalog.html', 'Shop', 'Want to compare? The Shop has the full collection.'));
        L.push(sc('ask', 'idle', null, 'Not sure this is the right one? Ask me and I will help you choose.', { ask: true }));
        break;
      case 'track-order':
        L.push(sc('form', 'arrive', formInput, 'Enter your order number and email here to see live tracking.'));
        L.push(sc('info', 'idle', null, 'Tracking updates the moment your order ships.'));
        break;
      case 'faq': case 'contact': case 'shipping': case 'returns': case 'guarantee':
        L.push(sc('search', 'arrive', searchEl, 'Search here for a quick answer.'));
        L.push(sc('ask', 'idle', null, 'Cannot find it? The Beauty Concierge answers in seconds.', { ask: true }));
        break;
      case 'reviews':
        L.push(sc('filter', 'arrive', filterEl, 'Filter reviews by skin type to find people like you.'));
        L.push(navSc('shop', 'idle', 'catalog.html', 'Shop', 'Loved what you read? The Shop is one tap away.'));
        break;
      case 'science':
        L.push(sc('lab', 'arrive', null, 'Hover over an ingredient and I will put on my lab goggles.'));
        L.push(navSc('rev', 'idle', 'reviews.html', 'Reviews', 'See how the science plays out in real routines.'));
        break;
      default:
        L.push(navSc('shop', 'arrive', 'catalog.html', 'Shop', 'Take a look around. The Shop has everything.'));
    }
    L.push(sc('cart', 'idle', cartBtn, 'Your bag is up here. Everything you add waits for you.'));
    return L;
  }
  function pickScene(kind) {                                             /* a random scene of this kind that has not played yet and whose target is on screen */
    var seen = readSeen(), list = scenes(), ok = [], i, el;
    for (i = 0; i < list.length; i++) {
      if (list[i].when !== kind || seen.indexOf(list[i].id) >= 0) continue;
      el = list[i].find ? list[i].find() : null;
      if (!list[i].find || el) ok.push({ s: list[i], el: el });
    }
    return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null;
  }
  function playScene(kind) {
    var c = pickScene(kind); if (!c) return false;
    var txt = typeof c.s.text === 'function' ? c.s.text(c.el) : c.s.text;
    markSeen(c.s.id); lastSceneAt = Date.now(); scenesPlayed++;
    if (c.el) guideShow(c.el, txt, { mute: true, href: c.s.href, hrefLabel: c.s.hrefLabel, ask: c.s.ask });
    else guideSay(txt, { mute: true, href: c.s.href, hrefLabel: c.s.hrefLabel, ask: c.s.ask });
    return true;
  }
  function guideArrive() {                                               /* a moment after the page opens: say hello and point at the most useful thing */
    if (onCheckout || CFG.guide === false || muted()) return;
    window.setTimeout(function () {
      if (doc.hidden || guiding || tour.on) return;
      var key = 'nkg_arr_' + PAGE; if (SS.get(key)) return; SS.set(key, '1');
      var c = pickScene('arrive'); if (!c) return;
      var first = !SS.get('nkm_hello'); SS.set('nkm_hello', '1');
      var txt = (first ? 'Hi, I am the NIKORA Rabbit. ' : '') + (typeof c.s.text === 'function' ? c.s.text(c.el) : c.s.text);
      markSeen(c.s.id); lastSceneAt = Date.now(); scenesPlayed++;
      if (c.el) guideShow(c.el, txt, { mute: true }); else guideSay(txt, { mute: true });
    }, 1300);
  }
  function guideTick() {                                                 /* every 4 s: has the visitor been still long enough for a tip or a stroll? */
    if (doc.hidden || onCheckout || guiding || tour.on || (widget.pop && !widget.pop.hidden) || (widget.el && widget.el.classList.contains('is-chat-open'))) return;
    var now = Date.now(), idle = now - lastActivity, ae = doc.activeElement;
    if (now - lastBubbleAt < 9000 || (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) return;
    if (!muted() && idle >= 13000 && now - lastSceneAt >= 22000) {
      if (scenesPlayed < 6 && playScene('idle')) return;
      if (genericPlayed < 3 && now - lastSceneAt >= 40000) { genericPlayed++; lastSceneAt = now; guideSay(GENERIC[Math.floor(Math.random() * GENERIC.length)], { mute: true, actions: [{ label: 'Show me around', act: 'tour' }] }); return; }
    }
    if (!calm() && idle >= 18000 && now - lastWanderAt >= 24000) wander();
  }

  /* ---- reactions to what the visitor does ---- */
  function guideCartAdded() {
    if (onCheckout || CFG.guide === false || cartHints >= 4) return;
    var first = !SS.get('nkg_cart1'); SS.set('nkg_cart1', '1'); cartHints++;
    if (cartOpen()) {                                                    /* the bag opened by itself: the header icon is covered, so point at Checkout inside it */
      whenStable(cartCheckoutEl, function (b) { guideShow(b, 'Added! Tap Checkout when you are ready.', { force: first, mute: !first }); });
      return;
    }
    var c = cartBtn(); if (!c) return;
    guideShow(c, first ? 'Added! Tap the bag to review your routine and check out.' : 'Nice pick. Keep browsing, or tap the bag when you are ready.',
      first ? { force: true, href: 'checkout.html', hrefLabel: 'Go to checkout' } : { mute: true });
  }
  function guideCartOpened() {
    if (onCheckout || CFG.guide === false || muted() || cartCount() < 1 || Number(SS.get('nkg_open') || 0) >= 2) return;
    window.setTimeout(function () {
      whenStable(cartCheckoutEl, function (b) {
        SS.set('nkg_open', String(Number(SS.get('nkg_open') || 0) + 1));
        guideShow(b, 'Ready? Tap Checkout. Free Express Shipping, and a 30-day guarantee on every order.', { mute: true });
      });
    }, 300);
  }

  /* ---- "where is ...?" in the ask box ---- */
  var INTENTS = [
    { re: /track|order status|where.*order|my order/, find: nav('track-order.html'), label: 'Track Order', msg: 'Enter your order number and email there to see live tracking.', href: 'track-order.html' },
    { re: /\b(cart|bag|checkout|check out)\b/, find: cartBtn, msg: 'Your bag is right here. Tap it to review and check out.' },
    { re: /best ?sell|popular|top pick/, find: bestEl2, msg: 'These are the customer favorites.', href: 'catalog.html?filter=bestsellers', hrefLabel: 'Open Bestsellers' },
    { re: /shop|catalog|collection|product|device|buy/, find: nav('catalog.html'), label: 'Shop', msg: 'The whole collection lives here.', href: 'catalog.html' },
    { re: /science|ingredient|how (does|do).*work/, find: nav('science.html'), label: 'Science', msg: 'Every device and ingredient is explained here.', href: 'science.html' },
    { re: /review|testimonial|rating/, find: nav('reviews.html'), label: 'Reviews', msg: 'Real routines from real customers.', href: 'reviews.html' },
    { re: /faq|question/, find: nav('faq.html'), label: 'FAQ', msg: 'Quick answers to the most common questions.', href: 'faq.html' },
    { re: /contact|support|email|human|talk to/, find: nav('contact.html'), label: 'Contact', msg: 'Our team replies within 2\u20134 business hours.', href: 'contact.html' },
    { re: /return|refund|guarantee|money.?back/, msg: 'Every order has a 30-Day Money-Back Guarantee on unopened items.', href: 'guarantee.html', hrefLabel: 'Read the guarantee' },
    { re: /ship|deliver|how long|arrive/, msg: 'Free Express Shipping on every order: 1\u20133 days processing, then 7\u201315 days in transit.', href: 'shipping.html', hrefLabel: 'Shipping details' }
  ];
  function guideIntent(q) {
    q = String(q || '').toLowerCase().slice(0, 160);
    if (q.length < 3 || onCheckout || !widget.stage) return false;
    if (q.split(' ').length > 3 && !/\b(where|find|show|take me|go to|how (do|can) i|looking for|open|page|link)\b/.test(q)) return false;   /* real questions go to the Concierge; only "where is ..." style asks make the rabbit walk */
    for (var i = 0; i < INTENTS.length; i++) {
      if (!INTENTS[i].re.test(q)) continue;
      (function (it) {
        var el = it.find ? it.find() : null, txt = el && it.label ? mm(el, it.label, it.msg) : it.msg;
        closePop(true);
        window.setTimeout(function () {
          if (el && guideShow(el, txt, { force: true, scroll: true, href: it.href, hrefLabel: it.hrefLabel })) return;
          say(txt, { force: true, href: it.href, hrefLabel: it.hrefLabel || 'Take me there', ms: 9000 });
        }, 260);
      })(INTENTS[i]);
      return true;
    }
    return false;
  }

  /* ---- the guided tour ("Show me around") ---- */
  function tourSteps() {
    var s = [], b = burgerEl();
    function add(el, text) { if (el) s.push({ el: el, text: text }); }
    if (b) add(b, 'The menu holds every page: Shop, Science, Reviews, Track Order, FAQ and Contact.');
    else {
      add(navEl('catalog.html'), 'Shop: the whole collection, filterable by skin concern.');
      add(navEl('science.html'), 'Science: how every device and ingredient actually works.');
      add(navEl('reviews.html'), 'Reviews: real routines from real customers.');
      add(navEl('track-order.html'), 'Track Order: live updates once your order ships.');
    }
    if (PAGE === 'product') add(pickEl('#add-to-cart-btn,#mcta-add-btn,[data-bs-add],.btn-add-cart', false), 'When you find the one, tap Add to Bag.');
    if (PAGE === 'catalog') add(pickEl('.product-card,.nk-card', false), 'Tap any card to see ingredients and reviews.');
    add(cartBtn(), 'Your bag lives here. Checkout takes about a minute.');
    return s;
  }
  function startTour() {
    if (onCheckout) return;
    closePop(true); hideBubble(); endGuide(true);
    tour.steps = tourSteps(); tour.i = -1; tour.on = true; tourNext();
  }
  function tourDone() {
    tour.on = false; tour.steps = []; endGuide();
    say('That is the tour! Tap me whenever you need a hand.', { force: true, ms: 6000, quiet: true });
  }
  function tourNext() {
    hideBubble(); tour.i++;
    var st = tour.steps[tour.i];
    if (!st) { tourDone(); return; }
    if (!doc.contains(st.el)) { tourNext(); return; }
    var last = tour.i >= tour.steps.length - 1, acts = [{ label: last ? 'Done' : 'Next', act: 'tour-next' }];
    if (!last) acts.push({ label: 'Stop', act: 'tour-stop' });
    if (!guideShow(st.el, st.text, { force: true, scroll: true, ms: 120000, actions: acts })) tourNext();
  }
  function stopTour() { tour.on = false; tour.steps = []; hideBubble(); endGuide(); }

  function initGuide() {
    lastActivity = Date.now();
    if (CFG.guide === false) return;
    window.setInterval(guideTick, 4000);
    doc.addEventListener('click', function (e) {
      var t = e.target; if (!t || !t.closest) return;
      if (widget.el && widget.el.contains(t)) { if (t.closest('[data-nkm="close"]') && !tour.on) endGuide(); return; }
      if (guiding && !tour.on) endGuide();                               /* the visitor acted: drop the ring and step back */
      if (t.closest('#open-cart-btn')) guideCartOpened();
      if (onCheckout || muted() || SS.get('nkg_h_filter')) return;
      if (t.closest('.f-chips-wrap,.filter-bar,.catalog-controls,.toolbar-wrap,.search-filter-container,.r-tabs-wrap') && t.closest('button,a,[role="button"],[data-filter]')) {
        SS.set('nkg_h_filter', '1');
        window.setTimeout(function () { guideSay('Nice. Scroll down to see what matches, and tap a card for details.', { ms: 6500, mute: true }); }, 500);
      }
    }, true);
    doc.addEventListener('focusin', function (e) {
      var t = e.target;
      if (onCheckout || muted() || !t || !t.matches || SS.get('nkg_h_search')) return;
      if (t.matches('input[type="search"],input[placeholder*="earch" i]')) { SS.set('nkg_h_search', '1'); guideSay('Try a skin concern like \u201chydration\u201d, or a product name.', { ms: 6000, mute: true }); }
    });
    doc.addEventListener('mouseout', function (e) {                      /* exit intent: the mouse leaves through the top with something in the bag */
      if (e.relatedTarget || e.clientY > 4 || onCheckout || SS.get('nkg_exit') || cartCount() < 1 || muted() || window.innerWidth < 900) return;
      SS.set('nkg_exit', '1');
      var c = cartBtn(); if (c) guideShow(c, 'Leaving already? Your bag is saved, and every order has a 30-day guarantee.', { mute: true, href: 'checkout.html', hrefLabel: 'Checkout now' });
    });
    window.addEventListener('nikora:assistant-open', function () { stopTour(); endGuide(true); });
    widget.char.addEventListener('click', function () { if (!tour.on) endGuide(true); }, true);
  }

  function initCompanion() {
    if (!CFG.widget || doc.getElementById('nkm-widget')) return;
    var path = location.pathname.toLowerCase();
    for (var i = 0; i < CFG.hideOn.length; i++) if (path.indexOf(CFG.hideOn[i]) >= 0) return;
    onCheckout = /checkout/.test(path);
    if (SS.get('nikora_last_order')) markPurchased();                       /* an order was completed in this tab */
    var pref = LS.get(PIN_KEY);                                              /* the customer's own choice always wins; otherwise returning buyers start pinned (quiet) */
    userPinned = false;   /* the pin / roam modes are retired: the rabbit is always docked AND keeps its idle animations, micro-jumps and tips */
    var st = doc.createElement('style'); st.id = 'nk-mascot-live-css'; st.textContent = COMPANION_CSS; (doc.head || doc.documentElement).appendChild(st);
    var el = doc.createElement('div');
    el.className = 'nkm-widget'; el.id = 'nkm-widget';
    el.innerHTML = '<div class="nkm-stage"><div class="nkm-bubble" role="status" aria-live="polite" hidden></div><div class="nkm-pop" role="dialog" aria-label="NIKORA Rabbit guide" hidden></div>' +
      '<button type="button" class="nkm-char" aria-label="Open the NIKORA Rabbit guide" aria-expanded="false"><span class="nkm-lean"><span class="nkm-jump"><span class="nkm-float">' + liveSvg() + '</span></span></span></button>' +
      '<span class="nkm-arrow" hidden><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 5l7 7-7 7"/></svg></span>' +
      '<button type="button" class="nkm-pin" aria-pressed="false">' + PIN_SVG + '</button></div>';
    doc.body.appendChild(el);
    widget.el = el; widget.stage = el.querySelector('.nkm-stage'); widget.bubble = el.querySelector('.nkm-bubble'); widget.pop = el.querySelector('.nkm-pop');
    widget.char = el.querySelector('.nkm-char'); widget.pin = el.querySelector('.nkm-pin'); widget.arrow = el.querySelector('.nkm-arrow'); widget.lean = el.querySelector('.nkm-lean'); widget.live = el.querySelector('.nkm-live');
    el.classList.add('is-forced-dock'); el.classList.toggle('is-full-motion', CFG.motion === 'full');                                     /* hides the (now meaningless) pushpin button */
    setPinned(userPinned, true);
    lift(); kick(true);

    widget.char.addEventListener('click', function () { react('hop'); if (widget.pop.hidden) openPop(); else closePop(); });
    widget.char.addEventListener('pointerenter', function (e) {          /* hover: the ears wiggle (a soft glow in calm mode) */
      if (e.pointerType === 'touch' || !widget.live) return;
      if (calm()) { react('hop'); return; }
      widget.live.classList.add('is-wiggle'); window.setTimeout(function () { widget.live.classList.remove('is-wiggle'); }, 900);
    });
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
      else if (a === 'tour') startTour();
      else if (a === 'tour-next') tourNext();
      else if (a === 'tour-stop') stopTour();
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

    /* the rabbit is docked: scrolling never moves the rabbit out of its corner, it only dismisses a pointing arrow and makes it lean and hop; resize / orientation re-places it */
    var lastY = window.pageYOffset || 0, scrollAcc = 0, scrollEnd = 0, lastScrollHop = 0;
    window.addEventListener('scroll', function () {
      lastScroll = Date.now(); if (pointing) endPoint();
      var y = window.pageYOffset || doc.documentElement.scrollTop || 0, dy = y - lastY; lastY = y; scrollAcc += Math.abs(dy);
      if (!calm() && widget.lean) widget.lean.style.setProperty('--nkm-lean', clamp(dy * 0.5, -9, 9).toFixed(1) + 'deg');   /* leans the way the page moves */
      clearTimeout(scrollEnd);
      scrollEnd = window.setTimeout(function () {                                  /* scrolling stopped: straighten up; after a long scroll, hop as if to say "found something?" */
        if (widget.lean) widget.lean.style.setProperty('--nkm-lean', '0deg');
        if (scrollAcc > 700 && Date.now() - lastScrollHop > 5000 && !doc.hidden && !quiet()) { lastScrollHop = Date.now(); react('hop'); }
        scrollAcc = 0;
      }, 180);
    }, { passive: true });
    window.addEventListener('resize', function () { kick(true); });
    window.addEventListener('load', function () { kick(false); });
    window.addEventListener('pointermove', onPointer, { passive: true });
    /* joyful jump when something was really added to the cart (the bag count went up after the click) */
    doc.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest(ADD_SEL)) react('joy');                                   /* 0 ms: on the click itself */
      var before = cartCount();                                                                          /* other ways of adding / removing: judged by the bag count right after */
      window.setTimeout(function () { var now = cartCount(); if (now > before) { react('joy'); guideCartAdded(); } else if (now < before) react('surprise', { ms: 900 }); }, 350);
    }, true);
    /* science mode: lab goggles + sparkles while the pointer is on a key ingredient */
    doc.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(SURPRISE_SEL)) { react('surprise'); return; }              /* deals and low-stock badges: surprise, instantly */
      var t = e.target.closest && e.target.closest(LAB_SEL); if (!t) return;
      react('lab', { ms: 2600 });
      var msg = t.getAttribute && t.getAttribute('data-nk-lab'); if (msg && Date.now() - lastBubbleAt > 4000) say(msg, { ms: 4200, quiet: true });
    });
    ['pointermove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(function (ev) { window.addEventListener(ev, onActivity, { passive: true }); });
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) armIdle(); });
    window.addEventListener('nikora:order-complete', function () {                                      /* checkout success: remember it, celebrate, and start pinned next visit */
      markPurchased(); react('joy', { silent: true });
      say('Thank you! Your order is confirmed.', { force: true, quiet: true, ms: 7000 });
    });
    window.setInterval(lift, 800); lifeLoop(); armIdle(); scheduleAuto(true);
    /* hello: a hop (and an ear wiggle) a moment after the page opens, plus one short welcome line per tab session */
    window.setTimeout(function () {
      if (doc.hidden) return;
      react('hop');
      if (widget.live && !calm()) { widget.live.classList.add('is-wiggle'); window.setTimeout(function () { widget.live.classList.remove('is-wiggle'); }, 900); }
      if (!onCheckout) guideArrive();
    }, 1400);
    initGuide();
    if (/page not found/i.test(doc.title || '')) react('surprise', { ms: 1800 });
    /* checkout: the rabbit is there to reassure, with one friendly line a few seconds after the page opens */
    if (onCheckout && !quiet() && !muted() && !SS.get('nkm_ck_hello')) {
      SS.set('nkm_ck_hello', '1');
      window.setTimeout(function () { dynamicLine('reassure', { i: 0 }).then(function (r) { say(r ? r.text : reassureLine(0), { quiet: true, ms: 8000 }); }); }, 4000);
    }
  }

  injectCss();
  var api = { version: '1.1', svg: svg, tip: tip, help: help, empty: empty, enhance: enhance, poses: Object.keys(POSES),
    learn: learn, setProfile: setProfile, getProfile: getProfile, forget: forget, say: say, react: react, open: openAssistant,
    curate: curate, looksUseful: looksUseful, allowed: allowed, markPurchased: markPurchased, point: pointAt,
    guide: { show: guideShow, say: guideSay, tour: startTour, home: goHome, wander: wander },
    hop: function () { react('hop'); }, motion: function () { return calm() ? 'calm' : 'full'; } };
  window.NKMascot = api;

  function start() {
    enhance(doc.body);
    try { initCompanion(); } catch (err) { if (window.console) console.warn('[mascot] live companion failed to start:', err); }
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
