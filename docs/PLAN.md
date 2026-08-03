# PLAN.md — Plano de execução

Plano de execução do Online E-commerce, baseado em [CLAUDE.md](../CLAUDE.md) e [docs/PRD.md](PRD.md). Não confundir com o PRD (o que construir) — este documento define a ordem e a forma de construir.

## Estratégia geral

- **Interface primeiro, backend depois**: cada milestone de tela é construído com dados mockados (fixtures locais em TypeScript), sem depender de banco ou API real. Isso permite validar UX/fluxo rápido. Os milestones de backend (a partir do M7) substituem os mocks por dados reais via Prisma/tRPC, tela por tela.
- **Uma branch por milestone**, criada a partir de `main` (ou da branch do milestone anterior já mergeado). Nome sugerido: `milestone/NN-slug`.
- **Cada milestone termina com**: checklist de entregas concluído → build e typecheck passando → checkout de volta para `main` → merge → commit final na `main` (mensagem descrita em cada milestone) → apagar a branch do milestone.
- Testar cada milestone manualmente no navegador antes de avançar (rodar `npm run dev`, navegar pelos fluxos), conforme PRD seção 7.

## Convenção de cada milestone

```
### M<n> — <nome>
- Branch: milestone/NN-slug
- Objetivo: <1-2 frases>
- Entregas:
  - [ ] item 1
  - [ ] item 2
- Commit final: "<mensagem de commit>"
```

---

## Fase 0 — Setup

### M0 — Setup do projeto
- Branch: `milestone/00-setup` *(já concluído diretamente na base do projeto)*
- Objetivo: preparar o esqueleto técnico do projeto para que os próximos milestones só precisem adicionar telas e lógica de negócio.
- Entregas:
  - [x] Next.js (App Router) + TypeScript + Tailwind + ESLint
  - [x] shadcn/ui instalado e configurado
  - [x] Prisma configurado com adapter `pg` e schema inicial do domínio (Loja, Usuario, Produto, Pedido, Cliente, Cupom, Frete, Estoque)
  - [x] tRPC configurado (contexto, procedures público/protegido/escopado por loja, router raiz, route handler)
  - [x] Estrutura de pastas: `app/(public-store)`, `app/(dashboard)/painel`, `app/(admin)`, `server/`, `components/`, `lib/`
  - [x] `.env.example`, `.gitignore`, build e dev server validados
- Commit final: `chore: setup inicial do projeto (Next.js, shadcn/ui, Prisma, tRPC)`

---

## Fase 1 — Interface (UI primeiro, com dados mockados)

Todas as telas desta fase usam fixtures locais (`lib/mocks/*.ts`) — sem chamadas reais a banco ou API. O objetivo é fechar layout, navegação e componentes antes de conectar dados reais.

### M1 — Design system e componentes base
- Branch: `milestone/01-design-system`
- Objetivo: estabelecer a identidade visual (cores, tipografia, componentes compartilhados) que será reused nas 3 áreas do produto (site da loja, painel do lojista, painel do SaaS), conforme PRD seção 6 e CLAUDE.md "Identidade visual".
- Entregas:
  - [x] Paleta de cores e tokens Tailwind/shadcn (tema claro, base para dark mode futuro)
  - [x] Componentes shadcn adicionais necessários (`form`, `tabs`, `sheet`, `avatar`, `separator`, `skeleton`, `alert`, `tooltip`, `pagination`)
  - [x] Layout raiz com header/nav placeholder e área de conteúdo
  - [x] Página de estilo/showcase interna (`/dev/ui`) para revisar componentes visualmente (remover ou proteger antes do deploy final)
- Commit final: `feat: design system e componentes base de UI`

### M2 — Onboarding e autenticação (telas)
- Branch: `milestone/02-auth-ui`
- Objetivo: telas de cadastro/login do lojista e fluxo de onboarding (criação da loja), ainda sem autenticação real.
- Entregas:
  - [x] Tela de login
  - [x] Tela de cadastro do lojista
  - [x] Fluxo de onboarding: escolher modelo, logo, cores, informações da empresa (PRD 3.1)
  - [x] Tela de "loja criada com sucesso" com link para o painel
