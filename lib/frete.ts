// TipoFrete no schema Prisma é uma string livre (RETIRADA | ENTREGA_PROPRIA |
// FIXO | FAIXA_BAIRRO | FAIXA_CIDADE | CORREIOS), sem enum dedicado — os
// valores válidos são impostos pelo Zod no router (server/trpc/routers/frete.ts).
export type TipoFrete =
  | "RETIRADA"
  | "ENTREGA_PROPRIA"
  | "FIXO"
  | "FAIXA_BAIRRO"
  | "FAIXA_CIDADE"
  | "CORREIOS";

export const TIPO_FRETE_LABEL: Record<TipoFrete, string> = {
  RETIRADA: "Retirada na loja",
  ENTREGA_PROPRIA: "Entrega própria",
  FIXO: "Frete fixo",
  FAIXA_BAIRRO: "Taxa por bairro",
  FAIXA_CIDADE: "Taxa por cidade",
  CORREIOS: "Correios / transportadora",
};
