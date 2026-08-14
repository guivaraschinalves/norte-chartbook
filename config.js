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
  lede: "Política monetária, inflação, emprego e o balanço do Fed — atualizados a partir de uma planilha do Google Sheets.",
  sourceLabel: "planilha Google Sheets",
};

// ----------------------------------------------------------------------------
// Uma única aba, publicada como CSV, alimenta todos os gráficos abaixo.
// Arquivo > Compartilhar > Publicar na Web > selecione a aba > formato CSV.
// ----------------------------------------------------------------------------
var DATA_SOURCE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSFj27mZ1xjhO937jTx-4DHshrfnsbkynTOhYh9MS9Z0D9jroV2hu-0iUfrv3vh-9TKs9CWDnF--RMR/pub?gid=146353345&single=true&output=csv";

// Nome exato (cabeçalho) da coluna de período/data na aba.
var DATE_COLUMN = "Data";

// Para cada série usada nos gráficos: o nome exato do cabeçalho da coluna na
// planilha. "scale" (opcional) multiplica o valor lido — usado aqui para
// converter os saldos do Fed, que vêm em US$ milhões, para US$ trilhões.
var SERIES_CONFIG = {
  fedFunds:        { column: "Federal Funds Effective Rate" },
  treasury10y:      { column: "Treasury de 10 anos" },
  cpi:              { column: "CPI - Var. % Anual" },
  unemployment:     { column: "Taxa de Desemprego" },
  pce:              { column: "PCE - Var. % Anual" },
  corePce:          { column: "Core PCE" },
  trimmedMeanPce:   { column: "PCE Trimmed Mean" },
  fedTreasuries:    { column: "Títulos do Tesouro dos EUA (US$ trilhões)", scale: 0.000001 },
  fedMbs:           { column: "Títulos Lastreados em Hipotecas (US$ trilhões)", scale: 0.000001 },
};
