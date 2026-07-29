export default async function LojaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-semibold">Loja: {slug}</h1>
      <p className="text-muted-foreground">
        Site de vendas público — catálogo, busca, carrinho e checkout.
      </p>
    </main>
  );
}
