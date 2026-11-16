/* My Neobank demo - cards: tiers, issuing, freeze, limit, demo purchases. */
(function (G) {
  'use strict';
  var DB = G.DB, U = G.UI, S = G.S, Sc = G.Screens, Sh = G.Sheets, A = G.Actions;
  var e = U.esc, ic = U.icon;
  var SW = { graphite: '#3a4a4b', teal: '#2aa3a5', cyan: '#8BF9FA', obsidian: '#06191a', steel: '#c9d1d2', gold: '#e3c877' };

  function visual(c, o) {
    o = o || {};
    var T = DB.TIERS[c.tier];
    var numTxt = o.show ? '0000 0000 0000 ' + c.last4 : '•••• •••• •••• ' + c.last4;
    return '<div class="ccard ' + c.design + (c.frozen ? ' frozen' : '') + (o.mini ? ' mini' : '') + '">' +
      '<div class="flex between"><span class="brand"><img src="img/mark.svg" alt="">My Neobank</span><span class="tier">' + e(T.name) + '</span></div>' +
      '<div class="flex between"><span class="chip2"></span>' + (c.frozen ? ic('snow') : ic('wave')) + '</div>' +
      '<div><div class="num">' + numTxt + '</div><div class="flex between" style="margin-top:8px"><span class="nm">' + e(c.name) + '</span><span class="ex">' + (o.show ? 'CVV 000 · ' : '') + c.exp + '</span></div></div></div>';
  }
  U.cardVisual = visual;
  function tiersFor(me) { return Object.keys(DB.TIERS).filter(function (k) { return DB.TIERS[k].who === me.type; }); }

  Sc.cards = {
    tab: 'cards',
    render: function () {
      var me = DB.me(), cards = DB.cardsOf(me.id), back = cards.reduce(function (s, c) { return s + c.cashback; }, 0);
      if (!cards.length) {
        var k = tiersFor(me), demo = { tier: k[k.length - 1], design: DB.TIERS[k[k.length - 1]].designs[0], name: me.name.toUpperCase(), last4: '0000', exp: '11/30' };
        return U.top('Cards', { noBack: true }) + '<div style="padding:10px 18px 0">' + visual(demo) + '</div>' +
          '<div class="lead c mt2">Your card, <em>your way</em></div><p class="sub c">' + (me.type === 'company' ? 'Business cards for the team, with cashback and spend controls.' : 'Virtual in seconds. Premium and metal for private clients.') + '</p>' +
          '<div class="cta"><button class="btn" data-act="go" data-to="cardnew">Get a card</button></div>';
      }
      return U.top('Cards', { noBack: true, right: '<button class="rb" data-act="go" data-to="cardnew" aria-label="New card">' + ic('plus') + '</button>' }) +
        cards.map(function (c) { return '<button style="display:block;width:100%;margin-bottom:14px" data-act="go" data-to="card" data-id="' + c.id + '">' + visual(c) + '</button>'; }).join('') +
        '<div class="card">' + U.kv('Cards', String(cards.length)) + U.kv('Cashback earned', '<span class="ok">' + DB.fmt('EUR', back) + '</span>') + '</div>' +
        '<button class="btn sec2 mt" data-act="go" data-to="cardnew">' + ic('plus') + 'Get another card</button>';
    }
  };

  Sc.cardnew = {
    after: function (root) { var on = root.querySelector('.tsel .on'); if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' }); },
    render: function (p, f) {
      var me = DB.me(), keys = tiersFor(me), tier = keys.indexOf(f.tier) >= 0 ? f.tier : keys[Math.min(1, keys.length - 1)], T = DB.TIERS[tier];
      var design = T.designs.indexOf(f.design) >= 0 ? f.design : T.designs[0], name = f.name == null ? me.name : f.name;
      return U.top('Choose your card') +
        '<div class="tsel">' + keys.map(function (k) {
          var t = DB.TIERS[k];
          return '<button class="' + (k === tier ? 'on' : '') + '" data-act="set" data-k="tier" data-v="' + k + '">' + visual({ tier: k, design: k === tier ? design : t.designs[0], name: String(name || me.name).toUpperCase(), last4: '0000', exp: '11/30' }) + '</button>';
        }).join('') + '</div>' +
        '<div class="flex between mt"><div><div class="b" style="font-size:20px">' + e(T.name) + '</div><div class="mut sm">' + e(T.line) + '</div></div><span class="pill">' + e(T.access) + '</span></div>' +
        '<div class="card mt">' + T.perks.map(function (x) { return '<div class="perk">' + ic('check') + '<span>' + e(x) + '</span></div>'; }).join('') + '</div>' +
        '<label class="lbl">Design</label><div class="sw2">' + T.designs.map(function (d) { return '<button class="' + (d === design ? 'on' : '') + '" data-act="set" data-k="design" data-v="' + d + '" aria-label="' + d + '"><span style="background:' + SW[d] + '"></span></button>'; }).join('') + '</div>' +
        U.field('Name on the card', 'name', f, { def: me.name, cap: 'characters' }) +
        '<div class="cta"><button class="btn" data-act="cardIssue">Issue ' + e(T.name) + ' card</button></div>';
    }
  };
  A.cardIssue = function () {
    var me = DB.me(), f = S.form, keys = tiersFor(me), tier = keys.indexOf(f.tier) >= 0 ? f.tier : keys[Math.min(1, keys.length - 1)], T = DB.TIERS[tier];
    var design = T.designs.indexOf(f.design) >= 0 ? f.design : T.designs[0];
    U.faceId(function () {
      var c = DB.issueCard(me.id, tier, design, f.name || me.name);
      U.overlay('<div class="issue"><div style="display:grid;place-items:center">' + visual(c) + '</div><div class="b mt2" style="font-size:20px">Your ' + e(T.name) + ' card is ready</div><div class="mut sm mt">Active now. ' + (tier === 'standard' ? 'Virtual card.' : 'The physical card is on its way.') + '</div></div>', 2300, function () {
        S.stack = [{ name: 'cards', p: {} }]; U.go('card', { id: c.id });
      });
    }, 'Confirm new card');
  };

  Sc.card = {
    render: function (p, f) {
      var c = DB.card(p.id); if (!c) return U.top('Card') + '<div class="empty">Card not found.</div>';
      var T = DB.TIERS[c.tier], pct = Math.min(100, c.spent / c.limit * 100);
      var txs = DB.txsOf(c.acc).filter(function (t) { return t.meta && t.meta.card === c.id; }).slice(0, 8);
      return U.top(T.name + ' card') + '<button style="display:block;width:100%" data-act="toggle" data-k="show">' + visual(c, { show: f.show }) + '</button>' +
        '<div class="acts mt"><button class="act" data-act="toggle" data-k="show">' + ic('eye') + (f.show ? 'Hide' : 'Details') + '</button><button class="act" data-act="cardFreeze" data-id="' + c.id + '">' + ic('snow') + (c.frozen ? 'Unfreeze' : 'Freeze') + '</button><button class="act" data-act="sheet" data-name="limit" data-id="' + c.id + '">' + ic('sliders') + 'Limit</button></div>' +
        '<button class="btn" data-act="sheet" data-name="pay" data-id="' + c.id + '">' + ic('bolt') + 'Make a demo purchase</button>' +
        '<div class="card pad mt"><div class="flex between"><span class="mut sm">Spent this month</span><span class="b">' + DB.fmt('EUR', c.spent) + ' <span class="mut">/ ' + DB.fmt('EUR', c.limit) + '</span></span></div><div class="gauge"><b class="' + (pct > 85 ? 'hot' : '') + '" style="width:' + pct + '%"></b></div>' +
        U.kv('Cashback rate', T.cashback ? DB.nf(T.cashback * 100, 0, 1) + '%' : 'None') + U.kv('Cashback earned', '<span class="ok">' + DB.fmt('EUR', c.cashback) + '</span>') + U.kv('Status', c.frozen ? '<span class="pill warn">Frozen</span>' : '<span class="pill ok">Active</span>') + '</div>' +
        U.sec('Card activity') + '<div class="card">' + (txs.length ? txs.map(U.txRow).join('') : '<div class="empty">No purchases yet. Try a demo purchase.</div>') + '</div>';
    }
  };
  A.cardFreeze = function (d) { var c = DB.card(d.id); DB.cardSet(c.id, 'frozen', !c.frozen); U.render(); U.toast(c.frozen ? 'Card frozen' : 'Card active again'); };

  Sh.limit = function (p, f) {
    var c = DB.card(p.id), v = f.limit == null ? c.limit : +f.limit;
    return '<h3>Monthly limit</h3><div class="hero" style="padding:0 0 6px"><div class="v" style="font-size:34px" data-live="lim-v">' + DB.fmt('EUR', v) + '</div></div>' +
      '<input type="range" name="limit" min="1000" max="500000" step="1000" value="' + v + '"><button class="btn mt" data-act="limitGo" data-id="' + c.id + '">Save limit</button>';
  };
  A.limitGo = function (d) { var c = DB.card(d.id); DB.cardSet(c.id, 'limit', +(S.form.limit == null ? c.limit : S.form.limit)); S.sheet = null; U.render(); U.toast('Limit updated'); };

  Sh.pay = function (p, f) {
    var c = DB.card(p.id), me = DB.acc(c.acc), T = DB.TIERS[c.tier], x = U.num(f.pamt);
    return '<h3>Demo purchase</h3><div class="mut sm c" style="margin:-8px 0 14px">Pays from ' + (c.source || 'EUR') + ' · ' + DB.fmt(c.source || 'EUR', me.bal[c.source || 'EUR'] || 0) + '</div>' + DB.MERCHANTS[me.type].map(function (m) {
      return '<button class="opt" data-act="payGo" data-id="' + c.id + '" data-m="' + e(m[0]) + '" data-x="' + m[1] + '">' + ic('bolt', 'acc') + '<span class="grow"><div class="t">' + e(m[0]) + '</div><div class="s">' + (T.cashback ? 'Cashback ' + DB.fmt('EUR', m[1] * T.cashback) : 'Tap to pay') + '</div></span><span class="b">' + DB.fmt('EUR', m[1]) + '</span></button>';
    }).join('') +
      '<label class="lbl">Or any amount, in euro</label><div class="flex"><div class="fld grow"><input name="pamt" inputmode="decimal" placeholder="0.00" value="' + e(f.pamt || '') + '" autocomplete="off"><span class="sfx">EUR</span></div>' +
      '<button class="btn s" data-act="payGo" data-id="' + c.id + '" data-m="Card payment" data-live="pay-btn"' + (x > 0 ? '' : ' disabled') + '>Pay</button></div>';
  };
  A.payGo = function (d) {
    var x = d.x ? +d.x : U.num(S.form.pamt), r = DB.cardPay(d.id, d.m, x);
    S.form.pamt = ''; S.sheet = null; U.render();
    U.toast('Paid ' + DB.fmt('EUR', x) + ' · ' + d.m + (r.paidFrom !== 'EUR' ? ' · from ' + r.paidFrom : '') + (r.cashback ? ' · cashback ' + DB.fmt('EUR', r.cashback) : ''));
  };
})(window);
