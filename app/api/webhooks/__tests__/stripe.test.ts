import { describe, expect, it, vi, beforeEach } from "vitest";

const constructEvent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}));

const webhookEventCreate = vi.hoisted(() => vi.fn());
const webhookEventDelete = vi.hoisted(() => vi.fn());
const lojaUpdate = vi.hoisted(() => vi.fn());
const lojaFindUnique = vi.hoisted(() => vi.fn());
vi.mock("@/server/db/client", () => ({
  prisma: {
    webhookEvent: { create: webhookEventCreate, delete: webhookEventDelete },
    loja: { update: lojaUpdate, findUnique: lojaFindUnique },
  },
}));

async function importRoute() {
  return import("../stripe/route");
}

function criarRequest(body: string, signature: string | null = "sig_valida") {
  const headers = new Headers();
  if (signature) headers.set("stripe-signature", signature);
  return new Request("https://example.com/api/webhooks/stripe", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    constructEvent.mockReset();
    webhookEventCreate.mockReset().mockResolvedValue({});
    webhookEventDelete.mockReset().mockResolvedValue({});
    lojaUpdate.mockReset();
    lojaFindUnique.mockReset();
  });

  it("rejeita requisição sem header stripe-signature", async () => {
    const { POST } = await importRoute();
    const res = await POST(criarRequest("{}", null));

    expect(res.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("rejeita requisição com assinatura inválida sem processar o evento", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("assinatura não confere");
    });
    const { POST } = await importRoute();
    const res = await POST(criarRequest("{}"));

    expect(res.status).toBe(400);
    expect(webhookEventCreate).not.toHaveBeenCalled();
  });

  it("ativa a loja e grava a subscription ao receber checkout.session.completed", async () => {
    constructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { metadata: { lojaId: "loja-1" }, subscription: "sub_123" } },
    });
    const { POST } = await importRoute();
    const res = await POST(criarRequest("{}"));

    expect(res.status).toBe(200);
    expect(webhookEventCreate).toHaveBeenCalledWith({ data: { origem: "STRIPE", eventoId: "evt_1" } });
    expect(lojaUpdate).toHaveBeenCalledWith({
      where: { id: "loja-1" },
      data: { statusPlano: "ATIVO", stripeSubscriptionId: "sub_123" },
    });
  });

  it("não reativa loja bloqueada à mão pelo admin ao receber checkout.session.completed", async () => {
    constructEvent.mockReturnValue({
      id: "evt_manual",
      type: "checkout.session.completed",
      data: { object: { metadata: { lojaId: "loja-1" }, subscription: "sub_123" } },
    });
    lojaFindUnique.mockResolvedValue({ bloqueadoManualmente: true });
    const { POST } = await importRoute();
    await POST(criarRequest("{}"));

    expect(lojaUpdate).toHaveBeenCalledWith({
      where: { id: "loja-1" },
      data: { stripeSubscriptionId: "sub_123" },
    });
  });

  it("assinatura ativa não desfaz o bloqueio manual da loja", async () => {
    constructEvent.mockReturnValue({
      id: "evt_manual_2",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_123", status: "active" } },
    });
    lojaFindUnique.mockResolvedValue({ id: "loja-1", bloqueadoManualmente: true });
    const { POST } = await importRoute();
    const res = await POST(criarRequest("{}"));

    expect(res.status).toBe(200);
    expect(lojaUpdate).not.toHaveBeenCalled();
  });

  it("falha ao processar: devolve 500 e libera o evento para o reenvio da Stripe", async () => {
    constructEvent.mockReturnValue({
      id: "evt_falha",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_123" } },
    });
    lojaFindUnique.mockResolvedValue({ id: "loja-1" });
    lojaUpdate.mockRejectedValue(new Error("banco indisponível"));
    const { POST } = await importRoute();
    const res = await POST(criarRequest("{}"));

    expect(res.status).toBe(500);
    expect(webhookEventDelete).toHaveBeenCalledWith({
      where: { origem_eventoId: { origem: "STRIPE", eventoId: "evt_falha" } },
    });
  });

  it("não processa o evento duas vezes (idempotência via WebhookEvent)", async () => {
    constructEvent.mockReturnValue({
      id: "evt_repetido",
      type: "checkout.session.completed",
      data: { object: { metadata: { lojaId: "loja-1" }, subscription: "sub_123" } },
    });
    webhookEventCreate.mockRejectedValue(new Error("unique constraint violado"));
    const { POST } = await importRoute();
    const res = await POST(criarRequest("{}"));

    expect(res.status).toBe(200);
    expect(lojaUpdate).not.toHaveBeenCalled();
  });

  it("bloqueia a loja quando a assinatura deixa de estar ativa", async () => {
    constructEvent.mockReturnValue({
      id: "evt_2",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_123", status: "past_due" } },
    });
    lojaFindUnique.mockResolvedValue({ id: "loja-1" });
    const { POST } = await importRoute();
    await POST(criarRequest("{}"));

    expect(lojaUpdate).toHaveBeenCalledWith({ where: { id: "loja-1" }, data: { statusPlano: "BLOQUEADO" } });
  });

  it("cancela o plano da loja quando a assinatura é deletada", async () => {
    constructEvent.mockReturnValue({
      id: "evt_3",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_123" } },
    });
    lojaFindUnique.mockResolvedValue({ id: "loja-1" });
    const { POST } = await importRoute();
    await POST(criarRequest("{}"));

    expect(lojaUpdate).toHaveBeenCalledWith({ where: { id: "loja-1" }, data: { statusPlano: "CANCELADO" } });
  });

  it("ignora evento de assinatura sem loja correspondente", async () => {
    constructEvent.mockReturnValue({
      id: "evt_4",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_desconhecida" } },
    });
    lojaFindUnique.mockResolvedValue(null);
    const { POST } = await importRoute();
    const res = await POST(criarRequest("{}"));

    expect(res.status).toBe(200);
    expect(lojaUpdate).not.toHaveBeenCalled();
  });
});
