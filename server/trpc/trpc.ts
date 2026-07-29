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

export const storeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.lojaId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Nenhuma loja selecionada para esta requisição.",
    });
  }
  return next({ ctx: { ...ctx, lojaId: ctx.lojaId } });
});
