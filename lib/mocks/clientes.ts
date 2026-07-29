import { pedidosMock } from "@/lib/mocks/pedidos";

export type EnderecoCliente = {
  id: string;
  rua: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep: string;
  principal: boolean;
};

export type Cliente = {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  documento?: string;
  enderecos: EnderecoCliente[];
  createdAt: string;
};

export const clientesMock: Cliente[] = [
  {
    id: "cli-1",
    nome: "Ana Beatriz Souza",
    telefone: "(11) 98888-1234",
    email: "ana.souza@email.com",
    documento: "123.456.789-00",
    enderecos: [
      {
        id: "end-1",
        rua: "Rua das Flores",
        numero: "120",
        bairro: "Jardim América",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01234-000",
        principal: true,
      },
    ],
    createdAt: "2026-02-10T14:00:00Z",
  },
  {
    id: "cli-2",
    nome: "Carlos Eduardo Lima",
    telefone: "(21) 97777-5678",
    email: "carlos.lima@email.com",
    documento: "987.654.321-00",
    enderecos: [
      {
        id: "end-2",
        rua: "Av. Atlântica",
        numero: "500",
        bairro: "Copacabana",
        cidade: "Rio de Janeiro",
        estado: "RJ",
        cep: "22010-000",
        principal: true,
      },
    ],
    createdAt: "2026-03-05T09:30:00Z",
  },
  {
    id: "cli-3",
    nome: "Fernanda Costa Marques",
    telefone: "(31) 96666-4321",
    email: "fernanda.marques@email.com",
    enderecos: [
      {
        id: "end-3",
        rua: "Rua Ouro Preto",
        numero: "88",
        bairro: "Savassi",
        cidade: "Belo Horizonte",
        estado: "MG",
        cep: "30140-000",
        principal: true,
      },
    ],
    createdAt: "2026-04-18T18:15:00Z",
  },
  {
    id: "cli-4",
    nome: "João Pedro Almeida",
    telefone: "(41) 95555-8765",
    email: "joao.almeida@email.com",
    documento: "111.222.333-44",
    enderecos: [
      {
        id: "end-4",
        rua: "Rua XV de Novembro",
        numero: "300",
        cidade: "Curitiba",
        estado: "PR",
        cep: "80020-000",
        principal: true,
      },
    ],
    createdAt: "2026-05-22T11:45:00Z",
  },
  {
    id: "cli-5",
    nome: "Mariana Ribeiro Dias",
    telefone: "(51) 94444-2468",
    enderecos: [],
    createdAt: "2026-06-30T16:20:00Z",
  },
];

export function clienteNome(clienteId: string): string {
  return clientesMock.find((c) => c.id === clienteId)?.nome ?? "Cliente removido";
}

export function enderecoPrincipal(cliente: Cliente): EnderecoCliente | undefined {
  return cliente.enderecos.find((e) => e.principal) ?? cliente.enderecos[0];
}

export type ResumoComprasCliente = {
  totalPedidos: number;
  totalGasto: number;
  ticketMedio: number;
  ultimaCompra?: string;
};

export function resumoComprasCliente(clienteId: string): ResumoComprasCliente {
  const pedidosDoCliente = pedidosMock.filter(
    (p) => p.clienteId === clienteId && p.status !== "CANCELADO",
  );
  const totalPedidos = pedidosDoCliente.length;
  const totalGasto = pedidosDoCliente.reduce((soma, p) => soma + p.valorTotal, 0);
  const ticketMedio = totalPedidos > 0 ? totalGasto / totalPedidos : 0;
  const ultimaCompra = pedidosDoCliente
    .map((p) => p.createdAt)
    .sort()
    .at(-1);

  return { totalPedidos, totalGasto, ticketMedio, ultimaCompra };
}
