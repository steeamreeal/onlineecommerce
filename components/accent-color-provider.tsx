"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Cada cor define [light, dark] para --primary (e as variáveis que a
// seguem: --ring, --sidebar-primary, --sidebar-ring) e também para --accent
// (fundo "tint" claro + texto escuro na mesma família de hue, usado em
// coisas como o item ativo do menu lateral) — mesmo padrão de tonalidade
// que app/globals.css usa para a cor laranja padrão, só trocando o hue.
export const CORES_DESTAQUE = {
  laranja: {
    label: "Laranja",
    light: "oklch(0.55 0.11 50)",
    dark: "oklch(0.685 0.16 50)",
    accentLight: "oklch(0.94 0.035 50)",
    accentForegroundLight: "oklch(0.4 0.09 50)",
    accentDark: "oklch(0.32 0.06 50)",
    accentForegroundDark: "oklch(0.885 0.05 50)",
  },
  azul: {
    label: "Azul",
    light: "oklch(0.55 0.16 258)",
    dark: "oklch(0.685 0.16 259.8)",
    accentLight: "oklch(0.94 0.035 258)",
    accentForegroundLight: "oklch(0.4 0.09 258)",
    accentDark: "oklch(0.32 0.06 259.8)",
    accentForegroundDark: "oklch(0.885 0.05 259.8)",
  },
  verde: {
    label: "Verde",
    light: "oklch(0.55 0.13 149.3)",
    dark: "oklch(0.696 0.14 149.3)",
    accentLight: "oklch(0.94 0.035 149.3)",
    accentForegroundLight: "oklch(0.4 0.09 149.3)",
    accentDark: "oklch(0.32 0.06 149.3)",
    accentForegroundDark: "oklch(0.885 0.05 149.3)",
  },
  roxo: {
    label: "Roxo",
    light: "oklch(0.5 0.18 300)",
    dark: "oklch(0.65 0.18 300)",
    accentLight: "oklch(0.94 0.035 300)",
    accentForegroundLight: "oklch(0.4 0.09 300)",
    accentDark: "oklch(0.32 0.06 300)",
    accentForegroundDark: "oklch(0.885 0.05 300)",
  },
  rosa: {
    label: "Rosa",
    light: "oklch(0.55 0.19 0)",
    dark: "oklch(0.7 0.17 0)",
    accentLight: "oklch(0.94 0.035 0)",
    accentForegroundLight: "oklch(0.4 0.09 0)",
    accentDark: "oklch(0.32 0.06 0)",
    accentForegroundDark: "oklch(0.885 0.05 0)",
  },
} as const;

export type CorDestaque = keyof typeof CORES_DESTAQUE;

const STORAGE_KEY = "cor-destaque";
const PADRAO: CorDestaque = "laranja";

function aplicarCor(cor: CorDestaque) {
  const config = CORES_DESTAQUE[cor];
  const root = document.documentElement;
  const escuro = root.classList.contains("dark");
  const valor = escuro ? config.dark : config.light;
  const accent = escuro ? config.accentDark : config.accentLight;
  const accentForeground = escuro ? config.accentForegroundDark : config.accentForegroundLight;

  root.style.setProperty("--primary", valor);
  root.style.setProperty("--sidebar-primary", valor);
  root.style.setProperty("--ring", valor);
  root.style.setProperty("--sidebar-ring", valor);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-foreground", accentForeground);
  root.style.setProperty("--sidebar-accent", accent);
  root.style.setProperty("--sidebar-accent-foreground", accentForeground);
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
