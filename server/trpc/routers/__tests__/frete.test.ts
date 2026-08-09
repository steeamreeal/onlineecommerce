import { describe, expect, it, vi } from "vitest";
import type { PrismaClient, PapelUsuario } from "@prisma/client";
import { freteRouter } from "../frete";

const LOJA_ID = "loja-1";

function criarPrismaMock(overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) },
    opcaoFrete: {
      create: vi.fn().mockResolvedValue({ id: "frete-1", nome: "Retirada na loja" }),
      findFirst: vi.fn().mockResolvedValue({ id: "frete-1", nome: "Retirada na loja", ativo: true }),
      update: vi.fn().mockResolvedValue({ id: "frete-1" }),
      delete: vi.fn().mockResolvedValue({ id: "frete-1" }),
    },
    solicitacao: {
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "solicitacao-1", ...data }),
      ),
    },
    ...overrides,
  };
  return mock as unknown as PrismaClient;
}

function criarCaller(client: PrismaClient, papel: PapelUsuario) {
  const ctx = { prisma: client, usuario: { id: "u1" }, lojaId: LOJA_ID, papel, supabaseUser: null } as never;
  return freteRouter.createCaller(ctx);
}

const opcaoInput = { tipo: "RETIRADA" as const, nome: "Retirada na loja", ativo: true };

describe("freteRouter — fluxo de aprovação por papel", () => {
  it.each<PapelUsuario>(["DONO", "GERENTE"])("papel %s: criar direto", async (papel) => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, papel);

    const resultado = await caller.criar(opcaoInput);

    expect((client as unknown as { opcaoFrete: { create: ReturnType<typeof vi.fn> } }).opcaoFrete.create).toHaveBeenCalledTimes(1);
    expect("pendente" in resultado).toBe(false);
  });

  it.each<PapelUsuario>(["VENDEDOR", "ESTOQUISTA", "SEPARADOR"])(
    "papel %s: criar vira solicitação pendente",
    async (papel) => {
      const client = criarPrismaMock();
      const caller = criarCaller(client, papel);

      const resultado = await caller.criar(opcaoInput);

      expect((client as unknown as { opcaoFrete: { create: ReturnType<typeof vi.fn> } }).opcaoFrete.create).not.toHaveBeenCalled();
      expect(resultado).toEqual({ pendente: true, solicitacaoId: "solicitacao-1" });
    },
  );

  it("VENDEDOR: alternarAtivo não muda nada — vira solicitação", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");

    const resultado = await caller.alternarAtivo({ id: "frete-1" });

    expect((client as unknown as { opcaoFrete: { update: ReturnType<typeof vi.fn> } }).opcaoFrete.update).not.toHaveBeenCalled();
    expect(resultado).toEqual({ pendente: true, solicitacaoId: "solicitacao-1" });
  });

  it("VENDEDOR: remover não apaga nada — vira solicitação", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");

    const resultado = await caller.remover({ id: "frete-1" });

    expect((client as unknown as { opcaoFrete: { delete: ReturnType<typeof vi.fn> } }).opcaoFrete.delete).not.toHaveBeenCalled();
    expect(resultado).toEqual({ pendente: true, solicitacaoId: "solicitacao-1" });
  });

  it("DONO: remover opção inexistente dá NOT_FOUND", async () => {
    const client = criarPrismaMock({ opcaoFrete: { findFirst: vi.fn().mockResolvedValue(null) } });
    const caller = criarCaller(client, "DONO");

    await expect(caller.remover({ id: "inexistente" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
