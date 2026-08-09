"use client";

import { use } from "react";
import { TemplateMinimalista } from "@/components/store/template-minimalista";
import { TemplateEditorial } from "@/components/store/template-editorial";
import { TemplateVitrine } from "@/components/store/template-vitrine";
import { ThemeRenderer } from "@/components/store/theme-renderer";
import { trpc } from "@/lib/trpc/client";
import { CONFIG_SELOS_VAZIA, type TemaConfig, type ConfigSelos } from "@/lib/tema-loja";

type Banner = {
  id: string;
  url: string;
  titulo?: string;
  tipo?: "IMAGEM" | "VIDEO";
  urlMobile?: string;
  tipoMobile?: "IMAGEM" | "VIDEO";
};

const templatesPorTipo = {
  MINIMALISTA: TemplateMinimalista,
  EDITORIAL: TemplateEditorial,
  VITRINE: TemplateVitrine,
} as const;

export default function LojaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: config } = trpc.lojaPublica.porSlug.useQuery({ slug });
  const { data: categorias } = trpc.lojaPublica.categorias.useQuery({ slug });
  const { data: produtos } = trpc.lojaPublica.produtos.useQuery({ slug });

  // A home mostra a vitrine geral de produtos visíveis. lojaPublica.produtos
  // já filtra para ATIVO/DESTAQUE no backend — aqui só priorizamos os
  // marcados como DESTAQUE no topo da grade, sem escondar os demais.
  const destaques = [...(produtos ?? [])].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "DESTAQUE" ? -1 : 1,
  );
  const banners = (config?.banners as Banner[] | null) ?? [];
  const temaConfig = config?.temaConfig as TemaConfig | null;

  // Só busca o ranking de mais vendidos se alguma seção realmente usa esse
  // modo — evita uma query extra em toda loja que não usa a funcionalidade.
  const usaMaisVendidos = temaConfig?.secoes.some(
    (s) => s.tipo === "COLECAO_DESTAQUE" && s.config.modo === "MAIS_VENDIDOS",
  );
  const { data: rankingMaisVendidos } = trpc.lojaPublica.produtosMaisVendidos.useQuery(
    { slug },
    { enabled: Boolean(usaMaisVendidos) },
  );

  // Lojas que já abriram o editor de tema têm temaConfig salvo e usam o
  // ThemeRenderer (seções configuráveis). As demais continuam no template
  // fixo antigo — fallback que preserva o comportamento anterior ao editor.
  if (temaConfig) {
    return (
      <ThemeRenderer
        secoes={temaConfig.secoes}
        template={config?.template ?? "MINIMALISTA"}
        slug={slug}
        categorias={categorias ?? []}
        destaques={destaques}
        selosConfig={(config?.selosConfig as ConfigSelos | undefined) ?? CONFIG_SELOS_VAZIA}
        rankingMaisVendidos={rankingMaisVendidos}
      />
    );
  }

  const Template = templatesPorTipo[config?.template ?? "MINIMALISTA"];

  return (
    <Template
      slug={slug}
      banners={banners}
      categorias={categorias ?? []}
      destaques={destaques}
    />
  );
}
