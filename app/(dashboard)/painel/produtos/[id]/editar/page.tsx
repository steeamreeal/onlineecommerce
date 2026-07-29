import { notFound } from "next/navigation";
import { ProdutoForm } from "@/components/dashboard/produto-form";
import { produtosMock } from "@/lib/mocks/produtos";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const produto = produtosMock.find((p) => p.id === id);

  if (!produto) {
    notFound();
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
