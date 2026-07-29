export type StatusPedido =
  | "NOVO"
  | "AGUARDANDO_PAGAMENTO"
  | "PAGO"
  | "EM_PREPARACAO"
  | "ENVIADO"
  | "PRONTO_RETIRADA"
  | "ENTREGUE"
  | "CANCELADO";

export const STATUS_PEDIDO_ORDEM: StatusPedido[] = [
  "NOVO",
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EM_PREPARACAO",
  "ENVIADO",
  "PRONTO_RETIRADA",
  "ENTREGUE",
  "CANCELADO",
];

export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  NOVO: "Novo",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  EM_PREPARACAO: "Em preparação",
  ENVIADO: "Enviado",
  PRONTO_RETIRADA: "Pronto para retirada",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

export type FormaPagamento =
  | "PIX"
  | "CARTAO"
  | "BOLETO"
  | "LINK_PAGAMENTO"
  | "PAGAMENTO_ENTREGA";

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  PIX: "Pix",
  CARTAO: "Cartão",
  BOLETO: "Boleto",
  LINK_PAGAMENTO: "Link de pagamento",
  PAGAMENTO_ENTREGA: "Pagamento na entrega",
};

export type ItemPedido = {
  id: string;
  produtoNome: string;
  variacaoLabel?: string;
  quantidade: number;
  precoUnit: number;
};

export type EventoRastreio = {
  data: string;
  descricao: string;
};

export type Pedido = {
  id: string;
  numero: string;
  clienteId: string;
  status: StatusPedido;
  formaPagamento: FormaPagamento;
  itens: ItemPedido[];
  valorFrete: number;
  valorDesconto: number;
  valorTotal: number;
  cupomCodigo?: string;
  codigoRastreio?: string;
  eventosRastreio?: EventoRastreio[];
  enderecoEntrega?: string;
  createdAt: string;
};

