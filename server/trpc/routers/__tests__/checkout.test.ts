import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { checkoutRouter } from "../checkout";

const mpPreferenceCreate = vi.hoisted(() => vi.fn());
const getMpPreferenceMock = vi.hoisted(() => vi.fn(() => ({ create: mpPreferenceCreate })));
vi.mock("@/lib/mercadopago", () => ({
  getMpPreference: getMpPreferenceMock,
  getMpPayment: () => ({ get: vi.fn() }),
}));

// mpAccessToken presente simula uma loja que já conectou o Mercado Pago
// (Connect/OAuth) — sem ele, o checkoutRouter rejeita formas de pagamento
// com gateway antes mesmo de criar o pedido.
const LOJA = { id: "loja-1", nome: "Minha Loja", slug: "minha-loja", mpAccessToken: "token-da-loja-1" };
const PRODUTO = { id: "produto-1", lojaId: LOJA.id, nome: "Produto 1", precoNormal: 100, precoPromo: null };
const VARIACAO = {
  id: "variacao-1",
  produtoId: PRODUTO.id,
  estoque: 10,
  cor: null,
  tamanho: null,
  modelo: null,
};

type PrismaMockShape = Record<string, Record<string, ReturnType<typeof vi.fn>>>;

// Mock deliberadamente parcial do Prisma Client — só os métodos que o
// checkoutRouter chama. `mock` tem tipagem solta para as asserções
// (expect(mock.pedido.create)...), `client` é o mesmo objeto tipado como
// PrismaClient para satisfazer o contexto do tRPC caller.
function criarPrismaMock(overrides: Record<string, unknown> = {}) {
  const cliente = { id: "cliente-1", nome: "Ana", telefone: "11999999999", email: null };
  const pedidoCriado = {
    id: "pedido-1",
    itens: [{ produtoId: PRODUTO.id, variacaoId: undefined, quantidade: 1, precoUnit: 100 }],
    cliente,
    cupom: null,
  };

  const mock: Record<string, unknown> = {
    loja: { findUnique: vi.fn().mockResolvedValue(LOJA) },
    opcaoFrete: { findFirst: vi.fn().mockResolvedValue(null) },
    produto: { findMany: vi.fn().mockResolvedValue([PRODUTO]) },
    cupom: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
    cliente: {
      findFirst: vi.fn().mockResolvedValue(cliente),
      create: vi.fn().mockResolvedValue(cliente),
      update: vi.fn().mockResolvedValue(cliente),
    },
    enderecoCliente: { create: vi.fn() },
    variacaoProduto: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn().mockResolvedValue(VARIACAO),
    },
    movimentoEstoque: { create: vi.fn() },
    usuarioLoja: { findFirst: vi.fn().mockResolvedValue(null) },
    notificacao: { create: vi.fn() },
    pedido: {
      create: vi.fn().mockResolvedValue(pedidoCriado),
      update: vi.fn(),
    },
    ...overrides,
  };
  // A transação reusa o mesmo mock como tx — os testes não distinguem
  // client vs. transaction client, já que nenhum aqui verifica atomicidade.
  mock.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(mock));

  return { mock: mock as PrismaMockShape, client: mock as unknown as PrismaClient };
}

