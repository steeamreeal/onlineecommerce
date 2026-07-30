import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";

export const authRouter = router({
  // Chamado logo após o signUp no Supabase Auth ter sucesso, para espelhar o
  // usuário no Prisma (fonte de verdade para vínculos com Loja/UsuarioLoja).
  sincronizarUsuario: publicProcedure
    .input(
      z.object({
        supabaseId: z.string().min(1),
        nome: z.string().min(1),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existente = await ctx.prisma.usuario.findUnique({
        where: { supabaseId: input.supabaseId },
      });
      if (existente) return existente;

      const emailEmUso = await ctx.prisma.usuario.findUnique({
        where: { email: input.email },
      });
      if (emailEmUso) {
        throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já está cadastrado." });
      }

      return ctx.prisma.usuario.create({
        data: {
          supabaseId: input.supabaseId,
          nome: input.nome,
          email: input.email,
        },
      });
    }),
});
