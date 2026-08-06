"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { PedidoAcompanhamento } from "@/components/store/pedido-acompanhamento";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export default function PedidoAcompanhamentoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const { data: pedido, isLoading, isError } = trpc.lojaPublica.pedidoPorId.useQuery({
    slug,
    id,
  });

  if (isError) notFound();

  if (isLoading || !pedido) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-6 py-8">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <PedidoAcompanhamento key={pedido.id} pedido={pedido} slug={slug} />;
}
