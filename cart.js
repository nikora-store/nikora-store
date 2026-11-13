/* =====================================================================
   NIKORA  cart.js  -  ONE shared cart drawer for every page
   ---------------------------------------------------------------------
   Include once on each page (after nav.js is fine, before </body> or in <head>):
       <script src="cart.js?v=20261112"></script>
   It injects its own styles + drawer markup (no cart HTML/CSS needed in the page),
   opens with window.openCart() (the header cart button in nav.js already calls it),
   and exposes window.addToCart(id, title, price), window.cartAdd, window.getCart,
   window.renderCart, window.closeCart and window.NikoraCart.
   Cart = localStorage 'nikora_cart' [{id,title,price,qty}] mirrored to Firebase /carts/<id>.
   Needs (auto-loaded from the same folder if the page lacks them): cart-recs.js, shipping-rules.js.
   Empty bag: "Trending K-Beauty Best Sellers" (auto-scrolling strip).
   Filled bag: "You Might Also Like" - ONE paired product at a time with < > arrows.
   ===================================================================== */
(function(){
'use strict';
if(window.NikoraCart && window.NikoraCart.version) return;       /* already loaded */
var NKC_CSS = "#cart-drawer{--nkc-card-bg:var(--card-bg,rgba(255,255,255,0.65)); --nkc-card-border:var(--card-border,rgba(230,220,210,0.6)); --nkc-text:var(--text,#1A1615); --nkc-text-soft:var(--text-soft,rgba(26,22,21,0.62)); --nkc-text-faint:var(--text-faint,rgba(26,22,21,0.4)); --nkc-gold:var(--gold,#C59B56); --nkc-rose:var(--rose,#D81E5B); --nkc-line:var(--line,rgba(26,22,21,0.1)); --nkc-surface-raised:var(--surface-raised,rgba(255,255,255,0.85)); --nkc-surface-tint:var(--surface-tint,rgba(26,22,21,0.04)); --nkc-success:var(--success,#2E6B4F);}\n[data-theme=\"dark\"] #cart-drawer{--nkc-card-bg:var(--card-bg,rgba(25,20,32,0.55)); --nkc-card-border:var(--card-border,rgba(255,255,255,0.08)); --nkc-text:var(--text,#F7F4F0); --nkc-text-soft:var(--text-soft,rgba(247,244,240,0.64)); --nkc-text-faint:var(--text-faint,rgba(247,244,240,0.38)); --nkc-gold:var(--gold,#E5BA73); --nkc-rose:var(--rose,#FF527B); --nkc-line:var(--line,rgba(255,255,255,0.09)); --nkc-surface-raised:var(--surface-raised,rgba(30,25,38,0.9)); --nkc-surface-tint:var(--surface-tint,rgba(255,255,255,0.05)); --nkc-success:var(--success,#3CB878);}\n/* ---------------- CART DRAWER ---------------- */\n.cart-overlay{\n  position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1900;\n  opacity:0; visibility:hidden; pointer-events:none; transition:all 0.3s ease;\n}\n.cart-overlay.active{opacity:1; visibility:visible; pointer-events:auto;}\n#cart-drawer{\n  position:fixed; top:0; right:0; bottom:0; width:min(420px,100%); background:var(--nkc-surface-raised);\n  z-index:1950; transform:translateX(100%); transition:transform .35s cubic-bezier(.2,.8,.2,1);\n  display:flex; flex-direction:column; border-left:1px solid var(--nkc-card-border);\n  pointer-events:none; backdrop-filter:blur(20px);\n}\n#cart-drawer.active{transform:translateX(0); pointer-events:auto;}\n.cart-head{padding:24px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--nkc-line); flex-shrink:0;}\n.cart-head h3{font-family:'Playfair Display',serif; font-size:20px; margin:0; font-weight:500;}\n.cart-close-btn{\n  width:38px; height:38px; border-radius:50%; border:1px solid var(--nkc-line); background:var(--nkc-card-bg);\n  display:flex; align-items:center; justify-content:center; color:var(--nkc-text); cursor:pointer;\n  transition:background .2s ease, border-color .2s ease, transform .15s ease;\n}\n.cart-close-btn:hover{background:var(--nkc-line); border-color:var(--nkc-gold); transform:rotate(90deg);}\n#cart-drawer svg{fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;}\n.cart-close-btn svg{width:16px; height:16px; stroke-width:2.2;}\n#cart-drawer{overflow:hidden;}\n.ship-progress-wrap{padding:16px 24px; border-bottom:1px solid var(--nkc-line); flex-shrink:0;}\n.ship-progress-text{display:flex; align-items:center; gap:6px; font-size:12px; color:var(--nkc-text-soft); margin-bottom:8px; line-height:1.4;}\n.ship-progress-text svg{width:14px; height:14px; stroke:var(--nkc-gold);}\n.ship-progress-text.unlocked{color:var(--nkc-success); font-weight:600;}\n.ship-progress-text.unlocked svg{stroke:var(--nkc-success);}\n.ship-progress-bar{height:6px; border-radius:100px; background:var(--nkc-line); overflow:hidden;}\n.ship-progress-fill{height:100%; background:linear-gradient(90deg,var(--nkc-gold),var(--nkc-rose)); width:0%; transition:width .4s ease;}\n.ship-progress-fill.unlocked{background:linear-gradient(90deg,var(--nkc-success),var(--nkc-gold));}\n.cart-items{flex:0 1 auto; overflow-y:auto; padding:6px 24px; min-height:0;}\n.cart-item{display:flex; gap:14px; padding:16px 0; border-bottom:1px solid var(--nkc-line);}\n.ci-thumb{width:62px; height:62px; border-radius:12px; overflow:hidden; flex-shrink:0; background:linear-gradient(135deg,var(--nkc-surface-tint),var(--nkc-card-bg)); border:1px solid var(--nkc-line); display:flex; align-items:center; justify-content:center;}\n.ci-thumb img{width:100%; height:100%; object-fit:cover;}\n.ci-thumb svg{width:22px; height:22px; color:var(--nkc-text-faint); stroke-width:1.6;}\n.ci-info{flex:1; min-width:0;}\n.ci-top{display:flex; align-items:flex-start; justify-content:space-between; gap:10px;}\n.ci-title{font-size:13px; font-weight:600; line-height:1.35;}\n.ci-price{font-size:12px; color:var(--nkc-text-soft); margin-top:3px;}\n.ci-bottom{display:flex; align-items:center; justify-content:space-between; margin-top:10px;}\n.qty-ctrl{display:inline-flex; align-items:center; gap:2px; border:1px solid var(--nkc-line); border-radius:100px; padding:2px;}\n.qty-ctrl button{width:26px; height:26px; border-radius:50%; border:none; background:none; color:var(--nkc-text); display:flex; align-items:center; justify-content:center; transition:background .2s ease;}\n.qty-ctrl button:hover{background:var(--nkc-line);}\n.qty-ctrl button svg{width:12px; height:12px; stroke-width:2.4;}\n.qty-ctrl span{font-size:12.5px; font-weight:600; min-width:22px; text-align:center;}\n.ci-line-total{font-size:13px; font-weight:700; color:var(--nkc-gold);}\n.ci-remove{width:30px; height:30px; flex-shrink:0; border-radius:50%; border:1px solid var(--nkc-line); background:none; color:var(--nkc-text-faint); display:flex; align-items:center; justify-content:center; transition:color .2s ease, border-color .2s ease, background .2s ease;}\n.ci-remove svg{width:14px; height:14px;}\n.ci-remove:hover{color:#e11d48; border-color:rgba(225,29,72,.5); background:rgba(225,29,72,.08);}\n.cart-empty{padding:28px 24px 22px; text-align:center; color:var(--nkc-text-soft); font-size:13.5px; line-height:1.55;}\n.cart-foot{padding:18px 24px 22px; border-top:1px solid var(--nkc-line); flex-shrink:0;}\n\n/* ---------------- IN-CART RECOMMENDATIONS: auto-scrolling horizontal carousel ---------------- */\n.cart-recs-section{border-top:1px solid var(--nkc-line); padding:16px 24px 4px; flex-shrink:0;}\n.cart-recs-head{display:flex; align-items:center; gap:7px; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--nkc-text-faint); margin-bottom:12px;}\n.cart-recs-head svg{width:14px; height:14px; stroke:var(--nkc-gold);}\n.cart-recs-grid{\n  display:flex; gap:12px; overflow-x:auto; overflow-y:hidden; padding-bottom:14px;\n  -webkit-overflow-scrolling:touch; overscroll-behavior-x:contain;\n  scrollbar-width:thin; scrollbar-color:var(--nkc-line) transparent;\n}\n.cart-recs-grid::-webkit-scrollbar{height:5px;}\n.cart-recs-grid::-webkit-scrollbar-track{background:transparent;}\n.cart-recs-grid::-webkit-scrollbar-thumb{background:var(--nkc-line); border-radius:100px;}\n.cart-rec-card{\n  flex:0 0 130px; background:var(--nkc-card-bg); border:1px solid var(--nkc-card-border);\n  border-radius:14px; padding:10px; display:flex; flex-direction:column; gap:7px;\n}\n.cart-rec-thumb{width:100%; aspect-ratio:4/3; border-radius:10px; overflow:hidden; background:linear-gradient(135deg,var(--nkc-surface-tint),var(--nkc-card-bg)); display:flex; align-items:center; justify-content:center;}\n.cart-rec-thumb img{width:100%; height:100%; object-fit:cover; pointer-events:none; -webkit-user-drag:none;}\n.cart-rec-thumb svg{width:24px; height:24px; color:var(--nkc-text-faint); stroke-width:1.6;}\n.cart-rec-title{\n  font-size:11.5px; font-weight:600; line-height:1.35; color:var(--nkc-text); min-height:2.7em;\n  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;\n}\n.cart-rec-price{font-size:12.5px; font-weight:700; color:var(--nkc-gold); font-family:'Playfair Display',serif;}\n.cart-rec-add{\n  display:flex; align-items:center; justify-content:center; gap:4px; margin-top:auto;\n  padding:7px 8px; border-radius:100px; border:1px solid var(--nkc-gold); background:transparent; color:var(--nkc-gold);\n  font-size:10.5px; font-weight:700; letter-spacing:.02em; cursor:pointer; transition:background .2s ease, color .2s ease;\n}\n.cart-rec-add svg{width:11px; height:11px; stroke-width:2.6;}\n.cart-recs-nav{margin-left:auto; display:flex; gap:6px;}\n.cart-recs-nav[hidden]{display:none;}\n.cart-recs-arrow{width:28px; height:28px; border-radius:50%; border:1px solid var(--nkc-line); background:var(--nkc-card-bg); color:var(--nkc-text); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; padding:0; transition:border-color .2s ease, background .2s ease, color .2s ease, opacity .2s ease;}\n.cart-recs-arrow svg{width:14px; height:14px; stroke:currentColor; stroke-width:2.2;}\n.cart-recs-arrow:hover:not(:disabled){border-color:var(--nkc-gold); color:var(--nkc-gold);}\n.cart-recs-arrow:focus-visible{outline:2px solid var(--nkc-gold); outline-offset:2px;}\n.cart-recs-arrow:disabled{opacity:.35; cursor:default;}\n.cart-rec-add:hover{background:var(--nkc-gold); color:#241c0f;}\n/* \"You Might Also Like\": ONE product at a time (horizontal card), paged with the < > arrows */\n.cart-recs-count{align-self:center; font-size:11px; font-weight:600; letter-spacing:.04em; color:var(--nkc-text-faint); min-width:30px; text-align:center; font-variant-numeric:tabular-nums;}\n.cart-recs-grid[data-single=\"1\"]{gap:0; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none;}\n.cart-recs-grid[data-single=\"1\"]::-webkit-scrollbar{display:none;}\n.cart-recs-grid[data-single=\"1\"] .cart-rec-card{flex:0 0 100%; box-sizing:border-box; scroll-snap-align:start; scroll-snap-stop:always; flex-direction:row; align-items:center; gap:14px; padding:12px;}\n.cart-recs-grid[data-single=\"1\"] .cart-rec-thumb{flex:0 0 92px; width:92px; aspect-ratio:1/1;}\n.cart-rec-info{flex:1; min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:6px;}\n.cart-recs-grid[data-single=\"1\"] .cart-rec-title{font-size:13px; min-height:0;}\n.cart-recs-grid[data-single=\"1\"] .cart-rec-price{font-size:15px;}\n.cart-recs-grid[data-single=\"1\"] .cart-rec-add{margin-top:2px; padding:8px 18px; font-size:11.5px;}\n@media (prefers-reduced-motion:reduce){ .cart-recs-grid[data-single=\"1\"]{scroll-behavior:auto;} }\n.cart-sub-row{display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:10px; color:var(--nkc-text-soft);}\n.cart-sub-row strong{color:var(--nkc-text); font-size:17px;}\n.cart-checkout{\n  width:100%; padding:16px; border-radius:100px; border:none; background:var(--nkc-gold); color:#241c0f;\n  font-weight:700; font-size:13.5px; margin-bottom:14px; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;\n}\n.cart-checkout svg{width:15px; height:15px;}\n.cart-recs-done{font-size:12.5px; color:var(--nkc-text-soft); line-height:1.5; padding:4px 0 16px;}\n\n/* ---------------- PROMO CODE (cart footer) ---------------- */\n.cart-sub-row[hidden], .promo-active[hidden]{display:none;}\n.promo-box{margin-bottom:12px;}\n.promo-toggle{\n  width:100%; display:flex; align-items:center; gap:8px; background:none; border:none; padding:2px 0 10px;\n  color:var(--nkc-text-soft); font-size:12.5px; font-weight:600; cursor:pointer; text-align:left;\n}\n.promo-toggle:hover{color:var(--nkc-text);}\n.promo-toggle svg{width:15px; height:15px; stroke:var(--nkc-gold);}\n.promo-toggle .promo-chev{margin-left:auto; width:14px; height:14px; stroke:var(--nkc-text-faint); transition:transform .25s ease;}\n.promo-box.open .promo-chev{transform:rotate(180deg);}\n.promo-body{display:none; padding-bottom:6px;}\n.promo-box.open .promo-body{display:block;}\n.promo-form{display:flex; gap:8px;}\n.promo-form input{\n  flex:1; min-width:0; padding:11px 16px; border-radius:100px; border:1px solid var(--nkc-line);\n  background:var(--nkc-card-bg); color:var(--nkc-text); font:inherit; font-size:13px; letter-spacing:.06em; text-transform:uppercase;\n  outline:none; transition:border-color .2s ease;\n}\n.promo-form input::placeholder{text-transform:none; letter-spacing:0; color:var(--nkc-text-faint);}\n.promo-form input:focus{border-color:var(--nkc-gold);}\n.promo-apply{\n  display:inline-flex; align-items:center; gap:6px; padding:0 18px; border-radius:100px; border:1px solid var(--nkc-gold);\n  background:transparent; color:var(--nkc-gold); font-size:12.5px; font-weight:700; cursor:pointer; transition:background .2s ease, color .2s ease;\n}\n.promo-apply svg{width:14px; height:14px; stroke-width:2.4;}\n.promo-apply:hover{background:var(--nkc-gold); color:#241c0f;}\n.promo-msg{font-size:11.5px; line-height:1.4; min-height:0; margin-top:6px;}\n.promo-msg:empty{display:none;}\n.promo-msg.err{color:#e11d48;}\n.promo-msg.ok{color:var(--nkc-success);}\n.promo-active{display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 8px 8px 12px; border-radius:100px; border:1px solid var(--nkc-success); background:rgba(46,107,79,.08);}\n.promo-chip{display:inline-flex; align-items:center; gap:8px; font-size:12px; color:var(--nkc-text); min-width:0;}\n.promo-chip svg{width:15px; height:15px; stroke:var(--nkc-success);}\n.promo-chip b{letter-spacing:.06em;}\n.promo-chip em{font-style:normal; color:var(--nkc-success); font-weight:700;}\n.promo-remove{display:inline-flex; align-items:center; gap:4px; padding:5px 10px; border-radius:100px; border:1px solid var(--nkc-line); background:var(--nkc-card-bg); color:var(--nkc-text-soft); font-size:11px; font-weight:700; cursor:pointer; flex-shrink:0;}\n.promo-remove svg{width:11px; height:11px; stroke-width:2.6;}\n.promo-remove:hover{color:#e11d48; border-color:rgba(225,29,72,.5);}\n.cart-discount-row span:last-child{color:var(--nkc-success); font-weight:700;}\n.cart-total-row{margin-top:-2px; padding-top:8px; border-top:1px dashed var(--nkc-line);}\n.cart-total-row span{color:var(--nkc-text); font-weight:600;}\n.cart-total-row strong{color:var(--nkc-gold);}\n@media (max-height:900px){ #cart-drawer .trust-badges{display:none;} }\n@media (hover:none){ .promo-form input{font-size:16px;} }\n#cart-drawer .trust-badges{display:flex; flex-wrap:wrap; gap:10px;}\n#cart-drawer .trust-badge{display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; color:var(--nkc-text-soft); background:var(--nkc-surface-tint); border:1px solid var(--nkc-line); border-radius:100px; padding:7px 12px;}\n#cart-drawer .trust-badge svg{width:14px;height:14px; stroke:var(--nkc-gold); fill:none; flex-shrink:0;}\n.nkc-toast{position:fixed; left:50%; bottom:28px; transform:translate(-50%,20px); background:#1A1615; color:#fff; padding:12px 20px; border-radius:100px; font-size:13px; z-index:99999; opacity:0; pointer-events:none; transition:opacity .25s ease, transform .25s ease; max-width:90vw;}\n.nkc-toast.show{opacity:1; transform:translate(-50%,0);}#cart-drawer .cart-recs-section{overflow:hidden; min-width:0; padding:14px 20px 12px;}#cart-drawer .cart-recs-head{display:flex; align-items:center; flex-wrap:nowrap; gap:8px; min-width:0; margin-bottom:10px;}#cart-drawer .cart-recs-head>span{flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}#cart-drawer .cart-recs-head>svg{flex:none;}#cart-drawer .cart-recs-nav{flex:none; margin-left:auto; display:flex; align-items:center; gap:6px;}#cart-drawer .cart-recs-arrow{flex:none; width:32px; height:32px; touch-action:manipulation; -webkit-tap-highlight-color:transparent;}#cart-drawer .cart-recs-arrow svg{width:16px; height:16px;}#cart-drawer .cart-recs-grid{min-width:0; max-width:100%; padding-bottom:4px; overscroll-behavior-x:contain;}#cart-drawer .cart-recs-grid[data-single=\"1\"]{display:flex; gap:0; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory; scrollbar-width:none; -ms-overflow-style:none;}#cart-drawer .cart-recs-grid[data-single=\"1\"] .cart-rec-card{flex:0 0 100%; width:100%; min-width:0; max-width:100%; box-sizing:border-box; scroll-snap-align:start; scroll-snap-stop:always; display:flex; flex-direction:row; align-items:center; gap:12px; padding:10px; overflow:hidden;}#cart-drawer .cart-recs-grid[data-single=\"1\"] .cart-rec-thumb{flex:0 0 84px; width:84px; height:84px; aspect-ratio:auto; border-radius:10px;}#cart-drawer .cart-rec-info{flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:stretch; gap:5px;}#cart-drawer .cart-recs-grid[data-single=\"1\"] .cart-rec-title{font-size:12.5px; line-height:1.35; min-height:0; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; word-break:break-word;}#cart-drawer .cart-recs-grid[data-single=\"1\"] .cart-rec-price{font-size:14px;}#cart-drawer .cart-recs-grid[data-single=\"1\"] .cart-rec-add{width:100%; margin-top:2px; padding:8px 12px; min-height:34px; font-size:11.5px; white-space:nowrap;}@media (max-width:420px){#cart-drawer .cart-recs-section{padding:12px 14px 10px;} #cart-drawer .cart-recs-grid[data-single=\"1\"] .cart-rec-thumb{flex-basis:72px; width:72px; height:72px;} #cart-drawer .cart-recs-arrow{width:36px; height:36px;}}";
var NKC_HTML = "<div class=\"cart-overlay\" id=\"cart-overlay\"></div>\n<div id=\"cart-drawer\" aria-label=\"Shopping cart\">\n  <div class=\"cart-head\">\n    <h3>Your Bag</h3>\n    <button type=\"button\" class=\"cart-close-btn\" id=\"close-cart-btn\" aria-label=\"Close cart\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></button>\n  </div>\n  <div class=\"ship-progress-wrap\">\n    <div class=\"ship-progress-text\" id=\"ship-progress-text\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M1 3h15v13H1z\"/><path d=\"M16 8h4l3 3v5h-7V8z\"/><circle cx=\"5.5\" cy=\"18.5\" r=\"2.5\"/><circle cx=\"18.5\" cy=\"18.5\" r=\"2.5\"/></svg>FREE Express Shipping on orders of $50.00+ &middot; $4.99 flat rate below</div>\n    <div class=\"ship-progress-bar\"><div class=\"ship-progress-fill\" id=\"ship-progress-fill\"></div></div>\n  </div>\n  <div class=\"cart-items\" id=\"cart-items-list\"></div>\n  <div class=\"cart-recs-section\" id=\"cart-recs-section\">\n    <div class=\"cart-recs-head\">\n      <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M20 7h-9M14 17H5M17 3l3 4-3 4M7 21l-3-4 3-4\"/></svg>\n      <span id=\"cart-recs-title\">Trending K-Beauty Best Sellers</span>\n      <div class=\"cart-recs-nav\" id=\"cart-recs-nav\" role=\"group\" aria-label=\"Browse suggestions\" hidden>\n        <button type=\"button\" class=\"cart-recs-arrow\" data-recs-nav=\"-1\" aria-label=\"Previous suggestion\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M15 6l-6 6 6 6\"/></svg></button>\n        <span class=\"cart-recs-count\" id=\"cart-recs-count\" aria-live=\"polite\"></span>\n        <button type=\"button\" class=\"cart-recs-arrow\" data-recs-nav=\"1\" aria-label=\"Next suggestion\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9 6l6 6-6 6\"/></svg></button>\n      </div>\n    </div>\n    <div class=\"cart-recs-grid\" id=\"cart-recs-grid\"></div>\n  </div>\n  <div class=\"cart-foot\">\n    <div class=\"promo-box\" id=\"promo-box\">\n      <button type=\"button\" class=\"promo-toggle\" id=\"promo-toggle\" aria-expanded=\"false\" aria-controls=\"promo-body\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.4\"/></svg><span>Have a promo code?</span><svg class=\"promo-chev\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\"/></svg></button>\n      <div class=\"promo-body\" id=\"promo-body\">\n        <div class=\"promo-form\">\n          <input type=\"text\" id=\"promo-input\" placeholder=\"Enter code\" autocomplete=\"off\" autocapitalize=\"characters\" spellcheck=\"false\" maxlength=\"24\" aria-label=\"Promo code\">\n          <button type=\"button\" class=\"promo-apply\" id=\"promo-apply\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/></svg>Apply</button>\n        </div>\n      </div>\n      <div class=\"promo-msg\" id=\"promo-msg\" role=\"status\" aria-live=\"polite\"></div>\n      <div class=\"promo-active\" id=\"promo-active\" hidden></div>\n    </div>\n    <div class=\"cart-sub-row\"><span>Subtotal</span><strong id=\"cart-subtotal\">$0.00</strong></div>\n    <div class=\"cart-sub-row cart-discount-row\" id=\"cart-discount-row\" hidden><span id=\"cart-discount-label\"></span><span id=\"cart-discount-amount\"></span></div>\n    <div class=\"cart-sub-row cart-total-row\" id=\"cart-total-row\" hidden><span>Total</span><strong id=\"cart-total\">$0.00</strong></div>\n    <button type=\"button\" class=\"cart-checkout\" id=\"checkout-btn\" onclick=\"window.location.href='checkout.html'\">\n      <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 018 0v4\"/></svg>\n      Secure Checkout\n    </button>\n    <div class=\"trust-badges\" id=\"cart-trust-badges\"></div>\n  </div>\n</div>";

/* ---- environment: storage, Firebase (reuses the page's app when it has one), toast ---- */
var safeStorage = {
  getItem: function(key){ try { return localStorage.getItem(key); } catch(e) { return window['_mem_' + key] || null; } },
  setItem: function(key, val){ try { localStorage.setItem(key, val); } catch(e) { window['_mem_' + key] = val; } }
};
var NK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCCHdCGRQCiKdeHRkC4e6bnvrMwUIq80TY",
  authDomain: "nikora-store.firebaseapp.com",
  databaseURL: "https://nikora-store-default-rtdb.firebaseio.com",
  projectId: "nikora-store",
  storageBucket: "nikora-store.firebasestorage.app",
  messagingSenderId: "840991674151",
  appId: "1:840991674151:web:f656f83210d412684ee302",
  measurementId: "G-EDM84G1JPG"
};
var firebaseReady = false, db = null;
var NK_BASE = (function(){ var s = document.currentScript; return (s && s.src) ? s.src.replace(/[^\/]*(\?.*)?$/, '') : ''; })();

function nkLoadScript(src, cb){
  var s = document.createElement('script'); s.src = src; s.async = false;
  s.onload = function(){ cb(true); }; s.onerror = function(){ cb(false); };
  document.head.appendChild(s);
}
function nkEnsureFirebase(cb){
  function use(){
    try{
      var app = null; try{ app = firebase.app(); }catch(e){}          /* the page's own default app, if it has one */
      if(!app) app = firebase.initializeApp(NK_FIREBASE_CONFIG, 'nikora-cart');   /* otherwise a private named app (never clashes with the page) */
      db = app.database(); firebaseReady = true;
    }catch(e){ console.warn('Firebase unavailable \u2014 cart stays on local data.', e); firebaseReady = false; }
    cb();
  }
  var V = 'https://www.gstatic.com/firebasejs/10.8.0/';
  if(window.firebase && firebase.database){ use(); return; }
  function loadDb(){ if(window.firebase && firebase.database){ use(); } else { nkLoadScript(V + 'firebase-database-compat.js', function(){ use(); }); } }
  if(window.firebase && firebase.initializeApp){ loadDb(); }
  else { nkLoadScript(V + 'firebase-app-compat.js', function(ok){ if(!ok){ cb(); return; } loadDb(); }); }
}
/* sibling scripts the cart relies on: loaded automatically from the same folder if the page did not include them */
function nkEnsureDeps(cb){
  var need = [];
  if(!window.NKCartRecs) need.push('cart-recs.js?v=20261109');
  if(!window.NKShipping) need.push('shipping-rules.js?v=20261110');
  (function next(){
    if(!need.length){ cb(); return; }
    nkLoadScript(NK_BASE + need.shift(), function(){ next(); });
  })();
}
function nkPatchRecRules(){
  var R = window.NKCartRecs && window.NKCartRecs.RULES; if(!R || R.__nkPatched) return;
  var MASK = 'beauty tech & masks';                               /* teach cart-recs.js the LED mask category */
  R[MASK] = ['serums & ampoules', 'essences', 'moisturizers', 'cooling therapy', 'facial wand', 'sun care'];
  ['facial wand', 'cooling therapy', 'serums & ampoules', 'essences', 'moisturizers', 'toners & pads', 'masks'].forEach(function(k){ if(R[k] && R[k].indexOf(MASK) < 0) R[k].push(MASK); });
  try{ Object.defineProperty(R, '__nkPatched', { value: true }); }catch(e){}
}
var NKC_TOAST_TIMER;
function nkToast(msg, ms){
  try{
    if(typeof window.showToast === 'function' && document.getElementById('toast') && document.getElementById('toast-text')){ window.showToast(msg, ms); return; }
  }catch(e){}
  var t = document.getElementById('nkc-toast');
  if(!t){ t = document.createElement('div'); t.id = 'nkc-toast'; t.className = 'nkc-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(NKC_TOAST_TIMER); NKC_TOAST_TIMER = setTimeout(function(){ t.classList.remove('show'); }, ms || 2600);
}

function trustBadgesHtml(){
  return (
    '<span class="trust-badge"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>30-Day Risk-Free Trial</span>' +
    '<span class="trust-badge"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Free Express Shipping</span>' +
    '<span class="trust-badge"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z"/></svg>Loss &amp; Damage Protection</span>'
  );
}

/* ---- promo box events (delegated) ---- */
function nkBindPromo(){
  document.addEventListener('click', function(e){
    var t = e.target; if(!t || !t.closest) return;
    if(t.closest('#promo-toggle')){ NK_PROMO_OPEN = !NK_PROMO_OPEN; var b = document.getElementById('promo-box'); if(b) b.classList.toggle('open', NK_PROMO_OPEN); document.getElementById('promo-toggle').setAttribute('aria-expanded', String(NK_PROMO_OPEN)); if(NK_PROMO_OPEN){ var i = document.getElementById('promo-input'); if(i) setTimeout(function(){ i.focus(); }, 30); } return; }
    if(t.closest('#promo-apply')){ nkPromoApply(); return; }
    if(t.closest('#promo-remove')){ nkPromoRemove(); return; }
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && e.target && e.target.id === 'promo-input'){ e.preventDefault(); nkPromoApply(); }
  });
}


/* ================= UNIFIED CART MODULE (identical on index / catalog / product) =================
   - Cart lives in localStorage 'nikora_cart' as [{id,title,price,qty}] and is mirrored to
     Firebase '/carts/<cartId>' (last-write-wins by timestamp) so every page and tab stays in sync.
   - Thumbnails + "Frequently Bought Together" come live from Firebase '/products'.
   - Drawer close (X button, overlay, Escape) uses delegated listeners so it can never be lost
     when the drawer's contents are re-rendered. */
var NK_FREE_SHIP = 50;
var NK_MAX_RECS = 8;
var NK_SCROLL_SPEED = 28;   /* carousel auto-scroll, px per second */
var NK_ICONS = {
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>'
};

/* Fallback pool so the recommendations strip is NEVER empty (used until Firebase '/products' answers, or if it fails/is empty). */
var NK_FALLBACK = [
  { id:'1', name:"COSRX Advanced Snail 96 Mucin Power Essence", brand:"COSRX", price:25.00, category:"Essences", img:'https://images.unsplash.com/photo-1556228722-d119f018d480?w=400', flag:"Bestseller #3", bestseller:true, bestsellerRank:3 },
  { id:'2', name:"Anua Heartleaf 77% Soothing Toner 250ml", brand:"Anua", price:22.00, category:"Toners", img:'https://images.unsplash.com/photo-1608248597261-83325b6ba584?w=400' },
  { id:'3', name:"Beauty of Joseon Relief Sun: Rice + Probiotics SPF50+", brand:"Beauty of Joseon", price:18.00, category:"Sun Care", img:'https://images.unsplash.com/photo-1567928254714-3a216c5b969d?w=400', flag:"Bestseller #4", bestseller:true, bestsellerRank:4 },
  { id:'4', name:"Skin1004 Madagascar Centella Ampoule 100ml", brand:"Skin1004", price:24.00, category:"Serums & Ampoules", img:'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400' },
  { id:'5', name:"Laneige Lip Sleeping Mask Berry", brand:"Laneige", price:24.00, category:"Lip Care", img:'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400' },
  { id:'6', name:"Biodance Bio-Collagen Real Deep Mask Set", brand:"Biodance", price:19.00, category:"Masks", img:'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400' },
  { id:'7', name:"Round Lab Birch Juice Moisturizing Cream 80ml", brand:"Round Lab", price:28.00, category:"Moisturizers", img:'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400' },
  { id:'8', name:"NIKORA Electroporation & LED Skin Booster Wand", brand:"NIKORA Beauty Tech", price:129.00, category:"Facial Wand", img:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400', flag:"Bestseller #1", bestseller:true, bestsellerRank:1 },
  { id:'9', name:"NIKORA Cryo-Cooling Ice Globe Sculptor", brand:"NIKORA Beauty Tech", price:39.00, category:"Cooling Therapy", img:'https://images.unsplash.com/photo-1512290900673-10705a3962d3?w=400' },
  { id:'10', name:"The NIKORA x K-Beauty Glass Skin Ritual Set", brand:"NIKORA Bundles", price:159.00, category:"Bundles & Sets", img:'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', flag:"Bestseller #2 Bundle", bestseller:true, bestsellerRank:2 },
  { id:'11', name:"Medicube Glutathione Glow Serum 50ml", brand:"Medicube", price:32.00, category:"Serums & Ampoules", img:'' },
  { id:'12', name:"Torriden DIVE-IN Low Molecule Hyaluronic Acid Serum 50ml", brand:"Torriden", price:23.00, category:"Serums & Ampoules", img:'' },
  { id:'13', name:"Mixsoon Bean Essence 50ml", brand:"Mixsoon", price:28.00, category:"Essences", img:'', flag:"Bestseller", bestseller:true, bestsellerRank:null },
  { id:'14', name:"Numbuzin No.3 Skin Softening Serum 50ml", brand:"Numbuzin", price:26.00, category:"Serums & Ampoules", img:'' },
  { id:'15', name:"I'm From Rice Toner 150ml", brand:"I'm From", price:27.00, category:"Toners", img:'' },
  { id:'16', name:"Medicube Zero Pore Pad 2.0 (70 pads)", brand:"Medicube", price:24.00, category:"Toners & Pads", img:'' },
  { id:'17', name:"Kahi Wrinkle Bounce Multi Balm 9g", brand:"Kahi", price:29.00, category:"Special Care", img:'' },
  { id:'18', name:"MEDIHEAL Madecassoside Trace Toner Pad (100 Pads)", brand:"MEDIHEAL", price:24.00, category:"Toners & Pads", img:'', flag:"Bestseller", bestseller:true, bestsellerRank:null },
  { id:'19', name:"d'Alba White Truffle First Spray Serum 100ml", brand:"d'Alba", price:28.00, category:"Serums & Mists", img:'', flag:"Bestseller", bestseller:true, bestsellerRank:null },
  { id:'20', name:"VT Cosmetics Reedle Shot 100 Micro-Needling Booster 50ml", brand:"VT Cosmetics", price:34.00, category:"Beauty Tech & Serums", img:'', flag:"Bestseller", bestseller:true, bestsellerRank:null },
  { id:'21', name:"Anua Niacinamide 10% + TXA 4% Dark Spot Correcting Serum 30ml", brand:"Anua", price:22.00, category:"Serums & Ampoules", img:'' },
  { id:'22', name:"Medicube Collagen Night Wrapping Peel-Off Mask 75ml", brand:"Medicube", price:21.00, category:"Masks", img:'' },
  { id:'23', name:"TIRTIR Mask Fit Red Cushion Foundation (Full Range)", brand:"TIRTIR", price:25.00, category:"Makeup & Complexion", img:'' },
  { id:'24', name:"NIKORA Hello Face LED Therapy Mask (Red Light Therapy for Face & Home Travel)", brand:"NIKORA Beauty Tech", price:129.00, category:"Beauty Tech & Masks", img:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600', flag:"Bestseller", bestseller:true, bestsellerRank:9 },
  { id:'25', name:"NIKORA Ice Roller Set (Cooling Facial Roller & Massage Tools)", brand:"NIKORA Beauty Tech", price:24.00, category:"Cooling Therapy", img:'https://images.unsplash.com/photo-1512290900673-10705a3962d3?w=600' },
  { id:'26', name:"NIKORA 4 In 1 Skin Care Massager", brand:"NIKORA Beauty Tech", price:39.00, category:"Facial Wand", img:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600' }
];

function nkEsc(str){
  var d = document.createElement('div');
  d.textContent = str == null ? '' : str;
  return d.innerHTML;
}


/* ---- recommendation engine: complementary pairing between K-Beauty skincare and NIKORA beauty tech ----
   skincare in the bag or being viewed  ->  the Booster Wand / Cryo Globe come first
   a device in the bag or being viewed  ->  the K-Beauty essentials (COSRX Snail, Anua Toner, Beauty of Joseon SPF) come first
   ids are the catalog ids '1'-'10' (lib/products.js slugs are accepted too). Products it does not know (added in the admin panel) go last. */
var NK_SLUG_IDS = { 'cosrx-snail-mucin':'1', 'anua-heartleaf-toner':'2', 'boj-relief-sun':'3', 'skin1004-centella-ampoule':'4', 'laneige-lip-sleeping-mask':'5',
  'biodance-collagen-mask':'6', 'roundlab-birch-cream':'7', 'nikora-booster-wand':'8', 'nikora-cryo-globe':'9', 'nikora-glass-skin-bundle':'10', 'nikora-hello-face-led-mask':'24', 'nikora-ice-roller-set':'25', 'nikora-4in1-skin-massager':'26' };
var NK_ROLE = { '1':'skin', '2':'skin', '3':'skin', '4':'skin', '5':'skin', '6':'skin', '7':'skin', '8':'device', '9':'device', '10':'bundle', '24':'device', '25':'device', '26':'device' };
var NK_BUNDLE_PARTS = { '10': ['8', '1', '4', '6'] };        /* Glass Skin Ritual Set = Booster Wand + COSRX + Skin1004 + Biodance mask */
var NK_REC_ORDER = {
  skin:   ['8','9','1','2','3','4','7','6','5','10'],        /* skincare only: devices first (Wand, then Cryo Globe) */
  device: ['1','2','3','4','7','6','5','9','8','10'],        /* device only: essentials first (COSRX, Anua, Beauty of Joseon) */
  both:   ['3','1','2','4','7','9','8','6','5','10'],        /* both: finish the routine (SPF, essence, toner ...), then the other device */
  none:   ['8','1','2','3','9','4','7','6','5','10']         /* empty bag: hero wand, then the essentials */
};
var NK_LEGACY_NAMES = ["NIKORA RED Light & EMS Facial Wand 4-in-1","3D EMS Gua Sha Sculptor","Hydro-Vacuum Pore Cleaner","LED Therapy Mask 7-in-1 Pro","EMS Body Sculptor RF","Sonic Eye Massager","Ultrasonic Skin Scrubber","Thermal Neck & Face Massager","Cryo Ice Roller","RF Anti-Aging Device","NIKORA Ultimate Glow Ritual Set (Full Gadget Bundle)"];
/* Until the admin panel re-syncs Firebase, an old-catalog /products node must never feed the recommendations, the thumbnails or the price check. */
function nkDropLegacy(list){
  for(var i=0;i<list.length;i++){ if(NK_LEGACY_NAMES.indexOf(list[i].name) !== -1) return NK_FALLBACK.slice(); }
  return list;
}
function nkKey(id){ var k = String(id == null ? '' : id); return NK_SLUG_IDS[k] || k; }
function nkRoleOf(p){
  var r = NK_ROLE[nkKey(p && p.id)];
  if(r) return r;
  if(p && (/^NIKORA Tech$|^NIKORA Beauty Tech$/i.test(p.brand || '') || p.category === 'Facial Wand' || p.category === 'Cooling Therapy' || p.category === 'Beauty Tech & Masks')) return 'device';
  return (p && p.category === 'Bundles & Sets') ? 'bundle' : 'skin';
}
function nkOwned(id){                                          /* ids a cart line already covers (a bundle covers its parts) */
  var k = nkKey(id), out = [k];
  (NK_BUNDLE_PARTS[k] || []).forEach(function(x){ out.push(x); });
  return out;
}
function nkSortRecs(cands, contextIds){
  var skin = false, device = false;
  contextIds.forEach(function(id){
    var r = nkRoleOf({ id: id, category: (nkFindLite(id) || {}).category, brand: (nkFindLite(id) || {}).brand });
    if(r === 'skin') skin = true; else if(r === 'device') device = true; else { skin = true; device = true; }
  });
  var order = NK_REC_ORDER[skin && device ? 'both' : (skin ? 'skin' : (device ? 'device' : 'none'))];
  function rank(p, idx){ var i = order.indexOf(nkKey(p.id)); return i === -1 ? 100 + idx : i; }
  return cands.map(function(p, idx){ return { p: p, r: rank(p, idx) }; })
    .sort(function(a, b){ return a.r - b.r; })
    .map(function(x){ return x.p; });
}
function nkFindLite(id){                                       /* product record for role detection, without the full nkFind fallbacks */
  for(var i=0;i<NK_PRODUCTS.length;i++){ if(String(NK_PRODUCTS[i].id) === String(id)) return NK_PRODUCTS[i]; }
  for(var j=0;j<NK_FALLBACK.length;j++){ if(String(NK_FALLBACK[j].id) === nkKey(id)) return NK_FALLBACK[j]; }
  return null;
}

/* ---- product data (normalises catalog {name,img}, index overrides {title,imgUrl}, product {images[]}) ---- */
function nkNormalize(p, key){
  if(!p || typeof p !== 'object' || p._deleted) return null;
  var name = p.name || p.title;
  var price = Number(p.price);
  if(!name || !(price > 0)) return null;
  var img = (Array.isArray(p.images) && p.images[0]) || p.img || p.imgUrl || '';
  return { id: String(p.id != null ? p.id : key), name: String(name), brand: p.brand ? String(p.brand) : '', price: price, img: String(img || ''), category: p.category || '',
    flag: typeof p.flag === 'string' ? p.flag : null, bestseller: p.bestseller === true || p.isBestseller === true, bestsellerRank: p.bestsellerRank != null ? p.bestsellerRank : null };   /* flags kept for the trending / best-seller picks in cart-recs.js */
}
function nkListFromObject(obj){
  var out = [];
  Object.keys(obj || {}).forEach(function(k){ var n = nkNormalize(obj[k], k); if(n) out.push(n); });
  return out;
}
var NK_PRODUCTS = [];            /* filled in boot() from window ALL_PRODUCTS (if the page has it) and live from Firebase /products */
function nkFind(id){
  for(var i=0;i<NK_PRODUCTS.length;i++){ if(NK_PRODUCTS[i].id === String(id)) return NK_PRODUCTS[i]; }
  if(typeof resolveProduct === 'function'){ try{ var rp = nkNormalize(resolveProduct(id), id); if(rp) return rp; }catch(e){} }
  for(var j=0;j<NK_FALLBACK.length;j++){ if(NK_FALLBACK[j].id === String(id)) return NK_FALLBACK[j]; }
  return null;
}
function nkThumb(img, alt){
  return img ? '<img src="' + nkEsc(img) + '" alt="' + nkEsc(alt) + '" loading="lazy" draggable="false">' : NK_ICONS.image;
}

/* ---- cart storage + Firebase mirror ---- */
var NK_CART_REF = null;
function nkCartId(){
  var id = safeStorage.getItem('nikora_cart_id');
  if(!id){
    id = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    safeStorage.setItem('nikora_cart_id', id);
  }
  return id;
}
function getCart(){
  try{ var c = JSON.parse(safeStorage.getItem('nikora_cart')); return Array.isArray(c) ? c : []; }
  catch(e){ return []; }
}
function nkPushCart(cart, ts){
  if(!NK_CART_REF) return;
  try{
    NK_CART_REF.set({ items: cart, updatedAt: ts }).catch(function(err){ console.warn('Firebase cart write failed', err); });
  }catch(e){ console.warn('Firebase cart write failed', e); }
}
function saveCart(cart){
  var ts = Date.now();
  safeStorage.setItem('nikora_cart', JSON.stringify(cart));
  safeStorage.setItem('nikora_cart_ts', String(ts));
  nkPushCart(cart, ts);
}
function nkCleanItems(raw){
  var arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.keys(raw).map(function(k){ return raw[k]; }) : []);
  return arr.filter(function(i){ return i && i.id != null && i.title && Number(i.price) >= 0 && Number(i.qty) > 0; })
            .map(function(i){ return { id: String(i.id), title: String(i.title), price: Number(i.price), qty: Math.floor(Number(i.qty)) }; });
}
function nkSyncCartFromFirebase(){
  if(typeof firebaseReady === 'undefined' || !firebaseReady) return;
  try{
    NK_CART_REF = db.ref('carts/' + nkCartId());
    NK_CART_REF.on('value', function(snap){
      var v = snap.val();
      var localTs = Number(safeStorage.getItem('nikora_cart_ts')) || 0;
      if(!v){                                   /* nothing in the cloud yet: publish what we have */
        var lc = getCart();
        if(lc.length) nkPushCart(lc, localTs || Date.now());
        return;
      }
      var remoteTs = Number(v.updatedAt) || 0;
      if(remoteTs > localTs){                   /* newer cloud copy (other tab / page): adopt it */
        safeStorage.setItem('nikora_cart', JSON.stringify(nkCleanItems(v.items)));
        safeStorage.setItem('nikora_cart_ts', String(remoteTs));
        renderCart();
      } else if(localTs > remoteTs){            /* local copy is newer: publish it */
        nkPushCart(getCart(), localTs);
      }
    }, function(err){ console.warn('Firebase cart sync error — using local cart.', err); });
  }catch(e){ console.warn('Firebase cart sync unavailable', e); }
}

/* ---- cart actions ---- */
function bumpCartBadge(){
  var badge = document.getElementById('cart-count');
  if(!badge) return;
  badge.classList.remove('bump');
  void badge.offsetWidth;
  badge.classList.add('bump');
}
/* Silent add: no drawer, no toast. */
function cartAdd(id, title, price, qty){
  id = String(id);
  var cart = getCart(), found = null;
  for(var i=0;i<cart.length;i++){ if(String(cart[i].id) === id){ found = cart[i]; break; } }
  if(found){ found.qty += (qty || 1); } else { cart.push({ id: id, title: title, price: Number(price), qty: qty || 1 }); }
  saveCart(cart);
  renderCart();
}
/* Card / CTA add: adds, confirms, and opens the drawer. */
window.addToCart = function(id, title, price){
  cartAdd(id, title, price, 1);
  bumpCartBadge();
  nkToast(title + ' added to your bag.');
  openCart();
};
/* Recommendation add: adds WITHOUT closing or re-opening the drawer. */
var NK_REC_LAST = 0;
function addRecommended(id){
  if(Date.now() - NK_REC_LAST < 350) return;          /* a double-tap must not add the next (shifted) card too */
  NK_REC_LAST = Date.now();
  var p = nkFind(id);
  if(!p) return;
  cartAdd(p.id, p.name, p.price, 1);
  bumpCartBadge();
  nkToast(p.name + ' added to your bag.');
}
function changeQty(id, delta){
  var cart = getCart(), item = null;
  for(var i=0;i<cart.length;i++){ if(String(cart[i].id) === String(id)){ item = cart[i]; break; } }
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0){ cart = cart.filter(function(c){ return String(c.id) !== String(id); }); }
  saveCart(cart);
  renderCart();
}
function removeFromCart(id){
  saveCart(getCart().filter(function(c){ return String(c.id) !== String(id); }));
  renderCart();
}

/* ---- recommendations carousel ---- */
var NK_CAR = { raf: 0, pos: 0, last: 0, hover: false, touching: false, resumeAt: 0, bound: false };
var NK_REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function nkCarouselPeriod(g){
  if(g.getAttribute('data-loop') !== '1') return 0;
  var gap = parseFloat(getComputedStyle(g).columnGap) || 12;
  return (g.scrollWidth + gap) / 2;      /* the card set is rendered twice; one set = one loop */
}
function nkCarouselStep(ts){
  var drawer = document.getElementById('cart-drawer');
  var g = document.getElementById('cart-recs-grid');
  if(!drawer || !g || !drawer.classList.contains('active') || NK_REDUCED){ NK_CAR.raf = 0; return; }
  var dt = NK_CAR.last ? Math.min(64, ts - NK_CAR.last) : 16;
  NK_CAR.last = ts;
  var period = nkCarouselPeriod(g);
  if(period > 0){
    var busy = NK_CAR.hover || NK_CAR.touching || Date.now() < NK_CAR.resumeAt || g.contains(document.activeElement);
    if(busy){ NK_CAR.pos = g.scrollLeft; }                        /* user is in control: just track */
    else{
      NK_CAR.pos += NK_SCROLL_SPEED * dt / 1000;
      if(NK_CAR.pos >= period) NK_CAR.pos -= period;              /* seamless wrap */
      g.scrollLeft = NK_CAR.pos;
    }
  }
  NK_CAR.raf = requestAnimationFrame(nkCarouselStep);
}
function nkCarouselStart(){
  if(NK_CAR.raf || NK_REDUCED) return;
  NK_CAR.last = 0;
  NK_CAR.raf = requestAnimationFrame(nkCarouselStep);
}
function nkCarouselBind(){
  var g = document.getElementById('cart-recs-grid');
  if(!g || NK_CAR.bound) return;
  NK_CAR.bound = true;
  g.addEventListener('scroll', function(){ nkRecsNavUpdate(); }, { passive: true });   /* keeps the "2 / 5" counter + arrows in step with swipes */
  function hold(ms){ NK_CAR.resumeAt = Date.now() + ms; }
  g.addEventListener('mouseenter', function(){ NK_CAR.hover = true; });
  g.addEventListener('mouseleave', function(){ NK_CAR.hover = false; hold(400); });
  g.addEventListener('touchstart', function(){ NK_CAR.touching = true; }, { passive: true });
  g.addEventListener('touchend', function(){ NK_CAR.touching = false; hold(2500); }, { passive: true });
  g.addEventListener('touchcancel', function(){ NK_CAR.touching = false; hold(2500); }, { passive: true });
  g.addEventListener('wheel', function(){ hold(2500); }, { passive: true });
  g.addEventListener('pointerdown', function(){ hold(2500); });
  g.addEventListener('scroll', function(){                        /* manual swipes also loop seamlessly */
    var period = nkCarouselPeriod(g);
    if(period > 0 && g.scrollLeft >= period){ g.scrollLeft -= period; }
  }, { passive: true });
}

/* ---- carousel arrows ( < and > ): page through the suggestions; they wrap around while the strip auto-loops ---- */
function nkRecsNavUpdate(){
  var g = document.getElementById('cart-recs-grid'), nav = document.getElementById('cart-recs-nav');
  if(!g || !nav) return;
  var btns = nav.querySelectorAll('.cart-recs-arrow'), cnt = document.getElementById('cart-recs-count');
  if(g.getAttribute('data-single') === '1'){                        /* one product at a time: arrows always wrap, counter "2 / 5" */
    var total = g.querySelectorAll('.cart-rec-card').length, w = g.clientWidth || 1;
    var idx = Math.min(total - 1, Math.max(0, Math.round(g.scrollLeft / w)));
    nav.hidden = total < 2;
    if(btns.length === 2){ btns[0].disabled = false; btns[1].disabled = false; }
    if(cnt) cnt.textContent = total > 1 ? (idx + 1) + ' / ' + total : '';
    return;
  }
  if(cnt) cnt.textContent = '';
  var overflow = g.scrollWidth > g.clientWidth + 4, looping = g.getAttribute('data-loop') === '1';
  nav.hidden = !overflow;
  if(btns.length === 2){
    btns[0].disabled = !looping && g.scrollLeft <= 2;
    btns[1].disabled = !looping && g.scrollLeft + g.clientWidth >= g.scrollWidth - 2;
  }
}
function nkRecsPage(dir){
  var g = document.getElementById('cart-recs-grid'); if(!g) return;
  if(g.getAttribute('data-single') === '1'){                        /* exactly one card per click, wrapping first <-> last */
    var cards = g.querySelectorAll('.cart-rec-card'), n = cards.length, w1 = g.clientWidth;
    if(n < 2 || !w1) return;
    var cur = (g._nkTo != null && Date.now() < g._nkUntil) ? g._nkTo : Math.round(g.scrollLeft / w1), nxt = (cur + dir + n) % n;
    g._nkTo = nxt; g._nkUntil = Date.now() + 700;                  /* rapid clicks keep counting from the slide we are heading to */
    if(g.scrollTo) g.scrollTo({ left: nxt * w1, behavior: NK_REDUCED ? 'auto' : 'smooth' }); else g.scrollLeft = nxt * w1;
    return;
  }
  var card = g.querySelector('.cart-rec-card'), gap = parseFloat(getComputedStyle(g).columnGap) || 12;
  var w = (card ? card.offsetWidth : 130) + gap, step = Math.max(w, Math.floor(g.clientWidth / w) * w);
  NK_CAR.resumeAt = Date.now() + 4000;                              /* the shopper is browsing: pause the auto-scroll */
  var period = nkCarouselPeriod(g);
  if(period > 0 && dir < 0 && g.scrollLeft < step) g.scrollLeft += period;     /* wrap backwards in the looping strip */
  if(g.scrollBy) g.scrollBy({ left: dir * step, behavior: NK_REDUCED ? 'auto' : 'smooth' }); else g.scrollLeft += dir * step;
}
document.addEventListener('click', function(e){
  var b = e.target.closest && e.target.closest('[data-recs-nav]');
  if(b && !b.disabled){ e.preventDefault(); nkRecsPage(Number(b.getAttribute('data-recs-nav')) || 1); }
});
(function(){
  var g = document.getElementById('cart-recs-grid');
  if(g) g.addEventListener('scroll', function(){ nkRecsNavUpdate(); }, { passive: true });
  window.addEventListener('resize', nkRecsNavUpdate);
})();

function renderCartRecs(cart){
  var section = document.getElementById('cart-recs-section');
  var grid = document.getElementById('cart-recs-grid');
  if(!section || !grid) return;

  var current = (typeof CURRENT_PRODUCT !== 'undefined' && CURRENT_PRODUCT) ? CURRENT_PRODUCT : null;
  var pool = NK_PRODUCTS.length ? NK_PRODUCTS : NK_FALLBACK;
  /* cart-recs.js: empty bag -> "Trending K-Beauty Best Sellers"; items in the bag -> compatible cross-sells (category rules, see RULES there) */
  var rec;
  if(window.NKCartRecs){
    rec = NKCartRecs.select({ cart: cart, pool: pool, current: current, max: NK_MAX_RECS });
    NKCartRecs.setTitle(rec.title);
  } else {                                                       /* no cart-recs.js: still switch the heading with the bag state */
    var tEl = document.getElementById('cart-recs-title'); if(tEl) tEl.textContent = cart.length ? 'You Might Also Like' : 'Trending K-Beauty Best Sellers';
    rec = { mode: cart.length ? 'contextual' : 'trending' };                                                       /* cart-recs.js missing: plain pool minus what is already in the bag */
    var inBag = {}; cart.forEach(function(c){ inBag[String(c.id)] = true; });
    if(current) inBag[String(current.id)] = true;
    rec.picks = pool.filter(function(p){ return !inBag[String(p.id)]; }).slice(0, NK_MAX_RECS);
  }
  var picks = rec.picks;
  if(rec.mode === 'contextual'){ var tt = document.getElementById('cart-recs-title'); if(tt) tt.textContent = 'You Might Also Like'; }   /* filled bag heading */

  section.style.display = 'block';                               /* the recommendations section is NEVER hidden */
  if(!picks.length){
    grid.removeAttribute('data-loop'); grid.removeAttribute('data-single');
    grid.scrollLeft = 0;
    nkRecsNavUpdate();
    grid.innerHTML = '<div class="cart-recs-done">You\u2019ve added everything in the collection \u2014 a complete routine.</div>';
    return;
  }

  var single = rec.mode === 'contextual';                         /* bag has items -> "You Might Also Like" = one product per slide */
  function card(p, clone){
    if(single){
      return '<div class="cart-rec-card">' +
        '<div class="cart-rec-thumb">' + nkThumb(p.img, p.name) + '</div>' +
        '<div class="cart-rec-info">' +
          '<div class="cart-rec-title">' + nkEsc(p.name) + '</div>' +
          '<div class="cart-rec-price">$' + p.price.toFixed(2) + '</div>' +
          '<button type="button" class="cart-rec-add" data-action="add-rec" data-id="' + nkEsc(p.id) + '" aria-label="Add ' + nkEsc(p.name) + ' to bag">' + NK_ICONS.plus + 'Add to Cart</button>' +
        '</div>' +
      '</div>';
    }
    return '<div class="cart-rec-card"' + (clone ? ' aria-hidden="true"' : '') + '>' +
      '<div class="cart-rec-thumb">' + nkThumb(p.img, p.name) + '</div>' +
      '<div class="cart-rec-title">' + nkEsc(p.name) + '</div>' +
      '<div class="cart-rec-price">$' + p.price.toFixed(2) + '</div>' +
      '<button type="button" class="cart-rec-add" data-action="add-rec" data-id="' + nkEsc(p.id) + '"' + (clone ? ' tabindex="-1"' : '') + ' aria-label="Add ' + nkEsc(p.name) + ' to bag">' + NK_ICONS.plus + 'Add to Cart</button>' +
    '</div>';
  }
  var first = picks.map(function(p){ return card(p, false); }).join('');
  var viewW = grid.clientWidth || 372;
  /* empty bag (trending): endless auto-scrolling strip; items in the bag (targeted cross-sell): a calm strip the shopper pages through with the arrows */
  var loops = !single && !NK_REDUCED && picks.length * 142 > viewW;         /* only loop when the strip actually overflows */
  var prev = grid.scrollLeft;
  grid.innerHTML = loops ? first + picks.map(function(p){ return card(p, true); }).join('') : first;
  if(loops) grid.setAttribute('data-loop', '1'); else grid.removeAttribute('data-loop');
  if(single) grid.setAttribute('data-single', '1'); else grid.removeAttribute('data-single');
  grid.scrollLeft = loops ? prev : 0;                            /* adding an item must not snap the strip back */
  NK_CAR.pos = grid.scrollLeft;
  nkCarouselStart();
  nkRecsNavUpdate();
}

function renderCart(){
  if(document.body) nkInjectDom();                                /* drawer exists even if a page calls renderCart() before DOMContentLoaded */
  var res = nkRenderCartCore.apply(this, arguments);
  try{ document.dispatchEvent(new CustomEvent('nikora:cart-rendered')); }catch(e){}
  return res;
}
function nkRenderCartCore(){
  var cart = getCart();
  var wrap = document.getElementById('cart-items-list');
  var subtotal = 0, count = 0;

  if(!cart.length){
    wrap.innerHTML = '<div class="cart-empty">Your bag is empty. Add a favorite below to start your routine:</div>';
  } else {
    wrap.innerHTML = cart.map(function(item){
      var price = Number(item.price) || 0;
      subtotal += price * item.qty;
      count += item.qty;
      var prod = nkFind(item.id);
      var id = nkEsc(item.id);
      return '<div class="cart-item">' +
        '<div class="ci-thumb">' + nkThumb(prod && prod.img, item.title) + '</div>' +
        '<div class="ci-info">' +
          '<div class="ci-top">' +
            '<div><div class="ci-title">' + nkEsc(item.title) + '</div><div class="ci-price">$' + price.toFixed(2) + ' each</div></div>' +
            '<button type="button" class="ci-remove" data-action="remove-item" data-id="' + id + '" aria-label="Remove ' + nkEsc(item.title) + '">' + NK_ICONS.trash + '</button>' +
          '</div>' +
          '<div class="ci-bottom">' +
            '<div class="qty-ctrl">' +
              '<button type="button" data-action="qty-dec" data-id="' + id + '" aria-label="Decrease quantity">' + NK_ICONS.minus + '</button>' +
              '<span>' + item.qty + '</span>' +
              '<button type="button" data-action="qty-inc" data-id="' + id + '" aria-label="Increase quantity">' + NK_ICONS.plus + '</button>' +
            '</div>' +
            '<div class="ci-line-total">$' + (price * item.qty).toFixed(2) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  document.getElementById('cart-subtotal').textContent = '$' + subtotal.toFixed(2);
  var promo = nkPromoCalc(subtotal);
  var discount = promo ? promo.discount : 0;
  var payable = Math.max(0, subtotal - discount);
  nkPromoRender(promo, payable);
  var badge = document.getElementById('cart-count');
  if(badge) badge.textContent = count;

  var text = document.getElementById('ship-progress-text');
  var fill = document.getElementById('ship-progress-fill');
  if(window.NKShipping){ NKShipping.renderProgress(text, fill, payable, count, cart, NK_ICONS); }
  else { var unlocked = payable >= NK_FREE_SHIP; fill.style.width = Math.min(100, payable / NK_FREE_SHIP * 100) + '%'; text.classList.toggle('unlocked', unlocked); fill.classList.toggle('unlocked', unlocked);
    text.innerHTML = NK_ICONS[unlocked ? 'check' : 'truck'] + (unlocked ? 'You\u2019ve unlocked FREE Express Shipping!' : 'Add $' + (NK_FREE_SHIP - payable).toFixed(2) + ' more to unlock FREE Express Shipping'); }

  renderCartRecs(cart);
}

/* ---- open / close (single source of truth for every page) ---- */
window.openCart = function(){
  if(document.body) nkInjectDom();
  document.getElementById('cart-drawer').classList.add('active');
  document.getElementById('cart-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  var g = document.getElementById('cart-recs-grid');
  if(g){ NK_CAR.pos = g.scrollLeft; }
  nkCarouselStart();
};
window.closeCart = function(){
  var drawer = document.getElementById('cart-drawer');
  var overlay = document.getElementById('cart-overlay');
  if(drawer){ drawer.classList.remove('active'); drawer.classList.remove('open'); }
  if(overlay){ overlay.classList.remove('active'); overlay.classList.remove('open'); }
  document.body.style.overflow = '';
};

/* Called once on page load. Everything is delegated, so re-rendering the drawer never breaks it. */
var NK_CART_READY = false;
function initCartSync(){
  if(NK_CART_READY) return;
  NK_CART_READY = true;

  document.addEventListener('click', function(e){
    var t = e.target;
    if(!t || !t.closest) return;
    if(t.closest('.cart-close-btn')){ closeCart(); return; }                              /* X button */
    if(t.classList && t.classList.contains('cart-overlay')){ closeCart(); return; }       /* dark background */
    var a = t.closest('#cart-drawer [data-action]');
    if(!a) return;
    var act = a.getAttribute('data-action'), id = a.getAttribute('data-id');
    if(act === 'qty-inc') changeQty(id, 1);
    else if(act === 'qty-dec') changeQty(id, -1);
    else if(act === 'remove-item') removeFromCart(id);
    else if(act === 'add-rec') addRecommended(id);
  });
  nkBindPromo();
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ closeCart(); }
  });

  nkCarouselBind();
  renderCart();                                                  /* instant render from localStorage; Firebase upgrades it below */

  nkEnsureFirebase(function(){
    if(!NK_PRODUCTS.length && typeof getAllProductsFallback === 'function'){
      try{ NK_PRODUCTS = getAllProductsFallback().map(function(p){ return nkNormalize(p, p && p.id); }).filter(Boolean); }catch(e){}
    }
    if(firebaseReady){
      db.ref('products').on('value', function(snap){
        var list = nkDropLegacy(nkListFromObject(snap.val()));
        if(list.length){ NK_PRODUCTS = list; }
        renderCart();
      }, function(err){ console.warn('Cart products sync error \u2014 using local data.', err); });
      nkSyncCartFromFirebase();
      nkPromoInit();
    } else {
      NK_PROMOS = nkClone(NK_PROMO_FALLBACK); NK_PROMOS_LOADED = true;
    }
    renderCart();
  });
}


/* ================= PROMO CODES =================
   Firebase '/promocodes/<CODE>' = { code, type:'percent'|'fixed', value, active, expiresAt? (ms) }.
   The applied code (just the name) is kept in localStorage 'nikora_promo' and is re-validated
   against live data on every render. NOTE: this discount is a client-side display; the checkout
   step must re-validate the code before charging. */
var NK_PROMO_FALLBACK = { GLOW10: { code:'GLOW10', type:'percent', value:10, active:true } };
var NK_PROMOS = null, NK_PROMOS_LOADED = false, NK_PROMO_REF = null, NK_PROMO_OPEN = false, NK_PROMO_NOTE = '';
function nkClone(o){ return JSON.parse(JSON.stringify(o)); }
function nkPromoKey(s){ return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9_-]/g, ''); }
function nkPromoMap(obj){
  var out = {};
  Object.keys(obj || {}).forEach(function(k){
    var p = obj[k]; if(!p || typeof p !== 'object') return;
    var code = nkPromoKey(p.code || k); if(!code) return;
    out[code] = { code: code, type: p.type === 'fixed' ? 'fixed' : 'percent', value: Number(p.value) || 0,
                  active: p.active !== false, expiresAt: p.expiresAt ? Number(p.expiresAt) : 0 };
  });
  return out;
}
function nkPromoStatus(p){
  if(!p || p.active === false || !(p.value > 0)) return 'invalid';
  if(p.expiresAt && Date.now() > p.expiresAt) return 'expired';
  return 'ok';
}
function nkPromoDesc(p){ return p.type === 'percent' ? (p.value + '% OFF') : ('$' + Number(p.value).toFixed(2) + ' OFF'); }
function nkMoney(n){ return '$' + (Math.round(n * 100) / 100).toFixed(2); }
function nkPromoApplied(){ return nkPromoKey(safeStorage.getItem('nikora_promo')); }

function nkPromoCalc(subtotal){
  var code = nkPromoApplied();
  if(!code || !NK_PROMOS_LOADED) return null;
  var p = NK_PROMOS && NK_PROMOS[code], st = nkPromoStatus(p);
  if(st !== 'ok'){                                    /* deleted / expired since it was applied */
    safeStorage.setItem('nikora_promo', '');
    NK_PROMO_NOTE = 'Code ' + code + (st === 'expired' ? ' has expired' : ' is no longer valid') + ' and was removed.';
    return null;
  }
  var d = p.type === 'percent' ? subtotal * Math.min(100, p.value) / 100 : p.value;
  d = Math.min(Math.round(d * 100) / 100, subtotal);
  return { code: code, promo: p, discount: d };
}
function nkPromoMsg(text, kind){
  var m = document.getElementById('promo-msg'); if(!m) return;
  m.textContent = text || ''; m.className = 'promo-msg' + (kind ? ' ' + kind : '');
}
function nkPromoRender(promo, payable){
  var box = document.getElementById('promo-box'); if(!box) return;
  var active = document.getElementById('promo-active'), toggle = document.getElementById('promo-toggle');
  var applied = !!promo;
  box.classList.toggle('open', NK_PROMO_OPEN && !applied);
  toggle.setAttribute('aria-expanded', String(NK_PROMO_OPEN && !applied));
  toggle.style.display = applied ? 'none' : '';
  active.hidden = !applied;
  if(applied){
    active.innerHTML = '<span class="promo-chip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg><b>' + nkEsc(promo.code) + '</b><em>' + nkEsc(nkPromoDesc(promo.promo)) + '</em></span>' +
      '<button type="button" class="promo-remove" id="promo-remove" aria-label="Remove promo code ' + nkEsc(promo.code) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>Remove</button>';
  } else { active.innerHTML = ''; }
  if(NK_PROMO_NOTE){ nkPromoMsg(NK_PROMO_NOTE, 'err'); NK_PROMO_NOTE = ''; }
  var row = document.getElementById('cart-discount-row'), tot = document.getElementById('cart-total-row');
  var show = applied && promo.discount > 0;
  row.hidden = !show; tot.hidden = !show;
  if(show){
    document.getElementById('cart-discount-label').textContent = 'Discount (' + promo.code + ')';
    document.getElementById('cart-discount-amount').textContent = '-' + nkMoney(promo.discount);
    document.getElementById('cart-total').textContent = nkMoney(payable);
  }
}
function nkPromoApply(){
  var input = document.getElementById('promo-input'); if(!input) return;
  var code = nkPromoKey(input.value);
  if(!code){ nkPromoMsg('Please enter a promo code.', 'err'); return; }
  function finish(){
    var p = NK_PROMOS && NK_PROMOS[code], st = nkPromoStatus(p);
    if(st === 'expired'){ nkPromoMsg('Sorry, code ' + code + ' has expired.', 'err'); return; }
    if(st !== 'ok'){ nkPromoMsg('That code isn\u2019t valid. Please check it and try again.', 'err'); return; }
    safeStorage.setItem('nikora_promo', code);
    input.value = ''; nkPromoMsg('', '');
    renderCart();
    nkToast('Promo code ' + code + ' applied (' + nkPromoDesc(p) + ').');
  }
  if(NK_PROMOS === null && NK_PROMO_REF){                /* codes still loading: fetch once, then validate */
    NK_PROMO_REF.once('value').then(function(s){ NK_PROMOS = nkPromoMap(s.val()); NK_PROMOS_LOADED = true; finish(); })
      .catch(function(){ nkPromoMsg('Could not check the code right now. Please try again.', 'err'); });
  } else { finish(); }
}
function nkPromoRemove(){
  safeStorage.setItem('nikora_promo', ''); nkPromoMsg('', ''); renderCart();
}
function nkPromoInit(){
  try{
    NK_PROMO_REF = db.ref('promocodes');
    NK_PROMO_REF.on('value', function(snap){
      NK_PROMOS = nkPromoMap(snap.val()); NK_PROMOS_LOADED = true;
      renderCart();
    }, function(err){
      console.warn('Promo codes sync error \u2014 using built-in list.', err);
      if(NK_PROMOS === null){ NK_PROMOS = nkClone(NK_PROMO_FALLBACK); NK_PROMOS_LOADED = true; renderCart(); }
    });
    /* Seed GLOW10 once, only if the list has never been seeded and is empty. */
    db.ref('promoMeta/seeded').once('value').then(function(s){
      if(s.val() === true) return;
      return NK_PROMO_REF.once('value').then(function(ps){
        if(ps.val()){ return db.ref('promoMeta/seeded').set(true); }
        return NK_PROMO_REF.child('GLOW10').set({ code:'GLOW10', type:'percent', value:10, active:true, createdAt:Date.now() })
          .then(function(){ return db.ref('promoMeta/seeded').set(true); });
      });
    }).catch(function(e){ console.warn('Promo seed skipped', e); });
  }catch(e){ NK_PROMOS = nkClone(NK_PROMO_FALLBACK); NK_PROMOS_LOADED = true; }
}


/* ---- boot: inject styles + drawer markup once, then start ---- */
function nkInjectDom(){
  if(!document.getElementById('nkc-styles')){
    var st = document.createElement('style'); st.id = 'nkc-styles'; st.textContent = NKC_CSS; document.head.appendChild(st);
  }
  if(!document.getElementById('cart-drawer')){
    var wrap = document.createElement('div'); wrap.id = 'nkc-root'; wrap.innerHTML = NKC_HTML;
    while(wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }
  var cb = document.getElementById('cart-trust-badges'); if(cb && !cb.firstChild) cb.innerHTML = trustBadgesHtml();
}
function boot(){
  if(boot.done) return; boot.done = true;
  nkInjectDom();
  if(typeof ALL_PRODUCTS !== 'undefined' && ALL_PRODUCTS){
    try{ NK_PRODUCTS = ALL_PRODUCTS.map(function(p){ return nkNormalize(p, p && p.id); }).filter(Boolean); }catch(e){}
  }
  initCartSync();
  nkEnsureDeps(function(){ nkPatchRecRules(); renderCart(); });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

/* ---- public API (also exported as plain globals for the existing pages) ---- */
window.NikoraCart = { add: cartAdd, open: function(){ window.openCart(); }, close: function(){ window.closeCart(); }, render: renderCart, get: getCart, bump: bumpCartBadge, setQty: changeQty, remove: removeFromCart, version: '2026-11-12' };
/* helpers some pages use directly (checkout summary + promo, catalog device/bundle checks, reviews) */
[ ['nkFind', nkFind], ['nkRoleOf', nkRoleOf], ['nkPromoCalc', nkPromoCalc], ['nkPromoDesc', nkPromoDesc], ['nkPromoStatus', nkPromoStatus],
  ['nkPromoApplied', nkPromoApplied], ['nkPromoKey', nkPromoKey], ['nkPromoMap', nkPromoMap], ['nkListFromObject', nkListFromObject],
  ['nkDropLegacy', nkDropLegacy], ['nkPromoApply', nkPromoApply], ['nkPromoRemove', nkPromoRemove], ['nkClone', nkClone], ['nkEsc', nkEsc] ]
  .forEach(function(kv){ if(typeof kv[1] === 'function' && !(kv[0] in window)) window[kv[0]] = kv[1]; });
Object.defineProperty(window, 'NK_PROMOS',        { configurable: true, get: function(){ return NK_PROMOS; },        set: function(v){ NK_PROMOS = v; } });
Object.defineProperty(window, 'NK_PROMOS_LOADED', { configurable: true, get: function(){ return NK_PROMOS_LOADED; }, set: function(v){ NK_PROMOS_LOADED = v; } });
Object.defineProperty(window, 'NK_PROMO_REF',     { configurable: true, get: function(){ return NK_PROMO_REF; },     set: function(v){ NK_PROMO_REF = v; } });
window.getCart = getCart; window.saveCart = saveCart; window.cartAdd = cartAdd; window.bumpCartBadge = bumpCartBadge;
window.renderCart = renderCart; window.changeQty = changeQty; window.removeFromCart = removeFromCart;


})();
