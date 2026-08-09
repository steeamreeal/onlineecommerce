import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { pedidosRouter } from "../pedidos";

const resendSendMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/email/resend", () => ({
  resend: { emails: { send: resendSendMock } },
  emailConfigurado: true,
  REMETENTE_PADRAO: "Loja <teste@teste.com>",
}));

const LOJA = { id: "loja-1", nome: "Minha Loja" };
const CLIENTE = { id: "cliente-1", nome: "Ana", telefone: "11999999999", email: "ana@teste.com" };
const PRODUTO = { id: "produto-1", nome: "Camiseta", lojaId: LOJA.id, precoNormal: 100, precoPromo: null };

type PrismaMockShape = Record<string, Record<string, ReturnType<typeof vi.fn>>>;

function criarPrismaMock(overrides: Record<string, unknown> = {}) {
  const pedidoCriado = {
    id: "pedido-1",
    itens: [{ produtoId: PRODUTO.id, variacaoId: undefined, quantidade: 1, precoUnit: 100 }],
    cliente: CLIENTE,
    cupom: null,
  };

  const mock: Record<string, unknown> = {
    loja: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(LOJA),
      findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }),
    },
    cliente: { findFirst: vi.fn().mockResolvedValue(CLIENTE) },
    produto: {
      findMany: vi.fn().mockResolvedValue([PRODUTO]),
      findUniqueOrThrow: vi.fn().mockResolvedValue(PRODUTO),
    },
    cupom: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() },
    variacaoProduto: {
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
    },
    movimentoEstoque: { create: vi.fn() },
    usuarioLoja: { findFirst: vi.fn().mockResolvedValue(null) },
    notificacao: { create: vi.fn() },
    pedido: {
      create: vi.fn().mockResolvedValue(pedidoCriado),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue(pedidoCriado),
    },
    ...overrides,
  };
  mock.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(mock));

  return { mock: mock as PrismaMockShape, client: mock as unknown as PrismaClient };
}

function criarCaller(client: PrismaClient, papel: string = "DONO") {
  const ctx = { prisma: client, usuario: { id: "u1" }, lojaId: LOJA.id, papel, supabaseUser: null } as never;
  return pedidosRouter.createCaller(ctx);
}

describe("pedidosRouter.criar", () => {
  beforeEach(() => {
    resendSendMock.mockClear();
  });

  const inputBase = {
    clienteId: CLIENTE.id,
    formaPagamento: "PAGAMENTO_ENTREGA" as const,
    itens: [{ produtoId: PRODUTO.id, quantidade: 1 }],
  };

  it("cria o pedido e dispara e-mail + notificação in-app de confirmação", async () => {
    const { mock, client } = criarPrismaMock();
    const caller = criarCaller(client);

    await caller.criar(inputBase);

    expect(mock.pedido.create).toHaveBeenCalled();
    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(resendSendMock.mock.calls[0][0]).toMatchObject({ to: CLIENTE.email });
    expect(mock.notificacao.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "PEDIDO_NOVO", lojaId: LOJA.id }) }),
    );
  });

  it("notifica estoque baixo quando a venda cruza o limite (6 -> 4)", async () => {
    const variacao = { id: "variacao-1", produtoId: PRODUTO.id, estoque: 6, cor: null, tamanho: null, modelo: null };
    const { mock, client } = criarPrismaMock({
      variacaoProduto: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(variacao),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn(),
      },
      usuarioLoja: {
        findFirst: vi.fn().mockResolvedValue({ usuario: { email: "dono@loja.com" } }),
      },
    });
    const caller = criarCaller(client);

    await caller.criar({ ...inputBase, itens: [{ produtoId: PRODUTO.id, variacaoId: variacao.id, quantidade: 2 }] });

    // 2 chamadas de e-mail: confirmação do pedido + aviso de estoque baixo
    expect(resendSendMock).toHaveBeenCalledTimes(2);
    expect(mock.notificacao.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "ESTOQUE_BAIXO" }) }),
    );
  });

  it("não notifica estoque baixo quando a venda não cruza o limite (20 -> 18)", async () => {
    const variacao = { id: "variacao-1", produtoId: PRODUTO.id, estoque: 20, cor: null, tamanho: null, modelo: null };
    const { mock, client } = criarPrismaMock({
      variacaoProduto: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(variacao),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn(),
      },
    });
    const caller = criarCaller(client);

    await caller.criar({ ...inputBase, itens: [{ produtoId: PRODUTO.id, variacaoId: variacao.id, quantidade: 2 }] });

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    const tiposNotificados = (mock.notificacao.create as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0].data.tipo,
    );
    expect(tiposNotificados).not.toContain("ESTOQUE_BAIXO");
  });

  it("não notifica estoque baixo quando já estava baixo antes da venda (4 -> 3)", async () => {
    const variacao = { id: "variacao-1", produtoId: PRODUTO.id, estoque: 4, cor: null, tamanho: null, modelo: null };
    const { mock, client } = criarPrismaMock({
      variacaoProduto: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(variacao),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn(),
      },
    });
    const caller = criarCaller(client);

    await caller.criar({ ...inputBase, itens: [{ produtoId: PRODUTO.id, variacaoId: variacao.id, quantidade: 1 }] });

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    const tiposNotificados = (mock.notificacao.create as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0].data.tipo,
    );
    expect(tiposNotificados).not.toContain("ESTOQUE_BAIXO");
  });
});

