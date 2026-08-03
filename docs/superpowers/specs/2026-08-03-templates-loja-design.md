# Sistema de templates de loja (Fase 1 — templates prontos)

Spec de um sistema que permite ao lojista escolher entre múltiplos layouts prontos para a vitrine pública da sua loja (`/loja/[slug]`), substituindo o layout único e hardcoded que existe hoje. Segue o redesign do painel interno documentado em [2026-08-03-redesign-painel-design.md](2026-08-03-redesign-painel-design.md), que deixou a vitrine pública explicitamente fora de escopo e reservada para este projeto.

## Objetivo

Hoje a vitrine pública (`app/(public-store)/loja/[slug]/`) tem um único layout fixo para todas as lojas: header → grid de banners → categorias em pills → grid de produtos. `Loja.corPrimaria` existe no schema mas é usada de forma pontual (só um `style` inline no badge do carrinho, sem propagação sistemática), e `Loja.logoUrl` nem é renderizado. A tela de personalização (`/painel/configuracoes` → `LojaForm`) é mock, sem persistência real.

O objetivo é dar ao lojista a escolha entre 3 templates prontos — com estrutura visual própria, não apenas variação de cor — cada um aplicando a identidade de marca do lojista (cor principal) de forma consistente. Isso é a Fase 1 de um projeto maior; um editor visual livre (drag-and-drop) fica registrado como Fase 2 futura, fora de escopo aqui.

## Escopo

**Dentro:**
- 3 templates com layout de home, disposição de produtos e estilo de card próprios: **Minimalista**, **Editorial**, **Vitrine**.
- Aplicação consistente da cor de marca do lojista (`Loja.corPrimaria`) dentro de cada template, com intensidade de uso diferente por template (ver seção "Direção visual").
- Seleção de template via galeria com preview em `/painel/configuracoes`.
- Persistência real: novo campo no schema, mutation tRPC, e a vitrine pública lendo esse campo de verdade para decidir o que renderizar.
- Conectar `corPrimaria` (que já existe no schema) à mutation real também, já que a seleção de template sem a cor de marca funcionando de verdade seria incompleta.

**Fora (explicitamente):**
- Editor drag-and-drop / page builder — Fase 2, projeto futuro com seu próprio brainstorm.
- Paleta com múltiplas cores customizáveis (secundária, destaque) — só a cor única já existente (`corPrimaria`) é usada.
- Upload/gestão de banners (já existe como campo `Loja.banners`, mock) — fora desta entrega; os templates devem funcionar com os banners que já existirem, sem mudar como são cadastrados.
- Upload de logo — `Loja.logoUrl` já existe no schema; usar se já houver valor, mas conectar o upload em si não é escopo (fica para quando `/painel/configuracoes` for revisitada por completo, se necessário).
- Preview em tela cheia com dados reais antes de confirmar a troca — a galeria mostra miniaturas ilustrativas, não uma prévia ao vivo da loja do lojista.
- Mudanças no painel interno (login, painel do lojista, admin) — já redesenhados no projeto anterior, não tocados aqui.

## Direção visual dos 3 templates (validada com o usuário via mockups)

- **Minimalista**: muito espaço em branco, tipografia fina, grid apertado (3+ colunas), banner discreto. Cor de marca aparece só em detalhes pequenos (preço, links) — foco total no produto.
- **Vitrine**: header e banner cheios da cor de marca, cards com borda colorida, preço em pill, grid 2 colunas com cards maiores. Mais energia visual — inspirado em Shopee/Mercado Livre.
- **Editorial**: tipografia serifada (reaproveita a decisão de fonte do redesign do painel — Lora), banner com frase de efeito, cards sem borda com espaçamento generoso. Sensação de marca autoral/boutique — cor de marca usada com moderação.

## Modelo de dados

Novo enum e campo em `prisma/schema.prisma`, na `model Loja`:

```prisma
enum TemplateLoja {
  MINIMALISTA
  EDITORIAL
  VITRINE
}
```

