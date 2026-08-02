import { describe, expect, it, vi, beforeEach } from "vitest";
import { InvalidWebhookSignatureError, SignatureFailureReason } from "mercadopago";

const validate = vi.hoisted(() => vi.fn());
vi.mock("mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("mercadopago")>();
  return {
    ...original,
    WebhookSignatureValidator: { validate },
  };
});

const mpPaymentGet = vi.hoisted(() => vi.fn());
const getMpPaymentMock = vi.hoisted(() => vi.fn(() => ({ get: mpPaymentGet })));
vi.mock("@/lib/mercadopago", () => ({
  getMpPayment: getMpPaymentMock,
  getMpPreference: () => ({ create: vi.fn() }),
}));

const webhookEventCreate = vi.hoisted(() => vi.fn());
const pedidoUpdateMany = vi.hoisted(() => vi.fn());
const lojaFindUnique = vi.hoisted(() => vi.fn());
vi.mock("@/server/db/client", () => ({
  prisma: {
    webhookEvent: { create: webhookEventCreate },
    pedido: { updateMany: pedidoUpdateMany },
    loja: { findUnique: lojaFindUnique },
  },
}));

async function importRoute() {
  return import("../mercadopago/route");
}

// user_id: identifica a conta Mercado Pago (Connect) que gerou o evento —
// é assim que o webhook descobre de qual loja é o pagamento, já que não
// existe um token global capaz de consultar pagamentos de todas as lojas.
function criarRequest(body: Record<string, unknown>, { comAssinatura = true }: { comAssinatura?: boolean } = {}) {
  const headers = new Headers();
  if (comAssinatura) {
    headers.set("x-signature", "ts=123,v1=assinatura-fake");
    headers.set("x-request-id", "req-1");
  }
  return new Request("https://example.com/api/webhooks/mercadopago?data.id=pagamento-1", {
    method: "POST",
    headers,
    body: JSON.stringify({ user_id: "mp-user-1", ...body }),
  });
}

describe("POST /api/webhooks/mercadopago", () => {
  beforeEach(() => {
    validate.mockReset();
    mpPaymentGet.mockReset();
    getMpPaymentMock.mockClear();
    webhookEventCreate.mockReset().mockResolvedValue({});
    pedidoUpdateMany.mockReset();
    lojaFindUnique.mockReset().mockResolvedValue({ id: "loja-1", mpAccessToken: "token-da-loja-1" });
  });

  it("rejeita quando a assinatura não confere", async () => {
    validate.mockImplementation(() => {
      throw new InvalidWebhookSignatureError(SignatureFailureReason.SignatureMismatch);
    });
    const { POST } = await importRoute();
    const res = await POST(criarRequest({ type: "payment", data: { id: "pagamento-1" } }));

    expect(res.status).toBe(400);
    expect(webhookEventCreate).not.toHaveBeenCalled();
  });

  it("propaga erros inesperados de validação (não relacionados à assinatura)", async () => {
    validate.mockImplementation(() => {
      throw new Error("falha de rede");
    });
    const { POST } = await importRoute();

    await expect(POST(criarRequest({ type: "payment", data: { id: "pagamento-1" } }))).rejects.toThrow(
      "falha de rede",
    );
  });

  it("ignora notificações que não são do tipo payment", async () => {
    validate.mockReturnValue(undefined);
    const { POST } = await importRoute();
    const res = await POST(criarRequest({ type: "merchant_order", data: { id: "pagamento-1" } }));

    expect(res.status).toBe(200);
    expect(mpPaymentGet).not.toHaveBeenCalled();
  });

  it("ignora notificação sem user_id (não dá para saber de qual loja é)", async () => {
    validate.mockReturnValue(undefined);
    const { POST } = await importRoute();
    const res = await POST(
      new Request("https://example.com/api/webhooks/mercadopago?data.id=pagamento-1", {
        method: "POST",
        headers: { "x-signature": "ts=123,v1=fake", "x-request-id": "req-1" },
        body: JSON.stringify({ type: "payment", data: { id: "pagamento-1" } }),
      }),
    );

    expect(res.status).toBe(200);
    expect(lojaFindUnique).not.toHaveBeenCalled();
  });

  it("ignora notificação de user_id sem loja correspondente conectada", async () => {
    validate.mockReturnValue(undefined);
    lojaFindUnique.mockResolvedValue(null);
    const { POST } = await importRoute();
    const res = await POST(criarRequest({ type: "payment", data: { id: "pagamento-1" } }));

    expect(res.status).toBe(200);
    expect(mpPaymentGet).not.toHaveBeenCalled();
  });

  it("marca o pedido como PAGO quando o pagamento é aprovado, usando o token da loja certa", async () => {
    validate.mockReturnValue(undefined);
    mpPaymentGet.mockResolvedValue({ id: "pagamento-1", status: "approved", external_reference: "pedido-1" });
    const { POST } = await importRoute();
    const res = await POST(criarRequest({ type: "payment", data: { id: "pagamento-1" } }));

    expect(res.status).toBe(200);
    expect(lojaFindUnique).toHaveBeenCalledWith({ where: { mpUserId: "mp-user-1" } });
    expect(getMpPaymentMock).toHaveBeenCalledWith("token-da-loja-1");
    expect(webhookEventCreate).toHaveBeenCalledWith({
      data: { origem: "MERCADO_PAGO", eventoId: "pagamento-1" },
    });
    expect(pedidoUpdateMany).toHaveBeenCalledWith({
      where: { id: "pedido-1", lojaId: "loja-1", status: "AGUARDANDO_PAGAMENTO" },
      data: { status: "PAGO", mpPaymentId: "pagamento-1", pagoEm: expect.any(Date) },
    });
  });

  it("não atualiza o pedido quando o pagamento ainda está pendente", async () => {
    validate.mockReturnValue(undefined);
    mpPaymentGet.mockResolvedValue({ id: "pagamento-1", status: "pending", external_reference: "pedido-1" });
    const { POST } = await importRoute();
    await POST(criarRequest({ type: "payment", data: { id: "pagamento-1" } }));

    expect(pedidoUpdateMany).not.toHaveBeenCalled();
  });

  it("não processa a mesma notificação duas vezes (idempotência via WebhookEvent)", async () => {
    validate.mockReturnValue(undefined);
    webhookEventCreate.mockRejectedValue(new Error("unique constraint violado"));
    const { POST } = await importRoute();
    const res = await POST(criarRequest({ type: "payment", data: { id: "pagamento-1" } }));

    expect(res.status).toBe(200);
    expect(mpPaymentGet).not.toHaveBeenCalled();
  });
});
