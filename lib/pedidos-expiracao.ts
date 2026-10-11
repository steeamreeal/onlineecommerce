import type { PrismaClient } from "@prisma/client";
import { devolverEstoqueItens } from "@/server/trpc/routers/pedidos";
import { notificarStatusAtualizado } from "@/lib/email/notificacoes";

// Pedido pago via gateway que ninguém pagou segura estoque (e cupom) sem
// vender. Prazos: boleto compensa em dias; PIX/cartão/link não deveriam
// demorar mais que isso.
export const PRAZO_HORAS_BOLETO = 72;
export const PRAZO_HORAS_DEMAIS = 24;

const HORA_MS = 60 * 60 * 1000;

// Cancela pedidos AGUARDANDO_PAGAMENTO vencidos: devolve o estoque, estorna o
// uso do cupom e avisa o cliente. Cada pedido é "reivindicado" com um
// updateMany condicionado ao status — se um pagamento chegar (webhook) na
// mesma hora, só um dos dois vence e o estoque nunca é devolvido por um
// pedido que acabou de ser pago.
export async function expirarPedidosNaoPagos(prisma: PrismaClient, agora: Date = new Date()) {
  const limiteBoleto = new Date(agora.getTime() - PRAZO_HORAS_BOLETO * HORA_MS);
  const limiteDemais = new Date(agora.getTime() - PRAZO_HORAS_DEMAIS * HORA_MS);

  const vencidos = await prisma.pedido.findMany({
    where: {
      status: "AGUARDANDO_PAGAMENTO",
      OR: [
        { formaPagamento: "BOLETO", createdAt: { lt: limiteBoleto } },
        { formaPagamento: { not: "BOLETO" }, createdAt: { lt: limiteDemais } },
      ],
    },
    include: { itens: true, cliente: true, loja: { select: { id: true, nome: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  let expirados = 0;
  for (const pedido of vencidos) {
    const cancelou = await prisma.$transaction(async (tx) => {
      const { count } = await tx.pedido.updateMany({
        where: { id: pedido.id, status: "AGUARDANDO_PAGAMENTO" },
        data: { status: "CANCELADO" },
      });
      if (count === 0) return false;

      await devolverEstoqueItens(tx, pedido.itens, "Pedido expirado sem pagamento");
      if (pedido.cupomId) {
        await tx.cupom.updateMany({
          where: { id: pedido.cupomId, usosAtuais: { gt: 0 } },
          data: { usosAtuais: { decrement: 1 } },
        });
      }

      await notificarStatusAtualizado(tx, {
        lojaId: pedido.loja.id,
        lojaNome: pedido.loja.nome,
        clienteNome: pedido.cliente.nome,
        clienteEmail: pedido.cliente.email,
        pedidoId: pedido.id,
        status: "CANCELADO",
      });
      return true;
    });
    if (cancelou) expirados++;
  }

  return { analisados: vencidos.length, expirados };
}
