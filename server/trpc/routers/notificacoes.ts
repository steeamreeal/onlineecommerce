import { z } from "zod";
import { router, storeProcedure } from "../trpc";

export const notificacoesRouter = router({
  listar: storeProcedure
    .input(z.object({ limite: z.number().int().min(1).max(50).default(20) }).optional())
    .query(({ ctx, input }) => {
      return ctx.prisma.notificacao.findMany({
        where: { lojaId: ctx.lojaId },
        orderBy: { createdAt: "desc" },
        take: input?.limite ?? 20,
      });
    }),

  contarNaoLidas: storeProcedure.query(({ ctx }) => {
    return ctx.prisma.notificacao.count({ where: { lojaId: ctx.lojaId, lida: false } });
  }),

  marcarLida: storeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.notificacao.updateMany({
        where: { id: input.id, lojaId: ctx.lojaId },
        data: { lida: true },
      });
    }),

  marcarTodasLidas: storeProcedure.mutation(({ ctx }) => {
    return ctx.prisma.notificacao.updateMany({
      where: { lojaId: ctx.lojaId, lida: false },
      data: { lida: true },
    });
  }),
});
