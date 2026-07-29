export type TipoCupom = "PERCENTUAL" | "VALOR_FIXO" | "FRETE_GRATIS";

export const TIPO_CUPOM_LABEL: Record<TipoCupom, string> = {
  PERCENTUAL: "Percentual",
  VALOR_FIXO: "Valor fixo",
  FRETE_GRATIS: "Frete grátis",
};

export type Cupom = {
  id: string;
  codigo: string;
  tipo: TipoCupom;
  valor?: number;
  inicio: string;
  fim: string;
  limiteUso?: number;
  usosAtuais: number;
};

export const cuponsMock: Cupom[] = [
  {
    id: "cup-1",
    codigo: "BEMVINDO20",
    tipo: "PERCENTUAL",
    valor: 20,
    inicio: "2026-01-01T00:00:00Z",
    fim: "2026-12-31T23:59:59Z",
    limiteUso: 500,
    usosAtuais: 128,
  },
  {
    id: "cup-2",
    codigo: "FRETE10",
    tipo: "FRETE_GRATIS",
    inicio: "2026-06-01T00:00:00Z",
    fim: "2026-08-31T23:59:59Z",
    limiteUso: 200,
    usosAtuais: 200,
  },
  {
    id: "cup-3",
    codigo: "PROMO30",
    tipo: "VALOR_FIXO",
    valor: 30,
    inicio: "2026-07-01T00:00:00Z",
    fim: "2026-07-15T23:59:59Z",
    limiteUso: 50,
    usosAtuais: 47,
  },
  {
    id: "cup-4",
    codigo: "NATAL15",
    tipo: "PERCENTUAL",
    valor: 15,
    inicio: "2025-12-01T00:00:00Z",
    fim: "2025-12-25T23:59:59Z",
    usosAtuais: 89,
  },
];

export function cupomStatus(cupom: Cupom): "ATIVO" | "EXPIRADO" | "ESGOTADO" | "AGENDADO" {
  const agora = new Date("2026-07-29T12:00:00Z").getTime();
  const inicio = new Date(cupom.inicio).getTime();
  const fim = new Date(cupom.fim).getTime();
  if (agora < inicio) return "AGENDADO";
  if (agora > fim) return "EXPIRADO";
  if (cupom.limiteUso != null && cupom.usosAtuais >= cupom.limiteUso) return "ESGOTADO";
  return "ATIVO";
}
