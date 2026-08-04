# Banners de loja (título + imagem, upload real)

Spec para conectar o cadastro de banners da loja (`/painel/configuracoes` → `LojaForm`) a dados reais, incluindo upload de imagem, e usar essa imagem de verdade nos 3 templates de vitrine já implementados em [2026-08-03-templates-loja-design.md](2026-08-03-templates-loja-design.md).

## Objetivo

Hoje a seção "Banners" do `LojaForm` é decorativa: mostra o array estático `configuracaoLojaMock.banners`, sem upload real, e o `onSubmit` do formulário inteiro é mock (só um `toast.success`). Os 3 templates de vitrine (Minimalista, Editorial, Vitrine) já leem `banners[0]?.titulo` para exibir um texto de destaque, mas sempre sobre um bloco de cor decorativo — a imagem do banner nunca é usada. O objetivo é fechar essa lacuna: o lojista cadastra até 3 banners (título + imagem) de verdade, e a imagem passa a aparecer como fundo do banner na vitrine.

Este projeto nasceu de um pedido mais amplo do usuário ("templates próprios"), que foi decomposto: personalização livre/upload de tema de terceiro foi descartada, e o pedido foi refinado para esta entrega específica.

## Escopo

**Dentro:**
- Novo bucket Supabase Storage `banners-loja` (mesmo padrão do `fotos-produtos` já existente).
- Upload real de imagem de banner no painel (`LojaForm`), seguindo o padrão já usado em `components/dashboard/produto-form.tsx`.
- Até 3 banners por loja, cada um com título (obrigatório) e imagem (obrigatória).
- Nova mutation tRPC (`loja.atualizarBanners`) persistindo `Loja.banners` de verdade.
- Os 3 templates de vitrine passam a usar a imagem do primeiro banner (`banners[0]?.url`) como fundo real do banner de destaque, mantendo o texto por cima — cada template com seu próprio tratamento visual (ver "Direção visual" abaixo).

**Fora:**
- Reordenar banners, ou usar mais de um banner na mesma tela (os templates continuam usando só `banners[0]` — os outros até 3 ficam armazenados para uso futuro, sem consumo na UI ainda).
- Crop/edição de imagem no upload — a imagem sobe como está, o layout que se adapta (via `object-fit`).
- Qualquer outra customização de template (estilo de card, fonte, densidade de grid) — descartadas nesta rodada de brainstorm, ficam como possíveis próximos passos.
- Editor drag-and-drop (Fase 2 do projeto de templates, já registrada como fora de escopo).

## Direção visual (como a imagem entra em cada template)

- **Vitrine**: hoje o banner é um bloco cheio da cor de marca (`bg-[var(--loja-primary)]`) com o texto centralizado. Passa a ter a imagem como `background-image`, com um overlay semi-transparente da cor de marca por cima (mantém a identidade de "banner colorido e chamativo" mesmo com foto).
- **Minimalista**: hoje é um bloco cinza discreto (`bg-muted`) com texto pequeno no canto inferior. Passa a mostrar a imagem, mantendo o texto discreto sobre um leve gradiente escuro na base (só o suficiente para garantir legibilidade), sem overlay de cor — reforça o estilo "foco no produto, sem excesso".
- **Editorial**: hoje é um bloco com fundo `bg-accent` e frase centralizada em itálico. Passa a mostrar a imagem com um overlay claro/translúcido por trás do texto (mantém a legibilidade da tipografia serifada sem esconder a foto).

Em todos os casos: se não houver banner cadastrado (`banners.length === 0`), o comportamento atual é preservado (bloco de cor decorativo, sem imagem) — não é uma regressão para lojas que ainda não cadastraram banner.

## Storage

