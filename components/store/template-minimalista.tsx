import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import { BannerCarousel } from "@/components/store/banner-carousel";
import type { RouterOutputs } from "@/lib/trpc/types";

type Banner = {
  id: string;
  url: string;
  titulo?: string;
  tipo?: "IMAGEM" | "VIDEO";
  urlMobile?: string;
  tipoMobile?: "IMAGEM" | "VIDEO";
};
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
          <BannerCarousel
            banners={banners}
            className="bg-muted relative flex aspect-[4/5] items-end overflow-hidden rounded-md md:aspect-[3/1]"
            renderOverlay={(banner) =>
              banner.titulo ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="relative m-4 text-sm font-medium text-white">{banner.titulo}</span>
                </>
              ) : null
            }
          />
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
