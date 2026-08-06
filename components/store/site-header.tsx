"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  corFundo,
  corTexto,
}: {
  slug: string;
  config: ConfiguracaoLoja;
  mostrarBusca?: boolean;
  mostrarConta?: boolean;
  posicaoLogo?: "ESQUERDA" | "CENTRO";
  exibicaoLogo?: "LOGO" | "NOME";
  tamanhoLogo?: number;
  corFundo?: string;
  corTexto?: string;
}) {
  const { quantidadeTotal, setAberto } = useCart();
  const { data: categorias } = trpc.lojaPublica.categorias.useQuery({ slug });
  // Só controla a gaveta de categorias do cabeçalho mobile (estilo
  // hambúrguer) — o carrinho tem seu próprio estado em useCart/setAberto.
  const [menuAberto, setMenuAberto] = useState(false);

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
        <span className="text-lg font-semibold" style={corTexto ? { color: corTexto } : undefined}>
          {config.nome}
        </span>
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
    <nav className="flex items-center gap-4 text-sm">
      {(categorias ?? []).map((categoria) => (
        <Link
          key={categoria.id}
          href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
          className={cn(!corTexto && "text-muted-foreground hover:text-foreground")}
          style={corTexto ? { color: corTexto } : undefined}
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

  // Desktop mantém o layout configurável (posicaoLogo Esquerda/Centro) que
  // já existia. Estrutura só visível a partir de md — o mobile tem seu
  // próprio bloco abaixo, com layout fixo estilo Pandora (hambúrguer +
  // logo centralizada + ações), independente dessa configuração.
  const desktop =
    posicaoLogo === "CENTRO" ? (
      <div className="hidden flex-wrap items-center gap-4 px-6 py-4 md:flex">
        <div className="flex flex-1 items-center gap-4">{busca}</div>
        {logo}
        <div className="flex flex-1 items-center justify-end gap-4">
          {nav}
          {acoes}
        </div>
      </div>
    ) : (
      <div className="hidden flex-wrap items-center gap-4 px-6 py-4 md:flex">
        {logo}
        <div className="flex flex-1 items-center gap-4">{busca}</div>
        {nav}
        {acoes}
      </div>
    );

  const mobile = (
    <div className="flex flex-col md:hidden">
      <div className="grid grid-cols-3 items-center gap-3 px-4 py-3">
        <div className="flex justify-start">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu de categorias" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Categorias</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {(categorias ?? []).map((categoria) => (
                  <Link
                    key={categoria.id}
                    href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
                    className="hover:bg-accent rounded-md px-2 py-2 text-sm"
                    onClick={() => setMenuAberto(false)}
                  >
                    {categoria.nome}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex justify-center">{logo}</div>
        <div className="flex justify-end">{acoes}</div>
      </div>
      {busca && <div className="px-4 pb-3">{busca}</div>}
    </div>
  );

  return (
    <div
      className={cn("sticky top-0 z-40 border-b", !corFundo && "bg-background")}
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      {desktop}
      {mobile}
    </div>
  );
}
