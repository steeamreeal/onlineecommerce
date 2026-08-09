import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { PapelUsuario } from "@prisma/client";
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

// Ações sensíveis dentro de uma loja (pagamentos, domínio, cupons, exclusão
// de produtos etc.) exigem um papel mínimo — Estoquista/Separador/Vendedor
// não devem conseguir chamar essas mutations diretamente pela API, mesmo
// que a UI já esconda os botões para esses papéis.
export function roleProcedure(papeisPermitidos: PapelUsuario[]) {
  return storeProcedure.use(({ ctx, next }) => {
    if (!ctx.papel || !papeisPermitidos.includes(ctx.papel)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Você não tem permissão para realizar esta ação.",
      });
    }
    return next({ ctx: { ...ctx, papel: ctx.papel } });
  });
}

// Editor de tema/aparência do site (cores, banners, seções da home/produto,
// selos) — só o Dono edita por padrão. Administrador/Gerente só entram
// depois de pedir e o Dono aprovar (ver server/trpc/routers/aprovacoes.ts,
// tipo ACESSO_EDITAR_TEMA, e UsuarioLoja.podeEditarTema). Outras
// configurações da loja (identidade, domínio próprio) continuam em
// roleProcedure(["ADMINISTRADOR", "DONO"]) normal, sem pedir nada — essa
// trava é só pra aparência pública do site.
export const temaProcedure = storeProcedure.use(({ ctx, next }) => {
  const podeEditar = ctx.papel === "DONO" || (ctx.papel != null && ["ADMINISTRADOR", "GERENTE"].includes(ctx.papel) && ctx.podeEditarTema);
  if (!podeEditar) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Só o Dono pode editar o site. Peça acesso na tela de Aprovações.",
    });
  }
  return next({ ctx });
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
