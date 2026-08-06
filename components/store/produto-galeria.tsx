"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Midia = { id: string; url: string; tipo: "IMAGEM" | "VIDEO" };

/**
 * Galeria de fotos/vídeo do produto com scroll-snap nativo (swipe de graça
 * no mobile) e setas ao passar o mouse — mesmo mecanismo do BannerCarousel,
 * mas sem autoplay/loop: aqui a mídia selecionada também é controlada de
 * fora (clique numa miniatura ou numa variação com foto vinculada), então
 * o carrossel precisa poder pular pra qualquer slide, não só avançar.
 */
export function ProdutoGaleria({
  midias,
  midiaSelecionadaId,
  onSelecionar,
  nomeProduto,
}: {
  midias: Midia[];
  midiaSelecionadaId: string | undefined;
  onSelecionar: (id: string) => void;
  nomeProduto: string;
}) {
  const trilhaRef = useRef<HTMLDivElement>(null);
  const navegandoProgramaticamente = useRef(false);
  const indice = midias.findIndex((m) => m.id === midiaSelecionadaId);

  useEffect(() => {
    const trilha = trilhaRef.current;
    const slide = trilha?.children[indice] as HTMLElement | undefined;
    if (!trilha || !slide) return;

    navegandoProgramaticamente.current = true;
    slide.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    window.setTimeout(() => {
      navegandoProgramaticamente.current = false;
    }, 600);
  }, [indice]);

  function handleScroll() {
    if (navegandoProgramaticamente.current) return;
    const trilha = trilhaRef.current;
    if (!trilha) return;

    const indiceScroll = Math.round(trilha.scrollLeft / trilha.clientWidth);
    const midia = midias[indiceScroll];
    if (midia && midia.id !== midiaSelecionadaId) onSelecionar(midia.id);
  }

  function irPara(novoIndice: number) {
    const proximo = ((novoIndice % midias.length) + midias.length) % midias.length;
    onSelecionar(midias[proximo].id);
  }

  if (midias.length === 0) {
    return <div className="bg-muted aspect-square overflow-hidden rounded-lg" />;
  }

  if (midias.length === 1) {
    return (
      <div className="bg-muted aspect-square overflow-hidden rounded-lg">
        <MidiaConteudo midia={midias[0]} nomeProduto={nomeProduto} />
      </div>
    );
  }

  return (
    <div className="group relative">
      <div
        ref={trilhaRef}
        onScroll={handleScroll}
        className="bg-muted flex aspect-square snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {midias.map((midia) => (
          <div key={midia.id} className="w-full shrink-0 snap-start">
            <MidiaConteudo midia={midia} nomeProduto={nomeProduto} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => irPara(indice - 1)}
        aria-label="Foto anterior"
        className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => irPara(indice + 1)}
        aria-label="Próxima foto"
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {midias.map((midia, i) => (
          <button
            key={midia.id}
            type="button"
            onClick={() => irPara(i)}
            aria-label={`Ir para foto ${i + 1}`}
            className={`size-1.5 rounded-full transition-all ${
              i === indice ? "w-4 bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function MidiaConteudo({ midia, nomeProduto }: { midia: Midia; nomeProduto: string }) {
  if (midia.tipo === "VIDEO") {
    return <video src={midia.url} className="size-full object-cover" controls playsInline />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
    <img src={midia.url} alt={nomeProduto} className="size-full object-cover" />
  );
}
