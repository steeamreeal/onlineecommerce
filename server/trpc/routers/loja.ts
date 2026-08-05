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
        logoUrl: true,
        planoId: true,
        statusPlano: true,
        stripeCustomerId: true,
        mpConectadoEm: true,
        dominioProprio: true,
        template: true,
        corPrimaria: true,
        banners: true,
        whatsapp: true,
        instagram: true,
        facebook: true,
        endereco: true,
        horarioAtend: true,
        politicas: true,
        plano: { select: { id: true, nome: true, precoMensal: true } },
      },
    });
  }),

  // Nome e slug (URL da loja) não entram aqui: são geridos pelo admin da
  // plataforma via admin.atualizarLoja, já que a criação da loja não é mais
  // self-service (M14) e o slug é usado na resolução de tenant por host.
  atualizarIdentidade: roleProcedure(["ADMINISTRADOR"])
    .input(
      z.object({
        corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB"),
        logoUrl: z.string().min(1).nullable(),
        whatsapp: z.string().trim().max(30).optional(),
        instagram: z.string().trim().max(60).optional(),
        facebook: z.string().trim().max(60).optional(),
        endereco: z.string().trim().max(300).optional(),
        horarioAtend: z.string().trim().max(120).optional(),
        politicas: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: {
          corPrimaria: input.corPrimaria,
          logoUrl: input.logoUrl,
          whatsapp: input.whatsapp || null,
          instagram: input.instagram || null,
          facebook: input.facebook || null,
          endereco: input.endereco || null,
          horarioAtend: input.horarioAtend || null,
          politicas: input.politicas || null,
        },
        select: {
          corPrimaria: true,
          logoUrl: true,
          whatsapp: true,
          instagram: true,
          facebook: true,
          endereco: true,
          horarioAtend: true,
          politicas: true,
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
