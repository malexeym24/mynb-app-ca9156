/* My Neobank demo - add funds, send, swap. */
(function (G) {
  'use strict';
  var DB = G.DB, U = G.UI, S = G.S, Sc = G.Screens, Sh = G.Sheets, A = G.Actions;
  var e = U.esc, ic = U.icon;

  function held(me, kinds) { return DB.ORDER.filter(function (s) { return (me.bal[s] || 0) > 0 && (!kinds || kinds.indexOf(DB.ASSETS[s].kind) >= 0); }); }
  function pick(list, want, fallback) { return list.indexOf(want) >= 0 ? want : (list.indexOf(fallback) >= 0 ? fallback : list[0]); }

  /* ---------- add ---------- */
  Sc.add = {
    render: function (p, f) {
      var me = DB.me(), s = f.s || p.s || 'EUR', A0 = DB.ASSETS[s], x = U.num(f.amt);
      var quick = A0.kind === 'crypto' && s !== 'XRP' ? [1, 5, 10] : s === 'IDR' ? [1e8, 1e9, 1e10] : [10000, 100000, 1000000];
      return U.top('Add money') + U.assetChips('s', DB.ORDER, s) +
        U.amount(f, s + ' · balance ' + DB.fmt(s, me.bal[s] || 0)) +
        '<div class="chips wrap" style="justify-content:center">' + quick.map(function (q) { return '<button class="chip" data-act="set" data-k="amt" data-v="' + q + '">+' + DB.short(q) + '</button>'; }).join('') + '</div>' +
        '<div class="note mt2">Paper money: it appears instantly. In the real app you would top up by transfer to your IBAN or by sending crypto to your address.</div>' +
        U.sec(A0.kind === 'fiat' ? 'Your account details' : 'Your ' + s + ' address') + '<div class="card">' +
        (A0.kind === 'fiat' ? U.kv('Holder', e(me.legal || me.name)) + U.kv('IBAN', '<button class="acc" data-act="copy" data-text="' + e(me.iban) + '">' + e(me.iban) + '</button>')
          : U.kv('Address', '<button class="acc code" data-act="copy" data-text="' + DB.address(me, s) + '">' + DB.address(me, s) + '</button>')) + '</div>' +
        '<div class="cta"><button class="btn" data-act="addGo" data-live="add-btn"' + (x > 0 ? '' : ' disabled') + '>Add ' + (x > 0 ? DB.fmt(s, x) : 'money') + '</button></div>';
    }
  };
  A.addGo = function () {
    var me = DB.me(), s = S.form.s || U.cur().p.s || 'EUR', x = U.num(S.form.amt);
    DB.topup(me.id, s, x);
    U.done({ title: DB.fmt(s, x) + ' added', text: 'Paper money, available right away.', lines: [['New balance', DB.fmt(s, me.bal[s])]] });
  };

  /* ---------- send ---------- */
  Sh.send = function (p) {
    var q = p.s ? ' data-s="' + p.s + '"' : '', kind = p.s ? DB.ASSETS[p.s].kind : '';
    return '<h3>Send funds</h3>' +
      '<button class="opt" data-act="go" data-to="send" data-mode="internal"' + q + '>' + ic('user') + '<span class="grow"><div class="t">To My Neobank account</div><div class="s">instant and free, any currency</div></span>' + ic('chev', 'mut') + '</button>' +
      (kind === 'crypto' || kind === 'stable' ? '' : '<button class="opt" data-act="go" data-to="send" data-mode="iban"' + q + '>' + ic('bank') + '<span class="grow"><div class="t">To IBAN</div><div class="s">to any bank account, SEPA or SWIFT</div></span>' + ic('chev', 'mut') + '</button>') +
      (kind === 'fiat' ? '' : '<button class="opt" data-act="go" data-to="send" data-mode="wallet"' + q + '>' + ic('wallet') + '<span class="grow"><div class="t">To external wallet</div><div class="s">to other crypto wallets</div></span>' + ic('chev', 'mut') + '</button>');
  };
  function sendCtx(p, f) {
    var me = DB.me(), mode = p.mode || 'internal';
    var list = held(me, mode === 'iban' ? ['fiat'] : mode === 'wallet' ? ['crypto', 'stable'] : null);
    var s = pick(list, f.s || p.s, 'EUR'), x = U.num(f.amt), fee = mode === 'internal' || !s ? 0 : DB.extFee(mode, s);
    var to = mode === 'internal' ? DB.acc(f.to || p.toAcc) : null, bal = s ? (me.bal[s] || 0) : 0;
    var okDest = mode === 'internal' ? !!to : (String(f.dest || '').trim().length >= 6 && (mode === 'wallet' || String(f.name || '').trim().length > 1));
    return { me: me, mode: mode, list: list, s: s, x: x, fee: fee, to: to, bal: bal, ok: s && x > 0 && x + fee <= bal + 1e-9 && okDest, over: x + fee > bal + 1e-9 };
  }
  Sc.send = {
    back: function (p, f) { if ((p.mode || 'internal') === 'internal' && f.to && !p.toAcc) { f.to = null; return true; } return false; },
    render: function (p, f) {
      var c = sendCtx(p, f), me = c.me;
      if (!c.list.length) return U.top('Send') + '<div class="empty">Nothing to send yet.<br><br><button class="btn s" style="margin:0 auto" data-act="go" data-to="add">Add money</button></div>';
      if (c.mode === 'internal' && !c.to) {
        var recent = DB.txsOf(me.id).filter(function (t) { return t.peer && DB.acc(t.peer) && !DB.acc(t.peer).closed; }).map(function (t) { return t.peer; });
        var ids = recent.concat(DB.others(me.id).map(function (a) { return a.id; })).filter(function (id, i, arr) { return arr.indexOf(id) === i; });
        return U.top('Send to') + '<div class="mut sm" style="margin:0 2px 10px">Recent</div><div class="card">' + ids.map(function (id) {
          var a = DB.acc(id), last = DB.txsOf(me.id).filter(function (t) { return t.peer === id; })[0];
          return U.row({ left: U.avatar(a), t: e(a.name), s: last ? e((last.amt > 0 ? 'Sent you ' : 'You sent ') + DB.fmt(last.asset, Math.abs(last.amt)) + ' · ' + DB.when(last.ts).split(' • ')[0]) : e(a.tag), act: 'set', data: { k: 'to', v: id }, chev: 1 });
        }).join('') + '</div><div class="note mt2">Transfers between My Neobank accounts are instant and free. Switch account afterwards to see the money arrive.</div>';
      }
      var head = c.mode === 'internal'
        ? '<div class="card"><div class="row">' + U.avatar(c.to) + '<span class="grow"><div class="t">' + e(c.to.name) + '</div><div class="s">' + e(c.to.tag) + '</div></span>' + (p.toAcc ? '' : '<button class="acc sm" data-act="set" data-k="to" data-v="">Change</button>') + '</div></div>'
        : c.mode === 'iban'
          ? U.field('Recipient name', 'name', f, { ph: 'Company or person', cap: 'words', auto: 1 }) + U.field('IBAN or account number', 'dest', f, { ph: 'ES00 0000 0000 0000 0000 0000', cap: 'characters' })
          : U.field(c.s + ' address', 'dest', f, { ph: c.s === 'XRP' ? 'r…' : c.s === 'BTC' ? 'bc1…' : '0x…', auto: 1 });
      var feeLine = c.mode === 'internal' ? 'Free · instant' : c.mode === 'iban' ? (c.s === 'EUR' ? 'SEPA Instant · free' : 'SWIFT · ' + DB.fmt(c.s, c.fee)) : 'Network fee · ' + DB.fmt(c.s, c.fee);
      return U.top(c.mode === 'internal' ? 'Send' : c.mode === 'iban' ? 'Send to IBAN' : 'Send to wallet') + head +
        '<label class="lbl">From</label>' + U.assetChips('s', c.list, c.s) +
        U.amount(f, '<span data-live="send-bal" class="' + (c.over ? 'bad' : '') + '">' + (c.over ? 'Not enough · ' : '') + 'Available ' + DB.fmt(c.s, c.bal) + '</span>') +
        U.field(c.mode === 'iban' ? 'Reference' : 'Note (optional)', 'note', f, { ph: c.mode === 'iban' ? 'Invoice 2026-114' : 'What is it for?', cap: 'sentences' }) +
        '<div class="card mt" data-live="send-sum">' + U.kv('Fee', feeLine) + U.kv(c.mode === 'internal' ? e(c.to.name) + ' gets' : 'Recipient gets', DB.fmt(c.s, c.x)) + U.kv('Your balance after', DB.fmt(c.s, Math.max(0, c.bal - c.x - c.fee))) + '</div>' +
        '<div class="cta"><button class="btn" data-act="sendGo" data-live="send-btn"' + (c.ok ? '' : ' disabled') + '>Send ' + (c.x > 0 ? DB.fmt(c.s, c.x) : '') + '</button></div>';
    }
  };
  A.sendGo = function () {
    var p = U.cur().p, f = S.form, c = sendCtx(p, f); if (!c.ok) return;
    U.faceId(function () {
      if (c.mode === 'internal') {
        DB.transfer(c.me.id, c.to.id, c.s, c.x, f.note);
        U.done({ title: 'Sent to ' + c.to.name, text: DB.fmt(c.s, c.x) + ' arrived instantly.', lines: [['Amount', DB.fmt(c.s, c.x)], ['Fee', 'Free'], ['Balance', DB.fmt(c.s, c.me.bal[c.s])]], more: { label: 'Send again', to: 'send', p: { mode: 'internal', toAcc: c.to.id, s: c.s } } });
      } else {
        DB.sendExternal(c.me.id, { mode: c.mode, name: f.name, dest: f.dest, asset: c.s, amt: c.x, note: f.note });
        U.done({ title: 'Payment sent', text: DB.fmt(c.s, c.x) + (c.mode === 'iban' ? ' is on its way to ' + (f.name || 'the recipient') + '.' : ' is on its way to the wallet.'), lines: [['Amount', DB.fmt(c.s, c.x)], ['Fee', c.fee ? DB.fmt(c.s, c.fee) : 'Free'], ['Balance', DB.fmt(c.s, c.me.bal[c.s])]] });
      }
    }, 'Confirm ' + DB.fmt(c.s, c.x));
  };

  /* ---------- swap ---------- */
  function swapCtx(p, f) {
    var me = DB.me(), list = held(me), from = pick(list, f.from || p.from, 'EUR');
    var tos = DB.ORDER.filter(function (s) { return s !== from; });
    var to = pick(tos, f.to || p.to, from === 'USDC' ? 'EUR' : 'USDC');
    var x = U.num(f.amt), q = from ? DB.quote(from, to, x) : null, bal = from ? (me.bal[from] || 0) : 0;
    return { me: me, list: list, from: from, tos: tos, to: to, x: x, q: q, bal: bal, ok: from && x > 0 && x <= bal + 1e-9, over: x > bal + 1e-9 };
  }
  Sc.swap = {
    render: function (p, f) {
      var c = swapCtx(p, f);
      if (!c.list.length) return U.top('Swap') + '<div class="empty">Add money first.</div>';
      var rate = DB.quote(c.from, c.to, 1).rate;
      return U.top('Swap') + '<label class="lbl">From</label>' + U.assetChips('from', c.list, c.from) +
        U.amount(f, '<span data-live="swap-bal" class="' + (c.over ? 'bad' : '') + '">' + (c.over ? 'Not enough · ' : '') + 'Available ' + DB.fmt(c.from, c.bal) + '</span>') +
        '<div class="flex" style="justify-content:center;margin-top:6px"><button class="chip" data-act="swapMax">Use all</button><button class="chip" data-act="swapFlip">' + ic('swap') + 'Flip</button></div>' +
        '<label class="lbl">To</label>' + U.assetChips('to', c.tos, c.to) +
        '<div class="card pad mt glow" data-act="focusAmt" data-live="swap-out"><div class="mut sm">You get' + (c.x > 0 ? '' : ' · type an amount above') + '</div><div style="font-size:30px;font-weight:700;margin:4px 0">' + DB.fmt(c.to, c.q.out) + '</div>' +
        U.kv('Rate', '1 ' + c.from + ' = ' + DB.nf(rate, 2, rate < 0.01 ? 8 : 4) + ' ' + c.to) + U.kv('Our margin · 0.50%, no hidden spread ' + U.info('margin'), DB.fmt(c.to, c.q.fee)) + '</div>' +
        '<div class="cta"><button class="btn" data-act="swapGo" data-live="swap-btn"' + (c.ok ? '' : ' disabled') + '>Swap ' + c.from + ' to ' + c.to + '</button></div>';
    }
  };
  A.swapMax = function () { var c = swapCtx(U.cur().p, S.form); S.form.amt = String(c.bal); U.render(); A.focusAmt(); };
  A.swapFlip = function () { var c = swapCtx(U.cur().p, S.form); if ((c.me.bal[c.to] || 0) <= 0) return U.toast('You have no ' + c.to + ' to swap from', 'bad'); S.form.from = c.to; S.form.to = c.from; S.form.amt = ''; U.render(); };
  A.swapGo = function () {
    var c = swapCtx(U.cur().p, S.form); if (!c.ok) return;
    U.faceId(function () {
      var q = DB.swap(c.me.id, c.from, c.to, c.x);
      U.done({ icon: 'swap', title: 'Swapped', text: DB.fmt(c.from, c.x) + ' is now ' + DB.fmt(c.to, q.out) + '.', lines: [['You paid', DB.fmt(c.from, c.x)], ['You got', DB.fmt(c.to, q.out)], ['Margin', DB.fmt(c.to, q.fee)], [c.to + ' balance', DB.fmt(c.to, c.me.bal[c.to])]] });
    }, 'Confirm swap');
  };
})(window);
