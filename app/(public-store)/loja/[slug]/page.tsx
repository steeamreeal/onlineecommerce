"use client";

import { use } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import { trpc } from "@/lib/trpc/client";

type Banner = { id: string; url: string; titulo?: string };

export default function LojaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: config } = trpc.lojaPublica.porSlug.useQuery({ slug });
  const { data: categorias } = trpc.lojaPublica.categorias.useQuery({ slug });
  const { data: produtos } = trpc.lojaPublica.produtos.useQuery({ slug });

  const destaques = (produtos ?? []).filter((produto) => produto.status === "DESTAQUE");
  const banners = (config?.banners as Banner[] | null) ?? [];

  return (
    <div className="flex flex-1 flex-col gap-10 pb-12">
      {banners.length > 0 && (
        <section className="grid gap-4 px-6 pt-6 sm:grid-cols-2">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-muted relative flex aspect-[16/7] items-end overflow-hidden rounded-lg"
            >
              {banner.titulo && (
                <span className="bg-background/90 m-4 rounded-md px-3 py-1.5 text-sm font-medium">
                  {banner.titulo}
                </span>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-4 px-6">
        <h2 className="text-lg font-semibold">Categorias</h2>
        <div className="flex flex-wrap gap-3">
          {(categorias ?? []).map((categoria) => (
            <Link
              key={categoria.id}
              href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
              className="hover:border-primary/40 rounded-full border px-4 py-2 text-sm"
            >
              {categoria.nome}
            </Link>
          ))}
        </div>
      </section>

      {destaques.length > 0 && (
        <section className="flex flex-col gap-4 px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Destaques</h2>
            <Link
              href={`/loja/${slug}/produtos`}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Ver todos os produtos
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {destaques.map((produto) => (
              <ProductCard key={produto.id} produto={produto} slug={slug} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
