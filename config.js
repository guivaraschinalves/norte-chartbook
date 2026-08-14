// ============================================================================
// CONFIGURAÇÃO DO SITE
// Este é o único arquivo que você deve precisar editar no dia a dia.
// ============================================================================

var SITE_CONFIG = {
  brandName: "Norte Research",
  tagline: "Chart Book",
  pageTitle: "Painel Macro & Mercados",
  lede: "Gráficos exportados do PowerPoint, publicados como imagem — organizados por tema.",
  sourceLabel: "PowerPoint",
};

// ----------------------------------------------------------------------------
// TEMAS — a ordem aqui é a ordem no site e no menu lateral.
// ----------------------------------------------------------------------------
var SECTIONS = [
  { id: "juros", label: "Política monetária" },
  { id: "inflacao", label: "Inflação" },
  { id: "emprego", label: "Emprego" },
];

// ----------------------------------------------------------------------------
// GRÁFICOS — para adicionar um gráfico novo, copie um bloco abaixo. Não é
// preciso mexer em mais nenhum arquivo.
//
//   section  → o "id" de um item de SECTIONS acima
//   title    → título mostrado no card
//   image    → caminho do arquivo PNG (pasta charts/) — exporte do
//              PowerPoint com esse nome exato (veja o README.md)
//   subtitle → (opcional) linha menor abaixo do título
//   updated  → (opcional) texto livre, ex: "14 ago 2026"
//   source   → (opcional) sobrescreve o "Fonte:" padrão do rodapé do card
// ----------------------------------------------------------------------------
var CHARTS = [
  { section: "juros", title: "Juros — Fed Funds vs. Treasury 10 anos", image: "charts/juros.png" },
  { section: "inflacao", title: "CPI", image: "charts/cpi.png" },
  { section: "inflacao", title: "PCE — cheio vs. núcleo", image: "charts/pce.png" },
  { section: "emprego", title: "Taxa de desemprego", image: "charts/desemprego.png" },
];
