import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { produtosRouter } from "../produtos";

const resendSendMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/email/resend", () => ({
  resend: { emails: { send: resendSendMock } },
  emailConfigurado: true,
  REMETENTE_PADRAO: "Loja <teste@teste.com>",
}));

const LOJA_ID = "loja-1";

function criarPrismaMock(produtoExistente: {
  id: string;
  fotos: unknown[];
  variacoes: { id: string; cor: string | null; tamanho: string | null; modelo: string | null; estoque: number }[];
}, overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    produto: {
      findFirst: vi.fn().mockResolvedValue(produtoExistente),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ ...produtoExistente, fotos: [], variacoes: [] }),
    },
    loja: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: LOJA_ID, nome: "Minha Loja" }),
      findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO", plano: null }),
    },
    categoria: { findFirst: vi.fn() },
    fotoProduto: { deleteMany: vi.fn(), updateMany: vi.fn(), createMany: vi.fn() },
    variacaoProduto: { deleteMany: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }), createMany: vi.fn() },
    usuarioLoja: { findFirst: vi.fn().mockResolvedValue({ usuario: { email: "dono@loja.com" } }) },
    notificacao: { create: vi.fn() },
    ...overrides,
  };
  mock.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(mock));
  return { mock: mock as Record<string, Record<string, ReturnType<typeof vi.fn>>>, client: mock as unknown as PrismaClient };
}

function criarCaller(client: PrismaClient) {
  const ctx = { prisma: client, usuario: { id: "u1" }, lojaId: LOJA_ID, supabaseUser: null } as never;
  return produtosRouter.createCaller(ctx);
}

const inputBase = {
  id: "produto-1",
  nome: "Camiseta",
  precoNormal: 50,
  fotos: [],
};

describe("produtosRouter.atualizar — notificação de estoque baixo ao editar estoque direto", () => {
  beforeEach(() => resendSendMock.mockClear());

  it("notifica quando a edição cruza o limite (8 -> 3)", async () => {
    const produtoExistente = {
      id: "produto-1",
      fotos: [],
      variacoes: [{ id: "v1", cor: null, tamanho: null, modelo: null, estoque: 8 }],
    };
    const { mock, client } = criarPrismaMock(produtoExistente);
    const caller = criarCaller(client);

    await caller.atualizar({
      ...inputBase,
      variacoes: [{ id: "v1", estoque: 3 }],
    });

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(mock.notificacao.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "ESTOQUE_BAIXO" }) }),
    );
  });

  it("não notifica quando a edição não cruza o limite (20 -> 15)", async () => {
    const produtoExistente = {
      id: "produto-1",
      fotos: [],
      variacoes: [{ id: "v1", cor: null, tamanho: null, modelo: null, estoque: 20 }],
    };
    const { mock, client } = criarPrismaMock(produtoExistente);
    const caller = criarCaller(client);

    await caller.atualizar({
      ...inputBase,
      variacoes: [{ id: "v1", estoque: 15 }],
    });

    expect(resendSendMock).not.toHaveBeenCalled();
    expect(mock.notificacao.create).not.toHaveBeenCalled();
  });

  it("não notifica quando o estoque já estava baixo antes da edição (4 -> 2)", async () => {
    const produtoExistente = {
      id: "produto-1",
      fotos: [],
      variacoes: [{ id: "v1", cor: null, tamanho: null, modelo: null, estoque: 4 }],
    };
    const { mock, client } = criarPrismaMock(produtoExistente);
    const caller = criarCaller(client);

    await caller.atualizar({
      ...inputBase,
      variacoes: [{ id: "v1", estoque: 2 }],
    });

    expect(resendSendMock).not.toHaveBeenCalled();
    expect(mock.notificacao.create).not.toHaveBeenCalled();
  });

  it("não notifica quando cria uma variação nova (sem id, sem estoque anterior)", async () => {
    const produtoExistente = { id: "produto-1", fotos: [], variacoes: [] };
    const { mock, client } = criarPrismaMock(produtoExistente);
    const caller = criarCaller(client);

    await caller.atualizar({
      ...inputBase,
      variacoes: [{ estoque: 2 }],
    });

    expect(resendSendMock).not.toHaveBeenCalled();
    expect(mock.notificacao.create).not.toHaveBeenCalled();
  });
});
