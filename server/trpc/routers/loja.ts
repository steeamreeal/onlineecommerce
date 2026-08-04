import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure, roleProcedure } from "../trpc";

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
        template: true,
        corPrimaria: true,
        banners: true,
        plano: { select: { id: true, nome: true, precoMensal: true } },
      },
    });
  }),

  // Domínio próprio é opcional e único na plataforma inteira (não só por
  // loja) — precisa checar colisão com outra loja antes de salvar, já que
  // é o valor usado pelo middleware para resolver o tenant pelo host.
  atualizarDominioProprio: roleProcedure(["ADMINISTRADOR"])
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

  atualizarPersonalizacao: roleProcedure(["ADMINISTRADOR"])
    .input(
      z.object({
        template: z.enum(["MINIMALISTA", "EDITORIAL", "VITRINE"]),
        corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: { template: input.template, corPrimaria: input.corPrimaria },
        select: { template: true, corPrimaria: true },
      });
    }),

  // Sobrescreve o array inteiro a cada chamada (banners não é uma relação
  // Prisma separada, é Json) — sem diff por id, mais simples que o padrão
  // usado em produtos.fotos.
  atualizarBanners: roleProcedure(["ADMINISTRADOR"])
    .input(
      z.object({
        banners: z
          .array(
            z.object({
              id: z.string().optional(),
              url: z.string().min(1),
              titulo: z.string().min(1),
            }),
          )
          .max(3, "No máximo 3 banners por loja."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: { banners: input.banners },
        select: { banners: true },
      });
    }),
});
