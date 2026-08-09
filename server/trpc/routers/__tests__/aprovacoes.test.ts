import { describe, expect, it, vi } from "vitest";
import type { PrismaClient, PapelUsuario } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { aprovacoesRouter } from "../aprovacoes";

const LOJA_ID = "loja-1";

function criarSolicitacaoPendente(overrides: Record<string, unknown> = {}) {
  return {
    id: "solicitacao-1",
    lojaId: LOJA_ID,
    solicitanteId: "vendedor-1",
    tipo: "CLIENTE_CRIAR",
    resumo: "Novo cliente: Fulano",
    payload: { nome: "Fulano", enderecos: [] },
    status: "PENDENTE",
    erro: null,
    revisorId: null,
    revisadoEm: null,
    createdAt: new Date("2026-08-01T10:00:00Z"),
    ...overrides,
  };
}

function criarPrismaMock(overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }) },
    solicitacao: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(criarSolicitacaoPendente()),
      update: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
        Promise.resolve({ ...criarSolicitacaoPendente(), id: where.id, ...data }),
      ),
    },
    cliente: {
      create: vi.fn().mockResolvedValue({ id: "cliente-novo", nome: "Fulano" }),
    },
    ...overrides,
  };
  return mock as unknown as PrismaClient;
}

function criarCaller(client: PrismaClient, papel: PapelUsuario) {
  const ctx = { prisma: client, usuario: { id: "revisor-1" }, lojaId: LOJA_ID, papel, supabaseUser: null } as never;
  return aprovacoesRouter.createCaller(ctx);
}

describe("aprovacoesRouter.listarPendentes", () => {
  it.each<PapelUsuario>(["DONO", "GERENTE"])("papel %s consegue listar", async (papel) => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, papel);
    await expect(caller.listarPendentes()).resolves.toEqual([]);
  });

  it.each<PapelUsuario>(["VENDEDOR", "ESTOQUISTA", "SEPARADOR"])(
    "papel %s recebe FORBIDDEN",
    async (papel) => {
      const client = criarPrismaMock();
      const caller = criarCaller(client, papel);
      await expect(caller.listarPendentes()).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
});

