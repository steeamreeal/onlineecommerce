import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/lib/trpc/types";

type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Variante = "minimalista" | "editorial" | "vitrine";

// Cor de destaque em cada variante vem de --loja-primary (a marca do
// lojista, definida em app/(public-store)/loja/[slug]/layout.tsx), nunca de
// --primary (essa é a cor do painel interno da plataforma).
const containerPorVariante: Record<Variante, string> = {
  minimalista: "rounded-md border p-2 hover:border-[var(--loja-primary)]/40",
  vitrine: "rounded-xl border-2 p-2 hover:border-[var(--loja-primary)]",
  editorial: "rounded-none p-1 hover:opacity-90",
};

const precoPromoPorVariante: Record<Variante, string> = {
  minimalista: "font-semibold text-[var(--loja-primary)]",
  vitrine:
    "rounded-full bg-[var(--loja-primary)] px-2 py-0.5 text-xs font-semibold text-white w-fit",
  editorial: "font-heading font-medium text-[var(--loja-primary)]",
};

export function ProductCard({
  produto,
  slug,
  variante = "minimalista",
}: {
  produto: Produto;
  slug: string;
  variante?: Variante;
}) {
  const precoNormal = Number(produto.precoNormal);
  const precoPromo = produto.precoPromo != null ? Number(produto.precoPromo) : undefined;
  const semEstoque = produto.variacoes.reduce((total, v) => total + v.estoque, 0) === 0;
  // Vídeo não autoplay numa grade de cards — prioriza a primeira imagem como
  // capa; se o produto só tiver vídeo cadastrado, cai pra ele mesmo assim.
  const capa =
    [...produto.fotos].sort((a, b) => a.ordem - b.ordem).find((f) => f.tipo === "IMAGEM") ??
    produto.fotos[0];

  return (
    <Link
      href={`/loja/${slug}/produtos/${produto.id}`}
      className={cn(
        "group flex flex-col gap-2 transition-colors",
        containerPorVariante[variante],
      )}
    >
      <div className="bg-muted relative aspect-square overflow-hidden rounded-md">
        {capa &&
          (capa.tipo === "VIDEO" ? (
            <video src={capa.url} className="size-full object-cover" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
            <img src={capa.url} alt={produto.nome} className="size-full object-cover" />
          ))}
        {semEstoque && (
          <span className="bg-background/90 absolute top-2 left-2 rounded-full border px-2 py-0.5 text-xs font-medium">
            Esgotado
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            "line-clamp-2 text-sm",
            variante === "editorial" ? "font-heading" : "font-medium",
          )}
        >
          {produto.nome}
        </span>
        {precoPromo ? (
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-xs line-through">
              {formatoMoeda.format(precoNormal)}
            </span>
            <span className={precoPromoPorVariante[variante]}>{formatoMoeda.format(precoPromo)}</span>
          </div>
        ) : (
          <span className="font-semibold">{formatoMoeda.format(precoNormal)}</span>
        )}
      </div>
    </Link>
  );
}
