"use client";

import Link from "next/link";
import { Search, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/store/cart-context";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type ConfiguracaoLoja = RouterOutputs["lojaPublica"]["porSlug"];

export function SiteHeader({
  slug,
  config,
  mostrarBusca = true,
  mostrarConta = true,
  posicaoLogo = "ESQUERDA",
}: {
  slug: string;
  config: ConfiguracaoLoja;
  mostrarBusca?: boolean;
  mostrarConta?: boolean;
  posicaoLogo?: "ESQUERDA" | "CENTRO";
}) {
  const { quantidadeTotal, setAberto } = useCart();
  const { data: categorias } = trpc.lojaPublica.categorias.useQuery({ slug });

  const logo = (
    <Link href={`/loja/${slug}`} className="text-lg font-semibold">
      {config.nome}
    </Link>
  );

  const busca = mostrarBusca ? (
    <form action={`/loja/${slug}/produtos`} className="relative min-w-[200px] flex-1">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input name="busca" placeholder="Buscar produtos" className="pl-9" />
    </form>
  ) : null;

  const nav = (
    <nav className="hidden items-center gap-4 text-sm md:flex">
      {(categorias ?? []).map((categoria) => (
        <Link
          key={categoria.id}
          href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {categoria.nome}
        </Link>
      ))}
    </nav>
  );

  const acoes = (
    <div className="flex items-center gap-2">
      {mostrarConta && (
        <Button variant="outline" size="icon" aria-label="Minha conta">
          <User />
        </Button>
      )}
      <Button variant="outline" size="icon" onClick={() => setAberto(true)} className="relative">
        <ShoppingBag />
        {quantidadeTotal > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-[0.65rem] font-medium text-white"
            style={{ backgroundColor: config.corPrimaria ?? undefined }}
          >
            {quantidadeTotal}
          </span>
        )}
      </Button>
    </div>
  );

  if (posicaoLogo === "CENTRO") {
    return (
      <div className="flex flex-col border-b">
        <div className="flex flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex flex-1 items-center gap-4">{busca}</div>
          {logo}
          <div className="flex flex-1 items-center justify-end gap-4">
            {nav}
            {acoes}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b">
      <div className={cn("flex flex-wrap items-center gap-4 px-6 py-4")}>
        {logo}
        {busca}
        {nav}
        {acoes}
      </div>
    </div>
  );
}
