"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import type { RouterOutputs } from "@/lib/trpc/types";

type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

// Layout mobile "CARROSSEL" da Coleção em destaque (referência: Pandora) —
// um produto por slide, com variação e adicionar ao carrinho já visíveis
// (sem depender de hover, que não existe em toque).
export function ProductCarousel({
  produtos,
  slug,
  variante,
  mostrarPreco,
  mostrarComprar = true,
  corBotao,
  corTextoBotao,
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
}) {
  const trilhaRef = useRef<HTMLDivElement>(null);
  const [indiceAtual, setIndiceAtual] = useState(0);

  function handleScroll() {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const indice = Math.round(trilha.scrollLeft / trilha.clientWidth);
    if (indice !== indiceAtual) setIndiceAtual(indice);
  }

  function irPara(indice: number) {
    const proximo = Math.max(0, Math.min(produtos.length - 1, indice));
    setIndiceAtual(proximo);
    const trilha = trilhaRef.current;
    const slide = trilha?.children[proximo] as HTMLElement | undefined;
    if (!trilha || !slide) return;
    trilha.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
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
            />
          </div>
        ))}
      </div>

      {produtos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => irPara(indiceAtual - 1)}
            disabled={indiceAtual === 0}
            aria-label="Produto anterior"
            className="absolute top-[35%] left-0 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white disabled:opacity-0"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => irPara(indiceAtual + 1)}
            disabled={indiceAtual === produtos.length - 1}
            aria-label="Próximo produto"
            className="absolute top-[35%] right-0 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white disabled:opacity-0"
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
