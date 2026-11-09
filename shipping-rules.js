/**
 * shipping-rules.js - the ONE place that defines NIKORA's shipping rules. Loaded by every storefront page, the cart drawers and checkout.html.
 *
 *   Cost:      orders of $50.00 and above ship FREE (Express); below $50.00 a flat $4.99 is charged ONCE per order.
 *              The amount compared is the payable subtotal after any promo discount, before tax.
 *   Fulfilment (3PL pipeline, one package per order):
 *              NIKORA buys the products ("We Buy", sender identity NIKORA / NIKORA Store) from the Global Olive Young catalogue and has them delivered to
 *              our 3PL partner Delivered Korea (Suite A03231, Busan Hub, South Korea).
 *              1. Korean procurement + inspection + repacking at Suite A03231: 2-4 business days.
 *              2. International express (FedEx, DHL or K-Packet) from Busan: 5-10 business days.
 *              Total: about 7-14 business days from order to delivery.
 *   Every product, including products added later in the admin panel, uses this single pipeline.
 *
 * Keep these numbers identical to the server's own shipping calculation (the checkout API), which is the amount actually charged.
 */
(function (root) {
  'use strict';
  var FREE_AT = 50, FLAT = 4.99;
  var SUPPLIERS = {
    dk: { name: 'Delivered Korea', what: 'all products', hub: 'Suite A03231, Busan Hub', origin: 'Busan, South Korea', process: [2, 4], transit: [5, 10], carriers: 'FedEx, DHL or K-Packet' }
  };
  /* Kept for older callers: every id (1-10 and anything added later) resolves to the one 3PL. */
  var MAP = { '1': ['dk'], '2': ['dk'], '3': ['dk'], '4': ['dk'], '5': ['dk'], '6': ['dk'], '7': ['dk'], '8': ['dk'], '9': ['dk'], '10': ['dk'] };

  function money(n) { return '$' + Number(n).toFixed(2); }
  function suppliersOf() { return ['dk']; }
  function total(k) { var s = SUPPLIERS[k || 'dk']; return [s.process[0] + s.transit[0], s.process[1] + s.transit[1]]; }
  function rng(r) { return r[0] + '\u2013' + r[1]; }
  /** Shipping fee for a payable amount (after discount): 0 from $50.00, else 4.99. Cent-exact. */
  function cost(amount) { return Math.round((Number(amount) || 0) * 100) >= FREE_AT * 100 ? 0 : FLAT; }
  /** Package keys needed by a list of cart items: always ['dk'] for a non-empty cart (one package), [] for an empty one. */
  function packagesOf(items) { return (items && items.length) ? ['dk'] : []; }
  /** [{key, name, what, total:[min,max]}] for a cart. */
  function shipmentsOf(items) {
    return packagesOf(items).map(function (k) { return { key: k, name: SUPPLIERS[k].name, what: SUPPLIERS[k].what, total: total(k) }; });
  }
  var S = SUPPLIERS.dk;
  /** Short sentence used on cards, the cart drawer and checkout. */
  function pipelineShort() {
    return 'Ships from Busan Hub (' + S.name + ') \u00b7 est. delivery ' + rng(S.transit) + ' business days express';
  }
  /** One-line estimate for a product card / page. Never null: every product uses the 3PL pipeline. */
  function cardLine() { return 'Est. delivery: ' + rng(total('dk')) + ' business days'; }
  /** Product page "Shipping Details" policy (unified wording; the same text sits in product.html as the no-JS default). */
  function productLine() {
    return 'Ships from our Busan Hub (' + S.name + ') with ' + rng(S.process) + ' days processing and ' + rng(S.transit) + ' business days international express delivery (FedEx, DHL, K-Packet). ' +
      'Express shipping is FREE on orders of ' + money(FREE_AT) + '+, otherwise a ' + money(FLAT) + ' flat rate per order.';
  }
  /** One-line note under the cart drawer's free-shipping bar. */
  function cartNote(items) {
    if (!shipmentsOf(items).length) return '';
    return 'Ships from Busan Hub (' + S.name + ') \u00b7 est. delivery ' + rng(S.transit) + ' business days express';
  }
  /** Updates a cart drawer's free-shipping progress (text + bar + fulfilment note). payable = subtotal after discount. */
  function renderProgress(textEl, fillEl, payable, count, items, icons) {
    if (!textEl || !fillEl) return;
    var cents = Math.round((Number(payable) || 0) * 100), thr = FREE_AT * 100;
    var unlocked = cents >= thr, pct = Math.min(100, Math.round(cents / thr * 100));
    fillEl.style.width = pct + '%';
    textEl.classList.toggle('unlocked', unlocked);
    fillEl.classList.toggle('unlocked', unlocked);
    var bar = fillEl.parentNode;
    if (bar) { bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(pct)); bar.setAttribute('aria-label', 'Progress toward free Express shipping'); }
    var msg = unlocked ? 'You\u2019ve unlocked FREE Express Shipping!'
      : (count > 0 ? 'Add ' + money((thr - cents) / 100) + ' more to unlock FREE Express Shipping (otherwise ' + money(FLAT) + ' flat rate)'
        : 'FREE Express Shipping on orders of ' + money(FREE_AT) + '+ \u00b7 ' + money(FLAT) + ' flat rate below');
    textEl.innerHTML = (icons ? icons[unlocked ? 'check' : 'truck'] : '') + msg;
    var note = document.getElementById('ship-split-note');
    if (!note && textEl.parentNode && bar) { note = document.createElement('div'); note.id = 'ship-split-note'; note.className = 'ship-split-note'; textEl.parentNode.insertBefore(note, bar.nextSibling); }
    if (note) { var t = count > 0 ? cartNote(items) : ''; note.textContent = t; note.hidden = !t; }
  }

  if (typeof document !== 'undefined') {
    var st = document.createElement('style');
    st.textContent = '.ship-split-note{margin:8px 0 0;font-size:11.5px;line-height:1.5;color:var(--text-soft,#8a8493)}.ship-split-note[hidden]{display:none}' +
      '.nk-card .nk-ship{margin:-6px 0 12px;font-size:11px;line-height:1.4;color:var(--text-faint,#8a8493)}';
    (document.head || document.documentElement).appendChild(st);
  }
  root.NKShipping = { FREE_AT: FREE_AT, FLAT: FLAT, SUPPLIERS: SUPPLIERS, MAP: MAP, cost: cost, suppliersOf: suppliersOf, packagesOf: packagesOf, shipmentsOf: shipmentsOf,
    total: total, range: rng, cardLine: cardLine, productLine: productLine, cartNote: cartNote, pipelineShort: pipelineShort, renderProgress: renderProgress };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.NKShipping;
})(typeof window !== 'undefined' ? window : this);
