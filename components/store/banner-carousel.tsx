"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BannerMidia } from "@/components/store/banner-midia";
import { cn } from "@/lib/utils";

type TipoMidia = "IMAGEM" | "VIDEO";
type AlinhamentoTexto = "ESQUERDA" | "CENTRO" | "DIREITA";
type PosicaoVertical = "INICIO" | "CENTRO" | "FIM";
type Banner = {
  id: string;
  url: string;
  titulo?: string;
  tipo?: TipoMidia;
  urlMobile?: string;
  tipoMobile?: TipoMidia;
  link?: string;
  textoBotao?: string;
  linkBotao?: string;
  alinhamentoHorizontal?: AlinhamentoTexto;
  alinhamentoVertical?: PosicaoVertical;
};

const INTERVALO_AUTOPLAY_MS = 5000;

/**
 * Carrossel de banners com scroll-snap nativo (dá swipe de graça no
 * mobile), setas para navegação manual e autoplay que pausa enquanto o
 * usuário interage (hover ou arrastando) e retoma depois. Com 1 banner só,
 * renderiza a mídia direto, sem nenhum controle de navegação.
 *
 * Loop infinito: um clone do primeiro banner é renderizado no fim da
 * trilha. Arrastar até ele (gesto real do usuário, scroll-snap nativo)
 * "chega" visualmente no primeiro banner; assim que o snap termina, a
 * trilha salta sem animação de volta ao slide real 0, então o próximo
 * arrasto se comporta normalmente. Sem esse clone, não haveria nada além
 * do último slide para o dedo puxar — o navegador simplesmente trava lá.
 */
export function BannerCarousel({
  banners,
  className,
  renderOverlay,
  viewport,
}: {
  banners: Banner[];
  className: string;
  renderOverlay?: (banner: Banner) => ReactNode;
  // Ver BannerMidia — força a versão mobile/desktop no preview do editor.
  viewport?: "DESKTOP" | "MOBILE";
}) {
  const trilhaRef = useRef<HTMLDivElement>(null);
  const navegandoProgramaticamente = useRef(false);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (banners.length <= 1 || pausado) return;
    const id = setInterval(() => {
      irPara(indiceAtual + 1);
    }, INTERVALO_AUTOPLAY_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reinicia o timer a cada troca de slide, senão o avanço seguinte usaria um indiceAtual desatualizado
  }, [banners.length, pausado, indiceAtual]);

  function handleScroll() {
    if (navegandoProgramaticamente.current) return;
    const trilha = trilhaRef.current;
    if (!trilha) return;

    const indiceScroll = Math.round(trilha.scrollLeft / trilha.clientWidth);

    // Chegou no clone do primeiro banner (posição banners.length, o último
    // item da trilha): salta sem animação de volta ao slide real 0.
    if (indiceScroll === banners.length) {
      setIndiceAtual(0);
      navegandoProgramaticamente.current = true;
      trilha.scrollTo({ left: 0, behavior: "instant" });
      navegandoProgramaticamente.current = false;
      return;
    }

    if (indiceScroll !== indiceAtual) setIndiceAtual(indiceScroll);
  }

  function irPara(indice: number) {
    const proximo = ((indice % banners.length) + banners.length) % banners.length;
    setIndiceAtual(proximo);

    const trilha = trilhaRef.current;
    const slide = trilha?.children[proximo] as HTMLElement | undefined;
    if (!trilha || !slide) return;

    navegandoProgramaticamente.current = true;
    // Rola só a trilha horizontal do carrossel (scrollTo com left calculado
    // manualmente), nunca slide.scrollIntoView — esse método sobe até o
    // ancestral scrollável mais próximo, que pode ser a própria página (ou,
    // no editor de tema, o painel de preview), puxando o scroll vertical de
    // volta pro topo a cada troca de slide do autoplay.
    trilha.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    window.setTimeout(() => {
      navegandoProgramaticamente.current = false;
    }, 600);
  }

  if (banners.length === 0) return null;

  if (banners.length === 1) {
    return (
      <div className={cn(className, viewport === "MOBILE" && "!aspect-[4/5]", viewport === "DESKTOP" && "!aspect-[3/1]")}>
        <BannerMidia banner={banners[0]} viewport={viewport} />
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
          <div
            key={banner.id}
            className={cn(
              className,
              "shrink-0 snap-start",
              viewport === "MOBILE" && "!aspect-[4/5]",
              viewport === "DESKTOP" && "!aspect-[3/1]",
            )}
            style={{ width: "100%" }}
          >
            <BannerMidia banner={banner} viewport={viewport} />
            {renderOverlay?.(banner)}
          </div>
        ))}
        <div
          aria-hidden
          className={cn(
            className,
            "shrink-0 snap-start",
            viewport === "MOBILE" && "!aspect-[4/5]",
            viewport === "DESKTOP" && "!aspect-[3/1]",
          )}
          style={{ width: "100%" }}
        >
          <BannerMidia banner={banners[0]} viewport={viewport} />
          {renderOverlay?.(banners[0])}
        </div>
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
