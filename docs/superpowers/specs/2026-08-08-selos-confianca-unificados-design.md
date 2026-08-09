# Selos de confiança unificados entre home e página de produto

Data: 2026-08-08

## Contexto

A seção "Selos de confiança" existe em dois lugares do editor de tema:
`SELOS` na home (`Loja.temaConfig`) e `SELOS_PRODUTO` na página de produto
(`Loja.temaProdutoConfig`). As duas já usam o mesmo schema de conteúdo
(`configSelosSchema` em `lib/tema-loja.ts`: itens com ícone/título/descrição,
cores, tamanhos), mas hoje são cópias independentes — editar uma não afeta
a outra, obrigando o lojista a configurar (e manter) duas vezes o mesmo
conteúdo.

Pedido: editar os selos em qualquer um dos dois editores atualiza os dois
automaticamente. Mostrar/esconder e posição na lista de seções continuam
independentes por página (decisão de layout, não de conteúdo).

## Modelo de dados

Novo campo `Loja.selosConfig Json?` — mesmo shape de `configSelosSchema`,
fonte única do conteúdo dos selos (itens, cores, tamanhos) pra loja
inteira.

As seções `SELOS` e `SELOS_PRODUTO` (dentro de `Loja.temaConfig` /
`Loja.temaProdutoConfig`) deixam de carregar `config` com o conteúdo dos
selos — passam a ter só `{ id, visivel }` (a posição já é implícita pela
ordem no array de seções). O `configSelosSchema` continua exportado de
`lib/tema-loja.ts`, agora descrevendo o shape de `Loja.selosConfig` em vez
do `config` de cada seção.

## Migração dos dados existentes

Sem migration de dado em massa. Na primeira vez que `loja.atual` (ou
`lojaPublica.porSlug`) é lido e `Loja.selosConfig` ainda é `null`, o
backend semeia automaticamente a partir do `config` que já existe hoje na
seção `SELOS` da home daquela loja (se a seção `SELOS` não existir ou não
tiver `config` de selos, cai para um objeto vazio `{ itens: [] }`). Cada
loja resolve essa semente sozinha, na primeira leitura após o deploy desta
mudança — não depende de rodar nada manualmente no banco.

## Editores de tema

`components/dashboard/tema/editor-selos.tsx` (formulário de UI,
já compartilhado entre os dois editores) passa a operar sobre um estado
`selosConfig` próprio — carregado uma vez de `loja.atual.selosConfig` — em
vez de escrever dentro do `config` da seção local (`tema.secoes` /
`temaProduto.secoes`).

Os editores (`components/dashboard/tema/editor-tema.tsx` e
`components/dashboard/tema/editor-tema-produto.tsx`) passam a manter esse
`selosConfig` como mais um pedaço de estado local não salvo, ao lado do
`tema`/`temaProduto` que já existiam. Ao clicar "Salvar" em qualquer um
dos dois, disparam (em paralelo, via `Promise.all`) tanto a mutation de
tema daquela página quanto uma nova mutation `loja.atualizarSelos`
(`configSelosSchema` como input) — gravando o conteúdo compartilhado.
Sair de um editor sem salvar descarta as duas mudanças juntas, igual ao
comportamento atual do resto do tema.

## Renderers públicos

`components/store/theme-renderer.tsx` (`SecaoSelos`) e
`components/store/theme-renderer-produto.tsx` (`SecaoSelos`) passam a
receber o conteúdo via `config.selosConfig` (vindo de
`lojaPublica.porSlug`) em vez de `secao.config` — a seção em si só
controla `visivel` (se renderiza ou não) e a posição.

## Fora de escopo

- Drag-and-drop ou qualquer alteração na forma como a posição/visibilidade
  por página funciona hoje — continuam exatamente como estão.
- Qualquer sincronização de outras seções (banners, textos, etc.) — só
  selos, conforme pedido.
