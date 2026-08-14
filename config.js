// ============================================================================
// CONFIGURAÇÃO DO SITE
// A partir de agora o site descobre os gráficos sozinho a partir da
// estrutura de pastas do repositório — não é preciso listar cada gráfico
// aqui. Veja o README.md para como organizar as pastas.
// ============================================================================

var SITE_CONFIG = {
  brandName: "Follow the Money",
  tagline: "Chart Book",
  pageTitle: "Balanço de Pagamentos do Brasil",
  lede: "Conta corrente, conta financeira, conta capital e indicadores complementares — gráficos exportados do PowerPoint, publicados como imagem.",
  sourceLabel: "BCB",
};

// Onde o site vai procurar os gráficos: a pasta "charts/" deste repositório.
var REPO_CONFIG = {
  owner: "guivaraschinalves",
  repo: "norte-chartbook",
  branch: "master",
  chartsPath: "charts",
};
