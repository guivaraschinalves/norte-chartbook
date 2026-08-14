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

  async function loadTable() {
    var url = window.DATA_SOURCE_URL || "";
    if (url) {
      try {
        var rows = await fetchCsvRows(url);
        return { rows: rows, demo: false };
      } catch (e) { console.warn("Não foi possível carregar a planilha, usando dados de exemplo:", e); }
    }
    return { rows: buildDemoTable(), demo: true };
  }

  // Pulls one or more configured series out of the shared table, keeping only
  // rows where every requested column has a parseable value — each chart's
  // timeline naturally trims to whatever has actually been reported so far.
  function alignSeries(rows, keys) {
    var SC = window.SERIES_CONFIG || {};
    var dateCol = window.DATE_COLUMN || "Data";
    var cols = keys.map(function (k) { return SC[k]; });
    var dates = [];
    var values = {};
    keys.forEach(function (k) { values[k] = []; });
    rows.forEach(function (r) {
      var parsed = cols.map(function (c) { return parseNum(r[c.column]) * (c.scale || 1); });
      if (parsed.every(function (v) { return !isNaN(v); })) {
        dates.push(r[dateCol]);
        keys.forEach(function (k, i) { values[k].push(parsed[i]); });
      }
    });
    return { dates: dates, values: values };
  }

  function setDemoBadge(key, isDemo) {
    var badge = document.querySelector('.demo-badge[data-badge="' + key + '"]');
    if (badge) badge.classList.toggle("visible", isDemo);
  }

  /* ============================== demo dataset (offline fallback) ============================== */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function buildMonthlyDates(nMonths, endYear, endMonthIdx) {
    var out = [], y = endYear, m = endMonthIdx;
    for (var i = 0; i < nMonths; i++) {
      out.push(MONTH_ABBR[m] + "/" + String(y).slice(2));
      m--; if (m < 0) { m = 11; y--; }
    }
    return out.reverse();
  }
  function genFedFunds(n) {
    var steps = [
      { upto: 5, v: 0.1 }, { upto: 14, v: 2.4 }, { upto: 20, v: 4.6 },
      { upto: 38, v: 5.33 }, { upto: 46, v: 4.6 }, { upto: 52, v: 3.9 }, { upto: n - 1, v: 3.4 }
    ];
    var out = [];
    for (var i = 0; i < n; i++) {
      for (var s = 0; s < steps.length; s++) { if (i <= steps[s].upto) { out.push(steps[s].v); break; } }
    }
    return out;
  }
  function genTreasury10y(n) {
    var rnd = mulberry32(44), v = 1.4, out = [];
    for (var i = 0; i < n; i++) {
      var target;
      if (i < 20) target = 1.4 + (4.6 - 1.4) * (i / 20);
      else if (i < 40) target = 4.6 - 0.5 * Math.sin((i - 20) / 8);
      else target = 4.6 - (4.6 - 4.0) * ((i - 40) / (n - 41));
      v = v + (target - v) * 0.35 + (rnd() - 0.5) * 0.08;
      out.push(Math.round(v * 100) / 100);
    }
    return out;
  }
  function genUnemployment(n) {
    var rnd = mulberry32(21), out = [];
    for (var i = 0; i < n; i++) {
      var base = 3.7 + 0.55 * Math.sin(i / 14) + i * 0.004;
      var noise = (rnd() - 0.5) * 0.12;
      out.push(Math.round((base + noise) * 10) / 10);
    }
    return out;
  }
  function genPiecewisePeak(n, startV, peakV, endV, peakIdx, seed) {
    var rnd = mulberry32(seed), out = [];
    for (var i = 0; i < n; i++) {
      var v;
      if (i <= peakIdx) v = startV + (peakV - startV) * (i / peakIdx);
      else { var t = (i - peakIdx) / (n - 1 - peakIdx); v = peakV - (peakV - endV) * Math.pow(t, 0.85); }
      var noise = (rnd() - 0.5) * 0.2;
      out.push(Math.round((v + noise) * 10) / 10);
    }
    return out;
  }
  function genGrowth(n, start, end, seed) {
    var rnd = mulberry32(seed), out = [], v = start;
    var totalGrowth = Math.log(end / start);
    for (var i = 0; i < n; i++) {
      var drift = totalGrowth / n;
      var noise = (rnd() - 0.5) * 0.04;
      v = v * (1 + drift + noise);
      out.push(v);
    }
    return out;
  }

  function buildDemoTable() {
    var SC = window.SERIES_CONFIG || {};
    var dateCol = window.DATE_COLUMN || "Data";
    var now = new Date();
    var n = 60;
    var dates = buildMonthlyDates(n, now.getFullYear(), now.getMonth());
    var series = {
      fedFunds: genFedFunds(n),
      treasury10y: genTreasury10y(n),
      cpi: genPiecewisePeak(n, 5.2, 9.3, 2.9, 9, 33),
      pce: genPiecewisePeak(n, 4.5, 7.5, 2.6, 9, 34),
      corePce: genPiecewisePeak(n, 3.8, 5.5, 2.8, 9, 35),
      trimmedMeanPce: genPiecewisePeak(n, 3.5, 6.3, 2.5, 9, 36),
      unemployment: genUnemployment(n),
      fedTreasuries: genGrowth(n, 0.63, 4.5, 40),
      fedMbs: genGrowth(n, 0.02, 1.9, 41)
    };
    var rows = [];
    for (var i = 0; i < n; i++) {
      var row = {};
      row[dateCol] = dates[i];
      Object.keys(SC).forEach(function (key) {
        var raw = series[key][i];
        // Store pre-scaled so that alignSeries's own *scale reproduces the
        // original magnitude, exactly like the real (unscaled) CSV would.
        var stored = SC[key].scale ? raw / SC[key].scale : raw;
        row[SC[key].column] = String(stored);
      });
      rows.push(row);
    }
    return rows;
  }

  function fmtPct1(v) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"; }
  function fmtTrillion(v) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* ============================== line chart renderer ============================== */
  function renderLineChart(container, cfg) {
    var dates = cfg.dates, series = cfg.series, fmt = cfg.fmt;
    var backdrop = cfg.backdrop || [];
    var backdropFmt = cfg.backdropFmt || fmt;
    var n = dates.length;
    var W = 640, H = 300;
    var margin = { top: 16, right: series.length > 1 ? 22 : 58, bottom: 32, left: 50 };
    var x0 = margin.left, x1 = W - margin.right, y0 = margin.top, y1 = H - margin.bottom;

    if (n === 0) {
      container.innerHTML = '<div class="chart-loading">Sem dados suficientes ainda — aguardando a planilha.</div>';
      return;
    }

    var min = Infinity, max = -Infinity;
    series.forEach(function (s) { s.data.forEach(function (v) { if (v < min) min = v; if (v > max) max = v; }); });
    var pad = (max - min) * 0.14 || 1;
    var scale = niceScale(min - pad, max + pad, 5);

    function xAt(i) { return x0 + (x1 - x0) * (n === 1 ? 0 : i / (n - 1)); }
    function yAt(v) { return y1 - (y1 - y0) * ((v - scale.min) / (scale.max - scale.min)); }

    // Backdrop (e.g. Fed balance-sheet holdings) is context, not the reading
    // axis: it gets its own independent scale, capped below the plot's full
    // height, and no tick labels — stacking a second numeric axis on the same
    // plot as the % lines would imply an alignment between trillions and
    // percent that doesn't exist. Layer order: bottom-most = first entry.
    var bdLayers = [];
    if (backdrop.length) {
      var running = new Array(n).fill(0);
      backdrop.forEach(function (b) {
        var bottomArr = running.slice();
        var topArr = b.data.map(function (v, i) { running[i] += v; return running[i]; });
        bdLayers.push({ label: b.label, color: b.color, data: b.data, bottom: bottomArr, top: topArr });
      });
      var bdCeil = Math.max.apply(null, running) * 1.18 || 1;
    }
    function bdY(v) { return y1 - (y1 - y0) * 0.82 * (v / bdCeil); }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "chart-svg", role: "img", "aria-label": series.map(function (s) { return s.label; }).join(" vs ") });

    if (bdLayers.length) {
      var bdG = el("g", {});
      bdLayers.forEach(function (layer, li) {
        var topPts = layer.top.map(function (v, i) { return [xAt(i), bdY(v)]; });
        var botPts = layer.bottom.map(function (v, i) { return [xAt(i), bdY(v)]; });
        var d = topPts.map(function (p, i) { return (i === 0 ? "M" : "L") + p[0].toFixed(2) + "," + p[1].toFixed(2); }).join(" ")
          + " " + botPts.slice().reverse().map(function (p) { return "L" + p[0].toFixed(2) + "," + p[1].toFixed(2); }).join(" ")
          + " Z";
        bdG.appendChild(el("path", { d: d, fill: layer.color, opacity: li === 0 ? 0.16 : 0.11, stroke: "none" }));
      });
      svg.appendChild(bdG);
    }

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
      if (bdLayers.length) {
        var divider = document.createElement("div");
        divider.className = "tooltip-divider";
        tooltip.appendChild(divider);
        bdLayers.forEach(function (layer) {
          var row = document.createElement("div");
          row.className = "tooltip-row";
          var left = document.createElement("span");
          left.className = "tooltip-name";
          var key = document.createElement("span");
          key.className = "tooltip-key area";
          key.style.background = layer.color;
          left.appendChild(key);
          var nameSpan = document.createElement("span");
          nameSpan.textContent = layer.label;
          left.appendChild(nameSpan);
          var val = document.createElement("span");
          val.className = "tooltip-val";
          val.textContent = backdropFmt(layer.data[i]) + " T";
          row.appendChild(left); row.appendChild(val);
          tooltip.appendChild(row);
        });
      }
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
      if (series.length > 1 || bdLayers.length) {
        series.forEach(function (s) {
          var item = document.createElement("span");
          item.className = "legend-item";
          var sw = document.createElement("span");
          sw.className = "legend-swatch line";
          sw.style.background = s.color;
          item.appendChild(sw);
          var txt = document.createElement("span");
          txt.textContent = s.label;
          item.appendChild(txt);
          legendHost.appendChild(item);
        });
        bdLayers.forEach(function (layer) {
          var item = document.createElement("span");
          item.className = "legend-item";
          var sw = document.createElement("span");
          sw.className = "legend-swatch area";
          sw.style.background = layer.color;
          item.appendChild(sw);
          var txt = document.createElement("span");
          txt.textContent = layer.label;
          item.appendChild(txt);
          legendHost.appendChild(item);
        });
        if (bdLayers.length) {
          var note = document.createElement("span");
          note.className = "legend-note";
          note.textContent = "Balanço do Fed em escala própria";
          legendHost.appendChild(note);
        }
      }
    }

    var tableHost = container.parentElement.querySelector(".data-table-wrap");
    var headers = ["Período"].concat(series.map(function (s) { return s.label; })).concat(bdLayers.map(function (b) { return b.label; }));
    var rows = [];
    for (var i = n - 1; i >= 0; i--) {
      rows.push([dates[i]]
        .concat(series.map(function (s) { return fmt(s.data[i]); }))
        .concat(bdLayers.map(function (b) { return backdropFmt(b.data[i]) + " T"; })));
    }
    buildTable(tableHost, headers, rows);
  }

  /* ============================== app wiring ============================== */
  var state = { rangeYears: 5 };
  var DATASETS = {};

  function sliceMonthly(arr) { return state.rangeYears === "max" ? arr : arr.slice(-state.rangeYears * 12); }

  // Every chart shares the same backdrop (Fed's Treasury + MBS holdings) and
  // the same Fed Funds reference line — only the highlighted series changes.
  function fedBackdrop(values) {
    return [
      { label: "Títulos do Tesouro", color: "var(--ink-muted)", data: values.fedTreasuries },
      { label: "MBS", color: "var(--ink-secondary)", data: values.fedMbs }
    ];
  }

  function renderTimeSeries() {
    var j = DATASETS.juros;
    renderLineChart(document.getElementById("chart-juros"), {
      dates: sliceMonthly(j.dates),
      series: [
        { label: "Fed Funds", color: "var(--series-1)", data: sliceMonthly(j.values.fedFunds) },
        { label: "Treasury 10 anos", color: "var(--series-2)", data: sliceMonthly(j.values.treasury10y) }
      ],
      backdrop: fedBackdrop({ fedTreasuries: sliceMonthly(j.values.fedTreasuries), fedMbs: sliceMonthly(j.values.fedMbs) }),
      fmt: fmtPct1, backdropFmt: fmtTrillion
    });

    var p = DATASETS.pce;
    renderLineChart(document.getElementById("chart-pce"), {
      dates: sliceMonthly(p.dates),
      series: [
        { label: "Fed Funds", color: "var(--series-1)", data: sliceMonthly(p.values.fedFunds) },
        { label: "PCE", color: "var(--series-2)", data: sliceMonthly(p.values.pce) },
        { label: "Core PCE", color: "var(--series-3)", data: sliceMonthly(p.values.corePce) }
      ],
      backdrop: fedBackdrop({ fedTreasuries: sliceMonthly(p.values.fedTreasuries), fedMbs: sliceMonthly(p.values.fedMbs) }),
      fmt: fmtPct1, backdropFmt: fmtTrillion
    });

    var c = DATASETS.cpi;
    renderLineChart(document.getElementById("chart-cpi"), {
      dates: sliceMonthly(c.dates),
      series: [
        { label: "Fed Funds", color: "var(--series-1)", data: sliceMonthly(c.values.fedFunds) },
        { label: "CPI (a/a)", color: "var(--series-2)", data: sliceMonthly(c.values.cpi) }
      ],
      backdrop: fedBackdrop({ fedTreasuries: sliceMonthly(c.values.fedTreasuries), fedMbs: sliceMonthly(c.values.fedMbs) }),
      fmt: fmtPct1, backdropFmt: fmtTrillion
    });

    var u = DATASETS.unemployment;
    renderLineChart(document.getElementById("chart-unemployment"), {
      dates: sliceMonthly(u.dates),
      series: [
        { label: "Fed Funds", color: "var(--series-1)", data: sliceMonthly(u.values.fedFunds) },
        { label: "Desemprego", color: "var(--series-2)", data: sliceMonthly(u.values.unemployment) }
      ],
      backdrop: fedBackdrop({ fedTreasuries: sliceMonthly(u.values.fedTreasuries), fedMbs: sliceMonthly(u.values.fedMbs) }),
      fmt: fmtPct1, backdropFmt: fmtTrillion
    });
  }

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

  function renderStatStrip() {
    var f = statPair(DATASETS.juros.values.fedFunds);
    if (f) paintStat("stat-fedfunds-value", "stat-fedfunds-delta", f.last, Math.round((f.last - f.prev) * 100), "pb");
    var t = statPair(DATASETS.juros.values.treasury10y);
    if (t) paintStat("stat-t10y-value", "stat-t10y-delta", t.last, Math.round((t.last - t.prev) * 100), "pb");
    var u = statPair(DATASETS.unemployment.values.unemployment);
    if (u) paintStat("stat-unemp-value", "stat-unemp-delta", u.last, Math.round((u.last - u.prev) * 10) / 10, "pp");
    var c = statPair(DATASETS.cpi.values.cpi);
    if (c) paintStat("stat-cpi-value", "stat-cpi-delta", c.last, Math.round((c.last - c.prev) * 10) / 10, "pp");
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

    var loaded = await loadTable();
    var rows = loaded.rows, demo = loaded.demo;

    var backdropCols = ["fedTreasuries", "fedMbs"];
    DATASETS.juros = alignSeries(rows, ["fedFunds", "treasury10y"].concat(backdropCols));
    DATASETS.cpi = alignSeries(rows, ["fedFunds", "cpi"].concat(backdropCols));
    DATASETS.pce = alignSeries(rows, ["fedFunds", "pce", "corePce"].concat(backdropCols));
    DATASETS.unemployment = alignSeries(rows, ["fedFunds", "unemployment"].concat(backdropCols));

    ["juros", "cpi", "pce", "unemployment"].forEach(function (key) { setDemoBadge(key, demo); });
    var notice = document.getElementById("global-notice");
    if (notice) notice.classList.toggle("visible", demo);

    renderStatStrip();
    renderTimeSeries();

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
