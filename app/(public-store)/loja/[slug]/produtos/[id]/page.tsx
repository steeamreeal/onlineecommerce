import { notFound } from "next/navigation";
import { ProdutoDetalhe } from "@/components/store/produto-detalhe";
import { produtosMock } from "@/lib/mocks/produtos";

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const produto = produtosMock.find((p) => p.id === id);

  if (!produto) notFound();

  return <ProdutoDetalhe produto={produto} slug={slug} />;
}
