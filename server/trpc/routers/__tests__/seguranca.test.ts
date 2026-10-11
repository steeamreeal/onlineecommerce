import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { adminRouter } from "../admin";
import { cuponsRouter } from "../cupons";

const cupomInput = {
  codigo: "PROMO10",
  tipo: "PERCENTUAL" as const,
  valor: 10,
  inicio: new Date("2020-01-01"),
  fim: new Date("2999-01-01"),
  produtoIds: ["produto-de-outra-loja"],
  categoriaIds: [],
};

describe("admin: credenciais do Mercado Pago nunca saem do servidor", () => {
  function callerAdmin(prisma: unknown, papelAdmin: "SUPORTE" | "SUPER_ADMIN" = "SUPORTE") {
    const ctx = {
      prisma,
      usuario: { id: "u1", email: "a@a.com", papelAdmin },
      lojaId: null,
      papel: null,
      supabaseUser: null,
    } as never;
    return adminRouter.createCaller(ctx);
  }

  it("listarLojas omite mpAccessToken/mpRefreshToken", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { loja: { findMany }, pedido: { groupBy: vi.fn().mockResolvedValue([]) } };

    await callerAdmin(prisma).listarLojas();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ omit: { mpAccessToken: true, mpRefreshToken: true } }),
    );
  });

  it("obterLoja omite mpAccessToken/mpRefreshToken", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "l1", usuarios: [], responsavel: null, emailContato: null });
    const prisma = {
      loja: { findUnique },
      pedido: { aggregate: vi.fn().mockResolvedValue({ _sum: { valorTotal: 0 }, _count: 0 }) },
      produto: { count: vi.fn().mockResolvedValue(0) },
    };

    await callerAdmin(prisma).obterLoja({ id: "l1" });

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ omit: { mpAccessToken: true, mpRefreshToken: true } }),
    );
  });
});

describe("cupons: escopo de produtos/categorias por loja", () => {
  function callerCupons(prisma: unknown) {
    const ctx = { prisma, usuario: { id: "u1" }, lojaId: "loja-1", papel: "DONO", supabaseUser: null } as never;
    return cuponsRouter.createCaller(ctx);
  }

  it("não conecta cupom a produto de outra loja", async () => {
    const create = vi.fn();
    const prisma = {
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) },
      cupom: { findFirst: vi.fn().mockResolvedValue(null), create },
      produto: { count: vi.fn().mockResolvedValue(0) },
      categoria: { count: vi.fn().mockResolvedValue(0) },
    } as unknown as PrismaClient;

    await expect(callerCupons(prisma).criar(cupomInput)).rejects.toThrow(
      "Um ou mais produtos/categorias selecionados são inválidos.",
    );
    expect(create).not.toHaveBeenCalled();
    expect(prisma.produto.count).toHaveBeenCalledWith({
      where: { id: { in: ["produto-de-outra-loja"] }, lojaId: "loja-1" },
    });
  });
});
