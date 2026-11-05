/* ==========================================================================
   semantic-search.js — NIKORA smart search (hybrid semantic + keyword)
   - Heavy lifting happens in semantic-worker.js (Web Worker)
   - Search overlay: Cmd/Ctrl+K, "/", or any element with [data-nk-search-open]
   - Optional: text-animations.js (typing placeholder)
   - Public API: window.NikoraSearch { open, close, search, warmup, refresh }
   ========================================================================== */
(() => {
  'use strict';
  if (window.NikoraSearch) return;

  /* ---------- Config (edit freely) ---------- */
  const CONFIG = {
    workerUrl: '/semantic-worker.js',
    productUrl: (id) => `product.html?id=${encodeURIComponent(id)}`,
    topK: 6,
    minScore: 0.26,        // hybrid threshold (tune against your real catalog)
    minLexical: 0.3,       // threshold while the model is still loading
    semanticWeight: 0.8,
    debounceMs: 140,
    refreshAfterMs: 60000, // re-read products if older than this when opened
    queryTimeoutMs: 6000,
    currency: 'USD',
    debug: false,          // true → console.table of scores
    suggestions: [
      'lightweight summer cream',
      'for dry skin',
      'calming for sensitive skin',
      'glow before an event',
    ],
  };

  // nav.js sets window.NK_SEARCH = { workerUrl, dbUrl } so paths work from any folder.
  // Any other CONFIG key can be overridden the same way (set it before this script runs).
  Object.assign(CONFIG, window.NK_SEARCH || {});

  // Keyword fallback only. Semantic mode understands these natively.
  const SYNONYMS = {
    dry: ['hydration', 'hydrating', 'moisture', 'barrier', 'dehydrated'],
    oily: ['sebum', 'pore', 'pores', 'lightweight', 'balancing'],
    sensitive: ['calming', 'soothing', 'centella', 'gentle', 'redness'],
    summer: ['lightweight', 'light', 'gel', 'spf', 'sun', 'fresh'],
    winter: ['rich', 'barrier', 'nourishing', 'cream'],
    lightweight: ['light', 'gel', 'watery', 'fresh'],
    acne: ['blemish', 'breakout', 'calming', 'pore'],
    aging: ['wrinkle', 'lifting', 'firming', 'collagen', 'glow'],
    glow: ['radiance', 'brightening', 'luminous', 'glass'],
    sun: ['spf', 'sunscreen', 'uv'],
    lips: ['lip', 'sleeping', 'mask'],
    device: ['wand', 'led', 'ems', 'microcurrent', 'tool'],
  };
  const STOP = new Set(['for', 'the', 'a', 'an', 'and', 'of', 'my', 'to', 'with', 'in', 'on', 'i', 'need',
    'want', 'looking', 'something', 'that', 'is', 'best', 'me', 'good']);

  const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#F1EBE2"/>' +
    '<text x="40" y="45" text-anchor="middle" font-family="Georgia,serif" font-size="11" letter-spacing="1.5" fill="#C89B54">NIKORA</text></svg>'
  );

  const ICON_SEARCH = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  /* ---------- State ---------- */
  const state = {
    products: [], loadedAt: 0, loading: null, sig: '', postedSig: '',
    worker: null, modelReady: false, indexed: false, failed: false, progress: 0,
    pending: new Map(), reqId: 0, runToken: 0, lastRes: null,
    open: false, lastFocus: null, shown: new Set(), active: -1, hits: [],
  };
  let ui = null, typing = null, debounceTimer = 0, warmed = false;
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: CONFIG.currency });

  /* ---------- Helpers ---------- */
  function hashStr(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  }
  const tokenize = (s) => String(s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  const asText = (v) =>
    Array.isArray(v) ? v.filter(Boolean).join(', ')
      : v && typeof v === 'object' ? Object.values(v).join(', ')
      : String(v ?? '');

  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((k) => k != null && k !== false && el.append(k));
    return el;
  }
  function icon(svg) {
    const t = document.createElement('template');
    t.innerHTML = svg; // static strings only
    return t.content.firstChild;
  }
  const modelAllowed = () => {
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return false;
    return typeof Worker !== 'undefined' && typeof WebAssembly === 'object';
  };

  /* ---------- Product loading ---------- */
  async function fetchRaw() {
    const site = window.NikoraSite;
    if (site) {
      if (typeof site.getProducts === 'function') return { raw: await site.getProducts(), source: 'site' };
      if (site.products) return { raw: site.products, source: 'site' };
    }
    if (window.firebase?.apps?.length) {
      const snap = await window.firebase.database().ref('products').once('value');
      return { raw: snap.val(), source: 'firebase' };
    }
    // Pages without the Firebase SDK: plain REST read (same database nav.js uses for /site_content)
    if (CONFIG.dbUrl && typeof fetch === 'function') {
      try {
        const r = await fetch(`${CONFIG.dbUrl}/products.json`, { cache: 'no-store' });
        if (r.ok) {
          const raw = await r.json();
          if (raw) return { raw, source: 'firebase' };
        }
      } catch { /* fall through to the catalog fallback */ }
    }
    return { raw: window.PRODUCTS_CATALOG || [], source: 'catalog' };
  }

  function toArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean).map((p, i) => ({ ...p, id: p.id ?? i }));
    return Object.entries(raw).map(([k, v]) => ({ ...v, id: v?.id ?? k }));
  }
  const isActive = (p) => !(p.active === false || p.status === 'inactive' || p.hidden === true);

  function normalize(p, source) {
    const name = p.name || p.title || '';
    const brand = p.brand || '';
    const category = p.category || '';
    const tags = p.skinConcerns ?? p.concerns ?? p.tags ?? '';
    const benefits = p.keyBenefits ?? p.benefits ?? '';
    const description = String(p.description ?? p.shortDescription ?? '').slice(0, 600);

    // Photo rule: storefront images come from Firebase exactly as saved.
    // Never borrow lib/products.js photos → catalog fallback gets the branded placeholder.
    let image = '';
    if (source !== 'catalog') {
      const imgs = Array.isArray(p.images) ? p.images : p.images && typeof p.images === 'object' ? Object.values(p.images) : [];
      image = imgs.find(Boolean) || '';
    }

    const text = [name, brand && `by ${brand}`, category, asText(tags), asText(benefits), description]
      .filter(Boolean).join('. ');
    const nameList = tokenize(`${name} ${brand}`);
    const docList = tokenize(text);
    return { id: p.id, name, brand, category, price: Number(p.price), image, text, nameList, docList };
  }

  function ensureProducts(force = false) {
    const fresh = state.products.length && Date.now() - state.loadedAt < CONFIG.refreshAfterMs;
    if (fresh && !force) return Promise.resolve(state.products);
    if (state.loading) return state.loading;
    state.loading = (async () => {
      try {
        const { raw, source } = await fetchRaw();
        state.products = toArray(raw).filter(isActive).map((p) => normalize(p, source)).filter((p) => p.id != null && p.name);
        state.loadedAt = Date.now();
        state.sig = hashStr(state.products.map((p) => `${p.id}|${p.text}`).join('\n'));
        syncIndex();
      } catch (err) {
        console.warn('[NikoraSearch] could not load products', err);
      } finally {
        state.loading = null;
      }
      return state.products;
    })();
    return state.loading;
  }

  /* ---------- Worker ---------- */
  function startWorker() {
    if (state.worker || state.failed || !modelAllowed()) return;
    try {
      const w = new Worker(CONFIG.workerUrl, { type: 'module' });
      w.onmessage = onWorkerMessage;
      w.onerror = () => { state.failed = true; state.worker = null; refreshStatus(); };
      state.worker = w;
      w.postMessage({ type: 'warmup' });
      syncIndex();
    } catch { state.failed = true; }
  }

  function syncIndex() {
    if (!state.worker || !state.products.length || state.postedSig === state.sig) return;
    state.postedSig = state.sig;
    state.worker.postMessage({ type: 'index', items: state.products.map(({ id, text }) => ({ id, text })) });
  }

  function onWorkerMessage({ data }) {
    switch (data.type) {
      case 'progress':
        state.progress = Math.round(data.progress || 0);
        if (!state.modelReady) refreshStatus();
        break;
      case 'ready': state.modelReady = true; refreshStatus(); break;
      case 'indexed':
        state.indexed = true;
        refreshStatus();
        if (ui && state.open && ui.input.value.trim()) run(ui.input.value);
        break;
      case 'results': {
        const cb = state.pending.get(data.requestId);
        state.pending.delete(data.requestId);
        cb?.(data.hits);
        break;
      }
      case 'error': {
        console.warn('[NikoraSearch]', data.message);
        const cb = state.pending.get(data.requestId);
        if (cb) { state.pending.delete(data.requestId); cb(null); }
        else { state.failed = true; refreshStatus(); }
      }
    }
  }

  function querySemantic(text) {
    return new Promise((resolve) => {
      const requestId = ++state.reqId;
      const timer = setTimeout(() => { state.pending.delete(requestId); resolve(null); }, CONFIG.queryTimeoutMs);
      state.pending.set(requestId, (hits) => {
        clearTimeout(timer);
        resolve(hits ? new Map(hits.map((x) => [x.id, x.score])) : null);
      });
      state.worker.postMessage({ type: 'query', requestId, text });
    });
  }

  /* ---------- Keyword fallback ---------- */
  const matchWeight = (p, t) => {
    const near = (w) => w === t || (t.length > 4 && w.startsWith(t.slice(0, 5)));
    if (p.nameList.some(near)) return 1;
    if (p.docList.some(near)) return 0.6;
    return 0;
  };

  function lexicalScores(query) {
    const base = tokenize(query).filter((t) => !STOP.has(t));
    const scores = new Map();
    if (!base.length) return scores;
    const extra = [...new Set(base.flatMap((t) => SYNONYMS[t] || []))].filter((t) => !base.includes(t));
    for (const p of state.products) {
      let s = 0;
      for (const t of base) s += matchWeight(p, t);
      for (const t of extra) s += matchWeight(p, t) * 0.5;
      scores.set(p.id, Math.min(1, s / base.length));
    }
    return scores;
  }

  /* ---------- Public search ---------- */
  async function search(query, { topK = CONFIG.topK } = {}) {
    const q = String(query || '').trim();
    if (!q) return { mode: 'none', hits: [] };
    await ensureProducts();

    const lex = lexicalScores(q);
    const sem = state.worker && state.indexed ? await querySemantic(q) : null;
    const w = CONFIG.semanticWeight;
    const min = sem ? CONFIG.minScore : CONFIG.minLexical;

    const all = state.products.map((p) => {
      const l = lex.get(p.id) || 0;
      const s = sem ? Math.max(sem.get(p.id) ?? 0, 0) : null;
      return { product: p, semantic: s, lexical: l, score: sem ? w * s + (1 - w) * l : l };
    });
    if (CONFIG.debug) console.table(all.map((a) => ({ name: a.product.name, sem: a.semantic, lex: a.lexical, score: a.score })));

    const hits = all.filter((a) => a.score >= min).sort((a, b) => b.score - a.score).slice(0, topK);
    return { mode: sem ? 'semantic' : 'keyword', hits };
  }

  /* ---------- UI ---------- */
  function injectStyle() {
    if (document.getElementById('nk-search-style')) return;
    const css = `
.nks{--nks-fg:#0B0B0E;--nks-muted:rgba(11,11,14,.56);--nks-line:rgba(11,11,14,.1);--nks-panel:rgba(250,247,242,.94);--nks-hover:rgba(200,155,84,.13);--nks-gold:var(--gold,#C89B54);position:fixed;inset:0;z-index:1000000;display:flex;justify-content:center;align-items:flex-start;padding:max(12px,env(safe-area-inset-top)) 12px 12px;color:var(--nks-fg);font-family:inherit}
[data-theme="dark"] .nks{--nks-fg:#fff;--nks-muted:rgba(255,255,255,.58);--nks-line:rgba(255,255,255,.12);--nks-panel:rgba(16,16,20,.92);--nks-hover:rgba(200,155,84,.16)}
.nks[hidden]{display:none}
.nks__backdrop{position:absolute;inset:0;background:rgba(11,11,14,.45);opacity:0;transition:opacity .22s ease}
.nks__panel{position:relative;width:min(680px,100%);margin-top:clamp(0px,9vh,96px);max-height:min(78dvh,640px);display:flex;flex-direction:column;background:var(--nks-panel);border:1px solid var(--nks-line);border-radius:20px;box-shadow:0 24px 60px -12px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(18px) saturate(1.2);backdrop-filter:blur(18px) saturate(1.2);overflow:hidden;opacity:0;transform:translateY(-8px) scale(.985);transition:opacity .22s ease,transform .22s cubic-bezier(.22,1,.36,1)}
.nks.is-open .nks__backdrop{opacity:1}
.nks.is-open .nks__panel{opacity:1;transform:none}
.nks__bar{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--nks-line);color:var(--nks-muted)}
.nks__field{position:relative;flex:1;min-width:0}
.nks__input{width:100%;border:0;outline:0;background:transparent;color:var(--nks-fg);font:inherit;font-size:1.05rem;padding:6px 0}
.nks__ph{position:absolute;inset:0;display:flex;align-items:center;pointer-events:none;color:var(--nks-muted);font-size:1.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nks__field.has-value .nks__ph{display:none}
.nks__close{flex:none;display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--nks-line);border-radius:50%;background:transparent;color:inherit;cursor:pointer;transition:border-color .2s,color .2s}
.nks__close:hover{border-color:var(--nks-gold);color:var(--nks-gold)}
.nks :focus-visible{outline:2px solid var(--nks-gold);outline-offset:2px}
.nks__input:focus-visible{outline:0}
.nks__status{padding:9px 18px 4px;min-height:1.4em;font-size:.78rem;letter-spacing:.02em;color:var(--nks-muted)}
.nks__list{list-style:none;margin:0;padding:4px 8px 10px;overflow:auto;overscroll-behavior:contain;flex:1}
.nks__list:empty{padding:0}
.nks__link{display:flex;align-items:center;gap:14px;padding:10px;border-radius:14px;color:inherit;text-decoration:none;transition:background .15s}
.nks__item:hover .nks__link,.nks__item.is-active .nks__link{background:var(--nks-hover)}
.nks__thumb{flex:none;width:56px;height:56px;border-radius:12px;object-fit:cover;background:#F1EBE2}
.nks__meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.nks__name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nks__sub{font-size:.8rem;color:var(--nks-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nks__price{flex:none;font-weight:600;color:var(--nks-gold)}
.nks__chips{display:flex;flex-wrap:wrap;gap:8px;padding:6px 16px 18px}
.nks__chips[hidden]{display:none}
.nks__chip{border:1px solid var(--nks-line);border-radius:999px;padding:8px 14px;background:transparent;color:inherit;font:inherit;font-size:.85rem;cursor:pointer;transition:border-color .2s,color .2s}
.nks__chip:hover{border-color:var(--nks-gold);color:var(--nks-gold)}
.nks.is-open .nks__item.is-new{animation:nksBlur .55s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i,0)*45ms)}
@keyframes nksBlur{from{opacity:0;filter:blur(10px);transform:translateY(6px)}to{opacity:1;filter:blur(0);transform:none}}
html.nks-lock{overflow:hidden;padding-right:var(--nks-sw,0px)}
@media (max-width:560px){.nks__panel{margin-top:0;border-radius:18px}}
@media (prefers-reduced-motion:reduce){.nks__backdrop,.nks__panel,.nks__link{transition:none}.nks.is-open .nks__item.is-new{animation:none}}`;
    document.head.appendChild(h('style', { id: 'nk-search-style' }, css));
  }

  function buildUI() {
    if (ui) return ui;
    injectStyle();

    const input = h('input', {
      class: 'nks__input', type: 'text', inputmode: 'search', enterkeyhint: 'search', autocomplete: 'off',
      autocapitalize: 'off', spellcheck: 'false', role: 'combobox', 'aria-expanded': 'false',
      'aria-controls': 'nks-list', 'aria-autocomplete': 'list', 'aria-label': 'Search products',
    });
    const ph = h('span', { class: 'nks__ph', 'aria-hidden': 'true' });
    const field = h('div', { class: 'nks__field' }, input, ph);
    const closeBtn = h('button', { class: 'nks__close', type: 'button', 'aria-label': 'Close search' }, icon(ICON_CLOSE));
    const bar = h('div', { class: 'nks__bar' }, icon(ICON_SEARCH), field, closeBtn);
    const status = h('div', { class: 'nks__status', 'aria-live': 'polite' });
    const list = h('ul', { class: 'nks__list', id: 'nks-list', role: 'listbox', 'aria-label': 'Search results' });
    const chips = h('div', { class: 'nks__chips' },
      CONFIG.suggestions.map((s) => h('button', { class: 'nks__chip', type: 'button' }, s)));
    const backdrop = h('div', { class: 'nks__backdrop' });
    const panel = h('div', { class: 'nks__panel' }, bar, status, list, chips);
    const root = h('div', { class: 'nks', id: 'nk-search', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search NIKORA', hidden: true }, backdrop, panel);

    ui = { root, input, ph, field, status, list, chips, closeBtn };

    backdrop.addEventListener('click', () => close());
    closeBtn.addEventListener('click', () => close());
    input.addEventListener('input', onInput);
    root.addEventListener('keydown', onKeydown);
    list.addEventListener('click', (e) => { if (e.target.closest('a')) close(true); });
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('.nks__chip');
      if (!b) return;
      input.value = b.textContent;
      onInput();
      input.focus({ preventScroll: true });
    });

    document.body.appendChild(root);
    return ui;
  }

  function onInput() {
    const v = ui.input.value;
    ui.field.classList.toggle('has-value', !!v.trim());
    clearTimeout(debounceTimer);
    if (!v.trim()) {
      state.runToken++;
      state.lastRes = null;
      state.shown = new Set();
      renderResults([]);
      ui.chips.hidden = false;
      refreshStatus();
      return;
    }
    ui.chips.hidden = true;
    debounceTimer = setTimeout(() => run(v), CONFIG.debounceMs);
  }

  async function run(q) {
    const token = ++state.runToken;
    const res = await search(q);
    if (token !== state.runToken || !state.open) return;
    state.lastRes = res;
    renderResults(res.hits);
    refreshStatus();
  }

  function refreshStatus() {
    if (!ui) return;
    const q = ui.input.value.trim();
    const res = q ? state.lastRes : null;
    let msg = '';
    if (res) {
      const n = res.hits.length;
      msg = n ? `${n} ${n === 1 ? 'match' : 'matches'}` : 'No close matches — try describing your skin type or concern.';
    } else if (state.failed) {
      msg = 'Quick search is active.';
    } else if (!state.indexed && state.worker) {
      msg = `Warming up smart search${state.progress ? ` · ${state.progress}%` : '…'}`;
    } else if (state.indexed) {
      msg = 'Smart search understands natural phrases.';
    }
    ui.status.textContent = msg;
  }

  function renderResults(hits) {
    state.hits = hits;
    state.active = -1;
    ui.input.setAttribute('aria-expanded', String(hits.length > 0));
    ui.input.removeAttribute('aria-activedescendant');

    const prev = state.shown;
    const next = new Set();
    const frag = document.createDocumentFragment();

    hits.forEach(({ product: p }, i) => {
      next.add(p.id);
      const img = h('img', { class: 'nks__thumb', src: p.image || PLACEHOLDER_IMG, alt: '', width: '56', height: '56', loading: 'lazy', decoding: 'async' });
      img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER_IMG; };
      const sub = [p.brand, p.category].filter(Boolean).join(' · ');
      const link = h('a', { class: 'nks__link', href: CONFIG.productUrl(p.id), tabindex: '-1' },
        img,
        h('span', { class: 'nks__meta' },
          h('span', { class: 'nks__name' }, p.name),
          sub && h('span', { class: 'nks__sub' }, sub)),
        Number.isFinite(p.price) && h('span', { class: 'nks__price' }, fmt.format(p.price)));
      frag.append(h('li', {
        class: 'nks__item' + (prev.has(p.id) ? '' : ' is-new'),
        role: 'option', id: `nks-opt-${i}`, 'aria-selected': 'false', style: `--i:${i}`,
      }, link));
    });

    state.shown = next;
    ui.list.replaceChildren(frag);
  }

  function setActive(i) {
    const items = ui.list.children;
    if (items[state.active]) {
      items[state.active].classList.remove('is-active');
      items[state.active].setAttribute('aria-selected', 'false');
    }
    state.active = i;
    const el = items[i];
    if (!el) return;
    el.classList.add('is-active');
    el.setAttribute('aria-selected', 'true');
    ui.input.setAttribute('aria-activedescendant', el.id);
    el.scrollIntoView({ block: 'nearest' });
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const n = state.hits.length;
      if (!n) return;
      e.preventDefault();
      setActive(e.key === 'ArrowDown' ? (state.active + 1) % n : (state.active - 1 + n) % n);
    } else if (e.key === 'Enter' && e.target === ui.input) {
      const a = ui.list.children[state.active >= 0 ? state.active : 0]?.querySelector('a');
      if (a) { e.preventDefault(); a.click(); }
    } else if (e.key === 'Tab') {
      const f = [ui.input, ...(ui.chips.hidden ? [] : ui.chips.querySelectorAll('button')), ui.closeBtn];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }

  function lockScroll(on) {
    const de = document.documentElement;
    if (on) {
      de.style.setProperty('--nks-sw', `${window.innerWidth - de.clientWidth}px`);
      de.classList.add('nks-lock');
    } else {
      de.classList.remove('nks-lock');
    }
  }

  function open(prefill = '') {
    buildUI();
    if (state.open) return;
    state.open = true;
    state.lastFocus = document.activeElement;
    lockScroll(true);
    ui.root.hidden = false;
    void ui.root.offsetWidth; // flush so the enter transition runs
    ui.root.classList.add('is-open');

    ui.input.value = prefill;
    onInput();
    ui.input.focus({ preventScroll: true });

    const T = window.NikoraText;
    if (T?.typeCycle) typing = T.typeCycle(ui.ph, CONFIG.suggestions);
    else ui.ph.textContent = CONFIG.suggestions[0];

    warmup();
    refreshStatus();
  }

  function close(immediate = false) {
    if (!ui || !state.open) return;
    state.open = false;
    typing?.stop(); typing = null;
    clearTimeout(debounceTimer);
    ui.root.classList.remove('is-open');
    lockScroll(false);
    const finish = () => { if (!state.open) ui.root.hidden = true; };
    if (immediate) finish();
    else {
      setTimeout(finish, 230);
      state.lastFocus?.focus?.({ preventScroll: true });
    }
  }

  function warmup() {
    ensureProducts().then(() => { startWorker(); syncIndex(); });
  }

  /* ---------- Global triggers ---------- */
  const isTyping = (el) => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

  document.addEventListener('click', (e) => {
    if (e.target.closest?.('[data-nk-search-open]')) { e.preventDefault(); open(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); state.open ? close() : open(); }
    else if (e.key === '/' && !state.open && !isTyping(e.target)) { e.preventDefault(); open(); }
  });
  // Start the model download only on intent (hover/focus on the search button)
  const intent = (e) => {
    if (!warmed && e.target.closest?.('[data-nk-search-open]')) { warmed = true; warmup(); }
  };
  document.addEventListener('pointerover', intent, { passive: true });
  document.addEventListener('focusin', intent);
  window.addEventListener('pageshow', (e) => { if (e.persisted && state.open) close(true); });

  window.NikoraSearch = { open, close, search, warmup, refresh: () => ensureProducts(true), config: CONFIG };
})();
