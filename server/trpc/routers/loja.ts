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
        plano: { select: { id: true, nome: true, precoMensal: true } },
      },
    });
  }),
});
