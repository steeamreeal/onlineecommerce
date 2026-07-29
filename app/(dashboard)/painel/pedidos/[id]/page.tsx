import { notFound } from "next/navigation";
import { PedidoDetalhe } from "@/components/dashboard/pedido-detalhe";
import { pedidosMock } from "@/lib/mocks/pedidos";

export default async function PedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pedido = pedidosMock.find((p) => p.id === id);

  if (!pedido) {
    notFound();
  }

  return <PedidoDetalhe pedido={pedido} />;
}
