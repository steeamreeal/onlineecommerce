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

export type OpcaoFrete = {
  id: string;
  tipo: TipoFrete;
  nome: string;
  valor?: number;
  freteGratisAcimaDe?: number;
  ativo: boolean;
};

export const opcoesFreteMock: OpcaoFrete[] = [
  {
    id: "frete-1",
    tipo: "RETIRADA",
    nome: "Retirar na loja",
    valor: 0,
    ativo: true,
  },
  {
    id: "frete-2",
    tipo: "ENTREGA_PROPRIA",
    nome: "Entrega própria (mesma cidade)",
    valor: 12,
    freteGratisAcimaDe: 150,
    ativo: true,
  },
  {
    id: "frete-3",
    tipo: "CORREIOS",
    nome: "Correios (PAC/SEDEX)",
    ativo: true,
  },
  {
    id: "frete-4",
    tipo: "FIXO",
    nome: "Frete fixo nacional",
    valor: 25,
    freteGratisAcimaDe: 300,
    ativo: false,
  },
];
