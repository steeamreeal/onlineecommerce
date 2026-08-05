"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Pares [light, dark] em oklch, escolhidos para manter contraste adequado
// com --primary-foreground (quase branco) nos dois temas — mesma lógica de
// app/globals.css, só trocando o tom.
export const CORES_DESTAQUE = {
  laranja: { label: "Laranja", light: "oklch(0.55 0.11 50)", dark: "oklch(0.685 0.16 50)" },
  azul: { label: "Azul", light: "oklch(0.55 0.16 258)", dark: "oklch(0.685 0.16 259.8)" },
  verde: { label: "Verde", light: "oklch(0.55 0.13 149.3)", dark: "oklch(0.696 0.14 149.3)" },
  roxo: { label: "Roxo", light: "oklch(0.5 0.18 300)", dark: "oklch(0.65 0.18 300)" },
  rosa: { label: "Rosa", light: "oklch(0.55 0.19 0)", dark: "oklch(0.7 0.17 0)" },
} as const;

export type CorDestaque = keyof typeof CORES_DESTAQUE;

const STORAGE_KEY = "cor-destaque";
const PADRAO: CorDestaque = "laranja";

function aplicarCor(cor: CorDestaque) {
  const config = CORES_DESTAQUE[cor];
  const root = document.documentElement;
  const escuro = root.classList.contains("dark");
  const valor = escuro ? config.dark : config.light;
  root.style.setProperty("--primary", valor);
  root.style.setProperty("--sidebar-primary", valor);
  root.style.setProperty("--ring", valor);
  root.style.setProperty("--sidebar-ring", valor);
}

const AccentColorContext = createContext<{
  cor: CorDestaque;
  setCor: (cor: CorDestaque) => void;
} | null>(null);

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const [cor, setCorState] = useState<CorDestaque>(PADRAO);

  useEffect(() => {
    const salva = localStorage.getItem(STORAGE_KEY) as CorDestaque | null;
    if (salva && salva in CORES_DESTAQUE) {
      setCorState(salva);
      aplicarCor(salva);
    }

    // Reaplica quando o tema claro/escuro muda, já que cada cor tem uma
    // variante por tema — sem isso a cor ficaria "presa" no tom do tema em
    // que foi escolhida.
    const observer = new MutationObserver(() => {
      const atual = (localStorage.getItem(STORAGE_KEY) as CorDestaque | null) ?? PADRAO;
      aplicarCor(atual);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  function setCor(nova: CorDestaque) {
    setCorState(nova);
    localStorage.setItem(STORAGE_KEY, nova);
    aplicarCor(nova);
  }

  return (
    <AccentColorContext.Provider value={{ cor, setCor }}>{children}</AccentColorContext.Provider>
  );
}

export function useAccentColor() {
  const ctx = useContext(AccentColorContext);
  if (!ctx) throw new Error("useAccentColor deve ser usado dentro de AccentColorProvider");
  return ctx;
}
