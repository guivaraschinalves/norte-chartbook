# Chart Book

Site estático (HTML/CSS/JS puro, sem build, sem dependências) que publica
gráficos exportados como **imagem do PowerPoint** — no estilo do chart book
da Yardeni Research: uma galeria organizada por tema, não gráficos
interativos reconstruídos em código.

## Por que imagem, e não gráfico interativo

A primeira versão deste projeto redesenhava cada gráfico em código
(SVG/JS), tentando reproduzir o visual do Excel/PowerPoint — o que só
funciona bem se você reconstrói cada gráfico à mão, o que não escala.
Sites como o do Yardeni fazem o oposto: o gráfico é desenhado **uma vez**,
na ferramenta que já se conhece (aqui, PowerPoint), e o site só exibe a
imagem exportada. Atualizar = reexportar e trocar o arquivo.

## Estrutura

```
index.html    → casca da página (sidebar, cabeçalho)
styles.css    → visual (cores, tipografia, layout)
app.js        → monta a galeria e o menu lateral a partir de config.js
config.js     → ← É AQUI que você mexe: marca, temas e gráficos
charts/       → ← as imagens PNG exportadas do PowerPoint entram aqui
README.md     → este arquivo
```

## Como exportar os gráficos do PowerPoint

**Se o slide tem só o gráfico** (a maioria dos seus casos):
`Arquivo → Exportar → Alterar Tipo de Arquivo → PNG` (ou `Salvar Como` →
formato PNG) → escolha **"Todos os Slides"**. O PowerPoint salva cada slide
como `Slide1.PNG`, `Slide2.PNG`, etc. — os mesmos nomes já usados em
`config.js`, então basta substituir os arquivos em `charts/` e publicar
(veja "Publicar" abaixo). Nada mais precisa mudar, desde que a ordem e a
quantidade de slides continuem as mesmas.

**Se o slide tem outros elementos junto** (proporção pequena): clique
direito em cima do gráfico → **Salvar como Imagem** — exporta só o
gráfico, recortado, sem o resto do slide. Dê o nome que preferir e ajuste o
campo `image` daquele gráfico em `config.js`.

## Adicionando ou trocando um gráfico

Tudo em `config.js`, sem tocar em mais nada:

```js
var CHARTS = [
  { section: "conta-corrente", title: "Conta Corrente do Brasil", subtitle: "US$ bilhões, acumulado em 12 meses", image: "charts/Slide7.PNG" },
  // adicione um bloco assim para cada gráfico novo
];
```

- `section` precisa bater com o `id` de um item em `SECTIONS` (ou crie um
  tema novo ali).
- `image` é o caminho do arquivo PNG dentro de `charts/`.
- Se a ordem dos slides no PowerPoint mudar, o número de cada `SlideN.PNG`
  muda junto — reabra o deck exportado e confira qual slide é qual antes de
  atualizar `config.js` (ou fixe a ordem dos slides no PowerPoint para não
  precisar checar toda vez).
- Um gráfico listado aqui sem o arquivo correspondente aparece no site como
  um aviso "Imagem não encontrada" — nunca quebra a página.

## Testar localmente

```
cd norte-chartbook
python3 -m http.server 8000
```

Abra `http://localhost:8000`.

## Publicar

```
cd norte-chartbook
git add .
git commit -m "Atualiza gráficos"
git push
```

O GitHub Pages já está configurado neste repositório — o site atualiza
sozinho alguns minutos depois do push. Sem terminal? Dá pra arrastar os
PNGs novos direto pela interface do GitHub (`Add file → Upload files` na
pasta `charts/`) e o Pages também rebuilda sozinho.
