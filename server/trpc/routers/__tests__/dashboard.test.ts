import { describe, expect, it, vi } from "vitest";
import type { PrismaClient, PapelUsuario } from "@prisma/client";
import { dashboardRouter } from "../dashboard";

const LOJA_ID = "loja-1";

function criarPrismaMock() {
  const mock: Record<string, unknown> = {
    loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) },
    pedido: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { valorTotal: 0 }, _count: 0 }),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
    },
    produto: { count: vi.fn().mockResolvedValue(0) },
  };
  return mock as unknown as PrismaClient;
}

function criarCaller(client: PrismaClient, papel: PapelUsuario | null) {
  const ctx = { prisma: client, usuario: { id: "u1" }, lojaId: LOJA_ID, papel, supabaseUser: null } as never;
  return dashboardRouter.createCaller(ctx);
}

describe("dashboardRouter — restrito a Dono/Gerente", () => {
  it.each<PapelUsuario>(["DONO", "GERENTE"])("papel %s consegue ver o kpis", async (papel) => {
    const caller = criarCaller(criarPrismaMock(), papel);
    await expect(caller.kpis()).resolves.toBeDefined();
  });

  it.each<PapelUsuario>(["ADMINISTRADOR", "VENDEDOR", "ESTOQUISTA", "SEPARADOR"])(
    "papel %s recebe FORBIDDEN em todos os endpoints do dashboard",
    async (papel) => {
      const caller = criarCaller(criarPrismaMock(), papel);
      await expect(caller.kpis()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.produtosMaisVendidos()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.clientesQueMaisCompram()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.vendasPorDia()).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );

  it("papel nulo (sem vínculo com a loja) recebe FORBIDDEN", async () => {
    const caller = criarCaller(criarPrismaMock(), null);
    await expect(caller.kpis()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
