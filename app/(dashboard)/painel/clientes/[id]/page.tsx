"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ClienteDetalhe } from "@/components/dashboard/cliente-detalhe";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export default function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: cliente, isLoading, isError } = trpc.clientes.buscarPorId.useQuery({ id });

  if (isError) {
    notFound();
  }

  if (isLoading || !cliente) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <ClienteDetalhe cliente={cliente} />;
}
