"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_PEDIDO_LABEL,
  STATUS_PEDIDO_ORDEM,
  pedidosMock,
  proximoStatus,
  type Pedido,
} from "@/lib/mocks/pedidos";
import { clienteNome } from "@/lib/mocks/clientes";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

export function PedidosKanban() {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosMock);
  const [busca, setBusca] = useState("");

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo.length === 0) return pedidos;
    return pedidos.filter(
      (pedido) =>
        pedido.numero.includes(termo) ||
        clienteNome(pedido.clienteId).toLowerCase().includes(termo),
    );
  }, [pedidos, busca]);

  function avancarStatus(pedido: Pedido) {
    const proximo = proximoStatus(pedido.status);
    if (!proximo) return;
    // Mock: sem persistência real ainda (chega no M10, backend de pedidos)
    setPedidos((atual) =>
      atual.map((p) => (p.id === pedido.id ? { ...p, status: proximo } : p)),
    );
    toast.success(`Pedido #${pedido.numero} movido para "${STATUS_PEDIDO_LABEL[proximo]}".`);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe e avance os pedidos pelo fluxo de status.
          </p>
        </div>
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número ou cliente"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {STATUS_PEDIDO_ORDEM.map((status) => {
          const pedidosDaColuna = pedidosFiltrados.filter((p) => p.status === status);
          return (
            <div
              key={status}
              className="flex w-72 shrink-0 flex-col gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-medium">{STATUS_PEDIDO_LABEL[status]}</h2>
                <span className="text-muted-foreground text-xs">{pedidosDaColuna.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {pedidosDaColuna.map((pedido) => {
                  const proximo = proximoStatus(pedido.status);
                  return (
                    <div
                      key={pedido.id}
                      className="bg-background flex flex-col gap-2 rounded-md border p-3 text-sm shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/painel/pedidos/${pedido.id}`}
                          className="font-medium hover:underline"
                        >
                          #{pedido.numero}
                        </Link>
                        <span className="text-muted-foreground text-xs">
                          {formatoData.format(new Date(pedido.createdAt))}
                        </span>
                      </div>
                      <div className="text-muted-foreground">{clienteNome(pedido.clienteId)}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatoMoeda.format(pedido.valorTotal)}</span>
                        <span className="text-muted-foreground text-xs">
                          {FORMA_PAGAMENTO_LABEL[pedido.formaPagamento]}
                        </span>
                      </div>
                      {proximo && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1 justify-between"
                          onClick={() => avancarStatus(pedido)}
                        >
                          {STATUS_PEDIDO_LABEL[proximo]}
                          <ArrowRight className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {pedidosDaColuna.length === 0 && (
                  <p className="text-muted-foreground px-1 text-xs">Nenhum pedido</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
