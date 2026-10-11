import { describe, expect, it, vi } from "vitest";
import type { PapelUsuario } from "@prisma/client";
import { adminRouter } from "../admin";
import { authRouter } from "../auth";
import { lojaPublicaRouter } from "../loja-publica";
import { onboardingRouter } from "../onboarding";
import { pedidosRouter } from "../pedidos";

const CLIENTE = { id: "c1", nome: "Ana", telefone: "11999999999", email: "ana@x.com", documento: "123.456.789-00" };
const PEDIDO = { id: "p1", lojaId: "loja-1", cliente: CLIENTE, itens: [], cupom: null };

function callerPedidos(papel: PapelUsuario) {
  const prisma = {
    loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) },
    pedido: {
      findMany: vi.fn().mockResolvedValue([PEDIDO]),
      findFirst: vi.fn().mockResolvedValue(PEDIDO),
    },
  };
  const ctx = { prisma, usuario: { id: "u1" }, lojaId: "loja-1", papel, supabaseUser: null } as never;
  return pedidosRouter.createCaller(ctx);
}

describe("pedidos: CPF/CNPJ só para quem gerencia a loja", () => {
  it.each<PapelUsuario>(["ESTOQUISTA", "VENDEDOR", "SEPARADOR"])("%s não vê o documento (listar e buscarPorId)", async (papel) => {
    const caller = callerPedidos(papel);
    const [lista] = await caller.listar();
    const um = await caller.buscarPorId({ id: "p1" });
    expect(lista.cliente.documento).toBeNull();
    expect(um.cliente.documento).toBeNull();
    expect(lista.cliente.telefone).toBe(CLIENTE.telefone);
  });

  it.each<PapelUsuario>(["DONO", "ADMINISTRADOR", "GERENTE"])("%s vê o documento", async (papel) => {
    const [lista] = await callerPedidos(papel).listar();
    expect(lista.cliente.documento).toBe(CLIENTE.documento);
  });
});

describe("lojaPublica.pedidoPorId: não devolve dados pessoais do cliente", () => {
  it("seleciona só endereços do cliente e campos mínimos do produto", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "p1", itens: [], cliente: { enderecos: [] } });
    const prisma = {
      loja: { findUnique: vi.fn().mockResolvedValue({ id: "loja-1", slug: "x" }) },
      pedido: { findFirst },
    };
    const caller = lojaPublicaRouter.createCaller({ prisma } as never);

    await caller.pedidoPorId({ slug: "x", id: "p1" });

    const { include } = findFirst.mock.calls[0][0];
    expect(include.cliente).toEqual({ select: { enderecos: true } });
    expect(include.itens.include.produto).toEqual({ select: { id: true, nome: true } });
  });
});

describe("admin: bloqueio manual e proteção do próprio acesso", () => {
  function callerAdmin(prisma: unknown) {
    const ctx = {
      prisma,
      usuario: { id: "eu", email: "a@a.com", papelAdmin: "SUPER_ADMIN" },
      lojaId: null,
      papel: null,
      supabaseUser: null,
    } as never;
    return adminRouter.createCaller(ctx);
  }

  it("bloquearLoja marca bloqueadoManualmente e liberarLoja desmarca", async () => {
    const update = vi.fn().mockResolvedValue({});
    const caller = callerAdmin({ loja: { update } });
    await caller.bloquearLoja({ id: "l1" });
    await caller.liberarLoja({ id: "l1" });
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: "l1" },
      data: { statusPlano: "BLOQUEADO", bloqueadoManualmente: true },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: "l1" },
      data: { statusPlano: "ATIVO", bloqueadoManualmente: false },
    });
  });

  it("super admin não revoga nem rebaixa o próprio acesso", async () => {
    const update = vi.fn();
    const caller = callerAdmin({ usuario: { update } });
    await expect(caller.revogarAcessoPlataforma({ id: "eu" })).rejects.toThrow("não pode revogar o seu próprio acesso");
    await expect(caller.alterarPapelUsuarioPlataforma({ id: "eu", papel: "SUPORTE" })).rejects.toThrow(
      "não pode alterar o seu próprio papel",
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("rejeita slug reservado ao criar loja", async () => {
    const caller = callerAdmin({ loja: { findUnique: vi.fn() } });
    await expect(
      caller.criarLoja({
        nome: "Loja",
        slug: "dominio-proprio",
        responsavel: "Fulano",
        emailContato: "f@x.com",
      }),
    ).rejects.toThrow("reservado");
  });
});

describe("onboarding: slug reservado", () => {
  it("rejeita slugs que colidem com rotas/subdomínios da plataforma", async () => {
    const ctx = { prisma: {}, usuario: { id: "u1" }, lojaId: null, papel: null, supabaseUser: null } as never;
    await expect(onboardingRouter.createCaller(ctx).criarLoja({ nome: "Minha", slug: "admin" })).rejects.toThrow(
      "reservado",
    );
  });
});

describe("auth.sincronizarUsuario: bootstrap de super admin exige e-mail confirmado", () => {
  async function sincronizar(emailConfirmado: boolean) {
    process.env.ADMIN_EMAILS = "dono@plataforma.com";
    vi.resetModules();
    const { authRouter: router } = await import("../auth");
    const create = vi.fn().mockResolvedValue({});
    const prisma = { usuario: { findUnique: vi.fn().mockResolvedValue(null), create } };
    const ctx = {
      prisma,
      usuario: null,
      lojaId: null,
      papel: null,
      supabaseUser: { id: "s1", email: "dono@plataforma.com", emailConfirmado },
    } as never;
    await router.createCaller(ctx).sincronizarUsuario({ nome: "Dono" });
    return create.mock.calls[0][0].data.papelAdmin;
  }

  it("e-mail confirmado vira SUPER_ADMIN", async () => {
    expect(await sincronizar(true)).toBe("SUPER_ADMIN");
  });

  it("e-mail NÃO confirmado não ganha acesso de admin", async () => {
    expect(await sincronizar(false)).toBeNull();
  });
});

void authRouter;
