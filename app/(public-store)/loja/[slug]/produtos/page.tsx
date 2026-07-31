"use client";

import { use } from "react";
import { ProdutosCatalogo } from "@/components/store/produtos-catalogo";

export default function ProdutosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ categoria?: string; busca?: string }>;
}) {
  const { slug } = use(params);
  const { categoria, busca } = use(searchParams);

  return <ProdutosCatalogo slug={slug} categoriaInicial={categoria} buscaInicial={busca} />;
}
