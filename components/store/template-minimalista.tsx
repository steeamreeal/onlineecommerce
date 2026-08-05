import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import type { RouterOutputs } from "@/lib/trpc/types";

type Banner = { id: string; url: string; titulo?: string; tipo?: "IMAGEM" | "VIDEO" };
type Categoria = RouterOutputs["lojaPublica"]["categorias"][number];
type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

export function TemplateMinimalista({
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
    <div className="flex flex-1 flex-col gap-12 pb-12">
      {banners.length > 0 && (
        <section className="px-6 pt-6">
          <div
            className="bg-muted relative flex aspect-[2/1] items-end overflow-hidden rounded-md md:aspect-[3/1]"
            style={
              banners[0]?.url && banners[0]?.tipo !== "VIDEO"
                ? { backgroundImage: `url(${banners[0].url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : undefined
            }
          >
            {banners[0]?.url && banners[0]?.tipo === "VIDEO" && (
              <video
                src={banners[0].url}
                className="absolute inset-0 size-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            )}
            {banners[0]?.titulo && (
              <>
                {banners[0]?.url && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                )}
                <span
                  className={`relative m-4 text-sm font-medium ${banners[0]?.url ? "text-white" : ""}`}
                >
                  {banners[0].titulo}
                </span>
              </>
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4 px-6">
        <div className="flex flex-wrap gap-2 text-sm">
          {categorias.map((categoria) => (
            <Link
              key={categoria.id}
              href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {categoria.nome}
            </Link>
          ))}
        </div>
      </section>

      {destaques.length > 0 && (
        <section className="flex flex-col gap-4 px-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-medium">Produtos</h2>
            <Link
              href={`/loja/${slug}/produtos`}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {destaques.map((produto) => (
              <ProductCard key={produto.id} produto={produto} slug={slug} variante="minimalista" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
