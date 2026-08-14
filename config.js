// ============================================================================
// CONFIGURAÇÃO DO SITE
// Edite este arquivo para personalizar a marca e conectar sua planilha do
// Google Sheets. Não é preciso mexer em index.html, styles.css ou app.js
// para o uso do dia a dia.
// ============================================================================

var SITE_CONFIG = {
  brandName: "Norte Research",
  tagline: "Chart Book",
  pageTitle: "Painel Macro & Mercados",
  lede: "Gráficos de mercado e macroeconomia, atualizados a partir de uma planilha do Google Sheets.",
  sourceLabel: "planilha Google Sheets",
};

// ----------------------------------------------------------------------------
// Para cada gráfico abaixo: publique a ABA correspondente da sua planilha como
// CSV (Arquivo > Compartilhar > Publicar na Web > selecione a aba > formato
// CSV > Publicar) e cole o link gerado no campo "url". O passo a passo
// completo, com o formato de colunas de cada aba, está no README.md.
//
// Enquanto "url" estiver vazio (""), o gráfico mostra dados de exemplo — o
// site funciona normalmente antes mesmo de você terminar de configurar a
// planilha, e cada gráfico "liga" sozinho assim que o link for colado.
// ----------------------------------------------------------------------------
var SHEET_CONFIG = {
  sp500:        { url: "", columns: ["Periodo", "Valor"] },
  unemployment: { url: "", columns: ["Periodo", "Valor"] },
  cpi:          { url: "", columns: ["Periodo", "Valor"] },
  juros:        { url: "", columns: ["Periodo", "FedFunds", "Treasury10Y"] },
  gdp:          { url: "", columns: ["Periodo", "Valor"] },
  sectors:      { url: "", columns: ["Setor", "Valor"] },
};
