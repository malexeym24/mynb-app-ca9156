/* My Neobank demo v2 and later - new home, Crypto tab, card funding, demo guide and help. Loaded last: replaces v1 screens of the same name. */
(function (G) {
  'use strict';
  var DB = G.DB, U = G.UI, S = G.S, Sc = G.Screens, Sh = G.Sheets, A = G.Actions;
  var e = U.esc, ic = U.icon;
  function has(me, s) { return (me.bal[s] || 0) > 0 || (me.pledged[s] || 0) > 0 || !!DB.earnFor(me.id, s); }
  function inEarn(me, s) { var p = DB.earnFor(me.id, s); return p ? ' · ' + DB.short(p.amt) + ' in Earn' : ''; }
  function pct(x) { return (x >= 0 ? '+' : '') + DB.nf(x * 100, 1) + '%'; }

  /* ---------- help: short explainers behind every "?" ---------- */
  var INFO = {
    shield: ['Shield loan', ['Borrow USDC against your XRP without selling it.', 'Every loan comes with crash protection. If XRP falls below the protection level, the protection pays part of your loan down. Your XRP is not sold.', 'You pay interest plus a protection fee, agreed upfront. Repay any time and your XRP comes back.']],
    plans: ['Shield or Collar', ['Shield: you keep all of the upside and pay a protection fee.', 'Collar: no protection fee. In return, the gain above a ceiling price is not yours while the loan is open.', 'Both plans protect you in a crash in the same way.']],
    ltv: ['How much to borrow', ['This is the loan compared with the value of the XRP you pledge. Lower is safer and cheaper.', 'At 40% you borrow 40 dollars for every 100 dollars of XRP.']],
    level: ['Protection level', ['The XRP price below which the protection starts paying your loan down. It sits where the loan would reach 75% of the value of your XRP.', 'A typical crypto loan is liquidated around 80%: the coins are sold at the bottom. Here they stay yours.']],
    earn: ['Earn', ['Put a balance you are not using to work and earn a yearly rate on it.', 'The rate is shown before you start. Rewards are counted every second and paid to your balance once a day.', 'No lock-in. Take the full amount back any time.']],
    inherit: ['Inheritance plan', ['Choose who receives what you hold with us, and in what shares. Change it any time.', 'Nothing passes while you are alive. After a death, the heirs present the death certificate and legal documents. We verify them and release the assets to the heirs’ own accounts.', 'No keys or seed phrases to hand over.']],
    convert: ['Hold or convert', ['When a customer pays in stablecoins you choose what happens: keep them as they are, or turn them into euro the moment they arrive.', 'Either way the payment passes compliance checks first and lands with a clean accounting trail.']],
    margin: ['Our margin', ['One published margin on every conversion: 0.50%.', 'The rate you see is the rate you get. No hidden spread.']],
    cardsrc: ['Where the card takes money from', ['Your card has no separate balance and never needs a top-up.', 'It pays straight from the balance you choose. If that balance runs short, the next one covers the purchase, converted at the published margin.', 'To have more to spend, add money to that balance.']],
    pledged: ['Pledged XRP', ['XRP you pledged for a Shield loan. It is held with a regulated custodian, separate from everything else, and comes back when the loan is repaid.']],
    demo: ['About this demo', ['A clickable concept of the My Neobank app. All money is paper money and lives only in this browser.', 'Prices, rates and fees are illustrative. Open the Guide in the top strip to see what to try.', 'Demo version 3, November 2026.']]
  };
  Sh.info = function (p) {
    var it = INFO[p.k] || INFO.demo;
    return '<h3>' + e(it[0]) + '</h3><div class="card pad infotext">' + it[1].map(function (t) { return '<p>' + e(t) + '</p>'; }).join('') + '</div>';
  };
  Sh.help = function () {
    var keys = DB.me().type === 'company' ? ['convert', 'margin', 'cardsrc', 'demo'] : ['shield', 'plans', 'level', 'earn', 'inherit', 'cardsrc', 'margin', 'demo'];
    return '<h3>How it works</h3>' + keys.map(function (k) { return '<button class="opt" data-act="sheet" data-name="info" data-k="' + k + '">' + ic('help', 'acc') + '<span class="grow"><div class="t">' + e(INFO[k][0]) + '</div></span>' + ic('chev', 'mut') + '</button>'; }).join('');
  };

  /* ---------- full screen on phones ----------
     Android and desktop: the browser's Fullscreen API hides the bars (on a phone, after the first tap).
     iPhone: Safari gives a page no such switch, the way there is the Home Screen icon, so we show how. */
  var FS = G.FS = (function () {
    var d = document, el = d.documentElement, nav = navigator;
    function mm(q) { return !!(G.matchMedia && G.matchMedia(q).matches); }
    function get() { try { return localStorage.getItem('mynb_fs'); } catch (x) { return null; } }
    function set(v) { try { localStorage.setItem('mynb_fs', v); } catch (x) { /* private mode */ } }
    var ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1 && /Macintosh/.test(nav.userAgent));
    var req = el.requestFullscreen || el.webkitRequestFullscreen, exit = d.exitFullscreen || d.webkitExitFullscreen;
    var api = {
      ios: ios, touch: mm('(pointer: coarse)'), install: null,
      installed: function () { return nav.standalone === true || mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)'); },
      on: function () { return !!(d.fullscreenElement || d.webkitFullscreenElement); },
      can: function () { return !!req && !api.ios; },
      enter: function () { try { var p = req.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(function () { /* refused */ }); } catch (x) { /* refused */ } },
      leave: function () { try { var p = exit.call(d); if (p && p.catch) p.catch(function () { /* ignore */ }); } catch (x) { /* ignore */ } },
      off: function () { return get() === 'off'; }, setOff: function (v) { set(v ? 'off' : 'on'); },
      offer: function () { return !api.installed() && (api.ios || api.can()); }
    };
    if (api.can() && api.touch && !api.installed()) {
      var first = function () { d.removeEventListener('click', first, true); if (!api.off() && !api.on()) api.enter(); };
      d.addEventListener('click', first, true);
    }
    G.addEventListener('beforeinstallprompt', function (ev) { api.install = ev; });
    G.addEventListener('appinstalled', function () { api.install = null; });
    return api;
  })();
  function step(n, t, s) { return '<div class="row"><span class="stepn">' + n + '</span><span class="grow"><div class="t">' + t + '</div><div class="s">' + s + '</div></span></div>'; }
  Sh.fs = function () {
    if (FS.ios) return '<h3>Open full screen</h3><div class="mut sm c" style="margin:-8px 0 14px">On iPhone the demo runs without browser bars from a Home Screen icon.</div>' +
      '<div class="card">' + step(1, 'Open this page in Safari', 'Opened from a messenger? Choose Open in Safari first') +
      step(2, 'Tap Share ' + ic('share', 'acc inl'), 'The square with an arrow. On newer iPhones it is behind the ··· button') +
      step(3, 'Choose Add to Home Screen', 'Then open My Neobank from the new icon') + '</div>' +
      '<div class="note mt">Balances in the icon may start fresh: it keeps its own demo data.</div>';
    var on = FS.on();
    return '<h3>Full screen</h3><div class="mut sm c" style="margin:-8px 0 14px">' + (FS.touch ? 'On a phone the demo goes full screen after your first tap.' : 'Hide the browser around the demo, handy when you present it.') + '</div>' +
      '<button class="btn mb" data-act="fsToggle">' + ic('full') + (on ? 'Leave full screen' : 'Go full screen') + '</button>' +
      (FS.install ? '<button class="btn sec2 mb" data-act="fsInstall">' + ic('plus') + 'Install as an app</button>' : '') +
      '<div class="note">' + (FS.touch ? 'Installed as an app, or added to the Home screen from the browser menu, it always opens without browser bars.' : 'Press Esc to leave full screen.') + '</div>';
  };
  A.fsToggle = function () {
    var on = FS.on(); FS.setOff(on); if (on) FS.leave(); else FS.enter();
    S.sheet = null; U.render(); U.toast(on ? 'Full screen off' : 'Full screen on');
  };
  A.fsInstall = function () { var ev = FS.install; if (!ev) return; FS.install = null; S.sheet = null; U.render(); try { ev.prompt(); } catch (x) { /* already used */ } };
  function fsRow() { return FS.offer() ? U.row({ left: '<span class="ic sq">' + ic('full') + '</span>', t: 'Full screen', s: FS.ios ? 'Add the demo to your Home Screen' : 'Hide the browser bars', act: 'sheet', data: { name: 'fs' }, chev: 1 }) : ''; }
  var welcome0 = Sc.welcome.render;
  Sc.welcome.render = function (p, f) {
    var h = welcome0.call(this, p, f);
    return FS.ios && !FS.installed() ? h.replace('<div class="who">', '<div class="fsw"><button class="fspill" data-act="sheet" data-name="fs">' + ic('full') + 'Open full screen' + ic('chev') + '</button></div><div class="who">') : h;
  };

  /* ---------- home ---------- */
  function header() {
    var me = DB.me(), n = DB.unread(me.id);
    return '<div class="top"><button class="me" data-act="sheet" data-name="switch">' + U.avatar(me) + '<span class="grow"><div class="n ell">' + e(me.name) + ' <span class="mut">▾</span></div><div class="t ell">' + e(me.tag) + '</div></span></button>' +
      '<button class="rb" data-act="go" data-to="notifications" aria-label="Notifications">' + ic('bell') + (n ? '<span class="dot"></span>' : '') + '</button></div>';
  }
  function fiatRow(me, s) {
    var b = me.bal[s] || 0;
    return U.row({ left: U.aico(s), t: e(DB.ASSETS[s].name), s: s + ' account' + inEarn(me, s), rt: DB.fmt(s, b), rs: s === 'EUR' ? '' : DB.fmt('EUR', DB.eur(s, b)), act: 'go', data: { to: 'asset', s: s } });
  }
  Sc.home = {
    tab: 'home',
    render: function (p, f) {
      var me = DB.me(), t = DB.totals(me), txs = DB.txsOf(me.id).slice(0, 4), B = DB.layout() === 'B', hf = f.hf || 'all';
      var fiat = DB.ORDER.filter(function (s) { return DB.ASSETS[s].kind === 'fiat' && (has(me, s) || s === 'EUR'); });
      var cry = DB.ORDER.filter(function (s) { return DB.ASSETS[s].kind !== 'fiat' && has(me, s); });
      var loans = DB.loansOf(me.id).filter(function (l) { return l.status === 'active'; }), plan = DB.plan(me.id);
      var debt = loans.reduce(function (s, l) { return s + l.principal; }, 0);
      var open = DB.requestsOf(me.id).filter(function (q) { return q.status === 'open'; }).length;
      var people = DB.others(me.id);
      return header() +
        '<div class="hero"><div class="l">Total balance</div><div class="v" data-count="' + t.total + '" data-pre="€">€' + DB.nf(t.total, 2) + '</div><div class="s">€' + DB.short(t.fiat) + ' cash • €' + DB.short(t.crypto) + ' crypto' + (t.earn > 0 ? ' • €' + DB.short(t.earn) + ' in Earn' : '') + '</div>' +
        (loans.length ? '<button class="p" data-act="go" data-to="shield">' + ic('shield') + DB.fmt('XRP', me.pledged.XRP || 0) + ' pledged · loan ' + DB.fmt('USDC', debt) + '</button>' : '') + '</div>' +
        '<div class="acts"><button class="act" data-act="sheet" data-name="send">' + ic('send') + 'Send</button><button class="act" data-act="go" data-to="swap">' + ic('swap') + 'Swap</button><button class="act" data-act="go" data-to="add">' + ic('plus') + 'Add</button></div>' +
        (people.length ? '<div class="people">' + people.map(function (a) { return '<button class="person" data-act="go" data-to="send" data-mode="internal" data-to-acc="' + a.id + '">' + U.avatar(a, 'pp') + '<span class="ell">' + e(a.name) + '</span></button>'; }).join('') +
          '<button class="person" data-act="sheet" data-name="send"><span class="av pp more">' + ic('plus') + '</span><span>New</span></button></div>' : '') +
        (B ? U.chips('hf', [['all', 'All'], ['cash', 'Cash'], ['crypto', 'Crypto']], hf) + '<div class="card mt">' + DB.ORDER.filter(function (s) { var k = DB.ASSETS[s].kind; return (has(me, s) || s === 'EUR') && (hf === 'all' || (hf === 'cash') === (k === 'fiat')); }).map(function (s) { return DB.ASSETS[s].kind === 'fiat' ? fiatRow(me, s) : cryptoRow(me, s); }).join('') + '</div>' : '') +
        (B ? '' : U.sec('Cash') + '<div class="card">' + fiat.map(function (s) { return fiatRow(me, s); }).join('') + '</div>') +
        (B ? '' : '<button class="card pad flex mt cryptolink" data-act="tab" data-to="crypto"><span class="stack">' + (cry.length ? cry : ['XRP', 'BTC', 'USDC']).slice(0, 4).map(function (s) { return U.aico(s, 'sm'); }).join('') + '</span><span class="grow"><div class="b">Crypto</div><div class="mut sm">' + (cry.length ? cry.length + ' asset' + (cry.length > 1 ? 's' : '') + ', stablecoins included' : 'Nothing yet') + '</div></span><span class="b">€' + DB.short(t.crypto) + '</span>' + ic('chev', 'mut') + '</button>') +
        U.sec('Latest activity', 'All', 'go', { to: 'activity' }) + '<div class="card">' + (txs.length ? txs.map(U.txRow).join('') : '<div class="empty">Nothing yet. Make your first transfer.</div>') + '</div>';
    }
  };

  /* ---------- crypto tab ---------- */
  function cryptoRow(me, s, dim) {
    var A0 = DB.ASSETS[s], b = me.bal[s] || 0, pl = me.pledged[s] || 0, ch = A0.kind === 'crypto' ? U.change(s) : 0;
    return '<button class="row' + (dim ? ' dim' : '') + '" data-act="go" data-to="asset" data-s="' + s + '">' + U.aico(s) +
      '<span class="grow"><div class="t ell">' + e(A0.name) + '</div><div class="s ell">' + (A0.kind === 'crypto' ? '$' + DB.nf(DB.px(s), DB.px(s) >= 1000 ? 0 : 2) + ' <span class="' + (ch >= 0 ? 'ok' : 'bad') + '">' + pct(ch) + '</span>' : 'Stablecoin' + inEarn(me, s)) + '</div></span>' +
      (A0.kind === 'crypto' ? U.spark(s, 52, 26) : '') +
      '<span class="r"><div class="t">' + (dim ? 'Add' : DB.nf(b, 0, b >= 1000 ? 0 : A0.dec) + ' ' + s) + '</div><div class="s">' + (dim ? '' : (pl ? DB.short(pl) + ' pledged' : DB.fmt('EUR', DB.eur(s, b)))) + '</div></span></button>';
  }
  Sc.crypto = {
    tab: 'crypto',
    render: function () {
      var me = DB.me(), all = DB.ORDER.filter(function (s) { return DB.ASSETS[s].kind !== 'fiat'; });
      var held = all.filter(function (s) { return has(me, s); }), rest = all.filter(function (s) { return !has(me, s); });
      var t = DB.totals(me), loans = DB.loansOf(me.id).filter(function (l) { return l.status === 'active'; }), debt = loans.reduce(function (s, l) { return s + l.principal; }, 0);
      var stable = held.reduce(function (s, a) { return s + (DB.ASSETS[a].kind === 'stable' ? DB.eur(a, me.bal[a] || 0) : 0); }, 0);
      return U.top('Crypto', { noBack: true }) +
        '<div class="hero" style="padding-top:6px"><div class="l">Crypto balance</div><div class="v" data-count="' + t.crypto + '" data-pre="€">€' + DB.nf(t.crypto, 2) + '</div><div class="s">€' + DB.short(stable) + ' stablecoins • €' + DB.short(t.crypto - stable) + ' crypto</div>' +
        (t.pledged > 0 ? '<button class="p" data-act="sheet" data-name="info" data-k="pledged">' + ic('lock') + DB.fmt('XRP', me.pledged.XRP || 0) + ' pledged, safe in custody</button>' : '') + '</div>' +
        '<div class="acts"><button class="act" data-act="go" data-to="send" data-mode="wallet">' + ic('send') + 'Send</button><button class="act" data-act="go" data-to="swap" data-to2="x">' + ic('swap') + 'Swap</button><button class="act" data-act="go" data-to="add" data-s="XRP">' + ic('down') + 'Receive</button></div>' +
        (me.type === 'person' ? '<button class="card pad glow flex" style="width:100%" data-act="go" data-to="shield">' + ic('shield', 'acc') + '<span class="grow"><div class="b">' + (loans.length ? 'Shield loan · ' + DB.fmt('USDC', debt) : 'Borrow against your XRP') + '</div><div class="mut sm">' + (loans.length ? 'Protected. Your XRP stays yours.' : 'Get USDC without selling. Crash protection built in.') + '</div></span>' + ic('chev', 'mut') + '</button>' : '') +
        U.sec('Your assets') + '<div class="card">' + (held.length ? held.map(function (s) { return cryptoRow(me, s); }).join('') : '<div class="empty">No crypto yet. Swap some euro into USDC or XRP.</div>') + '</div>' +
        (rest.length ? U.sec('More assets') + '<div class="card">' + rest.map(function (s) { return cryptoRow(me, s, true); }).join('') + '</div>' : '') +
        '<div class="mut xs c mt">Demo prices, not market data.</div>';
    }
  };

  /* ---------- one currency / asset ---------- */
  Sc.asset = {
    render: function (p) {
      var me = DB.me(), s = p.s, A0 = DB.ASSETS[s], b = me.bal[s] || 0, pl = me.pledged[s] || 0, cr = A0.kind === 'crypto';
      var txs = DB.txsOf(me.id).filter(function (t) { return t.asset === s || (t.meta && t.meta.from === s); }).slice(0, 12), ep = DB.earnFor(me.id, s);
      var det = A0.kind === 'fiat'
        ? U.kv('Account holder', e(me.legal || me.name)) + U.kv('IBAN', '<button data-act="copy" data-text="' + e(me.iban) + '" class="acc">' + e(me.iban) + '</button>') + U.kv('Payments', s === 'EUR' ? 'SEPA Instant, SWIFT' : 'SWIFT')
        : U.kv('Network', s === 'XRP' ? 'XRP Ledger' : s === 'BTC' ? 'Bitcoin' : 'Ethereum') + U.kv('Your address', '<button data-act="copy" data-text="' + DB.address(me, s) + '" class="acc code">' + DB.address(me, s).slice(0, 14) + '… ' + '</button>');
      return U.top(A0.name) +
        '<div class="hero" style="padding-top:4px"><div style="display:grid;place-items:center;margin-bottom:12px">' + U.aico(s, 'lg') + '</div><div class="v">' + DB.fmt(s, b) + '</div>' +
        (s === 'EUR' ? '' : '<div class="s">' + DB.fmt('EUR', DB.eur(s, b)) + '</div>') +
        (pl ? '<button class="p" data-act="go" data-to="shield">' + ic('shield') + DB.fmt(s, pl) + ' pledged for a Shield loan</button>' : '') +
        (ep ? '<button class="p" data-act="go" data-to="earn">' + ic('grow') + DB.fmt(s, ep.amt) + ' in Earn · ' + DB.nf(ep.rate * 100, 1) + '% a year</button>' : '') + '</div>' +
        (cr ? '<div class="card pad" style="margin-bottom:14px"><div class="flex between"><span class="b">' + DB.fmtPx(s) + '</span><span class="pill ' + (U.change(s) >= 0 ? 'ok' : 'bad') + '">' + pct(U.change(s)) + '</span></div>' + U.spark(s, 320, 96, true) + '<div class="mut xs">Demo price history, not market data</div></div>' : '') +
        '<div class="acts"><button class="act" data-act="sheet" data-name="send" data-s="' + s + '">' + ic('send') + 'Send</button><button class="act" data-act="go" data-to="swap" data-from="' + s + '">' + ic('swap') + 'Swap</button><button class="act" data-act="go" data-to="add" data-s="' + s + '">' + ic(cr ? 'down' : 'plus') + (A0.kind === 'fiat' ? 'Add' : 'Receive') + '</button></div>' +
        (s === 'XRP' && me.type === 'person' ? '<button class="card pad glow flex" style="width:100%;margin-bottom:6px" data-act="go" data-to="shield">' + ic('shield', 'acc') + '<span class="grow"><div class="b">Borrow against your XRP</div><div class="mut sm">Shield loan · crash protection built in</div></span>' + ic('chev', 'mut') + '</button>' : '') +
        U.sec('Details') + '<div class="card">' + det + '</div>' +
        U.sec('Activity') + '<div class="card">' + (txs.length ? txs.map(U.txRow).join('') : '<div class="empty">No ' + s + ' activity yet.</div>') + '</div>';
    }
  };

  /* ---------- cards: one clear answer to "where does the money come from" ---------- */
  function srcLine(me, c) { var s = c.source || 'EUR'; return 'Pays from ' + s + ' · ' + DB.fmt(s, me.bal[s] || 0); }
  Sc.cards = {
    tab: 'cards',
    render: function () {
      var me = DB.me(), cards = DB.cardsOf(me.id), back = cards.reduce(function (s, c) { return s + c.cashback; }, 0);
      if (!cards.length) {
        var tiers = Object.keys(DB.TIERS).filter(function (k) { return DB.TIERS[k].who === me.type; }), k = tiers[tiers.length - 1];
        return U.top('Cards', { noBack: true }) + '<div style="padding:10px 18px 0">' + U.cardVisual({ tier: k, design: DB.TIERS[k].designs[0], name: me.name.toUpperCase(), last4: '0000', exp: '11/30' }) + '</div>' +
          '<div class="lead c mt2">Your card, <em>your way</em></div><p class="sub c">' + (me.type === 'company' ? 'Business cards for the team, with cashback and spend controls.' : 'Virtual in seconds. Premium and metal for private clients.') + ' It spends straight from your balance, no top-ups.</p>' +
          '<div class="cta"><button class="btn" data-act="go" data-to="cardnew">Get a card</button></div>';
      }
      return U.top('Cards', { noBack: true, right: '<button class="rb" data-act="go" data-to="cardnew" aria-label="New card">' + ic('plus') + '</button>' }) +
        cards.map(function (c) { return '<button class="cardwrap" data-act="go" data-to="card" data-id="' + c.id + '">' + U.cardVisual(c) + '<div class="cardcap"><span>' + U.aico(c.source || 'EUR', 'sm') + e(srcLine(me, c)) + '</span>' + ic('chev', 'mut') + '</div></button>'; }).join('') +
        '<div class="card">' + U.kv('Cashback earned', '<span class="ok">' + DB.fmt('EUR', back) + '</span>') + '</div>';
    }
  };
  Sc.card = {
    render: function (p, f) {
      var c = DB.card(p.id); if (!c) return U.top('Card') + '<div class="empty">Card not found.</div>';
      var me = DB.acc(c.acc), T = DB.TIERS[c.tier], s = c.source || 'EUR', pc2 = Math.min(100, c.spent / c.limit * 100);
      var txs = DB.txsOf(c.acc).filter(function (t) { return t.meta && t.meta.card === c.id; }).slice(0, 8);
      return U.top(T.name + ' card') + '<button style="display:block;width:100%" data-act="toggle" data-k="show">' + U.cardVisual(c, { show: f.show }) + '</button>' +
        '<div class="card mt"><div class="row">' + U.aico(s) + '<span class="grow"><div class="s" style="margin:0 0 2px">Pays from ' + U.info('cardsrc') + '</div><div class="t">' + e(DB.ASSETS[s].name) + '</div><div class="s">' + DB.fmt(s, me.bal[s] || 0) + ' available</div></span><button class="btn s sec2" data-act="sheet" data-name="paysrc" data-id="' + c.id + '">Change</button></div></div>' +
        '<div class="acts mt"><button class="act" data-act="toggle" data-k="show">' + ic('eye') + (f.show ? 'Hide' : 'Details') + '</button><button class="act" data-act="cardFreeze" data-id="' + c.id + '">' + ic('snow') + (c.frozen ? 'Unfreeze' : 'Freeze') + '</button><button class="act" data-act="sheet" data-name="limit" data-id="' + c.id + '">' + ic('sliders') + 'Limit</button></div>' +
        '<button class="btn demo" data-act="sheet" data-name="pay" data-id="' + c.id + '">' + ic('bolt') + 'Make a demo purchase</button>' +
        '<div class="card pad mt"><div class="flex between"><span class="mut sm">Spent this month</span><span class="b">' + DB.fmt('EUR', c.spent) + ' <span class="mut">/ ' + DB.fmt('EUR', c.limit) + '</span></span></div><div class="gauge"><b class="' + (pc2 > 85 ? 'hot' : '') + '" style="width:' + pc2 + '%"></b></div>' +
        U.kv('Cashback', T.cashback ? DB.nf(T.cashback * 100, 0, 1) + '% · earned <span class="ok">' + DB.fmt('EUR', c.cashback) + '</span>' : 'None on this card') + '</div>' +
        U.sec('Card activity') + '<div class="card">' + (txs.length ? txs.map(U.txRow).join('') : '<div class="empty">No purchases yet. Try a demo purchase.</div>') + '</div>';
    }
  };
  Sh.paysrc = function (p) {
    var c = DB.card(p.id), me = DB.acc(c.acc);
    return '<h3>Pay from</h3>' + DB.CARD_SOURCES.map(function (s) {
      var b = me.bal[s] || 0;
      return '<button class="opt" data-act="paysrcSet" data-id="' + c.id + '" data-s="' + s + '">' + U.aico(s) + '<span class="grow"><div class="t">' + e(DB.ASSETS[s].name) + '</div><div class="s">' + DB.fmt(s, b) + (s === 'EUR' ? '' : ' · converted at 0.50% when you pay') + '</div></span>' + ((c.source || 'EUR') === s ? ic('check', 'acc') : '') + '</button>';
    }).join('') + '<div class="note">No top-ups. The card spends from the balance you pick. If it runs short, the next balance covers the purchase.</div>' +
      '<button class="btn sec2 mt" data-act="go" data-to="add" data-s="' + (c.source || 'EUR') + '">' + ic('plus') + 'Add money to ' + (c.source || 'EUR') + '</button>';
  };
  A.paysrcSet = function (d) { DB.cardSet(d.id, 'source', d.s); S.sheet = null; U.render(); U.toast('Card now pays from ' + d.s); };

  /* ---------- demo guide (replaces the old controls sheet) ---------- */
  function tasks(me) {
    var friend = DB.others(me.id).filter(function (a) { return a.type === 'person'; })[0] || DB.others(me.id)[0];
    if (me.type === 'company') return [
      ['paid', 'Get paid by a customer', 'Open a payment request and let the customer pay', 'go', { to: 'getpaid' }],
      ['auto', 'Hold or convert', 'Choose what happens when stablecoins arrive', 'tab', { to: 'business' }],
      ['send', 'Pay someone', 'To an account, an IBAN or a wallet', 'sheet', { name: 'send' }],
      ['swap', 'Swap currencies', 'Any currency into any other', 'go', { to: 'swap' }],
      ['card', 'Pay with the company card', 'Open the card and make a purchase', 'tab', { to: 'cards' }]
    ];
    return [
      ['send', 'Send money' + (friend ? ' to ' + friend.name : ''), 'Instant and free between accounts', 'go', friend ? { to: 'send', mode: 'internal', 'to-acc': friend.id } : { to: 'send', mode: 'internal' }],
      ['swap', 'Swap currencies', 'Any currency into any other', 'go', { to: 'swap' }],
      ['card', 'Get a card and pay with it', 'Standard, Premium or Metal', 'tab', { to: 'cards' }],
      ['earn', 'Put idle money to work', 'Earn a yearly rate on a balance', 'go', { to: 'earn' }],
      ['loan', 'Borrow against your XRP', 'Take a Shield loan', 'go', { to: 'shield' }],
      ['crash', 'Crash the market', 'Watch the protection pay your loan down', 'guideCrash', {}],
      ['heirs', 'Name your heirs', 'Set an inheritance plan', 'go', { to: 'inherit' }]
    ];
  }
  Sh.guide = function () {
    var me = DB.me(), g = DB.guide(me.id), ts = tasks(me), done = ts.filter(function (t) { return g[t[0]]; }).length;
    var P = DB.px('XRP'), base = DB.BASE_MARKET.XRP, market = (me.bal.XRP || 0) > 0 || (me.pledged.XRP || 0) > 0;
    return '<h3>Demo guide</h3><div class="mut sm c" style="margin:-8px 0 14px">Everything here is paper money. Try these, in any order.</div>' +
      '<div class="card">' + ts.map(function (t) {
        var attrs = Object.keys(t[4]).map(function (k) { return ' data-' + k + '="' + e(t[4][k]) + '"'; }).join('');
        return '<button class="row" data-act="' + t[3] + '"' + attrs + '><span class="tick' + (g[t[0]] ? ' on' : '') + '">' + ic('check') + '</span><span class="grow"><div class="t">' + e(t[1]) + '</div><div class="s">' + e(t[2]) + '</div></span>' + ic('chev', 'mut') + '</button>';
      }).join('') + '</div><div class="mut xs c" style="margin:8px 0 2px">' + done + ' of ' + ts.length + ' done</div>' +
      (market ? '<div class="sec"><h2>Move the XRP price</h2></div><div class="card pad"><div class="flex between"><span class="mut sm">Demo market, now ' + DB.fmtPx('XRP') + '</span><span class="pill ' + (P < base ? 'bad' : 'ok') + '">' + (P >= base ? '+' : '') + DB.nf((P / base - 1) * 100, 0) + '% vs start</span></div>' +
        '<div class="chips wrap">' + [['1.4', 'Dip −30%'], ['1', 'Crash −50%'], ['0.6', 'Crash −70%'], ['4', 'Rally +100%'], ['2', 'Back to $2.00']].map(function (c) { return '<button class="chip" data-act="demoPx" data-v="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div></div>' : '') +
      '<div class="sec"><h2>Menu layout</h2></div><div class="seg two"><button class="' + (DB.layout() === 'A' ? 'on' : '') + '" data-act="layoutSet" data-v="A"><b>5 tabs</b><span>separate Crypto tab</span></button><button class="' + (DB.layout() === 'B' ? 'on' : '') + '" data-act="layoutSet" data-v="B"><b>4 tabs</b><span>everything on Home</span></button></div>' +
      (FS.offer() ? '<button class="opt mt" data-act="sheet" data-name="fs">' + ic('full', 'acc') + '<span class="grow"><div class="t">Full screen</div><div class="s">' + (FS.ios ? 'Add the demo to your Home Screen' : 'Hide the browser bars') + '</div></span>' + ic('chev', 'mut') + '</button>' : '') +
      '<div class="acts mt"><button class="act" data-act="sheet" data-name="switch">' + ic('users') + 'Switch account</button><button class="act" data-act="demoReset">' + ic('refresh') + 'Start over</button></div>';
  };
  A.layoutSet = function (d) { DB.setLayout(d.v); S.sheet = null; U.tab('home'); U.toast(d.v === 'B' ? 'Menu: 4 tabs, crypto on Home' : 'Menu: 5 tabs with Crypto'); };
  A.guideCrash = function () {
    var me = DB.me(), L = DB.loansOf(me.id).filter(function (l) { return l.status === 'active'; })[0];
    if (!L) { S.sheet = null; U.go('shield'); U.toast('Take a Shield loan first, then crash the market'); return; }
    S.sheet = null; U.go('loan', { id: L.id }); U.toast('Drag the crash test, then tap "Make it real"');
  };

  /* ---------- profile ---------- */
  Sc.profile = {
    tab: 'profile',
    render: function () {
      var me = DB.me(), t = DB.totals(me);
      return U.top('Profile', { noBack: true }) +
        '<div class="card pad c"><div style="display:grid;place-items:center;margin-bottom:10px">' + U.avatar(me, 'lg') + '</div><div class="b" style="font-size:19px">' + e(me.name) + '</div><div class="mut sm">' + e(me.legal ? me.legal + ' · ' : '') + e(me.tag) + '</div>' +
        '<div class="mt"><span class="pill">' + (me.type === 'company' ? 'Business plan' : 'Private client') + '</span></div></div>' +
        '<div class="card mt">' + U.kv('Total balance', '€' + DB.nf(t.total, 2)) + U.kv('IBAN', '<button class="acc" data-act="copy" data-text="' + e(me.iban) + '">' + e(me.iban) + '</button>') + U.kv('Member since', DB.dateOnly(me.created)) + '</div>' +
        '<div class="card mt">' +
        U.row({ left: '<span class="ic sq">' + ic('help') + '</span>', t: 'How it works', s: 'Short answers to the main questions', act: 'sheet', data: { name: 'help' }, chev: 1 }) +
        U.row({ left: '<span class="ic sq">' + ic('map') + '</span>', t: 'Demo guide', s: 'What to try, and the demo market', act: 'sheet', data: { name: 'guide' }, chev: 1 }) + fsRow() +
        U.row({ left: '<span class="ic sq">' + ic('out') + '</span>', t: 'Sign out', act: 'logout', chev: 1 }) + '</div>';
    }
  };
})(window);
