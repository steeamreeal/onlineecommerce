import { describe, expect, it, vi } from "vitest";
import type { PapelUsuario, PrismaClient } from "@prisma/client";
import { executarComAprovacao, precisaAprovacao } from "../aprovacao";

describe("precisaAprovacao", () => {
  it.each<PapelUsuario>(["DONO", "ADMINISTRADOR", "GERENTE"])("%s age direto", (papel) => {
    expect(precisaAprovacao(papel)).toBe(false);
  });

  it.each<PapelUsuario>(["VENDEDOR", "ESTOQUISTA", "SEPARADOR"])("%s gera solicitação", (papel) => {
    expect(precisaAprovacao(papel)).toBe(true);
  });

  it("sem papel nunca age direto", () => {
    expect(precisaAprovacao(null)).toBe(true);
  });
});

describe("executarComAprovacao", () => {
  function ctx(papel: PapelUsuario) {
    const create = vi.fn().mockResolvedValue({ id: "sol-1" });
    return {
      create,
      ctx: {
        prisma: { solicitacao: { create } } as unknown as PrismaClient,
        lojaId: "loja-1",
        usuario: { id: "u1" },
        papel,
      },
    };
  }

  it("ADMINISTRADOR executa direto, sem criar solicitação", async () => {
    const { ctx: c, create } = ctx("ADMINISTRADOR");
    const executar = vi.fn().mockResolvedValue("feito");
    expect(await executarComAprovacao(c, "FRETE_CRIAR", "x", {}, executar)).toBe("feito");
    expect(create).not.toHaveBeenCalled();
  });

  it("VENDEDOR vira solicitação pendente e não executa", async () => {
    const { ctx: c, create } = ctx("VENDEDOR");
    const executar = vi.fn();
    const r = await executarComAprovacao(c, "FRETE_CRIAR", "x", {}, executar);
    expect(r).toEqual({ pendente: true, solicitacaoId: "sol-1" });
    expect(executar).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
  });
});
