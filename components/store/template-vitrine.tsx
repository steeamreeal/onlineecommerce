import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import type { RouterOutputs } from "@/lib/trpc/types";

type Banner = { id: string; url: string; titulo?: string };
type Categoria = RouterOutputs["lojaPublica"]["categorias"][number];
type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

export function TemplateVitrine({
  slug,
  banners,
  categorias,
  destaques,
}: {
  slug: string;
  banners: Banner[];
  categorias: Categoria[];
  destaques: Produto[];
}) {
  return (
    <div className="flex flex-1 flex-col gap-10 pb-12">
      <section
        className="relative flex aspect-[3/1] items-center justify-center overflow-hidden bg-[var(--loja-primary)] px-6 text-center text-white"
        style={
          banners[0]?.url
            ? { backgroundImage: `url(${banners[0].url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {banners[0]?.url && (
          <div className="absolute inset-0 bg-[var(--loja-primary)]/70" />
        )}
        <p className="relative text-lg font-bold">
          {banners[0]?.titulo ?? "Confira as novidades da loja"}
        </p>
      </section>

      <section className="flex flex-col gap-4 px-6">
        <div className="flex flex-wrap gap-2">
          {categorias.map((categoria) => (
            <Link
              key={categoria.id}
              href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
              className="rounded-full border-2 border-[var(--loja-primary)]/30 px-4 py-1.5 text-sm font-medium text-[var(--loja-primary)] hover:border-[var(--loja-primary)]"
            >
              {categoria.nome}
            </Link>
          ))}
        </div>
      </section>

      {destaques.length > 0 && (
        <section className="flex flex-col gap-4 px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Destaques</h2>
            <Link
              href={`/loja/${slug}/produtos`}
              className="text-sm font-medium text-[var(--loja-primary)]"
            >
              Ver todos os produtos
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {destaques.map((produto) => (
              <ProductCard key={produto.id} produto={produto} slug={slug} variante="vitrine" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