describe("pedidosRouter.atualizarStatus", () => {
  beforeEach(() => {
    resendSendMock.mockClear();
  });

  it("avança o status e dispara e-mail + notificação de status atualizado", async () => {
    const pedidoExistente = {
      id: "pedido-1",
      status: "NOVO",
      cupomId: null,
      itens: [],
      cliente: CLIENTE,
    };
    const { mock, client } = criarPrismaMock({
      pedido: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(pedidoExistente),
        update: vi.fn().mockResolvedValue({ ...pedidoExistente, status: "AGUARDANDO_PAGAMENTO" }),
      },
    });
    const caller = criarCaller(client);

    const resultado = await caller.atualizarStatus({ id: "pedido-1", status: "AGUARDANDO_PAGAMENTO" });
    if ("pendente" in resultado) throw new Error("não deveria ficar pendente");

    expect(resultado.status).toBe("AGUARDANDO_PAGAMENTO");
    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(mock.notificacao.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "STATUS_ATUALIZADO" }) }),
    );
  });

  it("rejeita pular etapas do fluxo", async () => {
    const pedidoExistente = {
      id: "pedido-1",
      status: "NOVO",
      cupomId: null,
      itens: [],
      cliente: CLIENTE,
    };
    const { client } = criarPrismaMock({
      pedido: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(pedidoExistente),
        update: vi.fn(),
      },
    });
    const caller = criarCaller(client);

    await expect(caller.atualizarStatus({ id: "pedido-1", status: "PAGO" })).rejects.toThrow(
      "Transição de status inválida",
    );
  });
});

describe("pedidosRouter — fluxo de aprovação por papel", () => {
  it("SEPARADOR: atualizarStatus não muda o pedido — vira solicitação pendente", async () => {
    const pedidoExistente = { id: "pedido-1", status: "NOVO", cupomId: null, itens: [], cliente: CLIENTE };
    const { mock, client } = criarPrismaMock({
      pedido: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(pedidoExistente),
        update: vi.fn(),
      },
      solicitacao: { create: vi.fn().mockResolvedValue({ id: "solicitacao-1" }) },
    });
    const caller = criarCaller(client, "SEPARADOR");

    const resultado = await caller.atualizarStatus({ id: "pedido-1", status: "AGUARDANDO_PAGAMENTO" });

    expect(mock.pedido.update).not.toHaveBeenCalled();
    expect(mock.solicitacao.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "PEDIDO_ATUALIZAR_STATUS" }) }),
    );
    expect(resultado).toEqual({ pendente: true, solicitacaoId: "solicitacao-1" });
  });

  it("VENDEDOR: criar pedido (venda manual) não baixa estoque — vira solicitação pendente", async () => {
    const { mock, client } = criarPrismaMock({
      solicitacao: { create: vi.fn().mockResolvedValue({ id: "solicitacao-2" }) },
    });
    const caller = criarCaller(client, "VENDEDOR");

    const resultado = await caller.criar({
      clienteId: CLIENTE.id,
      formaPagamento: "PAGAMENTO_ENTREGA",
      itens: [{ produtoId: PRODUTO.id, quantidade: 1 }],
      valorFrete: 0,
    });

    expect(mock.pedido.create).not.toHaveBeenCalled();
    expect(mock.solicitacao.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "PEDIDO_CRIAR" }) }),
    );
    expect(resultado).toEqual({ pendente: true, solicitacaoId: "solicitacao-2" });
  });

  it("ESTOQUISTA: atualizarRastreio não muda o pedido — vira solicitação pendente", async () => {
    const pedidoExistente = { id: "pedido-1", codigoRastreio: null };
    const { mock, client } = criarPrismaMock({
      pedido: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(pedidoExistente),
        update: vi.fn(),
      },
      solicitacao: { create: vi.fn().mockResolvedValue({ id: "solicitacao-3" }) },
    });
    const caller = criarCaller(client, "ESTOQUISTA");

    const resultado = await caller.atualizarRastreio({ id: "pedido-1", codigoRastreio: "BR123" });

    expect(mock.pedido.update).not.toHaveBeenCalled();
    expect(resultado).toEqual({ pendente: true, solicitacaoId: "solicitacao-3" });
  });
});
