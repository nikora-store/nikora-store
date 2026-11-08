/* =====================================================================
   NIKORA privacy & cookie consent  (consent.js)
   Loaded automatically by nav.js on every page.

   - Sleek bottom banner: Accept all / Reject non-essential / Customize
   - Choice saved in localStorage (key "nk_consent_v1", re-asked after 12 months or when the policy version changes)
   - Nothing that tracks is loaded before consent. Google Analytics 4 is injected only after "Analytics" is allowed,
     and is switched off again (and its cookies removed) if the visitor withdraws consent.
   - Google Consent Mode v2 defaults are set to "denied" before anything else runs.
   - Services are a small registry, so Meta/Facebook Pixel (or anything else) can be added later without touching the banner:
       NikoraConsent.register({ id: 'my-service', category: 'marketing', label: 'My service',
                                load: function(){ ... }, unload: function(){ ... } });
     A "Marketing" switch appears automatically as soon as one marketing service is registered.

   Configuration (all optional). Set BEFORE nav.js loads, or let the admin set it in Firebase /site_content:
     window.NK_CONSENT = { ga4Id: 'G-XXXXXXXXXX', metaPixelId: '1234567890', privacyUrl: 'privacy.html#cookies-data-rights' };
     /site_content/ga4_measurement_id   -> overrides ga4Id
     /site_content/meta_pixel_id        -> enables the Meta Pixel (marketing category)

   Public API (window.NikoraConsent):
     get()              -> { v, ts, analytics, marketing } or null when the visitor has not chosen yet
     has('analytics')   -> boolean
     open()             -> open the preferences panel (also: any <a href="#cookie-settings"> or [data-nk-cookie-settings])
     acceptAll() / rejectAll()
     register(service)  -> add a service to the registry
     onChange(fn)       -> fn(consent) whenever the choice changes; returns an unsubscribe function
   Event: document fires "nikora:consent" with detail = the consent object.
   ===================================================================== */
