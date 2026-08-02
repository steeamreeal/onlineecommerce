import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { estoqueRouter } from "../estoque";

const resendSendMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/email/resend", () => ({
  resend: { emails: { send: resendSendMock } },
  emailConfigurado: true,
  REMETENTE_PADRAO: "Loja <teste@teste.com>",
}));

const LOJA_ID = "loja-1";
const PRODUTO = { id: "produto-1", nome: "Camiseta", lojaId: LOJA_ID };

function criarPrismaMock(variacao: {
  id: string;
  produtoId: string;
  estoque: number;
  cor: string | null;
  tamanho: string | null;
  modelo: string | null;
}, overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    variacaoProduto: {
      findFirst: vi.fn().mockResolvedValue(variacao),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn(),
    },
    movimentoEstoque: { create: vi.fn() },
    loja: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: LOJA_ID, nome: "Minha Loja" }) },
    produto: { findUniqueOrThrow: vi.fn().mockResolvedValue(PRODUTO) },
    usuarioLoja: {
      findFirst: vi.fn().mockResolvedValue({ usuario: { email: "dono@loja.com" } }),
    },
    notificacao: { create: vi.fn() },
    ...overrides,
  };
  mock.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(mock));
  return { mock: mock as Record<string, Record<string, ReturnType<typeof vi.fn>>>, client: mock as unknown as PrismaClient };
}

function criarCaller(client: PrismaClient) {
  const ctx = { prisma: client, usuario: { id: "u1" }, lojaId: LOJA_ID, supabaseUser: null } as never;
  return estoqueRouter.createCaller(ctx);
}

describe("estoqueRouter.registrarMovimento", () => {
  beforeEach(() => {
    resendSendMock.mockClear();
  });

  it("notifica estoque baixo em saída manual que cruza o limite (8 -> 3)", async () => {
    const variacaoAntes = { id: "v1", produtoId: PRODUTO.id, estoque: 8, cor: null, tamanho: null, modelo: null };
    const variacaoDepois = { ...variacaoAntes, estoque: 3 };
    const { mock, client } = criarPrismaMock(variacaoAntes, {
      variacaoProduto: {
        findFirst: vi.fn().mockResolvedValue(variacaoAntes),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(variacaoDepois),
      },
    });
    const caller = criarCaller(client);

    await caller.registrarMovimento({ variacaoId: "v1", tipo: "SAIDA", quantidade: 5 });

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(mock.notificacao.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "ESTOQUE_BAIXO" }) }),
    );
  });

  it("não notifica em ENTRADA de estoque", async () => {
    const variacaoAntes = { id: "v1", produtoId: PRODUTO.id, estoque: 2, cor: null, tamanho: null, modelo: null };
    const variacaoDepois = { ...variacaoAntes, estoque: 10 };
    const { mock, client } = criarPrismaMock(variacaoAntes, {
      variacaoProduto: {
        findFirst: vi.fn().mockResolvedValue(variacaoAntes),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(variacaoDepois),
      },
    });
    const caller = criarCaller(client);

    await caller.registrarMovimento({ variacaoId: "v1", tipo: "ENTRADA", quantidade: 8 });

    expect(resendSendMock).not.toHaveBeenCalled();
    expect(mock.notificacao.create).not.toHaveBeenCalled();
  });

  it("rejeita saída maior que o estoque disponível", async () => {
    const variacaoAntes = { id: "v1", produtoId: PRODUTO.id, estoque: 2, cor: null, tamanho: null, modelo: null };
    const { client } = criarPrismaMock(variacaoAntes, {
      variacaoProduto: {
        findFirst: vi.fn().mockResolvedValue(variacaoAntes),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn(),
      },
    });
    const caller = criarCaller(client);

    await expect(
      caller.registrarMovimento({ variacaoId: "v1", tipo: "SAIDA", quantidade: 5 }),
    ).rejects.toThrow("Quantidade de saída maior que o estoque disponível.");
  });
});
