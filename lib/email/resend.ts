import { Resend } from "resend";

// process.env.RESEND_API_KEY pode estar vazio em desenvolvimento e no build —
// o construtor do Resend lança se receber string vazia, então só instanciamos
// quando a key existe. Os helpers de envio (lib/email/notificacoes.ts) checam
// emailConfigurado antes de usar o client, para não derrubar fluxos de
// pedido/estoque por falta de e-mail.
export const emailConfigurado = Boolean(process.env.RESEND_API_KEY);

export const resend = new Resend(process.env.RESEND_API_KEY || "chave-ausente");

export const REMETENTE_PADRAO = process.env.RESEND_FROM_EMAIL ?? "Loja <onboarding@resend.dev>";