describe("checkoutRouter.criarPedido", () => {
  beforeEach(() => {
    mpPreferenceCreate.mockReset();
    mpPreferenceCreate.mockResolvedValue({ init_point: "https://mp.example/checkout/pedido-1" });
  });

  function criarCaller(client: PrismaClient) {
    const ctx = { prisma: client, usuario: null, lojaId: null, supabaseUser: null } as never;
    return checkoutRouter.createCaller(ctx);
  }

  const inputBase = {
    slug: LOJA.slug,
    cliente: { nome: "Ana", telefone: "11999999999", email: "ana@example.com" },
    modoEntrega: "RETIRADA" as const,
    itens: [{ produtoId: PRODUTO.id, quantidade: 1 }],
  };

  it("cria pedido NOVO sem chamar o gateway quando a forma é pagamento na entrega", async () => {
    const { mock, client } = criarPrismaMock();
    const caller = criarCaller(client);

    const resultado = await caller.criarPedido({ ...inputBase, formaPagamento: "PAGAMENTO_ENTREGA" });

    expect(mpPreferenceCreate).not.toHaveBeenCalled();
    expect(resultado.linkPagamento).toBeNull();
    expect(mock.pedido.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "NOVO" }) }),
    );
  });

  it("cria pedido AGUARDANDO_PAGAMENTO e gera link do Mercado Pago para PIX", async () => {
    const { mock, client } = criarPrismaMock();
    const caller = criarCaller(client);

    const resultado = await caller.criarPedido({ ...inputBase, formaPagamento: "PIX" });

    expect(mpPreferenceCreate).toHaveBeenCalledTimes(1);
    // Preferência criada com o token da própria loja (Mercado Pago Connect)
    // — nunca um token global compartilhado entre lojas.
    expect(getMpPreferenceMock).toHaveBeenCalledWith(LOJA.mpAccessToken);
    const chamada = mpPreferenceCreate.mock.calls[0][0];
    expect(chamada.body.external_reference).toBe("pedido-1");
    expect(resultado.linkPagamento).toBe("https://mp.example/checkout/pedido-1");
    expect(mock.pedido.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "AGUARDANDO_PAGAMENTO" }) }),
    );
    expect(mock.pedido.update).toHaveBeenCalledWith({
      where: { id: "pedido-1" },
      data: { linkPagamento: "https://mp.example/checkout/pedido-1" },
    });
  });

  it("mantém o pedido AGUARDANDO_PAGAMENTO mesmo se o Mercado Pago não retornar init_point", async () => {
    mpPreferenceCreate.mockResolvedValueOnce({ init_point: undefined });
    const { mock, client } = criarPrismaMock();
    const caller = criarCaller(client);

    const resultado = await caller.criarPedido({ ...inputBase, formaPagamento: "CARTAO" });

    expect(resultado.linkPagamento).toBeNull();
    expect(mock.pedido.update).not.toHaveBeenCalled();
  });

  it("aplica cupom percentual sobre o valor dos produtos", async () => {
    const { mock, client } = criarPrismaMock({
      cupom: {
        findFirst: vi.fn().mockResolvedValue({
          id: "cupom-1",
          tipo: "PERCENTUAL",
          valor: 10,
          inicio: new Date("2020-01-01"),
          fim: new Date("2999-01-01"),
          limiteUso: null,
          usosAtuais: 0,
        }),
        update: vi.fn(),
      },
    });
    const caller = criarCaller(client);

    await caller.criarPedido({
      ...inputBase,
      formaPagamento: "PAGAMENTO_ENTREGA",
      cupomCodigo: "DESCONTO10",
    });

    expect(mock.pedido.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ valorDesconto: 10, valorTotal: 90 }),
      }),
    );
    expect(mock.cupom.update).toHaveBeenCalledWith({
      where: { id: "cupom-1" },
      data: { usosAtuais: { increment: 1 } },
    });
  });

  it("rejeita cupom expirado", async () => {
    const { client } = criarPrismaMock({
      cupom: {
        findFirst: vi.fn().mockResolvedValue({
          id: "cupom-1",
          tipo: "PERCENTUAL",
          valor: 10,
          inicio: new Date("2000-01-01"),
          fim: new Date("2001-01-01"),
          limiteUso: null,
          usosAtuais: 0,
        }),
        update: vi.fn(),
      },
    });
    const caller = criarCaller(client);

    await expect(
      caller.criarPedido({ ...inputBase, formaPagamento: "PAGAMENTO_ENTREGA", cupomCodigo: "VENCIDO" }),
    ).rejects.toThrow("Cupom inválido ou expirado.");
  });

  it("exige endereço quando o modo de entrega é ENTREGA", async () => {
    const { client } = criarPrismaMock();
    const caller = criarCaller(client);

    await expect(
      caller.criarPedido({ ...inputBase, modoEntrega: "ENTREGA", formaPagamento: "PAGAMENTO_ENTREGA" }),
    ).rejects.toThrow("Endereço é obrigatório para entrega.");
  });

  it("não gera preferência de pagamento nem cria o pedido quando falta estoque", async () => {
    const { mock, client } = criarPrismaMock({
      variacaoProduto: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn(),
        findUniqueOrThrow: vi.fn().mockResolvedValue(VARIACAO),
      },
    });
    const caller = criarCaller(client);

    await expect(
      caller.criarPedido({
        ...inputBase,
        formaPagamento: "PIX",
        itens: [{ produtoId: PRODUTO.id, variacaoId: "variacao-1", quantidade: 1 }],
      }),
    ).rejects.toThrow("Estoque insuficiente para um dos itens do pedido.");

    expect(mock.pedido.create).not.toHaveBeenCalled();
    expect(mpPreferenceCreate).not.toHaveBeenCalled();
  });

  it("rejeita pagamento via gateway quando a loja ainda não conectou o Mercado Pago", async () => {
    const { mock, client } = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ ...LOJA, mpAccessToken: null }) },
    });
    const caller = criarCaller(client);

    await expect(caller.criarPedido({ ...inputBase, formaPagamento: "PIX" })).rejects.toThrow(
      "Esta loja ainda não configurou o pagamento online.",
    );

    expect(mock.pedido.create).not.toHaveBeenCalled();
    expect(mpPreferenceCreate).not.toHaveBeenCalled();
  });
});
