import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { router, storeProcedure } from "../trpc";
import { ESTOQUE_BAIXO_LIMITE, variacaoLabel } from "@/lib/estoque";
import {
  buscarEmailAdministradorLoja,
  notificarEstoqueBaixo,
  notificarPedidoConfirmado,
  notificarStatusAtualizado,
} from "@/lib/email/notificacoes";
import { executarComAprovacao } from "../aprovacao";

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

export const formaPagamentoSchema = z.enum([
  "PIX",
  "CARTAO",
  "BOLETO",
  "LINK_PAGAMENTO",
  "PAGAMENTO_ENTREGA",
]);

export const itemPedidoInputSchema = z.object({
  produtoId: z.string(),
  variacaoId: z.string().optional(),
  quantidade: z.number().int().positive(),
});

// Decrementa o estoque das variações do pedido de forma atômica, com a
// mesma técnica de update condicionado de estoque.ts (updateMany com
// gte no where) para não haver TOCTOU entre checar saldo e decrementar.
// Lança BAD_REQUEST se qualquer item não tiver saldo suficiente.
// Exportada para reuso pelo checkout público (checkout.ts).
export async function baixarEstoqueItens(
  tx: Prisma.TransactionClient,
  itens: { variacaoId?: string; quantidade: number }[],
  loja: { id: string; nome: string },
) {
  for (const item of itens) {
    if (!item.variacaoId) continue;
    const antes = await tx.variacaoProduto.findUniqueOrThrow({ where: { id: item.variacaoId } });
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

    // Só notifica no momento em que o estoque cruza o limite (antes estava
    // acima, agora está em ou abaixo) — evita notificar de novo a cada venda
    // enquanto o estoque já está baixo.
    const depois = antes.estoque - item.quantidade;
    if (antes.estoque > ESTOQUE_BAIXO_LIMITE && depois <= ESTOQUE_BAIXO_LIMITE) {
      const produto = await tx.produto.findUniqueOrThrow({ where: { id: antes.produtoId } });
      const emailAdmin = await buscarEmailAdministradorLoja(tx, loja.id);
      await notificarEstoqueBaixo(tx, {
        lojaId: loja.id,
        lojaNome: loja.nome,
        lojistaEmail: emailAdmin,
        produtoNome: produto.nome,
        variacaoLabel: variacaoLabel(antes),
        estoqueAtual: depois,
      });
    }
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

// Exportada para reuso pelo checkout público (checkout.ts).
export async function calcularValorItens(
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

export const pedidoCriarSchema = z.object({
  clienteId: z.string(),
  formaPagamento: formaPagamentoSchema,
  itens: z.array(itemPedidoInputSchema).min(1),
  valorFrete: z.number().min(0).default(0),
  cupomCodigo: z.string().optional(),
});
type PedidoCriarInput = z.infer<typeof pedidoCriarSchema>;

export const pedidoAtualizarStatusSchema = z.object({ id: z.string(), status: statusPedidoSchema });
type PedidoAtualizarStatusInput = z.infer<typeof pedidoAtualizarStatusSchema>;

export const pedidoAtualizarRastreioSchema = z.object({ id: z.string(), codigoRastreio: z.string().min(1) });
type PedidoAtualizarRastreioInput = z.infer<typeof pedidoAtualizarRastreioSchema>;

export async function executarPedidoCriar(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: PedidoCriarInput,
) {
  const cliente = await ctx.prisma.cliente.findFirst({
    where: { id: input.clienteId, lojaId: ctx.lojaId },
  });
  if (!cliente) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cliente inválido." });
  }
  const loja = await ctx.prisma.loja.findUniqueOrThrow({ where: { id: ctx.lojaId } });

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
    await baixarEstoqueItens(tx, input.itens, loja);

    if (cupomId) {
      await tx.cupom.update({ where: { id: cupomId }, data: { usosAtuais: { increment: 1 } } });
    }

    const pedido = await tx.pedido.create({
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

    await notificarPedidoConfirmado(tx, {
      lojaId: loja.id,
      lojaNome: loja.nome,
      clienteNome: cliente.nome,
      clienteEmail: cliente.email,
      pedidoId: pedido.id,
      valorTotal,
    });

    return pedido;
  });
}

export async function executarPedidoAtualizarStatus(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: PedidoAtualizarStatusInput,
) {
  const pedido = await ctx.prisma.pedido.findFirst({
    where: { id: input.id, lojaId: ctx.lojaId },
    include: { itens: true, cliente: true },
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

  const loja = await ctx.prisma.loja.findUniqueOrThrow({ where: { id: ctx.lojaId } });

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

    const pedidoAtualizado = await tx.pedido.update({
      where: { id: input.id },
      data: { status: input.status },
      include: { itens: true, cliente: true, cupom: true },
    });

    await notificarStatusAtualizado(tx, {
      lojaId: loja.id,
      lojaNome: loja.nome,
      clienteNome: pedido.cliente.nome,
      clienteEmail: pedido.cliente.email,
      pedidoId: pedido.id,
      status: input.status,
    });

    return pedidoAtualizado;
  });
}

export async function executarPedidoAtualizarRastreio(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: PedidoAtualizarRastreioInput,
) {
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
    .input(pedidoCriarSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(ctx, "PEDIDO_CRIAR", "Novo pedido (venda manual)", input, () =>
        executarPedidoCriar(ctx, input),
      ),
    ),

  // Avança o pedido para o próximo status da esteira (kanban) ou para
  // CANCELADO — nunca aceita pular etapas nem voltar, replicando a regra de
  // proximoStatus() do mock. Cancelar devolve o estoque baixado na criação.
  atualizarStatus: storeProcedure
    .input(pedidoAtualizarStatusSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(
        ctx,
        "PEDIDO_ATUALIZAR_STATUS",
        `Atualizar status do pedido para ${input.status}`,
        input,
        () => executarPedidoAtualizarStatus(ctx, input),
      ),
    ),

  atualizarRastreio: storeProcedure
    .input(pedidoAtualizarRastreioSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(
        ctx,
        "PEDIDO_ATUALIZAR_RASTREIO",
        "Atualizar código de rastreio do pedido",
        input,
        () => executarPedidoAtualizarRastreio(ctx, input),
      ),
    ),
});
