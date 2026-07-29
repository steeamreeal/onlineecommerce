# Site de vendas público (M5)

Spec de implementação do milestone `milestone/05-site-vendas-ui`, conforme [docs/PLAN.md](../../PLAN.md) e [docs/PRD.md](../../PRD.md) seção 3 (site de vendas / checkout).

## Objetivo

Construir a interface pública da loja (`app/(public-store)/loja/[slug]`) onde o cliente final navega o catálogo e finaliza uma compra, com dados mockados (`lib/mocks/*`) e sem processar pagamento real. Referência de UX/estrutura: Farm Rio, Pandora e Vivara (hero + grid editorial, ficha de produto com galeria/variações, menu de categorias) — usadas apenas como padrão de estrutura de página, não de identidade visual. A identidade visual (cores, logo, banners) é sempre a do lojista, via `ConfiguracaoLoja`.

## Fora de escopo

- Login/cadastro de cliente final — checkout sempre como convidado (guest).
- Cálculo de frete por CEP na página de produto — frete fica centralizado no checkout.
- Persistência do carrinho (localStorage ou backend) — estado puramente em memória (React Context), conforme PLAN.md.
- Processamento real de pagamento — checkout termina em tela de confirmação mockada.
- Backend/tRPC real — troca dos mocks por dados reais é o M11.

## Rotas e layout

```
app/(public-store)/loja/[slug]/
  layout.tsx                 → CartProvider + header + footer + botão WhatsApp flutuante
  page.tsx                   → home da loja
  produtos/page.tsx          → listagem com busca/filtro
  produtos/[id]/page.tsx     → ficha de produto
  checkout/page.tsx          → wizard de checkout (client component, steps em state)
```

O carrinho não tem rota própria: é um `Sheet` (drawer) do shadcn, montado no layout público, aberto pelo ícone no header. Estado global via `CartContext` (`components/store/cart-context.tsx`), React Context + `useState`, sem persistência.

## Header e footer (`components/store/site-header.tsx`, `site-footer.tsx`)

Header, de cima para baixo:
1. Barra de aviso no topo — texto configurável (novo campo `avisoTopo` em `ConfiguracaoLoja`, ex.: "Frete grátis acima de R$150").
2. Logo/nome da loja (usa `corPrimaria` da config) + busca + menu de categorias (`categoriasMock`) + ícone de carrinho com badge de quantidade.

Sem ícone de conta/login — checkout é guest.

Footer: WhatsApp, Instagram, endereço, horário de atendimento e políticas — todos de `ConfiguracaoLoja`.

Botão de WhatsApp flutuante fixo (canto inferior direito) em todas as páginas do layout, link `wa.me` pré-preenchido com mensagem padrão, usando `configuracaoLojaMock.whatsapp`.

## Home da loja

- Hero/carousel dos `banners` de `ConfiguracaoLoja`.
- Grid de categorias em destaque (`categoriasMock`), cards clicáveis linkando para `/produtos?categoria={id}`.
- Seção "Destaques": produtos com `status: "DESTAQUE"` de `produtosMock`, em grid de `ProductCard` (imagem, nome, preço normal + promo riscado quando houver).

## Listagem de produtos

- Grid responsivo reaproveitando `ProductCard` da home.
- Filtros client-side sobre `produtosMock`: busca por nome, select de categoria, faixa de preço (min/max).
- Sem paginação de dado real — usa o componente `pagination` do shadcn (já instalado no M1) se a lista filtrada for grande.

## Página de produto

- Breadcrumb: Início > Categoria > Nome do produto.
- Galeria: miniaturas + imagem principal, a partir de `FotoProduto[]`.
- Nome, preço normal/promo, seletor de variação (cor/tamanho/modelo) a partir de `VariacaoProduto[]`:
  - opções sem estoque (`estoque: 0`) aparecem desabilitadas/marcadas como "esgotado";
  - botão "Adicionar ao carrinho" fica desabilitado até haver uma variação válida selecionada.
- Seção "Produtos relacionados": outros itens de `produtosMock` com a mesma `categoriaId`, excluindo o produto atual.

## Carrinho (drawer)

- Lista de itens: foto, nome, variação escolhida, stepper de quantidade, preço unitário, remover item.
- Subtotal calculado no client.
- Estado vazio: mensagem "seu carrinho está vazio".
- Botão "Finalizar compra" navega para `/loja/[slug]/checkout`.

`CartItem` (tipo local ao `CartContext`, não é um mock em `lib/mocks`):
```ts
type CartItem = {
  produtoId: string;
  variacaoId: string;
  quantidade: number;
  precoUnitario: number; // preço no momento da adição (normal ou promo)
};
```

## Checkout (wizard em página única)

Steps sequenciais com indicador de progresso no topo, sem trocar de rota:

1. **Identificação** — nome, telefone/WhatsApp, e-mail (guest).
2. **Entrega** — escolher "Retirar na loja" ou "Entregar"; se entrega, formulário de endereço + seleção de opção de frete de `lib/mocks/frete.ts`.
3. **Pagamento** — forma de pagamento mockada (Pix, cartão, na entrega) + campo de cupom validado contra `lib/mocks/cupons.ts` (vigência/existência).
4. **Confirmação** — resumo completo (itens, entrega, cupom, total) + botão "Confirmar pedido" → tela de sucesso mockada (sem chamada real).

Cada step valida seus campos obrigatórios antes de habilitar "Avançar". Botão "Voltar" disponível em todos os steps exceto o primeiro.

## Novos tipos/mocks

- `ConfiguracaoLoja.avisoTopo?: string` — adicionar em `lib/mocks/loja.ts`.
- Nenhum novo arquivo de mock: carrinho e cupom aplicado vivem em estado de componente/contexto, reaproveitando `produtosMock`, `frete.ts` e `cupons.ts` já existentes.

## Commit final

`feat: UI do site de vendas público e fluxo de checkout` (conforme PLAN.md)
