# Design system e componentes base (M1)

Spec de implementação do milestone `milestone/01-design-system`, conforme [docs/PLAN.md](../../PLAN.md) e [docs/PRD.md](../../PRD.md) seção 6.

## Objetivo

Estabelecer a identidade visual e os componentes compartilhados que serão reusados nas 3 áreas do produto (site da loja, painel do lojista, painel do SaaS), antes de construir qualquer tela de negócio (M2 em diante).

## Paleta e tokens

- Tema atual (`app/globals.css`) é o grayscale neutro padrão do shadcn — sem cor de marca.
- Trocar `--primary` (e derivados: `--ring`, `--sidebar-primary`, gráficos) por um azul, em `:root` e `.dark`, usando OKLCH para manter consistência com os tokens existentes.
- Adicionar tokens semânticos novos para os status de negócio usados no PRD (pedidos, estoque): `--success` (verde — pago/entregue/estoque ok) e `--warning` (amarelo — aguardando/estoque baixo). `--destructive` (vermelho) já existe e cobre cancelado/erro.
- Todos os tokens continuam centralizados em `app/globals.css`, seguindo a convenção shadcn já presente (`:root` / `.dark` / `@theme inline`). Nenhuma cor solta fora daí.
- Site de vendas público (`(public-store)`) permanece com cores neutras por enquanto — a paleta por loja (logo/cores customizadas pelo lojista) é escopo de milestone futuro (M4 tela de personalização, M9+ backend), não deste milestone.

## Componentes shadcn

Já instalados: `button`, `input`, `label`, `card`, `table`, `badge`, `dropdown-menu`, `sonner`, `select`, `dialog`.

Adicionar via `npx shadcn add`: `form`, `tabs`, `sheet`, `avatar`, `separator`, `skeleton`, `alert`, `tooltip`, `pagination`.

## Layouts raiz

Um `layout.tsx` próprio por route group, cada um com header/nav placeholder (sem itens de menu reais ainda — isso é responsabilidade dos milestones M2-M6):

- `app/(public-store)/layout.tsx` — header simples (logo + espaço de menu), visual neutro.
- `app/(dashboard)/layout.tsx` — sidebar + topbar placeholder, cor de marca (azul) do painel do lojista.
- `app/(admin)/layout.tsx` — sidebar + topbar placeholder, visualmente distinto do painel do lojista (variação tonal neutra/slate), reforçando a separação exigida pelo CLAUDE.md ("nunca misturar essa camada com o painel do lojista").

## Página de showcase (`/dev/ui`)

Página interna tipo Storybook simplificado, com todos os componentes instalados (base + os 9 novos) organizados em seções, cada um mostrando suas variantes relevantes: tamanhos, estados (disabled, loading, erro), cores de badge para os status de pedido do PRD (Novo, Aguardando pagamento, Pago, Em preparação, Enviado, Pronto para retirada, Entregue, Cancelado).

Sem proteção de rota neste milestone — remoção/proteção antes do deploy fica agendada no M17, já previsto no PLAN.md.

## Fora de escopo

- Telas de negócio (produtos, pedidos, etc.) — milestones seguintes.
- Paleta customizável por loja — milestones futuros.
- Itens de menu reais nas sidebars — apenas placeholder neste milestone.

## Commit final

`feat: design system e componentes base de UI` (conforme PLAN.md)
