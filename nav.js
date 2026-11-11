/*!
 * NIKORA shared navigation  -  nav.js
 * ---------------------------------------------------------------------------
 * ONE file that renders the header, the mobile drawer and the footer for ALL
 * pages, and loads the floating Beauty Concierge (ai-assistant.js) everywhere.
 *
 * USAGE (one line, first thing in <body>):
 *     <script src="nav.js"></script>
 *   or put <div id="nikora-nav"></div> where the header goes and load nav.js anywhere.
 *
 * To add / rename / move a page, edit CONFIG below. Nothing else needs touching.
 * Active page is detected from the URL automatically.
 *
 * FOOTER: replaces the page's own <footer> (so every page is identical). If a
 * page has no <footer>, one is appended to the end of <body>.
 *
 * Works with the page's existing  openCart(), setTheme(), #cart-count  (all optional):
 *   - cart button   -> id="open-cart-btn"  (calls window.openCart())
 *   - cart badge    -> id="cart-count"     (page's cart code keeps it up to date)
 *   - theme buttons -> call window.setTheme(mode) if the page has it, otherwise
 *                      set <html data-theme> + localStorage 'theme' themselves
 *   - styles use the page's CSS variables (--text, --gold, --line ...) with
 *     built-in light/dark fallbacks, so it also looks right on pages that lack them.
 *
 * SITE CONTENT: the announcement bar (above the header) and the promo banner (under it) are
 * managed from the admin site and read from Firebase /site_content (announcement_enabled,
 * announcement_text, announcement_mode ('marquee' = scrolling ticker, otherwise static), announcement_speed (slow|normal|fast),
 * announcement_bg / announcement_color (hex), announcement_link, announcement_start / announcement_end (ISO date-time, UTC: the bar
 * appears and disappears by itself), promo_banner_enabled, promo_banner_image_url, promo_banner_link).
 * Nothing is shown until the admin turns them on. Needs public read on /site_content.
 *
 * SITE CONTENT STORE: nav.js keeps one live copy of /site_content for the page (server-sent stream, no SDK needed)
 * and exposes it as  window.NikoraSite  { get(), onChange(fn), refresh(), util }. Pages subscribe with
 * NikoraSite.onChange(function (content) { ... }) and fall back to their built-in text when a field is empty.
 * The shared footer (copyright, support email / phone, hours, social links) is rendered from it here.
 *
 * Public API:
 *   window.NikoraNav = { openMenu, closeMenu, config, refreshSiteContent }
 *   window.openAiAssistant()   opens the Beauty Concierge chat (loads it first if needed)
 *   window.openSearch()        opens the smart search overlay (loads semantic-search.js first if needed); any element with [data-nk-search-open] does the same
 */