export const pedidosMock: Pedido[] = [
  {
    id: "ped-1",
    numero: "1001",
    clienteId: "cli-1",
    status: "NOVO",
    formaPagamento: "PIX",
    itens: [
      { id: "it-1", produtoNome: "Camiseta Básica Algodão", variacaoLabel: "Preto / M", quantidade: 2, precoUnit: 59.9 },
    ],
    valorFrete: 15,
    valorDesconto: 0,
    valorTotal: 134.8,
    enderecoEntrega: "Rua das Flores, 120 - Jardim América, São Paulo/SP",
    createdAt: "2026-07-27T10:00:00Z",
  },
  {
    id: "ped-2",
    numero: "1002",
    clienteId: "cli-2",
    status: "AGUARDANDO_PAGAMENTO",
    formaPagamento: "BOLETO",
    itens: [
      { id: "it-2", produtoNome: "Tênis Corrida Pro", variacaoLabel: "42", quantidade: 1, precoUnit: 299.9 },
    ],
    valorFrete: 25,
    valorDesconto: 20,
    valorTotal: 304.9,
    cupomCodigo: "BEMVINDO20",
    enderecoEntrega: "Av. Atlântica, 500 - Copacabana, Rio de Janeiro/RJ",
    createdAt: "2026-07-26T15:30:00Z",
  },
  {
    id: "ped-3",
    numero: "1003",
    clienteId: "cli-3",
    status: "PAGO",
    formaPagamento: "CARTAO",
    itens: [
      { id: "it-3", produtoNome: "Bolsa Transversal Couro", quantidade: 1, precoUnit: 189.9 },
      { id: "it-4", produtoNome: "Camiseta Básica Algodão", variacaoLabel: "Branco / M", quantidade: 1, precoUnit: 79.9 },
    ],
    valorFrete: 0,
    valorDesconto: 0,
    valorTotal: 269.8,
    enderecoEntrega: "Rua Ouro Preto, 88 - Savassi, Belo Horizonte/MG",
    createdAt: "2026-07-25T09:10:00Z",
  },
  {
    id: "ped-4",
    numero: "1004",
    clienteId: "cli-4",
    status: "EM_PREPARACAO",
    formaPagamento: "PIX",
    itens: [
      { id: "it-5", produtoNome: "Tênis Corrida Pro", variacaoLabel: "40", quantidade: 1, precoUnit: 299.9 },
    ],
    valorFrete: 18,
    valorDesconto: 0,
    valorTotal: 317.9,
    enderecoEntrega: "Rua XV de Novembro, 300, Curitiba/PR",
    createdAt: "2026-07-24T13:45:00Z",
  },
  {
    id: "ped-5",
    numero: "1005",
    clienteId: "cli-1",
    status: "ENVIADO",
    formaPagamento: "CARTAO",
    itens: [
      { id: "it-6", produtoNome: "Bolsa Transversal Couro", quantidade: 2, precoUnit: 189.9 },
    ],
    valorFrete: 20,
    valorDesconto: 0,
    valorTotal: 399.8,
    codigoRastreio: "BR123456789BR",
    eventosRastreio: [
      { data: "2026-07-22T08:00:00Z", descricao: "Pedido postado nos Correios" },
      { data: "2026-07-23T14:00:00Z", descricao: "Em trânsito para São Paulo/SP" },
    ],
    enderecoEntrega: "Rua das Flores, 120 - Jardim América, São Paulo/SP",
    createdAt: "2026-07-21T11:20:00Z",
  },
  {
    id: "ped-6",
    numero: "1006",
    clienteId: "cli-2",
    status: "PRONTO_RETIRADA",
    formaPagamento: "PIX",
    itens: [
      { id: "it-7", produtoNome: "Camiseta Básica Algodão", variacaoLabel: "Preto / P", quantidade: 3, precoUnit: 59.9 },
    ],
    valorFrete: 0,
    valorDesconto: 0,
    valorTotal: 179.7,
    createdAt: "2026-07-20T16:00:00Z",
  },
  {
    id: "ped-7",
    numero: "1007",
    clienteId: "cli-3",
    status: "ENTREGUE",
    formaPagamento: "LINK_PAGAMENTO",
    itens: [
      { id: "it-8", produtoNome: "Tênis Corrida Pro", variacaoLabel: "38", quantidade: 1, precoUnit: 299.9 },
    ],
    valorFrete: 22,
    valorDesconto: 30,
    valorTotal: 291.9,
    cupomCodigo: "FRETE10",
    codigoRastreio: "BR987654321BR",
    eventosRastreio: [
      { data: "2026-07-10T08:00:00Z", descricao: "Pedido postado nos Correios" },
      { data: "2026-07-12T09:30:00Z", descricao: "Saiu para entrega" },
      { data: "2026-07-12T17:45:00Z", descricao: "Entregue ao destinatário" },
    ],
    enderecoEntrega: "Rua Ouro Preto, 88 - Savassi, Belo Horizonte/MG",
    createdAt: "2026-07-09T10:00:00Z",
  },
  {
    id: "ped-8",
    numero: "1008",
    clienteId: "cli-4",
    status: "CANCELADO",
    formaPagamento: "CARTAO",
    itens: [
      { id: "it-9", produtoNome: "Bolsa Transversal Couro", quantidade: 1, precoUnit: 189.9 },
    ],
    valorFrete: 15,
    valorDesconto: 0,
    valorTotal: 204.9,
    createdAt: "2026-07-08T12:00:00Z",
  },
  {
    id: "ped-9",
    numero: "1009",
    clienteId: "cli-1",
    status: "PAGO",
    formaPagamento: "PIX",
    itens: [
      { id: "it-10", produtoNome: "Tênis Corrida Pro", variacaoLabel: "41", quantidade: 1, precoUnit: 299.9 },
      { id: "it-11", produtoNome: "Camiseta Básica Algodão", variacaoLabel: "Branco / M", quantidade: 2, precoUnit: 79.9 },
    ],
    valorFrete: 0,
    valorDesconto: 0,
    valorTotal: 459.7,
    enderecoEntrega: "Rua das Flores, 120 - Jardim América, São Paulo/SP",
    createdAt: "2026-07-28T08:30:00Z",
  },
];

export function pedidoValorProdutos(pedido: Pedido): number {
  return pedido.itens.reduce((soma, item) => soma + item.quantidade * item.precoUnit, 0);
}

export function proximoStatus(status: StatusPedido): StatusPedido | undefined {
  if (status === "CANCELADO") return undefined;
  const indice = STATUS_PEDIDO_ORDEM.indexOf(status);
  const proximo = STATUS_PEDIDO_ORDEM[indice + 1];
  return proximo === "CANCELADO" ? undefined : proximo;
}
