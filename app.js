(function () {
  "use strict";

  function el(tag, className) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    return e;
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

  function init() {
    applyBranding();
    buildGallery();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
