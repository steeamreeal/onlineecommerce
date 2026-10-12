import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { cookieLojaAtiva, podeCriarLoja } from "@/lib/loja-ativa";

export const minhasLojasRouter = router({
  // Lojas em que o usuário logado tem vínculo, para o seletor do painel.
  listar: protectedProcedure.query(async ({ ctx }) => {
    const vinculos = await ctx.prisma.usuarioLoja.findMany({
      where: { usuarioId: ctx.usuario.id },
      include: { loja: { select: { id: true, nome: true, slug: true, statusPlano: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return {
      ativaId: ctx.lojaId,
      // A UI só mostra "Criar nova loja" para quem pode (o servidor
      // reconfere em onboarding.criarLoja — isto é só conveniência).
      podeCriarLoja: podeCriarLoja(vinculos.map((v) => v.papel)),
      lojas: vinculos.map((v) => ({
        id: v.loja.id,
        nome: v.loja.nome,
        slug: v.loja.slug,
        statusPlano: v.loja.statusPlano,
        papel: v.papel,
      })),
    };
  }),

  // Troca a loja ativa. Só aceita lojas em que o próprio usuário tem vínculo
  // — o id vem do client, então é validado contra UsuarioLoja antes de
  // gravar o cookie.
  selecionar: protectedProcedure
    .input(z.object({ lojaId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const vinculo = await ctx.prisma.usuarioLoja.findFirst({
        where: { usuarioId: ctx.usuario.id, lojaId: input.lojaId },
        select: { id: true },
      });
      if (!vinculo) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta loja." });
      }

      ctx.resHeaders.append(
        "Set-Cookie",
        cookieLojaAtiva(input.lojaId, process.env.NODE_ENV === "production"),
      );
      return { lojaId: input.lojaId };
    }),
});
