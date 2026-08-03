# Redesign visual: login, painel do lojista e admin do SaaS

Spec de um redesign visual do produto interno da plataforma (autenticação, painel do lojista, painel admin do SaaS), substituindo a identidade neutra/azul definida em [2026-07-28-design-system-design.md](2026-07-28-design-system-design.md) (M1) por uma identidade própria, mais quente e amigável.

## Objetivo

Hoje o tema visual do produto é essencialmente o default do shadcn/ui: cinza neutro com um único acento azul genérico (`--primary: oklch(0.546 0.215 262.1)`), sem tipografia de destaque (`--font-heading` é apenas um alias do sans-serif) e sem nenhuma autoria visual. O objetivo deste redesign é dar identidade própria e mais atraente às 22 telas internas do produto — login/cadastro, painel do lojista, painel admin do SaaS — inspirado em plataformas de e-commerce brasileiras (Nuvemshop, Mercado Livre), sem tocar em lógica de negócio, persistência de dados, ou na vitrine pública da loja.

## Escopo

**Dentro:**
- `app/(auth)/*` — login, cadastro, esqueci-senha, redefinir-senha, onboarding, onboarding/sucesso (6 telas)
- `app/(dashboard)/painel/*` — dashboard, produtos (lista/novo/editar/estoque), pedidos (lista/detalhe), clientes (lista/detalhe), cupons, frete, assinatura, configurações (12 telas)
- `app/(admin)/admin/*` — dashboard admin, lojas (lista/detalhe), planos, usuários (4 telas)
- `app/dev/ui/page.tsx` — showcase de componentes, usado como bancada de validação do novo tema
- `app/page.tsx` — landing/raiz (se usar os mesmos componentes de UI)

**Fora (explicitamente, para não gerar retrabalho):**
- `app/(public-store)/*` (vitrine pública `/loja/[slug]`) — será redesenhada no projeto futuro de **templates de loja**, com múltiplos layouts selecionáveis pelo lojista. Mexer nela agora seria descartado.
- Qualquer nova funcionalidade ou persistência: a tela de personalização da loja (`/painel/configuracoes` → `LojaForm`) recebe **só** o novo visual, continua mock/sem gravar no banco — isso é escopo do projeto de templates de loja.
- Dark mode funcional (toggle de tema) — os tokens `.dark` existentes não são redesenhados nem expostos por um seletor nesta entrega. Ficam como estão (ainda usando a paleta antiga), já que não há UI para acessá-los.
- Reformulação da navegação: a sidebar do painel continua fixa à esquerda, sem virar recolhível.
- Sistema de templates de loja (cor dinâmica por logo do lojista na vitrine) — decisão explícita: o **painel interno** mantém identidade fixa da plataforma, igual para todo lojista; cor derivada da logo é conceito que pertence só à vitrine pública, no projeto futuro.

## Direção visual (validada com o usuário via mockups)

**Estilo "Editorial quente":** títulos em serifa, corpo de texto em sans-serif, cartões arredondados com sombra suave (não borda seca), fundo levemente creme em vez de branco puro. Comparado com as alternativas descartadas (bold/cartunizado com bordas pretas grossas; soft/arredondado sem serifa), esse estilo passa uma sensação mais acolhedora e "premium acessível" — alinhado ao público de pequeno/médio comerciante que o CLAUDE.md descreve, sem parecer infantil.

**Cor principal:** terracota (`#c2703d`, aprox. `oklch(0.55 0.09 50)`), escolhida entre 3 alternativas (laranja Nuvemshop, coral vibrante, terracota) por ser mais sofisticada e menos "batida" no setor, mantendo o calor da paleta.

## Tokens (`app/globals.css`)

Reaproveita a arquitetura de tokens existente (`:root`, `.dark`, `@theme inline`) — só os **valores** mudam, não a estrutura, porque os componentes shadcn (`components/ui/*`) já leem essas variáveis via classes utilitárias (`bg-primary`, `text-primary-foreground`, etc.). Isso significa que a maior parte da UI herda o novo tema automaticamente, sem precisar recriar componente por componente.

