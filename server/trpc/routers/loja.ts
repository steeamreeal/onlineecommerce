import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure } from "../trpc";

export const lojaRouter = router({
  atual: storeProcedure.query(({ ctx }) => {
    return ctx.prisma.loja.findUniqueOrThrow({
      where: { id: ctx.lojaId },
      select: {
        id: true,
        nome: true,
        slug: true,
        planoId: true,
        statusPlano: true,
        stripeCustomerId: true,
        mpConectadoEm: true,
        dominioProprio: true,
        plano: { select: { id: true, nome: true, precoMensal: true } },
      },
    });
  }),

  // Domínio próprio é opcional e único na plataforma inteira (não só por
  // loja) — precisa checar colisão com outra loja antes de salvar, já que
  // é o valor usado pelo middleware para resolver o tenant pelo host.
  atualizarDominioProprio: storeProcedure
    .input(z.object({ dominioProprio: z.string().trim().toLowerCase().min(1).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const dominio = input.dominioProprio?.replace(/^https?:\/\//, "").replace(/\/$/, "") || null;

      if (dominio) {
        const emUso = await ctx.prisma.loja.findFirst({
          where: { dominioProprio: dominio, id: { not: ctx.lojaId } },
          select: { id: true },
        });
        if (emUso) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este domínio já está em uso por outra loja.",
          });
        }
      }

      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: { dominioProprio: dominio },
        select: { dominioProprio: true },
      });
    }),
});
