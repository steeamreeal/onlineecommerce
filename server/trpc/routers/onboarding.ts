import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { MENSAGEM_SLUG_RESERVADO, slugReservado } from "@/lib/slugs-reservados";
import { router, protectedProcedure } from "../trpc";
import { cookieLojaAtiva, ehSomenteMembroDeEquipe, MAX_LOJAS_POR_USUARIO } from "@/lib/loja-ativa";

export const onboardingRouter = router({
  criarLoja: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        slug: z
          .string()
          .min(2)
          .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen")
          .refine((slug) => !slugReservado(slug), MENSAGEM_SLUG_RESERVADO),
        corPrimaria: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const vinculos = await ctx.prisma.usuarioLoja.findMany({
        where: { usuarioId: ctx.usuario.id },
        select: { papel: true },
      });
      const papeis = vinculos.map((v) => v.papel);

      // Membro de equipe (convidado) não abre loja própria por esta conta.
      if (ehSomenteMembroDeEquipe(papeis)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Esta conta faz parte da equipe de uma loja e não pode abrir uma loja própria. Para ter a sua, use outro e-mail.",
        });
      }

      // Uma conta pode ter várias lojas, até um teto — sem ele, um único
      // cadastro criaria tenants sem limite.
      const lojasQueEuCriei = papeis.filter((p) => p === "DONO").length;
      if (lojasQueEuCriei >= MAX_LOJAS_POR_USUARIO) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Você já tem ${MAX_LOJAS_POR_USUARIO} lojas nesta conta. Fale com o suporte para abrir mais.`,
        });
      }

      const slugEmUso = await ctx.prisma.loja.findUnique({ where: { slug: input.slug } });
      if (slugEmUso) {
        throw new TRPCError({ code: "CONFLICT", message: "Este endereço de loja já está em uso." });
      }

      const novaLoja = await ctx.prisma.$transaction(async (tx) => {
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
            // Quem abre a própria loja é o dono dela.
            papel: "DONO",
          },
        });

        return loja;
      });

      // A loja recém-criada vira a ativa no painel.
      ctx.resHeaders.append(
        "Set-Cookie",
        cookieLojaAtiva(novaLoja.id, process.env.NODE_ENV === "production"),
      );
      return novaLoja;
    }),
});
