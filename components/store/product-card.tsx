"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartOpcional } from "@/components/store/cart-context";
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

function variacaoLabel(v: { cor?: string | null; tamanho?: string | null; modelo?: string | null }) {
  return [v.cor, v.tamanho, v.modelo].filter(Boolean).join(" / ") || "Padrão";
}

export function ProductCard({
  produto,
  slug,
  variante = "minimalista",
  mostrarPreco = true,
  expandido = false,
  corBotao,
  corTextoBotao,
}: {
  produto: Produto;
  slug: string;
  variante?: Variante;
  mostrarPreco?: boolean;
  // Mostra a seleção de variação/adicionar ao carrinho sempre visível, sem
  // depender de hover — usado no carrossel mobile (toque não tem hover).
  expandido?: boolean;
  // Cor do botão "Adicionar ao carrinho" definida na seção (ex.: Coleção em
  // destaque) — sem valor, cai no padrão bg-foreground/text-background.
  corBotao?: string;
  corTextoBotao?: string;
}) {
  // Opcional (não obrigatório) porque esse card também é renderizado no
  // preview do editor de tema, que roda sem CartProvider de propósito — lá
  // o bloco de variação/adicionar ao carrinho abaixo simplesmente não
  // aparece, em vez de derrubar a página inteira com "useCart deve ser
  // usado dentro de um CartProvider".
  const cart = useCartOpcional();
  const precoNormal = Number(produto.precoNormal);
  const precoPromo = produto.precoPromo != null ? Number(produto.precoPromo) : undefined;
  const semEstoque = produto.variacoes.reduce((total, v) => total + v.estoque, 0) === 0;
  const midias = [...produto.fotos].sort((a, b) => a.ordem - b.ordem);
  // Vídeo não autoplay numa grade de cards — prioriza a primeira imagem como
  // capa; se o produto só tiver vídeo cadastrado, cai pra ele mesmo assim.
  const capaPadrao = midias.find((f) => f.tipo === "IMAGEM") ?? midias[0];
  // Segunda foto cadastrada no produto — trocada no hover do card (desktop),
  // igual à referência de mercado (Pandora). Sem segunda foto, o hover não
  // troca de imagem, só revela a seleção de variação/adicionar ao carrinho.
  const capaHover = midias.find((f) => f.id !== capaPadrao?.id && f.tipo === "IMAGEM");

  const [variacaoId, setVariacaoId] = useState<string | undefined>(
    produto.variacoes.find((v) => v.estoque > 0)?.id,
  );
  const variacaoSelecionada = produto.variacoes.find((v) => v.id === variacaoId);
  const semVariacoes = produto.variacoes.length === 0;
  const podeComprar = !semEstoque && (semVariacoes || Boolean(variacaoSelecionada));
  const preco = precoPromo ?? precoNormal;
  // Variação com foto própria cadastrada substitui a capa do card — o hover
  // que troca pra segunda foto (capaHover) fica desligado nesse caso, pra
  // não brigar com a foto da variação escolhida.
  const capa = variacaoSelecionada?.foto ?? capaPadrao;

  const variacoesRef = useRef<HTMLDivElement>(null);
  const [podeRolarEsquerda, setPodeRolarEsquerda] = useState(false);
  const [podeRolarDireita, setPodeRolarDireita] = useState(false);

  function atualizarSetas() {
    const el = variacoesRef.current;
    if (!el) return;
    setPodeRolarEsquerda(el.scrollLeft > 4);
    setPodeRolarDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  function rolarVariacoes(direcao: 1 | -1) {
    variacoesRef.current?.scrollBy({ left: direcao * 96, behavior: "smooth" });
  }

  // Verifica no primeiro render se a lista de variações já nasce maior que
  // o espaço visível, pra mostrar a seta certa desde o início (sem precisar
  // esperar o usuário rolar/passar o mouse primeiro).
  useEffect(() => {
    atualizarSetas();
  }, [produto.variacoes.length]);

  function handleAdicionar(e: React.MouseEvent) {
    e.preventDefault();
    if (!podeComprar || !cart) return;
    cart.adicionarItem({
      produtoId: produto.id,
      variacaoId: variacaoSelecionada?.id ?? produto.id,
      quantidade: 1,
      precoUnitario: preco,
    });
  }

  return (
    <div
      onMouseEnter={atualizarSetas}
      className={cn(
        "group flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        containerPorVariante[variante],
      )}
    >
      <Link href={`/loja/${slug}/produtos/${produto.id}`} className="flex flex-col gap-2">
        <div className="bg-muted relative aspect-square overflow-hidden rounded-md">
          {capa &&
            (capa.tipo === "VIDEO" ? (
              <video
                src={capa.url}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                muted
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
              <img
                src={capa.url}
                alt={produto.nome}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ))}
          {!variacaoSelecionada?.foto && capaHover && (
            // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
            <img
              src={capaHover.url}
              alt=""
              aria-hidden
              className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          )}
          {semEstoque && (
            <span className="bg-background/90 absolute top-2 left-2 rounded-full border px-2 py-0.5 text-xs font-medium">
              Esgotado
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <span
            className={cn(
              // min-h reserva o espaço de 2 linhas mesmo quando o nome cabe
              // numa linha só — sem isso, cards com nomes curtos ficavam
              // mais baixos que os vizinhos e desalinhavam a fileira.
              "line-clamp-2 min-h-10 text-sm",
              variante === "editorial" ? "font-heading" : "font-medium",
            )}
          >
            {produto.nome}
          </span>
          {mostrarPreco &&
            (precoPromo ? (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground text-xs line-through">
                  {formatoMoeda.format(precoNormal)}
                </span>
                <span className={precoPromoPorVariante[variante]}>{formatoMoeda.format(precoPromo)}</span>
              </div>
            ) : (
              <span className="font-semibold">{formatoMoeda.format(precoNormal)}</span>
            ))}
        </div>
      </Link>

      {/* No mobile fica sempre visível (não existe hover pra revelar
          depois); no desktop (md+) continua só no hover, a não ser que
          expandido force sempre visível ali também. Fora do <Link> pra
          cliques em variação/carrinho não navegarem pra página do produto.
          Sem CartProvider por perto (preview do editor de tema), cart é
          null e esse bloco não aparece. */}
      {!semEstoque && cart && (
        <div className={cn("flex-col gap-2", expandido ? "flex" : "flex md:hidden md:group-hover:flex")}>
          {produto.variacoes.length > 0 && (
            <div className="relative">
              {/* Sem quebra de linha (mesmo com muitas variações) — evita
                  que o botão "Adicionar ao carrinho" pule de altura entre
                  produtos com números diferentes de variação. Vale tanto
                  pro carrossel mobile (cada slide) quanto pra grade
                  desktop (cada card no hover), pra manter a posição do
                  botão sempre igual. As setas cobrem o caso em que, no
                  desktop, o mouse não tem como rolar a lista pro lado. */}
              <div
                ref={variacoesRef}
                onScroll={atualizarSetas}
                onMouseEnter={atualizarSetas}
                className={cn(
                  "flex gap-1 overflow-x-auto scroll-smooth pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                  podeRolarEsquerda && "pl-6",
                  podeRolarDireita && "pr-6",
                )}
              >
                {produto.variacoes.map((variacao) => {
                  const esgotada = variacao.estoque === 0;
                  const selecionada = variacao.id === variacaoId;
                  return (
                    <button
                      key={variacao.id}
                      type="button"
                      disabled={esgotada}
                      onClick={(e) => {
                        e.preventDefault();
                        setVariacaoId(variacao.id);
                      }}
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-1 text-xs whitespace-nowrap transition-colors",
                        selecionada ? "border-[var(--loja-primary)] bg-[var(--loja-primary)]/5" : "hover:border-[var(--loja-primary)]/40",
                        esgotada && "text-muted-foreground cursor-not-allowed line-through opacity-50",
                      )}
                    >
                      {variacaoLabel(variacao)}
                    </button>
                  );
                })}
              </div>
              {podeRolarEsquerda && (
                <button
                  type="button"
                  aria-label="Ver variações anteriores"
                  onClick={(e) => {
                    e.preventDefault();
                    rolarVariacoes(-1);
                  }}
                  className="bg-background absolute top-1/2 left-0 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
                >
                  <ChevronLeft className="size-3" />
                </button>
              )}
              {podeRolarDireita && (
                <button
                  type="button"
                  aria-label="Ver mais variações"
                  onClick={(e) => {
                    e.preventDefault();
                    rolarVariacoes(1);
                  }}
                  className="bg-background absolute top-1/2 right-0 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
                >
                  <ChevronRight className="size-3" />
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            disabled={!podeComprar}
            onClick={handleAdicionar}
            className={cn(
              "w-full rounded-md py-1.5 text-xs font-medium disabled:opacity-50",
              !corBotao && "bg-foreground",
              !corTextoBotao && "text-background",
            )}
            style={{ backgroundColor: corBotao, color: corTextoBotao }}
          >
            Adicionar ao carrinho
          </button>
        </div>
      )}
    </div>
  );
}
