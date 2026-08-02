import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { notificacoesRouter } from "../notificacoes";

const LOJA_ID = "loja-1";
const OUTRA_LOJA_ID = "loja-2";

function criarPrismaMock(overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    notificacao: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    ...overrides,
  };
  return mock as unknown as PrismaClient;
}

function criarCaller(client: PrismaClient) {
  const ctx = { prisma: client, usuario: { id: "u1" }, lojaId: LOJA_ID, supabaseUser: null } as never;
  return notificacoesRouter.createCaller(ctx);
}

describe("notificacoesRouter", () => {
  it("listar escopa por lojaId e aplica o limite padrão de 20", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const client = criarPrismaMock({ notificacao: { findMany, count: vi.fn(), updateMany: vi.fn() } });
    const caller = criarCaller(client);

    await caller.listar();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lojaId: LOJA_ID }, take: 20 }),
    );
  });

  it("listar respeita o limite customizado", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const client = criarPrismaMock({ notificacao: { findMany, count: vi.fn(), updateMany: vi.fn() } });
    const caller = criarCaller(client);

    await caller.listar({ limite: 5 });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it("contarNaoLidas escopa por lojaId e lida=false", async () => {
    const count = vi.fn().mockResolvedValue(3);
    const client = criarPrismaMock({ notificacao: { findMany: vi.fn(), count, updateMany: vi.fn() } });
    const caller = criarCaller(client);

    const resultado = await caller.contarNaoLidas();

    expect(resultado).toBe(3);
    expect(count).toHaveBeenCalledWith({ where: { lojaId: LOJA_ID, lida: false } });
  });

  it("marcarLida só afeta notificação da própria loja (updateMany com lojaId no where)", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const client = criarPrismaMock({ notificacao: { findMany: vi.fn(), count: vi.fn(), updateMany } });
    const caller = criarCaller(client);

    await caller.marcarLida({ id: "notif-1" });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "notif-1", lojaId: LOJA_ID },
      data: { lida: true },
    });
  });

  it("marcarLida não vaza entre tenants: where sempre inclui a lojaId do contexto, nunca a de outra loja", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const client = criarPrismaMock({ notificacao: { findMany: vi.fn(), count: vi.fn(), updateMany } });
    const caller = criarCaller(client);

    await caller.marcarLida({ id: "notif-de-outra-loja" });

    const chamada = updateMany.mock.calls[0][0];
    expect(chamada.where.lojaId).toBe(LOJA_ID);
    expect(chamada.where.lojaId).not.toBe(OUTRA_LOJA_ID);
  });

  it("marcarTodasLidas escopa por lojaId e lida=false", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 4 });
    const client = criarPrismaMock({ notificacao: { findMany: vi.fn(), count: vi.fn(), updateMany } });
    const caller = criarCaller(client);

    await caller.marcarTodasLidas();

    expect(updateMany).toHaveBeenCalledWith({
      where: { lojaId: LOJA_ID, lida: false },
      data: { lida: true },
    });
  });
});
