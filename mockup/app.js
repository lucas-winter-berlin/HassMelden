/* Kontor — interactive demo. No network, no backend. */
(function () {
  'use strict';

  var K = globalThis.KONTOR;
  var moneyFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  var pctFmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var intFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  var euroFmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var dateFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  var dayFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  var monthLongFmt = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  var monthShortFmt = new Intl.DateTimeFormat('de-DE', { month: 'short', timeZone: 'UTC' });

  var PRESETS = [
    { id: 'month', label: 'Dieser Monat', from: '2026-10-01', to: '2026-10-05' },
    { id: 'd30', label: 'Letzte 30 Tage', from: '2026-09-06', to: '2026-10-05' },
    { id: 'ytd', label: 'Dieses Jahr', from: '2026-01-01', to: '2026-10-05' },
    { id: 'y2025', label: 'Jahr 2025', from: '2025-01-01', to: '2025-12-31' }
  ];

  var NAV = [
    ['uebersicht', 'Übersicht', 'home'],
    ['inbox', 'Smart Inbox', 'inbox'],
    ['buchungen', 'Buchungen', 'list'],
    ['haendler', 'Händler-Suche', 'search'],
    ['fixkosten', 'Fixkosten & Abos', 'repeat'],
    ['analyse', 'Analyse', 'chart'],
    ['import', 'Import', 'upload'],
    ['einstellungen', 'Einstellungen', 'settings']
  ];

  var COLORS = {
    wohnen: '#c4a36a',
    lebensmittel: '#7d9a62',
    mobilitaet: '#6d8eae',
    abos: '#a58498',
    gastro: '#c4846a',
    gesundheit: '#5e9e96',
    freizeit: '#8a7eae',
    buero: '#b08968',
    versicherung: '#7d9188',
    telekom: '#6a90a4',
    shopping: '#b07d86',
    gehalt: '#7d9a62',
    honorar: '#6d8eae',
    erstattung: '#5e9e96'
  };

  var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

  var state = {
    theme: 'dark',
    privacy: false,
    context: 'alle',
    range: { id: 'month', from: '2026-10-01', to: '2026-10-05', label: 'Dieser Monat' },
    screen: 'uebersicht',
    inbox: K.inbox,
    txns: K.transactions,
    reviewed: { privat: K.reviewed.privat, arbeit: K.reviewed.arbeit, selbst: K.reviewed.selbst },
    merchantQuery: 'Uber',
    buchungen: { kind: 'alle', categories: [], account: '', q: '', sort: 'date', dir: 'desc', selected: {} },
    panelId: null,
    splitDraft: null,
    editingInbox: null,
    paletteOpen: false,
    paletteQ: '',
    paletteIndex: 0,
    paletteReturn: null,
    ruleOpen: false,
    menu: null,
    rangeOpen: false,
    rangeBuilt: false,
    sidebarOpen: false,
    suppressHash: false,
    importBusy: false,
    importStaged: { file: 'n26-umsatz-oktober.csv', neu: 142, dup: 8, unklar: 12 },
    importHistory: [
      { id: 'h1', at: '2026-10-05T07:41:00', source: 'Commerzbank_2026-10.csv', neu: 86, dup: 3, unklar: 2 },
      { id: 'h2', at: '2026-09-28T19:02:00', source: 'DKB_CAMT_September.xml', neu: 140, dup: 11, unklar: 4 },
      { id: 'h3', at: '2026-09-02T08:16:00', source: 'Visa_August.pdf', neu: 64, dup: 0, unklar: 6 }
    ],
    importMinute: 24,
    rules: [],
    calDay: '2026-10-12',
    importTimer: 0
  };

  try {
    var storedTheme = sessionStorage.getItem('kontor-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') state.theme = storedTheme;
    state.privacy = sessionStorage.getItem('kontor-privacy') === '1';
  } catch (err) { /* private mode */ }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function parseISO(s) {
    return new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
  }
  function formatDate(s) { return dateFmt.format(parseISO(s)); }
  function formatDay(s) { return dayFmt.format(parseISO(s)); }
  function formatMonth(key) { return monthLongFmt.format(parseISO(key + '-01')); }
  function shortMonth(key) { return monthShortFmt.format(parseISO(key + '-01')).replace('.', ''); }
  function prettyRange(from, to) {
    if (from.slice(0, 4) === to.slice(0, 4)) return formatDay(from) + ' – ' + formatDate(to);
    return formatDate(from) + ' – ' + formatDate(to);
  }
  function formatStamp(iso) {
    return formatDate(iso.slice(0, 10)) + ', ' + iso.slice(11, 16);
  }
  function moneyText(cents) { return moneyFmt.format(cents / 100); }
  function moneyHTML(cents, tone) {
    var text = moneyFmt.format(cents / 100);
    var cls = 'm';
    if (tone && cents > 0) cls += ' pos';
    if (tone && cents < 0) cls += ' neg';
    return '<span class="' + cls + '">' + esc(text) + '</span>';
  }
  function plusMoney(cents) {
    var text = moneyFmt.format(cents / 100);
    if (cents > 0) text = '+' + text;
    var cls = 'm' + (cents > 0 ? ' pos' : cents < 0 ? ' neg' : '');
    return '<span class="' + cls + '">' + esc(text) + '</span>';
  }
  function euroInput(cents) { return euroFmt.format(cents / 100); }
  function parseEuro(str) {
    if (str == null) return null;
    var t = String(str).trim().replace(/\s/g, '').replace('€', '').replace(/\./g, '').replace(',', '.');
    if (!t || t === '-' || t === '+') return null;
    var n = Number(t);
    if (!isFinite(n)) return null;
    return Math.round(n * 100);
  }
  function contextLabel() {
    return state.context === 'alle' ? 'Alle' : K.ctx(state.context).label;
  }
  function isScreen(id) {
    return NAV.some(function (n) { return n[0] === id; });
  }
  function findTx(id) {
    for (var i = 0; i < state.txns.length; i++) if (state.txns[i].id === id) return state.txns[i];
    return null;
  }
  function findInbox(id) {
    for (var i = 0; i < state.inbox.length; i++) if (state.inbox[i].id === id) return state.inbox[i];
    return null;
  }
  function hue(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0;
    return h % 360;
  }
  function initials(name) {
    var parts = String(name).replace(/[&+]/g, ' ').split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  function avatar(name) {
    return '<span class="av" style="background:hsl(' + hue(name) + ' 28% 34%)">' + esc(initials(name)) + '</span>';
  }
  function icon(name) {
    var paths = {
      home: '<path d="M4 10.5 12 3.5 20 10.5V20a1 1 0 0 1-1 1h-5.5v-6h-3V21H5a1 1 0 0 1-1-1z"/>',
      inbox: '<path d="M4 13h4.5l1.5 2.5h4L15.5 13H20"/><path d="M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
      list: '<path d="M9 7h11M9 12h11M9 17h11"/><path d="M4.5 7h.01M4.5 12h.01M4.5 17h.01"/>',
      search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
      repeat: '<path d="M17 2v5h-5"/><path d="M7 22v-5h5"/><path d="M19.5 8A7.5 7.5 0 0 0 7 6.2L4.5 8"/><path d="M4.5 16A7.5 7.5 0 0 0 17 17.8l2.5-1.8"/>',
      chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-3"/>',
      upload: '<path d="M12 16V5"/><path d="m8 8 4-4 4 4"/><path d="M5 19h14"/>',
      settings: '<path d="M4 8h10"/><path d="M18 8h2"/><path d="M4 16h2"/><path d="M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
      sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
      moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
      eye: '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.5"/>',
      eyeOff: '<path d="M3 4.5 20 19"/><path d="M9.5 6.8A8 8 0 0 1 12 6.5C18 6.5 21.5 12 21.5 12a17 17 0 0 1-3.2 3.6"/><path d="M6.2 7.8C3.8 9.4 2.5 12 2.5 12S6 17.5 12 17.5c1.1 0 2.1-.2 3-.6"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>'
    };
    return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || '') + '</svg>';
  }
  function catChip(id) {
    return '<span class="chip">' + esc(K.cat(id).label) + '</span>';
  }
  function ctxChip(id) {
    return '<span class="chip ctx-' + esc(id) + '"><i class="dot"></i>' + esc(K.ctx(id).label) + '</span>';
  }
  function optionsHTML(list, selected) {
    return list.map(function (item) {
      return '<option value="' + esc(item.id) + '"' + (item.id === selected ? ' selected' : '') + '>' + esc(item.label) + '</option>';
    }).join('');
  }
  function pageHead(title, sub) {
    return '<header class="page-head"><h1>' + esc(title) + '</h1><p class="lede">' + sub + '</p></header>';
  }
  function scopeOpt(extra) {
    return Object.assign({
      from: state.range.from,
      to: state.range.to,
      context: state.context
    }, extra || {});
  }
  function rowsInScope(extra) {
    return K.selectRows(state.txns, scopeOpt(extra));
  }
  function inboxStats() {
    var pending = state.inbox.filter(function (item) {
      return state.context === 'alle' || item.context === state.context;
    });
    var reviewed = state.context === 'alle'
      ? state.reviewed.privat + state.reviewed.arbeit + state.reviewed.selbst
      : state.reviewed[state.context] || 0;
    return { pending: pending, reviewed: reviewed, total: reviewed + pending.length };
  }
  function visibleInbox() {
    return inboxStats().pending.slice().sort(function (a, b) {
      if (a.date === b.date) return a.merchant.localeCompare(b.merchant, 'de');
      return a.date < b.date ? 1 : -1;
    });
  }
  function monthBounds(key) {
    var dim = K.daysInMonth(+key.slice(0, 4), +key.slice(5, 7));
    return { from: key + '-01', to: key + '-' + pad(dim) };
  }
  function monthSummary(key) {
    var b = monthBounds(key);
    return K.summarize(K.selectRows(state.txns, { from: b.from, to: b.to, context: state.context }));
  }
  function sparrate(sum) {
    if (sum.income < 25000) return null;
    var rate = (sum.net / sum.income) * 100;
    if (rate < -150) return null;
    return rate;
  }
  function axisNum(cents) {
    return intFmt.format(Math.round(cents / 100));
  }
  function niceMax(cents) {
    var euros = Math.max(cents / 100, 1);
    var step = euros > 8000 ? 2000 : euros > 4000 ? 1000 : euros > 1500 ? 500 : euros > 400 ? 100 : 50;
    return Math.ceil(euros / step) * step * 100;
  }
  function daysUntil(date) {
    var a = Date.parse(K.TODAY + 'T00:00:00Z');
    var b = Date.parse(date + 'T00:00:00Z');
    return Math.round((b - a) / 86400000);
  }
  function intervalLabel(c) {
    if (c.interval === 'year') return 'jährlich';
    if (c.interval === 'quarter') return 'vierteljährlich';
    return 'monatlich';
  }
  function contractsInContext() {
    return K.CONTRACTS.filter(function (c) {
      return state.context === 'alle' || c.context === state.context;
    });
  }

  function toast(msg) {
    var root = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  function applyTheme() {
    document.body.dataset.theme = state.theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = state.theme === 'dark' ? '#101210' : '#f3f0e7';
    try { sessionStorage.setItem('kontor-theme', state.theme); } catch (err) { /* ignore */ }
    var btn = document.getElementById('theme-btn');
    btn.innerHTML = state.theme === 'dark' ? icon('sun') : icon('moon');
    btn.setAttribute('aria-label', state.theme === 'dark' ? 'Helles Design einschalten' : 'Dunkles Design einschalten');
  }
  function applyPrivacy() {
    document.body.classList.toggle('is-private', state.privacy);
    try { sessionStorage.setItem('kontor-privacy', state.privacy ? '1' : '0'); } catch (err) { /* ignore */ }
    var btn = document.getElementById('privacy-btn');
    btn.innerHTML = state.privacy ? icon('eyeOff') : icon('eye');
    btn.setAttribute('aria-pressed', state.privacy ? 'true' : 'false');
    btn.setAttribute('aria-label', state.privacy ? 'Beträge zeigen' : 'Beträge verbergen');
  }
  function applySidebar() {
    document.getElementById('sidebar').classList.toggle('open', state.sidebarOpen);
    document.getElementById('scrim').hidden = !state.sidebarOpen;
    document.getElementById('menu-btn').setAttribute('aria-expanded', state.sidebarOpen ? 'true' : 'false');
  }
  function renderNav() {
    var stats = inboxStats();
    var html = NAV.map(function (item) {
      var current = item[0] === state.screen ? ' aria-current="page"' : '';
      var badge = '';
      if (item[0] === 'inbox' && stats.pending.length) {
        badge = '<span class="count" id="inbox-badge">' + stats.pending.length + '</span>';
      } else if (item[0] === 'inbox') {
        badge = '<span class="count" id="inbox-badge" hidden>0</span>';
      }
      return '<button type="button" class="nav-btn" data-go="' + item[0] + '"' + current + '>' +
        icon(item[2]) + '<span>' + esc(item[1]) + '</span>' + badge + '</button>';
    }).join('');
    document.getElementById('nav').innerHTML = html;
  }
  function renderRangeLabel() {
    document.getElementById('range-label').textContent = prettyRange(state.range.from, state.range.to);
    document.getElementById('range-btn').title = state.range.label || 'Eigener Zeitraum';
  }
  function syncContext() {
    document.querySelectorAll('#context-pill button').forEach(function (b) {
      b.setAttribute('aria-checked', b.dataset.ctx === state.context ? 'true' : 'false');
    });
  }

  function render() {
    var screen = document.getElementById('screen');
    var ae = document.activeElement;
    var focusId = null;
    var sel = null;
    if (ae && ae.id && screen.contains(ae)) {
      focusId = ae.id;
      sel = typeof ae.selectionStart === 'number' ? ae.selectionStart : null;
    }
    renderNav();
    renderRangeLabel();
    syncContext();
    applySidebar();
    screen.innerHTML = screenHTML() + drawerHTML();
    if (!focusId && state.panelId) {
      var drawer = screen.querySelector('.drawer');
      if (drawer) drawer.focus();
    }
    if (focusId) {
      var el = document.getElementById(focusId);
      if (el) {
        el.focus();
        if (sel != null && el.setSelectionRange) {
          try { el.setSelectionRange(sel, sel); } catch (err) { /* ignore */ }
        }
      }
    }
    var h1 = screen.querySelector('h1');
    document.title = (h1 ? h1.textContent + ' · ' : '') + 'Kontor';
  }

  function screenHTML() {
    switch (state.screen) {
      case 'inbox': return inboxHTML();
      case 'buchungen': return buchungenHTML();
      case 'haendler': return haendlerHTML();
      case 'fixkosten': return fixkostenHTML();
      case 'analyse': return analyseHTML();
      case 'import': return importHTML();
      case 'einstellungen': return settingsHTML();
      default: return overviewHTML();
    }
  }

  function overviewHTML() {
    var rows = rowsInScope();
    var sum = K.summarize(rows);
    var rate = sparrate(sum);
    var budget = K.budgetFor(state.range, state.context);
    var spent = Math.abs(sum.expense);
    var rest = budget - spent;
    var pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    var over = spent > budget;
    var parts = K.monthsTouched(state.range.from, state.range.to);
    var dailyLabel;
    var dailyValue;
    if (parts.length === 1 && parts[0].key === '2026-10') {
      dailyLabel = 'Tagesbudget · 26 Tage übrig';
      dailyValue = Math.round(rest / 26);
    } else {
      var days = parts.reduce(function (s, p) { return s + p.days; }, 0) || 1;
      dailyLabel = 'Ø Ausgaben / Tag';
      dailyValue = Math.round(spent / days);
    }
    var keys = K.monthKeysEnding(state.range.to, 12);
    var points = keys.map(function (key, i) {
      var ms = monthSummary(key);
      var b = monthBounds(key);
      return {
        key: key,
        name: formatMonth(key),
        axis: (i === 0 || key.slice(0, 4) !== keys[i - 1].slice(0, 4)) ? shortMonth(key) + ' ' + key.slice(2, 4) : shortMonth(key),
        income: ms.income,
        expense: Math.abs(ms.expense),
        hi: b.to >= state.range.from && b.from <= state.range.to
      };
    });
    var cats = Object.keys(sum.byCategory).map(function (id) {
      return { id: id, amount: Math.abs(sum.byCategory[id]) };
    }).filter(function (c) { return c.amount > 0; }).sort(function (a, b) { return b.amount - a.amount; });
    var merchants = Object.keys(sum.byMerchant).map(function (name) {
      return { name: name, amount: sum.byMerchant[name].amount, count: sum.byMerchant[name].count };
    }).filter(function (m) { return m.amount < 0; }).sort(function (a, b) { return a.amount - b.amount; }).slice(0, 5);
    var maxMerch = merchants.length ? Math.abs(merchants[0].amount) : 1;
    var pendingN = inboxStats().pending.length;
    var hintWord = pendingN === 1 ? 'Umsatz wartet' : 'Umsätze warten';

    return pageHead('Übersicht', esc(prettyRange(state.range.from, state.range.to)) + ' · ' + esc(contextLabel())) +
      '<section class="kpi-grid" aria-label="Kennzahlen">' +
        kpi('Einnahmen', plusMoney(sum.income), sum.count + ' Buchungen') +
        kpi('Ausgaben', moneyHTML(sum.expense, true), 'im gewählten Zeitraum') +
        kpi('Netto', plusMoney(sum.net), 'Einnahmen minus Ausgaben') +
        kpi('Sparrate', rate == null ? '<span class="v">—</span>' : '<div class="v' + (rate < 0 ? ' neg' : ' pos') + '">' + esc(pctFmt.format(rate)) + ' %</div>', rate == null ? 'Zu wenig Einnahmen für eine Quote' : 'Netto geteilt durch Einnahmen') +
        '<article class="kpi kpi-budget"><span class="k">Verfügbares Restbudget</span><div class="v' + (rest < 0 ? ' neg' : '') + '">' + moneyHTML(rest) + '</div>' +
          '<div class="track' + (over ? ' over' : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Budget ausgeschöpft"><span style="width:' + pct + '%"></span></div>' +
          '<div class="budget-foot"><span>' + esc(dailyLabel) + '</span><span>' + moneyHTML(dailyValue, dailyValue < 0) + '</span></div>' +
          '<div class="sub">Budget ' + moneyHTML(budget) + ' · ' + pct + ' % ausgeschöpft</div></article>' +
      '</section>' +
      '<div class="chart-grid">' +
        '<section class="card"><div class="card-head"><h2>Einnahmen und Ausgaben</h2><span class="aside">12 Monate · Euro</span></div>' +
          barChartSVG(points, 'Balkendiagramm Einnahmen und Ausgaben der letzten 12 Monate') +
          '<div class="legend-row"><span><i class="swatch-in"></i> Einnahmen</span><span><i class="swatch-out"></i> Ausgaben</span><span>Markiert: gewählter Zeitraum</span></div>' +
          srTable(points) +
        '</section>' +
        '<section class="card"><div class="card-head"><h2>Ausgaben nach Kategorie</h2></div>' + donutHTML(cats) + '</section>' +
      '</div>' +
      '<div class="split-2">' +
        forecastCard() +
        debitsCard() +
      '</div>' +
      '<div class="split-2">' +
        '<section class="card"><div class="card-head"><h2>Größte Händler</h2><span class="aside">im Zeitraum</span></div>' +
          (merchants.length ? '<div class="mrows">' + merchants.map(function (m) {
            var w = Math.round((Math.abs(m.amount) / maxMerch) * 100);
            return '<div class="mrow"><button type="button" data-act="merchant" data-merchant="' + esc(m.name) + '">' +
              avatar(m.name) + '<span class="grow">' + esc(m.name) + '<small>' + m.count + (m.count === 1 ? ' Buchung' : ' Buchungen') + '</small></span>' +
              '<span class="barline" aria-hidden="true"><span style="width:' + w + '%"></span></span>' +
              moneyHTML(m.amount, true) + '</button></div>';
          }).join('') + '</div>' : '<p class="empty">Keine Ausgaben im Zeitraum.</p>') +
        '</section>' +
        '<button type="button" class="card hint-card" data-go="inbox"><div><span class="k">Smart Inbox</span><div class="hint-count">' + pendingN + '</div><p>' +
          (pendingN ? esc(hintWord) + ' auf eine Prüfung.' : 'Nichts wartet auf Prüfung.') + '</p></div><span class="hint-go">Inbox öffnen</span></button>' +
      '</div>';
  }

  function kpi(label, valueHTML, sub) {
    var value = valueHTML.indexOf('class="v') === -1 ? '<div class="v">' + valueHTML + '</div>' : valueHTML;
    return '<article class="kpi"><span class="k">' + esc(label) + '</span>' + value + '<div class="sub">' + sub + '</div></article>';
  }

  function barChartSVG(points, aria) {
    var W = 720, H = 232, pl = 54, pr = 8, pt = 12, pb = 28;
    var iw = W - pl - pr, ih = H - pt - pb;
    var max = 1;
    points.forEach(function (p) { max = Math.max(max, p.income, p.expense); });
    var nice = niceMax(max);
    var group = iw / points.length;
    var barW = Math.min(11, group * 0.24);
    var out = [];
    [0, 0.5, 1].forEach(function (t) {
      var y = pt + ih * (1 - t);
      out.push('<line x1="' + pl + '" y1="' + y + '" x2="' + (W - pr) + '" y2="' + y + '" stroke="var(--grid)" stroke-width="1"/>');
      out.push('<text class="m" x="' + (pl - 6) + '" y="' + (y + 3) + '" text-anchor="end" fill="var(--muted)" font-size="10">' + esc(axisNum(nice * t)) + '</text>');
    });
    points.forEach(function (p) {
      var i = points.indexOf(p);
      var cx = pl + group * i + group / 2;
      var hIn = (p.income / nice) * ih;
      var hEx = (p.expense / nice) * ih;
      if (p.hi) out.push('<rect x="' + (pl + group * i + 1) + '" y="' + pt + '" width="' + (group - 2) + '" height="' + ih + '" fill="var(--band)"/>');
      out.push('<rect x="' + (cx - barW - 1) + '" y="' + (pt + ih - hIn) + '" width="' + barW + '" height="' + Math.max(hIn, 0) + '" rx="2" fill="var(--good)"><title>' + esc(p.name + ': Einnahmen ' + moneyText(p.income)) + '</title></rect>');
      out.push('<rect x="' + (cx + 1) + '" y="' + (pt + ih - hEx) + '" width="' + barW + '" height="' + Math.max(hEx, 0) + '" rx="2" fill="var(--bad)"><title>' + esc(p.name + ': Ausgaben ' + moneyText(-p.expense)) + '</title></rect>');
      out.push('<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" fill="var(--muted)" font-size="10">' + esc(p.axis) + '</text>');
    });
    return '<svg class="plot" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(aria) + '">' + out.join('') + '</svg>';
  }

  function srTable(points) {
    var rows = points.map(function (p) {
      return '<tr><td>' + esc(p.name) + '</td><td>' + esc(moneyText(p.income)) + '</td><td>' + esc(moneyText(-p.expense)) + '</td></tr>';
    }).join('');
    return '<table class="sr"><caption>Werte zum Diagramm</caption><thead><tr><th>Monat</th><th>Einnahmen</th><th>Ausgaben</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function donutHTML(cats) {
    var total = cats.reduce(function (s, c) { return s + c.amount; }, 0);
    if (!total) return '<p class="empty">Keine Ausgaben im Zeitraum.</p>';
    var r = 64;
    var c = 2 * Math.PI * r;
    var gap = cats.length > 1 ? Math.min(6, c * 0.01) : 0;
    var offset = 0;
    var slices = cats.map(function (slice) {
      var len = (slice.amount / total) * c;
      var dash = Math.max(len - gap, 0.4);
      var el = '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="' + (COLORS[slice.id] || '#8d887c') + '" stroke-width="16" stroke-dasharray="' + dash + ' ' + (c - dash) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 90 90)"><title>' + esc(K.cat(slice.id).label + ' ' + moneyText(-slice.amount)) + '</title></circle>';
      offset += len;
      return el;
    }).join('');
    var legend = cats.map(function (slice) {
      var pct = slice.amount / total * 100;
      return '<li><i class="swatch" style="background:' + (COLORS[slice.id] || '#8d887c') + '"></i><span class="leg-name">' + esc(K.cat(slice.id).label) + '</span><span class="leg-amt m">' + esc(pctFmt.format(pct)) + ' % · ' + esc(moneyText(-slice.amount)) + '</span></li>';
    }).join('');
    return '<div class="donut-layout"><div class="donut-box"><svg class="plot donut" viewBox="0 0 180 180" role="img" aria-label="Ausgaben nach Kategorie">' + slices + '</svg><div class="donut-center"><span class="k">Summe</span><div class="v">' + moneyHTML(-total, true) + '</div></div></div><ul class="legend">' + legend + '</ul></div>';
  }

  function forecastItems() {
    var items = [];
    K.CONTRACTS.forEach(function (c) {
      if (!(c.nextDate > K.TODAY && c.nextDate <= K.FORECAST_UNTIL)) return;
      if (state.context !== 'alle' && c.context !== state.context) return;
      items.push({ date: c.nextDate, merchant: c.name, detail: intervalLabel(c), amount: c.amount, context: c.context });
    });
    K.expected.forEach(function (e) {
      if (!(e.date > K.TODAY && e.date <= K.FORECAST_UNTIL)) return;
      if (state.context !== 'alle' && e.context !== state.context) return;
      items.push({ date: e.date, merchant: e.merchant, detail: e.detail, amount: e.amount, context: e.context });
    });
    items.sort(function (a, b) {
      if (a.date === b.date) return a.amount - b.amount;
      return a.date < b.date ? -1 : 1;
    });
    return items;
  }

  function forecastCard() {
    var items = forecastItems();
    var flow = items.reduce(function (s, item) { return s + item.amount; }, 0);
    var alle = state.context === 'alle';
    var projected = alle ? K.checkingBalance + flow : flow;
    var list = items.map(function (item) {
      return '<li>' + avatar(item.merchant) + '<span class="grow">' + esc(item.merchant) + '<small>' + esc(formatDate(item.date)) + ' · ' + esc(item.detail) + '</small></span>' + plusMoney(item.amount) + '</li>';
    }).join('');
    var rentNote = (alle || state.context === 'privat') ? '<p class="sub">Bis einschließlich 1. November. Die Miete am 3. November liegt außerhalb.</p>' : '';
    return '<section class="card"><div class="card-head"><h2>Cashflow-Prognose zum 1. des Monats</h2><span class="aside">bis 1. Nov. 2026</span></div>' +
      (alle ? '<div class="forecast-total" style="margin-top:0;border:0;padding-top:0"><span>Kontostand Giro heute</span><strong>' + moneyHTML(K.checkingBalance) + '</strong></div>' : '<p class="sub" style="margin-top:0">Nur Posten im Kontext ' + esc(contextLabel()) + '.</p>') +
      '<ul class="flow-list">' + (list || '<li><span class="grow">Keine geplanten Bewegungen.</span></li>') + '</ul>' +
      '<div class="forecast-total"><span>' + (alle ? 'Prognose zum 1. November' : 'Saldo der Posten') + '</span><strong>' + plusMoney(projected) + '</strong></div>' + rentNote + '</section>';
  }

  function debitsCard() {
    var items = contractsInContext().slice().sort(function (a, b) {
      return a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : 0;
    });
    var list = items.map(function (c) {
      return '<li>' + avatar(c.merchant) + '<span class="grow">' + esc(c.name) + '<small>' + esc(formatDate(c.nextDate)) + ' · ' + esc(intervalLabel(c)) + '</small></span>' + moneyHTML(c.amount, true) + '</li>';
    }).join('');
    return '<section class="card"><div class="card-head"><h2>Nächste Abbuchungen</h2><button type="button" class="btn btn-ghost" data-go="fixkosten">Alle Fixkosten</button></div><ul class="flow-list">' + list + '</ul></section>';
  }

  function inboxHTML() {
    var stats = inboxStats();
    var items = visibleInbox();
    var pct = stats.total ? Math.round((stats.reviewed / stats.total) * 100) : 0;
    var autos = items.filter(function (item) { return item.auto; }).length;
    var sub = stats.reviewed + ' von ' + stats.total + ' geprüft';
    if (autos) sub += ' · ' + autos + ' in der Liste automatisch bestätigt';
    var rows = items.length ? items.map(inboxRow).join('') : '<p class="empty">Alles geprüft. In diesem Kontext wartet nichts mehr.</p>';
    return pageHead('Smart Inbox', 'Neue Umsätze mit Vorschlag für Kategorie und Kontext. ' + esc(contextLabel()) + '.') +
      '<section class="card inbox-progress"><div class="card-head"><h2>' + stats.reviewed + ' von ' + stats.total + ' geprüft</h2><span class="aside">' + items.length + ' offen</span></div>' +
      '<div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="' + stats.total + '" aria-valuenow="' + stats.reviewed + '" aria-label="Geprüfte Umsätze"><span style="width:' + pct + '%"></span></div>' +
      '<p class="sub">' + esc(sub) + '</p></section>' +
      '<section class="card" style="padding-top:6px">' + rows + '</section>';
  }

  function inboxRow(item) {
    var acct = K.ACCOUNTS[item.account];
    var editor = '';
    if (state.editingInbox === item.id) {
      editor = '<div class="editor"><label class="field">Kategorie<select id="edit-cat">' + optionsHTML(K.CATEGORIES, item.category) + '</select></label>' +
        '<label class="field">Kontext<select id="edit-ctx">' + optionsHTML(K.CONTEXTS, item.context) + '</select></label>' +
        '<label class="field">Betrag<input id="edit-amt" inputmode="decimal" value="' + esc(euroInput(item.amount)) + '" aria-label="Betrag in Euro"></label>' +
        '<div class="row-actions"><button type="button" class="btn btn-primary" data-act="save-edit" data-id="' + esc(item.id) + '">Übernehmen</button><button type="button" class="btn" data-act="cancel-edit">Abbrechen</button></div></div>';
    }
    return '<article class="inbox-row"><div>' + avatar(item.merchant) + '</div><div><div class="inbox-top"><span class="merchant">' + esc(item.merchant) + '</span>' + moneyHTML(item.amount, true) + '</div>' +
      '<div class="meta">' + esc(formatDate(item.date)) + ' · ' + esc(acct.label) + ' · ' + Math.round(item.confidence * 100) + ' % Sicherheit</div>' +
      '<div class="chip-row" style="margin-top:8px">' + catChip(item.category) + ctxChip(item.context) +
        (item.auto ? '<span class="flag flag-auto">automatisch bestätigt</span>' : '') + '</div>' +
      '<div class="row-actions"><button type="button" class="btn btn-primary" data-act="confirm" data-id="' + esc(item.id) + '">Bestätigen</button>' +
        '<button type="button" class="btn" data-act="edit" data-id="' + esc(item.id) + '">Ändern</button>' +
        '<button type="button" class="btn btn-ghost" data-act="rule" data-id="' + esc(item.id) + '">Regel daraus erstellen</button></div>' +
      editor + '</div></article>';
  }

  function buchResultsInner() {
    var opt = {
      from: state.range.from,
      to: state.range.to,
      context: state.context,
      kind: state.buchungen.kind === 'alle' ? '' : state.buchungen.kind,
      categories: state.buchungen.categories,
      account: state.buchungen.account,
      q: state.buchungen.q
    };
    var rows = K.selectRows(state.txns, opt);
    rows.sort(function (a, b) {
      var dir = state.buchungen.dir === 'asc' ? 1 : -1;
      if (state.buchungen.sort === 'amount') return (a.amount - b.amount) * dir;
      if (a.tx.date === b.tx.date) return a.tx.merchant.localeCompare(b.tx.merchant, 'de');
      return (a.tx.date < b.tx.date ? -1 : 1) * dir;
    });
    var allOn = rows.length > 0 && rows.every(function (r) { return state.buchungen.selected[r.tx.id]; });
    var selectedCount = Object.keys(state.buchungen.selected).filter(function (id) { return state.buchungen.selected[id]; }).length;
    var body = rows.map(function (row) {
      var tx = row.tx;
      var on = !!state.buchungen.selected[tx.id];
      var catBtn = row.categories.length > 1
        ? '<button type="button" class="chip" data-act="open" data-id="' + esc(tx.id) + '">Mehrere</button>'
        : '<button type="button" class="chip" data-act="edit-cat" data-id="' + esc(tx.id) + '" aria-label="Kategorie ändern">' + esc(K.cat(row.categories[0]).label) + '</button>';
      var ctxBtn = row.contexts.length > 1
        ? '<button type="button" class="chip" data-act="open" data-id="' + esc(tx.id) + '">Mehrere</button>'
        : '<button type="button" class="chip ctx-' + esc(row.contexts[0]) + '" data-act="edit-ctx" data-id="' + esc(tx.id) + '" aria-label="Kontext ändern"><i class="dot"></i>' + esc(K.ctx(row.contexts[0]).label) + '</button>';
      return '<tr class="' + (on ? 'is-selected' : '') + '" data-act="open" data-id="' + esc(tx.id) + '">' +
        '<td><input class="check" type="checkbox" data-act="toggle" data-id="' + esc(tx.id) + '"' + (on ? ' checked' : '') + ' aria-label="Auswählen: ' + esc(tx.merchant) + '"></td>' +
        '<td><div class="merchant-cell">' + avatar(tx.merchant) + '<button type="button" class="linkish" data-act="open" data-id="' + esc(tx.id) + '">' + esc(tx.merchant) + '</button>' +
          (tx.parts ? '<span class="flag flag-auto">geteilt</span>' : '') + '</div></td>' +
        '<td>' + esc(formatDate(tx.date)) + '</td>' +
        '<td class="num">' + moneyHTML(row.amount, true) + '</td>' +
        '<td>' + catBtn + '</td><td>' + ctxBtn + '</td>' +
        '<td>' + esc(K.ACCOUNTS[tx.account].label) + '</td></tr>';
    }).join('');
    var bulk = selectedCount ? '<div class="bulk"><strong>' + selectedCount + ' ausgewählt</strong>' +
      '<button type="button" class="btn" data-act="bulk-cat">Kategorie</button>' +
      '<button type="button" class="btn" data-act="bulk-ctx">Kontext</button>' +
      '<button type="button" class="btn" data-act="bulk-clear">Auswahl aufheben</button></div>' : '';
    buchResultsInner.count = rows.length;
    return '<div class="table-wrap"><table><thead><tr>' +
      '<th><input class="check" type="checkbox" data-act="select-all"' + (allOn ? ' checked' : '') + ' aria-label="Alle sichtbaren Umsätze auswählen"></th>' +
      '<th>Händler</th>' +
      '<th><button type="button" class="sort-btn" data-act="sort" data-sort="date">Datum' + (state.buchungen.sort === 'date' ? (state.buchungen.dir === 'asc' ? ' ↑' : ' ↓') : '') + '</button></th>' +
      '<th class="num"><button type="button" class="sort-btn" data-act="sort" data-sort="amount">Betrag' + (state.buchungen.sort === 'amount' ? (state.buchungen.dir === 'asc' ? ' ↑' : ' ↓') : '') + '</button></th>' +
      '<th>Kategorie</th><th>Kontext</th><th>Konto</th></tr></thead><tbody>' +
      (body || '<tr><td colspan="7"><p class="empty">Keine Buchungen für diesen Filter.</p></td></tr>') +
      '</tbody></table></div>' + bulk;
  }

  function buchungenHTML() {
    var kindBtn = function (id, label) {
      return '<button type="button" class="fchip" data-act="kind" data-kind="' + id + '" aria-pressed="' + (state.buchungen.kind === id ? 'true' : 'false') + '">' + label + '</button>';
    };
    var catBtns = K.CATEGORIES.map(function (c) {
      var on = state.buchungen.categories.indexOf(c.id) !== -1;
      return '<button type="button" class="fchip" data-act="filter-cat" data-cat="' + c.id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(c.label) + '</button>';
    }).join('');
    var acctBtns = '<button type="button" class="fchip" data-act="filter-account" data-account="" aria-pressed="' + (!state.buchungen.account ? 'true' : 'false') + '">Alle Konten</button>' +
      Object.keys(K.ACCOUNTS).map(function (id) {
        return '<button type="button" class="fchip" data-act="filter-account" data-account="' + id + '" aria-pressed="' + (state.buchungen.account === id ? 'true' : 'false') + '">' + esc(K.ACCOUNTS[id].label) + '</button>';
      }).join('');
    var table = buchResultsInner();
    return pageHead('Buchungen', esc(buchResultsInner.count + ' Umsätze · ' + prettyRange(state.range.from, state.range.to) + ' · ' + contextLabel())) +
      '<div class="filters">' + kindBtn('alle', 'Alle') + kindBtn('income', 'Einnahmen') + kindBtn('expense', 'Ausgaben') + catBtns + '</div>' +
      '<div class="filters">' + acctBtns + '</div>' +
      '<div class="tool-row"><input id="buch-q" class="text-input" type="search" placeholder="Händler filtern" value="' + esc(state.buchungen.q) + '" aria-label="Händler filtern"></div>' +
      '<div id="buch-results">' + table + '</div>';
  }

  function draftFrom(tx) {
    if (tx.parts && tx.parts.length >= 2) {
      return tx.parts.slice(0, 2).map(function (p) {
        return { amount: euroInput(Math.abs(p.amount)), category: p.category, context: p.context };
      });
    }
    var abs = Math.abs(tx.amount);
    var half = Math.round(abs / 2);
    return [
      { amount: euroInput(half), category: tx.category, context: tx.context },
      { amount: euroInput(abs - half), category: tx.category, context: tx.context === 'privat' ? 'arbeit' : 'privat' }
    ];
  }
  function splitHint(tx) {
    if (!state.splitDraft) return '';
    var a = parseEuro(state.splitDraft[0].amount);
    var b = parseEuro(state.splitDraft[1].amount);
    if (a == null || b == null) return 'Teilbeträge als Euro, zum Beispiel 12,40.';
    if (a + b === Math.abs(tx.amount)) return 'Die Teile passen zum Umsatz.';
    return 'Summe ' + moneyText((tx.amount < 0 ? -1 : 1) * (a + b)) + ' · Umsatz ' + moneyText(tx.amount);
  }

  function drawerHTML() {
    if (state.screen !== 'buchungen' || !state.panelId) return '';
    var tx = findTx(state.panelId);
    if (!tx) return '';
    if (!state.splitDraft) state.splitDraft = draftFrom(tx);
    var acct = K.ACCOUNTS[tx.account];
    var tags = (tx.tags || []).map(function (tag) {
      return '<span class="tag">' + esc(tag) + '<button type="button" data-act="untag" data-tag="' + esc(tag) + '" aria-label="Schlagwort ' + esc(tag) + ' entfernen">×</button></span>';
    }).join(' ');
    var parts = '';
    if (tx.parts && tx.parts.length) {
      parts = '<ul class="plain-list">' + tx.parts.map(function (p) {
        return '<li>' + catChip(p.category) + ctxChip(p.context) + '<span class="grow"></span>' + moneyHTML(p.amount, true) + '</li>';
      }).join('') + '</ul>';
    }
    var splitLines = state.splitDraft.map(function (line, i) {
      return '<div class="split-line"><label class="field">Betrag<input id="split-amt-' + i + '" data-split-i="' + i + '" data-split-field="amount" inputmode="decimal" value="' + esc(line.amount) + '" aria-label="Teilbetrag ' + (i + 1) + '"></label>' +
        '<label class="field">Kategorie<select data-split-i="' + i + '" data-split-field="category" aria-label="Kategorie Teil ' + (i + 1) + '">' + optionsHTML(K.CATEGORIES, line.category) + '</select></label>' +
        '<label class="field">Kontext<select data-split-i="' + i + '" data-split-field="context" aria-label="Kontext Teil ' + (i + 1) + '">' + optionsHTML(K.CONTEXTS, line.context) + '</select></label></div>';
    }).join('');
    return '<button type="button" class="drawer-scrim" data-act="close-panel" aria-label="Detail schließen"></button>' +
      '<aside class="drawer" role="dialog" tabindex="-1" aria-labelledby="drawer-title"><div class="drawer-head"><div>' +
        '<span class="k">Buchung</span><h2 id="drawer-title">' + esc(tx.merchant) + '</h2>' +
        '<p class="lede">' + esc(formatDate(tx.date)) + ' · ' + esc(acct.label) + ' · ' + esc(acct.bank) + '</p></div>' +
        '<button type="button" class="icon-btn" data-act="close-panel" aria-label="Schließen">' + icon('close') + '</button></div>' +
      '<p class="v" style="margin:16px 0">' + moneyHTML(tx.amount, true) + '</p>' +
      '<div class="chip-row">' + catChip(tx.category) + ctxChip(tx.context) + '</div>' + parts +
      '<h3 style="margin-top:22px">Notiz</h3><textarea id="note-field" aria-label="Notiz">' + esc(tx.note || '') + '</textarea>' +
      '<h3 style="margin-top:18px">Schlagwörter</h3><div class="chip-row" style="margin:8px 0">' + (tags || '<span class="meta">Keine</span>') + '</div>' +
      '<div class="tool-row"><input id="tag-input" class="text-input" type="text" placeholder="Schlagwort, Enter" aria-label="Schlagwort hinzufügen"></div>' +
      '<h3 style="margin-top:8px">Aufteilen</h3><p class="sub">Zwei Teile, Summe muss dem Umsatz entsprechen.</p><div class="split-grid" style="margin-top:8px">' + splitLines + '</div>' +
      '<p class="hint-line" id="split-hint">' + esc(splitHint(tx)) + '</p>' +
      '<div class="row-actions"><button type="button" class="btn btn-primary" data-act="apply-split">Teilung übernehmen</button>' +
        (tx.parts ? '<button type="button" class="btn" data-act="clear-split">Teilung aufheben</button>' : '') +
      '</div></aside>';
  }

  function merchantWindow(year) {
    if (year === '2026') return { from: '2026-01-01', to: K.TODAY, label: '1. Jan – 5. Okt 2026', priorFrom: '2025-01-01', priorTo: '2025-10-05' };
    return { from: year + '-01-01', to: year + '-12-31', label: 'Kalenderjahr ' + year, priorFrom: null, priorTo: null };
  }

  function haendlerHTML() {
    var year = state.range.to.slice(0, 4);
    var head = pageHead('Händler-Suche', 'Kalenderjahr ' + esc(year) + ' · Kontext ' + esc(contextLabel()) + '. Der Zeitraum oben wählt das Jahr.');
    var field = '<label class="search-line"><span class="sr">Händler oder Anbieter</span><input id="merchant-q" class="text-input" type="search" value="' + esc(state.merchantQuery) + '" placeholder="z. B. Uber, REWE, Spotify"></label>';
    return head + field + '<div id="merchant-results">' + merchantResultsHTML() + '</div>';
  }

  function merchantResultsHTML() {
    var q = state.merchantQuery.trim();
    var year = state.range.to.slice(0, 4);
    var win = merchantWindow(year);
    if (!q) {
      return '<p class="empty">Namen eingeben — zum Beispiel Uber, REWE, Spotify oder Nordlicht.</p>';
    }
    var rows = K.selectRows(state.txns, { from: win.from, to: win.to, context: state.context, q: q });
    var sum = K.summarize(rows);
    if (!rows.length) {
      return '<p class="empty">Keine Buchungen für „' + esc(q) + '“ in ' + esc(win.label) + '.</p>';
    }
    var priorRows = win.priorFrom ? K.selectRows(state.txns, { from: win.priorFrom, to: win.priorTo, context: state.context, q: q }) : [];
    var prior = K.summarize(priorRows);
    var avg = Math.round(sum.net / rows.length);
    var months = [];
    var mi;
    for (mi = 1; mi <= 12; mi++) months.push(year + '-' + pad(mi));
    var monthPoints = months.map(function (key) {
      var b = monthBounds(key);
      var cur = K.summarize(K.selectRows(state.txns, { from: b.from, to: b.to, context: state.context, q: q }));
      var priorKey = (+key.slice(0, 4) - 1) + key.slice(4);
      var pb = monthBounds(priorKey);
      var prev = win.priorFrom ? K.summarize(K.selectRows(state.txns, { from: pb.from, to: pb.to, context: state.context, q: q })) : { net: 0 };
      return { key: key, name: formatMonth(key), axis: shortMonth(key), current: Math.abs(cur.net), prior: win.priorFrom ? Math.abs(prev.net) : 0 };
    });
    var peak = monthPoints.reduce(function (best, p) {
      if (!best || p.current > best.current) return p;
      return best;
    }, null);
    var delta = '';
    if (win.priorFrom && prior.count) {
      var change = ((Math.abs(sum.net) - Math.abs(prior.net)) / Math.abs(prior.net)) * 100;
      var more = change >= 0;
      delta = '<div class="sub delta ' + (more ? 'up' : 'down') + '">' + (more ? '+' : '−') + esc(pctFmt.format(Math.abs(change))) + ' % ' + (more ? 'mehr' : 'weniger') + ' als im gleichen Zeitraum ' + (year - 1) + '</div>';
    } else if (win.priorFrom) {
      delta = '<div class="sub">Kein Vergleichszeitraum mit Buchungen.</div>';
    } else {
      delta = '<div class="sub">Kein Vorjahr in den Demodaten.</div>';
    }
    var ctxRows = K.CONTEXTS.map(function (c) {
      var active = state.context === 'alle' || state.context === c.id;
      var subset = active ? K.summarize(K.selectRows(state.txns, { from: win.from, to: win.to, context: c.id, q: q })) : { net: 0, count: 0 };
      return { id: c.id, label: c.label, amount: subset.net, count: subset.count };
    });
    var maxCtx = 1;
    ctxRows.forEach(function (c) { maxCtx = Math.max(maxCtx, Math.abs(c.amount)); });
    var ctxHTML = ctxRows.map(function (c) {
      var w = Math.round((Math.abs(c.amount) / maxCtx) * 100);
      return '<div class="ctx-bar-row"><span>' + esc(c.label) + '</span><span class="barline"><span style="width:' + w + '%"></span></span><span>' + moneyHTML(c.amount, true) + '</span></div>';
    }).join('');
    var list = rows.slice().sort(function (a, b) {
      if (a.tx.date === b.tx.date) return 0;
      return a.tx.date < b.tx.date ? 1 : -1;
    }).map(function (row) {
      var ctx = row.contexts.length === 1 ? ctxChip(row.contexts[0]) : '<span class="chip">Mehrere</span>';
      return '<li>' + avatar(row.tx.merchant) + '<span class="grow"><strong>' + esc(formatDate(row.tx.date)) + '</strong><small>' + esc(K.ACCOUNTS[row.tx.account].label) + '</small></span>' + ctx + moneyHTML(row.amount, true) + '</li>';
    }).join('');
    return '<div class="tiles">' +
        '<article class="kpi"><span class="k">Summe ' + esc(year) + '</span><div class="v">' + moneyHTML(sum.net, true) + '</div>' + delta + '<div class="sub">' + esc(win.label) + '</div></article>' +
        '<article class="kpi"><span class="k">Anzahl</span><div class="v">' + rows.length + '</div><div class="sub">Buchungen</div></article>' +
        '<article class="kpi"><span class="k">Durchschnitt</span><div class="v">' + moneyHTML(avg, true) + '</div><div class="sub">je Buchung</div></article>' +
        '<article class="kpi"><span class="k">Peak</span><div class="v" style="font-size:22px">' + esc(peak && peak.current ? formatMonth(peak.key) : '—') + '</div><div class="sub">' + (peak && peak.current ? moneyHTML(sum.net < 0 ? -peak.current : peak.current, true) : '—') + '</div></article>' +
      '</div>' +
      '<section class="card" style="margin-top:12px"><div class="card-head"><h2>Monate ' + esc(year) + '</h2><span class="aside">' + (win.priorFrom ? 'Vergleich ' + (year - 1) : 'ohne Vorjahr') + '</span></div>' +
        compareChart(monthPoints, 'Monatlicher Betrag ' + year) +
        '<div class="legend-row"><span><i class="swatch" style="background:var(--brass)"></i> ' + esc(year) + '</span>' +
          (win.priorFrom ? '<span><i class="swatch" style="background:var(--muted)"></i> ' + (year - 1) + '</span>' : '') +
          '<span>Oktober 2026 nur bis zum 5.</span></div></section>' +
      '<div class="split-2"><section class="card"><div class="card-head"><h2>Nach Kontext</h2></div><div class="ctx-bars">' + ctxHTML + '</div></section>' +
        '<section class="card"><div class="card-head"><h2>Einzelbuchungen</h2><span class="aside">' + rows.length + '</span></div><ul class="plain-list book-scroll">' + list + '</ul></section></div>';
  }

  function compareChart(points, aria) {
    var W = 720, H = 220, pl = 48, pr = 8, pt = 12, pb = 26;
    var iw = W - pl - pr, ih = H - pt - pb;
    var max = 1;
    points.forEach(function (p) { max = Math.max(max, p.current, p.prior || 0); });
    var nice = niceMax(max);
    var group = iw / points.length;
    var barW = Math.min(10, group * 0.22);
    var out = [];
    [0, 0.5, 1].forEach(function (t) {
      var y = pt + ih * (1 - t);
      out.push('<line x1="' + pl + '" y1="' + y + '" x2="' + (W - pr) + '" y2="' + y + '" stroke="var(--grid)" stroke-width="1"/>');
      out.push('<text class="m" x="' + (pl - 6) + '" y="' + (y + 3) + '" text-anchor="end" fill="var(--muted)" font-size="10">' + esc(axisNum(nice * t)) + '</text>');
    });
    points.forEach(function (p, i) {
      var cx = pl + group * i + group / 2;
      var hC = (p.current / nice) * ih;
      var hP = ((p.prior || 0) / nice) * ih;
      if (p.prior) {
        out.push('<rect x="' + (cx - barW - 1) + '" y="' + (pt + ih - hP) + '" width="' + barW + '" height="' + Math.max(hP, 0) + '" rx="2" fill="var(--muted)" opacity="0.55"><title>' + esc(p.name + ' Vorjahr ' + moneyText(p.prior)) + '</title></rect>');
        out.push('<rect x="' + (cx + 1) + '" y="' + (pt + ih - hC) + '" width="' + barW + '" height="' + Math.max(hC, 0) + '" rx="2" fill="var(--brass)"><title>' + esc(p.name + ' ' + moneyText(p.current)) + '</title></rect>');
      } else {
        out.push('<rect x="' + (cx - barW / 2) + '" y="' + (pt + ih - hC) + '" width="' + barW + '" height="' + Math.max(hC, 0) + '" rx="2" fill="var(--brass)"><title>' + esc(p.name + ' ' + moneyText(p.current)) + '</title></rect>');
      }
      out.push('<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" fill="var(--muted)" font-size="10">' + esc(p.axis) + '</text>');
    });
    return '<svg class="plot" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(aria) + '">' + out.join('') + '</svg>';
  }

  function fixkostenHTML() {
    var list = contractsInContext();
    var year = 0;
    list.forEach(function (c) { year += K.yearlyEquivalent(c); });
    var month = Math.round(year / 12);
    var cards = list.map(function (c) {
      var badges = '';
      if (c.priceIncrease) {
        badges += '<span class="flag flag-up">Preiserhöhung</span><span class="meta">ab ' + esc(formatDate(c.priceIncrease.date)) + ' · ' + moneyHTML(c.priceIncrease.to) + '</span>';
      }
      if (c.cancelBy) {
        var left = daysUntil(c.cancelBy);
        badges += '<span class="flag flag-dead">Kündigungsfrist</span><span class="meta">' + esc(formatDate(c.cancelBy)) + (left >= 0 ? ' · in ' + left + (left === 1 ? ' Tag' : ' Tagen') : '') + '</span>';
      }
      return '<article class="card contract"><div class="chip-row">' + ctxChip(c.context) + '<span class="meta">' + esc(K.ACCOUNTS[c.account].label) + '</span></div>' +
        '<h3 style="margin-top:10px">' + esc(c.name) + '</h3><div class="price">' + moneyHTML(Math.abs(c.amount)) + '</div>' +
        '<p class="meta">' + esc(intervalLabel(c)) + ' · nächste Abbuchung ' + esc(formatDate(c.nextDate)) + '</p>' +
        (badges ? '<div class="badge-row">' + badges + '</div>' : '') + '</article>';
    }).join('');
    return pageHead('Fixkosten & Abos', esc(list.length + ' Verträge · ' + contextLabel())) +
      '<div class="totals"><article class="kpi"><span class="k">Pro Monat</span><div class="v">' + moneyHTML(Math.abs(month)) + '</div><div class="sub">umgerechnet</div></article>' +
        '<article class="kpi"><span class="k">Pro Jahr</span><div class="v">' + moneyHTML(Math.abs(year)) + '</div><div class="sub">alle Intervalle</div></article></div>' +
      '<div class="split-2"><section class="card"><div class="card-head"><h2>Oktober 2026</h2><span class="aside">Abbuchung · Frist</span></div>' + calendarHTML() + '</section>' +
        '<section class="card"><div class="card-head"><h2>Am gewählten Tag</h2></div>' + calendarDetail() + '</section></div>' +
      '<div class="contracts" style="margin-top:12px">' + cards + '</div>';
  }

  function calendarHTML() {
    var firstDow = new Date(Date.UTC(2026, 9, 1)).getUTCDay();
    var lead = (firstDow + 6) % 7;
    var days = K.daysInMonth(2026, 10);
    var marks = calendarMarks();
    var cells = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(function (d) {
      return '<div class="dow">' + d + '</div>';
    }).join('');
    var i;
    for (i = 0; i < lead; i++) cells += '<div></div>';
    for (i = 1; i <= days; i++) {
      var key = '2026-10-' + pad(i);
      var dots = '';
      if (marks.charges[i]) dots += '<i></i>';
      if (marks.deadlines[i]) dots += '<i class="dead"></i>';
      var cls = 'day' + (key === K.TODAY ? ' today' : '') ;
      cells += '<button type="button" class="' + cls + '" data-act="cal" data-day="' + key + '" aria-pressed="' + (state.calDay === key ? 'true' : 'false') + '" aria-label="' + esc(formatDate(key)) + '">' + i + (dots ? '<span class="dots">' + dots + '</span>' : '') + '</button>';
    }
    return '<div class="cal">' + cells + '</div>';
  }
  function calendarMarks() {
    var charges = {};
    var deadlines = {};
    contractsInContext().forEach(function (c) {
      if (c.nextDate && c.nextDate.slice(0, 7) === '2026-10') {
        var d = +c.nextDate.slice(8, 10);
        charges[d] = charges[d] || [];
        charges[d].push(c);
      }
      if (c.cancelBy && c.cancelBy.slice(0, 7) === '2026-10') {
        var d2 = +c.cancelBy.slice(8, 10);
        deadlines[d2] = deadlines[d2] || [];
        deadlines[d2].push(c);
      }
    });
    return { charges: charges, deadlines: deadlines };
  }
  function calendarDetail() {
    var marks = calendarMarks();
    var day = state.calDay ? +state.calDay.slice(8, 10) : 0;
    var charges = marks.charges[day] || [];
    var deadlines = marks.deadlines[day] || [];
    if (!state.calDay) return '<p class="empty">Tag wählen.</p>';
    var html = '<p class="lede" style="margin-top:0">' + esc(formatDate(state.calDay)) + '</p>';
    if (!charges.length && !deadlines.length) html += '<p class="empty">Keine Abbuchung und keine Frist.</p>';
    if (charges.length) {
      html += '<ul class="plain-list">' + charges.map(function (c) {
        return '<li><span class="grow">' + esc(c.name) + '<small>Abbuchung</small></span>' + moneyHTML(c.amount, true) + '</li>';
      }).join('') + '</ul>';
    }
    if (deadlines.length) {
      html += '<ul class="plain-list">' + deadlines.map(function (c) {
        return '<li><span class="grow">' + esc(c.name) + '<small>Kündigungsfrist</small></span></li>';
      }).join('') + '</ul>';
    }
    html += '<p class="sub">Messing: Abbuchung. Rot: Kündigungsfrist.</p>';
    return html;
  }

  function analyseHTML() {
    var rows = rowsInScope();
    var sum = K.summarize(rows);
    var rate = sparrate(sum);
    var top = null;
    Object.keys(sum.byCategory).forEach(function (id) {
      if (!top || sum.byCategory[id] < top.amount) top = { id: id, amount: sum.byCategory[id] };
    });
    var keys = K.monthKeysEnding(state.range.to, 12);
    var best = null;
    keys.forEach(function (key) {
      var exp = Math.abs(monthSummary(key).expense);
      if (!best || exp > best.exp) best = { key: key, exp: exp };
    });
    var cats = Object.keys(sum.byCategory).map(function (id) {
      return { id: id, amount: sum.byCategory[id] };
    }).sort(function (a, b) { return a.amount - b.amount; }).slice(0, 4);
    var lines = cats.map(function (c) {
      return '<div class="stat-line"><span>' + esc(K.cat(c.id).label) + '</span>' + moneyHTML(c.amount, true) + '<span></span></div>';
    }).join('');
    return pageHead('Analyse', 'Ein kurzer Schnitt durch den gewählten Zeitraum. Ausführliche Berichte folgen später.') +
      '<div class="card"><div class="stat-line"><span>Buchungen</span><strong>' + rows.length + '</strong><span></span></div>' +
        '<div class="stat-line"><span>Sparrate</span><strong class="m">' + (rate == null ? '—' : esc(pctFmt.format(rate)) + ' %') + '</strong><span></span></div>' +
        '<div class="stat-line"><span>Größte Kategorie</span><strong>' + (top ? esc(K.cat(top.id).label) : '—') + '</strong>' + (top ? moneyHTML(top.amount, true) : '<span>—</span>') + '</div>' +
        '<div class="stat-line"><span>Stärkster Ausgabenmonat, 12 Monate</span><strong>' + (best ? esc(formatMonth(best.key)) : '—') + '</strong>' + (best ? moneyHTML(-best.exp, true) : '<span>—</span>') + '</div>' +
        lines +
        '<p class="sub">Verläufe je Kategorie, Budgetalarme und Exporte sind in dieser Vorschau nicht ausgebaut.</p></div>';
  }

  function importHTML() {
    var latest = state.importHistory[0];
    var staged = '';
    if (state.importBusy) {
      staged = '<div class="card"><h2>Prüfung läuft</h2><p class="lede">' + esc(state.importName || 'Datei') + ' wird gelesen …</p></div>';
    } else if (state.importStaged) {
      var s = state.importStaged;
      staged = '<section class="card"><div class="card-head"><h2>Vorschau</h2><span class="aside">' + esc(s.file) + '</span></div>' +
        '<div class="preview-counts"><div><span class="k">Neu</span><strong>' + s.neu + '</strong></div><div><span class="k">Dubletten</span><strong>' + s.dup + '</strong></div><div><span class="k">Unklar</span><strong>' + s.unklar + '</strong></div></div>' +
        '<p class="lede">142 neu · 8 Dubletten · 12 unklar — eine lokale Simulation. Die Buchungsliste bleibt unverändert.</p>' +
        '<div class="row-actions"><button type="button" class="btn btn-primary" data-act="adopt">Übernehmen</button><button type="button" class="btn" data-act="discard">Verwerfen</button></div></section>';
    }
    var history = state.importHistory.length ? state.importHistory.map(function (h) {
      return '<li><div><strong>' + esc(h.source) + '</strong><div class="meta">' + esc(formatStamp(h.at)) + ' · ' + h.neu + ' neu · ' + h.dup + ' Dubletten · ' + h.unklar + ' unklar</div></div>' +
        '<button type="button" class="btn" data-act="undo" data-id="' + esc(h.id) + '">Rückgängig</button></li>';
    }).join('') : '<li><span class="meta">Noch keine Importe.</span></li>';
    return pageHead('Import', 'CSV, CAMT oder PDF. Nichts verlässt diesen Browser.') +
      '<div class="stack"><div id="drop" class="drop"><strong>Datei hierher ziehen</strong><p class="lede">CSV, CAMT/XML oder PDF</p>' +
        '<button type="button" class="btn" data-act="pick-file">Datei wählen</button>' +
        '<input id="file-input" type="file" hidden accept=".csv,.xml,.pdf,.camt,text/csv,application/pdf,text/xml"></div>' +
        staged +
        '<section class="card folder"><div><span class="k">Überwachter Ordner</span><strong style="display:block;margin-top:4px">Dokumente/Bank/Eingang</strong>' +
          '<div class="meta">Zuletzt importiert: ' + (latest ? esc(formatStamp(latest.at)) : 'noch nie') + '</div></div><span class="ok">Aktiv</span></section>' +
        '<section class="card"><div class="card-head"><h2>Verlauf</h2></div><ul class="history">' + history + '</ul></section></div>';
  }

  function settingsHTML() {
    var rules = state.rules.length
      ? '<ul class="rule-list">' + state.rules.map(function (r) {
        return '<li>' + esc(r.merchant) + ' → ' + esc(K.cat(r.category).label) + ' · ' + esc(K.ctx(r.context).label) + '</li>';
      }).join('') + '</ul>'
      : '<p class="lede">Noch keine Regeln in dieser Sitzung.</p>';
    return pageHead('Einstellungen', 'Vorschau ohne Anmeldung und ohne Bankverbindung.') +
      '<section class="card"><div class="setting"><div><strong>Darstellung</strong><p class="lede">Gilt für diese Sitzung.</p></div><div class="row-actions">' +
        '<button type="button" class="btn' + (state.theme === 'dark' ? ' btn-primary' : '') + '" data-act="set-theme" data-theme="dark" aria-pressed="' + (state.theme === 'dark') + '">Dunkel</button>' +
        '<button type="button" class="btn' + (state.theme === 'light' ? ' btn-primary' : '') + '" data-act="set-theme" data-theme="light" aria-pressed="' + (state.theme === 'light') + '">Hell</button></div></div>' +
        '<div class="setting"><div><strong>Beträge</strong><p class="lede">Blendet Summen aus, zum Beispiel unterwegs.</p></div>' +
          '<button type="button" class="btn" data-act="toggle-privacy" aria-pressed="' + (state.privacy ? 'true' : 'false') + '">' + (state.privacy ? 'Beträge zeigen' : 'Beträge verbergen') + '</button></div>' +
        '<div class="setting"><div><strong>Profil</strong><p class="lede">Iku · Deutsch · Euro</p></div><span class="meta">lokal</span></div>' +
        '<div class="setting"><div><strong>Bankverbindungen</strong><p class="lede">In dieser Vorschau nicht verbunden.</p></div><span class="meta">Commerzbank, DKB, N26</span></div>' +
        '<div class="setting"><div><strong>Regeln</strong>' + rules + '</div><button type="button" class="btn" data-act="rule-example">Beispielregel</button></div></section>';
  }

  function go(screen, opts) {
    if (!isScreen(screen)) return;
    closeMenu();
    closeRange();
    if (state.paletteOpen) closePalette();
    state.panelId = null;
    state.sidebarOpen = false;
    state.screen = screen;
    if (location.hash !== '#' + screen) {
      state.suppressHash = true;
      location.hash = screen;
    }
    render();
    if (!opts || !opts.keepFocus) {
      var main = document.getElementById('screen');
      if (main) main.focus();
    }
  }
  function setContext(id) {
    state.context = id;
    syncContext();
    render();
  }
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    if (state.screen === 'einstellungen') render();
  }
  function togglePrivacy() {
    state.privacy = !state.privacy;
    applyPrivacy();
    if (state.screen === 'einstellungen') render();
  }

  function openPalette() {
    if (state.ruleOpen) closeRule();
    state.paletteOpen = true;
    state.paletteQ = '';
    state.paletteIndex = 0;
    state.paletteReturn = document.activeElement;
    var ov = document.getElementById('palette');
    ov.hidden = false;
    var input = document.getElementById('palette-input');
    input.value = '';
    renderPaletteList();
    input.focus();
  }
  function closePalette() {
    if (!state.paletteOpen) return;
    state.paletteOpen = false;
    document.getElementById('palette').hidden = true;
    if (state.paletteReturn && state.paletteReturn.focus) {
      try { state.paletteReturn.focus(); } catch (err) { /* ignore */ }
    }
  }
  function paletteEntries() {
    var pages = [
      { group: 'Seiten', title: 'Übersicht', hint: 'Kennzahlen', keys: 'home dashboard', run: function () { go('uebersicht'); } },
      { group: 'Seiten', title: 'Smart Inbox', hint: 'Offene Umsätze', keys: 'inbox prüfen', run: function () { go('inbox'); } },
      { group: 'Seiten', title: 'Buchungen', hint: 'Liste und Filter', keys: 'umsätze transaktionen', run: function () { go('buchungen'); } },
      { group: 'Seiten', title: 'Händler-Suche', hint: 'Anbieter', keys: 'haendler anbieter suche', run: function () { go('haendler'); } },
      { group: 'Seiten', title: 'Fixkosten & Abos', hint: 'Verträge', keys: 'abo miete', run: function () { go('fixkosten'); } },
      { group: 'Seiten', title: 'Analyse', hint: 'Kurzüberblick', keys: 'report', run: function () { go('analyse'); } },
      { group: 'Seiten', title: 'Import', hint: 'CSV, CAMT, PDF', keys: 'datei', run: function () { go('import'); } },
      { group: 'Seiten', title: 'Einstellungen', hint: 'Darstellung', keys: 'settings', run: function () { go('einstellungen'); } }
    ];
    var actions = [
      { group: 'Aktionen', title: 'Regel erstellen', hint: 'Beispiel: REWE → Lebensmittel', keys: 'rule kategorie', run: openRuleExample },
      { group: 'Aktionen', title: state.privacy ? 'Beträge zeigen' : 'Beträge verbergen', hint: 'Privatsphäre', keys: 'blur privacy', run: togglePrivacy },
      { group: 'Aktionen', title: state.theme === 'dark' ? 'Helles Design' : 'Dunkles Design', hint: 'Darstellung', keys: 'theme hell dunkel', run: toggleTheme },
      { group: 'Aktionen', title: 'Smart Inbox öffnen', hint: inboxStats().pending.length + ' offen', keys: 'prüfen', run: function () { go('inbox'); } }
    ];
    var seen = {};
    var merchants = [];
    state.txns.forEach(function (tx) {
      if (seen[tx.merchant]) return;
      seen[tx.merchant] = true;
      merchants.push(tx.merchant);
    });
    merchants.sort(function (a, b) { return a.localeCompare(b, 'de'); });
    var merchantItems = merchants.map(function (name) {
      return {
        group: 'Händler',
        title: name,
        hint: 'Suche öffnen',
        keys: 'merchant',
        run: function () {
          state.merchantQuery = name;
          go('haendler', { keepFocus: true });
          var input = document.getElementById('merchant-q');
          if (input) input.focus();
        }
      };
    });
    var q = state.paletteQ.trim().toLowerCase();
    var all = pages.concat(actions).concat(merchantItems);
    if (!q) {
      var featured = ['Uber', 'REWE', 'Edeka', 'Spotify', 'Nordlicht GmbH', 'Deutsche Bahn'];
      var feat = merchantItems.filter(function (item) { return featured.indexOf(item.title) !== -1; });
      return pages.concat(actions).concat(feat);
    }
    return all.filter(function (item) {
      return (item.title + ' ' + (item.hint || '') + ' ' + (item.keys || '') + ' ' + item.group).toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) {
      function score(item) {
        var t = item.title.toLowerCase();
        if (t === q) return 0;
        if (t.indexOf(q) === 0) return 1;
        if (item.group === 'Händler') return 2;
        return 3;
      }
      return score(a) - score(b);
    }).slice(0, 18);
  }
  function renderPaletteList() {
    var items = paletteEntries();
    if (state.paletteIndex >= items.length) state.paletteIndex = Math.max(0, items.length - 1);
    if (state.paletteIndex < 0) state.paletteIndex = 0;
    var ul = document.getElementById('palette-list');
    var input = document.getElementById('palette-input');
    if (!items.length) {
      ul.innerHTML = '<li class="group">Nichts gefunden</li>';
      input.setAttribute('aria-activedescendant', '');
      return;
    }
    var html = '';
    var current = '';
    items.forEach(function (item, i) {
      if (item.group !== current) {
        current = item.group;
        html += '<li class="group" role="presentation">' + esc(item.group) + '</li>';
      }
      html += '<li role="option" id="pal-' + i + '" data-pal="' + i + '" aria-selected="' + (i === state.paletteIndex ? 'true' : 'false') + '"><span>' + esc(item.title) + '</span><small>' + esc(item.hint || '') + '</small></li>';
    });
    ul.innerHTML = html;
    input.setAttribute('aria-activedescendant', 'pal-' + state.paletteIndex);
    var sel = document.getElementById('pal-' + state.paletteIndex);
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }
  function activatePalette(index) {
    var items = paletteEntries();
    var item = items[index];
    if (!item) return;
    closePalette();
    item.run();
  }

  function openRuleWith(example) {
    if (state.paletteOpen) closePalette();
    state.ruleOpen = true;
    document.getElementById('rule-overlay').hidden = false;
    document.getElementById('rule-merchant').value = example.merchant || '';
    document.getElementById('rule-category').value = example.category || 'lebensmittel';
    document.getElementById('rule-context').value = example.context || 'privat';
    document.getElementById('rule-merchant').focus();
  }
  function openRuleExample() {
    openRuleWith({ merchant: 'REWE', category: 'lebensmittel', context: 'privat' });
  }
  function closeRule() {
    if (!state.ruleOpen) return;
    state.ruleOpen = false;
    document.getElementById('rule-overlay').hidden = true;
  }
  function saveRule(e) {
    e.preventDefault();
    var merchant = document.getElementById('rule-merchant').value.trim();
    if (!merchant) return;
    state.rules.push({
      merchant: merchant,
      category: document.getElementById('rule-category').value,
      context: document.getElementById('rule-context').value
    });
    closeRule();
    toast('Regel gespeichert');
    if (state.screen === 'einstellungen') render();
  }

  function closeMenu() {
    state.menu = null;
    var menu = document.getElementById('menu');
    menu.hidden = true;
    menu.innerHTML = '';
  }
  function openMenu(anchor, items) {
    state.menu = { items: items };
    var menu = document.getElementById('menu');
    menu.innerHTML = items.map(function (item, i) {
      return '<button type="button" role="menuitem" data-menu-i="' + i + '">' + esc(item.label) + '</button>';
    }).join('');
    menu.hidden = false;
    var rect = anchor.getBoundingClientRect();
    menu.style.top = (rect.bottom + 6) + 'px';
    menu.style.left = rect.left + 'px';
    var mw = menu.offsetWidth;
    var mh = menu.offsetHeight;
    if (rect.left + mw > window.innerWidth - 8) menu.style.left = Math.max(8, window.innerWidth - mw - 8) + 'px';
    if (rect.bottom + 6 + mh > window.innerHeight - 8) menu.style.top = Math.max(8, rect.top - mh - 6) + 'px';
    var first = menu.querySelector('button');
    if (first) first.focus();
  }
  function choiceMenu(anchor, list, onPick) {
    openMenu(anchor, list.map(function (item) {
      return { label: item.label, run: function () { onPick(item.id); } };
    }));
  }

  function closeRange() {
    state.rangeOpen = false;
    document.getElementById('range-pop').hidden = true;
    document.getElementById('range-btn').setAttribute('aria-expanded', 'false');
  }
  function ensureRangePop() {
    if (state.rangeBuilt) return;
    var presets = PRESETS.map(function (p) {
      return '<button type="button" class="preset" role="radio" data-preset="' + p.id + '">' + esc(p.label) + '</button>';
    }).join('');
    document.getElementById('range-pop').innerHTML = presets +
      '<div class="field-row"><label class="field">Von<input id="range-from" type="date" min="2025-01-01" max="2026-10-05"></label>' +
      '<label class="field">Bis<input id="range-to" type="date" min="2025-01-01" max="2026-10-05"></label></div>' +
      '<div class="dialog-actions"><button type="button" class="btn btn-primary" id="range-apply">Übernehmen</button></div>';
    state.rangeBuilt = true;
  }
  function toggleRange() {
    if (state.rangeOpen) { closeRange(); return; }
    ensureRangePop();
    state.rangeOpen = true;
    var pop = document.getElementById('range-pop');
    var btn = document.getElementById('range-btn');
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.querySelectorAll('#range-pop .preset').forEach(function (el) {
      el.setAttribute('aria-checked', el.dataset.preset === state.range.id ? 'true' : 'false');
    });
    document.getElementById('range-from').value = state.range.from;
    document.getElementById('range-to').value = state.range.to;
    var rect = btn.getBoundingClientRect();
    pop.style.top = (rect.bottom + 6) + 'px';
    var left = Math.min(rect.left, window.innerWidth - pop.offsetWidth - 8);
    pop.style.left = Math.max(8, left) + 'px';
  }
  function applyPreset(id) {
    var preset = null;
    PRESETS.forEach(function (p) { if (p.id === id) preset = p; });
    if (!preset) return;
    state.range = { id: preset.id, from: preset.from, to: preset.to, label: preset.label };
    closeRange();
    render();
  }
  function applyCustomRange() {
    var from = document.getElementById('range-from').value;
    var to = document.getElementById('range-to').value;
    if (!from || !to || from > to) { toast('Zeitraum ungültig'); return; }
    state.range = { id: 'custom', from: from, to: to, label: '' };
    closeRange();
    render();
  }

  function confirmInbox(id) {
    var idx = -1;
    state.inbox.forEach(function (item, i) { if (item.id === id) idx = i; });
    if (idx < 0) return;
    var item = state.inbox[idx];
    state.inbox.splice(idx, 1);
    state.reviewed[item.context] = (state.reviewed[item.context] || 0) + 1;
    state.txns.push({
      id: item.id,
      merchant: item.merchant,
      date: item.date,
      amount: item.amount,
      category: item.category,
      context: item.context,
      account: item.account,
      note: item.note || '',
      tags: item.tags ? item.tags.slice() : [],
      parts: null
    });
    if (state.editingInbox === id) state.editingInbox = null;
    toast('Umsatz bestätigt');
    render();
  }
  function saveInboxEdit(id) {
    var item = findInbox(id);
    var amt = parseEuro(document.getElementById('edit-amt').value);
    if (!item || amt == null) { toast('Betrag nicht lesbar'); return; }
    item.category = document.getElementById('edit-cat').value;
    item.context = document.getElementById('edit-ctx').value;
    item.amount = amt;
    item.auto = false;
    state.editingInbox = null;
    toast('Vorschlag angepasst');
    render();
  }

  function selectedIds() {
    return Object.keys(state.buchungen.selected).filter(function (id) { return state.buchungen.selected[id]; });
  }
  function applyToSelected(fn) {
    var cleared = false;
    selectedIds().forEach(function (id) {
      var tx = findTx(id);
      if (!tx) return;
      if (tx.parts) cleared = true;
      tx.parts = null;
      fn(tx);
    });
    if (cleared) toast('Teilungen aufgehoben');
    render();
  }
  function openPanel(id) {
    var tx = findTx(id);
    if (!tx) return;
    if (state.panelId !== id) state.splitDraft = draftFrom(tx);
    state.panelId = id;
    render();
  }
  function updateSplitHint() {
    var tx = findTx(state.panelId);
    var hint = document.getElementById('split-hint');
    if (tx && hint) hint.textContent = splitHint(tx);
  }
  function applySplit() {
    var tx = findTx(state.panelId);
    if (!tx || !state.splitDraft) return;
    var a = parseEuro(state.splitDraft[0].amount);
    var b = parseEuro(state.splitDraft[1].amount);
    if (a == null || b == null || a < 0 || b < 0) { toast('Bitte positive Teilbeträge'); return; }
    if (a + b !== Math.abs(tx.amount)) { toast('Die Teile müssen den Umsatz ergeben'); return; }
    var sign = tx.amount < 0 ? -1 : 1;
    tx.parts = [
      { amount: sign * a, category: state.splitDraft[0].category, context: state.splitDraft[0].context },
      { amount: sign * b, category: state.splitDraft[1].category, context: state.splitDraft[1].context }
    ];
    toast('Teilung gespeichert');
    render();
  }

  function stageFile(file) {
    var name = file.name || 'import.csv';
    if (!/\.(csv|xml|pdf|camt)$/i.test(name)) {
      toast('Bitte eine CSV-, CAMT/XML- oder PDF-Datei');
      return;
    }
    state.importBusy = true;
    state.importName = name;
    render();
    clearTimeout(state.importTimer);
    state.importTimer = setTimeout(function () {
      state.importBusy = false;
      state.importStaged = { file: name, neu: 142, dup: 8, unklar: 12 };
      toast('Prüfung abgeschlossen');
      render();
    }, 650);
  }
  function adoptImport() {
    if (!state.importStaged) return;
    var minute = state.importMinute++;
    state.importHistory.unshift({
      id: 'h' + Date.now(),
      at: '2026-10-05T18:' + pad(minute) + ':00',
      source: state.importStaged.file,
      neu: state.importStaged.neu,
      dup: state.importStaged.dup,
      unklar: state.importStaged.unklar
    });
    state.importStaged = null;
    toast('Import übernommen');
    render();
  }

  function handleAct(el, event) {
    var act = el.dataset.act;
    var id = el.dataset.id;
    if (act === 'confirm') { confirmInbox(id); return; }
    if (act === 'edit') { state.editingInbox = id; render(); return; }
    if (act === 'cancel-edit') { state.editingInbox = null; render(); return; }
    if (act === 'save-edit') { saveInboxEdit(id); return; }
    if (act === 'rule') {
      var item = findInbox(id);
      if (item) openRuleWith({ merchant: item.merchant, category: item.category, context: item.context });
      return;
    }
    if (act === 'rule-example') { openRuleExample(); return; }
    if (act === 'merchant') {
      state.merchantQuery = el.dataset.merchant || '';
      go('haendler', { keepFocus: true });
      var mq = document.getElementById('merchant-q');
      if (mq) mq.focus();
      return;
    }
    if (act === 'kind') { state.buchungen.kind = el.dataset.kind; render(); return; }
    if (act === 'filter-cat') {
      var cat = el.dataset.cat;
      var idx = state.buchungen.categories.indexOf(cat);
      if (idx === -1) state.buchungen.categories.push(cat);
      else state.buchungen.categories.splice(idx, 1);
      render();
      return;
    }
    if (act === 'filter-account') { state.buchungen.account = el.dataset.account || ''; render(); return; }
    if (act === 'sort') {
      if (state.buchungen.sort === el.dataset.sort) state.buchungen.dir = state.buchungen.dir === 'asc' ? 'desc' : 'asc';
      else { state.buchungen.sort = el.dataset.sort; state.buchungen.dir = el.dataset.sort === 'amount' ? 'desc' : 'desc'; }
      render();
      return;
    }
    if (act === 'toggle') {
      if (state.buchungen.selected[id]) delete state.buchungen.selected[id];
      else state.buchungen.selected[id] = true;
      render();
      return;
    }
    if (act === 'select-all') {
      var opt = {
        from: state.range.from, to: state.range.to, context: state.context,
        kind: state.buchungen.kind === 'alle' ? '' : state.buchungen.kind,
        categories: state.buchungen.categories, account: state.buchungen.account, q: state.buchungen.q
      };
      var visible = K.selectRows(state.txns, opt);
      var allOn = visible.length && visible.every(function (r) { return state.buchungen.selected[r.tx.id]; });
      visible.forEach(function (r) {
        if (allOn) delete state.buchungen.selected[r.tx.id];
        else state.buchungen.selected[r.tx.id] = true;
      });
      render();
      return;
    }
    if (act === 'bulk-clear') { state.buchungen.selected = {}; render(); return; }
    if (act === 'bulk-cat') {
      choiceMenu(el, K.CATEGORIES, function (catId) {
        applyToSelected(function (tx) { tx.category = catId; });
        toast('Kategorie gesetzt');
      });
      return;
    }
    if (act === 'bulk-ctx') {
      choiceMenu(el, K.CONTEXTS, function (ctxId) {
        applyToSelected(function (tx) { tx.context = ctxId; });
        toast('Kontext gesetzt');
      });
      return;
    }
    if (act === 'edit-cat') {
      var txc = findTx(id);
      if (txc && txc.parts) { openPanel(id); return; }
      choiceMenu(el, K.CATEGORIES, function (catId) {
        var tx = findTx(id);
        if (!tx) return;
        tx.category = catId;
        render();
      });
      return;
    }
    if (act === 'edit-ctx') {
      var txx = findTx(id);
      if (txx && txx.parts) { openPanel(id); return; }
      choiceMenu(el, K.CONTEXTS, function (ctxId) {
        var tx = findTx(id);
        if (!tx) return;
        tx.context = ctxId;
        render();
      });
      return;
    }
    if (act === 'open') { openPanel(id); return; }
    if (act === 'close-panel') { state.panelId = null; render(); return; }
    if (act === 'apply-split') { applySplit(); return; }
    if (act === 'clear-split') {
      var tx = findTx(state.panelId);
      if (tx) { tx.parts = null; state.splitDraft = draftFrom(tx); toast('Teilung aufgehoben'); render(); }
      return;
    }
    if (act === 'untag') {
      var tagged = findTx(state.panelId);
      if (tagged) tagged.tags = (tagged.tags || []).filter(function (tag) { return tag !== el.dataset.tag; });
      render();
      return;
    }
    if (act === 'cal') { state.calDay = el.dataset.day; render(); return; }
    if (act === 'pick-file') {
      var input = document.getElementById('file-input');
      if (input) input.click();
      return;
    }
    if (act === 'adopt') { adoptImport(); return; }
    if (act === 'discard') { state.importStaged = null; render(); return; }
    if (act === 'undo') {
      state.importHistory = state.importHistory.filter(function (h) { return h.id !== id; });
      toast('Import rückgängig gemacht');
      render();
      return;
    }
    if (act === 'set-theme') {
      state.theme = el.dataset.theme === 'light' ? 'light' : 'dark';
      applyTheme();
      render();
      return;
    }
    if (act === 'toggle-privacy') { togglePrivacy(); render(); return; }
    if (event) event.preventDefault();
  }

  function onClick(e) {
    var t = e.target;
    if (t.closest && t.closest('#search-btn')) { openPalette(); return; }
    if (t.closest && t.closest('#theme-btn')) { toggleTheme(); return; }
    if (t.closest && t.closest('#privacy-btn')) { togglePrivacy(); return; }
    if (t.closest && t.closest('#menu-btn')) {
      state.sidebarOpen = !state.sidebarOpen;
      applySidebar();
      return;
    }
    if (t.closest && t.closest('#scrim')) { state.sidebarOpen = false; applySidebar(); return; }
    if (t.closest && t.closest('#range-btn')) { toggleRange(); return; }
    if (t.closest && t.closest('#range-apply')) { applyCustomRange(); return; }
    var preset = t.closest && t.closest('[data-preset]');
    if (preset) { applyPreset(preset.dataset.preset); return; }
    var ctxBtn = t.closest && t.closest('#context-pill [data-ctx]');
    if (ctxBtn) { setContext(ctxBtn.dataset.ctx); return; }
    var pal = t.closest && t.closest('[data-pal]');
    if (pal) { activatePalette(+pal.dataset.pal); return; }
    if (t.id === 'palette') { closePalette(); return; }
    if (t.id === 'rule-overlay') { closeRule(); return; }
    if (t.closest && t.closest('#rule-cancel')) { closeRule(); return; }
    var menuBtn = t.closest && t.closest('[data-menu-i]');
    if (menuBtn && state.menu) {
      var item = state.menu.items[+menuBtn.dataset.menuI];
      closeMenu();
      if (item) item.run();
      return;
    }
    var goBtn = t.closest && t.closest('[data-go]');
    if (goBtn) { go(goBtn.dataset.go); return; }
    var actEl = t.closest && t.closest('[data-act]');
    if (actEl) { handleAct(actEl, e); return; }
    if (state.menu && !(t.closest && t.closest('#menu'))) closeMenu();
    if (state.rangeOpen && !(t.closest && t.closest('#range-pop')) && !(t.closest && t.closest('#range-btn'))) closeRange();
  }

  function onKey(e) {
    var key = e.key;
    if ((e.metaKey || e.ctrlKey) && (key === 'k' || key === 'K')) {
      e.preventDefault();
      if (state.paletteOpen) closePalette();
      else openPalette();
      return;
    }
    if (key === 'Enter' && e.target && e.target.id === 'tag-input') {
      e.preventDefault();
      var tx = findTx(state.panelId);
      var tag = e.target.value.trim().toLowerCase();
      if (tx && tag && (tx.tags || []).indexOf(tag) === -1) {
        tx.tags = tx.tags || [];
        tx.tags.push(tag);
      }
      render();
      return;
    }
    if (state.paletteOpen && (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter')) {
      var items = paletteEntries();
      if (key === 'ArrowDown') {
        e.preventDefault();
        state.paletteIndex = Math.min(items.length - 1, state.paletteIndex + 1);
        renderPaletteList();
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        state.paletteIndex = Math.max(0, state.paletteIndex - 1);
        renderPaletteList();
      } else if (key === 'Enter') {
        e.preventDefault();
        activatePalette(state.paletteIndex);
      }
      return;
    }
    if (key === 'Escape') {
      if (state.paletteOpen) { closePalette(); return; }
      if (state.ruleOpen) { closeRule(); return; }
      if (state.menu) { closeMenu(); return; }
      if (state.rangeOpen) { closeRange(); return; }
      if (state.panelId) { state.panelId = null; render(); return; }
      if (state.sidebarOpen) { state.sidebarOpen = false; applySidebar(); return; }
    }
  }

  function trap(e, root) {
    if (e.key !== 'Tab' || !root || root.hidden) return;
    var nodes = Array.prototype.slice.call(root.querySelectorAll('input, select, button, textarea')).filter(function (el) {
      return !el.disabled && el.tabIndex !== -1;
    });
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function init() {
    document.getElementById('menu-btn').innerHTML = icon('menu');
    document.querySelector('.search-ico').innerHTML = icon('search');
    document.getElementById('search-kbd').textContent = mac ? '⌘K' : 'Strg K';
    document.getElementById('search-btn').setAttribute('aria-label', 'Suche oder Befehl, ' + (mac ? 'Befehlstaste K' : 'Steuerung K'));
    document.getElementById('rule-category').innerHTML = optionsHTML(K.CATEGORIES, 'lebensmittel');
    document.getElementById('rule-context').innerHTML = optionsHTML(K.CONTEXTS, 'privat');
    applyTheme();
    applyPrivacy();
    var hash = (location.hash || '').replace('#', '');
    if (isScreen(hash)) state.screen = hash;
    render();
    document.body.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.getElementById('palette').addEventListener('keydown', function (e) { trap(e, document.querySelector('.palette')); });
    document.getElementById('rule-form').addEventListener('keydown', function (e) { trap(e, document.getElementById('rule-form')); });
    document.getElementById('rule-form').addEventListener('submit', saveRule);
    document.getElementById('palette-input').addEventListener('input', function (e) {
      state.paletteQ = e.target.value;
      state.paletteIndex = 0;
      renderPaletteList();
    });
    document.addEventListener('input', function (e) {
      if (e.target.id === 'merchant-q') {
        state.merchantQuery = e.target.value;
        var mbox = document.getElementById('merchant-results');
        if (mbox) mbox.innerHTML = merchantResultsHTML();
        else render();
      } else if (e.target.id === 'buch-q') {
        state.buchungen.q = e.target.value;
        var bbox = document.getElementById('buch-results');
        if (bbox) {
          bbox.innerHTML = buchResultsInner();
          var lede = document.querySelector('#screen .page-head .lede');
          if (lede) lede.textContent = buchResultsInner.count + ' Umsätze · ' + prettyRange(state.range.from, state.range.to) + ' · ' + contextLabel();
        } else render();
      } else if (e.target.id === 'note-field') {
        var tx = findTx(state.panelId);
        if (tx) tx.note = e.target.value;
      } else if (e.target.dataset && e.target.dataset.splitField === 'amount') {
        var line = state.splitDraft && state.splitDraft[+e.target.dataset.splitI];
        if (line) { line.amount = e.target.value; updateSplitHint(); }
      }
    });
    document.addEventListener('change', function (e) {
      if (e.target.id === 'file-input' && e.target.files && e.target.files[0]) {
        stageFile(e.target.files[0]);
        e.target.value = '';
        return;
      }
      if (e.target.dataset && e.target.dataset.splitField && e.target.dataset.splitField !== 'amount') {
        var line = state.splitDraft && state.splitDraft[+e.target.dataset.splitI];
        if (line) line[e.target.dataset.splitField] = e.target.value;
      }
    });
    document.addEventListener('dragover', function (e) {
      var zone = e.target.closest && e.target.closest('#drop');
      if (!zone) return;
      e.preventDefault();
      zone.classList.add('hot');
    });
    document.addEventListener('dragleave', function (e) {
      var zone = e.target.closest && e.target.closest('#drop');
      if (zone) zone.classList.remove('hot');
    });
    document.addEventListener('drop', function (e) {
      var zone = e.target.closest && e.target.closest('#drop');
      if (!zone) return;
      e.preventDefault();
      zone.classList.remove('hot');
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) stageFile(file);
    });
    window.addEventListener('hashchange', function () {
      if (state.suppressHash) { state.suppressHash = false; return; }
      var id = (location.hash || '').replace('#', '');
      if (!isScreen(id)) return;
      state.screen = id;
      state.panelId = null;
      state.sidebarOpen = false;
      render();
    });
  }

  init();
})();
