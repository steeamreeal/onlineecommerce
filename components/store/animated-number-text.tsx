"use client";

import { useEffect, useRef, useState } from "react";

// Extraída do componente pra ser testável sem montar a árvore de componentes
// React — encontra o primeiro número no texto (aceitando separador de milhar
// com ponto ou vírgula) e devolve o texto dividido em antes/número/depois,
// junto com o valor numérico alvo da contagem. Sem número, `alvo` é null.
export function extrairNumeroDoTexto(text: string): {
  antes: string;
  numeroOriginal: string;
  depois: string;
  alvo: number | null;
} {
  const match = text.match(/\d[\d.,]*/);
  if (!match) {
    return { antes: text, numeroOriginal: "", depois: "", alvo: null };
  }
  const antes = text.slice(0, match.index);
  const depois = text.slice((match.index ?? 0) + match[0].length);
  const alvo = Number(match[0].replace(/[.,]/g, ""));
  return { antes, numeroOriginal: match[0], depois, alvo: Number.isFinite(alvo) ? alvo : null };
}

/**
 * Anima em contagem crescente o primeiro número encontrado no texto (ex.:
 * "Mais de 10.000 clientes" conta de 0 até 10.000) quando o elemento entra
 * na viewport, mantendo o resto do texto estático. Sem número no texto,
 * renderiza normalmente. Usado nos selos de confiança (título/descrição),
 * onde o lojista pode escrever esse tipo de estatística livremente.
 */
export function AnimatedNumberText({
  text,
  durationMs = 1200,
}: {
  text: string;
  durationMs?: number;
}) {
  const { antes, depois, alvo } = extrairNumeroDoTexto(text);
  const ref = useRef<HTMLSpanElement>(null);
  const [valor, setValor] = useState(0);
  const animouRef = useRef(false);

  useEffect(() => {
    if (alvo == null || alvo <= 0) return;
    const alvoSeguro = alvo;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || animouRef.current) return;
        animouRef.current = true;
        const inicio = performance.now();
        function passo(agora: number) {
          const progresso = Math.min((agora - inicio) / durationMs, 1);
          // easeOutCubic — acelera no início e desacelera perto do alvo.
          setValor(Math.round(alvoSeguro * (1 - Math.pow(1 - progresso, 3))));
          if (progresso < 1) requestAnimationFrame(passo);
        }
        requestAnimationFrame(passo);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [alvo, durationMs]);

  if (alvo == null) return <>{text}</>;

  const formatado = valor.toLocaleString("pt-BR");

  return (
    <span ref={ref}>
      {antes}
      {formatado}
      {depois}
    </span>
  );
}
