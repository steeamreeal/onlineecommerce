# CLAUDE.md

## Visão geral

SaaS multi-loja de e-commerce. Permite que lojistas (pequenos/médios comerciantes que hoje vendem por WhatsApp/Instagram) criem uma loja virtual própria, cadastrem produtos, recebam pedidos com pagamento integrado, controlem estoque automaticamente e gerenciem tudo em um painel único. O cliente final compra sozinho pelo site, 24h por dia, sem depender de atendimento manual.

PRD completo em [docs/PRD.md](docs/PRD.md) — consultar antes de qualquer decisão de escopo ou funcionalidade.

## Stack técnica

- **Framework**: Next.js (App Router) + React + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Banco de dados**: PostgreSQL via Supabase, acessado com Prisma
- **API**: tRPC (client/server typesafe, sem REST manual)
- **Autenticação**: Supabase Auth
- **Pagamentos**: Stripe (assinaturas do SaaS) + Mercado Pago (checkout da loja — PIX/cartão/boleto), ver decisão detalhada em "Cuidados para manutenção futura" e PRD seção 3.5
- **E-mails transacionais**: Resend
- **Deploy**: Vercel
- **Assistente de dev**: Claude Code

## Arquitetura multi-tenant

- **Multi empresa**: cada lojista é um tenant isolado (loja própria, produtos, pedidos, clientes, domínio).
- **Multi usuário por loja**: papéis com permissões distintas — Administrador, Gerente, Vendedor, Estoquista, Separador de pedidos (PRD 3.13).
- **Painel do dono do SaaS**: camada separada, acima dos tenants — cadastro de lojas, planos/assinaturas, bloqueio/liberação, métricas gerais (PRD 3.15). Nunca misturar essa camada com o painel do lojista.
- Toda query de dados de loja deve ser escopada por `tenant_id`/`store_id` — nunca confiar apenas em filtro no client.

## Estrutura de pastas (proposta)

```
/app
  /(public-store)/[slug]      # site de vendas público de cada loja (SSR/ISR)
  /(dashboard)/painel         # painel do lojista (autenticado)
  /(admin)                    # painel do dono do SaaS
  /api                        # rotas auxiliares (webhooks Stripe, WhatsApp, etc.)
/server
  /trpc                       # routers tRPC (produtos, pedidos, clientes, estoque, cupons...)
  /db                         # prisma client, schema.prisma
/components
  /ui                         # shadcn/ui
  /store                      # componentes do site de vendas
  /dashboard                  # componentes do painel do lojista
/lib                          # helpers, integrações (Stripe, Resend, WhatsApp)
/docs
  PRD.md
```

Ajustar conforme o projeto evoluir — esta é a estrutura inicial de referência, não um contrato fixo.

## Convenções de código

- TypeScript estrito em todo o projeto (sem `any` implícito).
- Nomes de arquivos e componentes em inglês; nomes de domínio de negócio (ex.: status de pedido, papéis de usuário) podem refletir os termos em português usados pelo lojista, já que é o público-alvo.
- Toda query de banco passa por Prisma — sem SQL solto fora de `/server/db`.
- Toda comunicação client-server via tRPC — sem `fetch` manual para endpoints internos.
- Mutações que afetam estoque, pedidos ou pagamentos devem ser transacionais (Prisma `$transaction`), nunca updates isolados que possam ficar inconsistentes.
- Erros voltados ao lojista/cliente final devem ser mensagens claras, sem jargão técnico — nunca expor stack trace ou mensagem de erro do banco.

## Identidade visual

- Design moderno, limpo, fácil de usar sem treinamento — inspirado em Shopee, Shopify, Mercado Livre, GoDaddy e Nuvemshop (ver PRD seção 6).
- O painel do lojista prioriza clareza operacional (cadastrar produto, ver pedidos, controlar estoque) sobre densidade de informação.
- Cada loja deve poder personalizar: logo, cores, banners — a identidade visual do *site de vendas* pertence ao lojista, não à plataforma. O painel administrativo (SaaS) e o painel do lojista têm identidade visual própria e neutra, sem herdar o branding da loja do cliente.

## Cuidados para manutenção futura

