import { z } from "zod";
import { router, storeProcedure } from "../trpc";

export const produtosRouter = router({
  listar: storeProcedure
    .input(
      z.object({
        busca: z.string().optional(),
        categoriaId: z.string().optional(),
      }).optional(),
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.produto.findMany({
        where: {
          lojaId: ctx.lojaId,
          categoriaId: input?.categoriaId,
          nome: input?.busca
            ? { contains: input.busca, mode: "insensitive" }
            : undefined,
        },
        include: { fotos: true, variacoes: true, categoria: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  criar: storeProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        descricao: z.string().optional(),
        precoNormal: z.number().positive(),
        precoPromo: z.number().positive().optional(),
        categoriaId: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.produto.create({
        data: {
          lojaId: ctx.lojaId,
          nome: input.nome,
          descricao: input.descricao,
          precoNormal: input.precoNormal,
          precoPromo: input.precoPromo,
          categoriaId: input.categoriaId,
        },
      });
    }),
});
