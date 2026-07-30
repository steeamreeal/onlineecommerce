import type { Cupom, TipoCupom } from "@prisma/client";

export const TIPO_CUPOM_LABEL: Record<TipoCupom, string> = {
  PERCENTUAL: "Percentual",
  VALOR_FIXO: "Valor fixo",
  FRETE_GRATIS: "Frete grátis",
};

export type StatusCupom = "ATIVO" | "EXPIRADO" | "ESGOTADO" | "AGENDADO";

export function cupomStatus(cupom: Pick<Cupom, "inicio" | "fim" | "limiteUso" | "usosAtuais">): StatusCupom {
  const agora = new Date();
  if (agora < cupom.inicio) return "AGENDADO";
  if (agora > cupom.fim) return "EXPIRADO";
  if (cupom.limiteUso != null && cupom.usosAtuais >= cupom.limiteUso) return "ESGOTADO";
  return "ATIVO";
}
