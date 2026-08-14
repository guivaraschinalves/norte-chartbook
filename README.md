# Chart Book

Site estático (HTML/CSS/JS puro, sem build, sem dependências) para publicar
gráficos de política monetária, inflação, emprego e o balanço do Fed a partir
de uma planilha do Google Sheets — no estilo do chart book da Yardeni
Research, com leitura interativa.

## Estrutura

```
index.html    → estrutura da página (não precisa editar no dia a dia)
styles.css    → visual (cores, tipografia, layout)
app.js        → motor dos gráficos + leitura da planilha (não precisa editar)
config.js     → ← É AQUI que você mexe: marca, link da planilha e colunas
README.md     → este arquivo
```

## Como funciona

Diferente da primeira versão deste projeto, **os dados vêm de uma única aba**
publicada como CSV — cada coluna da planilha vira uma série em algum
gráfico. Isso é o que já está configurado em `config.js`:

- `DATA_SOURCE_URL` — o link de "Publicar na Web" (CSV) da sua aba.
- `DATE_COLUMN` — o nome da coluna de período (`"Data"`).
- `SERIES_CONFIG` — um mapa `chave → { column, scale }`, onde `column` é o
  nome exato do cabeçalho na planilha e `scale` (opcional) multiplica o valor
  lido (usado para os saldos do Fed, que vêm em US$ milhões na planilha e são
  exibidos em US$ trilhões).

Cada gráfico lê uma ou mais dessas séries e **mantém apenas as linhas em que
todas elas têm valor** — se uma célula está em branco (dado ainda não
divulgado), aquele mês simplesmente não entra no gráfico, em vez de mostrar
um zero ou um furo inventado. Por isso é normal um gráfico "terminar" num mês
mais antigo que outro: cada um respeita a defasagem de divulgação da sua
própria fonte.

Se o link em `DATA_SOURCE_URL` estiver vazio ou a planilha não carregar por
qualquer motivo, o site cai automaticamente para dados de exemplo (com um
aviso visível no topo) — ele nunca quebra a página.

## Adicionando ou trocando uma série

1. Na planilha, garanta que a coluna tem um cabeçalho claro na primeira linha.
2. Em `config.js`, adicione uma entrada em `SERIES_CONFIG` com o nome exato
   desse cabeçalho.
3. Em `app.js`, dentro de `renderTimeSeries()`, use essa chave num
   `alignSeries(rows, ["suaChave", ...])` para montar um gráfico novo (copie
   um card existente em `index.html` como ponto de partida, com um `<div
   id="chart-...">` novo).

## Testar localmente

Como o navegador bloqueia `fetch` em arquivos abertos direto com `file://`,
rode um servidor simples na pasta do projeto:

```
cd norte-chartbook
python3 -m http.server 8000
```

E abra `http://localhost:8000` no navegador.

## Publicar o site (GitHub Pages, grátis)

```
cd norte-chartbook
git init
git add .
git commit -m "Primeira versão do chart book"

gh auth login              # se ainda não tiver feito login no GitHub
gh repo create norte-chartbook --public --source=. --push

gh api -X PUT repos/:owner/norte-chartbook/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

Depois de alguns minutos, o site fica no ar em
`https://SEU_USUARIO.github.io/norte-chartbook/`.

Alternativa igualmente simples: importar o repositório no
[vercel.com](https://vercel.com) ou [netlify.com](https://netlify.com) (ambos
têm plano grátis e detectam automaticamente que é um site estático — nenhuma
configuração de build é necessária).

## Atualizando os dados

Edite a planilha normalmente no Google Sheets — o site busca o CSV publicado
a cada visita, então a mudança aparece em minutos, sem precisar reeditar ou
republicar o código. Só é preciso repetir o passo de deploy (novo `git push`)
quando você alterar `index.html`, `styles.css`, `app.js` ou `config.js`.

> **Compartilhamento:** a aba publicada como CSV é acessível por qualquer
> pessoa com o link, sem exigir login — é assim que o site consegue buscá-la.
> Não publique dados sensíveis nessa aba específica.
