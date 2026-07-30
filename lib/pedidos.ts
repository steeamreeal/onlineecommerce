import type { FormaPagamento, StatusPedido } from "@prisma/client";

// Ordem do fluxo do kanban de pedidos — mesma ordem aplicada pelo backend em
// server/trpc/routers/pedidos.ts (ORDEM_STATUS) para validar transições.
export const STATUS_PEDIDO_ORDEM: StatusPedido[] = [
  "NOVO",
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EM_PREPARACAO",
  "ENVIADO",
  "PRONTO_RETIRADA",
  "ENTREGUE",
  "CANCELADO",
];

export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  NOVO: "Novo",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  EM_PREPARACAO: "Em preparação",
  ENVIADO: "Enviado",
  PRONTO_RETIRADA: "Pronto para retirada",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  PIX: "Pix",
  CARTAO: "Cartão",
  BOLETO: "Boleto",
  LINK_PAGAMENTO: "Link de pagamento",
  PAGAMENTO_ENTREGA: "Pagamento na entrega",
};

export function proximoStatus(status: StatusPedido): StatusPedido | undefined {
  if (status === "CANCELADO") return undefined;
  const indice = STATUS_PEDIDO_ORDEM.indexOf(status);
  const proximo = STATUS_PEDIDO_ORDEM[indice + 1];
  return proximo === "CANCELADO" ? undefined : proximo;
}

export function pedidoValorProdutos(itens: { quantidade: number; precoUnit: number }[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade * item.precoUnit, 0);
}