(function (w, d) {
  'use strict';
  if (w.NikoraConsent) return;

  var KEY = 'nk_consent_v1';
  var VERSION = 1;                                   /* bump to ask everyone again (e.g. when a new tracker is added) */
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
  var USER_CFG = w.NK_CONSENT || {};
  var CFG = {
    ga4Id: 'G-EDM84G1JPG',                           /* the GA4 stream of the nikora-store Firebase web app */
    metaPixelId: '',
    privacyUrl: 'privacy.html#cookies-data-rights'
  };
  Object.keys(USER_CFG).forEach(function (k) { CFG[k] = USER_CFG[k]; });

  var consent = null, services = [], listeners = [], loaded = {}, banner = null, panel = null, lastFocus = null;
  var gpc = !!(w.navigator && w.navigator.globalPrivacyControl);   /* Global Privacy Control = an opt-out signal: never pre-enable marketing */

  /* ---------------- storage ---------------- */
  function read() {
    try {
      var c = JSON.parse(w.localStorage.getItem(KEY) || 'null');
      if (!c || c.v !== VERSION || !c.ts || (Date.now() - c.ts) > MAX_AGE_MS) return null;
      return { v: c.v, ts: c.ts, analytics: c.analytics === true, marketing: c.marketing === true };
    } catch (e) { return null; }
  }
  function write(c) { try { w.localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }

  /* ---------------- Google tag (gtag) + Consent Mode v2 ---------------- */
  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }
  if (!w.gtag) w.gtag = gtag;
  /* defaults first: everything denied until the visitor says otherwise (this only queues a command, no network request) */
  w.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });

  function loadScript(src, id, onload) {
    if (id && d.getElementById(id)) { if (onload) onload(); return; }
    var s = d.createElement('script'); s.async = true; s.src = src; if (id) s.id = id;
    if (onload) s.onload = onload;
    (d.head || d.documentElement).appendChild(s);
  }
  function deleteCookies(re) {
    var host = w.location.hostname, parts = host.split('.'), domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    d.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim(); if (!re.test(n)) return;
      domains.forEach(function (dom) { d.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (dom ? '; domain=' + dom : ''); });
    });
  }

  /* ---------------- service registry ---------------- */
  function register(svc) {
    if (!svc || !svc.id || !svc.category) return;
    for (var i = 0; i < services.length; i++) if (services[i].id === svc.id) return;
    services.push(svc);
    if (consent && consent[svc.category] === true) runLoad(svc);      /* registered late, consent already given */
    if (panel) renderPanelRows();
  }
  function runLoad(svc) {
    if (loaded[svc.id]) return; loaded[svc.id] = true;
    try { svc.load(); } catch (e) { if (w.console) console.warn('Consent: could not start ' + svc.id, e); }
  }
  function runUnload(svc) {
    if (!loaded[svc.id]) return; loaded[svc.id] = false;
    try { if (svc.unload) svc.unload(); } catch (e) {}
  }
  function applyConsent() {
    services.forEach(function (svc) { (consent && consent[svc.category] === true) ? runLoad(svc) : runUnload(svc); });
  }

  /* Google Analytics 4: nothing is requested from Google until analytics is allowed */
  var ga4 = {
    id: 'ga4', category: 'analytics', label: 'Google Analytics 4', desc: 'Counts visits and shows which pages and products are popular, so we can improve the store. Data is aggregated.',
    load: function () {
      var id = CFG.ga4Id; if (!/^G-[A-Z0-9]{6,}$/i.test(id || '')) return;
      w['ga-disable-' + id] = false;
      w.gtag('consent', 'update', { analytics_storage: 'granted' });
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id), 'nk-ga4', function () {});
      w.gtag('js', new Date());
      w.gtag('config', id, { anonymize_ip: true });
    },
    unload: function () {
      var id = CFG.ga4Id;
      if (id) w['ga-disable-' + id] = true;                           /* stops any further hits from the already-loaded script */
      w.gtag('consent', 'update', { analytics_storage: 'denied' });
      deleteCookies(/^_ga(_|$)/);
    }
  };
  register(ga4);

  /* Meta / Facebook Pixel: registered only when a pixel id is configured */
  function registerMeta() {
    var id = String(CFG.metaPixelId || '').replace(/\D/g, ''); if (!id) return;
    register({
      id: 'meta-pixel', category: 'marketing', label: 'Meta Pixel', desc: 'Measures how our ads on Facebook and Instagram perform and helps show them to relevant people.',
      load: function () {
        if (!w.fbq) {
          var n = w.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
          if (!w._fbq) w._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
          loadScript('https://connect.facebook.net/en_US/fbevents.js', 'nk-fbpx');
        }
        w.fbq('consent', 'grant'); w.fbq('init', id); w.fbq('track', 'PageView');
      },
      unload: function () { if (w.fbq) w.fbq('consent', 'revoke'); deleteCookies(/^_fb[pc]$/); }
    });
  }

  /* admin overrides from Firebase /site_content (read through nav.js when it exposes it) */
  function hookSiteContent() {
    var site = w.NikoraSite; if (!site || typeof site.onChange !== 'function') return false;
    site.onChange(function (c) {
      c = c || {};
      if (typeof c.ga4_measurement_id === 'string' && /^G-[A-Z0-9]{6,}$/i.test(c.ga4_measurement_id.trim()) && c.ga4_measurement_id.trim() !== CFG.ga4Id) {
        var was = loaded.ga4; if (was) runUnload(ga4);
        CFG.ga4Id = c.ga4_measurement_id.trim(); if (was && consent && consent.analytics) runLoad(ga4);
      }
      if (typeof c.meta_pixel_id === 'string' && c.meta_pixel_id.trim() && !CFG.metaPixelId) { CFG.metaPixelId = c.meta_pixel_id.trim(); registerMeta(); }
    });
    return true;
  }

  /* ---------------- state changes ---------------- */
  function categories() {
    var cats = { analytics: false, marketing: false };
    services.forEach(function (s) { cats[s.category] = true; });
    return cats;
  }
  function save(next) {
    consent = { v: VERSION, ts: Date.now(), analytics: next.analytics === true, marketing: next.marketing === true };
    write(consent);
    applyConsent();
    listeners.slice().forEach(function (fn) { try { fn(consent); } catch (e) {} });
    try { d.dispatchEvent(new CustomEvent('nikora:consent', { detail: consent })); } catch (e2) {}
  }
  function acceptAll() { save({ analytics: true, marketing: true }); closeAll(); }
  function rejectAll() { save({ analytics: false, marketing: false }); closeAll(); }

  /* ---------------- UI ---------------- */
  var CSS = [
    '.nkc-bar,.nkc-panel{font-family:inherit;color:#F3EEE6;-webkit-font-smoothing:antialiased}',
    '.nkc-bar{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translate(-50%,24px);opacity:0;z-index:9500;width:min(920px,calc(100% - 24px));box-sizing:border-box;display:flex;align-items:center;gap:18px 26px;flex-wrap:wrap;padding:16px 20px;border-radius:22px;background:rgba(11,11,14,.93);-webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3);border:1px solid rgba(200,155,84,.4);box-shadow:0 24px 60px -18px rgba(0,0,0,.65);transition:transform .45s cubic-bezier(.22,.8,.24,1),opacity .35s ease}',
    '.nkc-bar.in{transform:translate(-50%,0);opacity:1}',
    '.nkc-bar[hidden],.nkc-panel[hidden]{display:none}',
    '.nkc-copy{flex:1 1 320px;min-width:0}',
    '.nkc-title{margin:0 0 3px;font-family:"Playfair Display",Georgia,serif;font-size:16px;font-weight:500;color:#fff}',
    '.nkc-text{margin:0;font-size:12.5px;line-height:1.6;color:rgba(243,238,230,.78)}',
    '.nkc-text a{color:#D9B777;text-decoration:none;border-bottom:1px solid rgba(217,183,119,.5)}',
    '.nkc-text a:hover{border-bottom-color:#D9B777}',
    '.nkc-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}',
    '.nkc-btn{appearance:none;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;letter-spacing:.02em;padding:11px 20px;border-radius:100px;border:1px solid rgba(243,238,230,.3);background:transparent;color:#F3EEE6;transition:transform .2s ease,border-color .2s ease,background .2s ease,filter .2s ease;white-space:nowrap}',
    '.nkc-btn:hover{border-color:#C89B54;color:#fff}',
    '.nkc-btn-gold{background:#C89B54;border-color:#C89B54;color:#17120a}',
    '.nkc-btn-gold:hover{filter:brightness(1.08);color:#17120a;transform:translateY(-1px)}',
    '.nkc-link{appearance:none;background:none;border:0;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:rgba(243,238,230,.8);padding:11px 6px;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(200,155,84,.7)}',
    '.nkc-link:hover{color:#fff}',
    '.nkc-btn:focus-visible,.nkc-link:focus-visible,.nkc-sw input:focus-visible+.nkc-track{outline:2px solid #C89B54;outline-offset:3px}',
    '.nkc-overlay{position:fixed;inset:0;z-index:9600;display:grid;place-items:center;padding:16px;background:rgba(5,5,8,.6);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);opacity:0;transition:opacity .3s ease}',
    '.nkc-overlay.in{opacity:1}.nkc-overlay[hidden]{display:none}',
    '.nkc-panel{width:min(520px,100%);max-height:calc(100vh - 32px);overflow-y:auto;box-sizing:border-box;padding:26px;border-radius:24px;background:#0B0B0E;border:1px solid rgba(200,155,84,.4);box-shadow:0 40px 90px -20px rgba(0,0,0,.7)}',
    '.nkc-panel h2{margin:0 0 6px;font-family:"Playfair Display",Georgia,serif;font-weight:500;font-size:22px;color:#fff}',
    '.nkc-panel>p{margin:0 0 18px;font-size:13px;line-height:1.6;color:rgba(243,238,230,.75)}',
    '.nkc-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid rgba(255,255,255,.1)}',
    '.nkc-row b{display:block;font-size:13.5px;color:#fff;margin-bottom:3px}',
    '.nkc-row span.nkc-d{display:block;font-size:12px;line-height:1.55;color:rgba(243,238,230,.65)}',
    '.nkc-always{flex:none;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#D9B777;padding-top:2px}',
    '.nkc-sw{position:relative;flex:none;width:44px;height:26px;margin-top:1px}',
    '.nkc-sw input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:2}',
    '.nkc-track{position:absolute;inset:0;border-radius:100px;background:rgba(255,255,255,.16);transition:background .2s ease}',
    '.nkc-track::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s ease}',
    '.nkc-sw input:checked+.nkc-track{background:#C89B54}',
    '.nkc-sw input:checked+.nkc-track::after{transform:translateX(18px)}',
    '.nkc-panel .nkc-actions{margin-top:18px;justify-content:flex-end}',
    '@media (max-width:640px){.nkc-bar{border-radius:20px;padding:14px 16px}.nkc-actions{width:100%}.nkc-actions .nkc-btn-gold,.nkc-actions .nkc-btn{flex:1 1 auto;text-align:center}.nkc-link{width:100%;text-align:center}}',
    '@media (prefers-reduced-motion:reduce){.nkc-bar,.nkc-overlay,.nkc-btn,.nkc-track,.nkc-track::after{transition:none}}'
  ].join('');
  function injectCss() {
    if (d.getElementById('nkc-css')) return;
    var s = d.createElement('style'); s.id = 'nkc-css'; s.textContent = CSS; (d.head || d.documentElement).appendChild(s);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function buildBanner() {
    if (banner) return;
    injectCss();
    banner = d.createElement('div');
    banner.className = 'nkc-bar'; banner.setAttribute('role', 'region'); banner.setAttribute('aria-label', 'Cookie and privacy consent');
    banner.innerHTML =
      '<div class="nkc-copy"><p class="nkc-title">Your privacy, your choice</p>' +
      '<p class="nkc-text">We use essential storage to run the store (cart, language, theme). With your permission we also use analytics to see how the store is used and improve it. ' +
      '<a href="' + esc(CFG.privacyUrl) + '">Read our Privacy Policy</a>.</p></div>' +
      '<div class="nkc-actions">' +
        '<button type="button" class="nkc-btn nkc-btn-gold" data-nkc="accept">Accept all</button>' +
        '<button type="button" class="nkc-btn" data-nkc="reject">Reject non-essential</button>' +
        '<button type="button" class="nkc-link" data-nkc="custom">Customize</button>' +
      '</div>';
    d.body.appendChild(banner);
    banner.addEventListener('click', onClick);
    requestAnimationFrame(function () { requestAnimationFrame(function () { banner.classList.add('in'); }); });
  }
  function hideBanner() {
    if (!banner) return;
    var b = banner; banner = null; b.classList.remove('in');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 420);
  }

  function renderPanelRows() {
    if (!panel) return;
    var cats = categories(), cur = consent || { analytics: false, marketing: false };
    var html = '<div class="nkc-row"><div><b>Essential</b><span class="nkc-d">Needed for the store to work: your cart, checkout, theme and this choice. Always on.</span></div><span class="nkc-always">Always on</span></div>';
    [['analytics', 'Analytics'], ['marketing', 'Marketing']].forEach(function (c) {
      if (!cats[c[0]]) return;
      var names = services.filter(function (s) { return s.category === c[0]; }), desc = names.map(function (s) { return s.label + ': ' + s.desc; }).join(' ');
      var on = (c[0] === 'marketing' && gpc && !consent) ? false : cur[c[0]] === true;
      html += '<div class="nkc-row"><div><b>' + c[1] + '</b><span class="nkc-d">' + esc(desc) + '</span></div>' +
        '<label class="nkc-sw"><input type="checkbox" data-cat="' + c[0] + '"' + (on ? ' checked' : '') + ' aria-label="' + c[1] + ' cookies"><span class="nkc-track"></span></label></div>';
    });
    panel.querySelector('.nkc-rows').innerHTML = html;
  }
  function openPanel() {
    injectCss();
    if (panel) return;
    lastFocus = d.activeElement;
    var ov = d.createElement('div'); ov.className = 'nkc-overlay';
    ov.innerHTML =
      '<div class="nkc-panel" role="dialog" aria-modal="true" aria-labelledby="nkc-ptitle">' +
        '<h2 id="nkc-ptitle">Privacy preferences</h2>' +
        '<p>Choose which optional technologies we may use. You can change this any time from \u201cCookie Settings\u201d in the footer. <a href="' + esc(CFG.privacyUrl) + '" style="color:#D9B777">Privacy Policy</a></p>' +
        '<div class="nkc-rows"></div>' +
        '<div class="nkc-actions"><button type="button" class="nkc-btn" data-nkc="reject">Reject non-essential</button>' +
        '<button type="button" class="nkc-btn" data-nkc="save">Save my choices</button>' +
        '<button type="button" class="nkc-btn nkc-btn-gold" data-nkc="accept">Accept all</button></div>' +
      '</div>';
    d.body.appendChild(ov); panel = ov;
    renderPanelRows();
    ov.addEventListener('click', function (e) { if (e.target === ov) closePanel(); else onClick(e); });
    ov.addEventListener('keydown', trapKeys);
    requestAnimationFrame(function () { ov.classList.add('in'); var f = ov.querySelector('input,button'); if (f) f.focus(); });
  }
  function closePanel() {
    if (!panel) return;
    var p = panel; panel = null; p.classList.remove('in');
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 300);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  function closeAll() { hideBanner(); closePanel(); }
  function trapKeys(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closePanel(); return; }
    if (e.key !== 'Tab' || !panel) return;
    var f = panel.querySelectorAll('input,button,a[href]'); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function onClick(e) {
    var b = e.target.closest ? e.target.closest('[data-nkc]') : null; if (!b) return;
    var act = b.getAttribute('data-nkc');
    if (act === 'accept') acceptAll();
    else if (act === 'reject') rejectAll();
    else if (act === 'custom') openPanel();
    else if (act === 'save') {
      var next = { analytics: false, marketing: false };
      Array.prototype.forEach.call(panel.querySelectorAll('input[data-cat]'), function (i) { next[i.getAttribute('data-cat')] = i.checked; });
      save(next); closeAll();
    }
  }

  /* any "Cookie Settings" link in the page (footer) reopens the panel */
  d.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href="#cookie-settings"],[data-nk-cookie-settings]') : null;
    if (!a) return; e.preventDefault(); openPanel();
  });

  /* ---------------- boot ---------------- */
  consent = read();
  registerMeta();
  if (consent) applyConsent();
  function boot() {
    if (!hookSiteContent()) { var tries = 0, iv = setInterval(function () { if (hookSiteContent() || ++tries > 20) clearInterval(iv); }, 500); }
    if (!consent) setTimeout(buildBanner, 700);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();

  w.NikoraConsent = {
    get: function () { return consent ? { v: consent.v, ts: consent.ts, analytics: consent.analytics, marketing: consent.marketing } : null; },
    has: function (cat) { return !!(consent && consent[cat] === true); },
    open: openPanel,
    acceptAll: acceptAll,
    rejectAll: rejectAll,
    register: register,
    onChange: function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
  };
})(window, document);