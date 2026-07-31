"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ProdutoDetalhe } from "@/components/store/produto-detalhe";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export default function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const { data: produto, isLoading, isError } = trpc.lojaPublica.produtoPorId.useQuery({
    slug,
    id,
  });

  if (isError) notFound();

  if (isLoading || !produto) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-6 py-8">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <ProdutoDetalhe key={produto.id} produto={produto} slug={slug} />;
}
