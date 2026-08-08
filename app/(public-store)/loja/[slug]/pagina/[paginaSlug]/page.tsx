"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export default function PaginaInstitucionalPage({
  params,
}: {
  params: Promise<{ slug: string; paginaSlug: string }>;
}) {
  const { slug, paginaSlug } = use(params);
  const { data: pagina, isLoading, isError } = trpc.lojaPublica.paginaInstitucionalPorSlug.useQuery({
    slug,
    paginaSlug,
  });

  if (isError) notFound();

  if (isLoading || !pagina) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-12">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  const paragrafos = pagina.conteudo.split(/\n{2,}/).map((paragrafo) => paragrafo.trim()).filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">{pagina.titulo}</h1>
      <div className="text-muted-foreground flex flex-col gap-4 text-sm leading-relaxed whitespace-pre-line">
        {paragrafos.map((paragrafo, i) => (
          <p key={i}>{paragrafo}</p>
        ))}
      </div>
    </div>
  );
}
