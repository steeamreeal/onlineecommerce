import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.usuario) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, usuario: ctx.usuario } });
});

// Para o momento entre o signUp no Supabase e a criação do Usuario no Prisma
// (sincronizarUsuario) - exige sessão Supabase válida, mas não exige que o
// Usuario já exista, diferente de protectedProcedure.
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.supabaseUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, supabaseUser: ctx.supabaseUser } });
});

export const storeProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.lojaId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Nenhuma loja selecionada para esta requisição.",
    });
  }

  // Loja bloqueada pelo dono da plataforma (admin.bloquearLoja) perde acesso
  // ao próprio painel — mensagem clara, sem jargão técnico (CLAUDE.md).
  const loja = await ctx.prisma.loja.findUnique({
    where: { id: ctx.lojaId },
    select: { statusPlano: true },
  });
  if (loja?.statusPlano === "BLOQUEADO") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "O acesso a esta loja está temporariamente bloqueado. Fale com o suporte para regularizar.",
    });
  }

  return next({ ctx: { ...ctx, lojaId: ctx.lojaId } });
});

// Qualquer usuário da plataforma (papelAdmin preenchido), para o painel
// administrativo do SaaS (app/(admin)) — camada separada dos tenants.
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.usuario.papelAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito à equipe da plataforma." });
  }
  return next({ ctx: { ...ctx, usuario: { ...ctx.usuario, papelAdmin: ctx.usuario.papelAdmin } } });
});

// Ações sensíveis do admin (bloquear loja, gerenciar outros usuários da
// plataforma) — só SUPER_ADMIN, conforme PAPEL_ADMIN_DESCRICAO nas telas.
export const superAdminProcedure = adminProcedure.use(({ ctx, next }) => {
  if (ctx.usuario.papelAdmin !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o super admin pode realizar esta ação." });
  }
  return next({ ctx });
});
