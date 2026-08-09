import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { TipoSolicitacao } from "@prisma/client";
import { router, storeProcedure, roleProcedure } from "../trpc";
import {
  clienteCriarSchema,
  clienteAtualizarSchema,
  clienteRemoverSchema,
  executarClienteCriar,
  executarClienteAtualizar,
  executarClienteRemover,
} from "./clientes";
import {
  freteCriarSchema,
  freteAtualizarSchema,
  freteAlternarAtivoSchema,
  freteRemoverSchema,
  executarFreteCriar,
  executarFreteAtualizar,
  executarFreteAlternarAtivo,
  executarFreteRemover,
} from "./frete";
import {
  estoqueMovimentoSchema,
  estoqueImportarSchema,
  executarRegistrarMovimento,
  executarImportarEstoque,
} from "./estoque";
import {
  produtoCriarSchema,
  produtoAtualizarSchema,
  executarProdutoCriar,
  executarProdutoAtualizar,
} from "./produtos";
import {
  pedidoCriarSchema,
  pedidoAtualizarStatusSchema,
  pedidoAtualizarRastreioSchema,
  executarPedidoCriar,
  executarPedidoAtualizarStatus,
  executarPedidoAtualizarRastreio,
} from "./pedidos";

// Só Dono e Gerente aprovam/rejeitam — os mesmos papéis que agem direto sem
// passar por solicitação (server/trpc/aprovacao.ts).
const aprovadorProcedure = roleProcedure(["DONO", "GERENTE"]);

// Cada TipoSolicitacao mapeia para o par (schema Zod, função executar) do
// router de origem — a aprovação reparse o payload salvo com o mesmo schema
// da mutation original antes de reexecutar, e a execução real checa de novo
// as regras de negócio (estoque, status do pedido etc.), já que o estado
// pode ter mudado entre pedir e aprovar.
const EXECUTORES: Record<
  TipoSolicitacao,
  {
    schema: z.ZodTypeAny;
    executar: (ctx: { prisma: any; lojaId: string }, input: any) => Promise<unknown>;
  }
> = {
  CLIENTE_CRIAR: { schema: clienteCriarSchema, executar: executarClienteCriar },
  CLIENTE_ATUALIZAR: { schema: clienteAtualizarSchema, executar: executarClienteAtualizar },
  CLIENTE_REMOVER: { schema: clienteRemoverSchema, executar: executarClienteRemover },
  FRETE_CRIAR: { schema: freteCriarSchema, executar: executarFreteCriar },
  FRETE_ATUALIZAR: { schema: freteAtualizarSchema, executar: executarFreteAtualizar },
  FRETE_ALTERNAR_ATIVO: { schema: freteAlternarAtivoSchema, executar: executarFreteAlternarAtivo },
  FRETE_REMOVER: { schema: freteRemoverSchema, executar: executarFreteRemover },
  ESTOQUE_MOVIMENTO: { schema: estoqueMovimentoSchema, executar: executarRegistrarMovimento },
  ESTOQUE_IMPORTAR: { schema: estoqueImportarSchema, executar: executarImportarEstoque },
  PRODUTO_CRIAR: { schema: produtoCriarSchema, executar: executarProdutoCriar },
  PRODUTO_ATUALIZAR: { schema: produtoAtualizarSchema, executar: executarProdutoAtualizar },
  PEDIDO_CRIAR: { schema: pedidoCriarSchema, executar: executarPedidoCriar },
  PEDIDO_ATUALIZAR_STATUS: { schema: pedidoAtualizarStatusSchema, executar: executarPedidoAtualizarStatus },
  PEDIDO_ATUALIZAR_RASTREIO: {
    schema: pedidoAtualizarRastreioSchema,
    executar: executarPedidoAtualizarRastreio,
  },
};

export const aprovacoesRouter = router({
  // Fila de pendentes, para Dono/Gerente revisarem.
  listarPendentes: aprovadorProcedure.query(({ ctx }) => {
    return ctx.prisma.solicitacao.findMany({
      where: { lojaId: ctx.lojaId, status: "PENDENTE" },
      include: { solicitante: { select: { nome: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
  }),

  // Cada usuário acompanha o andamento do que ele mesmo pediu.
  minhasSolicitacoes: storeProcedure
    .input(z.object({ limite: z.number().int().positive().max(200).default(50) }).optional())
    .query(({ ctx, input }) => {
      return ctx.prisma.solicitacao.findMany({
        where: { lojaId: ctx.lojaId, solicitanteId: ctx.usuario.id },
        include: { revisor: { select: { nome: true } } },
        orderBy: { createdAt: "desc" },
        take: input?.limite ?? 50,
      });
    }),

  aprovar: aprovadorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const solicitacao = await ctx.prisma.solicitacao.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!solicitacao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada." });
      }
      if (solicitacao.status !== "PENDENTE") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta solicitação já foi revisada." });
      }

      const executor = EXECUTORES[solicitacao.tipo];
      const payload = executor.schema.parse(solicitacao.payload);

      try {
        await executor.executar({ prisma: ctx.prisma, lojaId: ctx.lojaId }, payload);
      } catch (erro) {
        // O estado pode ter mudado entre o pedido e a aprovação (ex: estoque
        // ficou insuficiente) — a solicitação é marcada como rejeitada
        // automaticamente, com o motivo, em vez de ficar pendente para sempre.
        const mensagem = erro instanceof TRPCError ? erro.message : "Erro ao aplicar a solicitação.";
        await ctx.prisma.solicitacao.update({
          where: { id: solicitacao.id },
          data: {
            status: "REJEITADA",
            erro: mensagem,
            revisorId: ctx.usuario.id,
            revisadoEm: new Date(),
          },
        });
        throw new TRPCError({ code: "BAD_REQUEST", message: mensagem });
      }

      return ctx.prisma.solicitacao.update({
        where: { id: solicitacao.id },
        data: { status: "APROVADA", revisorId: ctx.usuario.id, revisadoEm: new Date() },
      });
    }),

  rejeitar: aprovadorProcedure
    .input(z.object({ id: z.string(), motivo: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const solicitacao = await ctx.prisma.solicitacao.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!solicitacao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada." });
      }
      if (solicitacao.status !== "PENDENTE") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta solicitação já foi revisada." });
      }
      return ctx.prisma.solicitacao.update({
        where: { id: solicitacao.id },
        data: {
          status: "REJEITADA",
          erro: input.motivo,
          revisorId: ctx.usuario.id,
          revisadoEm: new Date(),
        },
      });
    }),
});
