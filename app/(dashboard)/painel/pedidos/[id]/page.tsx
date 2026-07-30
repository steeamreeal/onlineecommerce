"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { PedidoDetalhe } from "@/components/dashboard/pedido-detalhe";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export default function PedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: pedido, isLoading, isError } = trpc.pedidos.buscarPorId.useQuery({ id });

  if (isError) {
    notFound();
  }

  if (isLoading || !pedido) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <PedidoDetalhe pedido={pedido} />;
}
