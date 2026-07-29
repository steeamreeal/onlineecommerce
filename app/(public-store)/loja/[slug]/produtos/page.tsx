import { ProdutosCatalogo } from "@/components/store/produtos-catalogo";

export default async function ProdutosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ categoria?: string; busca?: string }>;
}) {
  const { slug } = await params;
  const { categoria, busca } = await searchParams;

  return <ProdutosCatalogo slug={slug} categoriaInicial={categoria} buscaInicial={busca} />;
}
