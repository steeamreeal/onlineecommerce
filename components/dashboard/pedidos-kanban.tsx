"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_PEDIDO_LABEL,
  STATUS_PEDIDO_ORDEM,
  proximoStatus,
} from "@/lib/pedidos";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

export function PedidosKanban() {
  const [busca, setBusca] = useState("");
  const utils = trpc.useUtils();

  const { data: pedidos = [], isLoading } = trpc.pedidos.listar.useQuery({
    busca: busca.trim() || undefined,
  });
  const avancarStatus = trpc.pedidos.atualizarStatus.useMutation({
    onSuccess: () => utils.pedidos.listar.invalidate(),
  });
  const cancelarStatus = trpc.pedidos.atualizarStatus.useMutation({
    onSuccess: () => utils.pedidos.listar.invalidate(),
  });

  const pedidosFiltrados = useMemo(() => pedidos, [pedidos]);

  async function handleAvancar(pedido: (typeof pedidos)[number]) {
    const proximo = proximoStatus(pedido.status);
    if (!proximo) return;
    try {
      await avancarStatus.mutateAsync({ id: pedido.id, status: proximo });
      toast.success(`Pedido #${pedido.id.slice(-6).toUpperCase()} movido para "${STATUS_PEDIDO_LABEL[proximo]}".`);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message ? error.message : "Não foi possível avançar o pedido.";
      toast.error(mensagem);
    }
  }

  async function handleCancelar(pedido: (typeof pedidos)[number]) {
    if (!window.confirm(`Cancelar o pedido #${pedido.id.slice(-6).toUpperCase()}?`)) return;
    try {
      await cancelarStatus.mutateAsync({ id: pedido.id, status: "CANCELADO" });
      toast.success(`Pedido #${pedido.id.slice(-6).toUpperCase()} cancelado.`);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message ? error.message : "Não foi possível cancelar o pedido.";
      toast.error(mensagem);
    }
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

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && (
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
                            #{pedido.id.slice(-6).toUpperCase()}
                          </Link>
                          <span className="text-muted-foreground text-xs">
                            {formatoData.format(new Date(pedido.createdAt))}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          {pedido.cliente?.nome ?? "Cliente removido"}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {formatoMoeda.format(Number(pedido.valorTotal))}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {FORMA_PAGAMENTO_LABEL[pedido.formaPagamento]}
                          </span>
                        </div>
                        {proximo && (
                          <div className="mt-1 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 justify-between"
                              disabled={avancarStatus.isPending}
                              onClick={() => handleAvancar(pedido)}
                            >
                              {STATUS_PEDIDO_LABEL[proximo]}
                              <ArrowRight className="size-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={cancelarStatus.isPending}
                              onClick={() => handleCancelar(pedido)}
                              aria-label="Cancelar pedido"
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
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
      )}
    </div>
  );
}