Campo `template TemplateLoja @default(MINIMALISTA)` adicionado próximo aos demais campos de personalização (`logoUrl`, `corPrimaria`, `banners`). Requer uma migration nova (`prisma migrate dev` em desenvolvimento — consistente com o fluxo já usado em todo o projeto, ver `docs/DEPLOY.md` para o equivalente em produção via `migrate deploy`).

## Backend

Nova mutation em `server/trpc/routers/loja.ts` (o router já existente, que hoje tem `atualizarDominioProprio` como padrão de referência para mutation escopada por loja):

- `loja.atualizarPersonalizacao` (ou nome equivalente) — `storeProcedure`/`roleProcedure` conforme o padrão de permissão já usado para mutations sensíveis de loja (ver M16: mutations que mudam configuração da loja passaram a exigir `roleProcedure`, não só `storeProcedure`). Recebe `template` (enum) e `corPrimaria` (string hex), grava na `Loja` do usuário autenticado — nunca aceita `lojaId` vindo do client, segue a convenção de todo o backend do projeto.
- Validação de `corPrimaria`: formato hex simples (regex), sem lógica de contraste automático nesta entrega — se o lojista escolher uma cor de baixo contraste, é responsabilidade dele (mesma postura que qualquer construtor de loja tem).

## Frontend — vitrine pública

Os componentes hoje hardcoded em `components/store/` (`site-header.tsx`, `product-card.tsx`, a home em `app/(public-store)/loja/[slug]/page.tsx`) passam a ter 3 variantes de layout. Abordagem: três componentes de layout de nível página — `TemplateMinimalista`, `TemplateEditorial`, `TemplateVitrine` — que recebem os mesmos dados já carregados hoje (produtos, banners, config da loja) como props e decidem estrutura e apresentação. `app/(public-store)/loja/[slug]/page.tsx` busca a loja (já faz isso hoje via `resolverLojaPorSlug`), lê `loja.template`, e renderiza o componente correspondente — um `switch`/mapa simples, sem lógica de negócio duplicada entre eles (a busca de dados continua uma só, centralizada na página).

A cor de marca é propagada via CSS custom property no elemento raiz do layout da loja (ex. `style={{ '--loja-primary': loja.corPrimaria ?? tokenPadrao }}` em `app/(public-store)/loja/[slug]/layout.tsx`), e cada template usa essa variável onde a direção visual pedir (Vitrine no header/banner/cards; Minimalista só em preço/links; Editorial com moderação) — evita reimplementar lógica de fallback de cor em 3 lugares.

`ProductCard` (hoje um componente único) também precisa de 3 variantes de apresentação, já que "estilo de card" é parte do que diferencia os templates — mesma lógica de um componente por template, recebendo os mesmos dados de produto.

## Frontend — painel de seleção

Nova seção "Template" dentro de `LojaForm` (`components/dashboard/loja-form.tsx`), antes ou depois da seção de cor — reaproveita o padrão visual já estabelecido no redesign do painel (cards com sombra suave, cor terracota do painel interno, que é *diferente* da cor de marca da loja sendo configurada — não confundir as duas paletas). Cada um dos 3 templates aparece como um card clicável com nome + miniatura ilustrativa (não uma prévia ao vivo). Seleção salva via a nova mutation ao submeter o formulário, junto com a cor de marca — o restante do formulário (WhatsApp, Instagram, banners, políticas) continua exatamente como está, sem mudança de comportamento.

## Testagem

- Teste unitário da mutation nova: rejeita `lojaId` de outra loja (isolamento multi-tenant, seguindo o padrão de teste já usado em outros routers), valida enum de template, valida formato de `corPrimaria`.
- Teste manual: no painel, trocar entre os 3 templates e salvar; abrir `/loja/{slug}` em nova aba e confirmar que a estrutura muda de fato (não só a cor) nos 3 casos; confirmar que a cor de marca é aplicada com a intensidade certa em cada template; confirmar que o valor persiste (recarregar a página de configurações mostra o template salvo).
- `npx tsc --noEmit`, `npx vitest run` (suíte completa, incluindo o teste novo), `npm run build`.

## Fora de escopo (explícito)

Editor drag-and-drop, paleta multi-cor, upload de banner/logo, preview ao vivo antes de salvar, qualquer mudança no painel interno (login/painel do lojista/admin).
