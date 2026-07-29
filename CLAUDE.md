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
- **Pagamentos**: Stripe (assinaturas do SaaS) — pagamentos da loja (PIX/cartão/boleto) via gateway a definir, ver PRD seção 3.5
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
- Webhooks (Stripe, WhatsApp) precisam de verificação de assinatura — nunca confiar no payload sem validar origem.
- Ao integrar novo gateway de pagamento da loja (PIX/boleto/cartão), documentar aqui a decisão e as credenciais necessárias, sem commitar segredos — usar variáveis de ambiente e `.env` no `.gitignore`.
