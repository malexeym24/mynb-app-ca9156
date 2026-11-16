/* My Neobank - clickable demo. Data + money logic. Paper money only, everything lives in this browser. */
(function (G) {
  'use strict';

  var KEY = 'mynb_demo_v1';
  var DAY = 864e5;

  var ASSETS = {
    EUR:  { sym: 'EUR',  name: 'Euro',              kind: 'fiat',   dec: 2, sign: '€',   glyph: '€',  color: '#1F5557' },
    USD:  { sym: 'USD',  name: 'US dollar',         kind: 'fiat',   dec: 2, sign: '$',   glyph: '$',  color: '#27573F' },
    GBP:  { sym: 'GBP',  name: 'British pound',     kind: 'fiat',   dec: 2, sign: '£',   glyph: '£',  color: '#4A3F6B' },
    IDR:  { sym: 'IDR',  name: 'Indonesian rupiah', kind: 'fiat',   dec: 0, sign: 'Rp ', glyph: 'Rp', color: '#6B3F3F' },
    USDC: { sym: 'USDC', name: 'USD Coin',          kind: 'stable', dec: 2, sign: '',    glyph: '$',  color: '#2775CA' },
    USDT: { sym: 'USDT', name: 'Tether',            kind: 'stable', dec: 2, sign: '',    glyph: '₮',  color: '#26A17B' },
    XRP:  { sym: 'XRP',  name: 'XRP',               kind: 'crypto', dec: 2, sign: '',    glyph: '✕',  color: '#23292F' },
    BTC:  { sym: 'BTC',  name: 'Bitcoin',           kind: 'crypto', dec: 5, sign: '',    glyph: '₿',  color: '#F7931A' },
    ETH:  { sym: 'ETH',  name: 'Ethereum',          kind: 'crypto', dec: 4, sign: '',    glyph: 'Ξ',  color: '#627EEA' }
  };
  var ORDER = ['EUR', 'USD', 'GBP', 'IDR', 'USDC', 'USDT', 'XRP', 'BTC', 'ETH'];

  /* Demo prices in USD. Not market data. Change them from the Demo controls. */
  var BASE_MARKET = { USD: 1, EUR: 1.08, GBP: 1.27, IDR: 1 / 16700, USDC: 1, USDT: 1, XRP: 2.0, BTC: 100000, ETH: 3500 };

  var MARGIN = 0.005; /* published conversion margin, demo value */

  /* Shield loan - illustrative demo pricing, one place to change it. */
  var SHIELD = {
    interest: 0.09,
    ltv: { 25: { fee: 0.025, cap: 1.5 }, 40: { fee: 0.05, cap: 0.9 }, 50: { fee: 0.065, cap: 0.6 } },
    trigger: 0.75,   /* protection starts paying when the loan would reach this LTV */
    typical: 0.80,   /* a typical crypto loan is liquidated here */
    terms: [3, 6, 12],
    minLoan: 1000
  };

  var TIERS = {
    standard: { id: 'standard', name: 'Standard', who: 'person', line: 'Virtual card, ready in seconds', cashback: 0, access: 'Free',
      perks: ['Pay online and with your phone', 'Freeze and unfreeze any time', 'Spend from any currency'], designs: ['graphite', 'teal'] },
    premium: { id: 'premium', name: 'Premium', who: 'person', line: 'Physical and virtual, 1% back', cashback: 0.01, access: 'Premium plan',
      perks: ['1% cashback on every purchase', 'Higher limits', 'Priority support'], designs: ['cyan', 'graphite', 'teal'] },
    metal: { id: 'metal', name: 'Metal', who: 'person', line: '18 g stainless steel, 2% back', cashback: 0.02, access: 'Private clients',
      perks: ['2% cashback on every purchase', 'Personal manager', 'Airport lounge access', 'Highest limits'], designs: ['steel', 'obsidian', 'gold'] },
    business: { id: 'business', name: 'Business', who: 'company', line: 'Cards for the team, 1% back', cashback: 0.01, access: 'Business plan',
      perks: ['1% cashback on company spend', 'A card for each team member', 'Spend controls and receipts', 'Exports for accounting'], designs: ['teal', 'graphite', 'cyan'] },
    bizmetal: { id: 'bizmetal', name: 'Business Metal', who: 'company', line: 'Steel card for owners, 1.5% back', cashback: 0.015, access: 'By invitation',
      perks: ['1.5% cashback on company spend', 'Dedicated account manager', 'Highest limits', 'Airport lounge access'], designs: ['steel', 'obsidian', 'gold'] }
  };

  var MERCHANTS = {
    person: [['Coffee shop', 4.8], ['Restaurant', 186.5], ['Flight tickets', 1240], ['Boutique hotel', 890], ['Watch store', 12400]],
    company: [['Beverage supplier', 3420], ['Sound and light rental', 1850], ['Online ads', 640], ['Staff transport', 310], ['Kitchen equipment', 9800]]
  };

  var W = null;

  /* ---------- helpers ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function err(m) { var e = new Error(m); e.user = true; return e; }
  function uid(p) { W.seq += 1; return p + W.seq; }
  function now() { return Date.now() + (W.offset || 0); }
  function r(a, x) { var m = Math.pow(10, ASSETS[a].dec); return Math.round((x + Number.EPSILON) * m) / m; }
  function px(a) { return W.market[a]; }
  function usd(a, x) { return x * px(a); }
  function eur(a, x) { return usd(a, x) / px('EUR'); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function hex(n, seed) { var x = seed || 1, s = ''; while (s.length < n) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s += ((x >>> 0) % 16).toString(16); } return s; }
  function pad4(n) { return ('0000' + (n % 10000)).slice(-4); }

  function nf(x, min, max) { return x.toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max == null ? min : max }); }
  function fmt(a, x, o) {
    o = o || {};
    var A = ASSETS[a], v = Math.abs(x), min = A.kind === 'crypto' ? Math.min(2, A.dec) : A.dec;
    var s = A.sign ? A.sign + nf(v, min, A.dec) : nf(v, min, A.dec) + ' ' + a;
    return (x < 0 ? '-' : (o.plus ? '+' : '')) + s;
  }
  function fmtUSD(x, d) { return '$' + nf(Math.abs(x), d == null ? 2 : d); }
  function fmtPx(a) { var p = px(a); return '$' + nf(p, 2, p < 10 ? 4 : 2); }
  function short(x) { var v = Math.abs(x); return v >= 1e9 ? nf(v / 1e9, 0, 2) + 'B' : v >= 1e6 ? nf(v / 1e6, 0, 2) + 'M' : v >= 1e3 ? nf(v / 1e3, 0, 1) + 'k' : nf(v, 0, 2); }
  function when(ts) {
    var d = new Date(ts), n = new Date(now()), t = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(), diff = Math.floor((d0 - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / DAY);
    var day = diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + (d.getFullYear() !== n.getFullYear() ? ' ' + d.getFullYear() : '');
    return day + ' • ' + t;
  }
  function dateOnly(ts) { var d = new Date(ts); return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getFullYear(); }

  /* ---------- world ---------- */
  function acc(id) { return W.accounts[id]; }
  function me() { return W.session ? acc(W.session) : null; }
  function list() { return W.order.map(acc); }
  function others(id) { return list().filter(function (a) { return a.id !== id && !a.closed; }); }
  function initials(name) { var p = String(name).trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : (p[0] || '?')[1] || '')).toUpperCase(); }

  function mkAccount(o) {
    var h = hash(o.id);
    var a = {
      id: o.id, type: o.type, name: o.name, legal: o.legal || '', tag: o.tag || (o.type === 'company' ? 'Business account' : 'Personal account'),
      hue: o.hue == null ? h % 360 : o.hue, bal: o.bal || {}, pledged: {}, auto: { USDC: false, USDT: true },
      iban: 'EE00 DEMO 0000 ' + pad4(h) + ' ' + pad4(h >>> 9), closed: false, created: now()
    };
    W.accounts[a.id] = a; W.order.push(a.id);
    return a;
  }
  function address(a, asset) {
    var h = hash(a.id + asset);
    if (asset === 'XRP') return 'rDEMO' + hex(26, h).toUpperCase();
    if (asset === 'BTC') return 'bc1qdemo' + hex(30, h);
    return '0xDEMO' + hex(36, h);
  }

  function addTx(accId, o) {
    var t = { id: uid('t'), ts: o.ts || now(), acc: accId, kind: o.kind, title: o.title, sub: o.sub || '', asset: o.asset, amt: o.amt, status: o.status || 'Completed', peer: o.peer || null, note: o.note || '', meta: o.meta || {} };
    W.txs.unshift(t); return t;
  }
  function notify(accId, title, body, to) { W.notifs.unshift({ id: uid('n'), ts: now(), acc: accId, title: title, body: body || '', to: to || '', read: false }); }
  function txsOf(id) { return W.txs.filter(function (t) { return t.acc === id; }); }
  function notifsOf(id) { return W.notifs.filter(function (n) { return n.acc === id; }); }
  function unread(id) { return notifsOf(id).filter(function (n) { return !n.read; }).length; }

  function credit(a, s, x) { a.bal[s] = r(s, (a.bal[s] || 0) + x); }
  function debit(a, s, x) {
    if ((a.bal[s] || 0) + 1e-9 < x) throw err('Not enough ' + s + '. Available: ' + fmt(s, a.bal[s] || 0));
    a.bal[s] = r(s, a.bal[s] - x);
  }
  function totals(a) {
    var t = { fiat: 0, crypto: 0, pledged: 0, debt: 0 };
    ORDER.forEach(function (s) { var v = eur(s, a.bal[s] || 0); if (ASSETS[s].kind === 'fiat') t.fiat += v; else t.crypto += v; });
    Object.keys(a.pledged).forEach(function (s) { t.pledged += eur(s, a.pledged[s] || 0); });
    loansOf(a.id).forEach(function (l) { if (l.status === 'active') t.debt += eur('USDC', l.principal); });
    t.total = t.fiat + t.crypto;
    return t;
  }

  /* ---------- seed ---------- */
  function seed() {
    W = { v: 2, seq: 100, offset: 0, market: clone(BASE_MARKET), accounts: {}, order: [], txs: [], notifs: [], loans: [], plans: {}, cards: [], requests: [], session: null };
    mkAccount({ id: 'alexey', type: 'person', name: 'Alexey', hue: 190, bal: { EUR: 1250000, USD: 800000, USDC: 600000, XRP: 400000, BTC: 5 } });
    mkAccount({ id: 'jesus', type: 'person', name: 'Jesús', hue: 28, bal: { EUR: 2400000, USD: 1100000, USDC: 900000, XRP: 1500000, BTC: 12, ETH: 150 } });
    mkAccount({ id: 'elkabron', type: 'company', name: 'El Kabron', legal: 'Chiringuito del Kabron', tag: 'Business · Beach club, Bali', hue: 345,
      bal: { EUR: 1850000, USD: 1200000, IDR: 12500000000, USDC: 650000, USDT: 300000 } });

    var t0 = Date.now(), H = 36e5;
    function past(accId, hoursAgo, o) { o.ts = t0 - hoursAgo * H; addTx(accId, o); }
    past('alexey', 3, { kind: 'out', title: 'To Jesús', sub: 'Internal transfer', asset: 'EUR', amt: -2500, peer: 'jesus', note: 'Dinner in Barcelona' });
    past('jesus', 3, { kind: 'in', title: 'From Alexey', sub: 'Internal transfer', asset: 'EUR', amt: 2500, peer: 'alexey', note: 'Dinner in Barcelona' });
    past('jesus', 26, { kind: 'out', title: 'To Alexey', sub: 'Internal transfer', asset: 'USDC', amt: -50000, peer: 'alexey' });
    past('alexey', 26, { kind: 'in', title: 'From Jesús', sub: 'Internal transfer', asset: 'USDC', amt: 50000, peer: 'jesus' });
    past('alexey', 50, { kind: 'swap', title: 'EUR to USDC', sub: 'Swap', asset: 'USDC', amt: 107460, meta: { from: 'EUR', x: 100000 } });
    past('alexey', 74, { kind: 'topup', title: 'EUR account top up', sub: 'SEPA Instant', asset: 'EUR', amt: 250000 });
    past('elkabron', 5, { kind: 'in', title: 'Payment from Sunset Events Ltd', sub: 'Payment request · stablecoin', asset: 'USDC', amt: 18400, meta: { checks: true } });
    past('elkabron', 20, { kind: 'out', title: 'To Jesús', sub: 'Internal transfer', asset: 'EUR', amt: -40000, peer: 'jesus', note: 'Owner distribution' });
    past('jesus', 20, { kind: 'in', title: 'From El Kabron', sub: 'Internal transfer', asset: 'EUR', amt: 40000, peer: 'elkabron', note: 'Owner distribution' });
    past('elkabron', 30, { kind: 'card', title: 'Beverage supplier', sub: 'Business card •• 4821', asset: 'EUR', amt: -3420 });
    past('elkabron', 31, { kind: 'cashback', title: 'Cashback', sub: 'Beverage supplier', asset: 'EUR', amt: 34.2 });
    past('elkabron', 52, { kind: 'in', title: 'Payment from Blue Lagoon Travel', sub: 'Payment request · auto-converted', asset: 'EUR', amt: 11020.37, meta: { checks: true, from: 'USDT', x: 12000 } });
    past('jesus', 96, { kind: 'topup', title: 'XRP received', sub: 'From external wallet', asset: 'XRP', amt: 250000 });
    W.txs.sort(function (a, b) { return b.ts - a.ts; });

    W.cards.push({ id: 'c1', acc: 'elkabron', tier: 'business', design: 'teal', name: 'EL KABRON', last4: '4821', exp: '11/30', frozen: false, limit: 50000, spent: 3420, cashback: 34.2, created: t0 - 40 * DAY });
    W.requests.push({ id: 'r1', acc: 'elkabron', customer: 'Sunset Events Ltd', asset: 'USDC', amt: 18400, note: 'Private event, 40 guests', status: 'paid', ts: t0 - 2 * DAY, paid: t0 - 5 * H, ref: 'EK-1042' });
    W.requests.push({ id: 'r2', acc: 'elkabron', customer: 'Oceanic Weddings', asset: 'USDT', amt: 26500, note: 'Wedding deposit, 14 December', status: 'open', ts: t0 - 6 * H, paid: 0, ref: 'EK-1043' });
    W.requests.push({ id: 'r3', acc: 'elkabron', customer: 'Nomad Retreats GmbH', asset: 'EUR', amt: 8400, note: 'Group lunch and day beds', status: 'open', ts: t0 - 30 * H, paid: 0, ref: 'EK-1041' });

    ['alexey', 'jesus', 'elkabron'].forEach(function (id) {
      W.notifs.push({ id: uid('n'), ts: t0 - 60000, acc: id, title: 'Welcome to the demo', body: 'Everything here is paper money. Send, swap, borrow, play.', to: '', read: false });
    });
    return W;
  }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) { /* private mode: keep in memory */ } }
  function load() {
    try { var s = localStorage.getItem(KEY); if (s) { var w = JSON.parse(s); if (w && w.v === 2) { W = w; return W; } } } catch (e) { /* ignore */ }
    seed(); save(); return W;
  }
  function reset() { seed(); save(); }
  function login(id) { W.session = id; save(); }
  function logout() { W.session = null; save(); }

  function createAccount(o) {
    var name = String(o.name || '').trim();
    if (name.length < 2) throw err('Enter a name');
    var id = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'user';
    while (acc(id)) id += '1';
    var a = mkAccount({ id: id, type: o.type === 'company' ? 'company' : 'person', name: name,
      bal: o.empty ? {} : (o.type === 'company' ? { EUR: 1500000, USD: 500000, USDC: 250000 } : { EUR: 1000000, USDC: 250000, XRP: 250000 }) });
    if (!o.empty) {
      addTx(a.id, { kind: 'topup', title: 'Welcome funds', sub: 'Demo · paper money', asset: 'EUR', amt: a.bal.EUR });
      notify(a.id, 'Welcome, ' + name, 'Your account is ready and funded with paper money.', '');
    }
    save(); return a;
  }

  /* ---------- money ---------- */
  function topup(id, s, x) {
    x = r(s, x); if (!(x > 0)) throw err('Enter an amount');
    credit(acc(id), s, x);
    addTx(id, { kind: 'topup', title: s + ' top up', sub: 'Demo funds', asset: s, amt: x });
    save();
  }
  function transfer(fromId, toId, s, x, note) {
    x = r(s, x); if (!(x > 0)) throw err('Enter an amount');
    var f = acc(fromId), t = acc(toId);
    if (!t || t.closed) throw err('This recipient is not available');
    debit(f, s, x); credit(t, s, x);
    addTx(fromId, { kind: 'out', title: 'To ' + t.name, sub: 'Internal transfer', asset: s, amt: -x, peer: toId, note: note });
    addTx(toId, { kind: 'in', title: 'From ' + f.name, sub: 'Internal transfer', asset: s, amt: x, peer: fromId, note: note });
    notify(toId, 'You received ' + fmt(s, x), 'From ' + f.name + (note ? ' · ' + note : ''), 'activity');
    save();
  }
  function extFee(mode, s) {
    if (mode === 'iban') return s === 'EUR' ? 0 : r(s, 5 * px('EUR') / px(s));
    return { XRP: 0.2, BTC: 0.00005, ETH: 0.0008, USDC: 1, USDT: 1 }[s] || 0;
  }
  function sendExternal(fromId, o) {
    var s = o.asset, x = r(s, o.amt), fee = extFee(o.mode, s), f = acc(fromId);
    if (!(x > 0)) throw err('Enter an amount');
    if (!String(o.name || '').trim() && o.mode === 'iban') throw err('Enter the recipient name');
    if (String(o.dest || '').trim().length < 6) throw err(o.mode === 'iban' ? 'Enter the IBAN or account number' : 'Enter the wallet address');
    debit(f, s, r(s, x + fee));
    addTx(fromId, { kind: 'out', title: 'To ' + (o.mode === 'iban' ? o.name : 'external wallet'), sub: o.mode === 'iban' ? (s === 'EUR' ? 'SEPA Instant' : 'SWIFT') : s + ' network', asset: s, amt: -x, note: o.note, meta: { dest: o.dest, fee: fee } });
    save();
    return { fee: fee };
  }
  function quote(from, to, x) {
    var rate = px(from) / px(to), gross = x * rate, fee = gross * MARGIN;
    return { rate: rate, gross: gross, fee: r(to, fee), out: r(to, gross - fee), margin: MARGIN };
  }
  function swap(id, from, to, x) {
    x = r(from, x); if (!(x > 0)) throw err('Enter an amount');
    if (from === to) throw err('Choose two different currencies');
    var a = acc(id), q = quote(from, to, x);
    debit(a, from, x); credit(a, to, q.out);
    addTx(id, { kind: 'swap', title: from + ' to ' + to, sub: 'Swap', asset: to, amt: q.out, meta: { from: from, x: x, rate: q.rate, fee: q.fee } });
    save(); return q;
  }

  /* ---------- Shield loan ---------- */
  function loansOf(id) { return W.loans.filter(function (l) { return l.acc === id; }); }
  function loan(id) { return W.loans.filter(function (l) { return l.id === id; })[0]; }
  function logLoan(L, text) { L.log.unshift({ ts: now(), text: text }); }

  function loanQuote(q) {
    var P = px('XRP'), cfg = SHIELD.ltv[q.ltv] || SHIELD.ltv[40], qty = Math.max(0, +q.qty || 0);
    var coll = qty * P, principal = Math.floor(coll * q.ltv / 100);
    var collar = q.plan === 'collar', fee = collar ? 0 : cfg.fee;
    return {
      price: P, qty: qty, coll: coll, principal: principal, rate: SHIELD.interest, fee: fee,
      cap: collar ? cfg.cap : null, capPrice: collar ? P * (1 + cfg.cap) : null,
      strike: qty ? principal / (SHIELD.trigger * qty) : 0, liq: qty ? principal / (SHIELD.typical * qty) : 0,
      monthly: principal * (SHIELD.interest + fee) / 12, total: principal * (SHIELD.interest + fee) * q.term / 12
    };
  }
  /* What happens to a loan if XRP goes to price P: typical loan vs Shield loan. Pure, changes nothing. */
  function crashTest(L, P) {
    var pay = (P < L.strike && L.principal > 0) ? Math.min(L.principal, L.qty * (L.strike - P)) : 0;
    var left = L.principal - pay, capped = L.capPrice && P > L.capPrice;
    return {
      price: P, typicalLiquidated: P <= L.liq, payout: pay, principal: left,
      ltv: L.qty * P > 0 ? left / (L.qty * P) : 0, value: L.qty * P,
      capped: !!capped, keepValue: capped ? L.qty * L.capPrice : L.qty * P
    };
  }
  function openLoan(id, q) {
    var a = acc(id), Q = loanQuote(q);
    if (!(Q.qty > 0)) throw err('Choose how much XRP to pledge');
    if (Q.qty > (a.bal.XRP || 0) + 1e-9) throw err('Not enough XRP. Available: ' + fmt('XRP', a.bal.XRP || 0));
    if (Q.principal < SHIELD.minLoan) throw err('The minimum loan is ' + fmt('USDC', SHIELD.minLoan));
    debit(a, 'XRP', Q.qty); a.pledged.XRP = r('XRP', (a.pledged.XRP || 0) + Q.qty); credit(a, 'USDC', Q.principal);
    var L = { id: uid('L'), acc: id, asset: 'XRP', qty: Q.qty, entry: Q.price, ltv0: q.ltv, plan: q.plan, term: q.term, rate: Q.rate, fee: Q.fee,
      cap: Q.cap, capPrice: Q.capPrice, principal0: Q.principal, principal: Q.principal, strike: Q.strike, liq: Q.liq, minPrice: Q.price,
      start: now(), months: 0, paidProtection: 0, paidCost: 0, status: 'active', due: false, typicalLiquidated: false, log: [] };
    logLoan(L, 'Loan opened: ' + fmt('USDC', Q.principal) + ' against ' + fmt('XRP', Q.qty));
    W.loans.unshift(L);
    addTx(id, { kind: 'loan', title: 'Shield loan received', sub: fmt('XRP', Q.qty) + ' pledged', asset: 'USDC', amt: Q.principal, meta: { loan: L.id } });
    notify(id, 'Shield loan active', fmt('USDC', Q.principal) + ' is in your account. Your XRP is protected.', 'loan:' + L.id);
    save(); return L;
  }
  function closeLoan(L, reason) {
    var a = acc(L.acc), P = px('XRP');
    var giveUp = (L.capPrice && P > L.capPrice) ? L.qty * (P - L.capPrice) / P : 0;
    var back = r('XRP', L.qty - giveUp);
    a.pledged.XRP = r('XRP', Math.max(0, (a.pledged.XRP || 0) - L.qty)); credit(a, 'XRP', back);
    L.status = 'closed'; L.returned = back; L.giveUp = r('XRP', giveUp); L.closed = now(); L.principal = 0;
    logLoan(L, reason + '. ' + fmt('XRP', back) + ' released to your account' + (giveUp > 0 ? ' (cap applied: ' + fmt('XRP', giveUp) + ' kept by the lender)' : ''));
    addTx(L.acc, { kind: 'loan', title: 'Collateral released', sub: 'Shield loan closed', asset: 'XRP', amt: back, meta: { loan: L.id } });
    notify(L.acc, 'Your XRP is back', fmt('XRP', back) + ' released from the Shield loan.', 'loan:' + L.id);
  }
  function settle(L, P) {
    if (L.status !== 'active') return 0;
    if (P < L.minPrice) L.minPrice = P;
    if (!L.typicalLiquidated && P <= L.liq) { L.typicalLiquidated = true; L.liqAt = P; }
    if (!(P < L.strike) || L.principal <= 0) return 0;
    var pay = r('USDC', Math.min(L.principal, L.qty * (L.strike - P)));
    L.principal = r('USDC', L.principal - pay); L.paidProtection = r('USDC', L.paidProtection + pay);
    L.strike = L.principal > 0 ? L.principal / (SHIELD.trigger * L.qty) : 0;
    logLoan(L, 'Protection paid ' + fmt('USDC', pay) + ' toward the loan (XRP at ' + fmtPx('XRP') + ')');
    addTx(L.acc, { kind: 'protect', title: 'Protection payout', sub: 'Paid toward your Shield loan', asset: 'USDC', amt: pay, meta: { loan: L.id, neutral: true } });
    notify(L.acc, 'Protection paid ' + fmt('USDC', pay), 'XRP fell to ' + fmtPx('XRP') + '. Your loan went down, your XRP stays.', 'loan:' + L.id);
    if (L.principal <= 0) closeLoan(L, 'Protection repaid the loan in full');
    return pay;
  }
  function repay(loanId, x) {
    var L = loan(loanId), a = acc(L.acc);
    x = r('USDC', Math.min(+x || 0, L.principal)); if (!(x > 0)) throw err('Enter an amount');
    debit(a, 'USDC', x);
    L.principal = r('USDC', L.principal - x);
    addTx(L.acc, { kind: 'loan', title: 'Loan repayment', sub: 'Shield loan', asset: 'USDC', amt: -x, meta: { loan: L.id } });
    if (L.principal <= 0) closeLoan(L, 'Loan repaid');
    else {
      L.strike = L.principal / (SHIELD.trigger * L.qty);
      if (!L.typicalLiquidated) L.liq = L.principal / (SHIELD.typical * L.qty);
      logLoan(L, 'Repaid ' + fmt('USDC', x) + '. Remaining: ' + fmt('USDC', L.principal));
    }
    save();
  }
  function extendLoan(loanId) { var L = loan(loanId); L.term += 12; L.due = false; logLoan(L, 'Term extended by 12 months'); save(); }

  function setPrice(s, P) {
    P = Math.max(0.0001, +P || 0); W.market[s] = P;
    var paid = 0;
    if (s === 'XRP') W.loans.forEach(function (L) { paid += settle(L, P); });
    save(); return paid;
  }
  function advanceMonth() {
    W.offset = (W.offset || 0) + 30 * DAY;
    var n = 0;
    W.loans.forEach(function (L) {
      if (L.status !== 'active') return;
      var a = acc(L.acc), cost = r('USDC', L.principal * (L.rate + L.fee) / 12);
      if ((a.bal.USDC || 0) >= cost) {
        debit(a, 'USDC', cost);
        addTx(L.acc, { kind: 'fee', title: L.fee ? 'Loan interest and protection' : 'Loan interest', sub: 'Shield loan · month ' + (L.months + 1), asset: 'USDC', amt: -cost, meta: { loan: L.id } });
      } else {
        L.principal = r('USDC', L.principal + cost); L.strike = L.principal / (SHIELD.trigger * L.qty);
        logLoan(L, 'Monthly cost ' + fmt('USDC', cost) + ' added to the loan (not enough USDC)');
      }
      L.paidCost = r('USDC', L.paidCost + cost); L.months += 1; n += 1;
      if (L.months >= L.term && !L.due) { L.due = true; notify(L.acc, 'Shield loan is due', 'Repay ' + fmt('USDC', L.principal) + ' or extend the term.', 'loan:' + L.id); }
    });
    save(); return n;
  }

  /* ---------- Inheritance ---------- */
  function plan(id) { return W.plans[id] || null; }
  function savePlan(id, d) {
    var heirs = (d.heirs || []).filter(function (h) { return String(h.name || '').trim(); });
    if (!heirs.length) throw err('Add at least one heir');
    var sum = heirs.reduce(function (s, h) { return s + (+h.share || 0); }, 0);
    if (Math.abs(sum - 100) > 0.01) throw err('Shares must add up to 100%. Now: ' + nf(sum, 0, 1) + '%');
    var old = W.plans[id], p = {
      status: 'active', version: old ? old.version + 1 : 1, notify: !!d.notify, note: String(d.note || '').slice(0, 400),
      heirs: heirs.map(function (h, i) { return { id: 'h' + (i + 1), name: String(h.name).trim(), relation: h.relation || 'Family', accId: h.accId || null, share: +h.share }; }),
      hash: '0x' + hex(40, hash(id + now())), updated: now(), log: old ? old.log : [], claim: null
    };
    p.log.unshift({ ts: now(), text: 'Version ' + p.version + ' recorded: ' + p.heirs.map(function (h) { return h.name + ' ' + nf(h.share, 0, 1) + '%'; }).join(', ') });
    W.plans[id] = p;
    if (p.notify) p.heirs.forEach(function (h) { if (h.accId && acc(h.accId)) notify(h.accId, acc(id).name + ' named you as an heir', 'You are part of an inheritance plan. Nothing passes while the owner is alive.', 'premium'); });
    notify(id, 'Inheritance plan active', 'Version ' + p.version + ' is recorded. You can change it any time.', 'inherit');
    save(); return p;
  }
  function removePlan(id) { delete W.plans[id]; save(); }
  function plansNaming(id) { return list().filter(function (a) { var p = W.plans[a.id]; return p && p.status === 'active' && p.heirs.some(function (h) { return h.accId === id; }); }); }
  /* Release an estate to the heirs. Loans are settled from the pledged collateral first. */
  function settleEstate(ownerId) {
    var o = acc(ownerId), p = W.plans[ownerId];
    if (!p || p.status !== 'active') throw err('No active plan');
    loansOf(ownerId).forEach(function (L) {
      if (L.status !== 'active') return;
      var P = px('XRP'), need = L.principal / P, back = r('XRP', Math.max(0, L.qty - need));
      o.pledged.XRP = r('XRP', Math.max(0, (o.pledged.XRP || 0) - L.qty)); credit(o, 'XRP', back);
      logLoan(L, 'Estate settlement: loan repaid from collateral, ' + fmt('XRP', back) + ' released'); L.status = 'closed'; L.principal = 0; L.closed = now();
    });
    W.cards.forEach(function (c) { if (c.acc === ownerId) c.frozen = true; });
    p.heirs.forEach(function (h) {
      if (!h.accId || !acc(h.accId) || acc(h.accId).closed) { var n = createAccount({ name: h.name, type: 'person', empty: true }); h.accId = n.id; h.opened = true; }
    });
    var out = [];
    ORDER.forEach(function (s) {
      var b = o.bal[s] || 0, left = b; if (!(b > 0)) return;
      p.heirs.forEach(function (h, i) {
        var part = i === p.heirs.length - 1 ? left : r(s, b * h.share / 100); left = r(s, left - part);
        if (!(part > 0)) return;
        credit(acc(h.accId), s, part);
        addTx(h.accId, { kind: 'inherit', title: 'Inheritance from ' + o.name, sub: 'Released by the inheritance plan', asset: s, amt: part, peer: ownerId });
        out.push({ heir: h.name, accId: h.accId, asset: s, amt: part });
      });
      addTx(ownerId, { kind: 'inherit', title: 'Released to heirs', sub: 'Inheritance plan v' + p.version, asset: s, amt: -b });
      o.bal[s] = 0;
    });
    p.heirs.forEach(function (h) { notify(h.accId, 'Inheritance received', 'Assets from ' + o.name + ' are now in your account.', 'activity'); });
    p.status = 'settled'; p.settled = now(); p.result = out; o.closed = true;
    p.log.unshift({ ts: now(), text: 'Claim verified. Assets released to ' + p.heirs.length + ' heir' + (p.heirs.length > 1 ? 's' : '') });
    save(); return out;
  }

  /* ---------- Cards ---------- */
  function cardsOf(id) { return W.cards.filter(function (c) { return c.acc === id; }); }
  function card(id) { return W.cards.filter(function (c) { return c.id === id; })[0]; }
  function issueCard(id, tier, design, name) {
    var T = TIERS[tier]; if (!T) throw err('Choose a card');
    var c = { id: uid('c'), acc: id, tier: tier, design: design || T.designs[0], name: String(name || acc(id).name).toUpperCase().slice(0, 22),
      last4: pad4(hash(id + tier + now())), exp: ('0' + (new Date(now()).getMonth() + 1)).slice(-2) + '/' + String(new Date(now()).getFullYear() + 4).slice(-2),
      frozen: false, limit: tier === 'standard' ? 10000 : tier === 'premium' ? 50000 : 250000, spent: 0, cashback: 0, created: now() };
    W.cards.unshift(c);
    notify(id, T.name + ' card issued', 'Card •• ' + c.last4 + ' is active and ready to use.', 'card:' + c.id);
    save(); return c;
  }
  function cardPay(cardId, merchant, amount) {
    var c = card(cardId), a = acc(c.acc), x = r('EUR', +amount || 0), T = TIERS[c.tier];
    if (!(x > 0)) throw err('Enter an amount');
    if (c.frozen) throw err('This card is frozen. Unfreeze it to pay.');
    if (c.spent + x > c.limit) throw err('Over the monthly limit of ' + fmt('EUR', c.limit));
    var paidFrom = 'EUR', src = null;
    if ((a.bal.EUR || 0) < x) {
      src = ['USDC', 'USDT', 'USD', 'GBP'].filter(function (s) { return eur(s, a.bal[s] || 0) * (1 - MARGIN) >= x; })[0];
      if (!src) throw err('Not enough funds for this purchase');
      var need = r(src, x * px('EUR') / px(src) / (1 - MARGIN));
      debit(a, src, need); paidFrom = src;
      addTx(c.acc, { kind: 'card', title: merchant, sub: T.name + ' card •• ' + c.last4 + ' · paid from ' + src, asset: src, amt: -need, meta: { card: c.id, eur: x } });
    } else {
      debit(a, 'EUR', x);
      addTx(c.acc, { kind: 'card', title: merchant, sub: T.name + ' card •• ' + c.last4, asset: 'EUR', amt: -x, meta: { card: c.id } });
    }
    c.spent = r('EUR', c.spent + x);
    var back = r('EUR', x * T.cashback);
    if (back > 0) { credit(a, 'EUR', back); c.cashback = r('EUR', c.cashback + back); addTx(c.acc, { kind: 'cashback', title: 'Cashback', sub: merchant, asset: 'EUR', amt: back, meta: { card: c.id } }); }
    notify(c.acc, 'Card payment ' + fmt('EUR', x), merchant + (back > 0 ? ' · cashback ' + fmt('EUR', back) : ''), 'card:' + c.id);
    save(); return { cashback: back, paidFrom: paidFrom };
  }
  function cardSet(cardId, k, v) { var c = card(cardId); c[k] = v; save(); }

  /* ---------- Business: get paid ---------- */
  function requestsOf(id) { return W.requests.filter(function (q) { return q.acc === id; }); }
  function request(id) { return W.requests.filter(function (q) { return q.id === id; })[0]; }
  function createRequest(id, o) {
    var x = r(o.asset, +o.amt || 0);
    if (!String(o.customer || '').trim()) throw err('Enter the customer name');
    if (!(x > 0)) throw err('Enter an amount');
    var q = { id: uid('r'), acc: id, customer: String(o.customer).trim(), asset: o.asset, amt: x, note: String(o.note || '').trim(), status: 'open', ts: now(), paid: 0, ref: ((acc(id).name.replace(/[^A-Za-z]/g, '').slice(0, 1) + (acc(id).name.split(/\s+/)[1] || acc(id).name.slice(1)).replace(/[^A-Za-z]/g, '').slice(0, 1)).toUpperCase() || 'PR') + '-' + (1040 + W.requests.length + 1) };
    W.requests.unshift(q); save(); return q;
  }
  function payRequest(reqId) {
    var q = request(reqId), a = acc(q.acc);
    if (q.status === 'paid') return q;
    var stable = ASSETS[q.asset].kind === 'stable', convert = stable && a.auto[q.asset];
    if (convert) {
      var qt = quote(q.asset, 'EUR', q.amt);
      credit(a, 'EUR', qt.out);
      addTx(q.acc, { kind: 'in', title: 'Payment from ' + q.customer, sub: 'Payment request · auto-converted', asset: 'EUR', amt: qt.out, meta: { checks: true, from: q.asset, x: q.amt, rate: qt.rate, fee: qt.fee, req: q.id } });
      q.landed = { asset: 'EUR', amt: qt.out };
    } else {
      credit(a, q.asset, q.amt);
      addTx(q.acc, { kind: 'in', title: 'Payment from ' + q.customer, sub: 'Payment request' + (stable ? ' · stablecoin' : ''), asset: q.asset, amt: q.amt, meta: { checks: true, req: q.id } });
      q.landed = { asset: q.asset, amt: q.amt };
    }
    q.status = 'paid'; q.paid = now();
    notify(q.acc, 'Paid: ' + fmt(q.asset, q.amt), q.customer + ' · ' + q.ref + (convert ? ' · converted to ' + fmt('EUR', q.landed.amt) : ''), 'request:' + q.id);
    save(); return q;
  }
  function setAuto(id, s, v) { acc(id).auto[s] = !!v; save(); }
  function csv(id) {
    var rows = [['Date', 'Type', 'Description', 'Details', 'Currency', 'Amount', 'Status', 'Reference']];
    txsOf(id).slice().reverse().forEach(function (t) {
      rows.push([new Date(t.ts).toISOString().slice(0, 16).replace('T', ' '), t.kind, t.title, t.sub, t.asset, t.amt.toFixed(ASSETS[t.asset].dec), t.status, t.id.toUpperCase()]);
    });
    return rows.map(function (rw) { return rw.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
  }

  G.DB = {
    ASSETS: ASSETS, ORDER: ORDER, BASE_MARKET: BASE_MARKET, MARGIN: MARGIN, SHIELD: SHIELD, TIERS: TIERS, MERCHANTS: MERCHANTS,
    get W() { return W; },
    load: load, save: save, reset: reset, login: login, logout: logout, now: now,
    acc: acc, me: me, list: list, others: others, initials: initials, createAccount: createAccount, address: address,
    px: px, usd: usd, eur: eur, r: r, fmt: fmt, fmtUSD: fmtUSD, fmtPx: fmtPx, nf: nf, short: short, when: when, dateOnly: dateOnly,
    totals: totals, txsOf: txsOf, notifsOf: notifsOf, unread: unread,
    topup: topup, transfer: transfer, sendExternal: sendExternal, extFee: extFee, quote: quote, swap: swap,
    loansOf: loansOf, loan: loan, loanQuote: loanQuote, crashTest: crashTest, openLoan: openLoan, repay: repay, extendLoan: extendLoan,
    setPrice: setPrice, advanceMonth: advanceMonth,
    plan: plan, savePlan: savePlan, removePlan: removePlan, plansNaming: plansNaming, settleEstate: settleEstate,
    cardsOf: cardsOf, card: card, issueCard: issueCard, cardPay: cardPay, cardSet: cardSet,
    requestsOf: requestsOf, request: request, createRequest: createRequest, payRequest: payRequest, setAuto: setAuto, csv: csv
  };
})(typeof window !== 'undefined' ? window : globalThis);