- Commit final: `feat: telas de autenticação e onboarding do lojista`

### M3 — Painel do lojista: produtos e estoque (UI)
- Branch: `milestone/03-painel-produtos-ui`
- Objetivo: interface completa de cadastro/gestão de produtos e controle de estoque, com dados mockados.
- Entregas:
  - [x] Listagem de produtos com busca e filtros (categoria, status)
  - [x] Formulário de cadastro/edição de produto (nome, descrição, fotos, preços, categoria, código, peso/dimensões, variações de cor/tamanho/modelo, status ativo/inativo/destaque)
  - [x] Tela de estoque por variação, com aviso de estoque baixo
  - [x] Histórico de entradas e saídas (mock)
- Commit final: `feat: UI de cadastro de produtos e controle de estoque`

### M4 — Painel do lojista: pedidos, clientes, cupons e dashboard (UI)
- Branch: `milestone/04-painel-pedidos-ui`
- Objetivo: interface das demais áreas operacionais do painel do lojista.
- Entregas:
  - [x] Kanban/lista de pedidos com status (Novo → Aguardando pagamento → Pago → Em preparação → Enviado → Pronto para retirada → Entregue → Cancelado)
  - [x] Tela de detalhe do pedido (pagamento, produtos, cliente, endereço, entrega, rastreio)
  - [x] Cadastro e listagem de clientes (histórico de compras, total gasto, ticket médio, última compra)
  - [x] Cadastro de cupons e promoções
  - [x] Configuração de frete e entrega
  - [x] Dashboard com KPIs mockados (faturamento, nº pedidos, ticket médio, produtos mais vendidos, estoque baixo, vendas por período)
  - [x] Tela de personalização da loja (logo, cores, banners, redes sociais, WhatsApp, horário, políticas, domínio)
  - [x] Tela de usuários e permissões (papéis: Administrador, Gerente, Vendedor, Estoquista, Separador)
- Commit final: `feat: UI de pedidos, clientes, cupons, frete, dashboard e configurações do painel`

### M5 — Site de vendas público (UI)
- Branch: `milestone/05-site-vendas-ui`
- Objetivo: interface pública da loja onde o cliente final navega e compra, com catálogo mockado.
- Entregas:
  - [x] Página inicial da loja (`/loja/[slug]`) com banners, categorias em destaque
  - [x] Listagem de produtos com busca e filtro por categoria/preço
  - [x] Página de produto com seleção de variações
  - [x] Carrinho (estado local, sem persistência)
  - [x] Checkout: resumo do pedido, cadastro do cliente, endereço, cupom, frete, retirada na loja, forma de pagamento, confirmação (fluxo completo em UI, sem processar pagamento real)
  - [x] Botão flutuante de WhatsApp
- Commit final: `feat: UI do site de vendas público e fluxo de checkout`

### M6 — Painel administrativo do SaaS (UI)
- Branch: `milestone/06-admin-saas-ui`
- Objetivo: interface do painel do dono da plataforma (camada separada dos lojistas), PRD 3.15.
- Entregas:
  - [x] Listagem de lojas cadastradas com status (ativa/bloqueada/teste)
  - [x] Tela de planos e assinaturas
  - [x] Tela de métricas gerais da plataforma
  - [x] Ação de bloqueio/liberação de loja
  - [x] Listagem/gestão de usuários da plataforma
- Commit final: `feat: UI do painel administrativo do SaaS`

---

## Fase 2 — Backend (dados reais, autenticação, regras de negócio)

A partir daqui, cada milestone troca os mocks de uma área específica por dados reais, seguindo a mesma ordem das telas construídas na Fase 1.

### M7 — Banco de dados e migrations
- Branch: `milestone/07-database`
- Objetivo: levar o schema Prisma (já criado no M0) para um banco Supabase real e rodar a primeira migration.
- Entregas:
  - [x] Projeto Supabase criado, `DATABASE_URL` configurada (connection pooler)
  - [x] `npx prisma migrate dev` rodando a migration inicial
  - [x] Seed de dados de desenvolvimento (`prisma/seed.ts`): 1 loja, produtos, categorias, cliente, pedido de exemplo
  - [x] Revisão do schema contra o PRD (nenhum campo obrigatório faltando)
