import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authedProcedure } from "../trpc";

export const authRouter = router({
  // Chamado logo após o signUp no Supabase Auth ter sucesso, para espelhar o
  // usuário no Prisma (fonte de verdade para vínculos com Loja/UsuarioLoja).
  // Usa a identidade da sessão atual (ctx.supabaseUser), nunca um id vindo do
  // client, para que ninguém possa sincronizar um supabaseId que não é o seu.
  sincronizarUsuario: authedProcedure
    .input(z.object({ nome: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id: supabaseId, email } = ctx.supabaseUser;
      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sessão sem e-mail associado." });
      }

      const existente = await ctx.prisma.usuario.findUnique({
        where: { supabaseId },
      });
      if (existente) return existente;

      const emailEmUso = await ctx.prisma.usuario.findUnique({
        where: { email },
      });
      if (emailEmUso) {
        throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já está cadastrado." });
      }

      return ctx.prisma.usuario.create({
        data: {
          supabaseId,
          nome: input.nome,
          email,
        },
      });
    }),
});
