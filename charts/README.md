# Pasta de gráficos

O site descobre os gráficos sozinho a partir da estrutura desta pasta —
**não existe mais nenhum arquivo de configuração para manter atualizado.**
Adicionar, remover, renomear ou reordenar um gráfico é só mexer nos
arquivos aqui (direto pela interface do GitHub, sem precisar de terminal).

## Estrutura esperada

```
charts/
  01 Visão geral/
    01 - Balanço de Pagamentos do Brasil - Acumulado em 12 meses.png
    02 - Balanço de Pagamentos do Brasil - Acumulado em 3 meses.png
    ...
  02 Conta corrente/
    01 - Conta Corrente do Brasil - Acumulado em 12 meses.png
    ...
```

Duas regras:

1. **Uma pasta por tema**, nomeada `"NN Nome do tema"` — o número controla a
   ordem do tema no menu lateral e na página; o texto depois do número é o
   nome exibido. Só um nível de pasta é lido (não crie subpastas dentro de
   um tema).
2. **Um arquivo por gráfico**, nomeado `"NN - Título - Subtítulo.png"` — o
   número controla a ordem dentro do tema; título e subtítulo (opcional)
   são exibidos no card. Se não tiver subtítulo, é só `"NN - Título.png"`.

## Agrupando vários temas sob um assunto maior (opcional)

Se um assunto (ex: Balanço de Pagamentos) tem vários temas e você quer que
eles apareçam juntos, visualmente separados de outros assuntos, crie mais
um nível de pasta:

```
charts/
  01 Balanço de Pagamentos - Brasil/
    01 Visão geral/
      01 - Balanço de Pagamentos do Brasil - Acumulado em 12 meses.png
      ...
    02 Conta corrente/
      ...
    03 Conta financeira/
    04 Conta capital/
    05 Indicadores complementares/
  02 Outro Assunto/
    01 Algum tema/
      01 - Gráfico.png
```

O número no início de `"01 Balanço de Pagamentos - Brasil"` ordena esse
assunto entre os outros assuntos (e entre temas soltos, se você tiver
algum) — mesma regra do número nos nomes de tema e de arquivo, um nível
acima. Temas sem esse nível extra continuam funcionando normalmente (dá
pra misturar temas soltos com assuntos agrupados).

Só é lido um nível de agrupamento (assunto → tema → gráfico) — não crie
pastas dentro de pastas de tema.

## O que isso resolve

- **Novo tema que não é do Balanço de Pagamentos?** Crie uma pasta nova
  (`06 Nome do tema`) e solte os PNGs dentro — o site já reconhece na
  próxima visita, sem eu precisar editar nada.
- **A ordem ou composição dos gráficos do PowerPoint mudou?** Não importa —
  o número no nome do arquivo é escolhido por você, não pelo PowerPoint.
  Renomeie o arquivo (ou troque o número) e a ordem no site muda junto.
- **Vai ter mais de 100 gráficos?** Cada tema é uma pasta separada — dá pra
  navegar e substituir arquivos pelo GitHub sem precisar rolar uma lista
  gigante de nomes genéricos.

## Cuidados ao nomear

- Evite `%` no nome do arquivo (some sistemas tratam como código de
  escape) — troque por "pct" ou reescreva.
- `/` não pode aparecer no nome (viraria uma subpasta).
- Acentos e espaços funcionam normalmente.
- Extensões aceitas: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`.

## Um gráfico não aparece / aparece com nome estranho

- Confira se o arquivo está dentro de uma pasta de tema (não solto direto
  em `charts/`) e se a extensão é uma das aceitas.
- Sem o número inicial (`NN - `), o gráfico ainda aparece, só entra por
  último e usa o nome do arquivo inteiro como título — funciona como
  fallback, mas o ideal é sempre nomear com o padrão acima.

## Como exportar do PowerPoint

Veja o README.md na raiz do projeto.
