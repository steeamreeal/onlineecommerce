import { describe, expect, it, vi, beforeEach } from "vitest";

const resendSendMock = vi.hoisted(() => vi.fn());
let emailConfiguradoMock = true;
vi.mock("@/lib/email/resend", () => ({
  resend: { emails: { send: resendSendMock } },
  get emailConfigurado() {
    return emailConfiguradoMock;
  },
  REMETENTE_PADRAO: "Loja <teste@teste.com>",
}));

const { buscarEmailAdministradorLoja, notificarEstoqueBaixo, notificarPedidoConfirmado } = await import(
  "@/lib/email/notificacoes"
);

function criarTxMock() {
  return {
    usuarioLoja: { findFirst: vi.fn() },
    notificacao: { create: vi.fn() },
  } as never;
}

describe("lib/email/notificacoes", () => {
  beforeEach(() => {
    resendSendMock.mockReset().mockResolvedValue({});
    emailConfiguradoMock = true;
  });

  it("buscarEmailAdministradorLoja escopa a busca por lojaId e papel ADMINISTRADOR", async () => {
    const tx = criarTxMock();
    (tx as { usuarioLoja: { findFirst: ReturnType<typeof vi.fn> } }).usuarioLoja.findFirst.mockResolvedValue({
      usuario: { email: "dono@loja.com" },
    });

    const email = await buscarEmailAdministradorLoja(tx, "loja-1");

    expect(email).toBe("dono@loja.com");
    expect((tx as { usuarioLoja: { findFirst: ReturnType<typeof vi.fn> } }).usuarioLoja.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lojaId: "loja-1", papel: "ADMINISTRADOR" } }),
    );
  });

  it("buscarEmailAdministradorLoja retorna undefined quando não há administrador", async () => {
    const tx = criarTxMock();
    (tx as { usuarioLoja: { findFirst: ReturnType<typeof vi.fn> } }).usuarioLoja.findFirst.mockResolvedValue(null);

    const email = await buscarEmailAdministradorLoja(tx, "loja-1");

    expect(email).toBeUndefined();
  });

  it("não envia e-mail quando não há destinatário, mas ainda cria a notificação in-app", async () => {
    const tx = criarTxMock();

    await notificarPedidoConfirmado(tx, {
      lojaId: "loja-1",
      lojaNome: "Loja",
      clienteNome: "Ana",
      clienteEmail: null,
      pedidoId: "pedido-1",
      valorTotal: 100,
    });

    expect(resendSendMock).not.toHaveBeenCalled();
    expect((tx as { notificacao: { create: ReturnType<typeof vi.fn> } }).notificacao.create).toHaveBeenCalled();
  });

  it("não envia e-mail quando RESEND_API_KEY não está configurada, mas ainda cria a notificação in-app", async () => {
    emailConfiguradoMock = false;
    const tx = criarTxMock();

    await notificarPedidoConfirmado(tx, {
      lojaId: "loja-1",
      lojaNome: "Loja",
      clienteNome: "Ana",
      clienteEmail: "ana@teste.com",
      pedidoId: "pedido-1",
      valorTotal: 100,
    });

    expect(resendSendMock).not.toHaveBeenCalled();
    expect((tx as { notificacao: { create: ReturnType<typeof vi.fn> } }).notificacao.create).toHaveBeenCalled();
  });

  it("falha silenciosa: erro no envio de e-mail não impede a criação da notificação in-app", async () => {
    resendSendMock.mockRejectedValueOnce(new Error("Resend fora do ar"));
    const tx = criarTxMock();

    await expect(
      notificarEstoqueBaixo(tx, {
        lojaId: "loja-1",
        lojaNome: "Loja",
        lojistaEmail: "dono@loja.com",
        produtoNome: "Camiseta",
        variacaoLabel: "M",
        estoqueAtual: 2,
      }),
    ).resolves.not.toThrow();

    expect((tx as { notificacao: { create: ReturnType<typeof vi.fn> } }).notificacao.create).toHaveBeenCalled();
  });
});
