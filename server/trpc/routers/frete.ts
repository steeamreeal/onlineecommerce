import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { router, storeProcedure } from "../trpc";
import { executarComAprovacao } from "../aprovacao";

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

export const freteCriarSchema = z.object(opcaoFreteInputBase);
export const freteAtualizarSchema = z.object({ id: z.string(), ...opcaoFreteInputBase });
export const freteAlternarAtivoSchema = z.object({ id: z.string() });
export const freteRemoverSchema = z.object({ id: z.string() });

type OpcaoFreteInput = {
  tipo: string;
  nome: string;
  valor?: number;
  freteGratisAcimaDe?: number;
  ativo: boolean;
};

export async function executarFreteCriar(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: OpcaoFreteInput,
) {
  return ctx.prisma.opcaoFrete.create({ data: { lojaId: ctx.lojaId, ...input } });
}

export async function executarFreteAtualizar(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: OpcaoFreteInput & { id: string },
) {
  const opcao = await ctx.prisma.opcaoFrete.findFirst({
    where: { id: input.id, lojaId: ctx.lojaId },
  });
  if (!opcao) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Opção de frete não encontrada." });
  }
  const { id, ...data } = input;
  return ctx.prisma.opcaoFrete.update({ where: { id }, data });
}

export async function executarFreteAlternarAtivo(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: { id: string },
) {
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
}

export async function executarFreteRemover(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: { id: string },
) {
  const opcao = await ctx.prisma.opcaoFrete.findFirst({
    where: { id: input.id, lojaId: ctx.lojaId },
  });
  if (!opcao) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Opção de frete não encontrada." });
  }
  return ctx.prisma.opcaoFrete.delete({ where: { id: input.id } });
}

export const freteRouter = router({
  listar: storeProcedure.query(({ ctx }) => {
    return ctx.prisma.opcaoFrete.findMany({
      where: { lojaId: ctx.lojaId },
      orderBy: { nome: "asc" },
    });
  }),

  criar: storeProcedure
    .input(freteCriarSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(ctx, "FRETE_CRIAR", `Nova opção de frete: ${input.nome}`, input, () =>
        executarFreteCriar(ctx, input),
      ),
    ),

  atualizar: storeProcedure
    .input(freteAtualizarSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(ctx, "FRETE_ATUALIZAR", `Editar opção de frete: ${input.nome}`, input, () =>
        executarFreteAtualizar(ctx, input),
      ),
    ),

  alternarAtivo: storeProcedure
    .input(freteAlternarAtivoSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(ctx, "FRETE_ALTERNAR_ATIVO", "Ativar/desativar opção de frete", input, () =>
        executarFreteAlternarAtivo(ctx, input),
      ),
    ),

  remover: storeProcedure
    .input(freteRemoverSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(ctx, "FRETE_REMOVER", "Remover opção de frete", input, () =>
        executarFreteRemover(ctx, input),
      ),
    ),
});
