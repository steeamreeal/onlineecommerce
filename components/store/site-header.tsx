"use client";

import Link from "next/link";
import { Search, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/store/cart-context";
import { trpc } from "@/lib/trpc/client";
import { alturaLogoEmPx } from "@/lib/tema-loja";
import type { RouterOutputs } from "@/lib/trpc/types";

type ConfiguracaoLoja = RouterOutputs["lojaPublica"]["porSlug"];

export function SiteHeader({
  slug,
  config,
  mostrarBusca = true,
  mostrarConta = true,
  posicaoLogo = "ESQUERDA",
  exibicaoLogo = "NOME",
  tamanhoLogo = 40,
}: {
  slug: string;
  config: ConfiguracaoLoja;
  mostrarBusca?: boolean;
  mostrarConta?: boolean;
  posicaoLogo?: "ESQUERDA" | "CENTRO";
  exibicaoLogo?: "LOGO" | "NOME";
  tamanhoLogo?: number;
}) {
  const { quantidadeTotal, setAberto } = useCart();
  const { data: categorias } = trpc.lojaPublica.categorias.useQuery({ slug });

  // "LOGO" sem Loja.logoUrl cadastrada cai para o nome — nunca deixa o
  // cabeçalho sem nenhuma identidade da loja.
  const logo = (
    <Link href={`/loja/${slug}`} className="flex items-center">
      {exibicaoLogo === "LOGO" && config.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
        <img
          src={config.logoUrl}
          alt={config.nome}
          className="w-auto object-contain"
          style={{ height: alturaLogoEmPx(tamanhoLogo) }}
        />
      ) : (
        <span className="text-lg font-semibold">{config.nome}</span>
      )}
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
      <div className="bg-background sticky top-0 z-40 flex flex-col border-b">
        <div className="grid grid-cols-3 items-center gap-4 px-6 py-4 md:flex md:flex-wrap">
          <div className="hidden items-center gap-4 md:flex md:flex-1">{busca}</div>
          <div className="col-start-2 flex justify-center">{logo}</div>
          <div className="col-start-3 flex items-center justify-end gap-4 md:flex-1">
            {nav}
            {acoes}
          </div>
        </div>
        {busca && <div className="px-6 pb-4 md:hidden">{busca}</div>}
      </div>
    );
  }

  return (
    <div className="bg-background sticky top-0 z-40 flex flex-col border-b">
      <div className={cn("flex flex-wrap items-center gap-4 px-6 py-4")}>
        {logo}
        <div className="hidden items-center gap-4 md:flex md:flex-1">{busca}</div>
        {nav}
        {acoes}
      </div>
      {busca && <div className="px-6 pb-4 md:hidden">{busca}</div>}
    </div>
  );
}
