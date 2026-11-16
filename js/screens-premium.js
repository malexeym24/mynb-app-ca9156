/* My Neobank demo - premium services for private clients: Shield loan, Earn and Inheritance plan. */
(function (G) {
  'use strict';
  var DB = G.DB, U = G.UI, S = G.S, Sc = G.Screens, Sh = G.Sheets, A = G.Actions;
  var e = U.esc, ic = U.icon;
  var COL = ['#8BF9FA', '#5FD08A', '#F2C14F', '#C792EA', '#F2714F', '#67A6F2'];
  function pc(x, d) { return DB.nf(x * 100, d == null ? 1 : d) + '%'; }
  function usd(x, d) { return DB.fmtUSD(x, d == null ? 0 : d); }
  function pxs(p) { return '$' + DB.nf(p, 2, p < 1 ? 3 : 2); }

  /* ---------- Premium tab ---------- */
  Sc.premium = {
    tab: 'premium',
    render: function () {
      var me = DB.me(), loans = DB.loansOf(me.id).filter(function (l) { return l.status === 'active'; }), plan = DB.plan(me.id);
      var debt = loans.reduce(function (s, l) { return s + l.principal; }, 0), named = DB.plansNaming(me.id);
      var earn = DB.earnSum(me.id), best = Math.max.apply(null, Object.keys(DB.EARN.rates).map(function (k) { return DB.EARN.rates[k]; }));
      return U.top('Wealth', { noBack: true }) +
        '<div class="lead">Wealth services for <em>private clients</em></div><p class="sub">Borrow without selling. Earn while you hold. Pass it on without losing it.</p>' +
        '<button class="card pad glow" style="width:100%;display:block" data-act="go" data-to="shield"><div class="flex between">' + ic('shield', 'acc') + (loans.length ? '<span class="pill ok">' + ic('check') + 'Protected</span>' : '<span class="pill">New</span>') + '</div>' +
        '<div class="b mt" style="font-size:19px">Shield loan</div><div class="mut sm" style="margin-top:4px;line-height:1.45">' + (loans.length ? 'You owe ' + DB.fmt('USDC', debt) + ' against ' + DB.fmt('XRP', me.pledged.XRP || 0) + '.' : 'Borrow USDC against your XRP. Crash protection is built into every loan.') + '</div></button>' +
        '<button class="card pad glow mt" style="width:100%;display:block" data-act="go" data-to="earn"><div class="flex between">' + ic('grow', 'acc') + (earn.n ? '<span class="pill ok">' + ic('check') + 'Earning</span>' : '<span class="pill">New</span>') + '</div>' +
        '<div class="b mt" style="font-size:19px">Earn</div><div class="mut sm" style="margin-top:4px;line-height:1.45">' + (earn.n ? '€' + DB.short(earn.value) + ' at work, about €' + DB.short(earn.yearly) + ' a year.' : 'Put idle balances to work. Up to ' + pc(best, 0) + ' a year, take it back any time.') + '</div></button>' +
        '<button class="card pad glow mt" style="width:100%;display:block" data-act="go" data-to="inherit"><div class="flex between">' + ic('heirs', 'acc') + (plan && plan.status === 'active' ? '<span class="pill ok">' + ic('check') + 'Active</span>' : '<span class="pill">New</span>') + '</div>' +
        '<div class="b mt" style="font-size:19px">Inheritance plan</div><div class="mut sm" style="margin-top:4px;line-height:1.45">' + (plan && plan.status === 'active' ? plan.heirs.map(function (h) { return e(h.name) + ' ' + DB.nf(h.share, 0, 1) + '%'; }).join(' · ') : 'Name your heirs in one tap. A smart contract keeps the plan.') + '</div></button>' +
        (named.length ? U.sec('You are named as an heir') + '<div class="card">' + named.map(function (o) {
          return U.row({ left: U.avatar(o), t: e(o.name) + '’s plan', s: 'Nothing passes while the owner is alive', act: 'go', data: { to: 'claim', owner: o.id }, chev: 1 });
        }).join('') + '</div>' : '');
    }
  };

  /* ---------- Shield loan ---------- */
  function crashBox(L, f, applyBtn) {
    var pct = f.sim == null ? -50 : +f.sim, P0 = DB.px('XRP'), P = Math.max(0.01, P0 * (1 + pct / 100)), t = DB.crashTest(L, P);
    var dead = t.typicalLiquidated || L.typicalLiquidated, n = DB.fmt('XRP', L.qty);
    var typ = dead ? '<div class="dead"><div class="h">Typical crypto loan</div><div class="big bad">Liquidated</div>Touches its liquidation price (' + pxs(L.liq) + '). Your ' + n + ' are sold at the bottom.</div>'
      : '<div><div class="h">Typical crypto loan</div><div class="big">Still open</div>' + (pct < 0 ? 'Liquidation waits at ' + pxs(L.liq) + '. One sharp wick is enough.' : 'Same upside, but a fixed liquidation price at ' + pxs(L.liq) + '.') + '</div>';
    var sh = t.payout > 0 ? '<div class="big acc">Protected</div>Protection pays ' + DB.fmt('USDC', t.payout) + ' toward the loan. You owe ' + DB.fmt('USDC', t.principal) + ' and keep all ' + n + '.'
      : pct < 0 ? '<div class="big acc">Nothing happens</div>Still above the protection level (' + pxs(L.strike) + '). Nothing is sold.'
        : t.capped ? '<div class="big acc">Capped at ' + pxs(L.capPrice) + '</div>You keep the gain up to ' + pxs(L.capPrice) + ' per XRP: ' + usd(t.keepValue) + '.'
          : '<div class="big acc">Full upside</div>Your ' + n + ' are worth ' + usd(t.value) + '. All yours.';
    return '<div class="card pad mt"><div class="flex between"><span class="b">Crash test</span><span class="pill' + (pct < 0 ? ' warn' : ' ok') + '" data-live="ct-p">XRP ' + pxs(P) + ' · ' + (pct > 0 ? '+' : '') + pct + '%</span></div>' +
      '<div class="mut xs" style="margin-top:4px">Drag to see what a crash or a rally does.</div><input type="range" name="sim" min="-85" max="150" step="5" value="' + pct + '">' +
      '<div class="vs" data-live="ct-vs">' + typ + '<div class="good"><div class="h">Shield loan</div>' + sh + '</div></div>' +
      (applyBtn ? '<button class="btn demo s mt" style="width:100%" data-act="loanApply" data-live="ct-apply">' + ic('bolt') + 'Apply this price: XRP ' + pxs(P) + '</button>' : '') + '</div>';
  }
  var CHART = '<svg class="chart" viewBox="0 0 340 160"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8BF9FA" stop-opacity=".28"/><stop offset="1" stop-color="#8BF9FA" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="M0 40C40 30 60 50 90 70S130 128 160 126 210 80 250 56 310 26 340 22V160H0Z" fill="url(#g1)"/>' +
    '<line x1="0" y1="98" x2="340" y2="98" stroke="#F2714F" stroke-dasharray="4 5" stroke-width="1.2"/>' +
    '<path d="M0 40C40 30 60 50 90 70S130 128 160 126 210 80 250 56 310 26 340 22" fill="none" stroke="#8BF9FA" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="112" cy="98" r="5.500" fill="#F2714F" stroke="#0E1717" stroke-width="2"/>' +
    '<text x="334" y="111" text-anchor="end" fill="#F2714F" font-size="8.500">Liquidation price of a typical loan</text><path d="M108 104 102 114" stroke="#F2714F" stroke-width="1"/>' +
    '<text x="100" y="125" text-anchor="end" fill="#F2714F" font-size="9.500" font-weight="600">Typical loan:</text><text x="100" y="137" text-anchor="end" fill="#F2714F" font-size="9.500" font-weight="600">coins sold here</text>' +
    '<text x="168" y="20" text-anchor="middle" fill="#8BF9FA" font-size="9.500" font-weight="600">Shield loan: coins stay for the recovery</text>' +
    '<text x="334" y="153" text-anchor="end" fill="#566b6b" font-size="8.500">Illustration, not market data</text></svg>';

  function loanRow(l) {
    return U.row({ left: '<span class="ic sq">' + ic('shield') + '</span>', t: DB.fmt('USDC', l.status === 'active' ? l.principal : l.principal0), s: DB.fmt('XRP', l.qty) + ' · ' + (l.plan === 'collar' ? 'Collar' : 'Shield') + ' · ' + DB.dateOnly(l.start),
      rt: l.status === 'active' ? '<span class="pill ok">Protected</span>' : '<span class="pill mut">Closed</span>', act: 'go', data: { to: 'loan', id: l.id } });
  }
  Sc.shield = {
    render: function () {
      var me = DB.me(), loans = DB.loansOf(me.id), has = (me.bal.XRP || 0) > 0;
      return U.top('Shield loan', { right: '<button class="rb" data-act="sheet" data-name="info" data-k="shield" aria-label="Help">' + ic('help') + '</button>' }) +
        (loans.length ? '<div class="card mb">' + loans.map(loanRow).join('') + '</div>' : '') +
        '<div class="lead">Borrow against your XRP. <em>Keep it in a crash.</em></div>' +
        '<p class="sub">Never sell. A sale usually means tax, so holders borrow instead. Every Shield loan is hedged, so a crash pays your loan down instead of selling your coins.</p>' +
        '<div class="card pad">' + CHART + '</div>' +
        '<div class="vs mt"><div class="dead"><div class="h">Typical loan</div>A fixed liquidation price. When the market touches it, even for a minute, your coins are sold at the bottom.</div>' +
        '<div class="good"><div class="h">Shield loan</div>The protection bought with the loan pays it down in a crash. You keep the coins and the long-term position.</div></div>' +
        U.sec('How it works') + '<div class="card steps">' +
        '<div class="step"><div><div class="t">Pledge</div><div class="s">You pledge XRP. It is held with a regulated custodian, segregated.</div></div></div>' +
        '<div class="step"><div><div class="t">Borrow</div><div class="s">USDC lands in your account in seconds, ready to use.</div></div></div>' +
        '<div class="step"><div><div class="t">Protected</div><div class="s">We buy crash protection for each loan with options and other instruments.</div></div></div>' +
        '<div class="step"><div><div class="t">Repay and keep</div><div class="s">At term you repay the loan and get your full XRP position back.</div></div></div></div>' +
        '<div class="cta">' + (has ? '<button class="btn" data-act="go" data-to="shieldnew">' + (loans.length ? 'Take another loan' : 'Get a Shield loan') + '</button>' : '<button class="btn" data-act="go" data-to="add" data-s="XRP">Add XRP first</button>') + '</div>';
    }
  };

  function newCtx(f) {
    var me = DB.me(), bal = me.bal.XRP || 0;
    var st = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, bal))) - 1));
    var qty = f.qty == null ? Math.min(bal, Math.round(bal / 2 / st) * st) : Math.min(bal, Math.max(0, +f.qty));
    var ltv = +(f.ltv || 40), plan = f.plan || 'shield', term = +(f.term || 12);
    var q = DB.loanQuote({ qty: qty, ltv: ltv, plan: plan, term: term });
    return { me: me, bal: bal, qty: qty, ltv: ltv, plan: plan, term: term, q: q, ok: q.principal >= DB.SHIELD.minLoan };
  }
  Sc.shieldnew = {
    render: function (p, f) {
      var c = newCtx(f), q = c.q, cfg = DB.SHIELD.ltv[c.ltv];
      var L = { qty: c.qty || 1, principal: q.principal, strike: q.strike, liq: q.liq, capPrice: q.capPrice };
      return U.top('New Shield loan') +
        '<div class="hero" style="padding:4px 0 0"><div class="l">You pledge</div><div class="v" style="font-size:34px" data-live="sn-q">' + DB.fmt('XRP', c.qty) + '</div><div class="s" data-live="sn-qv">worth ' + usd(q.coll) + ' · you have ' + DB.fmt('XRP', c.bal) + '</div></div>' +
        '<input type="range" name="qty" min="0" max="' + c.bal + '" step="' + Math.max(1, Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, c.bal))) - 2))) + '" value="' + c.qty + '">' +
        '<label class="lbl">How much to borrow against it ' + U.info('ltv') + '</label>' + '<div class="seg">' + [[25, 'Safest'], [40, 'Balanced'], [50, 'Maximum']].map(function (o) { return '<button class="' + (c.ltv === o[0] ? 'on' : '') + '" data-act="set" data-k="ltv" data-v="' + o[0] + '"><b>' + o[0] + '%</b><span>' + o[1] + '</span></button>'; }).join('') + '</div>' +
        '<label class="lbl">Plan ' + U.info('plans') + '</label>' +
        '<button class="opt" style="' + (c.plan === 'shield' ? 'border-color:var(--acc2)' : '') + '" data-act="set" data-k="plan" data-v="shield">' + ic('shield', c.plan === 'shield' ? 'acc' : '') + '<span class="grow"><div class="t">Shield · full upside</div><div class="s">You keep every dollar of the rally. Protection fee ' + pc(cfg.fee) + ' a year.</div></span>' + (c.plan === 'shield' ? ic('check', 'acc') : '') + '</button>' +
        '<button class="opt" style="' + (c.plan === 'collar' ? 'border-color:var(--acc2)' : '') + '" data-act="set" data-k="plan" data-v="collar">' + ic('sliders', c.plan === 'collar' ? 'acc' : '') + '<span class="grow"><div class="t">Collar · lower cost, with a ceiling</div><div class="s">No protection fee. In return your upside stops at +' + pc(cfg.cap, 0) + '.</div></span>' + (c.plan === 'collar' ? ic('check', 'acc') : '') + '</button>' +
        '<label class="lbl">Term</label>' + '<div class="seg">' + DB.SHIELD.terms.map(function (t) { return '<button class="' + (c.term === t ? 'on' : '') + '" data-act="set" data-k="term" data-v="' + t + '"><b>' + t + '</b><span>months</span></button>'; }).join('') + '</div>' +
        '<div class="card pad glow mt" data-live="sn-sum"><div class="mut sm">You receive</div><div style="font-size:32px;font-weight:700;margin:4px 0 8px">' + DB.fmt('USDC', q.principal) + '</div>' +
        U.kv('Interest', pc(q.rate) + ' a year') + U.kv('Protection', q.fee ? pc(q.fee) + ' a year' : 'Included · ceiling at ' + pxs(q.capPrice)) +
        U.kv('Monthly cost', DB.fmt('USDC', q.monthly)) + U.kv('Loan repaid', 'in ' + c.term + ' months, or earlier') + U.kv('Protection level ' + U.info('level'), 'below ' + pxs(q.strike) + ' per XRP') + '</div>' +
        crashBox(L, f, false) +
        '<div class="note mt">One clear price, agreed upfront. Demo figures, illustrative only.</div>' +
        '<div class="cta"><button class="btn" data-act="shieldGo" data-live="sn-btn"' + (c.ok ? '' : ' disabled') + '>' + (c.ok ? 'Get ' + DB.fmt('USDC', q.principal) : 'Minimum loan ' + DB.fmt('USDC', DB.SHIELD.minLoan)) + '</button></div>';
    }
  };
  A.shieldGo = function () {
    var c = newCtx(S.form); if (!c.ok) return;
    U.faceId(function () {
      var L = DB.openLoan(c.me.id, { qty: c.qty, ltv: c.ltv, plan: c.plan, term: c.term });
      U.done({ icon: 'shield', title: 'You are protected', text: DB.fmt('USDC', L.principal) + ' is in your account. Your XRP stays yours.', lines: [['Pledged', DB.fmt('XRP', L.qty)], ['Received', DB.fmt('USDC', L.principal)], ['Protection starts below', pxs(L.strike)]], label: 'Open the loan', to: 'loan', toP: { id: L.id }, home: 'premium' });
    }, 'Confirm loan');
  };

  Sc.loan = {
    render: function (p, f) {
      var L = DB.loan(p.id); if (!L) return U.top('Shield loan') + '<div class="empty">Loan not found.</div>';
      var P = DB.px('XRP'), act = L.status === 'active', ltv = act ? L.principal / (L.qty * P) : 0, w = Math.min(100, ltv / 0.9 * 100);
      var head = act
        ? '<div class="hero" style="padding:6px 0 14px"><div class="l">You owe</div><div class="v">' + DB.fmt('USDC', L.principal) + '</div><div class="s">against ' + DB.fmt('XRP', L.qty) + ' · worth ' + usd(L.qty * P) + '</div>' +
          '<div style="margin-top:12px"><span class="pill ok">' + ic('check') + 'Protected</span> ' + (L.due ? '<span class="pill warn">Due</span> ' : '') + (L.typicalLiquidated ? '<span class="pill bad">A typical loan would be gone</span>' : '') + '</div></div>'
        : '<div class="hero" style="padding:6px 0 14px"><div class="l">Loan closed</div><div class="v">' + DB.fmt('XRP', L.returned || 0) + '</div><div class="s">returned to your account</div><div style="margin-top:12px"><span class="pill mut">Closed ' + DB.dateOnly(L.closed || DB.now()) + '</span></div></div>';
      var body = '<div class="card pad">' + (act ? '<div class="flex between"><span class="mut sm">Loan to value</span><span class="b">' + pc(ltv) + '</span></div><div class="gauge"><b class="' + (ltv > 0.745 ? 'hot' : '') + '" style="width:' + w + '%"></b><i style="left:' + (0.75 / 0.9 * 100) + '%"></i></div><div class="mut xs rt">protection level 75%</div>' : '') +
        U.kv('Plan ' + U.info('plans'), L.plan === 'collar' ? 'Collar · ceiling at ' + pxs(L.capPrice) : 'Shield · full upside') + U.kv('Borrowed', DB.fmt('USDC', L.principal0)) +
        U.kv('Protection paid for you', '<span class="' + (L.paidProtection ? 'ok' : '') + '">' + DB.fmt('USDC', L.paidProtection) + '</span>') +
        U.kv('Rate', pc(L.rate) + ' + ' + pc(L.fee) + ' protection') +
        (act ? U.kv('Monthly cost', DB.fmt('USDC', L.principal * (L.rate + L.fee) / 12)) + U.kv('Term', L.term + ' months') + U.kv('Protection level ' + U.info('level'), pxs(L.strike) + ' · XRP now ' + pxs(P)) : (L.giveUp ? U.kv('Kept by the ceiling', DB.fmt('XRP', L.giveUp)) : '')) + '</div>';
      return U.top('Shield loan') + head +
        (act ? '<div class="acts"><button class="act" data-act="sheet" data-name="repay" data-id="' + L.id + '">' + ic('check') + 'Repay</button>' + (L.due ? '<button class="act" data-act="loanExtend" data-id="' + L.id + '">' + ic('cal') + 'Extend</button>' : '<button class="act" data-act="sheet" data-name="info" data-k="shield">' + ic('help') + 'How it works</button>') + '</div>' : '') +
        body + (act ? crashBox(L, f, true) : '') +
        U.sec('Timeline') + '<div class="card">' + L.log.map(function (x) { return U.row({ left: '<span class="ic">' + ic('clock') + '</span>', t: '<span style="white-space:normal;font-size:13.500px;line-height:1.4;display:block">' + e(x.text) + '</span>', s: e(DB.when(x.ts)) }); }).join('') + '</div>';
    }
  };
  A.loanApply = function () {
    var pct = S.form.sim == null ? -50 : +S.form.sim, P = Math.max(0.01, DB.px('XRP') * (1 + pct / 100));
    var paid = DB.setPrice('XRP', P); S.form.sim = 0; U.render();
    U.toast('XRP is now ' + pxs(P) + (paid > 0 ? '. Protection paid ' + DB.fmt('USDC', paid) + ' toward your loans' : '. No protection needed'));
  };
  A.loanExtend = function (d) { DB.extendLoan(d.id); U.render(); U.toast('Term extended by 12 months'); };
  Sh.repay = function (p, f) {
    var L = DB.loan(p.id), me = DB.acc(L.acc), x = U.num(f.ramt), have = me.bal.USDC || 0;
    return '<h3>Repay the loan</h3><div class="card">' + U.kv('You owe', DB.fmt('USDC', L.principal)) + U.kv('USDC available', DB.fmt('USDC', have)) + '</div>' +
      '<label class="lbl">Amount</label><div class="fld"><input name="ramt" data-autofocus inputmode="decimal" placeholder="0.00" value="' + e(f.ramt || '') + '" autocomplete="off"><span class="sfx">USDC</span></div>' +
      '<div class="chips wrap mt"><button class="chip" data-act="set" data-k="ramt" data-v="' + Math.min(have, L.principal) + '">Repay all</button><button class="chip" data-act="set" data-k="ramt" data-v="' + DB.r('USDC', Math.min(have, L.principal / 2)) + '">Half</button>' + (have < L.principal ? '<button class="chip" data-act="go" data-to="swap">Swap to USDC</button>' : '') + '</div>' +
      '<div class="note mt">Repay in full and your XRP is released in the same second.</div>' +
      '<button class="btn mt" data-act="repayGo" data-id="' + L.id + '" data-live="rp-btn"' + (x > 0 && x <= have + 1e-9 ? '' : ' disabled') + '>Repay ' + (x > 0 ? DB.fmt('USDC', Math.min(x, L.principal)) : '') + '</button>';
  };
  A.repayGo = function (d) {
    var x = U.num(S.form.ramt), L = DB.loan(d.id);
    U.faceId(function () {
      DB.repay(L.id, x); S.form.ramt = ''; U.render();
      U.toast(L.status === 'closed' ? 'Loan repaid. ' + DB.fmt('XRP', L.returned) + ' is back in your account' : 'Repaid. You now owe ' + DB.fmt('USDC', L.principal));
    }, 'Confirm repayment');
  };

  /* ---------- Earn ---------- */
  function rateOf(s) { return DB.EARN.rates[s] || 0; }
  function gain(x) { return '+' + DB.nf(x, x >= 1 ? 4 : 6); }
  var ticker = null;
  /* Keeps the "earned so far" figures moving while an Earn screen is open. */
  function tick() {
    if (ticker) return;
    ticker = setInterval(function () {
      var els = document.querySelectorAll('[data-earn]'), me = DB.me();
      if (!els.length || !me) { clearInterval(ticker); ticker = null; return; }
      Array.prototype.forEach.call(els, function (el) {
        var id = el.getAttribute('data-earn'), p = id === 'all' ? null : DB.earnPos(id);
        if (id === 'all') el.textContent = '+€' + gain(DB.earnSum(me.id).earned).slice(1);
        else if (p) el.textContent = gain(p.paid + DB.earnAccrued(p));
      });
    }, 250);
  }
  function posRow(p) {
    return U.row({ left: U.aico(p.asset), t: DB.fmt(p.asset, p.amt), s: pc(p.rate) + ' a year', rt: '<span class="ok tn" data-earn="' + p.id + '">' + gain(p.paid + DB.earnAccrued(p)) + '</span>', rs: p.asset + ' earned', act: 'sheet', data: { name: 'earnpos', id: p.id }, chev: 1 });
  }
  Sc.earn = {
    after: tick,
    render: function () {
      var me = DB.me(), pos = DB.earnOf(me.id), sum = DB.earnSum(me.id);
      var list = DB.ORDER.filter(function (s) { return rateOf(s) && (me.bal[s] || 0) > 0; });
      var head = pos.length
        ? '<div class="hero" style="padding:4px 0 14px"><div class="l">At work in Earn</div><div class="v" data-count="' + sum.value + '" data-pre="€">€' + DB.nf(sum.value, 2) + '</div><div class="s">about €' + DB.nf(sum.yearly, 0) + ' a year</div>' +
          '<div style="margin-top:12px"><span class="pill ok">' + ic('grow') + '<span class="tn" data-earn="all">+€' + gain(sum.earned).slice(1) + '</span> earned so far</span></div></div>' +
          '<div class="card">' + pos.map(posRow).join('') + '</div>' +
          '<button class="btn demo mt" data-act="earnSkip">' + ic('bolt') + 'Skip 30 days</button>'
        : '<div class="lead">Idle money, <em>working</em></div><p class="sub">Put the balances you are not using to work. One clear yearly rate, shown before you start.</p>' +
          '<div class="card steps">' +
          '<div class="step"><div><div class="t">Choose a balance</div><div class="s">Euro, dollars, stablecoins or crypto. Any amount.</div></div></div>' +
          '<div class="step"><div><div class="t">Rewards every day</div><div class="s">Counted every second, paid to your balance once a day.</div></div></div>' +
          '<div class="step"><div><div class="t">Take it back any time</div><div class="s">No lock-in. The full amount returns in one tap.</div></div></div></div>';
      return U.top('Earn', { right: '<button class="rb" data-act="sheet" data-name="info" data-k="earn" aria-label="Help">' + ic('help') + '</button>' }) + head +
        U.sec(pos.length ? 'Add a balance' : 'Choose a balance') + '<div class="card">' + (list.length ? list.map(function (s) {
          return U.row({ left: U.aico(s), t: e(DB.ASSETS[s].name), s: 'You have ' + DB.fmt(s, me.bal[s]), rt: '<span class="acc">' + pc(rateOf(s)) + '</span>', rs: 'a year', act: 'go', data: { to: 'earnnew', s: s }, chev: 1 });
        }).join('') : '<div class="empty">Add money first, then put it to work.</div>') + '</div>' +
        '<div class="mut xs c mt">Demo rates, illustrative only.</div>';
    }
  };
  A.earnSkip = function () {
    var paid = DB.earnSkip(DB.me().id, 30); U.render();
    U.toast(paid > 0 ? '30 days of rewards paid: +€' + DB.nf(paid, 2) : 'Nothing in Earn yet');
  };
  function earnCtx(p, f) {
    var me = DB.me(), s = p.s, bal = me.bal[s] || 0, x = U.num(f.amt), rate = rateOf(s);
    return { me: me, s: s, bal: bal, x: x, rate: rate, ok: rate > 0 && x > 0 && x <= bal + 1e-9, over: x > bal + 1e-9 };
  }
  Sc.earnnew = {
    render: function (p, f) {
      var c = earnCtx(p, f), s = c.s, yr = c.x * c.rate, have = DB.earnFor(c.me.id, s);
      return U.top('Earn on ' + s) +
        U.amount(f, '<span class="' + (c.over ? 'bad' : '') + '">' + (c.over ? 'Not enough · ' : '') + 'Available ' + DB.fmt(s, c.bal) + '</span>') +
        '<div class="chips wrap" style="justify-content:center">' + [[0.25, 'A quarter'], [0.5, 'Half'], [1, 'All']].map(function (q) { return '<button class="chip" data-act="set" data-k="amt" data-v="' + DB.r(s, c.bal * q[0]) + '">' + q[1] + '</button>'; }).join('') + '</div>' +
        '<div class="card pad glow mt" data-act="focusAmt" data-live="en-sum"><div class="mut sm">You earn' + (c.x > 0 ? ' about' : ' · type an amount above') + '</div><div style="font-size:30px;font-weight:700;margin:4px 0">' + DB.fmt(s, yr, { plus: yr > 0 }) + ' <span class="mut" style="font-size:15px;font-weight:400">a year</span></div>' +
        U.kv('Rate ' + U.info('earn'), pc(c.rate) + ' a year') + U.kv('About a month', DB.fmt(s, yr / 12)) + U.kv('Rewards', 'Paid to your balance daily') + U.kv('Take it back', 'Any time, in full') + '</div>' +
        (have ? '<div class="note mt">You already have ' + DB.fmt(s, have.amt) + ' in Earn. This adds to it.</div>' : '') +
        '<div class="mut xs c mt">Demo rate, illustrative only.</div>' +
        '<div class="cta"><button class="btn" data-act="earnGo" data-live="en-btn"' + (c.ok ? '' : ' disabled') + '>' + (c.x > 0 && !c.over ? 'Start earning on ' + DB.fmt(s, c.x) : 'Start earning') + '</button></div>';
    }
  };
  A.earnGo = function () {
    var c = earnCtx(U.cur().p, S.form); if (!c.ok) return;
    U.faceId(function () {
      var p = DB.earnStart(c.me.id, c.s, c.x);
      U.done({ icon: 'grow', title: 'Your money is working', text: DB.fmt(c.s, c.x) + ' now earns ' + pc(c.rate) + ' a year.', lines: [['In Earn', DB.fmt(c.s, p.amt)], ['About a year', DB.fmt(c.s, p.amt * p.rate, { plus: true })], ['Take it back', 'Any time, in full']], label: 'Open Earn', to: 'earn', home: 'premium' });
    }, 'Confirm Earn');
  };
  Sh.earnpos = function (p) {
    var q = DB.earnPos(p.id); if (!q) return '<h3>Earn</h3><div class="empty">This balance is no longer in Earn.</div>';
    var s = q.asset;
    return '<h3>' + e(DB.ASSETS[s].name) + ' in Earn</h3><div class="card">' + U.kv('At work', DB.fmt(s, q.amt)) + U.kv('Rate', pc(q.rate) + ' a year') +
      U.kv('Earned so far', '<span class="ok"><span class="tn" data-earn="' + q.id + '">' + gain(q.paid + DB.earnAccrued(q)) + '</span> ' + s + '</span>') +
      U.kv('Already paid to your balance', DB.fmt(s, q.paid)) + U.kv('Since', DB.dateOnly(q.start)) + '</div>' +
      '<button class="btn mt" data-act="go" data-to="earnnew" data-s="' + s + '">' + ic('plus') + 'Add more</button>' +
      '<button class="btn sec2 mt" data-act="earnStop" data-id="' + q.id + '">Take it all back</button>' +
      '<div class="note mt">The full amount returns to your ' + s + ' balance at once, with the rewards counted so far.</div>';
  };
  A.earnStop = function (d) {
    U.faceId(function () {
      var o = DB.earnStop(d.id); U.render();
      U.toast(DB.fmt(o.asset, o.amt) + ' is back in your balance' + (o.paid > 0 ? '. Earned in total: ' + DB.fmt(o.asset, o.paid, { plus: true }) : ''));
    }, 'Confirm');
  };

  /* ---------- Inheritance ---------- */
  function estate(a) { var t = DB.totals(a); return Math.max(0, t.total + t.pledged - t.debt); }
  function sharesBar(heirs) { return '<div class="bar">' + heirs.map(function (h, i) { return '<span style="width:' + Math.max(0, +h.share || 0) + '%;background:' + COL[i % COL.length] + '"></span>'; }).join('') + '</div>'; }
  function heirAv(h, i) { var a = h.accId && DB.acc(h.accId); return a ? U.avatar(a) : '<span class="av" style="background:' + COL[i % COL.length] + '22;color:' + COL[i % COL.length] + '">' + e(DB.initials(h.name || '?')) + '</span>'; }

  Sc.inherit = {
    render: function () {
      var me = DB.me(), p = DB.plan(me.id);
      if (!p || p.status !== 'active') {
        return U.top('Inheritance', { right: '<button class="rb" data-act="sheet" data-name="info" data-k="inherit" aria-label="Help">' + ic('help') + '</button>' }) + '<div class="lead">Your wealth reaches <em>your family</em></div>' +
          '<p class="sub">Inheritance, built into the account. Crypto is easily lost on death: keys disappear, accounts freeze, families do not know what exists.</p>' +
          '<div class="card steps">' +
          '<div class="step"><div><div class="t">Set the plan</div><div class="s">Choose heirs and shares in the app, in one tap. Change it any time.</div></div></div>' +
          '<div class="step"><div><div class="t">Smart contract</div><div class="s">The plan is recorded on-chain. Nothing passes to heirs while you are alive.</div></div></div>' +
          '<div class="step"><div><div class="t">Verified claim</div><div class="s">Heirs present the death certificate and legal documents. We verify them and run KYC.</div></div></div>' +
          '<div class="step"><div><div class="t">Heirs receive</div><div class="s">Assets are released to the heirs’ own accounts. No keys or seed phrases needed.</div></div></div></div>' +
          '<div class="cta"><button class="btn" data-act="go" data-to="inheritedit">Set up my plan</button></div>';
      }
      var est = estate(me);
      return U.top('Inheritance') +
        '<div class="hero" style="padding:4px 0 14px"><div class="l">Covered by your plan</div><div class="v">€' + DB.nf(est, 0) + '</div><div class="s">everything you hold with us, net of loans</div><div style="margin-top:12px"><span class="pill ok">' + ic('check') + 'Active · version ' + p.version + '</span></div></div>' +
        '<div class="card pad">' + sharesBar(p.heirs) + p.heirs.map(function (h, i) {
          return '<div class="heir">' + heirAv(h, i) + '<span class="grow"><div class="t">' + e(h.name) + '</div><div class="mut sm">' + e(h.relation) + (h.accId ? ' · My Neobank account' : ' · will be invited') + '</div></span><span class="rt"><div class="b" style="color:' + COL[i % COL.length] + '">' + DB.nf(h.share, 0, 1) + '%</div><div class="mut sm">≈ €' + DB.short(est * h.share / 100) + '</div></span></div>';
        }).join('') + '</div>' +
        '<div class="card mt">' + U.kv('Recorded on-chain', '<button class="acc code" data-act="copy" data-text="' + p.hash + '">' + p.hash.slice(0, 10) + '…' + p.hash.slice(-6) + '</button>') + U.kv('Last change', DB.dateOnly(p.updated)) + U.kv('Heirs notified', p.notify ? 'Yes' : 'No, kept private') + (p.note ? U.kv('Your note', e(p.note)) : '') + '</div>' +
        '<div class="acts mt"><button class="act" data-act="go" data-to="inheritedit">' + ic('sliders') + 'Change plan</button><button class="act demo" data-act="go" data-to="claim" data-owner="' + me.id + '">' + ic('bolt') + 'Demo a claim</button></div>' +
        U.sec('History') + '<div class="card">' + p.log.map(function (x) { return U.row({ left: '<span class="ic">' + ic('doc') + '</span>', t: '<span style="white-space:normal;font-size:13.500px;line-height:1.4;display:block">' + e(x.text) + '</span>', s: e(DB.when(x.ts)) }); }).join('') + '</div>' +
        '<div class="c mt2"><button class="mut sm" style="text-decoration:underline" data-act="planRemove">Remove the plan</button></div>';
    }
  };
  A.planRemove = function () { U.sheet('planrm'); };
  Sh.planrm = function () { return '<h3>Remove the plan?</h3><div class="mut c" style="margin:-6px 0 16px;line-height:1.5">Your heirs will no longer be recorded. You can set a new plan any time.</div><button class="btn danger" data-act="planRemoveGo">Remove the plan</button><button class="btn line mt" data-act="close">Keep it</button>'; };
  A.planRemoveGo = function () { DB.removePlan(DB.me().id); S.sheet = null; U.render(); U.toast('Plan removed'); };

  function total(f) { return (f.heirs || []).reduce(function (s, h) { return s + (+h.share || 0); }, 0); }
  function split(f) { var n = f.heirs.length, each = Math.floor(1000 / n) / 10; f.heirs.forEach(function (h, i) { h.share = i === n - 1 ? Math.round((100 - each * (n - 1)) * 10) / 10 : each; }); }
  Sc.inheritedit = {
    enter: function (p, f) {
      var pl = DB.plan(DB.me().id);
      f.heirs = pl && pl.status === 'active' ? pl.heirs.map(function (h) { return { name: h.name, accId: h.accId, relation: h.relation, share: h.share }; }) : [];
      f.notify = pl ? pl.notify : false; f.note = pl ? pl.note : '';
    },
    input: function (name, v, f) {
      var m = /^h([snr])_(\d+)$/.exec(name); if (!m || !f.heirs[+m[2]]) return;
      var h = f.heirs[+m[2]]; if (m[1] === 's') h.share = U.num(v); else if (m[1] === 'n') h.name = v; else h.relation = v;
    },
    render: function (p, f) {
      var heirs = f.heirs || [], t = total(f), ok = heirs.length && Math.abs(t - 100) < 0.01 && heirs.every(function (h) { return String(h.name || '').trim(); });
      var REL = ['Spouse', 'Child', 'Parent', 'Sibling', 'Partner', 'Friend', 'Family'];
      return U.top('Your heirs') +
        '<div class="card pad"><div data-live="ie-bar">' + sharesBar(heirs) + '<div class="flex between sm"><span class="mut">Shares</span><span class="b ' + (Math.abs(t - 100) < 0.01 ? 'ok' : 'bad') + '">' + DB.nf(t, 0, 1) + '% of 100%</span></div></div>' +
        (heirs.length ? heirs.map(function (h, i) {
          return '<div class="heir">' + heirAv(h, i) + '<span class="grow">' + (h.accId ? '<div class="t">' + e(h.name) + '</div>' : '<input class="nm" name="hn_' + i + '" placeholder="Full name" value="' + e(h.name || '') + '" autocapitalize="words" autocomplete="off">') +
            '<select class="rel" name="hr_' + i + '">' + REL.map(function (r) { return '<option' + (r === (h.relation || 'Family') ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></span>' +
            '<input name="hs_' + i + '" inputmode="decimal" value="' + e(h.share == null ? '' : h.share) + '"><span class="mut">%</span><button class="rb ghost" style="width:30px" data-act="heirDel" data-i="' + i + '" aria-label="Remove">' + ic('x', 'mut') + '</button></div>';
        }).join('') : '<div class="empty">No heirs yet. Add the first one.</div>') + '</div>' +
        '<div class="acts mt"><button class="act" data-act="sheet" data-name="heir">' + ic('plus') + 'Add heir</button>' + (heirs.length > 1 ? '<button class="act" data-act="heirSplit">' + ic('pct') + 'Split equally</button>' : '') + '</div>' +
        '<div class="card"><div class="row"><span class="grow"><div class="t">Tell my heirs now</div><div class="s">Off: they learn about it only at a claim</div></span>' + U.sw(f.notify, 'toggle', { k: 'notify' }) + '</div></div>' +
        '<label class="lbl">A note for them (optional)</label><textarea class="fld" name="note" placeholder="A few words your family will read">' + e(f.note || '') + '</textarea>' +
        '<div class="note mt">The plan covers everything you hold with My Neobank. It is recorded on-chain and you can change it any time.</div>' +
        '<div class="cta"><button class="btn" data-act="planSave" data-live="ie-btn"' + (ok ? '' : ' disabled') + '>Record my plan</button></div>';
    }
  };
  Sh.heir = function () {
    var me = DB.me(), used = (S.form.heirs || []).map(function (h) { return h.accId; });
    var cands = DB.others(me.id).filter(function (a) { return a.type === 'person' && used.indexOf(a.id) < 0; });
    return '<h3>Add an heir</h3>' + cands.map(function (a) {
      return '<button class="opt" data-act="heirAdd" data-id="' + a.id + '">' + U.avatar(a) + '<span class="grow"><div class="t">' + e(a.name) + '</div><div class="s">Has a My Neobank account</div></span>' + ic('plus', 'acc') + '</button>';
    }).join('') + '<button class="opt" data-act="heirAdd">' + ic('user', 'acc') + '<span class="grow"><div class="t">Someone else</div><div class="s">We invite them to open an account at a claim</div></span>' + ic('plus', 'acc') + '</button>';
  };
  A.heirAdd = function (d) {
    var f = S.form, a = d.id && DB.acc(d.id); f.heirs = f.heirs || [];
    var equal = f.heirs.length === 0 || f.heirs.every(function (h) { return Math.abs(h.share - f.heirs[0].share) < 0.2; });
    f.heirs.push({ name: a ? a.name : '', accId: a ? a.id : null, relation: 'Family', share: Math.max(0, 100 - total(f)) });
    if (equal) split(f);
    S.sheet = null; U.render();
  };
  A.heirDel = function (d) { S.form.heirs.splice(+d.i, 1); if (S.form.heirs.length) split(S.form); U.render(); };
  A.heirSplit = function () { split(S.form); U.render(); };
  A.planSave = function () {
    var f = S.form, me = DB.me();
    U.faceId(function () {
      var p = DB.savePlan(me.id, { heirs: f.heirs, notify: f.notify, note: f.note });
      U.done({ icon: 'heirs', title: 'Plan recorded', text: 'Version ' + p.version + ' is on-chain. Nothing passes while you are alive.', lines: p.heirs.map(function (h) { return [h.name, DB.nf(h.share, 0, 1) + '%']; }), label: 'See my plan', to: 'inherit', home: 'premium' });
    }, 'Confirm your plan');
  };

  /* ---------- claim (demo) ---------- */
  var STEPS = ['Death certificate and legal documents received', 'Documents verified', 'Heirs verified (KYC)', 'Plan matched on-chain', 'Loans settled, assets released'];
  Sc.claim = {
    render: function (p, f) {
      var o = DB.acc(p.owner), pl = o && DB.plan(o.id), me = DB.me();
      if (!o || !pl) return U.top('Claim') + '<div class="empty">No plan found.</div>';
      if (pl.status === 'settled') {
        var by = {}; (pl.result || []).forEach(function (x) { by[x.accId] = by[x.accId] || { name: x.heir, eur: 0, n: 0 }; by[x.accId].eur += DB.eur(x.asset, x.amt); by[x.accId].n += 1; });
        return '<div class="done-wrap"><div class="bigcheck">' + ic('heirs') + '</div><h2>Assets released</h2><p>Everything from ' + e(o.name) + '’s account is now with the heirs, in their own accounts.</p></div>' +
          '<div class="card">' + pl.heirs.map(function (h, i) { var b = by[h.accId] || { eur: 0 }; return '<div class="heir">' + heirAv(h, i) + '<span class="grow"><div class="t">' + e(h.name) + '</div><div class="mut sm">' + (h.opened ? 'New account opened' : 'Existing account') + ' · ' + DB.nf(h.share, 0, 1) + '%</div></span><span class="b ok">+€' + DB.short(b.eur) + '</span></div>'; }).join('') + '</div>' +
          '<div class="note mt">Heirs became clients: the wealth and the relationship stay on the platform. Use Reset in Demo controls to start again.</div>' +
          '<div class="cta"><button class="btn" data-act="' + (me && me.closed ? 'logout' : 'tab') + '" data-to="home">' + (me && me.closed ? 'Back to accounts' : 'Done') + '</button></div>';
      }
      if (f.step === 1) {
        return U.top('Claim in progress', { noBack: true }) + '<div class="card pad prog">' + STEPS.map(function (s, i) { return '<div class="st ' + (i < f.prog ? 'on' : i === f.prog ? 'run' : '') + '"><span class="d">' + ic('check') + '</span><span>' + s + '</span></div>'; }).join('') + '</div><div class="note mt">In real life this takes days and real documents. In the demo it takes seconds.</div>';
      }
      var debt = DB.loansOf(o.id).filter(function (l) { return l.status === 'active'; }).reduce(function (s, l) { return s + l.principal; }, 0), est = estate(o);
      return U.top('Claim an inheritance') + '<div class="card pad c">' + '<div style="display:grid;place-items:center;margin-bottom:8px">' + U.avatar(o, 'lg') + '</div><div class="b" style="font-size:18px">' + e(o.name) + '’s plan</div><div class="mut sm">version ' + pl.version + ' · recorded ' + DB.dateOnly(pl.updated) + '</div><div class="v b mt" style="font-size:28px">€' + DB.nf(est, 0) + '</div><div class="mut sm">to be released' + (debt ? ', after settling a loan of ' + DB.fmt('USDC', debt) : '') + '</div></div>' +
        '<div class="card mt">' + pl.heirs.map(function (h, i) { return '<div class="heir">' + heirAv(h, i) + '<span class="grow"><div class="t">' + e(h.name) + '</div><div class="mut sm">' + e(h.relation) + '</div></span><span class="rt"><div class="b">' + DB.nf(h.share, 0, 1) + '%</div><div class="mut sm">≈ €' + DB.short(est * h.share / 100) + '</div></span></div>'; }).join('') + '</div>' +
        (pl.note ? '<div class="note mt">“' + e(pl.note) + '”</div>' : '') +
        '<div class="note mt">Demo: this simulates that ' + e(o.name) + ' has passed away. Heirs present the documents, we verify them, and all assets move to the heirs. It cannot be undone without a reset.</div>' +
        '<div class="cta"><button class="btn" data-act="claimGo">Present documents and claim</button></div>';
    }
  };
  A.claimGo = function () {
    var p = U.cur().p; S.form.step = 1; S.form.prog = 0; U.render();
    var t = setInterval(function () {
      if (U.cur().name !== 'claim') return clearInterval(t);
      S.form.prog += 1;
      if (S.form.prog >= STEPS.length) { clearInterval(t); try { DB.settleEstate(p.owner); } catch (err) { U.fail(err); } S.form.step = 2; S.fresh = true; }
      U.render();
    }, 800);
  };
})(window);
