import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { router, storeProcedure } from "../trpc";

const statusPedidoSchema = z.enum([
  "NOVO",
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EM_PREPARACAO",
  "ENVIADO",
  "PRONTO_RETIRADA",
  "ENTREGUE",
  "CANCELADO",
]);

// Mesma ordem de lib/mocks/pedidos.ts (STATUS_PEDIDO_ORDEM) — o kanban só
// permite avançar para o próximo da lista, nunca pular etapas ou voltar.
const ORDEM_STATUS = [
  "NOVO",
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EM_PREPARACAO",
  "ENVIADO",
  "PRONTO_RETIRADA",
  "ENTREGUE",
] as const;

function proximoStatusValido(atual: z.infer<typeof statusPedidoSchema>) {
  if (atual === "CANCELADO") return undefined;
  const indice = ORDEM_STATUS.indexOf(atual as (typeof ORDEM_STATUS)[number]);
  return ORDEM_STATUS[indice + 1];
}

const formaPagamentoSchema = z.enum([
  "PIX",
  "CARTAO",
  "BOLETO",
  "LINK_PAGAMENTO",
  "PAGAMENTO_ENTREGA",
]);

const itemPedidoInputSchema = z.object({
  produtoId: z.string(),
  variacaoId: z.string().optional(),
  quantidade: z.number().int().positive(),
});

// Decrementa o estoque das variações do pedido de forma atômica, com a
// mesma técnica de update condicionado de estoque.ts (updateMany com
// gte no where) para não haver TOCTOU entre checar saldo e decrementar.
// Lança BAD_REQUEST se qualquer item não tiver saldo suficiente.
async function baixarEstoqueItens(
  tx: Prisma.TransactionClient,
  itens: { variacaoId?: string; quantidade: number }[],
) {
  for (const item of itens) {
    if (!item.variacaoId) continue;
    const resultado = await tx.variacaoProduto.updateMany({
      where: { id: item.variacaoId, estoque: { gte: item.quantidade } },
      data: { estoque: { decrement: item.quantidade } },
    });
    if (resultado.count === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Estoque insuficiente para um dos itens do pedido.",
      });
    }
    await tx.movimentoEstoque.create({
      data: {
        variacaoId: item.variacaoId,
        quantidade: item.quantidade,
        tipo: "SAIDA",
        motivo: "Venda (pedido)",
      },
    });
  }
}

async function devolverEstoqueItens(
  tx: Prisma.TransactionClient,
  itens: { variacaoId: string | null; quantidade: number }[],
) {
  for (const item of itens) {
    if (!item.variacaoId) continue;
    await tx.variacaoProduto.update({
      where: { id: item.variacaoId },
      data: { estoque: { increment: item.quantidade } },
    });
    await tx.movimentoEstoque.create({
      data: {
        variacaoId: item.variacaoId,
        quantidade: item.quantidade,
        tipo: "ENTRADA",
        motivo: "Cancelamento de pedido",
      },
    });
  }
}

async function calcularValorItens(
  prisma: PrismaClient,
  lojaId: string,
  itens: z.infer<typeof itemPedidoInputSchema>[],
) {
  const produtoIds = [...new Set(itens.map((i) => i.produtoId))];
  const produtos = await prisma.produto.findMany({
    where: { id: { in: produtoIds }, lojaId },
  });
  const produtosPorId = new Map(produtos.map((p) => [p.id, p]));

  if (produtosPorId.size !== produtoIds.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Um ou mais produtos são inválidos." });
  }

  return itens.map((item) => {
    const produto = produtosPorId.get(item.produtoId)!;
    const precoUnit = produto.precoPromo ?? produto.precoNormal;
    return { ...item, precoUnit: Number(precoUnit) };
  });
}

