/* ==========================================================================================================
 * NIKORA holiday themes engine  -  holiday-themes.js  (loaded on every page by nav.js, together with holiday-themes.css)
 *
 *   - reads the theme the admin picked: Firebase /site_content/holiday_theme  ('new-year' | 'black-friday' | 'valentines' | 'halloween' | 'spring'; anything else = off)
 *     through window.NikoraSite (nav.js keeps it live); first paint comes from nav.js's cached copy, so there is no flash and no wait
 *   - sets <html data-holiday="...">, which holiday-themes.css turns into the look (colors, card frames, snow on the cards ...)
 *   - page entry effect on every page load / page switch / back-forward restore:
 *       new-year      heavy snowfall cascade + Santa's sleigh flying right to left, then gentle ambient snowfall that keeps going
 *       black-friday  falling gold dust and sparkles        valentines  translucent hearts rising
 *       halloween     drifting autumn leaves and violet wisps   spring  cherry-blossom petals
 *   - visitor toggle: header icon, menu switch and footer link; saved in localStorage 'nk_holiday_off'; one click returns the clean default look
 *   - admin live preview: the admin posts {type:'nk:field', key:'holiday_theme', value} to the preview iframe and the page switches instantly (not saved)
 *   - safety: transform/opacity only, pointer-events:none overlays, prefers-reduced-motion = static look only, motion paused in background tabs,
 *     no motion on checkout (nothing may distract from paying)
 *
 * Options (set before this file loads, all optional):  window.NK_HOLIDAY = { skipMotionOn: /checkout/i, forceTheme: 'spring' }
 * Public API: window.NKHoliday = { theme(), enabled(), setEnabled(bool), replay(), THEMES }
 * ========================================================================================================== */
