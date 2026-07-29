import Link from "next/link";
import type { Produto } from "@/lib/mocks/produtos";
import { estoqueTotal } from "@/lib/mocks/produtos";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProductCard({ produto, slug }: { produto: Produto; slug: string }) {
  const semEstoque = estoqueTotal(produto) === 0;

  return (
    <Link
      href={`/loja/${slug}/produtos/${produto.id}`}
      className="group flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:border-primary/40"
    >
      <div className="bg-muted relative aspect-square overflow-hidden rounded-md">
        {semEstoque && (
          <span className="bg-background/90 absolute top-2 left-2 rounded-full border px-2 py-0.5 text-xs font-medium">
            Esgotado
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="line-clamp-2 text-sm font-medium">{produto.nome}</span>
        {produto.precoPromo ? (
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-xs line-through">
              {formatoMoeda.format(produto.precoNormal)}
            </span>
            <span className="text-primary font-semibold">
              {formatoMoeda.format(produto.precoPromo)}
            </span>
          </div>
        ) : (
          <span className="font-semibold">{formatoMoeda.format(produto.precoNormal)}</span>
        )}
      </div>
    </Link>
  );
}
