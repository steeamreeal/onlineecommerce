"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/store/cart-context";
import { BuscaProdutos } from "@/components/store/busca-produtos";
import { trpc } from "@/lib/trpc/client";
import { alturaLogoEmPx, espacamentoCabecalhoEmPx, tamanhoFonteEmPx } from "@/lib/tema-loja";
import type { RouterOutputs } from "@/lib/trpc/types";

type ConfiguracaoLoja = RouterOutputs["lojaPublica"]["porSlug"];

export function SiteHeader({
  slug,
  config,
  mostrarBusca = true,
  mostrarConta = true,
  posicaoLogo = "ESQUERDA",
  exibicaoLogo = "NOME",
  tamanhoLogo = 65,
  espacamentoLinhas = 8,
  tamanhoFonteCategorias = 30,
  corFundo,
  corTexto,
  checkout = false,
}: {
  slug: string;
  config: ConfiguracaoLoja;
  mostrarBusca?: boolean;
  mostrarConta?: boolean;
  posicaoLogo?: "ESQUERDA" | "CENTRO";
  exibicaoLogo?: "LOGO" | "NOME";
  tamanhoLogo?: number;
  espacamentoLinhas?: number;
  tamanhoFonteCategorias?: number;
  corFundo?: string;
  corTexto?: string;
  // Página de checkout: cabeçalho enxuto de propósito — sem busca, sem menu
  // de categorias (nem o "hambúrguer" no mobile) e com a logo sem link, pra
  // não dar nenhum caminho de sair do fluxo de pagamento no meio da compra
  // (mesmo princípio de checkout "distraction-free" usado por Shopify etc.).
  checkout?: boolean;
}) {
  const { quantidadeTotal, setAberto } = useCart();
  const { data: categorias } = trpc.lojaPublica.categorias.useQuery({ slug });
  // Só controla a gaveta de categorias do cabeçalho mobile (estilo
  // hambúrguer) — o carrinho tem seu próprio estado em useCart/setAberto.
  const [menuAberto, setMenuAberto] = useState(false);

  const conteudoLogo =
    exibicaoLogo === "LOGO" && config.logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
      <img
        src={config.logoUrl}
        alt={config.nome}
        // No mobile o cabeçalho é uma faixa estreita (grid-cols-3 com ícones
        // ao lado) — sem esse teto, uma logo configurada grande no desktop
        // (até 220px) estoura a altura da faixa e empurra o resto do layout.
        className="w-auto max-h-32 object-contain md:max-h-none"
        style={{ height: alturaLogoEmPx(tamanhoLogo) }}
      />
    ) : (
      <span className="text-lg font-semibold" style={corTexto ? { color: corTexto } : undefined}>
        {config.nome}
      </span>
    );

  // "LOGO" sem Loja.logoUrl cadastrada cai para o nome — nunca deixa o
  // cabeçalho sem nenhuma identidade da loja.
  const logo = checkout ? (
    <div className="flex items-center">{conteudoLogo}</div>
  ) : (
    <Link href={`/loja/${slug}`} className="flex items-center">
      {conteudoLogo}
    </Link>
  );

  const busca = mostrarBusca && !checkout ? <BuscaProdutos slug={slug} /> : null;

  const nav = checkout ? null : (
    <nav className="flex items-center gap-4 text-sm" style={{ fontSize: tamanhoFonteEmPx(tamanhoFonteCategorias) }}>
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
      <div className="hidden flex-col md:flex">
        <div className="flex flex-wrap items-center gap-4 px-6 py-3">
          <div className="flex flex-1 items-center gap-4">{busca}</div>
          {logo}
          <div className="flex flex-1 items-center justify-end gap-4">{acoes}</div>
        </div>
        {(categorias ?? []).length > 0 && !checkout && (
          <div
            className="flex items-center justify-center gap-4 px-6 pb-2"
            style={{ paddingTop: espacamentoCabecalhoEmPx(espacamentoLinhas) }}
          >
            {nav}
          </div>
        )}
      </div>
    ) : (
      <div className="hidden flex-col md:flex">
        <div className="flex flex-wrap items-center gap-4 px-6 py-3">
          {logo}
          <div className="flex flex-1 items-center gap-4">{busca}</div>
          {acoes}
        </div>
        {(categorias ?? []).length > 0 && !checkout && (
          <div
            className="flex items-center justify-center gap-4 px-6 pb-2"
            style={{ paddingTop: espacamentoCabecalhoEmPx(espacamentoLinhas) }}
          >
            {nav}
          </div>
        )}
      </div>
    );

  const mobile = (
    <div className="flex flex-col md:hidden">
      <div className="grid grid-cols-3 items-center gap-3 px-4 py-3">
        <div className="flex justify-start">
          {!checkout && (
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
          )}
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
