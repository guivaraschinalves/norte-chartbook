# Chart Book

Site estático (HTML/CSS/JS puro, sem build, sem dependências) que publica
gráficos exportados como **imagem do PowerPoint** — no estilo do chart book
da Yardeni Research: uma galeria organizada por tema, não gráficos
interativos reconstruídos em código.

## Por que imagem, e não gráfico interativo

Uma versão anterior deste projeto redesenhava cada gráfico em código
(SVG/JS), tentando reproduzir o visual do Excel/PowerPoint — o que só
funciona bem se você reconstrói cada gráfico à mão, o que não escala.
Sites como o do Yardeni fazem o oposto: o gráfico é desenhado **uma vez**,
na ferramenta que já se conhece (aqui, PowerPoint), e o site só exibe a
imagem exportada. Atualizar = reexportar e trocar o arquivo.

## Por que pastas, e não um arquivo de configuração

Uma versão anterior listava cada gráfico manualmente em `config.js`. Isso
quebrava assim que o projeto precisasse de mais de um assunto (não só
Balanço de Pagamentos), a ordem dos slides no PowerPoint mudasse, ou o
número de gráficos passasse de umas dezenas — qualquer uma dessas coisas
exigia editar código.

Agora **o site lê a estrutura de pastas do próprio repositório** (via API
do GitHub) e monta a galeria sozinho: uma pasta por tema, um arquivo por
gráfico, o nome de cada um já diz onde ele entra. Adicionar, remover,
renomear ou reordenar um gráfico é só mexer em arquivos — direto pela
interface do GitHub, sem editar nenhum código. Veja `charts/README.md`
para o formato exato.

## Estrutura

```
index.html    → casca da página (sidebar, cabeçalho) — não precisa editar
styles.css    → visual (cores, tipografia, layout)
app.js        → descobre os gráficos (API do GitHub) e monta a galeria
config.js     → ← É AQUI que você mexe: marca do site e qual repositório ler
charts/       → ← os PNGs entram aqui, organizados por pasta (veja charts/README.md)
README.md     → este arquivo
```

## Como exportar os gráficos do PowerPoint

**Se o slide tem só o gráfico** (a maioria dos casos):
`Arquivo → Exportar → Alterar Tipo de Arquivo → PNG` (ou `Salvar Como` →
formato PNG) → escolha **"Todos os Slides"**. O PowerPoint salva cada slide
como um PNG separado numa pasta — renomeie cada um para o padrão
`"NN - Título - Subtítulo.png"` (veja `charts/README.md`) antes de subir.

**Se o slide tem outros elementos junto** (título solto, nota de rodapé
fora do gráfico): clique direito em cima do gráfico → **Salvar como
Imagem** — exporta só o gráfico, recortado, sem o resto do slide.

## Gerenciando os gráficos pelo GitHub (sem terminal)

Tudo dentro de `charts/`, sem tocar em código — veja `charts/README.md`
para o formato de nomes de pasta e arquivo (inclui como agrupar vários
temas sob um assunto maior, ex: todos os temas do Balanço de Pagamentos
sob uma pasta "Balanço de Pagamentos - Brasil"). Resumo do dia a dia:

**Atualizar um gráfico existente** (a tarefa mais comum):
1. No repositório, entre em `charts/` → pasta do tema (e do assunto, se
   houver) → você vai ver o arquivo atual.
2. Clique em **"Add file" → "Upload files"** (canto superior direito da
   lista de arquivos).
3. Arraste o PNG novo **com exatamente o mesmo nome** do arquivo antigo.
   O GitHub substitui o conteúdo, mantendo o nome (então título/ordem no
   site não mudam — só a imagem).
4. Role até o fim, clique **"Commit changes"**. Em ~1 minuto o GitHub
   Pages já republicou. Se abrir o site e a imagem parecer a mesma de
   antes, é cache do navegador — dá um `Ctrl+Shift+R` (ou `Cmd+Shift+R`
   no Mac) pra forçar recarregar.

**Gráfico novo**: mesma tela de upload, mas com um nome novo no padrão
`"NN - Título - Subtítulo.png"`, na pasta do tema certo.

**Tema novo**: clique em "Add file → Upload files", e no campo de nome do
arquivo digite o caminho completo incluindo uma pasta nova, ex:
`06 Nome do Tema/01 - Primeiro Gráfico.png` — o GitHub cria a pasta
sozinho ao subir o primeiro arquivo dentro dela.

**Reordenar**: abra o arquivo (ou pasta) no GitHub, clique no ícone de
lápis (editar), mude só o número no começo do nome, confirme o commit.

**Remover**: abra o arquivo, clique na lixeira, confirme o commit.

## Testar localmente

```
cd norte-chartbook
python3 -m http.server 8000
```

Abra `http://localhost:8000`. Como a lista de gráficos vem da API pública
do GitHub, o teste local já reflete o que está publicado no repositório
(não o que está só no seu disco, se ainda não deu `git push`).

## Publicar

```
cd norte-chartbook
git add .
git commit -m "Atualiza gráficos"
git push
```

O GitHub Pages já está configurado neste repositório — o site atualiza
sozinho alguns minutos depois do push. Sem terminal? Dá pra fazer tudo
(criar pasta, subir arquivo, renomear, apagar) direto pela interface do
GitHub, sem nunca abrir um terminal.

## Limite da API do GitHub

O site busca a lista de gráficos na API pública do GitHub, que permite 60
requisições por hora por IP sem login. Cada visita consome 1 requisição
(o resultado fica em cache no navegador por 5 minutos, então recarregar a
mesma aba não conta de novo). Para o uso atual isso é folgado; se um dia o
site tiver tráfego alto o bastante para esbarrar nesse limite, a solução é
gerar um `manifest.json` automaticamente a cada `git push` (via GitHub
Actions) e o site passar a ler esse arquivo em vez de chamar a API
diretamente — aviso quando/se isso virar necessário.
