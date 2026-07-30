import { z } from "zod";
import { router, storeProcedure } from "../trpc";
import { ESTOQUE_BAIXO_LIMITE } from "@/lib/estoque";

export const dashboardRouter = router({
  // Agrega faturamento, nº de pedidos e ticket médio (ignora CANCELADO,
  // igual à lógica de lib/mocks/dashboard.ts) em uma única query.
  kpis: storeProcedure.query(async ({ ctx }) => {
    const [agregadoPedidosValidos, pedidosPendentes, produtosEstoqueBaixo] = await Promise.all([
      ctx.prisma.pedido.aggregate({
        where: { lojaId: ctx.lojaId, status: { not: "CANCELADO" } },
        _sum: { valorTotal: true },
        _count: true,
      }),
      ctx.prisma.pedido.count({
        where: { lojaId: ctx.lojaId, status: { notIn: ["ENTREGUE", "CANCELADO"] } },
      }),
      ctx.prisma.produto.count({
        where: {
          lojaId: ctx.lojaId,
          variacoes: {
            some: {},
            every: { estoque: { lte: ESTOQUE_BAIXO_LIMITE } },
          },
        },
      }),
    ]);

    const faturamentoTotal = Number(agregadoPedidosValidos._sum.valorTotal ?? 0);
    const numeroPedidos = agregadoPedidosValidos._count;
    const ticketMedio = numeroPedidos > 0 ? faturamentoTotal / numeroPedidos : 0;

    return { faturamentoTotal, numeroPedidos, ticketMedio, pedidosPendentes, produtosEstoqueBaixo };
  }),

  produtosMaisVendidos: storeProcedure
    .input(z.object({ limite: z.number().int().positive().default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const limite = input?.limite ?? 5;
      const itens = await ctx.prisma.itemPedido.groupBy({
        by: ["produtoId"],
        where: { pedido: { lojaId: ctx.lojaId, status: { not: "CANCELADO" } } },
        _sum: { quantidade: true },
        orderBy: { _sum: { quantidade: "desc" } },
        take: limite,
      });

      const produtos = await ctx.prisma.produto.findMany({
        where: { id: { in: itens.map((i) => i.produtoId) } },
        select: { id: true, nome: true },
      });
      const nomesPorId = new Map(produtos.map((p) => [p.id, p.nome]));

      return itens.map((item) => ({
        nome: nomesPorId.get(item.produtoId) ?? "Produto removido",
        quantidade: item._sum.quantidade ?? 0,
      }));
    }),

  clientesQueMaisCompram: storeProcedure
    .input(z.object({ limite: z.number().int().positive().default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const limite = input?.limite ?? 5;
      const agrupado = await ctx.prisma.pedido.groupBy({
        by: ["clienteId"],
        where: { lojaId: ctx.lojaId, status: { not: "CANCELADO" } },
        _sum: { valorTotal: true },
        orderBy: { _sum: { valorTotal: "desc" } },
        take: limite,
      });

      const clientes = await ctx.prisma.cliente.findMany({
        where: { id: { in: agrupado.map((a) => a.clienteId) } },
        select: { id: true, nome: true },
      });
      const nomesPorId = new Map(clientes.map((c) => [c.id, c.nome]));

      return agrupado
        .map((item) => ({
          id: item.clienteId,
          nome: nomesPorId.get(item.clienteId) ?? "Cliente removido",
          totalGasto: Number(item._sum.valorTotal ?? 0),
        }))
        .filter((c) => c.totalGasto > 0);
    }),

  vendasPorDia: storeProcedure
    .input(z.object({ dias: z.number().int().positive().default(14) }).optional())
    .query(async ({ ctx, input }) => {
      const dias = input?.dias ?? 14;
      const hoje = new Date();
      hoje.setUTCHours(0, 0, 0, 0);
      const inicio = new Date(hoje);
      inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));

      const pedidos = await ctx.prisma.pedido.findMany({
        where: {
          lojaId: ctx.lojaId,
          status: { not: "CANCELADO" },
          createdAt: { gte: inicio },
        },
        select: { valorTotal: true, createdAt: true },
      });

      const porData = new Map<string, number>();
      for (let i = dias - 1; i >= 0; i--) {
        const data = new Date(hoje);
        data.setUTCDate(data.getUTCDate() - i);
        porData.set(data.toISOString().slice(0, 10), 0);
      }
      for (const pedido of pedidos) {
        const chave = pedido.createdAt.toISOString().slice(0, 10);
        if (porData.has(chave)) {
          porData.set(chave, (porData.get(chave) ?? 0) + Number(pedido.valorTotal));
        }
      }

      return [...porData.entries()].map(([data, valor]) => ({ data, valor }));
    }),
});