- Nunca vazar dados entre tenants — toda query de loja precisa de escopo por `store_id`.
- Mudanças em regras de estoque, pedidos ou cupons devem ser validadas contra o PRD (seções 3.6, 3.7, 3.10) antes de implementar.
- Webhooks (Stripe, Mercado Pago, WhatsApp) precisam de verificação de assinatura — nunca confiar no payload sem validar origem.
- Ao integrar novo gateway de pagamento da loja (PIX/boleto/cartão), documentar aqui a decisão e as credenciais necessárias, sem commitar segredos — usar variáveis de ambiente e `.env` no `.gitignore`.

## Pagamentos (M12)

- **Assinatura do SaaS (cobrança do lojista pela plataforma)**: Stripe. Usa `Plano.stripePriceId` (já existente no schema) e Checkout Session/Payment Link. Webhook em `app/api/webhooks/stripe/route.ts`, validado por `stripe-signature`, atualiza `Loja.statusPlano` a partir de `checkout.session.completed` e `customer.subscription.updated|deleted`.
- **Checkout da loja (pagamento do cliente final)**: Mercado Pago, via **Mercado Pago Connect (OAuth/marketplace)** — cada lojista conecta sua própria conta Mercado Pago; o dinheiro do checkout cai direto na conta dele, nunca numa conta central da plataforma (evita a plataforma virar intermediária financeira). Decisão de usar Mercado Pago (em vez de só Stripe) tomada porque a Stripe Brasil não processa PIX nem boleto nativamente — só cartão — e o PRD 3.5 exige PIX, cartão e boleto.
  - Credenciais por loja ficam em `Loja.mpAccessToken/mpRefreshToken/mpUserId/mpConectadoEm` (schema.prisma) — nunca uma env var global com token de acesso.
  - Fluxo de conexão: painel do lojista (`/painel/assinatura`) → `pagamentos.iniciarConexaoMercadoPago` gera a URL de autorização (`OAuth.getAuthorizationURL`, com `state` assinado carregando o `lojaId`) → lojista autoriza no Mercado Pago → callback em `app/api/mercadopago/callback/route.ts` troca o `code` por tokens (`OAuth.create`) e salva na `Loja`.
  - `FormaPagamento.PIX | CARTAO | BOLETO | LINK_PAGAMENTO` geram uma preferência no Mercado Pago **usando o `mpAccessToken` da loja do pedido** (`server/trpc/routers/checkout.ts`) — nunca um token global. Se a loja não tiver conectado o Mercado Pago, o checkout com essas formas de pagamento falha com mensagem clara pedindo para o lojista conectar a conta primeiro.
  - `FormaPagamento.PAGAMENTO_ENTREGA` não passa por gateway nenhum — confirmação manual pelo lojista no painel.
  - Webhook em `app/api/webhooks/mercadopago/route.ts`, validado por assinatura (`x-signature`/`x-request-id`, secret único da integração da plataforma). Como o pagamento pode ser de qualquer loja, o webhook primeiro localiza o `Pedido` (por `external_reference`) para descobrir a loja e o `mpAccessToken` correto antes de consultar o pagamento na API do Mercado Pago.
- **Credenciais necessárias** (variáveis de ambiente, nunca commitadas): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (assinatura SaaS), `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET` (credenciais do app da plataforma no Mercado Pago, usadas só para o fluxo OAuth), `MERCADOPAGO_WEBHOOK_SECRET`.
- Se o Mercado Pago mudar política de webhook/assinatura ou o fluxo OAuth do Connect, revalidar a documentação oficial antes de alterar `app/api/webhooks/mercadopago/route.ts` ou `app/api/mercadopago/callback/route.ts`.

## Supabase Storage (fotos de produto)

- Bucket usado: `fotos-produtos` (ver `lib/supabase/storage.ts`), **público para leitura** (URLs de foto aparecem no site da loja sem autenticação).
- Upload feito direto do client autenticado (`createBrowserClient`), nunca com a `SUPABASE_SERVICE_ROLE_KEY` no browser.
- Setup manual necessário no dashboard do Supabase (não versionado em migration):
  1. Criar bucket `fotos-produtos` com acesso público de leitura.
  2. Policy de `INSERT`/`UPDATE`/`DELETE` restrita a usuários autenticados (`auth.role() = 'authenticated'`); a pasta do arquivo já é prefixada por `lojaId` para organização, mas o isolamento real de escrita por tenant fica a cargo da regra de negócio na aplicação (o tRPC só aceita salvar a foto no produto se o produto pertencer à loja do usuário).
  3. Limite de tamanho de arquivo sugerido: 5MB por foto.
