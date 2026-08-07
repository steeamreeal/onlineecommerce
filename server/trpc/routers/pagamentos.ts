import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure, roleProcedure } from "../trpc";

// Assinatura do SaaS e conexão de pagamento da loja são decisões financeiras
// — restritas a quem administra a loja, não a qualquer usuário vinculado.
const financeiroProcedure = roleProcedure(["ADMINISTRADOR"]);
import { getStripe } from "@/lib/stripe";
import { getMpOAuth } from "@/lib/mercadopago";
import { assinarState } from "@/lib/mercadopago-state";
import { baseUrl } from "@/lib/base-url";

export const pagamentosRouter = router({
  // Planos disponíveis para assinatura, ordenados do mais barato ao mais
  // caro. Usado pela tela de assinatura do painel do lojista.
  listarPlanos: storeProcedure.query(({ ctx }) => {
    return ctx.prisma.plano.findMany({
      where: { stripePriceId: { not: null } },
      orderBy: { precoMensal: "asc" },
    });
  }),

  // Cria (ou reaproveita) o Stripe Customer da loja e devolve a URL de uma
  // Checkout Session de assinatura para o plano escolhido. O painel
  // redireciona o lojista para essa URL; o status real da loja só muda
  // quando o webhook confirma o pagamento (ver app/api/webhooks/stripe).
  criarCheckoutAssinatura: financeiroProcedure
    .input(z.object({ planoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [loja, plano] = await Promise.all([
        ctx.prisma.loja.findUniqueOrThrow({ where: { id: ctx.lojaId } }),
        ctx.prisma.plano.findUnique({ where: { id: input.planoId } }),
      ]);

      if (!plano?.stripePriceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Plano indisponível para assinatura." });
      }

      const stripe = getStripe();
      let stripeCustomerId = loja.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          name: loja.nome,
          metadata: { lojaId: loja.id },
        });
        stripeCustomerId = customer.id;
        await ctx.prisma.loja.update({
          where: { id: loja.id },
          data: { stripeCustomerId },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        line_items: [{ price: plano.stripePriceId, quantity: 1 }],
        success_url: `${baseUrl()}/painel/assinatura?status=sucesso`,
        cancel_url: `${baseUrl()}/painel/assinatura?status=cancelado`,
        metadata: { lojaId: loja.id, planoId: plano.id },
      });

      if (!session.url) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível iniciar o checkout." });
      }

      return { url: session.url };
    }),

  // Link para o lojista gerenciar a própria assinatura (trocar cartão,
  // cancelar) direto no portal hospedado da Stripe.
  criarPortalAssinatura: financeiroProcedure.mutation(async ({ ctx }) => {
    const loja = await ctx.prisma.loja.findUniqueOrThrow({ where: { id: ctx.lojaId } });
    if (!loja.stripeCustomerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Esta loja ainda não possui assinatura." });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: loja.stripeCustomerId,
      return_url: `${baseUrl()}/painel/assinatura`,
    });

    return { url: session.url };
  }),

  // URL de autorização do Mercado Pago Connect: o lojista é redirecionado
  // para lá, autoriza a plataforma, e volta em app/api/mercadopago/callback
  // com os tokens da própria conta (o dinheiro do checkout cai direto nela).
  iniciarConexaoMercadoPago: financeiroProcedure.mutation(({ ctx }) => {
    if (!process.env.MERCADOPAGO_CLIENT_ID || !process.env.MERCADOPAGO_CLIENT_SECRET) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "A integração com o Mercado Pago ainda não foi configurada nesta plataforma. Avise o suporte.",
      });
    }

    const url = getMpOAuth().getAuthorizationURL({
      options: {
        client_id: process.env.MERCADOPAGO_CLIENT_ID!,
        redirect_uri: `${baseUrl()}/api/mercadopago/callback`,
        state: assinarState(ctx.lojaId),
      },
    });

    return { url };
  }),
});
