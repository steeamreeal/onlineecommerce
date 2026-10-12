import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/email/notificacoes", () => ({ notificarStatusAtualizado: vi.fn() }));

import { expirarPedidosNaoPagos } from "../pedidos-expiracao";
import { notificarStatusAtualizado } from "@/lib/email/notificacoes";

const AGORA = new Date("2026-10-12T12:00:00Z");

function pedidoVencido(overrides: Record<string, unknown> = {}) {
  return {
    id: "pedido-1",
    cupomId: "cupom-1",
    itens: [{ variacaoId: "var-1", quantidade: 2 }, { variacaoId: null, quantidade: 1 }],
    cliente: { nome: "Ana", email: "ana@x.com" },
    loja: { id: "loja-1", nome: "Loja" },
    ...overrides,
  };
}

function criarPrisma(vencidos: unknown[], claimCount = 1) {
  const tx = {
    pedido: { updateMany: vi.fn().mockResolvedValue({ count: claimCount }) },
    variacaoProduto: { update: vi.fn() },
    movimentoEstoque: { create: vi.fn() },
    cupom: { updateMany: vi.fn() },
    notificacao: { create: vi.fn() },
  };
  const prisma = {
    pedido: { findMany: vi.fn().mockResolvedValue(vencidos) },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  return { prisma: prisma as unknown as PrismaClient, tx, findMany: prisma.pedido.findMany };
}

describe("expirarPedidosNaoPagos", () => {
  it("busca só AGUARDANDO_PAGAMENTO vencido (boleto 72h, demais 24h)", async () => {
    const { prisma, findMany } = criarPrisma([]);
    await expirarPedidosNaoPagos(prisma, AGORA);

    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe("AGUARDANDO_PAGAMENTO");
    expect(where.OR[0]).toEqual({
      formaPagamento: "BOLETO",
      createdAt: { lt: new Date("2026-10-09T12:00:00Z") },
    });
    expect(where.OR[1]).toEqual({
      formaPagamento: { not: "BOLETO" },
      createdAt: { lt: new Date("2026-10-11T12:00:00Z") },
    });
  });

  it("cancela, devolve estoque, estorna cupom e avisa o cliente", async () => {
    const { prisma, tx } = criarPrisma([pedidoVencido()]);
    const r = await expirarPedidosNaoPagos(prisma, AGORA);

    expect(r).toEqual({ analisados: 1, expirados: 1 });
    expect(tx.pedido.updateMany).toHaveBeenCalledWith({
      where: { id: "pedido-1", status: "AGUARDANDO_PAGAMENTO" },
      data: { status: "CANCELADO" },
    });
    expect(tx.variacaoProduto.update).toHaveBeenCalledWith({
      where: { id: "var-1" },
      data: { estoque: { increment: 2 } },
    });
    expect(tx.cupom.updateMany).toHaveBeenCalledWith({
      where: { id: "cupom-1", usosAtuais: { gt: 0 } },
      data: { usosAtuais: { decrement: 1 } },
    });
    expect(notificarStatusAtualizado).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pedidoId: "pedido-1", status: "CANCELADO" }),
    );
  });

  it("se o pagamento chegou antes (claim falha), não devolve estoque nem notifica", async () => {
    vi.mocked(notificarStatusAtualizado).mockClear();
    const { prisma, tx } = criarPrisma([pedidoVencido()], 0);
    const r = await expirarPedidosNaoPagos(prisma, AGORA);

    expect(r).toEqual({ analisados: 1, expirados: 0 });
    expect(tx.variacaoProduto.update).not.toHaveBeenCalled();
    expect(notificarStatusAtualizado).not.toHaveBeenCalled();
  });
});
