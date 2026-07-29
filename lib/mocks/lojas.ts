export type StatusLoja = "ATIVA" | "BLOQUEADA" | "TESTE";

export type Loja = {
  id: string;
  nome: string;
  slug: string;
  responsavel: string;
  email: string;
  planoId: string;
  status: StatusLoja;
  faturamentoMes: number;
  numeroPedidosMes: number;
  createdAt: string;
};

export const lojasMock: Loja[] = [
  {
    id: "loja-1",
    nome: "Bella Moda",
    slug: "bella-moda",
    responsavel: "Ana Beatriz Souza",
    email: "contato@bellamoda.com.br",
    planoId: "plano-pro",
    status: "ATIVA",
    faturamentoMes: 18420.5,
    numeroPedidosMes: 142,
    createdAt: "2026-01-12T10:00:00Z",
  },
  {
    id: "loja-2",
    nome: "Casa & Cia Decorações",
    slug: "casa-cia",
    responsavel: "Carlos Eduardo Lima",
    email: "financeiro@casaecia.com.br",
    planoId: "plano-escala",
    status: "ATIVA",
    faturamentoMes: 41230.0,
    numeroPedidosMes: 298,
    createdAt: "2025-11-03T10:00:00Z",
  },
  {
    id: "loja-3",
    nome: "Tech Point Acessórios",
    slug: "tech-point",
    responsavel: "Fernanda Costa Marques",
    email: "fernanda@techpoint.com.br",
    planoId: "plano-start",
    status: "TESTE",
    faturamentoMes: 890.0,
    numeroPedidosMes: 9,
    createdAt: "2026-07-15T10:00:00Z",
  },
  {
    id: "loja-4",
    nome: "Pet Feliz",
    slug: "pet-feliz",
    responsavel: "João Pedro Almeida",
    email: "joao@petfeliz.com.br",
    planoId: "plano-pro",
    status: "BLOQUEADA",
    faturamentoMes: 0,
    numeroPedidosMes: 0,
    createdAt: "2026-03-22T10:00:00Z",
  },
  {
    id: "loja-5",
    nome: "Doce Sabor Confeitaria",
    slug: "doce-sabor",
    responsavel: "Mariana Ribeiro Dias",
    email: "mariana@docesabor.com.br",
    planoId: "plano-start",
    status: "ATIVA",
    faturamentoMes: 5320.75,
    numeroPedidosMes: 67,
    createdAt: "2026-05-08T10:00:00Z",
  },
  {
    id: "loja-6",
    nome: "Livraria Página Viva",
    slug: "pagina-viva",
    responsavel: "Rafael Torres",
    email: "rafael@paginaviva.com.br",
    planoId: "plano-escala",
    status: "ATIVA",
    faturamentoMes: 27650.3,
    numeroPedidosMes: 203,
    createdAt: "2025-09-30T10:00:00Z",
  },
];

export function lojaNome(lojaId: string): string {
  return lojasMock.find((l) => l.id === lojaId)?.nome ?? "Loja removida";
}
