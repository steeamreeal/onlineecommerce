import { STATUS_PEDIDO_LABEL } from "@/lib/pedidos";
import type { StatusPedido } from "@prisma/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function templatePedidoConfirmado(params: {
  lojaNome: string;
  clienteNome: string;
  pedidoId: string;
  valorTotal: number;
}) {
  const numero = params.pedidoId.slice(-6).toUpperCase();
  return {
    assunto: `Pedido #${numero} confirmado — ${params.lojaNome}`,
    html: `
      <p>Olá, ${params.clienteNome}!</p>
      <p>Recebemos seu pedido <strong>#${numero}</strong> na loja <strong>${params.lojaNome}</strong>.</p>
      <p>Valor total: <strong>${formatoMoeda.format(params.valorTotal)}</strong></p>
      <p>Você será avisado por e-mail a cada atualização do status do pedido.</p>
    `,
  };
}

export function templateStatusAtualizado(params: {
  lojaNome: string;
  clienteNome: string;
  pedidoId: string;
  status: StatusPedido;
}) {
  const numero = params.pedidoId.slice(-6).toUpperCase();
  const statusLabel = STATUS_PEDIDO_LABEL[params.status];
  return {
    assunto: `Pedido #${numero}: ${statusLabel} — ${params.lojaNome}`,
    html: `
      <p>Olá, ${params.clienteNome}!</p>
      <p>Seu pedido <strong>#${numero}</strong> na loja <strong>${params.lojaNome}</strong> teve o status atualizado para:</p>
      <p style="font-size: 1.1em"><strong>${statusLabel}</strong></p>
    `,
  };
}

export function templateEstoqueBaixo(params: {
  lojaNome: string;
  produtoNome: string;
  variacaoLabel: string;
  estoqueAtual: number;
}) {
  return {
    assunto: `Estoque baixo: ${params.produtoNome} — ${params.lojaNome}`,
    html: `
      <p>O produto <strong>${params.produtoNome}</strong> (${params.variacaoLabel}) está com estoque baixo.</p>
      <p>Quantidade atual: <strong>${params.estoqueAtual}</strong></p>
      <p>Acesse o painel da loja para repor o estoque.</p>
    `,
  };
}
