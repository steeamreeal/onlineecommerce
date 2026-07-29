import { pedidosMock } from "@/lib/mocks/pedidos";
import { produtosMock, ESTOQUE_BAIXO_LIMITE, estoqueTotal } from "@/lib/mocks/produtos";
import { clientesMock, resumoComprasCliente } from "@/lib/mocks/clientes";

export type VendaPorDia = {
  data: string;
  valor: number;
};

const pedidosValidos = pedidosMock.filter((p) => p.status !== "CANCELADO");

export function faturamentoTotal(): number {
  return pedidosValidos.reduce((soma, p) => soma + p.valorTotal, 0);
}

export function numeroPedidos(): number {
  return pedidosValidos.length;
}

export function ticketMedio(): number {
  const total = numeroPedidos();
  return total > 0 ? faturamentoTotal() / total : 0;
}

export function pedidosPendentes(): number {
  return pedidosMock.filter((p) => !["ENTREGUE", "CANCELADO"].includes(p.status)).length;
}

export function produtosEstoqueBaixo(): number {
  return produtosMock.filter((p) => estoqueTotal(p) <= ESTOQUE_BAIXO_LIMITE).length;
}

export type ProdutoMaisVendido = {
  nome: string;
  quantidade: number;
};

export function produtosMaisVendidos(limite = 5): ProdutoMaisVendido[] {
  const contagem = new Map<string, number>();
  for (const pedido of pedidosValidos) {
    for (const item of pedido.itens) {
      contagem.set(item.produtoNome, (contagem.get(item.produtoNome) ?? 0) + item.quantidade);
    }
  }
  return [...contagem.entries()]
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, limite);
}

export type ClienteTop = {
  id: string;
  nome: string;
  totalGasto: number;
};

export function clientesQueMaisCompram(limite = 5): ClienteTop[] {
  return clientesMock
    .map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      totalGasto: resumoComprasCliente(cliente.id).totalGasto,
    }))
    .filter((c) => c.totalGasto > 0)
    .sort((a, b) => b.totalGasto - a.totalGasto)
    .slice(0, limite);
}

export function vendasPorDia(dias = 14): VendaPorDia[] {
  const hoje = new Date("2026-07-29T00:00:00Z");
  const porData = new Map<string, number>();

  for (let i = dias - 1; i >= 0; i--) {
    const data = new Date(hoje);
    data.setUTCDate(data.getUTCDate() - i);
    porData.set(data.toISOString().slice(0, 10), 0);
  }

  for (const pedido of pedidosValidos) {
    const chave = pedido.createdAt.slice(0, 10);
    if (porData.has(chave)) {
      porData.set(chave, (porData.get(chave) ?? 0) + pedido.valorTotal);
    }
  }

  return [...porData.entries()].map(([data, valor]) => ({ data, valor }));
}
