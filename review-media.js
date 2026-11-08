/* =====================================================================
   NIKORA review media kit  (review-media.js)
   Shared by reviews.html and product.html.

   What it gives a review form:
     - Profile avatar: 8 built-in presets (drawn on a canvas, no external files) or an upload
     - Up to 5 photos, resized to 1000px JPEG, with removable previews
     - One optional video (MP4 / WebM, max 25 MB, max 60 s) with a playable preview

   Storage model
     - avatar + photos  -> small JPEG data URLs saved inside the review (Realtime Database, same as before)
     - video            -> uploaded to Firebase Storage under /review-videos/, only the https URL is saved in the review

   Usage:
     var media = NikoraReviewMedia.mount(document.getElementById('my-host'), { onError: function(msg){ ... } });
     media.getAvatar()   -> data URL or ''
     media.getPhotos()   -> array of data URLs
     media.hasVideo()    -> boolean
     media.isBusy()      -> true while files are still being processed
     media.uploadVideo() -> Promise<string>  (https URL, or '' when no video was picked)
     media.reset()
   Rendering helper for review feeds: NikoraReviewMedia.videoHtml(url)
   ===================================================================== */
(function (g) {
  'use strict';
  if (g.NikoraReviewMedia) return;

  var MAX_PHOTOS = 5;
  var MAX_PHOTO_FILE = 12 * 1024 * 1024;      /* picked image file (before resizing) */
  var PHOTO_SIDE = 1000;                      /* longest side after resizing */
  var MAX_VIDEO_FILE = 25 * 1024 * 1024;
  var MAX_VIDEO_SEC = 60;
  var VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm' };
  var STORAGE_SRC = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage-compat.js';
  var STALL_MS = 30000;                       /* give up when an upload makes no progress for this long */
  var uid = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeVideoUrl(u) {
    return (typeof u === 'string' && /^https:\/\/[^\s"'<>\\]+$/i.test(u.trim())) ? u.trim() : '';
  }
  function videoHtml(url) {
    var u = safeVideoUrl(url); if (!u) return '';
    injectCss();
    return '<div class="nkrm-rvwrap"><video class="nkrm-rv" src="' + esc(u) + '" controls playsinline preload="metadata" aria-label="Customer review video"></video></div>';
  }

  /* ---------------- styles (inherit the page's design tokens, with safe fallbacks) ---------------- */
  var CSS = [
    '.nkrm{display:block;margin:0 0 4px}',
    '.nkrm-block{margin:0 0 20px}',
    '.nkrm-label{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin:0 0 9px;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--text-faint,#8d857d)}',
    '.nkrm-label span{font-weight:500;text-transform:none;letter-spacing:0}',
    '.nkrm-label b{margin-left:auto;font-weight:600;color:var(--text-soft,#6b625a);letter-spacing:0}',
    '.nkrm-ava-row{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}',
    '.nkrm-ava{position:relative;flex:none;width:72px;height:72px;border-radius:50%;overflow:hidden;display:grid;place-items:center;color:var(--text-faint,#8d857d);border:1.5px dashed var(--line,rgba(0,0,0,.2))}',
    '.nkrm-ava.has{border:1.5px solid var(--gold,#c89b54)}',
    '.nkrm-ava svg{width:30px;height:30px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}',
    '.nkrm-ava img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none}',
    '.nkrm-ava.has img{display:block}.nkrm-ava.has svg{display:none}',
    '.nkrm-ava-side{flex:1 1 220px;min-width:0}',
    '.nkrm-presets{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}',
    '.nkrm-preset{width:34px;height:34px;padding:0;border-radius:50%;overflow:hidden;cursor:pointer;background:none;border:2px solid transparent;transition:transform .15s ease,border-color .15s ease}',
    '.nkrm-preset img{display:block;width:100%;height:100%;border-radius:50%}',
    '.nkrm-preset:hover{transform:scale(1.08)}',
    '.nkrm-preset[aria-checked="true"]{border-color:var(--gold,#c89b54);box-shadow:0 0 0 2px rgba(200,155,84,.25)}',
    '.nkrm-preset:focus-visible,.nkrm-pick:focus-within,.nkrm-add:focus-within,.nkrm-x:focus-visible,.nkrm-rm:focus-visible{outline:2px solid var(--gold,#c89b54);outline-offset:2px}',
    '.nkrm-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center}',
    '.nkrm-pick{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:100px;cursor:pointer;font-size:12.5px;font-weight:600;color:var(--text-soft,#6b625a);background:var(--card-bg,transparent);border:1px solid var(--line,rgba(0,0,0,.18));transition:border-color .2s,color .2s}',
    '.nkrm-pick:hover{border-color:var(--gold,#c89b54);color:var(--gold,#c89b54)}',
    '.nkrm-pick svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.nkrm-rm{display:none;align-items:center;gap:5px;padding:8px 14px;border-radius:100px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;color:var(--text-soft,#6b625a);background:var(--card-bg,transparent);border:1px solid var(--line,rgba(0,0,0,.18))}',
    '.nkrm-rm.show{display:inline-flex}.nkrm-rm:hover{color:#e11d48;border-color:rgba(225,29,72,.5)}',
    '.nkrm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px}',
    '.nkrm-ph{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;border:1px solid var(--card-border,rgba(0,0,0,.1))}',
    '.nkrm-ph img{display:block;width:100%;height:100%;object-fit:cover}',
    '.nkrm-x{position:absolute;top:5px;right:5px;width:24px;height:24px;padding:0;display:grid;place-items:center;border-radius:50%;cursor:pointer;color:#fff;background:rgba(11,11,14,.72);border:1px solid rgba(255,255,255,.25)}',
    '.nkrm-x:hover{background:#e11d48}.nkrm-x svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.6;stroke-linecap:round}',
    '.nkrm-add{aspect-ratio:1;border-radius:12px;display:grid;place-items:center;align-content:center;gap:4px;cursor:pointer;text-align:center;font-size:11px;font-weight:600;color:var(--text-soft,#6b625a);border:1.5px dashed var(--line,rgba(0,0,0,.25));transition:border-color .2s,color .2s}',
    '.nkrm-add:hover{border-color:var(--gold,#c89b54);color:var(--gold,#c89b54)}',
    '.nkrm-add svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round}',
    '.nkrm-vprev{margin-top:12px;max-width:340px}',
    '.nkrm-vprev[hidden],.nkrm-prog[hidden]{display:none}',
    '.nkrm-vprev video{display:block;width:100%;max-height:240px;border-radius:14px;background:#0B0B0E;border:1px solid var(--card-border,rgba(0,0,0,.1))}',
    '.nkrm-vprev .nkrm-rm{margin-top:10px}',
    '.nkrm-prog{position:relative;margin-top:12px;max-width:340px;height:26px;border-radius:100px;overflow:hidden;background:rgba(200,155,84,.15);border:1px solid rgba(200,155,84,.4)}',
    '.nkrm-prog i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#D9B777,#C89B54);transition:width .25s ease}',
    '.nkrm-prog span{position:relative;display:block;text-align:center;line-height:26px;font-size:11.5px;font-weight:700;color:#17120a}',
    '.nkrm-msg{min-height:0;margin:0;font-size:12.5px;line-height:1.5;color:#e11d48}',
    '.nkrm-msg:not(:empty){margin:0 0 14px}',
    '.nkrm-rvwrap{margin-top:14px;max-width:360px}',
    '.nkrm-rv{display:block;width:100%;max-height:300px;border-radius:14px;background:#0B0B0E;border:1px solid var(--card-border,rgba(0,0,0,.1))}',
    '@media (prefers-reduced-motion:reduce){.nkrm-preset,.nkrm-prog i{transition:none}.nkrm-preset:hover{transform:none}}'
  ].join('');
  function injectCss() {
    if (document.getElementById('nkrm-css')) return;
    var s = document.createElement('style'); s.id = 'nkrm-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---------------- avatar presets (canvas -> small JPEG, so they pass the same data-URL rules as uploads) ---------------- */
  var PRESETS = [
    { n: 'Gold star',      bg: ['#EBD6A8', '#C89B54'], g: 'M12 2l2.9 6.6L22 9.3l-5 5 1.2 7.1L12 18l-6.2 3.4L7 14.3l-5-5 7.1-.7z' },
    { n: 'Rose heart',     bg: ['#F4CFCF', '#D98A94'], g: 'M12 21C5 16 2 12.5 2 8.6 2 5.9 4 4 6.6 4c1.9 0 3.7 1 5.4 3 1.7-2 3.5-3 5.4-3C20 4 22 5.9 22 8.6 22 12.5 19 16 12 21z' },
    { n: 'Sage leaf',      bg: ['#D2E5D3', '#7FAE8A'], g: 'M5 19C5 10 10 4 20 4c0 10-5 16-13 16-1 0-2-.3-2-1z' },
    { n: 'Lavender moon',  bg: ['#DAD8F3', '#8E86D6'], g: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z' },
    { n: 'Sky drop',       bg: ['#D2E7F5', '#6FA8CF'], g: 'M12 2.5C12 2.5 5 10 5 15a7 7 0 0 0 14 0c0-5-7-12.5-7-12.5z' },
    { n: 'Peach sun',      bg: ['#F8E0C8', '#E39A62'], sun: true },
    { n: 'Obsidian spark', bg: ['#3A3340', '#0B0B0E'], g: 'M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z' },
    { n: 'Orchid flower',  bg: ['#F3D8EA', '#C77DB4'], flower: true }
  ];
  var presetCache = [];
  function presetDataUrl(i) {
    if (presetCache[i]) return presetCache[i];
    var p = PRESETS[i], size = 160, c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'); if (!x) return '';
    var gr = x.createLinearGradient(0, 0, size, size); gr.addColorStop(0, p.bg[0]); gr.addColorStop(1, p.bg[1]);
    x.fillStyle = gr; x.fillRect(0, 0, size, size);
    x.save(); x.translate(size / 2, size / 2); var sc = (size * 0.5) / 24; x.scale(sc, sc); x.translate(-12, -12);
    x.fillStyle = 'rgba(255,255,255,.95)'; x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineCap = 'round';
    if (p.g && typeof Path2D === 'function') { x.fill(new Path2D(p.g)); }
    else if (p.sun) {
      x.beginPath(); x.arc(12, 12, 4.6, 0, Math.PI * 2); x.fill(); x.lineWidth = 1.9;
      for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; x.beginPath(); x.moveTo(12 + Math.cos(a) * 7.6, 12 + Math.sin(a) * 7.6); x.lineTo(12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10); x.stroke(); }
    } else if (p.flower) {
      for (var j = 0; j < 6; j++) { var b = j * Math.PI / 3; x.beginPath(); x.arc(12 + Math.cos(b) * 5, 12 + Math.sin(b) * 5, 4.2, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = p.bg[1]; x.beginPath(); x.arc(12, 12, 2.6, 0, Math.PI * 2); x.fill();
    }
    x.restore();
    presetCache[i] = c.toDataURL('image/jpeg', 0.86);
    return presetCache[i];
  }

  /* ---------------- image helpers ---------------- */
  function readImage(file, ok, fail) {
    if (!file || !/^image\//.test(file.type)) { fail('Please choose an image file (JPG, PNG or WebP).'); return; }
    if (file.size > MAX_PHOTO_FILE) { fail('That image is too large (12 MB max).'); return; }
    var reader = new FileReader();
    reader.onerror = function () { fail('Could not read that image.'); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { fail('That image format isn\u2019t supported. Please use JPG, PNG or WebP.'); };
      img.onload = function () { ok(img); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function squareAvatar(file, size, ok, fail) {
    readImage(file, function (img) {
      var side = Math.min(img.width, img.height), sx = (img.width - side) / 2, sy = (img.height - side) / 2;
      var c = document.createElement('canvas'); c.width = size; c.height = size;
      var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, size, size);
      x.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      ok(c.toDataURL('image/jpeg', 0.84));
    }, fail);
  }
  function resizePhoto(file, ok, fail) {
    readImage(file, function (img) {
      var w = img.width, h = img.height, m = Math.max(w, h);
      if (m > PHOTO_SIDE) { w = Math.round(w * PHOTO_SIDE / m); h = Math.round(h * PHOTO_SIDE / m); }
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
      x.drawImage(img, 0, 0, w, h);
      ok(c.toDataURL('image/jpeg', 0.8));
    }, fail);
  }

  /* ---------------- Firebase Storage (loaded only when a video is actually uploaded) ---------------- */
  function ensureStorage() {
    return new Promise(function (resolve, reject) {
      if (!(g.firebase && g.firebase.apps && g.firebase.apps.length)) { reject(new Error('The upload service is not available right now.')); return; }
      if (typeof g.firebase.storage === 'function') { resolve(); return; }
      var s = document.createElement('script'); s.src = STORAGE_SRC; s.async = true;
      s.onload = function () { typeof g.firebase.storage === 'function' ? resolve() : reject(new Error('The upload service is not available right now.')); };
      s.onerror = function () { reject(new Error('Could not reach the upload service.')); };
      document.head.appendChild(s);
    });
  }

  var ICON = {
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    vid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="14" height="14" rx="3"/><path d="M16 10l6-3v10l-6-3z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  /* ---------------- the widget ---------------- */
  function mount(host, opts) {
    if (!host) return null;
    opts = opts || {};
    injectCss();
    var id = ++uid, maxPhotos = opts.maxPhotos || MAX_PHOTOS;
    var st = { avatar: '', presetIx: -1, photos: [], video: null, videoUrl: '', busy: 0, uploading: false };

    host.className = (host.className ? host.className + ' ' : '') + 'nkrm';
    host.innerHTML =
      '<div class="nkrm-block">' +
        '<div class="nkrm-label">Profile avatar <span>(optional)</span></div>' +
        '<div class="nkrm-ava-row">' +
          '<div class="nkrm-ava" data-r="avaBox">' + ICON.user + '<img data-r="avaImg" alt="Your avatar preview"></div>' +
          '<div class="nkrm-ava-side">' +
            '<div class="nkrm-presets" role="radiogroup" aria-label="Choose an avatar" data-r="presets"></div>' +
            '<div class="nkrm-btns">' +
              '<label class="nkrm-pick" for="nkrm-ava-' + id + '">' + ICON.cam + 'Upload your own</label>' +
              '<input type="file" id="nkrm-ava-' + id + '" accept="image/*" hidden data-r="avaFile">' +
              '<button type="button" class="nkrm-rm" data-r="avaRm">' + ICON.x + 'Remove</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="nkrm-block">' +
        '<div class="nkrm-label">Photos <span>(optional, up to ' + maxPhotos + ')</span><b data-r="count" aria-live="polite">0/' + maxPhotos + '</b></div>' +
        '<div class="nkrm-grid" data-r="grid"></div>' +
        '<input type="file" id="nkrm-ph-' + id + '" accept="image/*" multiple hidden data-r="phFile">' +
      '</div>' +
      '<div class="nkrm-block">' +
        '<div class="nkrm-label">Video <span>(optional \u00b7 MP4 or WebM \u00b7 up to 25 MB and 60 seconds)</span></div>' +
        '<div class="nkrm-btns" data-r="vidPick"><label class="nkrm-pick" for="nkrm-vid-' + id + '">' + ICON.vid + 'Add a video</label></div>' +
        '<input type="file" id="nkrm-vid-' + id + '" accept="video/mp4,video/webm,.mp4,.webm" hidden data-r="vidFile">' +
        '<div class="nkrm-vprev" data-r="vprev" hidden><video controls playsinline preload="metadata" data-r="vplayer" aria-label="Your video preview"></video>' +
          '<button type="button" class="nkrm-rm show" data-r="vrm">' + ICON.x + 'Remove video</button></div>' +
        '<div class="nkrm-prog" data-r="prog" hidden role="progressbar" aria-valuemin="0" aria-valuemax="100"><i data-r="progBar"></i><span data-r="progTxt">Uploading video\u2026</span></div>' +
      '</div>' +
      '<p class="nkrm-msg" data-r="msg" role="alert" aria-live="assertive"></p>';

    function r(n) { return host.querySelector('[data-r="' + n + '"]'); }
    var ui = {
      avaBox: r('avaBox'), avaImg: r('avaImg'), presets: r('presets'), avaFile: r('avaFile'), avaRm: r('avaRm'),
      count: r('count'), grid: r('grid'), phFile: r('phFile'),
      vidPick: r('vidPick'), vidFile: r('vidFile'), vprev: r('vprev'), vplayer: r('vplayer'), vrm: r('vrm'),
      prog: r('prog'), progBar: r('progBar'), progTxt: r('progTxt'), msg: r('msg')
    };

    function say(msg) { ui.msg.textContent = msg || ''; if (msg && typeof opts.onError === 'function') opts.onError(msg); }

    /* avatar */
    function paintPresets() {
      Array.prototype.forEach.call(ui.presets.children, function (b, i) { b.setAttribute('aria-checked', i === st.presetIx ? 'true' : 'false'); });
    }
    function setAvatar(src, presetIx) {
      st.avatar = src || ''; st.presetIx = (typeof presetIx === 'number') ? presetIx : -1;
      if (src) { ui.avaImg.src = src; ui.avaBox.classList.add('has'); } else { ui.avaImg.removeAttribute('src'); ui.avaBox.classList.remove('has'); }
      ui.avaRm.classList.toggle('show', !!src);
      paintPresets();
    }
    PRESETS.forEach(function (p, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nkrm-preset';
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.setAttribute('aria-label', p.n);
      var im = document.createElement('img'); im.alt = ''; im.src = presetDataUrl(i); b.appendChild(im);
      b.addEventListener('click', function () { say(''); setAvatar(presetDataUrl(i), i); });
      ui.presets.appendChild(b);
    });
    ui.avaFile.addEventListener('change', function () {
      var f = this.files && this.files[0]; this.value = ''; if (!f) return;
      say(''); st.busy++;
      squareAvatar(f, 160, function (d) { st.busy--; setAvatar(d, -1); }, function (m) { st.busy--; say(m); });
    });
    ui.avaRm.addEventListener('click', function () { setAvatar('', -1); });

    /* photos */
    function paintPhotos() {
      ui.count.textContent = st.photos.length + '/' + maxPhotos;
      var html = '';
      st.photos.forEach(function (src, i) {
        html += '<div class="nkrm-ph"><img src="' + esc(src) + '" alt="Review photo ' + (i + 1) + ' preview">' +
          '<button type="button" class="nkrm-x" data-rm="' + i + '" aria-label="Remove photo ' + (i + 1) + '">' + ICON.x + '</button></div>';
      });
      if (st.photos.length < maxPhotos) html += '<label class="nkrm-add" for="nkrm-ph-' + id + '">' + ICON.plus + 'Add photos</label>';
      ui.grid.innerHTML = html;
    }
    ui.grid.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-rm]') : null; if (!b) return;
      st.photos.splice(Number(b.getAttribute('data-rm')), 1); say(''); paintPhotos();
    });
    ui.phFile.addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files || []); this.value = ''; if (!files.length) return;
      var room = maxPhotos - st.photos.length - st.busy;
      if (room <= 0) { say('You can add up to ' + maxPhotos + ' photos.'); return; }
      if (files.length > room) { say('Only ' + maxPhotos + ' photos are allowed, so the first ' + room + ' were added.'); files = files.slice(0, room); } else say('');
      var out = new Array(files.length), left = files.length;
      files.forEach(function (f, i) {
        st.busy++;
        resizePhoto(f, function (d) { out[i] = d; done(); }, function (m) { say(m); done(); });
      });
      function done() {
        st.busy--; left--;
        if (left === 0) { out.forEach(function (d) { if (d && st.photos.length < maxPhotos) st.photos.push(d); }); paintPhotos(); }
      }
    });

    /* video */
    function clearVideo() {
      if (st.videoUrl) { try { URL.revokeObjectURL(st.videoUrl); } catch (e) {} }
      st.video = null; st.videoUrl = '';
      try { ui.vplayer.pause(); } catch (e2) {}
      ui.vplayer.removeAttribute('src'); try { ui.vplayer.load(); } catch (e3) {}
      ui.vprev.hidden = true; ui.vidPick.style.display = '';
    }
    ui.vidFile.addEventListener('change', function () {
      var f = this.files && this.files[0]; this.value = ''; if (!f) return;
      say('');
      var ext = VIDEO_TYPES[f.type] || (/\.mp4$/i.test(f.name) ? 'mp4' : (/\.webm$/i.test(f.name) ? 'webm' : ''));
      if (!ext) { say('Please choose an MP4 or WebM video.'); return; }
      if (f.size > MAX_VIDEO_FILE) { say('That video is too large (25 MB max).'); return; }
      clearVideo(); st.busy++;
      var url = URL.createObjectURL(f), probe = document.createElement('video');
      probe.preload = 'metadata'; probe.muted = true;
      probe.onloadedmetadata = function () {
        st.busy--;
        if (probe.duration && probe.duration > MAX_VIDEO_SEC + 0.5) { try { URL.revokeObjectURL(url); } catch (e) {} say('Videos can be up to ' + MAX_VIDEO_SEC + ' seconds long.'); return; }
        st.video = { file: f, ext: ext, type: VIDEO_TYPES[f.type] ? f.type : 'video/' + ext }; st.videoUrl = url;
        ui.vplayer.src = url; ui.vprev.hidden = false; ui.vidPick.style.display = 'none';
      };
      probe.onerror = function () { st.busy--; try { URL.revokeObjectURL(url); } catch (e) {} say('That video can\u2019t be previewed. Please use an H.264 MP4 or a WebM file.'); };
      probe.src = url;
    });
    ui.vrm.addEventListener('click', function () { clearVideo(); say(''); });

    function showProgress(pct, label) {
      ui.prog.hidden = false; ui.progBar.style.width = pct + '%';
      ui.progTxt.textContent = label || ('Uploading video\u2026 ' + pct + '%'); ui.prog.setAttribute('aria-valuenow', String(pct));
    }
    function hideProgress() { ui.prog.hidden = true; ui.progBar.style.width = '0'; }

    function uploadVideo(onProgress) {
      if (!st.video) return Promise.resolve('');
      if (st.uploading) return Promise.reject(new Error('Your video is already uploading.'));
      st.uploading = true; showProgress(0, 'Preparing upload\u2026');
      var v = st.video;
      return ensureStorage().then(function () {
        return new Promise(function (resolve, reject) {
          var name = 'review-videos/' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36) + '.' + v.ext;
          var task = g.firebase.storage().ref(name).put(v.file, { contentType: v.type }), stall;
          function arm() { clearTimeout(stall); stall = setTimeout(function () { try { task.cancel(); } catch (e) {} reject(new Error('The video upload stalled. Please check your connection.')); }, STALL_MS); }
          arm();
          task.on('state_changed', function (s) {
            arm();
            var pct = s.totalBytes ? Math.round(s.bytesTransferred / s.totalBytes * 100) : 0;
            showProgress(pct); if (typeof onProgress === 'function') onProgress(pct);
          }, function (err) {
            clearTimeout(stall);
            reject(new Error(err && err.code === 'storage/unauthorized' ? 'Video uploads are not enabled yet.' : 'The video could not be uploaded.'));
          }, function () {
            clearTimeout(stall);
            task.snapshot.ref.getDownloadURL().then(function (u) { resolve(u); }, function () { reject(new Error('The video could not be uploaded.')); });
          });
        });
      }).then(function (u) { st.uploading = false; hideProgress(); return safeVideoUrl(u); },
              function (e) { st.uploading = false; hideProgress(); throw e; });
    }

    function reset() {
      clearVideo(); st.photos = []; st.busy = 0; st.uploading = false;
      setAvatar('', -1); paintPhotos(); say(''); hideProgress();
    }

    paintPhotos();
    return {
      getAvatar: function () { return st.avatar; },
      getPhotos: function () { return st.photos.slice(); },
      hasVideo: function () { return !!st.video; },
      isBusy: function () { return st.busy > 0; },
      isUploading: function () { return st.uploading; },
      uploadVideo: uploadVideo,
      error: say,
      reset: reset
    };
  }

  g.NikoraReviewMedia = { mount: mount, videoHtml: videoHtml, safeVideoUrl: safeVideoUrl, injectCss: injectCss, MAX_PHOTOS: MAX_PHOTOS };
})(window);