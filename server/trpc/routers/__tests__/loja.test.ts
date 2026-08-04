import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { lojaRouter } from "../loja";

const LOJA_ID = "loja-1";
const OUTRA_LOJA_ID = "loja-2";

function criarPrismaMock(overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    loja: {
      findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ template: "EDITORIAL", corPrimaria: "#c2703d" }),
    },
    ...overrides,
  };
  return mock as unknown as PrismaClient;
}

function criarCaller(client: PrismaClient, papel: "ADMINISTRADOR" | "VENDEDOR" | null = "ADMINISTRADOR") {
  const ctx = { prisma: client, usuario: { id: "u1" }, lojaId: LOJA_ID, papel, supabaseUser: null } as never;
  return lojaRouter.createCaller(ctx);
}

describe("lojaRouter.atualizarPersonalizacao", () => {
  it("atualiza template e corPrimaria escopado pela lojaId do contexto (nunca aceita lojaId no input)", async () => {
    const update = vi.fn().mockResolvedValue({ template: "EDITORIAL", corPrimaria: "#c2703d" });
    const client = criarPrismaMock({
      loja: {
        findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }),
        findFirst: vi.fn(),
        update,
      },
    });
    const caller = criarCaller(client);

    await caller.atualizarPersonalizacao({ template: "EDITORIAL", corPrimaria: "#c2703d" });

    expect(update).toHaveBeenCalledWith({
      where: { id: LOJA_ID },
      data: { template: "EDITORIAL", corPrimaria: "#c2703d" },
      select: { template: true, corPrimaria: true },
    });
  });

  it("nunca atualiza a loja de outro tenant: where.id é sempre a lojaId do contexto", async () => {
    const update = vi.fn().mockResolvedValue({ template: "VITRINE", corPrimaria: "#000000" });
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client);

    await caller.atualizarPersonalizacao({ template: "VITRINE", corPrimaria: "#000000" });

    const chamada = update.mock.calls[0][0];
    expect(chamada.where.id).toBe(LOJA_ID);
    expect(chamada.where.id).not.toBe(OUTRA_LOJA_ID);
  });

  it("rejeita template fora do enum válido", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client);

    await expect(
      caller.atualizarPersonalizacao({
        // @ts-expect-error valor inválido de propósito para testar a validação
        template: "NAO_EXISTE",
        corPrimaria: "#c2703d",
      }),
    ).rejects.toThrow();
  });

  it("rejeita corPrimaria fora do formato hex", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client);

    await expect(
      caller.atualizarPersonalizacao({ template: "MINIMALISTA", corPrimaria: "laranja" }),
    ).rejects.toThrow();
  });

  it("rejeita usuário sem papel ADMINISTRADOR (roleProcedure)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");

    await expect(
      caller.atualizarPersonalizacao({ template: "MINIMALISTA", corPrimaria: "#c2703d" }),
    ).rejects.toThrow(TRPCError);
  });
});
