import type { Metadata } from "next";
import { prisma } from "@/server/db/client";
import LojaLayoutClient from "./loja-layout-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loja = await prisma.loja.findUnique({
    where: { slug },
    select: { nome: true, logoUrl: true },
  });

  if (!loja) return {};

  // app/favicon.ico (convenção estática) e app/(public-store)/loja/[slug]
  // /icon.tsx (convenção de rota, que gera a logo da loja) coexistem no
  // <head> em vez de um substituir o outro — o navegador tende a priorizar
  // o primeiro <link rel="icon"> da lista, que é sempre o favicon.ico.
  // Redeclarar `icons` aqui explicitamente sobrescreve o favicon herdado
  // para este segmento (e filhos), fazendo o ícone da loja aparecer sozinho.
  return {
    title: loja.nome,
    icons: loja.logoUrl ? { icon: `/loja/${slug}/icon` } : undefined,
  };
}

export default function PublicStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return <LojaLayoutClient params={params}>{children}</LojaLayoutClient>;
}
