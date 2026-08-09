import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient, TipoSolicitacao } from "@prisma/client";
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela heterogênea: cada entrada tem seu próprio tipo de input (garantido em runtime pelo `schema` correspondente), não dá pra tipar em comum sem apagar a variância dos handlers reais.
type ExecutorGenerico = (ctx: { prisma: PrismaClient; lojaId: string }, input: any) => Promise<unknown>;

const EXECUTORES: Record<
  TipoSolicitacao,
  {
    schema: z.ZodTypeAny;
    executar: ExecutorGenerico;
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
  // Nunca passa por aqui de fato — `aprovar` trata ACESSO_EDITAR_TEMA num
  // branch especial antes de consultar EXECUTORES, porque aprovar essa
  // solicitação não repete uma mutation, concede uma permissão
  // (UsuarioLoja.podeEditarTema). Entrada só existe pra satisfazer o
  // Record<TipoSolicitacao, ...> (TS exige todas as chaves do enum).
  ACESSO_EDITAR_TEMA: {
    schema: z.object({}),
    executar: async () => {
      throw new Error("ACESSO_EDITAR_TEMA não deveria chegar ao dispatch genérico.");
    },
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

      // Concede acesso em vez de reexecutar uma mutation — não passa pelo
      // dispatch genérico (payload não é "input de mutation", é só um pedido).
      if (solicitacao.tipo === "ACESSO_EDITAR_TEMA") {
        await ctx.prisma.usuarioLoja.updateMany({
          where: { usuarioId: solicitacao.solicitanteId, lojaId: ctx.lojaId },
          data: { podeEditarTema: true },
        });
        return ctx.prisma.solicitacao.update({
          where: { id: solicitacao.id },
          data: { status: "APROVADA", revisorId: ctx.usuario.id, revisadoEm: new Date() },
        });
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

  // Administrador/Gerente pedem acesso pra editar o tema/aparência do site
  // (Dono já pode direto, sem pedir nada — ver temaProcedure em trpc.ts).
  solicitarAcessoTema: roleProcedure(["ADMINISTRADOR", "GERENTE"])
    .mutation(async ({ ctx }) => {
      const jaTemAcesso = await ctx.prisma.usuarioLoja.findFirst({
        where: { usuarioId: ctx.usuario.id, lojaId: ctx.lojaId, podeEditarTema: true },
      });
      if (jaTemAcesso) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você já tem acesso para editar o site." });
      }
      const jaPendente = await ctx.prisma.solicitacao.findFirst({
        where: {
          lojaId: ctx.lojaId,
          solicitanteId: ctx.usuario.id,
          tipo: "ACESSO_EDITAR_TEMA",
          status: "PENDENTE",
        },
      });
      if (jaPendente) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você já tem um pedido de acesso pendente." });
      }
      return ctx.prisma.solicitacao.create({
        data: {
          lojaId: ctx.lojaId,
          solicitanteId: ctx.usuario.id,
          tipo: "ACESSO_EDITAR_TEMA",
          resumo: "Pedido de acesso para editar o tema/aparência do site",
          payload: {},
          status: "PENDENTE",
        },
      });
    }),

  // Só o Dono revoga — tirar o acesso de alguém não é uma decisão de quem
  // já tem esse mesmo acesso (Administrador/Gerente com podeEditarTema
  // continuam sem poder revogar uns dos outros).
  revogarAcessoTema: roleProcedure(["DONO"])
    .input(z.object({ usuarioId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resultado = await ctx.prisma.usuarioLoja.updateMany({
        where: { usuarioId: input.usuarioId, lojaId: ctx.lojaId },
        data: { podeEditarTema: false },
      });
      if (resultado.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado nesta loja." });
      }
      return { ok: true };
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
