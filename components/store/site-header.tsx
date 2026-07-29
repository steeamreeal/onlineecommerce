"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/store/cart-context";
import { categoriasMock } from "@/lib/mocks/produtos";
import { configuracaoLojaMock } from "@/lib/mocks/loja";

export function SiteHeader({ slug }: { slug: string }) {
  const { quantidadeTotal, setAberto } = useCart();
  const [busca, setBusca] = useState("");
  const config = configuracaoLojaMock;

  return (
    <div className="flex flex-col border-b">
      {config.avisoTopo && (
        <div
          className="px-6 py-2 text-center text-sm font-medium text-white"
          style={{ backgroundColor: config.corPrimaria }}
        >
          {config.avisoTopo}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 px-6 py-4">
        <Link href={`/loja/${slug}`} className="text-lg font-semibold">
          {config.nome}
        </Link>

        <form
          action={`/loja/${slug}/produtos`}
          className="relative min-w-[200px] flex-1"
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            name="busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produtos"
            className="pl-9"
          />
        </form>

        <nav className="hidden items-center gap-4 text-sm md:flex">
          {categoriasMock.map((categoria) => (
            <Link
              key={categoria.id}
              href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {categoria.nome}
            </Link>
          ))}
        </nav>

        <Button variant="outline" size="icon" onClick={() => setAberto(true)} className="relative">
          <ShoppingBag />
          {quantidadeTotal > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-[0.65rem] font-medium text-white"
              style={{ backgroundColor: config.corPrimaria }}
            >
              {quantidadeTotal}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
