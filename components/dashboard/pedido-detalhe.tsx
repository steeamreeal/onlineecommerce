"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircle, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PedidoStatusBadge } from "@/components/dashboard/pedido-status-badge";
import { FORMA_PAGAMENTO_LABEL, STATUS_PEDIDO_LABEL, pedidoValorProdutos, proximoStatus } from "@/lib/pedidos";
import { variacaoLabel } from "@/lib/estoque";
import { trpc } from "@/lib/trpc/client";
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

type Pedido = RouterOutputs["pedidos"]["buscarPorId"];

export function PedidoDetalhe({ pedido }: { pedido: Pedido }) {
  const utils = trpc.useUtils();
  const atualizarStatus = trpc.pedidos.atualizarStatus.useMutation({
    onSuccess: () => utils.pedidos.buscarPorId.invalidate({ id: pedido.id }),
  });
  const proximo = proximoStatus(pedido.status);
  const cliente = pedido.cliente;

  async function avancarStatus() {
    if (!proximo) return;
    try {
      await atualizarStatus.mutateAsync({ id: pedido.id, status: proximo });
      toast.success(`Pedido movido para "${STATUS_PEDIDO_LABEL[proximo]}".`);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message ? error.message : "Não foi possível avançar o pedido.";
      toast.error(mensagem);
    }
  }

  const enderecoPrincipal = cliente?.enderecos?.find((e) => e.principal) ?? cliente?.enderecos?.[0];
  const enderecoEntrega = enderecoPrincipal
    ? `${enderecoPrincipal.rua}${enderecoPrincipal.numero ? `, ${enderecoPrincipal.numero}` : ""}${
        enderecoPrincipal.bairro ? ` - ${enderecoPrincipal.bairro}` : ""
      }, ${enderecoPrincipal.cidade}/${enderecoPrincipal.estado}`
    : undefined;

  const whatsappHref = cliente?.telefone
    ? `https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`
    : undefined;

  const itensComValor = pedido.itens.map((item) => ({
    quantidade: item.quantidade,
    precoUnit: Number(item.precoUnit),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/painel/pedidos" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Pedido #{pedido.id.slice(-6).toUpperCase()}</h1>
            <p className="text-muted-foreground text-sm">
              Criado em {formatoData.format(new Date(pedido.createdAt))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PedidoStatusBadge status={pedido.status} />
          {proximo && (
            <Button size="sm" onClick={avancarStatus} disabled={atualizarStatus.isPending}>
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
                    <div className="font-medium">{item.produto.nome}</div>
                    {item.variacao && (
                      <div className="text-muted-foreground text-xs">
                        {variacaoLabel(item.variacao)}
                      </div>
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
                  <span className="text-muted-foreground">
                    Desconto {pedido.cupom && `(${pedido.cupom.codigo})`}
                  </span>
                  <span className="text-success">
                    -{formatoMoeda.format(Number(pedido.valorDesconto))}
                  </span>
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
              <h2 className="mb-3 flex items-center gap-2 font-medium">
                <Truck className="size-4" />
                Rastreio
                <span className="text-muted-foreground text-xs font-normal">
                  {pedido.codigoRastreio}
                </span>
              </h2>
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
              {enderecoEntrega && (
                <div className="pt-2">
                  <span className="text-muted-foreground">Endereço de entrega</span>
                  <p>{enderecoEntrega}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