(function () {
  'use strict';
  if (window.NikoraNav) return;                       // never inject twice
  var SELF_SRC = (document.currentScript && document.currentScript.src) || '';   // lets ai-assistant.js load from the same folder

  /* ======================================================================
   * 1. CONFIG  -  single source of truth for every page
   * ====================================================================== */
  var CONFIG = {
    logoHref: 'index.html',
    mascotAutoStatic: true,                           // true = visitors who already bought (localStorage nikora_has_purchased) start with the rabbit pinned and quiet; they can unpin anytime
    mascotRoam: true,                                 // false = the rabbit starts pinned in the corner instead of roaming (visitors can still toggle the pin)
    mascotWidget: true,                               // floating NIKORA Rabbit companion in the bottom corner (mascot.js); false = no widget (empty states and tips still work)
    logoWordmark: true,                               // show the "NIKORA" wordmark next to the bunny (false = bunny only)
    breakpoint: 1180,                                 // px: below this the burger + drawer replace the bar
    tagline: 'Smart care. Instant glow. Beauty tech designed around the routine you actually have time for.',
    hours: 'Concierge support: Mon\u2013Sun, 8am\u201310pm EST',
    shipNote: 'Free Express Shipping on every order',
    consent: true,                                    // privacy & cookie consent banner (consent.js); false = no banner and no analytics

    /* Health & cosmetic-device disclaimer shown in the footer on every page (payment gateways and regulators expect it) */
    disclaimer: 'NIKORA devices are cosmetic tools intended for personal home skincare and are not medical devices. They are not intended to diagnose, treat, cure, or prevent any medical condition or disease.',

    /* Desktop header bar */
    header: [
      { label: 'Home',        href: 'index.html' },
      /* "All Shop": the label goes straight to the full catalog; on desktop hovering / focusing it opens the category dropdown, in the mobile drawer it becomes an accordion.
         Edit the children here (label, desc, href). The ?category= values are resolved by catalog.html. */
      { label: 'All Shop',    href: 'catalog.html', children: [
        { label: 'LED Masks',            desc: 'Red-light therapy devices',  href: 'catalog.html?category=led-masks' },
        { label: 'Microcurrent Devices', desc: 'Lifting and toning tools',   href: 'catalog.html?category=microcurrent' },
        { label: 'Serums & Skincare',    desc: 'K-Beauty essentials',        href: 'catalog.html?category=serums-skincare' },
        { label: 'Best Sellers',         desc: 'Most loved right now',       href: 'catalog.html?category=best-sellers' }
      ] },
      { label: 'Science',     href: 'science.html' },
      { label: 'Reviews',     href: 'reviews.html' },
      { label: 'Track Order', href: 'track-order.html' },
      { label: 'FAQ',         href: 'faq.html' },
      { label: 'Contact',     href: 'contact.html' }
    ],

    /* Footer columns (the mobile drawer reuses the same groups, so they never drift apart).
       A link is { label, href }  or  { label, action: 'ai' } for the Beauty Concierge. */
    columns: [
      { title: 'Explore NIKORA', icon: 'bag', links: [
        { label: 'Home',             href: 'index.html' },
        { label: 'Collection',       href: 'catalog.html' },
        { label: 'The Science',      href: 'science.html' },
        { label: 'Customer Reviews', href: 'reviews.html' },
        { label: 'About NIKORA',     href: 'about.html' }
      ] },
      { title: 'Customer Care', icon: 'box', links: [
        { label: 'Track Order',      href: 'track-order.html' },
        { label: 'Returns & Refunds', href: 'returns.html' },
        { label: '30-Day Guarantee', href: 'guarantee.html' },
        { label: 'FAQ Center',       href: 'faq.html' },
        { label: 'Contact Support',  href: 'contact.html' }
      ] },
      { title: 'Legal & Concierge', icon: 'shield', links: [
        { label: 'Privacy Policy',          href: 'privacy.html' },
        { label: 'Terms of Service',        href: 'terms.html' },
        { label: 'Cookie Settings',         href: '#cookie-settings' },
        { label: 'Shipping Policy',         href: 'shipping.html' },
        { label: 'Refund & Return Policy',  href: 'returns.html#return-policy' },
        { label: 'AI Beauty Concierge',     action: 'ai', icon: 'sparkle' },
        { label: 'Support Email',           href: 'mailto:nikora.support@gmail.com' }
      ] }
    ],

    /* Legal / support row shown in the footer's bottom bar */
    legal: [
      { label: 'Privacy Policy',         href: 'privacy.html' },
      { label: 'Terms of Service',       href: 'terms.html' },
      { label: 'Cookie Settings',        href: '#cookie-settings' },
      { label: 'Shipping Policy',        href: 'shipping.html' },
      { label: 'Refund & Return Policy', href: 'returns.html#return-policy' },
      { label: '30-Day Guarantee',       href: 'guarantee.html' },
      { label: 'Contact Support',        href: 'contact.html' }
    ],

    /* pages that live "inside" another page's section (highlights the parent in the bar) */
    parents: { 'product.html': 'catalog.html' }
  };

  /* ======================================================================
   * 2. helpers
   * ====================================================================== */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fileOf(href) {                              // 'x/Catalog.html?a=1#b' -> 'catalog.html'
    var f = String(href || '').split('#')[0].split('?')[0].split('/').pop().toLowerCase();
    if (!f) f = 'index.html';
    if (f.indexOf('.') < 0) f += '.html';              // clean URLs: /catalog -> catalog.html
    return f;
  }
  var CURRENT = fileOf(location.pathname);
  var SECTION = CONFIG.parents[CURRENT] || '';         // e.g. product.html -> catalog.html
  function state(href) {
    if (!href || /^(mailto:|tel:|https?:)/i.test(href)) return '';
    var f = fileOf(href);
    return f === CURRENT ? 'page' : (SECTION && f === SECTION ? 'section' : '');
  }
  function activeAttrs(st) { return st === 'page' ? ' aria-current="page"' : ''; }
  function activeClass(st) { return st ? ' is-current' : ''; }

  /* ---- icons (pure SVG, no emoji) ---- */
  function svg(inner, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var ICON = {
    bag:     '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>',
    box:     '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7.5L12 12l8.7-4.5M12 22V12"/>',
    shield:  '<path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z"/><path d="M9 12l2 2 4-4"/>',
    sparkle: '<path d="M12 3c.6 5 3 7.4 8 8-5 .6-7.4 3-8 8-.6-5-3-7.4-8-8 5-.6 7.4-3 8-8z"/><path d="M19 3v4M17 5h4"/>',
    arrow:   '<path d="M9 6l6 6-6 6"/>',
    chev:    '<path d="M6 9l6 6 6-6"/>',
    close:   '<path d="M6 6l12 12M18 6L6 18"/>',
    burger:  '<path d="M4 6h16M4 12h16M4 18h16"/>',
    sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:    '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>',
    search:  '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    cart:    '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>'
  };
  function ico(name, cls) { return svg(ICON[name] || ICON.arrow, cls); }

  /* ======================================================================
   * 3. CSS  (namespaced .nkn-*  -> cannot clash with page styles)
   * ====================================================================== */
  var BP = CONFIG.breakpoint;
  var CSS = [
  '.nkn-header,.nkn-overlay,.nkn-drawer,.nkn-footer{',
  '  --nkn-text:var(--text,#1A1615); --nkn-soft:var(--text-soft,rgba(26,22,21,.62)); --nkn-faint:var(--text-faint,rgba(26,22,21,.45));',
  '  --nkn-logo-primary:#0B0B0E; --nkn-logo-accent:#C89B54; --nkn-logo-weight:8;',
  '  --nkn-gold:var(--gold,#C59B56); --nkn-gold-rgb:var(--gold-rgb,197,155,86); --nkn-line:var(--line,rgba(26,22,21,.1));',
  '  --nkn-bar:var(--header-bg,rgba(250,247,242,.78)); --nkn-card:var(--card-bg,rgba(255,255,255,.65));',
  '  --nkn-border:var(--card-border,rgba(230,220,210,.6)); --nkn-panel:var(--surface-raised,rgba(255,255,255,.88));',
  '  --nkn-tint:var(--surface-tint,rgba(26,22,21,.04)); --nkn-rose:var(--rose,#D81E5B);',
  '  --nkn-float-bg:rgba(250,247,242,.72); --nkn-float-bg-scrolled:rgba(250,247,242,.88); --nkn-float-edge:rgba(26,22,21,.09);',
  '  --nkn-float-shadow:0 14px 34px -22px rgba(26,22,21,.34); --nkn-float-shadow-scrolled:0 18px 40px -20px rgba(26,22,21,.46); --nkn-sub-bg:#FCF9F4;',
  '}',
  ':root[data-theme="dark"] .nkn-header,:root[data-theme="dark"] .nkn-overlay,:root[data-theme="dark"] .nkn-drawer,:root[data-theme="dark"] .nkn-footer{',
  '  --nkn-text:var(--text,#F7F4F0); --nkn-soft:var(--text-soft,rgba(247,244,240,.64)); --nkn-faint:var(--text-faint,rgba(247,244,240,.4));',
  '  --nkn-logo-primary:#FFFFFF; --nkn-logo-accent:#C89B54; --nkn-logo-weight:8;',
  '  --nkn-gold:var(--gold,#E5BA73); --nkn-gold-rgb:var(--gold-rgb,229,186,115); --nkn-line:var(--line,rgba(255,255,255,.09));',
  '  --nkn-bar:var(--header-bg,rgba(13,11,18,.72)); --nkn-card:var(--card-bg,rgba(25,20,32,.55));',
  '  --nkn-border:var(--card-border,rgba(255,255,255,.08)); --nkn-panel:var(--surface-raised,rgba(30,25,38,.9));',
  '  --nkn-tint:var(--surface-tint,rgba(255,255,255,.05)); --nkn-rose:var(--rose,#FF527B);',
  '  --nkn-float-bg:rgba(11,11,14,.66); --nkn-float-bg-scrolled:rgba(11,11,14,.86); --nkn-float-edge:rgba(255,255,255,.09);',
  '  --nkn-float-shadow:0 20px 44px -24px rgba(0,0,0,.85); --nkn-float-shadow-scrolled:0 24px 48px -20px rgba(0,0,0,.9); --nkn-sub-bg:#14111A;',
  '}',

  /* ---- NIKORA custom scrollbar (every page: cart drawer, filters, menus, lists) ----
     Slim gold thumb on a transparent track. scrollbar-width / scrollbar-color are the standard properties (Chrome 121+, Firefox); the ::-webkit-scrollbar rules
     cover Safari and older Chromium. !important so page-level rules (e.g. the cart recommendations strip) cannot bring the default bar back. */
  ':root,:root *{scrollbar-width:thin !important;scrollbar-color:rgba(200,155,84,.78) rgba(11,11,14,.05) !important;}',
  ':root[data-theme="dark"],:root[data-theme="dark"] *{scrollbar-color:rgba(200,155,84,.72) rgba(255,255,255,.05) !important;}',
  ':root ::-webkit-scrollbar,:root *::-webkit-scrollbar{width:6px !important;height:6px !important;background:transparent !important;}',
  ':root ::-webkit-scrollbar-track,:root *::-webkit-scrollbar-track{background:rgba(11,11,14,.05) !important;border-radius:100px;}',
  ':root[data-theme="dark"] ::-webkit-scrollbar-track,:root[data-theme="dark"] *::-webkit-scrollbar-track{background:rgba(255,255,255,.05) !important;}',
  ':root ::-webkit-scrollbar-thumb,:root *::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(214,176,112,.75),rgba(200,155,84,.55)) !important;border-radius:100px !important;border:2px solid transparent !important;background-clip:padding-box !important;}',
  ':root ::-webkit-scrollbar-thumb:hover,:root *::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#E3C078,#C89B54) !important;background-clip:padding-box !important;}',
  ':root ::-webkit-scrollbar-corner,:root *::-webkit-scrollbar-corner{background:transparent !important;}',

  /* ---- header bar (glass) ---- */
  /* Floating curved header: docks to the top edge, floats clear of the side edges, soft 20px bottom corners, frosted glass,
     faint neutral hairline edge (no gold bar anywhere on the header: gold is reserved for the logo, the theme pill and the nav indicator). Every colour is a theme variable (see --nkn-float-* above). */
  '.nkn-header{--nkn-header-r:20px;position:sticky;top:0;z-index:400;height:73px;box-sizing:border-box;color:var(--nkn-text);',
  '  margin:0 clamp(8px,2.2vw,28px);border:1px solid var(--nkn-float-edge);border-top:0;',
  '  border-radius:0 0 var(--nkn-header-r) var(--nkn-header-r);',
  '  background:var(--nkn-float-bg);-webkit-backdrop-filter:blur(20px) saturate(170%);backdrop-filter:blur(20px) saturate(170%);',
  '  box-shadow:var(--nkn-float-shadow);transition:background-color .3s ease,box-shadow .3s ease,border-color .3s ease;font-family:inherit;}',
  '.nkn-header.is-scrolled{background:var(--nkn-float-bg-scrolled);box-shadow:var(--nkn-float-shadow-scrolled);}',
  '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.nkn-header{background:var(--nkn-float-bg-scrolled);}}',
  '.nkn-header *,.nkn-drawer *,.nkn-footer *{box-sizing:border-box;}',
  '.nkn-row{display:flex;align-items:center;justify-content:space-between;gap:24px;height:100%;padding:0 clamp(20px,4vw,48px);}',
  /* NIKORA logo: bunny mascot as one inline SVG (stroke = gold outline, fill = face), recoloured by CSS variables, so it follows the theme toggle with no swap, jump or flash.
     --nkn-logo-weight sets the outline thickness in SVG units (viewBox is ~101 x 133, so 8 = bold and plush at header size). */
  '.nkn-logo{--nkn-logo-h:46px;display:inline-flex;align-items:center;gap:calc(var(--nkn-logo-h) * .26);flex:none;line-height:1;text-decoration:none;-webkit-tap-highlight-color:transparent;}',
  '.nkn-logo-svg{display:block;flex:none;height:var(--nkn-logo-h);width:calc(var(--nkn-logo-h) * .7609);aspect-ratio:101.2 / 133;overflow:visible;shape-rendering:geometricPrecision;',
  '  fill:var(--nkn-logo-primary);color:var(--nkn-logo-accent);transition:fill .35s ease,color .35s ease;}',
  '.nkn-wordmark{display:inline-flex;align-items:baseline;position:relative;top:-.06em;font-family:"Playfair Display","Cormorant Garamond",Georgia,"Times New Roman",serif;font-size:calc(var(--nkn-logo-h) * .5);line-height:1;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;}',
  '.nkn-wordmark .nkn-nik{font-weight:600;font-style:normal;color:var(--nkn-logo-primary);transition:color .35s ease;}',
  '.nkn-wordmark .nkn-ora{font-weight:500;font-style:italic;color:var(--nkn-logo-accent);margin-left:-.04em;transition:color .35s ease;}',
  '.nkn-d-head .nkn-logo{--nkn-logo-h:44px;}',
  '.nkn-footer .nkn-logo{--nkn-logo-h:64px;}',

  /* ---- health / cosmetic-device disclaimer ---- */
  '.nkn-f-disclaimer{margin:30px 0 26px;max-width:940px;font-size:12px;line-height:1.75;color:var(--nkn-faint);}',
  '.nkn-f-disclaimer strong{color:var(--nkn-soft);font-weight:600;}',

  /* ---- footer contact lines + social icons (content comes from Firebase /site_content) ---- */
  '.nkn-f-brand .nkn-f-contact{margin-top:14px;font-size:13px;line-height:1.7;color:var(--nkn-soft);}',
  '.nkn-f-contact a{color:inherit;text-decoration:none;border-bottom:1px solid transparent;transition:color .2s,border-color .2s;}',
  '.nkn-f-contact a:hover,.nkn-f-contact a:focus-visible{color:var(--nkn-gold);border-bottom-color:currentColor;}',
  '.nkn-f-social{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;}',
  '.nkn-f-social a{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid var(--nkn-line);border-radius:50%;color:var(--nkn-soft);transition:color .2s,border-color .2s,transform .2s;}',
  '.nkn-f-social a:hover,.nkn-f-social a:focus-visible{color:var(--nkn-gold);border-color:var(--nkn-gold);transform:translateY(-2px);}',
  '.nkn-f-social svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}',

  /* ---- announcement bar + promo banner (content comes from Firebase /site_content) ---- */
  '.nkn-announce{position:relative;z-index:401;background:#0B0B0E;color:#F3EEE6;border-bottom:1px solid rgba(200,155,84,.45);font-family:inherit;}',
  '.nkn-announce[hidden],.nkn-promo[hidden]{display:none;}',
  '.nkn-announce-text{margin:0;padding:9px clamp(16px,4vw,48px);text-align:center;font-size:12.5px;font-weight:500;letter-spacing:.04em;line-height:1.45;}',
  '.nkn-announce a{color:inherit;text-decoration:none;}',
  '.nkn-announce a:hover{text-decoration:underline;text-underline-offset:3px;}',
  '.nkn-announce a:focus-visible,.nkn-marq-btn:focus-visible{outline:2px solid #C89B54;outline-offset:2px;}',
  '.nkn-announce-marq{display:flex;align-items:center;}',
  '.nkn-marq{flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap;-webkit-mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);}',
  '.nkn-marq-track{display:flex;width:max-content;animation:nknMarq var(--nkn-marq-dur,30s) linear infinite;will-change:transform;}',
  '.nkn-marq-group{display:flex;flex:none;}',
  '.nkn-marq-item{flex:none;padding:9px 0;font-size:12.5px;font-weight:500;letter-spacing:.04em;line-height:1.45;}',
  '.nkn-marq-item::after{content:"\\2726";margin:0 clamp(24px,4vw,56px);color:#C89B54;opacity:.8;}',
  '.nkn-announce:hover .nkn-marq-track,.nkn-announce:focus-within .nkn-marq-track,.nkn-announce.is-paused .nkn-marq-track{animation-play-state:paused;}',
  '.nkn-marq-btn{flex:none;width:26px;height:26px;margin:0 10px 0 4px;padding:0;display:inline-flex;align-items:center;justify-content:center;gap:3px;border-radius:50%;cursor:pointer;color:inherit;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);}',
  '.nkn-marq-btn i{display:block;width:3px;height:10px;border-radius:1px;background:currentColor;}',
  '.nkn-announce.is-paused .nkn-marq-btn i:first-child{width:0;height:0;border-radius:0;background:none;border-left:8px solid currentColor;border-top:5px solid transparent;border-bottom:5px solid transparent;}',
  '.nkn-announce.is-paused .nkn-marq-btn i:last-child{display:none;}',
  '@keyframes nknMarq{from{transform:translateX(0);}to{transform:translateX(-50%);}}',
  '@media (prefers-reduced-motion:reduce){.nkn-marq-track{animation:none;width:auto;}.nkn-marq-group+.nkn-marq-group,.nkn-marq-btn{display:none;}.nkn-marq{white-space:normal;text-align:center;-webkit-mask-image:none;mask-image:none;}.nkn-marq-item{padding:9px clamp(16px,4vw,48px);}.nkn-marq-item::after{display:none;}.nkn-marq-item+.nkn-marq-item{display:none;}}',
  '.nkn-promo{position:relative;z-index:1;background:#0B0B0E;font-family:inherit;}',
  '.nkn-promo a,.nkn-promo img{display:block;width:100%;}',
  '.nkn-promo img{height:auto;max-height:clamp(72px,16vw,190px);object-fit:cover;}',
  '.nkn-promo-x{position:absolute;top:8px;right:10px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid rgba(255,255,255,.28);border-radius:50%;background:rgba(11,11,14,.6);color:#fff;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);}',
  '.nkn-promo-x svg{width:14px;height:14px;}',
  '.nkn-promo-x:focus-visible{outline:2px solid #C89B54;outline-offset:2px;}',

  /* ---- desktop links ---- */
  '.nkn-primary{display:flex;align-items:center;gap:clamp(16px,1.9vw,28px);}',
  '.nkn-link{position:relative;display:inline-flex;align-items:center;padding:6px 0;background:none;border:0;cursor:pointer;',
  '  font:inherit;font-size:13.5px;font-weight:500;letter-spacing:.02em;color:var(--nkn-soft);text-decoration:none;white-space:nowrap;transition:color .2s ease;}',
  '.nkn-link:hover,.nkn-link:focus-visible,.nkn-link.is-current{color:var(--nkn-text);}',
  /* Liquid BELL-CURVE indicator: an inline SVG hill (no border-radius, no box) whose base flares outward and fades into the header's bottom edge, so it
     looks melted into the navbar. nav.js injects the <svg> into .nkn-ind and sets the element's transform + width (px, from the link's offsetLeft / offsetWidth).
     .nkn-ind-track = a strip along the header's bottom edge (nav.js sets bottom/left/right) that clips the curve to the links wrapper plus a margin for the flared tails
     and the glow. The SVG stretches with the element's width (preserveAspectRatio="none"), which is what makes the travelling ripple look liquid.
     Colour: brand gold #C89B54 gradient (fixed, translucent highlights) so both themes work. */
  '.nkn-primary{--nkn-bell-h:8px;position:relative;}',
  '.nkn-ind-track{position:absolute;left:0;right:0;bottom:0;height:22px;overflow:hidden;pointer-events:none;}',
  '.nkn-ind{position:absolute;left:0;top:0;width:0;height:100%;opacity:0;transform-origin:50% 100%;will-change:transform,width;transition:opacity .25s ease;}',
  '.nkn-ind::before{content:"";position:absolute;left:-10px;right:-10px;bottom:0;height:100%;background:radial-gradient(ellipse 50% 100% at 50% 100%,rgba(200,155,84,.45),rgba(200,155,84,0));}',
  '.nkn-ind svg{position:absolute;left:0;bottom:0;display:block;width:100%;height:var(--nkn-bell-h);overflow:visible;filter:drop-shadow(0 0 5px rgba(200,155,84,.6));}',
  '.nkn-ind.is-on{opacity:1;}',
  '.nkn-ind.is-fx{transition:opacity .25s ease,transform .55s cubic-bezier(.68,-.55,.26,1.55),width .55s cubic-bezier(.68,-.55,.26,1.55);}',   /* only used when the Web Animations API is missing: plain spring, no stretch */
  '.nkn-link:focus-visible,.nkn-d-link:focus-visible,.nkn-btn:focus-visible,.nkn-logo:focus-visible,.nkn-f-link:focus-visible{outline:2px solid var(--nkn-gold);outline-offset:3px;border-radius:6px;}',

  /* ---- right-hand actions ---- */
  '.nkn-actions{display:flex;align-items:center;gap:12px;}',
  '.nkn-pill{display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:100px;background:var(--nkn-card);border:1px solid var(--nkn-line);}',
  '.nkn-pill button{width:30px;height:30px;display:grid;place-items:center;border:0;border-radius:50%;background:none;cursor:pointer;color:var(--nkn-soft);transition:background .2s ease,color .2s ease;}',
  '.nkn-pill button svg{width:15px;height:15px;}',
  '.nkn-pill button.active{background:var(--nkn-gold);color:#241c0f;}',
  '.nkn-btn{position:relative;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;cursor:pointer;color:var(--nkn-text);',
  '  background:var(--nkn-card);border:1px solid var(--nkn-line);transition:border-color .2s ease,transform .2s ease;}',
  '.nkn-btn:hover{border-color:var(--nkn-gold);transform:translateY(-1px);}',
  '.nkn-btn svg{width:18px;height:18px;}',
  '.nkn-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:100px;background:var(--nkn-rose);color:#fff;',
  '  font-size:10.5px;font-weight:700;line-height:18px;text-align:center;transition:transform .2s ease;}',
  '.nkn-badge.bump{transform:scale(1.3);}',
  '.nkn-burger{display:none;}',

  /* ---- mobile / tablet drawer (slides in from the left, glass) ---- */
  '.nkn-overlay{position:fixed;inset:0;z-index:1980;background:rgba(10,8,12,.5);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);',
  '  opacity:0;visibility:hidden;pointer-events:none;transition:opacity .3s ease,visibility 0s linear .3s;}',
  '.nkn-overlay.active{opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s;}',
  '.nkn-drawer{position:fixed;top:0;left:0;bottom:0;z-index:1990;width:min(340px,88vw);display:flex;flex-direction:column;color:var(--nkn-text);',
  '  background:var(--nkn-panel);-webkit-backdrop-filter:blur(24px) saturate(170%);backdrop-filter:blur(24px) saturate(170%);',
  '  border-right:1px solid var(--nkn-border);box-shadow:24px 0 70px -24px rgba(0,0,0,.45);font-family:inherit;',
  '  transform:translateX(-102%);visibility:hidden;transition:transform .4s cubic-bezier(.2,.8,.2,1),visibility 0s linear .4s;}',
  '.nkn-drawer.active{transform:translateX(0);visibility:visible;transition-delay:0s;}',
  '.nkn-d-head{flex:none;display:flex;align-items:center;justify-content:space-between;padding:20px 20px 18px;border-bottom:1px solid var(--nkn-line);}',
  '.nkn-d-close{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;cursor:pointer;color:var(--nkn-text);background:var(--nkn-card);border:1px solid var(--nkn-line);transition:transform .25s ease,border-color .2s ease;}',
  '.nkn-d-close:hover{border-color:var(--nkn-gold);transform:rotate(90deg);}',
  '.nkn-d-close svg{width:16px;height:16px;}',
  '.nkn-d-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:8px 12px 16px;}',
  '.nkn-d-sec{padding:14px 0 4px;}',
  '.nkn-d-title{display:flex;align-items:center;gap:8px;padding:0 10px 8px;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nkn-faint);}',
  '.nkn-d-title svg{width:14px;height:14px;color:var(--nkn-gold);}',
  '.nkn-d-link{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:12px 12px 12px 14px;border-radius:12px;text-decoration:none;',
  '  background:none;border:0;cursor:pointer;text-align:left;font:inherit;font-size:15px;font-weight:500;color:var(--nkn-soft);transition:background .18s ease,color .18s ease;}',
  '.nkn-d-link svg{width:15px;height:15px;opacity:.45;flex:none;transition:transform .18s ease,opacity .18s ease;}',
  '.nkn-d-link:hover,.nkn-d-link:focus-visible{background:var(--nkn-tint);color:var(--nkn-text);}',
  '.nkn-d-link:hover svg{transform:translateX(3px);opacity:.9;}',
  '.nkn-d-link.is-current{background:rgba(var(--nkn-gold-rgb),.14);color:var(--nkn-text);font-weight:600;}',
  '.nkn-d-link.is-current::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:3px;background:var(--nkn-gold);}',
  '.nkn-d-link.is-current svg,.nkn-d-ai svg{color:var(--nkn-gold);opacity:1;}',
  '.nkn-d-foot{flex:none;display:flex;align-items:center;justify-content:space-between;padding:16px 20px calc(18px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--nkn-line);',
  '  font-size:13px;font-weight:600;color:var(--nkn-soft);}',
  '.nkn-drawer.active .nkn-d-sec{animation:nknIn .45s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0) * 60ms + 120ms);}',
  '@keyframes nknIn{from{opacity:0;transform:translateX(-14px);}to{opacity:1;transform:none;}}',

  /* ---- "All Shop" mega menu (desktop dropdown) ----
     The panel sits inside .nkn-primary (so the liquid indicator code is untouched), is positioned by initMega() under the All Shop link and has a transparent
     padding-top bridge, so the pointer can travel from the link to the card without the menu closing. Opaque card (the header already owns a backdrop blur). */
  '.nkn-link .nkn-chev{width:12px;height:12px;margin-left:5px;flex:none;transition:transform .25s cubic-bezier(.2,.8,.2,1);}',
  '.nkn-link[aria-expanded="true"] .nkn-chev{transform:rotate(180deg);}',
  '.nkn-sub{position:absolute;top:100%;left:0;z-index:5;width:var(--nkn-sub-w,310px);padding-top:var(--nkn-sub-pt,26px);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-6px);',
  '  transition:opacity .22s ease,transform .26s cubic-bezier(.2,.8,.2,1),visibility 0s linear .26s;}',
  '.nkn-sub.is-open{opacity:1;visibility:visible;pointer-events:auto;transform:none;transition-delay:0s;}',
  '.nkn-sub-card{padding:8px;border-radius:18px;background:var(--nkn-sub-bg);border:1px solid rgba(var(--nkn-gold-rgb),.4);box-shadow:var(--nkn-float-shadow-scrolled);}',
  '.nkn-sub-link{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border-radius:12px;text-decoration:none;color:var(--nkn-soft);transition:background .18s ease,color .18s ease,transform .18s ease;}',
  '.nkn-sub-link:hover,.nkn-sub-link:focus-visible{background:rgba(var(--nkn-gold-rgb),.14);color:var(--nkn-text);transform:translateX(2px);}',
  '.nkn-sub-link b{display:block;font-size:13.5px;font-weight:600;color:var(--nkn-text);letter-spacing:.01em;}',
  '.nkn-sub-link small{display:block;margin-top:2px;font-size:11.5px;color:var(--nkn-faint);}',
  '.nkn-sub-link svg{width:14px;height:14px;flex:none;color:var(--nkn-gold);opacity:0;transform:translateX(-4px);transition:opacity .18s ease,transform .18s ease;}',
  '.nkn-sub-link:hover svg,.nkn-sub-link:focus-visible svg{opacity:1;transform:none;}',
  '.nkn-sub-all{margin-bottom:6px;padding-bottom:12px;border-bottom:1px solid var(--nkn-line);border-radius:12px 12px 0 0;}',
  '.nkn-sub-all b{color:var(--nkn-gold);}',

  /* ---- "All Shop" accordion inside the mobile drawer (grid-template-rows 0fr -> 1fr: smooth height with no JS measuring) ---- */
  '.nkn-d-acc-btn[aria-expanded="true"]{color:var(--nkn-text);}',
  '.nkn-d-acc-btn svg,.nkn-d-acc-btn:hover svg{opacity:.8;transform:none;transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .18s ease;}',
  '.nkn-d-acc-btn[aria-expanded="true"] svg,.nkn-d-acc-btn[aria-expanded="true"]:hover svg{transform:rotate(180deg);opacity:1;color:var(--nkn-gold);}',
  '.nkn-acc{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s cubic-bezier(.2,.8,.2,1);}',
  '.nkn-acc.is-open{grid-template-rows:1fr;}',
  '.nkn-acc-in{min-height:0;overflow:hidden;visibility:hidden;opacity:0;margin-left:18px;padding-left:10px;border-left:1px solid rgba(var(--nkn-gold-rgb),.4);transition:opacity .25s ease,visibility 0s linear .32s;}',
  '.nkn-acc.is-open .nkn-acc-in{visibility:visible;opacity:1;transition-delay:0s;}',
  '.nkn-d-sublink{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:500;color:var(--nkn-soft);transition:background .18s ease,color .18s ease;}',
  '.nkn-d-sublink svg{width:14px;height:14px;flex:none;opacity:.4;}',
  '.nkn-d-sublink:hover,.nkn-d-sublink:focus-visible{background:var(--nkn-tint);color:var(--nkn-text);}',
  '.nkn-d-sublink.nkn-d-all{color:var(--nkn-gold);font-weight:600;}',

  /* ---- footer: frosted glass with an asymmetric multi-layer wave top edge + two ambient glow orbs ----
     Structure (see waveHtml()): .nkn-f-deco (decor, aria-hidden) = 2 glow orbs, glass strip clipped to the wave, glass body, SVG wave layers; .nkn-f-wrap = the content on top.
     Gold is the fixed brand #C89B54 (--nkn-f-gold); everything else comes from the variables below, so both themes need no hardcoded white. */
  '.nkn-footer{--nkn-f-gold:200,155,84;--nkn-f-glow2:214,140,118;--nkn-wave-h:clamp(48px,8vw,112px);',
  '  --nkn-foot-bg:rgba(11,11,14,.045);--nkn-wave-a:.22;--nkn-wave-b:.14;--nkn-edge-a:.5;--nkn-edge-b:.26;--nkn-edge-c:.14;--nkn-glow-a:.2;--nkn-glow-b:.13;',
  '  position:relative;isolation:isolate;display:block;width:100%;max-width:none;margin:12px 0 0;padding:calc(var(--nkn-wave-h) + 34px) 0 28px;color:var(--nkn-text);font-family:inherit;}',
  ':root[data-theme="dark"] .nkn-footer{--nkn-foot-bg:rgba(11,11,14,.62);--nkn-wave-a:.2;--nkn-wave-b:.12;--nkn-edge-a:.42;--nkn-edge-b:.22;--nkn-edge-c:.12;--nkn-glow-a:.17;--nkn-glow-b:.11;}',
  '.nkn-f-deco{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;}',
  '.nkn-f-glow{position:absolute;z-index:0;aspect-ratio:1;border-radius:50%;will-change:transform,opacity;backface-visibility:hidden;',
  '  animation:ambientGlowPulse var(--nkn-gd,15s) ease-in-out var(--nkn-gdl,0s) infinite;animation-play-state:paused;}',
  '.nkn-f-glow-a{--nkn-gd:15s;--nkn-gx:9%;--nkn-gy:7%;left:-6%;top:0;width:clamp(260px,36vw,560px);background:radial-gradient(closest-side,rgba(var(--nkn-f-gold),var(--nkn-glow-a)),transparent);}',
  '.nkn-f-glow-b{--nkn-gd:21s;--nkn-gdl:-8s;--nkn-gx:-10%;--nkn-gy:-8%;right:-5%;bottom:0;width:clamp(220px,30vw,460px);background:radial-gradient(closest-side,rgba(var(--nkn-f-glow2),var(--nkn-glow-b)),transparent);}',
  '.nkn-f-glass-wave,.nkn-f-glass{position:absolute;left:0;right:0;z-index:1;background:var(--nkn-foot-bg);-webkit-backdrop-filter:blur(12px) saturate(140%);backdrop-filter:blur(12px) saturate(140%);}',
  '.nkn-f-glass-wave{top:0;height:var(--nkn-wave-h);-webkit-clip-path:url(#nkn-wave-clip);clip-path:url(#nkn-wave-clip);}',
  '.nkn-f-glass{top:var(--nkn-wave-h);bottom:0;}',
  '.nkn-f-wave{position:absolute;left:0;top:0;z-index:2;display:block;width:100%;height:var(--nkn-wave-h);overflow:hidden;}',
  /* Motion. Only whole elements are animated, and only with transform / opacity, so the browser can run it on the compositor (GPU):
     each back wave is its own <svg> (a 5.6% overhang on both sides lets it drift sideways without ever showing an end), the two glow orbs are plain divs.
     The front crest and the glass strip stay still: the glass is clipped to that curve and must keep registering with it. Animations only run while the
     footer is on screen (.is-live, set by an IntersectionObserver in nav.js) and are switched off for prefers-reduced-motion. */
  '.nkn-f-layer{left:-5.5556%;width:111.1111%;overflow:visible;transform-origin:50% 100%;will-change:transform;backface-visibility:hidden;',
  '  animation:footerWaveFloat var(--nkn-wd,14s) ease-in-out var(--nkn-wdl,0s) infinite alternate;animation-play-state:paused;}',
  '.nkn-f-layer-a{--nkn-wd:18s;--nkn-wdl:-7s;--nkn-wx:2.2%;--nkn-wy0:.9;--nkn-wy1:1.04;}',
  '.nkn-f-layer-b{--nkn-wd:12s;--nkn-wdl:-3s;--nkn-wx:1.5%;--nkn-wy0:.93;--nkn-wy1:1.05;}',
  '.nkn-footer.is-live .nkn-f-layer,.nkn-footer.is-live .nkn-f-glow{animation-play-state:running;}',
  '@keyframes footerWaveFloat{0%{transform:translate3d(calc(var(--nkn-wx) * -1),0,0) scaleY(var(--nkn-wy0));}100%{transform:translate3d(var(--nkn-wx),0,0) scaleY(var(--nkn-wy1));}}',
  '@keyframes ambientGlowPulse{0%,100%{opacity:.55;transform:translate3d(0,0,0) scale(.92);}50%{opacity:1;transform:translate3d(var(--nkn-gx),var(--nkn-gy),0) scale(1.08);}}',
  '@media (prefers-reduced-motion:reduce){.nkn-f-layer,.nkn-f-glow{animation:none !important;}}',
  '.nkn-f-wave .nkn-we{fill:none;vector-effect:non-scaling-stroke;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;}',
  '.nkn-f-wave .nkn-we-a{stroke:rgba(var(--nkn-f-gold),var(--nkn-edge-c));}',
  '.nkn-f-wave .nkn-we-b{stroke:rgba(var(--nkn-f-gold),var(--nkn-edge-b));}',
  '.nkn-f-wave .nkn-we-f{stroke:rgba(var(--nkn-f-gold),var(--nkn-edge-a));}',
  '.nkn-f-wrap{position:relative;z-index:3;max-width:1200px;margin:0 auto;padding:0 clamp(20px,4vw,48px);}',
  '.nkn-f-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:40px;margin-bottom:44px;}',
  '.nkn-f-brand p{margin:14px 0 0;max-width:320px;font-size:13.5px;line-height:1.65;color:var(--nkn-soft);}',
  '.nkn-f-brand .nkn-f-hours{font-size:12px;color:var(--nkn-faint);margin-top:12px;}',
  '.nkn-f-col h5{margin:0 0 14px;font-family:inherit;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--nkn-faint);}',
  '.nkn-f-link{display:flex;align-items:center;gap:8px;width:max-content;max-width:100%;padding:6px 0;background:none;border:0;cursor:pointer;text-align:left;text-decoration:none;',
  '  font:inherit;font-size:13.5px;color:var(--nkn-soft);transition:color .2s ease,transform .2s ease;}',
  '.nkn-f-link svg{width:14px;height:14px;flex:none;color:var(--nkn-gold);}',
  '.nkn-f-link:hover,.nkn-f-link:focus-visible,.nkn-f-link.is-current{color:var(--nkn-gold);transform:translateX(2px);}',
  '.nkn-f-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding-top:26px;border-top:1px solid var(--nkn-line);font-size:12px;color:var(--nkn-faint);}',
  '.nkn-f-legal{display:flex;flex-wrap:wrap;align-items:center;gap:8px 22px;}',
  '.nkn-f-legal a{color:var(--nkn-soft);text-decoration:none;white-space:nowrap;border-bottom:1px solid transparent;transition:color .2s ease,border-color .2s ease;}',
  '.nkn-f-legal a:hover,.nkn-f-legal a:focus-visible,.nkn-f-legal a.is-current{color:var(--nkn-gold);border-bottom-color:currentColor;}',
  '.nkn-f-legal a:focus-visible{outline:2px solid var(--nkn-gold);outline-offset:3px;border-radius:4px;}',
  '@media (max-width:900px){.nkn-f-grid{grid-template-columns:1fr 1fr;gap:32px;}.nkn-f-brand{grid-column:1 / -1;}}',
  '@media (max-width:480px){.nkn-f-grid{grid-template-columns:1fr;gap:26px;}.nkn-footer{padding-top:calc(var(--nkn-wave-h) + 22px);}}',

  /* ---- responsive: below the breakpoint the bar collapses into the burger ---- */
  '@media (max-width:' + (BP - 0.02) + 'px){',
  '  .nkn-primary{display:none;}',
  '  .nkn-burger{display:grid;}',
  '  .nkn-row{gap:14px;}',
  '}',
  '@media (max-width:600px){ .nkn-header{--nkn-header-r:16px;margin:0 8px;} .nkn-header .nkn-logo{--nkn-logo-h:40px;} .nkn-footer .nkn-logo{--nkn-logo-h:56px;} }',
  /* phones: the search button needs room, so the header theme pill steps aside (the drawer keeps its own theme switcher) */
  '@media (max-width:460px){ .nkn-header .nkn-pill{display:none;} .nkn-actions{gap:8px;} }',
  '@media (max-width:360px){ .nkn-header .nkn-logo{--nkn-logo-h:36px;} }',
  '@media (max-width:340px){ .nkn-header .nkn-row{gap:8px;padding:0 14px;} .nkn-header .nkn-btn{width:36px;height:36px;} }',
  '@media (prefers-reduced-motion:reduce){',
  '  .nkn-header,.nkn-drawer,.nkn-overlay,.nkn-ind,.nkn-f-link,.nkn-logo-svg,.nkn-wordmark,.nkn-sub,.nkn-sub-link,.nkn-chev,.nkn-acc,.nkn-acc-in,.nkn-d-sublink,.nkn-d-acc-btn svg{transition-duration:.001s !important;transition-delay:0s !important;}',
  '  .nkn-drawer.active .nkn-d-sec{animation:none;}',
  '}'
  ].join('\n');

  /* ======================================================================
   * 4. MARKUP
   * ====================================================================== */
  /* The NIKORA bunny mascot is drawn once as an SVG <symbol> (vector trace of the official artwork) and reused for the header, drawer and footer.
     The gold outline uses currentColor (--nkn-logo-accent); the face (eyes, nose, mouth) uses `fill` (--nkn-logo-primary: obsidian in light mode, white in dark),
     so everything follows the theme toggle with no image swap, jump or flash. */
  var LOGO_SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">' +
    '<symbol id="nkn-logo-sym" viewBox="-2 -2 101.2 133">' +
    /* gold outline: two ears + head, stroke-only, thickness from --nkn-logo-weight */
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:var(--nkn-logo-weight,8)">' +
      '<path d="M23 56C14 44 8 29 7.5 15C7.3 7 12 3.7 17.5 3.7C24 4 30 12 34 24C37 33 38.5 42 38.2 50.5"/>' +
      '<path d="M74.2 56C83.2 44 89.2 29 89.7 15C89.9 7 85.2 3.7 79.7 3.7C73.2 4 67.2 12 63.2 24C60.2 33 58.7 42 59 50.5"/>' +
      '<ellipse cx="48.6" cy="86.5" rx="43.2" ry="37"/>' +
    '</g>' +
    /* face: obsidian in light mode, white in dark mode (--nkn-logo-primary) */
    '<ellipse cx="31.8" cy="76.7" rx="5" ry="5.6"/>' +
    '<ellipse cx="66" cy="76.7" rx="5" ry="5.6"/>' +
    '<path d="M42.6 84.6C42.6 83.7 45.5 83.2 48.6 83.2C51.7 83.2 54.6 83.7 54.6 84.6C54.2 87.2 51.5 89.2 48.6 90.2C45.7 89.2 43 87.2 42.6 84.6Z"/>' +
    '<path d="M48.6 89.5V96.5M48.6 96.5C46 99.4 42.6 100.4 39.6 99.5C37.6 98.9 36.2 97.4 35.9 95.6M48.6 96.5C51.2 99.4 54.6 100.4 57.6 99.5C59.6 98.9 61 97.4 61.3 95.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--nkn-logo-primary)"/>' +
    '</symbol></svg>';
  function logoHtml(extra) {
    return '<a class="nkn-logo"' + (extra || '') + ' href="' + esc(CONFIG.logoHref) + '" aria-label="NIKORA home">' +
      '<svg class="nkn-logo-svg" viewBox="-2 -2 101.2 133" width="101.2" height="133" aria-hidden="true" focusable="false"><use href="#nkn-logo-sym" width="100%" height="100%"></use></svg>' +
      (CONFIG.logoWordmark ? '<span class="nkn-wordmark" aria-hidden="true"><span class="nkn-nik">NIK</span><span class="nkn-ora">ORA</span></span>' : '') + '</a>';
  }
  function themePill(idSuffix) {
    return '<div class="nkn-pill" role="group" aria-label="Theme switcher">' +
      '<button type="button" id="theme-light-btn' + idSuffix + '" data-nkn-theme="light" aria-label="Light theme">' + ico('sun') + '</button>' +
      '<button type="button" id="theme-dark-btn' + idSuffix + '" data-nkn-theme="dark" aria-label="Dark theme">' + ico('moon') + '</button>' +
    '</div>';
  }

  function buildHeader() {
    var subs = '';
    var links = CONFIG.header.map(function (p, idx) {
      var st = state(p.href);
      if (p.children && p.children.length) {                                   /* "All Shop": link + dropdown panel (the panel is appended after the links) */
        var sid = 'nkn-sub-' + idx;
        subs += '<div class="nkn-sub" id="' + sid + '" role="menu" aria-label="' + esc(p.label) + ' categories"><div class="nkn-sub-card">' +
          '<a class="nkn-sub-link nkn-sub-all" role="menuitem" href="' + esc(p.href) + '"><span><b>Shop everything</b><small>The full NIKORA collection</small></span>' + ico('arrow') + '</a>' +
          p.children.map(function (c) {
            return '<a class="nkn-sub-link" role="menuitem" href="' + esc(c.href) + '"><span><b>' + esc(c.label) + '</b>' + (c.desc ? '<small>' + esc(c.desc) + '</small>' : '') + '</span>' + ico('arrow') + '</a>';
          }).join('') + '</div></div>';
        return '<a class="nkn-link nkn-has-sub' + activeClass(st) + '" href="' + esc(p.href) + '"' + activeAttrs(st) + ' data-nkn-sub="' + sid + '" aria-haspopup="true" aria-expanded="false" aria-controls="' + sid + '">' + esc(p.label) + ico('chev', 'nkn-chev') + '</a>';
      }
      return '<a class="nkn-link' + activeClass(st) + '" href="' + esc(p.href) + '"' + activeAttrs(st) + '>' + esc(p.label) + '</a>';
    }).join('');

    return '<header class="nkn-header" id="nkn-header">' +
      '<div class="nkn-row">' +
        logoHtml(' id="nkn-logo"') +
        '<nav class="nkn-primary" aria-label="Primary">' + links + subs + '<span class=\"nkn-ind-track\" aria-hidden=\"true\"><span class=\"nkn-ind\"></span></span></nav>' +
        '<div class="nkn-actions">' +
          themePill('') +
          '<button type="button" class="nkn-btn" id="nkn-search-btn" data-nk-search-open aria-label="Search products" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">' + ico('search') + '</button>' +
          '<button type="button" class="nkn-btn" id="open-cart-btn" data-nk-point="cart" aria-label="Open cart">' + ico('cart') + '<span class="nkn-badge" id="cart-count">0</span></button>' +
          '<button type="button" class="nkn-btn nkn-burger" id="mobile-menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu-drawer">' + ico('burger') + '</button>' +
        '</div>' +
      '</div>' +
    '</header>';
  }

  /* Mobile drawer: "All Shop" as an expandable accordion (tap the row to reveal / hide the categories; "Shop everything" opens the full catalog). */
  function shopAccordion() {
    var it = null;
    CONFIG.header.forEach(function (p) { if (!it && p.children && p.children.length) it = p; });
    if (!it) return '';
    var st = state(it.href);
    var items = '<a class="nkn-d-sublink nkn-d-all" href="' + esc(it.href) + '"><span>Shop everything</span>' + ico('arrow') + '</a>' +
      it.children.map(function (c) { return '<a class="nkn-d-sublink" href="' + esc(c.href) + '"><span>' + esc(c.label) + '</span>' + ico('arrow') + '</a>'; }).join('');
    return '<section class="nkn-d-sec nkn-d-shop" style="--i:0" aria-label="' + esc(it.label) + '">' +
      '<button type="button" class="nkn-d-link nkn-d-acc-btn' + activeClass(st) + '" id="nkn-acc-btn" aria-expanded="false" aria-controls="nkn-acc-panel"><span>' + esc(it.label) + '</span>' + ico('chev') + '</button>' +
      '<div class="nkn-acc" id="nkn-acc-panel" role="region" aria-labelledby="nkn-acc-btn"><div class="nkn-acc-in">' + items + '</div></div></section>';
  }

  function buildDrawer() {
    var secs = CONFIG.columns.map(function (sec, i) {
      var links = sec.links.map(function (l) {
        if (l.action === 'ai') {
          return '<button type="button" class="nkn-d-link nkn-d-ai" data-nkn-ai><span>' + esc(l.label) + '</span>' + ico(l.icon || 'sparkle') + '</button>';
        }
        var st = state(l.href);
        return '<a class="nkn-d-link' + activeClass(st) + '" href="' + esc(l.href) + '"' + activeAttrs(st) + '><span>' + esc(l.label) + '</span>' + ico('arrow') + '</a>';
      }).join('');
      return '<section class="nkn-d-sec" style="--i:' + i + '" aria-label="' + esc(sec.title) + '">' +
        '<div class="nkn-d-title">' + ico(sec.icon) + esc(sec.title) + '</div>' + links + '</section>';
    }).join('');

    return '<div class="nkn-overlay" id="mobile-menu-overlay"></div>' +
      '<aside class="nkn-drawer" id="mobile-menu-drawer" role="dialog" aria-modal="true" aria-label="Site navigation" aria-hidden="true">' +
        '<div class="nkn-d-head">' + logoHtml() +
          '<button type="button" class="nkn-d-close" id="close-mobile-menu" aria-label="Close menu">' + ico('close') + '</button>' +
        '</div>' +
        '<nav class="nkn-d-body" aria-label="Site pages">' + shopAccordion() + secs + '</nav>' +
        '<div class="nkn-d-foot"><span>Theme</span>' + themePill('-mobile') + '</div>' +
      '</aside>';
  }

  function legalHtml() {
    return '<nav class="nkn-f-legal" aria-label="Legal and support">' + CONFIG.legal.map(function (l) {
      var st = state(l.href);
      return '<a' + (st ? ' class="is-current"' : '') + ' href="' + esc(fixMail(l.href)) + '"' + activeAttrs(st) + '>' + esc(l.label) + '</a>';
    }).join('') + '</nav>';
  }

  /* Footer wave: three stacked, hand-drawn crests in one 1440 x 120 box. Asymmetric on purpose: high on the left (behind the brand block),
     a long soft dip under the middle link columns, a gentler lift on the right. The front crest is also used (normalised to 0..1) as the clip-path of the
     frosted-glass strip, so the glass follows the exact same curve; the two back crests are translucent gold tints that fade out downward. */
  var WAVE = {
    front: 'M0,40 C90,10 200,2 330,20 C470,40 560,80 740,86 C900,92 1020,70 1130,58 C1260,44 1350,40 1440,56',
    mid:   'M0,32 C100,8 215,2 345,16 C490,32 585,74 760,80 C925,86 1030,62 1145,50 C1270,38 1355,34 1440,48',
    back:  'M0,24 C110,2 230,-2 360,14 C510,34 600,70 780,76 C940,82 1040,56 1160,46 C1280,36 1360,32 1440,42'
  };
  function waveNorm(edge) { var i = 0; return edge.replace(/-?\d+(\.\d+)?/g, function (n) { return (+n / (i++ % 2 ? 120 : 1440)).toFixed(4); }); }
  /* Extends a crest 80 units beyond both ends along its own end tangents (no kink), so a layer can drift sideways without showing its ends. */
  function waveExt(edge) {
    var n = edge.match(/-?\d+(?:\.\d+)?/g).map(Number), L = n.length;
    var yl = n[1] - (n[3] - n[1]) / (n[2] - n[0]) * 80, yr = n[L - 1] + (n[L - 1] - n[L - 3]) / (n[L - 2] - n[L - 4]) * 80;
    return 'M-80,' + yl.toFixed(1) + ' L' + edge.slice(1) + ' L1520,' + yr.toFixed(1);
  }
  function waveGrad(id, v) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" style="stop-color:rgb(var(--nkn-f-gold));stop-opacity:var(' + v + ')"/>' +
      '<stop offset="1" style="stop-color:rgb(var(--nkn-f-gold));stop-opacity:0"/></linearGradient>';
  }
  function waveHtml() {
    var down = ' V120 H-80 Z', back = waveExt(WAVE.back), mid = waveExt(WAVE.mid);
    function layer(cls, grad, v, d, edgeCls) {      /* one animated layer = one <svg>, so transform/opacity animate on the GPU */
      return '<svg class="nkn-f-wave nkn-f-layer ' + cls + '" viewBox="-80 0 1600 120" preserveAspectRatio="none" focusable="false">' +
        '<defs>' + waveGrad(grad, v) + '</defs><path d="' + d + down + '" fill="url(#' + grad + ')"/><path class="nkn-we ' + edgeCls + '" d="' + d + '"/></svg>';
    }
    return '<div class="nkn-f-deco" aria-hidden="true">' +
      '<span class="nkn-f-glow nkn-f-glow-a"></span><span class="nkn-f-glow nkn-f-glow-b"></span>' +
      '<div class="nkn-f-glass-wave"></div><div class="nkn-f-glass"></div>' +
      layer('nkn-f-layer-a', 'nkn-wg-a', '--nkn-wave-a', back, 'nkn-we-a') +
      layer('nkn-f-layer-b', 'nkn-wg-b', '--nkn-wave-b', mid, 'nkn-we-b') +
      '<svg class="nkn-f-wave nkn-f-front" viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false">' +
        '<defs><clipPath id="nkn-wave-clip" clipPathUnits="objectBoundingBox"><path d="' + waveNorm(WAVE.front) + ' V1 H0 Z"/></clipPath></defs>' +
        '<path class="nkn-we nkn-we-f" d="' + WAVE.front + '"/></svg>' +
    '</div>';
  }

  function buildFooterHtml() {
    var cols = CONFIG.columns.map(function (sec, i) {
      var hid = 'nkn-f-h' + i;
      var links = sec.links.map(function (l) {
        if (l.action === 'ai') {
          return '<button type="button" class="nkn-f-link" data-nkn-ai>' + ico(l.icon || 'sparkle') + esc(l.label) + '</button>';
        }
        var st = state(l.href);
        return '<a class="nkn-f-link' + activeClass(st) + '" href="' + esc(fixMail(l.href)) + '"' + activeAttrs(st) + '>' + esc(l.label) + '</a>';
      }).join('');
      return '<nav class="nkn-f-col" aria-labelledby="' + hid + '"><h5 id="' + hid + '">' + esc(sec.title) + '</h5>' + links + '</nav>';
    }).join('');

    return waveHtml() + '<div class="nkn-f-wrap">' +
      '<div class="nkn-f-grid">' +
        '<div class="nkn-f-brand">' + logoHtml() + '<p>' + esc(CONFIG.tagline) + '</p><p class="nkn-f-hours">' + esc(hoursText()) + '</p><p class="nkn-f-hours">' + esc(CONFIG.shipNote) + '</p>' + footerContactHtml() + footerSocialHtml() + '</div>' +
        cols +
      '</div>' +
      '<p class="nkn-f-disclaimer"><strong>Disclaimer:</strong> ' + esc(CONFIG.disclaimer) + '</p>' +
      '<div class="nkn-f-bottom"><span>' + copyrightHtml() + '</span>' + legalHtml() + '</div>' +
    '</div>';
  }

  /* ======================================================================
   * 5. MOUNT  (header synchronous where the <script> tag sits -> no flash of missing header;
   *            footer once the page has been parsed)
   * ====================================================================== */
  function injectStyle() {
    if (document.getElementById('nkn-style')) return;
    var st = document.createElement('style');
    st.id = 'nkn-style';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
    /* brand fonts for the NIKORA wordmark (Playfair Display, Cormorant Garamond as fallback); system serif is used until they load */
    if (!document.getElementById('nkn-fonts')) {
      var fl = document.createElement('link');
      fl.id = 'nkn-fonts'; fl.rel = 'stylesheet';
      fl.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,500&family=Cormorant+Garamond:ital,wght@0,600;1,500&display=swap';
      (document.head || document.documentElement).appendChild(fl);
    }
  }
  /* ----------------------------------------------------------------------
   * 5a. SITE CONTENT  -  announcement bar + promo banner from Firebase /site_content
   *     Painted instantly from the last cached copy, then refreshed from the database
   *     (live listener when the page has the Firebase SDK, plain REST read otherwise).
   * -------------------------------------------------------------------- */
  var SITE = { dbUrl: 'https://nikora-store-default-rtdb.firebaseio.com', cacheKey: 'nikora_site_content_v2', dismissKey: 'nkn_promo_dismissed', refreshMs: 60000 };
  var DEFAULT_EMAIL = 'nikora.support@gmail.com';
  var SITE_DATA = {}, siteSubs = [], siteLastKey = null, pollTimer = null, siteLast = 0;

  function safeLink(v) {                              // https URL, mailto:/tel:, #anchor, /path or page.html. Anything else (javascript:, //host, http:) is dropped
    if (typeof v !== 'string') return '';
    v = v.trim();
    if (!v || v.indexOf('//') === 0) return '';
    return /^(https:\/\/\S+|mailto:[^\s<>"']+|tel:[+\d][\d\s().-]*|#[\w-]*|\/[^\s]*|[\w\-\/]+\.html(\?[^\s#]*)?(#\S*)?)$/i.test(v) ? v : '';
  }
  function safeImg(v) { return (typeof v === 'string' && /^(https?:\/\/[^\s"'<>]+|(?:\.{0,2}\/)?(?!\/)(?![a-z][a-z0-9+.\-]*:)[^\s"'<>\\]+\.(?:png|jpe?g|webp|gif|avif|svg|ico)(?:[?#][^\s"'<>]*)?)$/i.test(v.trim())) ? v.trim() : ''; }   // direct http(s) links or site paths (/images/a.jpg)
  function siteStr(k, max) { var v = SITE_DATA && SITE_DATA[k]; return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, max || 300) : ''; }
  function validEmail(e) { return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(e || ''); }
  function siteEmail(first) {                         // 'footer' or 'contact' decides which saved address wins; the other is the fallback
    var a = siteStr('footer_support_email', 120), b = siteStr('contact_email', 120), e = first === 'contact' ? (b || a) : (a || b);
    return validEmail(e) ? e : DEFAULT_EMAIL;
  }
  function siteEmailCustom() { return siteEmail('footer') !== DEFAULT_EMAIL; }
  function sitePhone(first) {
    var a = siteStr('footer_support_phone', 40), b = siteStr('contact_phone', 40), v = first === 'contact' ? (b || a) : (a || b);
    return /^[+\d][\d\s().-]{4,}$/.test(v) ? v : '';
  }
  function toList(v) {                                // Firebase gives arrays back as arrays or as {0:..,1:..} objects
    if (Array.isArray(v)) return v.filter(function (x) { return x && typeof x === 'object'; });
    if (v && typeof v === 'object') return Object.keys(v).sort(function (a, b) { return Number(a) - Number(b); }).map(function (k) { return v[k]; }).filter(function (x) { return x && typeof x === 'object'; });
    return [];
  }
  function inlineHtml(t) {                            // plain text with [label](link) -> escaped HTML
    t = String(t); var out = '', last = 0, re = /\[([^\]]{1,120})\]\(([^)\s]{1,300})\)/g, m;
    while ((m = re.exec(t))) {
      out += esc(t.slice(last, m.index));
      var u = safeLink(m[2]);
      out += u ? '<a href="' + esc(u) + '"' + (/^https:/i.test(u) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(m[1]) + '</a>' : esc(m[1]);
      last = re.lastIndex;
    }
    return out + esc(t.slice(last));
  }
  function answerHtml(text) {                         // blank line = new paragraph, lines starting "- " = tick list
    var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    return String(text || '').split(/\n\s*\n/).map(function (b) {
      var lines = b.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return '';
      if (lines.every(function (l) { return /^[-\u2022]\s+/.test(l); })) return '<ul>' + lines.map(function (l) { return '<li>' + TICK + inlineHtml(l.replace(/^[-\u2022]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      return '<p>' + lines.map(inlineHtml).join('<br>') + '</p>';
    }).join('');
  }
  function richText(el, text, tag, cls) {             // "Smart care. *Instant* glow." -> accent word + line breaks, built with DOM nodes (no HTML injection)
    el.textContent = '';
    String(text).split(/\r?\n/).forEach(function (line, li) {
      if (li) el.appendChild(document.createElement('br'));
      line.split(/(\*[^*]+\*)/).forEach(function (seg) {
        if (!seg) return;
        if (seg.length > 2 && seg.charAt(0) === '*' && seg.charAt(seg.length - 1) === '*') {
          var n = document.createElement(tag || 'em'); if (cls) n.className = cls; n.textContent = seg.slice(1, -1); el.appendChild(n);
        } else el.appendChild(document.createTextNode(seg));
      });
    });
  }
  function siteCacheGet() { try { return JSON.parse(localStorage.getItem(SITE.cacheKey) || 'null'); } catch (e) { return null; } }
  function siteCacheSet(v) { try { localStorage.setItem(SITE.cacheKey, JSON.stringify(v)); } catch (e) {} }
  function promoDismissed(img) { try { return sessionStorage.getItem(SITE.dismissKey) === img; } catch (e) { return false; } }
  SITE_DATA = (function () { var c = siteCacheGet(); return (c && typeof c === 'object') ? c : {}; })();

  function hexColor(v) { v = (typeof v === 'string') ? v.trim() : ''; return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : ''; }
  function annTime(v) {                               // ISO string or ms -> ms (0 = not set / unreadable)
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string' && v.trim()) { var t = Date.parse(v.trim()); return isNaN(t) ? 0 : t; }
    return 0;
  }
  function annScheduled(c, now) {                     // false before announcement_start and after announcement_end
    var a = annTime(c.announcement_start), b = annTime(c.announcement_end);
    if (a && now < a) return false;
    if (b && now > b) return false;
    return true;
  }
  var ANN_SPEED = { slow: 35, normal: 60, fast: 100 };      // marquee speed in pixels per second
  function sitePick(c) {                              // raw /site_content -> what the bar and banner show ({ ann, annOpt, img, link })
    c = c || {};
    var text = (typeof c.announcement_text === 'string') ? c.announcement_text.trim().slice(0, 300) : '';
    var live = c.announcement_enabled !== false && !!text && annScheduled(c, Date.now());
    return {
      ann:  live ? text : '',
      annOpt: {
        marquee: c.announcement_mode === 'marquee',
        bg: hexColor(c.announcement_bg), color: hexColor(c.announcement_color), link: safeLink(c.announcement_link),
        speed: ANN_SPEED[c.announcement_speed] ? c.announcement_speed : 'normal'
      },
      img:  (c.promo_banner_enabled !== false) ? safeImg(c.promo_banner_image_url) : '',
      link: safeLink(c.promo_banner_link)
    };
  }

  function annSig(sc) { return JSON.stringify([sc.ann, sc.annOpt]); }
  function annItemHtml(sc, tab) {
    var t = esc(sc.ann), l = sc.annOpt.link;
    return l ? '<a href="' + esc(l) + '"' + (/^https:/i.test(l) ? ' target="_blank" rel="noopener"' : '') + (tab === false ? ' tabindex="-1"' : '') + '>' + t + '</a>' : t;
  }
  function annInnerHtml(sc) {                         // static text, or a scrolling ticker (two identical groups = seamless loop)
    if (!sc.ann || !sc.annOpt.marquee) return '<p class="nkn-announce-text" id="nkn-announce-text">' + (sc.ann ? annItemHtml(sc) : '') + '</p>';
    return '<div class="nkn-marq" id="nkn-marq"><div class="nkn-marq-track" id="nkn-marq-track">' +
      '<div class="nkn-marq-group"><span class="nkn-marq-item">' + annItemHtml(sc) + '</span></div>' +
      '<div class="nkn-marq-group" aria-hidden="true"><span class="nkn-marq-item">' + annItemHtml(sc, false) + '</span></div></div></div>' +
      '<button type="button" class="nkn-marq-btn" id="nkn-marq-btn" aria-label="Pause scrolling announcement" aria-pressed="false"><i></i><i></i></button>';
  }
  function annStyle(sc) { return (sc.annOpt.bg ? 'background:' + sc.annOpt.bg + ';' : '') + (sc.annOpt.color ? 'color:' + sc.annOpt.color + ';' : ''); }
  function announceHtml(sc) {
    var marq = !!(sc.ann && sc.annOpt.marquee), st = annStyle(sc);
    return '<div class="nkn-announce' + (marq ? ' nkn-announce-marq' : '') + '" id="nkn-announce" role="region" aria-label="Announcement" data-sig="' + esc(annSig(sc)) + '"' +
      (st ? ' style="' + esc(st) + '"' : '') + (sc.ann ? '' : ' hidden') + '>' + annInnerHtml(sc) + '</div>';
  }
  function fitMarquee() {                             // repeat the message until one group is wider than the bar, then derive the loop time from the speed
    var a = $('nkn-announce'), tr = $('nkn-marq-track'); if (!a || a.hidden || !tr || tr.children.length < 2) return;
    var g1 = tr.children[0], g2 = tr.children[1], first = g1.firstElementChild; if (!first) return;
    var proto = first.cloneNode(true), w1 = first.getBoundingClientRect().width, bar = a.clientWidth; if (!w1 || !bar) return;
    var n = Math.max(1, Math.ceil(bar / w1)), sc = SITE_LAST_PICK, sp = ANN_SPEED[(sc && sc.annOpt.speed) || 'normal'];
    [g1, g2].forEach(function (g, gi) {
      g.innerHTML = '';
      for (var i = 0; i < n; i++) {
        var c = proto.cloneNode(true);
        if (gi || i) { c.setAttribute('aria-hidden', 'true'); Array.prototype.forEach.call(c.querySelectorAll('a'), function (l) { l.tabIndex = -1; }); }
        g.appendChild(c);
      }
    });
    var gw = g1.getBoundingClientRect().width;
    tr.style.setProperty('--nkn-marq-dur', Math.max(8, gw / sp).toFixed(1) + 's');
  }
  var SITE_LAST_PICK = null, marqBound = false;
  function bindMarq() {
    var a = $('nkn-announce'); if (!a || marqBound) return; marqBound = true;
    a.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('#nkn-marq-btn'); if (!b) return;
      var on = a.classList.toggle('is-paused'); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? 'Resume scrolling announcement' : 'Pause scrolling announcement');
    });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fitMarquee, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMarquee);
    window.addEventListener('load', fitMarquee);
  }
  function promoMedia(sc) {
    var img = '<img src="' + esc(sc.img) + '" alt="Promotion" decoding="async">';
    if (!sc.link) return img;
    return '<a href="' + esc(sc.link) + '"' + (/^https:/i.test(sc.link) ? ' target="_blank" rel="noopener"' : '') + '>' + img + '</a>';
  }
  function promoHtml(sc) {
    var show = !!sc.img && !promoDismissed(sc.img);
    return '<section class="nkn-promo" id="nkn-promo" aria-label="Promotion"' + (show ? ' data-key="' + esc(sc.img + '|' + sc.link) + '"' : ' hidden') + '>' +
      '<div class="nkn-promo-media" id="nkn-promo-media">' + (show ? promoMedia(sc) : '') + '</div>' +
      '<button type="button" class="nkn-promo-x" id="nkn-promo-x" aria-label="Dismiss promotion">' + ico('close') + '</button></section>';
  }
  function bindPromo() {                              // a banner image that fails to load is hidden instead of showing a broken icon
    var p = $('nkn-promo'), im = p && p.querySelector('img');
    if (im) im.onerror = function () { p.hidden = true; };
  }
  function applySite(sc) {
    var a = $('nkn-announce'), p = $('nkn-promo'), pm = $('nkn-promo-media');
    SITE_LAST_PICK = sc;
    if (a) {
      var sig = annSig(sc), marq = !!(sc.ann && sc.annOpt.marquee);
      if (a.getAttribute('data-sig') !== sig) {                  // only rebuild when something changed, so the ticker never restarts for no reason
        a.setAttribute('data-sig', sig); a.innerHTML = annInnerHtml(sc); a.classList.remove('is-paused');
      }
      a.style.background = sc.annOpt.bg || ''; a.style.color = sc.annOpt.color || '';
      a.classList.toggle('nkn-announce-marq', marq);
      a.hidden = !sc.ann;
      if (marq) { bindMarq(); fitMarquee(); }
    }
    if (p && pm) {
      var show = !!sc.img && !promoDismissed(sc.img), key = sc.img + '|' + sc.link;
      if (show) {
        if (p.getAttribute('data-key') !== key || !pm.firstChild) { pm.innerHTML = promoMedia(sc); p.setAttribute('data-key', key); bindPromo(); }
        p.hidden = false;
      } else { pm.innerHTML = ''; p.removeAttribute('data-key'); p.hidden = true; }
    }
  }

  /* ---- footer content: copyright, support email / phone, hours, social links ---- */
  var SOCIALS = [
    ['instagram', 'Instagram', '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r=".7"/>'],
    ['tiktok',    'TikTok',    '<path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5"/><path d="M14 3c.3 2.6 2 4.4 5 4.6"/>'],
    ['facebook',  'Facebook',  '<path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>'],
    ['youtube',   'YouTube',   '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z"/>'],
    ['pinterest', 'Pinterest', '<circle cx="12" cy="12" r="9"/><path d="M10.6 20l1.7-7.2"/><path d="M9.3 10.4c.4-2 2.2-3 3.9-2.5 1.6.5 2.2 2.5 1.4 4.2-.8 1.6-2.3 2-3.3 1.2"/>']
  ];
  function fixMail(h) { return /^mailto:/i.test(h) ? 'mailto:' + siteEmail('footer') : h; }
  function hoursText() { return siteStr('contact_hours', 120) || CONFIG.hours; }
  function footerContactHtml() {
    var out = '', ph = sitePhone('footer');
    if (siteEmailCustom()) out += '<a href="mailto:' + esc(siteEmail('footer')) + '">' + esc(siteEmail('footer')) + '</a>';
    if (ph) out += (out ? '<br>' : '') + '<a href="tel:' + esc(ph.replace(/[^\d+]/g, '')) + '">' + esc(ph) + '</a>';
    return out ? '<p class="nkn-f-contact">' + out + '</p>' : '';
  }
  function footerSocialHtml() {
    var links = SOCIALS.map(function (sc) {
      var u = siteStr('footer_social_' + sc[0], 300);
      return /^https:\/\/\S+$/i.test(u) ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer" aria-label="' + sc[1] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + sc[2] + '</svg></a>' : '';
    }).join('');
    return links ? '<div class="nkn-f-social" aria-label="Follow NIKORA">' + links + '</div>' : '';
  }
  function copyrightHtml() { var t = siteStr('footer_copyright', 200); return t ? esc(t) : '&copy; ' + new Date().getFullYear() + ' NIKORA. All rights reserved.'; }
  function applyFooter() {
    var el = document.querySelector('footer.nkn-footer'); if (!el) return;
    var html = buildFooterHtml();
    if (el._nkHtml !== html) { el.innerHTML = html; el._nkHtml = html; }
  }
  function swapMailLinks() {                          // every mailto: link that points at the default support address follows the saved one
    var cur = siteEmail('footer'), list = document.querySelectorAll('a[href^="mailto:"]');
    for (var i = 0; i < list.length; i++) {
      var a = list[i], href = a.getAttribute('href'), em = href.slice(7).split('?')[0], rest = href.slice(7 + em.length);
      if (a.hasAttribute('data-nk-own')) continue;                  /* the page sets this one itself (contact page) */
      if (em.toLowerCase() !== DEFAULT_EMAIL && !a._nkPrev) continue;
      if (a._nkPrev === cur || (!a._nkPrev && cur === DEFAULT_EMAIL)) continue;
      var prev = a._nkPrev || DEFAULT_EMAIL;
      a.setAttribute('href', 'mailto:' + cur + rest);
      if (a.textContent.trim().toLowerCase() === prev.toLowerCase()) a.textContent = cur;
      a._nkPrev = cur;
    }
  }

  /* ---- the shared store: one live copy of /site_content for the whole page ---- */
  function notifySite() {
    var key; try { key = JSON.stringify(SITE_DATA); } catch (e) { key = String(Date.now()); }
    if (key === siteLastKey) return;
    siteLastKey = key;
    siteSubs.slice().forEach(function (fn) { try { fn(SITE_DATA); } catch (err) { if (window.console) console.error('NikoraSite listener failed', err); } });
  }
  function onSiteContent(c) {
    SITE_DATA = (c && typeof c === 'object') ? c : {};
    siteLast = Date.now();
    siteCacheSet(SITE_DATA);
    applySite(sitePick(SITE_DATA));
    applyFooter();
    swapMailLinks();
    notifySite();
  }
  function fetchSite() {                              // one-off read (used when streaming is unavailable)
    if (typeof fetch !== 'function') return;
    fetch(SITE.dbUrl + '/site_content.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (c) { onSiteContent(c || {}); })
      .catch(function (err) { if (window.console) console.warn('NIKORA nav: site content unavailable, keeping the cached or default content.', err); });
  }
  function startPolling() {
    if (pollTimer) return;
    fetchSite();
    pollTimer = setInterval(function () { if (document.visibilityState !== 'hidden') fetchSite(); }, SITE.refreshMs);
  }
  function setAt(root, path, val) {                   // apply a Firebase stream event (path like "/faq_items/2/q") to the local copy
    if (path === '/' || path === '') return (val && typeof val === 'object') ? val : {};
    var seg = path.split('/').filter(Boolean), cur = root, k;
    for (var i = 0; i < seg.length - 1; i++) { k = seg[i]; if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }
    k = seg[seg.length - 1];
    if (val === null || val === undefined) delete cur[k]; else cur[k] = val;
    return root;
  }
  function openStream() {                             // live updates on every page, with or without the Firebase SDK
    if (typeof EventSource !== 'function') return startPolling();
    var es, data = {}, got = false;
    try { es = new EventSource(SITE.dbUrl + '/site_content.json'); } catch (e) { return startPolling(); }
    function fallback() { try { es.close(); } catch (e) {} startPolling(); }
    es.addEventListener('put', function (ev) {
      try { var m = JSON.parse(ev.data); data = setAt(data, m.path, m.data); got = true; onSiteContent(JSON.parse(JSON.stringify(data))); } catch (e) {}
    });
    es.addEventListener('patch', function (ev) {
      try { var m = JSON.parse(ev.data); Object.keys(m.data || {}).forEach(function (k) { data = setAt(data, (m.path === '/' ? '' : m.path) + '/' + k, m.data[k]); }); got = true; onSiteContent(JSON.parse(JSON.stringify(data))); } catch (e) {}
    });
    es.addEventListener('cancel', fallback);
    es.addEventListener('auth_revoked', fallback);
    es.onerror = function () { if (!got) fallback(); };   // never connected (blocked, offline, rules) -> plain reads instead
  }
  function startSite() {
    openStream();
    setInterval(function () { applySite(sitePick(SITE_DATA)); }, 30000);   // the bar switches on/off by itself when announcement_start / announcement_end pass
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { if (SITE_LAST_PICK && SITE_LAST_PICK.annOpt.marquee) { bindMarq(); fitMarquee(); } });
    else if (SITE_LAST_PICK && SITE_LAST_PICK.annOpt.marquee) { bindMarq(); fitMarquee(); }
  }

  window.NikoraSite = {                               // pages subscribe here: NikoraSite.onChange(function (content) { ... })
    get: function () { return SITE_DATA; },
    onChange: function (fn) {
      if (typeof fn !== 'function') return function () {};
      siteSubs.push(fn);
      try { fn(SITE_DATA); } catch (err) { if (window.console) console.error('NikoraSite listener failed', err); }
      return function () { var i = siteSubs.indexOf(fn); if (i >= 0) siteSubs.splice(i, 1); };
    },
    refresh: fetchSite,
    util: { toList: toList, answerHtml: answerHtml, inlineHtml: inlineHtml, rich: richText, safeLink: safeLink, safeImg: safeImg, email: siteEmail, phone: sitePhone, esc: esc }
  };
  var SC0 = sitePick(siteCacheGet());                 // first paint from the last known state, so nothing jumps in later
  SITE_LAST_PICK = SC0;

  var HTML = LOGO_SPRITE + announceHtml(SC0) + buildHeader() + promoHtml(SC0) + buildDrawer();
  var mounted = false;
  /* Apply the saved theme before any markup is inserted, so the logo (and the page) are correct on the very first paint. */
  function bootstrapTheme() {
    if (document.documentElement.hasAttribute('data-theme')) return;
    var saved = ''; try { saved = localStorage.getItem('theme') || ''; } catch (e) {}
    if (saved === 'dark' || saved === 'light') document.documentElement.setAttribute('data-theme', saved);
  }
  /* adaptive favicon (favicon.svg sits next to nav.js) unless the page already declares one */
  function ensureFavicon() {
    if (!document.head || document.querySelector('link[rel~="icon"]')) return;
    var lk = document.createElement('link');
    lk.rel = 'icon'; lk.type = 'image/svg+xml';
    lk.href = (SELF_SRC ? SELF_SRC.replace(/[^\\/?#]*([?#].*)?$/, '') : '') + 'favicon.svg';
    document.head.appendChild(lk);
  }
  function mount() {
    if (mounted) return; mounted = true;
    bootstrapTheme();
    ensureFavicon();
    injectStyle();
    var holder = document.getElementById('nikora-nav');
    var script = document.currentScript;
    if (holder) { holder.outerHTML = HTML; }
    else if (script && script.parentNode && script.parentNode !== document.head) { script.insertAdjacentHTML('beforebegin', HTML); }
    else { document.body.insertAdjacentHTML('afterbegin', HTML); }
    wire();
    loadAnimations();
    loadConsent();
    loadMascot();
    loadTextFx();
    searchConfig();
    if (window.requestIdleCallback) window.requestIdleCallback(function () { loadSearch(); }); else setTimeout(function () { loadSearch(); }, 1500);
    bindPromo();
    startSite();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFooter); else mountFooter();
    loadAssistant();
  }

  function watchFooterMotion(el) {                      /* animations run only while the footer is (nearly) on screen: saves battery and GPU on phones */
    if (el._nkWatch) return; el._nkWatch = true;
    if (!('IntersectionObserver' in window)) { el.classList.add('is-live'); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { el.classList.toggle('is-live', e.isIntersecting); });
    }, { rootMargin: '120px 0px' }).observe(el);
  }
  function mountFooter() {
    if (document.querySelector('footer.nkn-footer')) return;
    var feet = document.querySelectorAll('footer');
    var old = document.querySelector('footer.site') || (feet.length ? feet[feet.length - 1] : null);
    var el = document.createElement('footer');
    el.className = 'nkn-footer';
    el._nkHtml = buildFooterHtml();
    el.innerHTML = el._nkHtml;
    if (old && old.parentNode) {
      if (old.id) el.id = old.id;                              /* keep any in-page anchor (e.g. #track) working */
      old.parentNode.replaceChild(el, old);
    } else {
      document.body.appendChild(el);
    }
    swapMailLinks();
    watchFooterMotion(el);
  }

  /* ======================================================================
   * 6. BEAUTY CONCIERGE LOADER  (ai-assistant.js, same folder as nav.js)
   * ====================================================================== */
  function loadAssistant() {
    if (window.NikoraAssistant) return;
    if (document.getElementById('nkai-loader') || document.querySelector('script[src*="ai-assistant"]')) return;
    var base = SELF_SRC ? SELF_SRC.replace(/[^\\/?#]*([?#].*)?$/, '') : '';
    var el = document.createElement('script');
    el.id = 'nkai-loader'; el.async = true; el.src = base + 'ai-assistant.js';
    (document.head || document.documentElement).appendChild(el);
  }
  /* scroll reveal, radial theme transition, smooth <details> / FAQ: one stand-alone file, loaded from the same folder as nav.js */
  function loadAnimations() {
    if (window.NKAnimations || document.getElementById('nk-anim-loader') || document.querySelector('script[src*="animations.js"]')) return;
    var base = SELF_SRC ? SELF_SRC.replace(/[^\\/?#]*([?#].*)?$/, '') : '';
    var el = document.createElement('script');
    el.id = 'nk-anim-loader'; el.async = true; el.src = base + 'animations.js';
    (document.head || document.documentElement).appendChild(el);
  }
  /* privacy & cookie consent banner + consent-gated Google Analytics 4: consent.js, same folder as nav.js */
  function loadConsent() {
    if (CONFIG.consent === false || window.NikoraConsent || document.getElementById('nk-consent-loader') || document.querySelector('script[src*="consent.js"]')) return;
    var base = SELF_SRC ? SELF_SRC.replace(/[^\\/?#]*([?#].*)?$/, '') : '';
    var el = document.createElement('script');
    el.id = 'nk-consent-loader'; el.async = true; el.src = base + 'consent.js';
    (document.head || document.documentElement).appendChild(el);
  }
  /* the NIKORA Rabbit UI guide (tips, empty states): stand-alone file in the same folder as nav.js */
  function loadMascot() {
    window.NK_MASCOT = window.NK_MASCOT || {};
    if (CONFIG.mascotWidget === false) window.NK_MASCOT.widget = false;
    if (CONFIG.mascotRoam === false && window.NK_MASCOT.roam == null) window.NK_MASCOT.roam = false;
    if (CONFIG.mascotAutoStatic === false && window.NK_MASCOT.autoStatic == null) window.NK_MASCOT.autoStatic = false;
    if (window.NKMascot || document.getElementById('nk-mascot-loader') || document.querySelector('script[src*="mascot.js"]')) return;
    var base = SELF_SRC ? SELF_SRC.replace(/[^\\/?#]*([?#].*)?$/, '') : '';
    var el = document.createElement('script');
    el.id = 'nk-mascot-loader'; el.async = true; el.src = base + 'mascot.js';
    (document.head || document.documentElement).appendChild(el);
  }
  /* folder of nav.js (the stand-alone scripts below live next to it) */
  function baseUrl() { return SELF_SRC ? SELF_SRC.slice(0, SELF_SRC.split('?')[0].split('#')[0].lastIndexOf('/') + 1) : ''; }
  /* Magic UI-style text effects (blur-in, typing): text-animations.js. If the page already has <script src="text-animations.js"> in <head> (recommended: no flash before an effect starts) this does nothing. */
  function loadTextFx() {
    if (window.NikoraText || document.getElementById('nk-textfx-loader') || document.querySelector('script[src*="text-animations"]')) return;
    var el = document.createElement('script');
    el.id = 'nk-textfx-loader'; el.async = true; el.src = baseUrl() + 'text-animations.js';
    (document.head || document.documentElement).appendChild(el);
  }
  /* Smart search: semantic-search.js (UI + ranking) + semantic-worker.js (AI model in a Web Worker). The model is NOT downloaded until the visitor shows intent (hover / focus / click on the search button). */
  function searchConfig() {
    var c = window.NK_SEARCH = window.NK_SEARCH || {};
    if (!c.workerUrl) c.workerUrl = baseUrl() + 'semantic-worker.js';
    if (!c.dbUrl) c.dbUrl = SITE.dbUrl;                 /* same Firebase Realtime DB as /site_content: products are read from /products */
  }
  function loadSearch(done) {
    searchConfig();
    if (window.NikoraSearch) { if (done) done(); return; }
    var el = document.getElementById('nk-search-loader') || document.querySelector('script[src*="semantic-search"]');
    if (!el) {
      el = document.createElement('script');
      el.id = 'nk-search-loader'; el.async = true; el.src = baseUrl() + 'semantic-search.js';
      (document.head || document.documentElement).appendChild(el);
    }
    if (done) el.addEventListener('load', done);
  }
  /* Opens the search overlay; if semantic-search.js is still loading (or not requested yet) it waits for it. */
  window.openSearch = function () {
    if (window.NikoraSearch) { window.NikoraSearch.open(); return; }
    loadSearch(function () { if (window.NikoraSearch) window.NikoraSearch.open(); });
  };
  /* Opens the chat; if the widget is still loading (or not requested yet) it waits for it. */
  window.openAiAssistant = function () {
    if (window.NikoraAssistant) { window.NikoraAssistant.open(); return; }
    loadAssistant();
    var tries = 0, timer = setInterval(function () {
      if (window.NikoraAssistant) { clearInterval(timer); window.NikoraAssistant.open(); }
      else if (++tries > 60) clearInterval(timer);            /* give up after ~6s (e.g. file missing) */
    }, 100);
  };

  /* ======================================================================
   * 7. BEHAVIOUR
   * ====================================================================== */
  function $(id) { return document.getElementById(id); }
  var drawer, overlay, burger, closeBtn, lastFocus = null;

  /* ---- mobile drawer ---- */
  function drawerOpen() { return drawer.classList.contains('active'); }
  function openMenu() {
    if (drawerOpen()) return;                       /* idempotent: safe to call twice */
    lastFocus = document.activeElement;
    drawer.classList.add('active'); overlay.classList.add('active');
    document.documentElement.classList.add('nkn-menu-open');                       /* the mascot widget steps aside while the drawer is open */
    drawer.setAttribute('aria-hidden', 'false'); burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { if (drawerOpen()) closeBtn.focus(); }, 60);
  }
  function closeMenu(skipFocus) {
    if (!drawerOpen()) return;
    drawer.classList.remove('active'); overlay.classList.remove('active');
    document.documentElement.classList.remove('nkn-menu-open');
    drawer.setAttribute('aria-hidden', 'true'); burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    var accP = $('nkn-acc-panel'), accB = $('nkn-acc-btn');                       /* collapse the All Shop accordion so the drawer opens clean next time */
    if (accP) accP.classList.remove('is-open');
    if (accB) accB.setAttribute('aria-expanded', 'false');
    if (skipFocus !== true && lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (err) {} }
  }
  function trapFocus(e) {                           /* keep Tab inside the open drawer */
    if (e.key !== 'Tab' || !drawerOpen()) return;
    var f = drawer.querySelectorAll('a[href],button:not([disabled])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---- theme ---- */
  function themeNow() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function syncTheme() {
    var m = themeNow();
    Array.prototype.forEach.call(document.querySelectorAll('[data-nkn-theme]'), function (b) {
      var on = b.getAttribute('data-nkn-theme') === m;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function applyTheme(mode, origin) {
    function commit() {
      if (typeof window.setTheme === 'function') { window.setTheme(mode); }    /* page's own handler (also stores it) */
      else {
        document.documentElement.setAttribute('data-theme', mode);
        try { localStorage.setItem('theme', mode); } catch (e) {}
      }
      syncTheme();
    }
    /* radial "expanding sphere" transition lives in animations.js; without it the theme simply swaps */
    var A = window.NKAnimations;
    if (origin && mode !== themeNow() && A && typeof A.themeTransition === 'function') A.themeTransition(commit, origin, mode);
    else commit();
  }

  /* ---- cart badge fallback (the page's cart code normally owns it) ---- */
  function badgeFromStorage() {
    var el = $('cart-count'); if (!el || el.getAttribute('data-nkn-set')) return;
    try {
      var c = JSON.parse(localStorage.getItem('nikora_cart') || '[]');
      el.textContent = Array.isArray(c) ? c.reduce(function (n, i) { return n + (Number(i && i.qty) || 0); }, 0) : 0;
    } catch (e) {}
  }

  /* ---- "All Shop" desktop dropdown: opens on hover / keyboard focus, closes on leave (140 ms grace), Escape, resize or when the drawer opens ---- */
  function initMega(nav) {
    var link = nav.querySelector('.nkn-link[data-nkn-sub]');
    var panel = link && document.getElementById(link.getAttribute('data-nkn-sub'));
    if (!link || !panel) return;
    var hdr = document.getElementById('nkn-header'), timer = 0, isOpen = false, mute = false;
    var canHover = window.matchMedia ? window.matchMedia('(hover:hover)').matches : true;
    function place() {
      var n = nav.getBoundingClientRect(), h = hdr ? hdr.getBoundingClientRect() : n;
      panel.style.setProperty('--nkn-sub-pt', Math.max(10, Math.round(h.bottom - n.bottom) + 6) + 'px');   /* transparent bridge from the link down to the card */
      var w = panel.offsetWidth || 310, left = link.offsetLeft + link.offsetWidth / 2 - w / 2;
      var vw = document.documentElement.clientWidth, abs = n.left + left;
      if (abs < 12) left += 12 - abs; else if (abs + w > vw - 12) left -= abs + w - (vw - 12);
      panel.style.left = Math.round(left) + 'px';
    }
    function open() { clearTimeout(timer); if (isOpen) return; place(); isOpen = true; panel.classList.add('is-open'); link.setAttribute('aria-expanded', 'true'); }
    function close() { clearTimeout(timer); if (!isOpen) return; isOpen = false; panel.classList.remove('is-open'); link.setAttribute('aria-expanded', 'false'); }
    function later() { clearTimeout(timer); timer = setTimeout(close, 140); }
    if (canHover) {
      link.addEventListener('mouseenter', open); panel.addEventListener('mouseenter', open);
      link.addEventListener('mouseleave', later); panel.addEventListener('mouseleave', later);
    }
    link.addEventListener('focusin', function () { if (!mute) open(); });
    nav.addEventListener('focusout', function (e) { if (!e.relatedTarget || !(link.contains(e.relatedTarget) || panel.contains(e.relatedTarget))) later(); });
    link.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(); var f = panel.querySelector('a'); if (f) f.focus(); }
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      var items = Array.prototype.slice.call(panel.querySelectorAll('a')), i = items.indexOf(document.activeElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) { mute = true; close(); link.focus(); mute = false; } });
    panel.addEventListener('click', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, { passive: true });
  }

  function wire() {
    drawer = $('mobile-menu-drawer'); overlay = $('mobile-menu-overlay'); burger = $('mobile-menu-btn'); closeBtn = $('close-mobile-menu');

    burger.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', function () { closeMenu(); });
    overlay.addEventListener('click', function () { closeMenu(); });
    drawer.addEventListener('click', function (e) {
      var t = e.target; if (!t || !t.closest) return;
      if (t.closest('[data-nkn-ai]')) return;                                 /* handled by the global AI handler below */
      if (t.closest('a[href]')) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawerOpen()) closeMenu();
      trapFocus(e);
    });
    var wide = window.matchMedia ? window.matchMedia('(min-width:' + BP + 'px)') : null;
    if (wide) {
      var onWide = function (e) { if (e.matches) closeMenu(true); };
      if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
    }

    document.addEventListener('click', function (e) {
      var t = e.target; if (!t || !t.closest) return;
      var th = t.closest('[data-nkn-theme]'); if (th) { applyTheme(th.getAttribute('data-nkn-theme'), th); return; }
      if (t.closest('#nkn-promo-x')) {
        var pr = $('nkn-promo'), key = pr && pr.getAttribute('data-key');
        try { if (key) sessionStorage.setItem(SITE.dismissKey, key.split('|')[0]); } catch (er) {}
        if (pr) pr.hidden = true;
        return;
      }
      if (t.closest('[data-nk-search-open]')) { if (!window.NikoraSearch) window.openSearch(); return; }   /* once semantic-search.js is loaded it opens the overlay itself */
      if (t.closest('#open-cart-btn')) { if (typeof window.openCart === 'function') window.openCart(); return; }
      if (t.closest('[data-nkn-ai]')) { closeMenu(true); window.openAiAssistant(); return; }
      var logo = t.closest('#nkn-logo');                                       /* on the home page the logo scrolls to the top */
      if (logo && CURRENT === 'index.html' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });

    if (!document.documentElement.hasAttribute('data-theme')) {                /* pages without their own theme bootstrap */
      var saved = ''; try { saved = localStorage.getItem('theme') || ''; } catch (e) {}
      if (saved === 'dark' || saved === 'light') document.documentElement.setAttribute('data-theme', saved);
    }
    syncTheme();
    if (window.MutationObserver) new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    badgeFromStorage();
    window.addEventListener('storage', badgeFromStorage);

    var hdr = document.getElementById('nkn-header'), ticking = false;           /* floating header: stronger glass once the page scrolls */
    function paintScroll() { ticking = false; if (hdr) hdr.classList.toggle('is-scrolled', (window.pageYOffset || document.documentElement.scrollTop || 0) > 8); }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(paintScroll); } }, { passive: true });
    paintScroll();

    var pNav = document.querySelector('#nkn-header .nkn-primary'), pInd = pNav && pNav.querySelector('.nkn-ind');
    if (pNav && pInd) indicatorApi = initIndicator(pNav, pInd);
    if (pNav) initMega(pNav);
    var accBtn = $('nkn-acc-btn'), accPanel = $('nkn-acc-panel');                /* mobile drawer: All Shop accordion */
    if (accBtn && accPanel) accBtn.addEventListener('click', function () {
      var on = accPanel.classList.toggle('is-open');
      accBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }

  /* ======================================================================
   * 7b. LIQUID BELL-CURVE INDICATOR
   * An SVG hill melted into the header's bottom edge, centred under the current page's link; it previews the hovered / focused link.
   * Position comes from the link itself (offsetLeft + offsetWidth / 2 inside .nkn-primary), so it is exact for any label, font or breakpoint, and it only
   * travels along the links wrapper (Home .. Contact).
   * Moving: the hill stretches into a low, wide liquid ripple that leans the way it travels (scaleY ~.3, much wider, slight skewX), then contracts back into the
   * soft bell on the target link with cubic-bezier(.68,-.55,.26,1.55).
   * ====================================================================== */
  var SPRING = 'cubic-bezier(.68,-.55,.26,1.55)';
  var BELL_W = 60;                                       /* resting width of the bell incl. its flared base, px */
  var BELL_PAD = 34;                                     /* the clipping strip reaches this far past the wrapper so the flared tails and glow are not cut at Home / Contact */
  var BELL_PATH = 'M0,16 C17,16 25,14.4 32,8.8 C38.5,3.6 43,0 50,0 C57,0 61.5,3.6 68,8.8 C75,14.4 83,16 100,16 Z';   /* bell: horizontal tangent at both base ends, crest at the centre */
  var BELL_SVG = '<svg viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>' +
    '<linearGradient id="nkn-bell-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4DCA8"/><stop offset=".45" stop-color="#C89B54"/><stop offset="1" stop-color="#C89B54" stop-opacity=".9"/></linearGradient>' +
    '<linearGradient id="nkn-bell-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff" stop-opacity=".85"/><stop offset=".5" stop-color="#fff"/><stop offset=".8" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<mask id="nkn-bell-m" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="16"><rect width="100" height="16" fill="url(#nkn-bell-h)"/></mask></defs>' +
    '<path d="' + BELL_PATH + '" fill="url(#nkn-bell-v)" mask="url(#nkn-bell-m)"/></svg>';   /* the mask fades the flared tails to nothing, so the base melts into the edge */
  var indicatorApi = null;

  function initIndicator(nav, ind) {
    var track = ind.parentNode, hdr = document.getElementById('nkn-header');
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var canAnimate = typeof ind.animate === 'function';
    var anim = null, placed = false, hovered = null, raf = 0;
    ind.insertAdjacentHTML('afterbegin', BELL_SVG);
    track.style.left = track.style.right = (-BELL_PAD) + 'px';
    ind.style.left = BELL_PAD + 'px';                    /* so translateX(x) is measured from the wrapper's left edge */

    function tf(x, sy, sk) { return 'translateX(' + x + 'px) scaleY(' + sy + ') skewX(' + (sk || 0) + 'deg)'; }
    function currentLink() { return nav.querySelector('.nkn-link[aria-current="page"]') || nav.querySelector('.nkn-link.is-current'); }
    function domeFor(link) {                             /* the bell's crest is centred exactly on the link's centre */
      return { x: link.offsetLeft + link.offsetWidth / 2 - BELL_W / 2, w: BELL_W };
    }
    function layout() {                                  /* put the strip on the header's bottom edge, whatever the header / nav heights are */
      if (hdr) track.style.bottom = (-(hdr.getBoundingClientRect().bottom - nav.getBoundingClientRect().bottom)) + 'px';
    }
    function where() {                                   /* the dome as it is drawn right now (also mid-animation) */
      try {
        var cs = getComputedStyle(ind), m = cs.transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(cs.transform);
        return { x: m.m41, w: parseFloat(cs.width) || 0 };
      } catch (e) {
        var r = ind.getBoundingClientRect(), n = nav.getBoundingClientRect();
        return { x: r.left - n.left - BELL_PAD, w: r.width };
      }
    }
    function stop() { if (anim) { anim.cancel(); anim = null; } }
    function put(t) { ind.style.transform = tf(t.x, 1, 0); ind.style.width = t.w + 'px'; }
    function hide() { stop(); placed = false; ind.classList.remove('is-on', 'is-fx'); }

    function moveTo(link, animate) {
      if (!link || !nav.offsetWidth) { hide(); return; }          /* no active link, or the bar is collapsed into the burger */
      layout();
      var t = domeFor(link);
      if (!placed || !animate || reduce.matches) {
        stop(); put(t); placed = true; ind.classList.add('is-on');
        if (!canAnimate) window.requestAnimationFrame(function () { ind.classList.add('is-fx'); });
        return;
      }
      var f = where();
      if (Math.abs(f.x - t.x) < .5 && Math.abs(f.w - t.w) < .5) return;
      if (!canAnimate) { put(t); return; }                          /* CSS spring fallback (.is-fx) */
      stop();
      put(t);                                                       /* final state is already in place, so the animation needs no fill */
      /* Mid-flight shape: a low liquid ripple. Wider than the bell by 90% of the distance (max 120px), centred 45% of the way to the target,
         kept within the links wrapper (+ the tail margin), squashed to 30% height and leaning (skewX) in the direction of travel. */
      var span = nav.offsetWidth, dist = Math.abs(t.x - f.x), dir = t.x >= f.x ? 1 : -1;
      var sw = Math.min(span + BELL_PAD, Math.max(f.w, t.w) + Math.min(dist * 0.9, 120));
      var mc = (f.x + f.w / 2) + ((t.x + t.w / 2) - (f.x + f.w / 2)) * 0.45;
      var left = Math.max(-BELL_PAD, Math.min(span + BELL_PAD - sw, mc - sw / 2));
      var dur = Math.round(Math.min(760, 440 + dist * 1.1));
      anim = ind.animate([
        { transform: tf(f.x, 1, 0),            width: f.w + 'px', easing: 'cubic-bezier(.4,0,.2,1)' },     /* flatten + stretch into a ripple */
        { transform: tf(left, .3, dir * 10),   width: sw + 'px',  easing: SPRING, offset: .38 },           /* contract back into the bell */
        { transform: tf(t.x, 1, 0),            width: t.w + 'px' }
      ], { duration: dur });
      var mine = anim;
      mine.onfinish = mine.oncancel = function () { if (anim === mine) anim = null; };
    }

    function target() { return hovered || currentLink(); }
    function sync(animate) { moveTo(target(), animate); }

    nav.addEventListener('mouseover', function (e) { var a = e.target.closest && e.target.closest('.nkn-link'); if (a && nav.contains(a)) { hovered = a; sync(true); } });
    nav.addEventListener('mouseleave', function () { hovered = null; sync(true); });
    nav.addEventListener('focusin',  function (e) { var a = e.target.closest && e.target.closest('.nkn-link'); if (a) { hovered = a; sync(true); } });
    nav.addEventListener('focusout', function (e) { if (!e.relatedTarget || !nav.contains(e.relatedTarget)) { hovered = null; sync(true); } });

    function later() { if (!raf) raf = window.requestAnimationFrame(function () { raf = 0; sync(false); }); }
    if (window.ResizeObserver) { var ro = new ResizeObserver(later); ro.observe(nav); if (hdr) ro.observe(hdr); }   /* breakpoints, font loading, label / header height changes */
    window.addEventListener('resize', later);
    window.addEventListener('load', later);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);

    /* route change without a page load (back/forward, hash links, or NikoraNav.setRoute()): re-evaluate which link is current */
    function reflectRoute() {
      CURRENT = fileOf(location.pathname);
      Array.prototype.forEach.call(nav.querySelectorAll('.nkn-link'), function (a) {
        var st = state(a.getAttribute('href'));
        a.classList.toggle('is-current', !!st);
        if (st === 'page') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      sync(true);
    }
    window.addEventListener('popstate', reflectRoute);
    window.addEventListener('hashchange', reflectRoute);

    sync(false);                                                  /* first paint: placed directly, no flight from the left edge */
    return { sync: sync, reflectRoute: reflectRoute };
  }

  /* ======================================================================
   * 8. PUBLIC API
   * ====================================================================== */
  window.NikoraNav = { openMenu: openMenu, closeMenu: closeMenu, config: CONFIG, refreshSiteContent: fetchSite,
    refreshIndicator: function () { if (indicatorApi) indicatorApi.sync(true); },
    setRoute: function () { if (indicatorApi) indicatorApi.reflectRoute(); } };
  /* legacy global names used by older page code (pages' own definitions may delegate to these) */
  if (typeof window.openMobileMenu !== 'function')  window.openMobileMenu = openMenu;
  if (typeof window.closeMobileMenu !== 'function') window.closeMobileMenu = closeMenu;

  if (document.body || document.currentScript) { mount(); }
  else { document.addEventListener('DOMContentLoaded', mount); }
})()

/* ======================================================================
 * NIKORA SETTINGS CONNECTOR (managed from the admin "Site Settings & CMS" theme editor)
 * Applies, for every visitor on every page, the values saved in Firebase /site_content:
 *   theme_heading_font, theme_body_font, theme_accent, theme_radius  -> fonts, accent color, button shape
 *   header_nav [{href,label,hidden}]                                  -> header / mobile menu link labels + visibility
 *   home_sections [{key,hidden,title,subtitle}]                       -> homepage section visibility / headings
 * Re-applies on every NikoraSite change and whenever the header re-renders. With ?nk_preview=1 inside the admin
 * iframe it also enables click-to-edit (works across ports / domains: the admin talks to it with postMessage only).
 * The iframe is recognised by ?nk_preview=1 OR by its window name "nkPreviewFrame". Keep in sync with nkConnector() in the admin file.
 * ====================================================================== */
(function () {
var nkConnector = function(){
  if(window.__nkConnV >= 3) return; window.__nkConnV = 3; window.__nkConn = true;
  var FRAMED = false; try { FRAMED = window.parent !== window; } catch(e){ FRAMED = true; }
  /* the admin names its preview iframe "nkPreviewFrame": that name survives redirects (clean URLs strip ?nk_preview=1) and other ports / domains */
  if(FRAMED && /[?&]nk_preview=1/.test(location.search)){ try { window.name = 'nkPreviewFrame'; } catch(e){} }
  var PREV = FRAMED && (/[?&]nk_preview=1/.test(location.search) || window.name === 'nkPreviewFrame'), draft = {}, MAP = [], busy = false;
  var FONTS = ['Playfair Display','Cormorant Garamond','DM Serif Display','Lora','Fraunces','Inter','DM Sans','Manrope','Poppins','Nunito Sans'];
  function q(s){ try { return document.querySelector(s); } catch(e){ return null; } }
  function qa(s){ try { return Array.prototype.slice.call(document.querySelectorAll(s)); } catch(e){ return []; } }
  function post(m){ try { window.parent.postMessage(m, '*'); } catch(e){} }
  function content(){ var c = {}, o = {}, k; try { if(window.NikoraSite) c = window.NikoraSite.get() || {}; } catch(e){} for(k in c) o[k] = c[k]; for(k in draft) o[k] = draft[k]; return o; }
  function setTitle(el, v){
    el.textContent = '';
    String(v).split(/\r?\n/).forEach(function(line, i){
      if(i) el.appendChild(document.createElement('br'));
      line.split(/(\*[^*]+\*)/).forEach(function(s){ if(!s) return;
        if(s.length > 2 && s.charAt(0) === '*' && s.charAt(s.length - 1) === '*'){ var sp = document.createElement('span'); sp.className = 'accent'; sp.textContent = s.slice(1, -1); el.appendChild(sp); }
        else el.appendChild(document.createTextNode(s)); });
    });
  }
  function hex(v){ return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v || '') ? v : ''; }
  function rgb(h){ h = h.slice(1); if(h.length === 3) h = h.replace(/./g, '$&$&'); return parseInt(h.slice(0,2),16) + ',' + parseInt(h.slice(2,4),16) + ',' + parseInt(h.slice(4,6),16); }
  function applyTheme(c){
    var hf = FONTS.indexOf(c.theme_heading_font) >= 0 ? c.theme_heading_font : '', bf = FONTS.indexOf(c.theme_body_font) >= 0 ? c.theme_body_font : '',
        ac = hex(c.theme_accent), rd = /^\d{1,3}$/.test(String(c.theme_radius == null ? '' : c.theme_radius)) ? String(c.theme_radius) : '', css = '';
    if(ac) css += ':root,:root[data-theme]{--gold:' + ac + ';--gold-rgb:' + rgb(ac) + ';--nkn-gold:' + ac + ';}';
    if(hf) css += 'h1,h2,h3,.hero-title,.section-head h2{font-family:"' + hf + '",Georgia,serif!important}';
    if(bf) css += 'body,button,input,select,textarea{font-family:"' + bf + '",system-ui,sans-serif}';
    if(rd !== '') css += '.btn-primary,.btn-ghost,.add-to-cart{border-radius:' + rd + 'px!important}';
    var st = q('#nk-theme'); if(!st){ st = document.createElement('style'); st.id = 'nk-theme'; document.head.appendChild(st); }
    if(st.textContent !== css) st.textContent = css;
    var need = [hf, bf].filter(function(f, i, a){ return f && a.indexOf(f) === i; }), lk = q('#nk-theme-fonts');
    if(need.length){
      var href = 'https://fonts.googleapis.com/css2?' + need.map(function(f){ return 'family=' + f.replace(/ /g, '+') + (f === 'DM Serif Display' ? '' : ':wght@400;600'); }).join('&') + '&display=swap';
      if(!lk){ lk = document.createElement('link'); lk.id = 'nk-theme-fonts'; lk.rel = 'stylesheet'; document.head.appendChild(lk); } if(lk.getAttribute('href') !== href) lk.setAttribute('href', href);
    } else if(lk) lk.remove();
  }
  function navText(a){ var t = a.querySelector('span') || a; return t.children.length ? null : t; }
  function applyNav(list){
    if(!Array.isArray(list)) return;
    list.forEach(function(it){ if(!it || !it.href) return;
      qa('.nkn-header a[href], .nkn-drawer a[href]').forEach(function(a){
        if(a.getAttribute('href') !== it.href) return;
        var host = a.closest('li') || a, t = navText(a); host.style.display = it.hidden ? 'none' : '';
        if(t){ if(t.dataset.nkO == null) t.dataset.nkO = t.textContent; var want = (!it.hidden && it.label) ? it.label : t.dataset.nkO; if(t.textContent !== want) t.textContent = want; }
      }); });
  }
  function secEls(){ return qa('main > section, body > section').filter(function(s){ return !/nkn-/.test(s.className + ' ' + s.id); }); }
  function secKey(s, i){ return s.id || ('section-' + (i + 1)); }
  function applyText(el, v){ if(!el) return; if(el.dataset.nkO == null) el.dataset.nkO = el.innerHTML;
    if(v){ if(el.dataset.nkT !== v){ setTitle(el, v); el.dataset.nkT = v; } } else if(el.dataset.nkT){ el.innerHTML = el.dataset.nkO; delete el.dataset.nkT; } }
  function applySections(list){
    if(!Array.isArray(list) || !/\/(index(\.html)?)?$/.test(location.pathname)) return;
    var els = secEls();
    list.forEach(function(it){ els.forEach(function(s, i){
      if(secKey(s, i) !== it.key) return; s.style.display = it.hidden ? 'none' : '';
      if(s.querySelector('#hero-title')) return;
      applyText(s.querySelector('h2, h1'), it.title); applyText(s.querySelector('.section-head p, p'), it.subtitle);
    }); });
  }
  function annLive(){
    var c = content(), on = c.announcement_enabled !== false && !!c.announcement_text, el = q('#nkn-announce');
    if(!el){ if(!on) return; el = document.createElement('div'); el.id = 'nkn-announce'; el.className = 'nkn-announce'; el.innerHTML = '<p class="nkn-announce-text"></p>'; document.body.insertBefore(el, document.body.firstChild); }
    el.hidden = !on;
    var tx = el.querySelector('.nkn-announce-text'); if(tx) tx.textContent = c.announcement_text || ''; else qa('#nkn-announce .nkn-marq-track > *').forEach(function(n){ n.textContent = c.announcement_text || ''; });
    el.style.background = hex(c.announcement_bg); el.style.color = hex(c.announcement_color);
  }
  var LIVE = {
    hero_title: function(v){ applyText(q('#hero-title'), v); },
    hero_subtitle: function(v){ applyText(q('#hero-sub'), v); },
    hero_primary_btn_text: function(v){ applyText(q('#hero-cta-primary-text'), v); },
    hero_secondary_btn_text: function(v){ applyText(q('#hero-cta-secondary-text'), v); },
    hero_image_url: function(v){ var e = q('#hero-image'); if(!e) return; if(e.dataset.nkS == null) e.dataset.nkS = e.getAttribute('src') || ''; if(!v) e.setAttribute('src', e.dataset.nkS); else if(!/^(javascript|data|vbscript):/i.test(v)) e.src = v; },
    footer_copyright: function(v){ applyText(q('.nkn-f-bottom span'), v); }
  };
  /* generic live sync for every other field that has a mapped element (page titles, intro text, contact e-mail / phone, banner images) */
  function liveText(key, v){
    MAP.forEach(function(m){
      if(m[2] !== key || m[0] === 'SECTION') return; var el = q(m[0]); if(!el) return;
      if(/_image_url$/.test(key)){
        var im = el.tagName === 'IMG' ? el : el.querySelector('img'); if(!im) return;
        if(im.dataset.nkS == null) im.dataset.nkS = im.getAttribute('src') || '';
        if(!v) im.setAttribute('src', im.dataset.nkS); else if(!/^(javascript|data|vbscript):/i.test(v)) im.src = v;
      } else if(/^(faq|science|contact)_(title|subtitle)$/.test(key)){ applyText(el, v); }
      else if(/^contact_(email|phone)$/.test(key) && el.tagName === 'A'){
        if(el.dataset.nkO == null){ el.dataset.nkO = el.textContent; el.dataset.nkH = el.getAttribute('href') || ''; }
        el.textContent = v || el.dataset.nkO; el.setAttribute('href', v ? (key === 'contact_email' ? 'mailto:' : 'tel:') + v.replace(/\s+/g, '') : el.dataset.nkH);
      }
    });
  }
  function liveKey(key, v){
    try { if(LIVE[key]) LIVE[key](v); else liveText(key, v); if(/^announcement_/.test(key)) annLive(); if(/^theme_/.test(key)) applyAll(); } catch(e){}
  }
  function applyAll(){
    if(busy) return; busy = true;
    try { var c = content(); applyTheme(c); applyNav(c.header_nav); applySections(c.home_sections); } catch(e){}
    busy = false;
  }
  function scan(){
    var seen = {}, nav = [];
    qa('.nkn-header a.nkn-d-link[href], .nkn-header nav a[href]').forEach(function(a){ var h = a.getAttribute('href'), t = navText(a);
      if(!h || seen[h] || !t) return; seen[h] = 1; nav.push({ href: h, label: (t.dataset.nkO != null ? t.dataset.nkO : t.textContent).trim() }); });
    var secs = secEls().map(function(s, i){ var h = s.querySelector('h2, h1'), ho = h && h.dataset.nkO != null ? h.dataset.nkO : (h ? h.innerHTML : '');
      var d = document.createElement('div'); d.innerHTML = ho; return { key: secKey(s, i), title: (d.textContent || '').trim().slice(0, 80), hero: !!s.querySelector('#hero-title'), hidden: s.style.display === 'none' }; });
    return { type: 'nk:scan', path: location.pathname, nav: nav, sections: secs };
  }
  function hit1(t, m){
    var el = null, key = ''; if(!t || t.nodeType !== 1 || t.id === 'nk-tip') return null;
    if(m[0] === 'SECTION'){ var all = secEls(); for(var j = 0; j < all.length; j++) if(all[j].contains(t)){ el = all[j]; key = secKey(el, j); } }
    else { try { el = t.closest(m[0]); } catch(e){} }
    if(!el) return null; var a = el.closest && el.closest('a');
    return { el: el, pane: m[1], field: m[2], label: m[3] || m[2], key: key, href: a ? a.getAttribute('href') : '' };
  }
  function hit(t){ for(var i = 0; i < MAP.length; i++){ var h = hit1(t, MAP[i]); if(h){ h.idx = i; return h; } } return null; }
  /* the element under the pointer first; when a transparent overlay (gradient, slider layer) covers it, look through everything stacked at that point */
  function hitAt(e){
    var best = hit(e.target);   /* most specific wins: a title under an overlay beats the whole hero the overlay belongs to */
    try { if(typeof e.clientX === 'number' && document.elementsFromPoint){ var st = document.elementsFromPoint(e.clientX, e.clientY); for(var i = 0; i < st.length; i++){ if(st[i] === e.target) continue; var h = hit(st[i]); if(h && (!best || h.idx < best.idx)) best = h; } } } catch(x){}
    return best;
  }
  function arm(){
    var st = document.createElement('style');
    st.textContent = '.nk-h{outline:2px solid #C89B54!important;outline-offset:2px!important;cursor:pointer!important}.nk-sel{outline:2px solid #5fbf8f!important;outline-offset:2px!important}#nk-tip{position:fixed;z-index:2147483647;background:#C89B54;color:#17120a;font:600 11px/1 Inter,system-ui,sans-serif;padding:5px 8px;border-radius:6px;pointer-events:none;letter-spacing:.04em}';
    document.head.appendChild(st);
    var tip = document.createElement('div'); tip.id = 'nk-tip'; tip.style.display = 'none'; document.body.appendChild(tip); var cur = null, ON = true, raf = 0, lastEv = null;
    function clear(){ if(cur) cur.classList.remove('nk-h'); cur = null; tip.style.display = 'none'; }
    function hover(){
      raf = 0; if(!ON || !lastEv) return; var h = hitAt(lastEv), el = h ? h.el : null;
      if(el === cur){ if(cur){ var r0 = cur.getBoundingClientRect(); tip.style.left = Math.max(4, r0.left) + 'px'; tip.style.top = Math.max(4, r0.top - 24) + 'px'; } return; }
      if(cur) cur.classList.remove('nk-h'); cur = el;
      if(cur){ cur.classList.add('nk-h'); var r = cur.getBoundingClientRect(); tip.textContent = h.label; tip.style.display = 'block'; tip.style.left = Math.max(4, r.left) + 'px'; tip.style.top = Math.max(4, r.top - 24) + 'px'; } else tip.style.display = 'none';
    }
    document.addEventListener('mousemove', function(e){ if(!ON) return; lastEv = { target: e.target, clientX: e.clientX, clientY: e.clientY }; if(!raf) raf = (window.requestAnimationFrame || setTimeout)(hover, 16); }, true);
    document.addEventListener('mouseleave', clear, true);
    document.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[href]');
      if(!ON){ if(a){ e.preventDefault(); e.stopPropagation(); post({ type: 'nk:go', href: a.getAttribute('href') }); } return; }
      var h = hitAt(e);
      if(h){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); qa('.nk-sel').forEach(function(n){ n.classList.remove('nk-sel'); }); h.el.classList.add('nk-sel'); post({ type: 'nk:edit', pane: h.pane, field: h.field, key: h.key, href: h.href }); return; }
      if(a){ e.preventDefault(); e.stopPropagation(); post({ type: 'nk:go', href: a.getAttribute('href') }); }
    }, true);
    document.addEventListener('submit', function(e){ e.preventDefault(); }, true);
    window.addEventListener('message', function(e){
      if(e.source !== window.parent) return; var m = e.data; if(!m || typeof m !== 'object' || String(m.type).indexOf('nk:') !== 0) return;
      if(m.type === 'nk:ping'){ post({ type: 'nk:ready', v: 3 }); }
      else if(m.type === 'nk:init'){
        MAP = m.map || []; draft = m.draft || {}; ON = m.inspect !== false; if(!ON) clear();
        applyAll(); annLive(); Object.keys(draft).forEach(function(k){ liveKey(k, draft[k]); });
        post({ type: 'nk:ack', v: 3, areas: MAP.length });
        setTimeout(function(){ post(scan()); }, 150); setTimeout(function(){ post(scan()); }, 1500);
      }
      else if(m.type === 'nk:mode'){ ON = !!m.on; if(!ON){ clear(); qa('.nk-sel').forEach(function(n){ n.classList.remove('nk-sel'); }); } }
      else if(m.type === 'nk:field'){ draft[m.key] = m.value; liveKey(m.key, m.value); }
      else if(m.type === 'nk:nav'){ draft.header_nav = m.value; applyAll(); }
      else if(m.type === 'nk:sections'){ draft.home_sections = m.value; applyAll(); }
      else if(m.type === 'nk:scan'){ post(scan()); }
    });
    post({ type: 'nk:ready', v: 3 });
    window.addEventListener('load', function(){ post({ type: 'nk:ready', v: 3 }); });
  }
  /* real visitors: apply saved settings, and keep them applied when nav.js re-renders the header */
  var tries = 0, iv = setInterval(function(){
    if(window.NikoraSite || ++tries > 50){ clearInterval(iv); try { if(window.NikoraSite && window.NikoraSite.onChange) window.NikoraSite.onChange(applyAll); } catch(e){} applyAll(); }
  }, 100);
  var t0; try { new MutationObserver(function(){ clearTimeout(t0); t0 = setTimeout(applyAll, 250); }).observe(document.documentElement, { childList: true, subtree: true }); } catch(e){}
  if(PREV){ if(document.body) arm(); else document.addEventListener('DOMContentLoaded', arm); }
};
  nkConnector();
})();

/* ==========================================================================================================
 * NIKORA dropdown polish (nav.js, every page)
 * Every native <select> on the store pages (Reviews "Sort by", contact / returns form menus, product page menus ...) is replaced by the same
 * rounded, gold-bordered, properly padded dropdown the catalog's Sort menu uses, instead of the browser's own popup (white, unpadded, broken in dark mode).
 * The original <select> stays in the page (visually hidden), so form submission, `required`, .value, and every page script that listens
 * for `change` keep working unchanged. Opt out with  <select data-nk-native>.  The catalog's own custom sort (.nk-sort) is left alone.
 * Keyboard: Enter / Space / arrows open and move, Home / End, Esc closes, typing jumps to a matching option.
 * ========================================================================================================== */
(function () {
  'use strict';
  if (window.__nkDropdowns) return; window.__nkDropdowns = true;
  var G = 'var(--gold-rgb,200,155,84)';
  var CSS = [
    '.nk-dd{position:relative;display:inline-block;flex:none;max-width:100%;vertical-align:middle;--dd-bg:#14111A;--dd-hover:rgba(' + G + ',.14)}',
    '[data-theme="light"] .nk-dd{--dd-bg:#FFFDF9}',
    '.nk-dd-btn{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:10px 14px 10px 16px;border-radius:100px;border:1px solid var(--line,rgba(128,128,128,.3));background:var(--surface-tint,rgba(255,255,255,.06));color:var(--text,inherit);font-family:inherit;font-size:13px;font-weight:500;line-height:1.3;cursor:pointer;text-align:left;transition:border-color .2s ease,background .2s ease,box-shadow .2s ease}',
    '.nk-dd-btn:hover,.nk-dd.is-open .nk-dd-btn{border-color:rgba(' + G + ',.75)}',
    '.nk-dd-btn:focus-visible{outline:none;border-color:rgba(' + G + ',.85);box-shadow:0 0 0 3px rgba(' + G + ',.2)}',
    '.nk-dd.is-open .nk-dd-btn{box-shadow:0 0 0 3px rgba(' + G + ',.14)}',
    '.nk-dd.is-disabled .nk-dd-btn{opacity:.5;cursor:not-allowed}',
    '.nk-dd-label{flex:none;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-faint,#8a8493)}',
    '.nk-dd-value{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.nk-dd-chev{width:14px;height:14px;flex:none;stroke:var(--gold,#C89B54);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s cubic-bezier(.2,.8,.2,1)}',
    '.nk-dd.is-open .nk-dd-chev{transform:rotate(180deg)}',
    '.nk-dd-list{position:absolute;left:0;top:calc(100% + 8px);z-index:2147483000;min-width:100%;width:max-content;max-width:min(320px,86vw);max-height:min(320px,60vh);overflow-y:auto;margin:0;padding:6px;list-style:none;border-radius:16px;outline:none;background:var(--dd-bg);border:1px solid rgba(' + G + ',.45);box-shadow:0 22px 50px -18px rgba(0,0,0,.55);transform-origin:top left;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-6px) scale(.97);transition:opacity .18s ease,transform .22s cubic-bezier(.2,.8,.2,1),visibility 0s linear .22s;scrollbar-width:thin;scrollbar-color:rgba(' + G + ',.5) transparent}',
    '.nk-dd--right .nk-dd-list{left:auto;right:0;transform-origin:top right}',
    '.nk-dd--up .nk-dd-list{top:auto;bottom:calc(100% + 8px);transform-origin:bottom left}',
    '.nk-dd--up.nk-dd--right .nk-dd-list{transform-origin:bottom right}',
    '.nk-dd.is-open .nk-dd-list{opacity:1;visibility:visible;pointer-events:auto;transform:none;transition-delay:0s}',
    '.nk-dd-list::-webkit-scrollbar{width:6px}.nk-dd-list::-webkit-scrollbar-thumb{background:rgba(' + G + ',.45);border-radius:100px}',
    '.nk-dd-opt{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:500;color:var(--text-soft,#8a8493);cursor:pointer;white-space:nowrap;transition:background .15s ease,color .15s ease}',
    '.nk-dd-opt:hover,.nk-dd-opt.is-active{background:var(--dd-hover);color:var(--text,inherit)}',
    '.nk-dd-opt[aria-selected="true"]{color:var(--gold,#C89B54);font-weight:700}',
    '.nk-dd-opt[aria-selected="true"]::after{content:"";flex:none;width:5px;height:9px;margin-right:2px;border:solid var(--gold,#C89B54);border-width:0 2px 2px 0;transform:rotate(45deg) translateY(-1px)}',
    '.nk-dd-opt[aria-disabled="true"]{opacity:.4;cursor:not-allowed}',
    '.nk-dd-grp{padding:8px 12px 4px;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint,#8a8493);cursor:default}',
    /* menus inside forms behave like the other form fields: full width, softer corners */
    '.nk-dd--field{display:block;width:100%}',
    '.nk-dd--field .nk-dd-btn{width:100%;justify-content:space-between;border-radius:12px;padding:12px 14px;font-size:14px}',
    '.nk-dd--field .nk-dd-list{min-width:100%;max-width:100%;width:100%;white-space:normal}',
    '.nk-dd--field .nk-dd-opt{white-space:normal}',
    '.nk-dd-native{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important;clip:rect(0 0 0 0)!important}',
    '@media (max-width:520px){.nk-dd:not(.nk-dd--inline){display:block;width:100%}.nk-dd:not(.nk-dd--inline) .nk-dd-btn{width:100%;justify-content:space-between}.nk-dd-list{left:0;right:0;width:auto;max-width:none}}',
    '@media (prefers-reduced-motion:reduce){.nk-dd-list,.nk-dd-chev,.nk-dd-btn,.nk-dd-opt{transition-duration:.001ms!important}}'
  ].join('\n');

  var st = document.createElement('style'); st.setAttribute('data-nk', 'dropdowns'); st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);

  var CHEV = '<svg class="nk-dd-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var OPEN = null, UID = 0;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function closeAll(except) { var d = document.querySelectorAll('.nk-dd.is-open'); for (var i = 0; i < d.length; i++) if (d[i] !== except) d[i].__nkClose && d[i].__nkClose(); }

  function labelOf(sel, field) {
    if (field) return '';
    if (sel.id && document.querySelector('label[for="' + sel.id.replace(/"/g, '\\"') + '"]')) return '';   /* the page already shows a label next to it */
    var t = sel.getAttribute('data-label') || sel.getAttribute('aria-label') || sel.getAttribute('title') || '';
    if (!t && /sort/i.test((sel.id || '') + ' ' + (sel.name || ''))) t = 'Sort';
    t = String(t).replace(/[:*]+\s*$/, '').trim();
    return t.length <= 18 ? t : '';
  }
  function skip(sel) {
    return !sel || sel.__nkdd || sel.multiple || sel.size > 1 || sel.hidden || sel.hasAttribute('data-nk-native') || sel.classList.contains('nk-sort-native') ||
      sel.classList.contains('nk-dd-native') || sel.getAttribute('aria-hidden') === 'true' || sel.closest('.nk-sort,.nk-dd,[data-nk-native]');
  }

  function upgrade(sel) {
    if (skip(sel)) return;
    sel.__nkdd = true;
    var field = !!sel.closest('form,.field,.form-group,.form-row,.form-field,.rf-row'), uid = ++UID;
    var wrap = document.createElement('div');
    wrap.className = 'nk-dd' + (field ? ' nk-dd--field' : '');
    var lab = labelOf(sel, field), listId = 'nk-dd-list-' + uid;
    wrap.innerHTML = '<button type="button" class="nk-dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + listId + '">' +
      (lab ? '<span class="nk-dd-label">' + esc(lab) + '</span>' : '') + '<span class="nk-dd-value"></span>' + CHEV + '</button>' +
      '<ul class="nk-dd-list" id="' + listId + '" role="listbox" tabindex="-1"' + (lab || sel.getAttribute('aria-label') ? ' aria-label="' + esc(lab || sel.getAttribute('aria-label')) + '"' : '') + '></ul>';
    var btn = wrap.firstChild, list = wrap.lastChild, valueEl = btn.querySelector('.nk-dd-value'), items = [], active = -1, typed = '', typedAt = 0;
    var labelFor = sel.id && document.querySelector('label[for="' + sel.id.replace(/"/g, '\\"') + '"]');
    if (labelFor) { if (!labelFor.id) labelFor.id = 'nk-dd-lbl-' + uid; list.setAttribute('aria-labelledby', labelFor.id); list.removeAttribute('aria-label'); btn.setAttribute('aria-labelledby', labelFor.id + ' ' + (btn.id = btn.id || 'nk-dd-btn-' + uid)); }

    sel.parentNode.insertBefore(wrap, sel);
    sel.classList.add('nk-dd-native'); sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true');
    wrap.appendChild(sel);                                    /* the select lives inside the wrapper: required-field validation and form submission still work */

    function build() {
      var html = '', idx = 0; items = [];
      Array.prototype.forEach.call(sel.children, function (n) {
        if (n.tagName === 'OPTGROUP') {
          html += '<li class="nk-dd-grp" role="presentation">' + esc(n.label) + '</li>';
          Array.prototype.forEach.call(n.children, function (o) { html += opt(o, n.disabled); });
        } else if (n.tagName === 'OPTION') html += opt(n, false);
      });
      function opt(o, groupOff) {
        var i = idx++, off = o.disabled || groupOff; items.push({ i: i, o: o, off: off });
        return '<li class="nk-dd-opt" role="option" id="' + listId + '-' + i + '" data-i="' + i + '"' + (off ? ' aria-disabled="true"' : '') + ' aria-selected="false">' + esc(o.textContent.trim()) + '</li>';
      }
      list.innerHTML = html; sync();
    }
    function optsEls() { return list.querySelectorAll('.nk-dd-opt'); }
    function sync() {
      var cur = sel.selectedIndex, els = optsEls(), o = sel.options[cur];
      valueEl.textContent = o ? o.textContent.trim() : '';
      for (var k = 0; k < els.length; k++) els[k].setAttribute('aria-selected', k === cur ? 'true' : 'false');
      var dis = sel.disabled; wrap.classList.toggle('is-disabled', dis); btn.disabled = dis;
    }
    function setActive(n, scroll) {
      var els = optsEls(); if (!els.length) return;
      n = Math.max(0, Math.min(els.length - 1, n));
      for (var k = 0; k < els.length; k++) els[k].classList.toggle('is-active', k === n);
      active = n; btn.setAttribute('aria-activedescendant', els[n].id);
      if (scroll !== false) { var e = els[n]; if (e.offsetTop < list.scrollTop) list.scrollTop = e.offsetTop - 6; else if (e.offsetTop + e.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = e.offsetTop + e.offsetHeight - list.clientHeight + 6; }
    }
    function step(from, dir) { var n = from; do { n += dir; } while (n >= 0 && n < items.length && items[n].off); return (n < 0 || n >= items.length) ? from : n; }
    function open() {
      if (sel.disabled || wrap.classList.contains('is-open')) return;
      closeAll(wrap); sync();
      var r = btn.getBoundingClientRect(), below = window.innerHeight - r.bottom, want = Math.min(list.scrollHeight + 16, 320);
      wrap.classList.toggle('nk-dd--up', below < want && r.top > below);
      wrap.classList.toggle('nk-dd--right', !wrap.classList.contains('nk-dd--field') && (r.left + r.width / 2) > window.innerWidth / 2 && r.width < 320);
      wrap.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); OPEN = wrap;
      setActive(sel.selectedIndex < 0 ? 0 : sel.selectedIndex);
    }
    function close(focus) {
      if (!wrap.classList.contains('is-open')) return;
      wrap.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.removeAttribute('aria-activedescendant'); if (OPEN === wrap) OPEN = null;
      if (focus) btn.focus();
    }
    wrap.__nkClose = close;
    function choose(n) {
      if (!items[n] || items[n].off) return;
      var changed = sel.selectedIndex !== n; sel.selectedIndex = n; sync(); close(true);
      if (changed) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }

    btn.addEventListener('click', function () { wrap.classList.contains('is-open') ? close(true) : open(); });
    btn.addEventListener('mouseenter', sync);
    list.addEventListener('mousemove', function (e) { var li = e.target.closest('.nk-dd-opt'); if (li) { var n = +li.getAttribute('data-i'); if (n !== active) setActive(n, false); } });
    list.addEventListener('click', function (e) { var li = e.target.closest('.nk-dd-opt'); if (li) choose(+li.getAttribute('data-i')); });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });         /* keep focus on the button */
    btn.addEventListener('keydown', function (e) {
      var k = e.key, isOpen = wrap.classList.contains('is-open');
      if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); if (!isOpen) { open(); return; } setActive(step(active, k === 'ArrowDown' ? 1 : -1)); }
      else if (k === 'Home' || k === 'End') { if (isOpen) { e.preventDefault(); setActive(k === 'Home' ? step(-1, 1) : step(items.length, -1)); } }
      else if (k === 'Enter' || k === ' ') { if (isOpen) { e.preventDefault(); choose(active); } else if (k === ' ') { /* the click that follows opens it */ } }
      else if (k === 'Escape') { if (isOpen) { e.preventDefault(); e.stopPropagation(); close(true); } }
      else if (k === 'Tab') { close(false); }
      else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {                 /* type-ahead */
        var now = Date.now(); typed = (now - typedAt > 700 ? '' : typed) + k.toLowerCase(); typedAt = now;
        for (var j = 0; j < items.length; j++) { var n = (active + 1 + j) % items.length; if (!items[n].off && items[n].o.textContent.trim().toLowerCase().indexOf(typed) === 0) { if (!isOpen) open(); setActive(n); break; } }
      }
    });
    sel.addEventListener('change', sync);
    try { new MutationObserver(function () { build(); }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected', 'disabled', 'label'] }); } catch (e) {}
    if (sel.form && !sel.form.__nkddReset) { sel.form.__nkddReset = true; sel.form.addEventListener('reset', function () { setTimeout(function () { var s = sel.form.querySelectorAll('select'); for (var i = 0; i < s.length; i++) s[i].dispatchEvent(new Event('change')); }, 0); }); }
    build();
  }

  document.addEventListener('pointerdown', function (e) { if (OPEN && !OPEN.contains(e.target)) OPEN.__nkClose(false); }, true);
  window.addEventListener('resize', function () { if (OPEN) OPEN.__nkClose(false); });
  window.addEventListener('blur', function () { if (OPEN) OPEN.__nkClose(false); });

  function scan(root) {
    var list = (root || document).querySelectorAll ? (root || document).querySelectorAll('select') : [];
    for (var i = 0; i < list.length; i++) { try { upgrade(list[i]); } catch (e) { if (window.console) console.warn('NIKORA dropdown: kept the native select', e); } }
  }
  function start() {
    scan(document);
    var t; try { new MutationObserver(function (m) { clearTimeout(t); t = setTimeout(function () { scan(document); }, 60); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.NikoraDropdowns = { scan: scan };
})();
