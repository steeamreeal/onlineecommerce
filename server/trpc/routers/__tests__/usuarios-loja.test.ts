import { describe, expect, it, vi } from "vitest";
import type { PapelUsuario } from "@prisma/client";
import { usuariosLojaRouter } from "../usuarios-loja";

const LOJA_ID = "loja-1";

function criarCaller(papel: PapelUsuario, vinculos: Record<string, { id: string; lojaId: string; usuarioId: string; papel: PapelUsuario }>) {
  const update = vi.fn().mockResolvedValue({});
  const remove = vi.fn().mockResolvedValue({});
  const donoAtual = Object.values(vinculos).find((v) => v.papel === "DONO") ?? null;
  const prisma = {
    loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) },
    usuarioLoja: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => vinculos[where.id] ?? null),
      findFirst: vi.fn().mockResolvedValue(donoAtual),
      update,
      delete: remove,
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ usuarioLoja: { update } })),
  };
  const ctx = { prisma, usuario: { id: "eu" }, lojaId: LOJA_ID, papel, supabaseUser: null } as never;
  return { caller: usuariosLojaRouter.createCaller(ctx), update, remove };
}

const dono = { id: "v-dono", lojaId: LOJA_ID, usuarioId: "u-dono", papel: "DONO" as const };
const vendedor = { id: "v-vend", lojaId: LOJA_ID, usuarioId: "u-vend", papel: "VENDEDOR" as const };
const admin = { id: "v-admin", lojaId: LOJA_ID, usuarioId: "eu", papel: "ADMINISTRADOR" as const };

describe("usuariosLoja: o dono é intocável por administradores", () => {
  const vinculos = { [dono.id]: dono, [vendedor.id]: vendedor, [admin.id]: admin };

  it("ADMINISTRADOR não rebaixa o dono", async () => {
    const { caller, update } = criarCaller("ADMINISTRADOR", vinculos);
    await expect(caller.alterarPapel({ usuarioLojaId: dono.id, papel: "VENDEDOR" })).rejects.toThrow(
      "Só o dono da loja pode alterar o papel de um dono.",
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("ADMINISTRADOR não se promove a dono havendo dono", async () => {
    const { caller, update } = criarCaller("ADMINISTRADOR", vinculos);
    await expect(caller.alterarPapel({ usuarioLojaId: admin.id, papel: "DONO" })).rejects.toThrow(
      "Só o dono atual da loja pode transferir esse papel",
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("ADMINISTRADOR não remove o dono", async () => {
    const { caller, remove } = criarCaller("ADMINISTRADOR", vinculos);
    await expect(caller.remover({ usuarioLojaId: dono.id })).rejects.toThrow("O dono da loja não pode ser removido");
    expect(remove).not.toHaveBeenCalled();
  });

  it("o próprio dono transfere o papel (antigo dono vira ADMINISTRADOR)", async () => {
    const { caller, update } = criarCaller("DONO", vinculos);
    await caller.alterarPapel({ usuarioLojaId: vendedor.id, papel: "DONO" });
    expect(update).toHaveBeenCalledWith({ where: { id: dono.id }, data: { papel: "ADMINISTRADOR" } });
    expect(update).toHaveBeenCalledWith({ where: { id: vendedor.id }, data: { papel: "DONO" } });
  });

  it("sem dono na loja, um ADMINISTRADOR faz a primeira atribuição", async () => {
    const semDono = { [vendedor.id]: vendedor, [admin.id]: admin };
    const { caller, update } = criarCaller("ADMINISTRADOR", semDono);
    await caller.alterarPapel({ usuarioLojaId: admin.id, papel: "DONO" });
    expect(update).toHaveBeenCalledWith({ where: { id: admin.id }, data: { papel: "DONO" } });
  });

  it("ADMINISTRADOR continua gerenciando papéis comuns", async () => {
    const { caller, update } = criarCaller("ADMINISTRADOR", vinculos);
    await caller.alterarPapel({ usuarioLojaId: vendedor.id, papel: "ESTOQUISTA" });
    expect(update).toHaveBeenCalledWith({ where: { id: vendedor.id }, data: { papel: "ESTOQUISTA" } });
  });
});
