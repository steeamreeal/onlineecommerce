"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ProdutoForm } from "@/components/dashboard/produto-form";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export default function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: produto, isLoading, isError } = trpc.produtos.buscarPorId.useQuery({ id });

  if (isError) {
    notFound();
  }

  if (isLoading || !produto) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Editar produto</h1>
        <p className="text-muted-foreground text-sm">{produto.nome}</p>
      </div>
      <ProdutoForm produto={produto} />
    </div>
  );
}