Novo bucket `banners-loja`, replicando a documentação e configuração do `fotos-produtos` (CLAUDE.md, seção "Supabase Storage"):
- Público para leitura (a imagem aparece na vitrine sem autenticação).
- Policy de `INSERT`/`UPDATE`/`DELETE` restrita a `auth.role() = 'authenticated'`; isolamento real de escrita por tenant é responsabilidade da aplicação (mesma ressalva já documentada para `fotos-produtos`), não do Storage.
- Limite de 5MB por imagem (mesmo limite do bucket de fotos de produto).
- Setup manual no dashboard do Supabase (não versionado em migration) — documentar no CLAUDE.md como passo a executar antes do deploy, junto com o setup já existente do `fotos-produtos`.

Novo helper em `lib/supabase/storage.ts`: `enviarBannerLoja(lojaId, arquivo)`, espelhando `enviarFotoProduto` (mesma validação de tipo/tamanho, mesmo padrão de path `${lojaId}/${crypto.randomUUID()}.${extensao}`).

## Backend

Novo schema zod e mutation em `server/trpc/routers/loja.ts`, seguindo o padrão de `atualizarPersonalizacao` (mutation mais simples do arquivo, sem diff por id):

```ts
const bannerSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1),
  titulo: z.string().min(1),
});

atualizarBanners: roleProcedure(["ADMINISTRADOR"])
  .input(z.object({ banners: z.array(bannerSchema).max(3, "No máximo 3 banners por loja.") }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.loja.update({
      where: { id: ctx.lojaId },
      data: { banners: input.banners },
      select: { banners: true },
    });
  }),
```

Sobrescreve o array `Json` inteiro a cada chamada (sem diff/merge por id) — consistente com o fato de `banners` não ser uma relação Prisma separada, e mais simples que o padrão de diff usado em `produtos.fotos` (que é uma relação de verdade).

## Frontend — painel (`LojaForm`)

A seção "Banners" (hoje decorativa) ganha comportamento real, seguindo exatamente o padrão de upload de `produto-form.tsx`:
- Estado local (`useState<Banner[]>`) inicializado a partir de `loja.banners` (via `trpc.loja.atual.useQuery()`, que precisa passar a selecionar o campo `banners` também).
- Cada banner tem um campo de título (input de texto) e um slot de imagem — clicar faz upload imediato via `enviarBannerLoja(loja.id, arquivo)`, anexando a URL retornada ao estado local (mesmo fluxo de loading/erro com toast que `produto-form.tsx` já usa).
- Limite de 3: o botão "Adicionar banner" desaparece/desabilita quando já há 3 banners no estado local.
- Persistência real ao clicar em salvar (separado do restante do formulário mock, seguindo a mesma estratégia de isolamento já usada para `TemplateLojaForm` e `DominioProprioForm` — um componente próprio com sua própria mutation, não misturado ao `onSubmit` mock do `LojaForm` principal).

## Frontend — vitrine (3 templates)

Cada um dos 3 componentes (`template-minimalista.tsx`, `template-editorial.tsx`, `template-vitrine.tsx`) passa a renderizar `banners[0]?.url` como imagem de fundo do bloco de banner existente, com o tratamento visual descrito em "Direção visual" — sem mudar a estrutura de props que já recebem (`banners: Banner[]` já é passado hoje, só não é usado além do `.titulo`).

## Testagem

- Teste unitário da mutation `atualizarBanners`: isolamento por `lojaId` (nunca aceita `id` de loja alheia), rejeita array com mais de 3 itens, rejeita banner sem `titulo`/`url`.
- Teste manual: cadastrar 1, 2 e 3 banners no painel (upload real de imagem), confirmar que o 4º é bloqueado na UI; abrir a vitrine nos 3 templates e confirmar que a imagem aparece como fundo do banner de destaque com o tratamento visual correto de cada um; remover todos os banners e confirmar que o comportamento decorativo original (sem imagem) volta a aparecer.
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.

## Fora de escopo (explícito)

Reordenar/usar múltiplos banners na mesma tela, crop de imagem, outras customizações de template (card, fonte, grid), editor drag-and-drop.
