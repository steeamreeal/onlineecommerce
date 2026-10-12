import { describe, expect, it, vi } from "vitest";
import type { PapelUsuario } from "@prisma/client";
import { pedidosRouter } from "../pedidos";
import { notificacoesRouter } from "../notificacoes";
import { aprovacoesRouter } from "../aprovacoes";

const LOJA = "loja-1";

function ctxDe(prisma: unknown, papel: PapelUsuario, usuarioId = "u-vendedor") {
  return { prisma, usuario: { id: usuarioId }, lojaId: LOJA, papel, supabaseUser: null } as never;
}
const lojaAtiva = { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) };
const pedidoBase = { id: "p1", lojaId: LOJA, cliente: { documento: null, enderecos: [] }, itens: [], cupom: null };

describe("pedidos: Vendedor só vê os pedidos que ele registrou", () => {
  it("listar filtra por criadoPorId para VENDEDOR", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { loja: lojaAtiva, pedido: { findMany } };
    await pedidosRouter.createCaller(ctxDe(prisma, "VENDEDOR")).listar();
    expect(findMany.mock.calls[0][0].where).toMatchObject({ lojaId: LOJA, criadoPorId: "u-vendedor" });
  });

  it.each<PapelUsuario>(["DONO", "ADMINISTRADOR", "GERENTE", "SEPARADOR"])(
    "listar NÃO filtra por autor para %s",
    async (papel) => {
      const findMany = vi.fn().mockResolvedValue([]);
      const prisma = { loja: lojaAtiva, pedido: { findMany } };
      await pedidosRouter.createCaller(ctxDe(prisma, papel)).listar();
      expect(findMany.mock.calls[0][0].where).not.toHaveProperty("criadoPorId");
    },
  );

  it("buscarPorId de pedido alheio/do site dá NOT_FOUND para o Vendedor", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = { loja: lojaAtiva, pedido: { findFirst } };
    await expect(
      pedidosRouter.createCaller(ctxDe(prisma, "VENDEDOR")).buscarPorId({ id: "p-do-site" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: "p-do-site", criadoPorId: "u-vendedor" });
  });

  it("atualizarStatus em pedido que não é dele: NOT_FOUND e nenhuma solicitação criada", async () => {
    const solicitacaoCreate = vi.fn();
    const prisma = {
      loja: lojaAtiva,
      pedido: { findFirst: vi.fn().mockResolvedValue(null) },
      solicitacao: { create: solicitacaoCreate },
    };
    await expect(
      pedidosRouter.createCaller(ctxDe(prisma, "VENDEDOR")).atualizarStatus({ id: "p-alheio", status: "PAGO" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(solicitacaoCreate).not.toHaveBeenCalled();
  });

  it("atualizarRastreio em pedido que não é dele: NOT_FOUND", async () => {
    const prisma = {
      loja: lojaAtiva,
      pedido: { findFirst: vi.fn().mockResolvedValue(null) },
      solicitacao: { create: vi.fn() },
    };
    await expect(
      pedidosRouter.createCaller(ctxDe(prisma, "VENDEDOR")).atualizarRastreio({ id: "p-alheio", codigoRastreio: "X" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("resumoMinhasVendas soma só os pedidos do próprio usuário (sem cancelados)", async () => {
    const aggregate = vi.fn().mockResolvedValue({ _count: 3, _sum: { valorTotal: 250.5 } });
    const prisma = { loja: lojaAtiva, pedido: { aggregate } };
    const r = await pedidosRouter.createCaller(ctxDe(prisma, "VENDEDOR")).resumoMinhasVendas();
    expect(r).toEqual({ quantidade: 3, valorTotal: 250.5 });
    expect(aggregate.mock.calls[0][0].where).toEqual({
      lojaId: LOJA,
      criadoPorId: "u-vendedor",
      status: { not: "CANCELADO" },
    });
  });
});

describe("pedido registrado por um Vendedor e aprovado pelo Dono continua sendo do Vendedor", () => {
  it("aprovar executa PEDIDO_CRIAR com usuarioId = solicitante", async () => {
    const executar = vi.fn();
    // tabelas mínimas para executarPedidoCriar rodar até o create
    const pedidoCreate = vi.fn().mockResolvedValue({ id: "novo", cliente: { nome: "Ana", email: null }, itens: [] });
    const prisma: Record<string, unknown> = {
      loja: {
        findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: LOJA, nome: "L" }),
      },
      solicitacao: {
        findFirst: vi.fn().mockResolvedValue({
          id: "s1",
          lojaId: LOJA,
          solicitanteId: "u-vendedor",
          tipo: "PEDIDO_CRIAR",
          status: "PENDENTE",
          payload: { clienteId: "c1", formaPagamento: "PIX", itens: [{ produtoId: "pr1", quantidade: 1 }], valorFrete: 0 },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ status: "APROVADA" }),
      },
      cliente: { findFirst: vi.fn().mockResolvedValue({ id: "c1", nome: "Ana", email: null }) },
      produto: {
        findMany: vi.fn().mockResolvedValue([{ id: "pr1", lojaId: LOJA, precoNormal: 10, precoPromo: null, categoriaId: null }]),
      },
      variacaoProduto: {
        findMany: vi.fn().mockResolvedValue([{ id: "v1", produtoId: "pr1" }]),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "v1", produtoId: "pr1", estoque: 50 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      movimentoEstoque: { create: vi.fn() },
      usuarioLoja: { findFirst: vi.fn().mockResolvedValue(null) },
      notificacao: { create: vi.fn() },
      pedido: { create: pedidoCreate },
    };
    prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
    void executar;

    await aprovacoesRouter.createCaller(ctxDe(prisma, "DONO", "u-dono")).aprovar({ id: "s1" });

    expect(pedidoCreate.mock.calls[0][0].data.criadoPorId).toBe("u-vendedor");
  });
});

describe("notificacoes: Vendedor não vê avisos de pedidos que não são dele", () => {
  it("filtra por estoque baixo + pedidos do próprio vendedor", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      loja: lojaAtiva,
      pedido: { findMany: vi.fn().mockResolvedValue([{ id: "meu-1" }]) },
      notificacao: { findMany },
    };
    await notificacoesRouter.createCaller(ctxDe(prisma, "VENDEDOR")).listar();
    expect(findMany.mock.calls[0][0].where).toEqual({
      lojaId: LOJA,
      OR: [{ tipo: "ESTOQUE_BAIXO" }, { pedidoId: { in: ["meu-1"] } }],
    });
  });

  it("DONO vê todas da loja", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { loja: lojaAtiva, notificacao: { findMany } };
    await notificacoesRouter.createCaller(ctxDe(prisma, "DONO", "u-dono")).listar();
    expect(findMany.mock.calls[0][0].where).toEqual({ lojaId: LOJA });
  });
});

void pedidoBase;
