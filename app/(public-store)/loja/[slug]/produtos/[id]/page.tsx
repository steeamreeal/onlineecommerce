"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ProdutoDetalhe } from "@/components/store/produto-detalhe";
import { ThemeRendererProduto } from "@/components/store/theme-renderer-produto";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { CONFIG_SELOS_VAZIA, type TemaProdutoConfig, type ConfigSelos } from "@/lib/tema-loja";

export default function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const { data: loja } = trpc.lojaPublica.porSlug.useQuery({ slug });
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

  const temaProdutoConfig = loja?.temaProdutoConfig as TemaProdutoConfig | null;

  // Lojas que já abriram o editor de tema da página de produto têm a config
  // salva e usam o ThemeRendererProduto (seções configuráveis, iguais pra
  // todos os produtos). As demais continuam no layout fixo antigo —
  // fallback que preserva o comportamento anterior ao editor.
  if (temaProdutoConfig) {
    return (
      <ThemeRendererProduto
        key={produto.id}
        produto={produto}
        slug={slug}
        secoes={temaProdutoConfig.secoes}
        selosConfig={(loja?.selosConfig as ConfigSelos | undefined) ?? CONFIG_SELOS_VAZIA}
      />
    );
  }

  return <ProdutoDetalhe key={produto.id} produto={produto} slug={slug} />;
}