Mudanças em `:root`:
- `--background` / `--card` / `--popover`: de branco puro (`oklch(1 0 0)`) para um creme muito sutil (tom próximo a `oklch(0.98 0.01 60)`), mantendo `--card` levemente mais claro que `--background` para preservar a separação visual entre cartão e fundo.
- `--primary` / `--ring` / `--sidebar-primary` / `--sidebar-ring`: terracota (`oklch(0.55 0.09 50)` aprox.), substituindo o azul em todos os pontos onde ele aparecia.
- `--accent` / `--sidebar-accent` / `--accent-foreground`: tom terracota bem clareado (hoje é um azul clareado análogo — mesma lógica, nova matiz), usado em estados hover/selecionado.
- `--success` / `--warning` / `--destructive`: mantêm a mesma função semântica (verde/amarelo/vermelho para status de pedido — Pago/Aguardando/Cancelado), só recalibrados em luminosidade/saturação para harmonizar com o novo fundo creme em vez do branco puro, evitando contraste "gritado".
- `--chart-1` a `--chart-5`: realinhados à nova paleta (chart-1 passa a refletir o terracota, os demais seguem a mesma lógica de derivação já usada).
- `--radius`: mantém a mesma variável base, mas o valor sobe ligeiramente (de `0.625rem` para algo em torno de `0.75rem`) para bater com o visual "mais arredondado" aprovado nos mockups — a escala derivada (`--radius-sm` a `--radius-4xl`) já é proporcional, então um único ajuste na base propaga para todos os componentes.

`.dark` não é tocado nesta entrega (fora de escopo, ver acima) — permanece com a paleta azul antiga até um redesenho de dark mode futuro.

## Tipografia

- `--font-heading` deixa de ser um alias do sans-serif e passa a apontar para uma fonte serifada real, carregada via `next/font/google` (ex. "Lora" ou "Source Serif 4" — a escolha final entre as duas fica a critério de quem implementar, testando ambas em `/dev/ui`, já que a diferença é sutil e melhor avaliada em tela). Aplicada em `h1`, `h2`, títulos de `Card` (`CardTitle`) e títulos de página.
- `--font-sans` (atualmente Geist) continua para corpo de texto, labels, botões, tabelas — sem mudança.
- `--font-mono` (Geist Mono) sem mudança (usado em trechos técnicos, se houver).

## Componentes (`components/ui/*`)

Não recriados do zero — ajustados pontualmente onde o mockup aprovado diverge do shadcn default:
- `Card`: sombra suave (`shadow-sm` a `shadow-md` dependendo do contexto) substituindo a borda seca atual como principal recurso de separação visual.
- `Button` (variante primária): mantém a mesma estrutura, herda a nova cor `--primary` automaticamente.
- Badges de status de pedido (já mapeados para `--success`/`--warning`/`--destructive`/`--secondary` em `/dev/ui`): sem mudança de lógica, só de paleta subjacente.

Nenhum componente novo precisa ser criado para esta entrega — é recalibração de tema sobre a base já instalada no M1.

## Telas (as 22 dentro do escopo)

A expectativa é que a maioria herde o novo tema automaticamente por já usar exclusivamente os tokens/componentes shadcn (nenhuma cor solta fora do sistema, conforme convenção do CLAUDE.md: "Cores centralizadas em variáveis CSS, não usar cores soltas"). Etapas de trabalho:

1. Atualizar `app/globals.css` (tokens) e a fonte heading — validar em `/dev/ui` primeiro, já que ali estão todos os componentes base lado a lado.
2. Percorrer as 22 telas visualmente (`npm run dev`), conferir se algum componente usa cor hardcoded fora do sistema de tokens (ex. um `style={{ color: '#...' }}` esquecido) — se encontrar, é um achado a corrigir como parte desta entrega, não escopo novo.
3. Prestar atenção especial a `app/(admin)/layout.tsx`: a spec anterior (M1) previa o admin com "variação tonal neutra/slate" separada do painel do lojista — essa decisão é **revertida** aqui, por decisão explícita do usuário nesta sessão (mesma identidade nas 3 áreas).

## Testagem

Como é um redesign puramente visual (sem mudança de lógica, dados ou rotas):
- `npx tsc --noEmit` — typecheck limpo.
- `npx vitest run` — suíte de testes deve continuar 56/56 (nenhum teste depende de cor/tipografia).
- `npm run build` — build de produção sem erros.
- Revisão visual manual no navegador: `/dev/ui` primeiro (bancada de todos os componentes), depois os 3 fluxos reais — login → painel do lojista (dashboard, produtos, pedidos) → admin do SaaS — conferindo legibilidade (contraste AA mínimo, especialmente texto sobre o novo fundo creme e sobre terracota) e consistência entre as 3 áreas.

## Fora de escopo (explícito)

- Vitrine pública da loja (`/loja/[slug]`) e sistema de templates de loja — projeto futuro separado, com seu próprio brainstorm.
- Persistência real da tela de personalização de loja (`/painel/configuracoes`) — continua mock.
- Dark mode funcional / seletor de tema.
- Sidebar recolhível ou qualquer mudança estrutural de navegação.
- Cor do painel derivada da logo do lojista — aplica-se só à vitrine pública no projeto futuro, não ao painel interno.
