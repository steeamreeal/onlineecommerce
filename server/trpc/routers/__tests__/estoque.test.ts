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
    loja: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: LOJA_ID, nome: "Minha Loja" }),
      findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }),
    },
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

describe("estoqueRouter.importar", () => {
  function criarPrismaMockImportar(variacoes: Array<{
    id: string;
    estoque: number;
    cor: string | null;
    tamanho: string | null;
    modelo: string | null;
    produto: { nome: string };
  }>) {
    const update = vi.fn();
    const create = vi.fn();
    const mock: Record<string, unknown> = {
      variacaoProduto: {
        findMany: vi.fn().mockResolvedValue(variacoes),
        update,
      },
      movimentoEstoque: { create },
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) },
    };
    mock.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(mock));
    return { update, create, client: mock as unknown as PrismaClient };
  }

  const variacaoCamiseta = {
    id: "v1",
    estoque: 10,
    cor: "Azul",
    tamanho: "M",
    modelo: null,
    produto: { nome: "Camiseta" },
  };

  it("atualiza o saldo por nome do produto + variação (case-insensitive) e registra o movimento", async () => {
    const { update, create, client } = criarPrismaMockImportar([variacaoCamiseta]);
    const caller = criarCaller(client);

    const resultado = await caller.importar({
      linhas: [{ produto: "camiseta", cor: "azul", tamanho: "m", quantidade: 25 }],
    });

    expect(update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { estoque: 25 } });
    expect(create).toHaveBeenCalledWith({
      data: { variacaoId: "v1", quantidade: 15, tipo: "ENTRADA", motivo: "Importação de planilha" },
    });
    expect(resultado).toEqual({ atualizados: 1, naoEncontrados: [] });
  });

  it("registra SAIDA quando o novo saldo é menor que o atual", async () => {
    const { create, client } = criarPrismaMockImportar([variacaoCamiseta]);
    const caller = criarCaller(client);

    await caller.importar({
      linhas: [{ produto: "Camiseta", cor: "Azul", tamanho: "M", quantidade: 2 }],
    });

    expect(create).toHaveBeenCalledWith({
      data: { variacaoId: "v1", quantidade: 8, tipo: "SAIDA", motivo: "Importação de planilha" },
    });
  });

  it("não escreve nada quando o saldo da planilha é igual ao atual", async () => {
    const { update, create, client } = criarPrismaMockImportar([variacaoCamiseta]);
    const caller = criarCaller(client);

    const resultado = await caller.importar({
      linhas: [{ produto: "Camiseta", cor: "Azul", tamanho: "M", quantidade: 10 }],
    });

    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(resultado.atualizados).toBe(0);
  });

  it("reporta linhas sem variação correspondente sem interromper as demais", async () => {
    const { update, client } = criarPrismaMockImportar([variacaoCamiseta]);
    const caller = criarCaller(client);

    const resultado = await caller.importar({
      linhas: [
        { produto: "Camiseta", cor: "Azul", tamanho: "M", quantidade: 30 },
        { produto: "Produto Inexistente", quantidade: 5 },
      ],
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(resultado.atualizados).toBe(1);
    expect(resultado.naoEncontrados).toEqual(["Produto Inexistente"]);
  });

  it("só casa variações da própria loja (findMany já escopado por lojaId no where)", async () => {
    const { client } = criarPrismaMockImportar([variacaoCamiseta]);
    const caller = criarCaller(client);
    const findMany = (client as unknown as { variacaoProduto: { findMany: ReturnType<typeof vi.fn> } })
      .variacaoProduto.findMany;

    await caller.importar({ linhas: [{ produto: "Camiseta", quantidade: 1 }] });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { produto: { lojaId: LOJA_ID } } }),
    );
  });
});
