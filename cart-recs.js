/*
 * cart-recs.js - rule-based cart recommendations for the NIKORA cart drawer (index.html, catalog.html, product.html).
 *
 * Pattern: a lightweight "category compatibility" lookup, the same idea open-source storefront recommenders use
 * (a small table of  category-in-bag -> categories that go with it, scored per candidate), with no server and no ML.
 *
 *   EMPTY BAG   -> mode 'trending'    title "Trending K-Beauty Best Sellers"   (best sellers, rank 1 first, quick-add)
 *   ITEMS IN BAG-> mode 'contextual'  title "Frequently Bought Together"       (cross-sells chosen from the compatibility table)
 *
 *   Wand / Device in bag  -> compatible Serums, Essences, Ice Globe, Masks
 *   Toner / Essence in bag -> matching Toner Pads, soothing Moisturizers (creams), Serums, SPF
 *   ... full table in RULES below. Edit the table to change what goes with what: no other code needs to change.
 *
 * Usage (pages call this from renderCartRecs):
 *   var r = NKCartRecs.select({ cart: [{id,title,price,qty}], pool: [{id,name,price,category,img,bestseller,...}], current: CURRENT_PRODUCT, max: 8 });
 *   r.mode   'trending' | 'contextual'
 *   r.title  heading text for the section
 *   r.picks  products to show, best first (never contains anything already in the bag or the product being viewed)
 *
 * Load with a plain <script src="cart-recs.js"></script> before the page's main script. Works without bestsellers.js (it reads the
 * bestseller / flag fields itself) and never throws: on any error it falls back to the pool order.
 */