- Commit final: `feat: migrations iniciais do banco de dados e seed de desenvolvimento`

### M8 — Autenticação real (Supabase Auth)
- Branch: `milestone/08-auth-backend`
- Objetivo: conectar as telas de login/cadastro do M2 à autenticação real, com sessão e multi-tenant funcionando.
- Entregas:
  - [x] Supabase Auth configurado (e-mail/senha no mínimo)
  - [x] Middleware/contexto tRPC lendo a sessão real (substituir TODO em `server/trpc/context.ts`)
  - [x] Vínculo `Usuario` ↔ `UsuarioLoja` ↔ `Loja` funcionando (resolver loja ativa do usuário logado)
  - [x] Fluxo de onboarding (M2) criando `Loja` real no banco ao final do cadastro
  - [x] Proteção de rotas do painel (`(dashboard)` e `(admin)`) por sessão e por papel
- Commit final: `feat: autenticação real com Supabase Auth e resolução de tenant`

### M9 — Backend: produtos e estoque
- Branch: `milestone/09-produtos-backend`
- Objetivo: conectar as telas do M3 a dados reais via tRPC/Prisma.
- Entregas:
  - [x] CRUD completo de produtos, variações e categorias via tRPC (`storeProcedure`, escopado por `lojaId`)
  - [x] Upload de fotos de produto (Supabase Storage)
  - [x] Baixa automática de estoque e histórico de movimentação (`MovimentoEstoque`) em transação Prisma
  - [x] Bloqueio de venda sem estoque e aviso de estoque baixo com dado real
- Commit final: `feat: backend de produtos, variações, fotos e estoque`

### M10 — Backend: pedidos, clientes, cupons e frete
- Branch: `milestone/10-pedidos-backend`
- Objetivo: conectar as telas do M4 a dados reais.
- Entregas:
  - [x] CRUD de clientes e endereços
  - [x] CRUD de cupons com validação de vigência/limite de uso
  - [x] CRUD de opções de frete
  - [x] Criação e atualização de pedidos com todas as transições de status, dentro de transação Prisma
  - [x] Dashboard consumindo agregações reais (faturamento, ticket médio, produtos mais vendidos, etc.)
- Commit final: `feat: backend de pedidos, clientes, cupons, frete e dashboard`

### M11 — Backend: site de vendas e checkout
- Branch: `milestone/11-checkout-backend`
- Objetivo: conectar o site público (M5) ao catálogo e criar pedidos reais no checkout.
- Entregas:
  - [x] Catálogo público (produtos ativos/destaque) consumido via tRPC público, escopado por `slug` da loja
  - [x] Carrinho persistido (local storage ou tabela temporária) até finalizar compra
  - [x] Criação de pedido real no checkout, com cliente/endereço/cupom/frete
  - [x] Confirmação de pedido gerando registro em `Pedido` com status `NOVO`/`AGUARDANDO_PAGAMENTO`
- Commit final: `feat: catálogo público e checkout conectados ao backend`

### M12 — Pagamentos
- Branch: `milestone/12-pagamentos`
- Objetivo: integrar meios de pagamento da loja e assinatura do SaaS.
- Entregas:
  - [x] Stripe configurado para assinatura de planos do SaaS (webhook validado por assinatura)
  - [x] Gateway de pagamento da loja (PIX/cartão/boleto) integrado via Mercado Pago Connect (OAuth por loja) — decisão documentada no CLAUDE.md antes de implementar
  - [x] Confirmação automática de pagamento atualizando status do pedido
  - [x] Link de pagamento e opção de pagamento na entrega
- Pendências para ativar em produção (fora do escopo deste milestone): preencher credenciais reais no `.env` (Stripe e Mercado Pago) e registrar a `redirect_uri` do OAuth no app do Mercado Pago.
- Commit final: `feat: integração de pagamentos (assinatura SaaS e checkout da loja)`

