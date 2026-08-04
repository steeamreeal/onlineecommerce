"use client";

import { use } from "react";
import { TemplateMinimalista } from "@/components/store/template-minimalista";
import { TemplateEditorial } from "@/components/store/template-editorial";
import { TemplateVitrine } from "@/components/store/template-vitrine";
import { trpc } from "@/lib/trpc/client";

type Banner = { id: string; url: string; titulo?: string };

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

  const destaques = (produtos ?? []).filter((produto) => produto.status === "DESTAQUE");
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