describe("aprovacoesRouter.aprovar", () => {
  it("DONO aprova: executa a mutation original com o payload salvo e marca como APROVADA", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "DONO");

    const resultado = await caller.aprovar({ id: "solicitacao-1" });

    const clienteCreate = (client as unknown as { cliente: { create: ReturnType<typeof vi.fn> } }).cliente.create;
    expect(clienteCreate).toHaveBeenCalledTimes(1);
    expect(clienteCreate.mock.calls[0][0].data).toMatchObject({ lojaId: LOJA_ID, nome: "Fulano" });

    const solicitacaoUpdate = (client as unknown as { solicitacao: { update: ReturnType<typeof vi.fn> } })
      .solicitacao.update;
    expect(solicitacaoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "solicitacao-1" },
        data: expect.objectContaining({ status: "APROVADA", revisorId: "revisor-1" }),
      }),
    );
    expect((resultado as { status: string }).status).toBe("APROVADA");
  });

  it("GERENTE também pode aprovar", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "GERENTE");
    await expect(caller.aprovar({ id: "solicitacao-1" })).resolves.toBeDefined();
  });

  it("VENDEDOR não pode aprovar (FORBIDDEN)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");
    await expect(caller.aprovar({ id: "solicitacao-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("solicitação inexistente: NOT_FOUND", async () => {
    const client = criarPrismaMock({ solicitacao: { findFirst: vi.fn().mockResolvedValue(null) } });
    const caller = criarCaller(client, "DONO");
    await expect(caller.aprovar({ id: "inexistente" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("solicitação já revisada: BAD_REQUEST, não reexecuta", async () => {
    const client = criarPrismaMock({
      solicitacao: {
        findFirst: vi.fn().mockResolvedValue(criarSolicitacaoPendente({ status: "APROVADA" })),
        update: vi.fn(),
      },
    });
    const caller = criarCaller(client, "DONO");

    await expect(caller.aprovar({ id: "solicitacao-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((client as unknown as { cliente: { create: ReturnType<typeof vi.fn> } }).cliente.create).not.toHaveBeenCalled();
  });

  it("execução falha no momento da aprovação (ex: regra de negócio quebrou) — rejeita automaticamente com o motivo", async () => {
    const erro = new TRPCError({ code: "BAD_REQUEST", message: "Cliente inválido." });
    const client = criarPrismaMock({
      cliente: { create: vi.fn().mockRejectedValue(erro) },
    });
    const caller = criarCaller(client, "DONO");

    await expect(caller.aprovar({ id: "solicitacao-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const solicitacaoUpdate = (client as unknown as { solicitacao: { update: ReturnType<typeof vi.fn> } })
      .solicitacao.update;
    expect(solicitacaoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJEITADA", erro: "Cliente inválido." }),
      }),
    );
  });
});

describe("aprovacoesRouter.rejeitar", () => {
  it("DONO rejeita com motivo", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "DONO");

    const resultado = await caller.rejeitar({ id: "solicitacao-1", motivo: "Fora da política de preço." });

    const solicitacaoUpdate = (client as unknown as { solicitacao: { update: ReturnType<typeof vi.fn> } })
      .solicitacao.update;
    expect(solicitacaoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJEITADA", erro: "Fora da política de preço.", revisorId: "revisor-1" }),
      }),
    );
    expect((resultado as { status: string }).status).toBe("REJEITADA");
  });

  it("VENDEDOR não pode rejeitar (FORBIDDEN)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");
    await expect(caller.rejeitar({ id: "solicitacao-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("solicitação já revisada: BAD_REQUEST", async () => {
    const client = criarPrismaMock({
      solicitacao: {
        findFirst: vi.fn().mockResolvedValue(criarSolicitacaoPendente({ status: "REJEITADA" })),
        update: vi.fn(),
      },
    });
    const caller = criarCaller(client, "DONO");
    await expect(caller.rejeitar({ id: "solicitacao-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("aprovacoesRouter.aprovar — ACESSO_EDITAR_TEMA", () => {
  it("DONO aprova: concede podeEditarTema pro solicitante em vez de reexecutar mutation", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const client = criarPrismaMock({
      solicitacao: {
        findFirst: vi.fn().mockResolvedValue(
          criarSolicitacaoPendente({
            tipo: "ACESSO_EDITAR_TEMA",
            resumo: "Pedido de acesso para editar o tema/aparência do site",
            payload: {},
            solicitanteId: "administrador-1",
          }),
        ),
        update: vi.fn().mockResolvedValue({ status: "APROVADA" }),
      },
      usuarioLoja: { updateMany },
    });
    const caller = criarCaller(client, "DONO");

    const resultado = await caller.aprovar({ id: "solicitacao-1" });

    expect(updateMany).toHaveBeenCalledWith({
      where: { usuarioId: "administrador-1", lojaId: LOJA_ID },
      data: { podeEditarTema: true },
    });
    expect((resultado as { status: string }).status).toBe("APROVADA");
  });
});

describe("aprovacoesRouter.solicitarAcessoTema", () => {
  it("ADMINISTRADOR sem acesso e sem pedido pendente consegue solicitar", async () => {
    const solicitacaoCreate = vi.fn().mockResolvedValue({ id: "solicitacao-nova" });
    const client = criarPrismaMock({
      usuarioLoja: { findFirst: vi.fn().mockResolvedValue(null) },
      solicitacao: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: solicitacaoCreate,
      },
    });
    const caller = criarCaller(client, "ADMINISTRADOR");

    await caller.solicitarAcessoTema();

    expect(solicitacaoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: "ACESSO_EDITAR_TEMA", status: "PENDENTE" }),
      }),
    );
  });

  it("GERENTE também pode solicitar", async () => {
    const client = criarPrismaMock({
      usuarioLoja: { findFirst: vi.fn().mockResolvedValue(null) },
      solicitacao: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    });
    const caller = criarCaller(client, "GERENTE");
    await expect(caller.solicitarAcessoTema()).resolves.toBeDefined();
  });

  it("VENDEDOR não pode solicitar (FORBIDDEN)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");
    await expect(caller.solicitarAcessoTema()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("já tem acesso: BAD_REQUEST, não cria solicitação de novo", async () => {
    const solicitacaoCreate = vi.fn();
    const client = criarPrismaMock({
      usuarioLoja: { findFirst: vi.fn().mockResolvedValue({ podeEditarTema: true }) },
      solicitacao: { create: solicitacaoCreate },
    });
    const caller = criarCaller(client, "ADMINISTRADOR");

    await expect(caller.solicitarAcessoTema()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(solicitacaoCreate).not.toHaveBeenCalled();
  });

  it("já tem pedido pendente: BAD_REQUEST, não duplica", async () => {
    const solicitacaoCreate = vi.fn();
    const client = criarPrismaMock({
      usuarioLoja: { findFirst: vi.fn().mockResolvedValue(null) },
      solicitacao: {
        findFirst: vi.fn().mockResolvedValue(criarSolicitacaoPendente({ tipo: "ACESSO_EDITAR_TEMA" })),
        create: solicitacaoCreate,
      },
    });
    const caller = criarCaller(client, "ADMINISTRADOR");

    await expect(caller.solicitarAcessoTema()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(solicitacaoCreate).not.toHaveBeenCalled();
  });
});

describe("aprovacoesRouter.revogarAcessoTema", () => {
  it("DONO revoga o acesso de um usuário", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const client = criarPrismaMock({ usuarioLoja: { updateMany } });
    const caller = criarCaller(client, "DONO");

    await caller.revogarAcessoTema({ usuarioId: "administrador-1" });

    expect(updateMany).toHaveBeenCalledWith({
      where: { usuarioId: "administrador-1", lojaId: LOJA_ID },
      data: { podeEditarTema: false },
    });
  });

  it("GERENTE não pode revogar (só o Dono)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "GERENTE");
    await expect(caller.revogarAcessoTema({ usuarioId: "administrador-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("usuário não encontrado na loja: NOT_FOUND", async () => {
    const client = criarPrismaMock({ usuarioLoja: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } });
    const caller = criarCaller(client, "DONO");
    await expect(caller.revogarAcessoTema({ usuarioId: "id-que-nao-existe" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("aprovacoesRouter.minhasSolicitacoes", () => {
  it("qualquer papel autenticado consegue ver as próprias solicitações", async () => {
    const client = criarPrismaMock({
      solicitacao: { findMany: vi.fn().mockResolvedValue([criarSolicitacaoPendente()]) },
    });
    const caller = criarCaller(client, "VENDEDOR");

    const resultado = await caller.minhasSolicitacoes();
    expect(resultado).toHaveLength(1);
  });
});
