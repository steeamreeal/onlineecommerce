# DEPLOY.md — Runbook de deploy em produção (M17)

Passo a passo para publicar a plataforma na Vercel com banco Supabase de produção. Ver [PLAN.md](PLAN.md) seção M17 para as entregas originais.

Convenção: cada passo diz **quem faz** — 🧑 você (contas, credenciais, ações que só o dono das contas pode tomar) ou 🤖 Claude (código já preparado nas etapas anteriores deste milestone).

---

## 1. Banco de produção no Supabase

🧑 **Você:**

1. Crie um projeto novo no [Supabase](https://supabase.com) dedicado a produção (não reaproveite o projeto de desenvolvimento, se houver um separado — hoje o `.env` local já aponta para o que será o banco real, então esse passo pode já estar feito; confirme antes de prosseguir).
2. No painel do projeto → **Project Settings → Database → Connection string**, copie duas strings:
   - **Connection pooling** (modo *Transaction*, porta `6543`) → vai virar `DATABASE_URL`.
   - **Connection pooling** (modo *Session*, porta `5432`) ou a conexão direta → vai virar `DIRECT_URL`.
3. Guarde as duas em um cofre de senhas (não cole em chat, issue ou PR).

🤖 **Já preparado:** `prisma.config.ts` já está configurado para usar `DIRECT_URL` nas migrations e o Prisma Client (runtime) usa `DATABASE_URL` — nenhuma mudança de código necessária aqui.

**Migrations**: não precisa rodar `prisma migrate deploy` manualmente — o script `build` (`package.json`) já roda `prisma migrate deploy && next build` automaticamente a cada deploy na Vercel (ver decisão abaixo em "Variáveis de ambiente").

---

## 2. Projeto Vercel conectado ao repositório

🧑 **Você:**

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório `steeamreeal/onlineecommerce`.
2. **Framework Preset**: Next.js (detectado automaticamente).
3. **Build Command**: deixe o padrão (`npm run build`) — já inclui `prisma migrate deploy`.
4. **Root Directory**: raiz do repo (não mexer, a menos que a estrutura tenha mudado).
5. Ainda **não clique em Deploy** — primeiro configure as variáveis de ambiente (próxima seção), senão o primeiro build falha.

---

## 3. Variáveis de ambiente de produção

🧑 **Você**, em **Vercel → Project Settings → Environment Variables**. Todas as variáveis abaixo existem documentadas (sem valor) em [.env.example](../.env.example) — use-o como checklist.

**Importante sobre escopo (Production / Preview / Development)**: como definido nas etapas anteriores deste milestone, Production e Preview vão apontar para o **mesmo banco Supabase** por enquanto — então marque `DATABASE_URL` e `DIRECT_URL` para os três ambientes (Production, Preview, Development) com o mesmo valor. Isso é aceitável hoje porque `prisma migrate deploy` é idempotente (migration já aplicada não roda de novo), mas significa que um Preview Deploy de uma branch em andamento roda contra o banco real de produção — não faça testes destrutivos em Preview.

| Variável | Onde conseguir | Observação |
|---|---|---|
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | Definido por você | Domínio raiz sem protocolo/porta, ex. `minhaplataforma.com.br`. Usado pelo `proxy.ts` para resolver subdomínio/domínio próprio de loja, e por `lib/base-url.ts` para os redirects do Stripe e OAuth do Mercado Pago — **precisa bater com o domínio real configurado no passo 5**, senão o OAuth do Mercado Pago quebra. |
| `DATABASE_URL` | Supabase → Connection pooling (Transaction, porta 6543) | Runtime da aplicação (Prisma Client). |
| `DIRECT_URL` | Supabase → Connection pooling (Session, porta 5432) | Usado só no build (`prisma migrate deploy`). **Precisa estar marcada para rodar em Build**, não só Runtime — na Vercel isso é automático para todas as env vars, mas confirme que não está restrita só a Functions. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` | **Segredo crítico** — nunca expor no client. Confirme que só é lido em código server-side (já é o caso hoje). |
| `ADMIN_EMAILS` | Definido por você | E-mails (separados por vírgula) que viram `SUPER_ADMIN` automaticamente no primeiro login. Use o(s) seu(s) e-mail(is) reais. |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | Use a chave **live**, não a `sk_test_...`, para produção real. |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → criar endpoint apontando para `https://{NEXT_PUBLIC_PLATFORM_DOMAIN}/api/webhooks/stripe` | Gerado ao criar o endpoint — ver passo 6. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys | Chave pública, pode ser client-side. |
| `MERCADOPAGO_CLIENT_ID` / `MERCADOPAGO_CLIENT_SECRET` | Painel de desenvolvedores do Mercado Pago → sua aplicação (app da **plataforma**, não de uma loja) | Ver passo 6 para o cadastro da `redirect_uri`. |
| `MERCADOPAGO_WEBHOOK_SECRET` | Mercado Pago → sua aplicação → Webhooks | Ver passo 6. |
| `RESEND_API_KEY` | Resend Dashboard → API Keys | |
| `RESEND_FROM_EMAIL` | Definido por você | Precisa ser um remetente de um **domínio verificado** no Resend (ex. `Loja <pedidos@minhaplataforma.com.br>`) — sem isso os e-mails falham silenciosamente (o código trata `RESEND_API_KEY` vazia/inválida como "e-mail não configurado" e não derruba a transação, mas em produção você quer que funcione de verdade). |

---

## 4. Primeiro deploy

🧑 **Você**: com as variáveis preenchidas, clique em **Deploy** na Vercel.

Acompanhe o log de build — o primeiro passo deve mostrar a saída do `prisma migrate deploy` (algo como `5 migrations found` / `No pending migrations to apply` se o banco já tiver as migrations, ou a lista de migrations sendo aplicadas se for um banco novo). Se esse passo falhar, quase sempre é `DIRECT_URL` ausente/incorreta.

---

## 5. Domínio principal da plataforma

🧑 **Você:**

1. Em **Vercel → Project Settings → Domains**, adicione o domínio definido em `NEXT_PUBLIC_PLATFORM_DOMAIN` (ex. `minhaplataforma.com.br`) e siga as instruções de DNS que a Vercel mostrar (registro `A`/`CNAME`, conforme o caso).
2. Aguarde a propagação e o certificado SSL (a Vercel emite automaticamente via Let's Encrypt).
3. Depois que o domínio principal estiver ativo, cada loja pode usar subdomínio (`{slug}.minhaplataforma.com.br` — funciona automaticamente, sem configuração extra por loja, via `proxy.ts`) ou domínio próprio (fluxo manual descrito no CLAUDE.md, seção M15 — você cadastra o CNAME do cliente na Vercel ao ativar cada loja).

⚠️ Se o domínio mudar depois de configurado, lembre de atualizar `NEXT_PUBLIC_PLATFORM_DOMAIN` na Vercel e redeployar — o valor errado quebra o `redirect_uri` do Mercado Pago (passo 6) e os redirects do Stripe.

---

## 6. Registrar callbacks/webhooks nos provedores de pagamento

Depende do domínio já estar ativo (passo 5), porque as URLs abaixo usam `NEXT_PUBLIC_PLATFORM_DOMAIN`.

🧑 **Você:**

**Stripe:**
1. Dashboard → Developers → Webhooks → **Add endpoint**.
2. URL: `https://{NEXT_PUBLIC_PLATFORM_DOMAIN}/api/webhooks/stripe`.
3. Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` (conforme `app/api/webhooks/stripe/route.ts`).
4. Copie o **Signing secret** gerado → variável `STRIPE_WEBHOOK_SECRET` na Vercel.

**Mercado Pago Connect:**
1. No app da plataforma (painel de desenvolvedores do Mercado Pago), cadastre a **Redirect URI** do OAuth: `https://{NEXT_PUBLIC_PLATFORM_DOMAIN}/api/mercadopago/callback`.
2. Configure o webhook de notificações apontando para `https://{NEXT_PUBLIC_PLATFORM_DOMAIN}/api/webhooks/mercadopago`.
3. Copie o secret de assinatura do webhook → variável `MERCADOPAGO_WEBHOOK_SECRET` na Vercel.

Depois de configurar, redeploy na Vercel se alguma variável foi adicionada/alterada depois do deploy inicial (variáveis de ambiente só entram em vigor no próximo build).

---

## 7. Remoção/proteção de telas de desenvolvimento

🤖 **Já feito** neste milestone: `/dev/ui` (showcase de componentes do M1) retorna 404 automaticamente quando `NODE_ENV=production` (`proxy.ts`) — a Vercel define essa variável sozinha em produção, nada a configurar. Testado localmente com `next start` confirmando 404 em produção e 200 em desenvolvimento.

---

## 8. Smoke test em produção

🧑 **Você**, depois do deploy e dos webhooks configurados. Sugestão de roteiro (todos em modo teste/sandbox onde disponível):

1. **Cadastro de loja**: acesse `https://{NEXT_PUBLIC_PLATFORM_DOMAIN}/cadastro`, crie um lojista de teste, complete o onboarding.
2. **Login admin**: faça login com um dos e-mails de `ADMIN_EMAILS` e confirme acesso a `/admin` com `papelAdmin = SUPER_ADMIN`.
3. **Produto**: no painel do lojista de teste, cadastre um produto com foto (valida upload no Supabase Storage).
4. **Conectar Mercado Pago**: em `/painel/assinatura`, inicie a conexão OAuth e confirme que o callback funciona e salva `mpAccessToken` (valida o domínio configurado no passo 6).
5. **Pedido de teste**: acesse o site público da loja (`{slug}.{NEXT_PUBLIC_PLATFORM_DOMAIN}` ou `/loja/{slug}`), adicione o produto ao carrinho, finalize o checkout com um pagamento em modo teste (cartão de teste do Mercado Pago, se a conta ainda estiver em modo sandbox).
6. **Confirmação de pagamento**: confirme que o pedido muda para `PAGO` automaticamente via webhook, e que a notificação por e-mail e in-app dispara (ver M13 — isso testa a correção do webhook feita nesse milestone).
7. **Assinatura SaaS**: em `/painel/assinatura`, teste o checkout do Stripe com um cartão de teste (se ainda em chave `sk_test_`) ou avalie criar um plano de valor simbólico para testar com chave live.
8. **Domínio de loja**: se já tiver um domínio próprio de teste disponível, valide o fluxo do M15 (CNAME → resolução → redirect para `/loja/{slug}`).

Qualquer falha aqui — antes de investigar código, confira primeiro variável de ambiente ausente/errada ou webhook mal configurado; são a causa mais comum de erro só em produção.

---

## Pendências conhecidas (fora do escopo deste milestone)

- Sem automação de DNS/hosting para domínio próprio de loja — cadastro de CNAME na Vercel é manual, feito pelo admin da plataforma por loja (ver CLAUDE.md, seção M15).
- Bucket Supabase Storage `fotos-produtos`: a policy de escrita restringe a usuários autenticados, mas não valida o `lojaId` do caminho no nível do Storage — o isolamento real depende da aplicação sempre enviar o `lojaId` correto (achado do M16, não bloqueante).
- Preview Deployments da Vercel apontam para o mesmo banco de produção (decisão deste milestone) — se o projeto crescer, vale reavaliar branch de banco separada para Preview (Supabase Branching ou projeto Supabase dedicado a staging).
