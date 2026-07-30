import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

export const onboardingRouter = router({
  criarLoja: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        slug: z
          .string()
          .min(2)
          .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
        corPrimaria: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuarioJaTemLoja = await ctx.prisma.usuarioLoja.findFirst({
        where: { usuarioId: ctx.usuario.id },
      });
      if (usuarioJaTemLoja) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este usuário já possui uma loja." });
      }

      const slugEmUso = await ctx.prisma.loja.findUnique({ where: { slug: input.slug } });
      if (slugEmUso) {
        throw new TRPCError({ code: "CONFLICT", message: "Este endereço de loja já está em uso." });
      }

      return ctx.prisma.$transaction(async (tx) => {
        const loja = await tx.loja.create({
          data: {
            nome: input.nome,
            slug: input.slug,
            corPrimaria: input.corPrimaria,
            statusPlano: "TESTE",
          },
        });

        await tx.usuarioLoja.create({
          data: {
            usuarioId: ctx.usuario.id,
            lojaId: loja.id,
            papel: "ADMINISTRADOR",
          },
        });

        return loja;
      });
    }),
});