export const pedidosRouter = router({
  listar: storeProcedure
    .input(z.object({ status: statusPedidoSchema.optional(), busca: z.string().optional() }).optional())
    .query(({ ctx, input }) => {
      const termo = input?.busca?.trim();
      return ctx.prisma.pedido.findMany({
        where: {
          lojaId: ctx.lojaId,
          status: input?.status,
          ...(termo
            ? {
                OR: [
                  { id: { contains: termo, mode: "insensitive" } },
                  { cliente: { nome: { contains: termo, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: { cliente: true, itens: true, cupom: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  buscarPorId: storeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const pedido = await ctx.prisma.pedido.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        include: {
          cliente: { include: { enderecos: true } },
          itens: { include: { produto: true, variacao: true } },
          cupom: true,
        },
      });
      if (!pedido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
      }
      return pedido;
    }),

  criar: storeProcedure
    .input(
      z.object({
        clienteId: z.string(),
        formaPagamento: formaPagamentoSchema,
        itens: z.array(itemPedidoInputSchema).min(1),
        valorFrete: z.number().min(0).default(0),
        cupomCodigo: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cliente = await ctx.prisma.cliente.findFirst({
        where: { id: input.clienteId, lojaId: ctx.lojaId },
      });
      if (!cliente) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cliente inválido." });
      }

      const itensComPreco = await calcularValorItens(ctx.prisma, ctx.lojaId, input.itens);
      const valorProdutos = itensComPreco.reduce((s, i) => s + i.precoUnit * i.quantidade, 0);

      let cupomId: string | undefined;
      let valorDesconto = 0;
      let valorFrete = input.valorFrete;

      if (input.cupomCodigo) {
        const cupom = await ctx.prisma.cupom.findFirst({
          where: { lojaId: ctx.lojaId, codigo: input.cupomCodigo.toUpperCase() },
        });
        const agora = new Date();
        if (
          !cupom ||
          agora < cupom.inicio ||
          agora > cupom.fim ||
          (cupom.limiteUso != null && cupom.usosAtuais >= cupom.limiteUso)
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cupom inválido ou expirado." });
        }
        cupomId = cupom.id;
        if (cupom.tipo === "PERCENTUAL") {
          valorDesconto = (valorProdutos * Number(cupom.valor ?? 0)) / 100;
        } else if (cupom.tipo === "VALOR_FIXO") {
          valorDesconto = Math.min(Number(cupom.valor ?? 0), valorProdutos);
        } else if (cupom.tipo === "FRETE_GRATIS") {
          valorDesconto = valorFrete;
          valorFrete = 0;
        }
      }

      const valorTotal = valorProdutos + valorFrete - valorDesconto;

      return ctx.prisma.$transaction(async (tx) => {
        await baixarEstoqueItens(tx, input.itens);

        if (cupomId) {
          await tx.cupom.update({ where: { id: cupomId }, data: { usosAtuais: { increment: 1 } } });
        }

        return tx.pedido.create({
          data: {
            lojaId: ctx.lojaId,
            clienteId: input.clienteId,
            formaPagamento: input.formaPagamento,
            valorFrete,
            valorDesconto,
            valorTotal,
            cupomId,
            itens: {
              create: itensComPreco.map((item) => ({
                produtoId: item.produtoId,
                variacaoId: item.variacaoId,
                quantidade: item.quantidade,
                precoUnit: item.precoUnit,
              })),
            },
          },
          include: { itens: true, cliente: true, cupom: true },
        });
      });
    }),

  // Avança o pedido para o próximo status da esteira (kanban) ou para
  // CANCELADO — nunca aceita pular etapas nem voltar, replicando a regra de
  // proximoStatus() do mock. Cancelar devolve o estoque baixado na criação.
  atualizarStatus: storeProcedure
    .input(z.object({ id: z.string(), status: statusPedidoSchema }))
    .mutation(async ({ ctx, input }) => {
      const pedido = await ctx.prisma.pedido.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        include: { itens: true },
      });
      if (!pedido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
      }
      if (pedido.status === "CANCELADO" || pedido.status === "ENTREGUE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este pedido não pode mais mudar de status.",
        });
      }

      const ehCancelamento = input.status === "CANCELADO";
      if (!ehCancelamento && input.status !== proximoStatusValido(pedido.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Transição de status inválida — siga a ordem do fluxo do pedido.",
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        if (ehCancelamento) {
          await devolverEstoqueItens(tx, pedido.itens);
          if (pedido.cupomId) {
            await tx.cupom.update({
              where: { id: pedido.cupomId },
              data: { usosAtuais: { decrement: 1 } },
            });
          }
        }

        return tx.pedido.update({
          where: { id: input.id },
          data: { status: input.status },
          include: { itens: true, cliente: true, cupom: true },
        });
      });
    }),

  atualizarRastreio: storeProcedure
    .input(z.object({ id: z.string(), codigoRastreio: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const pedido = await ctx.prisma.pedido.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!pedido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
      }
      return ctx.prisma.pedido.update({
        where: { id: input.id },
        data: { codigoRastreio: input.codigoRastreio },
      });
    }),
});
