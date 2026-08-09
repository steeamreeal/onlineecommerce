import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { router, publicProcedure } from "../trpc";
import { extrairSelosSemente } from "@/lib/tema-loja";

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
        template: loja.template,
        banners: loja.banners,
        temaConfig: loja.temaConfig,
        temaProdutoConfig: loja.temaProdutoConfig,
        selosConfig: loja.selosConfig ?? extrairSelosSemente(loja.temaConfig),
        whatsapp: loja.whatsapp,
        instagram: loja.instagram,
        facebook: loja.facebook,
        endereco: loja.endereco,
        horarioAtend: loja.horarioAtend,
        politicas: loja.politicas,
        telefoneSac: loja.telefoneSac,
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
        include: { fotos: { orderBy: { ordem: "asc" } }, variacoes: { include: { foto: true } }, categoria: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  produtoPorId: publicProcedure
    .input(z.object({ slug: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      const produto = await ctx.prisma.produto.findFirst({
        where: { id: input.id, lojaId: loja.id, status: { in: ["ATIVO", "DESTAQUE"] } },
        include: { fotos: { orderBy: { ordem: "asc" } }, variacoes: { include: { foto: true } }, categoria: true },
      });
      if (!produto) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado." });
      }
      return produto;
    }),

  // Só páginas com conteúdo preenchido aparecem no rodapé/são navegáveis —
  // uma página sugerida ainda vazia não é "publicada" (ver
  // paginas-institucionais.ts).
  paginasInstitucionais: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      const paginas = await ctx.prisma.paginaInstitucional.findMany({
        where: { lojaId: loja.id },
        orderBy: { ordem: "asc" },
      });
      return paginas
        .filter((pagina) => pagina.conteudo.trim().length > 0)
        .map((pagina) => ({ slug: pagina.slug, titulo: pagina.titulo }));
    }),

  paginaInstitucionalPorSlug: publicProcedure
    .input(z.object({ slug: z.string(), paginaSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      const pagina = await ctx.prisma.paginaInstitucional.findUnique({
        where: { lojaId_slug: { lojaId: loja.id, slug: input.paginaSlug } },
      });
      if (!pagina || pagina.conteudo.trim().length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Página não encontrada." });
      }
      return { titulo: pagina.titulo, conteudo: pagina.conteudo };
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

  // Sem login de cliente final, o id do pedido (UUID) funciona como a
  // "senha" implícita do link de acompanhamento — por isso nunca listamos
  // pedidos por telefone/CPF aqui, só busca pontual por id já conhecido.
  pedidoPorId: publicProcedure
    .input(z.object({ slug: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);
      const pedido = await ctx.prisma.pedido.findFirst({
        where: { id: input.id, lojaId: loja.id },
        include: {
          itens: { include: { produto: true, variacao: true } },
          cliente: { include: { enderecos: true } },
        },
      });
      if (!pedido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
      }
      return pedido;
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
