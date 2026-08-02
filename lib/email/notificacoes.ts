import type { Prisma, StatusPedido } from "@prisma/client";
import { emailConfigurado, REMETENTE_PADRAO, resend } from "@/lib/email/resend";
import {
  templateEstoqueBaixo,
  templatePedidoConfirmado,
  templateStatusAtualizado,
} from "@/lib/email/templates";

// Aviso de estoque baixo vai para quem administra a loja — não há um campo
// de "e-mail de contato" dedicado na Loja, então usamos o Administrador mais
// antigo vinculado a ela.
export async function buscarEmailAdministradorLoja(tx: Prisma.TransactionClient, lojaId: string) {
  const vinculo = await tx.usuarioLoja.findFirst({
    where: { lojaId, papel: "ADMINISTRADOR" },
    orderBy: { createdAt: "asc" },
    include: { usuario: true },
  });
  return vinculo?.usuario.email;
}

// Envio "best effort": falha no Resend nunca deve derrubar a criação/atualização
// do pedido ou o movimento de estoque — só registramos no console do servidor.
async function enviarEmail(destinatario: string | undefined | null, assunto: string, html: string) {
  if (!emailConfigurado || !destinatario) return;
  try {
    await resend.emails.send({ from: REMETENTE_PADRAO, to: destinatario, subject: assunto, html });
  } catch (error) {
    console.error("Falha ao enviar e-mail transacional:", error);
  }
}

export async function notificarPedidoConfirmado(
  tx: Prisma.TransactionClient,
  params: {
    lojaId: string;
    lojaNome: string;
    clienteNome: string;
    clienteEmail: string | null | undefined;
    pedidoId: string;
    valorTotal: number;
  },
) {
  const { assunto, html } = templatePedidoConfirmado(params);
  await enviarEmail(params.clienteEmail, assunto, html);
  await tx.notificacao.create({
    data: {
      lojaId: params.lojaId,
      tipo: "PEDIDO_NOVO",
      titulo: "Novo pedido recebido",
      mensagem: `Pedido #${params.pedidoId.slice(-6).toUpperCase()} de ${params.clienteNome}.`,
      pedidoId: params.pedidoId,
    },
  });
}

export async function notificarStatusAtualizado(
  tx: Prisma.TransactionClient,
  params: {
    lojaId: string;
    lojaNome: string;
    clienteNome: string;
    clienteEmail: string | null | undefined;
    pedidoId: string;
    status: StatusPedido;
  },
) {
  const { assunto, html } = templateStatusAtualizado(params);
  await enviarEmail(params.clienteEmail, assunto, html);
  await tx.notificacao.create({
    data: {
      lojaId: params.lojaId,
      tipo: "STATUS_ATUALIZADO",
      titulo: "Status do pedido atualizado",
      mensagem: `Pedido #${params.pedidoId.slice(-6).toUpperCase()} agora está "${params.status}".`,
      pedidoId: params.pedidoId,
    },
  });
}

// Chamado após qualquer baixa de estoque (venda ou saída manual). Notifica só
// quando a quantidade cruza o limite (estoque <= ESTOQUE_BAIXO_LIMITE) — o
// chamador é responsável por decidir se o cruzamento aconteceu, para não
// notificar a cada venda enquanto o estoque já está baixo.
export async function notificarEstoqueBaixo(
  tx: Prisma.TransactionClient,
  params: {
    lojaId: string;
    lojaNome: string;
    lojistaEmail: string | null | undefined;
    produtoNome: string;
    variacaoLabel: string;
    estoqueAtual: number;
  },
) {
  const { assunto, html } = templateEstoqueBaixo(params);
  await enviarEmail(params.lojistaEmail, assunto, html);
  await tx.notificacao.create({
    data: {
      lojaId: params.lojaId,
      tipo: "ESTOQUE_BAIXO",
      titulo: "Estoque baixo",
      mensagem: `${params.produtoNome} (${params.variacaoLabel}): restam ${params.estoqueAtual} unidades.`,
    },
  });
}
