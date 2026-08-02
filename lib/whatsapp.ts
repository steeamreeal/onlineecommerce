import { STATUS_PEDIDO_LABEL } from "@/lib/pedidos";
import type { StatusPedido } from "@prisma/client";

// Números BR salvos no banco (Loja.whatsapp, Cliente.telefone) normalmente
// vêm sem DDI (10-11 dígitos: DDD + número), mas o usuário pode digitar o
// "+55" na hora do cadastro — nesse caso o número limpo já tem 12-13 dígitos
// começando em "55". Só prefixamos o DDI quando ele ainda não está presente,
// para não gerar um link duplicado (5555...) que o WhatsApp rejeita.
function linkWhatsapp(telefone: string, mensagem: string) {
  const numeroLimpo = telefone.replace(/\D/g, "");
  const jaTemDDI = numeroLimpo.length >= 12 && numeroLimpo.startsWith("55");
  const numeroComDDI = jaTemDDI ? numeroLimpo : `55${numeroLimpo}`;
  return `https://wa.me/${numeroComDDI}?text=${encodeURIComponent(mensagem)}`;
}

export function whatsappPedidoConfirmado(params: {
  telefone: string;
  clienteNome: string;
  lojaNome: string;
  pedidoId: string;
}) {
  const numero = params.pedidoId.slice(-6).toUpperCase();
  return linkWhatsapp(
    params.telefone,
    `Olá, ${params.clienteNome}! Recebemos seu pedido #${numero} na ${params.lojaNome}. Em breve te avisamos por aqui sobre cada atualização. 🙂`,
  );
}

export function whatsappStatusAtualizado(params: {
  telefone: string;
  clienteNome: string;
  lojaNome: string;
  pedidoId: string;
  status: StatusPedido;
}) {
  const numero = params.pedidoId.slice(-6).toUpperCase();
  const statusLabel = STATUS_PEDIDO_LABEL[params.status];
  return linkWhatsapp(
    params.telefone,
    `Olá, ${params.clienteNome}! Seu pedido #${numero} na ${params.lojaNome} agora está: ${statusLabel}.`,
  );
}

export function whatsappRecuperacaoCarrinho(params: {
  telefone: string;
  clienteNome: string;
  lojaNome: string;
}) {
  return linkWhatsapp(
    params.telefone,
    `Olá, ${params.clienteNome}! Vimos que você deixou alguns itens no carrinho da ${params.lojaNome}. Posso te ajudar a finalizar o pedido?`,
  );
}

// Usado pelo botão flutuante do site público (contato genérico, não amarrado
// a um pedido específico).
export function whatsappContatoLoja(params: { telefone: string; lojaNome: string }) {
  return linkWhatsapp(
    params.telefone,
    `Olá! Vim pelo site da ${params.lojaNome} e gostaria de mais informações.`,
  );
}
