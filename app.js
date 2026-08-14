(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";

  /* ============================== helpers ============================== */
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function niceNumber(range, round) {
    var exponent = Math.floor(Math.log10(range));
    var fraction = range / Math.pow(10, exponent);
    var niceFraction;
    if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
    } else {
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
    }
    return niceFraction * Math.pow(10, exponent);
  }

  function niceScale(min, max, maxTicks) {
    if (min === max) { min -= 1; max += 1; }
    var range = niceNumber(max - min, false);
    var step = niceNumber(range / (maxTicks - 1), true);
    var niceMin = Math.floor(min / step) * step;
    var niceMax = Math.ceil(max / step) * step;
    var ticks = [];
    for (var v = niceMin; v <= niceMax + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { min: niceMin, max: niceMax, ticks: ticks, step: step };
  }

  function roundedRectPath(x, y, w, h, tl, tr, br, bl) {
    tl = Math.max(0, Math.min(tl, w / 2, h / 2));
    tr = Math.max(0, Math.min(tr, w / 2, h / 2));
    br = Math.max(0, Math.min(br, w / 2, h / 2));
    bl = Math.max(0, Math.min(bl, w / 2, h / 2));
    return "M" + (x + tl) + "," + y +
      " H" + (x + w - tr) +
      (tr > 0 ? " A" + tr + "," + tr + " 0 0 1 " + (x + w) + "," + (y + tr) : "") +
      " V" + (y + h - br) +
      (br > 0 ? " A" + br + "," + br + " 0 0 1 " + (x + w - br) + "," + (y + h) : "") +
      " H" + (x + bl) +
      (bl > 0 ? " A" + bl + "," + bl + " 0 0 1 " + x + "," + (y + h - bl) : "") +
      " V" + (y + tl) +
      (tl > 0 ? " A" + tl + "," + tl + " 0 0 1 " + (x + tl) + "," + y : "") +
      " Z";
  }

  function positionTooltip(tooltip, vizRect, evt, guardRight, guardBottom) {
    var left = evt.clientX - vizRect.left + 14;
    var top = evt.clientY - vizRect.top + 14;
    if (left > vizRect.width - guardRight) left = evt.clientX - vizRect.left - guardRight - 14;
    if (top > vizRect.height - guardBottom) top = evt.clientY - vizRect.top - guardBottom - 14;
    tooltip.style.left = Math.max(4, left) + "px";
    tooltip.style.top = Math.max(4, top) + "px";
  }

  function buildTable(host, headers, rows) {
    if (!host) return;
    host.innerHTML = "";
    var table = document.createElement("table");
    table.className = "data-table";
    var thead = document.createElement("thead");
    var htr = document.createElement("tr");
    headers.forEach(function (h) {
      var th = document.createElement("th");
      th.textContent = h;
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      r.forEach(function (c) {
        var td = document.createElement("td");
        td.textContent = c;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    host.appendChild(table);
  }

  /* ============================== CSV loading ============================== */
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
    // Drop currency symbols, %, spaces etc. BEFORE detecting the decimal
    // separator, so a trailing unit (e.g. "2,9%") doesn't break the check.
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

  async function loadSingleSeries(cfg, demoDates, demoValues) {
    if (cfg && cfg.url) {
      try {
        var rows = await fetchCsvRows(cfg.url);
        var dates = rows.map(function (r) { return r.Periodo; });
        var values = rows.map(function (r) { return parseNum(r.Valor); });
        if (dates.length && values.every(function (v) { return !isNaN(v); })) {
          return { dates: dates, values: values, demo: false };
        }
      } catch (e) { console.warn("Não foi possível carregar a planilha:", e); }
    }
    return { dates: demoDates, values: demoValues, demo: true };
  }

  async function loadDualSeries(cfg, colA, colB, demoDates, demoA, demoB) {
    if (cfg && cfg.url) {
      try {
        var rows = await fetchCsvRows(cfg.url);
        var dates = rows.map(function (r) { return r.Periodo; });
        var a = rows.map(function (r) { return parseNum(r[colA]); });
        var b = rows.map(function (r) { return parseNum(r[colB]); });
        if (dates.length && a.every(function (v) { return !isNaN(v); }) && b.every(function (v) { return !isNaN(v); })) {
          return { dates: dates, a: a, b: b, demo: false };
        }
      } catch (e) { console.warn("Não foi possível carregar a planilha:", e); }
    }
    return { dates: demoDates, a: demoA, b: demoB, demo: true };
  }

  async function loadCategorical(cfg, demoRows) {
    if (cfg && cfg.url) {
      try {
        var rows = await fetchCsvRows(cfg.url);
        var parsed = rows.map(function (r) { return { name: r.Setor, value: parseNum(r.Valor) }; });
        if (parsed.length && parsed.every(function (r) { return r.name && !isNaN(r.value); })) {
          parsed.sort(function (x, y) { return y.value - x.value; });
          return { rows: parsed, demo: false };
        }
      } catch (e) { console.warn("Não foi possível carregar a planilha:", e); }
    }
    return { rows: demoRows, demo: true };
  }

  function setDemoBadge(key, isDemo) {
    var badge = document.querySelector('.demo-badge[data-badge="' + key + '"]');
    if (badge) badge.classList.toggle("visible", isDemo);
  }

  /* ============================== demo dataset ============================== */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var MONTH_ABBR = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  function buildMonthlyDates(nMonths, endYear, endMonthIdx) {
    var out = [], y = endYear, m = endMonthIdx;
    for (var i = 0; i < nMonths; i++) {
      out.push(MONTH_ABBR[m] + "/" + String(y).slice(2));
      m--; if (m < 0) { m = 11; y--; }
    }
    return out.reverse();
  }
  function buildQuarterlyDates(nQ, endYear, endQ) {
    var out = [], y = endYear, q = endQ;
    for (var i = 0; i < nQ; i++) {
      out.push("T" + q + "/" + String(y).slice(2));
      q--; if (q < 1) { q = 4; y--; }
    }
    return out.reverse();
  }
  var now = new Date();
  var DEMO_DATES_M = buildMonthlyDates(60, now.getFullYear(), now.getMonth());
  var DEMO_DATES_Q = buildQuarterlyDates(20, now.getFullYear(), Math.floor(now.getMonth() / 3) + 1);

  function genSP500() {
    var rnd = mulberry32(7), v = 4450, out = [];
    for (var i = 0; i < 60; i++) {
      var drift = 0.0075;
      if (i >= 3 && i <= 9) drift = -0.028;
      if (i >= 11 && i <= 13) drift = 0.02;
      if (i >= 40 && i <= 42) drift = -0.02;
      var noise = (rnd() - 0.5) * 0.028;
      v = v * (1 + drift + noise);
      out.push(v);
    }
    return out;
  }
  function genUnemployment() {
    var rnd = mulberry32(21), out = [];
    for (var i = 0; i < 60; i++) {
      var base = 3.7 + 0.55 * Math.sin(i / 14) + i * 0.004;
      var noise = (rnd() - 0.5) * 0.12;
      out.push(Math.round((base + noise) * 10) / 10);
    }
    return out;
  }
  function genCPI() {
    var rnd = mulberry32(33), out = [];
    for (var i = 0; i < 60; i++) {
      var v;
      if (i <= 9) v = 5.2 + (9.3 - 5.2) * (i / 9);
      else { var t = (i - 9) / (59 - 9); v = 9.3 - (9.3 - 2.9) * Math.pow(t, 0.85); }
      var noise = (rnd() - 0.5) * 0.25;
      out.push(Math.round((v + noise) * 10) / 10);
    }
    return out;
  }
  function genFedFunds() {
    var steps = [
      { upto: 5, v: 0.1 }, { upto: 14, v: 2.4 }, { upto: 20, v: 4.6 },
      { upto: 38, v: 5.33 }, { upto: 46, v: 4.6 }, { upto: 52, v: 3.9 }, { upto: 59, v: 3.4 }
    ];
    var out = [];
    for (var i = 0; i < 60; i++) {
      for (var s = 0; s < steps.length; s++) { if (i <= steps[s].upto) { out.push(steps[s].v); break; } }
    }
    return out;
  }
  function genTreasury10Y() {
    var rnd = mulberry32(44), v = 1.4, out = [];
    for (var i = 0; i < 60; i++) {
      var target;
      if (i < 20) target = 1.4 + (4.6 - 1.4) * (i / 20);
      else if (i < 40) target = 4.6 - 0.5 * Math.sin((i - 20) / 8);
      else target = 4.6 - (4.6 - 4.0) * ((i - 40) / 19);
      v = v + (target - v) * 0.35 + (rnd() - 0.5) * 0.08;
      out.push(Math.round(v * 100) / 100);
    }
    return out;
  }
  var DEMO_SP500 = genSP500();
  var DEMO_UNEMP = genUnemployment();
  var DEMO_CPI = genCPI();
  var DEMO_FED = genFedFunds();
  var DEMO_T10Y = genTreasury10Y();
  var DEMO_GDP_Q = [2.3,1.8,-0.6,2.9,3.1,2.4,1.1,2.6,4.1,3.2,1.9,-0.3,2.2,2.8,3.4,1.6,2.0,2.7,2.4,2.1];
  var DEMO_SECTORS = [
    { name: "Tecnologia", value: 24.3 },
    { name: "Financeiro", value: 14.1 },
    { name: "Industrial", value: 9.8 },
    { name: "Saúde", value: 6.2 },
    { name: "Consumo Discricionário", value: 3.4 },
    { name: "Consumo Básico", value: -1.8 },
    { name: "Energia", value: -6.5 },
    { name: "Utilities", value: -9.2 }
  ];

  function fmtInt(v) { return Math.round(v).toLocaleString("pt-BR"); }
  function fmtPct1(v) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"; }
  function fmtPctSigned1(v) { return (v >= 0 ? "+" : "") + fmtPct1(v); }
  function fmtRate(v) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%"; }

  /* ============================== chart renderers ============================== */
  function renderLineChart(container, cfg) {
    var dates = cfg.dates, series = cfg.series, fmt = cfg.fmt;
    var n = dates.length;
    var W = 640, H = 300;
    var margin = { top: 16, right: series.length > 1 ? 22 : 58, bottom: 32, left: 50 };
    var x0 = margin.left, x1 = W - margin.right, y0 = margin.top, y1 = H - margin.bottom;

    var min = Infinity, max = -Infinity;
    series.forEach(function (s) { s.data.forEach(function (v) { if (v < min) min = v; if (v > max) max = v; }); });
    var pad = (max - min) * 0.14 || 1;
    var scale = niceScale(min - pad, max + pad, 5);

    function xAt(i) { return x0 + (x1 - x0) * (n === 1 ? 0 : i / (n - 1)); }
    function yAt(v) { return y1 - (y1 - y0) * ((v - scale.min) / (scale.max - scale.min)); }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "chart-svg", role: "img", "aria-label": series.map(function (s) { return s.label; }).join(" vs ") });

    var gGrid = el("g", {});
    scale.ticks.forEach(function (t) {
      var y = yAt(t);
      gGrid.appendChild(el("line", { x1: x0, x2: x1, y1: y, y2: y, stroke: "var(--grid)", "stroke-width": 1 }));
      var txt = el("text", { x: x0 - 8, y: y + 3, "text-anchor": "end", "font-family": "var(--font-mono)", "font-size": 11, fill: "var(--ink-muted)" });
      txt.textContent = t.toLocaleString("pt-BR");
      gGrid.appendChild(txt);
    });
    svg.appendChild(gGrid);

    var stride = Math.max(1, Math.ceil(n / 7));
    var gX = el("g", {});
    dates.forEach(function (d, i) {
      if (i % stride !== 0 && i !== n - 1) return;
      var anchor = i === n - 1 ? "end" : (i === 0 ? "start" : "middle");
      var txt = el("text", { x: xAt(i), y: H - margin.bottom + 18, "text-anchor": anchor, "font-family": "var(--font-mono)", "font-size": 11, fill: "var(--ink-muted)" });
      txt.textContent = d;
      gX.appendChild(txt);
    });
    svg.appendChild(gX);
    svg.appendChild(el("line", { x1: x0, x2: x1, y1: y1, y2: y1, stroke: "var(--baseline)", "stroke-width": 1 }));

    var seriesLayer = el("g", {});
    series.forEach(function (s) {
      var pts = s.data.map(function (v, i) { return [xAt(i), yAt(v)]; });
      var d = pts.map(function (p, i) { return (i === 0 ? "M" : "L") + p[0].toFixed(2) + "," + p[1].toFixed(2); }).join(" ");
      if (series.length === 1) {
        var areaD = d + " L" + pts[pts.length - 1][0].toFixed(2) + "," + y1 + " L" + pts[0][0].toFixed(2) + "," + y1 + " Z";
        seriesLayer.appendChild(el("path", { d: areaD, fill: s.color, opacity: 0.1, stroke: "none" }));
      }
      seriesLayer.appendChild(el("path", { d: d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      var last = pts[pts.length - 1];
      seriesLayer.appendChild(el("circle", { cx: last[0], cy: last[1], r: 4, fill: s.color, stroke: "var(--surface)", "stroke-width": 2 }));
      if (series.length === 1) {
        var lbl = el("text", { x: last[0] + 10, y: last[1] + 4, "font-family": "var(--font-sans)", "font-weight": 600, "font-size": 12, fill: "var(--ink)" });
        lbl.textContent = fmt(s.data[s.data.length - 1]);
        seriesLayer.appendChild(lbl);
      }
    });
    svg.appendChild(seriesLayer);

    var crosshair = el("line", { x1: x0, x2: x0, y1: y0, y2: y1, stroke: "var(--baseline)", "stroke-width": 1, opacity: 0 });
    svg.appendChild(crosshair);
    var dotsLayer = el("g", { opacity: 0 });
    var dots = series.map(function (s) {
      var c = el("circle", { r: 4, fill: s.color, stroke: "var(--surface)", "stroke-width": 2 });
      dotsLayer.appendChild(c);
      return c;
    });
    svg.appendChild(dotsLayer);

    var hit = el("rect", { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0), fill: "transparent" });
    svg.appendChild(hit);

    container.innerHTML = "";
    var viz = document.createElement("div");
    viz.className = "chart-viz";
    viz.appendChild(svg);
    var tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    viz.appendChild(tooltip);
    container.appendChild(viz);

    function showAt(i) {
      i = Math.max(0, Math.min(n - 1, i));
      var x = xAt(i);
      crosshair.setAttribute("x1", x); crosshair.setAttribute("x2", x); crosshair.setAttribute("opacity", 1);
      dotsLayer.setAttribute("opacity", 1);
      series.forEach(function (s, si) {
        dots[si].setAttribute("cx", x);
        dots[si].setAttribute("cy", yAt(s.data[i]));
      });
      tooltip.innerHTML = "";
      var dateEl = document.createElement("div");
      dateEl.className = "tooltip-date";
      dateEl.textContent = dates[i];
      tooltip.appendChild(dateEl);
      series.forEach(function (s) {
        var row = document.createElement("div");
        row.className = "tooltip-row";
        var left = document.createElement("span");
        left.className = "tooltip-name";
        var key = document.createElement("span");
        key.className = "tooltip-key";
        key.style.background = s.color;
        left.appendChild(key);
        var nameSpan = document.createElement("span");
        nameSpan.textContent = s.label;
        left.appendChild(nameSpan);
        var val = document.createElement("span");
        val.className = "tooltip-val";
        val.textContent = fmt(s.data[i]);
        row.appendChild(left); row.appendChild(val);
        tooltip.appendChild(row);
      });
      tooltip.classList.add("visible");
    }
    function hide() { crosshair.setAttribute("opacity", 0); dotsLayer.setAttribute("opacity", 0); tooltip.classList.remove("visible"); }
    function handleMove(evt) {
      var rect = svg.getBoundingClientRect();
      var scaleX = W / rect.width;
      var localX = (evt.clientX - rect.left) * scaleX;
      var idx = Math.round((localX - x0) / (x1 - x0) * (n - 1));
      showAt(idx);
      positionTooltip(tooltip, viz.getBoundingClientRect(), evt, 170, 90);
    }
    hit.addEventListener("pointermove", handleMove);
    hit.addEventListener("pointerdown", handleMove);
    hit.addEventListener("pointerleave", hide);

    var legendHost = container.parentElement.querySelector(".legend");
    if (legendHost) {
      legendHost.innerHTML = "";
      if (series.length > 1) {
        series.forEach(function (s) {
          var item = document.createElement("span");
          item.className = "legend-item";
          var sw = document.createElement("span");
          sw.className = "legend-swatch";
          sw.style.background = s.color;
          item.appendChild(sw);
          var txt = document.createElement("span");
          txt.textContent = s.label;
          item.appendChild(txt);
          legendHost.appendChild(item);
        });
      }
    }

    var tableHost = container.parentElement.querySelector(".data-table-wrap");
    var headers = ["Período"].concat(series.map(function (s) { return s.label; }));
    var rows = [];
    for (var i = n - 1; i >= 0; i--) {
      rows.push([dates[i]].concat(series.map(function (s) { return fmt(s.data[i]); })));
    }
    buildTable(tableHost, headers, rows);
  }

  function renderDivergingColumnChart(container, cfg) {
    var dates = cfg.dates, data = cfg.data, fmt = cfg.fmt;
    var n = data.length;
    var W = 640, H = 300;
    var margin = { top: 26, right: 18, bottom: 32, left: 50 };
    var x0 = margin.left, x1 = W - margin.right, y0 = margin.top, y1 = H - margin.bottom;

    var min = Math.min.apply(null, data.concat([0])), max = Math.max.apply(null, data.concat([0]));
    var pad = (max - min) * 0.16 || 1;
    var scale = niceScale(min - pad * 0.3, max + pad, 5);
    function yAt(v) { return y1 - (y1 - y0) * ((v - scale.min) / (scale.max - scale.min)); }
    var baseY = yAt(0);
    var band = (x1 - x0) / n;
    var barW = Math.min(22, band - 4);

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "chart-svg", role: "img", "aria-label": "Variação por período" });

    var gGrid = el("g", {});
    scale.ticks.forEach(function (t) {
      var y = yAt(t);
      gGrid.appendChild(el("line", { x1: x0, x2: x1, y1: y, y2: y, stroke: "var(--grid)", "stroke-width": 1 }));
      var txt = el("text", { x: x0 - 8, y: y + 3, "text-anchor": "end", "font-family": "var(--font-mono)", "font-size": 11, fill: "var(--ink-muted)" });
      txt.textContent = t.toLocaleString("pt-BR");
      gGrid.appendChild(txt);
    });
    svg.appendChild(gGrid);

    var stride = Math.max(1, Math.ceil(n / 8));
    var gX = el("g", {});
    dates.forEach(function (d, i) {
      if (i % stride !== 0 && i !== n - 1) return;
      var cx = x0 + band * i + band / 2;
      var txt = el("text", { x: cx, y: H - margin.bottom + 18, "text-anchor": "middle", "font-family": "var(--font-mono)", "font-size": 11, fill: "var(--ink-muted)" });
      txt.textContent = d;
      gX.appendChild(txt);
    });
    svg.appendChild(gX);
    svg.appendChild(el("line", { x1: x0, x2: x1, y1: baseY, y2: baseY, stroke: "var(--baseline)", "stroke-width": 1 }));

    var barsLayer = el("g", {});
    var minIdx = 0;
    data.forEach(function (v, i) { if (v < data[minIdx]) minIdx = i; });
    var bars = [];
    data.forEach(function (v, i) {
      var cx = x0 + band * i + band / 2;
      var bx = cx - barW / 2;
      var pos = v >= 0;
      var by, bh;
      if (pos) { var top = yAt(v); bh = Math.max(1.5, baseY - top); by = baseY - bh; }
      else { var bot = yAt(v); bh = Math.max(1.5, bot - baseY); by = baseY; }
      var color = pos ? "var(--series-1)" : "var(--series-neg)";
      var path = el("path", { d: roundedRectPath(bx, by, barW, bh, pos ? 4 : 0, pos ? 4 : 0, pos ? 0 : 4, pos ? 0 : 4), fill: color, "class": "bar-mark", tabindex: "0" });
      barsLayer.appendChild(path);
      bars.push({ el: path, x: cx, pos: pos, v: v });
      if (i === n - 1 || i === minIdx) {
        var lbl = el("text", { x: cx, y: pos ? by - 6 : by + bh + 14, "text-anchor": "middle", "font-family": "var(--font-sans)", "font-weight": 600, "font-size": 11, fill: "var(--ink)" });
        lbl.textContent = fmt(v);
        barsLayer.appendChild(lbl);
      }
    });
    svg.appendChild(barsLayer);

    container.innerHTML = "";
    var viz = document.createElement("div");
    viz.className = "chart-viz";
    viz.appendChild(svg);
    var tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    viz.appendChild(tooltip);
    container.appendChild(viz);

    function show(evt, i) {
      var b = bars[i];
      tooltip.innerHTML = "";
      var dateEl = document.createElement("div");
      dateEl.className = "tooltip-date";
      dateEl.textContent = dates[i];
      tooltip.appendChild(dateEl);
      var row = document.createElement("div");
      row.className = "tooltip-row";
      var left = document.createElement("span");
      left.className = "tooltip-name";
      var key = document.createElement("span");
      key.className = "tooltip-key";
      key.style.background = b.pos ? "var(--series-1)" : "var(--series-neg)";
      left.appendChild(key);
      var val = document.createElement("span");
      val.className = "tooltip-val";
      val.textContent = fmt(b.v);
      row.appendChild(left); row.appendChild(val);
      tooltip.appendChild(row);
      tooltip.classList.add("visible");
      positionTooltip(tooltip, viz.getBoundingClientRect(), evt, 150, 70);
    }
    bars.forEach(function (b, i) {
      b.el.addEventListener("pointermove", function (e) { show(e, i); });
      b.el.addEventListener("pointerenter", function (e) { show(e, i); });
      b.el.addEventListener("pointerleave", function () { tooltip.classList.remove("visible"); });
    });

    var tableHost = container.parentElement.querySelector(".data-table-wrap");
    var rows = [];
    for (var i = n - 1; i >= 0; i--) rows.push([dates[i], fmt(data[i])]);
    buildTable(tableHost, ["Período", "Valor"], rows);
  }

  function renderDivergingRowChart(container, cfg) {
    var rows = cfg.rows, fmt = cfg.fmt;
    var n = rows.length;
    var W = 640, H = 42 * n + 26;
    var margin = { top: 8, right: 66, bottom: 20, left: 152 };
    var x0 = margin.left, x1 = W - margin.right, y0 = margin.top, y1 = H - margin.bottom;
    var vals = rows.map(function (r) { return r.value; });
    var min = Math.min.apply(null, vals.concat([0])), max = Math.max.apply(null, vals.concat([0]));
    var pad = (max - min) * 0.2 || 1;
    var scale = niceScale(min - pad * 0.3, max + pad, 5);
    function xAt(v) { return x0 + (x1 - x0) * ((v - scale.min) / (scale.max - scale.min)); }
    var baseX = xAt(0);
    var rowH = (y1 - y0) / n;
    var barH = Math.min(20, rowH - 10);

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "chart-svg", role: "img", "aria-label": "Retorno por categoria" });

    var gGrid = el("g", {});
    scale.ticks.forEach(function (t) {
      var x = xAt(t);
      gGrid.appendChild(el("line", { x1: x, x2: x, y1: y0, y2: y1, stroke: "var(--grid)", "stroke-width": 1 }));
      var txt = el("text", { x: x, y: y1 + 16, "text-anchor": "middle", "font-family": "var(--font-mono)", "font-size": 11, fill: "var(--ink-muted)" });
      txt.textContent = t.toLocaleString("pt-BR") + "%";
      gGrid.appendChild(txt);
    });
    svg.appendChild(gGrid);
    svg.appendChild(el("line", { x1: baseX, x2: baseX, y1: y0, y2: y1, stroke: "var(--baseline)", "stroke-width": 1 }));

    var bars = [];
    rows.forEach(function (r, i) {
      var cy = y0 + rowH * i + rowH / 2;
      var by = cy - barH / 2;
      var pos = r.value >= 0;
      var bx, bw;
      if (pos) { bx = baseX; bw = Math.max(1.5, xAt(r.value) - baseX); }
      else { bw = Math.max(1.5, baseX - xAt(r.value)); bx = baseX - bw; }
      var path = el("path", { d: roundedRectPath(bx, by, bw, barH, pos ? 0 : 4, pos ? 4 : 0, pos ? 4 : 0, pos ? 0 : 4), fill: pos ? "var(--series-1)" : "var(--series-neg)", "class": "bar-mark", tabindex: "0" });
      svg.appendChild(path);
      var nameLbl = el("text", { x: margin.left - 12, y: cy + 4, "text-anchor": "end", "font-family": "var(--font-sans)", "font-size": 12, fill: "var(--ink-secondary)" });
      nameLbl.textContent = r.name;
      svg.appendChild(nameLbl);
      var tipX = pos ? bx + bw + 8 : bx - 8;
      var valLbl = el("text", { x: tipX, y: cy + 4, "text-anchor": pos ? "start" : "end", "font-family": "var(--font-sans)", "font-weight": 600, "font-size": 12, fill: "var(--ink)" });
      valLbl.textContent = fmt(r.value);
      svg.appendChild(valLbl);
      bars.push({ el: path, name: r.name, value: r.value, pos: pos });
    });

    container.innerHTML = "";
    var viz = document.createElement("div");
    viz.className = "chart-viz";
    viz.appendChild(svg);
    var tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    viz.appendChild(tooltip);
    container.appendChild(viz);

    bars.forEach(function (b) {
      var show = function (evt) {
        tooltip.innerHTML = "";
        var nameEl = document.createElement("div");
        nameEl.className = "tooltip-date";
        nameEl.textContent = b.name;
        tooltip.appendChild(nameEl);
        var row = document.createElement("div");
        row.className = "tooltip-row";
        var key = document.createElement("span");
        key.className = "tooltip-key";
        key.style.background = b.pos ? "var(--series-1)" : "var(--series-neg)";
        var val = document.createElement("span");
        val.className = "tooltip-val";
        val.textContent = fmt(b.value);
        row.appendChild(key); row.appendChild(val);
        tooltip.appendChild(row);
        tooltip.classList.add("visible");
        positionTooltip(tooltip, viz.getBoundingClientRect(), evt, 150, 60);
      };
      b.el.addEventListener("pointermove", show);
      b.el.addEventListener("pointerenter", show);
      b.el.addEventListener("pointerleave", function () { tooltip.classList.remove("visible"); });
    });

    var tableHost = container.parentElement.querySelector(".data-table-wrap");
    buildTable(tableHost, ["Categoria", "Valor"], rows.map(function (r) { return [r.name, fmt(r.value)]; }));
  }

  /* ============================== app wiring ============================== */
  var state = { rangeYears: 5 };
  var LOADED = {};

  function sliceMonthly(arr) { return state.rangeYears === "max" ? arr : arr.slice(-state.rangeYears * 12); }
  function sliceQuarterly(arr) { return state.rangeYears === "max" ? arr : arr.slice(-state.rangeYears * 4); }

  function renderTimeSeries() {
    if (LOADED.sp500) {
      renderLineChart(document.getElementById("chart-sp500"), {
        dates: sliceMonthly(LOADED.sp500.dates),
        series: [{ label: "S&P 500", color: "var(--series-1)", data: sliceMonthly(LOADED.sp500.values) }],
        fmt: fmtInt
      });
    }
    if (LOADED.unemployment) {
      renderLineChart(document.getElementById("chart-unemployment"), {
        dates: sliceMonthly(LOADED.unemployment.dates),
        series: [{ label: "Desemprego", color: "var(--series-1)", data: sliceMonthly(LOADED.unemployment.values) }],
        fmt: fmtPct1
      });
    }
    if (LOADED.cpi) {
      renderLineChart(document.getElementById("chart-cpi"), {
        dates: sliceMonthly(LOADED.cpi.dates),
        series: [{ label: "CPI (a/a)", color: "var(--series-1)", data: sliceMonthly(LOADED.cpi.values) }],
        fmt: fmtPct1
      });
    }
    if (LOADED.juros) {
      renderLineChart(document.getElementById("chart-juros"), {
        dates: sliceMonthly(LOADED.juros.dates),
        series: [
          { label: "Fed Funds", color: "var(--series-1)", data: sliceMonthly(LOADED.juros.a) },
          { label: "Treasury 10 anos", color: "var(--series-2)", data: sliceMonthly(LOADED.juros.b) }
        ],
        fmt: fmtRate
      });
    }
    if (LOADED.gdp) {
      renderDivergingColumnChart(document.getElementById("chart-gdp"), {
        dates: sliceQuarterly(LOADED.gdp.dates),
        data: sliceQuarterly(LOADED.gdp.values),
        fmt: fmtPctSigned1
      });
    }
  }

  function renderStatStrip() {
    if (LOADED.sp500) {
      var sv = LOADED.sp500.values, sp0 = sv[sv.length - 1], sp1 = sv[sv.length - 2];
      var spChg = (sp0 / sp1 - 1) * 100;
      document.getElementById("stat-sp500-value").textContent = fmtInt(sp0);
      var spDelta = document.getElementById("stat-sp500-delta");
      spDelta.textContent = (spChg >= 0 ? "▲ +" : "▼ ") + Math.abs(spChg).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "% (mês)";
      spDelta.className = "stat-delta " + (spChg >= 0 ? "up" : "down");
    }
    if (LOADED.juros) {
      var tv = LOADED.juros.b, t0 = tv[tv.length - 1], t1 = tv[tv.length - 2];
      var tBps = Math.round((t0 - t1) * 100);
      document.getElementById("stat-t10y-value").textContent = fmtRate(t0);
      var tDelta = document.getElementById("stat-t10y-delta");
      tDelta.textContent = (tBps >= 0 ? "▲ +" : "▼ ") + Math.abs(tBps) + " pb (mês)";
      tDelta.className = "stat-delta " + (tBps >= 0 ? "up" : "down");
    }
    if (LOADED.unemployment) {
      var uv = LOADED.unemployment.values, u0 = uv[uv.length - 1], u1 = uv[uv.length - 2];
      var uD = Math.round((u0 - u1) * 10) / 10;
      document.getElementById("stat-unemp-value").textContent = fmtPct1(u0);
      var uDelta = document.getElementById("stat-unemp-delta");
      uDelta.textContent = (uD >= 0 ? "▲ +" : "▼ ") + Math.abs(uD).toFixed(1) + " pp (mês)";
      uDelta.className = "stat-delta " + (uD >= 0 ? "up" : "down");
    }
    if (LOADED.cpi) {
      var cv = LOADED.cpi.values, c0 = cv[cv.length - 1], c1 = cv[cv.length - 2];
      var cD = Math.round((c0 - c1) * 10) / 10;
      document.getElementById("stat-cpi-value").textContent = fmtPct1(c0);
      var cDelta = document.getElementById("stat-cpi-delta");
      cDelta.textContent = (cD >= 0 ? "▲ +" : "▼ ") + Math.abs(cD).toFixed(1) + " pp (mês)";
      cDelta.className = "stat-delta " + (cD >= 0 ? "up" : "down");
    }
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
    srcNodes.forEach(function (n) { n.textContent = "Fonte: " + (cfg.sourceLabel || "planilha"); });
    var updatedNodes = document.querySelectorAll("[data-updated-label]");
    var todayStr = new Date().toLocaleDateString("pt-BR");
    updatedNodes.forEach(function (n) { n.textContent = "Atualizado " + todayStr; });
  }

  async function init() {
    applyBranding();
    var SC = window.SHEET_CONFIG || {};

    var results = await Promise.all([
      loadSingleSeries(SC.sp500, DEMO_DATES_M, DEMO_SP500),
      loadSingleSeries(SC.unemployment, DEMO_DATES_M, DEMO_UNEMP),
      loadSingleSeries(SC.cpi, DEMO_DATES_M, DEMO_CPI),
      loadDualSeries(SC.juros, "FedFunds", "Treasury10Y", DEMO_DATES_M, DEMO_FED, DEMO_T10Y),
      loadSingleSeries(SC.gdp, DEMO_DATES_Q, DEMO_GDP_Q),
      loadCategorical(SC.sectors, DEMO_SECTORS)
    ]);

    LOADED.sp500 = results[0]; LOADED.unemployment = results[1]; LOADED.cpi = results[2];
    LOADED.juros = results[3]; LOADED.gdp = results[4]; LOADED.sectors = results[5];

    ["sp500", "unemployment", "cpi", "juros", "gdp", "sectors"].forEach(function (key) {
      setDemoBadge(key, LOADED[key].demo);
    });
    var anyDemo = Object.keys(LOADED).some(function (k) { return LOADED[k].demo; });
    var notice = document.getElementById("global-notice");
    if (notice) notice.classList.toggle("visible", anyDemo);

    renderStatStrip();
    renderTimeSeries();
    renderDivergingRowChart(document.getElementById("chart-sectors"), { rows: LOADED.sectors.rows, fmt: fmtPctSigned1 });

    var rangeBtns = document.querySelectorAll(".segmented [data-range]");
    rangeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        rangeBtns.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        var r = btn.getAttribute("data-range");
        state.rangeYears = r === "max" ? "max" : parseInt(r, 10);
        renderTimeSeries();
      });
    });

    document.querySelectorAll(".table-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".chart-card");
        var wrap = card.querySelector(".data-table-wrap");
        var showing = wrap.classList.toggle("visible");
        btn.textContent = showing ? "Ocultar dados" : "Ver dados";
        btn.setAttribute("aria-expanded", showing ? "true" : "false");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
