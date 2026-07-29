"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PedidoStatusBadge } from "@/components/dashboard/pedido-status-badge";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_PEDIDO_LABEL,
  pedidoValorProdutos,
  proximoStatus,
  type Pedido,
} from "@/lib/mocks/pedidos";
import { clientesMock } from "@/lib/mocks/clientes";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function PedidoDetalhe({ pedido: pedidoInicial }: { pedido: Pedido }) {
  const [pedido, setPedido] = useState(pedidoInicial);
  const cliente = clientesMock.find((c) => c.id === pedido.clienteId);
  const proximo = proximoStatus(pedido.status);

  function avancarStatus() {
    if (!proximo) return;
    // Mock: sem persistência real ainda (chega no M10, backend de pedidos)
    setPedido((atual) => ({ ...atual, status: proximo }));
    toast.success(`Pedido movido para "${STATUS_PEDIDO_LABEL[proximo]}".`);
  }

  const whatsappHref = cliente?.telefone
    ? `https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`
    : undefined;

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/painel/pedidos" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Pedido #{pedido.numero}</h1>
            <p className="text-muted-foreground text-sm">
              Criado em {formatoData.format(new Date(pedido.createdAt))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PedidoStatusBadge status={pedido.status} />
          {proximo && (
            <Button size="sm" onClick={avancarStatus}>
              Marcar como &quot;{STATUS_PEDIDO_LABEL[proximo]}&quot;
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Produtos</h2>
            <div className="flex flex-col divide-y">
              {pedido.itens.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{item.produtoNome}</div>
                    {item.variacaoLabel && (
                      <div className="text-muted-foreground text-xs">{item.variacaoLabel}</div>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {item.quantidade} x {formatoMoeda.format(item.precoUnit)}
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produtos</span>
                <span>{formatoMoeda.format(pedidoValorProdutos(pedido))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span>{formatoMoeda.format(pedido.valorFrete)}</span>
              </div>
              {pedido.valorDesconto > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Desconto {pedido.cupomCodigo && `(${pedido.cupomCodigo})`}
                  </span>
                  <span className="text-success">-{formatoMoeda.format(pedido.valorDesconto)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatoMoeda.format(pedido.valorTotal)}</span>
              </div>
            </div>
          </div>

          {pedido.eventosRastreio && pedido.eventosRastreio.length > 0 && (
            <div className="rounded-lg border p-4">
              <h2 className="mb-3 flex items-center gap-2 font-medium">
                <Truck className="size-4" />
                Rastreio
                {pedido.codigoRastreio && (
                  <span className="text-muted-foreground text-xs font-normal">
                    {pedido.codigoRastreio}
                  </span>
                )}
              </h2>
              <div className="flex flex-col gap-3">
                {pedido.eventosRastreio.map((evento, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-muted-foreground w-32 shrink-0 text-xs">
                      {formatoData.format(new Date(evento.data))}
                    </span>
                    <span>{evento.descricao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Cliente</h2>
            {cliente ? (
              <div className="flex flex-col gap-1 text-sm">
                <Link href={`/painel/clientes/${cliente.id}`} className="font-medium hover:underline">
                  {cliente.nome}
                </Link>
                {cliente.telefone && (
                  <span className="text-muted-foreground">{cliente.telefone}</span>
                )}
                {cliente.email && <span className="text-muted-foreground">{cliente.email}</span>}
                {whatsappHref && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    nativeButton={false}
                    render={<a href={whatsappHref} target="_blank" rel="noopener noreferrer" />}
                  >
                    <MessageCircle className="size-4" />
                    Falar no WhatsApp
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Cliente removido</p>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Pagamento e entrega</h2>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Forma de pagamento</span>
                <span>{FORMA_PAGAMENTO_LABEL[pedido.formaPagamento]}</span>
              </div>
              {pedido.enderecoEntrega && (
                <div className="pt-2">
                  <span className="text-muted-foreground">Endereço de entrega</span>
                  <p>{pedido.enderecoEntrega}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
