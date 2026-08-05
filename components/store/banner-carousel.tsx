"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BannerMidia } from "@/components/store/banner-midia";

type TipoMidia = "IMAGEM" | "VIDEO";
type Banner = {
  id: string;
  url: string;
  titulo?: string;
  tipo?: TipoMidia;
  urlMobile?: string;
  tipoMobile?: TipoMidia;
};

const INTERVALO_AUTOPLAY_MS = 5000;

/**
 * Carrossel de banners com scroll-snap nativo (dá swipe de graça no
 * mobile), setas para navegação manual e autoplay que pausa enquanto o
 * usuário interage (hover ou arrastando) e retoma depois. Com 1 banner só,
 * renderiza a mídia direto, sem nenhum controle de navegação.
 */
export function BannerCarousel({
  banners,
  className,
  renderOverlay,
}: {
  banners: Banner[];
  className: string;
  renderOverlay?: (banner: Banner) => ReactNode;
}) {
  const trilhaRef = useRef<HTMLDivElement>(null);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (banners.length <= 1 || pausado) return;
    const id = setInterval(() => {
      setIndiceAtual((atual) => (atual + 1) % banners.length);
    }, INTERVALO_AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [banners.length, pausado]);

  useEffect(() => {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const slide = trilha.children[indiceAtual] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [indiceAtual]);

  function handleScroll() {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const indice = Math.round(trilha.scrollLeft / trilha.clientWidth);
    if (indice !== indiceAtual) setIndiceAtual(indice);
  }

  function irPara(indice: number) {
    setIndiceAtual(((indice % banners.length) + banners.length) % banners.length);
  }

  if (banners.length === 0) return null;

  if (banners.length === 1) {
    return (
      <div className={className}>
        <BannerMidia banner={banners[0]} />
        {renderOverlay?.(banners[0])}
      </div>
    );
  }

  return (
    <div
      className="group relative"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div
        ref={trilhaRef}
        onScroll={handleScroll}
        onTouchStart={() => setPausado(true)}
        onTouchEnd={() => setPausado(false)}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((banner) => (
          <div key={banner.id} className={`${className} shrink-0 snap-start`} style={{ width: "100%" }}>
            <BannerMidia banner={banner} />
            {renderOverlay?.(banner)}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => irPara(indiceAtual - 1)}
        aria-label="Banner anterior"
        className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => irPara(indiceAtual + 1)}
        aria-label="Próximo banner"
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {banners.map((banner, i) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => irPara(i)}
            aria-label={`Ir para banner ${i + 1}`}
            className={`size-1.5 rounded-full transition-all ${
              i === indiceAtual ? "w-4 bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
