import { NextResponse } from "next/server";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { getMpPayment } from "@/lib/mercadopago";
import { prisma } from "@/server/db/client";
import { notificarStatusAtualizado } from "@/lib/email/notificacoes";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const dataId = searchParams.get("data.id");

  try {
    // O `ts` do header x-signature é epoch em SEGUNDOS (padrão do Mercado
    // Pago), mas Date.now() é em milissegundos — sem converter aqui, a
    // checagem de tolerância compara unidades diferentes e rejeita toda
    // notificação real como se estivesse anos fora da janela.
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
      toleranceSeconds: 300,
      now: () => Math.floor(Date.now() / 1000),
    });
  } catch (erro) {
    if (erro instanceof InvalidWebhookSignatureError) {
      console.error("Webhook Mercado Pago rejeitado:", erro.reason, { requestId: erro.requestId });
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
    }
    throw erro;
  }

  const body = (await req.json()) as {
    type?: string;
    action?: string;
    data?: { id?: string };
    user_id?: number | string;
  };
  const paymentId = body.data?.id ?? dataId;

  if (body.type !== "payment" || !paymentId) {
    return NextResponse.json({ recebido: true });
  }

  // O Mercado Pago manda mais de uma notificação para o MESMO pagamento
  // (payment.created quando o PIX é gerado, ainda "pending"; payment.updated
  // quando é de fato pago, "approved") — as duas com o mesmo data.id. Se a
  // chave de idempotência fosse só o data.id, a primeira (created, sem
  // efeito) consumiria a chave e a segunda (updated, a que realmente
  // confirma o pagamento) seria descartada como "duplicata".
  const eventoId = `${paymentId}:${body.action ?? body.type}`;

  try {
    await prisma.webhookEvent.create({ data: { origem: "MERCADO_PAGO", eventoId } });
  } catch {
    // Essa ação específica já foi processada (unique constraint em
    // origem+eventoId) — o Mercado Pago pode reenviar a mesma notificação
    // mais de uma vez.
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
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.pedido.updateMany({
        where: { id: pedidoId, lojaId: loja.id, status: "AGUARDANDO_PAGAMENTO" },
        data: { status: "PAGO", mpPaymentId: String(pagamento.id), pagoEm: new Date() },
      });

      if (count === 0) return;

      const pedido = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: { cliente: true },
      });
      if (!pedido) return;

      await notificarStatusAtualizado(tx, {
        lojaId: loja.id,
        lojaNome: loja.nome,
        clienteNome: pedido.cliente.nome,
        clienteEmail: pedido.cliente.email,
        pedidoId: pedido.id,
        status: "PAGO",
      });
    });
  }

  return NextResponse.json({ recebido: true });
}
