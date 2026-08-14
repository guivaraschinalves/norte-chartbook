// ============================================================================
// CONFIGURAÇÃO DO SITE
// Este é o único arquivo que você deve precisar editar no dia a dia.
// ============================================================================

var SITE_CONFIG = {
  brandName: "Follow the Money",
  tagline: "Chart Book",
  pageTitle: "Balanço de Pagamentos do Brasil",
  lede: "Conta corrente, conta financeira, conta capital e indicadores complementares — gráficos exportados do PowerPoint, publicados como imagem.",
  sourceLabel: "BCB",
};

// ----------------------------------------------------------------------------
// TEMAS — a ordem aqui é a ordem no site e no menu lateral.
// ----------------------------------------------------------------------------
var SECTIONS = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "conta-corrente", label: "Conta corrente" },
  { id: "conta-financeira", label: "Conta financeira" },
  { id: "conta-capital", label: "Conta capital" },
  { id: "complementares", label: "Indicadores complementares" },
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
  { section: "visao-geral", title: "Balanço de Pagamentos do Brasil", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide1.PNG" },
  { section: "visao-geral", title: "Balanço de Pagamentos do Brasil", subtitle: "US$ bilhões, acumulado em 3 meses", image: "charts/Slide2.PNG" },
  { section: "visao-geral", title: "Balanço de Pagamentos do Brasil e Taxa de Câmbio", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide3.PNG" },
  { section: "visao-geral", title: "Saldo do Balanço de Pagamentos do Brasil", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide4.PNG" },
  { section: "visao-geral", title: "Saldo do Balanço de Pagamentos", subtitle: "US$ bilhões, acum. 12 meses; % do PIB (dir.)", image: "charts/Slide5.PNG" },
  { section: "visao-geral", title: "Saldo do Balanço de Pagamentos", subtitle: "US$ bilhões, acum. 3 meses; % do PIB (dir.)", image: "charts/Slide6.PNG" },

  { section: "conta-corrente", title: "Conta Corrente do Brasil", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide7.PNG" },
  { section: "conta-corrente", title: "Conta Corrente do Brasil", subtitle: "US$ bilhões, acumulado em 3 meses", image: "charts/Slide8.PNG" },

  { section: "conta-financeira", title: "Conta Financeira do Brasil", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide9.PNG" },
  { section: "conta-financeira", title: "Conta Financeira do Brasil", subtitle: "US$ bilhões, acumulado em 3 meses", image: "charts/Slide10.PNG" },
  { section: "conta-financeira", title: "Investimento Estrangeiro Direto", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide13.PNG" },
  { section: "conta-financeira", title: "Investimento em Carteira", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide14.PNG" },
  { section: "conta-financeira", title: "Investimento em Carteira no Mercado Doméstico", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide16.PNG" },
  { section: "conta-financeira", title: "Investimento em Carteira no Mercado Doméstico", subtitle: "US$ bilhões, acumulado em 3 meses", image: "charts/Slide15.PNG" },

  { section: "conta-capital", title: "Conta Capital do Brasil", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide11.PNG" },
  { section: "conta-capital", title: "Conta Capital do Brasil", subtitle: "US$ bilhões, acumulado em 3 meses", image: "charts/Slide12.PNG" },

  { section: "complementares", title: "Necessidade de Capital de Curto Prazo", subtitle: "US$ bilhões (Saldo da Conta Corrente − IED no País)", image: "charts/Slide17.PNG" },
  { section: "complementares", title: "Fluxo Externo Líquido Mensal de Criptos", subtitle: "US$ bilhões", image: "charts/Slide18.PNG" },
  { section: "complementares", title: "Fluxo Externo Líquido Acumulado de Criptos", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide19.PNG" },
];
