import { NextResponse } from "next/server";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { getMpPayment } from "@/lib/mercadopago";
import { prisma } from "@/server/db/client";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const dataId = searchParams.get("data.id");

  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
      toleranceSeconds: 300,
    });
  } catch (erro) {
    if (erro instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
    }
    throw erro;
  }

  const body = (await req.json()) as { type?: string; data?: { id?: string }; user_id?: number | string };
  const paymentId = body.data?.id ?? dataId;

  if (body.type !== "payment" || !paymentId) {
    return NextResponse.json({ recebido: true });
  }

  try {
    await prisma.webhookEvent.create({ data: { origem: "MERCADO_PAGO", eventoId: paymentId } });
  } catch {
    // Evento já processado (unique constraint em origem+eventoId) — o
    // Mercado Pago pode reenviar a mesma notificação mais de uma vez.
    return NextResponse.json({ recebido: true });
  }

  // A notificação inclui o user_id da conta Mercado Pago que gerou o
  // evento (Mercado Pago Connect: cada loja tem a própria conta). É assim
  // que descobrimos qual mpAccessToken usar para consultar o pagamento —
  // nunca existe um token global capaz de ler pagamentos de todas as lojas.
  const mpUserId = body.user_id != null ? String(body.user_id) : null;
  if (!mpUserId) {
    return NextResponse.json({ recebido: true });
  }

  const loja = await prisma.loja.findUnique({ where: { mpUserId } });
  if (!loja?.mpAccessToken) {
    return NextResponse.json({ recebido: true });
  }

  const pagamento = await getMpPayment(loja.mpAccessToken).get({ id: paymentId });
  const pedidoId = pagamento.external_reference;

  if (pagamento.status === "approved" && pedidoId) {
    await prisma.pedido.updateMany({
      where: { id: pedidoId, lojaId: loja.id, status: "AGUARDANDO_PAGAMENTO" },
      data: { status: "PAGO", mpPaymentId: String(pagamento.id), pagoEm: new Date() },
    });
  }

  return NextResponse.json({ recebido: true });
}
