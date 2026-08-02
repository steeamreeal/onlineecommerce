import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { router, publicProcedure } from "../trpc";

// Toda procedure deste router é pública (site de vendas, sem sessão) e
// recebe o slug da loja como input, resolvendo o lojaId no servidor — nunca
// aceita lojaId vindo do client, para não vazar dados entre tenants.
export async function resolverLojaPorSlug(prisma: PrismaClient, slug: string) {
  const loja = await prisma.loja.findUnique({ where: { slug } });
  if (!loja) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Loja não encontrada." });
  }
  return loja;
}

export const lojaPublicaRouter = router({
  porSlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      return {
        nome: loja.nome,
        slug: loja.slug,
        logoUrl: loja.logoUrl,
        corPrimaria: loja.corPrimaria,
        banners: loja.banners,
        whatsapp: loja.whatsapp,
        instagram: loja.instagram,
        facebook: loja.facebook,
        endereco: loja.endereco,
        horarioAtend: loja.horarioAtend,
        politicas: loja.politicas,
        dominioProprio: loja.dominioProprio,
        // Booleano derivado (nunca o token) — usado pelo checkout para
        // esconder PIX/cartão/boleto quando a loja não conectou o Mercado
        // Pago, em vez do cliente só descobrir o erro no fim do fluxo.
        aceitaPagamentoOnline: Boolean(loja.mpAccessToken),
      };
    }),

  categorias: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      return ctx.prisma.categoria.findMany({
        where: { lojaId: loja.id },
        orderBy: { nome: "asc" },
      });
    }),

  produtos: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        busca: z.string().optional(),
        categoriaId: z.string().optional(),
        precoMin: z.number().min(0).optional(),
        precoMax: z.number().min(0).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      return ctx.prisma.produto.findMany({
        where: {
          lojaId: loja.id,
          // Site público nunca lista produtos INATIVO.
          status: { in: ["ATIVO", "DESTAQUE"] },
          categoriaId: input.categoriaId,
          nome: input.busca ? { contains: input.busca, mode: "insensitive" } : undefined,
        },
        include: { fotos: { orderBy: { ordem: "asc" } }, variacoes: true, categoria: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  produtoPorId: publicProcedure
    .input(z.object({ slug: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      const produto = await ctx.prisma.produto.findFirst({
        where: { id: input.id, lojaId: loja.id, status: { in: ["ATIVO", "DESTAQUE"] } },
        include: { fotos: { orderBy: { ordem: "asc" } }, variacoes: true, categoria: true },
      });
      if (!produto) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado." });
      }
      return produto;
    }),

  frete: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      return ctx.prisma.opcaoFrete.findMany({
        where: { lojaId: loja.id, ativo: true },
        orderBy: { nome: "asc" },
      });
    }),

  validarCupom: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        codigo: z.string(),
        produtoIds: z.array(z.string()).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      const cupom = await ctx.prisma.cupom.findFirst({
        where: { lojaId: loja.id, codigo: input.codigo.toUpperCase() },
        include: { produtos: true, categorias: true },
      });
      if (!cupom) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cupom não encontrado." });
      }

      const agora = new Date();
      if (agora < cupom.inicio) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este cupom ainda não está vigente." });
      }
      if (agora > cupom.fim) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este cupom está expirado." });
      }
      if (cupom.limiteUso != null && cupom.usosAtuais >= cupom.limiteUso) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este cupom atingiu o limite de uso." });
      }

      const restrito = cupom.produtos.length > 0 || cupom.categorias.length > 0;
      if (restrito) {
        const idsProdutosRestritos = new Set(cupom.produtos.map((p) => p.id));
        const aplicaAlgumProduto = input.produtoIds.some((id) => idsProdutosRestritos.has(id));
        if (!aplicaAlgumProduto) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este cupom não é válido para os produtos do carrinho.",
          });
        }
      }

      return {
        id: cupom.id,
        codigo: cupom.codigo,
        tipo: cupom.tipo,
        valor: cupom.valor,
      };
    }),
});
