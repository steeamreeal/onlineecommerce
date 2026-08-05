"use client";

import { use } from "react";
import { TemplateMinimalista } from "@/components/store/template-minimalista";
import { TemplateEditorial } from "@/components/store/template-editorial";
import { TemplateVitrine } from "@/components/store/template-vitrine";
import { trpc } from "@/lib/trpc/client";

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
