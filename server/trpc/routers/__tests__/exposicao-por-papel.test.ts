import { describe, expect, it, vi } from "vitest";
import type { PapelUsuario } from "@prisma/client";
import { usuariosLojaRouter } from "../usuarios-loja";
import { cuponsRouter } from "../cupons";
import { pedidosRouter } from "../pedidos";
import { notificacoesRouter } from "../notificacoes";
import { lojaRouter } from "../loja";

const LOJA = "loja-1";
const ctxDe = (prisma: unknown, papel: PapelUsuario) =>
  ({ prisma, usuario: { id: "u1" }, lojaId: LOJA, papel, supabaseUser: null }) as never;
const lojaAtiva = { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) };

const PAPEIS: PapelUsuario[] = ["DONO", "ADMINISTRADOR", "GERENTE", "VENDEDOR", "ESTOQUISTA", "SEPARADOR"];

describe("lista da equipe: só quem gerencia", () => {
  const prisma = {
    loja: lojaAtiva,
    usuarioLoja: { findMany: vi.fn().mockResolvedValue([]) },
    conviteUsuarioLoja: { findMany: vi.fn().mockResolvedValue([]) },
  };
  it.each<PapelUsuario>(["DONO", "ADMINISTRADOR", "GERENTE"])("%s vê", async (papel) => {
    await expect(usuariosLojaRouter.createCaller(ctxDe(prisma, papel)).listar()).resolves.toBeDefined();
  });
  it.each<PapelUsuario>(["VENDEDOR", "ESTOQUISTA", "SEPARADOR"])("%s recebe FORBIDDEN", async (papel) => {
    await expect(usuariosLojaRouter.createCaller(ctxDe(prisma, papel)).listar()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("cupons: consulta para quem gerencia e para o Vendedor", () => {
  const prisma = { loja: lojaAtiva, cupom: { findMany: vi.fn().mockResolvedValue([]) } };
  it.each<PapelUsuario>(["DONO", "ADMINISTRADOR", "GERENTE", "VENDEDOR"])("%s lista", async (papel) => {
    await expect(cuponsRouter.createCaller(ctxDe(prisma, papel)).listar()).resolves.toEqual([]);
  });
  it.each<PapelUsuario>(["ESTOQUISTA", "SEPARADOR"])("%s recebe FORBIDDEN", async (papel) => {
    await expect(cuponsRouter.createCaller(ctxDe(prisma, papel)).listar()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("pedidos: fora do Estoquista", () => {
  const prisma = { loja: lojaAtiva, pedido: { findMany: vi.fn().mockResolvedValue([]) } };
  it.each<PapelUsuario>(["DONO", "ADMINISTRADOR", "GERENTE", "VENDEDOR", "SEPARADOR"])("%s lista", async (papel) => {
    await expect(pedidosRouter.createCaller(ctxDe(prisma, papel)).listar()).resolves.toEqual([]);
  });
  it("ESTOQUISTA recebe FORBIDDEN em listar, buscar e nas mutations", async () => {
    const c = pedidosRouter.createCaller(ctxDe(prisma, "ESTOQUISTA"));
    await expect(c.listar()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.buscarPorId({ id: "x" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.atualizarStatus({ id: "x", status: "PAGO" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.atualizarRastreio({ id: "x", codigoRastreio: "A" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("notificacoes do Estoquista: só estoque baixo", () => {
  it("filtra por tipo ESTOQUE_BAIXO", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { loja: lojaAtiva, notificacao: { findMany } };
    await notificacoesRouter.createCaller(ctxDe(prisma, "ESTOQUISTA")).listar();
    expect(findMany.mock.calls[0][0].where).toEqual({ lojaId: LOJA, tipo: "ESTOQUE_BAIXO" });
  });
});

describe("loja.atual: stripeCustomerId só para Dono/Administrador", () => {
  const dadosLoja = {
    id: LOJA, nome: "L", slug: "l", logoUrl: null, planoId: null, statusPlano: "ATIVO",
    stripeCustomerId: "cus_123", mpConectadoEm: null, dominioProprio: null, template: "MINIMALISTA",
    corPrimaria: null, banners: null, temaConfig: null, temaProdutoConfig: null, selosConfig: {},
    whatsapp: null, instagram: null, facebook: null, endereco: null, horarioAtend: null,
    politicas: null, telefoneSac: null, plano: null,
  };
  const prisma = { loja: { findUnique: lojaAtiva.findUnique, findUniqueOrThrow: vi.fn().mockResolvedValue(dadosLoja) } };

  it.each(PAPEIS)("%s", async (papel) => {
    const r = await lojaRouter.createCaller(ctxDe(prisma, papel)).atual();
    const vê = papel === "DONO" || papel === "ADMINISTRADOR";
    expect(r.stripeCustomerId).toBe(vê ? "cus_123" : null);
  });
});
