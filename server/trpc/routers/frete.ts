import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure } from "../trpc";

const tipoFreteSchema = z.enum([
  "RETIRADA",
  "ENTREGA_PROPRIA",
  "FIXO",
  "FAIXA_BAIRRO",
  "FAIXA_CIDADE",
  "CORREIOS",
]);

const opcaoFreteInputBase = {
  tipo: tipoFreteSchema,
  nome: z.string().min(1),
  valor: z.number().min(0).optional(),
  freteGratisAcimaDe: z.number().positive().optional(),
  ativo: z.boolean().default(true),
};

export const freteRouter = router({
  listar: storeProcedure.query(({ ctx }) => {
    return ctx.prisma.opcaoFrete.findMany({
      where: { lojaId: ctx.lojaId },
      orderBy: { nome: "asc" },
    });
  }),

  criar: storeProcedure
    .input(z.object(opcaoFreteInputBase))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.opcaoFrete.create({
        data: { lojaId: ctx.lojaId, ...input },
      });
    }),

  atualizar: storeProcedure
    .input(z.object({ id: z.string(), ...opcaoFreteInputBase }))
    .mutation(async ({ ctx, input }) => {
      const opcao = await ctx.prisma.opcaoFrete.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!opcao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Opção de frete não encontrada." });
      }
      const { id, ...data } = input;
      return ctx.prisma.opcaoFrete.update({ where: { id }, data });
    }),

  alternarAtivo: storeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const opcao = await ctx.prisma.opcaoFrete.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!opcao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Opção de frete não encontrada." });
      }
      return ctx.prisma.opcaoFrete.update({
        where: { id: input.id },
        data: { ativo: !opcao.ativo },
      });
    }),

  remover: storeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const opcao = await ctx.prisma.opcaoFrete.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!opcao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Opção de frete não encontrada." });
      }
      return ctx.prisma.opcaoFrete.delete({ where: { id: input.id } });
    }),
});