(function () {
  'use strict';
  if (window.NKHoliday) return;

  var OPT = window.NK_HOLIDAY || {};
  var THEMES = {
    'new-year':     { label: 'Winter / New Year' },
    'black-friday': { label: 'Black Friday / Cyber Monday' },
    'valentines':   { label: 'Valentine\u2019s Day' },
    'halloween':    { label: 'Halloween / Autumn' },
    'spring':       { label: 'Spring / Cherry Blossom' }
  };
  var LS_OFF = 'nk_holiday_off', SITE_CACHE = 'nikora_site_content_v2', DB = 'https://nikora-store-default-rtdb.firebaseio.com';
  var root = document.documentElement;
  var reduceMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var skipRe = OPT.skipMotionOn || /checkout/i;

  var siteTheme = '', draftTheme = null, off = false, shown = '', fx = null, ambient = null, ready = false, lastBurst = 0, cleanup = 0;
  var FRAMED = false; try { FRAMED = window.parent !== window; } catch (e) { FRAMED = true; }

  function norm(v) { v = String(v == null ? '' : v).trim().toLowerCase(); return THEMES[v] ? v : ''; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function small() { return (window.innerWidth || 1024) < 640; }
  function motionOk() { return !reduceMq.matches && !(skipRe && skipRe.test(location.pathname)); }
  function theme() { return norm(OPT.forceTheme) || (draftTheme != null ? norm(draftTheme) : siteTheme); }
  function active() { return !!theme() && (!off || (FRAMED && draftTheme != null)); }

  try { off = localStorage.getItem(LS_OFF) === '1'; } catch (e) {}
  try { var c0 = JSON.parse(localStorage.getItem(SITE_CACHE) || 'null'); if (c0 && typeof c0 === 'object') siteTheme = norm(c0.holiday_theme); } catch (e) {}

  /* ---------- the first paint: set the attribute right away (the stylesheet does the rest) ---------- */
  function setAttrs() {
    var t = theme();
    if (active()) root.setAttribute('data-holiday', t); else root.removeAttribute('data-holiday');
    root.setAttribute('data-holiday-fx', active() && motionOk() ? 'on' : 'off');
  }
  setAttrs();

  /* ---------- particle layers ---------- */
  function ensureFx() {
    if (fx && fx.parentNode) return fx;
    if (!document.body) return null;
    fx = document.createElement('div'); fx.id = 'nkh-fx'; fx.setAttribute('aria-hidden', 'true');
    var wash = document.createElement('div'); wash.className = 'nkh-wash'; fx.appendChild(wash);
    document.body.appendChild(fx);
    document.addEventListener('visibilitychange', function () { if (fx) fx.classList.toggle('nkh-paused', document.hidden); });
    return fx;
  }
  function particle(cls, o) {
    var e = document.createElement('i'), s = e.style;
    e.className = 'nkh-p ' + cls + (o.rise ? ' nkh-rise' : '') + (o.extra ? ' ' + o.extra : '');
    s.setProperty('--x', o.x.toFixed(1) + '%'); s.setProperty('--s', o.s.toFixed(1) + 'px'); s.setProperty('--d', o.d.toFixed(2) + 's'); s.setProperty('--dl', o.dl.toFixed(2) + 's');
    s.setProperty('--dx', Math.round(o.dx) + 'px'); s.setProperty('--sw', Math.round(o.sw) + 'px'); s.setProperty('--r', Math.round(o.r) + 'deg'); s.setProperty('--o', String(o.o));
    return e;
  }
  function layer(cls) { var d = document.createElement('div'); d.className = 'nkh-layer ' + cls; return d; }
  function count(n) { return Math.round(n * (small() ? .55 : 1)); }

  /* entry bursts, one recipe per theme; returns the time (ms) after which the layer can be removed */
  function burst(t, host) {
    var i, frag = document.createDocumentFragment(), maxEnd = 0;
    function add(cls, o) { frag.appendChild(particle(cls, o)); maxEnd = Math.max(maxEnd, (o.d + o.dl) * 1000); }
    if (t === 'new-year') {
      for (i = 0; i < count(96); i++) add('nkh-snow', { x: rnd(-2, 100), s: rnd(4, 11), d: rnd(2.4, 4.6), dl: rnd(0, 1.7), dx: rnd(-70, 70), sw: rnd(8, 30), r: 0, o: rnd(.7, 1) });
    } else if (t === 'black-friday') {
      for (i = 0; i < count(52); i++) add(Math.random() < .55 ? 'nkh-dust' : 'nkh-spark', { x: rnd(0, 100), s: rnd(3, 9), d: rnd(3.2, 6.2), dl: rnd(0, 2.2), dx: rnd(-40, 40), sw: rnd(6, 20), r: rnd(-120, 120), o: rnd(.6, 1) });
    } else if (t === 'valentines') {
      for (i = 0; i < count(28); i++) add('nkh-heart ' + pick(['', 'h2', 'h3']), { rise: true, x: rnd(2, 96), s: rnd(14, 34), d: rnd(5.2, 9), dl: rnd(0, 2.4), dx: rnd(-50, 50), sw: rnd(12, 30), r: rnd(-30, 30), o: rnd(.35, .72) });
    } else if (t === 'halloween') {
      for (i = 0; i < count(26); i++) add('nkh-leaf ' + pick(['', 'l2', 'l3', 'l4']), { x: rnd(0, 100), s: rnd(16, 30), d: rnd(4.6, 8), dl: rnd(0, 2.6), dx: rnd(-130, 130), sw: rnd(14, 40), r: rnd(240, 560) * (Math.random() < .5 ? -1 : 1), o: rnd(.7, .95) });
      for (i = 0; i < count(7); i++) add('nkh-wisp', { rise: true, x: rnd(4, 92), s: rnd(50, 96), d: rnd(6, 9.5), dl: rnd(0, 2.6), dx: rnd(-60, 60), sw: rnd(16, 40), r: 0, o: rnd(.18, .3) });
    } else if (t === 'spring') {
      for (i = 0; i < count(40); i++) add('nkh-petal ' + (Math.random() < .5 ? '' : 'p2'), { x: rnd(-4, 96), s: rnd(10, 20), d: rnd(4.4, 8.2), dl: rnd(0, 2.6), dx: rnd(40, 210), sw: rnd(10, 34), r: rnd(200, 440) * (Math.random() < .5 ? -1 : 1), o: rnd(.7, .95) });
    }
    host.appendChild(frag);
    return maxEnd + 400;
  }

  /* gentle continuous snowfall (new-year only): three depths so it feels layered */
  function buildAmbient(host) {
    var d = layer('nkh-ambient'), frag = document.createDocumentFragment(), i, n = count(36), depth;
    for (i = 0; i < n; i++) {
      depth = i % 3;                                   /* 0 far, 1 mid, 2 near */
      var dur = depth === 0 ? rnd(16, 24) : depth === 1 ? rnd(11, 17) : rnd(7.5, 11);
      var e = particle('nkh-snow d' + (depth + 1), { x: rnd(0, 100), s: depth === 0 ? rnd(3, 5) : depth === 1 ? rnd(4.5, 7) : rnd(6.5, 10), d: dur, dl: -rnd(0, dur), dx: rnd(-50, 50), sw: rnd(8, 26), r: 0, o: 1 });
      frag.appendChild(e);
    }
    d.appendChild(frag); host.appendChild(d); return d;
  }

  /* Santa's sleigh, drawn facing left: two reindeer, reins, Santa and a sack of gifts */
  function sleighSvg() {
    var deer = '<g><ellipse cx="40" cy="58" rx="22" ry="11" fill="#8B5E3C"/><ellipse cx="27" cy="62" rx="10" ry="7" fill="#C49A6C"/>' +
      '<path d="M24 52L14 38L22 34L32 48Z" fill="#8B5E3C"/><ellipse cx="12" cy="36" rx="9" ry="6" fill="#8B5E3C" transform="rotate(-20 12 36)"/>' +
      '<circle cx="4.5" cy="38.5" r="2.7" fill="#E63946"/><circle cx="11" cy="34" r="1.1" fill="#222"/><path d="M16 30L21 24L22 31Z" fill="#6f4a2f"/>' +
      '<path d="M15 30L13 18M13 22L8 17M14 26L9 23M17 30L19.5 17M19 21.5L23.5 16.5" stroke="#5a3a22" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      '<path d="M26 66L10 74M30 68L17 80M56 64L72 74M52 66L65 80" stroke="#6f4a2f" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<path d="M61 54Q70 51 72 58Q66 58 61 54Z" fill="#efe2d0"/><path d="M30 49Q35 58 32 68" stroke="#c1121f" stroke-width="3" fill="none"/><circle cx="32.5" cy="60" r="2.2" fill="#f2c14e"/></g>';
    return '<svg viewBox="0 0 360 120" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
      '<g transform="translate(0 2)">' + deer + '</g><g transform="translate(76 8) scale(.96)">' + deer.replace('#8B5E3C', '#7d5233').replace('#8B5E3C', '#7d5233').replace('#8B5E3C', '#7d5233') + '</g>' +
      '<path d="M120 60Q160 50 202 60" stroke="#7a5230" stroke-width="1.6" fill="none"/>' +
      '<path d="M180 98Q176 107 190 107L330 107Q348 107 346 92" stroke="#d4a62a" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M202 107V90M272 107V90M320 107V88" stroke="#d4a62a" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M187 63L187 82Q187 92 201 92L324 92Q340 92 342 72L347 53Q331 62 322 62L197 62Q191 62 187 63Z" fill="#c1121f"/>' +
      '<path d="M191 73H337" stroke="#f2c14e" stroke-width="3" stroke-linecap="round"/><path d="M187 63Q172 61 175 46" stroke="#d4a62a" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M300 62Q296 37 317 33Q338 37 334 62Z" fill="#7b4b2a"/><rect x="283" y="42" width="19" height="19" rx="2" fill="#2a9d8f"/><path d="M292.500 42V61M283 51.500H302" stroke="#f2c14e" stroke-width="2.4"/>' +
      '<rect x="318" y="26" width="16" height="14" rx="2" fill="#e63946" transform="rotate(8 326 33)"/><path d="M326 26L328 40" stroke="#fff" stroke-width="2"/>' +
      '<path d="M228 63Q230 39 248 37Q266 39 268 63Z" fill="#e63946"/><circle cx="249" cy="29" r="9" fill="#f6d0b0"/><path d="M240 31Q249 47 258 31Q249 37 240 31Z" fill="#fff"/>' +
      '<circle cx="245.500" cy="27.500" r="1.100" fill="#2b2b2b"/><circle cx="253" cy="27.500" r="1.100" fill="#2b2b2b"/>' +
      '<path d="M240 25Q244 7 263 13Q257 13 255 25Z" fill="#e63946"/><rect x="239" y="23" width="18" height="5" rx="2.500" fill="#fff"/><circle cx="263" cy="13" r="3.600" fill="#fff"/>' +
      '<path d="M233 52Q215 54 203 58" stroke="#c1121f" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="202" cy="58" r="3.400" fill="#f1f1f1"/></svg>';
  }
  function sleigh(host) {
    var w = document.createElement('div'); w.className = 'nkh-sleigh';
    var inn = document.createElement('div'); inn.className = 'nkh-sleigh-in'; inn.innerHTML = sleighSvg(); w.appendChild(inn);
    for (var i = 0; i < 7; i++) { var tw = document.createElement('span'); tw.className = 'nkh-tw'; tw.style.top = Math.round(rnd(28, 92)) + '%'; tw.style.right = (-4 - i * 7) + '%'; tw.style.animationDelay = (i * .17).toFixed(2) + 's'; tw.style.width = tw.style.height = Math.round(rnd(4, 9)) + 'px'; inn.appendChild(tw); }
    host.appendChild(w);
    setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 8400);
  }

  /* ---------- run / stop ---------- */
  function clearBursts() { if (!fx) return; var b = fx.querySelectorAll('.nkh-burst, .nkh-sleigh'); for (var i = 0; i < b.length; i++) b[i].parentNode.removeChild(b[i]); clearTimeout(cleanup); }
  function stopAll() { clearBursts(); if (ambient && ambient.parentNode) ambient.parentNode.removeChild(ambient); ambient = null; }
  function entry(force) {
    var t = theme(), now = Date.now();
    if (!ready || !active() || !motionOk()) return;
    if (!force && now - lastBurst < 900) return;
    lastBurst = now;
    var host = ensureFx(); if (!host) return;
    clearBursts();
    var layerEl = layer('nkh-burst'); host.appendChild(layerEl);
    var ms = burst(t, layerEl);
    if (t === 'new-year') sleigh(host);
    cleanup = setTimeout(function () { if (layerEl.parentNode) layerEl.parentNode.removeChild(layerEl); }, ms);
  }
  function syncAmbient() {
    var want = ready && active() && motionOk() && shown === 'new-year';
    if (want && !ambient) { var host = ensureFx(); if (host) ambient = buildAmbient(host); }
    else if (!want && ambient) { if (ambient.parentNode) ambient.parentNode.removeChild(ambient); ambient = null; }
  }
  function apply(replay) {
    var was = shown, t = active() ? theme() : '';
    setAttrs();
    shown = t;
    if (ready && (t || fx)) ensureFx();
    if (was !== t) { stopAll(); }
    syncAmbient();
    if (t && (was !== t || replay)) entry(true);
    syncToggles();
  }

  /* ---------- visitor toggle ---------- */
  var FLAKE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g class="nkh-flake"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.600 4.600L12 6.600l2.400-2M9.600 19.400L12 17.400l2.400 2"/></g><path class="nkh-slash" d="M4 4l16 16"/></svg>';
  function setEnabled(on) {
    off = !on;
    try { if (off) localStorage.setItem(LS_OFF, '1'); else localStorage.removeItem(LS_OFF); } catch (e) {}
    apply(on);
  }
  function label() { var t = theme(); return (t ? THEMES[t].label + ' \u2014 ' : '') + 'seasonal effects ' + (active() ? 'on' : 'off'); }
  function syncToggles() {
    var has = !!theme(), on = active(), i, list;
    list = document.querySelectorAll('.nkh-toggle');
    for (i = 0; i < list.length; i++) { list[i].hidden = !has; list[i].setAttribute('aria-pressed', on ? 'true' : 'false'); list[i].setAttribute('aria-label', label() + '. Click to turn ' + (on ? 'off' : 'on')); list[i].title = 'Seasonal effects: ' + (on ? 'on' : 'off'); }
    list = document.querySelectorAll('.nkh-switch');
    for (i = 0; i < list.length; i++) { list[i].setAttribute('aria-checked', on ? 'true' : 'false'); }
    list = document.querySelectorAll('.nkh-foot');
    for (i = 0; i < list.length; i++) list[i].hidden = !has;
    list = document.querySelectorAll('.nkh-foot-btn');
    for (i = 0; i < list.length; i++) { list[i].hidden = !has; list[i].textContent = 'Seasonal effects: ' + (on ? 'On' : 'Off'); list[i].setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }
  function flip(e) { if (e) { e.preventDefault(); e.stopPropagation(); } setEnabled(!active()); }
  function injectToggles() {
    if (!theme() && !document.querySelector('.nkh-toggle')) return;
    var actions = document.querySelector('.nkn-actions');
    if (actions && !actions.querySelector('.nkh-toggle')) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nkn-btn nkh-toggle'; b.innerHTML = FLAKE; b.hidden = !theme();
      b.addEventListener('click', flip); actions.insertBefore(b, actions.firstChild);
    }
    var foot = document.querySelector('.nkn-drawer .nkn-d-foot');
    if (foot && !document.querySelector('.nkn-drawer .nkh-foot')) {
      var row = document.createElement('div'); row.className = 'nkh-foot'; row.hidden = !theme();
      row.innerHTML = '<span id="nkh-sw-label">Seasonal effects</span><button type="button" class="nkh-switch" role="switch" aria-labelledby="nkh-sw-label"></button>';
      row.querySelector('.nkh-switch').addEventListener('click', flip);
      foot.parentNode.insertBefore(row, foot);
    }
    var bottom = document.querySelector('.nkn-f-bottom');
    if (bottom && !bottom.querySelector('.nkh-foot-btn')) {
      var fb = document.createElement('button'); fb.type = 'button'; fb.className = 'nkh-foot-btn'; fb.hidden = !theme();
      fb.addEventListener('click', flip); bottom.appendChild(fb);
    }
    syncToggles();
  }

  /* ---------- sources of the theme ---------- */
  function setSiteTheme(v) { v = norm(v); if (v === siteTheme) return; siteTheme = v; if (draftTheme == null) apply(); else syncToggles(); injectToggles(); }
  function hookSite() {
    if (window.NikoraSite && window.NikoraSite.onChange) { window.NikoraSite.onChange(function (c) { setSiteTheme(c && c.holiday_theme); }); return true; }
    return false;
  }
  var tries = 0;
  (function wait() {
    if (hookSite()) return;
    if (++tries < 25) return setTimeout(wait, 150);
    if (typeof fetch === 'function') fetch(DB + '/site_content/holiday_theme.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(setSiteTheme).catch(function () {});
  })();
  /* admin live preview (unsaved edits arrive as postMessage from the admin window only) */
  window.addEventListener('message', function (e) {
    var m = e && e.data;
    if (!m || m.type !== 'nk:field' || m.key !== 'holiday_theme') return;
    try { if (window.parent === window || e.source !== window.parent) return; } catch (x) { return; }
    draftTheme = String(m.value == null ? '' : m.value); apply(true); injectToggles();
  });
  window.addEventListener('storage', function (e) { if (e.key === LS_OFF) { off = e.newValue === '1'; apply(); } });
  var onMq = function () { setAttrs(); apply(); };
  if (reduceMq.addEventListener) reduceMq.addEventListener('change', onMq); else if (reduceMq.addListener) reduceMq.addListener(onMq);
  window.addEventListener('pageshow', function (e) { if (e.persisted) entry(false); });   /* back / forward restore counts as a page switch */

  /* ---------- start ---------- */
  function start() {
    if (ready) return; ready = true;
    ensureFx(); apply(); entry(false); injectToggles();   /* entry(false): the theme may already have arrived before the page was ready; the 900 ms guard stops a double burst */
    var queued = false;
    try {
      new MutationObserver(function () { if (queued || !theme()) return; queued = true; requestAnimationFrame(function () { queued = false; injectToggles(); }); }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.NKHoliday = { theme: function () { return active() ? theme() : ''; }, enabled: active, setEnabled: setEnabled, replay: function () { entry(true); }, THEMES: THEMES };
})();