### M13 — Notificações e WhatsApp
- Branch: `milestone/13-notificacoes`
- Objetivo: fechar os requisitos transversais de notificação (PRD 3.14 e requisitos funcionais gerais).
- Entregas:
  - [x] E-mails transacionais via Resend (confirmação de pedido, mudança de status, aviso de estoque baixo) — `lib/email/`
  - [x] Link direto de WhatsApp com mensagem pré-preenchida (confirmação, atualização de status, recuperação de carrinho, contato da loja) — `lib/whatsapp.ts`
  - [x] Notificações in-app no painel do lojista (pedidos novos, estoque baixo, status atualizado) — model `Notificacao`, `server/trpc/routers/notificacoes.ts`, sino no header do painel
- Achado corrigido neste milestone: o webhook do Mercado Pago (`app/api/webhooks/mercadopago/route.ts`) confirmava pagamento (`PAGO`) direto no banco sem passar pelos helpers de notificação — cliente/lojista não recebiam e-mail nem notificação in-app quando o pagamento era aprovado automaticamente (caso mais comum: PIX/cartão). Corrigido para chamar `notificarStatusAtualizado` dentro da mesma transação Prisma do `updateMany`.
- Commit final: `feat: notificações por e-mail, WhatsApp e in-app`

### M14 — Backend: painel administrativo do SaaS
- Branch: `milestone/14-admin-saas-backend`
- Objetivo: conectar o painel do M6 a dados reais.
- Decisão de escopo (ver CLAUDE.md "Modelo de cobrança do lojista"): sem checkout de venda do próprio SaaS — cada loja é um projeto fechado sob encomenda, cadastrado pelo admin. Onboarding self-service (M2/M8) continua existindo em paralelo, sem remoção.
- Entregas:
  - [x] Cadastro/listagem real de lojas e planos (`admin.criarLoja`, `admin.listarLojas`, `admin.obterLoja`)
  - [x] Bloqueio/liberação de loja refletindo em acesso real (`statusPlano`) — `storeProcedure` passa a barrar o painel do lojista quando `BLOQUEADO`
  - [x] Métricas gerais agregando dados reais de todas as lojas (`admin.metricas`)
  - [x] Limites por plano aplicados (`limiteProdutos` bloqueando `produtos.criar`; `limiteUsuarios` fica para quando existir backend de convite de usuário de loja)
  - [x] Autorização do admin da plataforma: `Usuario.papelAdmin` (SUPER_ADMIN/SUPORTE/FINANCEIRO), bootstrap via `ADMIN_EMAILS`, gestão de acesso pelo próprio painel (`admin.concederAcessoPlataforma`)
- Testado end-to-end no navegador (Playwright) contra o Supabase real: bootstrap de SUPER_ADMIN, as 5 telas admin com dado real, bloqueio/liberação de loja, limite de produtos por plano. Dois bugs encontrados e corrigidos nesse teste: painel do lojista travava em skeleton infinito (sem mensagem) quando a loja era bloqueada — `components/dashboard/acesso-loja-guard.tsx` agora mostra o erro claro; `VendasPorPeriodoChart` quebrava com tela de erro do Next.js quando não havia dados de venda no período.
- Commit final: `feat: backend do painel administrativo do SaaS`

---

## Fase 3 — Qualidade e deploy

### M15 — Domínio personalizado e multi-tenant por domínio
- Branch: `milestone/15-dominio-personalizado`
- Objetivo: permitir que cada loja use subdomínio ou domínio próprio (PRD 3.12).
- Entregas:
  - [x] Resolução de tenant por subdomínio (`{slug}.NEXT_PUBLIC_PLATFORM_DOMAIN`) além do `/loja/[slug]`, via `proxy.ts` (rewrite, sem consulta ao banco no Edge)
  - [x] Suporte a domínio personalizado: `Loja.dominioProprio` resolvido em `app/(public-store)/loja/dominio-proprio/[host]/[[...rest]]` (Node runtime, Prisma) com redirect para `/loja/{slug}`; mutation `loja.atualizarDominioProprio` com validação de unicidade; UI em `DominioProprioForm` (`/painel/configuracoes`) com instrução de CNAME
  - Sem verificação automática de DNS/API de hospedagem neste milestone (decisão registrada no CLAUDE.md) — só UI + instrução manual de CNAME
  - Limitação conhecida: acesso por domínio próprio resulta em redirect visível para `/loja/{slug}` na barra de endereço (não mantém o domínio do lojista puro na URL)
