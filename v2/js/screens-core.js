/* My Neobank demo - welcome, home, accounts, activity, profile, demo controls. */
(function (G) {
  'use strict';
  var DB = G.DB, U = G.UI, S = G.S, Sc = G.Screens, Sh = G.Sheets, A = G.Actions;
  var e = U.esc, ic = U.icon;

  /* ---------- welcome + account creation ---------- */
  Sc.welcome = {
    render: function () {
      var list = DB.list().filter(function (a) { return !a.closed; });
      return '<div class="welcome"><div class="rays"></div>' +
        '<div class="splash"><img class="mark" src="img/mark.svg" alt=""><div class="word">My Neobank</div><div class="tg">Business, wealth and legacy. One account.</div></div>' +
        '<div class="who">Choose an account</div>' +
        list.map(function (a) {
          return '<button class="acct" data-act="login" data-id="' + a.id + '">' + U.avatar(a) + '<span class="grow"><div class="n">' + e(a.name) + '</div><div class="t">' + e(a.tag) + '</div></span><span class="v">€' + DB.short(DB.totals(a).total) + '</span></button>';
        }).join('') +
        '<button class="acct new" data-act="go" data-to="create">' + ic('plus') + 'Create a new account</button>' +
        '<div class="foot">Concept demo · paper money only</div></div>';
    }
  };
  A.login = function (d) {
    var a = DB.acc(d.id);
    U.faceId(function () { DB.login(a.id); S.intro = false; U.tab('home'); U.toast('Signed in as ' + a.name); }, 'Signing in as ' + a.name);
  };
  Sc.create = {
    render: function (p, f) {
      var type = f.type || 'person';
      return U.top('New account') +
        '<div class="lead">Open an account <em>in seconds</em></div><p class="sub">No documents in the demo. You get paper money to play with.</p>' +
        U.field(type === 'company' ? 'Company name' : 'Your name', 'name', f, { ph: type === 'company' ? 'e.g. Costa Trading' : 'e.g. Maria', cap: 'words', auto: 1 }) +
        '<label class="lbl">Account type</label>' + U.chips('type', [['person', ic('user') + 'Personal'], ['company', ic('brief') + 'Business']], type, true) +
        '<div class="note mt2">' + (type === 'company' ? 'Business accounts start with €1.5M, $500k and 250k USDC.' : 'Personal accounts start with €1M, 250k USDC and 250k XRP.') + ' Paper money.</div>' +
        '<div class="cta"><button class="btn" data-act="createGo">Create account</button></div>';
    }
  };
  A.createGo = function () {
    var a = DB.createAccount({ name: S.form.name, type: S.form.type || 'person' });
    DB.login(a.id); S.intro = false; U.tab('home'); U.toast('Welcome, ' + a.name);
  };

  /* ---------- home ---------- */
  function header() {
    var me = DB.me(), n = DB.unread(me.id);
    return '<div class="top"><button class="me" data-act="sheet" data-name="switch">' + U.avatar(me) + '<span class="grow"><div class="n ell">' + e(me.name) + ' ' + '<span class="mut">▾</span></div><div class="t ell">' + e(me.tag) + '</div></span></button>' +
      '<button class="rb" data-act="go" data-to="notifications" aria-label="Notifications">' + ic('bell') + (n ? '<span class="dot"></span>' : '') + '</button></div>';
  }
  function assetRow(me, s) {
    var A0 = DB.ASSETS[s], b = me.bal[s] || 0, pl = me.pledged[s] || 0;
    return U.row({
      left: U.aico(s), t: e(A0.name), s: A0.kind === 'fiat' ? (pl ? '' : s + ' account') : (pl ? DB.fmt(s, pl) + ' pledged' : '1 ' + s + ' = ' + DB.fmtPx(s)),
      rt: DB.fmt(s, b), rs: s === 'EUR' ? '' : DB.fmt('EUR', DB.eur(s, b)), act: 'go', data: { to: 'asset', s: s }
    });
  }
  Sc.home = {
    tab: 'home',
    render: function (p, f) {
      var me = DB.me(), t = DB.totals(me), txs = DB.txsOf(me.id).slice(0, 4);
      var held = DB.ORDER.filter(function (s) { return f.all || (me.bal[s] || 0) > 0 || (me.pledged[s] || 0) > 0 || s === 'EUR'; });
      var loans = DB.loansOf(me.id).filter(function (l) { return l.status === 'active'; }), plan = DB.plan(me.id);
      var debt = loans.reduce(function (s, l) { return s + l.principal; }, 0);
      var open = DB.requestsOf(me.id).filter(function (q) { return q.status === 'open'; }).length;
      var tiles = me.type === 'company'
        ? '<button class="tile" data-act="go" data-to="getpaid">' + ic('link') + '<div class="t">Get paid</div><div class="s">' + (open ? open + ' open request' + (open > 1 ? 's' : '') : 'Fiat or stablecoins') + '</div></button>' +
          '<button class="tile" data-act="tab" data-to="business">' + ic('swap') + '<div class="t">Hold or convert</div><div class="s">USDC: ' + (me.auto.USDC ? 'to euro' : 'hold') + ' · USDT: ' + (me.auto.USDT ? 'to euro' : 'hold') + '</div></button>'
        : '<button class="tile" data-act="go" data-to="shield">' + ic('shield') + '<div class="t">Shield loan</div><div class="s">' + (loans.length ? DB.fmt('USDC', debt) + ' · protected' : 'Borrow against XRP, protected') + '</div></button>' +
          '<button class="tile" data-act="go" data-to="inherit">' + ic('heirs') + '<div class="t">Inheritance</div><div class="s">' + (plan && plan.status === 'active' ? 'Active · ' + plan.heirs.length + ' heir' + (plan.heirs.length > 1 ? 's' : '') : 'Name your heirs in one tap') + '</div></button>';
      return header() +
        '<div class="hero"><div class="l">Total balance</div><div class="v">€' + DB.nf(t.total, 2) + '</div><div class="s">€' + DB.short(t.fiat) + ' fiat • €' + DB.short(t.crypto) + ' crypto</div>' +
        (loans.length ? '<button class="p" data-act="go" data-to="shield">' + ic('shield') + DB.fmt('XRP', me.pledged.XRP || 0) + ' pledged · loan ' + DB.fmt('USDC', debt) + '</button>' : '') + '</div>' +
        '<div class="acts"><button class="act" data-act="sheet" data-name="send">' + ic('send') + 'Send</button><button class="act" data-act="go" data-to="swap">' + ic('swap') + 'Swap</button><button class="act" data-act="go" data-to="add">' + ic('plus') + 'Add</button></div>' +
        '<div class="tiles">' + tiles + '</div>' +
        U.sec('Accounts', f.all ? 'Less' : 'All currencies', 'toggle', { k: 'all' }) + '<div class="card">' + held.map(function (s) { return assetRow(me, s); }).join('') + '</div>' +
        U.sec('Latest activity', 'All', 'go', { to: 'activity' }) + '<div class="card">' + (txs.length ? txs.map(U.txRow).join('') : '<div class="empty">Nothing yet. Make your first transfer.</div>') + '</div>';
    }
  };

  /* ---------- one currency / asset ---------- */
  Sc.asset = {
    render: function (p) {
      var me = DB.me(), s = p.s, A0 = DB.ASSETS[s], b = me.bal[s] || 0, pl = me.pledged[s] || 0;
      var txs = DB.txsOf(me.id).filter(function (t) { return t.asset === s || (t.meta && t.meta.from === s); }).slice(0, 12);
      var det = A0.kind === 'fiat'
        ? U.kv('Account holder', e(me.legal || me.name)) + U.kv('IBAN', '<button data-act="copy" data-text="' + e(me.iban) + '" class="acc">' + e(me.iban) + '</button>') + U.kv('Payments', s === 'EUR' ? 'SEPA Instant, SWIFT' : 'SWIFT')
        : U.kv('Network', s === 'XRP' ? 'XRP Ledger' : s === 'BTC' ? 'Bitcoin' : 'Ethereum') + U.kv('Your address', '<button data-act="copy" data-text="' + DB.address(me, s) + '" class="acc code">' + DB.address(me, s).slice(0, 14) + '…' + ic('copy') + '</button>') + U.kv('Demo price', '1 ' + s + ' = ' + DB.fmtPx(s));
      return U.top(A0.name) +
        '<div class="hero" style="padding-top:8px"><div style="display:grid;place-items:center;margin-bottom:12px">' + U.aico(s) + '</div><div class="v">' + DB.fmt(s, b) + '</div>' +
        (s === 'EUR' ? '' : '<div class="s">' + DB.fmt('EUR', DB.eur(s, b)) + '</div>') +
        (pl ? '<button class="p" data-act="go" data-to="shield">' + ic('shield') + DB.fmt(s, pl) + ' pledged for a Shield loan</button>' : '') + '</div>' +
        '<div class="acts"><button class="act" data-act="sheet" data-name="send" data-s="' + s + '">' + ic('send') + 'Send</button><button class="act" data-act="go" data-to="swap" data-from="' + s + '">' + ic('swap') + 'Swap</button><button class="act" data-act="go" data-to="add" data-s="' + s + '">' + ic('plus') + 'Add</button></div>' +
        (s === 'XRP' && me.type === 'person' ? '<button class="card pad glow flex" style="width:100%;margin-bottom:6px" data-act="go" data-to="shield">' + ic('shield', 'acc') + '<span class="grow"><div class="b">Borrow against your XRP</div><div class="mut sm">Shield loan · crash protection built in</div></span>' + ic('chev', 'mut') + '</button>' : '') +
        U.sec('Details') + '<div class="card">' + det + '</div>' +
        U.sec('Activity') + '<div class="card">' + (txs.length ? txs.map(U.txRow).join('') : '<div class="empty">No ' + s + ' activity yet.</div>') + '</div>';
    }
  };

  /* ---------- activity + notifications ---------- */
  Sc.activity = {
    render: function (p, f) {
      var me = DB.me(), k = f.f || 'all';
      var txs = DB.txsOf(me.id).filter(function (t) { return k === 'all' || (k === 'in' && t.amt > 0 && t.kind !== 'swap') || (k === 'out' && t.amt < 0) || (k === 'swap' && t.kind === 'swap') || (k === 'card' && (t.kind === 'card' || t.kind === 'cashback')); });
      return U.top('Activity') + U.chips('f', [['all', 'All'], ['in', 'Money in'], ['out', 'Money out'], ['swap', 'Swaps'], ['card', 'Cards']], k) +
        '<div class="card mt">' + (txs.length ? txs.map(U.txRow).join('') : '<div class="empty">Nothing here yet.</div>') + '</div>';
    }
  };
  Sh.tx = function (p) {
    var t = DB.W.txs.filter(function (x) { return x.id === p.id; })[0]; if (!t) return '<h3>Not found</h3>';
    var m = t.meta || {}, peer = t.peer && DB.acc(t.peer);
    return '<h3>' + e(t.title) + '</h3><div class="hero" style="padding:0 0 14px"><div class="v" style="font-size:32px">' + DB.fmt(t.asset, t.amt, { plus: t.amt > 0 && !m.neutral }) + '</div><div class="s">' + e(DB.when(t.ts)) + '</div></div><div class="card">' +
      U.kv('Status', '<span class="pill ok">' + ic('check') + e(t.status) + '</span>') + U.kv('Type', e(t.sub || t.kind)) +
      (peer ? U.kv(t.amt > 0 ? 'From' : 'To', e(peer.name)) : '') + (t.note ? U.kv('Note', e(t.note)) : '') +
      (m.from ? U.kv('Converted from', DB.fmt(m.from, m.x)) : '') + (m.rate ? U.kv('Rate', '1 ' + m.from + ' = ' + DB.nf(m.rate, 2, 6) + ' ' + t.asset) : '') +
      (m.fee ? U.kv(m.from ? 'Margin (0.50%, published)' : 'Fee', DB.fmt(m.from ? t.asset : t.asset, m.fee)) : '') +
      (m.dest ? U.kv('Destination', '<span class="code">' + e(m.dest) + '</span>') : '') +
      (m.checks ? U.kv('Compliance', '<span class="ok">KYC ✓ · AML ✓ · Travel rule ✓</span>') : '') +
      U.kv('Reference', t.id.toUpperCase()) + '</div>' +
      (m.loan ? '<button class="btn sec2 mt" data-act="go" data-to="loan" data-id="' + m.loan + '">Open the loan</button>' : '') +
      '';
  };
  Sc.notifications = {
    enter: function () { DB.notifsOf(DB.me().id).forEach(function (n) { n.seen = true; }); },
    render: function () {
      var ns = DB.notifsOf(DB.me().id);
      return U.top('Notifications') + '<div class="card">' + (ns.length ? ns.map(function (n) {
        return U.row({ left: '<span class="ic' + (n.read ? '' : ' sq') + '">' + ic('bell') + '</span>', t: (n.read ? '' : '<b class="acc">• </b>') + e(n.title), s: e(n.body), rs: e(DB.when(n.ts).split(' • ')[0]), act: 'openNotif', data: { id: n.id } });
      }).join('') : '<div class="empty">No notifications.</div>') + '</div>';
    }
  };
  A.openNotif = function (d) {
    var n = DB.W.notifs.filter(function (x) { return x.id === d.id; })[0]; if (!n) return;
    n.read = true; DB.save();
    var to = n.to || '', parts = to.split(':');
    if (parts[0] === 'loan' && DB.loan(parts[1])) return U.go('loan', { id: parts[1] });
    if (parts[0] === 'card' && DB.card(parts[1])) return U.go('card', { id: parts[1] });
    if (parts[0] === 'request' && DB.request(parts[1])) return U.go('request', { id: parts[1] });
    if (to === 'activity') return U.go('activity');
    if (to === 'inherit') return U.go('inherit');
    if (to === 'premium') return U.tab('premium');
    U.render();
  };

  /* ---------- profile ---------- */
  Sc.profile = {
    tab: 'profile',
    render: function () {
      var me = DB.me(), t = DB.totals(me);
      return U.top('Profile', { noBack: true }) +
        '<div class="card pad c">' + '<div style="display:grid;place-items:center;margin-bottom:10px">' + U.avatar(me, 'lg') + '</div><div class="b" style="font-size:19px">' + e(me.name) + '</div><div class="mut sm">' + e(me.legal ? me.legal + ' · ' : '') + e(me.tag) + '</div>' +
        '<div class="mt"><span class="pill">' + (me.type === 'company' ? 'Business plan' : 'Private client') + '</span></div></div>' +
        '<div class="card mt">' + U.kv('Total balance', '€' + DB.nf(t.total, 2)) + U.kv('IBAN', '<button class="acc" data-act="copy" data-text="' + e(me.iban) + '">' + e(me.iban) + '</button>') + U.kv('Member since', DB.dateOnly(me.created)) + '</div>' +
        '<div class="card mt">' +
        U.row({ left: '<span class="ic sq">' + ic('users') + '</span>', t: 'Switch account', s: 'Alexey, Jesús, El Kabron or a new one', act: 'sheet', data: { name: 'switch' }, chev: 1 }) +
        U.row({ left: '<span class="ic sq">' + ic('sliders') + '</span>', t: 'Demo controls', s: 'Move the market, move time, reset', act: 'sheet', data: { name: 'demo' }, chev: 1 }) +
        U.row({ left: '<span class="ic sq">' + ic('doc') + '</span>', t: 'Statement', s: 'Download all activity as CSV', act: 'csv', chev: 1 }) +
        U.row({ left: '<span class="ic sq">' + ic('info') + '</span>', t: 'About this demo', s: 'What is real and what is not', act: 'sheet', data: { name: 'about' }, chev: 1 }) +
        U.row({ left: '<span class="ic sq">' + ic('out') + '</span>', t: 'Sign out', act: 'logout', chev: 1 }) + '</div>';
    }
  };
  A.logout = function () { DB.logout(); S.intro = true; U.tab('welcome'); setTimeout(function () { S.intro = false; }, 2600); };
  A.csv = function () { var me = DB.me(); U.download('MyNeobank_' + me.name.replace(/\W+/g, '_') + '_statement.csv', DB.csv(me.id), 'text/csv'); U.toast('Statement downloaded'); };

  /* ---------- sheets: switch account, demo controls, about ---------- */
  Sh['switch'] = function () {
    var me = DB.me();
    return '<h3>Switch account</h3>' + DB.list().filter(function (a) { return !a.closed; }).map(function (a) {
      return '<button class="opt" data-act="switchTo" data-id="' + a.id + '">' + U.avatar(a) + '<span class="grow"><div class="t">' + e(a.name) + '</div><div class="s">' + e(a.tag) + ' · €' + DB.short(DB.totals(a).total) + '</div></span>' + (me && a.id === me.id ? ic('check', 'acc') : ic('chev', 'mut')) + '</button>';
    }).join('') + '<button class="opt" data-act="go" data-to="create">' + ic('plus', 'acc') + '<span class="grow"><div class="t">Create a new account</div><div class="s">Personal or business, funded with paper money</div></span></button>';
  };
  A.switchTo = function (d) { var a = DB.acc(d.id); DB.login(a.id); U.tab('home'); U.toast('Now using ' + a.name); };

  Sh.demo = function (p, f) {
    var P = DB.px('XRP'), base = DB.BASE_MARKET.XRP, v = f.px == null ? P : +f.px;
    var active = DB.W.loans.filter(function (l) { return l.status === 'active'; }).length;
    return '<h3>Demo controls</h3>' +
      '<div class="card pad"><div class="flex between"><span class="b">XRP price</span><span class="pill" data-live="demo-px">$' + DB.nf(v, 2) + ' · ' + (v >= base ? '+' : '') + DB.nf((v / base - 1) * 100, 0) + '%</span></div>' +
      '<input type="range" name="px" min="0.2" max="6" step="0.05" value="' + v + '">' +
      '<div class="chips wrap">' + [['1.4', 'Dip −30%'], ['1', 'Crash −50%'], ['0.6', 'Flash crash −70%'], ['4', 'Rally +100%'], ['2', 'Back to $2.00']].map(function (c) { return '<button class="chip" data-act="demoPx" data-v="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<button class="btn s mt" style="width:100%" data-act="demoPx" data-live="demo-apply">Set XRP to $' + DB.nf(v, 2) + '</button>' +
      '<div class="mut xs mt">Now: ' + DB.fmtPx('XRP') + ' · ' + active + ' active Shield loan' + (active === 1 ? '' : 's') + '. A crash triggers the protection.</div></div>' +
      '<button class="opt mt" data-act="demoMonth">' + ic('cal', 'acc') + '<span class="grow"><div class="t">Move time forward one month</div><div class="s">Loan interest and protection fees are charged</div></span></button>' +
      '<button class="opt" data-act="sheet" data-name="switch">' + ic('users', 'acc') + '<span class="grow"><div class="t">Switch account</div><div class="s">See the other side of a transfer</div></span></button>' +
      '<button class="opt" data-act="demoReset">' + ic('refresh', 'bad') + '<span class="grow"><div class="t">Reset the demo</div><div class="s">Everything goes back to the start</div></span></button>';
  };
  A.demoPx = function (d) {
    var v = d.v != null ? +d.v : +(S.form.px == null ? DB.px('XRP') : S.form.px), old = DB.px('XRP');
    var paid = DB.setPrice('XRP', v); S.form.px = v; S.sheet = null; U.render();
    U.toast('XRP ' + (v < old ? 'fell' : v > old ? 'rose' : 'is') + ' to $' + DB.nf(v, 2) + (paid > 0 ? '. Protection paid ' + DB.fmt('USDC', paid) : ''));
  };
  A.demoMonth = function () { var n = DB.advanceMonth(); S.sheet = null; U.render(); U.toast('One month later' + (n ? ' · costs charged on ' + n + ' loan' + (n > 1 ? 's' : '') : '')); };
  A.demoReset = function () { DB.reset(); S.intro = true; U.tab('welcome'); setTimeout(function () { S.intro = false; }, 2600); U.toast('Demo reset'); };

  Sh.about = function () {
    return '<h3>About this demo</h3><div class="card pad sm" style="line-height:1.6">This is a clickable concept of the My Neobank app. All money is paper money and lives only in this browser.<br><br>' +
      'Prices, rates and fees are illustrative. Accounts, cards, loans and inheritance plans are simulated so you can feel the product.<br><br>' +
      'Use <b>Demo controls</b> to crash or rally XRP, move time forward, switch accounts or reset everything.</div>';
  };
})(window);
