# Rodapé completo com páginas institucionais por loja

Data: 2026-08-08

## Contexto

O site público de cada loja (`components/store/site-footer.tsx`) já tem uma seção
`RODAPE` configurável no editor de tema (`lib/tema-loja.ts`,
`components/dashboard/tema/painel-propriedades.tsx`), com colunas de links
genéricas, redes sociais, newsletter, formas de pagamento (badges de texto
ilustrativos) e políticas — tudo opcional, ligado/desligado por loja.

O pedido: um rodapé "bem completo", inspirado no rodapé da Pandora
(colunas Ajuda / Sobre nós / SAC + selos de forma de pagamento), mas
mantendo a filosofia atual do produto — **cada bloco é opcional, decidido por
loja** — e servindo qualquer porte de lojista (pequeno, médio, grande), sem
depender de um dev pra preencher conteúdo institucional.

## Decisão de escopo

Em vez de colunas de link genéricas (onde o "conteúdo" por trás do link é
responsabilidade do lojista, fora da plataforma), o lojista escreve o
conteúdo institucional **dentro do próprio painel**, e a plataforma
publica uma página real (`/loja/[slug]/pagina/[paginaSlug]`) — sem link
quebrado, sem depender de o lojista ter uma página em outro lugar.

## Modelo de dados

Novo model, escopado por loja (multi-tenant):

```prisma
model PaginaInstitucional {
  id           String   @id @default(cuid())
  lojaId       String
  loja         Loja     @relation(fields: [lojaId], references: [id])
  slug         String   // gerado a partir do título, único por loja
  titulo       String
  conteudo     String   @db.Text
  ordem        Int      @default(0)
  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  @@unique([lojaId, slug])
}
```

- Não há flag "é sugerida" — as 6 páginas sugeridas (ver abaixo) são apenas
  pré-populadas com `conteudo` vazio na primeira vez que o lojista abre a
  tela; depois disso são registros normais, editáveis/excluíveis como
  qualquer outra.
- Páginas sugeridas (título inicial, conteúdo vazio): Política de
  privacidade, Trocas e devoluções, Garantia, Dúvidas frequentes, Sobre a
  loja, Regulamentos.
- O lojista pode criar páginas extras com título livre (ex.: "Nossa
  história", "Certificações").
- Uma página com `conteudo` vazio (string vazia/whitespace) não aparece no
  rodapé nem tem rota pública acessível (404) — evita o lojista precisar
  "desativar" uma página que ainda não escreveu.

Campo novo em `Loja`: `telefoneSac String?` — telefone/0800 opcional do SAC,
ao lado do `whatsapp` que já existe.

## Painel do lojista

Nova tela em `/painel/paginas-institucionais` (novo item no menu do
dashboard):

- Lista das páginas da loja (sugeridas + criadas), com badge "Rascunho"
  (conteúdo vazio) / "Publicada" (conteúdo preenchido).
- "Nova página": formulário com título + textarea de conteúdo (texto
  simples, sem rich text — quebras de linha viram parágrafos na exibição
  pública).
- Editar / excluir página existente (excluir com confirmação).
- Reordenação simples via campo numérico `ordem` editável na lista (sem
  drag-and-drop nesta primeira entrega).

Novo router tRPC `paginasInstitucionais`:
- `listar` — páginas da loja do usuário autenticado.
- `criar` — título + conteúdo, gera `slug` único por loja (kebab-case do
  título, com sufixo numérico em caso de colisão).
- `atualizar` — título, conteúdo, ordem.
- `excluir`.

Todas as procedures escopadas por `lojaId` da sessão (nunca aceitar
`lojaId` vindo do client) — segue o padrão de isolamento multi-tenant do
projeto.

`telefoneSac` entra no formulário existente de dados da loja (mesmo lugar
onde já fica `whatsapp`, `endereco`, `instagram`, `facebook`).

## Site público

Nova rota `app/(public-store)/loja/[slug]/pagina/[paginaSlug]/page.tsx`:
SSR/ISR, título + corpo (parágrafos), usando o tema visual da loja
(cores/fontes já configuradas). Retorna 404 se a página não existir para
aquele slug de loja, ou se estiver com conteúdo vazio.

## Rodapé (`site-footer.tsx` + `lib/tema-loja.ts`)

Novos campos na config da seção `RODAPE`:
- `mostrarPaginasInstitucionais: boolean` (default `false`)
- `mostrarSac: boolean` (default `false`)

Novos blocos no componente, cada um renderizado só se o toggle estiver
ligado **e** houver conteúdo pra mostrar:

1. **Coluna "Institucional"** — lista única (não dividida em Ajuda/Sobre
   nós) com todas as `PaginaInstitucional` da loja que tenham `conteudo`
   preenchido, ordenadas por `ordem`, linkando para
   `/loja/[slug]/pagina/[paginaSlug]`.
2. **Coluna "SAC"** — WhatsApp (reaproveita `config.whatsapp`, exibido como
   link/botão "Falar no WhatsApp") e telefone (`config.telefoneSac`, se
   preenchido), cada um com ícone.
3. **Formas de pagamento** — troca os badges de texto atuais
   (`FORMAS_PAGAMENTO_ILUSTRATIVAS`) por ícones SVG reais (Visa,
   Mastercard, Elo, Pix, boleto), fixos e ilustrativos (sem lógica
   condicional ligada ao status da conexão Mercado Pago da loja — mantém o
   comportamento/aviso que já existe hoje no código para
   `mostrarFormasPagamento`).

As colunas de links genéricas (`colunas: ColunaRodape[]`) continuam
existindo como estão hoje, sem alteração — a coluna Institucional é um
bloco adicional, não uma substituição.

## Fora de escopo (não faz parte desta entrega)

- Rich text / formatação nas páginas institucionais (fica pra uma
  eventual entrega futura, se pedido).
- Formas de pagamento dinâmicas conforme conexão real do Mercado Pago da
  loja.
- Redes sociais além de Instagram/Facebook (Twitter/YouTube) — não foi
  pedido nesta rodada, mantém como está.
- Drag-and-drop de reordenação das páginas (usa campo numérico por ora).
