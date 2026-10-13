/* Kontor demo ledger. All figures are fictional. */
(function (root) {
  'use strict';

  var TODAY = '2026-10-05';

  var CONTEXTS = [
    { id: 'privat', label: 'Privat' },
    { id: 'arbeit', label: 'Arbeit' },
    { id: 'selbst', label: 'Selbstständig' }
  ];

  var CATEGORIES = [
    { id: 'gehalt', label: 'Gehalt', income: true },
    { id: 'honorar', label: 'Honorar', income: true },
    { id: 'erstattung', label: 'Erstattung', income: true },
    { id: 'wohnen', label: 'Wohnen' },
    { id: 'lebensmittel', label: 'Lebensmittel' },
    { id: 'mobilitaet', label: 'Mobilität' },
    { id: 'abos', label: 'Abos' },
    { id: 'gastro', label: 'Gastronomie' },
    { id: 'gesundheit', label: 'Gesundheit' },
    { id: 'freizeit', label: 'Freizeit' },
    { id: 'buero', label: 'Büro' },
    { id: 'versicherung', label: 'Versicherung' },
    { id: 'telekom', label: 'Telekommunikation' },
    { id: 'shopping', label: 'Shopping' }
  ];

  var ACCOUNTS = {
    giro: { id: 'giro', label: 'Girokonto', bank: 'Commerzbank', mask: 'DE89 ···· 4567' },
    visa: { id: 'visa', label: 'Visa', bank: 'DKB Visa', mask: '···· 4412' },
    business: { id: 'business', label: 'Geschäftskonto', bank: 'N26 Business', mask: 'DE45 ···· 6789' },
    tagesgeld: { id: 'tagesgeld', label: 'Tagesgeld', bank: 'DKB', mask: 'DE12 ···· 5432' }
  };

  var BUDGETS = { privat: 240000, arbeit: 40000, selbst: 80000 };

  var CONTRACTS = [
    { id: 'miete', name: 'Miete', merchant: 'Hausverwaltung Bergmann', amount: -129000, interval: 'month', billDay: 3, category: 'wohnen', context: 'privat', account: 'giro' },
    { id: 'vattenfall', name: 'Vattenfall Strom', merchant: 'Vattenfall', amount: -8600, interval: 'month', billDay: 1, category: 'wohnen', context: 'privat', account: 'giro' },
    { id: 'rundfunk', name: 'Rundfunkbeitrag', merchant: 'Rundfunkbeitrag', amount: -1836, interval: 'month', billDay: 1, category: 'abos', context: 'privat', account: 'giro' },
    { id: 'sports', name: 'Urban Sports Club', merchant: 'Urban Sports Club', amount: -4900, interval: 'month', billDay: 1, category: 'freizeit', context: 'privat', account: 'giro', cancelBy: '2026-10-15' },
    { id: 'spotify', name: 'Spotify', merchant: 'Spotify', amount: -1099, interval: 'month', billDay: 12, category: 'abos', context: 'privat', account: 'visa', priceIncrease: { to: -1299, date: '2026-11-12' } },
    { id: 'netflix', name: 'Netflix', merchant: 'Netflix', amount: -1799, interval: 'month', billDay: 18, category: 'abos', context: 'privat', account: 'visa' },
    { id: 'icloud', name: 'iCloud+', merchant: 'Apple', amount: -299, interval: 'month', billDay: 21, category: 'abos', context: 'privat', account: 'visa' },
    { id: 'telekom', name: 'Telekom Mobil', merchant: 'Telekom', amount: -5495, interval: 'month', billDay: 8, category: 'telekom', context: 'privat', account: 'giro' },
    { id: 'vodafone', name: 'Vodafone Internet', merchant: 'Vodafone', amount: -4499, interval: 'month', billDay: 28, category: 'telekom', context: 'privat', account: 'giro' },
    { id: 'allianz', name: 'Allianz Haftpflicht', merchant: 'Allianz Direct', amount: -6240, interval: 'year', billMonth: 3, billDay: 1, category: 'versicherung', context: 'privat', account: 'giro' },
    { id: 'adobe', name: 'Adobe Creative Cloud', merchant: 'Adobe', amount: -2379, interval: 'month', billDay: 4, category: 'abos', context: 'selbst', account: 'business', priceIncrease: { to: -2699, date: '2027-01-04' } },
    { id: 'hetzner', name: 'Hetzner Cloud', merchant: 'Hetzner', amount: -1450, interval: 'month', billDay: 1, category: 'buero', context: 'selbst', account: 'business' },
    { id: 'raum', name: 'Raumstation', merchant: 'Raumstation', amount: -22000, interval: 'month', billDay: 1, category: 'buero', context: 'selbst', account: 'business', cancelBy: '2026-10-31' },
    { id: 'jobticket', name: 'DB Jobticket', merchant: 'DB Jobticket', amount: -4900, interval: 'month', billDay: 1, category: 'mobilitaet', context: 'arbeit', account: 'giro' },
    { id: 'linkedin', name: 'LinkedIn Premium', merchant: 'LinkedIn', amount: -3999, interval: 'month', billDay: 22, category: 'buero', context: 'arbeit', account: 'visa' }
  ];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function addMonths(y, m, delta) {
    var i = y * 12 + (m - 1) + delta;
    return { y: Math.floor(i / 12), m: (i % 12) + 1 };
  }
  function billInMonth(c, m) {
    if (c.interval === 'month') return true;
    if (c.interval === 'year') return m === c.billMonth;
    return false;
  }
  function amountFor(c, y) {
    if (c.id === 'miete' && y < 2026) return -124000;
    return c.amount;
  }
  function nextBillDate(c, today) {
    var ty = +today.slice(0, 4);
    var tm = +today.slice(5, 7);
    var i, dt, day, date;
    for (i = 0; i < 36; i++) {
      dt = addMonths(ty, tm, i);
      if (!billInMonth(c, dt.m)) continue;
      day = Math.min(c.billDay, daysInMonth(dt.y, dt.m));
      date = iso(dt.y, dt.m, day);
      if (date > today) return date;
    }
    return null;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var UBER_COUNT = {
    '2025-01': 4, '2025-02': 5, '2025-03': 6, '2025-04': 4, '2025-05': 5, '2025-06': 7,
    '2025-07': 3, '2025-08': 4, '2025-09': 9, '2025-10': 6, '2025-11': 5, '2025-12': 8,
    '2026-01': 5, '2026-02': 6, '2026-03': 14, '2026-04': 5, '2026-05': 6, '2026-06': 8,
    '2026-07': 4, '2026-08': 5, '2026-09': 7, '2026-10': 2
  };
  var CTX_CYCLE = ['arbeit', 'arbeit', 'privat', 'selbst', 'arbeit', 'privat', 'arbeit', 'privat'];
  var GROCERS = [
    ['REWE', 'giro'],
    ['Edeka', 'giro'],
    ['Aldi Süd', 'giro'],
    ['Lidl', 'visa'],
    ['Bio Company', 'visa']
  ];
  var CAFES = ['Five Elephant', 'Markthalle Neun', 'Distrikt Coffee', 'Sophieneck'];

  var FREELANCE = [
    ['2025-03-12', 240000, 'Studio Kiehl', 'Projektwebsite, Rate 2'],
    ['2025-06-20', 98000, 'Atelier Brack', ''],
    ['2025-09-08', 156000, 'Verlag Morgen', 'Lektorat Sonderheft'],
    ['2025-11-18', 64000, 'Atelier Brack', ''],
    ['2026-02-11', 120000, 'Atelier Brack', ''],
    ['2026-03-19', 275000, 'Studio Kiehl', 'Markenauftritt, Schlussrate'],
    ['2026-06-09', 89000, 'Verlag Morgen', ''],
    ['2026-09-16', 145000, 'Atelier Brack', ''],
    ['2026-10-02', 168000, 'Atelier Brack', 'Workshop-Rechnung 2026-014']
  ];

  var REFUNDS = [
    ['2025-04-07', 3680],
    ['2025-08-14', 5120],
    ['2026-01-22', 2940],
    ['2026-05-11', 6100],
    ['2026-10-03', 4280]
  ];

  var EXTRAS = [
    ['2025-07-16', -86000, 'Ferienwohnung Rügen', 'freizeit', 'privat', 'visa', ''],
    ['2025-07-18', -12400, 'Deutsche Bahn', 'mobilitaet', 'privat', 'giro', 'Hin- und Rückfahrt'],
    ['2026-07-08', -92000, 'Ferienwohnung Sylt', 'freizeit', 'privat', 'visa', 'Woche 28'],
    ['2026-07-09', -15600, 'Deutsche Bahn', 'mobilitaet', 'privat', 'giro', ''],
    ['2025-12-06', -4800, 'Manufactum', 'shopping', 'privat', 'visa', ''],
    ['2025-12-12', -21000, 'Manufactum', 'shopping', 'privat', 'visa', 'Geschenke'],
    ['2025-12-19', -16400, 'KaDeWe', 'shopping', 'privat', 'visa', ''],
    ['2026-04-23', -8900, 'Manufactum', 'shopping', 'privat', 'visa', ''],
    ['2026-08-27', -4200, 'Flink', 'lebensmittel', 'privat', 'visa', '']
  ];

  function buildTransactions() {
    var rng = mulberry32(0xC0FFEE);
    var txns = [];
    var n = 1;
    function add(row) {
      txns.push({
        id: 't' + (n++),
        note: row.note || '',
        tags: row.tags || [],
        parts: null,
        merchant: row.merchant,
        date: row.date,
        amount: row.amount,
        category: row.category,
        context: row.context,
        account: row.account
      });
    }

    var y, m, lastDay, key, gi, g, day, cents, cafe, ui, uctx, ride;
    for (y = 2025; y <= 2026; y++) {
      for (m = 1; m <= 12; m++) {
        if (y === 2026 && m > 10) break;
        lastDay = (y === 2026 && m === 10) ? 5 : daysInMonth(y, m);
        key = y + '-' + pad(m);

        if (1 <= lastDay) {
          add({
            merchant: 'Nordlicht GmbH',
            date: iso(y, m, 1),
            amount: y < 2026 ? 452000 : 485000,
            category: 'gehalt',
            context: 'arbeit',
            account: 'giro',
            note: 'Nettogehalt'
          });
        }
        if (y === 2025 && m === 12) {
          add({
            merchant: 'Nordlicht GmbH',
            date: '2025-12-15',
            amount: 120000,
            category: 'gehalt',
            context: 'arbeit',
            account: 'giro',
            note: 'Weihnachtsgeld'
          });
        }

        CONTRACTS.forEach(function (c) {
          if (!billInMonth(c, m)) return;
          if (c.billDay > lastDay) return;
          add({
            merchant: c.merchant,
            date: iso(y, m, c.billDay),
            amount: amountFor(c, y),
            category: c.category,
            context: c.context,
            account: c.account
          });
        });

        var gCount = lastDay >= 28 ? 9 : 4;
        for (gi = 0; gi < gCount; gi++) {
          g = GROCERS[gi % GROCERS.length];
          day = 1 + ((gi * 4 + Math.floor(rng() * lastDay)) % lastDay);
          cents = -(1400 + Math.floor(rng() * 6200));
          if (rng() > 0.82) cents -= 2800;
          add({
            merchant: g[0],
            date: iso(y, m, day),
            amount: cents,
            category: 'lebensmittel',
            context: 'privat',
            account: g[1]
          });
        }

        var cCount = lastDay >= 28 ? 4 : 1;
        for (gi = 0; gi < cCount; gi++) {
          cafe = CAFES[(m + gi) % CAFES.length];
          day = 1 + ((gi * 5 + 2 + Math.floor(rng() * lastDay)) % lastDay);
          add({
            merchant: cafe,
            date: iso(y, m, day),
            amount: -(390 + Math.floor(rng() * 2800)),
            category: 'gastro',
            context: rng() > 0.78 ? 'arbeit' : 'privat',
            account: 'visa'
          });
        }

        if (lastDay >= 28 || m === 10) {
          day = 1 + (m % lastDay);
          add({
            merchant: m % 2 ? 'dm' : 'Rossmann',
            date: iso(y, m, Math.min(day, lastDay)),
            amount: -(690 + Math.floor(rng() * 1800)),
            category: 'shopping',
            context: 'privat',
            account: 'giro'
          });
        }

        if (m % 2 === 0 && lastDay >= 10) {
          add({
            merchant: 'Apotheke Boxhagener Platz',
            date: iso(y, m, Math.min(11, lastDay)),
            amount: -(840 + Math.floor(rng() * 2200)),
            category: 'gesundheit',
            context: 'privat',
            account: 'giro'
          });
        }

        if (m % 3 === 0 && lastDay >= 8) {
          add({
            merchant: 'Aral',
            date: iso(y, m, Math.min(20, lastDay)),
            amount: -(6400 + Math.floor(rng() * 2800)),
            category: 'mobilitaet',
            context: 'privat',
            account: 'visa'
          });
        }

        if (lastDay >= 28) {
          add({
            merchant: 'BVG',
            date: iso(y, m, Math.min(6 + (m % 5), lastDay)),
            amount: -350,
            category: 'mobilitaet',
            context: 'privat',
            account: 'giro'
          });
          if (m % 2 === 1) {
            add({
              merchant: 'BVG',
              date: iso(y, m, Math.min(17, lastDay)),
              amount: -350,
              category: 'mobilitaet',
              context: 'privat',
              account: 'giro'
            });
          }
        }

        if (m % 2 === 1 && lastDay >= 14) {
          add({
            merchant: 'Amazon',
            date: iso(y, m, Math.min(14, lastDay)),
            amount: -(1290 + Math.floor(rng() * 5400)),
            category: 'shopping',
            context: 'privat',
            account: 'visa'
          });
        }

        ride = UBER_COUNT[key] || 0;
        for (ui = 0; ui < ride; ui++) {
          day = 1 + ((ui * 3 + Math.floor(rng() * lastDay)) % lastDay);
          uctx = CTX_CYCLE[ui % CTX_CYCLE.length];
          cents = (y === 2026 && m === 3)
            ? -(1680 + Math.floor(rng() * 3200))
            : -(890 + Math.floor(rng() * 2300));
          add({
            merchant: 'Uber',
            date: iso(y, m, day),
            amount: cents,
            category: 'mobilitaet',
            context: uctx,
            account: uctx === 'selbst' ? 'business' : 'visa',
            tags: uctx === 'arbeit' ? ['dienstlich'] : []
          });
        }
      }
    }

    FREELANCE.forEach(function (row) {
      add({
        merchant: row[2],
        date: row[0],
        amount: row[1],
        category: 'honorar',
        context: 'selbst',
        account: 'business',
        note: row[3]
      });
    });
    REFUNDS.forEach(function (row) {
      add({
        merchant: 'TK Techniker',
        date: row[0],
        amount: row[1],
        category: 'erstattung',
        context: 'privat',
        account: 'giro',
        note: 'Kostenerstattung'
      });
    });
    EXTRAS.forEach(function (row) {
      add({
        merchant: row[2],
        date: row[0],
        amount: row[1],
        category: row[3],
        context: row[4],
        account: row[5],
        note: row[6],
        tags: row[6] === 'Geschenke' ? ['geschenk'] : []
      });
    });

    add({
      merchant: 'DKB',
      date: '2026-03-31',
      amount: 1840,
      category: 'erstattung',
      context: 'privat',
      account: 'tagesgeld',
      note: 'Zinsen Tagesgeld, 1. Quartal'
    });
    add({
      merchant: 'DKB',
      date: '2026-06-30',
      amount: 1760,
      category: 'erstattung',
      context: 'privat',
      account: 'tagesgeld',
      note: 'Zinsen Tagesgeld, 2. Quartal'
    });
    add({
      merchant: 'DKB',
      date: '2025-12-31',
      amount: 1420,
      category: 'erstattung',
      context: 'privat',
      account: 'tagesgeld',
      note: 'Zinsen Tagesgeld'
    });

    return txns;
  }

  function buildInbox() {
    return [
      { id: 'in1', merchant: 'REWE City Friedrichshain', date: '2026-10-04', amount: -1842, category: 'lebensmittel', context: 'privat', account: 'giro', confidence: 0.98 },
      { id: 'in2', merchant: 'Uber', date: '2026-10-04', amount: -1480, category: 'mobilitaet', context: 'arbeit', account: 'visa', confidence: 0.71 },
      { id: 'in3', merchant: 'Five Elephant', date: '2026-10-04', amount: -650, category: 'gastro', context: 'privat', account: 'visa', confidence: 0.94 },
      { id: 'in4', merchant: 'Figma', date: '2026-10-04', amount: -1500, category: 'buero', context: 'selbst', account: 'business', confidence: 0.92 },
      { id: 'in5', merchant: 'Amazon', date: '2026-10-03', amount: -4299, category: 'shopping', context: 'privat', account: 'visa', confidence: 0.48 },
      { id: 'in6', merchant: 'dm', date: '2026-10-03', amount: -1625, category: 'shopping', context: 'privat', account: 'giro', confidence: 0.95 },
      { id: 'in7', merchant: 'Deutsche Bahn', date: '2026-10-03', amount: -4990, category: 'mobilitaet', context: 'arbeit', account: 'giro', confidence: 0.66 },
      { id: 'in8', merchant: 'Notion', date: '2026-10-03', amount: -1200, category: 'buero', context: 'selbst', account: 'business', confidence: 0.91 },
      { id: 'in9', merchant: 'Aral', date: '2026-10-02', amount: -7120, category: 'mobilitaet', context: 'privat', account: 'visa', confidence: 0.62 },
      { id: 'in10', merchant: 'Apotheke Boxhagener Platz', date: '2026-10-02', amount: -1284, category: 'gesundheit', context: 'privat', account: 'giro', confidence: 0.9 },
      { id: 'in11', merchant: 'Lieferando', date: '2026-10-02', amount: -2840, category: 'gastro', context: 'privat', account: 'visa', confidence: 0.88 },
      { id: 'in12', merchant: 'Raumstation', date: '2026-10-02', amount: -950, category: 'buero', context: 'selbst', account: 'business', confidence: 0.7 },
      { id: 'in13', merchant: 'IKEA', date: '2026-10-01', amount: -18900, category: 'wohnen', context: 'privat', account: 'visa', confidence: 0.44 },
      { id: 'in14', merchant: 'Uber', date: '2026-10-01', amount: -2310, category: 'mobilitaet', context: 'selbst', account: 'business', confidence: 0.68 },
      { id: 'in15', merchant: 'Edeka', date: '2026-10-01', amount: -5418, category: 'lebensmittel', context: 'privat', account: 'giro', confidence: 0.97 },
      { id: 'in16', merchant: 'Steam', date: '2026-10-05', amount: -2999, category: 'freizeit', context: 'privat', account: 'visa', confidence: 0.57 },
      { id: 'in17', merchant: 'Klein & Partner', date: '2026-10-05', amount: -32000, category: 'buero', context: 'selbst', account: 'business', confidence: 0.41 }
    ].map(function (row) {
      row.auto = row.confidence >= 0.9;
      row.note = '';
      row.tags = [];
      row.parts = null;
      return row;
    });
  }

  CONTRACTS.forEach(function (c) {
    c.nextDate = nextBillDate(c, TODAY);
  });

  function leavesOf(tx) {
    if (!tx.parts || !tx.parts.length) {
      return [{
        tx: tx,
        amount: tx.amount,
        category: tx.category,
        context: tx.context,
        date: tx.date,
        merchant: tx.merchant,
        account: tx.account
      }];
    }
    return tx.parts.map(function (p) {
      return {
        tx: tx,
        amount: p.amount,
        category: p.category,
        context: p.context,
        date: tx.date,
        merchant: tx.merchant,
        account: tx.account
      };
    });
  }

  function selectRows(txns, opt) {
    opt = opt || {};
    var q = (opt.q || '').trim().toLowerCase();
    var rows = [];
    txns.forEach(function (tx) {
      if (opt.account && tx.account !== opt.account) return;
      if (q && tx.merchant.toLowerCase().indexOf(q) === -1) return;
      var leaves = leavesOf(tx).filter(function (leaf) {
        if (opt.from && leaf.date < opt.from) return false;
        if (opt.to && leaf.date > opt.to) return false;
        if (opt.context && opt.context !== 'alle' && leaf.context !== opt.context) return false;
        if (opt.kind === 'income' && leaf.amount <= 0) return false;
        if (opt.kind === 'expense' && leaf.amount >= 0) return false;
        if (opt.categories && opt.categories.length && opt.categories.indexOf(leaf.category) === -1) return false;
        return true;
      });
      if (!leaves.length) return;
      var amount = 0;
      var cats = [];
      var ctxs = [];
      leaves.forEach(function (leaf) {
        amount += leaf.amount;
        if (cats.indexOf(leaf.category) === -1) cats.push(leaf.category);
        if (ctxs.indexOf(leaf.context) === -1) ctxs.push(leaf.context);
      });
      rows.push({ tx: tx, amount: amount, leaves: leaves, categories: cats, contexts: ctxs });
    });
    return rows;
  }

  function summarize(rows) {
    var income = 0;
    var expense = 0;
    var byCategory = {};
    var byMerchant = {};
    var byMonth = {};
    var byContext = {};
    rows.forEach(function (row) {
      row.leaves.forEach(function (leaf) {
        if (leaf.amount >= 0) income += leaf.amount;
        else expense += leaf.amount;
        if (leaf.amount < 0) {
          byCategory[leaf.category] = (byCategory[leaf.category] || 0) + leaf.amount;
        }
        if (!byMerchant[leaf.merchant]) byMerchant[leaf.merchant] = { amount: 0, count: 0 };
        byMerchant[leaf.merchant].amount += leaf.amount;
        byMerchant[leaf.merchant].count += 1;
        var mk = leaf.date.slice(0, 7);
        if (!byMonth[mk]) byMonth[mk] = { income: 0, expense: 0 };
        if (leaf.amount >= 0) byMonth[mk].income += leaf.amount;
        else byMonth[mk].expense += leaf.amount;
        if (!byContext[leaf.context]) byContext[leaf.context] = { amount: 0, count: 0 };
        byContext[leaf.context].amount += leaf.amount;
        byContext[leaf.context].count += 1;
      });
    });
    return {
      income: income,
      expense: expense,
      net: income + expense,
      byCategory: byCategory,
      byMerchant: byMerchant,
      byMonth: byMonth,
      byContext: byContext,
      count: rows.length
    };
  }

  function monthKeysEnding(endIso, count) {
    var y = +endIso.slice(0, 4);
    var m = +endIso.slice(5, 7);
    var out = [];
    var i, dt;
    for (i = count - 1; i >= 0; i--) {
      dt = addMonths(y, m, -i);
      out.push(dt.y + '-' + pad(dt.m));
    }
    return out;
  }

  function budgetFor(range, context) {
    var monthly = context === 'alle'
      ? BUDGETS.privat + BUDGETS.arbeit + BUDGETS.selbst
      : BUDGETS[context];
    var parts = monthsTouched(range.from, range.to);
    if (parts.length === 1) return monthly;
    var total = 0;
    parts.forEach(function (p) {
      total += monthly * (p.days / p.dim);
    });
    return Math.round(total);
  }

  function monthsTouched(from, to) {
    var y = +from.slice(0, 4);
    var m = +from.slice(5, 7);
    var endKey = to.slice(0, 7);
    var parts = [];
    var guard = 0;
    while (guard++ < 36) {
      var key = y + '-' + pad(m);
      var dim = daysInMonth(y, m);
      var start = key === from.slice(0, 7) ? +from.slice(8, 10) : 1;
      var end = key === to.slice(0, 7) ? +to.slice(8, 10) : dim;
      parts.push({ key: key, days: Math.max(0, end - start + 1), dim: dim });
      if (key === endKey) break;
      var dt = addMonths(y, m, 1);
      y = dt.y;
      m = dt.m;
    }
    return parts;
  }

  function yearlyEquivalent(c) {
    if (c.interval === 'year') return c.amount;
    if (c.interval === 'quarter') return c.amount * 4;
    return c.amount * 12;
  }

  root.KONTOR = {
    TODAY: TODAY,
    CONTEXTS: CONTEXTS,
    CATEGORIES: CATEGORIES,
    ACCOUNTS: ACCOUNTS,
    BUDGETS: BUDGETS,
    CONTRACTS: CONTRACTS,
    transactions: buildTransactions(),
    inbox: buildInbox(),
    reviewed: { privat: 15, arbeit: 5, selbst: 3 },
    checkingBalance: 612480,
    expected: [
      {
        id: 'exp-gehalt',
        merchant: 'Nordlicht GmbH',
        detail: 'Gehalt (erwartet)',
        date: '2026-11-01',
        amount: 485000,
        context: 'arbeit',
        category: 'gehalt',
        account: 'giro'
      }
    ],
    FORECAST_UNTIL: '2026-11-01',
    leavesOf: leavesOf,
    selectRows: selectRows,
    summarize: summarize,
    monthKeysEnding: monthKeysEnding,
    budgetFor: budgetFor,
    monthsTouched: monthsTouched,
    yearlyEquivalent: yearlyEquivalent,
    daysInMonth: daysInMonth,
    cat: function (id) {
      for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
      return { id: id, label: id };
    },
    ctx: function (id) {
      for (var i = 0; i < CONTEXTS.length; i++) if (CONTEXTS[i].id === id) return CONTEXTS[i];
      return { id: id, label: id };
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
