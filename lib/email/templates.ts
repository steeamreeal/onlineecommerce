import { STATUS_PEDIDO_LABEL } from "@/lib/pedidos";
import { PAPEL_USUARIO_LABEL } from "@/lib/papel-usuario";
import type { PapelUsuario, StatusPedido } from "@prisma/client";
import { botaoEmail, CORES, layoutEmail } from "@/lib/email/layout";

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
    html: layoutEmail({
      tituloSecao: "Pedido confirmado",
      conteudo: `
        <p style="margin:0 0 12px;">Olá, ${params.clienteNome}!</p>
        <p style="margin:0 0 12px;">
          Recebemos seu pedido <strong>#${numero}</strong> na loja <strong>${params.lojaNome}</strong>.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background-color:${CORES.background};border-radius:8px;">
          <tr>
            <td style="padding:14px 16px;font-size:13px;color:${CORES.mutedForeground};">Valor total</td>
            <td style="padding:14px 16px;font-size:16px;font-weight:700;color:${CORES.foreground};text-align:right;">
              ${formatoMoeda.format(params.valorTotal)}
            </td>
          </tr>
        </table>
        <p style="margin:0;color:${CORES.mutedForeground};">
          Você será avisado por e-mail a cada atualização do status do pedido.
        </p>
      `,
    }),
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
    html: layoutEmail({
      tituloSecao: "Atualização de pedido",
      conteudo: `
        <p style="margin:0 0 12px;">Olá, ${params.clienteNome}!</p>
        <p style="margin:0 0 16px;">
          Seu pedido <strong>#${numero}</strong> na loja <strong>${params.lojaNome}</strong> teve o status atualizado para:
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
          <tr>
            <td style="padding:8px 16px;background-color:${CORES.background};border-radius:999px;font-size:14px;font-weight:700;color:${CORES.primary};">
              ${statusLabel}
            </td>
          </tr>
        </table>
      `,
    }),
  };
}

export function templateEstoqueBaixo(params: {
  lojaNome: string;
  produtoNome: string;
  variacaoLabel: string;
  estoqueAtual: number;
  urlEstoque?: string;
}) {
  return {
    assunto: `Estoque baixo: ${params.produtoNome} — ${params.lojaNome}`,
    html: layoutEmail({
      tituloSecao: "Aviso de estoque",
      corAcento: CORES.warning,
      conteudo: `
        <p style="margin:0 0 12px;">
          O produto <strong>${params.produtoNome}</strong> (${params.variacaoLabel}) está com estoque baixo na loja <strong>${params.lojaNome}</strong>.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background-color:${CORES.background};border-radius:8px;">
          <tr>
            <td style="padding:14px 16px;font-size:13px;color:${CORES.mutedForeground};">Quantidade atual</td>
            <td style="padding:14px 16px;font-size:16px;font-weight:700;color:${CORES.destructive};text-align:right;">
              ${params.estoqueAtual}
            </td>
          </tr>
        </table>
        ${botaoEmail({ texto: "Repor estoque", url: params.urlEstoque })}
      `,
    }),
  };
}

export function templateConviteLoja(params: {
  lojaNome: string;
  papel: PapelUsuario;
  urlConvite: string;
}) {
  const papelLabel = PAPEL_USUARIO_LABEL[params.papel];
  return {
    assunto: `Você foi convidado para a equipe de ${params.lojaNome}`,
    html: layoutEmail({
      tituloSecao: "Convite para a equipe",
      conteudo: `
        <p style="margin:0 0 12px;">
          Você foi convidado para fazer parte da equipe da loja <strong>${params.lojaNome}</strong>, com o papel de <strong>${papelLabel}</strong>.
        </p>
        <p style="margin:0 0 4px;color:${CORES.mutedForeground};">
          Clique no botão abaixo para aceitar o convite e criar seu acesso.
        </p>
        ${botaoEmail({ texto: "Aceitar convite", url: params.urlConvite })}
        <p style="margin:16px 0 0;font-size:12px;color:${CORES.mutedForeground};">
          Este convite expira em 72 horas. Se você não esperava este e-mail, pode ignorá-lo.
        </p>
      `,
    }),
  };
}
