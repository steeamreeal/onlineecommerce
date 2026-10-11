import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/server/db/client";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    await prisma.webhookEvent.create({ data: { origem: "STRIPE", eventoId: event.id } });
  } catch {
    // Evento já processado (unique constraint em origem+eventoId) — Stripe
    // pode reenviar o mesmo evento mais de uma vez.
    return NextResponse.json({ recebido: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const lojaId = session.metadata?.lojaId;
        if (lojaId && typeof session.subscription === "string") {
          const lojaAtual = await prisma.loja.findUnique({
            where: { id: lojaId },
            select: { bloqueadoManualmente: true },
          });
          // Loja bloqueada à mão pelo admin continua bloqueada: só registra a
          // assinatura, quem libera é o admin (liberarLoja).
          await prisma.loja.update({
            where: { id: lojaId },
            data: {
              stripeSubscriptionId: session.subscription,
              ...(lojaAtual?.bloqueadoManualmente ? {} : { statusPlano: "ATIVO" as const }),
            },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const loja = await prisma.loja.findUnique({ where: { stripeSubscriptionId: subscription.id } });
        if (loja && !loja.bloqueadoManualmente) {
          const statusPlano = subscription.status === "active" || subscription.status === "trialing" ? "ATIVO" : "BLOQUEADO";
          await prisma.loja.update({ where: { id: loja.id }, data: { statusPlano } });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const loja = await prisma.loja.findUnique({ where: { stripeSubscriptionId: subscription.id } });
        if (loja) {
          await prisma.loja.update({ where: { id: loja.id }, data: { statusPlano: "CANCELADO" } });
        }
        break;
      }
    }
  } catch (erro) {
    // O evento foi marcado como processado ANTES do trabalho; se o trabalho
    // falhou, libera a marca para o reenvio da Stripe (resposta 500) não ser
    // descartado como duplicata.
    await prisma.webhookEvent
      .delete({ where: { origem_eventoId: { origem: "STRIPE", eventoId: event.id } } })
      .catch(() => undefined);
    console.error("Webhook Stripe falhou ao processar o evento:", event.id, erro);
    return NextResponse.json({ error: "Falha ao processar o evento." }, { status: 500 });
  }

  return NextResponse.json({ recebido: true });
}
