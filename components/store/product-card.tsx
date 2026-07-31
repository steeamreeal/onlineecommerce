import Link from "next/link";
import type { RouterOutputs } from "@/lib/trpc/types";

type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProductCard({ produto, slug }: { produto: Produto; slug: string }) {
  const precoNormal = Number(produto.precoNormal);
  const precoPromo = produto.precoPromo != null ? Number(produto.precoPromo) : undefined;
  const semEstoque = produto.variacoes.reduce((total, v) => total + v.estoque, 0) === 0;

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
        {precoPromo ? (
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-xs line-through">
              {formatoMoeda.format(precoNormal)}
            </span>
            <span className="text-primary font-semibold">{formatoMoeda.format(precoPromo)}</span>
          </div>
        ) : (
          <span className="font-semibold">{formatoMoeda.format(precoNormal)}</span>
        )}
      </div>
    </Link>
  );
}
