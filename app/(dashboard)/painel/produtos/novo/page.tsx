import { ProdutoForm } from "@/components/dashboard/produto-form";

export default function NovoProdutoPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Novo produto</h1>
        <p className="text-muted-foreground text-sm">
          Preencha as informações do produto e cadastre suas variações.
        </p>
      </div>
      <ProdutoForm />
    </div>
  );
}
