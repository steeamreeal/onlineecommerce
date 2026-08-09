import { describe, expect, it, vi } from "vitest";
import type { PrismaClient, PapelUsuario } from "@prisma/client";
import { clientesRouter } from "../clientes";

const LOJA_ID = "loja-1";

function criarPrismaMock(overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) },
    cliente: {
      create: vi.fn().mockResolvedValue({ id: "cliente-1", nome: "Novo Cliente" }),
      findFirst: vi.fn().mockResolvedValue({ id: "cliente-1", nome: "Cliente Existente", enderecos: [] }),
      delete: vi.fn().mockResolvedValue({ id: "cliente-1" }),
    },
    pedido: { count: vi.fn().mockResolvedValue(0) },
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
  return clientesRouter.createCaller(ctx);
}

const clienteInput = { nome: "Novo Cliente", enderecos: [] as never[] };

describe("clientesRouter.criar — fluxo de aprovação por papel", () => {
  it.each<PapelUsuario>(["DONO", "GERENTE"])(
    "papel %s cria o cliente direto, sem gerar solicitação",
    async (papel) => {
      const client = criarPrismaMock();
      const caller = criarCaller(client, papel);

      const resultado = await caller.criar(clienteInput);

      expect((client as unknown as { cliente: { create: ReturnType<typeof vi.fn> } }).cliente.create).toHaveBeenCalledTimes(1);
      expect((client as unknown as { solicitacao: { create: ReturnType<typeof vi.fn> } }).solicitacao.create).not.toHaveBeenCalled();
      expect("pendente" in resultado).toBe(false);
    },
  );

  it.each<PapelUsuario>(["VENDEDOR", "ESTOQUISTA", "SEPARADOR"])(
    "papel %s não cria o cliente — vira solicitação pendente",
    async (papel) => {
      const client = criarPrismaMock();
      const caller = criarCaller(client, papel);

      const resultado = await caller.criar(clienteInput);

      expect((client as unknown as { cliente: { create: ReturnType<typeof vi.fn> } }).cliente.create).not.toHaveBeenCalled();
      const solicitacaoCreate = (client as unknown as { solicitacao: { create: ReturnType<typeof vi.fn> } })
        .solicitacao.create;
      expect(solicitacaoCreate).toHaveBeenCalledTimes(1);
      expect(solicitacaoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lojaId: LOJA_ID,
            solicitanteId: "u1",
            tipo: "CLIENTE_CRIAR",
            status: "PENDENTE",
            payload: clienteInput,
          }),
        }),
      );
      expect(resultado).toEqual({ pendente: true, solicitacaoId: "solicitacao-1" });
    },
  );

  it("papel nulo (sem vínculo com a loja) também vira solicitação pendente", async () => {
    const client = criarPrismaMock();
    const ctx = { prisma: client, usuario: { id: "u1" }, lojaId: LOJA_ID, papel: null, supabaseUser: null } as never;
    const caller = clientesRouter.createCaller(ctx);

    const resultado = await caller.criar(clienteInput);

    expect("pendente" in resultado).toBe(true);
  });
});

describe("clientesRouter.remover — fluxo de aprovação", () => {
  it("VENDEDOR: não remove — vira solicitação com o nome do cliente no resumo", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");

    const resultado = await caller.remover({ id: "cliente-1" });

    expect((client as unknown as { cliente: { delete: ReturnType<typeof vi.fn> } }).cliente.delete).not.toHaveBeenCalled();
    const solicitacaoCreate = (client as unknown as { solicitacao: { create: ReturnType<typeof vi.fn> } })
      .solicitacao.create;
    expect(solicitacaoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: "CLIENTE_REMOVER", resumo: expect.stringContaining("Cliente Existente") }),
      }),
    );
    expect(resultado).toEqual({ pendente: true, solicitacaoId: "solicitacao-1" });
  });

  it("DONO: remove direto quando o cliente não tem pedidos", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "DONO");

    await caller.remover({ id: "cliente-1" });

    expect((client as unknown as { cliente: { delete: ReturnType<typeof vi.fn> } }).cliente.delete).toHaveBeenCalledWith({
      where: { id: "cliente-1" },
    });
  });

  it("DONO: bloqueia remoção se o cliente tem pedidos no histórico", async () => {
    const client = criarPrismaMock({ pedido: { count: vi.fn().mockResolvedValue(2) } });
    const caller = criarCaller(client, "DONO");

    await expect(caller.remover({ id: "cliente-1" })).rejects.toThrow(
      "Não é possível remover um cliente com pedidos no histórico.",
    );
  });
});

describe("clientesRouter — leitura restrita a Dono/Gerente, exportar/importar só Dono", () => {
  it.each<PapelUsuario>(["DONO", "GERENTE"])("papel %s consegue listar clientes", async (papel) => {
    const client = criarPrismaMock({ cliente: { findMany: vi.fn().mockResolvedValue([]) } });
    const caller = criarCaller(client, papel);
    await expect(caller.listar()).resolves.toEqual([]);
  });

  it.each<PapelUsuario>(["ADMINISTRADOR", "VENDEDOR", "ESTOQUISTA", "SEPARADOR"])(
    "papel %s recebe FORBIDDEN ao listar clientes",
    async (papel) => {
      const client = criarPrismaMock();
      const caller = criarCaller(client, papel);
      await expect(caller.listar()).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );

  it("GERENTE recebe FORBIDDEN ao tentar exportar (só Dono)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "GERENTE");
    await expect(caller.exportar()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("DONO consegue exportar", async () => {
    const client = criarPrismaMock({ cliente: { findMany: vi.fn().mockResolvedValue([]) } });
    const caller = criarCaller(client, "DONO");
    await expect(caller.exportar()).resolves.toEqual([]);
  });

  it("GERENTE recebe FORBIDDEN ao tentar importarVarios (só Dono)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "GERENTE");
    await expect(
      caller.importarVarios({ clientes: [{ nome: "Fulano" }] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
