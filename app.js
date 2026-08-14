(function () {
  "use strict";

  function el(tag, className) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "grafico";
  }

  function downloadName(chart) {
    var label = chart.title + (chart.subtitle ? " " + chart.subtitle : "");
    var ext = (chart.image.match(/\.[a-zA-Z0-9]+$/) || [".png"])[0].toLowerCase();
    return slugify(label) + ext;
  }

  /* ============================== lightbox (zoom / fullscreen) ============================== */
  var lightbox = null;
  function buildLightbox() {
    var box = el("div", "lightbox");
    box.id = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Imagem em tela cheia");
    box.hidden = true;

    var closeBtn = el("button", "lightbox-close");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Fechar");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", closeLightbox);

    var img = document.createElement("img");
    img.className = "lightbox-img";
    img.id = "lightbox-img";
    img.alt = "";

    var download = document.createElement("a");
    download.className = "lightbox-download";
    download.id = "lightbox-download";
    download.textContent = "Baixar imagem";

    box.appendChild(closeBtn);
    box.appendChild(img);
    box.appendChild(download);
    box.addEventListener("click", function (evt) {
      if (evt.target === box) closeLightbox();
    });
    document.body.appendChild(box);

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" && !box.hidden) closeLightbox();
    });

    lightbox = { box: box, img: img, download: download, trigger: null };
  }

  function openLightbox(chart, triggerEl) {
    if (!lightbox) return;
    lightbox.img.src = chart.image;
    lightbox.img.alt = chart.title;
    lightbox.download.href = chart.image;
    lightbox.download.setAttribute("download", downloadName(chart));
    lightbox.trigger = triggerEl || null;
    lightbox.box.hidden = false;
    document.body.classList.add("lightbox-open");
    lightbox.box.querySelector(".lightbox-close").focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.box.hidden) return;
    lightbox.box.hidden = true;
    lightbox.img.src = "";
    document.body.classList.remove("lightbox-open");
    if (lightbox.trigger) lightbox.trigger.focus();
  }

  /* ============================== repo discovery (GitHub file tree -> sections/charts) ============================== */
  var IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

  // "01 - Título - Subtítulo" -> {order, title, subtitle}. Missing leading
  // number, or missing subtitle, degrade gracefully instead of failing.
  function parseOrderedName(raw) {
    var parts = raw.split(" - ").map(function (p) { return p.trim(); }).filter(Boolean);
    var order = 999;
    if (parts.length && /^\d+$/.test(parts[0])) {
      order = parseInt(parts[0], 10);
      parts.shift();
    }
    var title = parts.shift() || raw;
    var subtitle = parts.length ? parts.join(" - ") : "";
    return { order: order, title: title, subtitle: subtitle };
  }

  // "02 Conta corrente" -> {order: 2, label: "Conta corrente"}
  function parseSectionFolder(name) {
    var m = name.match(/^(\d+)\s+(.+)$/);
    if (m) return { order: parseInt(m[1], 10), label: m[2].trim() };
    return { order: 999, label: name };
  }

  async function fetchRepoTree() {
    var rc = window.REPO_CONFIG || {};
    var cacheKey = "chartbook-tree:" + rc.owner + "/" + rc.repo + "/" + rc.branch;
    try {
      var cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Date.now() - parsed.t < 5 * 60 * 1000) return parsed.tree;
      }
    } catch (e) { /* sessionStorage unavailable (private mode etc.) — just skip the cache */ }

    var url = "https://api.github.com/repos/" + rc.owner + "/" + rc.repo + "/git/trees/" + rc.branch + "?recursive=1";
    var res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error("API do GitHub respondeu " + res.status + (res.status === 403 ? " (provavelmente limite de requisições — tente de novo em alguns minutos)" : ""));
    var data = await res.json();
    var tree = data.tree || [];
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), tree: tree })); } catch (e) {}
    return tree;
  }

  // Walks the repo tree and turns charts/<Seção>/<NN - Título - Subtítulo>.png
  // into { sections, charts } — no manifest file to keep in sync by hand.
  function buildSectionsAndCharts(tree) {
    var rc = window.REPO_CONFIG || {};
    var prefix = (rc.chartsPath || "charts").replace(/\/$/, "") + "/";
    var folders = {};
    var charts = [];

    tree.forEach(function (entry) {
      if (entry.type !== "blob" || !entry.path.startsWith(prefix)) return;
      var segs = entry.path.slice(prefix.length).split("/");
      if (segs.length !== 2 || !IMAGE_EXT.test(segs[1])) return; // one folder level deep, images only

      var folderName = segs[0], fileName = segs[1];
      if (!folders[folderName]) {
        var sec = parseSectionFolder(folderName);
        folders[folderName] = { id: slugify(folderName), order: sec.order, label: sec.label };
      }
      var parsed = parseOrderedName(fileName.replace(IMAGE_EXT, ""));
      charts.push({
        section: folders[folderName].id,
        order: parsed.order,
        title: parsed.title,
        subtitle: parsed.subtitle,
        image: entry.path.split("/").map(encodeURIComponent).join("/")
      });
    });

    var sections = Object.keys(folders).map(function (k) { return folders[k]; });
    sections.sort(function (a, b) { return a.order - b.order || a.label.localeCompare(b.label, "pt-BR"); });
    charts.sort(function (a, b) { return a.order - b.order || a.title.localeCompare(b.title, "pt-BR"); });
    return { sections: sections, charts: charts };
  }

  /* ============================== gallery (image cards) ============================== */
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
    var zoomBtn = el("button", "chart-image-btn");
    zoomBtn.type = "button";
    zoomBtn.setAttribute("aria-label", "Ver em tela cheia: " + chart.title);
    var img = document.createElement("img");
    img.src = chart.image;
    img.alt = chart.title;
    img.loading = "lazy";
    var imageOk = true;
    img.addEventListener("error", function () {
      imageOk = false;
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
    zoomBtn.appendChild(img);
    zoomBtn.addEventListener("click", function () {
      if (imageOk) openLightbox(chart, zoomBtn);
    });
    imgWrap.appendChild(zoomBtn);
    card.appendChild(imgWrap);

    var actions = el("div", "chart-actions");
    var zoomLink = el("button", "chart-action");
    zoomLink.type = "button";
    zoomLink.textContent = "Tela cheia";
    zoomLink.addEventListener("click", function () {
      if (imageOk) openLightbox(chart, zoomLink);
    });
    var downloadLink = el("a", "chart-action");
    downloadLink.href = chart.image;
    downloadLink.setAttribute("download", downloadName(chart));
    downloadLink.textContent = "Baixar";
    actions.appendChild(zoomLink);
    actions.appendChild(downloadLink);
    card.appendChild(actions);

    var footer = el("div", "chart-footer");
    var src = document.createElement("span");
    src.textContent = "Fonte: " + (chart.source || (window.SITE_CONFIG || {}).sourceLabel || "PowerPoint");
    var upd = document.createElement("span");
    upd.textContent = chart.updated ? ("Atualizado " + chart.updated) : "";
    footer.appendChild(src); footer.appendChild(upd);
    card.appendChild(footer);

    return card;
  }

  function buildGallery(SECTIONS, CHARTS) {
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
    buildLightbox();

    var host = document.getElementById("chart-sections");
    if (host) {
      host.innerHTML = "";
      host.appendChild(el("p", "state-message"));
      host.firstChild.textContent = "Carregando gráficos…";
    }

    try {
      var tree = await fetchRepoTree();
      var built = buildSectionsAndCharts(tree);
      if (!built.charts.length) {
        if (host) host.innerHTML = '<p class="state-message">Nenhum gráfico encontrado em <code>charts/</code> ainda. Veja o README.md para o formato esperado de pastas e nomes de arquivo.</p>';
        return;
      }
      buildGallery(built.sections, built.charts);
    } catch (e) {
      console.error("Falha ao listar os gráficos:", e);
      if (host) {
        host.innerHTML = "";
        var box = el("div", "state-message error");
        var strong = document.createElement("strong");
        strong.textContent = "Não foi possível carregar a lista de gráficos.";
        var msg = document.createElement("p");
        msg.textContent = e.message + " — recarregue a página em alguns minutos.";
        box.appendChild(strong); box.appendChild(msg);
        host.appendChild(box);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
