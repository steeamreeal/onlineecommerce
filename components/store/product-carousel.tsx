"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import type { RouterOutputs } from "@/lib/trpc/types";

type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

// Layout mobile "CARROSSEL" da Coleção em destaque (referência: Pandora) —
// um produto por slide, com variação e adicionar ao carrinho já visíveis
// (sem depender de hover, que não existe em toque).
//
// Loop infinito igual ao BannerCarousel: um clone do primeiro produto é
// renderizado no fim da trilha. Arrastar até ele "chega" visualmente no
// primeiro produto; assim que o snap termina, a trilha salta sem animação
// de volta ao slide real 0, então o próximo arrasto se comporta normalmente.
export function ProductCarousel({
  produtos,
  slug,
  variante,
  mostrarPreco,
  mostrarComprar = true,
  corBotao,
  corTextoBotao,
  idsMaisVendidos,
}: {
  produtos: Produto[];
  slug: string;
  variante: "minimalista" | "editorial" | "vitrine";
  mostrarPreco: boolean;
  // Desligado, o carrossel vira só imagem/nome/preço (sem variação nem
  // "Adicionar ao carrinho") — toque não tem hover pra revelar isso depois,
  // então aqui é tudo ou nada, controlado direto por esse prop.
  mostrarComprar?: boolean;
  corBotao?: string;
  corTextoBotao?: string;
  // IDs dos produtos mais vendidos da loja — liga o selo "Mais vendido" no
  // slide (ver ProductCard).
  idsMaisVendidos?: Set<string>;
}) {
  const trilhaRef = useRef<HTMLDivElement>(null);
  const navegandoProgramaticamente = useRef(false);
  const [indiceAtual, setIndiceAtual] = useState(0);

  function handleScroll() {
    if (navegandoProgramaticamente.current) return;
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const indiceScroll = Math.round(trilha.scrollLeft / trilha.clientWidth);

    // Chegou no clone do primeiro produto (posição produtos.length, o
    // último item da trilha): salta sem animação de volta ao slide real 0.
    if (indiceScroll === produtos.length) {
      setIndiceAtual(0);
      navegandoProgramaticamente.current = true;
      trilha.scrollTo({ left: 0, behavior: "instant" });
      navegandoProgramaticamente.current = false;
      return;
    }

    if (indiceScroll !== indiceAtual) setIndiceAtual(indiceScroll);
  }

  function irPara(indice: number) {
    const proximo = ((indice % produtos.length) + produtos.length) % produtos.length;
    setIndiceAtual(proximo);
    const trilha = trilhaRef.current;
    const slide = trilha?.children[proximo] as HTMLElement | undefined;
    if (!trilha || !slide) return;
    navegandoProgramaticamente.current = true;
    trilha.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    window.setTimeout(() => {
      navegandoProgramaticamente.current = false;
    }, 600);
  }

  if (produtos.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trilhaRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {produtos.map((produto) => (
          <div key={produto.id} className="w-[80%] shrink-0 snap-center">
            <ProductCard
              produto={produto}
              slug={slug}
              variante={variante}
              mostrarPreco={mostrarPreco}
              expandido={mostrarComprar}
              corBotao={corBotao}
              corTextoBotao={corTextoBotao}
              maisVendido={idsMaisVendidos?.has(produto.id)}
            />
          </div>
        ))}
        {produtos.length > 1 && (
          <div aria-hidden className="w-[80%] shrink-0 snap-center">
            <ProductCard
              produto={produtos[0]}
              slug={slug}
              variante={variante}
              mostrarPreco={mostrarPreco}
              expandido={mostrarComprar}
              corBotao={corBotao}
              corTextoBotao={corTextoBotao}
              maisVendido={idsMaisVendidos?.has(produtos[0].id)}
            />
          </div>
        )}
      </div>

      {produtos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => irPara(indiceAtual - 1)}
            aria-label="Produto anterior"
            className="absolute top-[35%] left-0 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => irPara(indiceAtual + 1)}
            aria-label="Próximo produto"
            className="absolute top-[35%] right-0 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {produtos.map((produto, i) => (
              <button
                key={produto.id}
                type="button"
                onClick={() => irPara(i)}
                aria-label={`Ir para produto ${i + 1}`}
                className={`size-1.5 rounded-full transition-all ${
                  i === indiceAtual ? "bg-foreground w-4" : "bg-foreground/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
