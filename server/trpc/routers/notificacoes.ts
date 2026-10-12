import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { router, storeProcedure } from "../trpc";

// Notificação de pedido carrega número e valor — para o Vendedor, só as dos
// pedidos que ele registrou (mais os avisos de estoque, que não têm pedido);
// para o Estoquista, só os avisos de estoque.
async function filtroNotificacoes(
  ctx: { prisma: PrismaClient; lojaId: string; papel: string | null; usuario: { id: string } },
) {
  // Estoquista não lida com pedidos: só os avisos de estoque.
  if (ctx.papel === "ESTOQUISTA") return { lojaId: ctx.lojaId, tipo: "ESTOQUE_BAIXO" as const };
  if (ctx.papel !== "VENDEDOR") return { lojaId: ctx.lojaId };

  const meus = await ctx.prisma.pedido.findMany({
    where: { lojaId: ctx.lojaId, criadoPorId: ctx.usuario.id },
    select: { id: true },
    take: 1000,
  });
  return {
    lojaId: ctx.lojaId,
    OR: [{ tipo: "ESTOQUE_BAIXO" as const }, { pedidoId: { in: meus.map((p) => p.id) } }],
  };
}

export const notificacoesRouter = router({
  listar: storeProcedure
    .input(z.object({ limite: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.notificacao.findMany({
        where: await filtroNotificacoes(ctx),
        orderBy: { createdAt: "desc" },
        take: input?.limite ?? 20,
      });
    }),

  contarNaoLidas: storeProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notificacao.count({ where: { ...(await filtroNotificacoes(ctx)), lida: false } });
  }),

  marcarLida: storeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notificacao.updateMany({
        where: { ...(await filtroNotificacoes(ctx)), id: input.id },
        data: { lida: true },
      });
    }),

  marcarTodasLidas: storeProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.notificacao.updateMany({
      where: { ...(await filtroNotificacoes(ctx)), lida: false },
      data: { lida: true },
    });
  }),
});
