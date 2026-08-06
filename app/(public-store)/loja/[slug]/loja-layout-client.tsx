"use client";

import { use, useEffect } from "react";
import { notFound } from "next/navigation";
import { CartProvider } from "@/components/store/cart-context";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartSheet } from "@/components/store/cart-sheet";
import { WhatsappFloatButton } from "@/components/store/whatsapp-float-button";
import { trpc } from "@/lib/trpc/client";
import type { SecaoTema, TemaConfig } from "@/lib/tema-loja";

const VARIAVEIS_COR_LOJA = ["--loja-primary", "--primary", "--primary-foreground", "--ring"] as const;

function encontrarSecao<T extends SecaoTema["tipo"]>(
  temaConfig: TemaConfig | null,
  tipo: T,
): Extract<SecaoTema, { tipo: T }> | null {
  const secao = temaConfig?.secoes.find((s) => s.tipo === tipo);
  return (secao as Extract<SecaoTema, { tipo: T }> | undefined) ?? null;
}

export default function LojaLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  // Escopo por tenant: cada loja é resolvida pelo slug da rota via tRPC
  // público, nunca por um valor fixo.
  const { data: config, isLoading, isError } = trpc.lojaPublica.porSlug.useQuery({ slug });

  // Aplica no <body> (não num wrapper local) porque Sheet/Dialog (ex.:
  // CartSheet) renderizam via portal direto no body, escapando de qualquer
  // variável CSS definida só na árvore normal. Sobrescreve --primary (usado
  // por Button, border-primary etc.) para que botões e destaques do site
  // público sigam a cor do lojista, nunca a cor fixa do painel interno da
  // plataforma. Restaura ao desmontar/trocar de loja.
  useEffect(() => {
    if (!config?.corPrimaria) return;
    const body = document.body;
    const anteriores = VARIAVEIS_COR_LOJA.map((v) => body.style.getPropertyValue(v));

    body.style.setProperty("--loja-primary", config.corPrimaria);
    body.style.setProperty("--primary", config.corPrimaria);
    body.style.setProperty("--primary-foreground", "oklch(0.985 0.006 65)");
    body.style.setProperty("--ring", config.corPrimaria);

    return () => {
      VARIAVEIS_COR_LOJA.forEach((v, i) => {
        if (anteriores[i]) {
          body.style.setProperty(v, anteriores[i]);
        } else {
          body.style.removeProperty(v);
        }
      });
    };
  }, [config?.corPrimaria]);

  if (isError) notFound();
  if (isLoading || !config) return null;

  const temaConfig = (config.temaConfig as TemaConfig | null) ?? null;
  const secaoCabecalho = encontrarSecao(temaConfig, "CABECALHO");
  const secaoRodape = encontrarSecao(temaConfig, "RODAPE");

  return (
    <CartProvider slug={slug}>
      <div
        className="flex min-h-full flex-1 flex-col"
        style={{ "--loja-primary": config.corPrimaria || "var(--primary)" } as React.CSSProperties}
      >
        <SiteHeader
          slug={slug}
          config={config}
          mostrarBusca={secaoCabecalho?.config.mostrarBusca}
          mostrarConta={secaoCabecalho?.config.mostrarConta}
          posicaoLogo={secaoCabecalho?.config.posicaoLogo}
          exibicaoLogo={secaoCabecalho?.config.exibicaoLogo}
          tamanhoLogo={secaoCabecalho?.config.tamanhoLogo}
          corFundo={secaoCabecalho?.config.corFundo}
        />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter
          config={config}
          mostrarRedesSociais={secaoRodape?.config.mostrarRedesSociais}
          mostrarPoliticas={secaoRodape?.config.mostrarPoliticas}
          mostrarNewsletter={secaoRodape?.config.mostrarNewsletter}
          mostrarFormasPagamento={secaoRodape?.config.mostrarFormasPagamento}
          colunas={secaoRodape?.config.colunas}
        />
      </div>
      <CartSheet slug={slug} />
      <WhatsappFloatButton config={config} />
    </CartProvider>
  );
}
