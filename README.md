# Chart Book

Site estático (HTML/CSS/JS puro, sem build, sem dependências) para publicar
gráficos de mercado e macroeconomia a partir de uma planilha do Google Sheets —
no estilo do chart book da Yardeni Research, com leitura interativa.

Enquanto você não conecta a planilha, o site funciona normalmente com dados de
exemplo (sintéticos) em todos os gráficos — cada um passa a usar dados reais
assim que o link correspondente é preenchido em `config.js`.

## Estrutura

```
index.html    → estrutura da página (não precisa editar no dia a dia)
styles.css    → visual (cores, tipografia, layout)
app.js        → motor dos gráficos + leitura da planilha (não precisa editar)
config.js     → ← É AQUI que você mexe: nome do site e links da planilha
README.md     → este arquivo
```

## Passo 1 — Criar a planilha no Google Sheets

Crie uma planilha com **uma aba por gráfico**, com estas colunas exatas
(primeira linha = cabeçalho, sem acento ou espaço no nome da coluna):

| Aba (nome sugerido) | Colunas | Exemplo de linha |
|---|---|---|
| SP500 | `Periodo`, `Valor` | `ago/26`, `6012.75` |
| Desemprego | `Periodo`, `Valor` | `ago/26`, `4.1` |
| CPI | `Periodo`, `Valor` | `ago/26`, `2.9` |
| Juros | `Periodo`, `FedFunds`, `Treasury10Y` | `ago/26`, `3.4`, `4.01` |
| PIB | `Periodo`, `Valor` | `T2/26`, `2.1` |
| Setores | `Setor`, `Valor` | `Tecnologia`, `24.3` |

Observações:
- `Periodo` é só texto — escreva do jeito que quer que apareça no eixo do
  gráfico (`ago/26`, `T2/26`, etc.). Não precisa ser uma data de verdade.
  Nas abas de série temporal (todas exceto Setores), deixe as linhas em ordem
  cronológica crescente (mais antiga primeiro).
- Nas colunas de valor, tanto `2.9` quanto `2,9` funcionam — o site entende os
  dois formatos, e também aceita separador de milhar (`5.912,34` ou
  `5,912.34`) e `%` no final da célula.
- A aba **Setores** não precisa estar em ordem — o site ordena sozinho, do
  maior para o menor valor.

## Passo 2 — Publicar cada aba como CSV

Para cada aba, dentro do Google Sheets:

1. **Arquivo → Compartilhar → Publicar na Web**
2. No primeiro menu, troque "Documento inteiro" pela aba específica (ex: "SP500")
3. No segundo menu, escolha **Valores separados por vírgula (.csv)**
4. Clique em **Publicar** e confirme
5. Copie o link gerado (algo como
   `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=123&single=true&output=csv`)

Repita para as 6 abas.

> A planilha precisa estar com o compartilhamento "Qualquer pessoa com o link
> pode visualizar" (ou publicada), já que o site vai buscar o CSV sem login.

## Passo 3 — Colar os links em `config.js`

Abra `config.js` e cole cada link no campo `url` correspondente:

```js
const SHEET_CONFIG = {
  sp500:        { url: "COLE_AQUI_O_LINK_DA_ABA_SP500", columns: [...] },
  unemployment: { url: "COLE_AQUI_O_LINK_DA_ABA_DESEMPREGO", columns: [...] },
  ...
};
```

Você também pode ajustar o nome do site em `SITE_CONFIG` (topo do mesmo
arquivo) — `brandName`, `pageTitle`, `lede`, etc.

## Passo 4 — Testar localmente

Como o navegador bloqueia `fetch` em arquivos abertos direto com `file://`,
rode um servidor simples na pasta do projeto:

```
cd norte-chartbook
python3 -m http.server 8000
```

E abra `http://localhost:8000` no navegador.

## Passo 5 — Publicar o site (GitHub Pages, grátis)

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
republicar o código. Só é preciso repetir o Passo 5 (novo `git push`) quando
você alterar a estrutura do site (`index.html`, `styles.css`, `app.js`) ou os
links em `config.js`.
