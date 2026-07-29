export type Plano = {
  id: string;
  nome: string;
  precoMensal: number;
  limiteProdutos: number | null;
  limiteUsuarios: number | null;
  features: string[];
};

export const planosMock: Plano[] = [
  {
    id: "plano-start",
    nome: "Start",
    precoMensal: 49.9,
    limiteProdutos: 50,
    limiteUsuarios: 2,
    features: ["Site de vendas próprio", "Pagamento via PIX", "Suporte por e-mail"],
  },
  {
    id: "plano-pro",
    nome: "Pro",
    precoMensal: 129.9,
    limiteProdutos: 500,
    limiteUsuarios: 5,
    features: [
      "Tudo do Start",
      "Pagamento via cartão e boleto",
      "Cupons e promoções",
      "Domínio personalizado",
    ],
  },
  {
    id: "plano-escala",
    nome: "Escala",
    precoMensal: 299.9,
    limiteProdutos: null,
    limiteUsuarios: null,
    features: [
      "Tudo do Pro",
      "Produtos e usuários ilimitados",
      "Múltiplos vendedores",
      "Suporte prioritário via WhatsApp",
    ],
  },
];

export function planoNome(planoId: string): string {
  return planosMock.find((p) => p.id === planoId)?.nome ?? "Sem plano";
}

export function planoPorId(planoId: string): Plano | undefined {
  return planosMock.find((p) => p.id === planoId);
}
