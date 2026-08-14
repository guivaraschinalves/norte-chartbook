(function () {
  "use strict";

  function el(tag, className) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  /* ============================== CSV loading (stat strip only) ============================== */
  function parseCSV(text) {
    var rows = [], row = [], field = "", inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ""; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === '\r') { /* skip */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    var headers = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1)
      .filter(function (r) { return r.some(function (c) { return c.trim() !== ""; }); })
      .map(function (r) {
        var obj = {};
        headers.forEach(function (h, idx) { obj[h] = (r[idx] || "").trim(); });
        return obj;
      });
  }

  function parseNum(raw) {
    if (raw === null || raw === undefined) return NaN;
    var s = String(raw).trim();
    if (s === "") return NaN;
    var negative = /^\(.*\)$/.test(s);
    s = s.replace(/[()]/g, "");
    s = s.replace(/[^\d.,\-+]/g, "");
    if (s === "") return NaN;
    if (/,\d{1,3}$/.test(s) && s.indexOf(".") !== -1) s = s.replace(/\./g, "").replace(",", ".");
    else if (/,\d{1,3}$/.test(s)) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
    var n = parseFloat(s);
    return negative ? -Math.abs(n) : n;
  }

  async function fetchCsvRows(url) {
    var res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var text = await res.text();
    var rows = parseCSV(text);
    if (!rows.length) throw new Error("Planilha vazia");
    return rows;
  }

  function alignSeries(rows, keys) {
    var SC = window.SERIES_CONFIG || {};
    var dateCol = window.DATE_COLUMN || "Data";
    var cols = keys.map(function (k) { return SC[k]; });
    var dates = [];
    var values = {};
    keys.forEach(function (k) { values[k] = []; });
    rows.forEach(function (r) {
      var parsed = cols.map(function (c) { return parseNum(r[c.column]); });
      if (parsed.every(function (v) { return !isNaN(v); })) {
        dates.push(r[dateCol]);
        keys.forEach(function (k, i) { values[k].push(parsed[i]); });
      }
    });
    return { dates: dates, values: values };
  }

  // Small offline fallback so the stat strip never shows a blank/broken row
  // if the sheet can't be reached.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function buildDemoTable() {
    var SC = window.SERIES_CONFIG || {};
    var dateCol = window.DATE_COLUMN || "Data";
    var rnd = mulberry32(7);
    var rows = [];
    for (var i = 0; i < 6; i++) {
      var row = {};
      row[dateCol] = "exemplo " + (i + 1);
      if (SC.fedFunds) row[SC.fedFunds.column] = (3.4 + rnd() * 0.2).toFixed(1);
      if (SC.treasury10y) row[SC.treasury10y.column] = (4.0 + rnd() * 0.3).toFixed(2);
      if (SC.cpi) row[SC.cpi.column] = (2.9 + rnd() * 0.4).toFixed(1);
      if (SC.unemployment) row[SC.unemployment.column] = (4.1 + rnd() * 0.3).toFixed(1);
      rows.push(row);
    }
    return rows;
  }

  async function loadTable() {
    var url = window.DATA_SOURCE_URL || "";
    if (url) {
      try {
        var rows = await fetchCsvRows(url);
        return { rows: rows, demo: false };
      } catch (e) { console.warn("Não foi possível carregar a planilha, usando números de exemplo:", e); }
    }
    return { rows: buildDemoTable(), demo: true };
  }

  function fmtPct1(v) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"; }

  function statPair(arr) {
    if (!arr || arr.length < 2) return null;
    return { last: arr[arr.length - 1], prev: arr[arr.length - 2] };
  }
  function paintStat(valueId, deltaId, last, delta, unit) {
    var vEl = document.getElementById(valueId);
    if (vEl) vEl.textContent = fmtPct1(last);
    var dEl = document.getElementById(deltaId);
    if (!dEl) return;
    var up = delta >= 0;
    dEl.textContent = (up ? "▲ +" : "▼ ") + Math.abs(delta).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " " + unit + " (mês)";
    dEl.className = "stat-delta " + (up ? "up" : "down");
  }

  function renderStatStrip(rows) {
    var f = statPair(alignSeries(rows, ["fedFunds"]).values.fedFunds);
    if (f) paintStat("stat-fedfunds-value", "stat-fedfunds-delta", f.last, Math.round((f.last - f.prev) * 100), "pb");
    var t = statPair(alignSeries(rows, ["treasury10y"]).values.treasury10y);
    if (t) paintStat("stat-t10y-value", "stat-t10y-delta", t.last, Math.round((t.last - t.prev) * 100), "pb");
    var u = statPair(alignSeries(rows, ["unemployment"]).values.unemployment);
    if (u) paintStat("stat-unemp-value", "stat-unemp-delta", u.last, Math.round((u.last - u.prev) * 10) / 10, "pp");
    var c = statPair(alignSeries(rows, ["cpi"]).values.cpi);
    if (c) paintStat("stat-cpi-value", "stat-cpi-delta", c.last, Math.round((c.last - c.prev) * 10) / 10, "pp");
  }

  /* ============================== gallery (image cards, from config.js) ============================== */
  function buildCard(chart) {
    var card = el("div", "chart-card");

    var head = el("div", "chart-card-head");
    var titleWrap = document.createElement("div");
    var h3 = el("h3", "chart-title");
    h3.textContent = chart.title;
    titleWrap.appendChild(h3);
    if (chart.subtitle) {
      var sub = el("div", "chart-subtitle");
      sub.textContent = chart.subtitle;
      titleWrap.appendChild(sub);
    }
    head.appendChild(titleWrap);
    card.appendChild(head);

    var imgWrap = el("div", "chart-image-wrap");
    var img = document.createElement("img");
    img.src = chart.image;
    img.alt = chart.title;
    img.loading = "lazy";
    img.addEventListener("error", function () {
      imgWrap.innerHTML = "";
      var ph = el("div", "chart-placeholder");
      var strong = document.createElement("strong");
      strong.textContent = "Imagem não encontrada";
      var code = document.createElement("code");
      code.textContent = chart.image;
      var hint = document.createElement("span");
      hint.textContent = "Exporte o gráfico do PowerPoint com esse nome de arquivo (veja o README.md).";
      ph.appendChild(strong); ph.appendChild(code); ph.appendChild(hint);
      imgWrap.appendChild(ph);
    }, { once: true });
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    var footer = el("div", "chart-footer");
    var src = document.createElement("span");
    src.textContent = "Fonte: " + (chart.source || (window.SITE_CONFIG || {}).sourceLabel || "PowerPoint");
    var upd = document.createElement("span");
    upd.textContent = chart.updated ? ("Atualizado " + chart.updated) : "";
    footer.appendChild(src); footer.appendChild(upd);
    card.appendChild(footer);

    return card;
  }

  function buildGallery() {
    var SECTIONS = window.SECTIONS || [];
    var CHARTS = window.CHARTS || [];
    var host = document.getElementById("chart-sections");
    var nav = document.getElementById("nav-sections");
    if (!host) return;
    host.innerHTML = "";
    if (nav) nav.innerHTML = "";

    SECTIONS.forEach(function (sec, si) {
      var chartsInSection = CHARTS.filter(function (c) { return c.section === sec.id; });
      if (!chartsInSection.length) return;

      var section = el("section", "theme-section");
      section.id = sec.id;
      var heading = el("div", "section-heading");
      var h2 = document.createElement("h2");
      h2.textContent = sec.label;
      var count = el("span", "count");
      count.textContent = chartsInSection.length + (chartsInSection.length === 1 ? " gráfico" : " gráficos");
      heading.appendChild(h2); heading.appendChild(count);
      section.appendChild(heading);

      var grid = el("div", "chart-grid");
      chartsInSection.forEach(function (chart) { grid.appendChild(buildCard(chart)); });
      section.appendChild(grid);
      host.appendChild(section);

      if (nav) {
        var group = el("div", "nav-group");
        var label = el("div", "nav-label");
        label.textContent = sec.label;
        var link = document.createElement("a");
        link.className = "nav-link" + (si === 0 ? " active" : "");
        link.href = "#" + sec.id;
        var linkText = document.createElement("span");
        linkText.textContent = chartsInSection.length === 1 ? chartsInSection[0].title : "Ver gráficos";
        var n = el("span", "n");
        n.textContent = String(chartsInSection.length).padStart(2, "0");
        link.appendChild(linkText); link.appendChild(n);
        group.appendChild(label); group.appendChild(link);
        nav.appendChild(group);
      }
    });
  }

  function applyBranding() {
    var cfg = window.SITE_CONFIG || {};
    document.title = cfg.brandName || "Chart Book";
    var map = {
      "brand-name": cfg.brandName, "brand-tag": cfg.tagline,
      "page-title": cfg.pageTitle, "page-lede": cfg.lede
    };
    Object.keys(map).forEach(function (id) {
      var node = document.getElementById(id);
      if (node && map[id]) node.textContent = map[id];
    });
    var srcNodes = document.querySelectorAll("[data-source-label]");
    srcNodes.forEach(function (n) { n.textContent = "Fonte: " + (cfg.sourceLabel || "PowerPoint"); });
    var updatedNodes = document.querySelectorAll("[data-updated-label]");
    var todayStr = new Date().toLocaleDateString("pt-BR");
    updatedNodes.forEach(function (n) { n.textContent = "Atualizado " + todayStr; });
  }

  async function init() {
    applyBranding();
    buildGallery();
    var loaded = await loadTable();
    renderStatStrip(loaded.rows);
    var notice = document.getElementById("global-notice");
    if (notice) notice.classList.toggle("visible", loaded.demo);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
