import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import type { RouterOutputs } from "@/lib/trpc/types";

type Banner = { id: string; url: string; titulo?: string };
type Categoria = RouterOutputs["lojaPublica"]["categorias"][number];
type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

export function TemplateEditorial({
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
    <div className="flex flex-1 flex-col gap-14 pb-16">
      <section
        className="bg-accent relative flex aspect-[3/1] items-center justify-center overflow-hidden px-6 text-center"
        style={
          banners[0]?.url
            ? { backgroundImage: `url(${banners[0].url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {banners[0]?.url && <div className="bg-background/70 absolute inset-0" />}
        <p className="font-heading relative max-w-lg text-2xl italic text-[var(--loja-primary)]">
          {banners[0]?.titulo ?? "Uma seleção pensada para você"}
        </p>
      </section>

      <section className="flex flex-col gap-4 px-6">
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          {categorias.map((categoria) => (
            <Link
              key={categoria.id}
              href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
              className="font-heading text-muted-foreground hover:text-foreground"
            >
              {categoria.nome}
            </Link>
          ))}
        </div>
      </section>

      {destaques.length > 0 && (
        <section className="flex flex-col gap-6 px-6">
          <h2 className="font-heading text-center text-2xl">Seleção da casa</h2>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {destaques.map((produto) => (
              <ProductCard key={produto.id} produto={produto} slug={slug} variante="editorial" />
            ))}
          </div>
          <Link
            href={`/loja/${slug}/produtos`}
            className="text-muted-foreground hover:text-foreground text-center text-sm"
          >
            Ver todos os produtos
          </Link>
        </section>
      )}
    </div>
  );
}
