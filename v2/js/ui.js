/* My Neobank demo - UI kernel: navigation, rendering, shared components. */
(function (G) {
  'use strict';
  var DB = G.DB;
  var S = G.S = { stack: [{ name: 'welcome', p: {} }], form: {}, sheet: null, ov: null, toast: null, intro: true, fresh: true, key: '' };
  var Screens = G.Screens = {}, Sheets = G.Sheets = {}, A = G.Actions = {};
  var root, toastTimer;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) {
    var s = String(v == null ? '' : v).replace(/\s/g, '');
    s = (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) ? s.replace(/,/g, '') : s.replace(',', '.');
    var x = parseFloat(s); return isFinite(x) && x > 0 ? x : 0;
  }

  var IC = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3 7 9l5 12 5-12-2-6"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    send: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m9 15 6-6M10 9h5v5"/>',
    down: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m15 9-6 6M14 15H9v-5"/>',
    swap: '<path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2"/><path d="M20 4v4h-4M4 20v-4h4"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    full: '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>',
    share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M7 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
    back: '<path d="m15 5-7 7 7 7"/>', chev: '<path d="m9 5 7 7-7 7"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    bank: '<path d="m3 9 9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="16.5" cy="13.5" r="1.2"/>',
    shield: '<path d="m12 3 8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="m9 12 2.2 2.2L15 10.5"/>',
    heirs: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9" r="2.4"/><path d="M16.5 14.6c2.6.2 4.5 2 4.5 4.9"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.700l1-1"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    snow: '<path d="M12 3v18M4.2 7.500l15.600 9M19.800 7.500l-15.600 9"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bolt: '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v.500"/>',
    out: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.300 6.300"/><path d="M20 5v6h-6"/>',
    face: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9v2M15 9v2M12 9v4h-1M9 15.500c1.800 1.400 4.200 1.400 6 0"/>',
    wave: '<path d="M8.500 7.500a7 7 0 0 1 0 9M12 5a11 11 0 0 1 0 14M15.500 2.800a15 15 0 0 1 0 18.400"/>',
    pct: '<path d="M6 18 18 6"/><circle cx="7.500" cy="7.500" r="2.500"/><circle cx="16.500" cy="16.500" r="2.500"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    chart: '<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    users: '<circle cx="12" cy="8" r="3.500"/><path d="M5 20c0-3.600 3.100-6 7-6s7 2.400 7 6"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9.500 8h3.700a2 2 0 0 1 0 4H9.500zM9.500 12h4.200a2 2 0 0 1 0 4H9.500zM9.500 8v8M11 6.500V8M13 6.500V8M11 16v1.500M13 16v1.500"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.300a2.600 2.600 0 1 1 3.700 2.400c-.800.400-1.200.900-1.200 1.800M12 16.800v.200"/>',
    map: '<path d="M9 4 3 6.500v13.500l6-2.500 6 2.500 6-2.500V4l-6 2.500z"/><path d="M9 4v13.500M15 6.500V20"/>'
  };
  function icon(n, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (IC[n] || IC.info) + '</svg>'; }
  var LOGO = {
    XRP: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M5 5.500h2.700l2.900 2.900a2 2 0 0 0 2.800 0l2.900-2.900H19l-4.200 4.200a4 4 0 0 1-5.600 0zM5 18.500h2.700l2.900-2.900a2 2 0 0 1 2.800 0l2.900 2.900H19l-4.200-4.200a4 4 0 0 0-5.600 0z"/></svg>',
    ETH: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 3 6.500 12 12 15.200 17.500 12z"/><path d="M12 16.400 6.500 13.200 12 21l5.500-7.800z" opacity=".65"/></svg>',
    USDT: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M7 6h10v2.800h-3.500v1.700c2.700.2 4.500.8 4.500 1.500s-1.800 1.300-4.500 1.500V19h-3v-5.500C7.800 13.300 6 12.700 6 12s1.800-1.300 4.500-1.500V8.800H7z"/></svg>',
    USDC: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.700" stroke-linecap="round"><path d="M9.300 5.300a7.200 7.200 0 0 0 0 13.400M14.700 5.300a7.200 7.200 0 0 1 0 13.400"/><path d="M14 9.800c-.3-.9-1-1.300-2-1.300-1.200 0-2 .6-2 1.600 0 2.200 4.100 1.100 4.100 3.500 0 1-.9 1.700-2.100 1.700-1.100 0-1.900-.5-2.200-1.500M12 7.300v1.200M12 15.300v1.400"/></svg>',
    BTC: '<svg viewBox="0 0 24 24" fill="#fff"><path fill-rule="evenodd" d="M8 5.500h2.300V4h1.400v1.500h.9V4H14v1.600c1.700.3 2.800 1.200 2.800 2.700 0 1-.5 1.800-1.400 2.200 1.300.4 2.100 1.300 2.100 2.700 0 1.900-1.300 3-3.500 3.200V18h-1.400v-1.500h-.9V18h-1.400v-1.500H8V15h1V7H8zm3.200 1.500v3.200h1.700c1.100 0 1.700-.6 1.700-1.600S14 7 12.900 7zm0 4.700V15h2c1.200 0 1.900-.6 1.900-1.700s-.7-1.600-1.900-1.600z"/></svg>'
  };
  function aico(sym, cls) { var a = DB.ASSETS[sym]; return '<span class="aico ' + (a.kind === 'fiat' ? 'fiat ' : '') + (cls || '') + '" style="background:' + a.color + '">' + (LOGO[sym] || a.glyph) + '</span>'; }
  function info(k) { return '<button class="ib" data-act="sheet" data-name="info" data-k="' + k + '" aria-label="What is this?">?</button>'; }
  function spark(sym, w, h, big) {
    var pts = DB.series(sym), min = Math.min.apply(null, pts), max = Math.max.apply(null, pts), span = (max - min) || 1, n = pts.length - 1;
    var up = pts[n] >= pts[0], col = up ? '#5FD08A' : '#F2714F', pad = big ? 6 : 2;
    var d = pts.map(function (v, i) { return (i ? 'L' : 'M') + (i / n * w).toFixed(1) + ' ' + (pad + (1 - (v - min) / span) * (h - 2 * pad)).toFixed(1); }).join('');
    return '<svg class="spark' + (big ? ' big' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + (big ? '<defs><linearGradient id="sg' + sym + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".28"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs><path d="' + d + 'V' + h + 'H0Z" fill="url(#sg' + sym + ')"/>' : '') + '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (big ? 2.2 : 1.6) + '" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }
  function change(sym) { var p = DB.series(sym); return p[p.length - 1] / p[0] - 1; }
  function avatar(a, cls) {
    return '<span class="av ' + (a.type === 'company' ? 'co ' : '') + (cls || '') + '" style="background:linear-gradient(135deg,hsl(' + a.hue + ' 46% 36%),hsl(' + ((a.hue + 40) % 360) + ' 52% 17%))">' + esc(DB.initials(a.name)) + '</span>';
  }
  function dataAttrs(d) { if (!d) return ''; return Object.keys(d).map(function (k) { return ' data-' + k + '="' + esc(d[k]) + '"'; }).join(''); }

  /* ---------- components ---------- */
  function top(title, o) {
    o = o || {};
    var gap = '<span style="width:42px;flex:none"></span>';
    return '<div class="top">' + (o.noBack ? gap : '<button class="rb" data-act="back" aria-label="Back">' + icon('back') + '</button>') + '<h1>' + esc(title) + '</h1>' + (o.right || gap) + '</div>';
  }
  function row(o) {
    var tag = o.act ? 'button' : 'div';
    return '<' + tag + ' class="row ' + (o.cls || '') + '"' + (o.act ? ' data-act="' + o.act + '"' : '') + dataAttrs(o.data) + '>' + (o.left || '') +
      '<span class="grow"><div class="t ell">' + o.t + '</div>' + (o.s ? '<div class="s ell">' + o.s + '</div>' : '') + '</span>' +
      ((o.rt || o.rs) ? '<span class="r"><div class="t ' + (o.rc || '') + '">' + (o.rt || '') + '</div>' + (o.rs ? '<div class="s">' + o.rs + '</div>' : '') + '</span>' : '') +
      (o.chev ? icon('chev', 'mut') : '') + (o.end || '') + '</' + tag + '>';
  }
  function kv(k, v, cls) { return '<div class="kv"><span>' + k + '</span><span class="' + (cls || '') + '">' + v + '</span></div>'; }
  function sec(title, link, act, data, ik) { return '<div class="sec"><h2>' + esc(title) + (ik ? ' ' + info(ik) : '') + '</h2>' + (link ? '<button data-act="' + act + '"' + dataAttrs(data) + '>' + esc(link) + '</button>' : '') + '</div>'; }
  var TXI = { swap: 'swap', topup: 'plus', card: 'card', cashback: 'pct', loan: 'shield', protect: 'shield', fee: 'clock', inherit: 'heirs', 'in': 'down', out: 'send' };
  function txRow(t) {
    var peer = t.peer && DB.acc(t.peer), neutral = t.meta && t.meta.neutral, pos = t.amt > 0;
    return row({
      left: peer ? avatar(peer) : '<span class="ic">' + icon(TXI[t.kind] || 'send') + '</span>', t: esc(t.title), s: esc(DB.when(t.ts)),
      rt: DB.fmt(t.asset, t.amt, { plus: pos && !neutral }), rc: neutral ? 'acc' : (pos ? 'ok' : ''), act: 'sheet', data: { name: 'tx', id: t.id }
    });
  }
  function chips(name, items, sel, wrap) {
    return '<div class="chips' + (wrap ? ' wrap' : '') + '">' + items.map(function (it) {
      var v = it[0], label = it[1];
      return '<button class="chip' + (String(sel) === String(v) ? ' on' : '') + '" data-act="set" data-k="' + name + '" data-v="' + esc(v) + '">' + label + '</button>';
    }).join('') + '</div>';
  }
  function assetChips(name, syms, sel) { return chips(name, syms.map(function (s) { return [s, aico(s, 'sm') + s]; }), sel); }
  function field(label, name, form, o) {
    o = o || {};
    return (label ? '<label class="lbl">' + esc(label) + '</label>' : '') + '<div class="fld"><input name="' + name + '" value="' + esc(form[name] == null ? (o.def || '') : form[name]) + '" placeholder="' + esc(o.ph || '') + '" autocomplete="off" autocapitalize="' + (o.cap || 'off') + '" spellcheck="false"' + (o.auto ? ' data-autofocus' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + '>' + (o.sfx ? '<span class="sfx">' + o.sfx + '</span>' : '') + '</div>';
  }
  function amount(form, hint) {
    return '<label class="amt"><input name="amt" data-autofocus inputmode="decimal" placeholder="0" value="' + esc(form.amt || '') + '" autocomplete="off"><div class="u" data-live="amt-hint">' + hint + '</div></label>';
  }
  function sw(on, act, data) { return '<button class="sw' + (on ? ' on' : '') + '" data-act="' + act + '"' + dataAttrs(data) + ' aria-label="Toggle"></button>'; }

  /* ---------- navigation ---------- */
  function cur() { return S.stack[S.stack.length - 1]; }
  function enter() { var sc = Screens[cur().name]; if (sc && sc.enter) sc.enter(cur().p, S.form); }
  function go(name, p) { cur().form = S.form; S.stack.push({ name: name, p: p || {} }); S.form = {}; S.sheet = null; S.fresh = true; S.dir = 'fwd'; enter(); render(); }
  function replace(name, p) { S.stack[S.stack.length - 1] = { name: name, p: p || {} }; S.form = {}; S.sheet = null; S.fresh = true; S.dir = 'fwd'; enter(); render(); }
  function tab(name) { S.stack = [{ name: name, p: {} }]; S.form = {}; S.sheet = null; S.fresh = true; S.dir = 'tab'; enter(); render(); }
  function back() {
    if (S.ov) return true;
    if (S.sheet) { S.sheet = null; render(); return true; }
    var sc = Screens[cur().name];
    if (sc && sc.back && sc.back(cur().p, S.form)) { render(); return true; }
    if (S.stack.length > 1) { S.stack.pop(); S.form = cur().form || {}; S.fresh = true; S.dir = 'back'; render(); return true; }
    return false;
  }
  function sheet(name, p) { S.sheet = { name: name, p: p || {} }; render(); }
  function closeSheet() { S.sheet = null; render(); }

  /* ---------- render ---------- */
  function strip(name) {
    if (name === 'welcome' || name === 'create' || !DB.me()) return '<div class="strip"><b>DEMO</b> paper money · nothing here is real</div>';
    return '<button class="strip" data-act="sheet" data-name="guide"><b>DEMO</b> paper money <i>Guide ›</i></button>';
  }
  function tabbar(active) {
    var me = DB.me();
    var tabs = [['home', 'Home', 'home'], ['crypto', 'Crypto', 'coin'], ['cards', 'Cards', 'card'], me.type === 'company' ? ['business', 'Get paid', 'link'] : ['premium', 'Wealth', 'gem'], ['profile', 'Profile', 'user']];
    if (DB.layout() === 'B') tabs.splice(1, 1);
    return '<nav class="tabbar n' + tabs.length + '">' + tabs.map(function (t) { return '<button class="' + (t[0] === active ? 'on' : '') + '" data-act="tab" data-to="' + t[0] + '">' + icon(t[2]) + t[1] + '</button>'; }).join('') + '</nav>';
  }
  function build() {
    var c = cur();
    if (!DB.me() && c.name !== 'welcome' && c.name !== 'create') { S.stack = [{ name: 'welcome', p: {} }]; c = cur(); }
    var sc = Screens[c.name] || Screens.welcome, tb = typeof sc.tab === 'function' ? sc.tab() : sc.tab;
    return '<div class="phone"><div class="app' + (S.intro && c.name === 'welcome' ? ' intro' : '') + (tb ? ' hastab' : '') + '"><div class="orbs"><i></i><i></i></div>' +
      '<div class="sbar"><b>9:41</b><span><svg viewBox="0 0 18 12" width="18" height="12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx=".7"/><rect x="5" y="5.500" width="3" height="6.500" rx=".7"/><rect x="10" y="3" width="3" height="9" rx=".7"/><rect x="15" y="0" width="3" height="12" rx=".7"/></svg><svg viewBox="0 0 26 12" width="26" height="12" fill="none" stroke="#fff"><rect x=".7" y=".7" width="21.600" height="10.600" rx="3.200" opacity=".5"/><rect x="2.500" y="2.500" width="18" height="7" rx="1.800" fill="#fff" stroke="none"/><path d="M24.500 4v4" stroke-linecap="round" opacity=".5"/></svg></span></div>' + strip(c.name) +
      '<div class="scroll' + (tb ? '' : ' notab') + '" id="scroll"><div class="' + (S.fresh ? 'in ' + (S.dir || '') : '') + '">' + sc.render(c.p, S.form) + '</div></div>' +
      (tb ? tabbar(tb) : '') +
      (S.sheet ? '<div class="veil" data-act="veil"><div class="sheet"><button class="sx" data-act="close" aria-label="Close">' + icon('x') + '</button>' + Sheets[S.sheet.name](S.sheet.p, S.form) + '</div></div>' : '') +
      (S.ov ? '<div class="ov">' + S.ov + '</div>' : '') +
      (S.toast ? '<div class="toast ' + (S.toast.kind || '') + '">' + esc(S.toast.msg) + '</div>' : '') +
      '</div></div>';
  }
  function render() {
    var c = cur(), key = c.name + JSON.stringify(c.p), el = document.getElementById('scroll');
    var keep = (!S.fresh && key === S.key && el) ? el.scrollTop : 0;
    root.innerHTML = build();
    S.key = key;
    el = document.getElementById('scroll'); if (el && keep) el.scrollTop = keep;
    var sc = Screens[cur().name]; if (sc && sc.after) sc.after(root, S.fresh);
    var wasFresh = S.fresh; S.fresh = false; fit(); if (wasFresh) countUp();
    var fk = key + '|' + (S.sheet ? S.sheet.name : '');
    /* mouse devices: a new screen focuses its main field; after a re-render (currency chip etc.) the amount keeps the focus */
    if (!S.ov && FINE) focusMain(fk !== S.fkey ? '[data-autofocus]' : 'input[name=amt]');
    S.fkey = fk;
  }
  var FINE = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function scope() { return S.sheet ? root.querySelector('.sheet') : document.getElementById('scroll'); }
  function focusMain(sel) {
    var sc = scope(), el = sc && sc.querySelector(sel); if (!el) return null;
    try { el.focus({ preventScroll: true }); var n = el.value.length; el.setSelectionRange(n, n); } catch (e) { /* some input types have no selection */ }
    return el;
  }
  function fit() {
    var els = root.querySelectorAll('.hero .v');
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; el.style.fontSize = '';
      var size = parseFloat(getComputedStyle(el).fontSize) || 40, n = 0;
      while (el.scrollWidth > el.clientWidth + 1 && size > 18 && n < 16) { size -= 2; el.style.fontSize = size + 'px'; n++; }
    }
  }
  function countUp() {
    var els = root.querySelectorAll('[data-count]');
    Array.prototype.forEach.call(els, function (el) {
      var to = +el.getAttribute('data-count'), pre = el.getAttribute('data-pre') || '', dec = +(el.getAttribute('data-dec') || 2), t0 = 0;
      if (!(to > 0) || !window.requestAnimationFrame) return;
      function step(t) {
        if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3);
        if (!el.isConnected) return;
        el.textContent = pre + DB.nf(to * (0.94 + 0.06 * e), dec);
        if (k < 1) requestAnimationFrame(step); else fit();
      }
      requestAnimationFrame(step);
    });
  }
  /* Re-render only the [data-live] regions, so typing never loses focus. */
  function patch() {
    var tmp = document.createElement('div'), was = S.fresh; S.fresh = false; tmp.innerHTML = build(); S.fresh = was;
    var live = root.querySelectorAll('[data-live]');
    for (var i = 0; i < live.length; i++) {
      var el = live[i], src = tmp.querySelector('[data-live="' + el.getAttribute('data-live') + '"]');
      if (!src) continue;
      if (el.innerHTML !== src.innerHTML) el.innerHTML = src.innerHTML;
      if (el.className !== src.className) el.className = src.className;
      if (src.hasAttribute('disabled')) el.setAttribute('disabled', ''); else el.removeAttribute('disabled');
    }
    fit();
  }
  function toast(msg, kind) {
    S.toast = { msg: msg, kind: kind || '' };
    var app = root.querySelector('.app'), old = root.querySelector('.toast'); if (old) old.remove();
    if (app) { var d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = msg; app.appendChild(d); }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { S.toast = null; var t = root.querySelector('.toast'); if (t) t.remove(); }, 2600);
  }
  function fail(e) { if (e && e.user) toast(e.message, 'bad'); else { console.error(e); toast('Something went wrong: ' + (e && e.message || e), 'bad'); } }
  function faceId(cb, label) {
    S.sheet = null;
    S.ov = '<div><div class="face">' + icon('face') + '</div><div class="b">' + esc(label || 'Confirm with Face ID') + '</div><div class="mut sm mt">Demo · no real biometrics</div></div>';
    render();
    setTimeout(function () {
      S.ov = '<div><div class="face done">' + icon('check') + '</div><div class="b">Confirmed</div></div>'; render();
      setTimeout(function () { S.ov = null; try { cb(); } catch (e) { render(); fail(e); } }, 380);
    }, 820);
  }
  function overlay(html, ms, then) { S.sheet = null; S.ov = html; render(); setTimeout(function () { S.ov = null; then(); }, ms); }
  function done(o) { replace('done', o); }
  function copy(text) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) { /* ignore */ }
    toast('Copied');
  }
  function download(name, text, mime) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- built-in actions ---------- */
  A.go = function (d) { var p = {}; Object.keys(d).forEach(function (k) { if (k !== 'act' && k !== 'to') p[k] = d[k]; }); go(d.to, p); };
  A.tab = function (d) { tab(d.to); };
  A.back = function () { back(); };
  A.sheet = function (d) { var p = {}; Object.keys(d).forEach(function (k) { if (k !== 'act' && k !== 'name') p[k] = d[k]; }); sheet(d.name, p); };
  A.close = function () { closeSheet(); };
  A.set = function (d) { S.form[d.k] = d.v; render(); };
  A.toggle = function (d) { S.form[d.k] = !S.form[d.k]; render(); };
  A.copy = function (d) { copy(d.text); };
  A.focusAmt = function () { focusMain('input[name=amt], input[inputmode=decimal]'); };

  /* generic result screen */
  Screens.done = {
    render: function (p) {
      return '<div class="done-wrap"><div class="bigcheck">' + icon(p.icon || 'check') + '</div><h2>' + esc(p.title) + '</h2><p>' + esc(p.text || '') + '</p></div>' +
        (p.lines && p.lines.length ? '<div class="card">' + p.lines.map(function (l) { return kv(esc(l[0]), esc(l[1])); }).join('') + '</div>' : '') +
        '<div class="cta">' + (p.more ? '<button class="btn sec2 mb" data-act="doneMore">' + esc(p.more.label) + '</button>' : '') + '<button class="btn" data-act="doneOk">' + esc(p.label || 'Done') + '</button></div>';
    }
  };
  A.doneOk = function () { var p = cur().p; if (p.to) { S.stack = [{ name: p.home || 'home', p: {} }]; go(p.to, p.toP || {}); } else tab(p.home || 'home'); };
  A.doneMore = function () { var m = cur().p.more; S.stack = [{ name: 'home', p: {} }]; go(m.to, m.p || {}); };

  function boot() {
    root = document.getElementById('root');
    DB.load();
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]'); if (!el || !root.contains(el)) return;
      var name = el.getAttribute('data-act');
      if (name === 'veil') { if (e.target === el) closeSheet(); return; }
      var fn = A[name]; if (!fn) return;
      try { fn(el.dataset, el, e); } catch (err) { fail(err); }
    });
    function onInput(e) { var el = e.target; if (!el.name) return; S.form[el.name] = el.type === 'checkbox' ? el.checked : el.value; var sc = Screens[cur().name]; if (sc && sc.input) sc.input(el.name, S.form[el.name], S.form); patch(); }
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey || S.ov) return;
      var t = e.target, tag = t && t.tagName, typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') { if (typing && !S.sheet) t.blur(); else back(); return; }
      if (e.key === 'Enter' && tag === 'INPUT') {
        var sc = scope(), b = sc && (S.sheet ? sc.querySelector('.btn[data-live]') || sc.querySelector('.btn') : sc.querySelector('.cta .btn:not(.sec2)'));
        if (b && !b.disabled) { e.preventDefault(); b.click(); }
        return;
      }
      if (!typing && (/^[0-9.,]$/.test(e.key) || e.key === 'Backspace')) focusMain('input[name=amt], input[inputmode=decimal]');
    });
    try { history.pushState({ app: 1 }, ''); } catch (e) { /* ignore */ }
    window.addEventListener('popstate', function () { if (back()) { try { history.pushState({ app: 1 }, ''); } catch (e) { /* ignore */ } } });
    render();
    setTimeout(function () { S.intro = false; }, 2600);
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache is optional */ });
  }
  document.addEventListener('DOMContentLoaded', boot);

  G.UI = { info: info, spark: spark, change: change, esc: esc, num: num, icon: icon, aico: aico, avatar: avatar, top: top, row: row, kv: kv, sec: sec, txRow: txRow, chips: chips, assetChips: assetChips, field: field, amount: amount, sw: sw,
    cur: cur, go: go, replace: replace, tab: tab, back: back, sheet: sheet, closeSheet: closeSheet, render: render, patch: patch, toast: toast, fail: fail, faceId: faceId, overlay: overlay, done: done, copy: copy, download: download };
})(window);
