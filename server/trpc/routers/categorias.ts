import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure } from "../trpc";

export const categoriasRouter = router({
  listar: storeProcedure.query(({ ctx }) => {
    return ctx.prisma.categoria.findMany({
      where: { lojaId: ctx.lojaId },
      orderBy: { nome: "asc" },
    });
  }),

  criar: storeProcedure
    .input(z.object({ nome: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existente = await ctx.prisma.categoria.findUnique({
        where: { lojaId_nome: { lojaId: ctx.lojaId, nome: input.nome } },
      });
      if (existente) {
        throw new TRPCError({ code: "CONFLICT", message: "Esta categoria já existe." });
      }
      return ctx.prisma.categoria.create({
        data: { lojaId: ctx.lojaId, nome: input.nome },
      });
    }),
});