(function (root) {
  'use strict';

  var TITLE_TRENDING = 'Trending K-Beauty Best Sellers';
  var TITLE_CONTEXT = 'Frequently Bought Together';

  /* lib/products.js slug ids -> storefront ids '1'..'10' (the pages use the numeric ids) */
  var SLUGS = { 'cosrx-snail-mucin': '1', 'anua-heartleaf-toner': '2', 'boj-relief-sun': '3', 'skin1004-centella-ampoule': '4', 'laneige-lip-sleeping-mask': '5',
    'biodance-collagen-mask': '6', 'roundlab-birch-cream': '7', 'nikora-booster-wand': '8', 'nikora-cryo-globe': '9', 'nikora-glass-skin-bundle': '10' };

  /* a bundle in the bag already covers its parts, so those parts are never recommended again */
  var BUNDLE_PARTS = { '10': ['8', '1', '4', '6'] };    /* Glass Skin Ritual Set = Booster Wand + COSRX + Skin1004 + Biodance mask */

  /* ---- COMPATIBILITY TABLE: category in the bag -> categories that go with it, best match first ---- */
  var RULES = {
    'facial wand':          ['serums & ampoules', 'essences', 'cooling therapy', 'masks', 'serums & mists'],            /* device -> compatible serums / essences or the ice globe */
    'cooling therapy':      ['serums & ampoules', 'essences', 'moisturizers', 'masks', 'facial wand'],
    'beauty tech & serums': ['moisturizers', 'masks', 'sun care', 'facial wand'],
    'essences':             ['toners & pads', 'moisturizers', 'serums & ampoules', 'sun care', 'facial wand'],          /* essence -> matching pads or a soothing cream */
    'toners':               ['toners & pads', 'moisturizers', 'essences', 'serums & ampoules', 'sun care'],             /* toner -> matching pads or a soothing cream */
    'toners & pads':        ['moisturizers', 'serums & ampoules', 'essences', 'sun care', 'masks'],
    'serums & ampoules':    ['moisturizers', 'facial wand', 'sun care', 'masks', 'essences'],
    'serums & mists':       ['moisturizers', 'sun care', 'serums & ampoules', 'toners & pads'],
    'moisturizers':         ['sun care', 'serums & ampoules', 'masks', 'cooling therapy', 'facial wand'],
    'sun care':             ['toners', 'moisturizers', 'serums & ampoules', 'toners & pads', 'facial wand'],
    'masks':                ['moisturizers', 'serums & ampoules', 'toners & pads', 'cooling therapy'],
    'lip care':             ['masks', 'moisturizers', 'special care'],
    'special care':         ['moisturizers', 'serums & ampoules', 'masks', 'lip care'],
    'makeup & complexion':  ['sun care', 'toners & pads', 'moisturizers', 'masks'],
    'bundles & sets':       ['sun care', 'moisturizers', 'cooling therapy', 'toners & pads']
  };

  function key(id) { var k = String(id == null ? '' : id); return SLUGS[k] || k; }
  function cat(p) { return String((p && p.category) || '').trim().toLowerCase(); }
  function num(v) { if (v == null || v === '') return null; var n = Number(v); return isFinite(n) ? n : null; }

  /** { is, rank } for a product from bestseller / isBestseller / bestsellerRank / flag ("Bestseller #3"). */
  function best(p) {
    var B = root.NKBestsellers;
    if (B && typeof B.flagInfo === 'function') { var f = B.flagInfo(p); return { is: f.is, rank: f.rank }; }
    var flag = p && typeof p.flag === 'string' ? p.flag : '';
    var m = /bestseller/i.test(flag), r = num(p && p.bestsellerRank);
    if (r === null && m) { var x = /#\s*(\d+)/.exec(flag); if (x) r = Number(x[1]); }
    return { is: !!p && (p.bestseller === true || p.isBestseller === true || m), rank: r };
  }

  /** Orders products: best sellers first (rank 1, 2, 3 ..., unranked best sellers after), then everything else in catalog (id) order. */
  function byTrending(a, b) {
    var x = best(a), y = best(b);
    if (x.is !== y.is) return x.is ? -1 : 1;
    var rx = x.rank === null ? Infinity : x.rank, ry = y.rank === null ? Infinity : y.rank;
    if (rx !== ry) return rx < ry ? -1 : 1;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  }

  function byId(pool) { var m = {}; pool.forEach(function (p) { if (p) m[key(p.id)] = p; }); return m; }

  /** Ids the bag (and the product being viewed) already covers, including the parts of a bundle. */
  function coveredIds(cart, current) {
    var out = {};
    function add(id) { var k = key(id); out[k] = true; (BUNDLE_PARTS[k] || []).forEach(function (x) { out[x] = true; }); }
    (cart || []).forEach(function (c) { if (c) add(c.id); });
    if (current && current.id != null) add(current.id);
    return out;
  }

  function select(opts) {
    opts = opts || {};
    var cart = Array.isArray(opts.cart) ? opts.cart.filter(function (c) {
      if (!c) return false;
      var q = c.qty != null ? c.qty : c.quantity;
      return q == null || Number(q) > 0;                           /* a line with no quantity still counts; qty 0 does not */
    }) : [];
    var pool = (Array.isArray(opts.pool) ? opts.pool : []).filter(Boolean);
    var max = Math.max(1, Number(opts.max) || 8);
    var current = opts.current || null;
    try {
      var covered = coveredIds(cart, current);
      var candidates = pool.filter(function (p) { return !covered[key(p.id)]; });

      /* 1. EMPTY BAG: never "Frequently Bought Together" - show what is trending instead. */
      if (!cart.length) {
        return { mode: 'trending', title: TITLE_TRENDING, picks: candidates.slice().sort(byTrending).slice(0, max) };
      }

      /* 2. ITEMS IN THE BAG: score every candidate with the compatibility table. */
      var lookup = byId(pool), seeds = [];
      cart.forEach(function (c) { var p = lookup[key(c.id)]; if (p) seeds.push({ p: p, w: 1 }); });
      if (current && lookup[key(current.id)]) seeds.push({ p: lookup[key(current.id)], w: 0.5 });   /* the product page being viewed counts a little */

      var scored = candidates.map(function (p) {
        var s = 0, cc = cat(p);
        seeds.forEach(function (seed) {
          var rule = RULES[cat(seed.p)];
          var i = rule ? rule.indexOf(cc) : -1;
          if (i > -1) s += (rule.length - i) * 10 * seed.w;
        });
        if (best(p).is) s += 4;                                    /* proven sellers win ties between equally compatible products */
        return { p: p, s: s };
      });
      scored.sort(function (a, b) { return (b.s - a.s) || byTrending(a.p, b.p); });
      /* variety: at most 2 products per category in the first pass (so a wand gets serums AND the ice globe), then fill up in score order */
      var ordered = scored.map(function (x) { return x.p; }), first = [], rest = [], perCat = {};
      ordered.forEach(function (p) { var c = cat(p); perCat[c] = (perCat[c] || 0) + 1; (perCat[c] <= 2 ? first : rest).push(p); });
      return { mode: 'contextual', title: TITLE_CONTEXT, picks: first.concat(rest).slice(0, max) };
    } catch (e) {
      if (root.console && console.warn) console.warn('NKCartRecs: falling back to pool order', e);
      return { mode: cart.length ? 'contextual' : 'trending', title: cart.length ? TITLE_CONTEXT : TITLE_TRENDING, picks: pool.slice(0, max) };
    }
  }

  /** Updates the section heading text. Looks for #cart-recs-title (the span inside .cart-recs-head). */
  function setTitle(text) {
    var el = root.document && root.document.getElementById('cart-recs-title');
    if (el && el.textContent !== text) el.textContent = text;
  }

  root.NKCartRecs = { select: select, setTitle: setTitle, RULES: RULES, TITLE_TRENDING: TITLE_TRENDING, TITLE_CONTEXT: TITLE_CONTEXT };
})(typeof window !== 'undefined' ? window : this);