- Testado ponta a ponta: `curl` com header `Host` forjado (subdomínio, domínio próprio, domínio desconhecido → 404, rotas da plataforma não afetadas) e fluxo real no navegador via Playwright (cadastro → onboarding → login → `/painel/configuracoes` → salvar/validar/remover domínio, com screenshots). Um bug real foi encontrado e corrigido nesse teste: `DominioProprioForm` tinha um `<form>` aninhado dentro do `<form>` de `LojaForm` (HTML inválido, quebrava a hidratação) — corrigido movendo a seção para fora do form principal.
- Commit final: `feat: suporte a subdomínio e domínio personalizado por loja`

### M16 — Revisão de segurança e permissões
- Branch: `milestone/16-seguranca`
- Objetivo: garantir isolamento entre tenants e permissões corretas por papel antes do deploy.
- Entregas:
  - [x] Auditoria de todas as queries tRPC: nenhuma sem escopo de `lojaId` onde aplicável
  - [x] Verificação de assinatura em todos os webhooks (Stripe, Mercado Pago) — não há webhook de WhatsApp neste projeto (integração é só link direto, ver M13)
  - [x] Auditoria de permissão por papel (Administrador, Gerente, Vendedor, Estoquista, Separador): `storeProcedure` não checava `UsuarioLoja.papel` — qualquer usuário da loja podia chamar mutations sensíveis via API direta, mesmo escondidas na UI. Corrigido com `roleProcedure` aplicado a pagamentos/assinatura, conexão Mercado Pago, domínio próprio, cupons e remoção de produto.
  - [x] Revisão de variáveis sensíveis (nenhum segredo commitado, `.env.example` atualizado)
- Achado adicional (não bloqueante, registrado para acompanhamento): a policy do bucket Supabase Storage `fotos-produtos` restringe escrita a `auth.role() = 'authenticated'`, mas não ao `lojaId` do caminho — a separação por pasta depende do client sempre enviar o `lojaId` correto, não de uma regra server-side. Ver CLAUDE.md "Supabase Storage".
- Commit final: `fix: revisão de segurança, isolamento multi-tenant e permissões`

### M17 — Deploy em produção
- Branch: `milestone/17-deploy`
- Objetivo: publicar a plataforma em produção na Vercel com banco Supabase de produção.
- Entregas:
  - [ ] Projeto Vercel conectado ao repositório, variáveis de ambiente de produção configuradas *(preparação de código concluída; execução nas contas Vercel/Supabase/Stripe/Mercado Pago/Resend pendente — ver [DEPLOY.md](DEPLOY.md))*
  - [ ] Banco de produção no Supabase com migrations aplicadas *(automatizado: `prisma migrate deploy` roda antes de `next build`; falta rodar o primeiro deploy real)*
  - [ ] Domínio principal da plataforma configurado
  - [ ] Smoke test em produção: cadastro de loja → produto → pedido de teste → pagamento em modo teste
  - [x] Remoção/proteção de telas de desenvolvimento (`/dev/ui` do M1) — bloqueada com 404 quando `NODE_ENV=production` (`proxy.ts`), testado localmente com `next start`
- Achados corrigidos durante a preparação: `baseUrl()` (usado nos redirects do Stripe e no OAuth do Mercado Pago Connect) dependia de `VERCEL_URL`, que muda a cada deployment/preview — quebraria a `redirect_uri` fixa do Mercado Pago em produção. Centralizado em `lib/base-url.ts`, usando `NEXT_PUBLIC_PLATFORM_DOMAIN` como fonte de verdade.
- Runbook completo de deploy (passo a passo, variáveis de ambiente e de onde vêm, smoke test) em [docs/DEPLOY.md](DEPLOY.md).
- Commit final: `chore: deploy inicial em produção` *(pendente até a execução real do deploy)*
