/* My Neobank demo - business account: get paid, hold or convert, statements. */
(function (G) {
  'use strict';
  var DB = G.DB, U = G.UI, S = G.S, Sc = G.Screens, A = G.Actions;
  var e = U.esc, ic = U.icon;

  function reqRow(q) {
    return U.row({ left: U.aico(q.asset), t: e(q.customer), s: e(q.ref + ' · ' + DB.when(q.status === 'paid' ? q.paid : q.ts).split(' • ')[0]),
      rt: DB.fmt(q.asset, q.amt), rs: q.status === 'paid' ? '<span class="ok">Paid</span>' : '<span class="warn">Waiting</span>', act: 'go', data: { to: 'request', id: q.id } });
  }
  function autoCard(me) {
    return '<div class="card">' + ['USDC', 'USDT'].map(function (s) {
      return '<div class="row">' + U.aico(s) + '<span class="grow"><div class="t">' + s + ' on arrival</div><div class="s">' + (me.auto[s] ? 'Convert to euro automatically' : 'Hold as ' + s) + '</div></span>' + U.sw(me.auto[s], 'autoToggle', { s: s }) + '</div>';
    }).join('') + '</div>';
  }
  Sc.business = {
    tab: 'business',
    render: function () {
      var me = DB.me(), rs = DB.requestsOf(me.id), open = rs.filter(function (q) { return q.status === 'open'; });
      var paid = rs.filter(function (q) { return q.status === 'paid'; }).reduce(function (s, q) { return s + DB.eur(q.asset, q.amt); }, 0);
      return U.top('Business', { noBack: true }) +
        '<div class="lead">Get paid in fiat or stablecoins. <em>Hold or convert.</em></div><p class="sub">One account, one accounting trail. No exchange account, no manual selling.</p>' +
        '<div class="tiles"><button class="tile" data-act="go" data-to="getpaidnew">' + ic('link') + '<div class="t">New payment request</div><div class="s">Send a link, get paid</div></button>' +
        '<button class="tile" data-act="csv">' + ic('dl') + '<div class="t">Statement</div><div class="s">CSV for tax and accounting</div></button></div>' +
        U.sec('Payment requests', rs.length > 4 ? 'All' : '', 'go', { to: 'getpaid' }) + '<div class="card">' + (rs.length ? rs.slice(0, 4).map(reqRow).join('') : '<div class="empty">No requests yet.</div>') + '</div>' +
        '<div class="card mt">' + U.kv('Waiting', open.length + ' request' + (open.length === 1 ? '' : 's')) + U.kv('Collected', '€' + DB.nf(paid, 0)) + '</div>' +
        U.sec('When stablecoins arrive') + autoCard(me) +
        '<div class="note mt">Every incoming payment passes KYC, AML and travel-rule checks at our MiCA-authorised partner before it lands.</div>';
    }
  };
  A.autoToggle = function (d) { var me = DB.me(); DB.setAuto(me.id, d.s, !me.auto[d.s]); U.render(); U.toast(d.s + (me.auto[d.s] ? ' will convert to euro on arrival' : ' will be held')); };

  Sc.getpaid = {
    render: function () {
      var rs = DB.requestsOf(DB.me().id);
      return U.top('Payment requests', { right: '<button class="rb" data-act="go" data-to="getpaidnew" aria-label="New">' + ic('plus') + '</button>' }) +
        '<div class="card">' + (rs.length ? rs.map(reqRow).join('') : '<div class="empty">No requests yet.</div>') + '</div>' +
        '<div class="cta"><button class="btn" data-act="go" data-to="getpaidnew">New payment request</button></div>';
    }
  };
  Sc.getpaidnew = {
    render: function (p, f) {
      var s = f.s || 'USDC', x = U.num(f.amt), me = DB.me(), stable = DB.ASSETS[s].kind === 'stable';
      return U.top('New payment request') + U.field('Customer', 'customer', f, { ph: 'Company or guest name', cap: 'words', auto: 1 }) +
        '<label class="lbl">They pay in</label>' + U.assetChips('s', ['USDC', 'USDT', 'EUR', 'USD'], s) + U.amount(f, s) +
        U.field('What for (optional)', 'note', f, { ph: 'Private event, 12 December', cap: 'sentences' }) +
        '<div class="note mt">' + (stable ? (me.auto[s] ? s + ' will convert to euro the moment it arrives.' : s + ' will be held as ' + s + '. You can convert it any time.') : 'Arrives in your ' + s + ' account by transfer.') + '</div>' +
        '<div class="cta"><button class="btn" data-act="reqCreate" data-live="rq-btn"' + (x > 0 && String(f.customer || '').trim() ? '' : ' disabled') + '>Create request</button></div>';
    }
  };
  A.reqCreate = function () {
    var f = S.form, q = DB.createRequest(DB.me().id, { customer: f.customer, asset: f.s || 'USDC', amt: U.num(f.amt), note: f.note });
    U.replace('request', { id: q.id }); U.toast('Request ' + q.ref + ' created');
  };

  function qr(seed) {
    var n = 21, x = seed || 7, cells = '';
    function finder(r, c) { return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7); }
    function fOn(r, c) { var rr = r >= n - 7 ? r - (n - 7) : r, cc = c >= n - 7 ? c - (n - 7) : c; return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4); }
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      if (finder(r, c) ? fOn(r, c) : ((x >>> 0) % 100) < 46) cells += '<rect x="' + c + '" y="' + r + '" width="1" height="1"/>';
    }
    return '<svg viewBox="0 0 ' + n + ' ' + n + '" fill="#010A0A" shape-rendering="crispEdges">' + cells + '</svg>';
  }
  var PAY = ['Payment detected', 'KYC and AML checks passed', 'Travel-rule check passed', 'Funds landed in your account'];
  Sc.request = {
    render: function (p, f) {
      var q = DB.request(p.id); if (!q) return U.top('Request') + '<div class="empty">Not found.</div>';
      var me = DB.acc(q.acc), link = 'pay.myneobank.demo/' + q.ref, stable = DB.ASSETS[q.asset].kind === 'stable', conv = stable && me.auto[q.asset];
      var seed = 0; for (var i = 0; i < q.id.length; i++) seed = (seed * 31 + q.id.charCodeAt(i)) >>> 0;
      if (f.step === 1) {
        var steps = PAY.concat(conv ? ['Converted to euro at the published margin'] : []);
        return U.top('Receiving payment', { noBack: true }) + '<div class="card pad prog">' + steps.map(function (s, i) { return '<div class="st ' + (i < f.prog ? 'on' : i === f.prog ? 'run' : '') + '"><span class="d">' + ic('check') + '</span><span>' + s + '</span></div>'; }).join('') + '</div>';
      }
      var paid = q.status === 'paid';
      return U.top(q.ref) + '<div class="hero" style="padding:4px 0 16px"><div class="l">' + e(q.customer) + '</div><div class="v">' + DB.fmt(q.asset, q.amt) + '</div>' + (q.note ? '<div class="s">' + e(q.note) + '</div>' : '') +
        '<div style="margin-top:12px">' + (paid ? '<span class="pill ok">' + ic('check') + 'Paid</span>' : '<span class="pill warn">Waiting for payment</span>') + '</div></div>' +
        (paid
          ? '<div class="card">' + U.kv('Landed', '<span class="ok">' + DB.fmt(q.landed ? q.landed.asset : q.asset, q.landed ? q.landed.amt : q.amt, { plus: true }) + '</span>') + U.kv('Paid on', e(DB.when(q.paid))) + U.kv('Compliance', '<span class="ok">KYC ✓ · AML ✓ · Travel rule ✓</span>') + U.kv('Reference', q.ref) + '</div><button class="btn sec2 mt" data-act="go" data-to="activity">See it in activity</button>'
          : '<div class="card pad c"><div class="qr">' + qr(seed) + '</div><div class="code">' + link + '</div><div class="acts mt" style="margin-bottom:0"><button class="act" data-act="copy" data-text="https://' + link + '">' + ic('copy') + 'Copy link</button></div></div>' +
            '<div class="note mt">' + (stable ? (conv ? 'On arrival ' + q.asset + ' converts to euro automatically.' : 'On arrival ' + q.asset + ' is held. Convert whenever you like.') : 'Arrives by transfer to your ' + q.asset + ' account.') + '</div>' +
            '<div class="cta"><button class="btn" data-act="reqPay">' + ic('bolt') + 'Demo: customer pays now</button></div>');
    }
  };
  A.reqPay = function () {
    var p = U.cur().p, q = DB.request(p.id), me = DB.acc(q.acc), n = PAY.length + (DB.ASSETS[q.asset].kind === 'stable' && me.auto[q.asset] ? 1 : 0);
    S.form.step = 1; S.form.prog = 0; U.render();
    var t = setInterval(function () {
      if (U.cur().name !== 'request') return clearInterval(t);
      S.form.prog += 1;
      if (S.form.prog >= n) { clearInterval(t); try { DB.payRequest(q.id); } catch (err) { U.fail(err); } S.form.step = 2; S.fresh = true; U.render(); U.toast('Paid: ' + DB.fmt(q.landed.asset, q.landed.amt) + ' landed'); return; }
      U.render();
    }, 750);
  };
})(window);
