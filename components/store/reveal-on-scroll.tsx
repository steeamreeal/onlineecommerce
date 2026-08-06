"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Revela o conteúdo com fade + leve deslocamento vertical (ver
 * .animate-reveal-up em app/globals.css) assim que ele entra na viewport.
 * Dispara uma única vez por seção — depois de visível, o observer é
 * desconectado, então rolar pra cima e pra baixo de novo não repete a
 * animação.
 */
export function RevealOnScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={visivel ? "animate-reveal-up" : "opacity-0"}>
      {children}
    </div>
  );
}
