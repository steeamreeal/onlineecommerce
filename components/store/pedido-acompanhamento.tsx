"use client";

import Link from "next/link";
import { ArrowLeft, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PedidoStatusBadge } from "@/components/dashboard/pedido-status-badge";
import { FORMA_PAGAMENTO_LABEL, pedidoValorProdutos } from "@/lib/pedidos";
import { variacaoLabel } from "@/lib/estoque";
import type { RouterOutputs } from "@/lib/trpc/types";

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

type Pedido = RouterOutputs["lojaPublica"]["pedidoPorId"];

export function PedidoAcompanhamento({ pedido, slug }: { pedido: Pedido; slug: string }) {
  const cliente = pedido.cliente;
  const enderecoPrincipal = cliente?.enderecos?.find((e) => e.principal) ?? cliente?.enderecos?.[0];
  const enderecoEntrega = enderecoPrincipal
    ? `${enderecoPrincipal.rua}${enderecoPrincipal.numero ? `, ${enderecoPrincipal.numero}` : ""}${
        enderecoPrincipal.bairro ? ` - ${enderecoPrincipal.bairro}` : ""
      }, ${enderecoPrincipal.cidade}/${enderecoPrincipal.estado}`
    : undefined;

  const itensComValor = pedido.itens.map((item) => ({
    quantidade: item.quantidade,
    precoUnit: Number(item.precoUnit),
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/loja/${slug}`} />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Pedido #{pedido.id.slice(-6).toUpperCase()}</h1>
          <p className="text-muted-foreground text-sm">
            Feito em {formatoData.format(new Date(pedido.createdAt))}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <span className="text-sm font-medium">Status do pedido</span>
        <PedidoStatusBadge status={pedido.status} />
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-medium">Produtos</h2>
        <div className="flex flex-col divide-y">
          {pedido.itens.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="font-medium">{item.produto.nome}</div>
                {item.variacao && (
                  <div className="text-muted-foreground text-xs">{variacaoLabel(item.variacao)}</div>
                )}
              </div>
              <div className="text-muted-foreground">
                {item.quantidade} x {formatoMoeda.format(Number(item.precoUnit))}
              </div>
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Produtos</span>
            <span>{formatoMoeda.format(pedidoValorProdutos(itensComValor))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frete</span>
            <span>{formatoMoeda.format(Number(pedido.valorFrete))}</span>
          </div>
          {Number(pedido.valorDesconto) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desconto</span>
              <span className="text-success">-{formatoMoeda.format(Number(pedido.valorDesconto))}</span>
            </div>
          )}
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{formatoMoeda.format(Number(pedido.valorTotal))}</span>
          </div>
        </div>
      </div>

      {pedido.codigoRastreio && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 flex items-center gap-2 font-medium">
            <Truck className="size-4" />
            Rastreio
          </h2>
          <p className="text-muted-foreground text-sm">{pedido.codigoRastreio}</p>
        </div>
      )}

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-medium">Pagamento e entrega</h2>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Forma de pagamento</span>
            <span>{FORMA_PAGAMENTO_LABEL[pedido.formaPagamento]}</span>
          </div>
          {enderecoEntrega && (
            <div className="pt-2">
              <span className="text-muted-foreground">Endereço de entrega</span>
              <p>{enderecoEntrega}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
