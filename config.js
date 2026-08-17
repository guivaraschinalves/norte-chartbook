// ============================================================================
// CONFIGURAÇÃO DO SITE
// A partir de agora o site descobre os gráficos sozinho a partir da
// estrutura de pastas do repositório — não é preciso listar cada gráfico
// aqui. Veja o README.md para como organizar as pastas.
// ============================================================================

var SITE_CONFIG = {
  brandName: "Follow the Money",
  tagline: "Chart Book",
  pageTitle: "Gráficos Follow the Money / Fernando Ulrich",
  lede: "Monitoramento de indicadores macroeconômicos e de mercados: balanço de pagamentos, inflação, política monetária, atividade econômica e dados globais.",
  sourceLabel: "FtM",
};

// Onde o site vai procurar os gráficos: a pasta "charts/" deste repositório.
var REPO_CONFIG = {
  owner: "guivaraschinalves",
  repo: "ftm-chartbook",
  branch: "master",
  chartsPath: "charts",
};
